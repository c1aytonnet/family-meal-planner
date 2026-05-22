import type { AIProvider, AISettings, PlanSuggestion, Recipe } from "@/lib/types";
import { getAISecrets, getAISettings } from "@/lib/storage/repositories";

interface PlannerProviderContext {
  request: string;
  weekOf: string;
  householdSize: number;
  rules: string[];
  planningNotes: string[];
  preferredRecipeSites: string[];
  familyMembers: Array<{
    id: string;
    name: string;
    likes: string[];
    dislikes: string[];
    dietaryNotes: string[];
  }>;
  feedback: Array<{
    recipeId: string;
    recipeTitle: string;
    wouldRepeatSoon: boolean;
    reactions: Array<{ memberId: string; reaction: string }>;
    summary: string;
  }>;
  recipes: Array<{
    id: string;
    title: string;
    servings: number;
    cookMethod: string;
    difficulty: Recipe["difficulty"];
    tags: string[];
    ingredientCategories: string[];
    notes: string[];
  }>;
}

const mealPlanSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    mealPlan: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          day: { type: "string" },
          date: { type: "string" },
          recipeId: { type: "string" },
          servings: { type: "integer", minimum: 1 },
          reason: { type: "string" },
          notes: { type: "string" },
        },
        required: ["day", "date", "recipeId", "servings", "reason", "notes"],
      },
    },
    notes: { type: "string" },
    groceryAdjustments: {
      type: "array",
      items: { type: "string" },
    },
    discoveredRecipes: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          title: { type: "string" },
          body: { type: "string" },
          servings: { type: "integer", minimum: 1 },
          cookMethod: { type: "string" },
          prepTimeMinutes: { type: "integer", minimum: 0 },
          cookTimeMinutes: { type: "integer", minimum: 0 },
          difficulty: { type: "string", enum: ["easy", "moderate", "project"] },
          tags: { type: "array", items: { type: "string" } },
          ingredients: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                name: { type: "string" },
                amount: { type: "string" },
                category: { type: "string" },
                optional: { type: "boolean" },
              },
              required: ["name", "amount", "category", "optional"],
            },
          },
          steps: { type: "array", items: { type: "string" } },
          notes: { type: "array", items: { type: "string" } },
          sourceName: { type: "string" },
          sourceUrl: { type: "string" },
        },
        required: [
          "title",
          "body",
          "servings",
          "cookMethod",
          "prepTimeMinutes",
          "cookTimeMinutes",
          "difficulty",
          "tags",
          "ingredients",
          "steps",
          "notes",
          "sourceName",
          "sourceUrl",
        ],
      },
    },
  },
  required: ["mealPlan", "notes", "groceryAdjustments", "discoveredRecipes"],
} as const;

const systemPrompt =
  "You are a meal-planning assistant. Respond with valid JSON only. Choose meal-plan recipes only from the provided recipe IDs. If you identify a genuinely new recipe idea from a preferred recipe site and you can provide a concrete source URL, include it under discoveredRecipes. Never put an unsourced or invented recipe in discoveredRecipes. Recipes are the source of truth for the actual meal plan.";

function extractJson(text: string) {
  const trimmed = text.trim();
  if (trimmed.startsWith("{")) {
    return trimmed;
  }

  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) {
    return trimmed.slice(start, end + 1);
  }

  throw new Error("Provider did not return JSON.");
}

function extractOpenAIText(payload: {
  output_text?: string;
  output?: Array<{
    content?: Array<{
      type?: string;
      text?: string;
    }>;
  }>;
}) {
  if (payload.output_text?.trim()) {
    return payload.output_text;
  }

  const textFromContent = payload.output
    ?.flatMap((item) => item.content ?? [])
    .filter((item) => item.type === "output_text" || item.type === "text")
    .map((item) => item.text ?? "")
    .join("\n")
    .trim();

  if (textFromContent) {
    return textFromContent;
  }

  throw new Error("Provider did not return JSON.");
}

async function callOpenAI(apiKey: string, model: string, context: PlannerProviderContext) {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      instructions: systemPrompt,
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: JSON.stringify(context),
            },
          ],
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "meal_plan",
          strict: true,
          schema: mealPlanSchema,
        },
      },
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`OpenAI request failed with ${response.status}: ${body}`);
  }

  const payload = (await response.json()) as {
    output_text?: string;
    output?: Array<{
      content?: Array<{
        type?: string;
        text?: string;
      }>;
    }>;
  };
  return extractJson(extractOpenAIText(payload));
}

async function callAnthropic(apiKey: string, model: string, context: PlannerProviderContext) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 1600,
      system: `${systemPrompt} Output plain JSON that matches this schema: ${JSON.stringify(mealPlanSchema)}.`,
      messages: [
        {
          role: "user",
          content: JSON.stringify(context),
        },
      ],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Anthropic request failed with ${response.status}: ${body}`);
  }

  const payload = (await response.json()) as {
    content?: Array<{ type?: string; text?: string }>;
  };
  const text = payload.content?.find((item) => item.type === "text")?.text ?? "";
  return extractJson(text);
}

async function callPerplexity(apiKey: string, model: string, context: PlannerProviderContext) {
  const response = await fetch("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: `${systemPrompt} Output plain JSON only.` },
        { role: "user", content: `${JSON.stringify(context)}\n\nReturn JSON matching this schema: ${JSON.stringify(mealPlanSchema)}` },
      ],
      temperature: 0.2,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Perplexity request failed with ${response.status}: ${body}`);
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const text = payload.choices?.[0]?.message?.content ?? "";
  return extractJson(text);
}

async function callProvider(
  provider: AIProvider,
  apiKey: string,
  model: string,
  context: PlannerProviderContext,
) {
  switch (provider) {
    case "openai":
      return callOpenAI(apiKey, model, context);
    case "anthropic":
      return callAnthropic(apiKey, model, context);
    case "perplexity":
      return callPerplexity(apiKey, model, context);
  }
}

export async function getActiveAIProviderConfig() {
  const [settings, secrets] = await Promise.all([getAISettings(), getAISecrets()]);
  return resolveActiveProvider(settings, secrets);
}

function resolveActiveProvider(
  settings: AISettings | null,
  secrets: Record<AIProvider, string>,
) {
  if (!settings) {
    return null;
  }

  const ordered = [
    settings.defaultProvider,
    ...settings.providers.map((item) => item.provider).filter((provider) => provider !== settings.defaultProvider),
  ];

  for (const providerName of ordered) {
    const provider = settings.providers.find((item) => item.provider === providerName);
    const apiKey = secrets[providerName];
    if (provider?.enabled && apiKey) {
      return {
        provider: provider.provider,
        model: provider.model,
        apiKey,
      };
    }
  }

  return null;
}

export async function generateProviderMealPlan(
  context: PlannerProviderContext,
): Promise<{ provider: AIProvider; model: string; result: PlanSuggestion } | null> {
  const active = await getActiveAIProviderConfig();
  if (!active) {
    console.warn("No active AI provider configured. Falling back to local planner.");
    return null;
  }

  console.info(`Attempting meal plan with provider ${active.provider} and model ${active.model}.`);
  const text = await callProvider(active.provider, active.apiKey, active.model, context);
  const result = JSON.parse(text) as PlanSuggestion;

  return {
    provider: active.provider,
    model: active.model,
    result,
  };
}
