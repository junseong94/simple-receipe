import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import type { Recipe } from "@/lib/recipes/types";
import EditRecipeFormClient from "./EditRecipeFormClient";

interface PageProps {
  params: Promise<{ id: string }>;
}

/**
 * Supabase user_recipes 행을 도메인 Recipe 타입으로 변환합니다.
 */
function rowToRecipe(row: Record<string, unknown>): Recipe {
  return {
    id: row.id as string,
    name: row.name as string,
    cuisine: row.cuisine as Recipe["cuisine"],
    difficulty: row.difficulty as Recipe["difficulty"],
    cookTime: (row.cook_time as string) ?? "",
    servings: (row.servings as number) ?? 2,
    ingredients: (row.ingredients as string[]) ?? [],
    seasonings: (row.seasonings as string[]) ?? [],
    steps: (row.steps as string[]) ?? [],
    youtubeUrl: (row.youtube_url as string) ?? "",
    youtubeTitle: (row.youtube_title as string) ?? "",
    channelName: (row.channel_name as string) ?? "",
    thumbnailUrl: (row.thumbnail_url as string) ?? "",
    summary: (row.summary as string) ?? "",
    source: "user",
  };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `레시피 수정 | 레시피 보드`,
    description: `레시피 ${id} 수정`,
  };
}

export default async function EditRecipePage({ params }: PageProps) {
  const { id } = await params;

  // UUID 형식 검사 (큐레이션 레시피는 수정 불가)
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) {
    notFound();
  }

  // Supabase 미설정 시 등록 페이지로 안내
  if (!isSupabaseConfigured() || !supabase) {
    redirect("/recipe/new");
  }

  const { data: row, error } = await supabase
    .from("user_recipes")
    .select(
      "id, author_name, name, cuisine, difficulty, cook_time, servings, ingredients, seasonings, steps, youtube_url, youtube_title, channel_name, thumbnail_url, summary",
    )
    .eq("id", id)
    .single();

  if (error || !row) {
    notFound();
  }

  const recipe = rowToRecipe(row as Record<string, unknown>);
  const authorName = (row as Record<string, unknown>).author_name as string ?? "";

  return (
    <div className="flex min-h-screen flex-col bg-gray-50 dark:bg-gray-950">
      {/* 헤더 */}
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white/95 backdrop-blur dark:border-gray-800 dark:bg-gray-950/95">
        <div className="mx-auto max-w-lg px-4 py-3">
          <Link
            href={`/recipe/${id}`}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-brand hover:underline"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            레시피로 돌아가기
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-lg flex-1 px-4 pb-12 pt-6">
        <h1 className="mb-2 text-2xl font-bold text-gray-900 dark:text-gray-50">
          레시피 수정
        </h1>
        <p className="mb-8 text-sm text-gray-500 dark:text-gray-400">
          수정 후 비밀번호 확인을 거쳐 저장됩니다.
        </p>

        <EditRecipeFormClient recipeId={id} recipe={recipe} authorName={authorName} />
      </main>
    </div>
  );
}
