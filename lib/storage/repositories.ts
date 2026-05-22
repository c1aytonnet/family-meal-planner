import path from "node:path";
import { promises as fs } from "node:fs";
import { collectionPath, secretsPath } from "@/lib/storage/config";
import { storageCache } from "@/lib/storage/cache";
import {
  atomicWriteJsonFile,
  atomicWriteMarkdownFile,
  fileExists,
  listMarkdownFiles,
  readJsonFile,
  readMarkdownFile,
} from "@/lib/storage/files";
import { ensureSeedData } from "@/lib/storage/seed";
import type {
  AIProvider,
  AISettings,
  AiLog,
  FamilyMember,
  Feedback,
  GroceryList,
  HouseholdPreferences,
  MealPlan,
  Recipe,
} from "@/lib/types";

type SupportedRecord =
  | FamilyMember
  | HouseholdPreferences
  | Recipe
  | MealPlan
  | Feedback
  | GroceryList
  | AiLog
  | AISettings;

function normalizePreferences(
  item: HouseholdPreferences | null,
): HouseholdPreferences | null {
  if (!item) {
    return null;
  }

  return {
    ...item,
    weeklyRules: item.weeklyRules ?? [],
    pantryStaples: item.pantryStaples ?? [],
    planningNotes: item.planningNotes ?? [],
    recipeIdeaSources: item.recipeIdeaSources ?? [],
  };
}

function normalizeAiSettings(item: AISettings | null): AISettings | null {
  if (!item) {
    return null;
  }

  return {
    ...item,
    defaultProvider: item.defaultProvider ?? "openai",
    providers: item.providers ?? [],
  };
}

class MarkdownRepository<T extends SupportedRecord> {
  constructor(
    private readonly collectionKey:
      | "familyMembers"
      | "preferences"
      | "recipes"
      | "mealPlans"
      | "feedback"
      | "groceryLists"
      | "aiLogs"
      | "aiSettings",
  ) {}

  private cacheKey() {
    return `collection:${this.collectionKey}`;
  }

  private filePath(id: string) {
    return path.join(collectionPath(this.collectionKey), `${id}.md`);
  }

  async list(): Promise<T[]> {
    await ensureSeedData();
    const cached = storageCache.get<T[]>(this.cacheKey());
    if (cached) {
      return cached;
    }

    const files = await listMarkdownFiles(collectionPath(this.collectionKey));
    const items = await Promise.all(
      files.map(async (filePath) => {
        try {
          const { data, content } = await readMarkdownFile<Omit<T, "body">>(
            filePath,
          );
          return {
            ...(data as T),
            body: content,
          };
        } catch (error) {
          console.warn(`Skipping malformed record ${filePath}`, error);
          return null;
        }
      }),
    );

    const filtered = items.filter(Boolean) as T[];
    filtered.sort((a, b) => a.title.localeCompare(b.title));

    return storageCache.set(this.cacheKey(), filtered);
  }

  async get(id: string) {
    const items = await this.list();
    return items.find((item) => item.id === id) ?? null;
  }

  async save(record: T) {
    await ensureSeedData();
    const { body, ...frontmatter } = record;
    await atomicWriteMarkdownFile(this.filePath(record.id), frontmatter, body);
    storageCache.invalidate(this.cacheKey());
    return record;
  }

  async exists(id: string) {
    return fileExists(this.filePath(id));
  }

  async delete(id: string) {
    await ensureSeedData();
    try {
      await fs.unlink(this.filePath(id));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        throw error;
      }
    }
    storageCache.invalidate(this.cacheKey());
  }
}

export const familyRepository = new MarkdownRepository<FamilyMember>(
  "familyMembers",
);
export const preferencesRepository = new MarkdownRepository<HouseholdPreferences>(
  "preferences",
);
export const recipeRepository = new MarkdownRepository<Recipe>("recipes");
export const mealPlanRepository = new MarkdownRepository<MealPlan>("mealPlans");
export const feedbackRepository = new MarkdownRepository<Feedback>("feedback");
export const groceryListRepository = new MarkdownRepository<GroceryList>(
  "groceryLists",
);
export const aiLogRepository = new MarkdownRepository<AiLog>("aiLogs");
export const aiSettingsRepository = new MarkdownRepository<AISettings>("aiSettings");

export async function getActiveRecipes() {
  const recipes = await recipeRepository.list();
  return recipes.filter((recipe) => !recipe.archived);
}

export async function getHouseholdPreferences() {
  const items = await preferencesRepository.list();
  return normalizePreferences(items[0] ?? null);
}

export async function getAISettings() {
  const items = await aiSettingsRepository.list();
  return normalizeAiSettings(items[0] ?? null);
}

const AI_SECRETS_FILE = path.join(secretsPath(), "ai-provider-keys.json");

export async function getAISecrets() {
  return readJsonFile<Record<AIProvider, string>>(
    AI_SECRETS_FILE,
    {
      openai: "",
      anthropic: "",
      perplexity: "",
    },
  );
}

export async function saveAISecrets(secrets: Record<AIProvider, string>) {
  await atomicWriteJsonFile(AI_SECRETS_FILE, secrets);
  storageCache.invalidate("ai-secrets");
}
