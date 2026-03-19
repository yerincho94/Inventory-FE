import { useEffect, useRef } from 'react';
import { ChatMessageBubble } from './ChatMessageBubble';
import { ChatSuggestionPanel } from './ChatSuggestionPanel';
import { ChatWelcomePanel } from './ChatWelcomePanel';
import { isSalesSummaryPromptCompleted } from './chatSalesSummaryCatalog';
import { isSalesTrendPromptCompleted } from './chatSalesTrendCatalog';
import { isSalesPeakPromptCompleted } from './chatSalesPeakCatalog';
import { isTopMenuRankingPromptCompleted } from './chatTopMenuRankingCatalog';
import type { ChatMessage } from '@/types';

interface ChatMessageListProps {
    messages: ChatMessage[];
    isLoading?: boolean;
    onRetry?: (message: ChatMessage) => void;
    onQuickQuestion?: (question: string) => void;
}

export const ChatMessageList = ({
                                    messages,
                                    isLoading,
                                    onRetry,
                                    onQuickQuestion,
                                }: ChatMessageListProps) => {
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (messages.length > 0) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages.length]);

    const shouldHideSuggestion = (suggestion: string) =>
        isSalesSummaryPromptCompleted(suggestion, messages)
        || isSalesTrendPromptCompleted(suggestion, messages)
        || isSalesPeakPromptCompleted(suggestion, messages)
        || isTopMenuRankingPromptCompleted(suggestion, messages);

    if (messages.length === 0 && !isLoading) {
        return <ChatWelcomePanel onQuickQuestion={onQuickQuestion || (() => undefined)} messages={messages} />;
    }

    return (
        <div ref={containerRef} className="flex-1 overflow-y-auto px-5 py-5 scroll-smooth">
            <div className="mx-auto max-w-6xl">
                <div className="mb-8 animate-in fade-in duration-500 pt-2">
                    <div className="flex items-center gap-3">
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

                    {onQuickQuestion && (
                        <div className="mt-5">
                            <ChatSuggestionPanel onSelectPrompt={onQuickQuestion} messages={messages} variant="compact" />
                        </div>
                    )}

                    <div className="mt-6 h-px w-full bg-gray-100" />
                </div>

                {messages.map((message) => (
                    <ChatMessageBubble
                        key={message.messageId}
                        message={message}
                        onRetry={onRetry}
                        onQuickQuestion={onQuickQuestion}
                        shouldHideSuggestion={shouldHideSuggestion}
                    />
                ))}

                {isLoading && (
                    <div className="mb-4 flex justify-start">
                        <div className="flex max-w-[70%] gap-3">
                            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-full border border-gray-100 bg-gray-50 shadow-sm">
                                <img
                                    src="/images/chatbot.png"
                                    alt="수셰프"
                                    className="h-full w-full object-cover"
                                />
                            </div>
                            <div className="rounded-3xl rounded-tl-sm border border-gray-100 bg-white px-4 py-3 shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
                                <div className="flex gap-1">
                                    <div className="h-2 w-2 animate-bounce rounded-full bg-sky-400" style={{ animationDelay: '0ms' }} />
                                    <div className="h-2 w-2 animate-bounce rounded-full bg-sky-400" style={{ animationDelay: '150ms' }} />
                                    <div className="h-2 w-2 animate-bounce rounded-full bg-sky-400" style={{ animationDelay: '300ms' }} />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>
        </div>
    );
};
