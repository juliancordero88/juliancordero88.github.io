"use client"

import { useState, useEffect, useCallback } from "react"
import {
  CheckCircle2, AlertCircle, Loader2,
  Link2, Globe, Database, Mail, CreditCard, FileSignature,
  BarChart3, Users, Calendar, BookOpen, Briefcase, X,
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
  keyLabel?: string
  keyPlaceholder?: string
  oauthNote?: string
}

const INTEGRATIONS: IntegrationConfig[] = [
  {
    id: "google", name: "Google Workspace", description: "Gmail, Calendar, Drive",
    icon: Globe, tier: 1, category: "Productivity", authType: "oauth",
    oauthNote: "OAuth 2.0 flow — coming in next release",
  },
  {
    id: "clio", name: "Clio", description: "Practice management & billing",
    icon: Briefcase, tier: 1, category: "Practice Management", authType: "oauth",
    oauthNote: "OAuth 2.0 flow — coming in next release",
  },
  {
    id: "lawpay", name: "LawPay", description: "IOLTA-compliant payments",
    icon: CreditCard, tier: 1, category: "Payments", authType: "api_key",
    keyLabel: "LawPay API Key", keyPlaceholder: "lp_live_...",
  },
  {
    id: "stripe", name: "Stripe", description: "Flat fee invoices & subscriptions",
    icon: CreditCard, tier: 1, category: "Payments", authType: "api_key",
    keyLabel: "Stripe Secret Key", keyPlaceholder: "sk_live_...",
  },
  {
    id: "docusign", name: "DocuSign", description: "E-signatures for agreements",
    icon: FileSignature, tier: 1, category: "E-Signature", authType: "oauth",
    oauthNote: "OAuth 2.0 flow — coming in next release",
  },
  {
    id: "hubspot", name: "HubSpot", description: "CRM & marketing pipeline",
    icon: Users, tier: 2, category: "Marketing", authType: "oauth",
    oauthNote: "OAuth 2.0 flow — coming in next release",
  },
  {
    id: "notion", name: "Notion", description: "Sync pages as skill files",
    icon: BookOpen, tier: 2, category: "Knowledge", authType: "api_key",
    keyLabel: "Notion Integration Token", keyPlaceholder: "secret_...",
  },
  {
    id: "quickbooks", name: "QuickBooks", description: "Accounting sync",
    icon: BarChart3, tier: 2, category: "Accounting", authType: "oauth",
    oauthNote: "OAuth 2.0 flow — coming in next release",
  },
  {
    id: "calendly", name: "Calendly", description: "Consultation booking",
    icon: Calendar, tier: 2, category: "Scheduling", authType: "api_key",
    keyLabel: "Calendly Personal Access Token", keyPlaceholder: "eyJh...",
  },
  {
    id: "casetext", name: "Casetext", description: "Legal research database",
    icon: Database, tier: 3, category: "Legal Research", authType: "api_key",
    keyLabel: "Casetext API Key", keyPlaceholder: "",
  },
  {
    id: "pacer", name: "PACER", description: "Federal court filings",
    icon: FileSignature, tier: 3, category: "Court Filing", authType: "api_key",
    keyLabel: "PACER API Key", keyPlaceholder: "",
  },
  {
    id: "slack", name: "Slack", description: "Team notifications",
    icon: Mail, tier: 3, category: "Communication", authType: "oauth",
    oauthNote: "OAuth 2.0 flow — coming in next release",
  },
]

function ApiKeyCheck({ name, envKey, statuses }: {
  name: string
  envKey: string
  statuses: Record<string, boolean> | null
}) {
  const status = statuses === null ? "checking" : (statuses[envKey] ? "ok" : "missing")

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

function IntegrationCard({
  integration,
  connected,
  onConnect,
  onDisconnect,
}: {
  integration: IntegrationConfig
  connected: boolean
  onConnect: (provider: string, apiKey: string) => Promise<void>
  onDisconnect: (provider: string) => Promise<void>
}) {
  const Icon = integration.icon
  const [showModal, setShowModal] = useState(false)
  const [keyValue, setKeyValue] = useState("")
  const [saving, setSaving] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)

  async function handleSave() {
    if (!keyValue.trim()) return
    setSaving(true)
    await onConnect(integration.id, keyValue.trim())
    setSaving(false)
    setShowModal(false)
    setKeyValue("")
  }

  async function handleDisconnect() {
    setDisconnecting(true)
    await onDisconnect(integration.id)
    setDisconnecting(false)
  }

  const isOAuth = integration.authType === "oauth"

  return (
    <>
      <div className="flex items-center gap-4 px-4 py-3.5 bg-gray-800/60 border border-gray-700/50 rounded-xl">
        <div className="flex items-center justify-center w-10 h-10 bg-gray-700 rounded-xl shrink-0">
          <Icon className="w-5 h-5 text-gray-300" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-medium text-white">{integration.name}</p>
            <span className="text-xs text-gray-600">{integration.category}</span>
          </div>
          <p className="text-xs text-gray-500">{integration.description}</p>
        </div>

        {isOAuth ? (
          <span className="text-xs text-gray-500 px-2.5 py-1 bg-gray-700/50 rounded-lg whitespace-nowrap">
            OAuth — soon
          </span>
        ) : connected ? (
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 text-xs text-green-400 whitespace-nowrap">
              <CheckCircle2 className="w-3.5 h-3.5" /> Connected
            </span>
            <button
              onClick={handleDisconnect}
              disabled={disconnecting}
              className="text-xs text-gray-500 hover:text-gray-300 px-2 py-1 rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              {disconnecting ? <Loader2 className="w-3 h-3 animate-spin" /> : "Disconnect"}
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs font-medium rounded-lg transition-colors whitespace-nowrap"
          >
            <Link2 className="w-3 h-3" />
            Add Key
          </button>
        )}
      </div>

      {/* API Key Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 w-full max-w-md mx-4 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold">{integration.name}</h3>
              <button onClick={() => { setShowModal(false); setKeyValue("") }} className="text-gray-400 hover:text-gray-200">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-gray-400 mb-4">
              Your key is stored securely in your database. It is never sent to us or exposed in the browser.
            </p>
            <label className="block text-xs text-gray-400 mb-1.5">{integration.keyLabel}</label>
            <input
              type="password"
              value={keyValue}
              onChange={(e) => setKeyValue(e.target.value)}
              placeholder={integration.keyPlaceholder}
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => { setShowModal(false); setKeyValue("") }}
                className="px-4 py-2 text-sm text-gray-400 hover:text-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !keyValue.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Save Key
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default function SettingsPage() {
  const [usage, setUsage] = useState<UsageData | null>(null)
  const [loadingUsage, setLoadingUsage] = useState(true)
  const [tab, setTab] = useState<"overview" | "integrations" | "api-keys">("overview")
  const [healthStatuses, setHealthStatuses] = useState<Record<string, boolean> | null>(null)
  const [connectedProviders, setConnectedProviders] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetch("/api/usage")
      .then((r) => r.json())
      .then((d) => { setUsage(d); setLoadingUsage(false) })
      .catch(() => setLoadingUsage(false))
  }, [])

  useEffect(() => {
    if (tab === "api-keys" && healthStatuses === null) {
      fetch("/api/health")
        .then((r) => r.json())
        .then(setHealthStatuses)
        .catch(() => setHealthStatuses({}))
    }
  }, [tab, healthStatuses])

  const loadIntegrations = useCallback(() => {
    fetch("/api/integrations")
      .then((r) => r.json())
      .then((d) => {
        const connected = new Set<string>(
          (d.integrations ?? []).filter((i: { enabled: boolean }) => i.enabled).map((i: { provider: string }) => i.provider)
        )
        setConnectedProviders(connected)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (tab === "integrations") loadIntegrations()
  }, [tab, loadIntegrations])

  async function handleConnect(provider: string, apiKey: string) {
    await fetch("/api/integrations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider, api_key: apiKey }),
    })
    setConnectedProviders((prev) => new Set([...prev, provider]))
  }

  async function handleDisconnect(provider: string) {
    await fetch("/api/integrations", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider }),
    })
    setConnectedProviders((prev) => {
      const next = new Set(prev)
      next.delete(provider)
      return next
    })
  }

  const maxCost = usage ? Math.max(...Object.values(usage.byAgent).map((a) => a.cost_usd), 0.001) : 0.001
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

      {/* Overview Tab */}
      {tab === "overview" && (
        <div className="space-y-6">
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

      {/* Integrations Tab */}
      {tab === "integrations" && (
        <div className="space-y-6">
          <div className="bg-yellow-900/20 border border-yellow-700/40 rounded-xl px-4 py-3 text-xs text-yellow-300">
            <strong>OAuth integrations</strong> (Google, Clio, DocuSign, HubSpot, QuickBooks) require a full OAuth 2.0 flow that is not yet implemented.
            API key integrations (LawPay, Stripe, Notion, Calendly) are active now — click <strong>Add Key</strong> to connect them.
          </div>

          {[1, 2, 3].map((tier) => (
            <div key={tier}>
              <div className="flex items-center gap-2 mb-3">
                <span className={cn(
                  "px-2 py-0.5 text-xs font-medium rounded-full",
                  tier === 1 ? "bg-blue-600/20 text-blue-400" : tier === 2 ? "bg-yellow-600/20 text-yellow-400" : "bg-gray-600/20 text-gray-400"
                )}>
                  Tier {tier}
                </span>
                <span className="text-xs text-gray-500">
                  {tier === 1 ? "High-impact" : tier === 2 ? "Build soon" : "Coming later"}
                </span>
              </div>
              <div className="grid grid-cols-1 gap-3">
                {INTEGRATIONS.filter((i) => i.tier === tier).map((integration) => (
                  <IntegrationCard
                    key={integration.id}
                    integration={integration}
                    connected={connectedProviders.has(integration.id)}
                    onConnect={handleConnect}
                    onDisconnect={handleDisconnect}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* API Keys Tab */}
      {tab === "api-keys" && (
        <div className="bg-gray-800/60 border border-gray-700/50 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-white mb-1">API Key Health Check</h2>
          <p className="text-xs text-gray-500 mb-4">
            Set these in your Vercel environment variables. Agents will fail silently if keys are missing.
          </p>
          <ApiKeyCheck name="Anthropic (Claude agents)" envKey="ANTHROPIC_API_KEY" statuses={healthStatuses} />
          <ApiKeyCheck name="OpenAI (GPT-4o + embeddings)" envKey="OPENAI_API_KEY" statuses={healthStatuses} />
          <ApiKeyCheck name="Google AI (Gemini/Intake)" envKey="GOOGLE_AI_API_KEY" statuses={healthStatuses} />
          <ApiKeyCheck name="Supabase URL" envKey="NEXT_PUBLIC_SUPABASE_URL" statuses={healthStatuses} />
          <ApiKeyCheck name="Supabase Anon Key" envKey="NEXT_PUBLIC_SUPABASE_ANON_KEY" statuses={healthStatuses} />
          <ApiKeyCheck name="Supabase Service Role" envKey="SUPABASE_SERVICE_ROLE_KEY" statuses={healthStatuses} />
          <ApiKeyCheck name="Telegram Bot Token" envKey="TELEGRAM_BOT_TOKEN" statuses={healthStatuses} />
          <ApiKeyCheck name="Resend (Email)" envKey="RESEND_API_KEY" statuses={healthStatuses} />
          {healthStatuses !== null && Object.values(healthStatuses).some((v) => !v) && (
            <div className="mt-4 p-3 bg-red-900/20 border border-red-700/40 rounded-lg text-xs text-red-300">
              Missing keys will cause agent failures. Add them in your Vercel project under Settings → Environment Variables, then redeploy.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
