import { updateHouseholdPreferencesAction } from "@/app/actions";
import { SubmitButton } from "@/components/submit-button";
import { familyRepository, getHouseholdPreferences } from "@/lib/storage/repositories";

export default async function PreferencesPage() {
  const [preferences, family] = await Promise.all([
    getHouseholdPreferences(),
    familyRepository.list(),
  ]);

  if (!preferences) {
    return null;
  }

  return (
    <div className="page-grid">
      <section className="panel rounded-[2rem] p-6">
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-primary/70">
          Household preferences
        </p>
        <h1 className="mt-2 font-display text-4xl text-primary">{preferences.householdName}</h1>
        <p className="mt-3 text-sm text-ink/70">
          These rules are stored as structured data and included in every AI planning run.
        </p>

        <form action={updateHouseholdPreferencesAction} className="mt-6 space-y-5">
          <input type="hidden" name="id" value={preferences.id} />

          <div className="grid gap-4 lg:grid-cols-2">
            <PreferenceField label="Household name">
              <input
                name="householdName"
                defaultValue={preferences.householdName}
                className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-3"
              />
            </PreferenceField>
            <PreferenceField label="Current household size">
              <div className="rounded-2xl border border-ink/10 bg-soft px-4 py-3 font-medium text-primary">
                {family.length} family member{family.length === 1 ? "" : "s"}
              </div>
            </PreferenceField>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <PreferenceField label="Weekly rules">
              <textarea
                name="weeklyRules"
                rows={6}
                defaultValue={preferences.weeklyRules.join("\n")}
                className="w-full rounded-[1.5rem] border border-ink/10 bg-white px-4 py-3"
              />
            </PreferenceField>
            <PreferenceField label="Pantry staples">
              <textarea
                name="pantryStaples"
                rows={6}
                defaultValue={preferences.pantryStaples.join("\n")}
                className="w-full rounded-[1.5rem] border border-ink/10 bg-white px-4 py-3"
              />
            </PreferenceField>
            <PreferenceField label="Planning notes">
              <textarea
                name="planningNotes"
                rows={6}
                defaultValue={preferences.planningNotes.join("\n")}
                className="w-full rounded-[1.5rem] border border-ink/10 bg-white px-4 py-3"
              />
            </PreferenceField>
            <PreferenceField label="Recipe idea websites">
              <textarea
                name="recipeIdeaSources"
                rows={6}
                defaultValue={preferences.recipeIdeaSources.join("\n")}
                className="w-full rounded-[1.5rem] border border-ink/10 bg-white px-4 py-3"
              />
            </PreferenceField>
          </div>

          <PreferenceField label="Household description">
            <textarea
              name="body"
              rows={4}
              defaultValue={preferences.body}
              className="w-full rounded-[1.5rem] border border-ink/10 bg-white px-4 py-3"
            />
          </PreferenceField>

          <SubmitButton
            idleLabel="Save preferences"
            pendingLabel="Saving..."
            className="rounded-2xl bg-primary px-5 py-3 font-semibold text-white"
          />
        </form>
      </section>
    </div>
  );
}

function PreferenceField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[1.75rem] bg-white/78 p-5">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary/60">{label}</p>
      <div className="mt-3 text-sm text-ink/72">{children}</div>
    </div>
  );
}
