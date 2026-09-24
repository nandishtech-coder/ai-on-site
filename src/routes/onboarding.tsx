import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState, type FormEvent } from "react";

import { CrawlProgress, stageIndex } from "@/components/dashboard/CrawlProgress";
import { HelixMark } from "@/components/marketing/SiteHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { takePendingDomain, useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { crawlBot, createBot } from "@/lib/bots.functions";

export const Route = createFileRoute("/onboarding")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Build your chatbot — Helix AI" },
      { name: "description", content: "Enter your website and Helix trains a chatbot on it in minutes." },
      { property: "og:title", content: "Build your chatbot — Helix AI" },
      { property: "og:description", content: "Enter your website and Helix trains a chatbot on it in minutes." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Onboarding,
});

function Onboarding() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const create = useServerFn(createBot);
  const crawl = useServerFn(crawlBot);
  const [domain, setDomain] = useState("");
  const [botId, setBotId] = useState<string | null>(null);
  const [stage, setStage] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const pending = takePendingDomain();
    if (pending) setDomain(pending);
  }, []);

  useEffect(() => {
    if (!loading && !session) void navigate({ to: "/auth", search: { mode: "login" } as never });
  }, [loading, session, navigate]);

  useEffect(() => {
    if (!botId) return;
    const t = setInterval(async () => {
      const { data } = await supabase.from("bots").select("crawl_stage, crawl_status").eq("id", botId).single();
      if (data) setStage((s) => Math.max(s, stageIndex(data.crawl_stage, data.crawl_status)));
    }, 1200);
    return () => clearInterval(t);
  }, [botId]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const { botId: id } = await create({ data: { domain } });
      setBotId(id);
      await crawl({ data: { botId: id } });
      setStage(4);
      setTimeout(() => void navigate({ to: "/dashboard/bot/$botId", params: { botId: id } }), 1200);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-hero-glow px-4">
      <div className="card-soft w-full max-w-lg rounded-3xl border border-border bg-card p-8">
        <div className="mb-6 flex items-center gap-2 font-display text-lg font-semibold">
          <HelixMark /> Helix AI
        </div>
        {!botId ? (
          <form onSubmit={submit} className="space-y-4">
            <h1 className="font-display text-2xl font-semibold">Which website should your bot learn?</h1>
            <p className="text-sm text-muted-foreground">We'll read your public pages and train a chatbot on them.</p>
            <Input value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="www.yourcompany.com" required />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={submitting}>
              Build Helix Bot
            </Button>
          </form>
        ) : (
          <div className="space-y-5">
            <h1 className="font-display text-2xl font-semibold">Training your chatbot</h1>
            <CrawlProgress current={stage} />
            {error && (
              <div className="space-y-3">
                <p className="text-sm text-destructive">{error}</p>
                <Button variant="outline" onClick={() => void navigate({ to: "/dashboard/bot/$botId", params: { botId } })}>
                  Continue to dashboard
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
