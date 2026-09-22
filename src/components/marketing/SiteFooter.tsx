import { Link } from "@tanstack/react-router";

import { HelixMark } from "@/components/marketing/SiteHeader";
import { SOLUTIONS } from "@/lib/plans";

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-14 md:grid-cols-4">
        <div className="md:col-span-2">
          <HelixMark />
          <p className="mt-4 max-w-sm text-sm text-muted-foreground">
            Helix turns your website into a smart, 24/7 AI support agent. Enter your URL, copy a line
            of code, and go live.
          </p>
        </div>
        <div>
          <h3 className="text-sm font-semibold">Solutions</h3>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            {SOLUTIONS.map((solution) => (
              <li key={solution.slug}>
                <Link
                  to="/solutions/$slug"
                  params={{ slug: solution.slug }}
                  className="hover:text-foreground"
                >
                  {solution.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="text-sm font-semibold">Company</h3>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>
              <Link to="/features" className="hover:text-foreground">
                Features
              </Link>
            </li>
            <li>
              <Link to="/pricing" className="hover:text-foreground">
                Pricing
              </Link>
            </li>
            <li>
              <Link to="/blog" className="hover:text-foreground">
                Blog
              </Link>
            </li>
            <li>
              <Link
                to="/auth"
                search={{ mode: "signup", domain: undefined }}
                className="hover:text-foreground"
              >
                Sign up
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Helix AI. All rights reserved.
      </div>
    </footer>
  );
}
