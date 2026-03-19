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
    pendingQuestion?: string | null;
    onRetry?: (message: ChatMessage) => void;
    onQuickQuestion?: (question: string) => void;
}

export const ChatMessageList = ({
    messages,
    isLoading,
    pendingQuestion,
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

    // messages가 비어 있고, pendingQuestion도 없고, 로딩 중도 아닐 때만 Welcome 화면
    if (messages.length === 0 && !isLoading && !pendingQuestion) {
        return (
            <div className="flex flex-1 overflow-y-auto">
                <ChatWelcomePanel onQuickQuestion={onQuickQuestion || (() => undefined)} messages={messages} />
            </div>
        );
    }

    return (
        <div ref={containerRef} className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-6 scroll-smooth">
            <div className="mx-auto max-w-5xl">
                <div className="mb-8 sm:mb-10 animate-in fade-in duration-700 pt-2 sm:pt-4">
                    <div className="flex flex-col items-center gap-3 sm:gap-4 text-center">
                        <div className="flex h-20 w-20 sm:h-28 sm:w-28 items-center justify-center overflow-hidden rounded-full border-2 border-white bg-gray-50 shadow-lg ring-1 ring-gray-100">
                            <img
                                src="/images/chatbot.png"
                                alt="수셰프"
                                className="h-full w-full object-contain sm:object-cover"
                            />
                        </div>
                        <div className="space-y-1.5 sm:space-y-2">
                            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 italic">
                                수셰프 <span className="not-italic text-sky-500">AI</span>
                            </h1>
                            <p className="text-sm sm:text-base text-gray-500">
                                매출·재고·입고 관련 내용을 바로 확인해보세요.
                            </p>
                        </div>
                    </div>

                    {onQuickQuestion && (
                        <div className="mt-6 sm:mt-8">
                            <ChatSuggestionPanel onSelectPrompt={onQuickQuestion} messages={messages} variant="compact" />
                        </div>
                    )}

                    <div className="mt-6 sm:mt-8 h-px w-full bg-gray-100" />
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

                {/* pendingQuestion: Welcome에서 바로 전환 시 사용자 질문 버블 표시 */}
                {pendingQuestion && messages.length === 0 && (
                    <div className="mb-4 flex justify-end">
                        <div className="max-w-[85%] sm:max-w-[70%] rounded-3xl rounded-tr-sm bg-sky-500 px-4 py-3 text-sm text-white shadow-sm">
                            {pendingQuestion}
                        </div>
                    </div>
                )}

                {/* 로딩 dot 애니메이션: isLoading 혹은 pendingQuestion 시 */}
                {(isLoading || (pendingQuestion && messages.length === 0)) && (
                    <div className="mb-4 flex justify-start">
                        <div className="flex max-w-[85%] sm:max-w-[70%] gap-2 sm:gap-3">
                            <div className="flex h-8 w-8 sm:h-10 sm:w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-full border border-gray-100 bg-gray-50 shadow-sm">
                                <img
                                    src="/images/chatbot.png"
                                    alt="수셰프"
                                    className="h-full w-full object-contain sm:object-cover"
                                />
                            </div>
                            <div className="rounded-3xl rounded-tl-sm border border-gray-100 bg-white px-3 sm:px-4 py-2.5 sm:py-3 shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
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
