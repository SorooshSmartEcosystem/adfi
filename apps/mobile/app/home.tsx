import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import { colors, fontSizes } from "@orb/ui";
import { trpc } from "../lib/trpc";
import { supabase } from "../lib/supabase";
import { HomeScreen } from "../components/home/home-screen";

export default function Home() {
  const homeQuery = trpc.user.getHomeData.useQuery();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.replace("/");
  }

  if (homeQuery.isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.ink4} />
      </View>
    );
  }

  if (homeQuery.error || !homeQuery.data) {
    return (
      <View style={styles.loading}>
        <Text style={styles.error}>
          {homeQuery.error?.message ?? "couldn't load home"}
        </Text>
        <Pressable onPress={handleSignOut} hitSlop={10}>
          <Text style={styles.signOut}>sign out</Text>
        </Pressable>
      </View>
    );
  }

  return <HomeScreen data={homeQuery.data} />;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.bg,
    padding: 24,
    gap: 16,
  },
  error: {
    color: colors.urgent,
    fontSize: fontSizes.sm,
    fontFamily: "Menlo",
    textAlign: "center",
  },
  signOut: {
    fontSize: fontSizes.sm,
    color: colors.ink4,
    fontFamily: "Menlo",
    textDecorationLine: "underline",
  },
});
