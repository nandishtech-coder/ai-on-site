import { queryOptions } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

export const AVATARS: Record<string, string> = {
  spark: "✦",
  bot: "🤖",
  smile: "😊",
  headset: "🎧",
  friendly: "🙂",
  happy: "😄",
  cheerful: "😁",
  wink: "😉",
  cool: "😎",
  clever: "🤓",
  thoughtful: "🤔",
  professional: "🧑‍💼",
  support: "🧑‍💻",
  expert: "🧑‍🏫",
  guide: "🧑‍🚀",
  helper: "🙋",
};

export const botsQuery = () =>
  queryOptions({
    queryKey: ["bots"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bots")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw new Error(error.message);
      return data;
    },
  });

export const botQuery = (botId: string) =>
  queryOptions({
    queryKey: ["bot", botId],
    queryFn: async () => {
      const { data, error } = await supabase.from("bots").select("*").eq("id", botId).single();
      if (error) throw new Error(error.message);
      return data;
    },
  });

export const botStatsQuery = (botId: string) =>
  queryOptions({
    queryKey: ["bot-stats", botId],
    queryFn: async () => {
      const [convs, leads] = await Promise.all([
        supabase.from("conversations").select("answered_count").eq("bot_id", botId),
        supabase.from("leads").select("id", { count: "exact", head: true }).eq("bot_id", botId),
      ]);
      if (convs.error) throw new Error(convs.error.message);
      return {
        conversations: convs.data.length,
        answered: convs.data.reduce((sum, c) => sum + (c.answered_count ?? 0), 0),
        leads: leads.count ?? 0,
      };
    },
  });

export const pagesQuery = (botId: string) =>
  queryOptions({
    queryKey: ["pages", botId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_chunks")
        .select("url, title, source")
        .eq("bot_id", botId)
        .limit(3000);
      if (error) throw new Error(error.message);
      const map = new Map<string, { url: string; title: string | null; source: string; chunks: number }>();
      for (const row of data) {
        const key = row.source === "faq" ? `faq:${row.title}` : row.url;
        const existing = map.get(key);
        if (existing) existing.chunks += 1;
        else map.set(key, { url: row.url, title: row.title, source: row.source, chunks: 1 });
      }
      return [...map.values()];
    },
  });
