import { createOpenAI } from "@ai-sdk/openai";
import { streamText, type ModelMessage } from "ai";

const GATEWAY = "https://ai.gateway.lovable.dev/v1";
export const EMBEDDING_MODEL = "openai/text-embedding-3-small";
export const CHAT_MODEL = "openai/gpt-6.1-sol";
const EMBEDDING_DIMENSIONS = 1536;
const RUN_ID_HEADER = "X-Lovable-AIG-Run-ID";

function requireLovableApiKey(): string {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("LOVABLE_API_KEY is not configured");
  return key;
}

function gatewayRunIdFetch() {
  let runId: string | undefined;
  return {
    fetch: async (input: RequestInfo | URL, init?: RequestInit) => {
      const headers = new Headers(init?.headers);
      if (runId && !headers.has(RUN_ID_HEADER)) headers.set(RUN_ID_HEADER, runId);
      const response = await fetch(input, { ...init, headers });
      runId ??= response.headers.get(RUN_ID_HEADER)?.trim() || undefined;
      return response;
    },
  };
}

function responseErrorMessage(body: string): string | undefined {
  try {
    const parsed: unknown = JSON.parse(body);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return undefined;
    const record = parsed as Record<string, unknown>;
    if (typeof record["message"] === "string") return record["message"].trim().slice(0, 400);
    const detail = record["error"];
    if (typeof detail === "string") return detail.trim().slice(0, 400);
    if (detail && typeof detail === "object" && !Array.isArray(detail)) {
      const message = (detail as Record<string, unknown>)["message"];
      if (typeof message === "string") return message.trim().slice(0, 400);
    }
  } catch {
    return undefined;
  }
  return undefined;
}

class GatewayRequestError extends Error {
  constructor(
    readonly statusCode: number,
    readonly responseBody: string,
  ) {
    super(responseErrorMessage(responseBody) ?? `AI request failed with status ${statusCode}.`);
    this.name = "GatewayRequestError";
  }
}

export function getSafeAiFailure(error: unknown, fallback: string) {
  const details = error && typeof error === "object" ? (error as Record<string, unknown>) : {};
  const statusValue = details["statusCode"] ?? details["status"];
  const statusCode = typeof statusValue === "number" && statusValue >= 400 && statusValue <= 599 ? statusValue : 502;
  const body = typeof details["responseBody"] === "string" ? details["responseBody"] : "";
  const message = responseErrorMessage(body);

  if (message) return { statusCode, message };
  if (statusCode === 401) return { statusCode, message: "The chat service is not configured correctly. Please contact the site owner." };
  if (statusCode === 402) return { statusCode, message: "AI credits are unavailable for this chat. The site owner needs to add credits." };
  if (statusCode === 403) return { statusCode, message: "The chat service is currently blocked. Please contact the site owner." };
  if (statusCode === 429) return { statusCode, message: "The chat service is busy. Please try again shortly." };
  return { statusCode, message: fallback };
}

export function createAiGatewayContext() {
  const apiKey = requireLovableApiKey();
  const requestFetch = gatewayRunIdFetch();
  const openai = createOpenAI({
    baseURL: GATEWAY,
    apiKey,
    headers: {
      "Lovable-API-Key": apiKey,
      "X-Lovable-AIG-SDK": "vercel-ai-sdk",
    },
    fetch: requestFetch.fetch,
  });

  return {
    async embedTexts(texts: string[]): Promise<number[][]> {
      const embeddings: number[][] = [];

      for (let i = 0; i < texts.length; i += 32) {
        const batch = texts.slice(i, i + 32);
        const response = await requestFetch.fetch(`${GATEWAY}/embeddings`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "X-Lovable-AIG-SDK": "fetch",
          },
          body: JSON.stringify({ model: EMBEDDING_MODEL, input: batch, dimensions: EMBEDDING_DIMENSIONS }),
        });

        if (!response.ok) throw new GatewayRequestError(response.status, await response.text());

        const payload = (await response.json()) as { data: { index: number; embedding: number[] }[] };
        const ordered: Array<number[] | undefined> = Array.from({ length: batch.length });
        for (const item of payload.data) {
          if (
            !Number.isInteger(item.index) ||
            item.index < 0 ||
            item.index >= batch.length ||
            ordered[item.index] !== undefined ||
            item.embedding.length !== EMBEDDING_DIMENSIONS
          ) {
            throw new Error("The website search returned an incompatible embedding.");
          }
          ordered[item.index] = item.embedding;
        }
        for (const vector of ordered) {
          if (!vector) throw new Error("The website search returned an incomplete embedding.");
          embeddings.push(vector);
        }
      }

      return embeddings;
    },

    async *streamGroundedAnswer(input: {
      system: string;
      messages: { role: "user" | "assistant"; content: string }[];
      signal?: AbortSignal;
    }): AsyncGenerator<string> {
      const messages: ModelMessage[] = input.messages.map(({ role, content }) => ({ role, content }));
      const result = streamText({
        model: openai.responses(CHAT_MODEL),
        instructions: input.system,
        messages,
        ...(input.signal ? { abortSignal: input.signal } : {}),
        maxRetries: 0,
        providerOptions: {
          openai: {
            forceReasoning: true,
            reasoningEffort: "low",
            reasoningSummary: "auto",
            store: false,
            include: ["reasoning.encrypted_content"],
          },
        },
      });

      for await (const delta of result.textStream) yield delta;
    },
  };
}

/** Returns one compatible 1536-dimension embedding per input string, in order. */
export async function embedTexts(texts: string[]): Promise<number[][]> {
  return createAiGatewayContext().embedTexts(texts);
}
