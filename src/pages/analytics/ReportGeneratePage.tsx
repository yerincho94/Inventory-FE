import { useState } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import { FileText, ShoppingBag, RotateCcw, Trash2, PackageCheck, Download } from 'lucide-react';
import { KPICard } from '@/components/home';
import { requireStorePublicId } from '@/utils/store.ts';
import {
    getReportSummary,
    generateReportPdf,
    downloadPdfBlob
} from '@/api/analytics/report.ts';
import type { ReportSummaryResponse } from '@/types/analytics/report.ts';
import { WASTE_REASON_LABELS } from '@/types/analytics/report.ts';

/** 금액 포맷팅 */
function formatAmount(amount: number): string {
    return amount.toLocaleString('ko-KR');
}

/** 오늘 날짜 YYYY-MM-DD */
function today(): string {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** 이번 달 1일 YYYY-MM-DD */
function firstDayOfMonth(): string {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-01`;
}

// 폐기 사유 차트 색상
const REASON_COLORS = ['#1e293b', '#475569', '#94a3b8', '#cbd5e1'];

export default function ReportGeneratePage() {
    const storePublicId = requireStorePublicId();

    const [fromDate, setFromDate] = useState<string>(firstDayOfMonth());
    const [toDate, setToDate] = useState<string>(today());

    const [isQuerying, setIsQuerying] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [summaryData, setSummaryData] = useState<ReportSummaryResponse | null>(null);

    // ── 조회 ──
    const handleQuery = async () => {
        if (!fromDate || !toDate) return;
        setIsQuerying(true);
        setError(null);
        try {
            const data = await getReportSummary(storePublicId, fromDate, toDate);
            setSummaryData(data);
        } catch (err) {
            console.error('리포트 요약 조회 실패:', err);
            setError('데이터를 불러오는데 실패했습니다. 날짜 범위를 확인해주세요.');
            setSummaryData(null);
        } finally {
            setIsQuerying(false);
        }
    };

    // ── PDF 다운로드 ──
    const handleDownload = async () => {
        if (!summaryData) return;
        setIsDownloading(true);
        setError(null);
        try {
            const blob = await generateReportPdf(storePublicId, { from: fromDate, to: toDate });
            downloadPdfBlob(blob, `report-${fromDate}-${toDate}.pdf`);
        } catch (err) {
            console.error('PDF 다운로드 실패:', err);
            setError('PDF 생성에 실패했습니다. 다시 시도해주세요.');
        } finally {
            setIsDownloading(false);
        }
    };

    // 폐기 사유 차트 데이터 변환
    const reasonChartData = summaryData?.reasonBreakdown.map((r) => ({
        name: WASTE_REASON_LABELS[r.reason] ?? r.reason,
        금액: r.wasteAmount,
        비율: r.ratio,
    })) ?? [];

    // 메뉴 TOP5 차트 데이터 변환
    const menuChartData = summaryData?.menuTop5.map((m) => ({
        menuName: m.menuName,
        totalQuantity: m.totalQuantity,
    })) ?? [];

    return (
        <div className="min-h-screen bg-slate-50 py-8 px-6">
            <div className="mx-auto max-w-7xl">

                {/* ── 헤더 & 필터 ── */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
                    <div>
                        <h1 className="text-3xl font-black tracking-tight text-slate-900">리포트 발행</h1>
                        <p className="mt-3 text-sm text-slate-500">
                            원하는 기간을 선택하고 조회한 후 PDF로 다운로드하세요.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
                        <input
                            type="date"
                            className="text-sm border-none bg-transparent focus:ring-0 text-slate-700 cursor-pointer font-medium p-0 w-[120px]"
                            value={fromDate}
                            max={today()}
                            onChange={(e) => {
                                setSummaryData(null);
                                setFromDate(e.target.value);
                            }}
                        />
                        <span className="text-slate-300">~</span>
                        <input
                            type="date"
                            className="text-sm border-none bg-transparent focus:ring-0 text-slate-700 cursor-pointer font-medium p-0 w-[120px]"
                            value={toDate}
                            max={today()}
                            onChange={(e) => {
                                setSummaryData(null);
                                setToDate(e.target.value);
                            }}
                        />
                        <div className="h-6 w-px bg-slate-200 mx-1 hidden sm:block" />
                        <button
                            onClick={handleQuery}
                            disabled={isQuerying || !fromDate || !toDate}
                            className="bg-slate-900 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-md hover:bg-slate-800 transition-all active:scale-95 disabled:opacity-50"
                        >
                            {isQuerying ? '조회 중...' : '조회'}
                        </button>
                    </div>
                </div>

                {/* ── 에러 ── */}
                {error && (
                    <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 shadow-sm">
                        <p className="text-sm font-semibold text-rose-700 flex items-center gap-2">
                            <span>⚠️</span> {error}
                        </p>
                    </div>
                )}

                {/* ── 조회 전 안내 ── */}
                {!summaryData && !isQuerying && (
                    <div className="flex flex-col items-center justify-center py-32 text-slate-400">
                        <FileText className="w-16 h-16 mb-4 opacity-20" />
                        <p className="text-base font-semibold">기간을 선택하고 조회 버튼을 눌러주세요.</p>
                    </div>
                )}

                {/* ── 데이터 영역 ── */}
                {summaryData && (
                    <>
                        {/* KPI 카드 4개 */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                            <KPICard
                                title="총 매출액"
                                value={`${formatAmount(summaryData.totalAmount)}원`}
                                icon={<ShoppingBag className="w-6 h-6 text-slate-700" />}
                            />
                            <KPICard
                                title="환불율"
                                value={`${summaryData.refundRate}%`}
                                change={{ value: summaryData.refundCount, label: `${summaryData.refundCount}건` }}
                                trend={summaryData.refundRate > 5 ? 'down' : 'up'}
                                icon={<RotateCcw className="w-6 h-6 text-slate-700" />}
                            />
                            <KPICard
                                title="총 폐기금액"
                                value={`${formatAmount(summaryData.totalWasteAmount)}원`}
                                icon={<Trash2 className="w-6 h-6 text-slate-700" />}
                            />
                            <KPICard
                                title="총 입고건수"
                                value={`${summaryData.totalInboundCount}건`}
                                icon={<PackageCheck className="w-6 h-6 text-slate-700" />}
                            />
                        </div>

                        {/* 차트 영역 */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">

                            {/* 메뉴 TOP5 */}
                            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                                <div className="mb-6">
                                    <h2 className="text-xl font-bold text-slate-900">인기 메뉴 TOP 5</h2>
                                    <p className="text-sm text-slate-500 mt-1">기간 내 가장 많이 팔린 메뉴입니다.</p>
                                </div>
                                <div className="h-[280px]">
                                    {menuChartData.length === 0 ? (
                                        <div className="h-full flex items-center justify-center text-slate-400 text-sm">데이터가 없습니다.</div>
                                    ) : (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={menuChartData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                                                <XAxis type="number" hide />
                                                <YAxis
                                                    dataKey="menuName"
                                                    type="category"
                                                    axisLine={false}
                                                    tickLine={false}
                                                    tick={{ fontSize: 12, fill: '#334155', fontWeight: 600 }}
                                                    width={90}
                                                />
                                                <Tooltip
                                                    cursor={{ fill: '#f8fafc' }}
                                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                                    formatter={(value) => typeof value === 'number' ? [`${value}개`, '판매 수량'] : ['', '']}
                                                />
                                                <Bar dataKey="totalQuantity" fill="#1e293b" radius={[0, 4, 4, 0]} barSize={20}
                                                     label={{ position: 'right', fill: '#64748b', fontSize: 12, fontWeight: 700 }}
                                                />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    )}
                                </div>
                            </div>

                            {/* 폐기 사유 분석 */}
                            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                                <div className="mb-6">
                                    <h2 className="text-xl font-bold text-slate-900">폐기 사유 분석</h2>
                                    <p className="text-sm text-slate-500 mt-1">기간 내 폐기 사유별 금액입니다.</p>
                                </div>
                                <div className="h-[280px]">
                                    {reasonChartData.length === 0 ? (
                                        <div className="h-full flex items-center justify-center text-slate-400 text-sm">데이터가 없습니다.</div>
                                    ) : (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={reasonChartData} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                                <XAxis
                                                    dataKey="name"
                                                    axisLine={false}
                                                    tickLine={false}
                                                    tick={{ fontSize: 12, fill: '#64748b' }}
                                                />
                                                <YAxis
                                                    axisLine={false}
                                                    tickLine={false}
                                                    tick={{ fontSize: 12, fill: '#64748b' }}
                                                    tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}천`}
                                                />
                                                <Tooltip
                                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                                    formatter={(value, name) => {
                                                        if (typeof value === 'number' && name === '금액') {
                                                            return [`${formatAmount(value)}원`, '폐기 금액'];
                                                        }
                                                        return [value, name];
                                                    }}
                                                />
                                                <Bar dataKey="금액" radius={[4, 4, 0, 0]} barSize={40}>
                                                    {reasonChartData.map((_, index) => (
                                                        <Cell key={`cell-${index}`} fill={REASON_COLORS[index % REASON_COLORS.length]} />
                                                    ))}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    )}
                                </div>
                                {/* 범례 */}
                                {reasonChartData.length > 0 && (
                                    <div className="mt-4 flex flex-wrap gap-3">
                                        {reasonChartData.map((r, index) => (
                                            <div key={r.name} className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
                                                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: REASON_COLORS[index % REASON_COLORS.length] }} />
                                                {r.name} ({r.비율}%)
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* PDF 다운로드 버튼 */}
                        <div className="flex justify-end">
                            <button
                                onClick={handleDownload}
                                disabled={isDownloading}
                                className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-xl text-sm font-bold shadow-md hover:bg-slate-800 transition-all active:scale-95 disabled:opacity-50"
                            >
                                <Download className="w-4 h-4" />
                                {isDownloading ? 'PDF 생성 중...' : 'PDF 다운로드'}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}