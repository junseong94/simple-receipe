"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  getAllCanonicalNames,
  ingredientMatches,
  isKnownIngredient,
} from "@/lib/ingredients/synonyms";
import { normalizeIngredient } from "@/lib/ingredients/normalize";

interface IngredientInputProps {
  ingredients: string[];
  onChange: (ingredients: string[]) => void;
  placeholder?: string;
  maxTags?: number;
}

const MAX_SUGGESTIONS = 8;

/** 입력 쿼리에 매칭되는 자동완성 후보를 반환합니다. */
function getSuggestions(query: string): string[] {
  if (!query.trim()) return [];
  const normalized = normalizeIngredient(query);
  const all = getAllCanonicalNames();
  return all
    .filter((name) => name.includes(normalized))
    .slice(0, MAX_SUGGESTIONS);
}

/** 이미 추가된 재료 중 중복 여부 확인 (동의어 기준) */
function isDuplicate(existing: string[], candidate: string): boolean {
  return existing.some((e) => ingredientMatches(e, candidate));
}

export default function IngredientInput({
  ingredients,
  onChange,
  placeholder = "재료를 입력하세요 (Enter 또는 콤마로 추가)",
  maxTags = 20,
}: IngredientInputProps) {
  const [inputValue, setInputValue] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);
  // 드롭다운 표시 여부 (Escape / 외부 클릭으로 닫을 수 있음)
  const [dropdownOpen, setDropdownOpen] = useState(true);
  // 한글 IME 조합 중 여부
  const [isComposing, setIsComposing] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();
  const isAtMax = ingredients.length >= maxTags;

  // 입력값에서 파생된 자동완성 후보 (렌더마다 동기 계산)
  const allSuggestions = useMemo(
    () => getSuggestions(inputValue),
    [inputValue],
  );

  // 드롭다운이 열려있고 후보가 있을 때만 표시
  const visibleSuggestions = dropdownOpen ? allSuggestions : [];

  // inputValue가 바뀌면 드롭다운을 다시 열고 activeIndex 초기화
  // (useEffect 없이 이벤트 핸들러에서 직접 처리)

  /** 태그 추가 — 중복·최대 개수·빈 문자열 방어 */
  const addTag = useCallback(
    (raw: string) => {
      const value = raw.trim();
      if (!value) return;
      if (isAtMax) return;
      if (isDuplicate(ingredients, value)) return;

      onChange([...ingredients, value]);
      setInputValue("");
      setActiveIndex(-1);
      setDropdownOpen(true);
    },
    [ingredients, isAtMax, onChange],
  );

  /** 마지막 태그 삭제 */
  const removeLastTag = useCallback(() => {
    if (ingredients.length === 0) return;
    onChange(ingredients.slice(0, -1));
  }, [ingredients, onChange]);

  /** 특정 인덱스 태그 삭제 */
  const removeTag = useCallback(
    (index: number) => {
      onChange(ingredients.filter((_, i) => i !== index));
    },
    [ingredients, onChange],
  );

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    // IME 조합 중에는 Enter 무시
    if (isComposing) return;

    switch (e.key) {
      case "Enter": {
        e.preventDefault();
        if (activeIndex >= 0 && activeIndex < visibleSuggestions.length) {
          addTag(visibleSuggestions[activeIndex]);
        } else {
          addTag(inputValue);
        }
        break;
      }
      case "ArrowDown": {
        e.preventDefault();
        setDropdownOpen(true);
        setActiveIndex((prev) =>
          prev < visibleSuggestions.length - 1 ? prev + 1 : 0,
        );
        break;
      }
      case "ArrowUp": {
        e.preventDefault();
        setDropdownOpen(true);
        setActiveIndex((prev) =>
          prev > 0 ? prev - 1 : visibleSuggestions.length - 1,
        );
        break;
      }
      case "Escape": {
        setDropdownOpen(false);
        setActiveIndex(-1);
        break;
      }
      case "Backspace": {
        if (inputValue === "") {
          removeLastTag();
        }
        break;
      }
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;

    // 콤마 입력 시 즉시 태그 추가
    if (value.endsWith(",")) {
      const candidate = value.slice(0, -1).trim();
      if (candidate) addTag(candidate);
      return;
    }

    setInputValue(value);
    setDropdownOpen(true);
    setActiveIndex(-1);
  }

  function handleSuggestionClick(suggestion: string) {
    addTag(suggestion);
    inputRef.current?.focus();
  }

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(false);
        setActiveIndex(-1);
      }
    }
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  return (
    <div ref={containerRef} className="relative w-full">
      {/* 태그 + 입력 래퍼 */}
      <div
        className={`flex min-h-10 flex-wrap items-center gap-1.5 rounded-lg border bg-white px-2.5 py-1.5 transition-colors focus-within:ring-2 dark:bg-gray-900 ${
          isAtMax
            ? "border-gray-200 opacity-75 dark:border-gray-700"
            : "border-gray-300 focus-within:border-blue-500 focus-within:ring-blue-500/20 dark:border-gray-600 dark:focus-within:border-blue-400"
        }`}
        onClick={() => !isAtMax && inputRef.current?.focus()}
      >
        {/* 태그 목록 */}
        {ingredients.map((ingredient, index) => {
          const known = isKnownIngredient(ingredient);
          return (
            <span
              key={`${ingredient}-${index}`}
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-sm font-medium ${
                known
                  ? "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300"
                  : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
              }`}
              title={known ? undefined : "인식되지 않는 재료"}
            >
              {!known && (
                <span
                  className="text-gray-400 dark:text-gray-500"
                  aria-hidden="true"
                >
                  ?
                </span>
              )}
              {ingredient}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeTag(index);
                }}
                className={`ml-0.5 rounded-full p-0.5 transition-colors ${
                  known
                    ? "hover:bg-blue-200 dark:hover:bg-blue-800"
                    : "hover:bg-gray-200 dark:hover:bg-gray-700"
                }`}
                aria-label={`${ingredient} 삭제`}
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
          );
        })}

        {/* 텍스트 입력 */}
        {isAtMax ? (
          <span className="py-0.5 text-xs text-gray-400 dark:text-gray-500">
            최대 {maxTags}개까지 추가할 수 있습니다
          </span>
        ) : (
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onFocus={() => setDropdownOpen(true)}
            onCompositionStart={() => setIsComposing(true)}
            onCompositionEnd={(e) => {
              setIsComposing(false);
              // compositionend 직후 value 동기화
              setInputValue((e.target as HTMLInputElement).value);
            }}
            placeholder={ingredients.length === 0 ? placeholder : ""}
            className="min-w-24 flex-1 bg-transparent py-0.5 text-sm text-gray-900 outline-none placeholder:text-gray-400 dark:text-gray-100 dark:placeholder:text-gray-500"
            aria-label="재료 입력"
            aria-autocomplete="list"
            aria-controls={
              visibleSuggestions.length > 0 ? listboxId : undefined
            }
            aria-activedescendant={
              activeIndex >= 0 ? `suggestion-${activeIndex}` : undefined
            }
            aria-expanded={visibleSuggestions.length > 0}
            role="combobox"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
          />
        )}
      </div>

      {/* 자동완성 드롭다운 */}
      {visibleSuggestions.length > 0 && !isAtMax && (
        <ul
          id={listboxId}
          role="listbox"
          aria-label="재료 자동완성 목록"
          className="absolute left-0 right-0 top-full z-20 mt-1 max-h-52 overflow-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-900"
        >
          {visibleSuggestions.map((suggestion, index) => (
            <li
              key={suggestion}
              id={`suggestion-${index}`}
              role="option"
              aria-selected={index === activeIndex}
              onMouseDown={(e) => {
                // mousedown 시 input blur 방지
                e.preventDefault();
                handleSuggestionClick(suggestion);
              }}
              onMouseEnter={() => setActiveIndex(index)}
              className={`cursor-pointer px-3 py-1.5 text-sm transition-colors ${
                index === activeIndex
                  ? "bg-blue-50 text-blue-900 dark:bg-blue-900/30 dark:text-blue-200"
                  : "text-gray-800 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-800"
              }`}
            >
              {suggestion}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
