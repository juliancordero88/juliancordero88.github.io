import type { AgentConfig, AgentId } from "@/types/database"
import { createServiceClient } from "@/lib/supabase/server"
import { DEFAULT_AGENT_CONFIGS } from "@/lib/agents/agentConfigs"

export { DEFAULT_AGENT_CONFIGS }

// In-memory cache with 60-second TTL
const cache = new Map<string, { config: AgentConfig; expiresAt: number }>()

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
