import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { vectorSearch } from "@/lib/rag/vectorSearch"

export const runtime = "nodejs"

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { query, documentIds, topK = 8, minSimilarity = 0.6 } = await req.json()
  if (!query) return NextResponse.json({ error: "query required" }, { status: 400 })

  const results = await vectorSearch(query, { documentIds, topK, minSimilarity })
  return NextResponse.json({ results })
}
