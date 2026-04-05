#!/usr/bin/env node
/**
 * generate-seed-sql.mjs
 * data/recipes.json + data/ingredients.json → scripts/seed.sql 자동 생성
 *
 * 실행: node scripts/generate-seed-sql.mjs
 */

import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

// ── JSON 읽기 ────────────────────────────────────────────────
const recipes = JSON.parse(readFileSync(resolve(root, "data/recipes.json"), "utf-8"));
const { ingredients } = JSON.parse(readFileSync(resolve(root, "data/ingredients.json"), "utf-8"));

// ── SQL 이스케이프 헬퍼 ──────────────────────────────────────
/** 단일 SQL 문자열 리터럴 이스케이프 (작은따옴표 → 두 개) */
function esc(str) {
  if (str == null) return "NULL";
  return `'${String(str).replace(/'/g, "''")}'`;
}

/** 문자열 배열 → PostgreSQL ARRAY 리터럴 */
function arr(items) {
  if (!Array.isArray(items) || items.length === 0) return "ARRAY[]::TEXT[]";
  const escaped = items.map((s) => `'${String(s).replace(/'/g, "''")}'`).join(",");
  return `ARRAY[${escaped}]`;
}

/** nullable 문자열 */
function escOrNull(str) {
  if (str == null || str === "") return "NULL";
  return esc(str);
}

// ── recipes INSERT 생성 ──────────────────────────────────────
const recipeRows = recipes.map((r) => {
  return (
    `  (${esc(r.id)}, ${esc(r.name)}, ${esc(r.cuisine)}, ${esc(r.difficulty)}, ` +
    `${escOrNull(r.cookTime)}, ${r.servings ?? 2}, ` +
    `${arr(r.ingredients)}, ${arr(r.seasonings)}, ${arr(r.steps)}, ` +
    `${escOrNull(r.youtubeUrl)}, ${escOrNull(r.youtubeTitle)}, ${escOrNull(r.channelName)}, ` +
    `${escOrNull(r.thumbnailUrl)}, ${escOrNull(r.summary)}, 'curated')`
  );
});

// ── ingredients INSERT 생성 ──────────────────────────────────
const ingredientRows = ingredients.map((ing) => {
  return `  (${esc(ing.name)}, ${arr(ing.aliases)}, ${esc(ing.category)})`;
});

// ── SQL 파일 조립 ────────────────────────────────────────────
const sql = `-- scripts/seed.sql
-- 자동 생성 파일: node scripts/generate-seed-sql.mjs
-- 생성일: ${new Date().toISOString()}
-- 레시피: ${recipes.length}개 / 재료: ${ingredients.length}개
-- ON CONFLICT DO NOTHING 으로 멱등성 보장

-- ============================================================
-- recipes (큐레이션 레시피 ${recipes.length}개)
-- ============================================================
INSERT INTO recipes
  (id, name, cuisine, difficulty, cook_time, servings,
   ingredients, seasonings, steps,
   youtube_url, youtube_title, channel_name, thumbnail_url, summary, source)
VALUES
${recipeRows.join(",\n")}
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- ingredients (재료 사전 ${ingredients.length}개)
-- ============================================================
INSERT INTO ingredients (name, aliases, category)
VALUES
${ingredientRows.join(",\n")}
ON CONFLICT (name) DO NOTHING;
`;

const outPath = resolve(__dirname, "seed.sql");
writeFileSync(outPath, sql, "utf-8");
console.log(`seed.sql generated: ${outPath}`);
console.log(`  recipes   : ${recipes.length}`);
console.log(`  ingredients: ${ingredients.length}`);
