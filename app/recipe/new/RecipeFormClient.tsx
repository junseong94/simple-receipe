"use client";

import RecipeForm from "@/app/_components/RecipeForm";
import { createRecipe } from "./actions";
import type { RecipeFormValues } from "@/lib/recipes/schema";

/**
 * 등록 폼 클라이언트 래퍼
 *
 * page.tsx는 Server Component로 유지하되,
 * 이벤트 핸들러가 필요한 RecipeForm은 별도 클라이언트 컴포넌트로 분리합니다.
 */
export default function RecipeFormClient() {
  async function handleSubmit(values: RecipeFormValues) {
    return createRecipe(values);
  }

  return (
    <RecipeForm
      onSubmit={handleSubmit}
      submitLabel="레시피 등록하기"
      showPasswordField={true}
    />
  );
}
