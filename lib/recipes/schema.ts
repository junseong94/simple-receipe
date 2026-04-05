/**
 * 레시피 등록/수정 폼 Zod 스키마
 *
 * 서버 액션(createRecipe, verifyAndUpdate)과 클라이언트 폼 양쪽에서
 * 동일한 스키마를 공유해 타입 일관성을 보장합니다.
 */

import { z } from "zod";

export const recipeFormSchema = z.object({
  authorName: z
    .string()
    .min(2, "닉네임은 2자 이상이어야 합니다")
    .max(50, "닉네임은 50자 이하여야 합니다"),
  password: z
    .string()
    .min(4, "비밀번호는 4자 이상이어야 합니다")
    .max(20, "비밀번호는 20자 이하여야 합니다"),
  name: z
    .string()
    .min(1, "요리명을 입력해주세요")
    .max(100, "요리명은 100자 이하여야 합니다"),
  cuisine: z.enum(["korean", "chinese", "japanese", "western"], {
    error: "카테고리를 선택해주세요",
  }),
  difficulty: z.enum(["easy", "medium", "hard"], {
    error: "난이도를 선택해주세요",
  }),
  cookTime: z.string().max(20).optional().or(z.literal("")),
  servings: z.coerce.number().min(1, "1인분 이상이어야 합니다").max(10, "10인분 이하여야 합니다").default(2),
  ingredients: z
    .array(z.string().min(1))
    .min(1, "재료를 1개 이상 입력해주세요"),
  seasonings: z.array(z.string().min(1)).default([]),
  steps: z
    .array(z.string().min(1))
    .min(1, "조리 순서를 1단계 이상 입력해주세요"),
  youtubeUrl: z
    .string()
    .optional()
    .refine(
      (val) => {
        if (!val || val === "") return true;
        try {
          const url = new URL(val);
          return (
            url.hostname === "www.youtube.com" ||
            url.hostname === "youtube.com" ||
            url.hostname === "youtu.be"
          );
        } catch {
          return false;
        }
      },
      { message: "유효한 YouTube URL을 입력해주세요 (youtube.com 또는 youtu.be)" },
    ),
  youtubeTitle: z.string().max(200).optional().or(z.literal("")),
  channelName: z.string().max(200).optional().or(z.literal("")),
  summary: z.string().max(500).optional().or(z.literal("")),
});

export type RecipeFormValues = z.infer<typeof recipeFormSchema>;

/** 비밀번호 확인 스키마 (수정/삭제 시 사용) */
export const passwordVerifySchema = z.object({
  password: z.string().min(1, "비밀번호를 입력해주세요"),
});

export type PasswordVerifyValues = z.infer<typeof passwordVerifySchema>;
