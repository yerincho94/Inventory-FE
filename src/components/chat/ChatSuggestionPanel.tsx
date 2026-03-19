import {
    CHAT_COMPACT_PROMPTS,
    CHAT_GUIDED_PROMPT_GROUPS,
    type ChatGuidedPrompt,
} from './chatPromptCatalog';
import type { ChatMessage } from '@/types';

interface ChatSuggestionPanelProps {
    onSelectPrompt: (prompt: string) => void;
    variant?: 'hero' | 'compact';
    messages?: ChatMessage[];
}

const PromptButton = ({
                          prompt,
                          onSelect,
                          compact = false,
                      }: {
    prompt: ChatGuidedPrompt;
    onSelect: (prompt: string) => void;
    compact?: boolean;
}) => {
    // placeholder 버튼은 투명하게 렌더링
    if (prompt.description === 'placeholder') {
        return <div className="inline-flex min-h-9 max-w-full items-center rounded-xl px-3 py-2 opacity-0 pointer-events-none" />;
    }

    return (
        <button
            type="button"
            onClick={() => onSelect(prompt.prompt)}
            className={compact
                ? 'inline-flex h-9 items-center rounded-full border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition-colors hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700'
                : 'inline-flex min-h-9 max-w-full items-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 transition-colors hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700'}
        >
            <span className="truncate">{prompt.label}</span>
        </button>
    );
};

export const ChatSuggestionPanel = ({
                                        onSelectPrompt,
                                        variant = 'hero',
                                        messages: _messages = [],
                                    }: ChatSuggestionPanelProps) => {
    if (variant === 'compact') {
        return (
            <section className="mb-4 sm:mb-6 rounded-2xl border border-slate-200 bg-white p-3 sm:p-4 shadow-sm">
                <div className="flex flex-wrap gap-1.5 sm:gap-2">
                    {CHAT_COMPACT_PROMPTS.map((prompt) => (
                        <PromptButton key={prompt.prompt} prompt={prompt} onSelect={onSelectPrompt} compact />
                    ))}
                </div>
            </section>
        );
    }

    return (
        <section className="w-full max-w-7xl">
            <div className="grid items-stretch gap-3 sm:gap-4 xl:grid-cols-2">
                {CHAT_GUIDED_PROMPT_GROUPS.map((group) => {
                    const Icon = group.icon;
                    return (
                        <div
                            key={group.id}
                            className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-4 shadow-sm flex flex-col"
                        >
                            <div className="mb-3 sm:mb-4 flex items-center gap-2 sm:gap-3">
                                <div className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl bg-sky-50 text-sky-600 flex-shrink-0">
                                    <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                </div>
                                <h3 className="text-sm sm:text-base font-semibold text-slate-900">{group.title}</h3>
                            </div>

                            <div className="space-y-4 flex-1">
                                {group.sections.map((section) => (
                                    <div key={section.id} className="space-y-2 text-left">
                                        {section.title && (
                                            <h4 className="text-xs font-semibold tracking-wide text-slate-500 uppercase text-left">
                                                {section.title}
                                            </h4>
                                        )}
                                        <div className="flex flex-wrap gap-2 justify-start">
                                            {section.prompts.map((prompt, index) => (
                                                <PromptButton key={`${prompt.prompt}-${index}`} prompt={prompt} onSelect={onSelectPrompt} />
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </section>
    );
};
