import type {IngredientUnit} from "@/types/reference/ingredient";

export interface StockAnalyticResponse {
    ingredientId: number;
    ingredientName: string;
    unit: IngredientUnit;

    // 재고 정보
    currentQuantity: number;
    minExpirationDate: string;
    isLowStock: boolean;
    activeBatchCount: number;

    // 폐기 정보
    totalWasteQuantity: number;
    totalWasteAmount: number;
    totalWasteCount: number;
}