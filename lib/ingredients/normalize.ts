/**
 * 재료명 정규화 유틸리티
 *
 * 사용자 입력 또는 DB에서 가져온 재료명을 일관된 형태로 변환합니다.
 * 동의어 매핑, 검색, 비교 등 모든 곳에서 정규화 후 처리해야 합니다.
 */

/**
 * 재료명에서 괄호 내용을 추출합니다.
 * 단, 괄호 안의 내용이 비어 있거나 공백만 있으면 제거합니다.
 *
 * @example
 * extractParenthetical("삼겹살(돼지)")  // → { base: "삼겹살", paren: "돼지" }
 * extractParenthetical("닭가슴살")      // → { base: "닭가슴살", paren: null }
 */
function extractParenthetical(input: string): {
  base: string;
  paren: string | null;
} {
  const match = input.match(/^(.+?)\s*\(([^)]*)\)\s*$/);
  if (!match) {
    return { base: input.trim(), paren: null };
  }
  const paren = match[2].trim();
  return {
    base: match[1].trim(),
    paren: paren.length > 0 ? paren : null,
  };
}

/**
 * 재료명을 정규화합니다.
 *
 * 적용 규칙 (순서대로):
 * 1. 양쪽 공백 제거 (trim)
 * 2. 내부 연속 공백을 단일 공백으로 압축
 * 3. 전각(full-width) 공백을 반각으로 변환
 * 4. 내부 연속 공백을 단일 공백으로 압축
 *
 * @example
 * normalizeIngredient("  삼겹살 ")         // → "삼겹살"
 * normalizeIngredient("삼겹살（돼지）")     // → "삼겹살(돼지)"
 * normalizeIngredient("닭　가슴살")         // → "닭 가슴살"
 */
export function normalizeIngredient(input: string): string {
  // 1. 양쪽 trim
  let result = input.trim();

  // 2. 전각 공백 → 반각 공백
  result = result.replace(/\u3000/g, " ");

  // 3. 전각 괄호 → 반각 괄호
  result = result.replace(/（/g, "(").replace(/）/g, ")");

  // 4. 내부 연속 공백 압축
  result = result.replace(/\s+/g, " ");

  return result;
}

/**
 * 재료명에서 괄호 내용을 제거한 베이스 이름만 반환합니다.
 *
 * @example
 * stripParenthetical("삼겹살(돼지)")   // → "삼겹살"
 * stripParenthetical("닭가슴살")       // → "닭가슴살"
 */
export function stripParenthetical(input: string): string {
  const { base } = extractParenthetical(normalizeIngredient(input));
  return base;
}

/**
 * 재료명에서 공백을 모두 제거한 압축 형태를 반환합니다.
 * 검색 등 공백 무시 비교가 필요할 때 사용합니다.
 *
 * @example
 * compactIngredient("닭 가슴살") // → "닭가슴살"
 */
export function compactIngredient(input: string): string {
  return normalizeIngredient(input).replace(/\s/g, "");
}

/**
 * 두 재료명이 정규화 기준으로 동일한지 비교합니다.
 * 동의어 매핑 없이 순수 정규화만 적용합니다.
 *
 * @example
 * isSameNormalized("  삼겹살 ", "삼겹살") // → true
 */
export function isSameNormalized(a: string, b: string): boolean {
  return normalizeIngredient(a) === normalizeIngredient(b);
}
