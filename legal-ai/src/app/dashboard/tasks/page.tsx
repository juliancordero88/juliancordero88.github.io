"use client"

import { useState, useEffect, useCallback } from "react"
import { CheckSquare, Plus, Loader2, X, AlertTriangle, Clock, CheckCircle2, Circle } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Task, Matter } from "@/types/database"

type TaskWithMatter = Task & { matters: (Pick<Matter, "title"> & { clients: { full_name: string } | null }) | null }

const PRIORITY_COLORS: Record<Task["priority"], string> = {
  urgent: "text-red-400 bg-red-500/15",
  high: "text-orange-400 bg-orange-500/15",
  medium: "text-yellow-400 bg-yellow-500/15",
  low: "text-gray-400 bg-gray-500/15",
}

const TASK_TYPE_LABELS: Record<Task["task_type"], string> = {
  deadline: "Deadline",
  filing: "Filing",
  client_contact: "Client",
  internal: "Internal",
}

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null
  const due = new Date(dateStr)
  const now = new Date()
  due.setHours(0, 0, 0, 0)
  now.setHours(0, 0, 0, 0)
  return Math.ceil((due.getTime() - now.getTime()) / 86400000)
}

function DueBadge({ dueDate }: { dueDate: string | null }) {
  const days = daysUntil(dueDate)
  if (days === null) return null

  if (days < 0) return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/20 text-red-400">
      <AlertTriangle className="w-3 h-3" /> {Math.abs(days)}d overdue
    </span>
  )
  if (days === 0) return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/20 text-red-400">
      <AlertTriangle className="w-3 h-3" /> Due today
    </span>
  )
  if (days <= 7) return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/15 text-red-400">
      <Clock className="w-3 h-3" /> {days}d left — CRITICAL
    </span>
  )
  if (days <= 30) return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-500/15 text-yellow-400">
      <Clock className="w-3 h-3" /> {days}d left — URGENT
    </span>
  )
  return (
    <span className="text-xs text-gray-500">
      Due {new Date(dueDate!).toLocaleDateString()}
    </span>
  )
}

function NewTaskModal({ onClose, onCreated }: {
  onClose: () => void
  onCreated: (task: TaskWithMatter) => void
}) {
  const [matters, setMatters] = useState<Matter[]>([])
  const [form, setForm] = useState({
    title: "", description: "", matter_id: "",
    priority: "medium" as Task["priority"],
    task_type: "internal" as Task["task_type"],
    due_date: "", reminder_date: "",
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/matters?status=open").then((r) => r.json()).then((d) => setMatters(d.matters ?? []))
  }, [])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim()) { setError("Title is required"); return }
    setSaving(true)
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        matter_id: form.matter_id || null,
        due_date: form.due_date || null,
        reminder_date: form.reminder_date || null,
      }),
    })
    if (res.ok) {
      const data = await res.json()
      const matter = matters.find((m) => m.id === form.matter_id)
      onCreated({ ...data.task, matters: matter ? { title: matter.title, clients: null } : null })
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
          <h2 className="text-lg font-semibold text-white">New Task</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={submit} className="px-6 py-4 space-y-3">
          {error && <p className="text-sm text-red-400 bg-red-500/15 rounded-lg px-3 py-2">{error}</p>}
          <div>
            <label className="text-xs font-medium text-gray-400 mb-1 block">Task *</label>
            <input
              value={form.title}
              onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              placeholder="e.g., File motion to dismiss by Friday"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-400 mb-1 block">Priority</label>
              <select
                value={form.priority}
                onChange={(e) => setForm((p) => ({ ...p, priority: e.target.value as Task["priority"] }))}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-400 mb-1 block">Type</label>
              <select
                value={form.task_type}
                onChange={(e) => setForm((p) => ({ ...p, task_type: e.target.value as Task["task_type"] }))}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="deadline">Deadline</option>
                <option value="filing">Filing</option>
                <option value="client_contact">Client Contact</option>
                <option value="internal">Internal</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-400 mb-1 block">Matter (optional)</label>
            <select
              value={form.matter_id}
              onChange={(e) => setForm((p) => ({ ...p, matter_id: e.target.value }))}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">No matter</option>
              {matters.map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-400 mb-1 block">Due Date</label>
              <input
                type="date"
                value={form.due_date}
                onChange={(e) => setForm((p) => ({ ...p, due_date: e.target.value }))}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-400 mb-1 block">Reminder</label>
              <input
                type="date"
                value={form.reminder_date}
                onChange={(e) => setForm((p) => ({ ...p, reminder_date: e.target.value }))}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-400 mb-1 block">Notes</label>
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
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Create Task
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<TaskWithMatter[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState("todo,in_progress")
  const [showNew, setShowNew] = useState(false)

  const fetchTasks = useCallback(async () => {
    setLoading(true)
    const res = await fetch("/api/tasks")
    if (res.ok) {
      const data = await res.json()
      setTasks(data.tasks ?? [])
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchTasks() }, [fetchTasks])

  async function toggleStatus(task: TaskWithMatter) {
    const next: Task["status"] = task.status === "done" ? "todo" : task.status === "todo" ? "in_progress" : "done"
    await fetch(`/api/tasks/${task.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    })
    setTasks((prev) => prev.map((t) => t.id === task.id ? { ...t, status: next } : t))
  }

  const filtered = statusFilter === "todo,in_progress"
    ? tasks.filter((t) => t.status !== "done")
    : statusFilter === "done"
      ? tasks.filter((t) => t.status === "done")
      : tasks

  // Sort: overdue first, then by due date, then by priority
  const sorted = [...filtered].sort((a, b) => {
    const dA = daysUntil(a.due_date)
    const dB = daysUntil(b.due_date)
    const PRIORITY_ORDER = { urgent: 0, high: 1, medium: 2, low: 3 }
    if (dA !== null && dB === null) return -1
    if (dA === null && dB !== null) return 1
    if (dA !== null && dB !== null && dA !== dB) return dA - dB
    return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
  })

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {showNew && (
        <NewTaskModal
          onClose={() => setShowNew(false)}
          onCreated={(t) => setTasks((prev) => [t, ...prev])}
        />
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Tasks</h1>
          <p className="text-gray-400 text-sm mt-0.5">{filtered.length} task{filtered.length !== 1 ? "s" : ""}</p>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" /> New Task
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 mb-5 bg-gray-800/60 rounded-lg p-1 w-fit">
        {[
          { label: "Active", value: "todo,in_progress" },
          { label: "All", value: "" },
          { label: "Done", value: "done" },
        ].map(({ label, value }) => (
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
      ) : sorted.length === 0 ? (
        <div className="text-center py-12">
          <CheckSquare className="w-10 h-10 text-gray-700 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">No tasks found.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.map((task) => {
            const days = daysUntil(task.due_date)
            const isUrgent = days !== null && days <= 7
            return (
              <div
                key={task.id}
                className={cn(
                  "flex items-start gap-3 px-4 py-3.5 border rounded-xl transition-colors",
                  task.status === "done"
                    ? "bg-gray-800/30 border-gray-700/30 opacity-60"
                    : isUrgent
                      ? "bg-red-500/5 border-red-500/30"
                      : "bg-gray-800/60 border-gray-700/50 hover:border-gray-600"
                )}
              >
                {/* Status toggle */}
                <button
                  onClick={() => toggleStatus(task)}
                  className="mt-0.5 shrink-0 transition-colors"
                >
                  {task.status === "done" ? (
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                  ) : task.status === "in_progress" ? (
                    <Clock className="w-5 h-5 text-blue-400" />
                  ) : (
                    <Circle className="w-5 h-5 text-gray-600 hover:text-gray-400" />
                  )}
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={cn("text-sm font-medium", task.status === "done" ? "line-through text-gray-500" : "text-white")}>
                      {task.title}
                    </p>
                    <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                      <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", PRIORITY_COLORS[task.priority])}>
                        {task.priority}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-700 text-gray-400">
                        {TASK_TYPE_LABELS[task.task_type]}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {task.matters && (
                      <span className="text-xs text-gray-500">{task.matters.title}</span>
                    )}
                    {task.due_date && (
                      <>
                        {task.matters && <span className="text-gray-700">·</span>}
                        <DueBadge dueDate={task.due_date} />
                      </>
                    )}
                  </div>
                  {task.description && (
                    <p className="text-xs text-gray-500 mt-1 line-clamp-1">{task.description}</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
