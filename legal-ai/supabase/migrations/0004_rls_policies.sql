-- Enable Row Level Security on all tables
ALTER TABLE agent_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_skill_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE matters ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE memory_entries ENABLE ROW LEVEL SECURITY;

-- Simple policy: users own their data
CREATE POLICY "own_agent_configs"     ON agent_configs    FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own_skill_files"       ON skill_files      FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own_chat_sessions"     ON chat_sessions    FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own_messages"          ON messages         FOR ALL USING (
  EXISTS (SELECT 1 FROM chat_sessions cs WHERE cs.id = session_id AND cs.user_id = auth.uid())
);
CREATE POLICY "own_usage_logs"        ON usage_logs       FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own_integrations"      ON integrations     FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own_clients"           ON clients          FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own_matters"           ON matters          FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own_tasks"             ON tasks            FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own_time_entries"      ON time_entries     FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own_invoices"          ON invoices         FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own_documents"         ON documents        FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own_memory_entries"    ON memory_entries   FOR ALL USING (auth.uid() = user_id);

-- Agent skill files: accessible if user owns the agent config
CREATE POLICY "own_agent_skill_files" ON agent_skill_files FOR ALL USING (
  EXISTS (SELECT 1 FROM agent_configs ac WHERE ac.id = agent_id AND ac.user_id = auth.uid())
);

-- Document chunks: accessible if user owns the parent document
CREATE POLICY "own_document_chunks"   ON document_chunks  FOR ALL USING (
  EXISTS (SELECT 1 FROM documents d WHERE d.id = document_id AND d.user_id = auth.uid())
);
