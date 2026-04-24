import { useMemo } from "react";
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

const DAY_MS = 24 * 60 * 60 * 1000;
const DAY_LABELS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

type SlotItem = {
  id: string;
  platform: string;
  title: string;
  meta: string;
  timeLabel: string;
  state: "posted" | "queued" | "needs";
};

type DayBucket = { label: string; items: SlotItem[] };

function shortPlatform(p: string): string {
  if (p === "INSTAGRAM") return "IG";
  if (p === "LINKEDIN") return "LI";
  if (p === "FACEBOOK") return "FB";
  if (p === "EMAIL") return "EMAIL";
  return p.slice(0, 3);
}

function formatTime(d: Date): string {
  return d
    .toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    })
    .toLowerCase()
    .replace(" ", "");
}

export default function ContentScreen() {
  const draftsQuery = trpc.content.listDrafts.useQuery({ limit: 50 });
  const postsQuery = trpc.content.listPosts.useQuery({ limit: 50 });

  const buckets = useMemo<DayBucket[]>(() => {
    if (!draftsQuery.data || !postsQuery.data) return [];
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setHours(0, 0, 0, 0);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());

    const result: DayBucket[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart.getTime() + i * DAY_MS);
      const ds = d.getTime();
      const de = ds + DAY_MS;

      const posts = postsQuery.data.items.filter((p) => {
        const t = p.publishedAt.getTime();
        return t >= ds && t < de;
      });
      const drafts = draftsQuery.data.items.filter((dr) => {
        if (!dr.scheduledFor) return false;
        const t = dr.scheduledFor.getTime();
        return t >= ds && t < de;
      });
      if (posts.length === 0 && drafts.length === 0) continue;

      const items: SlotItem[] = [
        ...posts.map((p) => {
          const m = (p.metrics ?? {}) as { reach?: number };
          return {
            id: `p-${p.id}`,
            platform: shortPlatform(p.platform),
            title: `post on ${p.platform.toLowerCase()}`,
            meta: m.reach ? `${m.reach.toLocaleString()} reach` : "published",
            timeLabel: formatTime(p.publishedAt),
            state: "posted" as const,
          };
        }),
        ...drafts.map((dr) => {
          const c = (dr.content ?? {}) as { caption?: string };
          const needs =
            dr.status === "AWAITING_PHOTOS" || dr.status === "AWAITING_REVIEW";
          return {
            id: `d-${dr.id}`,
            platform: shortPlatform(dr.platform),
            title: c.caption?.slice(0, 60) ?? "draft",
            meta:
              dr.status === "AWAITING_PHOTOS"
                ? "awaiting photos"
                : dr.status === "AWAITING_REVIEW"
                  ? "needs your review"
                  : "scheduled",
            timeLabel: dr.scheduledFor ? formatTime(dr.scheduledFor) : "",
            state: needs ? ("needs" as const) : ("queued" as const),
          };
        }),
      ];

      result.push({
        label: `${DAY_LABELS[d.getDay()]} ${d.getDate()}`,
        items,
      });
    }
    return result;
  }, [draftsQuery.data, postsQuery.data]);

  const isLoading = draftsQuery.isLoading || postsQuery.isLoading;
  const needsCount = buckets.reduce(
    (n, b) => n + b.items.filter((i) => i.state === "needs").length,
    0,
  );
  const totalScheduled = buckets.reduce((n, b) => n + b.items.length, 0);

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.push("/home")} hitSlop={10}>
          <Text style={styles.back}>← home</Text>
        </Pressable>
      </View>

      <View style={styles.titleBlock}>
        <Text style={styles.tag}>ECHO · THIS WEEK</Text>
        <Text style={styles.title}>
          {totalScheduled === 0
            ? "nothing on the calendar yet"
            : `${totalScheduled} posts ${totalScheduled === 1 ? "scheduled" : "scheduled"}`}
        </Text>
        <Text style={styles.sub}>
          {needsCount === 0
            ? "i'm taking care of the rest"
            : `${needsCount} need your input`}
        </Text>
      </View>

      {isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.ink4} />
        </View>
      ) : buckets.length === 0 ? (
        <Text style={styles.empty}>
          nothing lined up this week — echo is still learning your voice.
        </Text>
      ) : (
        buckets.map((b) => (
          <View key={b.label} style={styles.dayBlock}>
            <Text style={styles.dayLabel}>{b.label}</Text>
            {b.items.map((item) => (
              <View
                key={item.id}
                style={[
                  styles.itemRow,
                  item.state === "needs" && styles.itemNeeds,
                  item.state === "posted" && styles.itemPosted,
                ]}
              >
                <View style={styles.timeCol}>
                  <View
                    style={[
                      styles.stateDot,
                      {
                        backgroundColor:
                          item.state === "posted"
                            ? colors.alive
                            : item.state === "needs"
                              ? colors.attentionBorder
                              : colors.ink3,
                      },
                    ]}
                  />
                  <Text
                    style={[
                      styles.time,
                      {
                        color:
                          item.state === "needs"
                            ? colors.attentionText
                            : colors.ink4,
                      },
                    ]}
                  >
                    {item.timeLabel}
                  </Text>
                </View>
                <View style={styles.itemBody}>
                  <Text style={styles.itemTitle} numberOfLines={2}>
                    {item.title}
                  </Text>
                  <Text
                    style={[
                      styles.itemMeta,
                      item.state === "needs" && {
                        color: colors.attentionText,
                      },
                    ]}
                  >
                    {item.platform} · {item.meta}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: 22, paddingTop: 20, paddingBottom: 40 },
  headerRow: { marginBottom: 14 },
  back: { fontFamily: "Menlo", fontSize: fontSizes.sm, color: colors.ink },
  titleBlock: { marginBottom: 16 },
  tag: {
    fontFamily: "Menlo",
    fontSize: fontSizes.xs,
    color: colors.ink5,
    letterSpacing: 1.6,
  },
  title: {
    fontSize: 22,
    fontWeight: "500",
    color: colors.ink,
    letterSpacing: -0.4,
    marginVertical: 4,
  },
  sub: { fontSize: fontSizes.sm, color: colors.ink4 },
  loading: { paddingVertical: 40, alignItems: "center" },
  empty: { fontSize: fontSizes.sm, color: colors.ink3, paddingVertical: 20 },
  dayBlock: { marginBottom: 12 },
  dayLabel: {
    fontFamily: "Menlo",
    fontSize: 11,
    color: colors.ink,
    letterSpacing: 1.6,
    marginBottom: 6,
  },
  itemRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    backgroundColor: "white",
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: 13,
    paddingVertical: 11,
    marginBottom: 5,
  },
  itemNeeds: {
    backgroundColor: colors.attentionBg,
    borderColor: colors.attentionBorder,
  },
  itemPosted: { opacity: 0.82 },
  timeCol: { alignItems: "center", width: 36, gap: 2 },
  stateDot: { width: 8, height: 8, borderRadius: 8 },
  time: { fontFamily: "Menlo", fontSize: 9 },
  itemBody: { flex: 1, minWidth: 0 },
  itemTitle: {
    fontSize: fontSizes.sm,
    color: colors.ink,
    lineHeight: fontSizes.sm * 1.4,
  },
  itemMeta: {
    fontFamily: "Menlo",
    fontSize: 11,
    color: colors.ink4,
    marginTop: 2,
  },
});
