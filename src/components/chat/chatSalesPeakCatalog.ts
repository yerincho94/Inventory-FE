import type { ChatMessage } from '@/types';

export type SalesPeakPresetKey =
  | 'today'
  | 'yesterday'
  | 'this_week'
  | 'this_month'
  | 'last_7_days'
  | 'last_30_days'
  | 'last_month'
  | 'custom';

export type SalesPeakActionKey = 'combined' | 'day_only' | 'hour_only' | 'meal_time_compare';
export type SalesPeakViewType = 'combined' | 'day_only' | 'hour_only';
export type SalesPeakLimitKey = 1 | 3 | 5 | 10;

export interface SalesPeakPrimaryAction {
  key: SalesPeakActionKey;
  label: string;
  description: string;
  helper: string;
  viewType: SalesPeakViewType;
  supportsLimit: boolean;
}

export interface SalesPeakLimitOption {
  key: SalesPeakLimitKey;
  label: string;
  description: string;
}

export interface SalesPeakPresetOption {
  key: Exclude<SalesPeakPresetKey, 'custom'>;
  label: string;
}

export interface SalesPeakDateRangeSelection {
  from: string;
  to: string;
}

interface ParsedSalesPeakSelection {
  completionKey: string;
}

const PEAK_COMPLETION_PREFIX = 'sales.peak';
const DATE_RANGE_PATTERN = /(\d{4}-\d{2}-\d{2})/g;

const BASIC_PEAK_KEYWORDS = /(피크|바쁜|붐비|혼잡|요일|시간대|시간|점심|저녁|잘 팔리)/;
const NON_PEAK_KEYWORDS = /(요약|추이|흐름|비교|상위 메뉴|메뉴 순위|랭킹|재고|입고|부족|리포트)/;

export const SALES_PEAK_PRIMARY_ACTIONS: SalesPeakPrimaryAction[] = [
  {
    key: 'hour_only',
    label: '바쁜 시간대 보기',
    description: '가장 바쁜 시간대와 상위 시간대를 확인합니다.',
    helper: '제일 바쁜 시간대가 언제인지, 상위 시간대를 몇 개까지 볼지 정해 조회합니다.',
    viewType: 'hour_only',
    supportsLimit: true,
  },
  {
    key: 'day_only',
    label: '바쁜 요일 보기',
    description: '매출이 높은 요일과 상위 요일을 확인합니다.',
    helper: '어떤 요일에 장사가 잘 되는지, 상위 요일을 몇 개까지 볼지 정해 조회합니다.',
    viewType: 'day_only',
    supportsLimit: true,
  },
  {
    key: 'combined',
    label: '피크 구간 보기',
    description: '요일과 시간 조합 기준으로 피크 구간을 확인합니다.',
    helper: '요일과 시간대를 함께 봐서 가장 강한 구간을 상위 순위로 확인합니다.',
    viewType: 'combined',
    supportsLimit: true,
  },
  {
    key: 'meal_time_compare',
    label: '점심·저녁 비교하기',
    description: '점심과 저녁 중 어느 시간대가 더 강한지 확인합니다.',
    helper: '시간대 데이터를 바탕으로 점심과 저녁 중 어느 쪽이 피크가 큰지 자연어로 안내합니다.',
    viewType: 'hour_only',
    supportsLimit: false,
  },
];

export const SALES_PEAK_LIMIT_OPTIONS: SalesPeakLimitOption[] = [
  { key: 1, label: '최고 1개', description: '가장 높은 결과만 봅니다.' },
  { key: 3, label: '상위 3개', description: '상위 3개 결과를 봅니다.' },
  { key: 5, label: '상위 5개', description: '자주 보는 기본 개수입니다.' },
  { key: 10, label: '상위 10개', description: '넓게 살펴볼 때 사용합니다.' },
];

export const SALES_PEAK_PERIOD_OPTIONS: SalesPeakPresetOption[] = [
  { key: 'this_week', label: '이번 주' },
  { key: 'this_month', label: '이번 달' },
  { key: 'last_7_days', label: '최근 7일' },
  { key: 'last_30_days', label: '최근 30일' },
  { key: 'last_month', label: '지난달' },
  { key: 'today', label: '오늘' },
  { key: 'yesterday', label: '어제' },
];

export const createSalesPeakCompletionKey = (
  actionKey: SalesPeakActionKey,
  periodKey: SalesPeakPresetKey,
  limitKey?: SalesPeakLimitKey,
) => {
  if (actionKey === 'meal_time_compare') {
    return `${PEAK_COMPLETION_PREFIX}:${actionKey}:${periodKey}`;
  }

  return `${PEAK_COMPLETION_PREFIX}:${actionKey}:${periodKey}:${limitKey ?? 5}`;
};

const normalizePrompt = (prompt: string) => prompt.trim().replace(/\s+/g, ' ');

const detectPresetFromText = (text: string): SalesPeakPresetKey | null => {
  if (hasCustomDateRange(text)) {
    return 'custom';
  }

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

  if (/(최근|요즘)/.test(text)) {
    return 'last_30_days';
  }

  return null;
};

const detectActionFromText = (text: string): SalesPeakActionKey | null => {
  if (/(점심|저녁)/.test(text)) {
    return 'meal_time_compare';
  }

  if (/(요일\s*[+·/]?\s*시간|요일과 시간|시간과 요일|조합|구간)/.test(text)) {
    return 'combined';
  }

  if (/(요일)/.test(text) && !/(시간|시간대)/.test(text)) {
    return 'day_only';
  }

  if (/(시간대|시간)/.test(text)) {
    return 'hour_only';
  }

  if (/피크/.test(text)) {
    return 'hour_only';
  }

  return null;
};

const detectLimitFromText = (text: string): SalesPeakLimitKey => {
  const topMatch = text.match(/상위\s*(1|3|5|10)\s*개?/);
  if (topMatch) {
    return Number(topMatch[1]) as SalesPeakLimitKey;
  }

  const countMatch = text.match(/(1|3|5|10)\s*개/);
  if (countMatch) {
    return Number(countMatch[1]) as SalesPeakLimitKey;
  }

  if (/(제일|가장|최고|1위)/.test(text)) {
    return 1;
  }

  return 5;
};

const hasCustomDateRange = (text: string) => Array.from(text.matchAll(DATE_RANGE_PATTERN)).length >= 2;

const periodLabelToQueryFragment = (periodKey: Exclude<SalesPeakPresetKey, 'custom'>) => {
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

export const buildSalesPeakPrompt = (
  actionKey: SalesPeakActionKey,
  periodKey: Exclude<SalesPeakPresetKey, 'custom'>,
  limitKey: SalesPeakLimitKey,
) => {
  const periodLabel = periodLabelToQueryFragment(periodKey);

  switch (actionKey) {
    case 'hour_only':
      return limitKey === 1
        ? `${periodLabel} 기준 제일 바쁜 시간대가 언제야?`
        : `${periodLabel} 기준 매출이 높은 시간대 상위 ${limitKey}개 보여줘`;
    case 'day_only':
      return limitKey === 1
        ? `${periodLabel} 기준 매출이 가장 높은 요일 알려줘`
        : `${periodLabel} 기준 매출이 높은 요일 상위 ${limitKey}개 보여줘`;
    case 'combined':
      return limitKey === 1
        ? `${periodLabel} 기준 가장 높은 피크 매출 구간 알려줘`
        : `${periodLabel} 기준 매출이 높은 요일과 시간 조합 상위 ${limitKey}개 보여줘`;
    case 'meal_time_compare':
      return `${periodLabel} 기준 점심과 저녁 중 언제 피크가 커?`;
  }
};

export const buildCustomSalesPeakPrompt = (
  actionKey: SalesPeakActionKey,
  range: SalesPeakDateRangeSelection,
  limitKey: SalesPeakLimitKey,
) => {
  switch (actionKey) {
    case 'hour_only':
      return limitKey === 1
        ? `${range.from}부터 ${range.to}까지 제일 바쁜 시간대가 언제야?`
        : `${range.from}부터 ${range.to}까지 매출이 높은 시간대 상위 ${limitKey}개 보여줘`;
    case 'day_only':
      return limitKey === 1
        ? `${range.from}부터 ${range.to}까지 매출이 가장 높은 요일 알려줘`
        : `${range.from}부터 ${range.to}까지 매출이 높은 요일 상위 ${limitKey}개 보여줘`;
    case 'combined':
      return limitKey === 1
        ? `${range.from}부터 ${range.to}까지 가장 높은 피크 매출 구간 알려줘`
        : `${range.from}부터 ${range.to}까지 매출이 높은 요일과 시간 조합 상위 ${limitKey}개 보여줘`;
    case 'meal_time_compare':
      return `${range.from}부터 ${range.to}까지 점심과 저녁 중 언제 피크가 커?`;
  }
};

export const parseSalesPeakPromptSelection = (
  prompt: string,
): ParsedSalesPeakSelection | null => {
  const normalized = normalizePrompt(prompt);

  if (NON_PEAK_KEYWORDS.test(normalized) && !/(점심|저녁)/.test(normalized)) {
    return null;
  }

  if (!BASIC_PEAK_KEYWORDS.test(normalized)) {
    return null;
  }

  const actionKey = detectActionFromText(normalized);
  if (!actionKey) {
    return null;
  }

  const periodKey = detectPresetFromText(normalized) ?? 'last_30_days';
  const limitKey = actionKey === 'meal_time_compare' ? undefined : detectLimitFromText(normalized);

  return {
    completionKey: createSalesPeakCompletionKey(actionKey, periodKey, limitKey),
  };
};

export const collectCompletedSalesPeakSelections = (messages: ChatMessage[]) => {
  const completedSelections = new Set<string>();
  const userMessageMap = new Map(
    messages
      .filter((message) => message.role === 'USER')
      .map((message) => [message.messageId, message]),
  );

  messages
    .filter(
      (message) =>
        message.role === 'ASSISTANT'
        && message.status === 'COMPLETED'
        && typeof message.replyToMessageId === 'number',
    )
    .forEach((assistantMessage) => {
      const repliedUserMessage = userMessageMap.get(assistantMessage.replyToMessageId as number);
      if (!repliedUserMessage || repliedUserMessage.status !== 'COMPLETED') {
        return;
      }

      const parsedSelection = parseSalesPeakPromptSelection(repliedUserMessage.content);
      if (parsedSelection) {
        completedSelections.add(parsedSelection.completionKey);
      }
    });

  return completedSelections;
};

export const isSalesPeakPromptCompleted = (prompt: string, messages: ChatMessage[]) => {
  const parsedSelection = parseSalesPeakPromptSelection(prompt);
  if (!parsedSelection) {
    return false;
  }

  return collectCompletedSalesPeakSelections(messages).has(parsedSelection.completionKey);
};

export const isPeakPresetCompleted = (
  completedSelections: Set<string>,
  actionKey: SalesPeakActionKey,
  periodKey: SalesPeakPresetKey,
  limitKey: SalesPeakLimitKey,
) => completedSelections.has(createSalesPeakCompletionKey(actionKey, periodKey, limitKey));
