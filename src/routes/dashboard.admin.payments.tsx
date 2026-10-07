import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { checkAdmin } from "@/lib/admin.functions";
import { getPaymentSettings, updatePaymentSettings } from "@/lib/payments.functions";

export const Route = createFileRoute("/dashboard/admin/payments")({
  head: () => ({ meta: [{ title: "Payment Methods — Helix Admin" }, { name: "description", content: "Turn UPI and card payments on or off." }, { property: "og:title", content: "Payment Methods — Helix Admin" }, { property: "og:description", content: "Turn UPI and card payments on or off." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: PaymentsPage,
});

function PaymentsPage() {
  const check = useServerFn(checkAdmin);
  const get = useServerFn(getPaymentSettings);
  const save = useServerFn(updatePaymentSettings);
  const qc = useQueryClient();
  const admin = useQuery({ queryKey: ["is-admin"], queryFn: () => check() });
  const settings = useQuery({ queryKey: ["payment-settings"], queryFn: () => get(), enabled: !!admin.data?.isAdmin });
  const [form, setForm] = useState({ upi_enabled: true, upi_id: "", upi_name: "", qr_image: "", stripe_enabled: false });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings.data) {
      const { stripe_ready: _r, ...rest } = settings.data;
      setForm(rest);
    }
  }, [settings.data]);

  if (admin.isLoading) return <p className="text-muted-foreground">Loading…</p>;
  if (!admin.data?.isAdmin) return <p className="text-destructive">Only admins can open this page.</p>;

  function onQr(file?: File) {
    if (!file) return;
    if (file.size > 1_000_000) return toast.error("Please use an image under 1 MB.");
    const r = new FileReader();
    r.onload = () => setForm((f) => ({ ...f, qr_image: String(r.result) }));
    r.readAsDataURL(file);
  }

  async function submit() {
    setSaving(true);
    try {
      await save({ data: form });
      toast.success("Payment settings saved.");
      void qc.invalidateQueries({ queryKey: ["payment-settings"] });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const card = "space-y-4 rounded-2xl border border-border bg-card p-6";
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Payment Methods</h1>
        <p className="text-sm text-muted-foreground">Choose how users can pay. Every payment waits in Subscriptions until you approve it.</p>
      </div>

      <div className={card}>
        <div className="flex items-center justify-between">
          <div><p className="font-medium">UPI / QR code</p><p className="text-sm text-muted-foreground">Users scan or pay to your UPI ID, then enter the UTR number.</p></div>
          <Switch checked={form.upi_enabled} onCheckedChange={(v) => setForm({ ...form, upi_enabled: v })} />
        </div>
        <Input placeholder="UPI ID (e.g. yourname@okbank)" value={form.upi_id} onChange={(e) => setForm({ ...form, upi_id: e.target.value })} />
        <Input placeholder="Account holder name" value={form.upi_name} onChange={(e) => setForm({ ...form, upi_name: e.target.value })} />
        <div className="space-y-2">
          <p className="text-sm font-medium">QR code image</p>
          <input type="file" accept="image/*" onChange={(e) => onQr(e.target.files?.[0])} className="text-sm" />
          {form.qr_image && (
            <div className="flex items-end gap-3">
              <img src={form.qr_image} alt="UPI QR code" className="h-40 w-40 rounded-lg border border-border object-contain" />
              <Button size="sm" variant="outline" onClick={() => setForm({ ...form, qr_image: "" })}>Remove</Button>
            </div>
          )}
        </div>
      </div>

      <div className={card}>
        <div className="flex items-center justify-between">
          <div><p className="font-medium">Card payment (Stripe)</p><p className="text-sm text-muted-foreground">Users pay by card on Stripe's page; you approve it here after checking.</p></div>
          <Switch checked={form.stripe_enabled} onCheckedChange={(v) => setForm({ ...form, stripe_enabled: v })} />
        </div>
        <p className={`text-sm ${settings.data?.stripe_ready ? "text-primary" : "text-muted-foreground"}`}>
          {settings.data?.stripe_ready ? "Stripe key connected." : "Stripe key not added yet — card payment stays hidden from users until it is."}
        </p>
      </div>

      <Button onClick={submit} disabled={saving}>{saving ? "Saving…" : "Save settings"}</Button>
    </div>
  );
}
