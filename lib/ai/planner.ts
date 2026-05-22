import { z } from "zod";
import {
  aiLogRepository,
  familyRepository,
  feedbackRepository,
  getActiveRecipes,
  getHouseholdPreferences,
} from "@/lib/storage/repositories";
import { generateProviderMealPlan } from "@/lib/ai/providers";
import type {
  AiLog,
  MealPlan,
  PlannerResult,
  PlanSuggestion,
  PlannerContext,
  Recipe,
} from "@/lib/types";
import { getWeekDays, makeId } from "@/lib/utils";

const structuredMealSchema = z.object({
  mealPlan: z.array(
    z.object({
      day: z.string(),
      date: z.string(),
      recipeId: z.string(),
      servings: z.number().int().min(1),
      reason: z.string(),
      notes: z.string(),
    }),
  ),
  notes: z.string(),
  groceryAdjustments: z.array(z.string()),
  discoveredRecipes: z
    .array(
      z.object({
        title: z.string(),
        body: z.string(),
        servings: z.number().int().min(1),
        cookMethod: z.string(),
        prepTimeMinutes: z.number().int().min(0),
        cookTimeMinutes: z.number().int().min(0),
        difficulty: z.enum(["easy", "moderate", "project"]),
        tags: z.array(z.string()),
        ingredients: z.array(
          z.object({
            name: z.string(),
            amount: z.string(),
            category: z.string(),
            optional: z.boolean(),
          }),
        ),
        steps: z.array(z.string()),
        notes: z.array(z.string()),
        sourceName: z.string(),
        sourceUrl: z.string().url(),
      }),
    ),
});

function scoreRecipe(recipe: Recipe, context: PlannerContext, day: string) {
  let score = 0;

  const requestText = context.request.toLowerCase();
  const familyDislikes = context.familyMembers.flatMap((member) => member.dislikes);
  const negativeFeedback = context.feedback
    .filter((entry) => !entry.wouldRepeatSoon)
    .map((entry) => entry.recipeId);

  if (negativeFeedback.includes(recipe.id)) {
    score -= 8;
  }

  if (recipe.tags.some((tag) => requestText.includes(tag.toLowerCase()))) {
    score += 5;
  }

  if (requestText.includes("simple") && recipe.difficulty === "easy") {
    score += 4;
  }

  if (requestText.includes("smoker") && recipe.cookMethod === "smoker") {
    score += 5;
  }

  if (day === "Monday" && context.preferences.weeklyRules.some((rule) => rule.toLowerCase().includes("meatless"))) {
    if (recipe.tags.includes("meatless") || recipe.tags.includes("vegetarian")) {
      score += 6;
    } else {
      score -= 4;
    }
  }

  if (recipe.servings >= context.householdSize) {
    score += 2;
  }

  const dislikeMatch = familyDislikes.some((dislike) =>
    recipe.title.toLowerCase().includes(dislike.toLowerCase()) ||
    recipe.tags.some((tag) => tag.toLowerCase().includes(dislike.toLowerCase())),
  );

  if (dislikeMatch) {
    score -= 5;
  }

  return score;
}

function buildFallbackPlan(context: PlannerContext): PlanSuggestion {
  const weekDays = getWeekDays(context.weekOf);
  const recipes = [...context.recipes].sort((a, b) => a.title.localeCompare(b.title));
  const used = new Set<string>();

  const mealPlan = weekDays.map(({ day, date }) => {
    const selected =
      recipes
        .filter((recipe) => !used.has(recipe.id))
        .sort((a, b) => scoreRecipe(b, context, day) - scoreRecipe(a, context, day))[0] ?? recipes[0];

    used.add(selected.id);

    return {
      day,
      date,
      recipeId: selected.id,
      servings: Math.max(context.householdSize, selected.servings),
      reason:
        day === "Monday" && selected.tags.some((tag) => ["vegetarian", "meatless"].includes(tag))
          ? "Fits the household meatless Monday preference."
          : `Selected from the library because it matches recent preferences and the request for ${context.request.toLowerCase()}.`,
      notes: selected.notes[0],
    };
  });

  return {
    mealPlan,
    notes:
      "Fallback planner used structured household data and recent feedback because no live AI response was available.",
    groceryAdjustments: [
      "Double-check pantry staples before shopping.",
      "Scale proteins up for weekend leftovers if extra guests join.",
    ],
    discoveredRecipes: [],
  };
}

function sanitizePlan(plan: PlanSuggestion, recipes: Recipe[], householdSize: number) {
  const recipeMap = new Map(recipes.map((recipe) => [recipe.id, recipe]));

  return {
    mealPlan: plan.mealPlan
      .filter((entry) => recipeMap.has(entry.recipeId))
      .map((entry) => ({
        ...entry,
        servings: Math.max(householdSize, entry.servings),
      })),
    notes: plan.notes,
    groceryAdjustments: plan.groceryAdjustments,
    discoveredRecipes: plan.discoveredRecipes ?? [],
  };
}

async function saveAiLog(log: AiLog) {
  await aiLogRepository.save(log);
}

export async function generateStructuredMealPlan({
  request,
  weekOf,
  householdSize,
}: {
  request: string;
  weekOf: string;
  householdSize: number;
}): Promise<PlannerResult> {
  const [recipes, familyMembers, preferences, feedback] = await Promise.all([
    getActiveRecipes(),
    familyRepository.list(),
    getHouseholdPreferences(),
    feedbackRepository.list(),
  ]);

  if (!preferences) {
    throw new Error("Household preferences are missing.");
  }

  if (recipes.length === 0) {
    throw new Error("Add at least one active recipe before generating a meal plan.");
  }

  const context: PlannerContext = {
    recipes,
    familyMembers,
    preferences,
    feedback,
    householdSize,
    weekOf,
    request,
  };

  const fallbackModel = "local:fallback-planner";
  const logId = makeId("ai-log");

  try {
    const providerResult = await generateProviderMealPlan({
      request,
      weekOf,
      householdSize,
      rules: preferences.weeklyRules,
      planningNotes: preferences.planningNotes,
      preferredRecipeSites: preferences.recipeIdeaSources,
      familyMembers: familyMembers.map((member) => ({
        id: member.id,
        name: member.name,
        likes: member.likes,
        dislikes: member.dislikes,
        dietaryNotes: member.dietaryNotes,
      })),
      feedback: feedback.slice(-8).map((entry) => ({
        recipeId: entry.recipeId,
        recipeTitle: entry.recipeTitle,
        wouldRepeatSoon: entry.wouldRepeatSoon,
        reactions: entry.memberReactions,
        summary: entry.body,
      })),
      recipes: recipes.map((recipe) => ({
        id: recipe.id,
        title: recipe.title,
        servings: recipe.servings,
        cookMethod: recipe.cookMethod,
        difficulty: recipe.difficulty,
        tags: recipe.tags,
        ingredientCategories: recipe.ingredients.map((item) => item.category),
        notes: recipe.notes,
      })),
    });

    let output: PlanSuggestion;
    let model: string;
    if (providerResult) {
      output = structuredMealSchema.parse(providerResult.result);
      model = `${providerResult.provider}:${providerResult.model}`;
    } else {
      throw new Error("No enabled AI provider is configured.");
    }

    const sanitized = sanitizePlan(output, recipes, householdSize);

    await saveAiLog({
      id: logId,
      type: "ai-log",
      title: `AI plan ${weekOf}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      prompt: request,
      model,
      status: "success",
      body: JSON.stringify(sanitized, null, 2),
    });

    return {
      suggestion: sanitized,
      status: "success",
      model,
      importedRecipes: [],
    };
  } catch (error) {
    console.error("Meal planner AI request failed:", error);
    const fallback = buildFallbackPlan(context);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    await saveAiLog({
      id: logId,
      type: "ai-log",
      title: `Planner error ${weekOf}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      prompt: request,
      model: fallbackModel,
      status: "error",
      error: errorMessage,
      body: JSON.stringify(fallback, null, 2),
    });
    return {
      suggestion: fallback,
      status: "error",
      model: fallbackModel,
      error: errorMessage,
      importedRecipes: [],
    };
  }
}

export function hydrateMealPlanRecord({
  weekOf,
  request,
  householdSize,
  suggestion,
  recipes,
  plannerStatus,
  plannerModel,
  plannerError,
  importedRecipes,
}: {
  weekOf: string;
  request: string;
  householdSize: number;
  suggestion: PlanSuggestion;
  recipes: Recipe[];
  plannerStatus?: "success" | "fallback" | "error";
  plannerModel?: string;
  plannerError?: string;
  importedRecipes?: MealPlan["importedRecipes"];
}): MealPlan {
  const recipeMap = new Map(recipes.map((recipe) => [recipe.id, recipe]));
  const now = new Date().toISOString();

  return {
    id: makeId("meal-plan", `${weekOf}-${Date.now()}`),
    type: "meal-plan",
    title: `Meal plan for ${weekOf}`,
    createdAt: now,
    updatedAt: now,
    weekOf,
    householdSize,
    request,
    meals: suggestion.mealPlan.map((meal) => ({
      ...meal,
      recipeTitle: recipeMap.get(meal.recipeId)?.title ?? meal.recipeId,
    })),
    notes: suggestion.notes,
    groceryAdjustments: suggestion.groceryAdjustments,
    plannerStatus,
    plannerModel,
    plannerError,
    importedRecipes,
    body: suggestion.notes,
  };
}
