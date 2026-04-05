"use client";

import { useState, useMemo, useCallback } from "react";
import IngredientInput from "@/app/_components/IngredientInput";
import YouTubeEmbed from "@/app/_components/YouTubeEmbed";
import RecipeSummary from "@/app/_components/RecipeSummary";
import MissingBadge from "@/app/_components/MissingBadge";
import { filterStaticRecipes, getCuisineCounts } from "@/lib/recipes/search";
import type { CuisineType, ScoredRecipe } from "@/lib/recipes/types";

// ─── 상수 ─────────────────────────────────────────────────────────────────────

type Step = 1 | 2 | 3;

const CUISINE_OPTIONS: {
  key: CuisineType;
  label: string;
  emoji: string;
  description: string;
  borderColor: string;
  selectedBg: string;
}[] = [
  {
    key: "korean",
    label: "한식",
    emoji: "🍲",
    description: "김치찌개, 불고기, 비빔밥",
    borderColor: "border-red-400",
    selectedBg: "bg-red-50 dark:bg-red-950/30",
  },
  {
    key: "chinese",
    label: "중식",
    emoji: "🥟",
    description: "짜장면, 탕수육, 마파두부",
    borderColor: "border-yellow-400",
    selectedBg: "bg-yellow-50 dark:bg-yellow-950/30",
  },
  {
    key: "japanese",
    label: "일식",
    emoji: "🍱",
    description: "스시, 라멘, 돈카츠",
    borderColor: "border-pink-400",
    selectedBg: "bg-pink-50 dark:bg-pink-950/30",
  },
  {
    key: "western",
    label: "양식",
    emoji: "🍝",
    description: "파스타, 스테이크, 리조또",
    borderColor: "border-blue-400",
    selectedBg: "bg-blue-50 dark:bg-blue-950/30",
  },
];

// 카테고리별 인기 재료 (ingredients.json 기반)
const INGREDIENT_CATEGORIES = [
  {
    label: "육류",
    items: ["삼겹살", "닭가슴살", "소고기불고기", "베이컨", "닭다리", "햄", "소시지", "차돌박이"],
  },
  {
    label: "해산물",
    items: ["새우", "참치", "오징어", "연어", "고등어", "조개", "게맛살", "어묵"],
  },
  {
    label: "채소",
    items: ["양파", "감자", "당근", "배추", "두부", "대파", "버섯류", "김치"],
  },
  {
    label: "기타",
    items: ["계란", "라면", "떡볶이떡", "슬라이스치즈", "우유", "밥(쌀)", "파스타면", "당면"],
  },
] as const;

// 아코디언 좌측 컬러 바
const CUISINE_ACCENT: Record<CuisineType, string> = {
  korean: "border-red-500",
  chinese: "border-yellow-500",
  japanese: "border-pink-500",
  western: "border-blue-500",
};

const CUISINE_LABEL: Record<CuisineType, string> = {
  korean: "한식",
  chinese: "중식",
  japanese: "일식",
  western: "양식",
};

const CUISINE_BADGE_COLOR: Record<CuisineType, string> = {
  korean: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  chinese: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300",
  japanese: "bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300",
  western: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
};

// ─── 서브 컴포넌트 ─────────────────────────────────────────────────────────────

/** 프로그레스 인디케이터 */
function ProgressIndicator({ currentStep }: { currentStep: Step }) {
  return (
    <div className="flex items-center justify-center gap-0 py-2">
      {([1, 2, 3] as Step[]).map((step, i) => (
        <div key={step} className="flex items-center">
          <div
            className={[
              "flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold transition-all duration-300",
              currentStep > step
                ? "bg-brand text-white"
                : currentStep === step
                  ? "bg-brand text-white ring-4 ring-brand/20"
                  : "border-2 border-gray-300 text-gray-400 dark:border-gray-600 dark:text-gray-500",
            ].join(" ")}
          >
            {currentStep > step ? (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              step
            )}
          </div>
          {i < 2 && (
            <div
              className={[
                "h-0.5 w-12 transition-all duration-300",
                currentStep > step ? "bg-brand" : "bg-gray-200 dark:bg-gray-700",
              ].join(" ")}
            />
          )}
        </div>
      ))}
    </div>
  );
}

/** Step 라벨 */
function StepLabel({ currentStep }: { currentStep: Step }) {
  const labels: Record<Step, string> = {
    1: "재료 선택",
    2: "카테고리 선택",
    3: "레시피 결과",
  };
  return (
    <p className="mt-1 text-center text-xs font-medium text-gray-500 dark:text-gray-400">
      Step {currentStep} / 3 — {labels[currentStep]}
    </p>
  );
}

/** 재료 토글 버튼 */
function IngredientToggleButton({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "flex min-h-[48px] items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-medium transition-all duration-150",
        selected
          ? "border-brand bg-brand text-white"
          : "border-gray-200 bg-white text-gray-700 hover:border-brand/50 hover:bg-blue-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:border-brand/50 dark:hover:bg-blue-900/20",
      ].join(" ")}
    >
      {selected && (
        <svg className="h-3.5 w-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
        </svg>
      )}
      {label}
    </button>
  );
}

/** 아코디언 레시피 항목 */
function RecipeAccordionItem({
  index,
  scored,
}: {
  index: number;
  scored: ScoredRecipe;
}) {
  const [open, setOpen] = useState(false);
  const { recipe, missingIngredients, missingCount } = scored;
  const accentColor = CUISINE_ACCENT[recipe.cuisine];

  return (
    <div
      className={[
        "overflow-hidden rounded-xl border border-gray-200 border-l-4 dark:border-gray-700",
        accentColor,
      ].join(" ")}
    >
      {/* 헤더 (클릭 → 아코디언 토글) */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen((prev) => !prev)}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setOpen((prev) => !prev); } }}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer"
        aria-expanded={open}
      >
        {/* 순번 */}
        <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-brand/10 text-xs font-bold text-brand dark:bg-brand/20">
          {index + 1}
        </span>

        {/* 요리명 + 뱃지 */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-semibold text-gray-900 dark:text-gray-100">
              {recipe.name}
            </span>
            <span
              className={[
                "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                CUISINE_BADGE_COLOR[recipe.cuisine],
              ].join(" ")}
            >
              {CUISINE_LABEL[recipe.cuisine]}
            </span>
            <MissingBadge
              missingIngredients={missingIngredients}
              missingCount={missingCount}
            />
          </div>
        </div>

        {/* 화살표 */}
        <svg
          className={[
            "h-5 w-5 flex-shrink-0 text-gray-400 transition-transform duration-200",
            open ? "rotate-90" : "",
          ].join(" ")}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>

      {/* 아코디언 컨텐츠 */}
      {open && (
        <div className="border-t border-gray-100 px-4 pb-4 pt-3 dark:border-gray-700/50">
          <div className="space-y-4">
            <YouTubeEmbed url={recipe.youtubeUrl} title={recipe.youtubeTitle} />
            <RecipeSummary steps={recipe.steps} summary={recipe.summary} />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── 메인 페이지 ───────────────────────────────────────────────────────────────

export default function HomePage() {
  const [step, setStep] = useState<Step>(1);
  const [selectedIngredients, setSelectedIngredients] = useState<string[]>([]);
  const [selectedCuisines, setSelectedCuisines] = useState<CuisineType[]>([
    "korean",
    "chinese",
    "japanese",
    "western",
  ]);

  // 카테고리 카운트 (Step 2에서 미리보기용)
  const cuisineCounts = useMemo(
    () => getCuisineCounts(selectedIngredients),
    [selectedIngredients],
  );

  // 검색 결과 (Step 3)
  const results = useMemo<ScoredRecipe[]>(() => {
    if (step !== 3) return [];
    return filterStaticRecipes(selectedIngredients, selectedCuisines);
  }, [step, selectedIngredients, selectedCuisines]);

  // 재료 토글
  const toggleIngredient = useCallback((ingredient: string) => {
    setSelectedIngredients((prev) =>
      prev.includes(ingredient)
        ? prev.filter((i) => i !== ingredient)
        : [...prev, ingredient],
    );
  }, []);

  // 카테고리 토글
  const toggleCuisine = useCallback((cuisine: CuisineType) => {
    setSelectedCuisines((prev) => {
      if (prev.includes(cuisine)) {
        // 최소 1개 유지
        if (prev.length === 1) return prev;
        return prev.filter((c) => c !== cuisine);
      }
      return [...prev, cuisine];
    });
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-gray-50 dark:bg-gray-950">
      {/* 헤더 */}
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white/95 backdrop-blur dark:border-gray-800 dark:bg-gray-950/95">
        <div className="mx-auto max-w-lg px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-black tracking-tight text-brand">
              레시피 보드
            </span>
            <span className="rounded-full bg-brand/10 px-2 py-0.5 text-xs font-semibold text-brand">
              BETA
            </span>
          </div>
          <ProgressIndicator currentStep={step} />
          <StepLabel currentStep={step} />
        </div>
      </header>

      {/* 콘텐츠 */}
      <main className="mx-auto w-full max-w-lg flex-1 px-4 pb-28 pt-6">
        {/* ── Step 1: 재료 선택 ── */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-50">
                어떤 재료가 있나요?
              </h1>
              <p className="mt-1 text-gray-500 dark:text-gray-400">
                냉장고에 있는 재료를 선택해주세요
              </p>
            </div>

            {/* 카테고리별 재료 버튼 */}
            {INGREDIENT_CATEGORIES.map((category) => (
              <section key={category.label}>
                <h2 className="mb-2.5 text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">
                  {category.label}
                </h2>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {category.items.map((item) => (
                    <IngredientToggleButton
                      key={item}
                      label={item}
                      selected={selectedIngredients.includes(item)}
                      onClick={() => toggleIngredient(item)}
                    />
                  ))}
                </div>
              </section>
            ))}

            {/* 자유 입력 */}
            <section>
              <h2 className="mb-2.5 text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">
                직접 입력
              </h2>
              <IngredientInput
                ingredients={selectedIngredients}
                onChange={setSelectedIngredients}
                placeholder="재료를 입력하세요 (Enter 또는 콤마로 추가)"
              />
            </section>

            {/* 선택된 재료 수 */}
            {selectedIngredients.length > 0 && (
              <div className="rounded-xl bg-blue-50 px-4 py-3 dark:bg-blue-900/20">
                <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
                  {selectedIngredients.length}개 재료 선택됨
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── Step 2: 카테고리 선택 ── */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-50">
                어떤 요리가 먹고 싶어요?
              </h1>
              <p className="mt-1 text-gray-500 dark:text-gray-400">
                여러 개 선택할 수 있어요
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {CUISINE_OPTIONS.map((cuisine) => {
                const isSelected = selectedCuisines.includes(cuisine.key);
                const count = cuisineCounts[cuisine.key];
                return (
                  <button
                    key={cuisine.key}
                    type="button"
                    onClick={() => toggleCuisine(cuisine.key)}
                    className={[
                      "relative flex flex-col items-start gap-1.5 rounded-2xl border-2 p-4 text-left transition-all duration-150",
                      isSelected
                        ? `${cuisine.borderColor} ${cuisine.selectedBg}`
                        : "border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800",
                    ].join(" ")}
                  >
                    {/* 선택 체크 */}
                    {isSelected && (
                      <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-brand">
                        <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </span>
                    )}

                    <span className="text-3xl" role="img" aria-label={cuisine.label}>
                      {cuisine.emoji}
                    </span>
                    <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
                      {cuisine.label}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {cuisine.description}
                    </span>
                    <span className="mt-1 inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                      {count}개 레시피
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Step 3: 결과 ── */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-50">
                  레시피 결과
                </h1>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {results.length > 0
                    ? `${results.length}개 레시피를 찾았어요`
                    : "조건에 맞는 레시피가 없어요"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="mt-1 flex flex-shrink-0 items-center gap-1.5 rounded-xl border border-brand/30 bg-blue-50 px-3 py-2 text-sm font-medium text-brand transition-colors hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/40"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                다시 검색
              </button>
            </div>

            {results.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 py-16 dark:border-gray-700">
                <span className="text-5xl" role="img" aria-label="냄비">🍳</span>
                <p className="mt-4 text-base font-semibold text-gray-600 dark:text-gray-400">
                  선택한 재료로 만들 수 있는 레시피가 없습니다
                </p>
                <p className="mt-1 text-sm text-gray-400 dark:text-gray-500">
                  재료를 더 추가하거나 카테고리를 바꿔보세요
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {results.map((scored, index) => (
                  <RecipeAccordionItem
                    key={scored.recipe.id}
                    index={index}
                    scored={scored}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* 하단 고정 버튼 */}
      <div className="fixed bottom-0 left-0 right-0 z-10 border-t border-gray-200 bg-white/95 backdrop-blur dark:border-gray-800 dark:bg-gray-950/95">
        <div className="mx-auto max-w-lg px-4 py-3">
          {step === 1 && (
            <button
              type="button"
              onClick={() => setStep(2)}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-4 text-base font-bold text-white transition-colors hover:bg-brand-hover active:scale-[0.98]"
            >
              다음
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}

          {step === 2 && (
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-gray-300 bg-white px-5 py-4 text-base font-bold text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                </svg>
                이전
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                disabled={selectedCuisines.length === 0}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand py-4 text-base font-bold text-white transition-colors hover:bg-brand-hover active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
              >
                레시피 보기
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          )}

          {step === 3 && (
            <button
              type="button"
              onClick={() => setStep(2)}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-gray-300 bg-white py-4 text-base font-bold text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
              </svg>
              카테고리 변경
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
