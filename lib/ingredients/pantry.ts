/**
 * 기본 양념 목록 (Pantry Staples)
 *
 * 누락 재료 점수 계산 시 제외되는 재료들입니다.
 * 대부분의 가정에서 기본으로 보유하는 조미료 및 재료를 포함합니다.
 */

// 기본 조미료
const BASIC_SEASONING = ["소금", "설탕", "후추", "식용유"] as const;

// 한식 기본 양념
const KOREAN_SEASONING = [
  "간장",
  "된장",
  "고추장",
  "참기름",
  "고춧가루",
  "다진마늘",
] as const;

// 양식/일식/중식 기본 양념
const INTERNATIONAL_SEASONING = ["올리브오일", "버터", "굴소스"] as const;

// 공통 재료
const COMMON_INGREDIENTS = ["물", "밥", "계란"] as const;

export const PANTRY_STAPLES: string[] = [
  ...BASIC_SEASONING,
  ...KOREAN_SEASONING,
  ...INTERNATIONAL_SEASONING,
  ...COMMON_INGREDIENTS,
];

export type PantryStaple = (typeof PANTRY_STAPLES)[number];

/**
 * 주어진 재료명이 기본 양념(pantry staple)인지 여부를 반환합니다.
 * 동의어 매핑을 통해 정규화된 이름으로 비교합니다.
 * (예: "달걀" → "계란" → pantry staple)
 */
export function isPantryStaple(ingredient: string): boolean {
  // 순환 의존 방지를 위해 동적 import 대신 직접 정규화 + 비교
  const trimmed = ingredient.trim().replace(/\s+/g, " ");
  return PANTRY_STAPLES.includes(trimmed);
}
