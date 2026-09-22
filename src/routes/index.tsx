import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  ArrowRight,
  Bot,
  Code2,
  Globe2,
  Inbox,
  MousePointerClick,
  Palette,
  Rocket,
  Search,
} from "lucide-react";
import { useState } from "react";

import { PricingSection } from "@/components/marketing/PricingSection";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Helix AI — AI chatbot for your website in minutes" },
      {
        name: "description",
        content:
          "Enter your website URL and Helix crawls your pages, trains an AI support agent and gives you a one-line script to go live.",
      },
      { property: "og:title", content: "AI Chatbot for Your Website in Minutes" },
      {
        property: "og:description",
        content:
          "Helix turns your website into a smart, 24/7 AI support agent. Just enter your URL, copy a line of code, and go live.",
      },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  {
    icon: Rocket,
    title: "Launches in Minutes",
    body: "No coding required. Enter a URL, and your assistant is live before your coffee is cold.",
  },
  {
    icon: Search,
    title: "Instant Web Scraping",
    body: "Learns directly from your web pages and FAQs, so answers always match your site.",
  },
  {
    icon: Globe2,
    title: "Multi-Language Support",
    body: "Responds automatically in 95+ languages — whatever language the visitor types in.",
  },
  {
    icon: Inbox,
    title: "Inbox & Logs",
    body: "Sends visitor queries straight to your dashboard or email, with full transcripts.",
  },
];

const STEPS = [
  {
    icon: Globe2,
    title: "Enter your domain",
    body: "Helix parses your sitemap, crawls internal pages and indexes every answer it finds.",
  },
  {
    icon: Palette,
    title: "Customize your bot",
    body: "Pick colors, a bot name and a welcome greeting. Preview it live before you publish.",
  },
  {
    icon: Code2,
    title: "Paste one line of code",
    body: "Works with WordPress, Wix, Shopify, Squarespace, Webflow or plain custom HTML.",
  },
];

function Landing() {
  const navigate = useNavigate();
  const [domain, setDomain] = useState("");

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const value = domain.trim();
    navigate({
      to: "/auth",
      search: { mode: "signup", domain: value ? value : undefined },
    });
  };

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <main className="flex-1">
        {/* Hero */}
        <section className="bg-hero-glow border-b border-border">
          <div className="mx-auto grid w-full max-w-6xl gap-12 px-4 py-20 lg:grid-cols-[1.05fr_0.95fr] lg:py-28">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
                <Bot className="size-3.5 text-primary" /> Trained on your own website
              </span>
              <h1 className="mt-6 text-4xl leading-[1.05] font-bold md:text-6xl">
                AI Chatbot for Your Website{" "}
                <span className="text-brand-gradient">in Minutes</span>
              </h1>
              <p className="mt-5 max-w-xl text-lg text-muted-foreground">
                Quick answers for your visitors with ease. Helix turns your website into a smart,
                24/7 AI support agent. Just enter your URL, copy a line of code, and go live.
              </p>

              <form
                onSubmit={submit}
                className="card-soft mt-8 flex flex-col gap-3 p-3 sm:flex-row sm:items-center"
              >
                <Input
                  value={domain}
                  onChange={(event) => setDomain(event.target.value)}
                  placeholder="Enter your website URL (e.g. mycompany.com)"
                  aria-label="Website URL"
                  className="h-12 border-0 bg-transparent text-base shadow-none focus-visible:ring-0"
                />
                <Button type="submit" size="lg" className="h-12 shrink-0">
                  Create Free Chatbot <ArrowRight className="ml-1 size-4" />
                </Button>
              </form>
              <p className="mt-3 text-xs text-muted-foreground">
                Free forever plan. No credit card, no code, no setup calls.
              </p>
            </div>

            <div className="relative">
              <div className="card-soft overflow-hidden shadow-lift">
                <div className="bg-brand-gradient flex items-center gap-3 px-5 py-4 text-primary-foreground">
                  <span className="flex size-9 items-center justify-center rounded-full bg-white/20">
                    <Bot className="size-5" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold">Helix Assistant</p>
                    <p className="text-xs opacity-80">Online • replies instantly</p>
                  </div>
                </div>
                <div className="space-y-3 p-5">
                  <ChatBubble side="bot">Hi there! How can I help you today?</ChatBubble>
                  <ChatBubble side="user">Do you ship to Germany and how long does it take?</ChatBubble>
                  <ChatBubble side="bot">
                    Yes — we ship to Germany with DHL. Standard delivery takes 3–5 business days and
                    is free over €50. Want me to send the full shipping policy?
                  </ChatBubble>
                  <ChatBubble side="user">Sprichst du Deutsch?</ChatBubble>
                  <ChatBubble side="bot">
                    Natürlich! Ich antworte gern auf Deutsch. Wie kann ich helfen?
                  </ChatBubble>
                </div>
                <div className="flex items-center gap-2 border-t border-border px-5 py-4 text-sm text-muted-foreground">
                  <MousePointerClick className="size-4" /> Ask anything about this website…
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Feature cards */}
        <section id="features" className="mx-auto w-full max-w-6xl px-4 py-20">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-semibold tracking-[0.2em] text-primary uppercase">Features</p>
            <h2 className="mt-3 text-3xl font-bold md:text-4xl">
              Everything you need for hands-off support
            </h2>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((feature) => (
              <div key={feature.title} className="card-soft p-6">
                <span className="bg-brand-gradient flex size-10 items-center justify-center rounded-xl text-primary-foreground">
                  <feature.icon className="size-5" />
                </span>
                <h3 className="mt-4 text-base font-semibold">{feature.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{feature.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section className="border-y border-border bg-surface">
          <div className="mx-auto w-full max-w-6xl px-4 py-20">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-xs font-semibold tracking-[0.2em] text-primary uppercase">
                How it works
              </p>
              <h2 className="mt-3 text-3xl font-bold md:text-4xl">Three steps to a live assistant</h2>
            </div>
            <div className="mt-12 grid gap-6 md:grid-cols-3">
              {STEPS.map((step, index) => (
                <div key={step.title} className="card-soft p-6">
                  <div className="flex items-center gap-3">
                    <span className="flex size-9 items-center justify-center rounded-full bg-ink text-sm font-semibold text-ink-foreground">
                      {index + 1}
                    </span>
                    <step.icon className="size-5 text-primary" />
                  </div>
                  <h3 className="mt-4 text-base font-semibold">{step.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{step.body}</p>
                </div>
              ))}
            </div>
            <div className="mt-10 overflow-x-auto rounded-xl bg-ink p-5 font-mono text-sm text-ink-foreground">
              <code>
                {`<script src="https://cdn.helix.ai/widget.js" data-bot-id="YOUR_BOT_ID" defer></script>`}
              </code>
            </div>
          </div>
        </section>

        <PricingSection />

        <section className="mx-auto w-full max-w-6xl px-4 pb-24">
          <div className="bg-brand-gradient flex flex-col items-center gap-6 rounded-3xl px-8 py-14 text-center text-primary-foreground">
            <h2 className="max-w-2xl text-3xl font-bold md:text-4xl">
              Your visitors are asking questions right now
            </h2>
            <p className="max-w-xl text-primary-foreground/85">
              Give them instant answers from your own content. Set up takes about two minutes.
            </p>
            <Button asChild size="lg" variant="secondary">
              <a href="/auth?mode=signup">Create your free chatbot</a>
            </Button>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

function ChatBubble({ side, children }: { side: "bot" | "user"; children: React.ReactNode }) {
  const isBot = side === "bot";
  return (
    <div className={`flex ${isBot ? "justify-start" : "justify-end"}`}>
      <p
        className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
          isBot
            ? "rounded-bl-sm bg-muted text-foreground"
            : "rounded-br-sm bg-primary text-primary-foreground"
        }`}
      >
        {children}
      </p>
    </div>
  );
}
