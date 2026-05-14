import { useState, useRef, type KeyboardEvent } from 'react';
import { Send } from 'lucide-react';

interface ChatComposerProps {
  onSend: (message: string) => void;
  onInterrupt?: () => void;
  disabled?: boolean;
  isProcessing?: boolean;
  placeholder?: string;
}

export const ChatComposer = ({
  onSend,
  onInterrupt: _onInterrupt,
  disabled = false,
  isProcessing: _isProcessing = false,
  placeholder = '메시지를 입력하세요...',
}: ChatComposerProps) => {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
  };

  return (
    <div className="bg-white px-3 sm:px-6 pb-3 sm:pb-4">
      <div className="border-t border-gray-200 mb-3 sm:mb-4" />
      <div className="mx-auto max-w-4xl space-y-3">
        <div className="flex items-end gap-2 sm:gap-3 rounded-2xl border border-gray-200 bg-gray-50 p-2 sm:p-3 transition-all focus-within:border-sky-300 focus-within:ring-2 focus-within:ring-sky-100">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            rows={1}
            className="max-h-[200px] flex-1 resize-none border-none bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400 disabled:opacity-50"
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={!input.trim() || disabled}
            className="flex h-9 w-9 sm:h-10 sm:w-10 flex-shrink-0 items-center justify-center rounded-xl bg-sky-500 text-white transition-colors hover:bg-sky-600 disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            <Send className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
