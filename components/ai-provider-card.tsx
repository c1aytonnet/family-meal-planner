"use client";

import { useId } from "react";
import { PROVIDER_MODEL_OPTIONS, isPresetModel } from "@/lib/ai/model-options";
import type { AIProvider, AIProviderConfig } from "@/lib/types";

function providerLabel(provider: AIProvider) {
  switch (provider) {
    case "openai":
      return "OpenAI";
    case "anthropic":
      return "Claude / Anthropic";
    case "perplexity":
      return "Perplexity";
  }
}

export function AIProviderCard({
  provider,
  maskedKey,
}: {
  provider: AIProviderConfig;
  maskedKey: string;
}) {
  const customId = useId();
  const preset = isPresetModel(provider.provider, provider.model) ? provider.model : "__custom__";

  return (
    <article className="rounded-[1.75rem] bg-white/78 p-5">
      <p className="text-lg font-semibold text-primary">{providerLabel(provider.provider)}</p>
      <p className="mt-1 text-sm text-ink/60">Current key: {maskedKey}</p>

      <label className="mt-4 flex items-center gap-3 text-sm font-medium text-ink/72">
        <input
          type="checkbox"
          name={`${provider.provider}_enabled`}
          defaultChecked={provider.enabled}
          className="h-4 w-4 rounded"
        />
        Enable this provider
      </label>

      <div className="mt-4 space-y-4">
        <div>
          <p className="text-sm font-semibold text-primary">Model</p>
          <select
            name={`${provider.provider}_modelChoice`}
            defaultValue={preset}
            className="mt-2 w-full rounded-2xl border border-ink/10 bg-white px-4 py-3"
          >
            {PROVIDER_MODEL_OPTIONS[provider.provider].map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
            <option value="__custom__">Custom model - enter exact model id below</option>
          </select>
        </div>

        <div>
          <p className="text-sm font-semibold text-primary">Custom model id</p>
          <input
            id={customId}
            name={`${provider.provider}_customModel`}
            defaultValue={preset === "__custom__" ? provider.model : ""}
            placeholder="Only needed if you select Custom model"
            className="mt-2 w-full rounded-2xl border border-ink/10 bg-white px-4 py-3"
          />
        </div>

        <div>
          <p className="text-sm font-semibold text-primary">API key</p>
          <input
            type="password"
            name={`${provider.provider}_apiKey`}
            placeholder="Leave blank to keep current key"
            className="mt-2 w-full rounded-2xl border border-ink/10 bg-white px-4 py-3"
          />
        </div>
      </div>
    </article>
  );
}
