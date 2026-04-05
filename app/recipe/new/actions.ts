"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { supabase } from "@/lib/supabase";
import { recipeFormSchema, type RecipeFormValues } from "@/lib/recipes/schema";

export interface CreateRecipeResult {
  error?: string;
}

/**
 * 사용자 레시피 등록 Server Action
 *
 * 1. Zod 스키마로 서버 측 재검증
 * 2. bcryptjs로 비밀번호 해싱 (rounds=10)
 * 3. Supabase user_recipes 테이블에 INSERT
 * 4. 성공 시 /recipe/{id} 로 redirect
 */
export async function createRecipe(
  values: RecipeFormValues,
): Promise<CreateRecipeResult> {
  // 1. Supabase 연결 확인
  if (!supabase) {
    return {
      error:
        "데이터베이스가 설정되지 않아 레시피를 등록할 수 없습니다. 관리자에게 문의해주세요.",
    };
  }

  // 2. 서버 측 재검증 (클라이언트 검증 우회 방어)
  const parsed = recipeFormSchema.safeParse(values);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0];
    return {
      error: firstError?.message ?? "입력값이 올바르지 않습니다.",
    };
  }

  const {
    authorName,
    password,
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

  // 3. 비밀번호 해싱
  const passwordHash = await bcrypt.hash(password, 10);

  // 4. INSERT
  const { data, error } = await supabase
    .from("user_recipes")
    .insert({
      author_name: authorName,
      password_hash: passwordHash,
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
    .select("id")
    .single();

  if (error || !data) {
    console.error("[createRecipe] Supabase insert error:", error);
    return {
      error: "레시피 등록에 실패했습니다. 잠시 후 다시 시도해주세요.",
    };
  }

  // 5. 성공 — 상세 페이지로 redirect (이 줄 이후 코드는 실행되지 않음)
  redirect(`/recipe/${data.id}`);
}
