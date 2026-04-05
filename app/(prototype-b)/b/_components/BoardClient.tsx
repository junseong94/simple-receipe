"use client";

import { useMemo, useState } from "react";
import IngredientInput from "@/app/_components/IngredientInput";
import CuisineFilter from "@/app/_components/CuisineFilter";
import ThemeToggle from "@/app/_components/ThemeToggle";
import { filterStaticRecipes } from "@/lib/recipes/search";
import type { CuisineType } from "@/lib/recipes/types";
import BoardRecipeCard from "./BoardRecipeCard";

export default function BoardClient() {
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [activeCuisines, setActiveCuisines] = useState<CuisineType[]>([]);

  // 재료 기반 전체 결과 (cuisine 필터 전)
  const allResults = useMemo(
    () => filterStaticRecipes(ingredients),
    [ingredients],
  );

  // cuisine별 카운트 — 전체 결과에서 계산
  const cuisineCounts = useMemo(() => {
    const counts = {} as Record<CuisineType, number>;
    const cuisines: CuisineType[] = ["korean", "chinese", "japanese", "western"];
    for (const c of cuisines) {
      counts[c] = allResults.filter((s) => s.recipe.cuisine === c).length;
    }
    return counts;
  }, [allResults]);

  // cuisine 필터 적용
  const filteredResults = useMemo(() => {
    if (activeCuisines.length === 0) return allResults;
    return allResults.filter((s) => activeCuisines.includes(s.recipe.cuisine));
  }, [allResults, activeCuisines]);

  const hasIngredients = ingredients.length > 0;
  const hasResults = filteredResults.length > 0;

  return (
    <div className="min-h-screen bg-cream">
      {/* 상단 고정 헤더 */}
      <header className="sticky top-0 z-30 border-b border-black/5 bg-cream/90 backdrop-blur-sm dark:border-white/5">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <h1 className="text-lg font-bold tracking-tight text-gray-900 dark:text-gray-100">
            Simple Recipe
          </h1>
          <ThemeToggle />
        </div>

        {/* 검색바 */}
        <div className="mx-auto max-w-6xl px-4 pb-3 sm:px-6">
          <IngredientInput
            ingredients={ingredients}
            onChange={setIngredients}
            placeholder="재료를 입력하세요 (예: 돼지고기, 양파, 두부)"
          />
        </div>

        {/* 카테고리 탭 */}
        {hasIngredients && (
          <div className="mx-auto max-w-6xl overflow-x-auto px-4 pb-3 sm:px-6">
            <div className="flex items-center gap-4">
              <CuisineFilter
                activeCuisines={activeCuisines}
                onChange={setActiveCuisines}
                counts={cuisineCounts}
              />
              <span className="shrink-0 text-xs text-gray-400 dark:text-gray-500">
                {filteredResults.length}개 레시피
              </span>
            </div>
          </div>
        )}
      </header>

      {/* 결과 영역 */}
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        {!hasIngredients ? (
          /* 초기 빈 상태 */
          <div className="flex flex-col items-center justify-center gap-4 py-32 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-teal-brand/10 dark:bg-teal-brand/20">
              <svg
                className="h-10 w-10 text-teal-brand"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                />
              </svg>
            </div>
            <div>
              <p className="text-base font-medium text-gray-700 dark:text-gray-300">
                재료를 입력하면 만들 수 있는 레시피를 보여드려요
              </p>
              <p className="mt-1 text-sm text-gray-400 dark:text-gray-500">
                냉장고 속 재료를 입력해보세요
              </p>
            </div>
          </div>
        ) : !hasResults ? (
          /* 재료 입력 후 결과 없음 */
          <div className="flex flex-col items-center justify-center gap-4 py-32 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/20">
              <svg
                className="h-10 w-10 text-orange-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div>
              <p className="text-base font-medium text-gray-700 dark:text-gray-300">
                일치하는 레시피가 없어요
              </p>
              <p className="mt-1 text-sm text-gray-400 dark:text-gray-500">
                재료를 더 추가하거나 카테고리 필터를 변경해보세요
              </p>
            </div>
          </div>
        ) : (
          /* Pinterest 스타일 masonry 그리드 */
          <div
            className="columns-1 gap-4 sm:columns-2 lg:columns-3"
            style={{ columnGap: "1rem" }}
          >
            {filteredResults.map((scored) => (
              <div
                key={scored.recipe.id}
                className="mb-4 break-inside-avoid"
              >
                <BoardRecipeCard scored={scored} />
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
