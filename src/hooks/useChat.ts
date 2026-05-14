import { useState, useCallback, useEffect, useRef } from 'react';
import { useChatSocket } from './useChatSocket';
import { createChatThread, getMyChatThreads, getChatMessages } from '@/api';
import { getStorePublicId } from '@/utils/store';
import type {
  ChatThreadSummary,
  ChatMessage,
  ChatRealtimeEvent,
  ConnectionStatus,
  ChatInterruptStrategy,
} from '@/types';

const buildThreadTitle = (content: string) => {
  const normalized = content.trim().replace(/\s+/g, ' ');
  if (!normalized) return '새 대화';
  return normalized.length > 24 ? `${normalized.slice(0, 24)}...` : normalized;
};

const sortMessages = (items: ChatMessage[]) => ([...items].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()));
const isSameMessage = (left: ChatMessage, right: ChatMessage) => (left.messageId > 0 && right.messageId > 0 ? left.messageId === right.messageId : !!left.clientMessageId && left.clientMessageId === right.clientMessageId);

const upsertMessage = (items: ChatMessage[], incoming: ChatMessage) => {
  let matched = false;
  const next = items.map((message) => {
    if (!isSameMessage(message, incoming)) return message;
    matched = true;
    return {
      ...message,
      ...incoming,
      messageId: incoming.messageId > 0 ? incoming.messageId : message.messageId,
      clientMessageId: incoming.clientMessageId ?? message.clientMessageId,
      errorMessage: incoming.errorMessage ?? message.errorMessage ?? null,
      requestedModelPreference: incoming.requestedModelPreference ?? message.requestedModelPreference ?? 'AUTO',
    };
  });
  return sortMessages(matched ? next : [...next, incoming]);
};

const mergeServerSnapshot = (localMessages: ChatMessage[], serverMessages: ChatMessage[]) => {
  let merged = sortMessages(serverMessages);
  for (const localMessage of localMessages) {
    const exists = merged.some((serverMessage) => isSameMessage(serverMessage, localMessage));
    if (!exists && localMessage.messageId < 0) merged = upsertMessage(merged, localMessage);
  }
  return sortMessages(merged);
};

export const useChat = () => {
  const [threads, setThreads] = useState<ChatThreadSummary[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoadingThreads, setIsLoadingThreads] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('DISCONNECTED');
  const [currentStoreId, setCurrentStoreId] = useState<string | null>(getStorePublicId());

  const selectedThreadIdRef = useRef<number | null>(null);
  const creatingThreadPromiseRef = useRef<Promise<number | null> | null>(null);

  useEffect(() => { selectedThreadIdRef.current = selectedThreadId; }, [selectedThreadId]);

  const loadThreads = useCallback(async () => {
    const storePublicId = getStorePublicId();
    if (!storePublicId) { setThreads([]); return; }
    setIsLoadingThreads(true);
    try { setThreads((await getMyChatThreads(storePublicId)).data); }
    catch { setThreads([]); }
    finally { setIsLoadingThreads(false); }
  }, []);

  const loadMessages = useCallback(async (threadId: number) => {
    setIsLoadingMessages(true);
    try {
      const response = await getChatMessages(threadId);
      setMessages((prev) => mergeServerSnapshot(prev, sortMessages(response.data)));
    } finally { setIsLoadingMessages(false); }
  }, []);

  const createNewThread = useCallback(async (title = '새 대화') => {
    const storePublicId = getStorePublicId();
    if (!storePublicId) return null;
    try {
      const response = await createChatThread(storePublicId, { title });
      await loadThreads();
      setSelectedThreadId(response.data.threadId);
      setMessages([]);
      return response.data.threadId;
    } catch { return null; }
  }, [loadThreads]);

  const ensureThread = useCallback(async (title: string) => {
    if (selectedThreadIdRef.current) return selectedThreadIdRef.current;
    if (creatingThreadPromiseRef.current) return creatingThreadPromiseRef.current;
    const promise = createNewThread(title);
    creatingThreadPromiseRef.current = promise;
    try { return await promise; } finally { creatingThreadPromiseRef.current = null; }
  }, [createNewThread]);

  const handleRealtimeEvent = useCallback((event: ChatRealtimeEvent) => {
    switch (event.eventType) {
      case 'USER_MESSAGE_ACCEPTED':
        if (typeof event.requestMessageId === 'number' && event.clientMessageId) {
          setMessages((prev) => sortMessages(prev.map((message) => (
            message.clientMessageId === event.clientMessageId && message.messageId < 0
              ? { ...message, messageId: event.requestMessageId as number, status: 'QUEUED' as const }
              : message
          ))));
        }
        break;
      case 'CHAT_PROCESSING':
        if (event.requestMessageId) {
          setMessages((prev) => prev.map((message) => (
            message.messageId === event.requestMessageId ? { ...message, status: 'PROCESSING' as const } : message
          )));
        }
        break;
      case 'CHAT_RESPONSE_CREATED': {
        const responseMessage = event.message;
        if (responseMessage) {
          setMessages((prev) => {
            const completed = typeof event.requestMessageId === 'number'
              ? prev.map((message) => (message.messageId === event.requestMessageId ? { ...message, status: 'COMPLETED' as const } : message))
              : prev;
            return upsertMessage(completed, responseMessage);
          });
          void loadThreads();
        }
        break;
      }
      case 'CHAT_FAILED':
        if (event.requestMessageId) {
          setMessages((prev) => prev.map((message) => (
            message.messageId === event.requestMessageId
              ? { ...message, status: 'FAILED' as const, errorMessage: event.errorMessage || '오류가 발생했습니다' }
              : message
          )));
        }
        break;
      case 'CHAT_INTERRUPTED':
        if (event.requestMessageId) {
          setMessages((prev) => prev.map((message) => (
            message.messageId === event.requestMessageId
              ? { ...message, status: 'INTERRUPTED' as const, errorMessage: event.errorMessage || '답변 생성이 중단되었습니다' }
              : message
          )));
        }
        break;
    }
  }, [loadThreads]);

  const handleConnectionChange = useCallback((status: ConnectionStatus) => {
    setConnectionStatus(status);
    if (status === 'CONNECTED') {
      void loadThreads();
      if (selectedThreadIdRef.current) void loadMessages(selectedThreadIdRef.current);
    }
  }, [loadMessages, loadThreads]);

  const { sendMessage, sendInterrupt } = useChatSocket({ onEvent: handleRealtimeEvent, onConnectionChange: handleConnectionChange });

  const sendChatMessageByThreadId = useCallback((threadId: number, content: string, interruptStrategy: ChatInterruptStrategy) => {
    if (!content.trim()) return;
    const clientMessageId = `client-${Date.now()}-${Math.random()}`;
    const optimisticMessage: ChatMessage = {
      messageId: -Date.now(),
      threadId,
      role: 'USER',
      status: 'QUEUED',
      content: content.trim(),
      clientMessageId,
      requestedModelPreference: 'AUTO',
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => upsertMessage(prev, optimisticMessage));
    sendMessage({ threadId, clientMessageId, content: content.trim(), modelPreference: 'AUTO', interruptStrategy });
  }, [sendMessage]);

  const sendChatMessage = useCallback(async (content: string) => {
    const trimmed = content.trim();
    if (!trimmed) return;
    const threadId = await ensureThread(buildThreadTitle(trimmed));
    if (!threadId) return;
    const isThreadBusy = messages.some((message) => message.threadId === threadId && (message.status === 'QUEUED' || message.status === 'PROCESSING'));
    sendChatMessageByThreadId(threadId, trimmed, isThreadBusy ? 'INTERRUPT_CURRENT' : 'AUTO');
  }, [ensureThread, messages, sendChatMessageByThreadId]);

  const retryMessage = useCallback((message: ChatMessage) => {
    if (!message.clientMessageId) return;
    setMessages((prev) => prev.map((current) => (
      current.messageId === message.messageId ? { ...current, status: 'QUEUED', errorMessage: null } : current
    )));
    sendMessage({
      threadId: message.threadId,
      clientMessageId: message.clientMessageId,
      content: message.content,
      modelPreference: 'AUTO',
      interruptStrategy: 'AUTO',
    });
  }, [sendMessage]);

  const interruptCurrent = useCallback(() => {
    if (!selectedThreadIdRef.current) return;
    sendInterrupt({ threadId: selectedThreadIdRef.current });
  }, [sendInterrupt]);

  const selectThread = useCallback((threadId: number) => setSelectedThreadId(threadId), []);

  useEffect(() => { void loadThreads(); }, [loadThreads]);
  useEffect(() => { if (selectedThreadId) void loadMessages(selectedThreadId); }, [selectedThreadId, loadMessages]);
  useEffect(() => {
    const handleStoreChange = () => {
      const newStoreId = getStorePublicId();
      if (newStoreId !== currentStoreId) {
        setCurrentStoreId(newStoreId);
        setSelectedThreadId(null);
        setMessages([]);
        void loadThreads();
      }
    };
    window.addEventListener('storePublicIdChanged', handleStoreChange);
    return () => window.removeEventListener('storePublicIdChanged', handleStoreChange);
  }, [currentStoreId, loadThreads]);

  return { threads, selectedThreadId, messages, isLoadingThreads, isLoadingMessages, connectionStatus, createNewThread, selectThread, sendChatMessage, retryMessage, interruptCurrent, loadThreads };
};
