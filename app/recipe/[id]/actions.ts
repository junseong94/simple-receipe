"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { supabase } from "@/lib/supabase";

export interface DeleteRecipeResult {
  error?: string;
}

/**
 * 레시피 삭제 Server Action
 *
 * 1. Supabase에서 password_hash 조회
 * 2. bcrypt.compare로 비밀번호 검증
 * 3. 일치 시 DELETE 실행 후 홈으로 redirect
 */
export async function verifyAndDelete(
  recipeId: string,
  password: string,
): Promise<DeleteRecipeResult> {
  if (!supabase) {
    return { error: "데이터베이스가 설정되지 않았습니다." };
  }

  // 1. 레시피 존재 + password_hash 조회
  const { data: recipe, error: fetchError } = await supabase
    .from("user_recipes")
    .select("id, password_hash")
    .eq("id", recipeId)
    .single();

  if (fetchError || !recipe) {
    return { error: "레시피를 찾을 수 없습니다." };
  }

  // 2. 비밀번호 검증
  const isValid = await bcrypt.compare(password, recipe.password_hash);
  if (!isValid) {
    return { error: "비밀번호가 올바르지 않습니다." };
  }

  // 3. 삭제 (영향 행 확인)
  const { data: deleted, error: deleteError } = await supabase
    .from("user_recipes")
    .delete()
    .eq("id", recipeId)
    .select("id");

  if (deleteError || !deleted?.length) {
    console.error("[verifyAndDelete] Supabase delete error:", deleteError);
    return { error: "삭제에 실패했습니다. 잠시 후 다시 시도해주세요." };
  }

  // 4. 홈으로 redirect
  redirect("/");
}
