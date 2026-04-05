"use client";

import { useCallback, useState } from "react";
import { z } from "zod";
import { recipeFormSchema, type RecipeFormValues } from "@/lib/recipes/schema";
import IngredientInput from "@/app/_components/IngredientInput";
import TagInput from "@/app/_components/TagInput";

interface RecipeFormProps {
  /** 수정 모드일 때 초기값 전달 */
  defaultValues?: Partial<RecipeFormValues>;
  /** 비밀번호 필드 표시 여부 (등록: true, 수정: 별도 검증이므로 false) */
  showPasswordField?: boolean;
  /** 제출 버튼 텍스트 */
  submitLabel?: string;
  /** 폼 제출 핸들러 (Server Action 또는 함수) */
  onSubmit: (values: RecipeFormValues) => Promise<{ error?: string } | void>;
  /** 제출 중 상태를 외부에서 제어할 경우 */
  isPending?: boolean;
}

const CUISINE_OPTIONS = [
  { value: "korean", label: "한식" },
  { value: "chinese", label: "중식" },
  { value: "japanese", label: "일식" },
  { value: "western", label: "양식" },
] as const;

const DIFFICULTY_OPTIONS = [
  { value: "easy", label: "쉬움" },
  { value: "medium", label: "보통" },
  { value: "hard", label: "어려움" },
] as const;

type FieldErrors = Partial<Record<keyof RecipeFormValues | "root", string>>;

function LabelText({ required, children }: { required?: boolean; children: React.ReactNode }) {
  return (
    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
      {children}
      {required && <span className="ml-0.5 text-red-500">*</span>}
    </span>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="mt-1 text-xs text-red-500" role="alert">
      {message}
    </p>
  );
}

export default function RecipeForm({
  defaultValues,
  showPasswordField = true,
  submitLabel = "레시피 등록",
  onSubmit,
  isPending = false,
}: RecipeFormProps) {
  const [authorName, setAuthorName] = useState(defaultValues?.authorName ?? "");
  const [password, setPassword] = useState(defaultValues?.password ?? "");
  const [name, setName] = useState(defaultValues?.name ?? "");
  const [cuisine, setCuisine] = useState<string>(defaultValues?.cuisine ?? "");
  const [difficulty, setDifficulty] = useState<string>(defaultValues?.difficulty ?? "");
  const [cookTime, setCookTime] = useState(defaultValues?.cookTime ?? "");
  const [servings, setServings] = useState(String(defaultValues?.servings ?? 2));
  const [ingredients, setIngredients] = useState<string[]>(defaultValues?.ingredients ?? []);
  const [seasonings, setSeasonings] = useState<string[]>(defaultValues?.seasonings ?? []);
  const [steps, setSteps] = useState<string[]>(
    defaultValues?.steps?.length ? defaultValues.steps : [""],
  );
  const [youtubeUrl, setYoutubeUrl] = useState(defaultValues?.youtubeUrl ?? "");
  const [youtubeTitle, setYoutubeTitle] = useState(defaultValues?.youtubeTitle ?? "");
  const [channelName, setChannelName] = useState(defaultValues?.channelName ?? "");
  const [summary, setSummary] = useState(defaultValues?.summary ?? "");

  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);

  const isLoading = submitting || isPending;

  // 조리 단계 조작
  const addStep = useCallback(() => {
    setSteps((prev) => [...prev, ""]);
  }, []);

  const updateStep = useCallback((index: number, value: string) => {
    setSteps((prev) => prev.map((s, i) => (i === index ? value : s)));
  }, []);

  const removeStep = useCallback((index: number) => {
    setSteps((prev) => {
      const next = prev.filter((_, i) => i !== index);
      return next.length === 0 ? [""] : next;
    });
  }, []);

  const moveStep = useCallback((index: number, direction: "up" | "down") => {
    setSteps((prev) => {
      const next = [...prev];
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= next.length) return prev;
      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      return next;
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});

    const rawValues = {
      authorName,
      password,
      name,
      cuisine,
      difficulty,
      cookTime: cookTime || undefined,
      servings: Number(servings),
      ingredients,
      seasonings,
      steps: steps.filter((s) => s.trim() !== ""),
      youtubeUrl: youtubeUrl || undefined,
      youtubeTitle: youtubeTitle || undefined,
      channelName: channelName || undefined,
      summary: summary || undefined,
    };

    // 클라이언트 검증
    const result = recipeFormSchema.safeParse(rawValues);
    if (!result.success) {
      const fieldErrors: FieldErrors = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof RecipeFormValues;
        if (field && !fieldErrors[field]) {
          fieldErrors[field] = issue.message;
        }
      }
      setErrors(fieldErrors);
      // 첫 번째 에러 필드로 스크롤
      const firstErrorField = result.error.issues[0]?.path[0];
      if (firstErrorField) {
        const el = document.getElementById(`field-${String(firstErrorField)}`);
        el?.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      return;
    }

    setSubmitting(true);
    try {
      const response = await onSubmit(result.data);
      if (response && "error" in response && response.error) {
        setErrors({ root: response.error });
      }
    } catch {
      setErrors({ root: "알 수 없는 오류가 발생했습니다. 다시 시도해주세요." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      {/* 루트 에러 */}
      {errors.root && (
        <div
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/50 dark:text-red-400"
          role="alert"
        >
          {errors.root}
        </div>
      )}

      {/* 작성자 정보 */}
      <fieldset className="space-y-4">
        <legend className="text-base font-semibold text-gray-900 dark:text-gray-50">
          작성자 정보
        </legend>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div id="field-authorName">
            <label htmlFor="authorName" className="mb-1.5 block">
              <LabelText required>닉네임</LabelText>
            </label>
            <input
              id="authorName"
              type="text"
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              placeholder="2~50자"
              maxLength={50}
              className={inputCls(!!errors.authorName)}
              aria-describedby={errors.authorName ? "authorName-error" : undefined}
            />
            <FieldError message={errors.authorName} />
          </div>

          {showPasswordField && (
            <div id="field-password">
              <label htmlFor="password" className="mb-1.5 block">
                <LabelText required>비밀번호</LabelText>
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="4~20자 (수정/삭제 시 필요)"
                maxLength={20}
                className={inputCls(!!errors.password)}
                aria-describedby={errors.password ? "password-error" : undefined}
                autoComplete="new-password"
              />
              <FieldError message={errors.password} />
            </div>
          )}
        </div>
      </fieldset>

      <hr className="border-gray-200 dark:border-gray-800" />

      {/* 기본 정보 */}
      <fieldset className="space-y-4">
        <legend className="text-base font-semibold text-gray-900 dark:text-gray-50">
          기본 정보
        </legend>

        <div id="field-name">
          <label htmlFor="recipeName" className="mb-1.5 block">
            <LabelText required>요리명</LabelText>
          </label>
          <input
            id="recipeName"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="예: 된장찌개, 김치볶음밥"
            maxLength={100}
            className={inputCls(!!errors.name)}
          />
          <FieldError message={errors.name} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div id="field-cuisine">
            <label htmlFor="cuisine" className="mb-1.5 block">
              <LabelText required>카테고리</LabelText>
            </label>
            <select
              id="cuisine"
              value={cuisine}
              onChange={(e) => setCuisine(e.target.value)}
              className={selectCls(!!errors.cuisine)}
            >
              <option value="">선택하세요</option>
              {CUISINE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <FieldError message={errors.cuisine} />
          </div>

          <div id="field-difficulty">
            <label htmlFor="difficulty" className="mb-1.5 block">
              <LabelText required>난이도</LabelText>
            </label>
            <select
              id="difficulty"
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              className={selectCls(!!errors.difficulty)}
            >
              <option value="">선택하세요</option>
              {DIFFICULTY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <FieldError message={errors.difficulty} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="cookTime" className="mb-1.5 block">
              <LabelText>조리 시간</LabelText>
            </label>
            <input
              id="cookTime"
              type="text"
              value={cookTime}
              onChange={(e) => setCookTime(e.target.value)}
              placeholder="예: 30분, 1시간"
              maxLength={20}
              className={inputCls(false)}
            />
          </div>

          <div>
            <label htmlFor="servings" className="mb-1.5 block">
              <LabelText>인분</LabelText>
            </label>
            <input
              id="servings"
              type="number"
              min={1}
              max={10}
              value={servings}
              onChange={(e) => setServings(e.target.value)}
              className={inputCls(!!errors.servings)}
            />
            <FieldError message={errors.servings} />
          </div>
        </div>
      </fieldset>

      <hr className="border-gray-200 dark:border-gray-800" />

      {/* 재료 */}
      <fieldset className="space-y-4">
        <legend className="text-base font-semibold text-gray-900 dark:text-gray-50">
          재료
        </legend>

        <div id="field-ingredients">
          <label className="mb-1.5 block">
            <LabelText required>필수 재료</LabelText>
          </label>
          <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
            Enter 또는 콤마(,)로 추가합니다. 수량 포함 가능 (예: 삼겹살 300g)
          </p>
          <IngredientInput
            ingredients={ingredients}
            onChange={setIngredients}
            placeholder="재료를 입력하세요"
          />
          <FieldError message={errors.ingredients} />
        </div>

        <div>
          <label className="mb-1.5 block">
            <LabelText>기본 양념</LabelText>
          </label>
          <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
            간장, 소금, 고추장 등 일반 양념류는 여기에 입력합니다.
          </p>
          <TagInput
            tags={seasonings}
            onChange={setSeasonings}
            placeholder="양념을 입력하세요"
          />
        </div>
      </fieldset>

      <hr className="border-gray-200 dark:border-gray-800" />

      {/* 조리 순서 */}
      <fieldset className="space-y-4">
        <div className="flex items-center justify-between">
          <legend className="text-base font-semibold text-gray-900 dark:text-gray-50">
            조리 순서 <span className="text-red-500">*</span>
          </legend>
          <button
            type="button"
            onClick={addStep}
            className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium text-brand transition-colors hover:bg-brand/10"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            단계 추가
          </button>
        </div>

        <div id="field-steps" className="space-y-3">
          {steps.map((step, index) => (
            <div key={index} className="flex items-start gap-2">
              {/* 순서 번호 + 이동 버튼 */}
              <div className="flex flex-col items-center gap-0.5 pt-2">
                <button
                  type="button"
                  onClick={() => moveStep(index, "up")}
                  disabled={index === 0}
                  className="rounded p-0.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 disabled:opacity-30 dark:hover:bg-gray-800"
                  aria-label={`${index + 1}단계 위로 이동`}
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                </button>
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand/10 text-xs font-bold text-brand">
                  {index + 1}
                </span>
                <button
                  type="button"
                  onClick={() => moveStep(index, "down")}
                  disabled={index === steps.length - 1}
                  className="rounded p-0.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 disabled:opacity-30 dark:hover:bg-gray-800"
                  aria-label={`${index + 1}단계 아래로 이동`}
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>

              {/* 단계 입력 */}
              <textarea
                value={step}
                onChange={(e) => updateStep(index, e.target.value)}
                placeholder={`${index + 1}단계 조리 방법을 입력하세요`}
                rows={2}
                className="flex-1 resize-none rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
              />

              {/* 삭제 버튼 */}
              <button
                type="button"
                onClick={() => removeStep(index)}
                disabled={steps.length === 1}
                className="mt-2 rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500 disabled:opacity-30 dark:hover:bg-red-950/50"
                aria-label={`${index + 1}단계 삭제`}
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          ))}
        </div>
        <FieldError message={errors.steps} />
      </fieldset>

      <hr className="border-gray-200 dark:border-gray-800" />

      {/* 유튜브 + 요약 (선택) */}
      <fieldset className="space-y-4">
        <legend className="text-base font-semibold text-gray-900 dark:text-gray-50">
          추가 정보 <span className="text-xs font-normal text-gray-400">(선택)</span>
        </legend>

        <div id="field-youtubeUrl">
          <label htmlFor="youtubeUrl" className="mb-1.5 block">
            <LabelText>YouTube URL</LabelText>
          </label>
          <input
            id="youtubeUrl"
            type="url"
            value={youtubeUrl}
            onChange={(e) => setYoutubeUrl(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=..."
            className={inputCls(!!errors.youtubeUrl)}
          />
          <FieldError message={errors.youtubeUrl} />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="youtubeTitle" className="mb-1.5 block">
              <LabelText>영상 제목</LabelText>
            </label>
            <input
              id="youtubeTitle"
              type="text"
              value={youtubeTitle}
              onChange={(e) => setYoutubeTitle(e.target.value)}
              placeholder="영상 제목"
              maxLength={200}
              className={inputCls(false)}
            />
          </div>
          <div>
            <label htmlFor="channelName" className="mb-1.5 block">
              <LabelText>채널명</LabelText>
            </label>
            <input
              id="channelName"
              type="text"
              value={channelName}
              onChange={(e) => setChannelName(e.target.value)}
              placeholder="채널명"
              maxLength={200}
              className={inputCls(false)}
            />
          </div>
        </div>

        <div>
          <label htmlFor="summary" className="mb-1.5 block">
            <LabelText>요약 설명</LabelText>
          </label>
          <textarea
            id="summary"
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="레시피 한 줄 소개 또는 조리 팁"
            rows={3}
            maxLength={500}
            className="w-full resize-none rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
          />
        </div>
      </fieldset>

      {/* 제출 버튼 */}
      <div className="pt-2">
        <button
          type="submit"
          disabled={isLoading}
          className="w-full rounded-lg bg-brand px-6 py-3.5 text-base font-semibold text-white transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading ? (
            <span className="inline-flex items-center justify-center gap-2">
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" aria-hidden="true" />
              처리 중...
            </span>
          ) : (
            submitLabel
          )}
        </button>
      </div>
    </form>
  );
}

// 공통 input/select Tailwind 클래스 팩토리
function inputCls(hasError: boolean): string {
  return [
    "w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-gray-900 transition-colors",
    "focus:outline-none focus:ring-2",
    "dark:bg-gray-900 dark:text-gray-100",
    hasError
      ? "border-red-400 focus:border-red-500 focus:ring-red-500/20"
      : "border-gray-300 focus:border-blue-500 focus:ring-blue-500/20 dark:border-gray-600 dark:focus:border-blue-400",
  ].join(" ");
}

function selectCls(hasError: boolean): string {
  return [
    "w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-gray-900 transition-colors",
    "focus:outline-none focus:ring-2",
    "dark:bg-gray-900 dark:text-gray-100",
    hasError
      ? "border-red-400 focus:border-red-500 focus:ring-red-500/20"
      : "border-gray-300 focus:border-blue-500 focus:ring-blue-500/20 dark:border-gray-600 dark:focus:border-blue-400",
  ].join(" ");
}
