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
