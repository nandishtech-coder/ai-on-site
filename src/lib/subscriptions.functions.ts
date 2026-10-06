import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getPlan } from "./plans";

async function assertAdmin(supabase: unknown, userId: string) {
  const rpc = (supabase as { rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: boolean | null }> }).rpc.bind(supabase);
  const { data } = await rpc("has_role", { _user_id: userId, _role: "admin" });
  if (!data) throw new Error("Forbidden: admin access only");
}

export const requestSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      plan: z.enum(["pro", "enterprise"]),
      paymentReference: z.string().trim().min(4).max(200),
      note: z.string().trim().max(1000).optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: pending } = await context.supabase
      .from("subscription_requests").select("id").eq("user_id", context.userId).eq("status", "pending").limit(1);
    if (pending?.length) throw new Error("You already have a payment waiting for approval.");
    const plan = getPlan(data.plan);
    const { error } = await context.supabase.from("subscription_requests").insert({
      user_id: context.userId,
      email: (context.claims?.email as string | undefined) ?? null,
      plan: plan.id,
      amount: plan.price,
      payment_reference: data.paymentReference,
      note: data.note ?? null,
      status: "pending",
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const mySubscriptionRequests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("subscription_requests").select("id, plan, amount, status, created_at, reviewed_at")
      .eq("user_id", context.userId).order("created_at", { ascending: false }).limit(10);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const listSubscriptions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const users: { id: string; email: string; createdAt: string }[] = [];
    for (let page = 1; ; page++) {
      const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 });
      if (error) throw new Error(error.message);
      users.push(...data.users.map((u) => ({ id: u.id, email: u.email ?? "", createdAt: u.created_at })));
      if (data.users.length < 1000) break;
    }
    const [{ data: requests, error: reqErr }, { data: bots }, { data: roles }] = await Promise.all([
      supabaseAdmin.from("subscription_requests").select("*").order("created_at", { ascending: false }),
      supabaseAdmin.from("bots").select("user_id, plan"),
      supabaseAdmin.from("user_roles").select("user_id, role").eq("role", "admin"),
    ]);
    if (reqErr) throw new Error(reqErr.message);
    const admins = new Set((roles ?? []).map((r) => r.user_id));
    const emails = new Map(users.map((u) => [u.id, u.email]));
    const all = requests ?? [];
    const members = users.filter((u) => !admins.has(u.id)).map((u) => {
      const approved = all.find((r) => r.user_id === u.id && r.status === "approved");
      const botPlan = (bots ?? []).find((b) => b.user_id === u.id && b.plan !== "free")?.plan;
      const plan = approved?.plan ?? botPlan ?? "free";
      return { id: u.id, email: u.email, createdAt: u.createdAt, plan, since: approved?.reviewed_at ?? null };
    });
    return {
      pending: all.filter((r) => r.status === "pending").map((r) => ({ ...r, email: r.email ?? emails.get(r.user_id) ?? "" })),
      history: all.filter((r) => r.status !== "pending").map((r) => ({ ...r, email: r.email ?? emails.get(r.user_id) ?? "" })),
      subscribed: members.filter((m) => m.plan !== "free"),
      unsubscribed: members.filter((m) => m.plan === "free"),
    };
  });

export const reviewSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ requestId: z.string().uuid(), approve: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: req, error } = await supabaseAdmin
      .from("subscription_requests").select("id, user_id, plan, status").eq("id", data.requestId).maybeSingle();
    if (error || !req) throw new Error("Request not found.");
    if (req.status !== "pending") throw new Error("This request was already reviewed.");
    const now = new Date().toISOString();
    if (data.approve) {
      // Older approvals are replaced by this one.
      await supabaseAdmin.from("subscription_requests").update({ status: "replaced" })
        .eq("user_id", req.user_id).eq("status", "approved");
      const { error: botErr } = await supabaseAdmin.from("bots")
        .update({ plan: req.plan, show_branding: false }).eq("user_id", req.user_id);
      if (botErr) throw new Error(botErr.message);
    }
    const { error: upErr } = await supabaseAdmin.from("subscription_requests")
      .update({ status: data.approve ? "approved" : "rejected", reviewed_at: now }).eq("id", req.id);
    if (upErr) throw new Error(upErr.message);
    return { ok: true };
  });

export const cancelSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ userId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("subscription_requests").update({ status: "cancelled", reviewed_at: new Date().toISOString() })
      .eq("user_id", data.userId).eq("status", "approved");
    const { error } = await supabaseAdmin.from("bots").update({ plan: "free", show_branding: true }).eq("user_id", data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
