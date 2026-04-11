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
    .from("invoices")
    .select("*, clients(full_name), matters(title)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  if (clientId) query = query.eq("client_id", clientId)
  if (status) query = query.eq("status", status)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ invoices: data })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const { client_id, matter_id, entry_ids, tax_rate, due_days } = body

  if (!client_id) return NextResponse.json({ error: "client_id required" }, { status: 400 })

  // Fetch unbilled time entries for matter or specific IDs
  let entriesQuery = supabase
    .from("time_entries")
    .select("*")
    .eq("user_id", user.id)
    .eq("billed", false)

  if (entry_ids?.length) {
    entriesQuery = entriesQuery.in("id", entry_ids)
  } else if (matter_id) {
    entriesQuery = entriesQuery.eq("matter_id", matter_id)
  }

  const { data: entries, error: entriesError } = await entriesQuery
  if (entriesError) return NextResponse.json({ error: entriesError.message }, { status: 500 })
  if (!entries?.length) return NextResponse.json({ error: "No unbilled entries found" }, { status: 400 })

  const subtotal = entries.reduce((sum, e) => sum + e.amount, 0)
  const taxAmount = parseFloat(((subtotal * (tax_rate ?? 0)) / 100).toFixed(2))
  const total = parseFloat((subtotal + taxAmount).toFixed(2))

  // Generate invoice number
  const invoiceNumber = `INV-${Date.now().toString().slice(-6)}`
  const today = new Date().toISOString().slice(0, 10)
  const dueDate = new Date(Date.now() + (due_days ?? 30) * 86400000).toISOString().slice(0, 10)

  const { data: invoice, error: invoiceError } = await supabase
    .from("invoices")
    .insert({
      user_id: user.id,
      client_id,
      matter_id: matter_id ?? null,
      invoice_number: invoiceNumber,
      status: "draft",
      subtotal,
      tax: taxAmount,
      total,
      issued_date: today,
      due_date: dueDate,
    })
    .select()
    .single()

  if (invoiceError || !invoice) {
    return NextResponse.json({ error: invoiceError?.message ?? "Failed" }, { status: 500 })
  }

  // Mark entries as billed
  await supabase
    .from("time_entries")
    .update({ billed: true, invoice_id: invoice.id })
    .in("id", entries.map((e) => e.id))

  return NextResponse.json({ invoice, entries }, { status: 201 })
}
