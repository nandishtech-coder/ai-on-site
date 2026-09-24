import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { botsQuery } from "@/lib/bot-data";
import { PLANS, getPlan } from "@/lib/plans";

export const Route = createFileRoute("/dashboard/billing")({
  component: Billing,
});

function Billing() {
  const { user } = useAuth();
  const bots = useQuery(botsQuery());
  const current = getPlan(bots.data?.[0]?.plan);
  const messages = bots.data?.reduce((s, b) => s + b.message_count, 0) ?? 0;
  const pages = bots.data?.reduce((s, b) => s + b.pages_crawled, 0) ?? 0;

  const usage = [
    { label: "Chatbots", used: bots.data?.length ?? 0, max: current.bots },
    { label: "Pages crawled", used: pages, max: current.pages * Math.max(1, bots.data?.length ?? 1) },
    { label: "Messages", used: messages, max: current.messages },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Billing & Account</h1>
        <p className="text-sm text-muted-foreground">Signed in as {user?.email}</p>
      </div>
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
        {PLANS.map((p) => (
          <div key={p.id} className={`rounded-2xl border bg-card p-5 ${p.id === current.id ? "border-primary" : "border-border"}`}>
            <p className="font-display text-lg font-semibold">{p.name}</p>
            <p className="font-display text-3xl font-semibold">{p.price}<span className="text-sm text-muted-foreground">{p.cadence}</span></p>
            <ul className="my-4 space-y-1 text-sm text-muted-foreground">{p.features.map((f) => <li key={f}>• {f}</li>)}</ul>
            <Button
              variant={p.id === current.id ? "outline" : "default"}
              disabled={p.id === current.id}
              className="w-full"
              onClick={() => toast.info("Online upgrades are coming soon — contact us to switch plans.")}
            >
              {p.id === current.id ? "Current plan" : `Upgrade to ${p.name}`}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
