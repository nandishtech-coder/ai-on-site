const GATEWAY = "https://ai.gateway.lovable.dev/v1";

export const EMBEDDING_MODEL = "openai/text-embedding-3-small";
export const CHAT_MODEL = "openai/gpt-6-astra";

export function requireLovableApiKey(): string {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("LOVABLE_API_KEY is not configured");
  return key;
}

/** Returns one 1536-dimension embedding per input string, in order. */
export async function embedTexts(texts: string[]): Promise<number[][]> {
  const key = requireLovableApiKey();
  const out: number[][] = [];

  for (let i = 0; i < texts.length; i += 32) {
    const batch = texts.slice(i, i + 32);
    const response = await fetch(`${GATEWAY}/embeddings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": key,
        "X-Lovable-AIG-SDK": "fetch",
      },
      body: JSON.stringify({ model: EMBEDDING_MODEL, input: batch, dimensions: 1536 }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Embedding request failed [${response.status}]: ${body}`);
    }

    const payload = (await response.json()) as {
      data: { index: number; embedding: number[] }[];
    };
    const sorted = [...payload.data].sort((a, b) => a.index - b.index);
    for (const item of sorted) out.push(item.embedding);
  }

  return out;
}

/**
 * Streams a grounded answer from the gateway Responses API and yields plain text deltas.
 */
export async function* streamGroundedAnswer(input: {
  system: string;
  messages: { role: "user" | "assistant"; content: string }[];
  signal?: AbortSignal;
}): AsyncGenerator<string> {
  const key = requireLovableApiKey();

  const response = await fetch(`${GATEWAY}/responses`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": key,
      "X-Lovable-AIG-SDK": "fetch",
    },
    signal: input.signal,
    body: JSON.stringify({
      model: CHAT_MODEL,
      stream: true,
      store: false,
      instructions: input.system,
      reasoning: { effort: "low" },
      input: input.messages.map((message) => ({
        role: message.role,
        content: [
          {
            type: message.role === "assistant" ? "output_text" : "input_text",
            text: message.content,
          },
        ],
      })),
    }),
  });

  if (!response.ok || !response.body) {
    const body = await response.text().catch(() => "");
    throw new Error(`Chat request failed [${response.status}]: ${body}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const parts = buffer.split("\n\n");
    buffer = parts.pop() ?? "";

    for (const part of parts) {
      for (const line of part.split("\n")) {
        if (!line.startsWith("data:")) continue;
        const data = line.slice(5).trim();
        if (!data || data === "[DONE]") continue;
        try {
          const event = JSON.parse(data) as { type?: string; delta?: string };
          if (event.type === "response.output_text.delta" && typeof event.delta === "string") {
            yield event.delta;
          }
        } catch {
          // ignore keep-alive / non-JSON frames
        }
      }
    }
  }
}
