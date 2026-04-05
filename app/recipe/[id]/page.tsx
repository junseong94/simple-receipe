import { notFound } from "next/navigation";
import type { Metadata } from "next";
import recipesData from "@/data/recipes.json";
import type { Recipe } from "@/lib/recipes/types";
import YouTubeEmbed from "@/app/_components/YouTubeEmbed";
import RecipeSummary from "@/app/_components/RecipeSummary";

interface PageProps {
  params: Promise<{ id: string }>;
}

function findRecipe(id: string): Recipe | undefined {
  return (recipesData as Recipe[]).find((r) => r.id === id);
}

export async function generateStaticParams() {
  return (recipesData as Recipe[]).map((r) => ({ id: r.id }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const recipe = findRecipe(id);
  if (!recipe) return { title: "레시피를 찾을 수 없어요 | 레시피 보드" };
  return {
    title: `${recipe.name} | 레시피 보드`,
    description: recipe.summary,
  };
}

const CUISINE_LABEL: Record<string, string> = {
  korean: "한식",
  chinese: "중식",
  japanese: "일식",
  western: "양식",
};

const DIFFICULTY_LABEL: Record<string, string> = {
  easy: "쉬움",
  medium: "보통",
  hard: "어려움",
};

export default async function RecipeDetailPage({ params }: PageProps) {
  const { id } = await params;
  const recipe = findRecipe(id);

  if (!recipe) {
    notFound();
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-50 dark:bg-gray-950">
      {/* 헤더 */}
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white/95 backdrop-blur dark:border-gray-800 dark:bg-gray-950/95">
        <div className="mx-auto max-w-lg px-4 py-3">
          <a
            href="/"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-brand hover:underline"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            레시피 보드
          </a>
        </div>
      </header>

      {/* 콘텐츠 */}
      <main className="mx-auto w-full max-w-lg flex-1 px-4 pb-12 pt-6">
        <div className="space-y-6">
          {/* 요리명 + 메타 */}
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-brand/10 px-2.5 py-0.5 text-xs font-semibold text-brand">
                {CUISINE_LABEL[recipe.cuisine] ?? recipe.cuisine}
              </span>
              <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                {DIFFICULTY_LABEL[recipe.difficulty] ?? recipe.difficulty}
              </span>
              <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                {recipe.cookTime}
              </span>
              <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                {recipe.servings}인분
              </span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-50">
              {recipe.name}
            </h1>
            {recipe.channelName && (
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                by {recipe.channelName}
              </p>
            )}
          </div>

          {/* 유튜브 임베드 */}
          <YouTubeEmbed url={recipe.youtubeUrl} title={recipe.youtubeTitle} />

          {/* 요약 + 조리 단계 */}
          <RecipeSummary steps={recipe.steps} summary={recipe.summary} defaultExpanded />

          {/* 재료 목록 */}
          <section>
            <h2 className="mb-3 text-lg font-bold text-gray-900 dark:text-gray-50">
              재료
            </h2>
            <ul className="space-y-1.5">
              {recipe.ingredients.map((ingredient) => (
                <li
                  key={ingredient}
                  className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300"
                >
                  <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-brand" aria-hidden="true" />
                  {ingredient}
                </li>
              ))}
            </ul>
          </section>

          {/* 기본 양념 */}
          {recipe.seasonings.length > 0 && (
            <section>
              <h2 className="mb-3 text-lg font-bold text-gray-900 dark:text-gray-50">
                기본 양념
              </h2>
              <ul className="space-y-1.5">
                {recipe.seasonings.map((seasoning) => (
                  <li
                    key={seasoning}
                    className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400"
                  >
                    <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-gray-300 dark:bg-gray-600" aria-hidden="true" />
                    {seasoning}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
