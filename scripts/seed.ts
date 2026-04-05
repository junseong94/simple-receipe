import { readFileSync } from "fs";
import { resolve } from "path";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

interface RecipeJson {
  id: string;
  name: string;
  cuisine: string;
  difficulty: string;
  cookTime: string;
  servings: number;
  ingredients: string[];
  seasonings: string[];
  steps: string[];
  youtubeUrl: string;
  youtubeTitle: string;
  channelName: string;
  thumbnailUrl: string;
  summary: string;
  source: string;
}

interface IngredientJson {
  name: string;
  aliases: string[];
  category: string;
}

interface IngredientFile {
  ingredients: IngredientJson[];
}

async function seed(): Promise<void> {
  const root = resolve(process.cwd());

  const recipes = JSON.parse(
    readFileSync(resolve(root, "data/recipes.json"), "utf-8"),
  ) as RecipeJson[];

  const { ingredients } = JSON.parse(
    readFileSync(resolve(root, "data/ingredients.json"), "utf-8"),
  ) as IngredientFile;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    for (const recipe of recipes) {
      await client.query(
        `INSERT INTO recipes
           (id, name, cuisine, difficulty, cook_time, servings,
            ingredients, seasonings, steps,
            youtube_url, youtube_title, channel_name, thumbnail_url, summary, source)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
         ON CONFLICT (id) DO NOTHING`,
        [
          recipe.id,
          recipe.name,
          recipe.cuisine,
          recipe.difficulty,
          recipe.cookTime,
          recipe.servings,
          recipe.ingredients,
          recipe.seasonings,
          recipe.steps,
          recipe.youtubeUrl,
          recipe.youtubeTitle,
          recipe.channelName,
          recipe.thumbnailUrl,
          recipe.summary,
          "curated",
        ],
      );
    }

    for (const ing of ingredients) {
      await client.query(
        `INSERT INTO ingredients (name, aliases, category)
         VALUES ($1, $2, $3)
         ON CONFLICT (name) DO NOTHING`,
        [ing.name, ing.aliases, ing.category],
      );
    }

    await client.query("COMMIT");
    console.log(
      `Seed complete. recipes=${recipes.length}, ingredients=${ingredients.length}`,
    );
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
