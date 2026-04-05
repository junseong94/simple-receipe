"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { pool } from "@/lib/db/client";
import { recipeFormSchema, type RecipeFormValues } from "@/lib/recipes/schema";

export interface UpdateRecipeResult {
  error?: string;
}

/**
 * 레시피 수정 Server Action
 *
 * 1. PostgreSQL에서 password_hash 조회
 * 2. bcrypt.compare로 비밀번호 검증
 * 3. Zod 스키마로 입력 재검증
 * 4. PostgreSQL UPDATE 실행
 * 5. 성공 시 /recipe/{id} 로 redirect
 */
export async function verifyAndUpdate(
  recipeId: string,
  password: string,
  values: RecipeFormValues,
): Promise<UpdateRecipeResult> {
  if (!process.env.DATABASE_URL) {
    return { error: "데이터베이스가 설정되지 않았습니다." };
  }

  try {
    // 1. password_hash 조회
    const { rows } = await pool.query<{ password_hash: string }>(
      "SELECT password_hash FROM user_recipes WHERE id = $1",
      [recipeId],
    );

    if (rows.length === 0) {
      return { error: "레시피를 찾을 수 없습니다." };
    }

    // 2. 비밀번호 검증
    const isValid = await bcrypt.compare(password, rows[0].password_hash);
    if (!isValid) {
      return { error: "비밀번호가 올바르지 않습니다." };
    }

    // 3. 입력값 서버 측 재검증 (비밀번호 필드 제외)
    const parsed = recipeFormSchema.omit({ password: true }).safeParse(values);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0];
      return { error: firstError?.message ?? "입력값이 올바르지 않습니다." };
    }

    const {
      authorName, name, cuisine, difficulty, cookTime,
      servings, ingredients, seasonings, steps,
      youtubeUrl, youtubeTitle, channelName, summary,
    } = parsed.data;

    // 4. UPDATE (updated_at은 트리거에서 자동 갱신)
    await pool.query(
      `UPDATE user_recipes SET
        author_name = $1, name = $2, cuisine = $3, difficulty = $4,
        cook_time = $5, servings = $6, ingredients = $7, seasonings = $8,
        steps = $9, youtube_url = $10, youtube_title = $11,
        channel_name = $12, summary = $13
       WHERE id = $14`,
      [
        authorName, name, cuisine, difficulty,
        cookTime || null, servings, ingredients, seasonings ?? [],
        steps, youtubeUrl || null, youtubeTitle || null,
        channelName || null, summary || null, recipeId,
      ],
    );

    redirect(`/recipe/${recipeId}`);
  } catch (e) {
    if (e instanceof Error && e.message === "NEXT_REDIRECT") throw e;
    console.error("[verifyAndUpdate] DB error:", e);
    return { error: "수정에 실패했습니다. 잠시 후 다시 시도해주세요." };
  }
}
