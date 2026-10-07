import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getPlan } from "./plans";

async function assertAdmin(supabase: unknown, userId: string) {
  const rpc = (supabase as { rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: boolean | null }> }).rpc.bind(supabase);
  const { data } = await rpc("has_role", { _user_id: userId, _role: "admin" });
  if (!data) throw new Error("Forbidden: admin access only");
}

export const getPaymentSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.from("payment_settings").select("*").eq("id", 1).maybeSingle();
    if (error) throw new Error(error.message);
    return {
      upi_enabled: data?.upi_enabled ?? false,
      upi_id: data?.upi_id ?? "",
      upi_name: data?.upi_name ?? "",
      qr_image: data?.qr_image ?? "",
      stripe_enabled: data?.stripe_enabled ?? false,
      stripe_ready: !!process.env["STRIPE_SECRET_KEY"],
    };
  });

export const updatePaymentSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      upi_enabled: z.boolean(),
      upi_id: z.string().trim().max(100),
      upi_name: z.string().trim().max(100),
      qr_image: z.string().max(1_500_000),
      stripe_enabled: z.boolean(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("payment_settings")
      .upsert({ id: 1, ...data, updated_at: new Date().toISOString() });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const createStripeCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ plan: z.enum(["pro", "enterprise"]), origin: z.string().url() }).parse(d))
  .handler(async ({ data, context }) => {
    const key = process.env["STRIPE_SECRET_KEY"];
    const { data: settings } = await context.supabase.from("payment_settings").select("stripe_enabled").eq("id", 1).maybeSingle();
    if (!settings?.stripe_enabled) throw new Error("Card payment is not enabled.");
    if (!key) throw new Error("Card payment is not set up yet. Please use UPI.");
    const { data: pending } = await context.supabase
      .from("subscription_requests").select("id").eq("user_id", context.userId).eq("status", "pending").limit(1);
    if (pending?.length) throw new Error("You already have a payment waiting for approval.");
    const plan = getPlan(data.plan);
    const amount = Number(plan.price.replace(/[^\d]/g, "")) * 100;
    const body = new URLSearchParams({
      mode: "payment",
      success_url: `${data.origin}/dashboard/billing?paid=1`,
      cancel_url: `${data.origin}/dashboard/billing`,
      "line_items[0][quantity]": "1",
      "line_items[0][price_data][currency]": "inr",
      "line_items[0][price_data][unit_amount]": String(amount),
      "line_items[0][price_data][product_data][name]": `Helix ${plan.name} (1 month)`,
      client_reference_id: context.userId,
    });
    const email = context.claims?.email as string | undefined;
    if (email) body.set("customer_email", email);
    const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    const json = (await res.json()) as { id?: string; url?: string; error?: { message?: string } };
    if (!res.ok || !json.url || !json.id) throw new Error(json.error?.message ?? "Could not start card payment.");
    const { error } = await context.supabase.from("subscription_requests").insert({
      user_id: context.userId, email: email ?? null, plan: plan.id, amount: plan.price,
      payment_reference: `stripe:${json.id}`, note: "Paid by card (Stripe) — check Stripe dashboard", status: "pending",
    });
    if (error) throw new Error(error.message);
    return { url: json.url };
  });
