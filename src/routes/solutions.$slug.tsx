import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowRight, Check } from "lucide-react";

import { SiteFooter } from "@/components/marketing/SiteFooter";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { Button } from "@/components/ui/button";
import { SOLUTIONS } from "@/lib/plans";

export const Route = createFileRoute("/solutions/$slug")({
  loader: ({ params }) => {
    const solution = SOLUTIONS.find((item) => item.slug === params.slug);
    if (!solution) throw notFound();
    return { solution };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [{ title: "Solution not found — Helix AI" }, { name: "robots", content: "noindex" }],
      };
    }
    const { solution } = loaderData;
    const title = `${solution.name} chatbots — Helix AI`;
    return {
      meta: [
        { title },
        { name: "description", content: solution.blurb },
        { property: "og:title", content: title },
        { property: "og:description", content: solution.blurb },
      ],
    };
  },
  component: SolutionPage,
});

function SolutionPage() {
  const { solution } = Route.useLoaderData();

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        <section className="bg-hero-glow border-b border-border">
          <div className="mx-auto w-full max-w-6xl px-4 py-20">
            <p className="text-xs font-semibold tracking-[0.2em] text-primary uppercase">
              {solution.name}
            </p>
            <h1 className="mt-4 max-w-3xl text-4xl font-bold md:text-5xl">{solution.headline}</h1>
            <p className="mt-5 max-w-2xl text-lg text-muted-foreground">{solution.blurb}</p>
            <Button asChild size="lg" className="mt-8">
              <Link to="/auth" search={{ mode: "signup", domain: undefined }}>
                Create your free chatbot <ArrowRight className="ml-1 size-4" />
              </Link>
            </Button>
          </div>
        </section>

        <section className="mx-auto w-full max-w-5xl px-4 py-20">
          <h2 className="text-2xl font-bold">What Helix handles for {solution.name.toLowerCase()} teams</h2>
          <ul className="mt-6 grid gap-4 md:grid-cols-3">
            {solution.points.map((point) => (
              <li key={point} className="card-soft flex gap-3 p-5 text-sm">
                <Check className="mt-0.5 size-4 shrink-0 text-accent" />
                <span className="text-muted-foreground">{point}</span>
              </li>
            ))}
          </ul>

          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {SOLUTIONS.filter((item) => item.slug !== solution.slug).map((item) => (
              <Link
                key={item.slug}
                to="/solutions/$slug"
                params={{ slug: item.slug }}
                className="card-soft p-5 transition-shadow hover:shadow-lift"
              >
                <p className="text-sm font-semibold">{item.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">{item.headline}</p>
              </Link>
            ))}
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
