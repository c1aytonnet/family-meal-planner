"use client";

import { useTransition } from "react";

interface GroceryChecklistProps {
  listId: string;
  items: Array<{
    id: string;
    name: string;
    amount: string;
    category: string;
    checked: boolean;
  }>;
}

export function GroceryChecklist({ listId, items }: GroceryChecklistProps) {
  const [pending, startTransition] = useTransition();

  async function toggle(itemId: string, checked: boolean) {
    await fetch(`/api/grocery-lists/${listId}/toggle`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId, checked }),
    });
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <label
          key={item.id}
          className="flex items-center justify-between rounded-2xl border border-ink/10 bg-white/75 px-4 py-3"
        >
          <span className="flex items-center gap-3">
            <input
              type="checkbox"
              defaultChecked={item.checked}
              disabled={pending}
              className="h-4 w-4 rounded border-ink/30 text-primary focus:ring-primary"
              onChange={(event) =>
                startTransition(() => toggle(item.id, event.target.checked))
              }
            />
            <span>
              <span className="block font-medium">{item.name}</span>
              <span className="text-sm text-ink/60">{item.amount}</span>
            </span>
          </span>
          <span className="rounded-full bg-soft px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-ink/60">
            {item.category}
          </span>
        </label>
      ))}
    </div>
  );
}
