import type { ChatMessage } from '@/types';

export type SalesTrendPresetKey =
  | 'today'
  | 'yesterday'
  | 'this_week'
  | 'this_month'
  | 'last_7_days'
  | 'last_30_days'
  | 'last_month'
  | 'custom';

export type SalesTrendMetricKey = 'amount' | 'order_count' | 'both';
export type SalesTrendIntervalKey = 'day' | 'week' | 'month';

export interface SalesTrendPrimaryAction {
  key: SalesTrendMetricKey;
  label: string;
  description: string;
}

export interface SalesTrendIntervalOption {
  key: SalesTrendIntervalKey;
  label: string;
  description: string;
}

export interface SalesTrendPresetOption {
  key: Exclude<SalesTrendPresetKey, 'custom'>;
  label: string;
}

export interface SalesTrendDateRangeSelection {
  from: string;
  to: string;
}

interface ParsedSalesTrendSelection {
  completionKey: string;
}

const TREND_COMPLETION_PREFIX = 'sales.trend';
const DATE_RANGE_PATTERN = /(\d{4}-\d{2}-\d{2})/g;

const BASIC_TREND_KEYWORDS = /(추이|흐름|추세|변화율|변했어|오르는 추세|내리는 추세)/;
const NON_TREND_KEYWORDS = /(요약|비교|피크|상위 메뉴|메뉴 순위|랭킹|재고|입고|부족|리포트)/;

export const SALES_TREND_PRIMARY_ACTIONS: SalesTrendPrimaryAction[] = [
  {
    key: 'amount',
    label: '매출 흐름 보기',
    description: '기간별 매출 추이와 오름·내림 흐름을 확인합니다.',
  },
  {
    key: 'order_count',
    label: '주문 흐름 보기',
    description: '주문 수 변화를 보고 피크 시점도 함께 확인합니다.',
  },
  {
    key: 'both',
    label: '매출·주문 함께 보기',
    description: '매출과 주문 수를 같은 흐름 안에서 함께 봅니다.',
  },
];

export const SALES_TREND_INTERVAL_OPTIONS: SalesTrendIntervalOption[] = [
  {
    key: 'day',
    label: '일별',
    description: '하루 단위 흐름으로 자세히 봅니다.',
  },
  {
    key: 'week',
    label: '주별',
    description: '주간 단위로 큰 흐름을 봅니다.',
  },
  {
    key: 'month',
    label: '월별',
    description: '월 단위로 넓게 흐름을 봅니다.',
  },
];

export const SALES_TREND_PERIOD_OPTIONS: SalesTrendPresetOption[] = [
  { key: 'this_week', label: '이번 주' },
  { key: 'this_month', label: '이번 달' },
  { key: 'last_7_days', label: '최근 7일' },
  { key: 'last_30_days', label: '최근 30일' },
  { key: 'last_month', label: '지난달' },
  { key: 'today', label: '오늘' },
  { key: 'yesterday', label: '어제' },
];

export const createTrendCompletionKey = (
  metricKey: SalesTrendMetricKey,
  intervalKey: SalesTrendIntervalKey,
  periodKey: SalesTrendPresetKey,
) => `${TREND_COMPLETION_PREFIX}:${metricKey}:${intervalKey}:${periodKey}`;

const normalizePrompt = (prompt: string) => prompt.trim().replace(/\s+/g, ' ');

const detectPresetFromText = (text: string): SalesTrendPresetKey | null => {
  if (text.includes('오늘')) {
    return 'today';
  }
  if (text.includes('어제')) {
    return 'yesterday';
  }
  if (text.includes('이번 주') || text.includes('금주')) {
    return 'this_week';
  }
  if (text.includes('이번 달') || text.includes('이달')) {
    return 'this_month';
  }
  if (text.includes('최근 7일') || text.includes('최근 일주일') || text.includes('지난 7일')) {
    return 'last_7_days';
  }
  if (text.includes('최근 30일') || text.includes('최근 한 달') || text.includes('지난 30일')) {
    return 'last_30_days';
  }
  if (text.includes('지난달') || text.includes('저번 달')) {
    return 'last_month';
  }
  if (text.includes('최근') || text.includes('요즘')) {
    return 'last_30_days';
  }

  return null;
};

const detectMetricFromText = (text: string): SalesTrendMetricKey | null => {
  const includesAmount = text.includes('매출');
  const includesOrderCount =
    text.includes('주문 수') || text.includes('주문수') || text.includes('주문 건수');

  if (includesAmount && includesOrderCount) {
    return 'both';
  }
  if (includesOrderCount) {
    return 'order_count';
  }
  if (includesAmount) {
    return 'amount';
  }

  return null;
};

const detectIntervalFromText = (text: string): SalesTrendIntervalKey => {
  if (/주별|주간 단위|주 단위/.test(text)) {
    return 'week';
  }
  if (/월별|월간 단위|월 단위/.test(text)) {
    return 'month';
  }
  if (/일별|일간 단위|일 단위/.test(text)) {
    return 'day';
  }

  return 'day';
};

const hasCustomDateRange = (text: string) => Array.from(text.matchAll(DATE_RANGE_PATTERN)).length >= 2;

export const buildSalesTrendPrompt = (
  metricKey: SalesTrendMetricKey,
  periodKey: Exclude<SalesTrendPresetKey, 'custom'>,
  intervalKey: SalesTrendIntervalKey,
) => {
  const periodLabel = periodLabelToQueryFragment(periodKey);
  const intervalLabel = intervalLabelToQueryFragment(intervalKey);

  switch (metricKey) {
    case 'amount':
      return `${periodLabel} ${intervalLabel} 매출 추이 보여줘`;
    case 'order_count':
      return `${periodLabel} ${intervalLabel} 주문 수 흐름 알려줘`;
    case 'both':
      return `${periodLabel} ${intervalLabel} 매출과 주문 수 흐름 함께 보여줘`;
  }
};

export const buildCustomSalesTrendPrompt = (
  metricKey: SalesTrendMetricKey,
  intervalKey: SalesTrendIntervalKey,
  range: SalesTrendDateRangeSelection,
) => {
  const intervalLabel = intervalLabelToQueryFragment(intervalKey);

  switch (metricKey) {
    case 'amount':
      return `${range.from}부터 ${range.to}까지 ${intervalLabel} 매출 추이 보여줘`;
    case 'order_count':
      return `${range.from}부터 ${range.to}까지 ${intervalLabel} 주문 수 흐름 알려줘`;
    case 'both':
      return `${range.from}부터 ${range.to}까지 ${intervalLabel} 매출과 주문 수 흐름 함께 보여줘`;
  }
};

const periodLabelToQueryFragment = (periodKey: Exclude<SalesTrendPresetKey, 'custom'>) => {
  switch (periodKey) {
    case 'today':
      return '오늘';
    case 'yesterday':
      return '어제';
    case 'this_week':
      return '이번 주';
    case 'this_month':
      return '이번 달';
    case 'last_7_days':
      return '최근 7일';
    case 'last_30_days':
      return '최근 30일';
    case 'last_month':
      return '지난달';
  }
};

const intervalLabelToQueryFragment = (intervalKey: SalesTrendIntervalKey) => {
  switch (intervalKey) {
    case 'day':
      return '일별';
    case 'week':
      return '주별';
    case 'month':
      return '월별';
  }
};

export const parseSalesTrendPromptSelection = (
  prompt: string,
): ParsedSalesTrendSelection | null => {
  const normalized = normalizePrompt(prompt);

  if (NON_TREND_KEYWORDS.test(normalized)) {
    return null;
  }

  if (!BASIC_TREND_KEYWORDS.test(normalized)) {
    return null;
  }

  const metricKey = detectMetricFromText(normalized);
  if (!metricKey) {
    return null;
  }

  const periodKey = hasCustomDateRange(normalized)
    ? 'custom'
    : detectPresetFromText(normalized);
  if (!periodKey) {
    return null;
  }

  const intervalKey = detectIntervalFromText(normalized);
  return {
    completionKey: createTrendCompletionKey(metricKey, intervalKey, periodKey),
  };
};

export const collectCompletedSalesTrendSelections = (messages: ChatMessage[]) => {
  const completedSelections = new Set<string>();
  const userMessageMap = new Map(
    messages
      .filter((message) => message.role === 'USER')
      .map((message) => [message.messageId, message]),
  );

  messages
    .filter(
      (message) =>
        message.role === 'ASSISTANT' &&
        message.status === 'COMPLETED' &&
        typeof message.replyToMessageId === 'number',
    )
    .forEach((assistantMessage) => {
      const repliedUserMessage = userMessageMap.get(assistantMessage.replyToMessageId as number);
      if (!repliedUserMessage || repliedUserMessage.status !== 'COMPLETED') {
        return;
      }

      const parsedSelection = parseSalesTrendPromptSelection(repliedUserMessage.content);
      if (parsedSelection) {
        completedSelections.add(parsedSelection.completionKey);
      }
    });

  return completedSelections;
};

export const isSalesTrendPromptCompleted = (prompt: string, messages: ChatMessage[]) => {
  const parsedSelection = parseSalesTrendPromptSelection(prompt);
  if (!parsedSelection) {
    return false;
  }

  return collectCompletedSalesTrendSelections(messages).has(parsedSelection.completionKey);
};

export const isTrendPresetCompleted = (
  completedSelections: Set<string>,
  metricKey: SalesTrendMetricKey,
  intervalKey: SalesTrendIntervalKey,
  periodKey: SalesTrendPresetKey,
) => completedSelections.has(createTrendCompletionKey(metricKey, intervalKey, periodKey));
