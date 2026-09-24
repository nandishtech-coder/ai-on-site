import { createFileRoute } from "@tanstack/react-router";
import { Copy } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/dashboard/bot/$botId/embed")({
  component: EmbedPage,
});

const PLATFORMS: { id: string; name: string; steps: string[] }[] = [
  { id: "wordpress", name: "WordPress", steps: ["Install the free “WPCode” (Insert Headers and Footers) plugin.", "Go to Code Snippets → Header & Footer.", "Paste the snippet into the Footer box and save."] },
  { id: "wix", name: "Wix", steps: ["Open Settings → Custom Code in your Wix dashboard.", "Click “+ Add Custom Code” and paste the snippet.", "Choose “All pages”, place it in Body – end, and apply."] },
  { id: "squarespace", name: "Squarespace", steps: ["Go to Settings → Advanced → Code Injection.", "Paste the snippet into the Footer field.", "Save — the chat bubble appears on every page."] },
  { id: "shopify", name: "Shopify", steps: ["Open Online Store → Themes → ⋯ → Edit code.", "Open layout/theme.liquid.", "Paste the snippet just before </body> and save."] },
  { id: "webflow", name: "Webflow", steps: ["Open Project Settings → Custom Code.", "Paste the snippet into the Footer Code box.", "Save and publish your site."] },
];

function EmbedPage() {
  const { botId } = Route.useParams();
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);
  const snippet = `<script src="${origin}/widget.js" data-bot-id="${botId}" defer></script>`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Embed Code</h1>
        <p className="text-sm text-muted-foreground">Paste this one line on your website to show the chat bubble.</p>
      </div>
      <div className="card-soft rounded-2xl border border-border bg-card p-5">
        <pre className="overflow-x-auto rounded-xl bg-muted p-4 text-sm"><code>{snippet}</code></pre>
        <Button
          className="mt-4"
          onClick={() => {
            void navigator.clipboard.writeText(snippet);
            toast.success("Snippet copied.");
          }}
        >
          <Copy className="h-4 w-4" /> Copy snippet
        </Button>
      </div>
      <Tabs defaultValue="wordpress">
        <TabsList className="flex-wrap">
          {PLATFORMS.map((p) => (
            <TabsTrigger key={p.id} value={p.id}>{p.name}</TabsTrigger>
          ))}
        </TabsList>
        {PLATFORMS.map((p) => (
          <TabsContent key={p.id} value={p.id}>
            <ol className="list-decimal space-y-2 rounded-2xl border border-border bg-card p-6 pl-10 text-sm">
              {p.steps.map((s) => <li key={s}>{s}</li>)}
            </ol>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
