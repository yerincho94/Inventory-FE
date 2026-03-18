import type { ChatMessage } from '@/types';

export type TopMenuRankingPresetKey =
  | 'today'
  | 'yesterday'
  | 'this_week'
  | 'this_month'
  | 'last_7_days'
  | 'last_30_days'
  | 'last_month'
  | 'custom';

export type TopMenuRankingRankByKey = 'quantity' | 'amount';
export type TopMenuRankingTopNKey = 1 | 3 | 5 | 10;
export type TopMenuRankingCountSelectionKey = TopMenuRankingTopNKey | 'custom';

export interface TopMenuRankingPrimaryAction {
  key: TopMenuRankingRankByKey;
  label: string;
  description: string;
  helper: string;
}

export interface TopMenuRankingCountOption {
  key: TopMenuRankingCountSelectionKey;
  label: string;
  description: string;
}

export interface TopMenuRankingPresetOption {
  key: Exclude<TopMenuRankingPresetKey, 'custom'>;
  label: string;
}

export interface TopMenuRankingDateRangeSelection {
  from: string;
  to: string;
}

interface ParsedTopMenuRankingSelection {
  completionKey: string;
}

const TOP_MENU_COMPLETION_PREFIX = 'sales.top_menu';
const DATE_RANGE_PATTERN = /(\d{4}-\d{2}-\d{2})/g;

const BASIC_MENU_KEYWORDS = /(메뉴|베스트|베스트셀러|랭킹|순위|인기 메뉴|많이 팔린|잘 팔린|판매량|판매 수량|수량 기준|매출 기준|매출을 가장 많이 끌|매출 기여)/;
const NON_MENU_KEYWORDS = /(재고|입고|요약|비교|추이|흐름|피크|시간대|요일|점심|저녁|리포트)/;

export const TOP_MENU_PRIMARY_ACTIONS: TopMenuRankingPrimaryAction[] = [
  {
    key: 'quantity',
    label: '많이 팔린 메뉴 보기',
    description: '판매 수량 기준으로 베스트 메뉴를 확인합니다.',
    helper: '메뉴별 판매 수량, 총매출, 매출 비중을 함께 확인할 수 있습니다.',
  },
  {
    key: 'amount',
    label: '매출이 큰 메뉴 보기',
    description: '어떤 메뉴가 매출을 끌었는지 확인합니다.',
    helper: '매출 기준 순위와 함께 메뉴별 판매 수량, 총매출, 매출 비중을 확인합니다.',
  },
];

export const TOP_MENU_COUNT_OPTIONS: TopMenuRankingCountOption[] = [
  { key: 1, label: '1위만 보기', description: '대표 메뉴 한 개만 바로 확인합니다.' },
  { key: 3, label: '상위 3개', description: '핵심 메뉴 몇 개만 빠르게 봅니다.' },
  { key: 5, label: '상위 5개', description: '가장 자주 보는 기본 개수입니다.' },
  { key: 10, label: '상위 10개', description: '넓게 살펴볼 때 사용합니다.' },
  { key: 'custom', label: '직접 개수 입력', description: '원하는 개수를 1~20 사이로 직접 입력합니다.' },
];

export const TOP_MENU_PERIOD_OPTIONS: TopMenuRankingPresetOption[] = [
  { key: 'this_week', label: '이번 주' },
  { key: 'this_month', label: '이번 달' },
  { key: 'last_7_days', label: '최근 7일' },
  { key: 'last_30_days', label: '최근 30일' },
  { key: 'last_month', label: '지난달' },
  { key: 'today', label: '오늘' },
  { key: 'yesterday', label: '어제' },
];

export const normalizeTopMenuCount = (topN: number) => {
  if (!Number.isFinite(topN)) {
    return 5;
  }

  const normalized = Math.trunc(topN);
  if (normalized <= 0) {
    return 1;
  }

  return Math.min(normalized, 20);
};

export const createTopMenuCompletionKey = (
  rankBy: TopMenuRankingRankByKey,
  periodKey: TopMenuRankingPresetKey,
  topN: number,
) => `${TOP_MENU_COMPLETION_PREFIX}:${rankBy}:${periodKey}:${normalizeTopMenuCount(topN)}`;

const normalizePrompt = (prompt: string) => prompt.trim().replace(/\s+/g, ' ');

const hasCustomDateRange = (text: string) => Array.from(text.matchAll(DATE_RANGE_PATTERN)).length >= 2;

const detectPresetFromText = (text: string): TopMenuRankingPresetKey | null => {
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

  return null;
};

const detectRankByFromText = (text: string): TopMenuRankingRankByKey | null => {
  if (/매출 기준|매출 상위|매출이 큰|매출이 높은|매출 1위|전체 매출|매출을 가장 많이 끌|매출 기여/.test(text)) {
    return 'amount';
  }

  if (/많이 팔린|잘 팔린|베스트셀러|베스트 메뉴|인기 메뉴|판매량|판매 수량|수량 기준|주문 수 기준/.test(text)) {
    return 'quantity';
  }

  if (text.includes('메뉴') && text.includes('매출')) {
    return 'amount';
  }

  if (text.includes('메뉴')) {
    return 'quantity';
  }

  return null;
};

const detectTopNFromText = (text: string): number => {
  const explicitCountMatch = text.match(/(?:상위|베스트|메뉴)\s*(\d+)\s*개/);
  if (explicitCountMatch) {
    return normalizeTopMenuCount(Number(explicitCountMatch[1]));
  }

  const genericCountMatch = text.match(/(\d+)\s*개/);
  if (genericCountMatch) {
    return normalizeTopMenuCount(Number(genericCountMatch[1]));
  }

  if (/1위|대표 메뉴|가장 많이 팔린|제일 많이 팔린|가장 매출이 큰|제일 매출이 큰|가장 잘 팔린/.test(text)) {
    return 1;
  }

  return 5;
};

const periodLabelToQueryFragment = (periodKey: Exclude<TopMenuRankingPresetKey, 'custom'>) => {
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

export const buildTopMenuRankingPrompt = (
  rankBy: TopMenuRankingRankByKey,
  periodKey: Exclude<TopMenuRankingPresetKey, 'custom'>,
  topN: number,
) => {
  const normalizedTopN = normalizeTopMenuCount(topN);
  const periodLabel = periodLabelToQueryFragment(periodKey);

  if (rankBy === 'quantity') {
    if (normalizedTopN === 1) {
      return `${periodLabel} 가장 많이 팔린 메뉴 알려줘`;
    }

    return `${periodLabel} 많이 팔린 메뉴 상위 ${normalizedTopN}개 보여줘`;
  }

  if (normalizedTopN === 1) {
    return `${periodLabel} 매출 기준 1위 메뉴 알려줘`;
  }

  return `${periodLabel} 매출 기준 상위 ${normalizedTopN}개 메뉴 보여줘`;
};

export const buildCustomTopMenuRankingPrompt = (
  rankBy: TopMenuRankingRankByKey,
  range: TopMenuRankingDateRangeSelection,
  topN: number,
) => {
  const normalizedTopN = normalizeTopMenuCount(topN);

  if (rankBy === 'quantity') {
    if (normalizedTopN === 1) {
      return `${range.from}부터 ${range.to}까지 가장 많이 팔린 메뉴 알려줘`;
    }

    return `${range.from}부터 ${range.to}까지 많이 팔린 메뉴 상위 ${normalizedTopN}개 보여줘`;
  }

  if (normalizedTopN === 1) {
    return `${range.from}부터 ${range.to}까지 매출 기준 1위 메뉴 알려줘`;
  }

  return `${range.from}부터 ${range.to}까지 매출 기준 상위 ${normalizedTopN}개 메뉴 보여줘`;
};

export const parseTopMenuRankingPromptSelection = (
  prompt: string,
): ParsedTopMenuRankingSelection | null => {
  const normalized = normalizePrompt(prompt);

  if (NON_MENU_KEYWORDS.test(normalized)) {
    return null;
  }

  if (!BASIC_MENU_KEYWORDS.test(normalized)) {
    return null;
  }

  const rankBy = detectRankByFromText(normalized);
  if (!rankBy) {
    return null;
  }

  const periodKey = detectPresetFromText(normalized) ?? 'last_30_days';
  const topN = detectTopNFromText(normalized);

  return {
    completionKey: createTopMenuCompletionKey(rankBy, periodKey, topN),
  };
};

export const collectCompletedTopMenuRankingSelections = (messages: ChatMessage[]) => {
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

      const parsedSelection = parseTopMenuRankingPromptSelection(repliedUserMessage.content);
      if (parsedSelection) {
        completedSelections.add(parsedSelection.completionKey);
      }
    });

  return completedSelections;
};

export const isTopMenuRankingPromptCompleted = (prompt: string, messages: ChatMessage[]) => {
  const parsedSelection = parseTopMenuRankingPromptSelection(prompt);
  if (!parsedSelection) {
    return false;
  }

  return collectCompletedTopMenuRankingSelections(messages).has(parsedSelection.completionKey);
};

export const isTopMenuPresetCompleted = (
  completedSelections: Set<string>,
  rankBy: TopMenuRankingRankByKey,
  periodKey: TopMenuRankingPresetKey,
  topN: number,
) => completedSelections.has(createTopMenuCompletionKey(rankBy, periodKey, topN));
