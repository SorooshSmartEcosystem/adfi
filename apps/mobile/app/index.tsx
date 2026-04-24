import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Redirect } from "expo-router";
import type { Session } from "@supabase/supabase-js";
import { colors } from "@orb/ui";
import { supabase } from "../lib/supabase";
import { SplashScreen } from "../components/splash/splash-screen";

export default function Index() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_, next) => {
      setSession(next);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  if (session === undefined) {
    return <View style={styles.boot} />;
  }

  if (session) {
    return <Redirect href="/home" />;
  }

  return <SplashScreen />;
}

const styles = StyleSheet.create({
  boot: {
    flex: 1,
    backgroundColor: colors.bg,
  },
});
