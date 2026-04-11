import { type NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { classifyIntent } from "@/lib/agents/orchestrator"
import { runAgent, type AgentMessage } from "@/lib/agents/agentHandler"
import type { AgentId } from "@/types/database"

export const runtime = "nodejs"

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const body = await req.json()
  const { messages, sessionId, forceAgent, documentIds, clientId, matterId } = body

  if (!messages?.length) {
    return new Response("messages required", { status: 400 })
  }

  const lastMessage = messages.at(-1)?.content ?? ""

  let agentId: AgentId
  if (forceAgent) {
    agentId = forceAgent
  } else {
    const decision = await classifyIntent(lastMessage)
    agentId = decision.agentId
  }

  const result = await runAgent({
    agentId,
    messages: messages as AgentMessage[],
    sessionId,
    userId: user?.id,
    documentIds,
    useGlobalRAG: true,
    clientId,
    matterId,
  })

  return result.toTextStreamResponse({
    headers: {
      "X-Agent-Id": agentId,
    },
  })
}
