import { format, parseISO } from "date-fns";
import { PrintPageActions } from "@/components/print-page-actions";
import {
  groceryListRepository,
  mealPlanRepository,
} from "@/lib/storage/repositories";

export default async function PrintableMealPlanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const mealPlan = await mealPlanRepository.get(id);

  if (!mealPlan) {
    return (
      <div className="page-grid print-page">
        <section className="panel rounded-[2rem] p-6">
          <p className="text-sm text-ink/70">Meal plan not found.</p>
        </section>
      </div>
    );
  }

  const groceryLists = await groceryListRepository.list();
  const groceryList =
    groceryLists.find((list) => list.mealPlanId === mealPlan.id) ?? null;
  const groupedItems = groceryList
    ? Object.entries(
        groceryList.items.reduce<Record<string, typeof groceryList.items>>((acc, item) => {
          acc[item.category] = [...(acc[item.category] ?? []), item];
          return acc;
        }, {}),
      )
    : [];

  return (
    <div className="page-grid print-page">
      <section className="panel rounded-[2rem] p-6 print:shadow-none print:border-none print:bg-white">
        <div className="print:hidden flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-primary/70">
              Printable meal plan
            </p>
            <h1 className="mt-2 font-display text-4xl text-primary">{mealPlan.title}</h1>
          </div>
          <PrintPageActions plannerHref={`/planner?planId=${mealPlan.id}`} />
        </div>

        <div className="print:mt-0 mt-8 border-b border-ink/10 pb-5">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary/60">
            Family Meal Planner
          </p>
          <h2 className="mt-2 font-display text-5xl text-primary">{mealPlan.title}</h2>
          <p className="mt-3 text-sm text-ink/68">
            Week of {format(parseISO(mealPlan.weekOf), "MMMM d, yyyy")}
          </p>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-ink/72">
            {mealPlan.notes || "No weekly planning notes were saved for this plan."}
          </p>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3 print:grid-cols-2">
          {mealPlan.meals.map((meal) => (
            <article
              key={`${meal.day}-${meal.recipeId}`}
              className="rounded-[1.5rem] border border-ink/10 bg-white p-5 print:break-inside-avoid"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/60">
                {meal.day}
              </p>
              <p className="mt-1 text-sm text-ink/55">
                {format(parseISO(meal.date), "EEEE, MMMM d")}
              </p>
              <h3 className="mt-4 text-2xl font-semibold text-ink">{meal.recipeTitle}</h3>
              <p className="mt-3 text-sm leading-7 text-ink/72">{meal.reason}</p>
              {meal.notes ? (
                <p className="mt-3 text-sm leading-7 text-primary/85">Note: {meal.notes}</p>
              ) : null}
              <p className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-ink/48">
                Serves {meal.servings}
              </p>
            </article>
          ))}
        </div>

        {groupedItems.length ? (
          <section className="mt-8">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/60">
              Grocery summary
            </p>
            <div className="mt-4 grid gap-4 md:grid-cols-2 print:grid-cols-2">
              {groupedItems.map(([category, items]) => (
                <div
                  key={category}
                  className="rounded-[1.5rem] border border-ink/10 bg-white p-5 print:break-inside-avoid"
                >
                  <h4 className="text-lg font-semibold text-ink">{category}</h4>
                  <ul className="mt-3 space-y-2 text-sm text-ink/72">
                    {items.map((item) => (
                      <li key={item.id}>
                        {item.name}
                        {item.amount ? ` - ${item.amount}` : ""}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {mealPlan.importedRecipes?.length ? (
          <section className="mt-8">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/60">
              Imported recipe sources
            </p>
            <div className="mt-3 space-y-2 text-sm text-ink/72">
              {mealPlan.importedRecipes.map((recipe) => (
                <p key={recipe.id}>
                  {recipe.title}
                  {recipe.sourceUrl ? ` - ${recipe.sourceUrl}` : ""}
                </p>
              ))}
            </div>
          </section>
        ) : null}
      </section>
    </div>
  );
}
