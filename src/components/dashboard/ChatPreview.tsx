import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { AVATARS } from "@/lib/bot-data";
import { ChatLinks } from "@/lib/chat-links";

type Msg = { role: "user" | "assistant"; content: string };

export function ChatPreview(props: {
  botId: string;
  name: string;
  color: string;
  greeting: string;
  avatar: string;
  showBranding: boolean;
  leadCapture: boolean;
}) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [leadQuestion, setLeadQuestion] = useState("");
  const [leadOpen, setLeadOpen] = useState(false);
  const [leadSent, setLeadSent] = useState(false);
  const [leadBusy, setLeadBusy] = useState(false);
  const [leadError, setLeadError] = useState("");

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
      if (props.leadCapture && !leadSent && (/\b(service|services|website|project|build|develop|quote|hire|pricing|price|cost|interested)\b/i.test(text) || /\b(contact|email|reach out|get back to you)\b/i.test(answer))) {
        setLeadQuestion(text);
      }
    } catch (error) {
      setMessages([...next, { role: "assistant", content: (error as Error).message }]);
    } finally {
      setBusy(false);
    }
  }

  async function submitLead(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (leadBusy) return;
    setLeadBusy(true);
    setLeadError("");
    const data = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/public/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "lead", botId: props.botId, name: data.get("name"), email: data.get("email"), phone: data.get("phone"), question: leadQuestion }),
      });
      if (!res.ok) {
        const result = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(result.error ?? "Could not save your details.");
      }
      setLeadSent(true);
      setLeadOpen(false);
    } catch (error) {
      setLeadError((error as Error).message);
    } finally {
      setLeadBusy(false);
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
        {props.leadCapture && leadQuestion && !leadSent && (
          leadOpen ? (
            <form onSubmit={submitLead} className="space-y-2 rounded-lg border border-border bg-card p-3 text-sm">
              <p className="font-medium">Interested in our services? Leave your details.</p>
              <input name="name" required maxLength={200} placeholder="Name" className="w-full rounded-md border border-input bg-background px-3 py-2" />
              <input name="email" type="email" required maxLength={255} placeholder="Email" className="w-full rounded-md border border-input bg-background px-3 py-2" />
              <input name="phone" type="tel" maxLength={50} placeholder="Phone (optional)" className="w-full rounded-md border border-input bg-background px-3 py-2" />
              {leadError && <p role="alert" className="text-destructive">{leadError}</p>}
              <Button type="submit" size="sm" disabled={leadBusy}>{leadBusy ? "Sending…" : "Send details"}</Button>
            </form>
          ) : <Button type="button" variant="link" className="self-start px-0" onClick={() => setLeadOpen(true)}>Leave your contact details →</Button>
        )}
        {leadSent && <p className="text-sm text-muted-foreground">Thanks! Your details have been sent.</p>}
      </div>
      <form onSubmit={send} className="flex gap-2 border-t border-border p-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a test question…"
          className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none"
        />
        <Button
          disabled={busy}
          className="shrink-0"
        >
          Send
        </Button>
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
        <ChatLinks text={text} />
      </div>
    );
  return (
    <div className="max-w-[85%] self-start whitespace-pre-wrap rounded-2xl border border-border bg-card px-3 py-2 text-sm text-foreground">
      <ChatLinks text={text} />
    </div>
  );
}
