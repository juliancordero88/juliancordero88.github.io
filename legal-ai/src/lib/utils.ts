import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount)
}

export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str
  return str.slice(0, maxLength) + "…"
}

export function formatTokenCost(tokensIn: number, tokensOut: number, modelId: string): number {
  const costs: Record<string, { in: number; out: number }> = {
    "claude-haiku-4-5": { in: 0.00025, out: 0.00125 },
    "claude-sonnet-4-5": { in: 0.003, out: 0.015 },
    "claude-opus-4-5": { in: 0.015, out: 0.075 },
    "gpt-4o": { in: 0.0025, out: 0.01 },
    "o1": { in: 0.015, out: 0.06 },
    "gemini-2.0-flash": { in: 0.000075, out: 0.0003 },
    "text-embedding-3-small": { in: 0.00002, out: 0 },
  }
  const model = costs[modelId] ?? { in: 0.003, out: 0.015 }
  return (tokensIn / 1000) * model.in + (tokensOut / 1000) * model.out
}

export function splitTelegramMessage(text: string, maxLength = 4096): string[] {
  if (text.length <= maxLength) return [text]
  const parts: string[] = []
  let remaining = text
  while (remaining.length > 0) {
    if (remaining.length <= maxLength) {
      parts.push(remaining)
      break
    }
    let splitAt = remaining.lastIndexOf("\n", maxLength)
    if (splitAt === -1) splitAt = maxLength
    parts.push(remaining.slice(0, splitAt))
    remaining = remaining.slice(splitAt).trimStart()
  }
  return parts
}
