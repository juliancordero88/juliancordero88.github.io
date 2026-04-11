import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const matterId = searchParams.get("matter_id")
  const status = searchParams.get("status")
  const priority = searchParams.get("priority")

  let query = supabase
    .from("tasks")
    .select("*, matters(title, clients(full_name))")
    .eq("user_id", user.id)
    .order("due_date", { ascending: true, nullsFirst: false })

  if (matterId) query = query.eq("matter_id", matterId)
  if (status) query = query.eq("status", status)
  if (priority) query = query.eq("priority", priority)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ tasks: data })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const { title, description, matter_id, priority, status, due_date, reminder_date, task_type } = body

  if (!title) return NextResponse.json({ error: "title required" }, { status: 400 })

  const { data, error } = await supabase
    .from("tasks")
    .insert({
      user_id: user.id,
      title,
      description: description ?? null,
      matter_id: matter_id ?? null,
      priority: priority ?? "medium",
      status: status ?? "todo",
      due_date: due_date ?? null,
      reminder_date: reminder_date ?? null,
      task_type: task_type ?? "internal",
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ task: data }, { status: 201 })
}
