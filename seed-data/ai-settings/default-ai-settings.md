---
id: ai-settings-main
type: ai-settings
title: AI Settings
createdAt: 2026-04-01T08:00:00.000Z
updatedAt: 2026-04-01T08:00:00.000Z
defaultProvider: openai
providers:
  - provider: openai
    enabled: false
    model: gpt-4o-mini
    apiKeyHint: ""
  - provider: anthropic
    enabled: false
    model: claude-sonnet-4-20250514
    apiKeyHint: ""
  - provider: perplexity
    enabled: false
    model: sonar
    apiKeyHint: ""
---
Configure which provider the planner should use. API keys are stored separately in the server-only secrets area.
