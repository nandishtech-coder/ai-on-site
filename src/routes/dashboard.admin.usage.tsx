import { createFileRoute } from "@tanstack/react-router";

import { useAdminReport } from "@/lib/admin-report";
import { getPlan } from "@/lib/plans";

export const Route = createFileRoute("/dashboard/admin/usage")({
  head: () => ({ meta: [{ title: "System Usage — Helix Admin" }, { name: "description", content: "Review message usage and website sync health across Helix." }, { property: "og:title", content: "System Usage — Helix Admin" }, { property: "og:description", content: "Review message usage and website sync health across Helix." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: AdminUsage,
});

function AdminUsage() {
  const { admin, report } = useAdminReport();
  if (admin.isLoading || report.isLoading && admin.data?.isAdmin) return <p className="text-muted-foreground">Loading usage…</p>;
  if (!admin.data?.isAdmin) return <p className="text-destructive">Only admins can open this page.</p>;
  if (report.error || !report.data) return <p className="text-destructive">{report.error instanceof Error ? report.error.message : "Could not load usage."}</p>;
  const { bots, conversations, leads } = report.data;
  const failed = bots.filter((bot) => bot.crawl_status === "failed");
  return <div className="space-y-8">
    <div><h1 className="font-display text-2xl font-semibold">System Usage</h1><p className="text-sm text-muted-foreground">Message counts and website training health across all chatbots.</p></div>
    <div className="grid gap-4 border-y border-border py-5 sm:grid-cols-3"><div><p className="text-sm text-muted-foreground">Messages used</p><p className="text-2xl font-semibold tabular-nums">{bots.reduce((sum, bot) => sum + bot.message_count, 0).toLocaleString()}</p></div><div><p className="text-sm text-muted-foreground">Conversations</p><p className="text-2xl font-semibold tabular-nums">{conversations.toLocaleString()}</p></div><div><p className="text-sm text-muted-foreground">Leads</p><p className="text-2xl font-semibold tabular-nums">{leads.toLocaleString()}</p></div></div>
    <section><h2 className="text-lg font-semibold">Failed website syncs ({failed.length})</h2>{failed.length === 0 ? <p className="mt-2 text-sm text-muted-foreground">No failed syncs.</p> : <div className="mt-3 divide-y divide-border border-y border-border">{failed.map((bot) => <div key={bot.id} className="py-3 text-sm"><p className="font-medium">{bot.name} · {bot.domain}</p><p className="text-muted-foreground">{bot.owner_email}</p>{bot.crawl_error && <p className="mt-1 text-destructive">{bot.crawl_error}</p>}</div>)}</div>}</section>
    <section><h2 className="text-lg font-semibold">Message usage by chatbot</h2><div className="mt-3 divide-y divide-border border-y border-border">{bots.map((bot) => { const limit = getPlan(bot.plan).messages; return <div key={bot.id} className="py-3 text-sm"><div className="flex flex-wrap justify-between gap-2"><span className="font-medium">{bot.name} <span className="font-normal text-muted-foreground">· {bot.owner_email}</span></span><span className="tabular-nums">{bot.message_count.toLocaleString()} / {limit.toLocaleString()} plan messages</span></div><div role="progressbar" aria-label={`${bot.name} message usage`} aria-valuenow={bot.message_count} aria-valuemin={0} aria-valuemax={limit} className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary" style={{ width: `${Math.min(100, bot.message_count / limit * 100)}%` }} /></div></div>; })}{bots.length === 0 && <p className="py-4 text-sm text-muted-foreground">No chatbots yet.</p>}</div><p className="mt-2 text-xs text-muted-foreground">Plan allowances shown here exclude extra messages granted to users. This is Helix message usage, not workspace AI credit balance.</p></section>
  </div>;
}