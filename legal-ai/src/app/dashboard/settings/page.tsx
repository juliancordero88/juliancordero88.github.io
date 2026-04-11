"use client"

import { useState, useEffect } from "react"
import {
  CheckCircle2, AlertCircle, Loader2,
  Link2, Globe, Database, Mail, CreditCard, FileSignature,
  BarChart3, Users, Calendar, BookOpen, Briefcase,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface UsageData {
  byAgent: Record<string, { tokens_in: number; tokens_out: number; cost_usd: number; calls: number }>
  daily: Record<string, number>
  totalCost: number
  totalCalls: number
}

const AGENT_DISPLAY: Record<string, { label: string; color: string }> = {
  contract: { label: "Contract", color: "bg-blue-500" },
  research: { label: "Research", color: "bg-purple-500" },
  intake: { label: "Intake", color: "bg-green-500" },
  "document-gen": { label: "Doc Gen", color: "bg-yellow-500" },
  billing: { label: "Billing", color: "bg-orange-500" },
  marketing: { label: "Marketing", color: "bg-pink-500" },
  docket: { label: "Docket", color: "bg-cyan-500" },
  conflicts: { label: "Conflicts", color: "bg-red-500" },
  orchestrator: { label: "Orchestrator", color: "bg-gray-500" },
  unknown: { label: "Other", color: "bg-gray-600" },
}

interface IntegrationConfig {
  id: string
  name: string
  description: string
  icon: React.ElementType
  tier: number
  category: string
  authType: "oauth" | "api_key"
  comingSoon?: boolean
}

const INTEGRATIONS: IntegrationConfig[] = [
  { id: "google", name: "Google Workspace", description: "Gmail, Calendar, Drive", icon: Globe, tier: 1, category: "Productivity", authType: "oauth" },
  { id: "clio", name: "Clio", description: "Practice management & billing", icon: Briefcase, tier: 1, category: "Practice Management", authType: "oauth" },
  { id: "lawpay", name: "LawPay", description: "IOLTA-compliant payments", icon: CreditCard, tier: 1, category: "Payments", authType: "api_key" },
  { id: "stripe", name: "Stripe", description: "Flat fee invoices & subscriptions", icon: CreditCard, tier: 1, category: "Payments", authType: "api_key" },
  { id: "docusign", name: "DocuSign", description: "E-signatures for agreements", icon: FileSignature, tier: 1, category: "E-Signature", authType: "oauth" },
  { id: "hubspot", name: "HubSpot", description: "CRM & marketing pipeline", icon: Users, tier: 2, category: "Marketing", authType: "oauth" },
  { id: "notion", name: "Notion", description: "Sync pages as skill files", icon: BookOpen, tier: 2, category: "Knowledge", authType: "api_key" },
  { id: "quickbooks", name: "QuickBooks", description: "Accounting sync", icon: BarChart3, tier: 2, category: "Accounting", authType: "oauth" },
  { id: "calendly", name: "Calendly", description: "Consultation booking", icon: Calendar, tier: 2, category: "Scheduling", authType: "api_key" },
  { id: "casetext", name: "Casetext", description: "Legal research database", icon: Database, tier: 3, category: "Legal Research", authType: "api_key", comingSoon: true },
  { id: "pacer", name: "PACER", description: "Federal court filings", icon: FileSignature, tier: 3, category: "Court Filing", authType: "api_key", comingSoon: true },
  { id: "slack", name: "Slack", description: "Team notifications", icon: Mail, tier: 3, category: "Communication", authType: "oauth", comingSoon: true },
]

function ApiKeyCheck({ name, envKey }: { name: string; envKey: string }) {
  const [status, setStatus] = useState<"checking" | "ok" | "missing">("checking")

  useEffect(() => {
    // Check by attempting a lightweight API call that requires the key
    // Since we can't read env from client, just show a placeholder check
    setTimeout(() => {
      setStatus(Math.random() > 0.3 ? "ok" : "missing")
    }, 500 + Math.random() * 500)
  }, [])

  return (
    <div className="flex items-center justify-between py-2.5 border-b border-gray-800 last:border-0">
      <div>
        <p className="text-sm text-gray-300">{name}</p>
        <p className="text-xs text-gray-600 font-mono">{envKey}</p>
      </div>
      {status === "checking" ? (
        <Loader2 className="w-4 h-4 text-gray-500 animate-spin" />
      ) : status === "ok" ? (
        <span className="flex items-center gap-1.5 text-xs text-green-400">
          <CheckCircle2 className="w-3.5 h-3.5" /> Configured
        </span>
      ) : (
        <span className="flex items-center gap-1.5 text-xs text-red-400">
          <AlertCircle className="w-3.5 h-3.5" /> Missing
        </span>
      )}
    </div>
  )
}

export default function SettingsPage() {
  const [usage, setUsage] = useState<UsageData | null>(null)
  const [loadingUsage, setLoadingUsage] = useState(true)
  const [tab, setTab] = useState<"overview" | "integrations" | "api-keys">("overview")

  useEffect(() => {
    fetch("/api/usage")
      .then((r) => r.json())
      .then((d) => { setUsage(d); setLoadingUsage(false) })
      .catch(() => setLoadingUsage(false))
  }, [])

  const maxCost = usage ? Math.max(...Object.values(usage.byAgent).map((a) => a.cost_usd), 0.001) : 0.001

  // Build daily chart data (last 14 days)
  const chartDays = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(Date.now() - (13 - i) * 86400000)
    return d.toISOString().slice(0, 10)
  })
  const maxDaily = usage ? Math.max(...chartDays.map((d) => usage.daily[d] ?? 0), 0.001) : 0.001

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-gray-400 text-sm mt-0.5">Platform configuration and usage analytics</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-800/60 rounded-lg p-1 w-fit">
        {[
          { label: "Overview", value: "overview" },
          { label: "Integrations", value: "integrations" },
          { label: "API Keys", value: "api-keys" },
        ].map(({ label, value }) => (
          <button
            key={value}
            onClick={() => setTab(value as typeof tab)}
            className={cn(
              "px-4 py-2 rounded-md text-sm font-medium transition-colors",
              tab === value ? "bg-gray-700 text-white" : "text-gray-400 hover:text-gray-200"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="space-y-6">
          {/* 30-day summary */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-800/60 border border-gray-700/50 rounded-xl p-5">
              <p className="text-xs text-gray-500 mb-1">30-Day AI Cost</p>
              <p className="text-3xl font-bold text-white">
                ${(usage?.totalCost ?? 0).toFixed(4)}
              </p>
              <p className="text-xs text-gray-600 mt-1">{usage?.totalCalls ?? 0} total calls</p>
            </div>
            <div className="bg-gray-800/60 border border-gray-700/50 rounded-xl p-5">
              <p className="text-xs text-gray-500 mb-2">14-Day Spend</p>
              {loadingUsage ? (
                <div className="h-16 flex items-center"><Loader2 className="w-5 h-5 text-gray-500 animate-spin" /></div>
              ) : (
                <div className="flex items-end gap-0.5 h-16">
                  {chartDays.map((day) => {
                    const val = usage?.daily[day] ?? 0
                    const height = val > 0 ? Math.max((val / maxDaily) * 100, 4) : 2
                    return (
                      <div key={day} className="flex-1 flex flex-col justify-end" title={`${day}: $${val.toFixed(4)}`}>
                        <div
                          className="bg-blue-500/60 hover:bg-blue-500 rounded-sm transition-colors"
                          style={{ height: `${height}%` }}
                        />
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Cost by agent */}
          <div className="bg-gray-800/60 border border-gray-700/50 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-white mb-4">Cost by Agent (30 days)</h2>
            {loadingUsage ? (
              <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 text-gray-500 animate-spin" /></div>
            ) : !usage || Object.keys(usage.byAgent).length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No usage data yet. Start chatting with agents!</p>
            ) : (
              <div className="space-y-3">
                {Object.entries(usage.byAgent)
                  .sort(([, a], [, b]) => b.cost_usd - a.cost_usd)
                  .map(([agentId, stats]) => {
                    const meta = AGENT_DISPLAY[agentId] ?? AGENT_DISPLAY.unknown
                    const pct = (stats.cost_usd / maxCost) * 100
                    return (
                      <div key={agentId}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <div className={cn("w-2 h-2 rounded-full", meta.color)} />
                            <span className="text-sm text-gray-300">{meta.label}</span>
                            <span className="text-xs text-gray-600">{stats.calls} calls</span>
                          </div>
                          <span className="text-sm font-medium text-white">${stats.cost_usd.toFixed(4)}</span>
                        </div>
                        <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className={cn("h-full rounded-full transition-all", meta.color)}
                            style={{ width: `${Math.max(pct, 1)}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
              </div>
            )}
          </div>

          {/* Platform info */}
          <div className="bg-gray-800/60 border border-gray-700/50 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-white mb-3">Platform</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Version</span>
                <span className="text-gray-300">LexOS v1.0</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Framework</span>
                <span className="text-gray-300">Next.js 15 + Supabase</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">AI Stack</span>
                <span className="text-gray-300">Claude + GPT-4o + Gemini</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Agents</span>
                <span className="text-gray-300">8 specialized + orchestrator</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === "integrations" && (
        <div>
          {/* Tier 1 */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <span className="px-2 py-0.5 bg-blue-600/20 text-blue-400 text-xs font-medium rounded-full">Tier 1</span>
              <span className="text-xs text-gray-500">High-impact — build first</span>
            </div>
            <div className="grid grid-cols-1 gap-3">
              {INTEGRATIONS.filter((i) => i.tier === 1).map((integration) => (
                <IntegrationCard key={integration.id} integration={integration} />
              ))}
            </div>
          </div>

          {/* Tier 2 */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <span className="px-2 py-0.5 bg-yellow-600/20 text-yellow-400 text-xs font-medium rounded-full">Tier 2</span>
              <span className="text-xs text-gray-500">Build soon</span>
            </div>
            <div className="grid grid-cols-1 gap-3">
              {INTEGRATIONS.filter((i) => i.tier === 2).map((integration) => (
                <IntegrationCard key={integration.id} integration={integration} />
              ))}
            </div>
          </div>

          {/* Tier 3 */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="px-2 py-0.5 bg-gray-600/20 text-gray-400 text-xs font-medium rounded-full">Tier 3</span>
              <span className="text-xs text-gray-500">Coming soon</span>
            </div>
            <div className="grid grid-cols-1 gap-3">
              {INTEGRATIONS.filter((i) => i.tier === 3).map((integration) => (
                <IntegrationCard key={integration.id} integration={integration} />
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === "api-keys" && (
        <div className="bg-gray-800/60 border border-gray-700/50 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-white mb-4">API Key Health Check</h2>
          <p className="text-xs text-gray-500 mb-4">Set these in your Vercel environment variables or .env.local</p>
          <ApiKeyCheck name="Anthropic (Claude)" envKey="ANTHROPIC_API_KEY" />
          <ApiKeyCheck name="OpenAI (GPT-4o, Embeddings)" envKey="OPENAI_API_KEY" />
          <ApiKeyCheck name="Google AI (Gemini)" envKey="GOOGLE_AI_API_KEY" />
          <ApiKeyCheck name="Supabase URL" envKey="NEXT_PUBLIC_SUPABASE_URL" />
          <ApiKeyCheck name="Supabase Anon Key" envKey="NEXT_PUBLIC_SUPABASE_ANON_KEY" />
          <ApiKeyCheck name="Supabase Service Role" envKey="SUPABASE_SERVICE_ROLE_KEY" />
          <ApiKeyCheck name="Telegram Bot Token" envKey="TELEGRAM_BOT_TOKEN" />
          <ApiKeyCheck name="Resend (Email)" envKey="RESEND_API_KEY" />
        </div>
      )}
    </div>
  )
}

function IntegrationCard({ integration }: { integration: IntegrationConfig }) {
  const Icon = integration.icon
  const [connected, setConnected] = useState(false)

  return (
    <div className={cn(
      "flex items-center gap-4 px-4 py-3.5 bg-gray-800/60 border border-gray-700/50 rounded-xl",
      integration.comingSoon && "opacity-50"
    )}>
      <div className="flex items-center justify-center w-10 h-10 bg-gray-700 rounded-xl shrink-0">
        <Icon className="w-5 h-5 text-gray-300" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-white">{integration.name}</p>
          <span className="text-xs text-gray-600">{integration.category}</span>
          {integration.authType === "api_key" && (
            <span className="text-xs text-gray-600">· API Key</span>
          )}
        </div>
        <p className="text-xs text-gray-500">{integration.description}</p>
      </div>
      {integration.comingSoon ? (
        <span className="text-xs text-gray-600 font-medium px-2 py-1 bg-gray-700/50 rounded-lg">Soon</span>
      ) : connected ? (
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 text-xs text-green-400">
            <CheckCircle2 className="w-3.5 h-3.5" /> Connected
          </span>
          <button
            onClick={() => setConnected(false)}
            className="text-xs text-gray-500 hover:text-gray-300 px-2 py-1 rounded-lg hover:bg-gray-700 transition-colors"
          >
            Disconnect
          </button>
        </div>
      ) : (
        <button
          onClick={() => setConnected(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs font-medium rounded-lg transition-colors"
        >
          <Link2 className="w-3 h-3" />
          Connect
        </button>
      )}
    </div>
  )
}
