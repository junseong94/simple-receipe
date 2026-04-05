// 요리 카테고리
export type CuisineType = "korean" | "chinese" | "japanese" | "western";

// 난이도
export type DifficultyType = "easy" | "medium" | "hard";

// 레시피 (큐레이션 + 사용자 공통)
export interface Recipe {
  id: string;               // "korean-001" (큐레이션) | UUID (사용자)
  name: string;
  cuisine: CuisineType;
  difficulty: DifficultyType;
  cookTime: string;
  servings: number;
  ingredients: string[];    // 필수 재료 (기본양념 제외)
  seasonings: string[];     // 기본 양념
  steps: string[];
  youtubeUrl: string;
  youtubeTitle: string;
  channelName: string;
  thumbnailUrl: string;
  summary: string;
  source: "curated" | "user";
}

// 점수 계산된 레시피
export interface ScoredRecipe {
  recipe: Recipe;
  matchedIngredients: string[];
  missingIngredients: string[];
  missingCount: number;
  matchRatio: number;       // 0~1 (matched / total required ingredients)
}

// 재료 사전
export interface Ingredient {
  name: string;
  aliases: string[];
  category:
    | "meat"
    | "seafood"
    | "vegetable"
    | "dairy"
    | "grain"
    | "seasoning"
    | "pantry";
}

export interface IngredientDictionary {
  ingredients: Ingredient[];
}
