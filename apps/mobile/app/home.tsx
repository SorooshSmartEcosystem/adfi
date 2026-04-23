import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import { colors, fontSizes, radii } from "@orb/ui";
import { trpc } from "../lib/trpc";
import { supabase } from "../lib/supabase";

const GOAL_LABELS = {
  MORE_CUSTOMERS: "more new customers",
  MORE_REPEAT_BUYERS: "more repeat buyers",
  MORE_VISIBILITY: "more visibility",
} as const;

export default function Home() {
  const meQuery = trpc.user.me.useQuery();
  const homeQuery = trpc.user.getHomeData.useQuery();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.replace("/");
  }

  if (meQuery.isLoading || homeQuery.isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.ink3} />
        <Text style={styles.caption}>one second</Text>
      </View>
    );
  }

  if (meQuery.error || homeQuery.error) {
    return (
      <View style={styles.loading}>
        <Text style={styles.error}>
          {meQuery.error?.message ?? homeQuery.error?.message}
        </Text>
        <Pressable onPress={handleSignOut} style={styles.signOutButton}>
          <Text style={styles.signOut}>sign out</Text>
        </Pressable>
      </View>
    );
  }

  const user = meQuery.data;
  const home = homeQuery.data;
  if (!user || !home) return null;

  const onboarded = user.businessDescription && user.goal;

  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <View style={styles.header}>
        <View style={styles.dot} />
        <Text style={styles.brand}>ADFI</Text>
      </View>

      <View style={styles.profile}>
        <Text style={styles.email}>{user.email ?? user.phone}</Text>
        {user.businessDescription ? (
          <Text style={styles.description}>{user.businessDescription}</Text>
        ) : (
          <Text style={styles.descriptionEmpty}>no business description yet</Text>
        )}
        {user.goal && (
          <Text style={styles.goal}>going for {GOAL_LABELS[user.goal]}</Text>
        )}
      </View>

      {onboarded && (
        <View style={styles.card}>
          <Text style={styles.cardLabel}>THIS WEEK</Text>
          <View style={styles.stats}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{home.weeklyStats.postsCount}</Text>
              <Text style={styles.statLabel}>posts</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>
                {home.weeklyStats.reach.toLocaleString()}
              </Text>
              <Text style={styles.statLabel}>reach</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>
                {home.weeklyStats.messagesHandled}
              </Text>
              <Text style={styles.statLabel}>messages</Text>
            </View>
          </View>
          {home.phoneStatus.active && (
            <View style={styles.divider}>
              <Text style={styles.sectionLabel}>MY NUMBER</Text>
              <Text style={styles.phone}>{home.phoneStatus.number}</Text>
            </View>
          )}
          {home.pendingFinding && (
            <View style={styles.divider}>
              <Text style={styles.attentionLabel}>NEEDS YOU</Text>
              <Text style={styles.attentionText}>
                {home.pendingFinding.summary}
              </Text>
            </View>
          )}
          {home.trialDaysLeft !== null && home.trialDaysLeft > 0 && (
            <Text style={styles.trialText}>
              {home.trialDaysLeft} days left on trial
            </Text>
          )}
        </View>
      )}

      <Pressable onPress={handleSignOut} style={styles.signOutButton}>
        <Text style={styles.signOut}>sign out</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.bg,
    padding: 24,
    gap: 12,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.bg,
    padding: 24,
    gap: 24,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 9999,
    backgroundColor: colors.alive,
  },
  brand: {
    fontSize: fontSizes["2xl"],
    fontWeight: "500",
    color: colors.ink,
  },
  profile: { alignItems: "center", gap: 8, maxWidth: 400 },
  email: {
    fontSize: fontSizes.lg,
    fontWeight: "500",
    color: colors.ink,
  },
  description: {
    fontSize: fontSizes.sm,
    color: colors.ink3,
    fontFamily: "Menlo",
    textAlign: "center",
  },
  descriptionEmpty: {
    fontSize: fontSizes.sm,
    color: colors.ink4,
    fontFamily: "Menlo",
    fontStyle: "italic",
  },
  goal: {
    fontSize: fontSizes.xs,
    color: colors.ink4,
    fontFamily: "Menlo",
  },
  card: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: 16,
    gap: 12,
  },
  cardLabel: {
    fontSize: fontSizes.xs,
    color: colors.ink3,
    fontFamily: "Menlo",
  },
  stats: { flexDirection: "row", justifyContent: "space-between" },
  stat: { flexDirection: "column" },
  statValue: {
    fontSize: fontSizes["2xl"],
    color: colors.ink,
    fontFamily: "Menlo",
  },
  statLabel: {
    fontSize: fontSizes.xs,
    color: colors.ink3,
    fontFamily: "Menlo",
  },
  divider: {
    borderTopWidth: 1,
    borderTopColor: colors.border2,
    paddingTop: 12,
  },
  sectionLabel: {
    fontSize: fontSizes.xs,
    color: colors.ink3,
    fontFamily: "Menlo",
  },
  phone: {
    fontSize: fontSizes.md,
    color: colors.ink,
    fontFamily: "Menlo",
  },
  attentionLabel: {
    fontSize: fontSizes.xs,
    color: colors.attentionText,
    fontFamily: "Menlo",
  },
  attentionText: {
    fontSize: fontSizes.sm,
    color: colors.ink,
    marginTop: 4,
  },
  trialText: {
    fontSize: fontSizes.xs,
    color: colors.ink4,
    fontFamily: "Menlo",
  },
  signOutButton: { marginTop: 24 },
  signOut: {
    fontSize: fontSizes.sm,
    color: colors.ink3,
    fontFamily: "Menlo",
    textDecorationLine: "underline",
  },
  caption: {
    marginTop: 12,
    fontSize: fontSizes.sm,
    color: colors.ink3,
    fontFamily: "Menlo",
  },
  error: {
    color: colors.urgent,
    fontSize: fontSizes.sm,
    fontFamily: "Menlo",
  },
});
