/**
 * 검색 시나리오 검증 스크립트 (#22)
 *
 * 실행 방법: node scripts/verify-search.mjs
 *
 * 검증 항목:
 * 1. "삼겹살" 검색 → 삼겹살구이, 제육볶음 등 반환
 * 2. "상추, 참치, 김치" 검색 → 참치비빔밥 등 최소재료 레시피 반환
 * 3. 누락 4개 이상 레시피 제외 확인
 * 4. 빈 재료로 검색 시 동작 확인
 */

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, "..");

// ──────────────────────────────────────────────
// 인라인 구현 (TS 컴파일 없이 직접 검증)
// ──────────────────────────────────────────────

const recipesRaw = readFileSync(join(projectRoot, "data/recipes.json"), "utf-8");
const ingredientsRaw = readFileSync(join(projectRoot, "data/ingredients.json"), "utf-8");
const recipes = JSON.parse(recipesRaw);
const ingredientData = JSON.parse(ingredientsRaw);

// 동의어 맵 빌드
function normalizeIngredient(input) {
  let result = input.trim();
  result = result.replace(/\u3000/g, " ");
  result = result.replace(/（/g, "(").replace(/）/g, ")");
  result = result.replace(/\s+/g, " ");
  return result;
}

function buildSynonymMap() {
  const map = new Map();
  for (const ingredient of ingredientData.ingredients) {
    const canonical = normalizeIngredient(ingredient.name);
    map.set(canonical, canonical);
    for (const alias of ingredient.aliases) {
      const normalized = normalizeIngredient(alias);
      if (!map.has(normalized)) {
        map.set(normalized, canonical);
      }
    }
  }
  return map;
}

const synonymMap = buildSynonymMap();

function getSynonymGroup(input) {
  const normalized = normalizeIngredient(input);
  return synonymMap.get(normalized) ?? normalized;
}

function ingredientMatches(a, b) {
  return getSynonymGroup(a) === getSynonymGroup(b);
}

function extractIngredientName(raw) {
  const normalized = normalizeIngredient(raw);
  const withoutAmount = normalized
    .replace(/\s*[\d.]+\s*(g|kg|ml|L|개|컵|T|t|장|대|모|쪽|줄기|뿌리|봉지|캔|팩|인분|조각|줌|꼬집|스푼|테이블스푼|큰술|작은술)\s*$/i, "")
    .replace(/\s*(약간|조금|적당량|반개|반모|반컵|조각|한입)\s*$/, "")
    .trim();
  return withoutAmount || normalized;
}

function scoreRecipe(recipe, userIngredients) {
  const normalizedUser = userIngredients.map(normalizeIngredient);
  const matched = [];
  const missing = [];

  for (const ri of recipe.ingredients) {
    const riName = extractIngredientName(ri);
    const isMatched = normalizedUser.some((ui) => ingredientMatches(riName, ui));
    if (isMatched) matched.push(ri);
    else missing.push(ri);
  }

  const missingCount = missing.length;
  const matchRatio =
    recipe.ingredients.length === 0 ? 1 : matched.length / recipe.ingredients.length;

  return { recipe, matchedIngredients: matched, missingIngredients: missing, missingCount, matchRatio };
}

function sortScoredRecipes(scored) {
  return [...scored].sort((a, b) => {
    if (a.missingCount !== b.missingCount) return a.missingCount - b.missingCount;
    return b.matchRatio - a.matchRatio;
  });
}

function filterStaticRecipes(userIngredients, cuisines) {
  const filtered =
    !cuisines || cuisines.length === 0
      ? recipes
      : recipes.filter((r) => cuisines.includes(r.cuisine));

  const scored = filtered.map((r) => scoreRecipe(r, userIngredients));
  const withinThreshold = scored.filter((s) => s.missingCount <= 3);
  return sortScoredRecipes(withinThreshold);
}

// ──────────────────────────────────────────────
// 검증 실행
// ──────────────────────────────────────────────

let allPassed = true;

function assert(condition, message) {
  if (condition) {
    console.log(`  PASS  ${message}`);
  } else {
    console.error(`  FAIL  ${message}`);
    allPassed = false;
  }
}

console.log("\n=== 검색 시나리오 검증 ===\n");

// ─── 시나리오 1: "삼겹살" 단일 재료 검색 ───
console.log("1. 삼겹살 단일 재료 검색");
{
  const results = filterStaticRecipes(["삼겹살"]);
  const names = results.map((r) => r.recipe.name);
  console.log(`   결과 ${results.length}건: ${names.slice(0, 5).join(", ")}${results.length > 5 ? "..." : ""}`);

  // 삼겹살구이, 김치찌개가 결과에 포함되어야 함 (missingCount <= 3)
  const hasSamgyeopsal = results.some((r) => r.recipe.name.includes("삼겹살구이"));
  const hasKimchiStew = results.some((r) => r.recipe.name.includes("김치찌개"));
  assert(hasSamgyeopsal, "삼겹살구이가 결과에 포함되어야 함 (missingCount <= 3)");
  assert(hasKimchiStew, "김치찌개가 결과에 포함되어야 함 (삼겹살 재료 매칭)");
  assert(
    results.every((r) => r.missingCount <= 3),
    "모든 결과의 missingCount <= 3",
  );

  // 정렬 검증: missingCount 오름차순 (전체 순서 검증)
  let sortedCorrectly = true;
  for (let i = 1; i < results.length; i++) {
    if (results[i - 1].missingCount > results[i].missingCount) {
      sortedCorrectly = false;
      break;
    }
  }
  assert(sortedCorrectly, "결과 전체가 missingCount 오름차순으로 정렬되어야 함");

  // 동점 시 matchRatio 내림차순 검증
  let matchRatioCorrect = true;
  for (let i = 1; i < results.length; i++) {
    if (
      results[i - 1].missingCount === results[i].missingCount &&
      results[i - 1].matchRatio < results[i].matchRatio
    ) {
      matchRatioCorrect = false;
      break;
    }
  }
  assert(matchRatioCorrect, "동점 시 matchRatio 내림차순으로 정렬되어야 함");

  // 삼겹살이 실제로 매칭되는지 확인
  const samgyeopsalRecipe = results.find((r) => r.recipe.name === "삼겹살구이");
  if (samgyeopsalRecipe) {
    console.log(
      `   삼겹살구이: missingCount=${samgyeopsalRecipe.missingCount}, matchRatio=${samgyeopsalRecipe.matchRatio.toFixed(2)}`,
    );
    console.log(`   매칭 재료: ${samgyeopsalRecipe.matchedIngredients.join(", ")}`);
    console.log(`   누락 재료: ${samgyeopsalRecipe.missingIngredients.join(", ")}`);
    assert(
      samgyeopsalRecipe.matchedIngredients.length >= 1,
      "삼겹살구이에서 삼겹살이 매칭되어야 함",
    );
  }
}

// ─── 시나리오 2: "상추, 참치, 김치" 다중 재료 검색 ───
console.log("\n2. 상추 + 참치 + 김치 다중 재료 검색");
{
  const results = filterStaticRecipes(["상추", "참치", "김치"]);
  const names = results.map((r) => r.recipe.name);
  console.log(`   결과 ${results.length}건: ${names.slice(0, 5).join(", ")}${results.length > 5 ? "..." : ""}`);

  // 참치비빔밥이 있어야 함 (상추, 참치 매칭)
  const tuna = results.find((r) => r.recipe.name.includes("참치비빔밥"));
  assert(!!tuna, "참치비빔밥이 결과에 포함되어야 함");
  if (tuna) {
    console.log(`   참치비빔밥 missingCount=${tuna.missingCount}, matchRatio=${tuna.matchRatio.toFixed(2)}`);
    console.log(`   매칭: ${tuna.matchedIngredients.join(", ")}`);
    console.log(`   누락: ${tuna.missingIngredients.join(", ")}`);
    assert(tuna.missingCount <= 3, "참치비빔밥 missingCount <= 3");
  }

  // 김치찌개가 결과에 있어야 함 (김치 매칭)
  const kimchiStew = results.find((r) => r.recipe.name.includes("김치찌개"));
  if (kimchiStew) {
    console.log(`   김치찌개 missingCount=${kimchiStew.missingCount}`);
  }
  assert(
    results.every((r) => r.missingCount <= 3),
    "모든 결과의 missingCount <= 3",
  );
}

// ─── 시나리오 3: 누락 4개 이상 레시피 제외 확인 ───
console.log("\n3. 누락 4개 이상 레시피 제외 확인");
{
  // 빈 재료로 검색하면 ingredients가 4개 이상인 레시피는 제외되어야 함
  const results = filterStaticRecipes([]);
  const allUnder4 = results.every((r) => r.missingCount <= 3);
  assert(allUnder4, "빈 재료 검색 시 missingCount > 3 레시피 없음");

  // 전체 레시피에서 ingredients.length > 3인 것들 찾기
  const complexRecipes = recipes.filter((r) => r.ingredients.length > 3);
  console.log(`   ingredients > 3개인 레시피: ${complexRecipes.length}건`);
  // 이 레시피들이 결과에서 제외되었는지 확인
  const excludedFromResults = complexRecipes.filter(
    (r) => !results.some((s) => s.recipe.id === r.id),
  );
  console.log(`   제외된 복잡 레시피: ${excludedFromResults.length}건 (${excludedFromResults.map((r) => r.name).join(", ")})`);
  assert(
    excludedFromResults.length === complexRecipes.length,
    "빈 재료 검색 시 ingredients > 3개인 레시피는 모두 제외됨",
  );
}

// ─── 시나리오 4: 빈 재료로 검색 ───
console.log("\n4. 빈 재료 검색 동작 확인");
{
  const results = filterStaticRecipes([]);
  console.log(`   결과 ${results.length}건`);
  assert(Array.isArray(results), "배열을 반환해야 함");
  assert(results.length >= 0, "빈 배열 이상의 결과를 반환해야 함");

  // ingredients가 3개 이하인 레시피만 포함되어야 함 (빈 재료 = 전부 미보유)
  const simpleRecipes = recipes.filter((r) => r.ingredients.length <= 3);
  console.log(`   ingredients <= 3개인 레시피: ${simpleRecipes.length}건`);
  assert(
    results.length === simpleRecipes.length,
    `빈 재료 검색 시 결과 수 = ingredients <= 3개인 레시피 수 (기대: ${simpleRecipes.length}, 실제: ${results.length})`,
  );
}

// ─── 시나리오 5: cuisine 필터 동작 확인 ───
console.log("\n5. cuisine 필터 동작 확인");
{
  const koreanOnly = filterStaticRecipes(["삼겹살"], ["korean"]);
  assert(
    koreanOnly.every((r) => r.recipe.cuisine === "korean"),
    "korean 필터 적용 시 모든 결과가 korean",
  );
  console.log(`   korean 필터 결과: ${koreanOnly.length}건`);

  const allCuisines = filterStaticRecipes(["삼겹살"]);
  assert(
    allCuisines.length >= koreanOnly.length,
    "필터 없는 검색 >= korean 필터 검색",
  );
}

// ─── 결과 요약 ───
console.log("\n─────────────────────────────");
if (allPassed) {
  console.log("모든 시나리오 통과\n");
} else {
  console.error("일부 시나리오 실패 — 위 로그 확인\n");
  process.exit(1);
}
