import { Fragment } from "react";

const LINK = /https?:\/\/[^\s<>"']+|www\.[^\s<>"']+/gi;

export function ChatLinks({ text }: { text: string }) {
  const parts: React.ReactNode[] = [];
  let start = 0;
  for (const match of text.matchAll(LINK)) {
    const index = match.index ?? 0;
    if (index > start) parts.push(text.slice(start, index));
    const raw = match[0];
    const trailing = raw.match(/[.,!?;:)}\]]+$/)?.[0] ?? "";
    const label = raw.slice(0, raw.length - trailing.length);
    const href = label.startsWith("www.") ? `https://${label}` : label;
    try {
      const url = new URL(href);
      if (url.protocol === "http:" || url.protocol === "https:") {
        parts.push(
          <a key={index} href={url.href} target="_blank" rel="noopener noreferrer" className="font-medium text-primary underline underline-offset-2 break-all hover:opacity-75">
            {label}
          </a>,
        );
        if (trailing) parts.push(trailing);
      } else parts.push(raw);
    } catch {
      parts.push(raw);
    }
    start = index + raw.length;
  }
  if (start < text.length) parts.push(text.slice(start));
  return <Fragment>{parts}</Fragment>;
}