"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { pool } from "@/lib/db/client";
import { recipeFormSchema, type RecipeFormValues } from "@/lib/recipes/schema";

export interface CreateRecipeResult {
  error?: string;
}

/**
 * 사용자 레시피 등록 Server Action
 *
 * 1. Zod 스키마로 서버 측 재검증
 * 2. bcryptjs로 비밀번호 해싱 (rounds=10)
 * 3. PostgreSQL user_recipes 테이블에 INSERT
 * 4. 성공 시 /recipe/{id} 로 redirect
 */
export async function createRecipe(
  values: RecipeFormValues,
): Promise<CreateRecipeResult> {
  // 1. DB 연결 확인
  if (!process.env.DATABASE_URL) {
    return {
      error:
        "데이터베이스가 설정되지 않아 레시피를 등록할 수 없습니다. 관리자에게 문의해주세요.",
    };
  }

  // 2. 서버 측 재검증
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
  try {
    const { rows } = await pool.query<{ id: string }>(
      `INSERT INTO user_recipes
        (author_name, password_hash, name, cuisine, difficulty, cook_time, servings,
         ingredients, seasonings, steps, youtube_url, youtube_title, channel_name, summary)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       RETURNING id`,
      [
        authorName, passwordHash, name, cuisine, difficulty,
        cookTime || null, servings, ingredients, seasonings ?? [],
        steps, youtubeUrl || null, youtubeTitle || null,
        channelName || null, summary || null,
      ],
    );

    if (!rows[0]) {
      return { error: "레시피 등록에 실패했습니다." };
    }

    redirect(`/recipe/${rows[0].id}`);
  } catch (e) {
    // redirect는 에러를 throw하므로 재throw
    if (e instanceof Error && e.message === "NEXT_REDIRECT") throw e;
    console.error("[createRecipe] DB insert error:", e);
    return { error: "레시피 등록에 실패했습니다. 잠시 후 다시 시도해주세요." };
  }
}
