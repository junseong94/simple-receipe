import { Suspense } from "react";
import ThemeToggle from "@/app/_components/ThemeToggle";
import SearchContent from "./_components/SearchContent";

function SearchFallback() {
  return (
    <div className="flex flex-col items-center py-16 md:py-24">
      <div className="mb-8">
        <div className="h-10 w-72 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700 md:h-14 md:w-96" />
        <div className="mx-auto mt-3 h-5 w-64 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
      </div>
      <div className="h-12 w-full max-w-2xl animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" />
      <div className="mt-4 h-12 w-32 animate-pulse rounded-lg bg-orange-200 dark:bg-orange-900/40" />
    </div>
  );
}

export default function PrototypeAPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* 헤더 */}
      <header className="sticky top-0 z-10 border-b border-gray-100 bg-background/95 backdrop-blur dark:border-gray-800">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <a
            href="/a"
            className="text-lg font-bold tracking-tight text-orange-brand"
          >
            냉장고 탐색
          </a>
          <ThemeToggle />
        </div>
      </header>

      {/* 메인 콘텐츠 — useSearchParams를 사용하는 SearchContent를 Suspense로 래핑 */}
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-16">
        <Suspense fallback={<SearchFallback />}>
          <SearchContent />
        </Suspense>
      </main>
    </div>
  );
}
