import { createFileRoute } from "@tanstack/react-router";

import { PricingSection } from "@/components/marketing/PricingSection";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { SiteHeader } from "@/components/marketing/SiteHeader";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — Helix AI" },
      {
        name: "description",
        content:
          "Helix pricing: Free with 1 bot and 20 pages, Pro at ₹2,499/mo with 500 pages, Enterprise at ₹7,999/mo with unlimited pages and weekly re-crawls.",
      },
      { property: "og:title", content: "Pricing — Helix AI" },
      {
        property: "og:description",
        content: "Start free with 1 chatbot. Upgrade to Pro or Enterprise as your traffic grows.",
      },
    ],
  }),
  component: PricingPage,
});

const FAQ = [
  {
    q: "What counts as a message?",
    a: "Every reply your assistant sends to a visitor counts as one message. Your own tests in the dashboard preview count too.",
  },
  {
    q: "What happens when I hit my page limit?",
    a: "Crawling stops at your plan's page limit and keeps everything already indexed. Upgrading raises the limit and you can re-sync to pick up the rest.",
  },
  {
    q: "Can I remove the Helix badge?",
    a: "Yes — the “Powered by Helix” badge can be switched off on the Pro and Enterprise plans.",
  },
  {
    q: "Do I need a developer?",
    a: "No. You paste one line of code into your site. Every major website builder supports this.",
  },
];

function PricingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        <section className="bg-hero-glow border-b border-border">
          <div className="mx-auto w-full max-w-6xl px-4 py-16 text-center">
            <h1 className="text-4xl font-bold md:text-5xl">Simple plans, no surprises</h1>
            <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
              Start on the free plan and upgrade only when your visitors keep your assistant busy.
            </p>
          </div>
        </section>

        <PricingSection />

        <section className="mx-auto w-full max-w-3xl px-4 pb-24">
          <h2 className="text-2xl font-bold">Questions</h2>
          <div className="mt-6 grid gap-4">
            {FAQ.map((item) => (
              <div key={item.q} className="card-soft p-5">
                <h3 className="text-sm font-semibold">{item.q}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{item.a}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
