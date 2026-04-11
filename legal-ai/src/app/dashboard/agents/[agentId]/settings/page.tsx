"use client"

import { useState, useEffect, use } from "react"
import { createClient } from "@/lib/supabase/client"
import { DEFAULT_AGENT_CONFIGS } from "@/lib/agents/agentRegistry"
import { MODEL_CATALOG } from "@/lib/models"
import type { AgentId, AgentConfig, SkillFile } from "@/types/database"
import { ArrowLeft, Save, Loader2 } from "lucide-react"
import Link from "next/link"

export default function AgentSettingsPage({
  params,
}: {
  params: Promise<{ agentId: string }>
}) {
  const { agentId } = use(params)
  const defaults = DEFAULT_AGENT_CONFIGS[agentId as AgentId]

  const [config, setConfig] = useState<Partial<AgentConfig>>({
    ...defaults,
    id: agentId as AgentId,
  })
  const [skillFiles, setSkillFiles] = useState<SkillFile[]>([])
  const [attachedSkillIds, setAttachedSkillIds] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: agentData } = await supabase
        .from("agent_configs")
        .select("*")
        .eq("id", agentId)
        .single()
      if (agentData) setConfig(agentData)

      const { data: skills } = await supabase.from("skill_files").select("*")
      if (skills) setSkillFiles(skills)

      const { data: attached } = await supabase
        .from("agent_skill_files")
        .select("skill_id")
        .eq("agent_id", agentId)
      if (attached) setAttachedSkillIds(attached.map((r: { skill_id: string }) => r.skill_id))
    }
    load()
  }, [agentId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSave() {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase.from("agent_configs").upsert({
      ...config,
      id: agentId,
      user_id: user.id,
      updated_at: new Date().toISOString(),
    })

    // Update skill file attachments
    await supabase.from("agent_skill_files").delete().eq("agent_id", agentId)
    if (attachedSkillIds.length > 0) {
      await supabase.from("agent_skill_files").insert(
        attachedSkillIds.map((skillId, i) => ({
          agent_id: agentId,
          skill_id: skillId,
          position: i,
        }))
      )
    }

    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/dashboard/agents/${agentId}`} className="text-gray-400 hover:text-gray-200">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <h1 className="text-white font-bold text-xl">{defaults?.display_name} — Settings</h1>
      </div>

      <div className="space-y-6">
        {/* Model */}
        <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-5">
          <h2 className="text-white font-semibold mb-4">Model</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-300 mb-1.5">AI Model</label>
              <select
                value={config.model_id ?? ""}
                onChange={(e) => setConfig({ ...config, model_id: e.target.value })}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {Object.entries(MODEL_CATALOG).map(([id, meta]) => (
                  <option key={id} value={id}>
                    {meta.label} — {meta.description}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-300 mb-1.5">
                  Temperature: {config.temperature}
                </label>
                <input
                  type="range"
                  min="0" max="1" step="0.1"
                  value={config.temperature ?? 0.3}
                  onChange={(e) => setConfig({ ...config, temperature: parseFloat(e.target.value) })}
                  className="w-full accent-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1.5">Max Tokens</label>
                <input
                  type="number"
                  min="256" max="16384" step="256"
                  value={config.max_tokens ?? 4096}
                  onChange={(e) => setConfig({ ...config, max_tokens: parseInt(e.target.value) })}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* System Prompt */}
        <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-5">
          <h2 className="text-white font-semibold mb-4">Instructions</h2>
          <textarea
            value={config.system_prompt ?? ""}
            onChange={(e) => setConfig({ ...config, system_prompt: e.target.value })}
            rows={12}
            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2.5 text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            placeholder="System prompt for this agent…"
          />
        </div>

        {/* Skill Files */}
        {skillFiles.length > 0 && (
          <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-5">
            <h2 className="text-white font-semibold mb-4">Attached Skill Files</h2>
            <div className="space-y-2">
              {skillFiles.map((skill) => (
                <label key={skill.id} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={attachedSkillIds.includes(skill.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setAttachedSkillIds([...attachedSkillIds, skill.id])
                      } else {
                        setAttachedSkillIds(attachedSkillIds.filter((id) => id !== skill.id))
                      }
                    }}
                    className="accent-blue-500 w-4 h-4"
                  />
                  <div>
                    <p className="text-white text-sm font-medium">{skill.name}</p>
                    {skill.description && (
                      <p className="text-gray-400 text-xs">{skill.description}</p>
                    )}
                  </div>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Save */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium rounded-lg transition-colors"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {saved ? "Saved!" : "Save Changes"}
        </button>
      </div>
    </div>
  )
}
