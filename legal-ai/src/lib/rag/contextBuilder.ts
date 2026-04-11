import type { SearchResult } from "./vectorSearch"

export function buildRAGContext(results: SearchResult[]): string {
  if (results.length === 0) return ""

  const grouped = results.reduce<Record<string, SearchResult[]>>((acc, r) => {
    if (!acc[r.documentTitle]) acc[r.documentTitle] = []
    acc[r.documentTitle].push(r)
    return acc
  }, {})

  const parts = Object.entries(grouped).map(([title, chunks]) => {
    const content = chunks.map((c) => c.content).join("\n\n[...]\n\n")
    return `[Document: ${title}]\n${content}`
  })

  return parts.join("\n\n---\n\n")
}
