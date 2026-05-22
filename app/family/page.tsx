import {
  createFamilyMemberAction,
  deleteFamilyMemberAction,
  updateFamilyMemberAction,
} from "@/app/actions";
import { SubmitButton } from "@/components/submit-button";
import { familyRepository } from "@/lib/storage/repositories";

export default async function FamilyPage() {
  const family = await familyRepository.list();

  return (
    <div className="page-grid">
      <section className="panel rounded-[2rem] p-6">
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-primary/70">
          Family members
        </p>
        <h1 className="mt-2 font-display text-4xl text-primary">Preferences that shape the plan.</h1>
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {family.map((member) => (
            <article key={member.id} className="rounded-[1.75rem] bg-white/78 p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xl font-semibold">{member.name}</p>
                  <p className="text-sm text-ink/55">{member.role}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-soft px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                    {member.feedbackIds.length} notes
                  </span>
                  <form action={deleteFamilyMemberAction}>
                    <input type="hidden" name="id" value={member.id} />
                    <SubmitButton
                      idleLabel="Remove"
                      pendingLabel="Removing..."
                      className="rounded-full border border-[#d26c52]/20 px-3 py-2 text-xs font-semibold text-[#b84f38]"
                    />
                  </form>
                </div>
              </div>

              <form action={updateFamilyMemberAction} className="mt-5 space-y-4 text-sm">
                <input type="hidden" name="id" value={member.id} />

                <div className="grid gap-3 md:grid-cols-2">
                  <Field label="Name">
                    <input
                      name="name"
                      defaultValue={member.name}
                      className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-3"
                    />
                  </Field>
                  <Field label="Role">
                    <input
                      name="role"
                      defaultValue={member.role}
                      className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-3"
                    />
                  </Field>
                </div>

                <Field label="Likes">
                  <textarea
                    name="likes"
                    rows={3}
                    defaultValue={member.likes.join("\n")}
                    className="w-full rounded-[1.25rem] border border-ink/10 bg-white px-4 py-3"
                  />
                </Field>

                <Field label="Dislikes">
                  <textarea
                    name="dislikes"
                    rows={3}
                    defaultValue={member.dislikes.join("\n")}
                    className="w-full rounded-[1.25rem] border border-ink/10 bg-white px-4 py-3"
                  />
                </Field>

                <Field label="Dietary notes">
                  <textarea
                    name="dietaryNotes"
                    rows={3}
                    defaultValue={member.dietaryNotes.join("\n")}
                    className="w-full rounded-[1.25rem] border border-ink/10 bg-white px-4 py-3"
                  />
                </Field>

                <Field label="Profile notes">
                  <textarea
                    name="body"
                    rows={4}
                    defaultValue={member.body}
                    className="w-full rounded-[1.25rem] border border-ink/10 bg-white px-4 py-3"
                  />
                </Field>

                <SubmitButton
                  idleLabel="Save member"
                  pendingLabel="Saving..."
                  className="rounded-2xl bg-primary px-5 py-3 font-semibold text-white"
                />
              </form>
            </article>
          ))}
        </div>
        <form action={createFamilyMemberAction} className="mt-6 rounded-[1.75rem] bg-[#fff8ee] p-5">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-lg font-semibold text-primary">Add family member</p>
              <p className="text-sm text-ink/65">Create a new household profile right from the app.</p>
            </div>
            <SubmitButton
              idleLabel="Add member"
              pendingLabel="Adding..."
              className="rounded-2xl bg-primary px-5 py-3 font-semibold text-white"
            />
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <Field label="Name">
              <input
                name="name"
                placeholder="Taylor"
                className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-3"
              />
            </Field>
            <Field label="Role">
              <input
                name="role"
                placeholder="Kid, Parent, Grandparent..."
                className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-3"
              />
            </Field>
          </div>

          <div className="mt-3 grid gap-3 lg:grid-cols-3">
            <Field label="Likes">
              <textarea
                name="likes"
                rows={3}
                placeholder={"tacos\nsalmon\nrice bowls"}
                className="w-full rounded-[1.25rem] border border-ink/10 bg-white px-4 py-3"
              />
            </Field>
            <Field label="Dislikes">
              <textarea
                name="dislikes"
                rows={3}
                placeholder={"mushrooms\nspicy soups"}
                className="w-full rounded-[1.25rem] border border-ink/10 bg-white px-4 py-3"
              />
            </Field>
            <Field label="Dietary notes">
              <textarea
                name="dietaryNotes"
                rows={3}
                placeholder={"sensitive to spice\nprefers toppings on the side"}
                className="w-full rounded-[1.25rem] border border-ink/10 bg-white px-4 py-3"
              />
            </Field>
          </div>

          <div className="mt-3">
            <Field label="Profile notes">
              <textarea
                name="body"
                rows={3}
                placeholder="Helpful context about this person's preferences."
                className="w-full rounded-[1.25rem] border border-ink/10 bg-white px-4 py-3"
              />
            </Field>
          </div>
        </form>
      </section>
    </div>
  );
}

function Field({
  title,
  label,
  children,
}: {
  title?: string;
  label?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="font-semibold text-primary">{title ?? label}</p>
      <div className="mt-2">{children}</div>
    </div>
  );
}
