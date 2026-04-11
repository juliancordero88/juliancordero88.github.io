import { Telegraf, type Context } from "telegraf"
import { generateText } from "ai"
import { classifyIntent } from "@/lib/agents/orchestrator"
import { getAgentConfig, getAgentSkillFiles, buildSystemPrompt } from "@/lib/agents/agentRegistry"
import { getModel } from "@/lib/models"
import { searchMemories, buildMemoryContext } from "@/lib/memory/memorySearch"
import { splitTelegramMessage } from "@/lib/utils"
import { createServiceClient } from "@/lib/supabase/server"
import type { AgentId } from "@/types/database"

export const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN!)

// Get the owner's user_id from env (set after first signup)
const OWNER_USER_ID = process.env.LEXOS_OWNER_USER_ID ?? ""

async function runAgentForTelegram(agentId: AgentId, ctx: Context) {
  if (!ctx.message || !("text" in ctx.message)) return

  const chatId = ctx.chat?.id
  const userMessage = ctx.message.text
    .replace(/^\/\w+\s*/, "") // strip command prefix
    .trim()

  if (!userMessage) {
    await ctx.reply("Please include your message after the command.")
    return
  }

  // Send "thinking" indicator
  const thinking = await ctx.reply("⚖️ Thinking…")

  try {
    const config = await getAgentConfig(agentId)
    const skillContents = await getAgentSkillFiles(agentId)

    // Search memories
    const memories = await searchMemories(userMessage, { topK: 4 })
    const memoryContext = buildMemoryContext(memories)

    let systemPrompt = buildSystemPrompt(config.system_prompt, skillContents, null)
    if (memoryContext) {
      systemPrompt += `\n\n=== REMEMBERED CONTEXT ===\n${memoryContext}\n=== END ===`
    }

    // Get conversation history from Supabase for this chat
    let messages: Array<{ role: "user" | "assistant"; content: string }> = [{ role: "user", content: userMessage }]

    if (OWNER_USER_ID) {
      const supabase = await createServiceClient()
      const { data: session } = await supabase
        .from("chat_sessions")
        .select("id")
        .eq("user_id", OWNER_USER_ID)
        .ilike("title", `telegram:${chatId}%`)
        .order("created_at", { ascending: false })
        .limit(1)
        .single()

      if (session) {
        const { data: recentMessages } = await supabase
          .from("messages")
          .select("role, content")
          .eq("session_id", session.id)
          .order("created_at", { ascending: false })
          .limit(10)

        if (recentMessages) {
          messages = [
            ...recentMessages.reverse().map((m: { role: string; content: string }) => ({
              role: m.role as "user" | "assistant",
              content: m.content,
            })),
            { role: "user" as const, content: userMessage },
          ]
        }
      }
    }

    const { text } = await generateText({
      model: getModel(config.model_id as Parameters<typeof getModel>[0]),
      system: systemPrompt,
      messages,
      maxOutputTokens: Math.min(config.max_tokens, 2048), // Telegram-friendly limit
    })

    // Delete "thinking" message and send response in chunks if needed
    await ctx.telegram.deleteMessage(chatId!, thinking.message_id).catch(() => {})

    const parts = splitTelegramMessage(text)
    for (const part of parts) {
      await ctx.reply(part, { parse_mode: "Markdown" }).catch(async () => {
        // Markdown parse failed — send as plain text
        await ctx.reply(part)
      })
    }

    // Store in Supabase
    if (OWNER_USER_ID) {
      const supabase = await createServiceClient()
      let sessionId: string | null = null

      const { data: session } = await supabase
        .from("chat_sessions")
        .select("id")
        .eq("user_id", OWNER_USER_ID)
        .ilike("title", `telegram:${chatId}%`)
        .limit(1)
        .single()

      if (session) {
        sessionId = session.id
      } else {
        const { data: newSession } = await supabase
          .from("chat_sessions")
          .insert({
            user_id: OWNER_USER_ID,
            agent_id: agentId,
            title: `telegram:${chatId}`,
          })
          .select("id")
          .single()
        sessionId = newSession?.id ?? null
      }

      if (sessionId) {
        await supabase.from("messages").insert([
          { session_id: sessionId, role: "user", content: userMessage },
          { session_id: sessionId, role: "assistant", content: text, model_used: config.model_id },
        ])
      }
    }
  } catch (err) {
    console.error("Telegram agent error:", err)
    await ctx.telegram.deleteMessage(chatId!, thinking.message_id).catch(() => {})
    await ctx.reply("Sorry, something went wrong. Please try again.")
  }
}

// Slash commands — force specific agents
bot.command("contract",  (ctx) => runAgentForTelegram("contract", ctx))
bot.command("research",  (ctx) => runAgentForTelegram("research", ctx))
bot.command("intake",    (ctx) => runAgentForTelegram("intake", ctx))
bot.command("docgen",    (ctx) => runAgentForTelegram("document-gen", ctx))
bot.command("billing",   (ctx) => runAgentForTelegram("billing", ctx))
bot.command("marketing", (ctx) => runAgentForTelegram("marketing", ctx))
bot.command("docket",    (ctx) => runAgentForTelegram("docket", ctx))
bot.command("conflicts", (ctx) => runAgentForTelegram("conflicts", ctx))

// Plain text — auto-route through orchestrator
bot.on("text", async (ctx) => {
  if (ctx.message.text.startsWith("/")) return

  const decision = await classifyIntent(ctx.message.text)
  await runAgentForTelegram(decision.agentId, ctx)
})

// Document upload → document library
bot.on("document", async (ctx) => {
  const chatId = ctx.chat.id
  const file = ctx.message.document

  const allowedTypes = [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ]
  if (!allowedTypes.includes(file.mime_type ?? "")) {
    await ctx.reply("Please send a PDF or DOCX file.")
    return
  }

  const msg = await ctx.reply("📄 Uploading to document library…")

  try {
    const fileLink = await ctx.telegram.getFileLink(file.file_id)
    const response = await fetch(fileLink.href)
    const arrayBuffer = await response.arrayBuffer()
    const blob = new Blob([arrayBuffer], { type: file.mime_type ?? "application/pdf" })

    const formData = new FormData()
    formData.append("file", blob, file.file_name ?? `telegram-doc-${Date.now()}.pdf`)
    formData.append("title", file.file_name ?? `Telegram Upload ${new Date().toLocaleDateString()}`)

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
    const uploadResponse = await fetch(`${appUrl}/api/documents/upload`, {
      method: "POST",
      body: formData,
    })

    if (uploadResponse.ok) {
      await ctx.telegram.deleteMessage(chatId, msg.message_id).catch(() => {})
      await ctx.reply(`✅ *${file.file_name}* added to your document library. Processing for search…`, { parse_mode: "Markdown" })
    } else {
      throw new Error("Upload failed")
    }
  } catch (err) {
    console.error("Telegram document upload error:", err)
    await ctx.telegram.deleteMessage(chatId, msg.message_id).catch(() => {})
    await ctx.reply("Failed to upload document. Please try again.")
  }
})

bot.command("start", (ctx) => {
  ctx.reply(`⚖️ *Welcome to LexOS*

Your AI law firm assistant. Here are the available commands:

/contract — Draft, review, or redline a contract
/research — Legal research and case law analysis
/intake — Client intake and communications
/docgen — Generate legal documents
/billing — Time entries and invoices
/marketing — Social content and newsletters
/docket — Deadline and SOL calculations
/conflicts — Conflict of interest check

Or just type anything — I'll route it to the right agent automatically.

You can also send PDF or DOCX files to add them to your document library.`, { parse_mode: "Markdown" })
})
