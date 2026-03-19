import { ChatSuggestionPanel } from './ChatSuggestionPanel';

import type { ChatMessage } from '@/types';

interface ChatWelcomePanelProps {
    onQuickQuestion: (question: string) => void;
    messages?: ChatMessage[];
}

export const ChatWelcomePanel = ({ onQuickQuestion, messages = [] }: ChatWelcomePanelProps) => {
    return (
        <div className="min-h-full bg-white px-5 py-6">
            <div className="mx-auto flex w-full max-w-7xl flex-col animate-in fade-in duration-500">
                <div className="mb-6 flex items-center gap-3">
                    <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border border-gray-200 bg-gray-50 shadow-sm">
                        <img
                            src="/images/chatbot.png"
                            alt="수셰프"
                            className="h-full w-full object-cover"
                        />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 italic">
                        수셰프 <span className="not-italic text-sky-500">AI</span>
                    </h1>
                </div>

                <ChatSuggestionPanel onSelectPrompt={onQuickQuestion} messages={messages} variant="hero" />
            </div>
        </div>
    );
};
