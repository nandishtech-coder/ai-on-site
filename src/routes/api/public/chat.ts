import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { getPlan } from "@/lib/plans";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Expose-Headers": "X-Helix-Conversation",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });

const ChatInput = z.object({
  type: z.literal("chat").optional(),
  botId: z.string().uuid(),
  conversationId: z.string().uuid().nullable().optional(),
  preview: z.boolean().optional(),
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().min(1).max(2000) }))
    .min(1)
    .max(30),
});

const LeadInput = z.object({
  type: z.literal("lead"),
  botId: z.string().uuid(),
  conversationId: z.string().uuid().nullable().optional(),
  name: z.string().trim().min(1).max(200),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().max(50).optional(),
  question: z.string().trim().max(2000).optional(),
});

export const Route = createFileRoute("/api/public/chat")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),

      GET: async ({ request }) => {
        const botId = new URL(request.url).searchParams.get("botId") ?? "";
        if (!z.string().uuid().safeParse(botId).success) return json({ error: "Invalid bot id" }, 400);
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: bot } = await supabaseAdmin
          .from("bots")
          .select("name, primary_color, greeting_message, avatar_key, show_branding, lead_capture_enabled, plan, is_active")
          .eq("id", botId)
          .maybeSingle();
        if (!bot || !bot.is_active) return json({ error: "Chatbot not found" }, 404);
        return json({
          name: bot.name,
          primaryColor: bot.primary_color,
          greeting: bot.greeting_message,
          avatar: bot.avatar_key,
          showBranding: bot.plan === "free" ? true : bot.show_branding,
          leadCapture: bot.lead_capture_enabled,
        });
      },

      POST: async ({ request }) => {
        let raw: unknown;
        try {
          raw = await request.json();
        } catch {
          return json({ error: "Invalid JSON" }, 400);
        }
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        if ((raw as { type?: string })?.type === "lead") {
          const parsed = LeadInput.safeParse(raw);
          if (!parsed.success) return json({ error: "Please enter your name and a valid email." }, 400);
          const d = parsed.data;
          const { data: bot } = await supabaseAdmin.from("bots").select("id, is_active, lead_capture_enabled").eq("id", d.botId).maybeSingle();
          if (!bot || !bot.is_active) return json({ error: "Chatbot not found" }, 404);
          if (!bot.lead_capture_enabled) return json({ error: "Contact collection is off for this chatbot." }, 403);
          const { error } = await supabaseAdmin.from("leads").insert({
            bot_id: d.botId,
            conversation_id: d.conversationId ?? null,
            name: d.name ?? null,
            email: d.email,
            phone: d.phone ?? null,
            question: d.question ?? null,
          });
          if (error) return json({ error: "Could not save your details." }, 500);
          if (d.conversationId) {
            await supabaseAdmin
              .from("conversations")
              .update({ visitor_email: d.email })
              .eq("id", d.conversationId)
              .eq("bot_id", d.botId);
          }
          return json({ ok: true });
        }

        const parsed = ChatInput.safeParse(raw);
        if (!parsed.success) return json({ error: "Invalid request" }, 400);
        const input = parsed.data;

        const { data: bot } = await supabaseAdmin.from("bots").select("*").eq("id", input.botId).maybeSingle();
        if (!bot || !bot.is_active) return json({ error: "Chatbot not found" }, 404);

        const plan = getPlan(bot.plan);
        if (bot.message_count >= plan.messages) {
          return json({ error: "This chatbot has reached its monthly message limit." }, 429);
        }

        const { embedTexts, streamGroundedAnswer } = await import("@/lib/ai.server");
        const question = [...input.messages].reverse().find((m) => m.role === "user")?.content ?? "";

        let context = "";
        try {
          const [embedding] = await embedTexts([question]);
          const { data: matches, error: matchError } = await supabaseAdmin.rpc("match_site_chunks", {
            p_bot_id: bot.id,
            query_embedding: JSON.stringify(embedding),
            match_count: 8,
          });
          if (matchError) throw matchError;
          const selected = new Map<string, { id: string; url: string; title: string | null; content: string }>(
            (matches ?? []).map((m) => [m.id, m]),
          );
          // General service/price questions need the whole relevant page, not just
          // whichever individual chunk happens to rank highest semantically.
          if (/\b(service|services|offer|pricing|price|prices|cost|rate|rates|charge|charges|package|packages)\b|कीमत|सेवाएं|सेवा|मूल्य/i.test(question)) {
            const { data: catalog, error: catalogError } = await supabaseAdmin
              .from("site_chunks")
              .select("id, url, title, content")
              .eq("bot_id", bot.id)
              .eq("source", "crawl")
              .or("url.ilike.%/services%,url.ilike.%/pricing%,title.ilike.%services%,title.ilike.%pricing%")
              .limit(12);
            if (catalogError) throw catalogError;
            for (const chunk of catalog ?? []) selected.set(chunk.id, chunk);
          }
          context = [...selected.values()]
            .map((m) => `Source: ${m.title ?? m.url} (${m.url})\n${m.content}`)
            .join("\n\n---\n\n");
        } catch (error) {
          console.error("retrieval failed", error);
        }

        const system = [
          `You are an AI support assistant for ${bot.name}. Answer strictly using the following website context: ${context || "(no context found)"}. If unknown, politely offer to collect their contact info.`,
          bot.system_prompt ? `Additional instructions from the site owner: ${bot.system_prompt}` : "",
          "Reply in the same language the visitor writes in. Use plain text. When asked about services or prices, list the actual service names and exact prices shown in the website context, including 'onwards' or other qualifications. Do not claim prices are unavailable when they are present in the context, and never invent prices.",
        ]
          .filter(Boolean)
          .join("\n\n");

        let conversationId = input.conversationId ?? null;
        if (!input.preview && !conversationId) {
          const { data: conv } = await supabaseAdmin
            .from("conversations")
            .insert({ bot_id: bot.id, messages: [] })
            .select("id")
            .single();
          conversationId = conv?.id ?? null;
        }

        const encoder = new TextEncoder();
        const stream = new ReadableStream({
          async start(controller) {
            let answer = "";
            try {
              for await (const delta of streamGroundedAnswer({ system, messages: input.messages })) {
                answer += delta;
                controller.enqueue(encoder.encode(delta));
              }
            } catch (error) {
              console.error("chat failed", error);
              const noCredits = /\[402\]|\[403\]/.test(String((error as Error)?.message));
              const fallback = answer
                ? ""
                : noCredits
                  ? "This assistant is temporarily unavailable. Please leave your contact details or try again later."
                  : "Sorry, I'm having trouble answering right now. Please try again shortly.";
              answer += fallback;
              if (fallback) controller.enqueue(encoder.encode(fallback));
            }
            try {
              await supabaseAdmin
                .from("bots")
                .update({ message_count: bot.message_count + 1 })
                .eq("id", bot.id);
              if (conversationId) {
                const { data: conv } = await supabaseAdmin
                  .from("conversations")
                  .select("answered_count")
                  .eq("id", conversationId)
                  .eq("bot_id", bot.id)
                  .maybeSingle();
                if (conv) {
                  await supabaseAdmin
                    .from("conversations")
                    .update({
                      messages: [...input.messages, { role: "assistant", content: answer }],
                      answered_count: conv.answered_count + 1,
                      updated_at: new Date().toISOString(),
                    })
                    .eq("id", conversationId);
                }
              }
            } catch (error) {
              console.error("save failed", error);
            }
            controller.close();
          },
        });

        return new Response(stream, {
          headers: {
            ...CORS,
            "Content-Type": "text/plain; charset=utf-8",
            ...(conversationId ? { "X-Helix-Conversation": conversationId } : {}),
          },
        });
      },
    },
  },
});
