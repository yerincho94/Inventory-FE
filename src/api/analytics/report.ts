import apiClient from '../user/client.ts';
import type { ReportSummaryResponse, ReportGenerateRequest } from '@/types/analytics/report.ts';

const BASE_URL = '/api/analytics';

/**
 * 리포트 요약 조회 (JSON) — 발행 페이지 미리보기용
 * GET /api/analytics/{storePublicId}/reports/summary?from=&to=
 */
export const getReportSummary = async (
    storePublicId: string,
    from: string,
    to: string
): Promise<ReportSummaryResponse> => {
    const response = await apiClient.get<ReportSummaryResponse>(
        `${BASE_URL}/${storePublicId}/reports/summary`,
        { params: { from, to } }
    );
    return response.data;
};

/**
 * 월간 리포트 요약 조회 (JSON) — 월간 리포트 페이지 진입 시 자동 호출용
 * GET /api/analytics/{storePublicId}/reports/monthly/{yearMonth}/summary
 */
export const getMonthlyReportSummary = async (
    storePublicId: string,
    yearMonth: string   // "2025-06"
): Promise<ReportSummaryResponse> => {
    const response = await apiClient.get<ReportSummaryResponse>(
        `${BASE_URL}/${storePublicId}/reports/monthly/${yearMonth}/summary`
    );
    return response.data;
};

/**
 * 리포트 PDF 발행 — 사용자 지정 기간
 * POST /api/analytics/{storePublicId}/reports
 * → blob 응답 (ApiResponseAdvice 래핑 안 됨)
 */
export const generateReportPdf = async (
    storePublicId: string,
    request: ReportGenerateRequest
): Promise<Blob> => {
    const response = await apiClient.post(
        `${BASE_URL}/${storePublicId}/reports`,
        request,
        { responseType: 'blob' }
    );
    return response.data;
};

/**
 * 월간 리포트 PDF 다운로드
 * GET /api/analytics/{storePublicId}/reports/monthly/{yearMonth}
 * → blob 응답 (ApiResponseAdvice 래핑 안 됨)
 */
export const getMonthlyReportPdf = async (
    storePublicId: string,
    yearMonth: string   // "2025-06"
): Promise<Blob> => {
    const response = await apiClient.get(
        `${BASE_URL}/${storePublicId}/reports/monthly/${yearMonth}`,
        { responseType: 'blob' }
    );
    return response.data;
};

/**
 * Blob → 파일 다운로드 트리거 유틸
 */
export const downloadPdfBlob = (blob: Blob, filename: string): void => {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
};