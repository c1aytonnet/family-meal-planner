import Link from "next/link";
import { formatDistanceToNow, parseISO } from "date-fns";
import {
  familyRepository,
  feedbackRepository,
  getActiveRecipes,
  getHouseholdPreferences,
  groceryListRepository,
  mealPlanRepository,
} from "@/lib/storage/repositories";

export default async function DashboardPage() {
  const [family, preferences, recipes, mealPlans, feedback, groceryLists] =
    await Promise.all([
      familyRepository.list(),
      getHouseholdPreferences(),
      getActiveRecipes(),
      mealPlanRepository.list(),
      feedbackRepository.list(),
      groceryListRepository.list(),
    ]);

  const latestPlan = [...mealPlans].sort(
    (a, b) =>
      b.updatedAt.localeCompare(a.updatedAt) || b.createdAt.localeCompare(a.createdAt),
  )[0];
  const latestList = [...groceryLists].sort(
    (a, b) =>
      b.updatedAt.localeCompare(a.updatedAt) || b.createdAt.localeCompare(a.createdAt),
  )[0];
  const recentFeedback = feedback
    .sort((a, b) => b.mealDate.localeCompare(a.mealDate))
    .slice(0, 3);

  return (
    <div className="page-grid">
      <section className="panel overflow-hidden rounded-[2rem] p-8">
        <div className="grid gap-8 lg:grid-cols-[1.4fr_0.9fr]">
          <div>
            <span className="inline-flex rounded-full bg-warm px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-primary">
              Household AI planner
            </span>
            <h1 className="mt-4 font-display text-5xl leading-tight text-primary">
              Plan calmer weeks with meals your family will actually eat.
            </h1>
            <p className="mt-4 max-w-2xl text-base text-ink/72">
              Structured recipes, household rules, feedback memory, and a weekly grocery list all live on disk so the app stays portable and practical.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/planner"
                className="rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white"
              >
                Plan this week
              </Link>
              <Link
                href="/recipes"
                className="rounded-full border border-primary/15 bg-white/70 px-5 py-3 text-sm font-semibold text-primary"
              >
                Browse recipes
              </Link>
            </div>
          </div>

          <div className="rounded-[1.75rem] bg-[#fff9f2] p-6">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-primary/70">
              Household snapshot
            </p>
            <div className="mt-5 space-y-4">
              <Stat label="Family members" value={String(family.length)} />
              <Stat label="Recipe library" value={String(recipes.length)} />
              <Stat
                label="Household size"
                value={String(family.length)}
              />
              <Stat
                label="Latest grocery list"
                value={latestList ? latestList.weekOf : "Not yet generated"}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="panel rounded-[2rem] p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-primary/70">
                Current plan
              </p>
              <h2 className="mt-2 font-display text-3xl text-primary">
                {latestPlan ? latestPlan.title : "No weekly plan yet"}
              </h2>
            </div>
            <Link href="/planner" className="text-sm font-semibold text-primary">
              Open planner
            </Link>
          </div>

          {latestPlan ? (
            <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {latestPlan.meals.slice(0, 6).map((meal) => (
                <div key={meal.day} className="rounded-3xl bg-white/80 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/60">
                    {meal.day}
                  </p>
                  <p className="mt-2 text-lg font-semibold">{meal.recipeTitle}</p>
                  <p className="mt-1 text-sm text-ink/65">{meal.reason}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-6 text-sm text-ink/65">Use the planner to generate your first week.</p>
          )}
        </div>

        <div className="panel rounded-[2rem] p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-primary/70">
            Recent feedback
          </p>
          <div className="mt-5 space-y-4">
            {recentFeedback.map((item) => (
              <div key={item.id} className="rounded-3xl bg-white/75 p-4">
                <p className="font-semibold">{item.recipeTitle}</p>
                <p className="mt-1 text-sm text-ink/65">{item.body}</p>
                <p className="mt-2 text-xs uppercase tracking-[0.16em] text-ink/45">
                  {formatDistanceToNow(parseISO(item.mealDate), { addSuffix: true })}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-white/70 px-4 py-3">
      <span className="text-sm text-ink/65">{label}</span>
      <span className="font-semibold text-primary">{value}</span>
    </div>
  );
}
