import {
    CHAT_COMPACT_PROMPTS,
    CHAT_GUIDED_PROMPT_GROUPS,
    type ChatGuidedPrompt,
    type ChatGuidedPromptSection,
} from './chatPromptCatalog';
import type { ChatMessage } from '@/types';

interface ChatSuggestionPanelProps {
    onSelectPrompt: (prompt: string) => void;
    variant?: 'hero' | 'compact';
    messages?: ChatMessage[];
}

const getSectionGridClass = (section: ChatGuidedPromptSection) => {
    if (section.columns === 3) {
        return 'grid gap-3 md:grid-cols-2 xl:grid-cols-3';
    }

    return 'grid gap-3 md:grid-cols-2';
};

const PromptChip = ({
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
        className={`text-left transition-all duration-200 ${
            compact
                ? 'rounded-full border border-sky-100 bg-white px-3 py-2 text-sm font-medium text-sky-700 shadow-sm hover:border-sky-300 hover:bg-sky-50'
                : 'w-full rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm hover:-translate-y-0.5 hover:border-sky-300 hover:bg-sky-50 hover:shadow-md'
        }`}
    >
        <div className={compact ? '' : 'space-y-2'}>
            <p className={compact ? 'text-sm font-medium' : 'text-base font-semibold text-slate-900'}>
                {prompt.label}
            </p>
            {!compact && prompt.description && (
                <p className="text-sm leading-6 text-slate-500">{prompt.description}</p>
            )}
        </div>
    </button>
);

export const ChatSuggestionPanel = ({
                                        onSelectPrompt,
                                        variant = 'hero',
                                        messages: _messages = [],
                                    }: ChatSuggestionPanelProps) => {
    if (variant === 'compact') {
        return (
            <section className="mb-8 rounded-3xl border border-sky-100 bg-gradient-to-br from-sky-50 via-white to-cyan-50 p-5 shadow-sm">
                <div className="flex flex-wrap gap-2.5">
                    {CHAT_COMPACT_PROMPTS.map((prompt) => (
                        <PromptChip key={prompt.prompt} prompt={prompt} onSelect={onSelectPrompt} compact />
                    ))}
                </div>
            </section>
        );
    }

    return (
        <section className="w-full max-w-6xl">
            <div className="grid gap-4 xl:grid-cols-2">
                {CHAT_GUIDED_PROMPT_GROUPS.map((group) => {
                    const Icon = group.icon;
                    return (
                        <div
                            key={group.id}
                            className="rounded-3xl border border-slate-200 bg-white/95 p-5 text-left shadow-[0_18px_45px_rgba(15,23,42,0.06)]"
                        >
                            <div className="flex items-start gap-4">
                                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50 text-sky-600">
                                    <Icon className="h-6 w-6" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-slate-900">{group.title}</h3>
                                    <p className="mt-1 text-sm leading-6 text-slate-600">{group.description}</p>
                                </div>
                            </div>

                            <div className="mt-5 space-y-6">
                                {group.sections.map((section, index) => (
                                    <div key={section.id}>
                                        {index > 0 && <div className="mb-5 h-px w-full bg-slate-100" />}
                                        {section.title && (
                                            <h4 className="mb-3 text-sm font-semibold text-slate-900">{section.title}</h4>
                                        )}
                                        <div className={getSectionGridClass(section)}>
                                            {section.prompts.map((prompt) => (
                                                <PromptChip key={prompt.prompt} prompt={prompt} onSelect={onSelectPrompt} />
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