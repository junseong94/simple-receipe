"use client";

import { useRef, useState } from "react";

interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  maxTags?: number;
  id?: string;
}

/**
 * 범용 태그 입력 컴포넌트
 *
 * IngredientInput과 달리 자동완성 없이 단순 태그 추가/삭제만 제공합니다.
 * 양념 목록, 간단한 목록 입력 등에 활용합니다.
 */
export default function TagInput({
  tags,
  onChange,
  placeholder = "입력 후 Enter 또는 콤마",
  maxTags = 30,
  id,
}: TagInputProps) {
  const [inputValue, setInputValue] = useState("");
  const [isComposing, setIsComposing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const isAtMax = tags.length >= maxTags;

  function addTag(raw: string) {
    const value = raw.trim();
    if (!value) return;
    if (isAtMax) return;
    if (tags.includes(value)) return;
    onChange([...tags, value]);
    setInputValue("");
  }

  function removeTag(index: number) {
    onChange(tags.filter((_, i) => i !== index));
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (isComposing) return;
    if (e.key === "Enter") {
      e.preventDefault();
      addTag(inputValue);
    }
    if (e.key === "Backspace" && inputValue === "" && tags.length > 0) {
      onChange(tags.slice(0, -1));
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    if (value.endsWith(",")) {
      addTag(value.slice(0, -1));
      return;
    }
    setInputValue(value);
  }

  return (
    <div
      className={`flex min-h-10 flex-wrap items-center gap-1.5 rounded-lg border bg-white px-2.5 py-1.5 transition-colors focus-within:ring-2 dark:bg-gray-900 ${
        isAtMax
          ? "border-gray-200 opacity-75 dark:border-gray-700"
          : "border-gray-300 focus-within:border-blue-500 focus-within:ring-blue-500/20 dark:border-gray-600 dark:focus-within:border-blue-400"
      }`}
      onClick={() => !isAtMax && inputRef.current?.focus()}
    >
      {tags.map((tag, index) => (
        <span
          key={`${tag}-${index}`}
          className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-sm font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-300"
        >
          {tag}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              removeTag(index);
            }}
            className="ml-0.5 rounded-full p-0.5 transition-colors hover:bg-gray-200 dark:hover:bg-gray-700"
            aria-label={`${tag} 삭제`}
          >
            <svg
              className="h-3 w-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </span>
      ))}

      {isAtMax ? (
        <span className="py-0.5 text-xs text-gray-400 dark:text-gray-500">
          최대 {maxTags}개까지 추가할 수 있습니다
        </span>
      ) : (
        <input
          ref={inputRef}
          id={id}
          type="text"
          value={inputValue}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onCompositionStart={() => setIsComposing(true)}
          onCompositionEnd={(e) => {
            setIsComposing(false);
            setInputValue((e.target as HTMLInputElement).value);
          }}
          placeholder={tags.length === 0 ? placeholder : ""}
          className="min-w-24 flex-1 bg-transparent py-0.5 text-sm text-gray-900 outline-none placeholder:text-gray-400 dark:text-gray-100 dark:placeholder:text-gray-500"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
        />
      )}
    </div>
  );
}
