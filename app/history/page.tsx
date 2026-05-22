import Link from "next/link";
import {
  addDays,
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { saveFeedbackAction } from "@/app/actions";
import { SubmitButton } from "@/components/submit-button";
import { cn, formatLongDate } from "@/lib/utils";
import {
  familyRepository,
  feedbackRepository,
  getActiveRecipes,
} from "@/lib/storage/repositories";

export default async function HistoryPage({
  searchParams,
}: {
  searchParams?: Promise<{ month?: string; date?: string }>;
}) {
  const params = (await searchParams) ?? {};
  const [feedback, recipes, familyMembers] = await Promise.all([
    feedbackRepository.list(),
    getActiveRecipes(),
    familyRepository.list(),
  ]);
  const sortedFeedback = [...feedback].sort((a, b) => b.mealDate.localeCompare(a.mealDate));
  const latestMealDate = sortedFeedback[0]?.mealDate;
  const activeMonth =
    params.month ??
    (latestMealDate ? latestMealDate.slice(0, 7) : format(new Date(), "yyyy-MM"));
  const monthDate = parseISO(`${activeMonth}-01`);
  const selectedDate = params.date ?? latestMealDate ?? "";
  const selectedEntries = selectedDate
    ? sortedFeedback.filter((entry) => entry.mealDate === selectedDate)
    : sortedFeedback;

  const calendarStart = startOfWeek(startOfMonth(monthDate), { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(endOfMonth(monthDate), { weekStartsOn: 0 });
  const days = [];
  for (let current = calendarStart; current <= calendarEnd; current = addDays(current, 1)) {
    const isoDate = format(current, "yyyy-MM-dd");
    const dayEntries = sortedFeedback.filter((entry) => entry.mealDate === isoDate);
    days.push({
      isoDate,
      dayNumber: format(current, "d"),
      inMonth: isSameMonth(current, monthDate),
      hasMeal: dayEntries.length > 0,
      mealTitle: dayEntries[0]?.recipeTitle ?? "",
      mealCount: dayEntries.length,
      isSelected: selectedDate === isoDate,
    });
  }

  return (
    <div className="page-grid">
      <section className="panel rounded-[2rem] p-6">
        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-primary/70">
              Meal feedback
            </p>
            <h1 className="mt-2 font-display text-4xl text-primary">Close the loop after dinner.</h1>
            <p className="mt-3 text-sm text-ink/70">
              Feedback is stored as Markdown and used to steer future plans away from misses and toward repeat favorites.
            </p>
          </div>

          <form action={saveFeedbackAction} className="rounded-[1.75rem] bg-white/80 p-5">
            <div className="grid gap-3 md:grid-cols-2">
              <select name="recipeId" className="rounded-2xl border border-ink/10 bg-white px-4 py-3">
                {recipes.map((recipe) => (
                  <option key={recipe.id} value={recipe.id}>
                    {recipe.title}
                  </option>
                ))}
              </select>
              <input
                type="date"
                name="mealDate"
                defaultValue={selectedDate || latestMealDate || format(new Date(), "yyyy-MM-dd")}
                className="rounded-2xl border border-ink/10 bg-white px-4 py-3"
              />
              <select name="leftoversRating" className="rounded-2xl border border-ink/10 bg-white px-4 py-3">
                <option value="great">Great leftovers</option>
                <option value="fine">Fine leftovers</option>
                <option value="none">No leftovers</option>
              </select>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {familyMembers.map((member) => (
                <label key={member.id} className="flex items-center justify-between rounded-2xl bg-soft px-4 py-3">
                  <span className="font-medium">{member.name}</span>
                  <select name={member.id} className="rounded-xl border border-ink/10 bg-white px-3 py-2 text-sm">
                    <option value="loved">Loved</option>
                    <option value="liked">Liked</option>
                    <option value="neutral">Neutral</option>
                    <option value="disliked">Disliked</option>
                  </select>
                </label>
              ))}
            </div>

            <label className="mt-4 flex items-center gap-3 text-sm text-ink/72">
              <input type="checkbox" name="wouldRepeatSoon" defaultChecked className="h-4 w-4 rounded" />
              Add this back into rotation soon
            </label>

            <textarea
              name="notes"
              rows={4}
              placeholder="What happened at the table? Any tweaks for next time?"
              className="mt-4 w-full rounded-[1.5rem] border border-ink/10 bg-white px-4 py-3"
            />

            <SubmitButton
              idleLabel="Save feedback"
              pendingLabel="Saving..."
              className="mt-4 rounded-2xl bg-primary px-5 py-3 font-semibold text-white"
            />
          </form>
        </div>
      </section>

      <section className="panel rounded-[2rem] p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-primary/70">
              Feedback history
            </p>
            <h2 className="mt-2 font-display text-3xl text-primary">Click a date to revisit that meal.</h2>
          </div>
          <div className="flex items-center gap-3 text-sm font-semibold text-primary">
            <Link
              href={`/history?month=${format(subMonths(monthDate, 1), "yyyy-MM")}`}
              className="rounded-full border border-primary/15 px-4 py-2"
            >
              Previous
            </Link>
            <span className="min-w-32 text-center">{format(monthDate, "MMMM yyyy")}</span>
            <Link
              href={`/history?month=${format(addMonths(monthDate, 1), "yyyy-MM")}`}
              className="rounded-full border border-primary/15 px-4 py-2"
            >
              Next
            </Link>
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-[1.75rem] bg-white/78 p-5">
            <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold uppercase tracking-[0.18em] text-primary/55">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((label) => (
                <div key={label} className="py-2">
                  {label}
                </div>
              ))}
            </div>

            <div className="mt-2 grid grid-cols-7 gap-2">
              {days.map((day) => (
                <Link
                  key={day.isoDate}
                  href={`/history?month=${activeMonth}&date=${day.isoDate}`}
                  className={cn(
                    "flex min-h-20 flex-col rounded-2xl border px-3 py-2 transition",
                    day.isSelected
                      ? "border-primary bg-primary text-white"
                      : day.hasMeal
                        ? "border-primary/15 bg-[#fff8ee] text-ink hover:border-primary/40"
                        : "border-ink/8 bg-white/80 text-ink/65 hover:border-ink/20",
                    !day.inMonth && "opacity-40",
                  )}
                >
                  <span className="text-sm font-semibold">{day.dayNumber}</span>
                  {day.hasMeal ? (
                    <div className="mt-auto">
                      <span
                        className={cn(
                          "block text-[11px] font-semibold leading-4",
                          day.isSelected ? "text-white/90" : "text-primary/85",
                        )}
                      >
                        {day.mealTitle}
                      </span>
                      {day.mealCount > 1 ? (
                        <span
                          className={cn(
                            "mt-1 block text-[10px] font-semibold uppercase tracking-[0.16em]",
                            day.isSelected ? "text-white/75" : "text-primary/60",
                          )}
                        >
                          +{day.mealCount - 1} more
                        </span>
                      ) : null}
                    </div>
                  ) : null}
                </Link>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-[1.75rem] bg-white/75 p-5">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary/60">
                {selectedDate ? "Selected day" : "Recent meals"}
              </p>
              <p className="mt-2 text-lg font-semibold text-primary">
                {selectedDate ? formatLongDate(selectedDate) : "Most recent feedback"}
              </p>
            </div>

            {selectedEntries.length > 0 ? selectedEntries.map((entry) => (
              <article key={entry.id} className="rounded-[1.75rem] bg-white/78 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-lg font-semibold">{entry.recipeTitle}</p>
                    <p className="text-sm text-ink/55">{entry.mealDate}</p>
                  </div>
                  <span className="rounded-full bg-soft px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                    {entry.leftoversRating} leftovers
                  </span>
                </div>
                <p className="mt-3 text-sm text-ink/70">{entry.body}</p>
              </article>
            )) : (
              <div className="rounded-[1.75rem] bg-white/78 p-5 text-sm text-ink/68">
                No meal feedback is stored for that day yet.
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
