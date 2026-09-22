CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE public.bots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL DEFAULT 'Helix Assistant',
  domain VARCHAR(255) NOT NULL,
  primary_color VARCHAR(7) NOT NULL DEFAULT '#6366F1',
  greeting_message TEXT NOT NULL DEFAULT 'Hi there! How can I help you today?',
  system_prompt TEXT,
  notification_email VARCHAR(255),
  avatar_key VARCHAR(32) NOT NULL DEFAULT 'bot',
  show_branding BOOLEAN NOT NULL DEFAULT true,
  lead_capture_enabled BOOLEAN NOT NULL DEFAULT false,
  plan VARCHAR(20) NOT NULL DEFAULT 'free',
  crawl_status VARCHAR(20) NOT NULL DEFAULT 'pending',
  crawl_stage VARCHAR(80),
  crawl_error TEXT,
  pages_crawled INTEGER NOT NULL DEFAULT 0,
  message_count INTEGER NOT NULL DEFAULT 0,
  last_crawled_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE public.site_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_id UUID NOT NULL REFERENCES public.bots(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  title TEXT,
  content TEXT NOT NULL,
  source VARCHAR(20) NOT NULL DEFAULT 'crawl',
  embedding VECTOR(1536),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_id UUID NOT NULL REFERENCES public.bots(id) ON DELETE CASCADE,
  visitor_email VARCHAR(255),
  answered_count INTEGER NOT NULL DEFAULT 0,
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_id UUID NOT NULL REFERENCES public.bots(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE SET NULL,
  name VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(64),
  question TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX site_chunks_bot_id_idx ON public.site_chunks(bot_id);
CREATE INDEX site_chunks_embedding_idx ON public.site_chunks USING hnsw (embedding vector_cosine_ops);
CREATE INDEX conversations_bot_id_idx ON public.conversations(bot_id, created_at DESC);
CREATE INDEX leads_bot_id_idx ON public.leads(bot_id, created_at DESC);
CREATE INDEX bots_user_id_idx ON public.bots(user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.bots TO authenticated;
GRANT ALL ON public.bots TO service_role;
GRANT SELECT ON public.bots TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_chunks TO authenticated;
GRANT ALL ON public.site_chunks TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.conversations TO authenticated;
GRANT ALL ON public.conversations TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.leads TO authenticated;
GRANT ALL ON public.leads TO service_role;

ALTER TABLE public.bots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage their bots" ON public.bots FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Anyone can read active bots" ON public.bots FOR SELECT TO anon
  USING (is_active = true);

CREATE POLICY "Owners manage their site chunks" ON public.site_chunks FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.bots b WHERE b.id = site_chunks.bot_id AND b.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.bots b WHERE b.id = site_chunks.bot_id AND b.user_id = auth.uid()));

CREATE POLICY "Owners read their conversations" ON public.conversations FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.bots b WHERE b.id = conversations.bot_id AND b.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.bots b WHERE b.id = conversations.bot_id AND b.user_id = auth.uid()));

CREATE POLICY "Owners read their leads" ON public.leads FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.bots b WHERE b.id = leads.bot_id AND b.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.bots b WHERE b.id = leads.bot_id AND b.user_id = auth.uid()));

CREATE OR REPLACE FUNCTION public.match_site_chunks(
  p_bot_id UUID,
  query_embedding VECTOR(1536),
  match_count INTEGER DEFAULT 6
)
RETURNS TABLE (id UUID, url TEXT, title TEXT, content TEXT, similarity FLOAT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT sc.id, sc.url, sc.title, sc.content, 1 - (sc.embedding <=> query_embedding) AS similarity
  FROM public.site_chunks sc
  WHERE sc.bot_id = p_bot_id AND sc.embedding IS NOT NULL
  ORDER BY sc.embedding <=> query_embedding
  LIMIT match_count;
$$;

GRANT EXECUTE ON FUNCTION public.match_site_chunks(UUID, VECTOR(1536), INTEGER) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER conversations_set_updated_at BEFORE UPDATE ON public.conversations
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();