import { type NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"

export async function POST(req: NextRequest) {
  // Validate secret token to prevent unauthorized requests
  const secretToken = req.headers.get("x-telegram-bot-api-secret-token")
  if (
    process.env.TELEGRAM_WEBHOOK_SECRET &&
    secretToken !== process.env.TELEGRAM_WEBHOOK_SECRET
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { bot } = await import("@/lib/telegram/bot")
    await bot.handleUpdate(body)
  } catch (err) {
    console.error("Telegram webhook error:", err)
  }

  // Always return 200 — Telegram will retry if we don't
  return NextResponse.json({ ok: true })
}
