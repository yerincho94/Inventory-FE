// ==================== 공통 ====================

export interface MenuEntry {
    rank: number;
    menuName: string;
    totalQuantity: number;
    totalAmount: number;
}

export interface ReasonEntry {
    reason: string;        // EXPIRED | DAMAGED | SPOILED | ETC
    count: number;
    wasteAmount: number;
    ratio: number;         // % (소수점 1자리)
}

// ==================== 리포트 요약 (JSON) ====================

export interface ReportSummaryResponse {
    from: string;                    // "2025-01-01"
    to: string;                      // "2025-01-31"
    // 매출
    totalOrderCount: number;
    totalAmount: number;
    averageOrderAmount: number;
    menuTop5: MenuEntry[];
    // 환불
    refundCount: number;
    refundRate: number;              // % (소수점 1자리)
    // 폐기
    totalWasteAmount: number;
    reasonBreakdown: ReasonEntry[];
    // 입고
    totalInboundCount: number;
}

// ==================== 리포트 요청 ====================

export interface ReportGenerateRequest {
    from: string;   // "2025-01-01"
    to: string;     // "2025-01-31"
}

// ==================== 폐기 사유 한글 레이블 ====================

export const WASTE_REASON_LABELS: Record<string, string> = {
    EXPIRED: '유통기한 경과',
    DAMAGED: '포장 파손',
    SPOILED: '부패 및 변질',
    ETC: '기타 사유',
};