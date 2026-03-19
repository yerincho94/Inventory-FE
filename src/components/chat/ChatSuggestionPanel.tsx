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
}) => (
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

export const ChatSuggestionPanel = ({
                                        onSelectPrompt,
                                        variant = 'hero',
                                        messages: _messages = [],
                                    }: ChatSuggestionPanelProps) => {
    if (variant === 'compact') {
        return (
            <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap gap-2">
                    {CHAT_COMPACT_PROMPTS.map((prompt) => (
                        <PromptButton key={prompt.prompt} prompt={prompt} onSelect={onSelectPrompt} compact />
                    ))}
                </div>
            </section>
        );
    }

    return (
        <section className="w-full max-w-7xl">
            <div className="grid items-start gap-4 xl:grid-cols-2">
                {CHAT_GUIDED_PROMPT_GROUPS.map((group) => {
                    const Icon = group.icon;
                    return (
                        <div
                            key={group.id}
                            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                        >
                            <div className="mb-4 flex items-center gap-3">
                                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
                                    <Icon className="h-4 w-4" />
                                </div>
                                <h3 className="text-base font-semibold text-slate-900">{group.title}</h3>
                            </div>

                            <div className="space-y-4">
                                {group.sections.map((section) => (
                                    <div key={section.id} className="space-y-2">
                                        {section.title && (
                                            <h4 className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
                                                {section.title}
                                            </h4>
                                        )}
                                        <div className="flex flex-wrap gap-2">
                                            {section.prompts.map((prompt) => (
                                                <PromptButton key={prompt.prompt} prompt={prompt} onSelect={onSelectPrompt} />
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
