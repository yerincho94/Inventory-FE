import { useState, useEffect } from 'react';
import { useChat } from '@/hooks/useChat';
import { ChatSidebar } from '@/components/chat/ChatSidebar';
import { ChatHeader } from '@/components/chat/ChatHeader';
import { ChatMessageList } from '@/components/chat/ChatMessageList';
import { ChatComposer } from '@/components/chat/ChatComposer';

export const ChatPage = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
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
    interruptCurrent,
  } = useChat();

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) setIsSidebarOpen(false);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleNewChat = async () => {
    await createNewThread('새 대화');
    setIsSidebarOpen(false);
  };

  const handleQuickQuestion = (question: string) => {
    setPendingQuestion(question);
    void sendChatMessage(question);
  };

  useEffect(() => {
    if (pendingQuestion && messages.some((m) => m.role === 'ASSISTANT')) setPendingQuestion(null);
  }, [messages, pendingQuestion]);

  const handleSendMessage = (content: string) => {
    void sendChatMessage(content);
  };

  const handleSelectThread = (threadId: number) => {
    selectThread(threadId);
    setIsSidebarOpen(false);
  };

  const toggleSidebar = () => {
    if (window.innerWidth >= 1024) setIsSidebarCollapsed(!isSidebarCollapsed);
    else setIsSidebarOpen(!isSidebarOpen);
  };

  const isProcessing = messages.some((msg) => msg.status === 'PROCESSING' || msg.status === 'QUEUED');

  return (
    <div className="flex h-screen bg-gray-50 relative">
      {isSidebarOpen && <div className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden" onClick={() => setIsSidebarOpen(false)} />}

      <div className={`fixed lg:static inset-y-0 left-0 z-30 lg:z-0 transform transition-all duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'} ${isSidebarCollapsed ? 'lg:w-16' : 'lg:w-80'}`}>
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

      <div className="flex flex-1 flex-col bg-white h-screen overflow-hidden">
        <ChatHeader connectionStatus={connectionStatus} isProcessing={isProcessing} onToggleSidebar={toggleSidebar} isSidebarCollapsed={isSidebarCollapsed} />

        <ChatMessageList messages={messages} isLoading={isLoadingMessages} pendingQuestion={pendingQuestion} onRetry={retryMessage} onQuickQuestion={handleQuickQuestion} />

        <ChatComposer
          onSend={handleSendMessage}
          onInterrupt={interruptCurrent}
          disabled={connectionStatus === 'DISCONNECTED'}
          isProcessing={isProcessing}
        />
      </div>
    </div>
  );
};

export default ChatPage;
