import type { Recipe, CuisineType, DifficultyType } from "@/lib/recipes/types";

export function rowToRecipe(row: Record<string, unknown>): Recipe {
  return {
    id: row.id as string,
    name: row.name as string,
    cuisine: row.cuisine as CuisineType,
    difficulty: row.difficulty as DifficultyType,
    cookTime: (row.cook_time as string) ?? "",
    servings: (row.servings as number) ?? 2,
    ingredients: (row.ingredients as string[]) ?? [],
    seasonings: (row.seasonings as string[]) ?? [],
    steps: (row.steps as string[]) ?? [],
    youtubeUrl: (row.youtube_url as string) ?? "",
    youtubeTitle: (row.youtube_title as string) ?? "",
    channelName: (row.channel_name as string) ?? "",
    thumbnailUrl: (row.thumbnail_url as string) ?? "",
    summary: (row.summary as string) ?? "",
    source: (row.source as "curated" | "user") ?? "curated",
  };
}
