import Link from "next/link";
import { GroceryChecklist } from "@/components/grocery-checklist";
import { groceryListRepository } from "@/lib/storage/repositories";

export default async function GroceryListsPage() {
  const lists = await groceryListRepository.list();
  const latest = [...lists].sort(
    (a, b) =>
      b.updatedAt.localeCompare(a.updatedAt) || b.createdAt.localeCompare(a.createdAt),
  )[0];

  if (!latest) {
    return (
      <div className="panel rounded-[2rem] p-6">
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-primary/70">Grocery list</p>
        <p className="mt-3 text-sm text-ink/70">Generate a meal plan to build a grocery list.</p>
      </div>
    );
  }

  const grouped = latest.items.reduce<Record<string, typeof latest.items>>((acc, item) => {
    acc[item.category] = [...(acc[item.category] ?? []), item];
    return acc;
  }, {});

  return (
    <div className="page-grid">
      <section className="panel rounded-[2rem] p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-primary/70">
              Grocery list
            </p>
            <h1 className="mt-2 font-display text-4xl text-primary">{latest.title}</h1>
            <p className="mt-2 text-sm text-ink/70">
              Aggregated from the weekly plan and grouped by store section.
            </p>
          </div>
          <Link href="/planner" className="text-sm font-semibold text-primary">
            Back to planner
          </Link>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          {Object.entries(grouped).map(([category, items]) => (
            <div key={category} className="rounded-[1.75rem] bg-white/78 p-5">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary/60">{category}</p>
              <div className="mt-4">
                <GroceryChecklist listId={latest.id} items={items} />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
