import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Bot,
  Braces,
  Globe2,
  Inbox,
  Languages,
  Palette,
  Radar,
  RefreshCw,
  ShieldCheck,
  UserPlus,
} from "lucide-react";

import { SiteFooter } from "@/components/marketing/SiteFooter";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/features")({
  head: () => ({
    meta: [
      { title: "Features — Helix AI" },
      {
        name: "description",
        content:
          "Website crawling, retrieval-based answers, live preview customization, lead capture, conversation logs and a one-line embed script.",
      },
      { property: "og:title", content: "Features — Helix AI" },
      {
        property: "og:description",
        content: "Everything Helix does: crawl, train, customize, embed, capture leads and log every chat.",
      },
    ],
  }),
  component: FeaturesPage,
});

const ITEMS = [
  {
    icon: Radar,
    title: "Sitemap-aware crawling",
    body: "Helix reads sitemap.xml first, then follows internal links. Scripts, styles, navigation and footers are stripped so only real content is learned.",
  },
  {
    icon: Braces,
    title: "Grounded answers",
    body: "Your pages are split into overlapping chunks and matched by meaning at question time. Answers come from your site, not from guesswork.",
  },
  {
    icon: Languages,
    title: "95+ languages",
    body: "Visitors type in their own language and get a reply in the same language, from the same English content.",
  },
  {
    icon: Palette,
    title: "Live customization",
    body: "Name, colors, greeting and avatar — edited on the left, previewed in a real chat window on the right.",
  },
  {
    icon: UserPlus,
    title: "Lead capture",
    body: "When the bot can't answer, it politely asks for a name, email and phone number and files the lead in your dashboard.",
  },
  {
    icon: Inbox,
    title: "Conversation inbox",
    body: "Every chat is stored with full transcripts so you can see what your visitors actually want.",
  },
  {
    icon: RefreshCw,
    title: "Re-sync anytime",
    body: "Changed your pricing page? Re-sync in one click and the assistant learns the new content.",
  },
  {
    icon: Globe2,
    title: "Works everywhere",
    body: "One script tag drops into WordPress, Wix, Squarespace, Shopify, Webflow or hand-written HTML.",
  },
  {
    icon: ShieldCheck,
    title: "Scoped to your site",
    body: "Each assistant only ever answers from the content you indexed for that domain.",
  },
];

function FeaturesPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        <section className="bg-hero-glow border-b border-border">
          <div className="mx-auto w-full max-w-6xl px-4 py-20 text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
              <Bot className="size-3.5 text-primary" /> Features
            </span>
            <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-bold md:text-5xl">
              A support agent that actually knows your website
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
              Helix indexes your real pages, answers from them, and hands you the conversations and
              leads that come out of it.
            </p>
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-4 py-20">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {ITEMS.map((item) => (
              <div key={item.title} className="card-soft p-6">
                <span className="bg-brand-gradient flex size-10 items-center justify-center rounded-xl text-primary-foreground">
                  <item.icon className="size-5" />
                </span>
                <h2 className="mt-4 text-base font-semibold">{item.title}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{item.body}</p>
              </div>
            ))}
          </div>
          <div className="mt-12 text-center">
            <Button asChild size="lg">
              <Link to="/auth" search={{ mode: "signup", domain: undefined }}>
                Create your free chatbot
              </Link>
            </Button>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
