import { useMemo, useState, type ReactNode } from 'react';
import type { ChatMessage } from '@/types';
import {
  SALES_SUMMARY_COMPARE_MODE_OPTIONS,
  SALES_SUMMARY_COMPARE_TARGET_OPTIONS,
  SALES_SUMMARY_PERIOD_OPTIONS,
  SALES_SUMMARY_PRIMARY_ACTIONS,
  SALES_SUMMARY_TODAY_OPTIONS,
  buildCustomComparePrompt,
  buildCustomRangeComparePrompt,
  buildCustomSalesSummaryPrompt,
  buildSalesSummaryComparePrompt,
  buildSalesSummaryPrompt,
  collectCompletedSalesSummarySelections,
  isComparePresetCompleted,
  isSummaryPresetCompleted,
  type CustomCompareRangeSelection,
  type DateRangeSelection,
  type SalesSummaryCompareMode,
  type SalesSummaryPresetKey,
  type SalesSummaryPrimaryActionKey,
} from './chatSalesSummaryCatalog';

interface ChatSalesSummaryPanelProps {
  onSelectPrompt: (prompt: string) => void;
  messages?: ChatMessage[];
  variant?: 'hero' | 'compact';
}

const createEmptyDateRange = (): DateRangeSelection => ({
  from: '',
  to: '',
});

const createEmptyCustomCompareRange = (): CustomCompareRangeSelection => ({
  targetFrom: '',
  targetTo: '',
  baseFrom: '',
  baseTo: '',
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
  onClick,
}: {
  label: string;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className="rounded-full border border-sky-100 bg-white px-3 py-2 text-sm font-medium text-sky-700 shadow-sm transition-all hover:border-sky-300 hover:bg-sky-50"
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

export const ChatSalesSummaryPanel = ({
  onSelectPrompt,
  messages = [],
  variant = 'hero',
}: ChatSalesSummaryPanelProps) => {
  const compact = variant === 'compact';
  const [activePrimaryAction, setActivePrimaryAction] = useState<SalesSummaryPrimaryActionKey | null>(null);
  const [selectedCompareMode, setSelectedCompareMode] = useState<SalesSummaryCompareMode | null>(null);
  const [summaryCustomRange, setSummaryCustomRange] = useState<DateRangeSelection>(createEmptyDateRange);
  const [compareCustomRange, setCompareCustomRange] = useState<DateRangeSelection>(createEmptyDateRange);
  const [customCompareRange, setCustomCompareRange] = useState<CustomCompareRangeSelection>(createEmptyCustomCompareRange);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const completedSelections = useMemo(
    () => collectCompletedSalesSummarySelections(messages),
    [messages],
  );

  const visibleTodayOptions = SALES_SUMMARY_TODAY_OPTIONS.filter(
    (option) => !isSummaryPresetCompleted(completedSelections, option.key),
  );

  const visiblePeriodOptions = SALES_SUMMARY_PERIOD_OPTIONS.filter((option) => {
    if (option.key === 'custom') {
      return true;
    }

    return !isSummaryPresetCompleted(completedSelections, option.key);
  });

  const visibleCompareTargetOptions = SALES_SUMMARY_COMPARE_TARGET_OPTIONS.filter((option) => {
    if (!selectedCompareMode || option.key === 'custom') {
      return true;
    }

    return !isComparePresetCompleted(completedSelections, selectedCompareMode, option.key);
  });

  const resetInlineState = () => {
    setSelectedCompareMode(null);
    setSummaryCustomRange(createEmptyDateRange());
    setCompareCustomRange(createEmptyDateRange());
    setCustomCompareRange(createEmptyCustomCompareRange());
    setErrorMessage(null);
  };

  const togglePrimaryAction = (nextAction: SalesSummaryPrimaryActionKey) => {
    setActivePrimaryAction((currentAction) => {
      const resolvedAction = currentAction === nextAction ? null : nextAction;
      resetInlineState();
      return resolvedAction;
    });
  };

  const validateDateRange = (range: DateRangeSelection, label: string) => {
    if (!range.from || !range.to) {
      return `${label}의 시작일과 종료일을 모두 선택해 주세요.`;
    }

    if (range.from > range.to) {
      return `${label}의 시작일은 종료일보다 앞서야 합니다.`;
    }

    return null;
  };

  const handleSummaryPresetSelect = (periodKey: Exclude<SalesSummaryPresetKey, 'custom'>) => {
    setErrorMessage(null);
    onSelectPrompt(buildSalesSummaryPrompt(periodKey));
  };

  const handleApplyCustomSummary = () => {
    const validationError = validateDateRange(summaryCustomRange, '조회 기간');
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    setErrorMessage(null);
    onSelectPrompt(buildCustomSalesSummaryPrompt(summaryCustomRange));
  };

  const handleCompareModeSelect = (compareMode: SalesSummaryCompareMode) => {
    setSelectedCompareMode(compareMode);
    setCompareCustomRange(createEmptyDateRange());
    setCustomCompareRange(createEmptyCustomCompareRange());
    setErrorMessage(null);
  };

  const handleComparePresetSelect = (periodKey: Exclude<SalesSummaryPresetKey, 'custom'>) => {
    if (!selectedCompareMode || selectedCompareMode === 'custom') {
      return;
    }

    setErrorMessage(null);
    onSelectPrompt(buildSalesSummaryComparePrompt(selectedCompareMode, periodKey));
  };

  const handleApplyCustomTargetCompare = () => {
    if (!selectedCompareMode || selectedCompareMode === 'custom') {
      return;
    }

    const validationError = validateDateRange(compareCustomRange, '조회 기간');
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    setErrorMessage(null);
    onSelectPrompt(buildCustomRangeComparePrompt(selectedCompareMode, compareCustomRange));
  };

  const handleApplyCustomCompare = () => {
    const targetValidationError = validateDateRange(
      {
        from: customCompareRange.targetFrom,
        to: customCompareRange.targetTo,
      },
      '조회 기간',
    );
    if (targetValidationError) {
      setErrorMessage(targetValidationError);
      return;
    }

    const baseValidationError = validateDateRange(
      {
        from: customCompareRange.baseFrom,
        to: customCompareRange.baseTo,
      },
      '비교 기준 기간',
    );
    if (baseValidationError) {
      setErrorMessage(baseValidationError);
      return;
    }

    setErrorMessage(null);
    onSelectPrompt(buildCustomComparePrompt(customCompareRange));
  };

  const renderSummaryTodaySection = () => (
    <InlinePanelContainer>
      <div className="space-y-3">
        <SectionTitle
          title="일간 요약 선택"
          helper="이미 확인한 항목은 제외하고 보여드립니다."
        />
        {visibleTodayOptions.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {visibleTodayOptions.map((option) => (
              <OptionChip
                key={option.key}
                label={option.label}
                onClick={() => handleSummaryPresetSelect(option.key as Exclude<SalesSummaryPresetKey, 'custom'>)}
              />
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500">오늘과 어제 요약은 이미 확인했습니다.</p>
        )}
      </div>
    </InlinePanelContainer>
  );

  const renderSummaryPeriodSection = () => (
    <InlinePanelContainer>
      <div className="space-y-4">
        <SectionTitle
          title="기간 선택"
          helper="자주 보는 기간을 먼저 고르고, 필요할 때만 직접 기간을 지정하세요."
        />
        <div className="flex flex-wrap gap-2">
          {visiblePeriodOptions.map((option) => {
            if (option.key === 'custom') {
              return (
                <OptionChip
                  key={option.key}
                  label={option.label}
                  onClick={() => {
                    setSummaryCustomRange(createEmptyDateRange());
                    setErrorMessage(null);
                  }}
                />
              );
            }

            return (
              <OptionChip
                key={option.key}
                label={option.label}
                onClick={() => handleSummaryPresetSelect(option.key as Exclude<SalesSummaryPresetKey, 'custom'>)}
              />
            );
          })}
        </div>

        <div className="rounded-2xl border border-white bg-white/80 p-4 shadow-sm">
          <div className="space-y-3">
            <SectionTitle
              title="직접 기간 선택"
              helper="원하는 날짜 범위를 선택하면 해당 기간의 매출 요약을 조회합니다."
            />
            <div className={`grid gap-3 ${compact ? 'md:grid-cols-1' : 'md:grid-cols-2'}`}>
              <DateInput
                label="시작일"
                value={summaryCustomRange.from}
                onChange={(value) => {
                  setSummaryCustomRange((previous) => ({ ...previous, from: value }));
                  setErrorMessage(null);
                }}
              />
              <DateInput
                label="종료일"
                value={summaryCustomRange.to}
                onChange={(value) => {
                  setSummaryCustomRange((previous) => ({ ...previous, to: value }));
                  setErrorMessage(null);
                }}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleApplyCustomSummary}
                className="rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-sky-600"
              >
                적용
              </button>
              <button
                type="button"
                onClick={() => {
                  setSummaryCustomRange(createEmptyDateRange());
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

  const renderCompareSection = () => (
    <InlinePanelContainer>
      <div className="space-y-4">
        <SectionTitle
          title="비교 방식 선택"
          helper="먼저 비교 기준을 고른 뒤, 조회할 기간을 선택하세요."
        />
        <div className="grid gap-3 xl:grid-cols-2">
          {SALES_SUMMARY_COMPARE_MODE_OPTIONS.map((option) => (
            <PrimaryActionButton
              key={option.key}
              label={option.label}
              description={option.description}
              active={selectedCompareMode === option.key}
              compact={compact}
              onClick={() => handleCompareModeSelect(option.key)}
            />
          ))}
        </div>

        {selectedCompareMode && selectedCompareMode !== 'custom' && (
          <div className="rounded-2xl border border-white bg-white/80 p-4 shadow-sm">
            <div className="space-y-3">
              <SectionTitle
                title="조회 기간 선택"
                helper="이미 확인한 비교 조합은 제외하고 보여드립니다."
              />
              <div className="flex flex-wrap gap-2">
                {visibleCompareTargetOptions.map((option) => {
                  if (option.key === 'custom') {
                    return (
                      <OptionChip
                        key={option.key}
                        label={option.label}
                        onClick={() => {
                          setCompareCustomRange(createEmptyDateRange());
                          setErrorMessage(null);
                        }}
                      />
                    );
                  }

                  return (
                    <OptionChip
                      key={option.key}
                      label={option.label}
                      onClick={() => handleComparePresetSelect(option.key as Exclude<SalesSummaryPresetKey, 'custom'>)}
                    />
                  );
                })}
              </div>

              <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
                <div className="space-y-3">
                  <SectionTitle
                    title="직접 조회 기간 선택"
                    helper="비교 방식은 유지한 채 조회 기간만 직접 지정합니다."
                  />
                  <div className={`grid gap-3 ${compact ? 'md:grid-cols-1' : 'md:grid-cols-2'}`}>
                    <DateInput
                      label="시작일"
                      value={compareCustomRange.from}
                      onChange={(value) => {
                        setCompareCustomRange((previous) => ({ ...previous, from: value }));
                        setErrorMessage(null);
                      }}
                    />
                    <DateInput
                      label="종료일"
                      value={compareCustomRange.to}
                      onChange={(value) => {
                        setCompareCustomRange((previous) => ({ ...previous, to: value }));
                        setErrorMessage(null);
                      }}
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={handleApplyCustomTargetCompare}
                      className="rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-sky-600"
                    >
                      적용
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCompareCustomRange(createEmptyDateRange());
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
          </div>
        )}

        {selectedCompareMode === 'custom' && (
          <div className="rounded-2xl border border-white bg-white/80 p-4 shadow-sm">
            <div className="space-y-3">
              <SectionTitle
                title="비교 기간 직접 지정"
                helper="조회 기간과 비교 기준 기간을 각각 입력해 원하는 조합으로 비교합니다."
              />
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="space-y-3 rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
                  <SectionTitle title="조회 기간" />
                  <DateInput
                    label="시작일"
                    value={customCompareRange.targetFrom}
                    onChange={(value) => {
                      setCustomCompareRange((previous) => ({ ...previous, targetFrom: value }));
                      setErrorMessage(null);
                    }}
                  />
                  <DateInput
                    label="종료일"
                    value={customCompareRange.targetTo}
                    onChange={(value) => {
                      setCustomCompareRange((previous) => ({ ...previous, targetTo: value }));
                      setErrorMessage(null);
                    }}
                  />
                </div>
                <div className="space-y-3 rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
                  <SectionTitle title="비교 기준 기간" />
                  <DateInput
                    label="시작일"
                    value={customCompareRange.baseFrom}
                    onChange={(value) => {
                      setCustomCompareRange((previous) => ({ ...previous, baseFrom: value }));
                      setErrorMessage(null);
                    }}
                  />
                  <DateInput
                    label="종료일"
                    value={customCompareRange.baseTo}
                    onChange={(value) => {
                      setCustomCompareRange((previous) => ({ ...previous, baseTo: value }));
                      setErrorMessage(null);
                    }}
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleApplyCustomCompare}
                  className="rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-sky-600"
                >
                  적용
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCustomCompareRange(createEmptyCustomCompareRange());
                    setErrorMessage(null);
                  }}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
                >
                  초기화
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </InlinePanelContainer>
  );

  return (
    <div className="space-y-4">
      <div className={`grid gap-3 ${compact ? 'md:grid-cols-3' : 'xl:grid-cols-3'}`}>
        {SALES_SUMMARY_PRIMARY_ACTIONS.map((action) => (
          <PrimaryActionButton
            key={action.key}
            label={action.label}
            description={action.description}
            active={activePrimaryAction === action.key}
            compact={compact}
            onClick={() => togglePrimaryAction(action.key)}
          />
        ))}
      </div>

      {activePrimaryAction === 'today' && renderSummaryTodaySection()}
      {activePrimaryAction === 'period' && renderSummaryPeriodSection()}
      {activePrimaryAction === 'compare' && renderCompareSection()}

      {errorMessage && (
        <p className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
          {errorMessage}
        </p>
      )}
    </div>
  );
};
