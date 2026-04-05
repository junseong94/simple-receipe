"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { pool } from "@/lib/db/client";

export interface DeleteRecipeResult {
  error?: string;
}

/**
 * 레시피 삭제 Server Action
 *
 * 1. PostgreSQL에서 password_hash 조회
 * 2. bcrypt.compare로 비밀번호 검증
 * 3. 일치 시 DELETE 실행 후 홈으로 redirect
 */
export async function verifyAndDelete(
  recipeId: string,
  password: string,
): Promise<DeleteRecipeResult> {
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

    // 3. 삭제 (영향 행 확인)
    const { rows: deleted } = await pool.query<{ id: string }>(
      "DELETE FROM user_recipes WHERE id = $1 RETURNING id",
      [recipeId],
    );

    if (deleted.length === 0) {
      return { error: "삭제에 실패했습니다. 잠시 후 다시 시도해주세요." };
    }

    redirect("/");
  } catch (e) {
    if (e instanceof Error && e.message === "NEXT_REDIRECT") throw e;
    console.error("[verifyAndDelete] DB error:", e);
    return { error: "삭제에 실패했습니다. 잠시 후 다시 시도해주세요." };
  }
}
