import { ChatSuggestionPanel } from './ChatSuggestionPanel';

import type { ChatMessage } from '@/types';

interface ChatWelcomePanelProps {
  onQuickQuestion: (question: string) => void;
  messages?: ChatMessage[];
}

export const ChatWelcomePanel = ({ onQuickQuestion, messages = [] }: ChatWelcomePanelProps) => {
  return (
    <div className="flex min-h-full items-center justify-center bg-white px-6 py-10">
      <div className="flex w-full max-w-6xl flex-col items-center animate-in fade-in zoom-in duration-700 text-center">
        <div className="mb-8 flex justify-center">
          <div className="flex h-40 w-40 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-gray-50 shadow-xl ring-1 ring-gray-100">
            <img
              src="/images/chatbot.png"
              alt="수셰프"
              className="h-full w-full object-cover"
            />
          </div>
        </div>

        <div className="space-y-3 text-center">
          <h1 className="text-3xl font-bold text-gray-900 italic">
            수셰프 <span className="not-italic text-sky-500">AI</span>
          </h1>
          <p className="text-base text-gray-500">
매출·재고·입고 관련 내용을 안내해 드릴게요.
          </p>
        </div>

        <div className="mt-10 flex w-full justify-center">
          <ChatSuggestionPanel onSelectPrompt={onQuickQuestion} messages={messages} variant="hero" />
        </div>
      </div>
    </div>
  );
};
