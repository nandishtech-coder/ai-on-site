import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addUserCredits, checkAdmin, listUsersWithCredits } from "@/lib/admin.functions";
import { getPlan } from "@/lib/plans";

export const Route = createFileRoute("/dashboard/admin")({
  component: AdminPage,
});

function AdminPage() {
  const check = useServerFn(checkAdmin);
  const list = useServerFn(listUsersWithCredits);
  const add = useServerFn(addUserCredits);
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const admin = useQuery({ queryKey: ["is-admin"], queryFn: () => check() });
  const users = useQuery({ queryKey: ["admin-users"], queryFn: () => list(), enabled: !!admin.data?.isAdmin });

  if (admin.isLoading) return <p className="text-muted-foreground">Loading…</p>;
  if (!admin.data?.isAdmin) return <p className="text-destructive">Only admins can open this page.</p>;

  async function give(userId: string, amount: number) {
    if (!Number.isFinite(amount) || amount === 0) return toast.error("Enter a number of credits.");
    setBusy(userId);
    try {
      const r = await add({ data: { userId, amount } });
      toast.success(`Extra credits now ${r.extraCredits}.`);
      setAmounts((a) => ({ ...a, [userId]: "" }));
      void qc.invalidateQueries({ queryKey: ["admin-users"] });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  const rows = (users.data ?? []).filter((u) => u.email.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Admin · User credits</h1>
        <p className="text-sm text-muted-foreground">
          Give users extra chatbot messages on top of their plan. 1 credit = 1 message.
        </p>
      </div>
      <Input placeholder="Search by email…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" />
      {users.isLoading ? (
        <p className="text-muted-foreground">Loading users…</p>
      ) : users.error ? (
        <p className="text-destructive">{(users.error as Error).message}</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="border-b border-border text-left text-muted-foreground">
              <tr>
                <th className="p-3">User</th>
                <th className="p-3">Plan</th>
                <th className="p-3">Messages used</th>
                <th className="p-3">Extra credits</th>
                <th className="p-3">Add credits</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((u) => {
                const plan = getPlan(u.plan);
                return (
                  <tr key={u.id} className="border-b border-border last:border-0">
                    <td className="p-3">
                      <p className="font-medium">{u.email}</p>
                      <p className="text-xs text-muted-foreground">{u.bots} bot(s)</p>
                    </td>
                    <td className="p-3">{plan.name}</td>
                    <td className="p-3">
                      {u.messagesUsed} / {(plan.messages + u.extraCredits).toLocaleString()}
                    </td>
                    <td className="p-3 font-medium">{u.extraCredits}</td>
                    <td className="p-3">
                      <div className="flex flex-wrap items-center gap-2">
                        {[20, 100].map((n) => (
                          <Button key={n} size="sm" variant="outline" disabled={busy === u.id} onClick={() => give(u.id, n)}>
                            +{n}
                          </Button>
                        ))}
                        <Input
                          type="number"
                          className="h-8 w-24"
                          placeholder="Custom"
                          value={amounts[u.id] ?? ""}
                          onChange={(e) => setAmounts((a) => ({ ...a, [u.id]: e.target.value }))}
                        />
                        <Button size="sm" disabled={busy === u.id} onClick={() => give(u.id, Number(amounts[u.id]))}>
                          Add
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
