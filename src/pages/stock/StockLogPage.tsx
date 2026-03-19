import React, {useState, useEffect, useCallback} from 'react';
import type {StockLogResponse, TransactionType, StockLogSearchCondition, ReferenceType} from '@/types/stock/stockLog';
import {getStockLogs} from '@/api/stock/stock.ts';
import {requireStorePublicId} from "@/utils/store.ts";
import Loading from "@/components/loading/Loading";

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

    type FilterType = ReferenceType | 'STOCK_TAKING_PLUS' | 'STOCK_TAKING_MINUS' | 'ALL';

    const [loading, setLoading] = useState(false);
    const [stockHistory, setStockHistory] = useState<StockLogResponse[] | null>(null);
    const [totalPages, setTotalPages] = useState(0);
    const [currentPage, setCurrentPage] = useState(0);
    const [totalElements, setTotalElements] = useState(0);

    // 사용자의 실시간 입력 상태
    const [filter, setFilter] = useState({
        searchQuery: '',
        startDate: '',
        endDate: '',
        typeFilter: 'ALL' as FilterType
    });

    // 실제 API 호출에 사용될 디바운스된 상태
    const [debouncedFilter, setDebouncedFilter] = useState(filter);

    // --- [디바운싱 로직] ---
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedFilter(filter);
        }, 400); // 0.4초 대기

        return () => clearTimeout(handler);
    }, [filter]);

    // --- [API 호출 Logic] ---
    const fetchLogs = useCallback(async (page: number, isNewSearch: boolean = false) => {
        if (!storePublicId) return;

        setLoading(true);
        try {
            const condition: StockLogSearchCondition = {
                ingredientName: debouncedFilter.searchQuery || undefined,
                // ✅ 백엔드 규격에 맞춰 Z 포맷팅 적용
                startDate: debouncedFilter.startDate ? `${debouncedFilter.startDate}T00:00:00Z` : undefined,
                endDate: debouncedFilter.endDate ? `${debouncedFilter.endDate}T23:59:59Z` : undefined,
            };

            if (debouncedFilter.typeFilter === 'STOCK_TAKING_PLUS') {
                condition.refType = 'STOCK_TAKING';
                condition.transactionType = 'INBOUND';
            } else if (debouncedFilter.typeFilter === 'STOCK_TAKING_MINUS') {
                condition.refType = 'STOCK_TAKING';
                condition.transactionType = 'DEDUCTION';
            } else if (debouncedFilter.typeFilter !== 'ALL') {
                condition.refType = debouncedFilter.typeFilter as ReferenceType;
            }

            const response = await getStockLogs(storePublicId, condition, page, 50);

            // 새 검색(필터 변경)일 때는 데이터를 갈아치우고, '더보기'일 때는 누적함
            setStockHistory(prev => (isNewSearch ? response.content : [...(prev || []), ...response.content]));
            setTotalPages(response.totalPages);
            setCurrentPage(response.page);
            setTotalElements(response.totalElements);
        } catch (error) {
            console.error("데이터 로드 실패:", error);
            setStockHistory([]);
        } finally {
            setLoading(false);
        }
    }, [storePublicId, debouncedFilter]);

    // 디바운스된 필터가 바뀔 때만 0페이지부터 다시 로드
    useEffect(() => {
        fetchLogs(0, true);
    }, [fetchLogs]);

    // --- [Helper 함수들] ---
    const getReferenceLabel = (refType: ReferenceType | undefined) => {
        const labels: Record<ReferenceType, string> = {
            INBOUND: '입고', SALE: '판매', WASTE: '폐기', STOCK_TAKING: '실사', OTHER: '기타'
        };
        return refType ? labels[refType] : '일반';
    };

    const getTypeConfig = (type: TransactionType | undefined, refType?: ReferenceType) => {
        if (!type) return {label: '기타', bg: 'bg-gray-100', text: 'text-gray-600'};
        if (refType === 'STOCK_TAKING') {
            return (type === 'INBOUND' || type === 'ADJUST')
                ? {label: '조정 (+)', bg: 'bg-indigo-50', text: 'text-indigo-700'}
                : {label: '조정 (-)', bg: 'bg-amber-50', text: 'text-amber-700'};
        }
        const configs: Record<string, { label: string; bg: string; text: string }> = {
            INBOUND: {label: '입고 (+)', bg: 'bg-blue-50', text: 'text-blue-700'},
            SALE: {label: '판매 (-)', bg: 'bg-red-50', text: 'text-red-700'},
            WASTE: {label: '폐기 (-)', bg: 'bg-rose-50', text: 'text-rose-700'},
        };
        return configs[refType || ''] || configs[type] || {label: '기타', bg: 'bg-gray-100', text: 'text-gray-600'};
    };

    const getChangeDisplay = (type: TransactionType | undefined, qty: number | undefined) => {
        const amount = (qty || 0).toLocaleString(undefined, {maximumFractionDigits: 3});
        return (type === 'INBOUND' || type === 'ADJUST')
            ? {text: `+${amount}`, color: 'text-blue-600'}
            : {text: `-${amount}`, color: 'text-red-600'};
    };

    if (loading && !stockHistory) return <Loading/>;

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <div className="mx-auto w-full max-w-6xl px-6 py-8 flex flex-col flex-1">
                {/* 헤더 */}
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="text-3xl font-black tracking-tight text-gray-900">재고 이력</h1>
                        <p className="mt-3 text-sm text-gray-500 font-medium">재고의 원인별 변동 내역을 실시간으로 확인합니다.</p>
                    </div>
                    <button onClick={() => fetchLogs(0, true)}
                            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-black text-gray-800 hover:bg-gray-50 transition active:scale-95 shadow-sm"
                            disabled={loading}>
                        <i className={`ph ph-arrows-clockwise ${loading ? 'animate-spin' : ''}`}></i> 새로고침
                    </button>
                </div>

                {/* 필터 영역 */}
                <div
                    className="mt-6 flex flex-col gap-4 bg-white p-5 rounded-2xl border border-gray-200 shadow-sm md:flex-row md:items-center">
                    <div className="relative flex-1">
                        <i className="ph ph-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
                        <input type="text" placeholder="품목명 검색..."
                               className="w-full pl-11 pr-12 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold focus:bg-white focus:border-black outline-none transition-all shadow-inner"
                               value={filter.searchQuery}
                               onChange={(e) => setFilter(prev => ({...prev, searchQuery: e.target.value}))}/>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-2 bg-gray-50 border border-gray-100 rounded-xl px-3">
                            <input type="date" className="bg-transparent text-xs font-black py-2.5 outline-none"
                                   value={filter.startDate}
                                   onChange={(e) => setFilter(prev => ({...prev, startDate: e.target.value}))}/>
                            <span className="text-gray-300">~</span>
                            <input type="date" className="bg-transparent text-xs font-black py-2.5 outline-none"
                                   value={filter.endDate}
                                   onChange={(e) => setFilter(prev => ({...prev, endDate: e.target.value}))}/>
                        </div>
                        <select
                            className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 text-xs font-black outline-none cursor-pointer focus:bg-white transition-all shadow-sm"
                            value={filter.typeFilter}
                            onChange={(e) => setFilter(prev => ({...prev, typeFilter: e.target.value as FilterType}))}
                        >
                            <option value="ALL">전체</option>
                            <option value="INBOUND">입고 (+)</option>
                            <option value="SALE">판매 (-)</option>
                            <option value="WASTE">폐기 (-)</option>
                            <option value="STOCK_TAKING_PLUS">재고 조정 (+)</option>
                            <option value="STOCK_TAKING_MINUS">재고 조정 (-)</option>
                        </select>
                    </div>
                </div>

                {/* 리스트 영역 */}
                <div
                    className="mt-4 bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden flex flex-col relative">
                    {loading && <div className="absolute top-0 left-0 w-full h-0.5 bg-gray-100 overflow-hidden z-20">
                        <div className="h-full bg-black animate-[loading_1.5s_infinite_linear] w-1/3"></div>
                    </div>}
                    <div className="overflow-x-auto">
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
                                <>{[...Array(10)].map((_, i) => <SkeletonRow key={i}/>)}</>
                            ) : (stockHistory?.length === 0) ? (
                                <tr>
                                    <td colSpan={6} className="py-20 text-center text-gray-400 font-bold">조회된 내역이
                                        없습니다.
                                    </td>
                                </tr>
                            ) : (
                                stockHistory?.map((log, index) => {
                                    const config = getTypeConfig(log.type, log.referenceType);
                                    const display = getChangeDisplay(log.type, log.changeQuantity);
                                    return (
                                        <tr key={index} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 text-gray-400 font-medium whitespace-nowrap">
                                                {log.createdAt ? new Date(log.createdAt).toLocaleString('ko-KR', {
                                                    month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
                                                }) : '-'}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span
                                                    className={`inline-block px-2 py-0.5 rounded-lg text-[9px] font-black border ${config.bg} ${config.text}`}>
                                                    {config.label}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <span
                                                        className="font-black text-gray-900">{log.ingredientName}</span>
                                                    <span
                                                        className="px-1.5 py-0.5 bg-gray-100 text-gray-400 rounded text-[9px] font-bold border border-gray-200">
                                                        {getReferenceLabel(log.referenceType)} {log.referenceId ? `#${log.referenceId}` : ''}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className={`px-6 py-4 text-right font-black text-sm ${display.color}`}>{display.text} {log.unit}</td>
                                            <td className="px-6 py-4 text-right font-black text-gray-900">{log.balanceAfter?.toLocaleString(undefined, {maximumFractionDigits: 3})} {log.unit}</td>
                                            <td className="px-6 py-4 font-bold text-gray-700">{log.workerName || '시스템'}</td>
                                        </tr>
                                    );
                                })
                            )}
                            </tbody>
                        </table>
                    </div>

                    <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                전체 {totalElements.toLocaleString()}개 중 {stockHistory?.length || 0}개 표시
                            </span>
                        </div>
                        {currentPage + 1 < totalPages && (
                            <button
                                className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-[10px] font-black text-gray-800 hover:bg-black hover:text-white transition-all flex items-center gap-2 shadow-sm active:scale-95"
                                onClick={() => fetchLogs(currentPage + 1)}
                                disabled={loading}
                            >
                                {loading ? <div
                                    className="w-3 h-3 border-2 border-gray-100 border-t-black rounded-full animate-spin"></div> : <>
                                    <i className="ph ph-plus-circle"></i> 이전 기록 더보기</>}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StockLogPage;