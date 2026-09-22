import { createFileRoute } from "@tanstack/react-router";

import { SiteFooter } from "@/components/marketing/SiteFooter";
import { SiteHeader } from "@/components/marketing/SiteHeader";

export const Route = createFileRoute("/blog")({
  head: () => ({
    meta: [
      { title: "Blog — Helix AI" },
      {
        name: "description",
        content:
          "Practical guides on website chatbots: writing content your AI agent can answer from, reducing support email, and capturing leads after hours.",
      },
      { property: "og:title", content: "Blog — Helix AI" },
      {
        property: "og:description",
        content: "Guides on website AI agents, support deflection and lead capture.",
      },
    ],
  }),
  component: BlogPage,
});

const POSTS = [
  {
    title: "Write website content your AI agent can actually answer from",
    date: "12 Sep 2026",
    tag: "Guides",
    excerpt:
      "Short headings, one idea per paragraph, and a real FAQ page. Here is how page structure changes the quality of every answer your assistant gives.",
  },
  {
    title: "How support deflection actually works",
    date: "28 Aug 2026",
    tag: "Support",
    excerpt:
      "Roughly seven in ten incoming questions are already answered somewhere on your site. We break down which ones an assistant should handle alone.",
  },
  {
    title: "Turning midnight visitors into morning leads",
    date: "14 Aug 2026",
    tag: "Growth",
    excerpt:
      "A quiet contact form converts far worse than a conversation. What to ask for, when to ask, and how to follow up the next day.",
  },
  {
    title: "Multi-language support without translating your site",
    date: "01 Aug 2026",
    tag: "Product",
    excerpt:
      "Your content stays in one language while your assistant replies in the visitor's. Here's why that works and where it doesn't.",
  },
];

function BlogPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        <section className="bg-hero-glow border-b border-border">
          <div className="mx-auto w-full max-w-6xl px-4 py-16">
            <h1 className="text-4xl font-bold md:text-5xl">The Helix blog</h1>
            <p className="mt-4 max-w-xl text-lg text-muted-foreground">
              Notes on website assistants, support automation and turning traffic into conversations.
            </p>
          </div>
        </section>

        <section className="mx-auto w-full max-w-4xl px-4 py-16">
          <div className="grid gap-6">
            {POSTS.map((post) => (
              <article key={post.title} className="card-soft p-6">
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="rounded-full bg-muted px-2 py-1 font-medium text-foreground">
                    {post.tag}
                  </span>
                  <time>{post.date}</time>
                </div>
                <h2 className="mt-3 text-xl font-semibold">{post.title}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{post.excerpt}</p>
              </article>
            ))}
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
