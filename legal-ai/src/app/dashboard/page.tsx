import Link from "next/link"
import {
  Scale,
  Search,
  UserPlus,
  FileText,
  DollarSign,
  Megaphone,
  Calendar,
  ShieldAlert,
  ArrowRight,
  Settings,
} from "lucide-react"

const AGENTS = [
  {
    id: "contract",
    name: "Contract Agent",
    description: "Draft, review, and redline contracts — NDAs, retainers, agreements",
    icon: Scale,
    model: "Claude Opus",
    color: "purple",
  },
  {
    id: "research",
    name: "Research Agent",
    description: "Case law, statutes, IRAC memos, jurisdiction-specific analysis",
    icon: Search,
    model: "GPT-4o",
    color: "green",
  },
  {
    id: "intake",
    name: "Intake Agent",
    description: "Client onboarding, intake questionnaires, status emails",
    icon: UserPlus,
    model: "Gemini Flash",
    color: "blue",
  },
  {
    id: "document-gen",
    name: "Document Gen",
    description: "Pleadings, motions, demand letters, court filings",
    icon: FileText,
    model: "Claude Haiku",
    color: "purple",
  },
  {
    id: "billing",
    name: "Billing Agent",
    description: "Time entries, invoice generation, payment follow-ups",
    icon: DollarSign,
    model: "Claude Haiku",
    color: "purple",
  },
  {
    id: "marketing",
    name: "Marketing Agent",
    description: "LinkedIn posts, newsletters, blog content, referral outreach",
    icon: Megaphone,
    model: "Claude Sonnet",
    color: "purple",
  },
  {
    id: "docket",
    name: "Docket Agent",
    description: "Statute of limitations, court deadlines, filing windows",
    icon: Calendar,
    model: "Claude Haiku",
    color: "purple",
  },
  {
    id: "conflicts",
    name: "Conflicts Agent",
    description: "New client conflict of interest screening",
    icon: ShieldAlert,
    model: "Claude Haiku",
    color: "purple",
  },
]

const MODEL_COLORS: Record<string, string> = {
  purple: "bg-purple-900/30 text-purple-300 border border-purple-800/40",
  green: "bg-green-900/30 text-green-300 border border-green-800/40",
  blue: "bg-blue-900/30 text-blue-300 border border-blue-800/40",
}

export default function DashboardPage() {
  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">LexOS Dashboard</h1>
        <p className="text-gray-400 text-sm mt-1">Your AI-powered law firm platform</p>
      </div>

      {/* Agent Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {AGENTS.map((agent) => (
          <div
            key={agent.id}
            className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4 hover:border-gray-600 transition-colors"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 bg-gray-700 rounded-lg flex items-center justify-center shrink-0">
                  <agent.icon className="w-4.5 h-4.5 text-gray-300" size={18} />
                </div>
                <div>
                  <h3 className="text-white font-semibold text-sm leading-tight">{agent.name}</h3>
                  <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium mt-0.5 ${MODEL_COLORS[agent.color]}`}>
                    {agent.model}
                  </span>
                </div>
              </div>
            </div>

            <p className="text-gray-400 text-xs leading-relaxed mb-4">{agent.description}</p>

            <div className="flex items-center gap-2">
              <Link
                href={`/dashboard/agents/${agent.id}`}
                className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-lg transition-colors"
              >
                Open
                <ArrowRight className="w-3 h-3" />
              </Link>
              <Link
                href={`/dashboard/agents/${agent.id}/settings`}
                className="flex items-center justify-center w-8 h-8 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors"
              >
                <Settings className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8">
        {[
          { label: "Active Matters", value: "—", href: "/dashboard/matters" },
          { label: "Open Tasks", value: "—", href: "/dashboard/tasks" },
          { label: "Unbilled Hours", value: "—", href: "/dashboard/billing" },
          { label: "Documents", value: "—", href: "/dashboard/documents" },
        ].map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4 hover:border-gray-600 transition-colors"
          >
            <p className="text-2xl font-bold text-white">{stat.value}</p>
            <p className="text-gray-400 text-xs mt-1">{stat.label}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
