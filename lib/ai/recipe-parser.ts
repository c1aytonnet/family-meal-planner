import { z } from "zod";
import { getActiveAIProviderConfig } from "@/lib/ai/providers";
import type { AIProvider, RecipeDraft } from "@/lib/types";
import { fetchSafeRecipeSource, normalizeExternalHttpUrl } from "@/lib/security/url-safety";

const recipeDraftSchema = z.object({
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
  sourceUrl: z.string(),
});

const recipeDraftJsonSchema = {
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
} as const;

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

function stripHtml(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

async function callOpenAI(apiKey: string, model: string, prompt: string) {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      instructions:
        "You are a recipe structuring assistant. Convert raw recipe text into normalized JSON matching the requested schema. If source metadata is not present, return empty strings for sourceName and sourceUrl. Keep ingredient amounts as written when possible.",
      input: [
        {
          role: "user",
          content: [{ type: "input_text", text: prompt }],
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "recipe_draft",
          strict: true,
          schema: recipeDraftJsonSchema,
        },
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI request failed with ${response.status}: ${await response.text()}`);
  }

  const payload = (await response.json()) as Parameters<typeof extractOpenAIText>[0];
  return extractJson(extractOpenAIText(payload));
}

async function callAnthropic(apiKey: string, model: string, prompt: string) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 1800,
      system:
        `You are a recipe structuring assistant. Return JSON only and match this schema exactly: ${JSON.stringify(recipeDraftJsonSchema)}.`,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) {
    throw new Error(`Anthropic request failed with ${response.status}: ${await response.text()}`);
  }

  const payload = (await response.json()) as {
    content?: Array<{ type?: string; text?: string }>;
  };
  const text = payload.content?.find((item) => item.type === "text")?.text ?? "";
  return extractJson(text);
}

async function callPerplexity(apiKey: string, model: string, prompt: string) {
  const response = await fetch("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "system",
          content:
            `You are a recipe structuring assistant. Return JSON only and match this schema exactly: ${JSON.stringify(recipeDraftJsonSchema)}.`,
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.1,
    }),
  });

  if (!response.ok) {
    throw new Error(`Perplexity request failed with ${response.status}: ${await response.text()}`);
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const text = payload.choices?.[0]?.message?.content ?? "";
  return extractJson(text);
}

async function callProvider(provider: AIProvider, apiKey: string, model: string, prompt: string) {
  switch (provider) {
    case "openai":
      return callOpenAI(apiKey, model, prompt);
    case "anthropic":
      return callAnthropic(apiKey, model, prompt);
    case "perplexity":
      return callPerplexity(apiKey, model, prompt);
  }
}

export async function parseRecipeDraft({
  rawText,
  sourceUrl,
}: {
  rawText?: string;
  sourceUrl?: string;
}): Promise<RecipeDraft> {
  const active = await getActiveAIProviderConfig();
  if (!active) {
    throw new Error("Configure an AI provider before using AI recipe parsing.");
  }

  const trimmedText = rawText?.trim() ?? "";
  const trimmedUrl = sourceUrl?.trim() ?? "";

  if (!trimmedText && !trimmedUrl) {
    throw new Error("Paste recipe text or provide a recipe URL.");
  }

  const fetchedSource = trimmedUrl
    ? await fetchSafeRecipeSource(trimmedUrl).then((result) => ({
        sourceName: result.sourceName,
        sourceUrl: result.sourceUrl,
        extractedText: stripHtml(result.html).slice(0, 18000),
      }))
    : null;
  const prompt = [
    "Turn this recipe input into structured recipe JSON.",
    "Normalize messy recipe text into a family-cooking-friendly recipe.",
    "If the source is a webpage, infer a concise sourceName from the site and preserve the exact sourceUrl.",
    "If there is no source, return empty strings for sourceName and sourceUrl.",
    trimmedText ? `USER_TEXT:\n${trimmedText}` : "",
    fetchedSource ? `FETCHED_SOURCE_URL:\n${fetchedSource.sourceUrl}` : "",
    fetchedSource ? `FETCHED_SOURCE_NAME:\n${fetchedSource.sourceName}` : "",
    fetchedSource ? `FETCHED_PAGE_TEXT:\n${fetchedSource.extractedText}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  const text = await callProvider(active.provider, active.apiKey, active.model, prompt);
  const parsed = recipeDraftSchema.parse(JSON.parse(text));

  return {
    ...parsed,
    sourceName: parsed.sourceName || fetchedSource?.sourceName || "",
    sourceUrl:
      normalizeExternalHttpUrl(parsed.sourceUrl || fetchedSource?.sourceUrl || "") || "",
  };
}
