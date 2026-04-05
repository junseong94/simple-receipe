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
import { query } from "@/lib/db/client";
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

/**
 * 재료 인기순 빈도 조회 — recipes + user_recipes 두 테이블을 합산합니다.
 *
 * PostgreSQL unnest() 를 사용해 ingredients 배열을 행으로 펼친 뒤
 * 재료별 출현 횟수를 집계합니다. DB 미연결 시 빈 객체를 반환하여
 * 호출 측에서 기존 고정 순서로 폴백할 수 있게 합니다.
 *
 * @returns 재료명 → 출현 횟수 맵 (예: { "양파": 25, "대파": 20, ... })
 */
export async function getIngredientPopularity(): Promise<
  Record<string, number>
> {
  try {
    const sql = `
      SELECT ingredient, SUM(cnt)::int AS count
      FROM (
        SELECT unnest(ingredients) AS ingredient, 1 AS cnt
        FROM recipes
        UNION ALL
        SELECT unnest(ingredients) AS ingredient, 1 AS cnt
        FROM user_recipes
      ) sub
      GROUP BY ingredient
      ORDER BY count DESC
    `;
    const rows = await query<{ ingredient: string; count: number }>(sql);
    return Object.fromEntries(rows.map((r) => [r.ingredient, r.count]));
  } catch {
    // DB 미연결 또는 쿼리 실패 시 빈 객체 반환 → 호출 측에서 고정 순서 폴백
    return {};
  }
}
