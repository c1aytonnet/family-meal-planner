import { archiveRecipeAction, updateRecipeAction } from "@/app/actions";
import { RecipeEditor } from "@/components/recipe-editor";
import { normalizeExternalHttpUrl } from "@/lib/security/url-safety";
import { notFound } from "next/navigation";
import { recipeRepository } from "@/lib/storage/repositories";

export default async function RecipeDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ mode?: string }>;
}) {
  const { id } = await params;
  const recipe = await recipeRepository.get(id);
  const mode = (await searchParams)?.mode;
  const safeSourceUrl = recipe ? normalizeExternalHttpUrl(recipe.sourceUrl) : undefined;

  if (!recipe) {
    notFound();
  }

  if (mode === "edit") {
    return (
      <div className="page-grid">
        <section className="panel rounded-[2rem] p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-primary/70">
                Edit recipe
              </p>
              <h1 className="mt-2 font-display text-4xl text-primary">{recipe.title}</h1>
            </div>
            {!recipe.archived ? (
              <form action={archiveRecipeAction}>
                <input type="hidden" name="id" value={recipe.id} />
                <button className="rounded-full border border-[#d26c52]/20 px-4 py-3 text-sm font-semibold text-[#b84f38]">
                  Archive recipe
                </button>
              </form>
            ) : (
              <span className="rounded-full bg-soft px-4 py-2 text-sm font-semibold text-primary">
                Archived
              </span>
            )}
          </div>

          <div className="mt-6">
            <RecipeEditor recipe={recipe} action={updateRecipeAction} submitLabel="Save recipe" />
          </div>
        </section>
      </div>
    );
  }

  if (mode === "cook") {
    return (
      <div className="panel rounded-[2rem] p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-primary/70">Cook mode</p>
        <h1 className="mt-3 font-display text-5xl text-primary">{recipe.title}</h1>
        <div className="mt-6 grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary/60">Ingredients</p>
            <div className="mt-4 space-y-3">
              {recipe.ingredients.map((ingredient) => (
                <div key={`${ingredient.name}-${ingredient.amount}`} className="rounded-2xl bg-white/75 p-4">
                  <p className="font-semibold">{ingredient.name}</p>
                  <p className="text-sm text-ink/65">{ingredient.amount}</p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary/60">Steps</p>
            <div className="mt-4 space-y-4">
              {recipe.steps.map((step, index) => (
                <div key={step} className="rounded-3xl bg-white/82 p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/50">
                    Step {index + 1}
                  </p>
                  <p className="mt-2 text-lg leading-relaxed">{step}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-grid">
      <section className="panel rounded-[2rem] p-6">
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-primary/70">
          Recipe detail
        </p>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-display text-4xl text-primary">{recipe.title}</h1>
              {recipe.archived ? (
                <span className="rounded-full bg-soft px-4 py-2 text-sm font-semibold text-primary">
                  Archived
                </span>
              ) : null}
            </div>
            <p className="mt-3 max-w-2xl text-sm text-ink/72">{recipe.body}</p>
            {recipe.archived ? (
              <p className="mt-3 text-sm text-ink/60">
                This recipe stays in household history, but it will not be used for new meal plans.
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-3">
            <a
              href={`/recipes/${recipe.id}?mode=edit`}
              className="rounded-full border border-primary/15 bg-white/80 px-5 py-3 text-sm font-semibold text-primary"
            >
              Edit recipe
            </a>
            <a
              href={`/recipes/${recipe.id}?mode=cook`}
              className="rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white"
            >
              Open cook mode
            </a>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-4">
          <MetaCard label="Servings" value={String(recipe.servings)} />
          <MetaCard label="Method" value={recipe.cookMethod} />
          <MetaCard label="Prep" value={`${recipe.prepTimeMinutes} min`} />
          <MetaCard label="Cook" value={`${recipe.cookTimeMinutes} min`} />
        </div>

        {safeSourceUrl ? (
          <div className="mt-6 rounded-[1.5rem] bg-[#fff8ee] p-4">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary/60">
              Source
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <span className="text-sm text-ink/72">{recipe.sourceName || "Imported recipe source"}</span>
              <a
                href={safeSourceUrl}
                target="_blank"
                rel="noreferrer"
                className="text-sm font-semibold text-primary underline underline-offset-2"
              >
                Open source recipe
              </a>
            </div>
          </div>
        ) : null}

        <div className="mt-8 grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="rounded-[1.75rem] bg-white/78 p-5">
            <p className="font-semibold text-primary">Ingredients</p>
            <div className="mt-4 space-y-3">
              {recipe.ingredients.map((ingredient) => (
                <div key={`${ingredient.name}-${ingredient.amount}`} className="flex items-center justify-between border-b border-ink/6 pb-3">
                  <span>{ingredient.name}</span>
                  <span className="text-sm text-ink/55">{ingredient.amount}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[1.75rem] bg-white/78 p-5">
            <p className="font-semibold text-primary">Instructions</p>
            <ol className="mt-4 space-y-4">
              {recipe.steps.map((step, index) => (
                <li key={step} className="flex gap-4">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-warm font-semibold text-primary">
                    {index + 1}
                  </span>
                  <span className="text-sm leading-7 text-ink/74">{step}</span>
                </li>
              ))}
            </ol>

            <div className="mt-6">
              <p className="font-semibold text-primary">Notes</p>
              <ul className="mt-3 space-y-2 text-sm text-ink/70">
                {recipe.notes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function MetaCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.5rem] bg-white/78 p-4">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary/55">{label}</p>
      <p className="mt-2 text-lg font-semibold">{value}</p>
    </div>
  );
}
