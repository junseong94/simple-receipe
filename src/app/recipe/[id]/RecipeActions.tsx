"use client";

import { useState } from "react";
import Link from "next/link";
import PasswordModal from "@/app/_components/PasswordModal";
import { verifyAndDelete } from "./actions";

interface RecipeActionsProps {
  recipeId: string;
}

/**
 * 사용자 레시피 수정/삭제 액션 버튼
 *
 * - 수정: /recipe/{id}/edit 로 이동
 * - 삭제: PasswordModal 오픈 → verifyAndDelete 호출
 */
export default function RecipeActions({ recipeId }: RecipeActionsProps) {
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  async function handleDeleteConfirm(
    password: string,
  ): Promise<{ error?: string } | void> {
    return verifyAndDelete(recipeId, password);
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <Link
          href={`/recipe/${recipeId}/edit`}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
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
              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
            />
          </svg>
          수정
        </Link>

        <button
          type="button"
          onClick={() => setShowDeleteModal(true)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:border-red-800 dark:bg-gray-900 dark:text-red-400 dark:hover:bg-red-950/30"
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
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
          삭제
        </button>
      </div>

      {showDeleteModal && (
        <PasswordModal
          title="레시피 삭제"
          description="삭제한 레시피는 복구할 수 없습니다. 등록 시 설정한 비밀번호를 입력해주세요."
          confirmLabel="삭제하기"
          variant="danger"
          onConfirm={handleDeleteConfirm}
          onCancel={() => setShowDeleteModal(false)}
        />
      )}
    </>
  );
}
