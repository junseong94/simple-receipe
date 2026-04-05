"use client";

import { useState } from "react";

interface RecipeSummaryProps {
  steps: string[];
  summary: string;
  defaultExpanded?: boolean;
}

export default function RecipeSummary({
  steps,
  summary,
  defaultExpanded = false,
}: RecipeSummaryProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <div className="space-y-3">
      {/* 요약 — 항상 표시 */}
      <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300">
        {summary}
      </p>

      {/* 조리 단계 — 토글 */}
      {steps.length > 0 && (
        <div>
          <button
            type="button"
            onClick={() => setExpanded((prev) => !prev)}
            className="flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            aria-expanded={expanded}
          >
            <svg
              className={`h-4 w-4 transition-transform duration-200 ${expanded ? "rotate-90" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
            조리 단계 {expanded ? "접기" : "펼치기"} ({steps.length}단계)
          </button>

          {expanded && (
            <ol className="mt-2 space-y-2">
              {steps.map((step, index) => (
                <li key={index} className="flex gap-3 text-sm">
                  <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                    {index + 1}
                  </span>
                  <span className="leading-relaxed text-gray-700 dark:text-gray-300">
                    {step}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
    </div>
  );
}
