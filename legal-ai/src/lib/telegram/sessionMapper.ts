import { createServiceClient } from "@/lib/supabase/server"
import type { AgentId } from "@/types/database"

// Maps Telegram chatId → Supabase session UUID
const sessionCache = new Map<string, string>()

export async function getOrCreateSession(
  chatId: number,
  agentId: AgentId,
  userId: string
): Promise<string> {
  const cacheKey = `${chatId}:${agentId}`
  const cached = sessionCache.get(cacheKey)
  if (cached) return cached

  const supabase = await createServiceClient()

  // Look for an existing open session for this chat
  const { data: existing } = await supabase
    .from("chat_sessions")
    .select("id")
    .eq("user_id", userId)
    .eq("agent_id", agentId)
    .ilike("title", `telegram:${chatId}%`)
    .order("created_at", { ascending: false })
    .limit(1)
    .single()

  if (existing) {
    sessionCache.set(cacheKey, existing.id)
    return existing.id
  }

  const { data: newSession } = await supabase
    .from("chat_sessions")
    .insert({
      user_id: userId,
      agent_id: agentId,
      title: `telegram:${chatId}`,
    })
    .select("id")
    .single()

  if (newSession) {
    sessionCache.set(cacheKey, newSession.id)
    return newSession.id
  }

  return `telegram-${chatId}-${agentId}`
}
