import type { Session, User } from "@supabase/supabase-js";
import { useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/client";

export function useAuth(): { session: Session | null; user: User | null; loading: boolean } {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setLoading(false);
    });

    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  return { session, user: session?.user ?? null, loading };
}

const PENDING_DOMAIN_KEY = "helix_pending_domain";

export function setPendingDomain(domain: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PENDING_DOMAIN_KEY, domain);
}

export function takePendingDomain(): string | null {
  if (typeof window === "undefined") return null;
  const value = window.localStorage.getItem(PENDING_DOMAIN_KEY);
  if (value) window.localStorage.removeItem(PENDING_DOMAIN_KEY);
  return value;
}
