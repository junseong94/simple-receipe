"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark";

/** html 루트 요소에 다크 클래스를 적용/제거합니다. (컴포넌트 외부 순수 함수) */
function applyTheme(next: Theme): void {
  const root = document.documentElement;
  if (next === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
}

/**
 * localStorage 또는 시스템 설정에서 초기 테마를 읽습니다.
 * SSR 환경에서는 "light"를 기본값으로 반환합니다.
 */
function resolveInitialTheme(): Theme {
  if (typeof window === "undefined") return "light";
  const stored = localStorage.getItem("theme");
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export default function ThemeToggle() {
  // lazy initializer: 클라이언트 첫 렌더에 한 번만 실행 (SSR 시 "light")
  const [theme, setTheme] = useState<Theme>(resolveInitialTheme);
  // 클라이언트 마운트 여부 — SSR hydration 불일치 방지
  const [mounted, setMounted] = useState(false);

  // 마운트 직후 DOM 동기화 (테마 적용) 및 mounted 플래그 설정
  useEffect(() => {
    applyTheme(theme);
    setMounted(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("theme", next);
    applyTheme(next);
  }

  // SSR / 첫 hydration 전에는 placeholder 렌더링
  if (!mounted) {
    return (
      <button
        type="button"
        className="h-9 w-9 rounded-lg bg-gray-100 dark:bg-gray-800"
        aria-label="테마 전환"
        aria-disabled="true"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100 text-gray-700 transition-colors hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
      aria-label={theme === "dark" ? "라이트 모드로 전환" : "다크 모드로 전환"}
      title={theme === "dark" ? "라이트 모드로 전환" : "다크 모드로 전환"}
    >
      {theme === "dark" ? (
        // Sun icon (다크 모드일 때 → 라이트로 전환)
        <svg
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
          />
        </svg>
      ) : (
        // Moon icon (라이트 모드일 때 → 다크로 전환)
        <svg
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
          />
        </svg>
      )}
    </button>
  );
}
