import { useMemo, useState, type ReactNode } from 'react';
import type { ChatMessage } from '@/types';
import {
  TOP_MENU_COUNT_OPTIONS,
  TOP_MENU_PERIOD_OPTIONS,
  TOP_MENU_PRIMARY_ACTIONS,
  buildCustomTopMenuRankingPrompt,
  buildTopMenuRankingPrompt,
  collectCompletedTopMenuRankingSelections,
  isTopMenuPresetCompleted,
  normalizeTopMenuCount,
  type TopMenuRankingCountSelectionKey,
  type TopMenuRankingDateRangeSelection,
  type TopMenuRankingPresetKey,
  type TopMenuRankingRankByKey,
} from './chatTopMenuRankingCatalog';

interface ChatTopMenuRankingPanelProps {
  onSelectPrompt: (prompt: string) => void;
  messages?: ChatMessage[];
  variant?: 'hero' | 'compact';
}

const createEmptyDateRange = (): TopMenuRankingDateRangeSelection => ({
  from: '',
  to: '',
});

const SectionTitle = ({
  title,
  helper,
}: {
  title: string;
  helper?: string;
}) => (
  <div className="space-y-1">
    <h4 className="text-sm font-semibold text-slate-900">{title}</h4>
    {helper && <p className="text-xs leading-5 text-slate-500">{helper}</p>}
  </div>
);

const PrimaryActionButton = ({
  label,
  description,
  active,
  compact,
  onClick,
}: {
  label: string;
  description: string;
  active: boolean;
  compact: boolean;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`rounded-2xl border text-left transition-all duration-200 ${compact
      ? `px-3 py-3 ${active
        ? 'border-sky-300 bg-sky-50 shadow-sm'
        : 'border-slate-200 bg-white hover:border-sky-200 hover:bg-slate-50'
      }`
      : `px-4 py-4 ${active
        ? 'border-sky-300 bg-sky-50 shadow-sm'
        : 'border-slate-200 bg-white hover:-translate-y-0.5 hover:border-sky-200 hover:bg-slate-50 hover:shadow-sm'
      }`
      }`}
  >
    <div className="space-y-1.5">
      <p className="text-sm font-semibold text-slate-900">{label}</p>
      <p className="text-xs leading-5 text-slate-500">{description}</p>
    </div>
  </button>
);

const OptionChip = ({
  label,
  active = false,
  onClick,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`rounded-full border px-3 py-2 text-sm font-medium shadow-sm transition-all ${active
      ? 'border-sky-300 bg-sky-100 text-sky-700'
      : 'border-sky-100 bg-white text-sky-700 hover:border-sky-300 hover:bg-sky-50'
      }`}
  >
    {label}
  </button>
);

const DateInput = ({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) => (
  <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
    <span>{label}</span>
    <input
      type="date"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition-colors focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
    />
  </label>
);

const InlinePanelContainer = ({ children }: { children: ReactNode }) => (
  <div className="rounded-2xl border border-dashed border-sky-200 bg-sky-50/50 p-4">{children}</div>
);

export const ChatTopMenuRankingPanel = ({
  onSelectPrompt,
  messages = [],
  variant = 'hero',
}: ChatTopMenuRankingPanelProps) => {
  const compact = variant === 'compact';
  const [activeRankBy, setActiveRankBy] = useState<TopMenuRankingRankByKey | null>(null);
  const [selectedCount, setSelectedCount] = useState<TopMenuRankingCountSelectionKey>(5);
  const [customTopNInput, setCustomTopNInput] = useState('');
  const [customRange, setCustomRange] = useState<TopMenuRankingDateRangeSelection>(createEmptyDateRange);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const completedSelections = useMemo(
    () => collectCompletedTopMenuRankingSelections(messages),
    [messages],
  );

  const activeRankByConfig = TOP_MENU_PRIMARY_ACTIONS.find((action) => action.key === activeRankBy) ?? null;

  const resolveSelectedTopN = () => {
    if (selectedCount !== 'custom') {
      return selectedCount;
    }

    const parsed = Number(customTopNInput);
    if (!Number.isFinite(parsed) || !Number.isInteger(parsed)) {
      return null;
    }

    if (parsed < 1 || parsed > 20) {
      return null;
    }

    return normalizeTopMenuCount(parsed);
  };

  const effectiveTopN = resolveSelectedTopN() ?? 5;

  const visiblePeriodOptions = useMemo(() => {
    if (!activeRankBy) {
      return TOP_MENU_PERIOD_OPTIONS;
    }

    return TOP_MENU_PERIOD_OPTIONS.filter(
      (option) => !isTopMenuPresetCompleted(completedSelections, activeRankBy, option.key, effectiveTopN),
    );
  }, [activeRankBy, completedSelections, effectiveTopN]);

  const resetInlineState = () => {
    setSelectedCount(5);
    setCustomTopNInput('');
    setCustomRange(createEmptyDateRange());
    setErrorMessage(null);
  };

  const toggleRankBy = (nextRankBy: TopMenuRankingRankByKey) => {
    setActiveRankBy((currentRankBy) => {
      const resolvedRankBy = currentRankBy === nextRankBy ? null : nextRankBy;
      resetInlineState();
      return resolvedRankBy;
    });
  };

  const validateDateRange = (range: TopMenuRankingDateRangeSelection) => {
    if (!range.from || !range.to) {
      return '조회 기간의 시작일과 종료일을 모두 선택해 주세요.';
    }

    if (range.from > range.to) {
      return '조회 기간의 시작일은 종료일보다 앞서야 합니다.';
    }

    return null;
  };

  const validateTopN = () => {
    const resolvedTopN = resolveSelectedTopN();
    if (resolvedTopN == null) {
      return '메뉴 개수는 1부터 20 사이의 정수로 입력해 주세요.';
    }

    return null;
  };

  const handlePresetSelect = (periodKey: Exclude<TopMenuRankingPresetKey, 'custom'>) => {
    if (!activeRankBy) {
      return;
    }

    const topNError = validateTopN();
    if (topNError) {
      setErrorMessage(topNError);
      return;
    }

    setErrorMessage(null);
    onSelectPrompt(buildTopMenuRankingPrompt(activeRankBy, periodKey, resolveSelectedTopN() ?? 5));
  };

  const handleApplyCustomRange = () => {
    if (!activeRankBy) {
      return;
    }

    const topNError = validateTopN();
    if (topNError) {
      setErrorMessage(topNError);
      return;
    }

    const validationError = validateDateRange(customRange);
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    setErrorMessage(null);
    onSelectPrompt(buildCustomTopMenuRankingPrompt(activeRankBy, customRange, resolveSelectedTopN() ?? 5));
  };

  const renderMenuSelectionSection = () => (
    <InlinePanelContainer>
      <div className="space-y-4">
        <SectionTitle
          title="볼 메뉴 개수 선택"
          helper={activeRankByConfig?.helper ?? '메뉴별 판매 수량, 총매출, 매출 비중을 함께 확인할 수 있습니다.'}
        />
        <div className="flex flex-wrap gap-2">
          {TOP_MENU_COUNT_OPTIONS.map((option) => (
            <OptionChip
              key={option.key}
              label={option.label}
              active={selectedCount === option.key}
              onClick={() => {
                setSelectedCount(option.key);
                if (option.key !== 'custom') {
                  setCustomTopNInput('');
                }
                setErrorMessage(null);
              }}
            />
          ))}
        </div>

        {selectedCount === 'custom' && (
          <div className="rounded-2xl border border-white bg-white/80 p-4 shadow-sm">
            <div className="space-y-3">
              <SectionTitle
                title="직접 개수 입력"
                helper="1개부터 20개까지 원하는 메뉴 개수를 직접 입력해 주세요."
              />
              <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                <span>메뉴 개수</span>
                <input
                  type="number"
                  min={1}
                  max={20}
                  step={1}
                  value={customTopNInput}
                  onChange={(event) => {
                    setCustomTopNInput(event.target.value);
                    setErrorMessage(null);
                  }}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition-colors focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
                  placeholder="예: 7"
                />
              </label>
            </div>
          </div>
        )}

        <SectionTitle
          title="기간 선택"
          helper="이미 확인한 메뉴 랭킹은 제외하고, 아직 보지 않은 기간부터 빠르게 확인할 수 있습니다."
        />
        {visiblePeriodOptions.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {visiblePeriodOptions.map((option) => (
              <OptionChip
                key={option.key}
                label={option.label}
                onClick={() => handlePresetSelect(option.key)}
              />
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500">
            현재 선택 기준에서는 빠른 선택 항목을 모두 확인했습니다. 직접 기간을 선택해 다른 메뉴 랭킹을 확인해 보세요.
          </p>
        )}

        <div className="rounded-2xl border border-white bg-white/80 p-4 shadow-sm">
          <div className="space-y-3">
            <SectionTitle
              title="직접 기간 선택"
              helper="원하는 날짜 범위를 직접 입력해 많이 팔린 메뉴나 매출이 큰 메뉴 순위를 확인합니다."
            />
            <div className={`grid gap-3 ${compact ? 'md:grid-cols-1' : 'md:grid-cols-2'}`}>
              <DateInput
                label="시작일"
                value={customRange.from}
                onChange={(value) => {
                  setCustomRange((previous) => ({ ...previous, from: value }));
                  setErrorMessage(null);
                }}
              />
              <DateInput
                label="종료일"
                value={customRange.to}
                onChange={(value) => {
                  setCustomRange((previous) => ({ ...previous, to: value }));
                  setErrorMessage(null);
                }}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleApplyCustomRange}
                className="rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-sky-600"
              >
                적용
              </button>
              <button
                type="button"
                onClick={() => {
                  setCustomRange(createEmptyDateRange());
                  setErrorMessage(null);
                }}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
              >
                초기화
              </button>
            </div>
          </div>
        </div>
      </div>
    </InlinePanelContainer>
  );

  return (
    <div className="space-y-4">
      <div className={`grid gap-3 ${compact ? 'md:grid-cols-2' : 'xl:grid-cols-2'}`}>
        {TOP_MENU_PRIMARY_ACTIONS.map((action) => (
          <PrimaryActionButton
            key={action.key}
            label={action.label}
            description={action.description}
            active={activeRankBy === action.key}
            compact={compact}
            onClick={() => toggleRankBy(action.key)}
          />
        ))}
      </div>

      {activeRankBy && renderMenuSelectionSection()}

      {errorMessage && (
        <p className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
          {errorMessage}
        </p>
      )}
    </div>
  );
};
