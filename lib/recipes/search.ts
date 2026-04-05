"use server";

/**
 * 레시피 검색 및 필터링 모듈
 *
 * PostgreSQL DB에서 레시피를 조회하고 서버 사이드에서 점수를 계산합니다.
 * 큐레이션 레시피(recipes 테이블)와 사용자 레시피(user_recipes 테이블)를
 * 통합 검색합니다.
 */

import { query } from "@/lib/db/client";
import { rowToRecipe } from "@/lib/db/transform";
import { scoreRecipe, sortScoredRecipes } from "@/lib/recipes/scorer";
import type { CuisineType, ScoredRecipe } from "@/lib/recipes/types";

/** missingCount가 이 값을 초과하는 레시피는 결과에서 제외 */
const MAX_MISSING_COUNT = 3;

/**
 * 큐레이션 레시피(recipes 테이블)에서 재료 기반 검색을 수행합니다.
 *
 * 동작 규칙:
 * 1. cuisine 필터 적용 (cuisines가 undefined이거나 비어있으면 전체 레시피 대상)
 * 2. 각 레시피에 scoreRecipe 적용
 * 3. missingCount > 3이거나 matchRatio === 0인 레시피 제외
 * 4. 정렬: missingCount ASC → matchRatio DESC
 *
 * @param userIngredients - 사용자가 보유한 재료 목록 (빈 배열 허용)
 * @param cuisines - 필터링할 cuisine 종류 (생략 시 전체)
 * @returns 점수 계산 및 정렬된 레시피 목록
 */
export async function filterStaticRecipes(
  userIngredients: string[],
  cuisines?: CuisineType[],
): Promise<ScoredRecipe[]> {
  let sql = "SELECT * FROM recipes";
  const params: unknown[] = [];

  if (cuisines && cuisines.length > 0) {
    sql += " WHERE cuisine = ANY($1::text[])";
    params.push(cuisines);
  }

  const rows = await query<Record<string, unknown>>(sql, params);
  const recipes = rows.map(rowToRecipe);

  const scored = await Promise.all(
    recipes.map((r) => scoreRecipe(r, userIngredients)),
  );
  const filtered = scored.filter(
    (s) => s.missingCount <= MAX_MISSING_COUNT && s.matchRatio > 0,
  );
  return sortScoredRecipes(filtered);
}

/**
 * 사용자 레시피(user_recipes 테이블)에서 재료 기반 검색을 수행합니다.
 *
 * 동작 규칙:
 * - cuisine 필터는 DB 쿼리 레벨에서 처리
 * - 조회된 결과에 scoreRecipe 적용 후 MAX_MISSING_COUNT 초과 제외
 * - DB 오류 시 빈 배열 반환 (폴백)
 *
 * @param userIngredients - 사용자가 보유한 재료 목록
 * @param cuisines - 필터링할 cuisine 종류 (생략 시 전체)
 * @returns 점수 계산된 사용자 레시피 목록
 */
export async function searchUserRecipes(
  userIngredients: string[],
  cuisines?: CuisineType[],
): Promise<ScoredRecipe[]> {
  let sql = "SELECT *, 'user' AS source FROM user_recipes";
  const params: unknown[] = [];

  if (cuisines && cuisines.length > 0) {
    sql += " WHERE cuisine = ANY($1::text[])";
    params.push(cuisines);
  }

  const rows = await query<Record<string, unknown>>(sql, params);
  const recipes = rows.map(rowToRecipe);

  const scored = await Promise.all(
    recipes.map((r) => scoreRecipe(r, userIngredients)),
  );
  const filtered = scored.filter(
    (s) => s.missingCount <= MAX_MISSING_COUNT && s.matchRatio > 0,
  );
  return sortScoredRecipes(filtered);
}

/**
 * 큐레이션 레시피와 사용자 레시피를 통합 검색합니다.
 *
 * 동작 규칙:
 * - 큐레이션 레시피는 항상 포함
 * - 사용자 레시피는 DB 오류 시 생략 (catch → [])
 * - 통합 후 재정렬: missingCount ASC → matchRatio DESC
 *
 * @param userIngredients - 사용자가 보유한 재료 목록
 * @param cuisines - 필터링할 cuisine 종류 (생략 시 전체)
 * @returns 통합 정렬된 레시피 목록
 */
export async function searchAllRecipes(
  userIngredients: string[],
  cuisines?: CuisineType[],
): Promise<ScoredRecipe[]> {
  const [curated, user] = await Promise.all([
    filterStaticRecipes(userIngredients, cuisines),
    searchUserRecipes(userIngredients, cuisines).catch(() => []),
  ]);
  return sortScoredRecipes([...curated, ...user]);
}

/**
 * cuisine 종류별로 레시피 수를 반환합니다.
 * UI에서 필터 뱃지에 숫자를 표시할 때 사용합니다.
 *
 * @param userIngredients - 사용자가 보유한 재료 목록
 * @returns cuisine별 레시피 수 맵
 */
export async function getCuisineCounts(
  userIngredients: string[],
): Promise<Record<CuisineType, number>> {
  const all = await searchAllRecipes(userIngredients);
  const cuisines: CuisineType[] = ["korean", "chinese", "japanese", "western"];
  const counts = {} as Record<CuisineType, number>;
  for (const c of cuisines) {
    counts[c] = all.filter((s) => s.recipe.cuisine === c).length;
  }
  return counts;
}
