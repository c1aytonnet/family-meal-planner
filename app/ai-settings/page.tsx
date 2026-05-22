import { updateAISettingsAction } from "@/app/actions";
import { AIProviderCard } from "@/components/ai-provider-card";
import { SubmitButton } from "@/components/submit-button";
import { getAISecrets, getAISettings } from "@/lib/storage/repositories";

function maskSecret(secret: string) {
  if (!secret) {
    return "Not configured";
  }
  if (secret.length <= 6) {
    return "Configured";
  }
  return `${secret.slice(0, 3)}...${secret.slice(-3)}`;
}

export default async function AISettingsPage() {
  const [settings, secrets] = await Promise.all([getAISettings(), getAISecrets()]);

  if (!settings) {
    return null;
  }

  return (
    <div className="page-grid">
      <section className="panel rounded-[2rem] p-6">
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-primary/70">
          AI settings
        </p>
        <h1 className="mt-2 font-display text-4xl text-primary">Connect the planner to your preferred model provider.</h1>
        <p className="mt-3 max-w-3xl text-sm text-ink/70">
          Keys are submitted from the GUI but stored server-side only in the mounted data directory. After save, the page only shows a masked status.
        </p>
        <p className="mt-2 max-w-3xl text-sm text-ink/60">
          Choose a default provider, save your settings, and the planner will use that provider for future meal plans.
        </p>

        <form action={updateAISettingsAction} className="mt-6 space-y-5">
          <div className="rounded-[1.75rem] bg-white/78 p-5">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary/60">
              Default provider
            </p>
            <select
              name="defaultProvider"
              defaultValue={settings.defaultProvider}
              className="mt-3 w-full rounded-2xl border border-ink/10 bg-white px-4 py-3"
            >
              <option value="openai">OpenAI</option>
              <option value="anthropic">Claude / Anthropic</option>
              <option value="perplexity">Perplexity</option>
            </select>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            {settings.providers.map((provider) => (
                <AIProviderCard
                  key={provider.provider}
                  provider={provider}
                  maskedKey={maskSecret(secrets[provider.provider])}
                />
              ))}
            </div>

          <div className="rounded-[1.75rem] bg-[#fff8ee] p-5 text-sm text-ink/68">
            Entering a new API key for the selected default provider will automatically enable that provider.
          </div>

          <SubmitButton
            idleLabel="Save AI settings"
            pendingLabel="Saving..."
            className="rounded-2xl bg-primary px-5 py-3 font-semibold text-white"
          />
        </form>
      </section>
    </div>
  );
}
