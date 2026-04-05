"use client";

import { useRouter } from "next/navigation";
import RecipeCard from "@/app/_components/RecipeCard";
import type { ScoredRecipe } from "@/lib/recipes/types";

interface RecipeRowProps {
  title: string;
  recipes: ScoredRecipe[];
  searchParams: string;
}

export default function RecipeRow({
  title,
  recipes,
  searchParams,
}: RecipeRowProps) {
  const router = useRouter();

  if (recipes.length === 0) return null;

  function handleCardClick(recipeId: string) {
    const destination = `/recipe/${recipeId}${searchParams ? `?${searchParams}` : ""}`;
    router.push(destination);
  }

  return (
    <section aria-label={`${title} 레시피`}>
      {/* 행 헤더 */}
      <div className="mb-3 flex items-center gap-2">
        <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 md:text-lg">
          {title}
        </h2>
        <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-brand dark:bg-orange-900/30 dark:text-orange-brand">
          {recipes.length}
        </span>
      </div>

      {/* 가로 스크롤 영역 */}
      <div
        className="flex gap-4 overflow-x-auto pb-3 snap-x snap-mandatory"
        style={{ scrollbarWidth: "none" }}
      >
        {recipes.map((scored) => (
          <div
            key={scored.recipe.id}
            className="min-w-[280px] max-w-[280px] snap-start flex-shrink-0"
          >
            <RecipeCard
              recipe={scored}
              onClick={() => handleCardClick(scored.recipe.id)}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
