/**
 * 재료 사전 관련 타입 정의
 */

export type IngredientCategory =
  | "meat"
  | "seafood"
  | "vegetable"
  | "dairy"
  | "grain"
  | "seasoning"
  | "pantry";

export interface Ingredient {
  /** 표준 이름 (정규화된 형태) */
  name: string;
  /** 동의어 목록 */
  aliases: string[];
  /** 재료 카테고리 */
  category: IngredientCategory;
}

export interface IngredientDictionary {
  ingredients: Ingredient[];
}
