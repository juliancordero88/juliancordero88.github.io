import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// GET — list connected integrations (provider + enabled, never the key values)
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data, error } = await supabase
    .from("integrations")
    .select("provider, enabled, last_synced_at, created_at")
    .eq("user_id", user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ integrations: data ?? [] })
}

// POST — upsert an integration (save API key or mark connected)
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { provider, api_key } = await req.json()
  if (!provider) return NextResponse.json({ error: "provider required" }, { status: 400 })
  if (!api_key) return NextResponse.json({ error: "api_key required" }, { status: 400 })

  const { error } = await supabase
    .from("integrations")
    .upsert({
      user_id: user.id,
      provider,
      api_key,
      enabled: true,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id,provider" })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

// DELETE — remove an integration
export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { provider } = await req.json()
  if (!provider) return NextResponse.json({ error: "provider required" }, { status: 400 })

  const { error } = await supabase
    .from("integrations")
    .delete()
    .eq("user_id", user.id)
    .eq("provider", provider)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
