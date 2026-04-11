"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Send, Loader2, Copy, Check } from "lucide-react"
import { cn } from "@/lib/utils"
import type { AgentId } from "@/types/database"

interface ChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
}

interface AgentChatProps {
  agentId: AgentId
  agentName: string
  sessionId?: string
  documentIds?: string[]
  useGlobalRAG?: boolean
  clientId?: string
  matterId?: string
  initialMessages?: ChatMessage[]
}

let msgCounter = 0
function genId() { return `msg-${++msgCounter}-${Date.now()}` }

export function AgentChat({
  agentId,
  agentName,
  sessionId,
  documentIds,
  useGlobalRAG,
  clientId,
  matterId,
  initialMessages = [],
}: AgentChatProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages)
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const sendMessage = useCallback(async (userText: string) => {
    if (!userText.trim() || isLoading) return

    const userMessage: ChatMessage = { id: genId(), role: "user", content: userText }
    const assistantId = genId()
    setMessages((prev) => [...prev, userMessage, { id: assistantId, role: "assistant", content: "" }])
    setInput("")
    setIsLoading(true)

    abortRef.current = new AbortController()

    try {
      const response = await fetch(`/api/agents/${agentId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: abortRef.current.signal,
        body: JSON.stringify({
          messages: [...messages, userMessage].map((m) => ({ role: m.role, content: m.content })),
          sessionId,
          documentIds,
          useGlobalRAG,
          clientId,
          matterId,
        }),
      })

      if (!response.ok || !response.body) {
        throw new Error(`HTTP ${response.status}`)
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let accumulated = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        accumulated += decoder.decode(value, { stream: true })
        setMessages((prev) =>
          prev.map((m) => m.id === assistantId ? { ...m, content: accumulated } : m)
        )
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: "Sorry, something went wrong. Please try again." }
              : m
          )
        )
      }
    } finally {
      setIsLoading(false)
    }
  }, [agentId, messages, sessionId, documentIds, useGlobalRAG, clientId, matterId, isLoading])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    await sendMessage(input)
  }

  async function copyToClipboard(text: string, id: string) {
    await navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <div className="w-12 h-12 bg-blue-600/20 rounded-xl flex items-center justify-center mb-3">
              <span className="text-blue-400 font-bold text-lg">
                {agentName.charAt(0)}
              </span>
            </div>
            <p className="text-gray-400 text-sm">
              Start a conversation with the {agentName}
            </p>
            <p className="text-gray-600 text-xs mt-1">
              Shift+Enter for new line · Enter to send
            </p>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              "flex",
              message.role === "user" ? "justify-end" : "justify-start"
            )}
          >
            <div
              className={cn(
                "max-w-[80%] rounded-2xl px-4 py-3 text-sm relative group",
                message.role === "user"
                  ? "bg-blue-600 text-white rounded-br-sm"
                  : "bg-gray-800 text-gray-100 rounded-bl-sm"
              )}
            >
              {message.role === "assistant" && (
                <p className="text-xs text-gray-500 font-medium mb-1.5">{agentName}</p>
              )}
              <div className="whitespace-pre-wrap leading-relaxed">
                {message.content || (
                  <span className="inline-flex gap-1">
                    <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce [animation-delay:0ms]" />
                    <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce [animation-delay:150ms]" />
                    <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce [animation-delay:300ms]" />
                  </span>
                )}
              </div>

              {/* Copy button for non-empty assistant messages */}
              {message.role === "assistant" && message.content && (
                <button
                  onClick={() => copyToClipboard(message.content, message.id)}
                  className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-gray-700"
                >
                  {copiedId === message.id ? (
                    <Check className="w-3.5 h-3.5 text-green-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-gray-400" />
                  )}
                </button>
              )}
            </div>
          </div>
        ))}

        <div ref={scrollRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        className="flex items-end gap-2 px-4 py-4 border-t border-gray-800"
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault()
              sendMessage(input)
            }
          }}
          rows={1}
          placeholder={`Message ${agentName}… (Enter to send)`}
          className="flex-1 resize-none bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent max-h-32 overflow-y-auto"
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="flex items-center justify-center w-10 h-10 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl transition-colors shrink-0"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 text-white animate-spin" />
          ) : (
            <Send className="w-4 h-4 text-white" />
          )}
        </button>
      </form>
    </div>
  )
}
