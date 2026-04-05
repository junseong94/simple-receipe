import type { Metadata } from "next";
import Link from "next/link";
import RecipeFormClient from "./RecipeFormClient";

export const metadata: Metadata = {
  title: "레시피 등록 | 레시피 보드",
  description: "나만의 레시피를 등록해보세요",
};

export default function NewRecipePage() {
  const dbReady = !!process.env.DATABASE_URL;

  return (
    <div className="flex min-h-screen flex-col bg-gray-50 dark:bg-gray-950">
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white/95 backdrop-blur dark:border-gray-800 dark:bg-gray-950/95">
        <div className="mx-auto max-w-lg px-4 py-3">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-brand hover:underline"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            레시피 보드
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-lg flex-1 px-4 pb-12 pt-6">
        <h1 className="mb-2 text-2xl font-bold text-gray-900 dark:text-gray-50">
          레시피 등록
        </h1>
        <p className="mb-8 text-sm text-gray-500 dark:text-gray-400">
          나만의 레시피를 공유해보세요. 비밀번호는 나중에 수정/삭제 시 사용됩니다.
        </p>

        {dbReady ? (
          <RecipeFormClient />
        ) : (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-6 py-8 text-center dark:border-amber-800 dark:bg-amber-950/30">
            <h2 className="mb-2 text-base font-semibold text-amber-800 dark:text-amber-300">
              데이터베이스 미설정
            </h2>
            <p className="text-sm text-amber-700 dark:text-amber-400">
              DATABASE_URL 환경변수가 설정되지 않아 레시피 등록 기능을 사용할 수 없습니다.
            </p>
            <p className="mt-1 text-xs text-amber-600 dark:text-amber-500">
              docker compose up -d 후 .env.local에 DATABASE_URL을 설정해주세요.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
