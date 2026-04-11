export type AgentId =
  | "contract"
  | "research"
  | "intake"
  | "document-gen"
  | "billing"
  | "marketing"
  | "docket"
  | "conflicts"

export interface AgentConfig {
  id: AgentId
  user_id: string
  display_name: string
  description: string
  system_prompt: string
  model_id: string
  provider: "anthropic" | "openai" | "google"
  max_tokens: number
  temperature: number
  enable_rag: boolean
  rag_top_k: number
  created_at: string
  updated_at: string
}

export interface SkillFile {
  id: string
  user_id: string
  name: string
  description: string | null
  content: string
  tags: string[]
  created_at: string
  updated_at: string
}

export interface AgentSkillFile {
  agent_id: AgentId
  skill_id: string
  position: number
}

export interface ChatSession {
  id: string
  user_id: string
  agent_id: AgentId
  client_id: string | null
  matter_id: string | null
  title: string | null
  created_at: string
  updated_at: string
}

export interface Message {
  id: string
  session_id: string
  role: "user" | "assistant" | "system"
  content: string
  model_used: string | null
  tokens_in: number | null
  tokens_out: number | null
  cost_usd: number | null
  created_at: string
}

export interface UsageLog {
  id: string
  user_id: string
  agent_id: string | null
  model_id: string
  tokens_in: number
  tokens_out: number
  cost_usd: number
  session_id: string | null
  created_at: string
}

export interface MemoryEntry {
  id: string
  user_id: string
  client_id: string | null
  matter_id: string | null
  content: string
  created_at: string
}

// CRM Types
export interface Client {
  id: string
  user_id: string
  full_name: string
  email: string | null
  phone: string | null
  company: string | null
  practice_area: string | null
  status: "active" | "inactive" | "prospect"
  source: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Matter {
  id: string
  user_id: string
  client_id: string
  title: string
  description: string | null
  practice_area: string | null
  status: "open" | "closed" | "on_hold"
  billing_type: "hourly" | "flat" | "contingency"
  hourly_rate: number | null
  flat_fee: number | null
  opened_date: string | null
  closed_date: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Task {
  id: string
  user_id: string
  matter_id: string | null
  title: string
  description: string | null
  priority: "low" | "medium" | "high" | "urgent"
  status: "todo" | "in_progress" | "done"
  due_date: string | null
  reminder_date: string | null
  task_type: "deadline" | "filing" | "client_contact" | "internal"
  created_at: string
  updated_at: string
}

export interface TimeEntry {
  id: string
  user_id: string
  matter_id: string
  description: string
  hours: number
  rate: number
  amount: number
  date: string
  billed: boolean
  invoice_id: string | null
  created_at: string
}

export interface Invoice {
  id: string
  user_id: string
  client_id: string
  matter_id: string | null
  invoice_number: string
  status: "draft" | "sent" | "paid" | "overdue"
  subtotal: number
  tax: number
  total: number
  issued_date: string | null
  due_date: string | null
  paid_date: string | null
  created_at: string
  updated_at: string
}

export interface Document {
  id: string
  user_id: string
  title: string
  description: string | null
  file_path: string
  file_type: "pdf" | "docx"
  file_size: number | null
  page_count: number | null
  status: "processing" | "ready" | "error"
  error_message: string | null
  created_at: string
  updated_at: string
}

export interface DocumentChunk {
  id: string
  document_id: string
  chunk_index: number
  content: string
  token_count: number | null
  metadata: Record<string, unknown>
  created_at: string
}

export interface Integration {
  id: string
  user_id: string
  provider: string
  access_token: string | null
  refresh_token: string | null
  token_expires_at: string | null
  api_key: string | null
  config: Record<string, unknown>
  enabled: boolean
  last_synced_at: string | null
  created_at: string
}
