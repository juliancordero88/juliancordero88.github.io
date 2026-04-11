import { streamText } from "ai"
import { getModel, estimateCost, type ModelId } from "@/lib/models"
import { getAgentConfig, getAgentSkillFiles, buildSystemPrompt } from "./agentRegistry"
import { vectorSearch } from "@/lib/rag/vectorSearch"
import { buildRAGContext } from "@/lib/rag/contextBuilder"
import { searchMemories, buildMemoryContext } from "@/lib/memory/memorySearch"
import { createServiceClient } from "@/lib/supabase/server"
import type { AgentId } from "@/types/database"

// AI SDK v5 message type
export type AgentMessage = { role: "user" | "assistant" | "system"; content: string }

export interface AgentRunOptions {
  agentId: AgentId
  messages: AgentMessage[]
  sessionId?: string
  userId?: string
  documentIds?: string[]
  useGlobalRAG?: boolean
  clientId?: string
  matterId?: string
}

export async function runAgent(options: AgentRunOptions) {
  const {
    agentId,
    messages,
    sessionId,
    userId,
    documentIds,
    useGlobalRAG,
    clientId,
    matterId,
  } = options

  const config = await getAgentConfig(agentId)
  const skillContents = await getAgentSkillFiles(agentId)

  // Get last user message for RAG + memory search
  const lastUserMessage = messages
    .filter((m) => m.role === "user")
    .at(-1)?.content as string | undefined

  let ragContext: string | null = null
  let memoryContext: string | null = null

  // RAG: search document library if enabled
  if (lastUserMessage && (config.enable_rag || useGlobalRAG || documentIds?.length)) {
    const results = await vectorSearch(lastUserMessage, {
      documentIds: documentIds?.length ? documentIds : undefined,
      topK: config.rag_top_k,
    })
    if (results.length > 0) {
      ragContext = buildRAGContext(results)
    }
  }

  // Memory: search past memories
  if (lastUserMessage) {
    const memories = await searchMemories(lastUserMessage, {
      topK: 5,
      clientId,
      matterId,
    })
    if (memories.length > 0) {
      memoryContext = buildMemoryContext(memories)
    }
  }

  // Build full system prompt
  let systemPrompt = buildSystemPrompt(config.system_prompt, skillContents, ragContext)
  if (memoryContext) {
    systemPrompt += `\n\n=== REMEMBERED CONTEXT ===\n${memoryContext}\n=== END CONTEXT ===`
  }

  const model = getModel(config.model_id as ModelId)

  const result = streamText({
    model,
    system: systemPrompt,
    messages,
    maxOutputTokens: config.max_tokens,
    temperature: config.temperature,
    onFinish: async (event) => {
      if (!userId) return
      const usage = event.totalUsage
      const tokIn = usage.inputTokens ?? 0
      const tokOut = usage.outputTokens ?? 0
      const cost = estimateCost(tokIn, tokOut, config.model_id as ModelId)
      try {
        const supabase = await createServiceClient()
        await supabase.from("usage_logs").insert({
          user_id: userId,
          agent_id: agentId,
          model_id: config.model_id,
          tokens_in: tokIn,
          tokens_out: tokOut,
          cost_usd: cost,
          session_id: sessionId ?? null,
        })
      } catch (e) {
        console.error("Failed to log usage:", e)
      }
    },
  })

  return result
}
