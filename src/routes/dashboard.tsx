import { useQuery } from "@tanstack/react-query";
import { Link, Outlet, createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import {
  BarChart3,
  Code2,
  CreditCard,
  Inbox,
  LogOut,
  Menu,
  Paintbrush,
  PanelLeftClose,
  Plus,
  Activity,
  Bot,
  ShieldCheck,
  UserPlus,
} from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";

import { HelixMark } from "@/components/marketing/SiteHeader";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { checkAdmin } from "@/lib/admin.functions";
import { botsQuery } from "@/lib/bot-data";

export const Route = createFileRoute("/dashboard")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Dashboard — Helix AI" },
      { name: "description", content: "Manage your Helix chatbots, conversations and leads." },
      { property: "og:title", content: "Dashboard — Helix AI" },
      { property: "og:description", content: "Manage your Helix chatbots, conversations and leads." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DashboardLayout,
});

const NAV = [
  { to: "/dashboard/bot/$botId", label: "Overview", icon: BarChart3 },
  { to: "/dashboard/bot/$botId/customize", label: "Customize Bot", icon: Paintbrush },
  { to: "/dashboard/bot/$botId/inbox", label: "Conversation Logs", icon: Inbox },
  { to: "/dashboard/bot/$botId/leads", label: "Lead Capture", icon: UserPlus },
  { to: "/dashboard/bot/$botId/embed", label: "Embed Code", icon: Code2 },
] as const;

function DashboardLayout() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const params = useParams({ strict: false }) as { botId?: string };
  const checkAdminFn = useServerFn(checkAdmin);
  const isAdmin = useQuery({ queryKey: ["is-admin"], queryFn: () => checkAdminFn(), enabled: !!session });
  const bots = useQuery({ ...botsQuery(), enabled: !!session && isAdmin.data?.isAdmin === false });

  useEffect(() => {
    if (!loading && !session) void navigate({ to: "/auth", search: { mode: "login" } as never });
  }, [loading, session, navigate]);

  if (loading || !session) {
    return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Loading…</div>;
  }

  if (isAdmin.isPending) {
    return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Loading…</div>;
  }
  if (isAdmin.error) {
    return <div className="flex min-h-screen items-center justify-center px-4 text-destructive">Could not verify your account access. Please refresh and try again.</div>;
  }

  const adminOnly = isAdmin.data?.isAdmin === true;
  const botId = params.botId ?? bots.data?.[0]?.id;

  const sidebar = (
    <nav className="flex h-full flex-col gap-1 p-3">
      <div className="mb-4 flex items-center gap-2 px-2 font-display font-semibold">
        <HelixMark />
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="ml-auto hidden rounded-md p-1 text-muted-foreground hover:bg-muted md:block"
          aria-label="Toggle sidebar"
        >
          <PanelLeftClose className={`h-4 w-4 transition ${collapsed ? "rotate-180" : ""}`} />
        </button>
      </div>
      {!adminOnly && !collapsed && (
        <div className="mb-3 px-1">
          <p className="mb-1 px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">My Bots</p>
          <select
            value={botId ?? ""}
            onChange={(e) => void navigate({ to: "/dashboard/bot/$botId", params: { botId: e.target.value } })}
            className="w-full rounded-lg border border-input bg-background px-2 py-2 text-sm"
          >
            {bots.data?.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
          <Link to="/onboarding" className="mt-2 flex items-center gap-1 px-1 text-xs text-primary">
            <Plus className="h-3 w-3" /> New chatbot
          </Link>
        </div>
      )}
      {!adminOnly && botId &&
        NAV.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            params={{ botId }}
            activeOptions={{ exact: true }}
            onClick={() => setMobileOpen(false)}
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
            activeProps={{ className: "bg-muted text-foreground font-medium" }}
          >
            <item.icon className="h-4 w-4 shrink-0" />
            {!collapsed && item.label}
          </Link>
        ))}
      {!adminOnly && (
        <Link
          to="/dashboard/billing"
          onClick={() => setMobileOpen(false)}
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
          activeProps={{ className: "bg-muted text-foreground font-medium" }}
        >
          <CreditCard className="h-4 w-4 shrink-0" />
          {!collapsed && "Billing & Account"}
        </Link>
      )}
      {adminOnly && (
        <>
          <Link to="/dashboard/admin/overview" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground" activeProps={{ className: "bg-muted text-foreground font-medium" }}>
            <BarChart3 className="h-4 w-4 shrink-0" />{!collapsed && "Overview"}
          </Link>
          <Link to="/dashboard/admin" activeOptions={{ exact: true }} onClick={() => setMobileOpen(false)} className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground" activeProps={{ className: "bg-muted text-foreground font-medium" }}>
            <ShieldCheck className="h-4 w-4 shrink-0" />{!collapsed && "Users & Credits"}
          </Link>
          <Link to="/dashboard/admin/chatbots" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground" activeProps={{ className: "bg-muted text-foreground font-medium" }}>
            <Bot className="h-4 w-4 shrink-0" />{!collapsed && "Chatbots"}
          </Link>
          <Link to="/dashboard/admin/subscriptions" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground" activeProps={{ className: "bg-muted text-foreground font-medium" }}>
            <CreditCard className="h-4 w-4 shrink-0" />{!collapsed && "Subscriptions"}
          </Link>
          <Link to="/dashboard/admin/usage" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground" activeProps={{ className: "bg-muted text-foreground font-medium" }}>
            <Activity className="h-4 w-4 shrink-0" />{!collapsed && "System Usage"}
          </Link>
        </>
      )}
      <button
        onClick={async () => {
          await supabase.auth.signOut();
          void navigate({ to: "/" });
        }}
        className="mt-auto flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted"
      >
        <LogOut className="h-4 w-4 shrink-0" />
        {!collapsed && "Sign out"}
      </button>
    </nav>
  );

  return (
    <div className="flex min-h-screen bg-background">
      <aside className={`sticky top-0 hidden h-screen shrink-0 border-r border-border bg-card transition-all md:block ${collapsed ? "w-16" : "w-64"}`}>
        {sidebar}
      </aside>
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-foreground/30 md:hidden" onClick={() => setMobileOpen(false)}>
          <aside className="h-full w-64 bg-card" onClick={(e) => e.stopPropagation()}>
            {sidebar}
          </aside>
        </div>
      )}
      <main className="min-w-0 flex-1">
        <div className="flex items-center gap-2 border-b border-border p-3 md:hidden">
          <button onClick={() => setMobileOpen(true)} aria-label="Open menu">
            <Menu className="h-5 w-5" />
          </button>
          <span className="font-display font-semibold">Helix AI</span>
        </div>
        <div className="mx-auto max-w-6xl p-4 md:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
