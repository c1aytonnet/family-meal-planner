import path from "node:path";

export const DATA_DIR =
  process.env.DATA_DIR || path.join(process.cwd(), "saved-data");
export const SEED_DIR = path.join(process.cwd(), "seed-data");

export const COLLECTIONS = {
  familyMembers: "family-members",
  preferences: "preferences",
  recipes: "recipes",
  mealPlans: "meal-plans",
  feedback: "feedback",
  groceryLists: "grocery-lists",
  aiLogs: "ai-logs",
  aiSettings: "ai-settings",
} as const;

export type CollectionKey = keyof typeof COLLECTIONS;

export function collectionPath(key: CollectionKey) {
  return path.join(DATA_DIR, COLLECTIONS[key]);
}

export function secretsPath() {
  return path.join(DATA_DIR, "secrets");
}
