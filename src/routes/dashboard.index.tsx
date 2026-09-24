import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

import { botsQuery } from "@/lib/bot-data";

export const Route = createFileRoute("/dashboard/")({
  component: DashboardIndex,
});

function DashboardIndex() {
  const navigate = useNavigate();
  const { data, error } = useQuery(botsQuery());

  useEffect(() => {
    if (!data) return;
    if (data.length === 0) void navigate({ to: "/onboarding", replace: true });
    else void navigate({ to: "/dashboard/bot/$botId", params: { botId: data[0]!.id }, replace: true });
  }, [data, navigate]);

  return <p className="text-muted-foreground">{error ? error.message : "Loading your chatbots…"}</p>;
}
