"use client";

import Link from "next/link";

export function PrintPageActions({ plannerHref }: { plannerHref: string }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={() => window.print()}
        className="rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white"
      >
        Print this page
      </button>
      <Link
        href={plannerHref}
        className="rounded-full border border-primary/15 bg-white/70 px-5 py-3 text-sm font-semibold text-primary"
      >
        Back to planner
      </Link>
    </div>
  );
}
