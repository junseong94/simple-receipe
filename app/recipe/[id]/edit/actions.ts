"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { supabase } from "@/lib/supabase";
import { recipeFormSchema, type RecipeFormValues } from "@/lib/recipes/schema";

export interface UpdateRecipeResult {
  error?: string;
}

/**
 * 레시피 수정 Server Action
 *
 * 1. Supabase에서 password_hash 조회
 * 2. bcrypt.compare로 비밀번호 검증
 * 3. Zod 스키마로 입력 재검증
 * 4. Supabase UPDATE 실행
 * 5. 성공 시 /recipe/{id} 로 redirect
 */
export async function verifyAndUpdate(
  recipeId: string,
  password: string,
  values: RecipeFormValues,
): Promise<UpdateRecipeResult> {
  if (!supabase) {
    return { error: "데이터베이스가 설정되지 않았습니다." };
  }

  // 1. 레시피 존재 + password_hash 조회
  const { data: existing, error: fetchError } = await supabase
    .from("user_recipes")
    .select("id, password_hash")
    .eq("id", recipeId)
    .single();

  if (fetchError || !existing) {
    return { error: "레시피를 찾을 수 없습니다." };
  }

  // 2. 비밀번호 검증
  const isValid = await bcrypt.compare(password, existing.password_hash);
  if (!isValid) {
    return { error: "비밀번호가 올바르지 않습니다." };
  }

  // 3. 입력값 서버 측 재검증 (비밀번호 필드 제외 검증)
  const parsed = recipeFormSchema.omit({ password: true }).safeParse(values);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0];
    return { error: firstError?.message ?? "입력값이 올바르지 않습니다." };
  }

  const {
    authorName,
    name,
    cuisine,
    difficulty,
    cookTime,
    servings,
    ingredients,
    seasonings,
    steps,
    youtubeUrl,
    youtubeTitle,
    channelName,
    summary,
  } = parsed.data;

  // 4. UPDATE 실행 (updated_at은 트리거에서 자동 갱신)
  const { error: updateError } = await supabase
    .from("user_recipes")
    .update({
      author_name: authorName,
      name,
      cuisine,
      difficulty,
      cook_time: cookTime || null,
      servings,
      ingredients,
      seasonings: seasonings ?? [],
      steps,
      youtube_url: youtubeUrl || null,
      youtube_title: youtubeTitle || null,
      channel_name: channelName || null,
      summary: summary || null,
    })
    .eq("id", recipeId);

  if (updateError) {
    console.error("[verifyAndUpdate] Supabase update error:", updateError);
    return { error: "수정에 실패했습니다. 잠시 후 다시 시도해주세요." };
  }

  // 5. 상세 페이지로 redirect
  redirect(`/recipe/${recipeId}`);
}
