export async function extractDocxText(buffer: Buffer): Promise<string> {
  // Dynamic import — server-only
  const mammoth = await import("mammoth")
  const result = await mammoth.extractRawText({ buffer })
  return result.value
}
