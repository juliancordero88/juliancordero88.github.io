import { generateObject } from "ai"
import { z } from "zod"
import { anthropic } from "@/lib/models"
import { storeMemory } from "./memoryStore"

const memoriesSchema = z.object({
  memories: z.array(z.string()).describe(
    "Key facts worth remembering for future conversations — client preferences, deadlines, important case details, attorney notes"
  ),
})

export async function extractAndStoreMemories(
  messages: Array<{ role: string; content: string }>,
  userId: string,
  options: { clientId?: string; matterId?: string } = {}
): Promise<void> {
  if (messages.length < 2) return

  const conversation = messages
    .slice(-10) // Last 10 messages
    .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
    .join("\n\n")

  try {
    const { object } = await generateObject({
      model: anthropic("claude-haiku-4-5"),
      schema: memoriesSchema,
      system: `Extract key facts from this conversation that should be remembered for future sessions.
Focus on: client preferences, important dates/deadlines, case details, attorney instructions, and notable findings.
Only extract genuinely useful persistent facts. Return an empty array if nothing is worth remembering.
Keep each memory concise (1-2 sentences max).`,
      prompt: conversation,
    })

    for (const memory of object.memories) {
      if (memory.trim()) {
        await storeMemory(memory, userId, options)
      }
    }
  } catch (error) {
    console.error("Memory extraction failed:", error)
  }
}
