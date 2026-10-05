import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { Input } from "@/components/ui/input";
import { useAdminReport } from "@/lib/admin-report";

export const Route = createFileRoute("/dashboard/admin/chatbots")({
  head: () => ({ meta: [{ title: "Chatbots — Helix Admin" }, { name: "description", content: "Review chatbot owners, domains and website sync status." }, { property: "og:title", content: "Chatbots — Helix Admin" }, { property: "og:description", content: "Review chatbot owners, domains and website sync status." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: AdminChatbots,
});

function AdminChatbots() {
  const { admin, report } = useAdminReport();
  const [search, setSearch] = useState("");
  if (admin.isLoading || report.isLoading && admin.data?.isAdmin) return <p className="text-muted-foreground">Loading chatbots…</p>;
  if (!admin.data?.isAdmin) return <p className="text-destructive">Only admins can open this page.</p>;
  if (report.error || !report.data) return <p className="text-destructive">{report.error instanceof Error ? report.error.message : "Could not load chatbots."}</p>;
  const bots = report.data.bots.filter((bot) => `${bot.name} ${bot.domain} ${bot.owner_email}`.toLowerCase().includes(search.toLowerCase()));
  return <div className="space-y-6">
    <div><h1 className="font-display text-2xl font-semibold">Chatbots</h1><p className="text-sm text-muted-foreground">{report.data.bots.length} chatbots across all accounts.</p></div>
    <Input aria-label="Search chatbots" placeholder="Search name, website or owner…" className="max-w-sm" value={search} onChange={(event) => setSearch(event.target.value)} />
    <div className="overflow-x-auto rounded-md border border-border bg-card"><table className="w-full min-w-[780px] text-left text-sm"><thead className="border-b border-border text-muted-foreground"><tr><th className="p-3">Chatbot / website</th><th className="p-3">Owner</th><th className="p-3">Plan</th><th className="p-3">Pages</th><th className="p-3">Messages</th><th className="p-3">Sync status</th></tr></thead><tbody>{bots.map((bot) => <tr key={bot.id} className="border-b border-border last:border-0"><td className="p-3"><span className="block font-medium">{bot.name}</span><span className="text-muted-foreground">{bot.domain}</span></td><td className="p-3 break-all">{bot.owner_email}</td><td className="p-3 capitalize">{bot.plan}</td><td className="p-3 tabular-nums">{bot.pages_crawled}</td><td className="p-3 tabular-nums">{bot.message_count}</td><td className="p-3"><span className="capitalize">{bot.crawl_status}</span>{bot.crawl_error && <span className="block max-w-64 text-xs text-destructive" title={bot.crawl_error}>{bot.crawl_error}</span>}</td></tr>)}</tbody></table>{bots.length === 0 && <p className="p-6 text-center text-muted-foreground">No chatbots found.</p>}</div>
  </div>;
}