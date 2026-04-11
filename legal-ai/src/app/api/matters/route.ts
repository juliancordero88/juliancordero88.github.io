import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const clientId = searchParams.get("client_id")
  const status = searchParams.get("status")

  let query = supabase
    .from("matters")
    .select("*, clients(full_name, email)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  if (clientId) query = query.eq("client_id", clientId)
  if (status) query = query.eq("status", status)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ matters: data })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const { client_id, title, description, practice_area, status, billing_type, hourly_rate, flat_fee, opened_date, notes } = body

  if (!client_id || !title) {
    return NextResponse.json({ error: "client_id and title required" }, { status: 400 })
  }

  const { data, error } = await supabase
    .from("matters")
    .insert({
      user_id: user.id,
      client_id,
      title,
      description: description ?? null,
      practice_area: practice_area ?? null,
      status: status ?? "open",
      billing_type: billing_type ?? "hourly",
      hourly_rate: hourly_rate ?? null,
      flat_fee: flat_fee ?? null,
      opened_date: opened_date ?? new Date().toISOString().slice(0, 10),
      notes: notes ?? null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ matter: data }, { status: 201 })
}
