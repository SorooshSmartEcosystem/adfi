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
import { TabbedScreen } from "../components/shared/tabbed-screen";

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

export default function NeedsYouScreen() {
  const utils = trpc.useUtils();
  const findingsQuery = trpc.insights.listFindings.useQuery({
    acknowledged: false,
    limit: 50,
  });
  const ack = trpc.insights.acknowledgeFinding.useMutation({
    onSuccess: () => {
      utils.insights.listFindings.invalidate();
      utils.user.getHomeData.invalidate();
    },
  });

  const items = findingsQuery.data ?? [];

  return (
    <TabbedScreen>
      <ScrollView style={styles.root} contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.push("/home")} hitSlop={10}>
            <Text style={styles.back}>← back</Text>
          </Pressable>
        </View>

        <Text style={styles.title}>needs you</Text>
        <Text style={styles.role}>
          things i flagged for you to look at — tap got it once you&apos;ve
          reviewed.
        </Text>

        {findingsQuery.isLoading ? (
          <ActivityIndicator color={colors.ink4} style={styles.loading} />
        ) : items.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>all clear.</Text>
            <Text style={styles.emptyBody}>
              nothing waiting on you right now. i&apos;ll surface things here as
              they come up.
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {items.map((f, i) => (
              <View
                key={f.id}
                style={[
                  styles.item,
                  i < items.length - 1 && styles.itemDivider,
                ]}
              >
                <Text style={styles.itemMeta}>
                  {f.agent.toLowerCase()} · {timeLabel(f.createdAt)} ·{" "}
                  {f.severity.toLowerCase()}
                </Text>
                <Text style={styles.itemTitle}>{f.summary}</Text>
                <Pressable
                  onPress={() => ack.mutate({ id: f.id })}
                  disabled={ack.isPending}
                  hitSlop={6}
                >
                  <Text style={styles.itemAck}>got it →</Text>
                </Pressable>
              </View>
            ))}
          </View>
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
  title: {
    fontSize: 23,
    fontWeight: "500",
    color: colors.ink,
    letterSpacing: -0.4,
    marginBottom: 4,
  },
  role: {
    fontSize: fontSizes.sm,
    color: colors.ink4,
    marginBottom: 22,
  },
  loading: { paddingVertical: 30 },
  empty: {
    backgroundColor: "white",
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: 18,
  },
  emptyTitle: {
    fontSize: fontSizes.base,
    color: colors.ink,
    marginBottom: 6,
  },
  emptyBody: {
    fontSize: fontSizes.sm,
    color: colors.ink3,
    lineHeight: fontSizes.sm * 1.5,
  },
  list: {
    backgroundColor: "white",
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: radii.lg,
    overflow: "hidden",
  },
  item: { paddingHorizontal: 16, paddingVertical: 14 },
  itemDivider: {
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border2,
  },
  itemMeta: {
    fontFamily: "Menlo",
    fontSize: 11,
    color: colors.ink5,
    marginBottom: 6,
  },
  itemTitle: {
    fontSize: fontSizes.sm,
    color: colors.ink,
    lineHeight: fontSizes.sm * 1.5,
    marginBottom: 8,
  },
  itemAck: {
    fontFamily: "Menlo",
    fontSize: fontSizes.xs,
    color: colors.attentionText,
  },
});
