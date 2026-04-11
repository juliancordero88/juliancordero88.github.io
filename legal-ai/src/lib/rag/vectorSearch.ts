import { createServiceClient } from "@/lib/supabase/server"
import { embedText } from "./embedder"

export interface SearchResult {
  chunkId: string
  documentId: string
  documentTitle: string
  content: string
  similarity: number
}

export async function vectorSearch(
  query: string,
  options: {
    documentIds?: string[]
    topK?: number
    minSimilarity?: number
  } = {}
): Promise<SearchResult[]> {
  const { topK = 5, minSimilarity = 0.65, documentIds } = options

  const queryEmbedding = await embedText(query)
  const supabase = await createServiceClient()

  const { data, error } = await supabase.rpc("match_document_chunks", {
    query_embedding: queryEmbedding,
    document_ids: documentIds ?? null,
    top_k: topK,
    min_similarity: minSimilarity,
  })

  if (error) {
    console.error("Vector search error:", error)
    return []
  }

  return (data ?? []).map(
    (row: {
      id: string
      document_id: string
      document_title: string
      content: string
      similarity: number
    }) => ({
      chunkId: row.id,
      documentId: row.document_id,
      documentTitle: row.document_title,
      content: row.content,
      similarity: row.similarity,
    })
  )
}
