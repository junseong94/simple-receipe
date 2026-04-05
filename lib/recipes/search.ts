/**
 * 레시피 검색 및 필터링 모듈
 *
 * 정적 JSON 데이터에서 재료 기반 검색과 cuisine 필터를 처리합니다.
 * 클라이언트 사이드와 서버 사이드 모두에서 실행 가능합니다.
 */

import recipesData from "@/data/recipes.json";
import type { CuisineType, Recipe, ScoredRecipe } from "@/lib/recipes/types";
import { scoreRecipe, sortScoredRecipes } from "@/lib/recipes/scorer";

/** missingCount가 이 값을 초과하는 레시피는 결과에서 제외 */
const MAX_MISSING_COUNT = 3;

/**
 * 정적 레시피 JSON에서 재료 기반 검색을 수행합니다.
 *
 * 동작 규칙:
 * 1. cuisine 필터 적용 (cuisines가 undefined이거나 비어있으면 전체 레시피 대상)
 * 2. 각 레시피에 scoreRecipe 적용
 * 3. missingCount > 3인 레시피 제외
 * 4. 정렬: missingCount ASC → matchRatio DESC
 *
 * @param userIngredients - 사용자가 보유한 재료 목록 (빈 배열 허용)
 * @param cuisines - 필터링할 cuisine 종류 (생략 시 전체)
 * @returns 점수 계산 및 정렬된 레시피 목록
 */
export function filterStaticRecipes(
  userIngredients: string[],
  cuisines?: CuisineType[],
): ScoredRecipe[] {
  const recipes = recipesData as Recipe[];

  // 1. cuisine 필터 적용
  const filteredByCuisine =
    cuisines === undefined || cuisines.length === 0
      ? recipes
      : recipes.filter((recipe) => cuisines.includes(recipe.cuisine));

  // 2. 각 레시피에 점수 계산 적용
  const scoredRecipes = filteredByCuisine.map((recipe) =>
    scoreRecipe(recipe, userIngredients),
  );

  // 3. missingCount > 3인 레시피 제외
  const withinThreshold = scoredRecipes.filter(
    (scored) => scored.missingCount <= MAX_MISSING_COUNT,
  );

  // 4. 정렬: missingCount ASC → matchRatio DESC
  return sortScoredRecipes(withinThreshold);
}

/**
 * cuisine 종류별로 레시피 수를 반환합니다.
 * UI에서 필터 뱃지에 숫자를 표시할 때 사용합니다.
 *
 * @param userIngredients - 사용자가 보유한 재료 목록
 * @returns cuisine별 레시피 수 맵
 */
export function getCuisineCounts(
  userIngredients: string[],
): Record<CuisineType, number> {
  // 한 번만 스코어링 후 cuisine별 그룹핑 (4회 반복 호출 방지)
  const all = filterStaticRecipes(userIngredients);
  const cuisines: CuisineType[] = ["korean", "chinese", "japanese", "western"];
  const counts = {} as Record<CuisineType, number>;

  for (const cuisine of cuisines) {
    counts[cuisine] = all.filter((s) => s.recipe.cuisine === cuisine).length;
  }

  return counts;
}
