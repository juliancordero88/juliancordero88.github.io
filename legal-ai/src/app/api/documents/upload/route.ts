import { type NextRequest, NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"
import { extractPdfText } from "@/lib/parsers/pdfParser"
import { extractDocxText } from "@/lib/parsers/docxParser"
import { chunkText } from "@/lib/rag/chunker"
import { embedChunks } from "@/lib/rag/embedder"

export const runtime = "nodejs"

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get("file") as File | null
  const title = formData.get("title") as string | null

  if (!file) return NextResponse.json({ error: "file required" }, { status: 400 })

  const fileType = file.name.endsWith(".pdf") ? "pdf" : "docx"
  const maxSize = 20 * 1024 * 1024 // 20MB
  if (file.size > maxSize) {
    return NextResponse.json({ error: "File too large (max 20MB)" }, { status: 400 })
  }

  const serviceClient = await createServiceClient()

  // Upload raw file to Supabase Storage
  const filePath = `${user.id}/${Date.now()}-${file.name}`
  const buffer = Buffer.from(await file.arrayBuffer())

  const { error: uploadError } = await serviceClient.storage
    .from("legal-documents")
    .upload(filePath, buffer, { contentType: file.type })

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  // Create document record
  const { data: doc, error: docError } = await serviceClient
    .from("documents")
    .insert({
      user_id: user.id,
      title: title ?? file.name,
      file_path: filePath,
      file_type: fileType,
      file_size: file.size,
      status: "processing",
    })
    .select()
    .single()

  if (docError || !doc) {
    return NextResponse.json({ error: "Failed to create document record" }, { status: 500 })
  }

  // Process asynchronously (don't block the response)
  processDocument(doc.id, buffer, fileType, serviceClient).catch(async (err) => {
    console.error("Document processing failed:", err)
    await serviceClient
      .from("documents")
      .update({ status: "error", error_message: err.message })
      .eq("id", doc.id)
  })

  return NextResponse.json({ id: doc.id, status: "processing" })
}

async function processDocument(
  documentId: string,
  buffer: Buffer,
  fileType: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any
) {
  // Extract text
  const text =
    fileType === "pdf"
      ? await extractPdfText(buffer)
      : await extractDocxText(buffer)

  // Chunk
  const chunks = chunkText(text, { chunkSize: 512, overlap: 64 })

  // Embed in batches
  const embeddings = await embedChunks(chunks.map((c) => c.content))

  // Store chunks
  const rows = chunks.map((chunk, i) => ({
    document_id: documentId,
    chunk_index: chunk.chunkIndex,
    content: chunk.content,
    token_count: chunk.tokenCount,
    embedding: embeddings[i],
    metadata: chunk.metadata,
  }))

  const { error } = await supabase.from("document_chunks").insert(rows)
  if (error) throw error

  await supabase
    .from("documents")
    .update({ status: "ready", page_count: Math.ceil(chunks.length / 3) })
    .eq("id", documentId)
}
