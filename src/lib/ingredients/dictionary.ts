"use server";

import { query } from "@/lib/db/client";
import type { Ingredient } from "@/lib/recipes/types";

/**
 * DB에서 전체 재료 목록을 조회합니다.
 */
export async function getAllIngredients(): Promise<Ingredient[]> {
  const rows = await query<Ingredient>(
    "SELECT name, aliases, category FROM ingredients ORDER BY name",
  );
  return rows;
}

/**
 * DB에서 재료 이름 목록만 조회합니다.
 */
export async function getIngredientNames(): Promise<string[]> {
  const ingredients = await getAllIngredients();
  return ingredients.map((i) => i.name);
}
