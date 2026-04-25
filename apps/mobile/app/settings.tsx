import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import { colors, fontSizes } from "@orb/ui";
import { trpc } from "../lib/trpc";
import { supabase } from "../lib/supabase";
import {
  RowGroup,
  SectionLabel,
  SettingRow,
} from "../components/settings/row";
import { Toggle } from "../components/shared/toggle";
import { TabbedScreen } from "../components/shared/tabbed-screen";

function formatPhone(raw: string | null | undefined): string {
  if (!raw) return "not set up";
  const m = raw.match(/^\+(\d{1,2})(\d{3})(\d{3})(\d{4})$/);
  if (!m) return raw;
  const [, c, a, p, l] = m;
  return `+${c} (${a}) ${p}-${l}`;
}

export default function SettingsScreen() {
  const meQuery = trpc.user.me.useQuery();
  const homeQuery = trpc.user.getHomeData.useQuery();

  // UI-only toggles for now — wired to real preferences in a future
  // user.preferences column. Mirrors the prototype settings page so users
  // can see + interact with the controls.
  const [postIg, setPostIg] = useState(true);
  const [postLi, setPostLi] = useState(false);
  const [postEmail, setPostEmail] = useState(true);
  const [pushDaily, setPushDaily] = useState(true);
  const [pushWeekly, setPushWeekly] = useState(true);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.replace("/");
  }

  if (meQuery.isLoading || homeQuery.isLoading) {
    return (
      <TabbedScreen>
        <View style={styles.loading}>
          <ActivityIndicator color={colors.ink4} />
        </View>
      </TabbedScreen>
    );
  }

  const user = meQuery.data;
  const home = homeQuery.data;
  if (!user || !home) {
    return (
      <TabbedScreen>
        <View style={styles.loading}>
          <Text style={styles.error}>couldn&apos;t load settings.</Text>
        </View>
      </TabbedScreen>
    );
  }

  const businessDesc =
    user.businessDescription?.split(/[.\n]/)[0]?.slice(0, 40)?.trim() ||
    "tell me what you do →";

  return (
    <TabbedScreen>
      <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.push("/home")} hitSlop={10}>
          <Text style={styles.back}>← home</Text>
        </Pressable>
      </View>
      <Text style={styles.title}>settings</Text>
      <Text style={styles.sub}>
        rarely needed. everything works out of the box.
      </Text>

      <SectionLabel>YOUR BUSINESS</SectionLabel>
      <RowGroup>
        <SettingRow
          label="what you do"
          value={businessDesc + " →"}
          onPress={() => router.push("/onboarding")}
        />
        <SettingRow
          label="how i should sound"
          value={user.goal ? `${user.goal.toLowerCase()} →` : "set a goal →"}
          onPress={() => router.push("/onboarding/goal")}
          isLast
        />
      </RowGroup>

      <SectionLabel>YOUR ADFI NUMBER</SectionLabel>
      <RowGroup>
        <SettingRow
          label="your adfi number"
          value={formatPhone(
            home.phoneStatus.active ? home.phoneStatus.number : null,
          )}
          isLast
        />
      </RowGroup>

      <SectionLabel>WHERE I POST</SectionLabel>
      <RowGroup>
        <SettingRow
          label="instagram"
          rightNode={<Toggle on={postIg} onChange={setPostIg} />}
        />
        <SettingRow
          label="linkedin"
          rightNode={<Toggle on={postLi} onChange={setPostLi} />}
        />
        <SettingRow
          label="email newsletter"
          rightNode={<Toggle on={postEmail} onChange={setPostEmail} />}
          isLast
        />
      </RowGroup>

      <SectionLabel>HOW I REACH YOU</SectionLabel>
      <RowGroup>
        <SettingRow
          label="ping me when something needs me"
          rightNode={<Toggle on={pushDaily} onChange={setPushDaily} />}
        />
        <SettingRow
          label="weekly summary · sundays"
          rightNode={<Toggle on={pushWeekly} onChange={setPushWeekly} />}
          isLast
        />
      </RowGroup>

      <SectionLabel>PLAN</SectionLabel>
      <RowGroup>
        <SettingRow
          label={
            home.trialDaysLeft && home.trialDaysLeft > 0
              ? `trial · ${home.trialDaysLeft} days left`
              : "team · monthly"
          }
          value={
            home.trialDaysLeft && home.trialDaysLeft > 0 ? "$0 / now" : "$99"
          }
          onPress={() => router.push("/onboarding/plan")}
          isLast
        />
      </RowGroup>

      <SectionLabel>ACCOUNT</SectionLabel>
      <RowGroup>
        <SettingRow label="email" value={user.email ?? "—"} />
        <SettingRow label="billing" value="→" isLast={false} />
        <SettingRow
          label="sign out"
          labelColor={colors.urgent}
          onPress={handleSignOut}
          isLast
        />
      </RowGroup>
      </ScrollView>
    </TabbedScreen>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 100 },
  headerRow: { marginBottom: 20 },
  back: { fontFamily: "Menlo", fontSize: fontSizes.sm, color: colors.ink },
  title: {
    fontSize: 23,
    fontWeight: "500",
    color: colors.ink,
    letterSpacing: -0.4,
    marginBottom: 6,
  },
  sub: { fontSize: fontSizes.sm, color: colors.ink4, marginBottom: 20 },
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.bg,
  },
  error: { color: colors.urgent, fontSize: fontSizes.sm, fontFamily: "Menlo" },
});
