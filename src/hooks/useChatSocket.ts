import { useEffect, useRef, useCallback, useState } from 'react';
import {
  Client,
  ReconnectionTimeMode,
  TickerStrategy,
  type IMessage,
  type IFrame,
  type StompSubscription,
} from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { ensureAccessToken } from '@/utils/auth';
import type {
  ChatRealtimeEvent,
  ChatSendMessageRequest,
  ChatInterruptRequest,
  ConnectionStatus,
} from '@/types';

interface UseChatSocketOptions {
  onEvent?: (event: ChatRealtimeEvent) => void;
  onConnectionChange?: (status: ConnectionStatus) => void;
}

const DEFAULT_WS_URL = 'ws://localhost:8080/ws';
const HEARTBEAT_INTERVAL_MS = 10000;
const CONNECTION_TIMEOUT_MS = 8000;

const toSockJsUrl = (rawUrl: string): string => {
  if (rawUrl.startsWith('wss://')) return rawUrl.replace('wss://', 'https://');
  if (rawUrl.startsWith('ws://')) return rawUrl.replace('ws://', 'http://');
  return rawUrl;
};

export const useChatSocket = ({ onEvent, onConnectionChange }: UseChatSocketOptions = {}) => {
  const clientRef = useRef<Client | null>(null);
  const subscriptionRef = useRef<StompSubscription | null>(null);
  const onEventRef = useRef(onEvent);
  const onConnectionChangeRef = useRef(onConnectionChange);
  const clientInstanceIdRef = useRef(0);
  const manualDisconnectRef = useRef(false);
  const pendingMessagesRef = useRef<Map<string, ChatSendMessageRequest>>(new Map());
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('DISCONNECTED');

  useEffect(() => { onEventRef.current = onEvent; }, [onEvent]);
  useEffect(() => { onConnectionChangeRef.current = onConnectionChange; }, [onConnectionChange]);

  const updateConnectionStatus = useCallback((status: ConnectionStatus) => {
    setConnectionStatus(status);
    onConnectionChangeRef.current?.(status);
  }, []);

  const isCurrentClient = useCallback((instanceId: number, client: Client) => (
    clientRef.current === client && clientInstanceIdRef.current === instanceId
  ), []);

  const publish = useCallback((client: Client, destination: string, body: object) => {
    client.publish({ destination, body: JSON.stringify(body) });
  }, []);

  const flushPendingMessages = useCallback((client: Client) => {
    if (!client.connected || pendingMessagesRef.current.size === 0) return;
    for (const [clientMessageId, request] of pendingMessagesRef.current.entries()) {
      try {
        publish(client, '/app/chat.send', request);
        pendingMessagesRef.current.delete(clientMessageId);
      } catch {
        break;
      }
    }
  }, [publish]);

  const connect = useCallback(() => {
    if (clientRef.current?.active || clientRef.current?.connected) return;

    manualDisconnectRef.current = false;
    updateConnectionStatus('CONNECTING');

    const wsUrl = import.meta.env.VITE_WS_BASE_URL || DEFAULT_WS_URL;
    const sockJsUrl = toSockJsUrl(wsUrl);
    const instanceId = ++clientInstanceIdRef.current;

    const client = new Client({
      webSocketFactory: () => new SockJS(sockJsUrl),
      reconnectDelay: 1000,
      reconnectTimeMode: ReconnectionTimeMode.EXPONENTIAL,
      maxReconnectDelay: 10000,
      connectionTimeout: CONNECTION_TIMEOUT_MS,
      heartbeatIncoming: HEARTBEAT_INTERVAL_MS,
      heartbeatOutgoing: HEARTBEAT_INTERVAL_MS,
      heartbeatStrategy: TickerStrategy.Worker,
      debug: (str: string) => { if (import.meta.env.DEV) console.log('[STOMP]', str); },
    });

    client.beforeConnect = async () => {
      const token = await ensureAccessToken();
      if (!token) {
        updateConnectionStatus('DISCONNECTED');
        throw new Error('No access token available');
      }
      client.connectHeaders = { Authorization: `Bearer ${token}` };
    };

    client.onConnect = () => {
      if (!isCurrentClient(instanceId, client)) {
        void client.deactivate();
        return;
      }
      updateConnectionStatus('CONNECTED');
      subscriptionRef.current?.unsubscribe();
      subscriptionRef.current = client.subscribe('/user/queue/chat', (message: IMessage) => {
        try {
          const event: ChatRealtimeEvent = JSON.parse(message.body);
          onEventRef.current?.(event);
        } catch (error) {
          console.error('[useChatSocket] Failed to parse chat event:', error);
        }
      });
      flushPendingMessages(client);
    };

    client.onDisconnect = () => { if (isCurrentClient(instanceId, client)) console.log('[useChatSocket] disconnected'); };
    client.onStompError = (_frame: IFrame) => updateConnectionStatus(client.active ? 'RECONNECTING' : 'DISCONNECTED');
    client.onWebSocketError = () => updateConnectionStatus(client.active ? 'RECONNECTING' : 'DISCONNECTED');
    client.onWebSocketClose = () => updateConnectionStatus(manualDisconnectRef.current || !client.active ? 'DISCONNECTED' : 'RECONNECTING');

    clientRef.current = client;
    client.activate();
  }, [flushPendingMessages, isCurrentClient, updateConnectionStatus]);

  const disconnect = useCallback(async () => {
    manualDisconnectRef.current = true;
    subscriptionRef.current?.unsubscribe();
    subscriptionRef.current = null;
    pendingMessagesRef.current.clear();
    const client = clientRef.current;
    if (!client) {
      updateConnectionStatus('DISCONNECTED');
      return;
    }
    try { await client.deactivate(); } finally {
      if (clientRef.current === client) clientRef.current = null;
      updateConnectionStatus('DISCONNECTED');
    }
  }, [updateConnectionStatus]);

  const sendMessage = useCallback((request: ChatSendMessageRequest) => {
    const client = clientRef.current;
    if (client?.connected) {
      try {
        publish(client, '/app/chat.send', request);
        return;
      } catch {
        // fall through
      }
    }
    pendingMessagesRef.current.set(request.clientMessageId, request);
    if (!client?.active) connect(); else updateConnectionStatus('RECONNECTING');
  }, [connect, publish, updateConnectionStatus]);

  const sendInterrupt = useCallback((request: ChatInterruptRequest) => {
    const client = clientRef.current;
    if (client?.connected) {
      publish(client, '/app/chat.interrupt', request);
      return;
    }
    if (!client?.active) connect();
  }, [connect, publish]);

  useEffect(() => {
    connect();
    return () => { void disconnect(); };
  }, [connect, disconnect]);

  return { connectionStatus, sendMessage, sendInterrupt, connect, disconnect };
};
