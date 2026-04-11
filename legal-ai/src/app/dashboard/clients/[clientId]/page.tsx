"use client"

import { useState, useEffect, useCallback } from "react"
import { ArrowLeft, Mail, Phone, Building2, Edit3, Save, X, Plus, Briefcase, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { useRouter } from "next/navigation"
import type { Client, Matter } from "@/types/database"

const STATUS_COLORS: Record<Client["status"], string> = {
  active: "bg-green-500/15 text-green-400 border-green-500/30",
  inactive: "bg-gray-500/15 text-gray-400 border-gray-500/30",
  prospect: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
}

const MATTER_STATUS_COLORS: Record<Matter["status"], string> = {
  open: "bg-blue-500/15 text-blue-400",
  closed: "bg-gray-500/15 text-gray-400",
  on_hold: "bg-yellow-500/15 text-yellow-400",
}

function NewMatterModal({ clientId, onClose, onCreated }: {
  clientId: string
  onClose: () => void
  onCreated: (matter: Matter) => void
}) {
  const [form, setForm] = useState({
    title: "", description: "", practice_area: "",
    billing_type: "hourly" as Matter["billing_type"],
    hourly_rate: "", flat_fee: "",
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim()) { setError("Title is required"); return }
    setSaving(true)
    const res = await fetch("/api/matters", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: clientId,
        ...form,
        hourly_rate: form.hourly_rate ? parseFloat(form.hourly_rate) : null,
        flat_fee: form.flat_fee ? parseFloat(form.flat_fee) : null,
      }),
    })
    if (res.ok) {
      const data = await res.json()
      onCreated(data.matter)
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
            <label className="text-xs font-medium text-gray-400 mb-1 block">Matter Title *</label>
            <input
              value={form.title}
              onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              placeholder="e.g., Smith v. Jones — Breach of Contract"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-400 mb-1 block">Practice Area</label>
            <input
              value={form.practice_area}
              onChange={(e) => setForm((p) => ({ ...p, practice_area: e.target.value }))}
              placeholder="Corporate, Litigation, Real Estate…"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-400 mb-1 block">Billing Type</label>
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
            {form.billing_type === "hourly" ? (
              <div>
                <label className="text-xs font-medium text-gray-400 mb-1 block">Hourly Rate ($)</label>
                <input
                  type="number"
                  value={form.hourly_rate}
                  onChange={(e) => setForm((p) => ({ ...p, hourly_rate: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            ) : form.billing_type === "flat" ? (
              <div>
                <label className="text-xs font-medium text-gray-400 mb-1 block">Flat Fee ($)</label>
                <input
                  type="number"
                  value={form.flat_fee}
                  onChange={(e) => setForm((p) => ({ ...p, flat_fee: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            ) : <div />}
          </div>
          <div>
            <label className="text-xs font-medium text-gray-400 mb-1 block">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              rows={2}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
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

export default function ClientProfilePage({ params }: { params: Promise<{ clientId: string }> }) {
  const [clientId, setClientId] = useState<string | null>(null)
  const [client, setClient] = useState<Client | null>(null)
  const [matters, setMatters] = useState<Matter[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState<Partial<Client>>({})
  const [saving, setSaving] = useState(false)
  const [showNewMatter, setShowNewMatter] = useState(false)
  const router = useRouter()

  useEffect(() => {
    params.then(({ clientId: id }) => setClientId(id))
  }, [params])

  const fetchData = useCallback(async (id: string) => {
    setLoading(true)
    const [clientRes, mattersRes] = await Promise.all([
      fetch(`/api/clients/${id}`),
      fetch(`/api/matters?client_id=${id}`),
    ])
    if (clientRes.ok) {
      const data = await clientRes.json()
      setClient(data.client)
      setEditForm(data.client)
    }
    if (mattersRes.ok) {
      const data = await mattersRes.json()
      setMatters(data.matters ?? [])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    if (clientId) fetchData(clientId)
  }, [clientId, fetchData])

  async function saveEdit() {
    if (!clientId) return
    setSaving(true)
    const res = await fetch(`/api/clients/${clientId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    })
    if (res.ok) {
      const data = await res.json()
      setClient(data.client)
      setEditing(false)
    }
    setSaving(false)
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="w-6 h-6 text-gray-500 animate-spin" />
      </div>
    )
  }

  if (!client) {
    return (
      <div className="p-6 text-center text-gray-400">
        Client not found. <Link href="/dashboard/clients" className="text-blue-400 underline">Back to clients</Link>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {showNewMatter && clientId && (
        <NewMatterModal
          clientId={clientId}
          onClose={() => setShowNewMatter(false)}
          onCreated={(m) => setMatters((prev) => [m, ...prev])}
        />
      )}

      {/* Back */}
      <Link href="/dashboard/clients" className="inline-flex items-center gap-2 text-gray-400 hover:text-gray-200 text-sm mb-5 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Clients
      </Link>

      {/* Client header */}
      <div className="bg-gray-800/60 border border-gray-700/50 rounded-2xl p-5 mb-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-14 h-14 bg-blue-600/20 rounded-2xl shrink-0">
              <span className="text-blue-400 font-bold text-2xl">
                {client.full_name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              {editing ? (
                <input
                  value={editForm.full_name ?? ""}
                  onChange={(e) => setEditForm((p) => ({ ...p, full_name: e.target.value }))}
                  className="text-xl font-bold text-white bg-gray-700 border border-gray-600 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
                />
              ) : (
                <h1 className="text-xl font-bold text-white">{client.full_name}</h1>
              )}
              <span className={cn("inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-medium border", STATUS_COLORS[client.status])}>
                {client.status}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {editing ? (
              <>
                <button
                  onClick={saveEdit}
                  disabled={saving}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-xs font-medium rounded-lg"
                >
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  Save
                </button>
                <button onClick={() => setEditing(false)} className="p-1.5 text-gray-500 hover:text-gray-300">
                  <X className="w-4 h-4" />
                </button>
              </>
            ) : (
              <button
                onClick={() => setEditing(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs font-medium rounded-lg"
              >
                <Edit3 className="w-3.5 h-3.5" /> Edit
              </button>
            )}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { icon: Mail, label: "Email", field: "email" as const },
            { icon: Phone, label: "Phone", field: "phone" as const },
            { icon: Building2, label: "Company", field: "company" as const },
          ].map(({ icon: Icon, label, field }) => (
            <div key={field} className="flex items-center gap-2">
              <Icon className="w-4 h-4 text-gray-500 shrink-0" />
              {editing ? (
                <input
                  value={(editForm[field] ?? "") as string}
                  onChange={(e) => setEditForm((p) => ({ ...p, [field]: e.target.value || null }))}
                  placeholder={label}
                  className="flex-1 text-sm text-gray-300 bg-gray-700 border border-gray-600 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              ) : (
                <span className="text-sm text-gray-300">{(client[field] as string | null) ?? <span className="text-gray-600">—</span>}</span>
              )}
            </div>
          ))}
          <div className="flex items-center gap-2">
            {editing ? (
              <select
                value={editForm.status ?? client.status}
                onChange={(e) => setEditForm((p) => ({ ...p, status: e.target.value as Client["status"] }))}
                className="flex-1 text-sm text-gray-300 bg-gray-700 border border-gray-600 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="prospect">Prospect</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            ) : null}
          </div>
        </div>

        {(editing ? editForm.notes !== undefined : client.notes) && (
          <div className="mt-3">
            {editing ? (
              <textarea
                value={editForm.notes ?? ""}
                onChange={(e) => setEditForm((p) => ({ ...p, notes: e.target.value || null }))}
                placeholder="Notes…"
                rows={2}
                className="w-full text-sm text-gray-300 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
              />
            ) : (
              <p className="text-sm text-gray-400">{client.notes}</p>
            )}
          </div>
        )}
        {editing && !editForm.notes && (
          <textarea
            value={editForm.notes ?? ""}
            onChange={(e) => setEditForm((p) => ({ ...p, notes: e.target.value || null }))}
            placeholder="Add notes…"
            rows={2}
            className="mt-3 w-full text-sm text-gray-300 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
          />
        )}
      </div>

      {/* Matters */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-white">Matters ({matters.length})</h2>
          <button
            onClick={() => setShowNewMatter(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-lg transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> New Matter
          </button>
        </div>

        {matters.length === 0 ? (
          <div className="text-center py-8 text-gray-500 text-sm">
            No matters yet for this client.
          </div>
        ) : (
          <div className="space-y-2">
            {matters.map((matter) => (
              <Link
                key={matter.id}
                href={`/dashboard/matters`}
                className="flex items-center gap-4 px-4 py-3.5 bg-gray-800/60 border border-gray-700/50 rounded-xl hover:border-gray-600 transition-colors"
              >
                <Briefcase className="w-5 h-5 text-gray-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{matter.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {matter.practice_area && (
                      <span className="text-xs text-gray-500">{matter.practice_area}</span>
                    )}
                    <span className="text-xs text-gray-600">·</span>
                    <span className="text-xs text-gray-500 capitalize">{matter.billing_type}</span>
                    {matter.hourly_rate && (
                      <span className="text-xs text-gray-500">${matter.hourly_rate}/hr</span>
                    )}
                    {matter.flat_fee && (
                      <span className="text-xs text-gray-500">${matter.flat_fee.toLocaleString()}</span>
                    )}
                  </div>
                </div>
                <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", MATTER_STATUS_COLORS[matter.status])}>
                  {matter.status}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
