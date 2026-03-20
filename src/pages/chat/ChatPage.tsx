import { useState, useEffect } from 'react';
import { useChat } from '@/hooks/useChat';
import { ChatSidebar } from '@/components/chat/ChatSidebar';
import { ChatHeader } from '@/components/chat/ChatHeader';
import { ChatMessageList } from '@/components/chat/ChatMessageList';
import { ChatComposer } from '@/components/chat/ChatComposer';

export const ChatPage = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  // Welcome 화면에서 질문 전송 즉시 채팅 뷰로 전환하기 위한 상태
  const [pendingQuestion, setPendingQuestion] = useState<string | null>(null);

  const {
    threads,
    selectedThreadId,
    messages,
    isLoadingThreads,
    isLoadingMessages,
    connectionStatus,
    createNewThread,
    selectThread,
    sendChatMessage,
    retryMessage,
  } = useChat();

  // 화면 크기에 따라 사이드바 상태 초기화
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsSidebarOpen(false); // 데스크톱에서는 모바일 오버레이 닫기
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleNewChat = async () => {
    await createNewThread('새 대화');
    setIsSidebarOpen(false); // 모바일에서 새 대화 시작 시 사이드바 닫기
  };

  const handleQuickQuestion = (question: string) => {
    // 즉시 채팅 뷰로 전환 (로딩 모션 표시)
    setPendingQuestion(question);
    void sendChatMessage(question);
  };

  // AI(ASSISTANT) 응답이 실제로 도착했을 때만 pendingQuestion 해제
  // (optimistic USER 메시지나 loadMessages [] 리셋에 흔들리지 않음)
  useEffect(() => {
    if (pendingQuestion && messages.some((m) => m.role === 'ASSISTANT')) {
      setPendingQuestion(null);
    }
  }, [messages, pendingQuestion]);

  const handleSendMessage = (content: string) => {
    void sendChatMessage(content);
  };

  const handleSelectThread = (threadId: number) => {
    selectThread(threadId);
    setIsSidebarOpen(false); // 모바일에서 스레드 선택 시 사이드바 닫기
  };

  const toggleSidebar = () => {
    const isLargeScreen = window.innerWidth >= 1024;
    if (isLargeScreen) {
      // 데스크톱: collapse/expand
      setIsSidebarCollapsed(!isSidebarCollapsed);
    } else {
      // 모바일: open/close overlay
      setIsSidebarOpen(!isSidebarOpen);
    }
  };

  const isProcessing = messages.some(
    (msg) => msg.status === 'PROCESSING' || msg.status === 'QUEUED',
  );

  return (
    <div className="flex h-screen bg-gray-50 relative">
      {/* 모바일 오버레이 배경 */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* 사이드바 */}
      <div
        className={`
          fixed lg:static inset-y-0 left-0 z-30 lg:z-0
          transform transition-all duration-300 ease-in-out
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          ${isSidebarCollapsed ? 'lg:w-16' : 'lg:w-80'}
        `}
      >
        <ChatSidebar
          threads={threads}
          selectedThreadId={selectedThreadId}
          onSelectThread={handleSelectThread}
          onNewChat={handleNewChat}
          isLoading={isLoadingThreads}
          onClose={() => setIsSidebarOpen(false)}
          onToggleCollapse={window.innerWidth >= 1024 ? toggleSidebar : undefined}
          isCollapsed={isSidebarCollapsed}
        />
      </div>

      {/* 메인 컨텐츠 */}
      <div className="flex flex-1 flex-col bg-white h-screen overflow-hidden">
        <ChatHeader
          connectionStatus={connectionStatus}
          isProcessing={isProcessing}
          onToggleSidebar={toggleSidebar}
          isSidebarCollapsed={isSidebarCollapsed}
        />

        <ChatMessageList
          messages={messages}
          isLoading={isLoadingMessages}
          pendingQuestion={pendingQuestion}
          onRetry={retryMessage}
          onQuickQuestion={handleQuickQuestion}
        />

        <ChatComposer
          onSend={handleSendMessage}
          disabled={connectionStatus === 'DISCONNECTED'}
        />
      </div>
    </div>
  );
};

export default ChatPage;
