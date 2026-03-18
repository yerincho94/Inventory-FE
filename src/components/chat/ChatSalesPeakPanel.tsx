import { useMemo, useState, type ReactNode } from 'react';
import type { ChatMessage } from '@/types';
import {
  SALES_PEAK_LIMIT_OPTIONS,
  SALES_PEAK_PERIOD_OPTIONS,
  SALES_PEAK_PRIMARY_ACTIONS,
  buildCustomSalesPeakPrompt,
  buildSalesPeakPrompt,
  collectCompletedSalesPeakSelections,
  isPeakPresetCompleted,
  type SalesPeakActionKey,
  type SalesPeakDateRangeSelection,
  type SalesPeakLimitKey,
  type SalesPeakPresetKey,
} from './chatSalesPeakCatalog';

interface ChatSalesPeakPanelProps {
  onSelectPrompt: (prompt: string) => void;
  messages?: ChatMessage[];
  variant?: 'hero' | 'compact';
}

const createEmptyDateRange = (): SalesPeakDateRangeSelection => ({
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

export const ChatSalesPeakPanel = ({
  onSelectPrompt,
  messages = [],
  variant = 'hero',
}: ChatSalesPeakPanelProps) => {
  const compact = variant === 'compact';
  const [activeAction, setActiveAction] = useState<SalesPeakActionKey | null>(null);
  const [selectedLimit, setSelectedLimit] = useState<SalesPeakLimitKey>(5);
  const [customRange, setCustomRange] = useState<SalesPeakDateRangeSelection>(createEmptyDateRange);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const completedSelections = useMemo(
    () => collectCompletedSalesPeakSelections(messages),
    [messages],
  );

  const activeActionConfig = SALES_PEAK_PRIMARY_ACTIONS.find((action) => action.key === activeAction) ?? null;

  const visiblePeriodOptions = useMemo(() => {
    if (!activeAction) {
      return SALES_PEAK_PERIOD_OPTIONS;
    }

    const resolvedLimit = activeAction === 'meal_time_compare' ? 5 : selectedLimit;

    return SALES_PEAK_PERIOD_OPTIONS.filter(
      (option) => !isPeakPresetCompleted(completedSelections, activeAction, option.key, resolvedLimit),
    );
  }, [activeAction, completedSelections, selectedLimit]);

  const resetInlineState = () => {
    setSelectedLimit(5);
    setCustomRange(createEmptyDateRange());
    setErrorMessage(null);
  };

  const toggleAction = (nextAction: SalesPeakActionKey) => {
    setActiveAction((currentAction) => {
      const resolvedAction = currentAction === nextAction ? null : nextAction;
      resetInlineState();
      return resolvedAction;
    });
  };

  const validateDateRange = (range: SalesPeakDateRangeSelection) => {
    if (!range.from || !range.to) {
      return '조회 기간의 시작일과 종료일을 모두 선택해 주세요.';
    }

    if (range.from > range.to) {
      return '조회 기간의 시작일은 종료일보다 앞서야 합니다.';
    }

    return null;
  };

  const handlePresetSelect = (periodKey: Exclude<SalesPeakPresetKey, 'custom'>) => {
    if (!activeAction) {
      return;
    }

    setErrorMessage(null);
    onSelectPrompt(buildSalesPeakPrompt(activeAction, periodKey, selectedLimit));
  };

  const handleApplyCustomRange = () => {
    if (!activeAction) {
      return;
    }

    const validationError = validateDateRange(customRange);
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    setErrorMessage(null);
    onSelectPrompt(buildCustomSalesPeakPrompt(activeAction, customRange, selectedLimit));
  };

  const renderPeakSelectionSection = () => (
    <InlinePanelContainer>
      <div className="space-y-4">
        {activeActionConfig?.supportsLimit && (
          <>
            <SectionTitle
              title="보여줄 개수 선택"
              helper="최고 1개만 볼지, 상위 결과를 넓게 볼지 먼저 선택해 주세요."
            />
            <div className="flex flex-wrap gap-2">
              {SALES_PEAK_LIMIT_OPTIONS.map((option) => (
                <OptionChip
                  key={option.key}
                  label={option.label}
                  active={selectedLimit === option.key}
                  onClick={() => {
                    setSelectedLimit(option.key);
                    setErrorMessage(null);
                  }}
                />
              ))}
            </div>
          </>
        )}

        <SectionTitle
          title="기간 선택"
          helper={activeActionConfig?.helper ?? '원하는 기간을 고르면 피크 분석 결과를 바로 확인할 수 있습니다.'}
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
            현재 선택 기준에서는 빠른 선택 항목을 모두 확인했습니다. 직접 기간을 선택해 다른 피크를 확인해 보세요.
          </p>
        )}

        <div className="rounded-2xl border border-white bg-white/80 p-4 shadow-sm">
          <div className="space-y-3">
            <SectionTitle
              title="직접 기간 선택"
              helper="원하는 날짜 범위를 직접 입력해 바쁜 요일, 시간대, 피크 구간을 확인합니다."
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
        {SALES_PEAK_PRIMARY_ACTIONS.map((action) => (
          <PrimaryActionButton
            key={action.key}
            label={action.label}
            description={action.description}
            active={activeAction === action.key}
            compact={compact}
            onClick={() => toggleAction(action.key)}
          />
        ))}
      </div>

      {activeAction && renderPeakSelectionSection()}

      {errorMessage && (
        <p className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
          {errorMessage}
        </p>
      )}
    </div>
  );
};
