export type IntegrationId =
  | "google"
  | "clio"
  | "lawpay"
  | "stripe"
  | "docusign"
  | "hubspot"
  | "notion"
  | "quickbooks"
  | "calendly"
  | "square"
  | "casetext"
  | "pacer"
  | "pandadoc"
  | "slack"
  | "zapier"

export type IntegrationCapability =
  | "send_email"
  | "read_email"
  | "create_calendar_event"
  | "read_calendar"
  | "upload_drive"
  | "read_matter"
  | "write_time_entry"
  | "process_payment"
  | "create_invoice"
  | "send_for_signature"
  | "create_lead"
  | "book_consultation"
  | "sync_accounting"
  | "search_case_law"
  | "file_court_document"
  | "send_notification"
  | "trigger_webhook"

export type IntegrationCategory =
  | "productivity"
  | "practice_management"
  | "payments"
  | "esignature"
  | "marketing"
  | "knowledge"
  | "accounting"
  | "scheduling"
  | "legal_research"
  | "court_filing"
  | "communication"
  | "automation"

export type AuthType = "oauth" | "api_key"

export interface IntegrationMeta {
  id: IntegrationId
  displayName: string
  description: string
  logoEmoji: string
  category: IntegrationCategory
  authType: AuthType
  tier: 1 | 2 | 3
  capabilities: IntegrationCapability[]
  docsUrl?: string
}

export interface Integration extends IntegrationMeta {
  connect(credentials: Record<string, string>): Promise<void>
  disconnect(userId: string): Promise<void>
  healthCheck(userId: string): Promise<boolean>
}
