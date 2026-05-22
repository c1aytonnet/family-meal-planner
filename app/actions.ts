"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  aiSettingsRepository,
  familyRepository,
  feedbackRepository,
  getActiveRecipes,
  getAISecrets,
  getHouseholdPreferences,
  groceryListRepository,
  mealPlanRepository,
  preferencesRepository,
  recipeRepository,
  saveAISecrets,
} from "@/lib/storage/repositories";
import type {
  AIProvider,
  AISettings,
  FamilyMember,
  Feedback,
  GroceryList,
  GroceryListItem,
  HouseholdPreferences,
  Recipe,
} from "@/lib/types";
import { parseListField } from "@/lib/forms";
import { PROVIDER_MODEL_OPTIONS } from "@/lib/ai/model-options";
import { generateStructuredMealPlan, hydrateMealPlanRecord } from "@/lib/ai/planner";
import { normalizeExternalHttpUrl } from "@/lib/security/url-safety";
import { makeId, slugify } from "@/lib/utils";

function aggregateGroceryItems(
  mealPlanId: string,
  weekOf: string,
  recipesById: Map<string, Recipe>,
  recipeIds: string[],
) {
  const buckets = new Map<string, GroceryListItem>();

  for (const recipeId of recipeIds) {
    const recipe = recipesById.get(recipeId);
    if (!recipe) {
      continue;
    }

    for (const ingredient of recipe.ingredients) {
      const key = `${ingredient.category}:${ingredient.name.toLowerCase()}`;
      const existing = buckets.get(key);

      if (existing) {
        existing.amount = `${existing.amount} + ${ingredient.amount}`;
        existing.recipeIds.push(recipe.id);
      } else {
        buckets.set(key, {
          id: makeId("item"),
          name: ingredient.name,
          amount: ingredient.amount,
          category: ingredient.category,
          checked: false,
          recipeIds: [recipe.id],
        });
      }
    }
  }

  const now = new Date().toISOString();

  return {
    id: makeId("grocery-list", mealPlanId),
    type: "grocery-list" as const,
    title: `Grocery list for ${weekOf}`,
    createdAt: now,
    updatedAt: now,
    mealPlanId,
    weekOf,
    items: Array.from(buckets.values()).sort((a, b) =>
      a.category.localeCompare(b.category) || a.name.localeCompare(b.name),
    ),
    body: "Auto-generated from the active weekly meal plan.",
  } satisfies GroceryList;
}

function parseIngredientsField(value: FormDataEntryValue | null) {
  return String(value ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [name = "", amount = "", category = "Pantry", optionalFlag = ""] = line
        .split("|")
        .map((part) => part.trim());

      return {
        name,
        amount,
        category,
        optional: optionalFlag.toLowerCase() === "optional" ? true : undefined,
      };
    })
    .filter((ingredient) => ingredient.name && ingredient.amount);
}

async function importDiscoveredRecipes(
  discoveredRecipes: NonNullable<
    Awaited<ReturnType<typeof generateStructuredMealPlan>>["suggestion"]["discoveredRecipes"]
  >,
) {
  const existingRecipes = await recipeRepository.list();
  const imported: Array<{
    id: string;
    title: string;
    sourceName?: string;
    sourceUrl?: string;
  }> = [];

  for (const candidate of discoveredRecipes) {
    if (!candidate.sourceUrl) {
      continue;
    }

    const existing =
      existingRecipes.find(
        (recipe) =>
          recipe.sourceUrl?.toLowerCase() === candidate.sourceUrl.toLowerCase(),
      ) ??
      existingRecipes.find(
        (recipe) =>
          recipe.title.toLowerCase() === candidate.title.toLowerCase() &&
          recipe.sourceName?.toLowerCase() === candidate.sourceName.toLowerCase(),
      );

    if (existing) {
      imported.push({
        id: existing.id,
        title: existing.title,
        sourceName: existing.sourceName,
        sourceUrl: existing.sourceUrl,
      });
      continue;
    }

    const now = new Date().toISOString();
    const safeSourceUrl = normalizeExternalHttpUrl(candidate.sourceUrl);
    if (!safeSourceUrl) {
      continue;
    }
    const recipe: Recipe = {
      id: makeId("recipe", `${slugify(candidate.title)}-${Date.now()}`),
      type: "recipe",
      title: candidate.title,
      createdAt: now,
      updatedAt: now,
      body: candidate.body,
      servings: candidate.servings,
      cookMethod: candidate.cookMethod,
      prepTimeMinutes: candidate.prepTimeMinutes,
      cookTimeMinutes: candidate.cookTimeMinutes,
      difficulty: candidate.difficulty,
      archived: false,
      sourceName: candidate.sourceName,
      sourceUrl: safeSourceUrl,
      importedAt: now,
      tags: candidate.tags,
      ingredients: candidate.ingredients,
      steps: candidate.steps,
      notes: candidate.notes,
    };

    await recipeRepository.save(recipe);
    existingRecipes.push(recipe);
    imported.push({
      id: recipe.id,
      title: recipe.title,
      sourceName: recipe.sourceName,
      sourceUrl: recipe.sourceUrl,
    });
  }

  return imported;
}

export async function createMealPlanAction(formData: FormData) {
  const request = String(formData.get("request") || "Plan dinners this week");
  const weekOf = String(formData.get("weekOf"));
  const family = await familyRepository.list();
  const householdSize =
    Number(formData.get("householdSize") || 0) || Math.max(family.length, 1);

  const plannerResult = await generateStructuredMealPlan({
    request,
    weekOf,
    householdSize,
  });

  const importedRecipes = plannerResult.suggestion.discoveredRecipes?.length
    ? await importDiscoveredRecipes(plannerResult.suggestion.discoveredRecipes)
    : [];
  const recipes = await getActiveRecipes();
  const mealPlan = hydrateMealPlanRecord({
    weekOf,
    request,
    householdSize,
    suggestion: plannerResult.suggestion,
    recipes,
    plannerStatus: plannerResult.status,
    plannerModel: plannerResult.model,
    plannerError: plannerResult.error,
    importedRecipes,
  });
  await mealPlanRepository.save(mealPlan);

  const recipeMap = new Map(recipes.map((recipe) => [recipe.id, recipe]));
  const groceryList = aggregateGroceryItems(
    mealPlan.id,
    weekOf,
    recipeMap,
    mealPlan.meals.map((meal) => meal.recipeId),
  );
  await groceryListRepository.save(groceryList);

  revalidatePath("/");
  revalidatePath("/planner");
  revalidatePath("/grocery-lists");
  revalidatePath("/recipes");
  redirect(`/planner?planId=${mealPlan.id}`);
}

export async function regenerateDayAction(formData: FormData) {
  const mealPlanId = String(formData.get("mealPlanId"));
  const day = String(formData.get("day"));

  const [mealPlan, recipes, preferences, feedback] = await Promise.all([
    mealPlanRepository.get(mealPlanId),
    getActiveRecipes(),
    getHouseholdPreferences(),
    feedbackRepository.list(),
  ]);

  if (!mealPlan || !preferences) {
    return;
  }

  const dislikedRecipeIds = feedback
    .filter((entry) => !entry.wouldRepeatSoon)
    .map((entry) => entry.recipeId);
  const usedRecipeIds = mealPlan.meals
    .filter((meal) => meal.day !== day)
    .map((meal) => meal.recipeId);

  const rulesText = preferences.weeklyRules.join(" ").toLowerCase();
  const scoredRecipes = recipes
    .filter((recipe) => !usedRecipeIds.includes(recipe.id))
    .map((recipe) => {
      let score = 0;

      if (dislikedRecipeIds.includes(recipe.id)) {
        score -= 10;
      }

      score += recipe.tags.filter((tag) => rulesText.includes(tag.toLowerCase())).length * 2;

      if (day === "Monday" && recipe.tags.some((tag) => ["vegetarian", "meatless"].includes(tag))) {
        score += 4;
      }

      if (day === "Saturday" || day === "Sunday") {
        if (recipe.cookMethod === "smoker") {
          score += 4;
        }
      } else if (recipe.difficulty === "easy") {
        score += 2;
      }

      return { recipe, score };
    })
    .sort((a, b) => b.score - a.score);

  const replacement = scoredRecipes[0]?.recipe ?? recipes[0];
  if (!replacement) {
    return;
  }

  mealPlan.meals = mealPlan.meals.map((meal) =>
    meal.day === day
      ? {
          ...meal,
          recipeId: replacement.id,
          recipeTitle: replacement.title,
          servings: Math.max(mealPlan.householdSize, replacement.servings),
          reason: `Regenerated using household rules and recipe history for ${day}.`,
          notes: replacement.notes[0],
        }
      : meal,
  );
  mealPlan.updatedAt = new Date().toISOString();
  mealPlan.body = mealPlan.notes;

  await mealPlanRepository.save(mealPlan);

  const groceryList = aggregateGroceryItems(
    mealPlan.id,
    mealPlan.weekOf,
    new Map(recipes.map((recipe) => [recipe.id, recipe])),
    mealPlan.meals.map((meal) => meal.recipeId),
  );
  await groceryListRepository.save(groceryList);

  revalidatePath("/planner");
  revalidatePath("/grocery-lists");
  redirect(`/planner?planId=${mealPlan.id}`);
}

export async function saveFeedbackAction(formData: FormData) {
  const recipeId = String(formData.get("recipeId"));
  const mealDate = String(formData.get("mealDate") || "").trim();
  const notes = String(formData.get("notes"));
  const recipe = await recipeRepository.get(recipeId);
  const recipeTitle = recipe?.title ?? String(formData.get("recipeTitle") || recipeId);
  const family = await familyRepository.list();
  const normalizedMealDate = mealDate || new Date().toISOString().slice(0, 10);

  const reactions = family
    .map((memberId) => ({
      memberId: memberId.id,
      reaction: String(formData.get(memberId.id) || "neutral"),
    }))
    .filter((item) => item.reaction) as Feedback["memberReactions"];

  const now = new Date().toISOString();
  const feedback: Feedback = {
    id: makeId("feedback"),
    type: "feedback",
    title: `${recipeTitle} feedback`,
    createdAt: now,
    updatedAt: now,
    recipeId,
    recipeTitle,
    mealDate: normalizedMealDate,
    memberReactions: reactions,
    leftoversRating: String(formData.get("leftoversRating") || "fine") as Feedback["leftoversRating"],
    wouldRepeatSoon: formData.get("wouldRepeatSoon") === "on",
    body: notes,
  };

  await feedbackRepository.save(feedback);
  revalidatePath("/history");
  revalidatePath("/planner");
  redirect(`/history?month=${normalizedMealDate.slice(0, 7)}&date=${normalizedMealDate}`);
}

export async function updateFamilyMemberAction(formData: FormData) {
  const id = String(formData.get("id") || "");
  if (!id) {
    return;
  }

  const existing = await familyRepository.get(id);
  if (!existing) {
    return;
  }

  const now = new Date().toISOString();
  const updated: FamilyMember = {
    ...existing,
    title: String(formData.get("name") || existing.name),
    name: String(formData.get("name") || existing.name),
    role: String(formData.get("role") || existing.role),
    likes: parseListField(formData.get("likes")),
    dislikes: parseListField(formData.get("dislikes")),
    dietaryNotes: parseListField(formData.get("dietaryNotes")),
    body:
      String(formData.get("body") || "").trim() ||
      existing.body ||
      `${String(formData.get("name") || existing.name)} household profile.`,
    updatedAt: now,
  };

  await familyRepository.save(updated);
  revalidatePath("/family");
  revalidatePath("/planner");
  revalidatePath("/preferences");
  revalidatePath("/");
}

export async function updateHouseholdPreferencesAction(formData: FormData) {
  const id = String(formData.get("id") || "");
  if (!id) {
    return;
  }

  const existing = await preferencesRepository.get(id);
  if (!existing) {
    return;
  }

  const safeExisting: HouseholdPreferences = {
    ...existing,
    weeklyRules: existing.weeklyRules ?? [],
    pantryStaples: existing.pantryStaples ?? [],
    planningNotes: existing.planningNotes ?? [],
    recipeIdeaSources: existing.recipeIdeaSources ?? [],
  };

  const now = new Date().toISOString();
  const updated: HouseholdPreferences = {
    ...safeExisting,
    title: String(formData.get("householdName") || safeExisting.householdName),
    householdName: String(formData.get("householdName") || safeExisting.householdName),
    weeklyRules: parseListField(formData.get("weeklyRules")),
    pantryStaples: parseListField(formData.get("pantryStaples")),
    planningNotes: parseListField(formData.get("planningNotes")),
    recipeIdeaSources: parseListField(formData.get("recipeIdeaSources")),
    body:
      String(formData.get("body") || "").trim() ||
      safeExisting.body ||
      "Household planning preferences.",
    updatedAt: now,
  };

  await preferencesRepository.save(updated);
  revalidatePath("/preferences");
  revalidatePath("/planner");
  revalidatePath("/");
}

export async function createFamilyMemberAction(formData: FormData) {
  const name = String(formData.get("name") || "").trim();
  if (!name) {
    return;
  }

  const now = new Date().toISOString();
  const member: FamilyMember = {
    id: makeId("member", name),
    type: "family-member",
    title: name,
    createdAt: now,
    updatedAt: now,
    name,
    role: String(formData.get("role") || "Family member").trim() || "Family member",
    likes: parseListField(formData.get("likes")),
    dislikes: parseListField(formData.get("dislikes")),
    dietaryNotes: parseListField(formData.get("dietaryNotes")),
    favoriteRecipes: [],
    feedbackIds: [],
    body:
      String(formData.get("body") || "").trim() ||
      `${name} household profile.`,
  };

  await familyRepository.save(member);
  revalidatePath("/family");
  revalidatePath("/planner");
  revalidatePath("/preferences");
  revalidatePath("/");
}

export async function deleteFamilyMemberAction(formData: FormData) {
  const id = String(formData.get("id") || "");
  if (!id) {
    return;
  }

  await familyRepository.delete(id);
  revalidatePath("/family");
  revalidatePath("/planner");
  revalidatePath("/preferences");
  revalidatePath("/");
}

export async function updateAISettingsAction(formData: FormData) {
  const settings = await aiSettingsRepository.list();
  const existing = settings[0];
  if (!existing) {
    return;
  }

  const secretStore = await getAISecrets();
  const providers = ["openai", "anthropic", "perplexity"] as const satisfies readonly AIProvider[];

  const nextProviders = providers.map((provider) => {
    const apiKey = String(formData.get(`${provider}_apiKey`) || "").trim();
    const enabledFromForm = formData.get(`${provider}_enabled`) === "on";
    if (apiKey) {
      secretStore[provider] = apiKey;
    }

    const current = existing.providers.find((item) => item.provider === provider);
    const modelChoice = String(formData.get(`${provider}_modelChoice`) || "").trim();
    const customModel = String(formData.get(`${provider}_customModel`) || "").trim();
    const firstPreset = PROVIDER_MODEL_OPTIONS[provider][0]?.value ?? current?.model ?? "";
    const nextModel =
      modelChoice === "__custom__"
        ? customModel || current?.model || firstPreset
        : modelChoice || current?.model || firstPreset;

    return {
      provider,
      enabled: enabledFromForm || Boolean(apiKey && provider === String(formData.get("defaultProvider") || existing.defaultProvider)),
      model: nextModel,
      apiKeyHint: secretStore[provider]
        ? `${secretStore[provider].slice(0, 3)}...${secretStore[provider].slice(-3)}`
        : "",
    };
  });

  const updated: AISettings = {
    ...existing,
    title: "AI Settings",
    defaultProvider: String(formData.get("defaultProvider") || existing.defaultProvider) as AIProvider,
    providers: nextProviders,
    updatedAt: new Date().toISOString(),
    body:
      existing.body ||
      "Configure which provider the planner should use. API keys are stored separately in the server-only secrets area.",
  };

  await aiSettingsRepository.save(updated);
  await saveAISecrets(secretStore);
  revalidatePath("/ai-settings");
  revalidatePath("/planner");
}

export async function createRecipeAction(formData: FormData) {
  const title = String(formData.get("title") || "").trim();
  if (!title) {
    return;
  }

  const now = new Date().toISOString();
  const sourceUrl = normalizeExternalHttpUrl(String(formData.get("sourceUrl") || ""));
  const recipe: Recipe = {
    id: makeId("recipe", `${slugify(title)}-${Date.now()}`),
    type: "recipe",
    title,
    createdAt: now,
    updatedAt: now,
    body: String(formData.get("body") || "").trim(),
    servings: Number(formData.get("servings") || 4),
    cookMethod: String(formData.get("cookMethod") || "").trim() || "oven",
    prepTimeMinutes: Number(formData.get("prepTimeMinutes") || 15),
    cookTimeMinutes: Number(formData.get("cookTimeMinutes") || 20),
    difficulty: String(formData.get("difficulty") || "easy") as Recipe["difficulty"],
    archived: false,
    sourceName: String(formData.get("sourceName") || "").trim() || undefined,
    sourceUrl,
    tags: parseListField(formData.get("tags")),
    ingredients: parseIngredientsField(formData.get("ingredients")),
    steps: parseListField(formData.get("steps")),
    notes: parseListField(formData.get("notes")),
  };

  await recipeRepository.save(recipe);
  revalidatePath("/recipes");
  revalidatePath("/planner");
  redirect(`/recipes/${recipe.id}`);
}

export async function updateRecipeAction(formData: FormData) {
  const id = String(formData.get("id") || "");
  if (!id) {
    return;
  }

  const existing = await recipeRepository.get(id);
  if (!existing) {
    return;
  }

  const updated: Recipe = {
    ...existing,
    title: String(formData.get("title") || existing.title).trim(),
    updatedAt: new Date().toISOString(),
    body: String(formData.get("body") || existing.body).trim(),
    servings: Number(formData.get("servings") || existing.servings),
    cookMethod: String(formData.get("cookMethod") || existing.cookMethod).trim(),
    prepTimeMinutes: Number(formData.get("prepTimeMinutes") || existing.prepTimeMinutes),
    cookTimeMinutes: Number(formData.get("cookTimeMinutes") || existing.cookTimeMinutes),
    difficulty: String(formData.get("difficulty") || existing.difficulty) as Recipe["difficulty"],
    sourceName: String(formData.get("sourceName") || "").trim() || undefined,
    sourceUrl: normalizeExternalHttpUrl(String(formData.get("sourceUrl") || "")),
    tags: parseListField(formData.get("tags")),
    ingredients: parseIngredientsField(formData.get("ingredients")),
    steps: parseListField(formData.get("steps")),
    notes: parseListField(formData.get("notes")),
  };

  await recipeRepository.save(updated);
  revalidatePath("/recipes");
  revalidatePath(`/recipes/${id}`);
  revalidatePath("/planner");
  redirect(`/recipes/${id}`);
}

export async function archiveRecipeAction(formData: FormData) {
  const id = String(formData.get("id") || "");
  if (!id) {
    return;
  }

  const existing = await recipeRepository.get(id);
  if (!existing) {
    return;
  }

  await recipeRepository.save({
    ...existing,
    archived: true,
    updatedAt: new Date().toISOString(),
  });

  revalidatePath("/recipes");
  revalidatePath(`/recipes/${id}`);
  revalidatePath("/planner");
  redirect("/recipes");
}
