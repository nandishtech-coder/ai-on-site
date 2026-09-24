import { useState, type FormEvent } from "react";

import { AVATARS } from "@/lib/bot-data";

type Msg = { role: "user" | "assistant"; content: string };

export function ChatPreview(props: {
  botId: string;
  name: string;
  color: string;
  greeting: string;
  avatar: string;
  showBranding: boolean;
}) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);

  async function send(e: FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    const next: Msg[] = [...messages, { role: "user", content: text }];
    setMessages([...next, { role: "assistant", content: "…" }]);
    setBusy(true);
    try {
      const res = await fetch("/api/public/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ botId: props.botId, preview: true, messages: next }),
      });
      if (!res.ok || !res.body) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? "Something went wrong.");
      }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let answer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        answer += dec.decode(value, { stream: true });
        setMessages([...next, { role: "assistant", content: answer }]);
      }
    } catch (error) {
      setMessages([...next, { role: "assistant", content: (error as Error).message }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex h-[520px] w-full max-w-sm flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
      <div className="flex items-center gap-3 px-4 py-3 font-semibold" style={{ background: props.color, color: "#fff" }}>
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-background/20">
          {AVATARS[props.avatar] ?? "✦"}
        </span>
        {props.name}
      </div>
      <div className="flex flex-1 flex-col gap-2 overflow-y-auto bg-muted/40 p-3">
        <Bubble role="assistant" color={props.color} text={props.greeting} />
        {messages.map((m, i) => (
          <Bubble key={i} role={m.role} color={props.color} text={m.content} />
        ))}
      </div>
      <form onSubmit={send} className="flex gap-2 border-t border-border p-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a test question…"
          className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none"
        />
        <button
          disabled={busy}
          className="rounded-lg px-3 text-sm font-medium disabled:opacity-60"
          style={{ background: props.color, color: "#fff" }}
        >
          Send
        </button>
      </form>
      {props.showBranding && (
        <p className="pb-2 text-center text-[11px] text-muted-foreground">Powered by Helix</p>
      )}
    </div>
  );
}

function Bubble({ role, text, color }: { role: "user" | "assistant"; text: string; color: string }) {
  if (role === "user")
    return (
      <div className="max-w-[85%] self-end whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm" style={{ background: color, color: "#fff" }}>
        {text}
      </div>
    );
  return (
    <div className="max-w-[85%] self-start whitespace-pre-wrap rounded-2xl border border-border bg-card px-3 py-2 text-sm text-foreground">
      {text}
    </div>
  );
}
