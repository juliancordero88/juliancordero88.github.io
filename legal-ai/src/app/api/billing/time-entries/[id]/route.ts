import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const body = await req.json()

  const updates: Record<string, unknown> = {}
  if (body.description !== undefined) updates.description = body.description
  if (body.hours !== undefined) updates.hours = parseFloat(body.hours)
  if (body.rate !== undefined) updates.rate = parseFloat(body.rate)
  if (body.date !== undefined) updates.date = body.date
  if (body.billed !== undefined) updates.billed = body.billed
  if (body.invoice_id !== undefined) updates.invoice_id = body.invoice_id

  // Recalculate amount if hours or rate changed
  if (updates.hours !== undefined || updates.rate !== undefined) {
    const { data: existing } = await supabase
      .from("time_entries")
      .select("hours, rate")
      .eq("id", id)
      .single()

    const hours = (updates.hours ?? existing?.hours ?? 0) as number
    const rate = (updates.rate ?? existing?.rate ?? 0) as number
    updates.amount = parseFloat((hours * rate).toFixed(2))
  }

  const { data, error } = await supabase
    .from("time_entries")
    .update(updates)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single()

  if (error || !data) return NextResponse.json({ error: error?.message ?? "Not found" }, { status: 404 })
  return NextResponse.json({ entry: data })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const { error } = await supabase
    .from("time_entries")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
