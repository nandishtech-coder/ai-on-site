import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(supabase: { rpc: (...args: never[]) => unknown }, userId: string) {
  const { data } = (await (supabase.rpc as unknown as (
    fn: string,
    args: Record<string, unknown>,
  ) => Promise<{ data: boolean | null }>)("has_role", { _user_id: userId, _role: "admin" }));
  if (!data) throw new Error("Forbidden: admin access only");
}

export const checkAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    return { isAdmin: !!data };
  });

export const getAdminReport = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase as never, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    type BotRow = {
      id: string;
      user_id: string;
      name: string;
      domain: string;
      plan: string;
      crawl_status: string;
      crawl_error: string | null;
      pages_crawled: number;
      message_count: number;
      last_crawled_at: string | null;
      created_at: string;
      is_active: boolean;
    };
    const bots: BotRow[] = [];
    for (let start = 0; ; start += 1000) {
      const { data, error } = await supabaseAdmin.from("bots")
        .select("id,user_id,name,domain,plan,crawl_status,crawl_error,pages_crawled,message_count,last_crawled_at,created_at,is_active")
        .order("created_at", { ascending: false }).range(start, start + 999);
      if (error) throw new Error(error.message);
      const batch = data ?? [];
      bots.push(...batch);
      if (batch.length < 1000) break;
    }
    const users: { id: string; email: string }[] = [];
    for (let page = 1; ; page++) {
      const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 });
      if (error) throw new Error(error.message);
      users.push(...data.users.map((user) => ({ id: user.id, email: user.email ?? "" })));
      if (data.users.length < 1000) break;
    }
    const [{ count: conversations, error: conversationError }, { count: leads, error: leadError }] = await Promise.all([
      supabaseAdmin.from("conversations").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("leads").select("id", { count: "exact", head: true }),
    ]);
    if (conversationError || leadError) throw new Error(conversationError?.message ?? leadError?.message);
    const emails = new Map(users.map((user) => [user.id, user.email]));
    return {
      users: users.length,
      conversations: conversations ?? 0,
      leads: leads ?? 0,
      bots: bots.map((bot) => ({ ...bot, owner_email: emails.get(bot.user_id) ?? "Unknown user" })),
    };
  });

export const listUsersWithCredits = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase as never, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: list, error } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    if (error) throw new Error(error.message);
    const [{ data: credits }, { data: bots }] = await Promise.all([
      supabaseAdmin.from("user_credits").select("user_id, extra_messages"),
      supabaseAdmin.from("bots").select("user_id, message_count, plan"),
    ]);
    return list.users.map((u) => {
      const own = (bots ?? []).filter((b) => b.user_id === u.id);
      return {
        id: u.id,
        email: u.email ?? "",
        createdAt: u.created_at,
        bots: own.length,
        messagesUsed: own.reduce((s, b) => s + b.message_count, 0),
        plan: own[0]?.plan ?? "free",
        extraCredits: credits?.find((c) => c.user_id === u.id)?.extra_messages ?? 0,
      };
    });
  });

export const addUserCredits = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ userId: z.string().uuid(), amount: z.number().int().min(-100000).max(100000) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase as never, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("user_credits")
      .select("extra_messages")
      .eq("user_id", data.userId)
      .maybeSingle();
    const next = Math.max(0, (row?.extra_messages ?? 0) + data.amount);
    const { error } = await supabaseAdmin
      .from("user_credits")
      .upsert({ user_id: data.userId, extra_messages: next, updated_at: new Date().toISOString() });
    if (error) throw new Error(error.message);
    return { extraCredits: next };
  });
