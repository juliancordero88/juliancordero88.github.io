import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const matterId = searchParams.get("matter_id")
  const billed = searchParams.get("billed")
  const invoiceId = searchParams.get("invoice_id")

  let query = supabase
    .from("time_entries")
    .select("*, matters(title, clients(full_name))")
    .eq("user_id", user.id)
    .order("date", { ascending: false })

  if (matterId) query = query.eq("matter_id", matterId)
  if (billed !== null) query = query.eq("billed", billed === "true")
  if (invoiceId) query = query.eq("invoice_id", invoiceId)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ entries: data })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const { matter_id, description, hours, rate, date } = body

  if (!matter_id || !description || hours === undefined || rate === undefined) {
    return NextResponse.json({ error: "matter_id, description, hours, and rate required" }, { status: 400 })
  }

  const amount = parseFloat((hours * rate).toFixed(2))

  const { data, error } = await supabase
    .from("time_entries")
    .insert({
      user_id: user.id,
      matter_id,
      description,
      hours: parseFloat(hours),
      rate: parseFloat(rate),
      amount,
      date: date ?? new Date().toISOString().slice(0, 10),
      billed: false,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ entry: data }, { status: 201 })
}
