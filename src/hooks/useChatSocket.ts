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
import { ensureAccessToken } from '@/api/user/client';
import type {
    ChatRealtimeEvent,
    ChatSendMessageRequest,
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
    if (rawUrl.startsWith('wss://')) {
        return rawUrl.replace('wss://', 'https://');
    }
    if (rawUrl.startsWith('ws://')) {
        return rawUrl.replace('ws://', 'http://');
    }
    return rawUrl;
};

const parseCloseDetails = (event: CloseEvent) => ({
    code: event.code,
    reason: event.reason,
    wasClean: event.wasClean,
});

export const useChatSocket = ({
    onEvent,
    onConnectionChange,
}: UseChatSocketOptions = {}) => {
    const clientRef = useRef<Client | null>(null);
    const subscriptionRef = useRef<StompSubscription | null>(null);
    const onEventRef = useRef<typeof onEvent>(onEvent);
    const onConnectionChangeRef = useRef<typeof onConnectionChange>(onConnectionChange);
    const clientInstanceIdRef = useRef(0);
    const manualDisconnectRef = useRef(false);
    const pendingMessagesRef = useRef<Map<string, ChatSendMessageRequest>>(new Map());
    const [connectionStatus, setConnectionStatus] =
        useState<ConnectionStatus>('DISCONNECTED');

    useEffect(() => {
        onEventRef.current = onEvent;
    }, [onEvent]);

    useEffect(() => {
        onConnectionChangeRef.current = onConnectionChange;
    }, [onConnectionChange]);

    const updateConnectionStatus = useCallback((status: ConnectionStatus) => {
        setConnectionStatus(status);
        onConnectionChangeRef.current?.(status);
    }, []);

    const isCurrentClient = useCallback((instanceId: number, client: Client) => {
        return clientRef.current === client && clientInstanceIdRef.current === instanceId;
    }, []);

    const publishChatRequest = useCallback((client: Client, request: ChatSendMessageRequest) => {
        client.publish({
            destination: '/app/chat.send',
            body: JSON.stringify(request),
        });
    }, []);

    const flushPendingMessages = useCallback((client: Client) => {
        if (!client.connected || pendingMessagesRef.current.size === 0) {
            return;
        }

        for (const [clientMessageId, request] of pendingMessagesRef.current.entries()) {
            try {
                publishChatRequest(client, request);
                pendingMessagesRef.current.delete(clientMessageId);
            } catch (error) {
                console.error('[useChatSocket] Failed to flush queued message:', {
                    clientMessageId,
                    error,
                });
                break;
            }
        }
    }, [publishChatRequest]);

    const connect = useCallback(() => {
        if (clientRef.current?.active || clientRef.current?.connected) {
            return;
        }

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
            debug: (str: string) => {
                if (import.meta.env.DEV) {
                    console.log('[STOMP]', str);
                }
            },
        });

        client.beforeConnect = async () => {
            const token = await ensureAccessToken();
            if (!token) {
                updateConnectionStatus('DISCONNECTED');
                throw new Error('No access token available');
            }

            client.connectHeaders = {
                Authorization: `Bearer ${token}`,
            };
        };

        client.onConnect = () => {
            if (!isCurrentClient(instanceId, client)) {
                void client.deactivate();
                return;
            }

            console.log('[useChatSocket] STOMP connected');
            updateConnectionStatus('CONNECTED');

            subscriptionRef.current?.unsubscribe();
            subscriptionRef.current = client.subscribe(
                '/user/queue/chat',
                (message: IMessage) => {
                    try {
                        const event: ChatRealtimeEvent = JSON.parse(message.body);
                        onEventRef.current?.(event);
                    } catch (error) {
                        console.error('[useChatSocket] Failed to parse chat event:', error);
                    }
                },
            );

            flushPendingMessages(client);
        };

        client.onDisconnect = () => {
            if (!isCurrentClient(instanceId, client)) {
                return;
            }

            console.log('[useChatSocket] STOMP graceful disconnect');
        };

        client.onStompError = (frame: IFrame) => {
            if (!isCurrentClient(instanceId, client)) {
                return;
            }

            console.error('[useChatSocket] STOMP error:', {
                headers: frame.headers,
                body: frame.body,
            });

            updateConnectionStatus(client.active ? 'RECONNECTING' : 'DISCONNECTED');
        };

        client.onWebSocketError = (event: Event) => {
            if (!isCurrentClient(instanceId, client)) {
                return;
            }

            console.error('[useChatSocket] WebSocket error:', event);
            updateConnectionStatus(client.active ? 'RECONNECTING' : 'DISCONNECTED');
        };

        client.onWebSocketClose = (event: CloseEvent) => {
            if (!isCurrentClient(instanceId, client)) {
                return;
            }

            subscriptionRef.current = null;

            const nextStatus: ConnectionStatus =
                manualDisconnectRef.current || !client.active ? 'DISCONNECTED' : 'RECONNECTING';

            console.warn('[useChatSocket] WebSocket closed:', parseCloseDetails(event));
            updateConnectionStatus(nextStatus);
        };

        clientRef.current = client;
        client.activate();
    }, [flushPendingMessages, isCurrentClient, updateConnectionStatus]);

    const disconnect = useCallback(async () => {
        manualDisconnectRef.current = true;

        if (subscriptionRef.current) {
            subscriptionRef.current.unsubscribe();
            subscriptionRef.current = null;
        }

        pendingMessagesRef.current.clear();

        const client = clientRef.current;
        if (!client) {
            updateConnectionStatus('DISCONNECTED');
            return;
        }

        try {
            await client.deactivate();
        } catch (error) {
            console.error('[useChatSocket] Failed to deactivate client:', error);
        } finally {
            if (clientRef.current === client) {
                clientRef.current = null;
            }
            updateConnectionStatus('DISCONNECTED');
        }
    }, [updateConnectionStatus]);

    const sendMessage = useCallback((request: ChatSendMessageRequest) => {
        const client = clientRef.current;

        console.log('[useChatSocket] sendMessage called:', {
            request,
            clientExists: !!client,
            clientActive: client?.active,
            clientConnected: client?.connected,
            queuedMessages: pendingMessagesRef.current.size,
        });

        if (client?.connected) {
            try {
                publishChatRequest(client, request);
                console.log('[useChatSocket] Message published successfully');
                return;
            } catch (error) {
                console.error('[useChatSocket] Failed to publish message immediately:', error);
            }
        }

        pendingMessagesRef.current.set(request.clientMessageId, request);
        console.warn('[useChatSocket] Message queued until socket is connected:', {
            clientMessageId: request.clientMessageId,
            queuedMessages: pendingMessagesRef.current.size,
        });

        if (!client?.active) {
            connect();
        } else {
            updateConnectionStatus('RECONNECTING');
        }
    }, [connect, publishChatRequest, updateConnectionStatus]);

    useEffect(() => {
        connect();

        return () => {
            void disconnect();
        };
    }, [connect, disconnect]);

    return {
        connectionStatus,
        sendMessage,
        connect,
        disconnect,
    };
};
