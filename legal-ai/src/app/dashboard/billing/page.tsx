"use client"

import { useState, useEffect, useCallback } from "react"
import { DollarSign, Plus, Loader2, X, FileText, Clock, CheckCircle2, AlertCircle, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"
import type { TimeEntry, Invoice, Matter, Client } from "@/types/database"

type TimeEntryWithMatter = TimeEntry & {
  matters: (Pick<Matter, "title"> & { clients: Pick<Client, "full_name"> | null }) | null
}
type InvoiceWithClient = Invoice & { clients: Pick<Client, "full_name"> | null; matters: Pick<Matter, "title"> | null }

const INVOICE_STATUS_COLORS: Record<Invoice["status"], string> = {
  draft: "bg-gray-500/15 text-gray-400",
  sent: "bg-blue-500/15 text-blue-400",
  paid: "bg-green-500/15 text-green-400",
  overdue: "bg-red-500/15 text-red-400",
}

const INVOICE_STATUS_ICONS: Record<Invoice["status"], React.ReactNode> = {
  draft: <FileText className="w-3 h-3" />,
  sent: <Clock className="w-3 h-3" />,
  paid: <CheckCircle2 className="w-3 h-3" />,
  overdue: <AlertCircle className="w-3 h-3" />,
}

function NewEntryModal({ onClose, onCreated }: {
  onClose: () => void
  onCreated: (entry: TimeEntryWithMatter) => void
}) {
  const [matters, setMatters] = useState<(Matter & { clients: { full_name: string } | null })[]>([])
  const [form, setForm] = useState({ matter_id: "", description: "", hours: "", rate: "", date: new Date().toISOString().slice(0, 10) })
  const [drafting, setDrafting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/matters?status=open")
      .then((r) => r.json())
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then((d) => setMatters(d.matters ?? []))
  }, [])

  async function draftDescription() {
    if (!form.matter_id) return
    const matter = matters.find((m) => m.id === form.matter_id)
    if (!matter) return
    setDrafting(true)
    const res = await fetch("/api/agents/billing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{ role: "user", content: `Draft a professional time entry description for this work on matter: "${matter.title}". Keep it specific and billing-appropriate (1-2 sentences). Start with an action verb.` }],
      }),
    })
    if (res.ok && res.body) {
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let text = ""
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        text += decoder.decode(value, { stream: true })
      }
      setForm((p) => ({ ...p, description: text.trim() }))
    }
    setDrafting(false)
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.matter_id || !form.description || !form.hours || !form.rate) {
      setError("All fields required")
      return
    }
    setSaving(true)
    const res = await fetch("/api/billing/time-entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
    if (res.ok) {
      const data = await res.json()
      const matter = matters.find((m) => m.id === form.matter_id)
      onCreated({ ...data.entry, matters: matter ? { title: matter.title, clients: matter.clients } : null })
      onClose()
    } else {
      const data = await res.json()
      setError(data.error ?? "Failed")
    }
    setSaving(false)
  }

  const selectedMatter = matters.find((m) => m.id === form.matter_id)
  const amount = form.hours && form.rate ? (parseFloat(form.hours) * parseFloat(form.rate)).toFixed(2) : "—"

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <h2 className="text-lg font-semibold text-white">Log Time Entry</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={submit} className="px-6 py-4 space-y-3">
          {error && <p className="text-sm text-red-400 bg-red-500/15 rounded-lg px-3 py-2">{error}</p>}
          <div>
            <label className="text-xs font-medium text-gray-400 mb-1 block">Matter *</label>
            <select
              value={form.matter_id}
              onChange={(e) => {
                const m = matters.find((m) => m.id === e.target.value)
                setForm((p) => ({ ...p, matter_id: e.target.value, rate: m?.hourly_rate?.toString() ?? p.rate }))
              }}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select matter…</option>
              {matters.map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}
            </select>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-gray-400">Description *</label>
              <button
                type="button"
                onClick={draftDescription}
                disabled={drafting || !form.matter_id}
                className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 disabled:opacity-40 transition-colors"
              >
                {drafting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                AI Draft
              </button>
            </div>
            <textarea
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              rows={3}
              placeholder="e.g., Reviewed and revised employment agreement, conferring with client regarding revisions…"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-400 mb-1 block">Hours *</label>
              <input
                type="number"
                step="0.25"
                min="0"
                value={form.hours}
                onChange={(e) => setForm((p) => ({ ...p, hours: e.target.value }))}
                placeholder="0.0"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-400 mb-1 block">Rate ($/hr) *</label>
              <input
                type="number"
                value={form.rate}
                onChange={(e) => setForm((p) => ({ ...p, rate: e.target.value }))}
                placeholder="350"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-400 mb-1 block">Amount</label>
              <div className="w-full bg-gray-700/50 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-300">
                ${amount}
              </div>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-400 mb-1 block">Date</label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-400 hover:text-gray-200">Cancel</button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-sm font-medium rounded-lg"
            >
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Log Entry
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function BillingPage() {
  const [tab, setTab] = useState<"entries" | "invoices">("entries")
  const [entries, setEntries] = useState<TimeEntryWithMatter[]>([])
  const [invoices, setInvoices] = useState<InvoiceWithClient[]>([])
  const [loading, setLoading] = useState(true)
  const [showNewEntry, setShowNewEntry] = useState(false)
  const [selectedEntryIds, setSelectedEntryIds] = useState<Set<string>>(new Set())
  const [generatingInvoice, setGeneratingInvoice] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const [entriesRes, invoicesRes] = await Promise.all([
      fetch("/api/billing/time-entries"),
      fetch("/api/billing/invoices"),
    ])
    if (entriesRes.ok) {
      const data = await entriesRes.json()
      setEntries(data.entries ?? [])
    }
    if (invoicesRes.ok) {
      const data = await invoicesRes.json()
      setInvoices(data.invoices ?? [])
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  function toggleEntry(id: string) {
    setSelectedEntryIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function generateInvoice() {
    if (selectedEntryIds.size === 0) return
    setGeneratingInvoice(true)

    // Get client_id from first selected entry
    const firstEntry = entries.find((e) => selectedEntryIds.has(e.id))
    if (!firstEntry) { setGeneratingInvoice(false); return }

    // Get the matter to find client
    const matterRes = await fetch(`/api/matters/${firstEntry.matter_id}`)
    if (!matterRes.ok) { setGeneratingInvoice(false); return }
    const { matter } = await matterRes.json()

    const res = await fetch("/api/billing/invoices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: matter.client_id,
        matter_id: firstEntry.matter_id,
        entry_ids: Array.from(selectedEntryIds),
      }),
    })

    if (res.ok) {
      setSelectedEntryIds(new Set())
      fetchData()
      setTab("invoices")
    }
    setGeneratingInvoice(false)
  }

  async function updateInvoiceStatus(id: string, status: Invoice["status"]) {
    await fetch(`/api/billing/invoices/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    })
    setInvoices((prev) => prev.map((inv) => inv.id === id ? { ...inv, status } : inv))
  }

  const unbilledEntries = entries.filter((e) => !e.billed)
  const billedEntries = entries.filter((e) => e.billed)
  const totalUnbilled = unbilledEntries.reduce((sum, e) => sum + e.amount, 0)
  const totalBilled = invoices.reduce((sum, inv) => sum + inv.total, 0)

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {showNewEntry && (
        <NewEntryModal
          onClose={() => setShowNewEntry(false)}
          onCreated={(e) => setEntries((prev) => [e, ...prev])}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Billing</h1>
          <p className="text-gray-400 text-sm mt-0.5">Time entries, invoices, and payment tracking</p>
        </div>
        <button
          onClick={() => setShowNewEntry(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" /> Log Time
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: "Unbilled", value: `$${totalUnbilled.toLocaleString("en-US", { minimumFractionDigits: 2 })}`, color: "text-yellow-400" },
          { label: "Total Invoiced", value: `$${totalBilled.toLocaleString("en-US", { minimumFractionDigits: 2 })}`, color: "text-blue-400" },
          {
            label: "Collected",
            value: `$${invoices.filter((i) => i.status === "paid").reduce((s, i) => s + i.total, 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
            color: "text-green-400"
          },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-gray-800/60 border border-gray-700/50 rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-1">{label}</p>
            <p className={cn("text-xl font-bold", color)}>{value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-gray-800/60 rounded-lg p-1 w-fit">
        {[
          { label: `Time Entries (${unbilledEntries.length} unbilled)`, value: "entries" },
          { label: `Invoices (${invoices.length})`, value: "invoices" },
        ].map(({ label, value }) => (
          <button
            key={value}
            onClick={() => setTab(value as "entries" | "invoices")}
            className={cn(
              "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
              tab === value ? "bg-gray-700 text-white" : "text-gray-400 hover:text-gray-200"
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
      ) : tab === "entries" ? (
        <div>
          {/* Generate invoice button */}
          {selectedEntryIds.size > 0 && (
            <div className="flex items-center justify-between px-4 py-3 bg-blue-600/15 border border-blue-500/30 rounded-xl mb-4">
              <p className="text-sm text-blue-300">
                {selectedEntryIds.size} entr{selectedEntryIds.size !== 1 ? "ies" : "y"} selected · $
                {entries.filter((e) => selectedEntryIds.has(e.id)).reduce((s, e) => s + e.amount, 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </p>
              <button
                onClick={generateInvoice}
                disabled={generatingInvoice}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-xs font-medium rounded-lg"
              >
                {generatingInvoice && <Loader2 className="w-3 h-3 animate-spin" />}
                Generate Invoice
              </button>
            </div>
          )}

          {entries.length === 0 ? (
            <div className="text-center py-12">
              <Clock className="w-10 h-10 text-gray-700 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">No time entries yet.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {/* Unbilled first */}
              {unbilledEntries.length > 0 && (
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider px-1 mb-2">
                  Unbilled — ${totalUnbilled.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </p>
              )}
              {unbilledEntries.map((entry) => (
                <div
                  key={entry.id}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3.5 border rounded-xl transition-colors cursor-pointer",
                    selectedEntryIds.has(entry.id)
                      ? "bg-blue-600/10 border-blue-500/40"
                      : "bg-gray-800/60 border-gray-700/50 hover:border-gray-600"
                  )}
                  onClick={() => toggleEntry(entry.id)}
                >
                  <input
                    type="checkbox"
                    checked={selectedEntryIds.has(entry.id)}
                    onChange={() => toggleEntry(entry.id)}
                    onClick={(e) => e.stopPropagation()}
                    className="w-4 h-4 rounded border-gray-600 text-blue-600 focus:ring-blue-500 bg-gray-700"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{entry.description}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {entry.matters && <span className="text-xs text-gray-500">{entry.matters.title}</span>}
                      <span className="text-gray-700">·</span>
                      <span className="text-xs text-gray-500">{new Date(entry.date).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-medium text-white">${entry.amount.toFixed(2)}</p>
                    <p className="text-xs text-gray-500">{entry.hours}h × ${entry.rate}</p>
                  </div>
                </div>
              ))}

              {billedEntries.length > 0 && (
                <p className="text-xs font-medium text-gray-600 uppercase tracking-wider px-1 mt-4 mb-2">
                  Billed
                </p>
              )}
              {billedEntries.map((entry) => (
                <div key={entry.id} className="flex items-center gap-3 px-4 py-3 border border-gray-700/30 rounded-xl opacity-50">
                  <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-400 truncate">{entry.description}</p>
                    {entry.matters && <p className="text-xs text-gray-600">{entry.matters.title}</p>}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm text-gray-400">${entry.amount.toFixed(2)}</p>
                    <p className="text-xs text-gray-600">{entry.hours}h × ${entry.rate}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div>
          {invoices.length === 0 ? (
            <div className="text-center py-12">
              <DollarSign className="w-10 h-10 text-gray-700 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">No invoices yet. Select time entries and generate one.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {invoices.map((inv) => (
                <div key={inv.id} className="flex items-center gap-4 px-4 py-3.5 bg-gray-800/60 border border-gray-700/50 rounded-xl">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-white">{inv.invoice_number}</p>
                      <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium", INVOICE_STATUS_COLORS[inv.status])}>
                        {INVOICE_STATUS_ICONS[inv.status]}
                        {inv.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      {inv.clients && <span className="text-xs text-gray-500">{inv.clients.full_name}</span>}
                      {inv.matters && (
                        <>
                          <span className="text-gray-700">·</span>
                          <span className="text-xs text-gray-500">{inv.matters.title}</span>
                        </>
                      )}
                      {inv.due_date && (
                        <>
                          <span className="text-gray-700">·</span>
                          <span className="text-xs text-gray-500">Due {new Date(inv.due_date).toLocaleDateString()}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-base font-bold text-white">${inv.total.toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
                    {inv.tax > 0 && <p className="text-xs text-gray-500">incl. ${inv.tax.toFixed(2)} tax</p>}
                  </div>
                  <select
                    value={inv.status}
                    onChange={(e) => updateInvoiceStatus(inv.id, e.target.value as Invoice["status"])}
                    className="bg-gray-700 border border-gray-600 rounded-lg px-2 py-1 text-xs text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <option value="draft">Draft</option>
                    <option value="sent">Sent</option>
                    <option value="paid">Paid</option>
                    <option value="overdue">Overdue</option>
                  </select>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
