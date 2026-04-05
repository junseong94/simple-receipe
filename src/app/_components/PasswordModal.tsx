"use client";

import { useEffect, useRef, useState } from "react";

interface PasswordModalProps {
  title: string;
  description?: string;
  confirmLabel?: string;
  /** 확인 버튼 색상 — 삭제는 red, 수정은 기본 brand */
  variant?: "danger" | "default";
  onConfirm: (password: string) => Promise<{ error?: string } | void>;
  onCancel: () => void;
}

/**
 * 비밀번호 확인 모달
 *
 * 수정/삭제 전 사용자가 등록 시 설정한 비밀번호를 재확인합니다.
 * 비밀번호는 이 컴포넌트에서 서버 액션으로만 전달되며 클라이언트 상태에는 최소 체류 후 즉시 소거됩니다.
 */
export default function PasswordModal({
  title,
  description,
  confirmLabel = "확인",
  variant = "default",
  onConfirm,
  onCancel,
}: PasswordModalProps) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [failCount, setFailCount] = useState(0);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const isLocked = lockedUntil !== null && Date.now() < lockedUntil;

  // 모달 오픈 시 입력 포커스
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // ESC로 닫기
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && !isPending) onCancel();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isPending, onCancel]);

  // 모달 오픈 시 배경 스크롤 잠금
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  async function handleConfirm(e: React.FormEvent) {
    e.preventDefault();
    if (!password.trim()) {
      setError("비밀번호를 입력해주세요");
      return;
    }
    if (isLocked) {
      setError("너무 많은 시도가 있었습니다. 잠시 후 다시 시도해주세요.");
      return;
    }

    setError("");
    setIsPending(true);
    try {
      const result = await onConfirm(password);
      if (result && "error" in result && result.error) {
        const nextFail = failCount + 1;
        setFailCount(nextFail);
        if (nextFail >= 5) {
          setLockedUntil(Date.now() + 60_000); // 1분 잠금
          setError("5회 실패. 1분 후 다시 시도해주세요.");
          setTimeout(() => {
            setLockedUntil(null);
            setFailCount(0);
          }, 60_000);
        } else {
          setError(result.error);
        }
        setPassword("");
        inputRef.current?.focus();
      }
    } catch {
      setError("처리 중 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setIsPending(false);
    }
  }

  function handleOverlayClick(e: React.MouseEvent) {
    if (e.target === overlayRef.current && !isPending) {
      onCancel();
    }
  }

  const confirmBtnCls =
    variant === "danger"
      ? "bg-red-600 hover:bg-red-700 focus-visible:ring-red-600/40"
      : "bg-brand hover:bg-brand-hover focus-visible:ring-brand/40";

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm"
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900">
        <h2
          id="modal-title"
          className="mb-1 text-lg font-bold text-gray-900 dark:text-gray-50"
        >
          {title}
        </h2>
        {description && (
          <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
            {description}
          </p>
        )}

        <form onSubmit={handleConfirm} className="mt-4 space-y-4">
          <div>
            <label
              htmlFor="modal-password"
              className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              비밀번호
            </label>
            <input
              ref={inputRef}
              id="modal-password"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError("");
              }}
              placeholder="등록 시 설정한 비밀번호"
              disabled={isPending}
              autoComplete="current-password"
              className={[
                "w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-gray-900 transition-colors focus:outline-none focus:ring-2 dark:bg-gray-800 dark:text-gray-100",
                error
                  ? "border-red-400 focus:border-red-500 focus:ring-red-500/20"
                  : "border-gray-300 focus:border-blue-500 focus:ring-blue-500/20 dark:border-gray-600",
                isPending ? "opacity-50" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              aria-describedby={error ? "modal-password-error" : undefined}
              aria-invalid={!!error}
            />
            {error && (
              <p
                id="modal-password-error"
                className="mt-1 text-xs text-red-500"
                role="alert"
              >
                {error}
              </p>
            )}
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onCancel}
              disabled={isPending}
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isPending || !password}
              className={[
                "flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition-colors focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50",
                confirmBtnCls,
              ].join(" ")}
            >
              {isPending ? (
                <span className="inline-flex items-center justify-center gap-1.5">
                  <span
                    className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent"
                    aria-hidden="true"
                  />
                  처리 중...
                </span>
              ) : (
                confirmLabel
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
