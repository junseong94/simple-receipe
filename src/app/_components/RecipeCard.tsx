import Image from "next/image";
import type { ScoredRecipe } from "@/lib/recipes/types";
import MissingBadge from "./MissingBadge";

interface RecipeCardProps {
  recipe: ScoredRecipe;
  onClick?: () => void;
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

const DIFFICULTY_COLORS = {
  easy: "text-green-600 dark:text-green-400",
  medium: "text-yellow-600 dark:text-yellow-400",
  hard: "text-red-600 dark:text-red-400",
} as const;

const CUISINE_BADGE_COLORS = {
  korean: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  chinese:
    "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  japanese: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  western:
    "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
} as const;

export default function RecipeCard({ recipe, onClick }: RecipeCardProps) {
  const { recipe: r, missingIngredients, missingCount } = recipe;

  const cardContent = (
    <>
      {/* 썸네일 */}
      <div className="relative aspect-video w-full overflow-hidden bg-gray-100 dark:bg-gray-800">
        {r.thumbnailUrl ? (
          <Image
            src={r.thumbnailUrl}
            alt={r.name}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <svg
              className="h-12 w-12 text-gray-300 dark:text-gray-600"
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
      <div className="flex flex-col gap-2 p-4">
        {/* 카테고리 뱃지 + 누락 뱃지 */}
        <div className="flex items-center justify-between gap-2">
          <span
            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${CUISINE_BADGE_COLORS[r.cuisine]}`}
          >
            {CUISINE_LABELS[r.cuisine]}
          </span>
          <MissingBadge
            missingIngredients={missingIngredients}
            missingCount={missingCount}
          />
        </div>

        {/* 요리명 */}
        <h3 className="line-clamp-2 text-base font-semibold leading-snug text-gray-900 dark:text-gray-100">
          {r.name}
        </h3>

        {/* 채널명 */}
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {r.channelName}
        </p>

        {/* 난이도 + 조리시간 */}
        <div className="flex items-center gap-3 text-xs">
          <span className={`font-medium ${DIFFICULTY_COLORS[r.difficulty]}`}>
            {DIFFICULTY_LABELS[r.difficulty]}
          </span>
          <span className="text-gray-400 dark:text-gray-500">·</span>
          <span className="text-gray-600 dark:text-gray-400">
            {r.cookTime}
          </span>
        </div>
      </div>
    </>
  );

  const className =
    "group flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-shadow duration-200 hover:shadow-md dark:border-gray-700 dark:bg-gray-900";

  if (onClick) {
    return (
      <article
        onClick={onClick}
        className={`${className} cursor-pointer`}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onClick();
          }
        }}
        aria-label={`${r.name} 레시피 보기`}
      >
        {cardContent}
      </article>
    );
  }

  return (
    <article className={className}>{cardContent}</article>
  );
}
