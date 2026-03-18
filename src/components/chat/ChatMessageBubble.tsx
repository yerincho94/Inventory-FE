import { RefreshCw } from 'lucide-react';
import type { ChatMessage } from '@/types';
import { parseChatMessageContent } from './chatMessageContent';

interface ChatMessageBubbleProps {
  message: ChatMessage;
  onRetry?: (message: ChatMessage) => void;
  onQuickQuestion?: (question: string) => void;
  shouldHideSuggestion?: (suggestion: string) => boolean;
}

export const ChatMessageBubble = ({
  message,
  onRetry,
  onQuickQuestion,
  shouldHideSuggestion,
}: ChatMessageBubbleProps) => {
  const isUser = message.role === 'USER';
  const isFailed = message.status === 'FAILED';
  const isProcessing = message.status === 'PROCESSING' || message.status === 'QUEUED';
  const parsedContent = !isUser ? parseChatMessageContent(message.content) : { body: message.content, suggestions: [] };
  const visibleSuggestions = parsedContent.suggestions.filter(
    (suggestion) => !shouldHideSuggestion?.(suggestion),
  );

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
  };

  const renderBody = (content: string) => {
    const sections = content.split(/\n(?=###\s)/).filter(Boolean);

    if (sections.length > 1 || content.includes('###')) {
      return (
        <div className="space-y-4">
          {sections.map((section, index) => {
            const lines = section.split('\n').filter(Boolean);
            const titleLine = lines[0] || '';
            const isSectionTitle = titleLine.startsWith('### ');

            if (isSectionTitle) {
              const title = titleLine.replace(/^###\s*/, '');
              const bodyLines = lines.slice(1);

              return (
                <section key={`${message.messageId}-section-${index}`} className="space-y-2">
                  <h4 className="text-sm font-semibold text-sky-600">{title}</h4>
                  <div className="space-y-1.5">
                    {bodyLines.map((line, lineIndex) => {
                      const trimmed = line.trim();
                      const isBullet = /^[-•*]\s+/.test(trimmed);
                      const normalized = trimmed.replace(/^[-•*]\s+/, '');

                      if (isBullet) {
                        return (
                          <div
                            key={`${message.messageId}-section-${index}-line-${lineIndex}`}
                            className="flex gap-2 text-sm leading-relaxed text-slate-700"
                          >
                            <span className="mt-1 text-sky-500">•</span>
                            <span className="whitespace-pre-wrap">{normalized}</span>
                          </div>
                        );
                      }

                      return (
                        <p
                          key={`${message.messageId}-section-${index}-line-${lineIndex}`}
                          className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700"
                        >
                          {trimmed}
                        </p>
                      );
                    })}
                  </div>
                </section>
              );
            }

            return (
              <p
                key={`${message.messageId}-plain-${index}`}
                className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700"
              >
                {section}
              </p>
            );
          })}
        </div>
      );
    }

    return (
      <div className={`${isUser ? 'text-gray-800' : 'text-slate-700'} whitespace-pre-wrap text-sm leading-relaxed`}>
        {content}
      </div>
    );
  };

  const contentToRender = isUser ? message.content : parsedContent.body || message.content;

  return (
    <div className={`mb-5 flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex max-w-[80%] gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        {!isUser && (
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-full border border-gray-100 bg-gray-50 shadow-sm">
            <img
              src="/images/chatbot.png"
              alt="수셰프"
              className="h-full w-full object-cover"
            />
          </div>
        )}

        <div className="flex flex-col gap-2">
          <div
            className={`rounded-3xl px-4 py-3 shadow-[0_2px_8px_rgba(0,0,0,0.05)] transition-all ${isUser
              ? 'rounded-tr-sm border-2 border-sky-100 bg-white text-gray-800'
              : 'rounded-tl-sm border border-gray-100 bg-white text-gray-700'
              } ${isFailed ? 'border-red-200 bg-red-50/50' : ''}`}
          >
            {isFailed && (
              <div className="mb-2 text-sm font-medium text-red-600">
                {message.errorMessage || '오류가 발생했습니다'}
              </div>
            )}
            {renderBody(contentToRender)}
          </div>

          {!isUser && visibleSuggestions.length > 0 && onQuickQuestion && (
            <div className="flex flex-wrap gap-2 pl-1">
              {visibleSuggestions.map((suggestion) => (
                <button
                  key={`${message.messageId}-${suggestion}`}
                  type="button"
                  onClick={() => onQuickQuestion(suggestion)}
                  className="rounded-full border border-sky-100 bg-sky-50 px-3 py-2 text-sm font-medium text-sky-700 transition-all hover:border-sky-300 hover:bg-sky-100"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}

          <div className={`flex items-center gap-2 px-2 ${isUser ? 'justify-end' : 'justify-start'}`}>
            <span className="text-xs text-gray-500">{formatTime(message.createdAt)}</span>
            {isProcessing && (
              <div className="flex gap-1">
                <div className="h-1 w-1 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: '0ms' }} />
                <div className="h-1 w-1 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: '150ms' }} />
                <div className="h-1 w-1 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: '300ms' }} />
              </div>
            )}
          </div>

          {isFailed && onRetry && (
            <button
              type="button"
              onClick={() => onRetry(message)}
              className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-red-600 transition-colors hover:bg-red-50 hover:text-red-700"
            >
              <RefreshCw className="h-4 w-4" />
              다시 전송
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
