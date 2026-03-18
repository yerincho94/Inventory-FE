import { useState, useCallback, useEffect, useRef } from 'react';
import { useChatSocket } from './useChatSocket';
import { createChatThread, getMyChatThreads, getChatMessages } from '@/api';
import { getStorePublicId } from '@/utils/store';
import type {
  ChatThreadSummary,
  ChatMessage,
  ChatRealtimeEvent,
  ConnectionStatus,
} from '@/types';

const buildThreadTitle = (content: string) => {
  const normalized = content.trim().replace(/\s+/g, ' ');
  if (!normalized) {
    return '새 대화';
  }

  return normalized.length > 24 ? `${normalized.slice(0, 24)}...` : normalized;
};

export const useChat = () => {
  const [threads, setThreads] = useState<ChatThreadSummary[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoadingThreads, setIsLoadingThreads] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('DISCONNECTED');
  const [currentStoreId, setCurrentStoreId] = useState<string | null>(getStorePublicId());

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const selectedThreadIdRef = useRef<number | null>(null);
  const creatingThreadPromiseRef = useRef<Promise<number | null> | null>(null);

  useEffect(() => {
    selectedThreadIdRef.current = selectedThreadId;
  }, [selectedThreadId]);

  const loadThreads = useCallback(async () => {
    const storePublicId = getStorePublicId();
    if (!storePublicId) {
      console.error('No store selected');
      setThreads([]);
      return;
    }

    setIsLoadingThreads(true);
    try {
      const response = await getMyChatThreads(storePublicId);
      setThreads(response.data);
    } catch (error) {
      console.error('Failed to load threads:', error);
      setThreads([]);
    } finally {
      setIsLoadingThreads(false);
    }
  }, []);

  const loadMessages = useCallback(async (threadId: number) => {
    setIsLoadingMessages(true);
    try {
      const response = await getChatMessages(threadId);
      const sortedMessages = [...response.data].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );
      setMessages(sortedMessages);
    } catch (error) {
      console.error('Failed to load messages:', error);
      setMessages([]);
    } finally {
      setIsLoadingMessages(false);
    }
  }, []);

  const createNewThread = useCallback(async (title: string = '새 대화') => {
    const storePublicId = getStorePublicId();
    if (!storePublicId) {
      console.error('No store selected');
      return null;
    }

    try {
      const response = await createChatThread(storePublicId, { title });
      const newThread = response.data;

      await loadThreads();
      setSelectedThreadId(newThread.threadId);
      setMessages([]);

      return newThread.threadId;
    } catch (error) {
      console.error('Failed to create thread:', error);
      return null;
    }
  }, [loadThreads]);

  const ensureThread = useCallback(async (title: string) => {
    if (selectedThreadIdRef.current) {
      return selectedThreadIdRef.current;
    }

    if (creatingThreadPromiseRef.current) {
      return creatingThreadPromiseRef.current;
    }

    const promise = createNewThread(title);
    creatingThreadPromiseRef.current = promise;

    try {
      return await promise;
    } finally {
      creatingThreadPromiseRef.current = null;
    }
  }, [createNewThread]);

  const handleRealtimeEvent = useCallback((event: ChatRealtimeEvent) => {
    switch (event.eventType) {
      case 'USER_MESSAGE_ACCEPTED': {
        const requestMessageId = event.requestMessageId;
        const clientMessageId = event.clientMessageId;

        if (typeof requestMessageId === 'number' && clientMessageId) {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.clientMessageId === clientMessageId && msg.messageId < 0
                ? { ...msg, messageId: requestMessageId, status: 'QUEUED' }
                : msg,
            ),
          );
        }
        break;
      }

      case 'CHAT_PROCESSING':
        if (event.requestMessageId) {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.messageId === event.requestMessageId
                ? { ...msg, status: 'PROCESSING' as const }
                : msg,
            ),
          );
        }
        break;

      case 'CHAT_RESPONSE_CREATED': {
        const requestMessageId = event.requestMessageId;
        const responseMessage = event.message;

        if (responseMessage) {
          setMessages((prev) => {
            const updated = typeof requestMessageId === 'number'
              ? prev.map((msg) =>
                  msg.messageId === requestMessageId
                    ? { ...msg, status: 'COMPLETED' as const }
                    : msg,
                )
              : prev;

            return [...updated, responseMessage];
          });
          void loadThreads();
        }
        break;
      }

      case 'CHAT_FAILED':
        if (event.requestMessageId) {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.messageId === event.requestMessageId
                ? {
                  ...msg,
                  status: 'FAILED' as const,
                  errorMessage: event.errorMessage || '오류가 발생했습니다',
                }
                : msg,
            ),
          );
        }
        break;
    }
  }, [loadThreads]);

  const { sendMessage } = useChatSocket({
    onEvent: handleRealtimeEvent,
    onConnectionChange: setConnectionStatus,
  });

  const sendChatMessageByThreadId = useCallback((threadId: number, content: string) => {
    if (!content.trim()) {
      return;
    }

    const clientMessageId = `client-${Date.now()}-${Math.random()}`;

    const optimisticMessage: ChatMessage = {
      messageId: -Date.now(),
      threadId,
      role: 'USER',
      status: 'QUEUED',
      content: content.trim(),
      clientMessageId,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimisticMessage]);

    sendMessage({
      threadId,
      clientMessageId,
      content: content.trim(),
    });

    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  }, [sendMessage]);

  const sendChatMessage = useCallback(
    async (content: string) => {
      const trimmed = content.trim();
      if (!trimmed) {
        return;
      }

      const threadId = await ensureThread(buildThreadTitle(trimmed));
      if (!threadId) {
        return;
      }

      sendChatMessageByThreadId(threadId, trimmed);
    },
    [ensureThread, sendChatMessageByThreadId],
  );

  const retryMessage = useCallback(
    (message: ChatMessage) => {
      if (!message.clientMessageId) {
        return;
      }

      setMessages((prev) =>
        prev.map((msg) =>
          msg.messageId === message.messageId
            ? { ...msg, status: 'QUEUED', errorMessage: null }
            : msg,
        ),
      );

      sendMessage({
        threadId: message.threadId,
        clientMessageId: message.clientMessageId,
        content: message.content,
      });
    },
    [sendMessage],
  );

  const selectThread = useCallback(
    (threadId: number) => {
      setSelectedThreadId(threadId);
      void loadMessages(threadId);
    },
    [loadMessages],
  );

  useEffect(() => {
    void loadThreads();
  }, [loadThreads]);

  useEffect(() => {
    if (selectedThreadId) {
      void loadMessages(selectedThreadId);
    }
  }, [selectedThreadId, loadMessages]);

  // 매장 변경 감지
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

    return () => {
      window.removeEventListener('storePublicIdChanged', handleStoreChange);
    };
  }, [currentStoreId, loadThreads]);

  return {
    threads,
    selectedThreadId,
    messages,
    isLoadingThreads,
    isLoadingMessages,
    connectionStatus,
    messagesEndRef,
    createNewThread,
    selectThread,
    sendChatMessage,
    retryMessage,
    loadThreads,
  };
};
