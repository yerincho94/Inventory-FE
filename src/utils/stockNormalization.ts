import type { IngredientUnit } from '@/types/reference/ingredient';
import type { StockInboundItemResponse } from '@/types/stock/stock';

export type InboundNormalizationDraft = {
    unit: IngredientUnit;
    packageSizeInput: string;
    detectedSpecLabel: string | null;
};

export type ParsedInboundSpec = {
    unit: IngredientUnit;
    unitSize: number | null;
    matchedText: string;
};

type MatchedSpec = {
    unit: IngredientUnit;
    unitSize: number | null;
    matchedText: string;
};

const SPEC_PATTERN = /([0-9]+(?:[.,][0-9]+)*)(?:\s*)(kg|ml|ea|개|구|입|매|장|g|l|리터|킬로|그램)/gi;

function isFiniteNumber(value: unknown): value is number {
    return typeof value === 'number' && Number.isFinite(value);
}

function toPositiveNumber(value: unknown): number | null {
    if (typeof value === 'number') {
        return Number.isFinite(value) && value > 0 ? value : null;
    }

    if (typeof value !== 'string') {
        return null;
    }

    const trimmed = value.trim();
    if (!trimmed) {
        return null;
    }

    const normalized = trimmed.replace(/,/g, '');
    const parsed = Number(normalized);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function parseAmount(rawValue: string): number | null {
    const value = rawValue.trim();

    if (!value) {
        return null;
    }

    if (value.includes(',') && value.includes('.')) {
        return toPositiveNumber(value.replace(/,/g, ''));
    }

    if (value.includes(',')) {
        const commaIndex = value.lastIndexOf(',');
        const digitsAfterComma = value.length - commaIndex - 1;
        if (digitsAfterComma === 3) {
            return toPositiveNumber(value.replace(/,/g, ''));
        }

        return toPositiveNumber(value.replace(',', '.'));
    }

    return toPositiveNumber(value);
}

function convertUnit(unitToken: string): { unit: IngredientUnit; multiplier: number } | null {
    const unit = unitToken.toLowerCase();

    switch (unit) {
        case '개':
        case 'ea':
        case '구':
        case '입':
        case '매':
        case '장':
            return { unit: 'EA', multiplier: 1 };
        case 'ml':
            return { unit: 'ML', multiplier: 1 };
        case 'l':
        case '리터':
            return { unit: 'ML', multiplier: 1000 };
        case 'g':
        case '그램':
            return { unit: 'G', multiplier: 1 };
        case 'kg':
        case '킬로':
            return { unit: 'G', multiplier: 1000 };
        default:
            return null;
    }
}

function findCandidates(source: string | null | undefined): MatchedSpec[] {
    if (!source || !source.trim()) {
        return [];
    }

    const candidates: MatchedSpec[] = [];
    const normalized = source.toLowerCase().trim();
    const matches = normalized.matchAll(SPEC_PATTERN);

    for (const match of matches) {
        const amount = parseAmount(match[1] ?? '');
        const conversion = convertUnit(match[2] ?? '');

        if (!amount || !conversion) {
            continue;
        }

        candidates.push({
            unit: conversion.unit,
            unitSize: amount * conversion.multiplier,
            matchedText: match[0],
        });
    }

    return candidates;
}

function firstMeasurement(candidates: MatchedSpec[]): MatchedSpec | null {
    return candidates.find((candidate) => candidate.unit === 'G' || candidate.unit === 'ML') ?? null;
}

function firstEa(candidates: MatchedSpec[]): MatchedSpec | null {
    return candidates.find((candidate) => candidate.unit === 'EA') ?? null;
}

function selectBest(rawCandidates: MatchedSpec[], specCandidates: MatchedSpec[]): MatchedSpec | null {
    return (
        firstMeasurement(rawCandidates) ??
        firstMeasurement(specCandidates) ??
        firstEa(rawCandidates) ??
        firstEa(specCandidates) ??
        null
    );
}

export function parseInboundSpec(
    rawProductName?: string | null,
    specText?: string | null,
): ParsedInboundSpec | null {
    const rawCandidates = findCandidates(rawProductName);
    const specCandidates = findCandidates(specText);
    const selected = selectBest(rawCandidates, specCandidates);

    if (!selected) {
        return null;
    }

    return {
        unit: selected.unit,
        unitSize: selected.unitSize,
        matchedText: selected.matchedText,
    };
}

function formatPlainNumber(value: number): string {
    if (!Number.isFinite(value)) {
        return '0';
    }

    if (Number.isInteger(value)) {
        return String(value);
    }

    return value.toFixed(3).replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1');
}

export function getUnitSelectOptions(): Array<{ value: IngredientUnit; label: string }> {
    return [
        { value: 'EA', label: 'EA(개)' },
        { value: 'G', label: 'G(g)' },
        { value: 'ML', label: 'ML(ml)' },
    ];
}

export function getUnitSuffix(unit: IngredientUnit): string {
    switch (unit) {
        case 'G':
            return 'g';
        case 'ML':
            return 'ml';
        case 'EA':
        default:
            return '개';
    }
}

export function createNormalizationDraft(item: StockInboundItemResponse): InboundNormalizationDraft {
    const parsedSpec = parseInboundSpec(item.rawProductName, item.specText);
    const quantity = toPositiveNumber(item.quantity) ?? 0;
    const backendNormalizedQuantity = toPositiveNumber(item.normalizedQuantity ?? null);

    let unit: IngredientUnit = parsedSpec?.unit ?? 'EA';
    let packageSizeInput = '';

    if (parsedSpec && isFiniteNumber(parsedSpec.unitSize) && parsedSpec.unitSize > 0) {
        packageSizeInput = formatPlainNumber(parsedSpec.unitSize);
    }

    if (
        !packageSizeInput &&
        quantity > 0 &&
        backendNormalizedQuantity &&
        backendNormalizedQuantity > quantity
    ) {
        packageSizeInput = formatPlainNumber(backendNormalizedQuantity / quantity);
    }

    return {
        unit,
        packageSizeInput,
        detectedSpecLabel: parsedSpec?.matchedText ?? item.specText ?? null,
    };
}

export function updateDraftUnit(
    draft: InboundNormalizationDraft,
    unit: IngredientUnit,
    item?: Pick<StockInboundItemResponse, 'rawProductName' | 'specText'>,
): InboundNormalizationDraft {
    const parsedSpec = item ? parseInboundSpec(item.rawProductName, item.specText) : null;

    if (draft.packageSizeInput.trim()) {
        return {
            ...draft,
            unit,
        };
    }

    if (parsedSpec && parsedSpec.unit === unit && isFiniteNumber(parsedSpec.unitSize) && parsedSpec.unitSize > 0) {
        return {
            ...draft,
            unit,
            packageSizeInput: formatPlainNumber(parsedSpec.unitSize),
            detectedSpecLabel: parsedSpec.matchedText,
        };
    }

    return {
        ...draft,
        unit,
    };
}

export function calculateNormalizedQuantity(
    quantity: number | null | undefined,
    draft: InboundNormalizationDraft,
    fallbackNormalizedQuantity?: number | null,
): number | null {
    const safeQuantity = toPositiveNumber(quantity);

    if (!safeQuantity) {
        return null;
    }

    const unitSize = toPositiveNumber(draft.packageSizeInput);
    if (unitSize) {
        return safeQuantity * unitSize;
    }

    return toPositiveNumber(fallbackNormalizedQuantity ?? null) ?? safeQuantity;
}

export function formatPackageSizeText(draft: InboundNormalizationDraft): string {
    const unitSize = toPositiveNumber(draft.packageSizeInput);
    if (!unitSize) {
        return '-';
    }

    return `${formatPlainNumber(unitSize)}${getUnitSuffix(draft.unit)}`;
}

export function formatNormalizedQuantityText(
    normalizedQuantity: number | null,
    unit: IngredientUnit,
): string {
    if (!normalizedQuantity) {
        return '-';
    }

    return `${formatPlainNumber(normalizedQuantity)}${getUnitSuffix(unit)}`;
}

export function buildNormalizationFormulaText(
    quantity: number | null | undefined,
    draft: InboundNormalizationDraft,
    fallbackNormalizedQuantity?: number | null,
): string {
    const safeQuantity = toPositiveNumber(quantity);
    if (!safeQuantity) {
        return '-';
    }

    const unitSize = toPositiveNumber(draft.packageSizeInput);
    const normalizedQuantity = calculateNormalizedQuantity(safeQuantity, draft, fallbackNormalizedQuantity);
    const suffix = getUnitSuffix(draft.unit);

    if (unitSize && normalizedQuantity) {
        return `${formatPlainNumber(safeQuantity)} × ${formatPlainNumber(unitSize)}${suffix} = ${formatPlainNumber(normalizedQuantity)}${suffix}`;
    }

    // 규격 없음 → 1로 간주하여 수량 그대로 반영
    if (normalizedQuantity) {
        return `${formatPlainNumber(safeQuantity)} × 1${suffix} = ${formatPlainNumber(normalizedQuantity)}${suffix}`;
    }

    return '-';
}
