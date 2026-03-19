import {
    PackageSearch,
    TrendingUp,
    type LucideIcon,
} from 'lucide-react';

export interface ChatGuidedPrompt {
    label: string;
    prompt: string;
}

export interface ChatGuidedPromptSection {
    id: string;
    title?: string;
    prompts: ChatGuidedPrompt[];
}

export interface ChatGuidedPromptGroup {
    id: string;
    title: string;
    icon: LucideIcon;
    sections: ChatGuidedPromptSection[];
}

export const CHAT_GUIDED_PROMPT_GROUPS: ChatGuidedPromptGroup[] = [
    {
        id: 'sales-analysis',
        title: '매출 분석',
        icon: TrendingUp,
        sections: [
            {
                id: 'sales-summary',
                title: '매출 요약',
                prompts: [
                    { label: '오늘 매출 요약', prompt: '오늘 매출 요약해줘' },
                    { label: '최근 7일 매출 요약', prompt: '최근 7일 매출 요약해줘' },
                    { label: '최근 30일 매출 요약', prompt: '최근 30일 매출 요약해줘' },
                ],
            },
            {
                id: 'sales-comparison',
                title: '매출 비교',
                prompts: [
                    { label: '이번 달 vs 지난달', prompt: '이번 달 매출을 지난달 같은 기간과 비교해줘' },
                    { label: '이번 주 vs 지난주', prompt: '이번 주 주문 수를 지난주와 비교해줘' },
                ],
            },
            {
                id: 'sales-trend',
                title: '매출 추이',
                prompts: [
                    { label: '매출 추이', prompt: '최근 30일 매출 추이 보여줘' },
                    { label: '주문 추이', prompt: '이번 달 일별 주문 수 흐름 알려줘' },
                    { label: '매출+주문', prompt: '최근 30일 매출과 주문 수를 함께 보여줘' },
                ],
            },
            {
                id: 'sales-peak',
                title: '피크 분석',
                prompts: [
                    { label: '바쁜 시간대', prompt: '최근 한 달 기준 가장 바쁜 시간대 알려줘' },
                    { label: '바쁜 요일', prompt: '최근 한 달 기준 매출이 가장 높은 요일 알려줘' },
                ],
            },
            {
                id: 'sales-menu-ranking',
                title: '메뉴',
                prompts: [
                    { label: '많이 팔린 메뉴', prompt: '이번 달 판매 수량 기준 상위 메뉴 보여줘' },
                    { label: '매출이 큰 메뉴', prompt: '이번 달 매출 기준 상위 메뉴 보여줘' },
                ],
            },
            {
                id: 'sales-refund-orders',
                title: '환불 · 주문',
                prompts: [
                    { label: '이번 주 환불 요약', prompt: '이번 주 환불 요약' },
                    { label: '오늘 주문 기록', prompt: '오늘 주문 기록 보여줘' },
                ],
            },
        ],
    },
    {
        id: 'stock',
        title: '재고 · 입고',
        icon: PackageSearch,
        sections: [
            {
                id: 'stock-current',
                title: '재고',
                prompts: [
                    { label: '재고 부족 품목', prompt: '재고 부족 품목 보여줘' },
                    { label: '부족 재고 요약', prompt: '현재 재고 부족 상황 요약해줘' },
                ],
            },
            {
                id: 'stock-inbound',
                title: '입고 · 이력',
                prompts: [
                    { label: '최근 입고 내역', prompt: '최근 입고 내역 보여줘' },
                    { label: '최근 7일 부족 이력', prompt: '최근 7일 재고 부족 이력 보여줘' },
                ],
            },
        ],
    },
];

export const CHAT_COMPACT_PROMPTS: ChatGuidedPrompt[] = [
    { label: '오늘 매출 요약', prompt: '오늘 매출 요약해줘' },
    { label: '이번 달 vs 지난달', prompt: '이번 달 매출을 지난달 같은 기간과 비교해줘' },
    { label: '최근 30일 매출 추이', prompt: '최근 30일 매출 추이 보여줘' },
    { label: '이번 주 환불 요약', prompt: '이번 주 환불 얼마나 나왔어?' },
    { label: '오늘 주문 기록', prompt: '오늘 주문 기록 보여줘' },
    { label: '재고 부족 품목', prompt: '재고 부족 품목 보여줘' },
    { label: '최근 입고 내역', prompt: '최근 입고 내역 보여줘' },
];

export const CHAT_ASSISTANT_SUGGESTION_FALLBACKS: Record<string, ChatGuidedPrompt[]> = {
    sales: [
        { label: '오늘 매출 요약', prompt: '오늘 매출 요약해줘' },
        { label: '이번 달 vs 지난달', prompt: '이번 달 매출을 지난달 같은 기간과 비교해줘' },
        { label: '최근 30일 매출 추이', prompt: '최근 30일 매출 추이 보여줘' },
        { label: '이번 주 환불 요약', prompt: '이번 주 환불 얼마나 나왔어?' },
        { label: '오늘 주문 기록', prompt: '오늘 주문 기록 보여줘' },
    ],
    stock: [
        { label: '재고 부족 품목', prompt: '재고 부족 품목 보여줘' },
        { label: '최근 입고 내역', prompt: '최근 입고 내역 보여줘' },
        { label: '최근 7일 재고 부족 이력', prompt: '최근 7일 재고 부족 이력 보여줘' },
    ],
    default: [
        { label: '오늘 매출 요약', prompt: '오늘 매출 요약해줘' },
        { label: '이번 주 환불 요약', prompt: '이번 주 환불 얼마나 나왔어?' },
        { label: '재고 부족 품목', prompt: '재고 부족 품목 보여줘' },
    ],
};
