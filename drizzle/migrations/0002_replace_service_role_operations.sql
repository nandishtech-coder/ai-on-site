CREATE OR REPLACE FUNCTION public.get_public_chat_bot(p_bot_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
  SELECT jsonb_build_object(
    'id', b.id,
    'name', b.name,
    'primary_color', b.primary_color,
    'greeting_message', b.greeting_message,
    'avatar_key', b.avatar_key,
    'show_branding', CASE WHEN b.plan = 'free' THEN true ELSE b.show_branding END,
    'lead_capture_enabled', b.lead_capture_enabled,
    'plan', b.plan,
    'system_prompt', b.system_prompt,
    'can_chat', b.message_count <
      (CASE b.plan WHEN 'pro' THEN 2000 WHEN 'enterprise' THEN 50000 ELSE 100 END)
      + COALESCE((SELECT uc.extra_messages FROM public.user_credits uc WHERE uc.user_id = b.user_id), 0)
  )
  FROM public.bots b
  WHERE b.id = p_bot_id AND b.is_active = true;
$function$;

CREATE OR REPLACE FUNCTION public.get_public_catalog_chunks(p_bot_id uuid)
RETURNS TABLE(id uuid, url text, title text, content text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
  SELECT sc.id, sc.url, sc.title, sc.content
  FROM public.site_chunks sc
  JOIN public.bots b ON b.id = sc.bot_id
  WHERE sc.bot_id = p_bot_id
    AND b.is_active = true
    AND sc.source = 'crawl'
    AND (sc.url ILIKE '%/services%' OR sc.url ILIKE '%/pricing%' OR sc.title ILIKE '%services%' OR sc.title ILIKE '%pricing%')
  ORDER BY sc.url, sc.created_at
  LIMIT 12;
$function$;

CREATE OR REPLACE FUNCTION public.match_site_chunks(p_bot_id uuid, query_embedding vector, match_count integer DEFAULT 6)
RETURNS TABLE(id uuid, url text, title text, content text, similarity double precision)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
  SELECT sc.id, sc.url, sc.title, sc.content, 1 - (sc.embedding <=> query_embedding) AS similarity
  FROM public.site_chunks sc
  JOIN public.bots b ON b.id = sc.bot_id
  WHERE sc.bot_id = p_bot_id AND b.is_active = true AND sc.embedding IS NOT NULL
  ORDER BY sc.embedding <=> query_embedding
  LIMIT LEAST(GREATEST(match_count, 1), 8);
$function$;

CREATE OR REPLACE FUNCTION public.begin_public_chat(p_bot_id uuid, p_preview boolean DEFAULT false)
RETURNS TABLE(allowed boolean, conversation_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_bot public.bots%ROWTYPE;
  v_extra integer := 0;
  v_message_limit integer;
  v_conversation_id uuid := NULL;
BEGIN
  SELECT b.* INTO v_bot
  FROM public.bots b
  WHERE b.id = p_bot_id AND b.is_active = true
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::uuid;
    RETURN;
  END IF;

  SELECT COALESCE(uc.extra_messages, 0) INTO v_extra
  FROM public.user_credits uc
  WHERE uc.user_id = v_bot.user_id;
  v_extra := COALESCE(v_extra, 0);
  v_message_limit := CASE v_bot.plan WHEN 'pro' THEN 2000 WHEN 'enterprise' THEN 50000 ELSE 100 END;

  IF v_bot.message_count >= v_message_limit + v_extra THEN
    RETURN QUERY SELECT false, NULL::uuid;
    RETURN;
  END IF;

  UPDATE public.bots SET message_count = message_count + 1 WHERE id = p_bot_id;

  IF NOT COALESCE(p_preview, false) THEN
    INSERT INTO public.conversations (bot_id, messages) VALUES (p_bot_id, '[]'::jsonb)
    RETURNING id INTO v_conversation_id;
  END IF;

  RETURN QUERY SELECT true, v_conversation_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.save_public_chat_conversation(
  p_bot_id uuid,
  p_conversation_id uuid,
  p_messages jsonb,
  p_answer text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_updated integer;
BEGIN
  IF p_conversation_id IS NULL OR jsonb_typeof(p_messages) <> 'array'
    OR jsonb_array_length(p_messages) > 30 OR pg_column_size(p_messages) > 100000
    OR length(COALESCE(p_answer, '')) > 10000 THEN
    RETURN false;
  END IF;

  UPDATE public.conversations c
  SET messages = p_messages || jsonb_build_array(jsonb_build_object('role', 'assistant', 'content', p_answer)),
      answered_count = c.answered_count + 1,
      updated_at = now()
  FROM public.bots b
  WHERE c.id = p_conversation_id AND c.bot_id = p_bot_id
    AND b.id = p_bot_id AND b.is_active = true;
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated = 1;
END;
$function$;

CREATE OR REPLACE FUNCTION public.save_public_lead(
  p_bot_id uuid,
  p_conversation_id uuid,
  p_name text,
  p_email text,
  p_phone text,
  p_question text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
BEGIN
  IF length(trim(COALESCE(p_name, ''))) = 0 OR length(p_name) > 200
    OR length(COALESCE(p_email, '')) > 255
    OR p_email !~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
    OR length(COALESCE(p_phone, '')) > 50
    OR length(COALESCE(p_question, '')) > 2000 THEN
    RETURN false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.bots b
    WHERE b.id = p_bot_id AND b.is_active = true AND b.lead_capture_enabled = true
  ) THEN
    RETURN false;
  END IF;

  IF p_conversation_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = p_conversation_id AND c.bot_id = p_bot_id
  ) THEN
    RETURN false;
  END IF;

  INSERT INTO public.leads (bot_id, conversation_id, name, email, phone, question)
  VALUES (p_bot_id, p_conversation_id, trim(p_name), trim(p_email), NULLIF(trim(COALESCE(p_phone, '')), ''), NULLIF(trim(COALESCE(p_question, '')), ''));

  IF p_conversation_id IS NOT NULL THEN
    UPDATE public.conversations SET visitor_email = trim(p_email)
    WHERE id = p_conversation_id AND bot_id = p_bot_id;
  END IF;

  RETURN true;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_report()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $function$
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Forbidden: admin access only' USING ERRCODE = '42501';
  END IF;

  RETURN jsonb_build_object(
    'users', (SELECT count(*)::integer FROM auth.users),
    'conversations', (SELECT count(*)::integer FROM public.conversations),
    'leads', (SELECT count(*)::integer FROM public.leads),
    'bots', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', b.id, 'user_id', b.user_id, 'name', b.name, 'domain', b.domain,
        'plan', b.plan, 'crawl_status', b.crawl_status, 'crawl_error', b.crawl_error,
        'pages_crawled', b.pages_crawled, 'message_count', b.message_count,
        'last_crawled_at', b.last_crawled_at, 'created_at', b.created_at,
        'is_active', b.is_active, 'owner_email', COALESCE(u.email, 'Unknown user')
      ) ORDER BY b.created_at DESC)
      FROM public.bots b LEFT JOIN auth.users u ON u.id = b.user_id
    ), '[]'::jsonb)
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_list_users_with_credits()
RETURNS TABLE(id uuid, email text, created_at timestamptz, bots integer, messages_used bigint, plan text, extra_credits integer)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $function$
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Forbidden: admin access only' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT u.id, COALESCE(u.email, '')::text, u.created_at,
    (SELECT count(*)::integer FROM public.bots b WHERE b.user_id = u.id),
    (SELECT COALESCE(sum(b.message_count), 0)::bigint FROM public.bots b WHERE b.user_id = u.id),
    COALESCE((SELECT b.plan::text FROM public.bots b WHERE b.user_id = u.id ORDER BY b.created_at DESC LIMIT 1), 'free')::text,
    COALESCE(uc.extra_messages, 0)::integer
  FROM auth.users u
  LEFT JOIN public.user_credits uc ON uc.user_id = u.id
  ORDER BY u.created_at DESC;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_add_user_credits(p_user_id uuid, p_amount integer)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $function$
DECLARE
  v_extra integer;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Forbidden: admin access only' USING ERRCODE = '42501';
  END IF;
  IF p_amount IS NULL OR p_amount < -100000 OR p_amount > 100000 THEN
    RAISE EXCEPTION 'Credit adjustment is outside the allowed range' USING ERRCODE = '22023';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = p_user_id) THEN
    RAISE EXCEPTION 'User not found' USING ERRCODE = 'P0002';
  END IF;

  INSERT INTO public.user_credits (user_id, extra_messages, updated_at)
  VALUES (p_user_id, GREATEST(p_amount, 0), now())
  ON CONFLICT (user_id) DO UPDATE
    SET extra_messages = GREATEST(0, public.user_credits.extra_messages + p_amount), updated_at = now()
  RETURNING extra_messages INTO v_extra;
  RETURN v_extra;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_subscription_report()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $function$
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Forbidden: admin access only' USING ERRCODE = '42501';
  END IF;

  RETURN (
    WITH requests AS (
      SELECT r.id, r.user_id, COALESCE(r.email, u.email, '')::text AS email,
        r.plan, r.amount, r.payment_reference, r.note, r.status,
        r.created_at, r.reviewed_at
      FROM public.subscription_requests r
      LEFT JOIN auth.users u ON u.id = r.user_id
    ), members AS (
      SELECT u.id, COALESCE(u.email, '')::text AS email, u.created_at,
        COALESCE(approved.plan, bot_plan.plan, 'free')::text AS plan,
        approved.reviewed_at AS since
      FROM auth.users u
      LEFT JOIN LATERAL (
        SELECT r.plan, r.reviewed_at FROM public.subscription_requests r
        WHERE r.user_id = u.id AND r.status = 'approved'
        ORDER BY r.created_at DESC LIMIT 1
      ) approved ON true
      LEFT JOIN LATERAL (
        SELECT b.plan FROM public.bots b
        WHERE b.user_id = u.id AND b.plan <> 'free'
        ORDER BY b.created_at DESC LIMIT 1
      ) bot_plan ON true
      WHERE NOT public.has_role(u.id, 'admin'::public.app_role)
    )
    SELECT jsonb_build_object(
      'pending', COALESCE((SELECT jsonb_agg(jsonb_build_object(
        'id', r.id, 'user_id', r.user_id, 'email', r.email, 'plan', r.plan,
        'amount', r.amount, 'payment_reference', r.payment_reference, 'note', r.note,
        'status', r.status, 'created_at', r.created_at, 'reviewed_at', r.reviewed_at
      ) ORDER BY r.created_at DESC) FROM requests r WHERE r.status = 'pending'), '[]'::jsonb),
      'history', COALESCE((SELECT jsonb_agg(jsonb_build_object(
        'id', r.id, 'user_id', r.user_id, 'email', r.email, 'plan', r.plan,
        'amount', r.amount, 'payment_reference', r.payment_reference, 'note', r.note,
        'status', r.status, 'created_at', r.created_at, 'reviewed_at', r.reviewed_at
      ) ORDER BY r.created_at DESC) FROM requests r WHERE r.status <> 'pending'), '[]'::jsonb),
      'subscribed', COALESCE((SELECT jsonb_agg(jsonb_build_object(
        'id', m.id, 'email', m.email, 'createdAt', m.created_at, 'plan', m.plan, 'since', m.since
      ) ORDER BY m.created_at DESC) FROM members m WHERE m.plan <> 'free'), '[]'::jsonb),
      'unsubscribed', COALESCE((SELECT jsonb_agg(jsonb_build_object(
        'id', m.id, 'email', m.email, 'createdAt', m.created_at, 'plan', m.plan, 'since', m.since
      ) ORDER BY m.created_at DESC) FROM members m WHERE m.plan = 'free'), '[]'::jsonb)
    )
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_review_subscription(p_request_id uuid, p_approve boolean)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $function$
DECLARE
  v_request public.subscription_requests%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Forbidden: admin access only' USING ERRCODE = '42501';
  END IF;

  SELECT r.* INTO v_request FROM public.subscription_requests r WHERE r.id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found' USING ERRCODE = 'P0002';
  END IF;
  IF v_request.status <> 'pending' THEN
    RAISE EXCEPTION 'This request was already reviewed' USING ERRCODE = '22023';
  END IF;

  IF p_approve THEN
    UPDATE public.subscription_requests SET status = 'replaced'
    WHERE user_id = v_request.user_id AND status = 'approved';
    UPDATE public.bots SET plan = v_request.plan, show_branding = false WHERE user_id = v_request.user_id;
  END IF;

  UPDATE public.subscription_requests
  SET status = CASE WHEN p_approve THEN 'approved' ELSE 'rejected' END,
      reviewed_at = now()
  WHERE id = v_request.id;
  RETURN true;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_cancel_subscription(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $function$
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Forbidden: admin access only' USING ERRCODE = '42501';
  END IF;

  UPDATE public.subscription_requests
  SET status = 'cancelled', reviewed_at = now()
  WHERE user_id = p_user_id AND status = 'approved';
  UPDATE public.bots SET plan = 'free', show_branding = true WHERE user_id = p_user_id;
  RETURN true;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_update_payment_settings(
  p_upi_enabled boolean,
  p_upi_id text,
  p_upi_name text,
  p_qr_image text,
  p_stripe_enabled boolean
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $function$
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Forbidden: admin access only' USING ERRCODE = '42501';
  END IF;
  IF length(COALESCE(p_upi_id, '')) > 100 OR length(COALESCE(p_upi_name, '')) > 100
    OR length(COALESCE(p_qr_image, '')) > 1500000 THEN
    RAISE EXCEPTION 'Payment settings exceed the allowed size' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.payment_settings (id, upi_enabled, upi_id, upi_name, qr_image, stripe_enabled, updated_at)
  VALUES (1, p_upi_enabled, p_upi_id, p_upi_name, p_qr_image, p_stripe_enabled, now())
  ON CONFLICT (id) DO UPDATE SET
    upi_enabled = EXCLUDED.upi_enabled,
    upi_id = EXCLUDED.upi_id,
    upi_name = EXCLUDED.upi_name,
    qr_image = EXCLUDED.qr_image,
    stripe_enabled = EXCLUDED.stripe_enabled,
    updated_at = now();
  RETURN true;
END;
$function$;

REVOKE ALL ON FUNCTION public.get_public_chat_bot(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_chat_bot(uuid) TO anon, authenticated;
REVOKE ALL ON FUNCTION public.get_public_catalog_chunks(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_catalog_chunks(uuid) TO anon, authenticated;
REVOKE ALL ON FUNCTION public.match_site_chunks(uuid, vector, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.match_site_chunks(uuid, vector, integer) TO anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.begin_public_chat(uuid, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.begin_public_chat(uuid, boolean) TO anon, authenticated;
REVOKE ALL ON FUNCTION public.save_public_chat_conversation(uuid, uuid, jsonb, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_public_chat_conversation(uuid, uuid, jsonb, text) TO anon, authenticated;
REVOKE ALL ON FUNCTION public.save_public_lead(uuid, uuid, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_public_lead(uuid, uuid, text, text, text, text) TO anon, authenticated;

REVOKE ALL ON FUNCTION public.admin_report() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_report() TO authenticated;
REVOKE ALL ON FUNCTION public.admin_list_users_with_credits() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_users_with_credits() TO authenticated;
REVOKE ALL ON FUNCTION public.admin_add_user_credits(uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_add_user_credits(uuid, integer) TO authenticated;
REVOKE ALL ON FUNCTION public.admin_subscription_report() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_subscription_report() TO authenticated;
REVOKE ALL ON FUNCTION public.admin_review_subscription(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_review_subscription(uuid, boolean) TO authenticated;
REVOKE ALL ON FUNCTION public.admin_cancel_subscription(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_cancel_subscription(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.admin_update_payment_settings(boolean, text, text, text, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_update_payment_settings(boolean, text, text, text, boolean) TO authenticated;