import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect } from "react";

import { checkAdmin } from "@/lib/admin.functions";
import { botsQuery } from "@/lib/bot-data";

export const Route = createFileRoute("/dashboard/")({
  component: DashboardIndex,
});

function DashboardIndex() {
  const navigate = useNavigate();
  const checkAdminFn = useServerFn(checkAdmin);
  const admin = useQuery({ queryKey: ["is-admin"], queryFn: () => checkAdminFn() });
  const { data, error } = useQuery({ ...botsQuery(), enabled: admin.data?.isAdmin === false });

  useEffect(() => {
    if (admin.data?.isAdmin) {
      void navigate({ to: "/dashboard/admin", replace: true });
      return;
    }
    if (!data) return;
    if (data.length === 0) void navigate({ to: "/onboarding", replace: true });
    else {
      const firstBot = data[0];
      if (firstBot) void navigate({ to: "/dashboard/bot/$botId", params: { botId: firstBot.id }, replace: true });
    }
  }, [admin.data?.isAdmin, data, navigate]);

  return (
    <p className="text-muted-foreground">
      {admin.error instanceof Error
        ? admin.error.message
        : error
          ? error.message
          : admin.data?.isAdmin
            ? "Opening admin…"
            : "Loading your chatbots…"}
    </p>
  );
}
