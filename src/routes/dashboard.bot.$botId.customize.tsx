import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Trash2 } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";

import { ChatPreview } from "@/components/dashboard/ChatPreview";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { AVATARS, botQuery, pagesQuery } from "@/lib/bot-data";
import { addFaqChunk } from "@/lib/bots.functions";

export const Route = createFileRoute("/dashboard/bot/$botId/customize")({
  component: Customize,
});

type Form = {
  name: string;
  primary_color: string;
  greeting_message: string;
  avatar_key: string;
  show_branding: boolean;
  lead_capture_enabled: boolean;
  system_prompt: string;
};

function Customize() {
  const { botId } = Route.useParams();
  const qc = useQueryClient();
  const bot = useQuery(botQuery(botId));
  const pages = useQuery(pagesQuery(botId));
  const addFaq = useServerFn(addFaqChunk);
  const [form, setForm] = useState<Form | null>(null);
  const [saving, setSaving] = useState(false);
  const [q, setQ] = useState("");
  const [a, setA] = useState("");

  useEffect(() => {
    if (bot.data)
      setForm({
        name: bot.data.name,
        primary_color: bot.data.primary_color,
        greeting_message: bot.data.greeting_message,
        avatar_key: bot.data.avatar_key,
        show_branding: bot.data.show_branding,
        lead_capture_enabled: bot.data.lead_capture_enabled,
        system_prompt: bot.data.system_prompt ?? "",
      });
  }, [bot.data]);

  if (!form || !bot.data) return <p className="text-muted-foreground">Loading…</p>;
  const isFree = bot.data.plan === "free";
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm({ ...form, [k]: v });

  async function save() {
    setSaving(true);
    const { error } = await supabase
      .from("bots")
      .update({ ...form!, system_prompt: form!.system_prompt || null })
      .eq("id", botId);
    setSaving(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Changes saved.");
      void qc.invalidateQueries({ queryKey: ["bot", botId] });
      void qc.invalidateQueries({ queryKey: ["bots"] });
    }
  }

  async function removePage(url: string, source: string, title: string | null) {
    let query = supabase.from("site_chunks").delete().eq("bot_id", botId).eq("url", url);
    if (source === "faq" && title) query = query.eq("title", title);
    const { error } = await query;
    if (error) toast.error(error.message);
    else void qc.invalidateQueries({ queryKey: ["pages", botId] });
  }

  async function submitFaq(e: FormEvent) {
    e.preventDefault();
    try {
      await addFaq({ data: { botId, question: q, answer: a } });
      setQ("");
      setA("");
      toast.success("Q&A added to training data.");
      void qc.invalidateQueries({ queryKey: ["pages", botId] });
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-2xl font-semibold">Customize Bot</h1>
          <Button onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </div>
        <Tabs defaultValue="appearance">
          <TabsList>
            <TabsTrigger value="appearance">Appearance</TabsTrigger>
            <TabsTrigger value="training">Training Data</TabsTrigger>
            <TabsTrigger value="leads">Lead Capture</TabsTrigger>
          </TabsList>

          <TabsContent value="appearance" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Bot name</Label>
              <Input value={form.name} onChange={(e) => set("name", e.target.value)} maxLength={80} />
            </div>
            <div className="space-y-2">
              <Label>Primary color</Label>
              <div className="flex items-center gap-3">
                <input type="color" value={form.primary_color} onChange={(e) => set("primary_color", e.target.value)} className="h-10 w-14 cursor-pointer rounded border border-input" />
                <Input value={form.primary_color} onChange={(e) => set("primary_color", e.target.value)} className="w-32" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Greeting message</Label>
              <Textarea value={form.greeting_message} onChange={(e) => set("greeting_message", e.target.value)} maxLength={500} />
            </div>
            <div className="space-y-2">
              <Label>Avatar</Label>
              <div className="flex flex-wrap gap-2">
                {Object.entries(AVATARS).map(([key, icon]) => (
                  <Button
                    key={key}
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => set("avatar_key", key)}
                    aria-label={`Use ${key} avatar`}
                    title={`${key.charAt(0).toUpperCase()}${key.slice(1)}`}
                    className={`h-11 w-11 rounded-full text-lg ${form.avatar_key === key ? "border-primary ring-2 ring-primary/30" : ""}`}
                  >
                    {icon}
                  </Button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Extra instructions (optional)</Label>
              <Textarea value={form.system_prompt} onChange={(e) => set("system_prompt", e.target.value)} placeholder="e.g. Always mention our free consultation." maxLength={2000} />
            </div>
            <div className="flex items-center justify-between rounded-xl border border-border p-4">
              <div>
                <p className="font-medium">“Powered by Helix” badge</p>
                <p className="text-sm text-muted-foreground">{isFree ? "Removing the badge requires the Pro plan." : "Show the badge under the chat window."}</p>
              </div>
              <Switch checked={isFree ? true : form.show_branding} disabled={isFree} onCheckedChange={(v) => set("show_branding", v)} />
            </div>
          </TabsContent>

          <TabsContent value="training" className="space-y-6 pt-4">
            <div className="rounded-xl border border-border">
              <div className="border-b border-border p-4 font-medium">Trained pages ({pages.data?.length ?? 0})</div>
              <ul className="max-h-80 divide-y divide-border overflow-y-auto">
                {pages.data?.map((p) => (
                  <li key={`${p.source}:${p.url}:${p.title}`} className="flex items-center gap-3 p-3 text-sm">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{p.title || p.url}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {p.source === "faq" ? "Custom Q&A" : p.url} · {p.chunks} chunk{p.chunks > 1 ? "s" : ""}
                      </p>
                    </div>
                    <button onClick={() => void removePage(p.url, p.source, p.title)} className="text-muted-foreground hover:text-destructive" aria-label="Delete">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                ))}
                {pages.data?.length === 0 && <li className="p-4 text-sm text-muted-foreground">No pages yet — re-sync your website from Overview.</li>}
              </ul>
            </div>
            <form onSubmit={submitFaq} className="space-y-3 rounded-xl border border-border p-4">
              <p className="font-medium">Add a custom Q&A</p>
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Question" required minLength={3} />
              <Textarea value={a} onChange={(e) => setA(e.target.value)} placeholder="Answer" required minLength={3} />
              <Button type="submit" variant="outline">Add Q&A</Button>
            </form>
          </TabsContent>

          <TabsContent value="leads" className="pt-4">
            <div className="flex items-center justify-between rounded-xl border border-border p-4">
              <div>
                <p className="font-medium">Collect contact details</p>
                <p className="text-sm text-muted-foreground">Offer visitors a contact form when they ask about services or want to get in touch.</p>
              </div>
              <Switch checked={form.lead_capture_enabled} onCheckedChange={(v) => set("lead_capture_enabled", v)} />
            </div>
          </TabsContent>
        </Tabs>
      </div>
      <div className="lg:sticky lg:top-8 lg:self-start">
        <p className="mb-3 text-sm font-medium text-muted-foreground">Live preview</p>
        <ChatPreview
          botId={botId}
          name={form.name}
          color={form.primary_color}
          greeting={form.greeting_message}
          avatar={form.avatar_key}
          showBranding={isFree || form.show_branding}
          leadCapture={form.lead_capture_enabled}
        />
      </div>
    </div>
  );
}
