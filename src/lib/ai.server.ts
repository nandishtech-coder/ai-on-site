export const EMBEDDING_MODEL = "models/text-embedding-004";
export const CHAT_MODEL = "gemini-1.5-flash";

export function requireGeminiApiKey(): string {
  const key = process.env["GEMINI_API_KEY"];
  if (!key) throw new Error("GEMINI_API_KEY is not configured");
  return key;
}

/** Returns one 768-dimension embedding per input string, in order. */
export async function embedTexts(texts: string[]): Promise<number[][]> {
  const key = requireGeminiApiKey();
  const out: number[][] = [];

  for (let i = 0; i < texts.length; i += 32) {
    const batch = texts.slice(i, i + 32);
    
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:batchEmbedContents?key=${key}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        requests: batch.map(text => ({
          model: "models/text-embedding-004",
          content: { parts: [{ text }] }
        }))
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Embedding request failed [${response.status}]: ${body}`);
    }

    const payload = await response.json();
    for (const item of payload.embeddings) {
      out.push(item.values);
    }
  }

  return out;
}

/**
 * Streams a grounded answer from Gemini API and yields plain text deltas.
 */
export async function* streamGroundedAnswer(input: {
  system: string;
  messages: { role: "user" | "assistant"; content: string }[];
  signal?: AbortSignal;
}): AsyncGenerator<string> {
  const key = requireGeminiApiKey();

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${CHAT_MODEL}:streamGenerateContent?alt=sse&key=${key}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    signal: input.signal ?? null,
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: input.system }]
      },
      contents: input.messages.map((message) => ({
        role: message.role === "assistant" ? "model" : "user",
        parts: [{ text: message.content }]
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
          const event = JSON.parse(data);
          const deltaText = event?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (deltaText) {
            yield deltaText;
          }
        } catch {
          // ignore parsing errors for partial chunks
        }
      }
    }
  }
}
