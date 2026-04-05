/**
 * 레시피 검색 및 필터링 모듈
 *
 * 정적 JSON 데이터와 Supabase 사용자 레시피를 통합하여
 * 재료 기반 검색과 cuisine 필터를 처리합니다.
 * 클라이언트 사이드와 서버 사이드 모두에서 실행 가능합니다.
 */

import recipesData from "@/data/recipes.json";
import type { CuisineType, Recipe, ScoredRecipe } from "@/lib/recipes/types";
import { scoreRecipe, sortScoredRecipes } from "@/lib/recipes/scorer";
import { supabase } from "@/lib/supabase";

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
 * Supabase user_recipes 행을 도메인 Recipe 타입으로 변환합니다.
 */
function rowToRecipe(row: Record<string, unknown>): Recipe {
  return {
    id: row.id as string,
    name: row.name as string,
    cuisine: row.cuisine as CuisineType,
    difficulty: row.difficulty as Recipe["difficulty"],
    cookTime: (row.cook_time as string) ?? "",
    servings: (row.servings as number) ?? 2,
    ingredients: (row.ingredients as string[]) ?? [],
    seasonings: (row.seasonings as string[]) ?? [],
    steps: (row.steps as string[]) ?? [],
    youtubeUrl: (row.youtube_url as string) ?? "",
    youtubeTitle: (row.youtube_title as string) ?? "",
    channelName: (row.channel_name as string) ?? "",
    thumbnailUrl: (row.thumbnail_url as string) ?? "",
    summary: (row.summary as string) ?? "",
    source: "user",
  };
}

/**
 * Supabase user_recipes에서 재료 기반 검색을 수행합니다.
 *
 * 동작 규칙:
 * - Supabase 미설정 시 빈 배열 반환 (폴백)
 * - cuisine 필터는 Supabase 쿼리 레벨에서 처리
 * - 조회된 결과에 scoreRecipe 적용 후 MAX_MISSING_COUNT 초과 제외
 *
 * @param userIngredients - 사용자가 보유한 재료 목록
 * @param cuisines - 필터링할 cuisine 종류 (생략 시 전체)
 * @returns 점수 계산된 사용자 레시피 목록
 */
export async function searchUserRecipes(
  userIngredients: string[],
  cuisines?: CuisineType[],
): Promise<ScoredRecipe[]> {
  if (!supabase) {
    return [];
  }

  try {
    let query = supabase
      .from("user_recipes")
      .select(
        "id, author_name, name, cuisine, difficulty, cook_time, servings, ingredients, seasonings, steps, youtube_url, youtube_title, channel_name, thumbnail_url, summary",
      );

    // cuisine 필터 적용
    if (cuisines && cuisines.length > 0) {
      query = query.in("cuisine", cuisines);
    }

    const { data, error } = await query;

    if (error || !data) {
      console.error("[searchUserRecipes] Supabase query error:", error);
      return [];
    }

    // 점수 계산 및 필터링
    const scored = data
      .map((row) => scoreRecipe(rowToRecipe(row as Record<string, unknown>), userIngredients))
      .filter((s) => s.missingCount <= MAX_MISSING_COUNT);

    return sortScoredRecipes(scored);
  } catch (err) {
    // Supabase 장애 시 폴백: 빈 배열 반환
    console.error("[searchUserRecipes] Unexpected error:", err);
    return [];
  }
}

/**
 * 정적 큐레이션 레시피와 사용자 레시피를 통합 검색합니다.
 *
 * 동작 규칙:
 * - 정적 레시피는 항상 포함 (Supabase 장애 폴백 포함)
 * - 사용자 레시피는 Supabase 가용 시 포함, 장애 시 생략
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
  const [staticResults, userResults] = await Promise.all([
    Promise.resolve(filterStaticRecipes(userIngredients, cuisines)),
    searchUserRecipes(userIngredients, cuisines),
  ]);

  // 통합 후 재정렬
  return sortScoredRecipes([...staticResults, ...userResults]);
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
