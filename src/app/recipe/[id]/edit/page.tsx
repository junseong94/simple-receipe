import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { pool } from "@/lib/db/client";
import { rowToRecipe } from "@/lib/db/transform";
import type { Recipe } from "@/lib/recipes/types";
import EditRecipeFormClient from "./EditRecipeFormClient";

interface PageProps {
  params: Promise<{ id: string }>;
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

  // DB 미설정 시 등록 페이지로 안내
  if (!process.env.DATABASE_URL) {
    redirect("/recipe/new");
  }

  const { rows } = await pool.query(
    "SELECT id, author_name, name, cuisine, difficulty, cook_time, servings, ingredients, seasonings, steps, youtube_url, youtube_title, channel_name, thumbnail_url, summary FROM user_recipes WHERE id = $1",
    [id],
  );

  if (rows.length === 0) {
    notFound();
  }

  const row = rows[0] as Record<string, unknown>;
  const recipe = rowToRecipe(row);
  const authorName = (row.author_name as string) ?? "";

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
