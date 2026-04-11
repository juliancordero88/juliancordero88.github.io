import { createServiceClient } from "@/lib/supabase/server"
import { embedText } from "@/lib/rag/embedder"

export interface MemoryResult {
  id: string
  content: string
  similarity: number
  clientId: string | null
  matterId: string | null
  createdAt: string
}

export async function searchMemories(
  query: string,
  options: {
    topK?: number
    minSimilarity?: number
    clientId?: string
    matterId?: string
  } = {}
): Promise<MemoryResult[]> {
  const { topK = 5, minSimilarity = 0.7, clientId, matterId } = options

  const queryEmbedding = await embedText(query)
  const supabase = await createServiceClient()

  const { data, error } = await supabase.rpc("match_memories", {
    query_embedding: queryEmbedding,
    top_k: topK,
    min_similarity: minSimilarity,
    filter_client_id: clientId ?? null,
    filter_matter_id: matterId ?? null,
  })

  if (error) {
    console.error("Memory search error:", error)
    return []
  }

  return (data ?? []).map(
    (row: {
      id: string
      content: string
      similarity: number
      client_id: string | null
      matter_id: string | null
      created_at: string
    }) => ({
      id: row.id,
      content: row.content,
      similarity: row.similarity,
      clientId: row.client_id,
      matterId: row.matter_id,
      createdAt: row.created_at,
    })
  )
}

export function buildMemoryContext(memories: MemoryResult[]): string {
  if (memories.length === 0) return ""
  return memories.map((m) => `- ${m.content}`).join("\n")
}
