"use client";

import type { ScoredRecipe } from "@/lib/recipes/types";
import RecipeCard from "./RecipeCard";

interface RecipeGridProps {
  recipes: ScoredRecipe[];
  onRecipeClick?: (recipe: ScoredRecipe) => void;
}

export default function RecipeGrid({ recipes, onRecipeClick }: RecipeGridProps) {
  if (recipes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <svg
          className="mb-4 h-16 w-16 text-gray-300 dark:text-gray-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <p className="text-base font-medium text-gray-500 dark:text-gray-400">
          검색 결과가 없습니다.
        </p>
        <p className="mt-1 text-sm text-gray-400 dark:text-gray-500">
          다른 재료를 추가해보세요.
        </p>
      </div>
    );
  }

  return (
    <div
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
      aria-label={`레시피 목록 ${recipes.length}개`}
    >
      {recipes.map((scoredRecipe) => (
        <RecipeCard
          key={scoredRecipe.recipe.id}
          recipe={scoredRecipe}
          onClick={onRecipeClick ? () => onRecipeClick(scoredRecipe) : undefined}
        />
      ))}
    </div>
  );
}
