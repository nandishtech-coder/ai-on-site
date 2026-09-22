import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { getPlan } from "./plans";

const CreateBotInput = z.object({ domain: z.string().min(3) });
const BotIdInput = z.object({ botId: z.string().uuid() });
const FaqInput = z.object({
  botId: z.string().uuid(),
  question: z.string().min(3).max(500),
  answer: z.string().min(3).max(4000),
});

export const createBot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => CreateBotInput.parse(input))
  .handler(async ({ data, context }) => {
    const { normalizeDomain } = await import("./crawl.server");
    const domain = normalizeDomain(data.domain);
    const host = new URL(domain).hostname.replace(/^www\./, "");

    const { data: existing, error: countError } = await context.supabase
      .from("bots")
      .select("id, plan")
      .eq("user_id", context.userId);
    if (countError) throw new Error(countError.message);

    const plan = getPlan(existing?.[0]?.plan ?? "free");
    if ((existing?.length ?? 0) >= plan.bots) {
      throw new Error(
        `Your ${plan.name} plan includes ${plan.bots} chatbot${plan.bots > 1 ? "s" : ""}. Upgrade to add more.`,
      );
    }

    const { data: bot, error } = await context.supabase
      .from("bots")
      .insert({
        user_id: context.userId,
        domain,
        name: `${host} Assistant`,
        notification_email: context.claims?.email ?? null,
        crawl_status: "pending",
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);
    return { botId: bot.id as string };
  });

export const crawlBot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => BotIdInput.parse(input))
  .handler(async ({ data, context }) => {
    const { crawlSite, buildChunkRows } = await import("./crawl.server");

    const { data: bot, error: botError } = await context.supabase
      .from("bots")
      .select("id, domain, plan, user_id")
      .eq("id", data.botId)
      .single();
    if (botError || !bot) throw new Error("Chatbot not found.");

    const plan = getPlan(bot.plan);
    const maxPages = Math.min(plan.pages, 200);

    const setStage = async (stage: string, extra: Record<string, unknown> = {}) => {
      await context.supabase
        .from("bots")
        .update({ crawl_stage: stage, ...extra })
        .eq("id", bot.id);
    };

    try {
      await setStage("Parsing sitemap.xml & crawling internal links…", {
        crawl_status: "running",
        crawl_error: null,
      });

      const pages = await crawlSite(bot.domain, maxPages);
      if (pages.length === 0) {
        throw new Error(
          "We couldn't read any text from that website. Check the address and that the site is publicly reachable.",
        );
      }

      await setStage("Extracting clean text content…", { pages_crawled: pages.length });

      const rows = await buildChunkRows(bot.id, pages);

      await setStage("Generating vector embeddings…");

      await context.supabase.from("site_chunks").delete().eq("bot_id", bot.id).eq("source", "crawl");

      for (let i = 0; i < rows.length; i += 100) {
        const { error } = await context.supabase.from("site_chunks").insert(rows.slice(i, i + 100));
        if (error) throw new Error(error.message);
      }

      await context.supabase
        .from("bots")
        .update({
          crawl_status: "ready",
          crawl_stage: "Bot setup complete!",
          pages_crawled: pages.length,
          last_crawled_at: new Date().toISOString(),
        })
        .eq("id", bot.id);

      return { pages: pages.length, chunks: rows.length };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Crawl failed.";
      await context.supabase
        .from("bots")
        .update({ crawl_status: "failed", crawl_stage: null, crawl_error: message })
        .eq("id", bot.id);
      throw new Error(message);
    }
  });

export const addFaqChunk = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => FaqInput.parse(input))
  .handler(async ({ data, context }) => {
    const { embedTexts } = await import("./ai.server");

    const { data: bot, error: botError } = await context.supabase
      .from("bots")
      .select("id")
      .eq("id", data.botId)
      .single();
    if (botError || !bot) throw new Error("Chatbot not found.");

    const content = `Q: ${data.question}\nA: ${data.answer}`;
    const [embedding] = await embedTexts([content]);

    const { error } = await context.supabase.from("site_chunks").insert({
      bot_id: data.botId,
      url: "Custom FAQ",
      title: data.question,
      content,
      source: "faq",
      embedding: JSON.stringify(embedding ?? []),
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
