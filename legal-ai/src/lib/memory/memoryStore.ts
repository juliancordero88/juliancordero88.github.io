import { createServiceClient } from "@/lib/supabase/server"
import { embedText } from "@/lib/rag/embedder"

export async function storeMemory(
  content: string,
  userId: string,
  options: { clientId?: string; matterId?: string } = {}
): Promise<void> {
  const embedding = await embedText(content)
  const supabase = await createServiceClient()

  await supabase.from("memory_entries").insert({
    user_id: userId,
    client_id: options.clientId ?? null,
    matter_id: options.matterId ?? null,
    content,
    embedding,
  })
}
