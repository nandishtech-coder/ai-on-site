import { createFileRoute, Link } from "@tanstack/react-router";
import { Activity, Bot, MessageSquare, Users, UserRoundCheck } from "lucide-react";

import { useAdminReport } from "@/lib/admin-report";

export const Route = createFileRoute("/dashboard/admin/overview")({
  head: () => ({ meta: [{ title: "Overview — Helix Admin" }, { name: "description", content: "Platform-wide accounts and chatbot activity." }, { property: "og:title", content: "Overview — Helix Admin" }, { property: "og:description", content: "Platform-wide accounts and chatbot activity." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: AdminOverview,
});

function AdminOverview() {
  const { admin, report } = useAdminReport();
  if (admin.isLoading || report.isLoading && admin.data?.isAdmin) return <p className="text-muted-foreground">Loading overview…</p>;
  if (!admin.data?.isAdmin) return <p className="text-destructive">Only admins can open this page.</p>;
  if (report.error || !report.data) return <p className="text-destructive">{report.error instanceof Error ? report.error.message : "Could not load overview."}</p>;
  const { bots, users, conversations, leads } = report.data;
  const stats = [
    { label: "Users", value: users, icon: Users, to: "/dashboard/admin" as const },
    { label: "Chatbots", value: bots.length, icon: Bot, to: "/dashboard/admin/chatbots" as const },
    { label: "Messages used", value: bots.reduce((sum, bot) => sum + bot.message_count, 0), icon: MessageSquare, to: "/dashboard/admin/usage" as const },
    { label: "Conversations", value: conversations, icon: Activity, to: "/dashboard/admin/usage" as const },
    { label: "Leads", value: leads, icon: UserRoundCheck, to: "/dashboard/admin/usage" as const },
  ];
  return <div className="space-y-8">
    <div><h1 className="font-display text-2xl font-semibold">Overview</h1><p className="text-sm text-muted-foreground">Platform activity across all accounts.</p></div>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{stats.map(({ label, value, icon: Icon, to }) => <Link key={label} to={to} className="flex items-center justify-between rounded-md border border-border bg-card p-5 transition-colors hover:bg-muted/50"><div><p className="text-sm text-muted-foreground">{label}</p><p className="mt-2 text-3xl font-semibold tabular-nums">{value.toLocaleString()}</p></div><Icon className="h-5 w-5 text-primary" /></Link>)}</div>
    <div className="border-t border-border pt-6"><h2 className="font-display text-lg font-semibold">Website training</h2><p className="mt-3 text-sm text-muted-foreground">{bots.filter((bot) => bot.crawl_status === "ready").length} ready · {bots.filter((bot) => bot.crawl_status === "failed").length} failed · {bots.filter((bot) => bot.crawl_status !== "ready" && bot.crawl_status !== "failed").length} pending or in progress</p><Link to="/dashboard/admin/chatbots" className="mt-3 inline-block text-sm font-medium text-primary hover:underline">View chatbots →</Link></div>
  </div>;
}