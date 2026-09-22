import { Link } from "@tanstack/react-router";
import { ChevronDown, Menu, Sparkles } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SOLUTIONS } from "@/lib/plans";

export function HelixMark({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <span className="bg-brand-gradient flex size-8 items-center justify-center rounded-lg text-primary-foreground shadow-soft">
        <Sparkles className="size-4" />
      </span>
      <span className="font-display text-lg font-bold tracking-tight">Helix AI</span>
    </span>
  );
}

export function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-6 px-4">
        <Link to="/" className="shrink-0">
          <HelixMark />
        </Link>

        <nav className="hidden items-center gap-1 text-sm font-medium md:flex">
          <DropdownMenu>
            <DropdownMenuTrigger className="inline-flex items-center gap-1 rounded-md px-3 py-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
              Solutions <ChevronDown className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              {SOLUTIONS.map((solution) => (
                <DropdownMenuItem key={solution.slug} asChild>
                  <Link to="/solutions/$slug" params={{ slug: solution.slug }}>
                    {solution.name}
                  </Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Link
            to="/features"
            className="rounded-md px-3 py-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            Features
          </Link>
          <Link
            to="/pricing"
            className="rounded-md px-3 py-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            Pricing
          </Link>
          <Link
            to="/blog"
            className="rounded-md px-3 py-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            Blog
          </Link>
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <Button asChild variant="ghost">
            <Link to="/auth" search={{ mode: "login", domain: undefined }}>
              Log In
            </Link>
          </Button>
          <Button asChild>
            <Link to="/auth" search={{ mode: "signup", domain: undefined }}>
              Sign Up for Free
            </Link>
          </Button>
        </div>

        <Button
          variant="outline"
          size="icon"
          className="md:hidden"
          onClick={() => setOpen((value) => !value)}
          aria-label="Toggle navigation"
        >
          <Menu className="size-4" />
        </Button>
      </div>

      {open ? (
        <div className="border-t border-border bg-background px-4 py-4 md:hidden">
          <div className="grid gap-1 text-sm">
            <p className="px-2 pt-1 pb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Solutions
            </p>
            {SOLUTIONS.map((solution) => (
              <Link
                key={solution.slug}
                to="/solutions/$slug"
                params={{ slug: solution.slug }}
                onClick={() => setOpen(false)}
                className="rounded-md px-2 py-2 hover:bg-muted"
              >
                {solution.name}
              </Link>
            ))}
            <Link to="/features" onClick={() => setOpen(false)} className="rounded-md px-2 py-2 hover:bg-muted">
              Features
            </Link>
            <Link to="/pricing" onClick={() => setOpen(false)} className="rounded-md px-2 py-2 hover:bg-muted">
              Pricing
            </Link>
            <Link to="/blog" onClick={() => setOpen(false)} className="rounded-md px-2 py-2 hover:bg-muted">
              Blog
            </Link>
            <div className="mt-3 grid gap-2">
              <Button asChild variant="outline">
                <Link to="/auth" search={{ mode: "login", domain: undefined }}>
                  Log In
                </Link>
              </Button>
              <Button asChild>
                <Link to="/auth" search={{ mode: "signup", domain: undefined }}>
                  Sign Up for Free
                </Link>
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}
