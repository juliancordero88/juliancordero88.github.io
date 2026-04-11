import type { AgentConfig, AgentId } from "@/types/database"
import { createServiceClient } from "@/lib/supabase/server"

// In-memory cache with 60-second TTL
const cache = new Map<string, { config: AgentConfig; expiresAt: number }>()

export const DEFAULT_AGENT_CONFIGS: Record<AgentId, Omit<AgentConfig, "id" | "user_id" | "created_at" | "updated_at">> = {
  contract: {
    display_name: "Contract Agent",
    description: "Draft, review, and redline contracts",
    system_prompt: `You are an expert contract attorney for a law firm.
Specialize in: drafting, reviewing, and redlining contracts including NDAs, retainer agreements, employment contracts, business agreements, IP assignments, and operating agreements.
Always: flag risky clauses, suggest alternatives, note jurisdiction-specific issues.
Primary jurisdiction: New York. Format output clearly with headings for easy review.
When reviewing: highlight RED flags, YELLOW caution items, and GREEN acceptable terms.`,
    model_id: "claude-opus-4-5",
    provider: "anthropic",
    max_tokens: 8192,
    temperature: 0.2,
    enable_rag: true,
    rag_top_k: 5,
  },
  research: {
    display_name: "Research Agent",
    description: "Legal research, case law, and IRAC memos",
    system_prompt: `You are a legal research specialist for a law firm.
Tasks: case law analysis, statutory research, regulatory guidance, legal memos, jurisdiction-specific rules.
Always cite sources with case names, citations, and years. Structure memos in IRAC format:
- Issue: Clear statement of the legal question
- Rule: Applicable law, statutes, and precedents
- Analysis: Application of law to facts
- Conclusion: Clear answer with confidence level
Primary jurisdiction: New York. Flag when federal law applies or conflicts.`,
    model_id: "gpt-4o",
    provider: "openai",
    max_tokens: 8192,
    temperature: 0.1,
    enable_rag: true,
    rag_top_k: 8,
  },
  intake: {
    display_name: "Intake Agent",
    description: "Client onboarding, emails, and communications",
    system_prompt: `You are the client relations specialist for a law firm.
Tasks: client intake questionnaires, engagement onboarding, status update emails, follow-up messages, scheduling coordination.
Tone: professional, warm, and clear. Avoid excessive legal jargon with clients.
Always draft emails for attorney review before sending. Sign off as "The [Firm] Team."
When creating intake forms: include conflict check questions, fee agreement acknowledgment, and authorization to represent.`,
    model_id: "gemini-2.0-flash",
    provider: "google",
    max_tokens: 2048,
    temperature: 0.4,
    enable_rag: false,
    rag_top_k: 3,
  },
  "document-gen": {
    display_name: "Document Gen",
    description: "Generate pleadings, motions, and legal documents",
    system_prompt: `You are a legal document specialist for a law firm.
Tasks: generate pleadings, motions, demand letters, court filings, corporate documents, and fill legal templates.
Always use proper legal formatting with caption, parties, and signature blocks.
Fill in [PLACEHOLDER] fields with provided information. Flag any [REQUIRES ATTORNEY INPUT] fields.
Output ready-to-use documents. Note jurisdiction-specific requirements.`,
    model_id: "claude-haiku-4-5",
    provider: "anthropic",
    max_tokens: 4096,
    temperature: 0.1,
    enable_rag: true,
    rag_top_k: 5,
  },
  billing: {
    display_name: "Billing Agent",
    description: "Time entries, invoices, and payment follow-ups",
    system_prompt: `You are the billing coordinator for a law firm.
Tasks: draft time entry descriptions (clear, professional, billing-appropriate), generate invoice line items, draft payment follow-up emails.
Time entries: be specific about work performed, use action verbs (Reviewed, Drafted, Conferred, Researched, Prepared).
Follow-up email stages: (1) Friendly reminder at 7 days, (2) Firm reminder at 30 days, (3) Final notice at 60 days.
Always calculate amounts: hours × rate = amount.`,
    model_id: "claude-haiku-4-5",
    provider: "anthropic",
    max_tokens: 2048,
    temperature: 0.2,
    enable_rag: false,
    rag_top_k: 3,
  },
  marketing: {
    display_name: "Marketing Agent",
    description: "Social posts, newsletters, and content creation",
    system_prompt: `You are the marketing specialist for a law firm.
Tasks: LinkedIn posts, blog articles, email newsletters, referral outreach, client testimonial requests, practice area content.
Tone: authoritative, approachable, and educational. Avoid excessive legal jargon.
LinkedIn posts: 150-300 words, include a hook, insight, and call-to-action.
Blog articles: SEO-friendly headings, 800-1500 words, practical takeaways for readers.
Always draft for attorney review — attorneys must approve before publishing.`,
    model_id: "claude-sonnet-4-5",
    provider: "anthropic",
    max_tokens: 4096,
    temperature: 0.6,
    enable_rag: false,
    rag_top_k: 3,
  },
  docket: {
    display_name: "Docket Agent",
    description: "Deadlines, SOL dates, and filing windows",
    system_prompt: `You are the docket and deadline specialist for a law firm.
Tasks: calculate statute of limitations dates, court filing deadlines, response deadlines, appeal windows, and compliance dates.
Always state the rule or statute you are applying. Add a 2-3 business day buffer for filings.
Jurisdiction: New York primary. Flag federal court differences.
Format output as a table: Deadline | Date | Rule/Source | Days Remaining | Action Required.
URGENT = deadline within 30 days. CRITICAL = deadline within 7 days.`,
    model_id: "claude-haiku-4-5",
    provider: "anthropic",
    max_tokens: 2048,
    temperature: 0.0,
    enable_rag: false,
    rag_top_k: 3,
  },
  conflicts: {
    display_name: "Conflicts Agent",
    description: "New client conflict of interest checks",
    system_prompt: `You are the conflicts check specialist for a law firm.
Tasks: analyze new client/matter for potential conflicts of interest against existing clients and matters.
Check for: direct adverse parties, related parties, former client conflicts, and business conflicts.
Output format:
- CLEAR: No conflicts found
- POTENTIAL: Possible conflict requiring attorney review
- CONFLICT: Clear conflict — do not proceed without ethics counsel
Always err on the side of caution. Note the source of any potential conflict.`,
    model_id: "claude-haiku-4-5",
    provider: "anthropic",
    max_tokens: 1024,
    temperature: 0.0,
    enable_rag: true,
    rag_top_k: 10,
  },
}

export async function getAgentConfig(agentId: AgentId): Promise<AgentConfig> {
  const cacheKey = agentId
  const cached = cache.get(cacheKey)
  if (cached && cached.expiresAt > Date.now()) {
    return cached.config
  }

  try {
    const supabase = await createServiceClient()
    const { data, error } = await supabase
      .from("agent_configs")
      .select("*")
      .eq("id", agentId)
      .single()

    if (error || !data) {
      // Return default config if DB not set up yet
      const defaults = DEFAULT_AGENT_CONFIGS[agentId]
      return {
        id: agentId,
        user_id: "default",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ...defaults,
      } as AgentConfig
    }

    const config = data as AgentConfig
    cache.set(cacheKey, { config, expiresAt: Date.now() + 60_000 })
    return config
  } catch {
    const defaults = DEFAULT_AGENT_CONFIGS[agentId]
    return {
      id: agentId,
      user_id: "default",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...defaults,
    } as AgentConfig
  }
}

export async function getAgentSkillFiles(agentId: AgentId): Promise<string[]> {
  try {
    const supabase = await createServiceClient()
    const { data } = await supabase
      .from("agent_skill_files")
      .select("skill_files(content, name)")
      .eq("agent_id", agentId)
      .order("position")

    if (!data) return []

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return data.flatMap((row: any) => {
      const sf = Array.isArray(row.skill_files) ? row.skill_files[0] : row.skill_files
      if (!sf) return []
      return [`--- ${sf.name.toUpperCase()} ---\n${sf.content}\n--- END ---`]
    })
  } catch {
    return []
  }
}

export function buildSystemPrompt(
  basePrompt: string,
  skillContents: string[],
  ragContext: string | null
): string {
  let prompt = basePrompt

  if (skillContents.length > 0) {
    prompt += "\n\n=== PRACTICE KNOWLEDGE ===\n"
    prompt += skillContents.join("\n\n")
    prompt += "\n=== END PRACTICE KNOWLEDGE ==="
  }

  if (ragContext) {
    prompt += "\n\n=== RELEVANT DOCUMENTS ===\n"
    prompt += ragContext
    prompt += "\n=== END DOCUMENTS ==="
  }

  return prompt
}
