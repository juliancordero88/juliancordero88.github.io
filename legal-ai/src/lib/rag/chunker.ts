export interface TextChunk {
  content: string
  chunkIndex: number
  tokenCount: number
  metadata: {
    pageHint?: number
    sectionTitle?: string
  }
}

// Rough token estimator: ~4 chars per token
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

export function chunkText(
  text: string,
  options: { chunkSize?: number; overlap?: number } = {}
): TextChunk[] {
  const { chunkSize = 512, overlap = 64 } = options

  if (!text.trim()) return []

  const chunks: TextChunk[] = []
  let chunkIndex = 0

  // Split on paragraph breaks first, then sentences
  const paragraphs = text.split(/\n\n+/).filter((p) => p.trim().length > 0)

  let currentChunk = ""
  let currentTokens = 0

  for (const paragraph of paragraphs) {
    const paraTokens = estimateTokens(paragraph)

    // If adding this paragraph exceeds chunk size, flush current chunk
    if (currentTokens + paraTokens > chunkSize && currentChunk.length > 0) {
      chunks.push({
        content: currentChunk.trim(),
        chunkIndex: chunkIndex++,
        tokenCount: currentTokens,
        metadata: {},
      })

      // Start new chunk with overlap from end of previous chunk
      const words = currentChunk.split(" ")
      const overlapWords = words.slice(-Math.ceil(overlap * 0.75))
      currentChunk = overlapWords.join(" ") + "\n\n" + paragraph
      currentTokens = estimateTokens(currentChunk)
    } else {
      currentChunk += (currentChunk ? "\n\n" : "") + paragraph
      currentTokens += paraTokens
    }

    // If single paragraph exceeds chunk size, split by sentences
    if (currentTokens > chunkSize * 1.5) {
      const sentences = currentChunk.split(/(?<=[.!?])\s+/)
      currentChunk = ""
      currentTokens = 0

      for (const sentence of sentences) {
        const sentTokens = estimateTokens(sentence)
        if (currentTokens + sentTokens > chunkSize && currentChunk.length > 0) {
          chunks.push({
            content: currentChunk.trim(),
            chunkIndex: chunkIndex++,
            tokenCount: currentTokens,
            metadata: {},
          })
          currentChunk = sentence
          currentTokens = sentTokens
        } else {
          currentChunk += (currentChunk ? " " : "") + sentence
          currentTokens += sentTokens
        }
      }
    }
  }

  // Flush remaining content
  if (currentChunk.trim()) {
    chunks.push({
      content: currentChunk.trim(),
      chunkIndex: chunkIndex++,
      tokenCount: currentTokens,
      metadata: {},
    })
  }

  return chunks
}
