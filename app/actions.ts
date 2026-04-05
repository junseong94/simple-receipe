"use server";

/**
 * 홈페이지 Server Actions
 *
 * recipes.json(~73KB)과 ingredients.json(~33KB) 임포트 체인을
 * 서버 사이드에만 격리합니다. "use client" 컴포넌트에서 직접
 * import 하면 해당 JSON들이 클라이언트 번들에 포함되므로
 * Server Action을 통해 호출합니다.
 */

import { filterStaticRecipes, getCuisineCounts } from "@/lib/recipes/search";
import type { CuisineType, ScoredRecipe } from "@/lib/recipes/types";

export interface SearchParams {
  ingredients: string[];
  cuisines: CuisineType[];
}

export interface SearchResult {
  results: ScoredRecipe[];
  cuisineCounts: Record<CuisineType, number>;
}

/**
 * 재료 기반 레시피 검색 — 서버에서 recipes.json을 읽어 반환합니다.
 */
export async function searchRecipesAction(
  params: SearchParams,
): Promise<ScoredRecipe[]> {
  return await filterStaticRecipes(params.ingredients, params.cuisines);
}

/**
 * cuisine별 레시피 수 조회 — 서버에서 계산 후 반환합니다.
 */
export async function getCuisineCountsAction(
  ingredients: string[],
): Promise<Record<CuisineType, number>> {
  return await getCuisineCounts(ingredients);
}
