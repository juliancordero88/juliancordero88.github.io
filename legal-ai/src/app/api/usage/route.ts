import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  // Last 30 days of usage logs
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const { data, error } = await supabase
    .from("usage_logs")
    .select("agent_id, model_id, tokens_in, tokens_out, cost_usd, created_at")
    .eq("user_id", user.id)
    .gte("created_at", since)
    .order("created_at", { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Aggregate by agent
  const byAgent: Record<string, { tokens_in: number; tokens_out: number; cost_usd: number; calls: number }> = {}
  let totalCost = 0

  for (const row of data ?? []) {
    const key = row.agent_id ?? "unknown"
    if (!byAgent[key]) byAgent[key] = { tokens_in: 0, tokens_out: 0, cost_usd: 0, calls: 0 }
    byAgent[key].tokens_in += row.tokens_in
    byAgent[key].tokens_out += row.tokens_out
    byAgent[key].cost_usd += row.cost_usd
    byAgent[key].calls += 1
    totalCost += row.cost_usd
  }

  // Daily totals for chart (last 30 days)
  const daily: Record<string, number> = {}
  for (const row of data ?? []) {
    const day = row.created_at.slice(0, 10)
    daily[day] = (daily[day] ?? 0) + row.cost_usd
  }

  return NextResponse.json({
    byAgent,
    daily,
    totalCost: parseFloat(totalCost.toFixed(4)),
    totalCalls: data?.length ?? 0,
  })
}
