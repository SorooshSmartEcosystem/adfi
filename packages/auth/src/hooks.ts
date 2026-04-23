"use client";
import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { createBrowserClient } from "./client";

type SessionState = { session: Session | null; loading: boolean };
type UserState = { user: User | null; loading: boolean };

export function useSession(): SessionState {
  const [state, setState] = useState<SessionState>({
    session: null,
    loading: true,
  });

  useEffect(() => {
    const supabase = createBrowserClient();
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setState({ session: data.session, loading: false });
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setState({ session, loading: false });
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return state;
}

export function useUser(): UserState {
  const { session, loading } = useSession();
  return { user: session?.user ?? null, loading };
}
