import type { ChatMessage } from '@/types';

export type SalesSummaryPresetKey =
  | 'today'
  | 'yesterday'
  | 'this_week'
  | 'this_month'
  | 'last_7_days'
  | 'last_30_days'
  | 'last_month'
  | 'custom';

export type SalesSummaryCompareMode =
  | 'previous_period'
  | 'same_period_last_week'
  | 'same_period_last_month'
  | 'custom';

export type SalesSummaryPrimaryActionKey = 'today' | 'period' | 'compare';

export interface SalesSummaryPrimaryAction {
  key: SalesSummaryPrimaryActionKey;
  label: string;
  description: string;
}

export interface SalesSummaryPresetOption {
  key: SalesSummaryPresetKey;
  label: string;
}

export interface SalesSummaryCompareModeOption {
  key: SalesSummaryCompareMode;
  label: string;
  description: string;
}

export interface DateRangeSelection {
  from: string;
  to: string;
}

export interface CustomCompareRangeSelection {
  targetFrom: string;
  targetTo: string;
  baseFrom: string;
  baseTo: string;
}

interface ParsedSalesSummarySelection {
  completionKey: string;
}

const SUMMARY_COMPLETION_PREFIX = 'sales.summary';
const COMPARE_COMPLETION_PREFIX = 'sales.summary.compare';

const BASIC_SUMMARY_KEYWORDS = /(매출|객단가|주문 수|주문금액|평균 주문 금액|평균 주문금액|최대 주문 금액|최소 주문 금액|총매출)/;
const NON_SUMMARY_KEYWORDS = /(추이|피크|상위 메뉴|메뉴 순위|랭킹|시간대|인기 메뉴)/;
const COMPARE_KEYWORDS = /(비교|증감|대비)/;
const DATE_RANGE_PATTERN = /(\d{4}-\d{2}-\d{2})/g;

export const SALES_SUMMARY_PRIMARY_ACTIONS: SalesSummaryPrimaryAction[] = [
  {
    key: 'today',
    label: '오늘 매출 보기',
    description: '오늘과 어제 요약을 빠르게 확인합니다.',
  },
  {
    key: 'period',
    label: '기간별 매출 보기',
    description: '원하는 기간의 매출 요약을 확인합니다.',
  },
  {
    key: 'compare',
    label: '매출 비교 보기',
    description: '이전 기간이나 기준 기간과 비교합니다.',
  },
];

export const SALES_SUMMARY_TODAY_OPTIONS: SalesSummaryPresetOption[] = [
  { key: 'today', label: '오늘 요약' },
  { key: 'yesterday', label: '어제 요약' },
];

export const SALES_SUMMARY_PERIOD_OPTIONS: SalesSummaryPresetOption[] = [
  { key: 'this_week', label: '이번 주' },
  { key: 'this_month', label: '이번 달' },
  { key: 'last_7_days', label: '최근 7일' },
  { key: 'last_30_days', label: '최근 30일' },
  { key: 'last_month', label: '지난달' },
  { key: 'custom', label: '직접 기간 선택' },
];

export const SALES_SUMMARY_COMPARE_MODE_OPTIONS: SalesSummaryCompareModeOption[] = [
  {
    key: 'previous_period',
    label: '이전 기간과 비교',
    description: '같은 길이의 직전 기간과 비교합니다.',
  },
  {
    key: 'same_period_last_week',
    label: '지난주 같은 기간과 비교',
    description: '지난주 같은 요일 또는 같은 기간과 비교합니다.',
  },
  {
    key: 'same_period_last_month',
    label: '지난달 같은 기간과 비교',
    description: '지난달 같은 날짜 범위와 비교합니다.',
  },
  {
    key: 'custom',
    label: '기준 기간 직접 선택',
    description: '조회 기간과 비교 기준 기간을 직접 지정합니다.',
  },
];

export const SALES_SUMMARY_COMPARE_TARGET_OPTIONS: SalesSummaryPresetOption[] = [
  { key: 'today', label: '오늘' },
  { key: 'yesterday', label: '어제' },
  { key: 'this_week', label: '이번 주' },
  { key: 'this_month', label: '이번 달' },
  { key: 'last_7_days', label: '최근 7일' },
  { key: 'last_30_days', label: '최근 30일' },
  { key: 'custom', label: '직접 기간 선택' },
];

export const createSummaryCompletionKey = (periodKey: SalesSummaryPresetKey) =>
  `${SUMMARY_COMPLETION_PREFIX}:${periodKey}`;

export const createCompareCompletionKey = (
  compareMode: SalesSummaryCompareMode,
  periodKey: SalesSummaryPresetKey,
) => `${COMPARE_COMPLETION_PREFIX}:${compareMode}:${periodKey}`;

const EXACT_SUMMARY_PROMPT_MAP = new Map<string, ParsedSalesSummarySelection>([
  ['오늘 매출 요약해줘', { completionKey: createSummaryCompletionKey('today') }],
  ['어제 매출 요약해줘', { completionKey: createSummaryCompletionKey('yesterday') }],
  ['이번 주 매출 요약해줘', { completionKey: createSummaryCompletionKey('this_week') }],
  ['이번 달 매출 요약해줘', { completionKey: createSummaryCompletionKey('this_month') }],
  ['최근 7일 매출 요약해줘', { completionKey: createSummaryCompletionKey('last_7_days') }],
  ['최근 30일 매출 요약해줘', { completionKey: createSummaryCompletionKey('last_30_days') }],
  ['지난달 매출 요약해줘', { completionKey: createSummaryCompletionKey('last_month') }],
  ['오늘 매출을 이전 기간과 비교해줘', { completionKey: createCompareCompletionKey('previous_period', 'today') }],
  ['어제 매출을 이전 기간과 비교해줘', { completionKey: createCompareCompletionKey('previous_period', 'yesterday') }],
  ['이번 주 매출을 이전 기간과 비교해줘', { completionKey: createCompareCompletionKey('previous_period', 'this_week') }],
  ['이번 달 매출을 이전 기간과 비교해줘', { completionKey: createCompareCompletionKey('previous_period', 'this_month') }],
  ['최근 7일 매출을 이전 기간과 비교해줘', { completionKey: createCompareCompletionKey('previous_period', 'last_7_days') }],
  ['최근 30일 매출을 이전 기간과 비교해줘', { completionKey: createCompareCompletionKey('previous_period', 'last_30_days') }],
  ['오늘 매출을 지난주 같은 요일과 비교해줘', { completionKey: createCompareCompletionKey('same_period_last_week', 'today') }],
  ['어제 매출을 지난주 같은 요일과 비교해줘', { completionKey: createCompareCompletionKey('same_period_last_week', 'yesterday') }],
  ['이번 주 매출을 지난주 같은 기간과 비교해줘', { completionKey: createCompareCompletionKey('same_period_last_week', 'this_week') }],
  ['이번 달 매출을 지난주 같은 기간과 비교해줘', { completionKey: createCompareCompletionKey('same_period_last_week', 'this_month') }],
  ['최근 7일 매출을 지난주 같은 기간과 비교해줘', { completionKey: createCompareCompletionKey('same_period_last_week', 'last_7_days') }],
  ['최근 30일 매출을 지난주 같은 기간과 비교해줘', { completionKey: createCompareCompletionKey('same_period_last_week', 'last_30_days') }],
  ['오늘 매출을 지난달 같은 날짜와 비교해줘', { completionKey: createCompareCompletionKey('same_period_last_month', 'today') }],
  ['어제 매출을 지난달 같은 날짜와 비교해줘', { completionKey: createCompareCompletionKey('same_period_last_month', 'yesterday') }],
  ['이번 주 매출을 지난달 같은 기간과 비교해줘', { completionKey: createCompareCompletionKey('same_period_last_month', 'this_week') }],
  ['이번 달 매출을 지난달 같은 기간과 비교해줘', { completionKey: createCompareCompletionKey('same_period_last_month', 'this_month') }],
  ['최근 7일 매출을 지난달 같은 기간과 비교해줘', { completionKey: createCompareCompletionKey('same_period_last_month', 'last_7_days') }],
  ['최근 30일 매출을 지난달 같은 기간과 비교해줘', { completionKey: createCompareCompletionKey('same_period_last_month', 'last_30_days') }],
]);

const normalizePrompt = (prompt: string) => prompt.trim().replace(/\s+/g, ' ');

const detectPresetFromText = (text: string): SalesSummaryPresetKey | null => {
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

  return null;
};

const detectCompareModeFromText = (text: string): SalesSummaryCompareMode | null => {
  if (/지난주 같은 기간|지난주 같은 요일/.test(text)) {
    return 'same_period_last_week';
  }
  if (/지난달 같은 기간|지난달 같은 날짜/.test(text)) {
    return 'same_period_last_month';
  }
  if (/기준 기간|직접 비교|사용자 지정 비교/.test(text)) {
    return 'custom';
  }
  if (/이전 기간|직전 기간|전 기간/.test(text)) {
    return 'previous_period';
  }

  return null;
};

const hasCustomDateRange = (text: string) => {
  const matches = Array.from(text.matchAll(DATE_RANGE_PATTERN));
  return matches.length >= 2;
};

const hasCustomCompareDateRange = (text: string) => {
  const matches = Array.from(text.matchAll(DATE_RANGE_PATTERN));
  return matches.length >= 4;
};

export const buildSalesSummaryPrompt = (periodKey: SalesSummaryPresetKey) => {
  switch (periodKey) {
    case 'today':
      return '오늘 매출 요약해줘';
    case 'yesterday':
      return '어제 매출 요약해줘';
    case 'this_week':
      return '이번 주 매출 요약해줘';
    case 'this_month':
      return '이번 달 매출 요약해줘';
    case 'last_7_days':
      return '최근 7일 매출 요약해줘';
    case 'last_30_days':
      return '최근 30일 매출 요약해줘';
    case 'last_month':
      return '지난달 매출 요약해줘';
    case 'custom':
      throw new Error('custom period requires explicit dates');
  }
};

export const buildCustomSalesSummaryPrompt = (range: DateRangeSelection) =>
  `${range.from}부터 ${range.to}까지 매출 요약해줘`;

export const buildSalesSummaryComparePrompt = (
  compareMode: SalesSummaryCompareMode,
  periodKey: Exclude<SalesSummaryPresetKey, 'custom'>,
) => {
  switch (compareMode) {
    case 'previous_period':
      return `${periodLabelToQueryFragment(periodKey)} 매출을 이전 기간과 비교해줘`;
    case 'same_period_last_week':
      if (periodKey === 'today') {
        return '오늘 매출을 지난주 같은 요일과 비교해줘';
      }
      if (periodKey === 'yesterday') {
        return '어제 매출을 지난주 같은 요일과 비교해줘';
      }
      return `${periodLabelToQueryFragment(periodKey)} 매출을 지난주 같은 기간과 비교해줘`;
    case 'same_period_last_month':
      if (periodKey === 'today') {
        return '오늘 매출을 지난달 같은 날짜와 비교해줘';
      }
      if (periodKey === 'yesterday') {
        return '어제 매출을 지난달 같은 날짜와 비교해줘';
      }
      return `${periodLabelToQueryFragment(periodKey)} 매출을 지난달 같은 기간과 비교해줘`;
    case 'custom':
      throw new Error('custom compare mode requires explicit base dates');
  }
};

export const buildCustomRangeComparePrompt = (
  compareMode: Exclude<SalesSummaryCompareMode, 'custom'>,
  range: DateRangeSelection,
) => {
  switch (compareMode) {
    case 'previous_period':
      return `${range.from}부터 ${range.to}까지 매출을 이전 기간과 비교해줘`;
    case 'same_period_last_week':
      return `${range.from}부터 ${range.to}까지 매출을 지난주 같은 기간과 비교해줘`;
    case 'same_period_last_month':
      return `${range.from}부터 ${range.to}까지 매출을 지난달 같은 기간과 비교해줘`;
  }
};

export const buildCustomComparePrompt = (range: CustomCompareRangeSelection) =>
  `${range.targetFrom}부터 ${range.targetTo}까지 매출을 ${range.baseFrom}부터 ${range.baseTo}까지와 비교해줘`;

const periodLabelToQueryFragment = (periodKey: Exclude<SalesSummaryPresetKey, 'custom'>) => {
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

export const parseSalesSummaryPromptSelection = (
  prompt: string,
): ParsedSalesSummarySelection | null => {
  const normalized = normalizePrompt(prompt);
  const exactMatch = EXACT_SUMMARY_PROMPT_MAP.get(normalized);
  if (exactMatch) {
    return exactMatch;
  }

  if (NON_SUMMARY_KEYWORDS.test(normalized)) {
    return null;
  }

  if (!BASIC_SUMMARY_KEYWORDS.test(normalized)) {
    return null;
  }

  if (hasCustomCompareDateRange(normalized) && COMPARE_KEYWORDS.test(normalized)) {
    return { completionKey: createCompareCompletionKey('custom', 'custom') };
  }

  if (hasCustomDateRange(normalized)) {
    const compareMode = detectCompareModeFromText(normalized);
    if (compareMode) {
      return { completionKey: createCompareCompletionKey(compareMode, 'custom') };
    }

    return { completionKey: createSummaryCompletionKey('custom') };
  }

  const periodKey = detectPresetFromText(normalized);
  if (!periodKey) {
    return null;
  }

  const compareMode = detectCompareModeFromText(normalized);
  if (compareMode) {
    return { completionKey: createCompareCompletionKey(compareMode, periodKey) };
  }

  return { completionKey: createSummaryCompletionKey(periodKey) };
};

export const collectCompletedSalesSummarySelections = (messages: ChatMessage[]) => {
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

      const parsedSelection = parseSalesSummaryPromptSelection(repliedUserMessage.content);
      if (parsedSelection) {
        completedSelections.add(parsedSelection.completionKey);
      }
    });

  return completedSelections;
};

export const isSalesSummaryPromptCompleted = (prompt: string, messages: ChatMessage[]) => {
  const parsedSelection = parseSalesSummaryPromptSelection(prompt);
  if (!parsedSelection) {
    return false;
  }

  return collectCompletedSalesSummarySelections(messages).has(parsedSelection.completionKey);
};

export const isSummaryPresetCompleted = (
  completedSelections: Set<string>,
  periodKey: SalesSummaryPresetKey,
) => completedSelections.has(createSummaryCompletionKey(periodKey));

export const isComparePresetCompleted = (
  completedSelections: Set<string>,
  compareMode: SalesSummaryCompareMode,
  periodKey: SalesSummaryPresetKey,
) => completedSelections.has(createCompareCompletionKey(compareMode, periodKey));
