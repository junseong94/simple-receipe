import ingredientData from "@/data/ingredients.json";
import { normalizeIngredient } from "./normalize";

/**
 * 동의어 맵 타입: 동의어(또는 원래 이름) → 정규화된 표준 이름
 */
type SynonymMap = Map<string, string>;

/**
 * ingredients.json 데이터를 기반으로 동의어 맵을 구성합니다.
 *
 * 구성 규칙:
 * - 재료의 name 자체도 맵에 등록합니다 (자기 자신을 정규화 이름으로).
 * - aliases에 있는 모든 이름도 맵에 등록합니다.
 * - 모든 키/값은 normalizeIngredient()를 통해 정규화된 상태로 저장됩니다.
 */
function buildSynonymMap(): SynonymMap {
  const map: SynonymMap = new Map();

  for (const ingredient of ingredientData.ingredients) {
    const canonicalName = normalizeIngredient(ingredient.name);

    // 표준 이름 자체 등록
    map.set(canonicalName, canonicalName);

    // 동의어 등록
    for (const alias of ingredient.aliases) {
      const normalizedAlias = normalizeIngredient(alias);
      // 이미 다른 표준 이름으로 등록된 경우 덮어쓰지 않음
      // (첫 번째 등록을 우선시)
      if (!map.has(normalizedAlias)) {
        map.set(normalizedAlias, canonicalName);
      }
    }
  }

  return map;
}

// 모듈 레벨에서 한 번만 빌드 (싱글톤 패턴)
const synonymMap: SynonymMap = buildSynonymMap();

/**
 * 입력된 재료명에 대응하는 표준(정규화) 이름을 반환합니다.
 *
 * @example
 * getSynonymGroup("돼지삼겹살") // → "삼겹살"
 * getSynonymGroup("참치캔")    // → "참치"
 * getSynonymGroup("모르는재료") // → "모르는재료" (정규화만 적용)
 */
export function getSynonymGroup(input: string): string {
  const normalized = normalizeIngredient(input);
  return synonymMap.get(normalized) ?? normalized;
}

/**
 * 두 재료명이 같은 재료(또는 동의어)인지 여부를 반환합니다.
 *
 * @example
 * ingredientMatches("삼겹살", "돼지삼겹살") // → true
 * ingredientMatches("소금", "설탕")          // → false
 */
export function ingredientMatches(a: string, b: string): boolean {
  return getSynonymGroup(a) === getSynonymGroup(b);
}

/**
 * 동의어 맵에 등록된 모든 표준 이름 목록을 반환합니다.
 */
export function getAllCanonicalNames(): string[] {
  return ingredientData.ingredients.map((ingredient) =>
    normalizeIngredient(ingredient.name),
  );
}

/**
 * 입력된 재료명이 사전에 등록된 재료인지 여부를 반환합니다.
 * (동의어 포함)
 */
export function isKnownIngredient(input: string): boolean {
  const normalized = normalizeIngredient(input);
  return synonymMap.has(normalized);
}
