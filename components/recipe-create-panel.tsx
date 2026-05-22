"use client";

import { useState } from "react";
import { RecipeEditor } from "@/components/recipe-editor";
import type { RecipeDraft } from "@/lib/types";

function emptyDraft(): RecipeDraft {
  return {
    title: "",
    body: "",
    servings: 4,
    cookMethod: "oven",
    prepTimeMinutes: 15,
    cookTimeMinutes: 20,
    difficulty: "easy",
    tags: [],
    ingredients: [],
    steps: [],
    notes: [],
    sourceName: "",
    sourceUrl: "",
  };
}

export function RecipeCreatePanel({
  action,
}: {
  action: (formData: FormData) => void | Promise<void>;
}) {
  const [rawText, setRawText] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [draft, setDraft] = useState<RecipeDraft>(emptyDraft());
  const [draftVersion, setDraftVersion] = useState(0);
  const [isParsing, setIsParsing] = useState(false);
  const [error, setError] = useState("");
  const [hasParsed, setHasParsed] = useState(false);

  async function parseWithAI() {
    setIsParsing(true);
    setError("");

    try {
      const response = await fetch("/api/recipes/parse", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          rawText,
          sourceUrl,
        }),
      });

      const payload = (await response.json()) as { recipe?: RecipeDraft; error?: string };
      if (!response.ok || !payload.recipe) {
        throw new Error(payload.error || "Recipe parsing failed.");
      }

      setDraft(payload.recipe);
      setDraftVersion((value) => value + 1);
      setHasParsed(true);
    } catch (parseError) {
      setError(parseError instanceof Error ? parseError.message : "Recipe parsing failed.");
    } finally {
      setIsParsing(false);
    }
  }

  function clearDraft() {
    setDraft(emptyDraft());
    setDraftVersion((value) => value + 1);
    setHasParsed(false);
    setError("");
  }

  return (
    <div className="space-y-6">
      <div className="rounded-[2rem] bg-white/78 p-6">
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-primary/70">
          AI recipe import
        </p>
        <h3 className="mt-2 font-display text-3xl text-primary">
          Paste recipe text or a recipe URL and let AI structure it.
        </h3>
        <p className="mt-3 max-w-3xl text-sm text-ink/70">
          Paste natural-language notes, copied recipe text, or a recipe website URL. The app will parse it into the common recipe format, then you can review and save it.
        </p>

        <div className="mt-5 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-[1.75rem] bg-[#fff8ee] p-5">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary/60">
              Raw recipe text
            </p>
            <textarea
              rows={10}
              value={rawText}
              onChange={(event) => setRawText(event.target.value)}
              placeholder={"Grandma's chili: brown 1 lb beef with onion, add beans, tomatoes, and chili seasoning..."}
              className="mt-3 w-full rounded-[1.5rem] border border-ink/10 bg-white px-4 py-3"
            />
          </div>

          <div className="rounded-[1.75rem] bg-[#fff8ee] p-5">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary/60">
              Recipe URL
            </p>
            <input
              value={sourceUrl}
              onChange={(event) => setSourceUrl(event.target.value)}
              placeholder="https://example.com/recipe"
              className="mt-3 w-full rounded-2xl border border-ink/10 bg-white px-4 py-3"
            />
            <p className="mt-3 text-sm text-ink/65">
              If you provide a URL, the server will fetch the page content and use it during parsing.
            </p>

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={parseWithAI}
                disabled={isParsing}
                className="rounded-2xl bg-primary px-5 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isParsing ? "Parsing..." : "Parse with AI"}
              </button>
              {hasParsed ? (
                <button
                  type="button"
                  onClick={clearDraft}
                  className="rounded-2xl border border-primary/15 bg-white/70 px-5 py-3 font-semibold text-primary"
                >
                  Clear draft
                </button>
              ) : null}
            </div>

            {error ? (
              <div className="mt-4 rounded-2xl border border-[#d26c52]/20 bg-[#fff4ef] px-4 py-3 text-sm text-[#8f442f]">
                {error}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="rounded-[2rem] bg-[#fff8ee] p-6">
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-primary/70">
          Review recipe
        </p>
        <h3 className="mt-2 font-display text-3xl text-primary">
          Check the structured version before saving it.
        </h3>
        <div className="mt-5">
          <RecipeEditor
            key={draftVersion}
            recipe={draft}
            action={action}
            submitLabel={hasParsed ? "Save parsed recipe" : "Create recipe"}
          />
        </div>
      </div>
    </div>
  );
}
