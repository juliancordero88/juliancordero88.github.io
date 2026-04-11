export async function extractPdfText(buffer: Buffer): Promise<string> {
  // Dynamic import — server-only, keeps out of browser bundle
  // pdf-parse ESM exports a named function, cast to avoid type errors
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfParse = require("pdf-parse") as (buf: Buffer) => Promise<{ text: string }>
  const data = await pdfParse(buffer)
  return data.text
}
