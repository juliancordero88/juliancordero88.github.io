"use client"

import { useState, useEffect, useCallback } from "react"
import { Plus, Users, Search, ChevronRight, Loader2, X, Phone, Mail, Building2 } from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"
import type { Client } from "@/types/database"

const PRACTICE_AREAS = [
  "Corporate", "Litigation", "Real Estate", "Family", "Criminal",
  "Employment", "Immigration", "Intellectual Property", "Estate Planning", "Other",
]

const STATUS_COLORS: Record<Client["status"], string> = {
  active: "bg-green-500/15 text-green-400",
  inactive: "bg-gray-500/15 text-gray-400",
  prospect: "bg-yellow-500/15 text-yellow-400",
}

function ClientCard({ client }: { client: Client }) {
  return (
    <Link
      href={`/dashboard/clients/${client.id}`}
      className="flex items-center gap-4 px-4 py-3.5 bg-gray-800/60 border border-gray-700/50 rounded-xl hover:border-gray-600 hover:bg-gray-800 transition-colors group"
    >
      <div className="flex items-center justify-center w-10 h-10 bg-blue-600/20 rounded-xl shrink-0">
        <span className="text-blue-400 font-bold text-sm">
          {client.full_name.charAt(0).toUpperCase()}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-white truncate">{client.full_name}</p>
          <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", STATUS_COLORS[client.status])}>
            {client.status}
          </span>
        </div>
        <div className="flex items-center gap-3 mt-0.5">
          {client.company && (
            <span className="flex items-center gap-1 text-xs text-gray-500">
              <Building2 className="w-3 h-3" /> {client.company}
            </span>
          )}
          {client.email && (
            <span className="flex items-center gap-1 text-xs text-gray-500 truncate">
              <Mail className="w-3 h-3" /> {client.email}
            </span>
          )}
          {client.phone && (
            <span className="flex items-center gap-1 text-xs text-gray-500">
              <Phone className="w-3 h-3" /> {client.phone}
            </span>
          )}
        </div>
        {client.practice_area && (
          <p className="text-xs text-gray-600 mt-0.5">{client.practice_area}</p>
        )}
      </div>
      <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-gray-400 shrink-0 transition-colors" />
    </Link>
  )
}

function NewClientModal({ onClose, onCreated }: {
  onClose: () => void
  onCreated: (client: Client) => void
}) {
  const [form, setForm] = useState({
    full_name: "", email: "", phone: "", company: "",
    practice_area: "", status: "prospect" as Client["status"],
    source: "", notes: "",
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.full_name.trim()) { setError("Name is required"); return }
    setSaving(true)
    const res = await fetch("/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
    if (res.ok) {
      const data = await res.json()
      onCreated(data.client)
      onClose()
    } else {
      const data = await res.json()
      setError(data.error ?? "Failed to create client")
    }
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <h2 className="text-lg font-semibold text-white">New Client</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={submit} className="px-6 py-4 space-y-3">
          {error && (
            <p className="text-sm text-red-400 bg-red-500/15 rounded-lg px-3 py-2">{error}</p>
          )}
          <div>
            <label className="text-xs font-medium text-gray-400 mb-1 block">Full Name *</label>
            <input
              value={form.full_name}
              onChange={(e) => setForm((p) => ({ ...p, full_name: e.target.value }))}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-400 mb-1 block">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-400 mb-1 block">Phone</label>
              <input
                value={form.phone}
                onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-400 mb-1 block">Company</label>
            <input
              value={form.company}
              onChange={(e) => setForm((p) => ({ ...p, company: e.target.value }))}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-400 mb-1 block">Practice Area</label>
              <select
                value={form.practice_area}
                onChange={(e) => setForm((p) => ({ ...p, practice_area: e.target.value }))}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select…</option>
                {PRACTICE_AREAS.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-400 mb-1 block">Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm((p) => ({ ...p, status: e.target.value as Client["status"] }))}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="prospect">Prospect</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-400 mb-1 block">Source (how they found you)</label>
            <input
              value={form.source}
              onChange={(e) => setForm((p) => ({ ...p, source: e.target.value }))}
              placeholder="Referral, Google, LinkedIn…"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-400 mb-1 block">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
              rows={2}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-400 hover:text-gray-200 transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Create Client
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [showNewModal, setShowNewModal] = useState(false)

  const fetchClients = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (statusFilter) params.set("status", statusFilter)
    if (search) params.set("search", search)
    const res = await fetch(`/api/clients?${params}`)
    if (res.ok) {
      const data = await res.json()
      setClients(data.clients ?? [])
    }
    setLoading(false)
  }, [search, statusFilter])

  useEffect(() => { fetchClients() }, [fetchClients])

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {showNewModal && (
        <NewClientModal
          onClose={() => setShowNewModal(false)}
          onCreated={(c) => setClients((prev) => [c, ...prev])}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Clients</h1>
          <p className="text-gray-400 text-sm mt-0.5">
            {clients.length} client{clients.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={() => setShowNewModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" /> New Client
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search clients…"
            className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="prospect">Prospect</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {/* Client list */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 text-gray-500 animate-spin" />
        </div>
      ) : clients.length === 0 ? (
        <div className="text-center py-12">
          <Users className="w-10 h-10 text-gray-700 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">No clients yet.</p>
          <button
            onClick={() => setShowNewModal(true)}
            className="mt-3 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Add your first client
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {clients.map((client) => (
            <ClientCard key={client.id} client={client} />
          ))}
        </div>
      )}
    </div>
  )
}
