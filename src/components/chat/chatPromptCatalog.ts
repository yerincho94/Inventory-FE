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
        description: '부족 재고, 입고 내역, 재고 변동 및 이력을 확인합니다.',
        icon: PackageSearch,
        sections: [
            {
                id: 'stock-current',
                title: '재고 현황',
                columns: 2,
                prompts: [
                    {
                        label: '현재 재고 현황',
                        prompt: '현재 재고 현황 보여줘',
                    },
                    {
                        label: '임계치 미만 재고',
                        prompt: '현재 임계치 미만의 재고를 보여줘',
                    },
                    {
                        label: '특정 재료 배치 확인',
                        prompt: '재고 배치를 알려줘',
                    },
                ],
            },
            {
                id: 'stock-history',
                title: '로그',
                columns: 2,
                prompts: [
                    {
                        label: '이번 달 입고 내역',
                        prompt: '이번 달 입고 내역 보여줘',
                    },
                    {
                        label: '오늘의 재고 변동 로그',
                        prompt: '오늘의 재고 변동 내역 보여줘',
                    },
                    {
                        label: '상태 별 로그',
                        prompt: '상태에 따른 로그를 보여줘',
                    },
                ],
            },
            {
                id: 'stock-shortage',
                title: '재고 부족 이력',
                columns: 2,
                prompts: [
                    {
                        label: '이번 주 부족 이력 요약',
                        prompt: '이번 주 재고 부족 이력을 보여줘',
                    },
                    {
                        label: '미해결 부족 건',
                        prompt: '현재 해결되지 않은 재고 부족 건들 보여줘',
                    },
                    {
                        label: '',
                        prompt: '',
                        description: 'placeholder',
                    },
                ],
            },
        ],
    },
];

export const CHAT_COMPACT_PROMPTS: ChatGuidedPrompt[] = [
    { label: '오늘 매출 요약', prompt: '오늘 매출 요약해줘' },
    { label: '최근 30일 매출 추이', prompt: '최근 30일 매출 추이 보여줘' },
    { label: '재고 부족 품목', prompt: '재고 부족 품목 보여줘' },
    { label: '전체 재고 현황', prompt: '전체 재고 현황 보여줘' },
    { label: '이번 달 입고 내역', prompt: '이번 달 입고 내역 보여줘' },
    { label: '오늘의 재고 변동 내역', prompt: '오늘의 재고 변동 내역 보여줘' },
];

export const CHAT_ASSISTANT_SUGGESTION_FALLBACKS: Record<string, ChatGuidedPrompt[]> = {
    sales: [
        { label: '오늘 매출 요약', prompt: '오늘 매출 요약해줘' },
        { label: '최근 30일 매출 추이', prompt: '최근 30일 매출 추이 보여줘' },
        { label: '최근 한 달 피크 시간', prompt: '최근 한 달 기준 매출 피크 시간대 알려줘' },
        { label: '이번 달 상위 메뉴 5개', prompt: '이번 달 판매 수량 기준 상위 메뉴 보여줘' },
    ],
    stock: [
        { label: '임계치 미만 재고', prompt: '임계치 미만의 재고를 보여줘' },
        { label: '전체 재고 현황', prompt: '전체 재고 현황 보여줘' },
        { label: '이번 달 입고 내역', prompt: '이번 달 입고 내역 보여줘' },
        { label: '오늘의 재고 변동 내역', prompt: '오늘의 재고 변동 내역 보여줘' },
    ],
    default: [
        { label: '오늘 매출 요약', prompt: '오늘 매출 요약해줘' },
        { label: '임계치 미만 재고', prompt: '임계치 미만의 재고를 보여줘' },
        { label: '이번 달 입고 내역', prompt: '이번 달 입고 내역 보여줘' },
    ],
};

