"use client";

import { useState } from "react";
import { SubmitButton } from "@/components/submit-button";
import type { Recipe, RecipeDraft } from "@/lib/types";

type RecipeFormValues = Recipe | RecipeDraft;

function isSavedRecipe(recipe?: RecipeFormValues): recipe is Recipe {
  return Boolean(recipe && "id" in recipe);
}

function toIngredientLines(recipe?: RecipeFormValues) {
  if (!recipe) {
    return "";
  }

  return recipe.ingredients
    .map((ingredient) =>
      [ingredient.name, ingredient.amount, ingredient.category, ingredient.optional ? "optional" : ""]
        .filter(Boolean)
        .join(" | "),
    )
    .join("\n");
}

export function RecipeEditor({
  recipe,
  action,
  submitLabel,
}: {
  recipe?: RecipeFormValues;
  action: (formData: FormData) => void | Promise<void>;
  submitLabel: string;
}) {
  const [ingredientsHelpVisible, setIngredientsHelpVisible] = useState(false);

  return (
    <form action={action} className="space-y-5">
      {isSavedRecipe(recipe) ? <input type="hidden" name="id" value={recipe.id} /> : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Field label="Title">
          <input
            name="title"
            defaultValue={recipe?.title ?? ""}
            placeholder="Weeknight Turkey Tacos"
            className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-3"
          />
        </Field>
        <Field label="Cook method">
          <input
            name="cookMethod"
            defaultValue={recipe?.cookMethod ?? ""}
            placeholder="skillet, oven, smoker..."
            className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-3"
          />
        </Field>
      </div>

      <div className="grid gap-4 lg:grid-cols-4">
        <Field label="Servings">
          <input
            type="number"
            min={1}
            name="servings"
            defaultValue={recipe?.servings ?? 4}
            className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-3"
          />
        </Field>
        <Field label="Prep minutes">
          <input
            type="number"
            min={0}
            name="prepTimeMinutes"
            defaultValue={recipe?.prepTimeMinutes ?? 15}
            className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-3"
          />
        </Field>
        <Field label="Cook minutes">
          <input
            type="number"
            min={0}
            name="cookTimeMinutes"
            defaultValue={recipe?.cookTimeMinutes ?? 20}
            className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-3"
          />
        </Field>
        <Field label="Difficulty">
          <select
            name="difficulty"
            defaultValue={recipe?.difficulty ?? "easy"}
            className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-3"
          >
            <option value="easy">Easy</option>
            <option value="moderate">Moderate</option>
            <option value="project">Project</option>
          </select>
        </Field>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Field label="Source name">
          <input
            name="sourceName"
            defaultValue={recipe?.sourceName ?? ""}
            placeholder="Serious Eats"
            className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-3"
          />
        </Field>
        <Field label="Source URL">
          <input
            name="sourceUrl"
            defaultValue={recipe?.sourceUrl ?? ""}
            placeholder="https://example.com/recipe"
            className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-3"
          />
        </Field>
      </div>

      <Field label="Short description">
        <textarea
          name="body"
          rows={3}
          defaultValue={recipe?.body ?? ""}
          placeholder="A quick family favorite with easy leftovers."
          className="w-full rounded-[1.5rem] border border-ink/10 bg-white px-4 py-3"
        />
      </Field>

      <Field label="Tags">
        <textarea
          name="tags"
          rows={2}
          defaultValue={recipe?.tags.join("\n") ?? ""}
          placeholder={"weeknight\nkid-friendly\nbeef"}
          className="w-full rounded-[1.5rem] border border-ink/10 bg-white px-4 py-3"
        />
      </Field>

      <div className="rounded-[1.75rem] bg-white/78 p-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary/60">
            Ingredients
          </p>
          <button
            type="button"
            onClick={() => setIngredientsHelpVisible((value) => !value)}
            className="text-xs font-semibold text-primary"
          >
            {ingredientsHelpVisible ? "Hide format help" : "Show format help"}
          </button>
        </div>
        {ingredientsHelpVisible ? (
          <p className="mt-3 text-sm text-ink/65">
            One ingredient per line: `Name | amount | category | optional`
          </p>
        ) : null}
        <textarea
          name="ingredients"
          rows={8}
          defaultValue={toIngredientLines(recipe)}
          className="mt-3 w-full rounded-[1.5rem] border border-ink/10 bg-white px-4 py-3"
        />
      </div>

      <Field label="Steps">
        <textarea
          name="steps"
          rows={8}
          defaultValue={recipe?.steps.join("\n") ?? ""}
          placeholder={"Brown the beef.\nWarm tortillas.\nServe with toppings."}
          className="w-full rounded-[1.5rem] border border-ink/10 bg-white px-4 py-3"
        />
      </Field>

      <Field label="Notes">
        <textarea
          name="notes"
          rows={4}
          defaultValue={recipe?.notes.join("\n") ?? ""}
          placeholder={"Great for leftovers.\nKeep onions on the side for kids."}
          className="w-full rounded-[1.5rem] border border-ink/10 bg-white px-4 py-3"
        />
      </Field>

      <SubmitButton
        idleLabel={submitLabel}
        pendingLabel="Saving..."
        className="rounded-2xl bg-primary px-5 py-3 font-semibold text-white"
      />
    </form>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[1.75rem] bg-white/78 p-5">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary/60">{label}</p>
      <div className="mt-3">{children}</div>
    </div>
  );
}
