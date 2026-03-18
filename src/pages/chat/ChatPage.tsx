import { useChat } from '@/hooks/useChat';
import { ChatSidebar } from '@/components/chat/ChatSidebar';
import { ChatHeader } from '@/components/chat/ChatHeader';
import { ChatMessageList } from '@/components/chat/ChatMessageList';
import { ChatComposer } from '@/components/chat/ChatComposer';

export const ChatPage = () => {
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

  const handleNewChat = async () => {
    await createNewThread('새 대화');
  };

  const handleQuickQuestion = (question: string) => {
    void sendChatMessage(question);
  };

  const handleSendMessage = (content: string) => {
    void sendChatMessage(content);
  };

  const isProcessing = messages.some(
    (msg) => msg.status === 'PROCESSING' || msg.status === 'QUEUED',
  );

  return (
    <div className="flex h-screen bg-gray-50">
      <ChatSidebar
        threads={threads}
        selectedThreadId={selectedThreadId}
        onSelectThread={selectThread}
        onNewChat={handleNewChat}
        isLoading={isLoadingThreads}
      />

      <div className="flex flex-1 flex-col bg-white">
        <ChatHeader
          connectionStatus={connectionStatus}
          isProcessing={isProcessing}
        />

        <ChatMessageList
          messages={messages}
          isLoading={isLoadingMessages}
          onRetry={retryMessage}
          onQuickQuestion={handleQuickQuestion}
        />

        <ChatComposer
          onSend={handleSendMessage}
          disabled={isProcessing || connectionStatus !== 'CONNECTED'}
        />
      </div>
    </div>
  );
};

export default ChatPage;
