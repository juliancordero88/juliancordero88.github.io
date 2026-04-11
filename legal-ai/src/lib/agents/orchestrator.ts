import { generateObject } from "ai"
import { z } from "zod"
import { anthropic } from "@/lib/models"
import type { AgentId } from "@/types/database"

const routingSchema = z.object({
  agentId: z.enum([
    "contract",
    "research",
    "intake",
    "document-gen",
    "billing",
    "marketing",
    "docket",
    "conflicts",
  ]),
  confidence: z.enum(["high", "medium", "low"]),
  reasoning: z.string(),
})

export type OrchestratorDecision = z.infer<typeof routingSchema>

const ROUTING_SYSTEM_PROMPT = `You are a routing agent for a legal AI platform. Classify the user's request to the best specialist agent.

Agents:
- contract: drafting, reviewing, redlining contracts, NDAs, retainers, leases, employment agreements, operating agreements, terms of service
- research: case law lookup, statute analysis, legal research memos, IRAC analysis, precedent, jurisdiction-specific rules
- intake: client onboarding, intake questionnaires, engagement letters, client emails, status updates, follow-up messages, scheduling
- document-gen: generating pleadings, motions, demand letters, court filings, corporate documents, template population
- billing: time entry descriptions, invoice generation, payment follow-up emails, billing questions, fee calculations
- marketing: LinkedIn posts, blog articles, newsletters, referral outreach, social media content, firm marketing
- docket: statute of limitations, court deadlines, filing windows, response deadlines, appeal periods, compliance dates
- conflicts: conflict of interest checks, new client screening, adverse party checks

Return the most appropriate agent, your confidence level, and brief reasoning.`

export async function classifyIntent(
  userMessage: string
): Promise<OrchestratorDecision> {
  try {
    const { object } = await generateObject({
      model: anthropic("claude-haiku-4-5"),
      schema: routingSchema,
      system: ROUTING_SYSTEM_PROMPT,
      prompt: userMessage,
    })
    return object
  } catch {
    // Default to contract agent if routing fails
    return {
      agentId: "contract" as AgentId,
      confidence: "low",
      reasoning: "Routing failed — defaulting to contract agent",
    }
  }
}
