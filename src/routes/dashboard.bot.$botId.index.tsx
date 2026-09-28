import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Globe, MessageSquare, RefreshCw, UserPlus, CheckCircle2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { CrawlProgress, stageIndex } from "@/components/dashboard/CrawlProgress";
import { Button } from "@/components/ui/button";
import { botQuery, botStatsQuery } from "@/lib/bot-data";
import { crawlBot } from "@/lib/bots.functions";
import { getPlan } from "@/lib/plans";

export const Route = createFileRoute("/dashboard/bot/$botId/")({
  component: Overview,
});

function Overview() {
  const { botId } = Route.useParams();
  const qc = useQueryClient();
  const [syncing, setSyncing] = useState(false);
  const bot = useQuery({ ...botQuery(botId), refetchInterval: syncing ? 1200 : false });
  const stats = useQuery(botStatsQuery(botId));
  const crawl = useServerFn(crawlBot);

  const running = syncing || bot.data?.crawl_status === "running";
  useEffect(() => {
    if (bot.data?.crawl_status === "running" && !syncing) {
      const t = setTimeout(() => void bot.refetch(), 2000);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [bot, syncing]);

  if (bot.isLoading) return <p className="text-muted-foreground">Loading…</p>;
  if (!bot.data) return <p className="text-destructive">Chatbot not found.</p>;
  const b = bot.data;
  const plan = getPlan(b.plan);

  async function resync() {
    setSyncing(true);
    try {
      const r = await crawl({ data: { botId } });
      toast.success(`Re-synced ${r.pages} pages.`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSyncing(false);
      void qc.invalidateQueries({ queryKey: ["bot", botId] });
      void qc.invalidateQueries({ queryKey: ["pages", botId] });
    }
  }

  const cards = [
    { label: "Total conversations", value: stats.data?.conversations ?? "–", icon: MessageSquare },
    { label: "Answered questions", value: stats.data?.answered ?? "–", icon: CheckCircle2 },
    { label: "Leads captured", value: stats.data?.leads ?? "–", icon: UserPlus },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">{b.name}</h1>
        <p className="text-sm text-muted-foreground">Overview of your chatbot's activity.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {cards.map((c) => (
          <div key={c.label} className="card-soft rounded-2xl border border-border bg-card p-5">
            <c.icon className="h-5 w-5 text-primary" />
            <p className="mt-3 font-display text-3xl font-semibold">{c.value}</p>
            <p className="text-sm text-muted-foreground">{c.label}</p>
          </div>
        ))}
      </div>
      <div className="card-soft space-y-4 rounded-2xl border border-border bg-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <p className="flex items-center gap-2 font-medium">
              <Globe className="h-4 w-4 text-primary" /> {b.domain}
            </p>
            <p className="text-sm text-muted-foreground">
              {b.pages_crawled} pages trained · Last crawled{" "}
              {b.last_crawled_at ? new Date(b.last_crawled_at).toLocaleString() : "never"}
            </p>
            <p className="text-sm text-muted-foreground">
              {b.message_count} / {plan.messages.toLocaleString()} messages used ({plan.name} plan)
            </p>
            {b.crawl_error && (
              <div className="space-y-1 text-sm text-destructive">
                <p>Website sync could not update.</p>
                <p>{b.crawl_error}</p>
              </div>
            )}
          </div>
          <Button onClick={resync} disabled={running}>
            <RefreshCw className={`h-4 w-4 ${running ? "animate-spin" : ""}`} /> Re-sync Website
          </Button>
        </div>
        {running && <CrawlProgress current={stageIndex(b.crawl_stage, b.crawl_status)} />}
      </div>
    </div>
  );
}
