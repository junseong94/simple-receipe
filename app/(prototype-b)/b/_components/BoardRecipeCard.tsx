"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import type { ScoredRecipe } from "@/lib/recipes/types";

interface BoardRecipeCardProps {
  scored: ScoredRecipe;
}

const CUISINE_LABELS = {
  korean: "한식",
  chinese: "중식",
  japanese: "일식",
  western: "양식",
} as const;

const DIFFICULTY_LABELS = {
  easy: "쉬움",
  medium: "보통",
  hard: "어려움",
} as const;

/** 보유 재료 수와 미보유 재료 수를 기반으로 격려 문구를 반환합니다. */
function getEncouragementText(
  missingCount: number,
  matchRatio: number,
): string {
  if (missingCount === 0) return "재료 완벽! 바로 만들어보세요";
  if (missingCount === 1) return "1개만 더 사면 돼요!";
  if (missingCount === 2) return "2개만 더 있으면 완성!";
  if (missingCount === 3) return "3개만 더 사면 돼요!";
  if (matchRatio >= 0.7) return "거의 다 있어요!";
  return `재료 ${Math.round(matchRatio * 100)}% 보유 중`;
}

/** 격려 문구에 맞는 텍스트 색상을 반환합니다. */
function getEncouragementColor(missingCount: number): string {
  if (missingCount === 0)
    return "text-teal-brand dark:text-teal-brand font-semibold";
  if (missingCount <= 2) return "text-amber-600 dark:text-amber-400";
  return "text-orange-500 dark:text-orange-400";
}

export default function BoardRecipeCard({ scored }: BoardRecipeCardProps) {
  const router = useRouter();
  const { recipe: r, matchedIngredients, missingIngredients, missingCount, matchRatio } = scored;

  const totalDots = matchedIngredients.length + missingIngredients.length;
  const encouragement = getEncouragementText(missingCount, matchRatio);
  const encouragementColor = getEncouragementColor(missingCount);

  function handleClick() {
    router.push(`/recipe/${r.id}`);
  }

  return (
    <article
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick();
        }
      }}
      tabIndex={0}
      role="button"
      aria-label={`${r.name} 레시피 보기`}
      className="group cursor-pointer overflow-hidden rounded-2xl bg-white shadow-sm transition-shadow duration-200 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-brand dark:bg-zinc-900"
    >
      {/* 썸네일 */}
      <div className="relative w-full overflow-hidden bg-gray-100 dark:bg-zinc-800" style={{ paddingBottom: "56.25%" }}>
        {r.thumbnailUrl ? (
          <Image
            src={r.thumbnailUrl}
            alt={r.name}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <svg
              className="h-12 w-12 text-gray-300 dark:text-zinc-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
        )}
      </div>

      {/* 카드 본문 */}
      <div className="flex flex-col gap-2.5 p-4">
        {/* 요리명 + 카테고리 뱃지 */}
        <div className="flex items-start justify-between gap-2">
          <h3 className="line-clamp-2 flex-1 text-sm font-semibold leading-snug text-gray-900 dark:text-gray-100">
            {r.name}
          </h3>
          <span className="shrink-0 rounded-full bg-teal-brand/10 px-2 py-0.5 text-xs font-medium text-teal-brand dark:bg-teal-brand/20">
            {CUISINE_LABELS[r.cuisine]}
          </span>
        </div>

        {/* 컬러 도트 + 격려 텍스트 */}
        {totalDots > 0 && (
          <div className="flex items-center gap-2">
            {/* 도트 그룹 */}
            <div className="flex flex-wrap gap-1" aria-hidden="true">
              {matchedIngredients.map((ing) => (
                <span
                  key={`have-${ing}`}
                  className="h-2 w-2 rounded-full bg-green-500"
                  title={`보유: ${ing}`}
                />
              ))}
              {missingIngredients.map((ing) => (
                <span
                  key={`miss-${ing}`}
                  className="h-2 w-2 rounded-full bg-orange-400"
                  title={`미보유: ${ing}`}
                />
              ))}
            </div>
            {/* 격려 텍스트 */}
            <span className={`text-xs ${encouragementColor}`}>
              {encouragement}
            </span>
          </div>
        )}

        {/* 난이도 + 조리시간 */}
        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <span>{DIFFICULTY_LABELS[r.difficulty]}</span>
          <span aria-hidden="true">·</span>
          <span>{r.cookTime}</span>
        </div>
      </div>
    </article>
  );
}
