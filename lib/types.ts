export type EntityType =
  | "family-member"
  | "household-preferences"
  | "recipe"
  | "meal-plan"
  | "feedback"
  | "grocery-list"
  | "ai-log"
  | "ai-settings";

export type AIProvider = "openai" | "anthropic" | "perplexity";

export interface BaseRecord {
  id: string;
  type: EntityType;
  title: string;
  createdAt: string;
  updatedAt: string;
  body: string;
}

export interface FamilyMember extends BaseRecord {
  type: "family-member";
  name: string;
  role: string;
  likes: string[];
  dislikes: string[];
  dietaryNotes: string[];
  favoriteRecipes: string[];
  feedbackIds: string[];
}

export interface HouseholdPreferences extends BaseRecord {
  type: "household-preferences";
  householdName: string;
  weeklyRules: string[];
  pantryStaples: string[];
  planningNotes: string[];
  recipeIdeaSources: string[];
}

export interface RecipeIngredient {
  name: string;
  amount: string;
  category: string;
  optional?: boolean;
}

export interface Recipe extends BaseRecord {
  type: "recipe";
  servings: number;
  cookMethod: string;
  prepTimeMinutes: number;
  cookTimeMinutes: number;
  difficulty: "easy" | "moderate" | "project";
  archived?: boolean;
  sourceName?: string;
  sourceUrl?: string;
  importedAt?: string;
  tags: string[];
  ingredients: RecipeIngredient[];
  steps: string[];
  notes: string[];
}

export interface RecipeDraft {
  title: string;
  body: string;
  servings: number;
  cookMethod: string;
  prepTimeMinutes: number;
  cookTimeMinutes: number;
  difficulty: Recipe["difficulty"];
  tags: string[];
  ingredients: RecipeIngredient[];
  steps: string[];
  notes: string[];
  sourceName?: string;
  sourceUrl?: string;
}

export interface PlannedMeal {
  day: string;
  date: string;
  recipeId: string;
  recipeTitle: string;
  servings: number;
  reason: string;
  notes?: string;
}

export interface MealPlan extends BaseRecord {
  type: "meal-plan";
  weekOf: string;
  householdSize: number;
  request: string;
  meals: PlannedMeal[];
  notes: string;
  groceryAdjustments: string[];
  plannerStatus?: "success" | "fallback" | "error";
  plannerModel?: string;
  plannerError?: string;
  importedRecipes?: Array<{
    id: string;
    title: string;
    sourceName?: string;
    sourceUrl?: string;
  }>;
}

export interface MemberReaction {
  memberId: string;
  reaction: "loved" | "liked" | "neutral" | "disliked";
}

export interface Feedback extends BaseRecord {
  type: "feedback";
  recipeId: string;
  recipeTitle: string;
  mealDate: string;
  memberReactions: MemberReaction[];
  leftoversRating: "great" | "fine" | "none";
  wouldRepeatSoon: boolean;
}

export interface GroceryListItem {
  id: string;
  name: string;
  amount: string;
  category: string;
  checked: boolean;
  recipeIds: string[];
}

export interface GroceryList extends BaseRecord {
  type: "grocery-list";
  mealPlanId: string;
  weekOf: string;
  items: GroceryListItem[];
}

export interface AiLog extends BaseRecord {
  type: "ai-log";
  prompt: string;
  model: string;
  status: "success" | "fallback" | "error";
  mealPlanId?: string;
  error?: string;
}

export interface AIProviderConfig {
  provider: AIProvider;
  enabled: boolean;
  model: string;
  apiKeyHint?: string;
}

export interface AISettings extends BaseRecord {
  type: "ai-settings";
  defaultProvider: AIProvider;
  providers: AIProviderConfig[];
}

export interface PlanSuggestion {
  mealPlan: Array<{
    day: string;
    date: string;
    recipeId: string;
    servings: number;
    reason: string;
    notes?: string;
  }>;
  notes: string;
  groceryAdjustments: string[];
  discoveredRecipes: Array<{
    title: string;
    body: string;
    servings: number;
    cookMethod: string;
    prepTimeMinutes: number;
    cookTimeMinutes: number;
    difficulty: Recipe["difficulty"];
    tags: string[];
    ingredients: RecipeIngredient[];
    steps: string[];
    notes: string[];
    sourceName: string;
    sourceUrl: string;
  }>;
}

export interface PlannerResult {
  suggestion: PlanSuggestion;
  status: "success" | "fallback" | "error";
  model: string;
  error?: string;
  importedRecipes?: Array<{
    id: string;
    title: string;
    sourceName?: string;
    sourceUrl?: string;
  }>;
}

export interface PlannerContext {
  recipes: Recipe[];
  familyMembers: FamilyMember[];
  preferences: HouseholdPreferences;
  feedback: Feedback[];
  householdSize: number;
  weekOf: string;
  request: string;
}
