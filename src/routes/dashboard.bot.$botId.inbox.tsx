import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/dashboard/bot/$botId/inbox")({
  component: InboxPage,
});

type Msg = { role: string; content: string };

function InboxPage() {
  const { botId } = Route.useParams();
  const [selected, setSelected] = useState<string | null>(null);
  const convs = useQuery({
    queryKey: ["conversations", botId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("conversations")
        .select("*")
        .eq("bot_id", botId)
        .order("updated_at", { ascending: false })
        .limit(200);
      if (error) throw new Error(error.message);
      return data;
    },
  });

  const current = convs.data?.find((c) => c.id === selected) ?? convs.data?.[0];
  const messages = (current?.messages as Msg[] | undefined) ?? [];

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-semibold">Conversation Logs</h1>
      {convs.data?.length === 0 ? (
        <p className="rounded-2xl border border-border bg-card p-8 text-center text-muted-foreground">
          No conversations yet. Once visitors chat with your bot, they'll show up here.
        </p>
      ) : (
        <div className="grid min-h-[480px] overflow-hidden rounded-2xl border border-border bg-card md:grid-cols-[280px_1fr]">
          <ul className="max-h-[600px] divide-y divide-border overflow-y-auto border-r border-border">
            {convs.data?.map((c) => {
              const first = (c.messages as Msg[]).find((m) => m.role === "user");
              return (
                <li key={c.id}>
                  <button
                    onClick={() => setSelected(c.id)}
                    className={`w-full p-3 text-left text-sm hover:bg-muted ${current?.id === c.id ? "bg-muted" : ""}`}
                  >
                    <p className="truncate font-medium">{c.visitor_email ?? "Anonymous visitor"}</p>
                    <p className="truncate text-muted-foreground">{first?.content ?? "…"}</p>
                    <p className="text-xs text-muted-foreground">{new Date(c.updated_at).toLocaleString()}</p>
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="flex max-h-[600px] flex-col gap-2 overflow-y-auto p-4">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm ${m.role === "user" ? "self-end bg-primary text-primary-foreground" : "self-start border border-border bg-background"}`}
              >
                {m.content}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
