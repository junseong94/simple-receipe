/**
 * 레시피 점수 계산 모듈
 *
 * 사용자가 보유한 재료를 기준으로 레시피의 누락 재료 수를 계산합니다.
 * seasonings(기본 양념)은 점수 계산에서 완전 제외하고,
 * ingredients(필수 재료)만 대상으로 매칭합니다.
 */

import { normalizeIngredient } from "@/lib/ingredients/normalize";
import { ingredientMatches } from "@/lib/ingredients/synonyms";
import type { Recipe, ScoredRecipe } from "@/lib/recipes/types";

/**
 * 재료 문자열에서 수량/단위를 제거하고 재료명만 추출합니다.
 *
 * recipes.json의 ingredients 필드는 "삼겹살 300g", "달걀 4개" 형식이므로
 * 매칭 시 수량 표기를 걷어내야 합니다.
 *
 * @example
 * extractIngredientName("삼겹살 300g")   // → "삼겹살"
 * extractIngredientName("달걀 4개")       // → "달걀"
 * extractIngredientName("상추")           // → "상추"
 * extractIngredientName("애호박 반개")    // → "애호박"
 */
export function extractIngredientName(raw: string): string {
  const normalized = normalizeIngredient(raw);

  // 수량/단위 패턴 제거: 숫자 + 단위(g, kg, ml, L, 개, 컵, T, t, 장, 인분, 대, 모, 약간, 조금 등)
  // 또는 한글 수량어(반, 약간, 조금, 적당량)만 있는 경우
  const withoutAmount = normalized
    // "300g", "1개", "2컵", "0.5T" 등 숫자+단위 제거
    .replace(
      /\s*[\d.]+\s*(g|kg|ml|L|개|컵|T|t|장|대|모|쪽|줄기|뿌리|봉지|캔|팩|인분|조각|줌|꼬집|스푼|테이블스푼|큰술|작은술)\s*$/i,
      "",
    )
    // "약간", "조금", "적당량", "반개", "반모" 등 한글 수량어 제거
    .replace(/\s*(약간|조금|적당량|반개|반모|반컵|조각|한입)\s*$/, "")
    .trim();

  return withoutAmount || normalized;
}

/**
 * 레시피에 점수를 매겨 ScoredRecipe를 반환합니다.
 *
 * 점수 계산 규칙:
 * - seasonings(기본 양념)은 점수 계산에서 완전 제외
 * - ingredients(필수 재료)만 대상으로 매칭
 * - matched: 사용자가 보유한 필수 재료 목록
 * - missing: 사용자가 미보유한 필수 재료 목록
 * - missingCount: missing.length
 * - matchRatio: matched.length / required.length (required가 0이면 1)
 *
 * @param recipe - 점수를 계산할 레시피
 * @param userIngredients - 사용자가 보유한 재료 목록 (정규화 전 원본)
 */
export function scoreRecipe(
  recipe: Recipe,
  userIngredients: string[],
): ScoredRecipe {
  // 1. 사용자 재료 정규화 (매칭 성능을 위해 미리 처리)
  const normalizedUserIngredients = userIngredients.map((i) =>
    extractIngredientName(i),
  );

  // 2. 필수 재료(ingredients)만 대상으로 매칭
  //    seasonings는 점수 계산에서 완전 제외
  const requiredIngredients = recipe.ingredients;

  const matchedIngredients: string[] = [];
  const missingIngredients: string[] = [];

  for (const recipeIngredient of requiredIngredients) {
    // 수량 표기 제거 후 재료명 추출
    const recipeIngredientName = extractIngredientName(recipeIngredient);

    // 사용자 재료 중 일치하는 것이 있는지 확인 (동의어 포함)
    const isMatched = normalizedUserIngredients.some((userIngredient) =>
      ingredientMatches(recipeIngredientName, userIngredient),
    );

    if (isMatched) {
      matchedIngredients.push(recipeIngredient);
    } else {
      missingIngredients.push(recipeIngredient);
    }
  }

  // 3. 점수 계산
  const missingCount = missingIngredients.length;
  const matchRatio =
    requiredIngredients.length === 0
      ? 1
      : matchedIngredients.length / requiredIngredients.length;

  return {
    recipe,
    matchedIngredients,
    missingIngredients,
    missingCount,
    matchRatio,
  };
}

/**
 * ScoredRecipe 배열을 정렬 기준에 따라 정렬합니다.
 *
 * 정렬 규칙:
 * - 1순위: missingCount 오름차순 (누락 재료 적은 순)
 * - 2순위: matchRatio 내림차순 (매칭 비율 높은 순)
 */
export function sortScoredRecipes(recipes: ScoredRecipe[]): ScoredRecipe[] {
  return [...recipes].sort((a, b) => {
    // 1순위: missingCount 오름차순
    if (a.missingCount !== b.missingCount) {
      return a.missingCount - b.missingCount;
    }
    // 2순위: matchRatio 내림차순
    return b.matchRatio - a.matchRatio;
  });
}
