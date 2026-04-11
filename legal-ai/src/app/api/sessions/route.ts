import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const agentId = searchParams.get("agent_id")
  const clientId = searchParams.get("client_id")
  const limit = parseInt(searchParams.get("limit") ?? "20")

  let query = supabase
    .from("chat_sessions")
    .select("id, agent_id, client_id, matter_id, title, created_at, updated_at")
    .eq("user_id", user.id)
    .not("title", "ilike", "telegram:%")
    .order("updated_at", { ascending: false })
    .limit(limit)

  if (agentId) query = query.eq("agent_id", agentId)
  if (clientId) query = query.eq("client_id", clientId)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ sessions: data })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const { agent_id, client_id, matter_id, title } = body

  const { data, error } = await supabase
    .from("chat_sessions")
    .insert({
      user_id: user.id,
      agent_id,
      client_id: client_id ?? null,
      matter_id: matter_id ?? null,
      title: title ?? null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ session: data }, { status: 201 })
}
