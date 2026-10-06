import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { checkAdmin } from "@/lib/admin.functions";
import { getPlan } from "@/lib/plans";
import { cancelSubscription, listSubscriptions, reviewSubscription } from "@/lib/subscriptions.functions";

export const Route = createFileRoute("/dashboard/admin/subscriptions")({
  head: () => ({ meta: [{ title: "Subscriptions — Helix Admin" }, { name: "description", content: "Approve payments and manage subscribed users." }, { property: "og:title", content: "Subscriptions — Helix Admin" }, { property: "og:description", content: "Approve payments and manage subscribed users." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: SubscriptionsPage,
});

const fmt = (d: string | null) => (d ? new Date(d).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "—");

function SubscriptionsPage() {
  const check = useServerFn(checkAdmin);
  const list = useServerFn(listSubscriptions);
  const review = useServerFn(reviewSubscription);
  const cancel = useServerFn(cancelSubscription);
  const qc = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);
  const admin = useQuery({ queryKey: ["is-admin"], queryFn: () => check() });
  const subs = useQuery({ queryKey: ["admin-subscriptions"], queryFn: () => list(), enabled: !!admin.data?.isAdmin });

  if (admin.isLoading) return <p className="text-muted-foreground">Loading…</p>;
  if (!admin.data?.isAdmin) return <p className="text-destructive">Only admins can open this page.</p>;

  async function run(id: string, fn: () => Promise<unknown>, msg: string) {
    setBusy(id);
    try {
      await fn();
      toast.success(msg);
      void qc.invalidateQueries({ queryKey: ["admin-subscriptions"] });
      void qc.invalidateQueries({ queryKey: ["admin-users"] });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  const d = subs.data;
  const table = "w-full text-sm";
  const wrap = "overflow-x-auto rounded-2xl border border-border bg-card";
  const th = "p-3 text-left font-medium text-muted-foreground";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Subscriptions</h1>
        <p className="text-sm text-muted-foreground">Check the payment reference, then approve to give the user their paid plan.</p>
      </div>
      {subs.isLoading ? <p className="text-muted-foreground">Loading…</p> : subs.error || !d ? (
        <p className="text-destructive">{(subs.error as Error)?.message ?? "Could not load."}</p>
      ) : (
        <Tabs defaultValue="pending">
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="pending">Waiting approval ({d.pending.length})</TabsTrigger>
            <TabsTrigger value="subscribed">Subscribed ({d.subscribed.length})</TabsTrigger>
            <TabsTrigger value="unsubscribed">Unsubscribed ({d.unsubscribed.length})</TabsTrigger>
            <TabsTrigger value="history">History ({d.history.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="pending">
            {d.pending.length === 0 ? <p className="py-6 text-muted-foreground">No payments waiting for approval.</p> : (
              <div className={wrap}><table className={table}>
                <thead className="border-b border-border"><tr><th className={th}>User</th><th className={th}>Plan</th><th className={th}>Payment reference</th><th className={th}>Sent</th><th className={th}></th></tr></thead>
                <tbody>{d.pending.map((r) => (
                  <tr key={r.id} className="border-b border-border last:border-0">
                    <td className="p-3 font-medium">{r.email}{r.note && <p className="text-xs font-normal text-muted-foreground">{r.note}</p>}</td>
                    <td className="p-3">{getPlan(r.plan).name} · {r.amount}</td>
                    <td className="p-3 font-mono text-xs">{r.payment_reference}</td>
                    <td className="p-3 text-muted-foreground">{fmt(r.created_at)}</td>
                    <td className="p-3"><div className="flex gap-2">
                      <Button size="sm" disabled={busy === r.id} onClick={() => run(r.id, () => review({ data: { requestId: r.id, approve: true } }), "Approved — plan activated.")}>Approve</Button>
                      <Button size="sm" variant="outline" disabled={busy === r.id} onClick={() => run(r.id, () => review({ data: { requestId: r.id, approve: false } }), "Request rejected.")}>Reject</Button>
                    </div></td>
                  </tr>))}</tbody>
              </table></div>
            )}
          </TabsContent>

          <TabsContent value="subscribed">
            {d.subscribed.length === 0 ? <p className="py-6 text-muted-foreground">No subscribed users yet.</p> : (
              <div className={wrap}><table className={table}>
                <thead className="border-b border-border"><tr><th className={th}>User</th><th className={th}>Plan</th><th className={th}>Active since</th><th className={th}></th></tr></thead>
                <tbody>{d.subscribed.map((u) => (
                  <tr key={u.id} className="border-b border-border last:border-0">
                    <td className="p-3 font-medium">{u.email}</td>
                    <td className="p-3">{getPlan(u.plan).name}</td>
                    <td className="p-3 text-muted-foreground">{fmt(u.since)}</td>
                    <td className="p-3"><Button size="sm" variant="outline" disabled={busy === u.id} onClick={() => { if (confirm(`Move ${u.email} back to Free?`)) void run(u.id, () => cancel({ data: { userId: u.id } }), "Moved to Free plan."); }}>Cancel plan</Button></td>
                  </tr>))}</tbody>
              </table></div>
            )}
          </TabsContent>

          <TabsContent value="unsubscribed">
            <div className={wrap}><table className={table}>
              <thead className="border-b border-border"><tr><th className={th}>User</th><th className={th}>Plan</th><th className={th}>Joined</th></tr></thead>
              <tbody>{d.unsubscribed.map((u) => (
                <tr key={u.id} className="border-b border-border last:border-0">
                  <td className="p-3 font-medium">{u.email}</td><td className="p-3">Free</td><td className="p-3 text-muted-foreground">{fmt(u.createdAt)}</td>
                </tr>))}</tbody>
            </table></div>
          </TabsContent>

          <TabsContent value="history">
            <div className={wrap}><table className={table}>
              <thead className="border-b border-border"><tr><th className={th}>User</th><th className={th}>Plan</th><th className={th}>Reference</th><th className={th}>Status</th><th className={th}>Reviewed</th></tr></thead>
              <tbody>{d.history.map((r) => (
                <tr key={r.id} className="border-b border-border last:border-0">
                  <td className="p-3">{r.email}</td><td className="p-3">{getPlan(r.plan).name}</td><td className="p-3 font-mono text-xs">{r.payment_reference}</td><td className="p-3 capitalize">{r.status}</td><td className="p-3 text-muted-foreground">{fmt(r.reviewed_at)}</td>
                </tr>))}</tbody>
            </table></div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
