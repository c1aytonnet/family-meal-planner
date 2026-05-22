import type { AIProvider } from "@/lib/types";

export interface ProviderModelOption {
  value: string;
  label: string;
}

export const PROVIDER_MODEL_OPTIONS: Record<AIProvider, ProviderModelOption[]> = {
  openai: [
    { value: "gpt-5.4-mini", label: "Recommended - gpt-5.4-mini" },
    { value: "gpt-5.4", label: "Best quality - gpt-5.4" },
    { value: "gpt-5.4-nano", label: "Fastest / lowest cost - gpt-5.4-nano" },
  ],
  anthropic: [
    { value: "claude-sonnet-4-20250514", label: "Recommended - claude-sonnet-4-20250514" },
    { value: "claude-opus-4-20250514", label: "Best quality - claude-opus-4-20250514" },
    { value: "claude-haiku-3-5-20241022", label: "Fastest - claude-haiku-3-5-20241022" },
  ],
  perplexity: [
    { value: "sonar", label: "Recommended - sonar" },
    { value: "sonar-pro", label: "Higher quality research - sonar-pro" },
    { value: "sonar-reasoning", label: "Reasoning-focused - sonar-reasoning" },
  ],
};

export function isPresetModel(provider: AIProvider, model: string) {
  return PROVIDER_MODEL_OPTIONS[provider].some((option) => option.value === model);
}
