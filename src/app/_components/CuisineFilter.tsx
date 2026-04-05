"use client";

import type { CuisineType } from "@/lib/recipes/types";

interface CuisineFilterProps {
  activeCuisines: CuisineType[];
  onChange: (cuisines: CuisineType[]) => void;
  counts?: Record<CuisineType, number>;
}

const CUISINE_LABELS: Record<CuisineType, string> = {
  korean: "한식",
  chinese: "중식",
  japanese: "일식",
  western: "양식",
};

const ALL_CUISINES: CuisineType[] = ["korean", "chinese", "japanese", "western"];

export default function CuisineFilter({
  activeCuisines,
  onChange,
  counts,
}: CuisineFilterProps) {
  const isAll = activeCuisines.length === 0 || activeCuisines.length === ALL_CUISINES.length;

  const totalCount = counts
    ? ALL_CUISINES.reduce((sum, c) => sum + (counts[c] ?? 0), 0)
    : undefined;

  function handleAllClick() {
    onChange([]);
  }

  function handleCuisineClick(cuisine: CuisineType) {
    if (isAll) {
      // 전체 선택 상태에서 특정 탭 클릭 → 그 탭만 선택
      onChange([cuisine]);
      return;
    }

    const alreadySelected = activeCuisines.includes(cuisine);

    if (alreadySelected) {
      const next = activeCuisines.filter((c) => c !== cuisine);
      // 모두 해제되면 전체 선택으로 돌아감
      onChange(next.length === 0 ? [] : next);
    } else {
      const next = [...activeCuisines, cuisine];
      // 모두 선택되면 전체로 통일
      onChange(next.length === ALL_CUISINES.length ? [] : next);
    }
  }

  const baseTab =
    "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors whitespace-nowrap";
  const activeTab =
    "bg-gray-900 text-white dark:bg-white dark:text-gray-900";
  const inactiveTab =
    "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700";

  return (
    <div
      className="flex flex-wrap gap-2"
      role="group"
      aria-label="요리 카테고리 필터"
    >
      {/* 전체 탭 */}
      <button
        type="button"
        onClick={handleAllClick}
        className={`${baseTab} ${isAll ? activeTab : inactiveTab}`}
        aria-pressed={isAll}
      >
        전체
        {totalCount !== undefined && (
          <span
            className={`rounded-full px-1.5 py-0.5 text-xs ${
              isAll
                ? "bg-white/20 text-white dark:bg-black/20 dark:text-gray-900"
                : "bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
            }`}
          >
            {totalCount}
          </span>
        )}
      </button>

      {/* 카테고리 탭 */}
      {ALL_CUISINES.map((cuisine) => {
        const isActive = !isAll && activeCuisines.includes(cuisine);
        const count = counts?.[cuisine];

        return (
          <button
            key={cuisine}
            type="button"
            onClick={() => handleCuisineClick(cuisine)}
            className={`${baseTab} ${isActive ? activeTab : inactiveTab}`}
            aria-pressed={isActive}
          >
            {CUISINE_LABELS[cuisine]}
            {count !== undefined && (
              <span
                className={`rounded-full px-1.5 py-0.5 text-xs ${
                  isActive
                    ? "bg-white/20 text-white dark:bg-black/20 dark:text-gray-900"
                    : "bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
                }`}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
