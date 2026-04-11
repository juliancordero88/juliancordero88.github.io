"use client"

import { useState, useEffect, useCallback } from "react"
import { Briefcase, Plus, Loader2, X } from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"
import type { Matter, Client } from "@/types/database"

type MatterWithClient = Matter & { clients: Pick<Client, "full_name" | "email"> | null }

const STATUS_COLORS: Record<Matter["status"], string> = {
  open: "bg-blue-500/15 text-blue-400",
  closed: "bg-gray-500/15 text-gray-400",
  on_hold: "bg-yellow-500/15 text-yellow-400",
}

const STATUS_TABS = [
  { label: "All", value: "" },
  { label: "Open", value: "open" },
  { label: "On Hold", value: "on_hold" },
  { label: "Closed", value: "closed" },
]

function NewMatterModal({ onClose, onCreated }: {
  onClose: () => void
  onCreated: (matter: MatterWithClient) => void
}) {
  const [clients, setClients] = useState<Client[]>([])
  const [form, setForm] = useState({
    client_id: "", title: "", practice_area: "",
    billing_type: "hourly" as Matter["billing_type"],
    hourly_rate: "", flat_fee: "", description: "",
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/clients").then((r) => r.json()).then((d) => setClients(d.clients ?? []))
  }, [])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.client_id) { setError("Select a client"); return }
    if (!form.title.trim()) { setError("Title is required"); return }
    setSaving(true)
    const res = await fetch("/api/matters", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        hourly_rate: form.hourly_rate ? parseFloat(form.hourly_rate) : null,
        flat_fee: form.flat_fee ? parseFloat(form.flat_fee) : null,
      }),
    })
    if (res.ok) {
      const data = await res.json()
      const client = clients.find((c) => c.id === form.client_id)
      onCreated({ ...data.matter, clients: client ? { full_name: client.full_name, email: client.email } : null })
      onClose()
    } else {
      const data = await res.json()
      setError(data.error ?? "Failed")
    }
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <h2 className="text-lg font-semibold text-white">New Matter</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={submit} className="px-6 py-4 space-y-3">
          {error && <p className="text-sm text-red-400 bg-red-500/15 rounded-lg px-3 py-2">{error}</p>}
          <div>
            <label className="text-xs font-medium text-gray-400 mb-1 block">Client *</label>
            <select
              value={form.client_id}
              onChange={(e) => setForm((p) => ({ ...p, client_id: e.target.value }))}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select client…</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.full_name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-400 mb-1 block">Matter Title *</label>
            <input
              value={form.title}
              onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              placeholder="e.g., Smith Estate — Real Property Transfer"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-400 mb-1 block">Practice Area</label>
              <input
                value={form.practice_area}
                onChange={(e) => setForm((p) => ({ ...p, practice_area: e.target.value }))}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-400 mb-1 block">Billing</label>
              <select
                value={form.billing_type}
                onChange={(e) => setForm((p) => ({ ...p, billing_type: e.target.value as Matter["billing_type"] }))}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="hourly">Hourly</option>
                <option value="flat">Flat Fee</option>
                <option value="contingency">Contingency</option>
              </select>
            </div>
          </div>
          {form.billing_type === "hourly" && (
            <div>
              <label className="text-xs font-medium text-gray-400 mb-1 block">Hourly Rate ($)</label>
              <input
                type="number"
                value={form.hourly_rate}
                onChange={(e) => setForm((p) => ({ ...p, hourly_rate: e.target.value }))}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}
          {form.billing_type === "flat" && (
            <div>
              <label className="text-xs font-medium text-gray-400 mb-1 block">Flat Fee ($)</label>
              <input
                type="number"
                value={form.flat_fee}
                onChange={(e) => setForm((p) => ({ ...p, flat_fee: e.target.value }))}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-400 hover:text-gray-200">Cancel</button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-sm font-medium rounded-lg"
            >
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Create Matter
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function MattersPage() {
  const [matters, setMatters] = useState<MatterWithClient[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState("")
  const [showNew, setShowNew] = useState(false)

  const fetchMatters = useCallback(async () => {
    setLoading(true)
    const params = statusFilter ? `?status=${statusFilter}` : ""
    const res = await fetch(`/api/matters${params}`)
    if (res.ok) {
      const data = await res.json()
      setMatters(data.matters ?? [])
    }
    setLoading(false)
  }, [statusFilter])

  useEffect(() => { fetchMatters() }, [fetchMatters])

  async function updateStatus(id: string, status: Matter["status"]) {
    await fetch(`/api/matters/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    })
    setMatters((prev) => prev.map((m) => m.id === id ? { ...m, status } : m))
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {showNew && (
        <NewMatterModal
          onClose={() => setShowNew(false)}
          onCreated={(m) => setMatters((prev) => [m, ...prev])}
        />
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Matters</h1>
          <p className="text-gray-400 text-sm mt-0.5">{matters.length} matter{matters.length !== 1 ? "s" : ""}</p>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" /> New Matter
        </button>
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 mb-5 bg-gray-800/60 rounded-lg p-1 w-fit">
        {STATUS_TABS.map(({ label, value }) => (
          <button
            key={value}
            onClick={() => setStatusFilter(value)}
            className={cn(
              "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
              statusFilter === value ? "bg-gray-700 text-white" : "text-gray-400 hover:text-gray-200"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 text-gray-500 animate-spin" />
        </div>
      ) : matters.length === 0 ? (
        <div className="text-center py-12">
          <Briefcase className="w-10 h-10 text-gray-700 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">No matters found.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {matters.map((matter) => (
            <div
              key={matter.id}
              className="flex items-center gap-4 px-4 py-3.5 bg-gray-800/60 border border-gray-700/50 rounded-xl hover:border-gray-600 transition-colors"
            >
              <div className="flex items-center justify-center w-9 h-9 bg-gray-700 rounded-lg shrink-0">
                <Briefcase className="w-4 h-4 text-gray-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{matter.title}</p>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  {matter.clients && (
                    <Link
                      href={`/dashboard/clients/${matter.client_id}`}
                      className="text-xs text-blue-400 hover:underline"
                    >
                      {matter.clients.full_name}
                    </Link>
                  )}
                  {matter.practice_area && (
                    <>
                      <span className="text-gray-700">·</span>
                      <span className="text-xs text-gray-500">{matter.practice_area}</span>
                    </>
                  )}
                  <span className="text-gray-700">·</span>
                  <span className="text-xs text-gray-500 capitalize">{matter.billing_type}</span>
                  {matter.hourly_rate && (
                    <span className="text-xs text-gray-400">${matter.hourly_rate}/hr</span>
                  )}
                  {matter.flat_fee && (
                    <span className="text-xs text-gray-400">${matter.flat_fee.toLocaleString()}</span>
                  )}
                </div>
              </div>
              <select
                value={matter.status}
                onChange={(e) => updateStatus(matter.id, e.target.value as Matter["status"])}
                className={cn(
                  "px-2.5 py-1 rounded-full text-xs font-medium border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500",
                  STATUS_COLORS[matter.status]
                )}
              >
                <option value="open">Open</option>
                <option value="on_hold">On Hold</option>
                <option value="closed">Closed</option>
              </select>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
