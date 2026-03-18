import { useMemo, useState, type ReactNode } from 'react';
import type { ChatMessage } from '@/types';
import {
  SALES_TREND_INTERVAL_OPTIONS,
  SALES_TREND_PERIOD_OPTIONS,
  SALES_TREND_PRIMARY_ACTIONS,
  buildCustomSalesTrendPrompt,
  buildSalesTrendPrompt,
  collectCompletedSalesTrendSelections,
  isTrendPresetCompleted,
  type SalesTrendDateRangeSelection,
  type SalesTrendIntervalKey,
  type SalesTrendMetricKey,
  type SalesTrendPresetKey,
} from './chatSalesTrendCatalog';

interface ChatSalesTrendPanelProps {
  onSelectPrompt: (prompt: string) => void;
  messages?: ChatMessage[];
  variant?: 'hero' | 'compact';
}

const createEmptyDateRange = (): SalesTrendDateRangeSelection => ({
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

export const ChatSalesTrendPanel = ({
  onSelectPrompt,
  messages = [],
  variant = 'hero',
}: ChatSalesTrendPanelProps) => {
  const compact = variant === 'compact';
  const [activeMetricAction, setActiveMetricAction] = useState<SalesTrendMetricKey | null>(null);
  const [selectedInterval, setSelectedInterval] = useState<SalesTrendIntervalKey>('day');
  const [customRange, setCustomRange] = useState<SalesTrendDateRangeSelection>(createEmptyDateRange);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const completedSelections = useMemo(
    () => collectCompletedSalesTrendSelections(messages),
    [messages],
  );

  const visiblePeriodOptions = useMemo(() => {
    if (!activeMetricAction) {
      return SALES_TREND_PERIOD_OPTIONS;
    }

    return SALES_TREND_PERIOD_OPTIONS.filter(
      (option) => !isTrendPresetCompleted(completedSelections, activeMetricAction, selectedInterval, option.key),
    );
  }, [activeMetricAction, completedSelections, selectedInterval]);

  const resetInlineState = () => {
    setSelectedInterval('day');
    setCustomRange(createEmptyDateRange());
    setErrorMessage(null);
  };

  const toggleMetricAction = (nextAction: SalesTrendMetricKey) => {
    setActiveMetricAction((currentAction) => {
      const resolvedAction = currentAction === nextAction ? null : nextAction;
      resetInlineState();
      return resolvedAction;
    });
  };

  const validateDateRange = (range: SalesTrendDateRangeSelection) => {
    if (!range.from || !range.to) {
      return '조회 기간의 시작일과 종료일을 모두 선택해 주세요.';
    }

    if (range.from > range.to) {
      return '조회 기간의 시작일은 종료일보다 앞서야 합니다.';
    }

    return null;
  };

  const handlePresetSelect = (periodKey: Exclude<SalesTrendPresetKey, 'custom'>) => {
    if (!activeMetricAction) {
      return;
    }

    setErrorMessage(null);
    onSelectPrompt(buildSalesTrendPrompt(activeMetricAction, periodKey, selectedInterval));
  };

  const handleApplyCustomRange = () => {
    if (!activeMetricAction) {
      return;
    }

    const validationError = validateDateRange(customRange);
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    setErrorMessage(null);
    onSelectPrompt(buildCustomSalesTrendPrompt(activeMetricAction, selectedInterval, customRange));
  };

  const renderTrendSelectionSection = () => (
    <InlinePanelContainer>
      <div className="space-y-4">
        <SectionTitle
          title="보기 간격 선택"
          helper="조회 결과에는 최고 시점, 최저 시점, 최근 시점, 전체 변화율이 함께 포함됩니다."
        />
        <div className="flex flex-wrap gap-2">
          {SALES_TREND_INTERVAL_OPTIONS.map((option) => (
            <OptionChip
              key={option.key}
              label={option.label}
              active={selectedInterval === option.key}
              onClick={() => {
                setSelectedInterval(option.key);
                setErrorMessage(null);
              }}
            />
          ))}
        </div>

        <SectionTitle
          title="기간 선택"
          helper="현재 선택한 보기 기준에서 이미 확인한 항목은 제외하고 보여드립니다."
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
            현재 보기 기준에서는 빠른 선택 항목을 모두 확인했습니다. 직접 기간을 선택해 다른 흐름을 확인해 보세요.
          </p>
        )}

        <div className="rounded-2xl border border-white bg-white/80 p-4 shadow-sm">
          <div className="space-y-3">
            <SectionTitle
              title="직접 기간 선택"
              helper="원하는 날짜 범위와 보기 간격을 정해 매출 흐름을 바로 조회합니다."
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
      <div className={`grid gap-3 ${compact ? 'md:grid-cols-3' : 'xl:grid-cols-3'}`}>
        {SALES_TREND_PRIMARY_ACTIONS.map((action) => (
          <PrimaryActionButton
            key={action.key}
            label={action.label}
            description={action.description}
            active={activeMetricAction === action.key}
            compact={compact}
            onClick={() => toggleMetricAction(action.key)}
          />
        ))}
      </div>

      {activeMetricAction && renderTrendSelectionSection()}

      {errorMessage && (
        <p className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
          {errorMessage}
        </p>
      )}
    </div>
  );
};
