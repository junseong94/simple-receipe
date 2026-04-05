"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import IngredientInput from "@/app/_components/IngredientInput";
import CuisineFilter from "@/app/_components/CuisineFilter";
import Button from "@/app/_components/ui/Button";
import RecipeRow from "./RecipeRow";
import { filterStaticRecipes } from "@/lib/recipes/search";
import type { CuisineType, ScoredRecipe } from "@/lib/recipes/types";

const ALL_CUISINES: CuisineType[] = ["korean", "chinese", "japanese", "western"];

const CUISINE_LABELS: Record<CuisineType, string> = {
  korean: "한식",
  chinese: "중식",
  japanese: "일식",
  western: "양식",
};

function parseIngredientsParam(raw: string | null): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export default function SearchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // URL에서 초기 재료 복원 (마운트 시 1회)
  const initialIngredients = useMemo(
    () => parseIngredientsParam(searchParams.get("ingredients")),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const [ingredients, setIngredients] = useState<string[]>(initialIngredients);
  const [activeCuisines, setActiveCuisines] = useState<CuisineType[]>([]);

  const [searchResults, setSearchResults] = useState<ScoredRecipe[] | null>(
    initialIngredients.length > 0
      ? filterStaticRecipes(initialIngredients)
      : null,
  );
  const [hasSearched, setHasSearched] = useState(
    initialIngredients.length > 0,
  );

  // URL searchParams 문자열 (카드 클릭 → 레시피 페이지 이동 후 뒤로가기 복원용)
  const serializedSearchParams = useMemo(() => {
    if (ingredients.length === 0) return "";
    return `ingredients=${encodeURIComponent(ingredients.join(","))}`;
  }, [ingredients]);

  // cuisine 카운트 (필터 뱃지 숫자)
  const cuisineCounts = useMemo<Record<CuisineType, number> | undefined>(() => {
    if (!searchResults) return undefined;
    const counts = {} as Record<CuisineType, number>;
    for (const cuisine of ALL_CUISINES) {
      counts[cuisine] = searchResults.filter(
        (s) => s.recipe.cuisine === cuisine,
      ).length;
    }
    return counts;
  }, [searchResults]);

  // 필터 적용된 결과
  const filteredResults = useMemo<ScoredRecipe[]>(() => {
    if (!searchResults) return [];
    if (activeCuisines.length === 0) return searchResults;
    return searchResults.filter((s) =>
      activeCuisines.includes(s.recipe.cuisine),
    );
  }, [searchResults, activeCuisines]);

  // cuisine별 그룹핑
  const groupedResults = useMemo<Record<CuisineType, ScoredRecipe[]>>(() => {
    const groups = {} as Record<CuisineType, ScoredRecipe[]>;
    for (const cuisine of ALL_CUISINES) {
      groups[cuisine] = filteredResults.filter(
        (s) => s.recipe.cuisine === cuisine,
      );
    }
    return groups;
  }, [filteredResults]);

  // 결과가 있는 cuisine 순서 유지
  const visibleCuisines = useMemo<CuisineType[]>(
    () => ALL_CUISINES.filter((c) => groupedResults[c].length > 0),
    [groupedResults],
  );

  const handleSearch = useCallback(() => {
    if (ingredients.length === 0) return;
    const results = filterStaticRecipes(ingredients);
    setSearchResults(results);
    setHasSearched(true);
    setActiveCuisines([]);

    const params = new URLSearchParams();
    params.set("ingredients", ingredients.join(","));
    router.replace(`/a?${params.toString()}`, { scroll: false });
  }, [ingredients, router]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && ingredients.length > 0) {
        handleSearch();
      }
    },
    [handleSearch, ingredients.length],
  );

  const handleReset = useCallback(() => {
    setIngredients([]);
    setSearchResults(null);
    setHasSearched(false);
    setActiveCuisines([]);
    router.replace("/a", { scroll: false });
  }, [router]);

  const totalResults = searchResults?.length ?? 0;
  const isEmptyResult = hasSearched && totalResults === 0;

  return (
    <>
      {/* 검색 영역 */}
      <section
        className={`flex flex-col items-center text-center transition-all duration-500 ${
          hasSearched ? "py-8" : "py-16 md:py-24"
        }`}
        aria-label="재료 검색"
      >
        <div className={hasSearched ? "mb-4" : "mb-8"}>
          <h1
            className={`font-bold tracking-tight text-gray-900 transition-all duration-500 dark:text-gray-50 ${
              hasSearched ? "text-2xl md:text-3xl" : "text-3xl md:text-5xl"
            }`}
          >
            냉장고에 뭐가 있나요?
          </h1>
          {!hasSearched && (
            <p className="mt-3 text-base text-gray-500 dark:text-gray-400 md:text-lg">
              재료를 입력하면 만들 수 있는 레시피를 찾아드려요
            </p>
          )}
        </div>

        {/* 재료 입력 */}
        <div className="w-full max-w-2xl" onKeyDown={handleKeyDown}>
          <IngredientInput
            ingredients={ingredients}
            onChange={setIngredients}
            placeholder="재료를 입력하세요 (Enter 또는 콤마로 추가)"
          />
        </div>

        {/* 버튼 */}
        <div className="mt-4 flex items-center gap-3">
          <Button
            onClick={handleSearch}
            disabled={ingredients.length === 0}
            size="lg"
            className="bg-orange-brand text-white hover:bg-orange-brand-hover"
          >
            레시피 찾기
          </Button>
          {hasSearched && (
            <Button
              onClick={handleReset}
              variant="ghost"
              size="lg"
              className="text-gray-500 dark:text-gray-400"
            >
              초기화
            </Button>
          )}
        </div>

        {/* 결과 카운트 */}
        {hasSearched && !isEmptyResult && (
          <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
            <span className="font-semibold text-orange-brand">
              {totalResults}
            </span>
            개의 레시피를 찾았어요
          </p>
        )}
      </section>

      {/* 결과 영역 */}
      {hasSearched && (
        <section aria-label="검색 결과">
          {isEmptyResult ? (
            <div className="flex flex-col items-center py-20 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-orange-50 dark:bg-orange-900/20">
                <svg
                  className="h-8 w-8 text-orange-brand"
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
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                맞는 레시피가 없어요
              </h2>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                재료를 더 추가하거나 다른 재료로 다시 시도해 보세요
              </p>
            </div>
          ) : (
            <>
              {/* 카테고리 필터 탭 */}
              <div className="mb-6">
                <CuisineFilter
                  activeCuisines={activeCuisines}
                  onChange={setActiveCuisines}
                  counts={cuisineCounts}
                />
              </div>

              {/* 카테고리별 가로 스크롤 행 */}
              <div className="flex flex-col gap-8">
                {visibleCuisines.length > 0 ? (
                  visibleCuisines.map((cuisine) => (
                    <RecipeRow
                      key={cuisine}
                      title={CUISINE_LABELS[cuisine]}
                      recipes={groupedResults[cuisine]}
                      searchParams={serializedSearchParams}
                    />
                  ))
                ) : (
                  <div className="py-16 text-center">
                    <p className="text-gray-500 dark:text-gray-400">
                      선택한 카테고리에 결과가 없어요
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </section>
      )}

      {/* 초기 빈 상태 (검색 전) — 빠른 재료 추가 칩 */}
      {!hasSearched && (
        <div className="flex flex-col items-center py-8 text-center">
          <div className="flex flex-wrap justify-center gap-2">
            {["돼지고기", "김치", "두부", "계란", "양파", "마늘"].map(
              (ingredient) => (
                <button
                  key={ingredient}
                  type="button"
                  onClick={() => {
                    if (!ingredients.includes(ingredient)) {
                      setIngredients((prev) => [...prev, ingredient]);
                    }
                  }}
                  className="rounded-full border border-orange-200 bg-orange-50 px-3 py-1.5 text-sm font-medium text-orange-brand transition-colors hover:bg-orange-100 dark:border-orange-900/40 dark:bg-orange-900/20 dark:hover:bg-orange-900/30"
                >
                  + {ingredient}
                </button>
              ),
            )}
          </div>
          <p className="mt-4 text-sm text-gray-400 dark:text-gray-500">
            자주 쓰는 재료를 클릭해서 빠르게 추가하세요
          </p>
        </div>
      )}
    </>
  );
}
