"use client";

import { useState, useEffect, useRef } from "react";

interface MissingBadgeProps {
  missingIngredients: string[];
  missingCount: number;
}

export default function MissingBadge({
  missingIngredients,
  missingCount,
}: MissingBadgeProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // 모바일: 외부 클릭 시 툴팁 닫기
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("click", handleClick, { capture: true });
    return () => document.removeEventListener("click", handleClick, { capture: true });
  }, [open]);

  if (missingCount === 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-400">
        재료 완벽!
      </span>
    );
  }

  const colorClass =
    missingCount <= 2
      ? "bg-yellow-100 text-yellow-800 hover:bg-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:hover:bg-yellow-900/50"
      : "bg-orange-100 text-orange-800 hover:bg-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:hover:bg-orange-900/50";

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        className={`inline-flex cursor-pointer items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${colorClass}`}
        aria-expanded={open}
        aria-label={`${missingCount}개 재료 부족 - 클릭하여 목록 보기`}
      >
        +{missingCount}개 필요
      </button>

      {open && missingIngredients.length > 0 && (
        <div
          className="absolute bottom-full left-0 z-10 mb-1 min-w-32 rounded-lg border border-gray-200 bg-white p-2 shadow-lg dark:border-gray-700 dark:bg-gray-800"
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
        >
          <p className="mb-1 text-xs font-semibold text-gray-500 dark:text-gray-400">
            필요한 재료
          </p>
          <ul className="space-y-0.5">
            {missingIngredients.map((ingredient) => (
              <li
                key={ingredient}
                className="text-xs text-gray-700 dark:text-gray-300"
              >
                · {ingredient}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
