import { createAnthropic } from "@ai-sdk/anthropic"
import { createOpenAI } from "@ai-sdk/openai"
import { createGoogleGenerativeAI } from "@ai-sdk/google"

export const anthropic = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_AI_API_KEY,
})

export const MODEL_CATALOG = {
  "claude-haiku-4-5": {
    provider: "anthropic" as const,
    label: "Claude Haiku 4.5",
    costIn: 0.00025,
    costOut: 0.00125,
    color: "purple",
    description: "Fast & cheap — routing, templates, simple tasks",
  },
  "claude-sonnet-4-5": {
    provider: "anthropic" as const,
    label: "Claude Sonnet 4.5",
    costIn: 0.003,
    costOut: 0.015,
    color: "purple",
    description: "Balanced — marketing, mid-complexity tasks",
  },
  "claude-opus-4-5": {
    provider: "anthropic" as const,
    label: "Claude Opus 4.5",
    costIn: 0.015,
    costOut: 0.075,
    color: "purple",
    description: "Most capable — contracts, high-stakes work",
  },
  "gpt-4o": {
    provider: "openai" as const,
    label: "GPT-4o",
    costIn: 0.0025,
    costOut: 0.01,
    color: "green",
    description: "Strong reasoning — legal research, analysis",
  },
  "o1": {
    provider: "openai" as const,
    label: "o1",
    costIn: 0.015,
    costOut: 0.06,
    color: "green",
    description: "Deep reasoning — complex multi-step legal analysis",
  },
  "gemini-2.0-flash": {
    provider: "google" as const,
    label: "Gemini 2.0 Flash",
    costIn: 0.000075,
    costOut: 0.0003,
    color: "blue",
    description: "Ultra cheap & fast — high-volume intake, comms",
  },
} as const

export type ModelId = keyof typeof MODEL_CATALOG

export function getModel(modelId: ModelId) {
  const meta = MODEL_CATALOG[modelId]
  if (meta.provider === "anthropic") return anthropic(modelId)
  if (meta.provider === "openai") return openai(modelId)
  if (meta.provider === "google") return google(modelId)
  throw new Error(`Unknown provider for model: ${modelId}`)
}

export function estimateCost(tokensIn: number, tokensOut: number, modelId: ModelId): number {
  const { costIn, costOut } = MODEL_CATALOG[modelId]
  return (tokensIn / 1000) * costIn + (tokensOut / 1000) * costOut
}
