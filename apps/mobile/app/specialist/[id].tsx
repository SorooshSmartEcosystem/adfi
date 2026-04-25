import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { colors, fontSizes, radii } from "@orb/ui";
import { trpc } from "../../lib/trpc";
import {
  AGENTS,
  AGENT_IDS,
  TIER_COLOR,
} from "../../components/specialists/agent-config";
import { LiveDot } from "../../components/shared/live-dot";
import { TabbedScreen } from "../../components/shared/tabbed-screen";
import { BrandVoiceView } from "../../components/specialists/brand-voice-view";
import { RecentDraftsView } from "../../components/specialists/recent-drafts-view";

function timeLabel(at: Date): string {
  const weekday = at
    .toLocaleDateString("en-US", { weekday: "short" })
    .toLowerCase();
  const time = at.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  return `${weekday} · ${time}`;
}

export default function SpecialistScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const agent = AGENTS[id ?? "signal"] ?? AGENTS.signal!;

  const findingsQuery = trpc.insights.listFindings.useQuery(
    { agent: agent.dbAgent ?? "SIGNAL", limit: 6 },
    { enabled: !agent.coming && agent.dbAgent !== null },
  );
  const voiceQuery = trpc.agent.getStrategistVoice.useQuery(undefined, {
    enabled: agent.dbAgent === "STRATEGIST" && !agent.coming,
  });

  return (
    <TabbedScreen>
      <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.push("/home")} hitSlop={10}>
          <Text style={styles.back}>← back</Text>
        </Pressable>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipsScroll}
      >
        <View style={styles.chips}>
          {AGENT_IDS.map((aid) => (
            <Pressable
              key={aid}
              onPress={() =>
                router.replace({
                  pathname: "/specialist/[id]",
                  params: { id: aid },
                })
              }
              style={[styles.chip, agent.id === aid && styles.chipOn]}
            >
              <Text
                style={[
                  styles.chipText,
                  agent.id === aid && styles.chipTextOn,
                ]}
              >
                {aid}
              </Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      <View style={styles.nameRow}>
        <View style={styles.bigDot} />
        <Text style={styles.name}>{agent.name}</Text>
        <View
          style={[styles.tierBadge, { backgroundColor: TIER_COLOR[agent.tier] }]}
        >
          <Text style={styles.tierBadgeText}>{agent.tier.toUpperCase()}</Text>
        </View>
        {agent.coming ? (
          <View style={styles.comingBadge}>
            <Text style={styles.comingBadgeText}>COMING SOON</Text>
          </View>
        ) : null}
      </View>
      <Text style={styles.role}>{agent.role}</Text>

      {agent.coming ? (
        <View style={styles.amber}>
          <Text style={styles.amberLabel}>NOT LIVE YET</Text>
          <Text style={styles.amberBody}>
            i&apos;m building this one next. everyone on the studio plan will
            get it automatically when it ships — no upgrade needed.
          </Text>
        </View>
      ) : (
        <>
          <View style={styles.nowCard}>
            <View style={styles.nowHead}>
              <Text style={styles.nowLabel}>NOW</Text>
              <View style={styles.nowDotRow}>
                <LiveDot size={7} animated />
                <Text style={styles.nowActive}>ACTIVE</Text>
              </View>
            </View>
            <Text style={styles.nowBody}>{agent.currently}</Text>
          </View>

          {agent.dbAgent === "STRATEGIST" ? (
            <BrandVoiceView
              voice={
                (voiceQuery.data?.voice as Parameters<
                  typeof BrandVoiceView
                >[0]["voice"]) ?? null
              }
              lastRefreshedAt={voiceQuery.data?.lastRefreshedAt ?? null}
            />
          ) : agent.dbAgent === "ECHO" ? (
            <RecentDraftsView />
          ) : (
            <>
              <Text style={styles.sectionLabel}>RECENT FINDINGS</Text>
              {findingsQuery.isLoading ? (
                <ActivityIndicator
                  color={colors.ink4}
                  style={styles.loading}
                />
              ) : (findingsQuery.data ?? []).length === 0 ? (
                <Text style={styles.empty}>
                  nothing surfaced yet — check back after the next run.
                </Text>
              ) : (
                <View style={styles.findings}>
                  {(findingsQuery.data ?? []).map((f, i, arr) => (
                    <View
                      key={f.id}
                      style={[
                        styles.finding,
                        i < arr.length - 1 && styles.findingDivider,
                      ]}
                    >
                      <Text style={styles.findingTitle}>{f.summary}</Text>
                      <Text style={styles.findingMeta}>
                        {timeLabel(f.createdAt)} · {f.severity.toLowerCase()}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </>
          )}
        </>
      )}
      </ScrollView>
    </TabbedScreen>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 100 },
  headerRow: { marginBottom: 16 },
  back: { fontFamily: "Menlo", fontSize: fontSizes.sm, color: colors.ink },
  chipsScroll: { marginBottom: 18 },
  chips: { flexDirection: "row", gap: 6 },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.full,
    borderWidth: 0.5,
    borderColor: colors.border,
    backgroundColor: "white",
  },
  chipOn: { backgroundColor: colors.ink, borderColor: colors.ink },
  chipText: { fontFamily: "Menlo", fontSize: fontSizes.xs, color: colors.ink3 },
  chipTextOn: { color: "white" },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 4,
    flexWrap: "wrap",
  },
  bigDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.ink },
  name: {
    fontSize: 23,
    fontWeight: "500",
    color: colors.ink,
    letterSpacing: -0.4,
  },
  tierBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.full,
  },
  tierBadgeText: {
    fontFamily: "Menlo",
    fontSize: 9,
    color: "white",
    letterSpacing: 1,
  },
  comingBadge: {
    backgroundColor: colors.attentionBg,
    borderWidth: 0.5,
    borderColor: colors.attentionBorder,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.full,
  },
  comingBadgeText: {
    fontFamily: "Menlo",
    fontSize: 9,
    color: colors.attentionText,
    letterSpacing: 1,
  },
  role: {
    fontSize: fontSizes.sm,
    color: colors.ink4,
    marginBottom: 22,
    paddingLeft: 22,
  },
  amber: {
    backgroundColor: colors.attentionBg,
    borderWidth: 0.5,
    borderColor: colors.attentionBorder,
    borderRadius: radii.lg,
    padding: 14,
    marginBottom: 16,
  },
  amberLabel: {
    fontFamily: "Menlo",
    fontSize: 10,
    color: colors.attentionText,
    letterSpacing: 2,
    marginBottom: 6,
  },
  amberBody: {
    fontSize: fontSizes.sm,
    color: colors.ink,
    lineHeight: fontSizes.sm * 1.5,
  },
  nowCard: {
    backgroundColor: "white",
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: 14,
    marginBottom: 10,
  },
  nowHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
    alignItems: "center",
  },
  nowLabel: {
    fontFamily: "Menlo",
    fontSize: 10,
    color: colors.ink5,
    letterSpacing: 2,
  },
  nowDotRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  nowActive: {
    fontFamily: "Menlo",
    fontSize: 11,
    color: colors.aliveDark,
  },
  nowBody: {
    fontSize: fontSizes.base,
    color: colors.ink,
    lineHeight: fontSizes.base * 1.5,
  },
  sectionLabel: {
    fontFamily: "Menlo",
    fontSize: 10,
    color: colors.ink5,
    letterSpacing: 2,
    marginTop: 20,
    marginBottom: 10,
  },
  loading: { paddingVertical: 20 },
  empty: { fontSize: fontSizes.sm, color: colors.ink3, padding: 12 },
  findings: {
    backgroundColor: "white",
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: radii.lg,
    overflow: "hidden",
  },
  finding: { paddingHorizontal: 14, paddingVertical: 12 },
  findingDivider: {
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border2,
  },
  findingTitle: {
    fontSize: fontSizes.sm,
    color: colors.ink,
    marginBottom: 2,
  },
  findingMeta: {
    fontFamily: "Menlo",
    fontSize: 11,
    color: colors.ink5,
  },
});
