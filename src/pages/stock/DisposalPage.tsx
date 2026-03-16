import {useState, useEffect, useCallback, useRef} from "react";
import {
    getStoreStockSummary,
    getIngredientBatchDetails,
    getWasteRecords,
    recordWaste
} from "@/api/stock/stock";
import type {StockSummaryResponse, StockBatchResponse} from "@/types/stock/stock";
import type {DisposalResponse, DisposalSearchCondition, DisposalReason, DisposalItem} from "@/types/stock/disposal";
import type {PageResponse} from "@/types/common/common.ts";
import {requireStorePublicId} from "@/utils/store.ts";
import {
    Plus, Search, Trash2, X, ChevronRight,
    ChevronLeft, Calendar, Package, AlertCircle,
    ArrowLeft
} from "lucide-react";
import Loading from "@/components/loading/Loading";

const REASON_MAP: Record<DisposalReason, { label: string }> = {
    EXPIRED: {label: "유통기한 경과"},
    SPOILED: {label: "부패 및 변질"},
    DAMAGED: {label: "포장 파손"},
    OTHER: {label: "기타 사유"},
};

export default function DisposalPage() {
    const storePublicId = requireStorePublicId();

    const [mainData, setMainData] = useState<PageResponse<DisposalResponse> | null>(null);
    const [mainPage, setMainPage] = useState(0);
    const [isMainLoading, setIsMainLoading] = useState(false);
    const [mainCondition, setMainCondition] = useState<DisposalSearchCondition>({
        ingredientName: "",
        reason: undefined,
    });

    const [isMainModalOpen, setIsMainModalOpen] = useState(false);
    const [isStockModalOpen, setIsStockModalOpen] = useState(false);
    const [activeItemIndex, setActiveItemIndex] = useState<number | null>(null);

    type FormItem = DisposalItem & { ingredientName?: string };
    const [items, setItems] = useState<FormItem[]>([
        {stockBatchId: "", quantity: 0, reason: "EXPIRED", wasteDate: new Date().toISOString(), ingredientName: ""},
    ]);

    const [stockSearchTerm, setStockSearchTerm] = useState("");
    const [summaryItems, setSummaryItems] = useState<StockSummaryResponse[]>([]);
    const [summaryPage, setSummaryPage] = useState(0);
    const [hasMoreSummary, setHasMoreSummary] = useState(true);
    const [isSummaryLoading, setIsSummaryLoading] = useState(false);

    const [selectedIngredient, setSelectedIngredient] = useState<StockSummaryResponse | null>(null);
    const [batchItems, setBatchItems] = useState<StockBatchResponse[]>([]);
    const [isBatchLoading, setIsBatchLoading] = useState(false); // isBatchLoading 확인

    const fetchMainRecords = async () => {
        setIsMainLoading(true);
        try {
            const res = await getWasteRecords(storePublicId, mainCondition, mainPage, 15);
            setMainData(res);
        } catch (error) {
            console.error("내역 조회 실패:", error);
        } finally {
            setIsMainLoading(false);
        }
    };

    const fetchStockSummaries = useCallback(async (isInitial: boolean) => {
        setIsSummaryLoading(true);
        try {
            const pageToFetch = isInitial ? 0 : summaryPage;
            const res = await getStoreStockSummary(storePublicId, {
                ingredientName: stockSearchTerm,
                includeZeroStock: false
            }, pageToFetch, 10);
            setSummaryItems(prev => isInitial ? res.content : [...prev, ...res.content]);
            setHasMoreSummary(res.hasNext);
        } catch (error) {
            console.error("재고 검색 실패:", error);
        } finally {
            setIsSummaryLoading(false);
        }
    }, [storePublicId, stockSearchTerm, summaryPage]);

    const fetchBatches = async (ingredient: StockSummaryResponse) => {
        setSelectedIngredient(ingredient);
        setIsBatchLoading(true);
        try {
            const res = await getIngredientBatchDetails(storePublicId, ingredient.ingredientId);
            setBatchItems(res);
        } finally {
            setIsBatchLoading(false);
        }
    };

    useEffect(() => {
        fetchMainRecords();
    }, [mainPage, mainCondition, storePublicId]);

    const observer = useRef<IntersectionObserver | null>(null);
    const lastItemRef = useCallback((node: HTMLDivElement) => {
        if (isSummaryLoading) return;
        if (observer.current) observer.current.disconnect();
        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && hasMoreSummary) setSummaryPage(prev => prev + 1);
        });
        if (node) observer.current.observe(node);
    }, [isSummaryLoading, hasMoreSummary]);

    useEffect(() => {
        if (isStockModalOpen) {
            setSummaryPage(0);
            fetchStockSummaries(true);
        }
    }, [stockSearchTerm, isStockModalOpen, fetchStockSummaries]);

    useEffect(() => {
        if (summaryPage > 0) fetchStockSummaries(false);
    }, [summaryPage, fetchStockSummaries]);

    const handleRecordWaste = async () => {
        if (!items.every(i => i.stockBatchId && i.quantity > 0)) {
            alert("품목과 수량을 모두 확인해주세요.");
            return;
        }
        try {
            await recordWaste(storePublicId, {items: items.map(({ingredientName, ...rest}) => rest)});
            setIsMainModalOpen(false);
            setItems([{
                stockBatchId: "",
                quantity: 0,
                reason: "EXPIRED",
                wasteDate: new Date().toISOString(),
                ingredientName: ""
            }]);
            fetchMainRecords();
        } catch (error) {
            alert("등록 실패");
        }
    };

    const updateItem = (index: number, field: keyof FormItem, value: any) => {
        const newItems = [...items];
        newItems[index] = {...newItems[index], [field]: value};
        setItems(newItems);
    };

    const closeStockModal = () => {
        setIsStockModalOpen(false);
        setStockSearchTerm("");
        setSelectedIngredient(null);
        setBatchItems([]);
    };

    const handleSelectBatch = (batch: StockBatchResponse, ingredientName: string) => {
        if (activeItemIndex !== null) {
            const newItems = [...items];
            newItems[activeItemIndex] = {
                ...newItems[activeItemIndex],
                stockBatchId: batch.stockBatchId.toString(),
                ingredientName: `${ingredientName} (${batch.expirationDate})`,
            };
            setItems(newItems);
            closeStockModal();
        }
    };

    return (
        <div className="min-h-screen bg-[#F8F9FB]">
            <div className="mx-auto w-full max-w-7xl px-6 py-10">
                <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 text-indigo-600 font-bold text-sm">
                            <Package className="h-4 w-4"/>
                            <span>Stock Management</span>
                        </div>
                        <h1 className="text-4xl font-black tracking-tight text-gray-900">폐기 관리</h1>
                    </div>
                    <button
                        onClick={() => setIsMainModalOpen(true)}
                        className="inline-flex items-center gap-2 rounded-2xl bg-black px-6 py-4 text-sm font-black text-white hover:bg-gray-800 transition-all shadow-lg active:scale-95"
                    >
                        <Plus className="h-5 w-5"/> 새 폐기 등록
                    </button>
                </div>

                <div className="mb-6 flex items-center gap-4">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5"/>
                        <input
                            type="text"
                            placeholder="품목명을 입력하여 검색하세요"
                            className="w-full pl-12 pr-4 py-3.5 bg-white border border-gray-100 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-black/5 outline-none transition-all shadow-sm"
                            onChange={(e) => setMainCondition(prev => ({...prev, ingredientName: e.target.value}))}
                        />
                    </div>
                </div>

                <div className="bg-white border border-gray-100 rounded-[32px] shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-[13px]">
                            <thead className="bg-gray-50/50 border-b border-gray-50">
                            <tr className="text-gray-400 font-black uppercase tracking-widest">
                                <th className="px-8 py-5">처리일자</th>
                                <th className="px-8 py-5">품목 정보</th>
                                <th className="px-8 py-5 text-right">수량</th>
                                <th className="px-8 py-5 text-right">손실액</th>
                                <th className="px-8 py-5 text-center">사유</th>
                            </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                            {isMainLoading ? (
                                <tr>
                                    <td colSpan={5} className="py-32 text-center"><Loading/></td>
                                </tr>
                            ) : mainData?.content.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="py-24 text-center">
                                        <div className="flex flex-col items-center gap-3 text-gray-300">
                                            <AlertCircle className="h-12 w-12 opacity-20"/>
                                            <p className="font-bold">조회된 폐기 내역이 없습니다.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                mainData?.content.map((item) => (
                                    <tr key={item.wastePublicId} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-8 py-6 text-gray-400 font-bold">{new Date(item.wasteAt).toLocaleDateString()}</td>
                                        <td className="px-8 py-6 font-black text-gray-900">{item.ingredientName}</td>
                                        <td className="px-8 py-6 text-right font-black text-gray-600">{item.quantity} EA</td>
                                        <td className="px-8 py-6 text-right font-black text-red-500">-
                                            ₩{item.amount.toLocaleString()}</td>
                                        <td className="px-8 py-6 text-center">
                                                <span
                                                    className="px-3 py-1 rounded-full text-[10px] font-black bg-white border border-gray-200 text-gray-500 shadow-sm">
                                                    {REASON_MAP[item.reason]?.label}
                                                </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                            </tbody>
                        </table>
                    </div>
                    {/* 페이지네이션 */}
                    <div className="px-8 py-6 bg-gray-50/30 border-t border-gray-50 flex items-center justify-between">
                        <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest">
                            Page {mainPage + 1} of {mainData?.totalPages || 1}
                        </span>
                        <div className="flex gap-2">
                            <button
                                disabled={mainPage === 0}
                                onClick={() => setMainPage(p => p - 1)}
                                className="w-10 h-10 flex items-center justify-center rounded-xl border border-gray-200 bg-white disabled:opacity-30 hover:bg-gray-50"
                            >
                                <ChevronLeft className="h-5 w-5"/>
                            </button>
                            <button
                                disabled={!mainData?.hasNext}
                                onClick={() => setMainPage(p => p + 1)}
                                className="w-10 h-10 flex items-center justify-center rounded-xl border border-gray-200 bg-white disabled:opacity-30 hover:bg-gray-50"
                            >
                                <ChevronRight className="h-5 w-5"/>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* [메인 중앙 팝업 모달] */}
            {isMainModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-md"
                         onClick={() => setIsMainModalOpen(false)}/>
                    <div
                        className="relative bg-white w-full max-w-2xl rounded-[32px] shadow-2xl flex flex-col h-[80vh] animate-in fade-in zoom-in-95 duration-300 overflow-hidden">
                        <div className="p-8 border-b flex justify-between items-center bg-white sticky top-0 z-10">
                            <div>
                                <h2 className="text-2xl font-black text-gray-900">새 폐기 등록</h2>
                                <p className="text-sm font-bold text-gray-400 mt-1">폐기 처리할 품목 리스트를 작성하세요.</p>
                            </div>
                            <button onClick={() => setIsMainModalOpen(false)}
                                    className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400">
                                <X className="h-6 w-6"/>
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-[#F8F9FB]">
                            {items.map((item, index) => (
                                <div key={index}
                                     className="p-6 bg-white border border-gray-100 rounded-[24px] shadow-sm relative space-y-5">
                                    <button onClick={() => setItems(items.filter((_, i) => i !== index))}
                                            className="absolute top-6 right-6 text-gray-300 hover:text-red-500 p-1">
                                        <Trash2 className="h-5 w-5"/>
                                    </button>

                                    <div className="space-y-2">
                                        <label
                                            className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">품목
                                            선택</label>
                                        <div onClick={() => {
                                            setActiveItemIndex(index);
                                            setIsStockModalOpen(true);
                                        }}
                                             className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl flex justify-between items-center cursor-pointer hover:border-black transition-all group">
                                            <span
                                                className={item.ingredientName ? "text-gray-900 font-black" : "text-gray-400 font-bold"}>
                                                {item.ingredientName || "재고 품목을 선택해주세요"}
                                            </span>
                                            <Search className="h-5 w-5 text-gray-300 group-hover:text-black"/>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label
                                                className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">폐기
                                                수량</label>
                                            <input type="number" placeholder="0"
                                                   className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-black focus:bg-white outline-none"
                                                   onChange={(e) => updateItem(index, 'quantity', Number(e.target.value))}/>
                                        </div>
                                        <div className="space-y-2">
                                            <label
                                                className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">폐기
                                                사유</label>
                                            <select
                                                className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-black appearance-none outline-none"
                                                onChange={(e) => updateItem(index, 'reason', e.target.value as DisposalReason)}>
                                                {Object.entries(REASON_MAP).map(([key, val]) => <option key={key}
                                                                                                        value={key}>{val.label}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            <button onClick={() => setItems([...items, {
                                stockBatchId: "",
                                quantity: 0,
                                reason: "EXPIRED",
                                wasteDate: new Date().toISOString(),
                                ingredientName: ""
                            }])}
                                    className="w-full py-5 border-2 border-dashed border-gray-200 rounded-[24px] text-gray-400 text-sm font-black hover:border-black hover:text-black transition-all flex items-center justify-center gap-2 group">
                                <Plus className="h-5 w-5 group-hover:scale-110"/> 항목 추가하기
                            </button>
                        </div>

                        <div className="p-8 border-t bg-white flex gap-4">
                            <button onClick={() => setIsMainModalOpen(false)}
                                    className="flex-1 py-4 bg-gray-100 rounded-2xl text-[13px] font-black text-gray-500">닫기
                            </button>
                            <button onClick={handleRecordWaste}
                                    className="flex-[2] py-4 bg-black text-white rounded-2xl text-[13px] font-black shadow-xl active:scale-95 transition-all">등록
                                완료
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* [서브 재고 검색 팝업] */}
            {isStockModalOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={closeStockModal}/>
                    <div
                        className="relative bg-white w-full max-w-lg rounded-[32px] shadow-2xl flex flex-col h-[600px] overflow-hidden animate-in fade-in zoom-in-95 duration-300">
                        <div className="p-8 border-b bg-white">
                            <div className="flex items-center gap-4">
                                {selectedIngredient && (
                                    <button onClick={() => setSelectedIngredient(null)}
                                            className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                                        <ArrowLeft className="h-6 w-6"/>
                                    </button>
                                )}
                                <h3 className="text-2xl font-black text-gray-900">{selectedIngredient ? "입고 날짜 선택" : "재고 품목 검색"}</h3>
                            </div>
                            {!selectedIngredient && (
                                <div className="relative mt-6">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 h-5 w-5"/>
                                    <input type="text" placeholder="어떤 재료를 찾으시나요?"
                                           className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-black outline-none focus:bg-white transition-all shadow-inner"
                                           value={stockSearchTerm} onChange={(e) => setStockSearchTerm(e.target.value)}
                                           autoFocus/>
                                </div>
                            )}
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 space-y-3 bg-[#F8F9FB]/50">
                            {!selectedIngredient ? (
                                summaryItems.map((item, idx) => (
                                    <div key={item.ingredientId}
                                         ref={summaryItems.length === idx + 1 ? lastItemRef : null}
                                         onClick={() => fetchBatches(item)}
                                         className="p-5 bg-white border border-gray-100 rounded-[20px] hover:border-black cursor-pointer flex justify-between items-center group transition-all shadow-sm">
                                        <div className="flex items-center gap-4">
                                            <div
                                                className="h-10 w-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                                                <Package className="h-5 w-5"/></div>
                                            <div>
                                                <div className="font-black text-gray-900">{item.ingredientName}</div>
                                                <div
                                                    className="text-[10px] text-gray-400 mt-0.5 font-bold uppercase tracking-tight">총
                                                    재고 {item.totalRemainingQuantity}{item.unit} · {item.batchCount}개의 배치
                                                </div>
                                            </div>
                                        </div>
                                        <ChevronRight className="h-5 w-5 text-gray-200 group-hover:text-black"/>
                                    </div>
                                ))
                            ) : (
                                batchItems.map((batch) => (
                                    <div key={batch.stockBatchId}
                                         onClick={() => handleSelectBatch(batch, selectedIngredient.ingredientName)}
                                         className="p-5 bg-white border border-gray-100 rounded-[20px] hover:border-black cursor-pointer transition-all shadow-sm group">
                                        <div className="flex justify-between items-center">
                                            <div className="flex items-center gap-4">
                                                <div
                                                    className="h-10 w-10 bg-orange-50 rounded-xl flex items-center justify-center text-orange-600">
                                                    <Calendar className="h-5 w-5"/></div>
                                                <div>
                                                    <div
                                                        className="text-[10px] font-black text-red-500 uppercase tracking-widest">유통기한: {batch.expirationDate}</div>
                                                    <div
                                                        className="text-sm font-black text-gray-900 mt-1">{batch.rawProductName}</div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div
                                                    className="text-lg font-black text-indigo-600">{batch.remainingQuantity} {selectedIngredient?.unit}</div>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                            {(isSummaryLoading || isBatchLoading) && (
                                <div className="py-20 flex justify-center"><Loading/></div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}