import { Link } from "@tanstack/react-router";
import { Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PLANS } from "@/lib/plans";

export function PricingSection({ id = "pricing" }: { id?: string }) {
  return (
    <section id={id} className="mx-auto w-full max-w-6xl px-4 py-20">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-xs font-semibold tracking-[0.2em] text-primary uppercase">Pricing</p>
        <h2 className="mt-3 text-3xl font-bold md:text-4xl">Start free, upgrade when you scale</h2>
        <p className="mt-3 text-muted-foreground">
          Every plan includes website crawling, multi-language answers and the one-line embed script.
        </p>
      </div>

      <div className="mt-12 grid gap-6 md:grid-cols-3">
        {PLANS.map((plan) => (
          <div
            key={plan.id}
            className={`card-soft relative flex flex-col p-6 ${
              plan.highlight ? "ring-2 ring-primary md:-mt-4 md:pb-10" : ""
            }`}
          >
            {plan.highlight ? (
              <span className="bg-brand-gradient absolute -top-3 left-6 rounded-full px-3 py-1 text-[11px] font-semibold text-primary-foreground">
                Most popular
              </span>
            ) : null}
            <h3 className="text-lg font-semibold">{plan.name}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{plan.tagline}</p>
            <p className="mt-5 flex items-baseline gap-1">
              <span className="font-display text-4xl font-bold">{plan.price}</span>
              <span className="text-sm text-muted-foreground">{plan.cadence}</span>
            </p>
            <ul className="mt-6 flex-1 space-y-3 text-sm">
              {plan.features.map((feature) => (
                <li key={feature} className="flex gap-2">
                  <Check className="mt-0.5 size-4 shrink-0 text-accent" />
                  <span className="text-muted-foreground">{feature}</span>
                </li>
              ))}
            </ul>
            <Button
              asChild
              className="mt-8"
              variant={plan.highlight ? "default" : "outline"}
            >
              <Link to="/auth" search={{ mode: "signup", domain: undefined }}>
                {plan.id === "free" ? "Create free chatbot" : `Choose ${plan.name}`}
              </Link>
            </Button>
          </div>
        ))}
      </div>
    </section>
  );
}
