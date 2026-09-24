import { Check, Loader2 } from "lucide-react";

export const CRAWL_STAGES = [
  "Parsing sitemap.xml & crawling internal links…",
  "Extracting clean text content…",
  "Generating vector embeddings…",
  "Bot setup complete!",
];

export function stageIndex(stage: string | null | undefined, status: string | undefined) {
  if (status === "ready") return 4;
  const i = CRAWL_STAGES.indexOf(stage ?? "");
  return i < 0 ? 0 : i;
}

export function CrawlProgress({ current }: { current: number }) {
  const pct = Math.min(100, Math.round((current / 4) * 100));
  return (
    <div className="space-y-4">
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div className="h-full bg-brand-gradient transition-all duration-700" style={{ width: `${Math.max(pct, 8)}%` }} />
      </div>
      <ul className="space-y-3">
        {CRAWL_STAGES.map((label, i) => {
          const done = i < current || current === 4;
          const active = i === current && current < 4;
          return (
            <li key={label} className={`flex items-center gap-3 text-sm ${done || active ? "text-foreground" : "text-muted-foreground"}`}>
              <span className={`flex h-6 w-6 items-center justify-center rounded-full border ${done ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}>
                {done ? <Check className="h-3.5 w-3.5" /> : active ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : i + 1}
              </span>
              {label}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
