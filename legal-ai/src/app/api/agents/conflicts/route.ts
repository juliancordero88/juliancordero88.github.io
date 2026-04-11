import { type NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { runAgent } from "@/lib/agents/agentHandler"
import type { AgentMessage } from "@/lib/agents/agentHandler"

export const runtime = "nodejs"

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const body = await req.json()
  const { messages, sessionId, documentIds, useGlobalRAG, clientId, matterId } = body

  if (!messages?.length) {
    return new Response("messages required", { status: 400 })
  }

  const AGENT_ID = "conflicts"

  const result = await runAgent({
    agentId: AGENT_ID,
    messages: messages as AgentMessage[],
    sessionId,
    userId: user?.id,
    documentIds,
    useGlobalRAG,
    clientId,
    matterId,
  })

  return result.toTextStreamResponse()
}
