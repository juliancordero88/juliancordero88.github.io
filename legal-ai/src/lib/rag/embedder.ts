import { openai } from "@/lib/models"
import { embed, embedMany } from "ai"

const EMBEDDING_MODEL = "text-embedding-3-small"

export async function embedText(text: string): Promise<number[]> {
  const { embedding } = await embed({
    model: openai.embedding(EMBEDDING_MODEL),
    value: text,
  })
  return embedding
}

export async function embedChunks(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return []

  // Process in batches of 100 (API limit)
  const BATCH_SIZE = 100
  const allEmbeddings: number[][] = []

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE)
    const { embeddings } = await embedMany({
      model: openai.embedding(EMBEDDING_MODEL),
      values: batch,
    })
    allEmbeddings.push(...embeddings)
  }

  return allEmbeddings
}
