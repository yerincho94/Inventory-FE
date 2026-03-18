import React, {useState, useEffect, useCallback} from 'react';
import type {StockLogResponse, TransactionType, StockLogSearchCondition, ReferenceType} from '@/types/stock/stockLog';
import {getStockLogs} from '@/api/stock/stock.ts';
import {requireStorePublicId} from "@/utils/store.ts";
import Loading from "@/components/loading/Loading";

// --- [1. 스켈레톤 UI 컴포넌트] ---
const SkeletonRow = () => (
    <tr className="animate-pulse">
        <td className="px-6 py-4 w-40">
            <div className="h-3 bg-gray-100 rounded-full w-24"></div>
        </td>
        <td className="px-6 py-4 w-28 text-center">
            <div className="h-4 bg-gray-100 rounded-lg w-16 mx-auto"></div>
        </td>
        <td className="px-6 py-4">
            <div className="flex flex-col gap-1.5">
                <div className="h-3.5 bg-gray-100 rounded-full w-40"></div>
                <div className="h-2.5 bg-gray-100 rounded-full w-60"></div>
            </div>
        </td>
        <td className="px-6 py-4 text-right">
            <div className="h-4 bg-gray-100 rounded-full w-16 ml-auto"></div>
        </td>
        <td className="px-6 py-4 text-right">
            <div className="h-4 bg-gray-100 rounded-full w-20 ml-auto"></div>
        </td>
        <td className="px-6 py-4 w-32">
            <div className="flex items-center gap-2">
                <div className="w-5 h-5 bg-gray-100 rounded-full"></div>
                <div className="h-3 bg-gray-100 rounded-full w-16"></div>
            </div>
        </td>
    </tr>
);

const StockLogPage: React.FC = () => {
    const storePublicId = requireStorePublicId();
    type FilterType = TransactionType | 'ALL';

    // --- [상태 관리] ---
    const [loading, setLoading] = useState(false);
    const [isFirstLoaded, setIsFirstLoaded] = useState(false); // ★ '로딩 중'이 아니라 '데이터를 한 번이라도 받았는가'
    const [stockHistory, setStockHistory] = useState<StockLogResponse[]>([]);
    const [totalPages, setTotalPages] = useState(0);
    const [currentPage, setCurrentPage] = useState(0);
    const [totalElements, setTotalElements] = useState(0);

    const [searchQuery, setSearchQuery] = useState<string>('');
    const [debouncedSearch, setDebouncedSearch] = useState<string>('');
    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');
    const [typeFilter, setTypeFilter] = useState<FilterType>('ALL');

    // 검색어 디바운스
    useEffect(() => {
        const handler = setTimeout(() => setDebouncedSearch(searchQuery), 400);
        return () => clearTimeout(handler);
    }, [searchQuery]);

    // --- [API 호출 Logic] ---
    const fetchLogs = useCallback(async (page: number) => {
        if (!storePublicId) return;

        setLoading(true);
        try {
            const condition: StockLogSearchCondition = {
                ingredientName: debouncedSearch || undefined,
                type: typeFilter === 'ALL' ? undefined : typeFilter,
                startAt: startDate ? `${startDate}T00:00:00Z` : undefined,
                endAt: endDate ? `${endDate}T23:59:59Z` : undefined,
            };
            const response = await getStockLogs(storePublicId, condition, page, 50);

            if (page === 0) setStockHistory(response.content);
            else setStockHistory(prev => [...prev, ...response.content]);

            setTotalPages(response.totalPages);
            setCurrentPage(response.page);
            setTotalElements(response.totalElements);
        } catch (error) {
            console.error("데이터 로드 실패:", error);
        } finally {
            setLoading(false);
            setIsFirstLoaded(true); // ★ 데이터 호출이 한 번이라도 끝나면 true로 변경
        }
    }, [storePublicId, debouncedSearch, typeFilter, startDate, endDate]);

    useEffect(() => {
        fetchLogs(0);
    }, [fetchLogs]);

    // --- [Helper 함수들] ---
    const getReferenceLabel = (refType: ReferenceType | undefined) => {
        const labels: Record<ReferenceType, string> = {
            INBOUND: '입고',
            SALE: '판매',
            WASTE: '폐기',
            STOCK_TAKING: '실사',
            OTHER: '기타'
        };
        return refType ? labels[refType] : '일반';
    };

    const getTypeConfig = (type: TransactionType | undefined) => {
        if (!type) return {label: '기타', bg: 'bg-gray-100', text: 'text-gray-600'};
        const configs: Record<TransactionType, { label: string; bg: string; text: string }> = {
            INBOUND: {label: '입고 (+)', bg: 'bg-blue-50', text: 'text-blue-700'},
            DEDUCTION: {label: '판매 (-)', bg: 'bg-red-50', text: 'text-red-700'},
            WASTE: {label: '폐기 (-)', bg: 'bg-red-50', text: 'text-red-700'},
            ADJUST: {label: '조정 (+)', bg: 'bg-blue-50', text: 'text-blue-700'}
        };
        return configs[type];
    };

    const getChangeDisplay = (type: TransactionType | undefined, qty: number | undefined) => {
        const amount = qty || 0;
        switch (type) {
            case 'INBOUND':
            case 'ADJUST':
                return {text: `+${amount}`, color: 'text-blue-600'};
            case 'DEDUCTION':
            case 'WASTE':
                return {text: `-${amount}`, color: 'text-red-600'};
            default:
                return {text: `${amount}`, color: 'text-gray-600'};
        }
    };

    // ★ 핵심: '한 번도 데이터를 로드한 적이 없을 때만' 전체 화면 로딩을 띄움
    if (!isFirstLoaded) {
        return <Loading/>;
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <div className="mx-auto w-full max-w-6xl px-6 py-8 flex flex-col flex-1">
                {/* 헤더 */}
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="text-3xl font-black tracking-tight text-gray-900">재고 이력</h1>
                        <p className="mt-3 text-sm text-gray-500">매장에서 발생한 모든 재고 변동 내역을 시간순으로 확인하세요.</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => fetchLogs(0)}
                            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-black text-gray-800 hover:bg-gray-50 transition active:scale-95 disabled:opacity-50"
                            disabled={loading}
                        >
                            <i className={`ph ph-arrows-clockwise ${loading ? 'animate-spin' : ''}`}></i> 새로고침
                        </button>
                    </div>
                </div>

                {/* 필터 영역 */}
                <div
                    className="mt-6 flex flex-col gap-4 bg-white p-5 rounded-2xl border border-gray-200 shadow-sm md:flex-row md:items-center">
                    <div className="relative flex-1">
                        <i className={`ph ph-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${loading ? 'text-black' : 'text-gray-400'}`}></i>
                        <input
                            type="text"
                            placeholder="품목명 검색..."
                            className="w-full pl-11 pr-12 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold focus:bg-white focus:border-black outline-none transition-all shadow-inner"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        {loading && (
                            <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                <div
                                    className="w-4 h-4 border-2 border-gray-100 border-t-black rounded-full animate-spin"></div>
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-2 bg-gray-50 border border-gray-100 rounded-xl px-3">
                            <i className="ph ph-calendar text-gray-400 text-sm"></i>
                            <input type="date" className="bg-transparent text-xs font-black py-2.5 outline-none"
                                   value={startDate} onChange={(e) => setStartDate(e.target.value)}/>
                            <span className="text-gray-300">~</span>
                            <input type="date" className="bg-transparent text-xs font-black py-2.5 outline-none"
                                   value={endDate} onChange={(e) => setEndDate(e.target.value)}/>
                        </div>
                        <select
                            className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 text-xs font-black outline-none cursor-pointer focus:bg-white focus:border-black transition-all"
                            value={typeFilter}
                            onChange={(e) => setTypeFilter(e.target.value as FilterType)}
                        >
                            <option value="ALL">전체 유형</option>
                            <option value="INBOUND">입고 (+)</option>
                            <option value="DEDUCTION">판매 (-)</option>
                            <option value="WASTE">폐기 (-)</option>
                            <option value="ADJUST">조정 (+)</option>
                        </select>
                    </div>
                </div>

                {/* 리스트 영역 */}
                <div
                    className="mt-4 bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden flex flex-col relative transition-all duration-300">
                    <div
                        className={`overflow-x-auto transition-opacity duration-200 ${loading && currentPage === 0 ? 'opacity-60' : 'opacity-100'}`}>
                        <table className="w-full text-left text-[11px] border-collapse">
                            <thead className="bg-gray-50 border-b border-gray-100">
                            <tr className="text-gray-400 font-black uppercase tracking-wider">
                                <th className="px-6 py-4 w-40">날짜 / 시간</th>
                                <th className="px-6 py-4 w-28 text-center">변동 유형</th>
                                <th className="px-6 py-4">품목 및 상세 정보</th>
                                <th className="px-6 py-4 text-right">변동량</th>
                                <th className="px-6 py-4 text-right">최종 재고</th>
                                <th className="px-6 py-4 w-32">처리자</th>
                            </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                            {loading && currentPage === 0 ? (
                                <>{[...Array(5)].map((_, i) => <SkeletonRow key={i}/>)}</>
                            ) : stockHistory.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="py-20 text-center text-gray-400 font-bold">조회된 내역이
                                        없습니다.
                                    </td>
                                </tr>
                            ) : (
                                stockHistory.map((log, index) => {
                                    const config = getTypeConfig(log.type);
                                    const display = getChangeDisplay(log.type, log.changeQuantity);
                                    return (
                                        <tr key={index} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 text-gray-400 font-medium whitespace-nowrap">{log.createdAt ? new Date(log.createdAt).toLocaleString('ko-KR', {
                                                month: '2-digit',
                                                day: '2-digit',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            }) : '-'}</td>
                                            <td className="px-6 py-4 text-center"><span
                                                className={`inline-block px-2 py-0.5 rounded-lg text-[9px] font-black border ${config.bg} ${config.text} border-transparent`}>{config.label}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col gap-0.5">
                                                    <div className="flex items-center gap-2">
                                                        <span
                                                            className="font-black text-gray-900">{log.ingredientName}</span>
                                                        <span
                                                            className="px-1.5 py-0.5 bg-gray-100 text-gray-400 rounded text-[9px] font-bold border border-gray-200">{getReferenceLabel(log.referenceType)} {log.referenceId ? `#${log.referenceId}` : ''}</span>
                                                    </div>
                                                    <span
                                                        className="text-[9px] text-gray-300 font-mono tracking-tighter">BATCH: {log.batchId?.split('-')[0] || '-'}</span>
                                                </div>
                                            </td>
                                            <td className={`px-6 py-4 text-right font-black text-sm ${display.color}`}>{display.text} {log.unit}</td>
                                            <td className="px-6 py-4 text-right font-black text-gray-900">{log.balanceAfter?.toLocaleString() ?? 0} {log.unit}</td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-2">
                                                    <div
                                                        className="w-5 h-5 bg-gray-100 rounded-full flex items-center justify-center text-[9px] font-black text-gray-500 uppercase shadow-inner">{log.workerName?.substring(0, 1) || 'S'}</div>
                                                    <span
                                                        className="font-bold text-gray-700">{log.workerName || '시스템'}</span>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                            </tbody>
                        </table>
                    </div>

                    <div
                        className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between z-10">
                        <span
                            className="text-[10px] font-black text-gray-400 uppercase tracking-widest">전체 {totalElements.toLocaleString()} 이력</span>
                        {currentPage + 1 < totalPages && (
                            <button
                                className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-[10px] font-black text-gray-600 hover:bg-black hover:text-white hover:border-black transition-all flex items-center gap-2 shadow-sm disabled:opacity-50"
                                onClick={() => fetchLogs(currentPage + 1)}
                                disabled={loading}
                            >
                                {loading ? (
                                    <>
                                        <div
                                            className="w-3 h-3 border-2 border-gray-100 border-t-black rounded-full animate-spin"></div>
                                        불러오는 중...</>
                                ) : (
                                    <><i className="ph ph-plus-circle"></i> 이전 기록 더보기</>
                                )}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StockLogPage;