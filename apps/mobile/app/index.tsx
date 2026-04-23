import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Redirect } from "expo-router";
import type { Session } from "@supabase/supabase-js";
import { colors, fontSizes } from "@orb/ui";
import { supabase } from "../lib/supabase";

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
    return (
      <View style={styles.container}>
        <View style={styles.row}>
          <View style={styles.dot} />
          <Text style={styles.brand}>ADFI</Text>
        </View>
      </View>
    );
  }

  return <Redirect href={session ? "/home" : "/signin"} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.bg,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 9999,
    backgroundColor: colors.alive,
  },
  brand: {
    fontSize: fontSizes["4xl"],
    fontWeight: "500",
    color: colors.ink,
  },
});
