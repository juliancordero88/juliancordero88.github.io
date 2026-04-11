"use client"

import { useState, useEffect, useCallback } from "react"
import { Plus, BookOpen, Trash2, Loader2, Save, X, Tag, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import type { SkillFile } from "@/types/database"

const EMPTY_SKILL: Omit<SkillFile, "id" | "user_id" | "created_at" | "updated_at"> = {
  name: "",
  description: null,
  content: "",
  tags: [],
}

function SkillCard({ skill, isSelected, onClick }: {
  skill: SkillFile
  isSelected: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left px-4 py-3.5 rounded-xl border transition-colors",
        isSelected
          ? "bg-blue-600/15 border-blue-500/50 text-blue-300"
          : "bg-gray-800/60 border-gray-700/50 text-gray-300 hover:border-gray-600"
      )}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium truncate">{skill.name || "Untitled"}</p>
        <ChevronRight className="w-4 h-4 shrink-0 text-gray-500" />
      </div>
      {skill.description && (
        <p className="text-xs text-gray-500 mt-0.5 truncate">{skill.description}</p>
      )}
      {skill.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1.5">
          {skill.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-gray-700 rounded text-xs text-gray-400">
              <Tag className="w-2.5 h-2.5" />{tag}
            </span>
          ))}
        </div>
      )}
      <p className="text-xs text-gray-600 mt-1.5">
        {skill.content.length} chars · updated {new Date(skill.updated_at).toLocaleDateString()}
      </p>
    </button>
  )
}

export default function SkillsPage() {
  const [skills, setSkills] = useState<SkillFile[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | "new" | null>(null)
  const [form, setForm] = useState(EMPTY_SKILL)
  const [tagInput, setTagInput] = useState("")
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [savedFlash, setSavedFlash] = useState(false)

  const fetchSkills = useCallback(async () => {
    setLoading(true)
    const res = await fetch("/api/skills")
    if (res.ok) {
      const data = await res.json()
      setSkills(data.skills ?? [])
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchSkills() }, [fetchSkills])

  function openNew() {
    setSelectedId("new")
    setForm(EMPTY_SKILL)
    setTagInput("")
  }

  function openEdit(skill: SkillFile) {
    setSelectedId(skill.id)
    setForm({
      name: skill.name,
      description: skill.description,
      content: skill.content,
      tags: skill.tags ?? [],
    })
    setTagInput("")
  }

  function closeEditor() {
    setSelectedId(null)
  }

  function addTag(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault()
      const tag = tagInput.trim().toLowerCase()
      if (tag && !form.tags.includes(tag)) {
        setForm((prev) => ({ ...prev, tags: [...prev.tags, tag] }))
      }
      setTagInput("")
    }
  }

  function removeTag(tag: string) {
    setForm((prev) => ({ ...prev, tags: prev.tags.filter((t) => t !== tag) }))
  }

  async function save() {
    if (!form.name.trim() || !form.content.trim()) return
    setSaving(true)

    const method = selectedId === "new" ? "POST" : "PUT"
    const url = selectedId === "new" ? "/api/skills" : `/api/skills/${selectedId}`

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })

    if (res.ok) {
      const data = await res.json()
      if (selectedId === "new") {
        setSkills((prev) => [data.skill, ...prev])
        setSelectedId(data.skill.id)
      } else {
        setSkills((prev) => prev.map((s) => s.id === data.skill.id ? data.skill : s))
      }
      setSavedFlash(true)
      setTimeout(() => setSavedFlash(false), 2000)
    }
    setSaving(false)
  }

  async function deleteSkill(id: string) {
    setDeletingId(id)
    await fetch(`/api/skills/${id}`, { method: "DELETE" })
    setSkills((prev) => prev.filter((s) => s.id !== id))
    if (selectedId === id) closeEditor()
    setDeletingId(null)
  }

  return (
    <div className="flex h-full">
      {/* Skill list */}
      <div className="w-72 shrink-0 border-r border-gray-800 flex flex-col h-full">
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-800">
          <h1 className="text-lg font-semibold text-white">Skill Files</h1>
          <button
            onClick={openNew}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-lg transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> New
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-5 h-5 text-gray-500 animate-spin" />
            </div>
          ) : skills.length === 0 ? (
            <div className="text-center py-10">
              <BookOpen className="w-8 h-8 text-gray-700 mx-auto mb-2" />
              <p className="text-gray-500 text-xs">No skill files yet.</p>
              <p className="text-gray-600 text-xs mt-1">Create one to give agents practice knowledge.</p>
            </div>
          ) : (
            skills.map((skill) => (
              <div key={skill.id} className="relative group">
                <SkillCard
                  skill={skill}
                  isSelected={selectedId === skill.id}
                  onClick={() => openEdit(skill)}
                />
                <button
                  onClick={(e) => { e.stopPropagation(); deleteSkill(skill.id) }}
                  disabled={deletingId === skill.id}
                  className="absolute top-2 right-8 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-red-500/20 text-gray-500 hover:text-red-400 disabled:opacity-40"
                >
                  {deletingId === skill.id
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : <Trash2 className="w-3.5 h-3.5" />
                  }
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Editor */}
      {selectedId !== null ? (
        <div className="flex-1 flex flex-col h-full">
          {/* Editor toolbar */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-800">
            <input
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Skill file name…"
              className="flex-1 bg-transparent text-white font-semibold text-sm placeholder-gray-600 focus:outline-none mr-4"
            />
            <div className="flex items-center gap-2">
              {savedFlash && (
                <span className="text-xs text-green-400 font-medium">Saved</span>
              )}
              <button
                onClick={save}
                disabled={saving || !form.name.trim() || !form.content.trim()}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-xs font-medium rounded-lg transition-colors"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Save
              </button>
              <button
                onClick={closeEditor}
                className="p-1.5 text-gray-500 hover:text-gray-300 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Meta fields */}
          <div className="px-5 py-3 border-b border-gray-800 flex flex-wrap items-center gap-3">
            <input
              value={form.description ?? ""}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value || null }))}
              placeholder="Short description (optional)…"
              className="flex-1 min-w-48 bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-gray-300 placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <div className="flex items-center gap-1.5 flex-wrap">
              {form.tags.map((tag) => (
                <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-700 rounded text-xs text-gray-300">
                  {tag}
                  <button onClick={() => removeTag(tag)} className="text-gray-500 hover:text-gray-200">
                    <X className="w-2.5 h-2.5" />
                  </button>
                </span>
              ))}
              <input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={addTag}
                placeholder="Add tag…"
                className="w-20 bg-transparent text-xs text-gray-400 placeholder-gray-600 focus:outline-none"
              />
            </div>
          </div>

          {/* Content area */}
          <div className="flex-1 flex overflow-hidden">
            <textarea
              value={form.content}
              onChange={(e) => setForm((prev) => ({ ...prev, content: e.target.value }))}
              placeholder={`Write the skill file content in plain text or Markdown…

Examples:
- NY jurisdiction rules
- Standard retainer terms
- Client communication templates
- Practice area checklists`}
              className="flex-1 resize-none bg-transparent text-gray-200 text-sm font-mono leading-relaxed px-5 py-4 focus:outline-none placeholder-gray-700"
            />
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-center p-8">
          <div>
            <BookOpen className="w-12 h-12 text-gray-700 mx-auto mb-3" />
            <p className="text-gray-500 text-sm font-medium">Select a skill file to edit</p>
            <p className="text-gray-600 text-xs mt-1">
              Skill files inject practice knowledge into agent prompts.
            </p>
            <button
              onClick={openNew}
              className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Create your first skill file
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
