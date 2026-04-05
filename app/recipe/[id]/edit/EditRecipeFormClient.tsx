"use client";

import { useState } from "react";
import RecipeForm from "@/app/_components/RecipeForm";
import PasswordModal from "@/app/_components/PasswordModal";
import { verifyAndUpdate } from "./actions";
import type { Recipe } from "@/lib/recipes/types";
import type { RecipeFormValues } from "@/lib/recipes/schema";

interface EditRecipeFormClientProps {
  recipeId: string;
  recipe: Recipe;
}

/**
 * 수정 폼 클라이언트 래퍼
 *
 * 흐름:
 * 1. RecipeForm에서 값 수정
 * 2. 제출 시 PasswordModal 오픈
 * 3. 비밀번호 입력 → verifyAndUpdate Server Action 호출
 * 4. 성공 시 상세 페이지로 redirect (Server Action 내부에서 처리)
 */
export default function EditRecipeFormClient({
  recipeId,
  recipe,
}: EditRecipeFormClientProps) {
  const [pendingValues, setPendingValues] = useState<RecipeFormValues | null>(
    null,
  );

  // RecipeForm의 defaultValues로 변환
  const defaultValues: Partial<RecipeFormValues> = {
    authorName: recipe.channelName || "",
    name: recipe.name,
    cuisine: recipe.cuisine,
    difficulty: recipe.difficulty,
    cookTime: recipe.cookTime,
    servings: recipe.servings,
    ingredients: recipe.ingredients,
    seasonings: recipe.seasonings,
    steps: recipe.steps,
    youtubeUrl: recipe.youtubeUrl,
    youtubeTitle: recipe.youtubeTitle,
    channelName: recipe.channelName,
    summary: recipe.summary,
  };

  /**
   * RecipeForm 제출 핸들러
   * 비밀번호 입력 전 값을 임시 보관하고 모달을 엽니다.
   */
  async function handleFormSubmit(
    values: RecipeFormValues,
  ): Promise<{ error?: string } | void> {
    setPendingValues(values);
    // 모달이 열릴 때까지 폼은 대기 — 실제 에러 없음
  }

  /**
   * PasswordModal 확인 핸들러
   * 저장된 폼 값과 비밀번호를 Server Action으로 전달합니다.
   */
  async function handlePasswordConfirm(
    password: string,
  ): Promise<{ error?: string } | void> {
    if (!pendingValues) return { error: "수정할 내용이 없습니다." };
    return verifyAndUpdate(recipeId, password, pendingValues);
  }

  function handlePasswordCancel() {
    setPendingValues(null);
  }

  return (
    <>
      <RecipeForm
        defaultValues={defaultValues}
        showPasswordField={false}
        submitLabel="수정하기"
        onSubmit={handleFormSubmit}
      />

      {pendingValues && (
        <PasswordModal
          title="비밀번호 확인"
          description="등록 시 설정한 비밀번호를 입력하면 레시피가 수정됩니다."
          confirmLabel="수정 완료"
          variant="default"
          onConfirm={handlePasswordConfirm}
          onCancel={handlePasswordCancel}
        />
      )}
    </>
  );
}
