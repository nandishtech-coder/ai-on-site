import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";

import { supabase } from "@/integrations/supabase/client";
import { botQuery } from "@/lib/bot-data";

export const Route = createFileRoute("/dashboard/bot/$botId/leads")({
  component: LeadsPage,
});

function LeadsPage() {
  const { botId } = Route.useParams();
  const bot = useQuery(botQuery(botId));
  const leads = useQuery({
    queryKey: ["leads", botId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .eq("bot_id", botId)
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return data;
    },
  });

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-semibold">Lead Capture</h1>
      <p className="text-sm text-muted-foreground">
        Contact form is {bot.data?.lead_capture_enabled ? "on" : "off"} for this bot.{" "}
        <Link to="/dashboard/bot/$botId/customize" params={{ botId }} className="text-primary underline">
          Change in Customize
        </Link>
      </p>
      <div className="overflow-x-auto rounded-2xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b border-border text-left text-muted-foreground">
            <tr>
              <th className="p-3">Name</th>
              <th className="p-3">Email</th>
              <th className="p-3">Phone</th>
              <th className="p-3">Question</th>
              <th className="p-3">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {leads.data?.map((l) => (
              <tr key={l.id}>
                <td className="p-3">{l.name ?? "—"}</td>
                <td className="p-3">{l.email ?? "—"}</td>
                <td className="p-3">{l.phone ?? "—"}</td>
                <td className="max-w-xs truncate p-3">{l.question ?? "—"}</td>
                <td className="p-3 text-muted-foreground">{new Date(l.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
            {leads.data?.length === 0 && (
              <tr>
                <td colSpan={5} className="p-8 text-center text-muted-foreground">No leads captured yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
