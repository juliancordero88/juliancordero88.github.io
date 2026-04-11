import { AgentChat } from "@/components/agents/AgentChat"
import { DEFAULT_AGENT_CONFIGS } from "@/lib/agents/agentRegistry"
import type { AgentId } from "@/types/database"
import Link from "next/link"
import { Settings, ArrowLeft } from "lucide-react"

export default async function AgentPage({
  params,
}: {
  params: Promise<{ agentId: string }>
}) {
  const { agentId } = await params
  const config = DEFAULT_AGENT_CONFIGS[agentId as AgentId]

  if (!config) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        Agent not found.
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-800 bg-gray-900/80 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="text-gray-400 hover:text-gray-200 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-white font-semibold text-sm">{config.display_name}</h1>
            <p className="text-gray-500 text-xs">{config.description}</p>
          </div>
        </div>
        <Link
          href={`/dashboard/agents/${agentId}/settings`}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-medium rounded-lg transition-colors"
        >
          <Settings className="w-3.5 h-3.5" />
          Settings
        </Link>
      </div>

      {/* Chat */}
      <div className="flex-1 overflow-hidden">
        <AgentChat
          agentId={agentId as AgentId}
          agentName={config.display_name}
          useGlobalRAG={config.enable_rag}
        />
      </div>
    </div>
  )
}
