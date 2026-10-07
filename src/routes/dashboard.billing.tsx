import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { botsQuery } from "@/lib/bot-data";
import { PLANS, getPlan, type Plan } from "@/lib/plans";
import { mySubscriptionRequests, requestSubscription } from "@/lib/subscriptions.functions";
import { createStripeCheckout, getPaymentSettings } from "@/lib/payments.functions";

export const Route = createFileRoute("/dashboard/billing")({
  head: () => ({ meta: [{ title: "Billing & Account — Helix AI" }, { name: "description", content: "Your Helix plan, usage and upgrades." }, { property: "og:title", content: "Billing & Account — Helix AI" }, { property: "og:description", content: "Your Helix plan, usage and upgrades." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Billing,
});

function Billing() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const bots = useQuery(botsQuery());
  const mineFn = useServerFn(mySubscriptionRequests);
  const requestFn = useServerFn(requestSubscription);
  const mine = useQuery({ queryKey: ["my-subscription"], queryFn: () => mineFn() });
  const payFn = useServerFn(getPaymentSettings);
  const checkoutFn = useServerFn(createStripeCheckout);
  const pay = useQuery({ queryKey: ["payment-settings"], queryFn: () => payFn() });
  const cardOn = !!pay.data?.stripe_enabled && !!pay.data?.stripe_ready;
  async function payByCard() {
    if (!selected || selected.id === "free") return;
    setSending(true);
    try {
      const { url } = await checkoutFn({ data: { plan: selected.id, origin: window.location.origin } });
      window.location.href = url;
    } catch (e) {
      toast.error((e as Error).message);
      setSending(false);
    }
  }
  const [selected, setSelected] = useState<Plan | null>(null);
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);

  const approved = mine.data?.find((r) => r.status === "approved");
  const pending = mine.data?.find((r) => r.status === "pending");
  const current = getPlan(approved?.plan ?? bots.data?.[0]?.plan);
  const messages = bots.data?.reduce((s, b) => s + b.message_count, 0) ?? 0;
  const pages = bots.data?.reduce((s, b) => s + b.pages_crawled, 0) ?? 0;

  const usage = [
    { label: "Chatbots", used: bots.data?.length ?? 0, max: current.bots },
    { label: "Pages crawled", used: pages, max: current.pages * Math.max(1, bots.data?.length ?? 1) },
    { label: "Messages", used: messages, max: current.messages },
  ];

  async function submit() {
    if (!selected || selected.id === "free") return;
    setSending(true);
    try {
      await requestFn({ data: { plan: selected.id, paymentReference: reference, note: note || undefined } });
      toast.success("Payment sent for approval. You'll get access once the admin approves it.");
      setSelected(null);
      setReference("");
      setNote("");
      void qc.invalidateQueries({ queryKey: ["my-subscription"] });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Billing & Account</h1>
        <p className="text-sm text-muted-foreground">Signed in as {user?.email}</p>
      </div>
      {pending && (
        <div className="rounded-2xl border border-primary/40 bg-primary/5 p-4 text-sm">
          Your {getPlan(pending.plan).name} payment ({pending.amount}) is waiting for admin approval.
        </div>
      )}
      <div className="card-soft space-y-4 rounded-2xl border border-border bg-card p-6">
        <p className="font-medium">Current plan: {current.name} ({current.price}{current.cadence})</p>
        {usage.map((u) => (
          <div key={u.label}>
            <div className="flex justify-between text-sm"><span>{u.label}</span><span className="text-muted-foreground">{u.used.toLocaleString()} / {u.max.toLocaleString()}</span></div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
              <div className="h-full bg-primary" style={{ width: `${Math.min(100, (u.used / u.max) * 100)}%` }} />
            </div>
          </div>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {PLANS.map((p) => {
          const isCurrent = p.id === current.id;
          const disabled = isCurrent || p.id === "free" || !!pending;
          return (
            <div key={p.id} className={`rounded-2xl border bg-card p-5 ${isCurrent ? "border-primary" : "border-border"}`}>
              <p className="font-display text-lg font-semibold">{p.name}</p>
              <p className="font-display text-3xl font-semibold">{p.price}<span className="text-sm text-muted-foreground">{p.cadence}</span></p>
              <ul className="my-4 space-y-1 text-sm text-muted-foreground">{p.features.map((f) => <li key={f}>• {f}</li>)}</ul>
              <Button variant={isCurrent ? "outline" : "default"} disabled={disabled} className="w-full" onClick={() => setSelected(p)}>
                {isCurrent ? "Current plan" : p.id === "free" ? "Free plan" : pending?.plan === p.id ? "Waiting for approval" : `Upgrade to ${p.name}`}
              </Button>
            </div>
          );
        })}
      </div>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Pay for {selected?.name} — {selected?.price}{selected?.cadence}</DialogTitle>
            <DialogDescription>
              After payment, the admin checks it and switches on your {selected?.name} features.
            </DialogDescription>
          </DialogHeader>
          {!pay.data ? <p className="text-sm text-muted-foreground">Loading…</p> : (
            <div className="space-y-4">
              {cardOn && (
                <Button className="w-full" variant="outline" disabled={sending} onClick={payByCard}>Pay by card (Stripe)</Button>
              )}
              {pay.data.upi_enabled && (
                <div className="space-y-3">
                  <div className="rounded-xl border border-border bg-muted/40 p-3 text-sm">
                    {pay.data.qr_image && <img src={pay.data.qr_image} alt="UPI QR code" className="mx-auto mb-2 h-48 w-48 rounded-lg bg-background object-contain" />}
                    <p className="font-medium">UPI ID: <span className="font-mono">{pay.data.upi_id || "Not added yet"}</span></p>
                    {pay.data.upi_name && <p className="text-xs text-muted-foreground">Name: {pay.data.upi_name}</p>}
                    <p className="text-xs text-muted-foreground">Scan or pay {selected?.price}, add your email in the payment note.</p>
                  </div>
                  <Input placeholder="UTR / transaction number" value={reference} onChange={(e) => setReference(e.target.value)} />
                  <Textarea placeholder="Anything the admin should know (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
                  <Button className="w-full" disabled={sending || reference.trim().length < 4} onClick={submit}>
                    {sending ? "Sending…" : "I've paid — send for approval"}
                  </Button>
                </div>
              )}
              {!cardOn && !pay.data.upi_enabled && <p className="text-sm text-muted-foreground">Payments are not open right now. Please try again later.</p>}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
