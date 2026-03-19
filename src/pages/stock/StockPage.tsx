import {useState, useEffect, useMemo} from 'react';
import {getStoreStockSummary, getIngredientBatchDetails} from "@/api/stock/stock";
import type {StockSummaryResponse, StockSearchCondition, StockBatchResponse} from "@/types/stock/stock";
import {requireStorePublicId} from "@/utils/store.ts";
import {Package, X, AlertCircle, RotateCw} from "lucide-react";
import Loading from "@/components/loading/Loading";

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
    const [searchCondition, setSearchCondition] = useState<StockSearchCondition>(condition);

    const fetchStockData = async (targetPage: number, currentCondition: StockSearchCondition) => {
        if (!storePublicId) return;
        setLoading(true);
        try {
            const response = await getStoreStockSummary(storePublicId, currentCondition, targetPage, 15);
            setItems(response.content);
            setTotalPages(response.totalPages);
            setTotalElements(response.totalElements);
            setPage(response.page);
        } catch (error) {
            console.error("재고 로드 실패:", error);
            setItems([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStockData(0, searchCondition);
    }, [storePublicId, searchCondition]);

    const handleSearch = () => {
        setSearchCondition(condition);
    };

    const handleReset = () => {
        const resetCondition = {ingredientName: '', includeZeroStock: true};
        setCondition(resetCondition);
        setSearchCondition(resetCondition);
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

    const handlePageChange = (newPage: number) => {
        fetchStockData(newPage, searchCondition);
        window.scrollTo(0, 0);
    };

    const hasData = useMemo(() => items.length > 0, [items]);

    if (loading) {
        return <Loading/>;
    }

    return (
        <div className="min-h-screen bg-gray-100">
            <div className="mx-auto w-full max-w-7xl px-6 py-8">
                {/* 상단 헤더 */}
                <div className="mb-6">
                    <h1 className="text-3xl font-black tracking-tight text-gray-900">재고 현황</h1>
                    <p className="mt-1 text-sm text-gray-500">
                        매장의 전체 재고를 확인하고 유통기한별 상세 배치를 관리합니다.
                    </p>
                </div>

                {/* 검색 조건 */}
                <div className="mb-6 border border-gray-200 bg-white p-6">
                    <div className="mb-4 flex items-center justify-between">
                        <h3 className="text-sm font-black uppercase tracking-wide text-gray-700">검색 조건</h3>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="mb-1 block text-xs font-bold text-gray-700">품목명</label>
                            <input
                                type="text"
                                placeholder="품목명으로 검색..."
                                value={condition.ingredientName}
                                onChange={(e) => setCondition(prev => ({...prev, ingredientName: e.target.value}))}
                                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="zeroStock"
                                checked={condition.includeZeroStock}
                                onChange={(e) => setCondition(prev => ({...prev, includeZeroStock: e.target.checked}))}
                                className="h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
                            />
                        </div>
                    </div>

                    <div className="mt-6 flex gap-2">
                        <button
                            onClick={handleSearch}
                            className="inline-flex items-center gap-2 rounded-md bg-gray-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-black transition-colors"
                        >
                            검색
                        </button>
                        <button
                            onClick={handleReset}
                            className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                            초기화
                        </button>
                    </div>
                </div>

                {/* 재고 목록 */}
                <div className="border border-gray-200 bg-white">
                    <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
                        <div className="mb-3 flex items-center justify-between">
                            <h3 className="text-sm font-black uppercase tracking-wide text-gray-700">재고 목록</h3>
                            <span className="text-xs font-bold text-gray-400">TOTAL {totalElements}</span>
                        </div>
                        <div
                            className="grid grid-cols-12 gap-4 text-xs font-black uppercase tracking-wide text-gray-500">
                            <div className="col-span-2">번호</div>
                            <div className="col-span-4">품목명</div>
                            <div className="col-span-2 text-right">전체 재고</div>
                            <div className="col-span-1 text-center">배치 수</div>
                            <div className="col-span-2 text-center">최단 유통기한</div>
                            <div className="col-span-1 text-right">상세</div>
                        </div>
                    </div>

                    {!hasData ? (
                        <div className="px-6 py-20 text-center">
                            <p className="text-base font-bold text-gray-500">조회된 재고가 없습니다.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-200">
                            {items.map((item, index) => (
                                <div
                                    key={item.ingredientId}
                                    className="cursor-pointer px-6 py-5 hover:bg-gray-50 transition-colors"
                                    onClick={() => handleRowClick(item)}
                                >
                                    <div className="grid grid-cols-12 items-center gap-4">
                                        <div className="col-span-2 font-mono text-xs text-gray-400">
                                            {(page * 15) + index + 1}
                                        </div>
                                        <div className="col-span-4 font-bold text-gray-900">
                                            {item.ingredientName}
                                        </div>
                                        <div className="col-span-2 text-right text-sm font-black text-gray-900">
                                            {item.totalRemainingQuantity.toLocaleString()}
                                            <span className="ml-1 text-xs font-medium text-gray-500">{item.unit}</span>
                                        </div>
                                        <div className="col-span-1 text-center">
                                            <span
                                                className="rounded bg-gray-100 px-2 py-0.5 text-[11px] font-bold text-gray-600">
                                                {item.batchCount}
                                            </span>
                                        </div>
                                        <div
                                            className={`col-span-2 text-center text-sm font-bold ${item.minExpirationDate ? 'text-red-600' : 'text-gray-300'}`}>
                                            {item.minExpirationDate || '-'}
                                        </div>
                                        <div className="col-span-1 text-right">
                                            <button
                                                className="rounded-md border border-gray-900 bg-gray-900 px-3 py-1.5 text-xs font-black text-white hover:bg-black transition-colors">
                                                상세
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* 페이지네이션 */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-center gap-2 border-t border-gray-200 px-6 py-4">
                            <button
                                onClick={() => handlePageChange(page - 1)}
                                disabled={page === 0}
                                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-30 transition-colors"
                            >
                                이전
                            </button>
                            <div className="flex items-center gap-1">
                                {Array.from({length: Math.min(totalPages, 5)}, (_, i) => {
                                    const pageNum = i;
                                    return (
                                        <button
                                            key={i}
                                            onClick={() => handlePageChange(pageNum)}
                                            className={`rounded-md px-4 py-2 text-sm font-bold transition-colors ${
                                                pageNum === page
                                                    ? "bg-gray-900 text-white"
                                                    : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                                            }`}
                                        >
                                            {pageNum + 1}
                                        </button>
                                    );
                                })}
                            </div>
                            <button
                                onClick={() => handlePageChange(page + 1)}
                                disabled={page >= totalPages - 1}
                                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-30 transition-colors"
                            >
                                다음
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* 상세 배치 모달 */}
            {selectedItem && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeBatchModal}/>
                    <div
                        className="relative w-full max-w-4xl bg-white shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
                        <div
                            className="p-6 border-b border-gray-200 flex items-center justify-between bg-white sticky top-0 z-10">
                            <div className="flex items-center gap-4">
                                <div className="p-2 bg-gray-900 rounded-md">
                                    <Package size={20} className="text-white"/>
                                </div>
                                <div>
                                    <h2 className="text-xl font-black text-gray-900">{selectedItem.ingredientName}</h2>
                                    <p className="text-xs font-bold text-gray-400 mt-0.5 uppercase">상세 배치 및 유통기한 내역</p>
                                </div>
                            </div>
                            <button onClick={closeBatchModal}
                                    className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-900 transition-colors">
                                <X size={24}/>
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
                            {batchLoading ? (
                                <div
                                    className="py-20 text-center flex flex-col items-center gap-3 text-gray-400 font-bold">
                                    <RotateCw className="animate-spin" size={32}/>
                                    데이터 로딩 중...
                                </div>
                            ) : batches.length === 0 ? (
                                <div className="py-20 text-center flex flex-col items-center gap-4 text-gray-400">
                                    <AlertCircle size={40}/>
                                    <p className="font-bold">상세 내역이 없습니다.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {batches.map((batch) => (
                                        <div key={batch.stockBatchId}
                                             className="border border-gray-200 bg-white p-5 hover:border-gray-900 transition-all group">

                                            {/* 상품명 추가 섹션 */}
                                            <div className="mb-4">
                                                <div
                                                    className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-1">
                                                    상품명
                                                </div>
                                                <div
                                                    className="text-sm font-black text-gray-900 group-hover:text-indigo-600 transition-colors">
                                                    {batch.rawProductName}
                                                </div>
                                            </div>

                                            <div className="mb-4">
                                                <div
                                                    className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">수량
                                                </div>
                                                <div className="text-lg font-black text-gray-900">
                                                    {batch.remainingQuantity.toLocaleString()} <span
                                                    className="text-xs font-medium text-gray-500">{selectedItem.unit}</span>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4 border-t border-gray-100 pt-4">
                                                <div>
                                                    <div
                                                        className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">유통기한
                                                    </div>
                                                    <div
                                                        className={`text-xs font-bold ${batch.expirationDate ? 'text-red-600' : 'text-gray-900'}`}>
                                                        {batch.expirationDate || '미지정'}
                                                    </div>
                                                </div>
                                                <div>
                                                    <div
                                                        className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">입고일
                                                    </div>
                                                    <div
                                                        className="text-xs font-bold text-gray-900">{batch.createdAt.split('T')[0]}</div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="p-4 border-t border-gray-200 bg-white text-right">
                            <button onClick={closeBatchModal}
                                    className="px-6 py-2 bg-gray-900 text-white text-sm font-black hover:bg-black transition-colors">닫기
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}