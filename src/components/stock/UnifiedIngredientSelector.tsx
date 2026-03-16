import { useEffect, useMemo, useState } from 'react';
import type { Candidate, IngredientResponse, StockInboundItemResponse } from '@/types';
import type { PageResponse } from '@/types/common/common';
import type { IngredientUnit } from '@/types/reference/ingredient';
import { getAllIngredients } from '@/api/reference/ingredient';
import { requireStorePublicId } from '@/utils/store';
import {
    buildNormalizationFormulaText,
    calculateNormalizedQuantity,
    createNormalizationDraft,
    formatNormalizedQuantityText,
    formatPackageSizeText,
    getUnitSelectOptions,
    updateDraftUnit,
    type InboundNormalizationDraft,
} from '@/utils/stockNormalization';

type ConfirmIngredientPayload = {
    inboundItemPublicId: string;
    existingIngredientPublicId?: string;
    newIngredientName?: string;
    newIngredientUnit?: IngredientUnit;
    specText?: string;
};

interface UnifiedIngredientSelectorProps {
    isOpen: boolean;
    item: StockInboundItemResponse | null;
    suggestions: Candidate[];
    normalizationDraft: InboundNormalizationDraft | null;
    onChangeNormalizationDraft: (inboundItemPublicId: string, draft: InboundNormalizationDraft) => void;
    onSaveNormalization: (inboundItemPublicId: string, draft: InboundNormalizationDraft, specText?: string) => Promise<void>;
    onConfirm: (payload: ConfirmIngredientPayload) => Promise<void>;
    onClose: () => void;
}

function toIngredientList(
    response: IngredientResponse[] | PageResponse<IngredientResponse>,
): IngredientResponse[] {
    if (Array.isArray(response)) {
        return response;
    }
    return response.content ?? [];
}

function getPreferredMappedLabel(item: StockInboundItemResponse | null): string {
    if (!item) return '';
    return item.ingredientName?.trim() || item.normalizedRawKey?.trim() || '';
}

function getInitialSearchQuery(item: StockInboundItemResponse | null): string {
    if (!item) return '';
    return item.ingredientName?.trim() || item.normalizedRawKey?.trim() || item.rawProductName?.trim() || '';
}

function getInitialCreateName(item: StockInboundItemResponse | null, currentSearchQuery: string): string {
    if (currentSearchQuery.trim()) {
        return currentSearchQuery.trim();
    }

    if (!item) return '';

    return item.normalizedRawKey?.trim() || item.rawProductName?.trim() || '';
}

function toIngredientUnit(value: string | null | undefined): IngredientUnit | null {
    if (value === 'EA' || value === 'G' || value === 'ML') {
        return value;
    }
    return null;
}

export default function UnifiedIngredientSelector({
    isOpen,
    item,
    suggestions,
    normalizationDraft,
    onChangeNormalizationDraft,
    onSaveNormalization,
    onConfirm,
    onClose,
}: UnifiedIngredientSelectorProps) {
    const storePublicId = requireStorePublicId();

    const [searchQuery, setSearchQuery] = useState('');
    const [allIngredients, setAllIngredients] = useState<IngredientResponse[]>([]);
    const [loadingIngredients, setLoadingIngredients] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [localDraft, setLocalDraft] = useState<InboundNormalizationDraft>({
        unit: 'EA',
        packageSizeInput: '',
        detectedSpecLabel: null,
    });
    const [localSpecText, setLocalSpecText] = useState('');

    useEffect(() => {
        if (!isOpen || !storePublicId || !item) return;

        setLoadingIngredients(true);
        getAllIngredients(storePublicId)
            .then((response) => {
                setAllIngredients(toIngredientList(response));
            })
            .catch(console.error)
            .finally(() => setLoadingIngredients(false));

        setSearchQuery(getInitialSearchQuery(item));
        setLocalDraft(normalizationDraft ?? createNormalizationDraft(item));
        setLocalSpecText(item.productDisplayName ?? item.specText ?? '');
    }, [isOpen, storePublicId, item, normalizationDraft]);

    const currentMappedLabel = useMemo(() => getPreferredMappedLabel(item), [item]);

    const createIngredientName = useMemo(() => {
        return getInitialCreateName(item, searchQuery);
    }, [item, searchQuery]);

    const filteredIngredients = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();

        if (!query) {
            return allIngredients.slice(0, 10);
        }

        const tokens = query.split(/\s+/).filter(Boolean);

        return allIngredients
            .filter((ingredient) => {
                const name = ingredient.name.toLowerCase();
                return tokens.every((token) => name.includes(token));
            })
            .sort((a, b) => {
                const aName = a.name.toLowerCase();
                const bName = b.name.toLowerCase();
                const aRank = aName === query ? 2 : aName.startsWith(query) ? 1 : 0;
                const bRank = bName === query ? 2 : bName.startsWith(query) ? 1 : 0;

                if (aRank !== bRank) return bRank - aRank;
                return a.name.localeCompare(b.name, 'ko');
            })
            .slice(0, 10);
    }, [searchQuery, allIngredients]);

    const exactNameExists = useMemo(() => {
        const query = createIngredientName.trim().toLowerCase();
        if (!query) return false;
        return allIngredients.some((ingredient) => ingredient.name.trim().toLowerCase() === query);
    }, [allIngredients, createIngredientName]);

    const normalizedQuantity = useMemo(() => {
        if (!item) return null;
        return calculateNormalizedQuantity(item.quantity, localDraft, item.normalizedQuantity ?? null);
    }, [item, localDraft]);

    const normalizationFormula = useMemo(() => {
        if (!item) return '-';
        return buildNormalizationFormulaText(item.quantity, localDraft, item.normalizedQuantity ?? null);
    }, [item, localDraft]);

    const applyNormalizationDraft = () => {
        if (!item) return;
        onChangeNormalizationDraft(item.inboundItemPublicId, localDraft);
    };

    const handleSelectExisting = async (ingredientPublicId: string, preferredUnit?: IngredientUnit | null) => {
        if (!item || submitting) return;

        const nextDraft = preferredUnit ? updateDraftUnit(localDraft, preferredUnit, item) : localDraft;

        try {
            setSubmitting(true);
            onChangeNormalizationDraft(item.inboundItemPublicId, nextDraft);
            await onConfirm({
                inboundItemPublicId: item.inboundItemPublicId,
                existingIngredientPublicId: ingredientPublicId,
                specText: localSpecText.trim() || undefined,
            });
            onClose();
        } catch (error) {
            console.error(error);
            alert('재료 확정에 실패했습니다.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleCreateNew = async () => {
        if (!item || !createIngredientName.trim() || submitting) return;

        try {
            setSubmitting(true);
            applyNormalizationDraft();
            await onConfirm({
                inboundItemPublicId: item.inboundItemPublicId,
                newIngredientName: createIngredientName.trim(),
                newIngredientUnit: localDraft.unit,
                specText: localSpecText.trim() || undefined,
            });
            onClose();
        } catch (error) {
            console.error(error);
            alert('새 재료 생성 및 확정에 실패했습니다.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleSaveNormalizationOnly = async () => {
        if (!item || submitting) return;

        try {
            setSubmitting(true);
            await onSaveNormalization(item.inboundItemPublicId, localDraft, localSpecText);
            onClose();
        } catch (error) {
            console.error(error);
            alert('정규화 저장에 실패했습니다.');
        } finally {
            setSubmitting(false);
        }
    };

    const unitOptions = getUnitSelectOptions();

    if (!isOpen || !item) return null;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

            <div className="relative flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
                <div className="flex items-start justify-between border-b border-gray-100 bg-gray-50 px-6 py-4">
                    <div className="min-w-0">
                        <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-indigo-500">
                            재료 선택 / 수량 검토
                        </p>
                        <h3 className="truncate text-sm font-black text-gray-800">{item.rawProductName}</h3>
                        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
                            <span>
                                현재 매핑:
                                <span className="ml-1 font-bold text-gray-800">{currentMappedLabel || '미매핑'}</span>
                            </span>
                            <span>
                                인식 규격:
                                <span className="ml-1 font-bold text-gray-800">{localDraft.detectedSpecLabel || '-'}</span>
                            </span>
                        </div>
                    </div>

                    <button onClick={onClose} className="rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-200">
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="space-y-6 overflow-y-auto p-6">
                    <section className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                        <div className="mb-3">
                            <h4 className="text-[11px] font-black uppercase tracking-tighter text-gray-400">
                                수량 정규화 검토
                            </h4>
                            <p className="mt-1 text-xs text-gray-500">
                                기준 단위와 1개당 규격을 입력하면 재고 반영 수량이 계산됩니다. (예: 12입 식빵 6개 → 6 × 12ea = 72ea)
                            </p>
                        </div>

                        <div className="mb-3">
                            <label className="text-[11px] font-black text-gray-500">상품명</label>
                            <input
                                type="text"
                                value={localSpecText}
                                onChange={(e) => setLocalSpecText(e.target.value)}
                                placeholder="예: 12입, 1kg, 1L 등"
                                className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm font-bold text-gray-900 outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>

                        <div className="grid grid-cols-1 gap-3 md:grid-cols-[140px_120px_1fr_180px]">
                            <div>
                                <label className="text-[11px] font-black text-gray-500">기준 단위</label>
                                <select
                                    value={localDraft.unit}
                                    onChange={(e) => {
                                        const nextUnit = e.target.value as IngredientUnit;
                                        setLocalDraft((prev) => updateDraftUnit(prev, nextUnit, item));
                                    }}
                                    className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm font-bold text-gray-900 outline-none focus:ring-2 focus:ring-indigo-500"
                                >
                                    {unitOptions.map((option) => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="text-[11px] font-black text-gray-500">입고 수량</label>
                                <div className="mt-1 flex h-[46px] items-center rounded-xl border border-gray-200 bg-white px-3 text-sm font-black text-gray-900">
                                    {item.quantity}
                                </div>
                            </div>

                            <div>
                                <label className="text-[11px] font-black text-gray-500">1개당 규격</label>
                                <div className="relative mt-1">
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.001"
                                        value={localDraft.packageSizeInput}
                                        onChange={(e) => {
                                            const value = e.target.value;
                                            setLocalDraft((prev) => ({
                                                ...prev,
                                                packageSizeInput: value,
                                            }));
                                        }}
                                        placeholder={
                                            localDraft.unit === 'EA'
                                                ? '예: 12 (12입/12구)'
                                                : localDraft.unit === 'G'
                                                ? '예: 1000 (1kg)'
                                                : '예: 1000 (1L)'
                                        }
                                        className="w-full rounded-xl border border-gray-200 bg-white px-3 py-3 pr-14 text-sm font-bold text-gray-900 outline-none focus:ring-2 focus:ring-indigo-500"
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-black text-gray-400">
                                        {localDraft.unit === 'G' ? 'g' : localDraft.unit === 'ML' ? 'ml' : '개'}
                                    </span>
                                </div>
                            </div>

                            <div>
                                <label className="text-[11px] font-black text-gray-500">재고 반영 수량</label>
                                <div className="mt-1 flex h-[46px] items-center rounded-xl border border-gray-200 bg-white px-3 text-sm font-black text-gray-900">
                                    {formatNormalizedQuantityText(normalizedQuantity, localDraft.unit)}
                                </div>
                            </div>
                        </div>

                        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
                            <span className="rounded-full bg-white px-3 py-1 font-bold text-gray-700">
                                표시 규격: {formatPackageSizeText(localDraft)}
                            </span>
                            <span className="font-medium text-gray-500">{normalizationFormula}</span>
                        </div>
                    </section>

                    {suggestions.length > 0 && (
                        <section>
                            <h4 className="mb-2 text-[11px] font-black uppercase tracking-tighter text-gray-400">
                                자동 추천 결과
                            </h4>
                            <div className="grid grid-cols-1 gap-2">
                                {suggestions.map((suggestion) => (
                                    <button
                                        key={suggestion.ingredientPublicId}
                                        onClick={() => handleSelectExisting(
                                            suggestion.ingredientPublicId,
                                            toIngredientUnit(suggestion.ingredientUnit),
                                        )}
                                        disabled={submitting}
                                        className="group flex items-center justify-between rounded-xl border border-indigo-100 bg-indigo-50/50 p-3 transition-all hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        <div className="text-left">
                                            <p className="text-sm font-bold text-indigo-900">{suggestion.ingredientName}</p>
                                            <p className="text-[10px] text-indigo-400">
                                                단위: {suggestion.ingredientUnit || '-'} · 신뢰도: {Math.round(suggestion.score * 100)}%
                                            </p>
                                        </div>
                                        <div className="rounded-lg bg-indigo-500 px-2 py-1 text-[10px] font-black text-white opacity-0 transition-opacity group-hover:opacity-100">
                                            선택하기
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </section>
                    )}

                    <section>
                        <h4 className="mb-2 text-[11px] font-black uppercase tracking-tighter text-gray-400">재료 검색</h4>

                        <div className="relative mb-3">
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="재료명을 입력하세요..."
                                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 pr-10 text-sm outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-indigo-500"
                            />
                            <div className="absolute right-3 top-3.5 text-gray-400">
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </div>
                        </div>

                        <div className="space-y-1">
                            {loadingIngredients ? (
                                <div className="py-4 text-center text-xs italic text-gray-400">재료 목록을 불러오는 중...</div>
                            ) : filteredIngredients.length > 0 ? (
                                filteredIngredients.map((ingredient) => (
                                    <button
                                        key={ingredient.ingredientPublicId}
                                        onClick={() => handleSelectExisting(ingredient.ingredientPublicId, ingredient.unit)}
                                        disabled={submitting}
                                        className="group flex w-full items-center justify-between rounded-xl border border-transparent p-3 transition-all hover:border-gray-100 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        <div className="text-left">
                                            <p className="text-sm font-bold text-gray-800">{ingredient.name}</p>
                                            <p className="text-[10px] text-gray-400">단위: {ingredient.unit}</p>
                                        </div>
                                        <div className="text-[10px] font-black text-indigo-500 opacity-0 transition-opacity group-hover:opacity-100">
                                            선택
                                        </div>
                                    </button>
                                ))
                            ) : (
                                <div className="rounded-xl border border-orange-100 bg-orange-50 p-4 text-center">
                                    <p className="text-xs font-medium italic text-orange-700">일치하는 재료가 없습니다.</p>
                                </div>
                            )}
                        </div>
                    </section>

                    {createIngredientName.trim() && !exactNameExists && (
                        <section className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                            <div className="mb-3">
                                <h4 className="text-[11px] font-black uppercase tracking-tighter text-gray-400">
                                    새 재료 빠른 생성
                                </h4>
                                <p className="mt-1 text-xs text-gray-500">
                                    검색 결과에 원하는 재료가 없으면 새 재료를 만들고 바로 확정합니다.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_140px]">
                                <div>
                                    <label className="text-[11px] font-black text-gray-500">재료명</label>
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold text-gray-900 outline-none focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>

                                <div>
                                    <label className="text-[11px] font-black text-gray-500">단위</label>
                                    <select
                                        value={localDraft.unit}
                                        onChange={(e) => {
                                            const nextUnit = e.target.value as IngredientUnit;
                                            setLocalDraft((prev) => updateDraftUnit(prev, nextUnit, item));
                                        }}
                                        className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold text-gray-900 outline-none focus:ring-2 focus:ring-indigo-500"
                                    >
                                        {unitOptions.map((option) => (
                                            <option key={option.value} value={option.value}>
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <button
                                onClick={handleCreateNew}
                                disabled={submitting || !createIngredientName.trim()}
                                className={`mt-4 inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-[11px] font-black transition-all ${
                                    submitting || !createIngredientName.trim()
                                        ? 'cursor-not-allowed bg-gray-300 text-gray-600'
                                        : 'bg-black text-white hover:bg-gray-900'
                                }`}
                            >
                                {submitting ? '처리 중...' : `'${createIngredientName.trim()}' 새 재료로 생성 후 확정`}
                            </button>
                        </section>
                    )}
                </div>

                <div className="flex items-center justify-between gap-3 border-t border-gray-100 bg-gray-50 px-6 py-4">
                    <p className="text-[10px] font-medium text-gray-400">
                        규격이 있으면 개별 수량으로 환산됩니다. 예: 6 × 12ea = 72ea, 4 × 1000ml = 4000ml
                    </p>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleSaveNormalizationOnly}
                            disabled={submitting}
                            className={`rounded-lg px-4 py-2 text-[11px] font-black transition-all ${
                                submitting
                                    ? 'cursor-not-allowed border border-gray-200 bg-gray-100 text-gray-400'
                                    : 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-100'
                            }`}
                        >
                            {submitting ? '저장 중...' : '정규화만 반영'}
                        </button>
                        <button
                            onClick={onClose}
                            disabled={submitting}
                            className={`rounded-lg px-4 py-2 text-[11px] font-black transition-all ${
                                submitting ? 'cursor-not-allowed text-gray-300' : 'text-gray-500 hover:bg-gray-200'
                            }`}
                        >
                            닫기
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
