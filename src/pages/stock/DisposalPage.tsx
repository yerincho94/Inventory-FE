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
    ChevronLeft, Calendar, Package, ArrowLeft, Filter, ArrowUpDown
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

    // --- [메인 리스트 및 필터 상태] ---
    const [mainData, setMainData] = useState<PageResponse<DisposalResponse> | null>(null);
    const [mainPage, setMainPage] = useState(0);
    const [isMainLoading, setIsMainLoading] = useState(false);

    // UI 입력 상태 (사용자의 실시간 입력)
    const [filter, setFilter] = useState({
        ingredientName: "",
        reason: "" as DisposalReason | "",
        startAt: "", // 날짜 필터 키값 통일
        endAt: "",
        sort: "wasteDate,desc"
    });

    // 실제 API 호출에 사용될 디바운스된 상태
    const [debouncedFilter, setDebouncedFilter] = useState(filter);

    // --- [디바운싱 로직] ---
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedFilter(filter);
        }, 500); // 0.5초 대기 후 반영

        return () => clearTimeout(handler);
    }, [filter]);

    // --- [모달 및 폼 상태] ---
    const [isMainModalOpen, setIsMainModalOpen] = useState(false);
    const [isStockModalOpen, setIsStockModalOpen] = useState(false);
    const [activeItemIndex, setActiveItemIndex] = useState<number | null>(null);

    type FormItem = DisposalItem & {
        ingredientName?: string;
        unit?: string;
        maxQuantity?: number
    };
    const [items, setItems] = useState<FormItem[]>([
        {
            stockBatchId: "",
            quantity: 0,
            reason: "EXPIRED",
            wasteDate: new Date().toISOString(),
            ingredientName: "",
            unit: ""
        },
    ]);

    // --- [재고 검색(서브 모달) 상태] ---
    const [stockSearchTerm, setStockSearchTerm] = useState("");
    const [summaryItems, setSummaryItems] = useState<StockSummaryResponse[]>([]);
    const [summaryPage, setSummaryPage] = useState(0);
    const [hasMoreSummary, setHasMoreSummary] = useState(true);
    const [isSummaryLoading, setIsSummaryLoading] = useState(false);

    const [selectedIngredient, setSelectedIngredient] = useState<StockSummaryResponse | null>(null);
    const [batchItems, setBatchItems] = useState<StockBatchResponse[]>([]);
    const [isBatchLoading, setIsBatchLoading] = useState(false);

    // --- [API 호출 함수] ---
    const fetchMainRecords = useCallback(async () => {
        setIsMainLoading(true);
        try {
            const condition: DisposalSearchCondition = {
                ingredientName: debouncedFilter.ingredientName || undefined,
                reason: debouncedFilter.reason || undefined,
                // ✅ debouncedFilter를 사용하여 Z 포맷팅 적용
                startAt: debouncedFilter.startAt ? `${debouncedFilter.startAt}T00:00:00Z` : undefined,
                endAt: debouncedFilter.endAt ? `${debouncedFilter.endAt}T23:59:59Z` : undefined,
            };
            const res = await getWasteRecords(storePublicId, condition, mainPage, 15, debouncedFilter.sort);
            setMainData(res);
        } catch (error) {
            console.error("내역 조회 실패:", error);
        } finally {
            setIsMainLoading(false);
        }
    }, [storePublicId, mainPage, debouncedFilter]);

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

    // --- [Effects] ---
    useEffect(() => {
        fetchMainRecords();
    }, [fetchMainRecords]);

    useEffect(() => {
        if (isStockModalOpen) {
            setStockSearchTerm("");
            setSelectedIngredient(null);
            setBatchItems([]);
            setSummaryItems([]);
            setSummaryPage(0);
            fetchStockSummaries(true);
        }
    }, [isStockModalOpen]);

    useEffect(() => {
        if (isStockModalOpen) {
            setSummaryPage(0);
            fetchStockSummaries(true);
        }
    }, [stockSearchTerm]);

    useEffect(() => {
        if (summaryPage > 0) fetchStockSummaries(false);
    }, [summaryPage]);

    const observer = useRef<IntersectionObserver | null>(null);
    const lastItemRef = useCallback((node: HTMLDivElement) => {
        if (isSummaryLoading) return;
        if (observer.current) observer.current.disconnect();
        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && hasMoreSummary) setSummaryPage(prev => prev + 1);
        });
        if (node) observer.current.observe(node);
    }, [isSummaryLoading, hasMoreSummary]);

    // --- [Handlers] ---
    const closeStockModal = () => {
        setIsStockModalOpen(false);
        setSelectedIngredient(null);
        setBatchItems([]);
    };

    const handleBackToIngredients = () => {
        setSelectedIngredient(null);
        setBatchItems([]);
    };

    const handleRecordWaste = async () => {
        if (!items.every(i => i.stockBatchId && i.quantity > 0)) {
            alert("품목과 수량을 모두 확인해주세요.");
            return;
        }
        try {
            await recordWaste(storePublicId, {
                items: items.map(({ingredientName, unit, maxQuantity, ...rest}) => rest)
            });
            setIsMainModalOpen(false);
            setItems([{
                stockBatchId: "",
                quantity: 0,
                reason: "EXPIRED",
                wasteDate: new Date().toISOString(),
                ingredientName: "",
                unit: ""
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

    const handleSelectBatch = (batch: StockBatchResponse, ingredientName: string) => {
        if (activeItemIndex !== null) {
            const newItems = [...items];
            newItems[activeItemIndex] = {
                ...newItems[activeItemIndex],
                stockBatchId: batch.stockBatchId.toString(),
                ingredientName: `${ingredientName} (${batch.expirationDate})`,
                quantity: batch.remainingQuantity,
                unit: selectedIngredient?.unit || "",
                maxQuantity: batch.remainingQuantity
            };
            setItems(newItems);
            closeStockModal();
        }
    };

    if (isMainLoading && !mainData) return <Loading/>;

    return (
        <div className="min-h-screen bg-[#F8F9FB]">
            <div className="mx-auto w-full max-w-7xl px-6 py-10">
                {/* 헤더 */}
                <div className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-1">
                        <h1 className="text-4xl font-black tracking-tight text-gray-900 flex items-center gap-3">
                            <Package className="h-10 w-10 text-black"/> 폐기 관리
                        </h1>
                        <p className="text-sm font-bold text-gray-400 ml-1">매장의 재고 손실 내역을 추적하고 관리합니다.</p>
                    </div>
                    <button
                        onClick={() => setIsMainModalOpen(true)}
                        className="inline-flex items-center gap-2 rounded-2xl bg-black px-6 py-4 text-sm font-black text-white hover:bg-gray-800 transition-all shadow-lg active:scale-95"
                    >
                        <Plus className="h-5 w-5"/> 새 폐기 등록
                    </button>
                </div>

                {/* 필터 섹션 */}
                <div
                    className="mb-8 flex flex-col xl:flex-row gap-4 items-stretch xl:items-center bg-white p-6 rounded-[28px] border border-gray-100 shadow-sm">
                    <div className="relative flex-1 min-w-[240px]">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-300"/>
                        <input
                            type="text"
                            placeholder="품목명으로 찾기..."
                            value={filter.ingredientName}
                            onChange={(e) => {
                                setFilter(prev => ({...prev, ingredientName: e.target.value}));
                                setMainPage(0);
                            }}
                            className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-transparent rounded-2xl text-sm font-bold focus:bg-white focus:border-black outline-none transition-all"
                        />
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <div
                            className="flex items-center gap-2 bg-gray-50 px-4 py-2.5 rounded-2xl border border-transparent">
                            <Calendar className="h-4 w-4 text-gray-400"/>
                            <input
                                type="date"
                                value={filter.startAt}
                                onChange={(e) => {
                                    setFilter(prev => ({...prev, startAt: e.target.value})); // ✅ 키값 수정됨
                                    setMainPage(0);
                                }}
                                className="bg-transparent text-[11px] font-black outline-none"
                            />
                            <span className="text-gray-300">~</span>
                            <input
                                type="date"
                                value={filter.endAt}
                                onChange={(e) => {
                                    setFilter(prev => ({...prev, endAt: e.target.value})); // ✅ 키값 수정됨
                                    setMainPage(0);
                                }}
                                className="bg-transparent text-[11px] font-black outline-none"
                            />
                        </div>

                        <div className="relative">
                            <Filter
                                className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none"/>
                            <select
                                value={filter.reason}
                                onChange={(e) => {
                                    setFilter(prev => ({...prev, reason: e.target.value as DisposalReason}));
                                    setMainPage(0);
                                }}
                                className="pl-9 pr-8 py-3 bg-gray-50 border border-transparent rounded-2xl text-[11px] font-black outline-none cursor-pointer appearance-none hover:bg-gray-100 transition-all"
                            >
                                <option value="">사유 전체</option>
                                {Object.entries(REASON_MAP).map(([key, val]) => (
                                    <option key={key} value={key}>{val.label}</option>
                                ))}
                            </select>
                        </div>

                        <div className="relative">
                            <ArrowUpDown
                                className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white pointer-events-none z-10"/>
                            <select
                                value={filter.sort}
                                onChange={(e) => {
                                    setFilter(prev => ({...prev, sort: e.target.value}));
                                    setMainPage(0);
                                }}
                                className="pl-9 pr-8 py-3 bg-black text-white border border-transparent rounded-2xl text-[11px] font-black outline-none cursor-pointer appearance-none hover:bg-gray-800 transition-all shadow-md"
                            >
                                <option value="wasteDate,desc">최신순</option>
                                <option value="amount,desc">금액 높은순</option>
                                <option value="amount,asc">금액 낮은순</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* 메인 테이블 */}
                <div className="bg-white border border-gray-100 rounded-[32px] shadow-sm overflow-hidden relative">
                    <div
                        className={`overflow-x-auto transition-opacity duration-200 ${isMainLoading ? 'opacity-50' : 'opacity-100'}`}>
                        <table className="w-full text-left text-[13px]">
                            <thead className="bg-gray-50/50 border-b border-gray-50">
                            <tr className="text-gray-400 font-black uppercase tracking-widest">
                                <th className="px-8 py-5">처리 일시</th>
                                <th className="px-8 py-5">품목 정보</th>
                                <th className="px-8 py-5 text-right">폐기 수량</th>
                                <th className="px-8 py-5 text-right">손실 예상액</th>
                                <th className="px-8 py-5 text-center">사유</th>
                            </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                            {mainData?.content.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="py-32 text-center text-gray-300 font-bold">조회된 폐기 내역이
                                        없습니다.
                                    </td>
                                </tr>
                            ) : (
                                mainData?.content.map((item) => (
                                    <tr key={item.wastePublicId}
                                        className="hover:bg-gray-50/50 transition-colors group">
                                        <td className="px-8 py-6 text-gray-400 font-bold">{new Date(item.wasteAt).toLocaleDateString()}</td>
                                        <td className="px-8 py-6 font-black text-gray-900">{item.ingredientName}</td>
                                        <td className="px-8 py-6 text-right font-black text-gray-600">{item.quantity.toLocaleString()} {item.unit}</td>
                                        <td className="px-8 py-6 text-right font-black text-red-500">-
                                            ₩{item.amount.toLocaleString()}</td>
                                        <td className="px-8 py-6 text-center">
                                            <span
                                                className="px-3 py-1 rounded-full text-[10px] font-black bg-white border border-gray-200 text-gray-500 shadow-sm">
                                                {REASON_MAP[item.wasteReason]?.label || "기타"}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                            </tbody>
                        </table>
                    </div>
                    {/* 메인 페이지네이션 */}
                    <div className="px-8 py-6 bg-gray-50/30 border-t border-gray-50 flex items-center justify-between">
                        <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest">
                            Page {mainPage + 1} / {mainData?.totalPages || 1}
                        </span>
                        <div className="flex gap-2">
                            <button disabled={mainPage === 0} onClick={() => setMainPage(p => p - 1)}
                                    className="w-10 h-10 flex items-center justify-center rounded-xl border border-gray-200 bg-white disabled:opacity-30 hover:bg-gray-50 transition-all shadow-sm">
                                <ChevronLeft className="h-5 w-5"/>
                            </button>
                            <button disabled={!mainData?.hasNext} onClick={() => setMainPage(p => p + 1)}
                                    className="w-10 h-10 flex items-center justify-center rounded-xl border border-gray-200 bg-white disabled:opacity-30 hover:bg-gray-50 transition-all shadow-sm">
                                <ChevronRight className="h-5 w-5"/>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* [메인 등록 모달] */}
            {isMainModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-md"
                         onClick={() => setIsMainModalOpen(false)}/>
                    <div
                        className="relative bg-white w-full max-w-2xl rounded-[32px] shadow-2xl flex flex-col h-[80vh] overflow-hidden animate-in fade-in zoom-in-95 duration-300">
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
                                                수량 {item.unit && `(${item.unit})`}</label>
                                            <div className="relative">
                                                <input type="number" placeholder="0" value={item.quantity || ""}
                                                       className={`w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-black focus:bg-white outline-none transition-all ${item.maxQuantity && item.quantity > item.maxQuantity ? 'border-red-500 text-red-500' : ''}`}
                                                       onChange={(e) => updateItem(index, 'quantity', Number(e.target.value))}/>
                                                {item.maxQuantity && <div
                                                    className="absolute -bottom-5 left-1 text-[10px] font-bold text-gray-400">잔여
                                                    재고: {item.maxQuantity}{item.unit}</div>}
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label
                                                className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">폐기
                                                사유</label>
                                            <select
                                                className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-black appearance-none outline-none"
                                                value={item.reason}
                                                onChange={(e) => updateItem(index, 'reason', e.target.value as DisposalReason)}>
                                                {Object.entries(REASON_MAP).map(([key, val]) => <option key={key}
                                                                                                        value={key}>{val.label}</option>)}
                                            </select>
                                        </div>

                                        {/* 2. 폐기 날짜 선택 (새로 추가) */}
                                        <div className="space-y-2">
                                            <label
                                                className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">폐기
                                                날짜</label>
                                            <div className="relative">
                                                <input
                                                    type="date"
                                                    // "YYYY-MM-DD" 형식으로 변환하여 value 부여
                                                    value={item.wasteDate ? item.wasteDate.split('T')[0] : new Date().toISOString().split('T')[0]}
                                                    max={new Date().toISOString().split('T')[0]} // 미래 날짜 선택 방지
                                                    className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-[13px] font-black outline-none focus:bg-white focus:border-black transition-all cursor-pointer"
                                                    onChange={(e) => updateItem(index, 'wasteDate', new Date(e.target.value).toISOString())}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            <button onClick={() => setItems([...items, {
                                stockBatchId: "",
                                quantity: 0,
                                reason: "EXPIRED",
                                wasteDate: new Date().toISOString(),
                                ingredientName: "",
                                unit: ""
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
                                    <button onClick={handleBackToIngredients}
                                            className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                                        <ArrowLeft className="h-6 w-6"/>
                                    </button>
                                )}
                                <h3 className="text-2xl font-black text-gray-900">{selectedIngredient ? "입고 날짜 선택" : "재고 품목 검색"}</h3>
                                {!selectedIngredient && <button onClick={closeStockModal}
                                                                className="ml-auto p-2 text-gray-400 hover:text-black">
                                    <X className="h-6 w-6"/></button>}
                            </div>
                            {!selectedIngredient && (
                                <div className="relative mt-6">
                                    <Search
                                        className={`absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 ${isSummaryLoading ? 'animate-pulse text-black' : 'text-gray-300'}`}/>
                                    <input type="text" placeholder="어떤 재료를 찾으시나요?"
                                           className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-black outline-none focus:bg-white transition-all shadow-inner"
                                           value={stockSearchTerm} onChange={(e) => setStockSearchTerm(e.target.value)}
                                           autoFocus/>
                                </div>
                            )}
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-3 bg-[#F8F9FB]/50">
                            {!selectedIngredient ? (
                                <>
                                    {summaryItems.map((item, idx) => (
                                        <div key={item.ingredientId}
                                             ref={summaryItems.length === idx + 1 ? lastItemRef : null}
                                             onClick={() => fetchBatches(item)}
                                             className="p-5 bg-white border border-gray-100 rounded-[20px] hover:border-black cursor-pointer flex justify-between items-center group transition-all shadow-sm">
                                            <div className="flex items-center gap-4">
                                                <div
                                                    className="h-10 w-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                                                    <Package className="h-5 w-5"/></div>
                                                <div>
                                                    <div
                                                        className="font-black text-gray-900">{item.ingredientName}</div>
                                                    <div
                                                        className="text-[10px] text-gray-400 mt-0.5 font-bold uppercase tracking-tight">총
                                                        재고 {item.totalRemainingQuantity}{item.unit}</div>
                                                </div>
                                            </div>
                                            <ChevronRight className="h-5 w-5 text-gray-200 group-hover:text-black"/>
                                        </div>
                                    ))}
                                    {isSummaryLoading && <div className="py-6 flex justify-center items-center gap-2">
                                        <div
                                            className="w-5 h-5 border-2 border-gray-200 border-t-black rounded-full animate-spin"></div>
                                        <span className="text-xs font-bold text-gray-400">불러오는 중...</span></div>}
                                </>
                            ) : (
                                <>
                                    {batchItems.map((batch) => (
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
                                    ))}
                                    {isBatchLoading && <div className="py-6 flex justify-center">
                                        <div
                                            className="w-5 h-5 border-2 border-gray-200 border-t-black rounded-full animate-spin"></div>
                                    </div>}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}