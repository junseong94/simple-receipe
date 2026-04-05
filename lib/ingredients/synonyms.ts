"use server";

import { query } from "@/lib/db/client";
import { normalizeIngredient } from "./normalize";

/**
 * 동의어 맵: 정규화된 입력 → 정규화된 표준 이름
 * DB에서 한 번 로드 후 모듈 스코프에서 캐싱합니다.
 */
let cachedMap: Map<string, string> | null = null;

async function buildSynonymMap(): Promise<Map<string, string>> {
  if (cachedMap) return cachedMap;

  const rows = await query<{ name: string; aliases: string[] }>(
    "SELECT name, aliases FROM ingredients",
  );

  const map = new Map<string, string>();
  for (const { name, aliases } of rows) {
    const canonical = normalizeIngredient(name);
    map.set(canonical, canonical);
    for (const alias of aliases) {
      const normalized = normalizeIngredient(alias);
      if (!map.has(normalized)) {
        map.set(normalized, canonical);
      }
    }
  }

  cachedMap = map;
  return map;
}

/**
 * 입력된 재료명에 대응하는 표준(정규화) 이름을 반환합니다.
 *
 * @example
 * await getSynonymGroup("돼지삼겹살") // → "삼겹살"
 * await getSynonymGroup("참치캔")    // → "참치"
 */
export async function getSynonymGroup(input: string): Promise<string> {
  const map = await buildSynonymMap();
  const normalized = normalizeIngredient(input);
  return map.get(normalized) ?? normalized;
}

/**
 * 두 재료명이 같은 재료(또는 동의어)인지 여부를 반환합니다.
 */
export async function ingredientMatches(a: string, b: string): Promise<boolean> {
  return (await getSynonymGroup(a)) === (await getSynonymGroup(b));
}

/**
 * 동의어 맵에 등록된 모든 표준 이름 목록을 반환합니다.
 */
export async function getAllCanonicalNames(): Promise<string[]> {
  const map = await buildSynonymMap();
  // map에서 canonical(value) 값만 중복 없이 수집
  return [...new Set(map.values())];
}

/**
 * 입력된 재료명이 사전에 등록된 재료인지 여부를 반환합니다.
 * (동의어 포함)
 */
export async function isKnownIngredient(input: string): Promise<boolean> {
  const map = await buildSynonymMap();
  const normalized = normalizeIngredient(input);
  return map.has(normalized);
}
