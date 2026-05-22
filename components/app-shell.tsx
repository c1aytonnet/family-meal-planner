"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bot, CalendarRange, Heart, Home, ListChecks, Settings2, Soup, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Dashboard", icon: Home },
  { href: "/planner", label: "Meal Planner", icon: CalendarRange },
  { href: "/family", label: "Family", icon: Users },
  { href: "/preferences", label: "Preferences", icon: Settings2 },
  { href: "/ai-settings", label: "AI Settings", icon: Bot },
  { href: "/recipes", label: "Recipes", icon: Soup },
  { href: "/history", label: "History", icon: Heart },
  { href: "/grocery-lists", label: "Grocery List", icon: ListChecks },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-4 py-6 lg:px-6">
        <div className="flex flex-1 flex-col gap-6 lg:flex-row">
        <aside className="print:hidden rounded-4xl border border-white/70 bg-panel/90 p-5 shadow-soft backdrop-blur lg:w-72">
          <div className="mb-8">
            <p className="font-display text-3xl text-primary">Family Meal Planner</p>
            <p className="mt-2 text-sm text-ink/70">
              Cozy weekly planning with shared household memory built in.
            </p>
          </div>

          <nav className="space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition",
                    active
                      ? "bg-primary text-white shadow-lg"
                      : "text-ink/75 hover:bg-soft hover:text-ink",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        <main className="flex-1">{children}</main>
        </div>

        <footer className="print:hidden mt-6 pb-2 text-center text-sm text-ink/60">
          <a
            href="https://www.innojacent.com"
            target="_blank"
            rel="noreferrer"
            className="font-medium text-primary underline underline-offset-2"
          >
            By Innojacent
          </a>
        </footer>
      </div>
    </div>
  );
}
