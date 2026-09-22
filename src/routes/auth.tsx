import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Loader2, Mail } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { HelixMark } from "@/components/marketing/SiteHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth, setPendingDomain } from "@/hooks/useAuth";
import { lovable } from "@/integrations/lovable/index";
import { supabase } from "@/integrations/supabase/client";

const searchSchema = z.object({
  mode: z.enum(["login", "signup"]).catch("login"),
  domain: z.string().optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Log in or sign up — Helix AI" },
      {
        name: "description",
        content: "Sign in to Helix to build, customize and embed your website AI assistant.",
      },
      { property: "og:title", content: "Log in or sign up — Helix AI" },
      { property: "og:description", content: "Access your Helix dashboard and chatbots." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { mode, domain } = Route.useSearch();
  const navigate = useNavigate();
  const { session, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const isSignup = mode === "signup";

  useEffect(() => {
    if (domain) setPendingDomain(domain);
  }, [domain]);

  useEffect(() => {
    if (!loading && session) void navigate({ to: "/dashboard" });
  }, [loading, session, navigate]);

  const handlePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      if (isSignup) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/dashboard` },
        });
        if (error) throw error;
        toast.success("Check your email to confirm your account, then log in.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  const handleMagicLink = async () => {
    if (!email) {
      toast.error("Enter your email address first.");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${window.location.origin}/dashboard` },
      });
      if (error) throw error;
      toast.success("Magic link sent — check your inbox.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not send the link.");
    } finally {
      setBusy(false);
    }
  };

  const handleGoogle = async () => {
    setBusy(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        toast.error(result.error.message ?? "Google sign-in failed.");
        return;
      }
      if (result.redirected) return;
      void navigate({ to: "/dashboard" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Google sign-in failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="bg-hero-glow hidden flex-col justify-between border-r border-border p-10 lg:flex">
        <Link to="/">
          <HelixMark />
        </Link>
        <div>
          <h1 className="max-w-md text-4xl font-bold">
            Your website already has the answers. Helix just delivers them.
          </h1>
          <p className="mt-4 max-w-md text-muted-foreground">
            Crawl your pages, customize the widget and paste one line of code. Two minutes, no
            developer needed.
          </p>
        </div>
        <p className="text-sm text-muted-foreground">Free plan • 1 bot • 20 pages • no card</p>
      </div>

      <div className="flex flex-col justify-center px-6 py-12">
        <div className="mx-auto w-full max-w-sm">
          <Link
            to="/"
            className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground lg:hidden"
          >
            <ArrowLeft className="size-4" /> Back
          </Link>

          <h2 className="text-2xl font-bold">
            {isSignup ? "Create your free account" : "Welcome back"}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {isSignup
              ? "Start with one chatbot on the free plan."
              : "Log in to manage your chatbots."}
          </p>

          {domain ? (
            <p className="mt-4 rounded-lg border border-border bg-muted px-3 py-2 text-xs text-muted-foreground">
              We'll build your assistant for <span className="font-medium text-foreground">{domain}</span>{" "}
              right after sign-up.
            </p>
          ) : null}

          <Button
            type="button"
            variant="outline"
            className="mt-6 w-full"
            onClick={handleGoogle}
            disabled={busy}
          >
            Continue with Google
          </Button>

          <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={handlePassword} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@company.com"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete={isSignup ? "new-password" : "current-password"}
                required
                minLength={6}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
              />
            </div>
            <Button type="submit" disabled={busy}>
              {busy ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              {isSignup ? "Sign up for free" : "Log in"}
            </Button>
          </form>

          <Button
            type="button"
            variant="ghost"
            className="mt-3 w-full"
            onClick={handleMagicLink}
            disabled={busy}
          >
            <Mail className="mr-2 size-4" /> Email me a magic link
          </Button>

          <p className="mt-8 text-center text-sm text-muted-foreground">
            {isSignup ? "Already have an account?" : "New to Helix?"}{" "}
            <Link
              to="/auth"
              search={{ mode: isSignup ? "login" : "signup", domain }}
              className="font-medium text-primary hover:underline"
            >
              {isSignup ? "Log in" : "Sign up for free"}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
