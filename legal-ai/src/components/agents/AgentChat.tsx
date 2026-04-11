"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Send, Loader2, Copy, Check, History, X, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import type { AgentId } from "@/types/database"

interface ChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
}

interface ChatSession {
  id: string
  title: string | null
  created_at: string
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

  // Session management
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [loadingSession, setLoadingSession] = useState(false)

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Load recent sessions for this agent
  const loadSessions = useCallback(async () => {
    const res = await fetch(`/api/sessions?agent_id=${agentId}&limit=15`)
    if (res.ok) {
      const data = await res.json()
      setSessions(data.sessions ?? [])
    }
  }, [agentId])

  useEffect(() => { loadSessions() }, [loadSessions])

  // Create a new session (called on first message)
  async function ensureSession(): Promise<string> {
    if (currentSessionId) return currentSessionId
    const res = await fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agent_id: agentId, client_id: clientId ?? null, matter_id: matterId ?? null }),
    })
    if (res.ok) {
      const data = await res.json()
      setCurrentSessionId(data.session.id)
      return data.session.id
    }
    return ""
  }

  // Load a past session
  async function loadSession(session: ChatSession) {
    setLoadingSession(true)
    setShowHistory(false)
    const res = await fetch(`/api/sessions/${session.id}/messages`)
    if (res.ok) {
      const data = await res.json()
      setMessages(
        (data.messages ?? []).map((m: { id: string; role: "user" | "assistant"; content: string }) => ({
          id: m.id,
          role: m.role,
          content: m.content,
        }))
      )
      setCurrentSessionId(session.id)
    }
    setLoadingSession(false)
  }

  function newChat() {
    setMessages([])
    setCurrentSessionId(null)
    setInput("")
    setShowHistory(false)
  }

  // Persist messages to DB
  async function persistMessages(sessionId: string, userText: string, assistantText: string) {
    if (!sessionId) return
    await fetch(`/api/sessions/${sessionId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: "user", content: userText }),
    })
    await fetch(`/api/sessions/${sessionId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: "assistant", content: assistantText }),
    })
    // Refresh session list to show updated titles
    loadSessions()
  }

  const sendMessage = useCallback(async (userText: string) => {
    if (!userText.trim() || isLoading) return

    const userMessage: ChatMessage = { id: genId(), role: "user", content: userText }
    const assistantId = genId()
    setMessages((prev) => [...prev, userMessage, { id: assistantId, role: "assistant", content: "" }])
    setInput("")
    setIsLoading(true)

    abortRef.current = new AbortController()

    // Get or create session
    const sessionId = await ensureSession()

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

      // Persist to DB async
      persistMessages(sessionId, userText, accumulated)
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentId, messages, documentIds, useGlobalRAG, clientId, matterId, isLoading, currentSessionId])

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
      {/* History panel overlay */}
      {showHistory && (
        <div className="absolute inset-0 z-20 bg-gray-900/95 flex flex-col">
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-800">
            <h3 className="text-sm font-semibold text-white">Chat History</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={newChat}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-lg transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> New Chat
              </button>
              <button onClick={() => setShowHistory(false)} className="p-1.5 text-gray-500 hover:text-gray-300">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
            {sessions.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">No previous chats with {agentName}.</p>
            ) : (
              sessions.map((session) => (
                <button
                  key={session.id}
                  onClick={() => loadSession(session)}
                  className={cn(
                    "w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors",
                    session.id === currentSessionId
                      ? "bg-blue-600/15 text-blue-300"
                      : "text-gray-300 hover:bg-gray-800"
                  )}
                >
                  <p className="font-medium truncate">{session.title ?? `Chat ${new Date(session.created_at).toLocaleDateString()}`}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{new Date(session.created_at).toLocaleString()}</p>
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 relative">
        {loadingSession && (
          <div className="flex justify-center py-4">
            <Loader2 className="w-5 h-5 text-gray-500 animate-spin" />
          </div>
        )}

        {!loadingSession && messages.length === 0 && (
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
            {sessions.length > 0 && (
              <button
                onClick={() => setShowHistory(true)}
                className="mt-3 flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors"
              >
                <History className="w-3.5 h-3.5" />
                View {sessions.length} previous chat{sessions.length !== 1 ? "s" : ""}
              </button>
            )}
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
        <button
          type="button"
          onClick={() => setShowHistory(!showHistory)}
          className={cn(
            "flex items-center justify-center w-10 h-10 rounded-xl transition-colors shrink-0",
            showHistory
              ? "bg-blue-600/20 text-blue-400"
              : "bg-gray-800 hover:bg-gray-700 text-gray-400"
          )}
          title="Chat history"
        >
          <History className="w-4 h-4" />
        </button>
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
