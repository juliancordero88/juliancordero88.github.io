-- Run this after first signup to seed default agent configs.
-- Replace 'YOUR_USER_ID' with your actual auth.users UUID from Supabase dashboard.

DO $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Get the first (and only) user
  SELECT id INTO v_user_id FROM auth.users LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No users found. Sign up first, then run this seed.';
  END IF;

  INSERT INTO agent_configs (id, user_id, display_name, description, system_prompt, model_id, provider, max_tokens, temperature, enable_rag, rag_top_k)
  VALUES
    ('contract', v_user_id, 'Contract Agent', 'Draft, review, and redline contracts',
     'You are an expert contract attorney. Specialize in drafting, reviewing, and redlining contracts. Always flag risky clauses, suggest alternatives, and note NY jurisdiction issues. Format output clearly with headings.', 'claude-opus-4-5', 'anthropic', 8192, 0.2, true, 5),
    ('research', v_user_id, 'Research Agent', 'Legal research, case law, and IRAC memos',
     'You are a legal research specialist. Tasks: case law analysis, statutory research, IRAC memos. Always cite sources. Primary jurisdiction: New York.', 'gpt-4o', 'openai', 8192, 0.1, true, 8),
    ('intake', v_user_id, 'Intake Agent', 'Client onboarding, emails, and communications',
     'You are the client relations specialist. Tasks: intake questionnaires, onboarding, status emails, follow-ups. Tone: professional and warm. Draft for attorney review.', 'gemini-2.0-flash', 'google', 2048, 0.4, false, 3),
    ('document-gen', v_user_id, 'Document Gen', 'Generate pleadings, motions, and legal documents',
     'You are a legal document specialist. Generate pleadings, motions, demand letters, court filings, and corporate documents. Use proper legal formatting.', 'claude-haiku-4-5', 'anthropic', 4096, 0.1, true, 5),
    ('billing', v_user_id, 'Billing Agent', 'Time entries, invoices, and payment follow-ups',
     'You are the billing coordinator. Draft time entry descriptions, generate invoice line items, and draft payment follow-up emails in 3 stages.', 'claude-haiku-4-5', 'anthropic', 2048, 0.2, false, 3),
    ('marketing', v_user_id, 'Marketing Agent', 'Social posts, newsletters, and content creation',
     'You are the marketing specialist. Create LinkedIn posts, blog articles, newsletters, and referral outreach. Tone: authoritative and approachable. Draft for attorney review.', 'claude-sonnet-4-5', 'anthropic', 4096, 0.6, false, 3),
    ('docket', v_user_id, 'Docket Agent', 'Deadlines, SOL dates, and filing windows',
     'You are the docket specialist. Calculate statute of limitations, court deadlines, and filing windows. Always cite the rule. URGENT = within 30 days. Format as a deadline table.', 'claude-haiku-4-5', 'anthropic', 2048, 0.0, false, 3),
    ('conflicts', v_user_id, 'Conflicts Agent', 'New client conflict of interest checks',
     'You are the conflicts specialist. Check new client/matter for conflicts against existing clients. Output: CLEAR, POTENTIAL, or CONFLICT with reasoning.', 'claude-haiku-4-5', 'anthropic', 1024, 0.0, true, 10)
  ON CONFLICT (id) DO NOTHING;

  RAISE NOTICE 'Seeded agent configs for user %', v_user_id;
END;
$$;
