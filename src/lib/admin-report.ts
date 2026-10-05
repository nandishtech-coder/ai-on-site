import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { checkAdmin, getAdminReport } from "@/lib/admin.functions";

export function useAdminReport() {
  const check = useServerFn(checkAdmin);
  const get = useServerFn(getAdminReport);
  const admin = useQuery({ queryKey: ["is-admin"], queryFn: () => check() });
  const report = useQuery({ queryKey: ["admin-report"], queryFn: () => get(), enabled: admin.data?.isAdmin === true });
  return { admin, report };
}