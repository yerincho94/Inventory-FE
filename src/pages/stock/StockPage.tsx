import {useState, useEffect} from 'react';
import {getStoreStockSummary, getIngredientBatchDetails} from "@/api/stock/stock";
import type {StockSummaryResponse, StockSearchCondition, StockBatchResponse} from "@/types/stock/stock";
import {requireStorePublicId} from "@/utils/store.ts";

import {
    Search,
    RotateCw,
    ChevronLeft,
    ChevronRight,
    X,
    Package,
    Calendar,
    AlertCircle
} from "lucide-react";

export default function StockPage() {
    const storePublicId = requireStorePublicId();

    const [items, setItems] = useState<StockSummaryResponse[]>([]);
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [totalElements, setTotalElements] = useState(0);
    const [loading, setLoading] = useState(false);

    const [selectedItem, setSelectedItem] = useState<StockSummaryResponse | null>(null);
    const [batches, setBatches] = useState<StockBatchResponse[]>([]);
    const [batchLoading, setBatchLoading] = useState(false);

    const [condition, setCondition] = useState<StockSearchCondition>({
        ingredientName: '',
        includeZeroStock: true
    });

    const fetchStockData = async (targetPage: number) => {
        if (!storePublicId) return;
        setLoading(true);
        try {
            const response = await getStoreStockSummary(storePublicId, condition, targetPage, 15);
            setItems(response.content);
            setTotalPages(response.totalPages);
            setTotalElements(response.totalElements);
            setPage(response.page);
        } catch (error) {
            console.error("재고 로드 실패:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleRowClick = async (item: StockSummaryResponse) => {
        setSelectedItem(item);
        setBatchLoading(true);
        try {
            const data = await getIngredientBatchDetails(storePublicId, item.ingredientId);
            setBatches(data);
        } catch (error) {
            setBatches([]);
        } finally {
            setBatchLoading(false);
        }
    };

    const closeBatchModal = () => {
        setSelectedItem(null);
        setBatches([]);
    };

    useEffect(() => {
        fetchStockData(0);
        setSelectedItem(null);
    }, [condition.ingredientName, condition.includeZeroStock, storePublicId]);

    const handlePageChange = (newPage: number) => {
        if (newPage >= 0 && newPage < totalPages) {
            fetchStockData(newPage);
            setSelectedItem(null);
            window.scrollTo(0, 0);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="mx-auto w-full max-w-6xl px-6 py-8">
                {/* 상단 헤더 */}
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="text-3xl font-black tracking-tight text-gray-900">재고 현황</h1>
                        <p className="mt-3 text-sm text-gray-500">
                            매장의 전체 재고를 확인하고 유통기한별 상세 배치를 관리하세요.
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => fetchStockData(page)}
                            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-black text-gray-800 hover:bg-gray-50 transition-colors"
                        >
                            <RotateCw size={18}/>
                            새로고침
                        </button>
                    </div>
                </div>

                {/* 검색 및 필터 바 */}
                <div className="mt-6 flex flex-col gap-4 md:flex-row md:items-center">
                    <div className="relative flex-1">
                        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"/>
                        <input
                            type="text"
                            placeholder="품목명으로 검색..."
                            className="w-full pl-11 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-bold focus:border-black outline-none transition-all shadow-sm"
                            onChange={(e) => setCondition(prev => ({...prev, ingredientName: e.target.value}))}
                        />
                    </div>
                    <button
                        onClick={() => setCondition(prev => ({...prev, includeZeroStock: !prev.includeZeroStock}))}
                        className={`rounded-xl px-4 py-2.5 text-xs font-black border transition-all ${condition.includeZeroStock
                            ? "border-black bg-black text-white"
                            : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                        }`}
                    >
                        품절 포함 {condition.includeZeroStock ? 'ON' : 'OFF'}
                    </button>
                </div>

                {/* 메인 리스트 */}
                <div className="mt-4 space-y-3">
                    {loading ? (
                        <div
                            className="rounded-2xl border border-gray-200 bg-white p-10 text-center text-gray-400 font-bold animate-pulse">
                            데이터 로드 중...
                        </div>
                    ) : items.length === 0 ? (
                        <div
                            className="rounded-2xl border border-gray-200 bg-white p-10 text-center text-gray-400 font-bold">
                            재고 데이터가 없습니다.
                        </div>
                    ) : (
                        items.map((item) => (
                            <div
                                key={item.ingredientId}
                                onClick={() => handleRowClick(item)}
                                className={`cursor-pointer rounded-2xl border p-5 transition-all bg-white hover:border-black hover:shadow-md group`}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                            <div
                                                className="text-sm font-black text-gray-900 group-hover:text-black">{item.ingredientName}</div>
                                            <span
                                                className="px-2 py-0.5 rounded-lg text-[10px] font-black bg-gray-100 text-gray-600 border border-gray-200">
                                                품목 {item.batchCount} 개
                                            </span>
                                        </div>
                                        <div className="mt-1 text-xs text-gray-500">
                                            ID: <span
                                            className="font-mono">{item.ingredientId.substring(0, 8)}...</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-8">
                                        <div className="text-right">
                                            <div className="text-[10px] font-black text-gray-400 uppercase">전체 재고</div>
                                            <div className="text-sm font-black text-gray-900">
                                                {item.totalRemainingQuantity.toLocaleString()} <span
                                                className="text-[10px] text-gray-500 font-medium">{item.unit}</span>
                                            </div>
                                        </div>
                                        <div className="text-right min-w-[100px]">
                                            <div className="text-[10px] font-black text-gray-400 uppercase">유통기한</div>
                                            <div
                                                className={`text-sm font-black ${item.minExpirationDate ? 'text-red-600' : 'text-gray-300'}`}>
                                                {item.minExpirationDate || '-'}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* 페이지네이션 */}
                <div className="mt-6 flex items-center justify-between">
                    <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                        PAGE {page + 1} OF {totalPages} · TOTAL {totalElements}
                    </div>
                    <div className="flex gap-2">
                        <button
                            disabled={page === 0}
                            onClick={() => handlePageChange(page - 1)}
                            className="w-10 h-10 flex items-center justify-center rounded-xl border border-gray-200 bg-white disabled:opacity-30 hover:bg-gray-50 transition-all shadow-sm"
                        >
                            <ChevronLeft size={18}/>
                        </button>
                        <button
                            disabled={page === totalPages - 1}
                            onClick={() => handlePageChange(page + 1)}
                            className="w-10 h-10 flex items-center justify-center rounded-xl border border-gray-200 bg-white disabled:opacity-30 hover:bg-gray-50 transition-all shadow-sm"
                        >
                            <ChevronRight size={18}/>
                        </button>
                    </div>
                </div>
            </div>

            {/* --- 상세 배치 현황: 중앙 모달 팝업 --- */}
            {selectedItem && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={closeBatchModal}/>

                    <div
                        className="relative w-full max-w-4xl bg-white rounded-[32px] shadow-2xl flex flex-col max-h-[85vh] overflow-hidden animate-in fade-in zoom-in-95 duration-300">
                        {/* 모달 헤더 */}
                        <div
                            className="p-8 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-gray-100 rounded-2xl">
                                    <Package size={24} className="text-black"/>
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span
                                            className="px-2 py-0.5 rounded-lg bg-black text-white text-[10px] font-black uppercase tracking-widest">Stock Detail</span>
                                        <h2 className="text-xl font-black text-gray-900">{selectedItem.ingredientName}</h2>
                                    </div>
                                    <p className="text-xs font-bold text-gray-400 mt-1 uppercase tracking-tighter">보유 중인
                                        모든 유통기한별 상세 내역입니다.</p>
                                </div>
                            </div>
                            <button onClick={closeBatchModal}
                                    className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-900">
                                <X size={24}/>
                            </button>
                        </div>

                        {/* 모달 바디 */}
                        <div className="flex-1 overflow-y-auto p-8 bg-gray-50/50">
                            {batchLoading ? (
                                <div
                                    className="py-20 text-center flex flex-col items-center gap-3 font-black text-gray-300">
                                    <RotateCw className="animate-spin" size={32}/>
                                    로딩 중...
                                </div>
                            ) : batches.length === 0 ? (
                                <div className="py-20 text-center flex flex-col items-center gap-4">
                                    <AlertCircle size={48} className="text-gray-200"/>
                                    <div className="text-gray-400 font-bold uppercase tracking-widest">상세 내역이 없습니다.
                                    </div>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {batches.map((batch) => (
                                        <div key={batch.stockBatchId}
                                             className="rounded-2xl border border-gray-200 bg-white p-6 transition-all hover:border-black hover:shadow-lg">
                                            <div className="flex justify-between items-start">
                                                <div className="space-y-4">
                                                    <div>
                                                        <div
                                                            className="flex items-center gap-1.5 text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
                                                            <Calendar size={12}/> 유통기한
                                                        </div>
                                                        <div
                                                            className={`text-base font-black ${new Date(batch.expirationDate) < new Date() ? 'text-red-500' : 'text-gray-900'}`}>
                                                            {batch.expirationDate}
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <div
                                                            className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">원부재료명
                                                        </div>
                                                        <div
                                                            className="text-[11px] text-gray-500 font-bold leading-relaxed">{batch.rawProductName}</div>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div
                                                        className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">현재
                                                        재고
                                                    </div>
                                                    <div className="text-2xl font-black text-indigo-600">
                                                        {batch.remainingQuantity.toLocaleString()}
                                                        <span
                                                            className="text-xs text-gray-400 ml-1 font-black">{selectedItem.unit}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="p-6 border-t border-gray-100 bg-white flex justify-end">
                            <button onClick={closeBatchModal}
                                    className="px-6 py-3 bg-black text-white text-sm font-black rounded-xl hover:bg-gray-800 transition-all active:scale-95 shadow-lg shadow-black/10">
                                확인 완료
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}