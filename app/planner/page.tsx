import Link from "next/link";
import { createMealPlanAction, regenerateDayAction } from "@/app/actions";
import { SubmitButton } from "@/components/submit-button";
import { normalizeExternalHttpUrl } from "@/lib/security/url-safety";
import {
  familyRepository,
  getHouseholdPreferences,
  mealPlanRepository,
} from "@/lib/storage/repositories";
import { formatLongDate, getWeekDays } from "@/lib/utils";

export default async function PlannerPage({
  searchParams,
}: {
  searchParams?: Promise<{ planId?: string }>;
}) {
  const params = (await searchParams) ?? {};
  const [preferences, plans, family] = await Promise.all([
    getHouseholdPreferences(),
    mealPlanRepository.list(),
    familyRepository.list(),
  ]);
  const fallbackPlan = [...plans].sort(
    (a, b) =>
      b.updatedAt.localeCompare(a.updatedAt) || b.createdAt.localeCompare(a.createdAt),
  )[0];
  const householdSize = Math.max(family.length, 1);
  const selectedPlan =
    plans.find((plan) => plan.id === params.planId) ?? fallbackPlan;
  const defaultWeek = selectedPlan?.weekOf || getWeekDays()[0]?.date;
  const defaultHouseholdSize = selectedPlan?.householdSize || householdSize;
  const defaultRequest =
    selectedPlan?.request ||
    "Plan dinners this week, keep weeknights simple, and use the smoker once this weekend.";
  const latestPlan = selectedPlan;

  return (
    <div className="page-grid">
      <section className="panel rounded-[2rem] p-6">
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-primary/70">
              Natural language planner
            </p>
            <h1 className="mt-2 font-display text-4xl text-primary">Tell the planner what this week needs.</h1>
            <p className="mt-3 max-w-2xl text-sm text-ink/70">
              The AI combines your request with household rules, recipe metadata, and prior feedback. It plans from saved recipes, and if it finds a sourced new idea, it can add that recipe to your library with the source link attached.
            </p>
          </div>

          <div className="rounded-[1.75rem] bg-[#fff8ee] p-5 text-sm text-ink/72">
            <p className="font-semibold text-primary">Try prompts like:</p>
            <ul className="mt-3 space-y-2">
              <li>"Plan dinners this week and keep weeknights simple."</li>
              <li>"Use the smoker this weekend and avoid spicy meals."</li>
              <li>"Feed 8 people on Saturday and use pantry staples."</li>
            </ul>
          </div>
        </div>

        <form action={createMealPlanAction} className="mt-8 grid gap-4 lg:grid-cols-[1fr_180px_160px_auto]">
          <textarea
            name="request"
            rows={4}
            required
            defaultValue={defaultRequest}
            className="rounded-[1.5rem] border border-ink/10 bg-white/80 px-4 py-3 outline-none ring-0 placeholder:text-ink/35"
          />
          <input
            type="date"
            name="weekOf"
            defaultValue={defaultWeek}
            className="rounded-2xl border border-ink/10 bg-white/80 px-4 py-3"
          />
          <input
            type="number"
            min={1}
            name="householdSize"
            defaultValue={defaultHouseholdSize}
            className="rounded-2xl border border-ink/10 bg-white/80 px-4 py-3"
          />
          <SubmitButton
            idleLabel="Generate plan"
            pendingLabel="Planning..."
            className="rounded-2xl bg-primary px-5 py-3 font-semibold text-white"
          />
        </form>
      </section>

      {latestPlan && (
        <section className="panel rounded-[2rem] p-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-primary/70">
                Weekly plan
              </p>
              <h2 className="mt-2 font-display text-3xl text-primary">{latestPlan.title}</h2>
              <p className="mt-2 text-sm text-ink/65">{latestPlan.notes}</p>
              {latestPlan.plannerStatus && latestPlan.plannerStatus !== "success" ? (
                <div className="mt-3 rounded-2xl border border-[#d26c52]/20 bg-[#fff4ef] px-4 py-3 text-sm text-[#8f442f]">
                  <p className="font-semibold">The planner used your saved recipes to build this week.</p>
                  <p className="mt-1">
                    A live AI suggestion was not available for this request, so the planner built a week from your household rules, recipe library, and recent feedback.
                  </p>
                </div>
              ) : null}
              {latestPlan.importedRecipes?.length ? (
                <div className="mt-3 rounded-2xl border border-primary/15 bg-[#fff8ee] px-4 py-3 text-sm text-ink/75">
                  <p className="font-semibold text-primary">New recipes were added to your library.</p>
                  <div className="mt-3 space-y-2">
                    {latestPlan.importedRecipes.map((recipe) => (
                      (() => {
                        const safeSourceUrl = normalizeExternalHttpUrl(recipe.sourceUrl);
                        return (
                          <div key={recipe.id} className="flex flex-wrap items-center gap-x-3 gap-y-1">
                            <Link href={`/recipes/${recipe.id}?mode=edit`} className="font-semibold text-primary">
                              {recipe.title}
                            </Link>
                            {safeSourceUrl ? (
                              <a
                                href={safeSourceUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-sm text-ink/65 underline underline-offset-2"
                              >
                                {recipe.sourceName || "View source"}
                              </a>
                            ) : null}
                          </div>
                        );
                      })()
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <Link
                href={`/meal-plans/${latestPlan.id}/print`}
                className="text-sm font-semibold text-primary"
              >
                Printable version
              </Link>
              <Link href="/grocery-lists" className="text-sm font-semibold text-primary">
                View grocery list
              </Link>
            </div>
          </div>

          <div className="mt-6 grid gap-4 xl:grid-cols-7 md:grid-cols-2">
            {latestPlan.meals.map((meal) => (
              <article
                key={meal.day}
                className="flex min-h-64 flex-col rounded-[1.75rem] bg-white/80 p-4"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/60">
                  {meal.day}
                </p>
                <p className="mt-1 text-sm text-ink/50">{formatLongDate(meal.date)}</p>
                <p className="mt-4 text-lg font-semibold">{meal.recipeTitle}</p>
                <p className="mt-2 text-sm text-ink/65">{meal.reason}</p>
                {meal.notes ? <p className="mt-3 text-sm text-primary/80">{meal.notes}</p> : null}

                <div className="mt-auto pt-6">
                  <p className="text-xs uppercase tracking-[0.16em] text-ink/45">
                    Serves {meal.servings}
                  </p>
                  <div className="mt-3 flex items-center justify-between">
                    <Link
                      href={`/recipes/${meal.recipeId}`}
                      className="text-sm font-semibold text-primary"
                    >
                      Open recipe
                    </Link>
                    <form action={regenerateDayAction}>
                      <input type="hidden" name="mealPlanId" value={latestPlan.id} />
                      <input type="hidden" name="day" value={meal.day} />
                      <SubmitButton
                        idleLabel="Regenerate"
                        pendingLabel="Refreshing..."
                        className="rounded-full border border-primary/15 px-3 py-2 text-xs font-semibold text-primary"
                      />
                    </form>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
