import {
    PackageSearch,
    TrendingUp,
    type LucideIcon,
} from 'lucide-react';

export interface ChatGuidedPrompt {
    label: string;
    prompt: string;
    description?: string;
}

export interface ChatGuidedPromptSection {
    id: string;
    title?: string;
    prompts: ChatGuidedPrompt[];
    columns?: 2 | 3;
}

export interface ChatGuidedPromptGroup {
    id: string;
    title: string;
    description: string;
    icon: LucideIcon;
    sections: ChatGuidedPromptSection[];
}

export const CHAT_GUIDED_PROMPT_GROUPS: ChatGuidedPromptGroup[] = [
    {
        id: 'sales-analysis',
        title: '매출 분석',
        description: '매출 요약, 흐름, 피크, 메뉴 분석을 확인합니다.',
        icon: TrendingUp,
        sections: [
            {
                id: 'sales-summary',
                title: '매출 요약',
                columns: 3,
                prompts: [
                    {
                        label: '오늘 매출 요약',
                        prompt: '오늘 매출 요약해줘',
                    },
                    {
                        label: '최근 7일 매출 요약',
                        prompt: '최근 7일 매출 요약해줘',
                    },
                    {
                        label: '최근 30일 매출 요약',
                        prompt: '최근 30일 매출 요약해줘',
                    },
                ],
            },
            {
                id: 'sales-trend',
                title: '매출 흐름',
                columns: 2,
                prompts: [
                    {
                        label: '매출 흐름 보기',
                        prompt: '최근 30일 매출 추이 보여줘',
                    },
                    {
                        label: '주문 흐름 보기',
                        prompt: '이번 달 일별 주문 수 흐름 알려줘',
                    },
                ],
            },
            {
                id: 'sales-peak',
                title: '피크 분석',
                columns: 2,
                prompts: [
                    {
                        label: '바쁜 시간대 보기',
                        prompt: '최근 한 달 기준 가장 바쁜 시간대 알려줘',
                    },
                    {
                        label: '피크 구간 보기',
                        prompt: '최근 한 달 기준 매출 피크 시간대 알려줘',
                    },
                ],
            },
            {
                id: 'sales-menu-ranking',
                title: '메뉴 랭킹',
                columns: 2,
                prompts: [
                    {
                        label: '많이 팔린 메뉴',
                        prompt: '이번 달 판매 수량 기준 상위 메뉴 보여줘',
                    },
                    {
                        label: '매출이 큰 메뉴',
                        prompt: '이번 달 매출 기준 상위 메뉴 보여줘',
                    },
                ],
            },
        ],
    },
    {
        id: 'stock',
        title: '재고 · 입고',
        description: '부족 재고, 입고 내역, 부족 이력을 확인합니다.',
        icon: PackageSearch,
        sections: [
            {
                id: 'stock-current',
                title: '재고 현황',
                columns: 2,
                prompts: [
                    {
                        label: '재고 부족 품목',
                        prompt: '재고 부족 품목 보여줘',
                    },
                    {
                        label: '부족 재고 요약',
                        prompt: '현재 재고 부족 상황 요약해줘',
                    },
                ],
            },
            {
                id: 'stock-inbound',
                title: '입고 · 부족 이력',
                columns: 2,
                prompts: [
                    {
                        label: '최근 입고 내역',
                        prompt: '최근 입고 내역 보여줘',
                    },
                    {
                        label: '최근 7일 재고 부족 이력',
                        prompt: '최근 7일 재고 부족 이력 보여줘',
                    },
                ],
            },
        ],
    },
];

export const CHAT_COMPACT_PROMPTS: ChatGuidedPrompt[] = [
    { label: '오늘 매출 요약', prompt: '오늘 매출 요약해줘' },
    { label: '최근 30일 매출 추이', prompt: '최근 30일 매출 추이 보여줘' },
    { label: '최근 한 달 피크 시간', prompt: '최근 한 달 기준 매출 피크 시간대 알려줘' },
    { label: '이번 달 상위 메뉴 5개', prompt: '이번 달 판매 수량 기준 상위 메뉴 보여줘' },
    { label: '재고 부족 품목', prompt: '재고 부족 품목 보여줘' },
    { label: '최근 입고 내역', prompt: '최근 입고 내역 보여줘' },
    { label: '최근 7일 재고 부족 이력', prompt: '최근 7일 재고 부족 이력 보여줘' },
];

export const CHAT_ASSISTANT_SUGGESTION_FALLBACKS: Record<string, ChatGuidedPrompt[]> = {
    sales: [
        { label: '오늘 매출 요약', prompt: '오늘 매출 요약해줘' },
        { label: '최근 30일 매출 추이', prompt: '최근 30일 매출 추이 보여줘' },
        { label: '최근 한 달 피크 시간', prompt: '최근 한 달 기준 매출 피크 시간대 알려줘' },
        { label: '이번 달 상위 메뉴 5개', prompt: '이번 달 판매 수량 기준 상위 메뉴 보여줘' },
    ],
    stock: [
        { label: '재고 부족 품목', prompt: '재고 부족 품목 보여줘' },
        { label: '최근 입고 내역', prompt: '최근 입고 내역 보여줘' },
        { label: '최근 7일 재고 부족 이력', prompt: '최근 7일 재고 부족 이력 보여줘' },
    ],
    default: [
        { label: '오늘 매출 요약', prompt: '오늘 매출 요약해줘' },
        { label: '재고 부족 품목', prompt: '재고 부족 품목 보여줘' },
        { label: '최근 입고 내역', prompt: '최근 입고 내역 보여줘' },
    ],
};

