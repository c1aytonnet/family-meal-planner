import Link from "next/link";
import { createRecipeAction } from "@/app/actions";
import { RecipeCreatePanel } from "@/components/recipe-create-panel";
import { getActiveRecipes } from "@/lib/storage/repositories";

export default async function RecipesPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string; method?: string; tag?: string }>;
}) {
  const params = (await searchParams) ?? {};
  const activeRecipes = await getActiveRecipes();
  const query = params.q?.toLowerCase() ?? "";
  const filtered = activeRecipes.filter((recipe) => {
    const matchesQuery =
      !query ||
      recipe.title.toLowerCase().includes(query) ||
      recipe.tags.some((tag) => tag.toLowerCase().includes(query));
    const matchesMethod = !params.method || recipe.cookMethod === params.method;
    const matchesTag = !params.tag || recipe.tags.includes(params.tag);
    return matchesQuery && matchesMethod && matchesTag;
  });

  const methods = Array.from(new Set(activeRecipes.map((recipe) => recipe.cookMethod)));

  return (
    <div className="page-grid">
      <section className="panel rounded-[2rem] p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-primary/70">
              Recipe library
            </p>
            <h1 className="mt-2 font-display text-4xl text-primary">Cook from a library the planner can trust.</h1>
          </div>
          <form className="grid gap-3 md:grid-cols-3">
            <input
              name="q"
              defaultValue={params.q ?? ""}
              placeholder="Search title or tag"
              className="rounded-2xl border border-ink/10 bg-white/80 px-4 py-3"
            />
            <select
              name="method"
              defaultValue={params.method ?? ""}
              className="rounded-2xl border border-ink/10 bg-white/80 px-4 py-3"
            >
              <option value="">All methods</option>
              {methods.map((method) => (
                <option key={method} value={method}>
                  {method}
                </option>
              ))}
            </select>
            <button className="rounded-2xl bg-primary px-4 py-3 font-semibold text-white">
              Filter recipes
            </button>
          </form>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {filtered.map((recipe) => (
            <Link
              key={recipe.id}
              href={`/recipes/${recipe.id}`}
              className="rounded-[1.75rem] bg-white/78 p-5 transition hover:-translate-y-1"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/60">
                {recipe.cookMethod}
              </p>
              <h2 className="mt-2 text-xl font-semibold">{recipe.title}</h2>
              <p className="mt-2 text-sm text-ink/68">
                Serves {recipe.servings} · {recipe.prepTimeMinutes + recipe.cookTimeMinutes} minutes
              </p>
              <p className="mt-4 text-sm text-ink/65">{recipe.body}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {recipe.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-soft px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-ink/60"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-8 rounded-[2rem] bg-[#fff8ee] p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-primary/70">
            Add recipe
          </p>
          <h2 className="mt-2 font-display text-3xl text-primary">Grow the recipe library from the app.</h2>
          <div className="mt-5">
            <RecipeCreatePanel action={createRecipeAction} />
          </div>
        </div>
      </section>
    </div>
  );
}
