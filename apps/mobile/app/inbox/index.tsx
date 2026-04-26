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
import { colors, fontSizes, radii } from "@orb/ui";
import { trpc } from "../../lib/trpc";
import { TabbedScreen } from "../../components/shared/tabbed-screen";
import { MsgRow } from "../../components/inbox/msg-row";

type Filter = "all" | "calls" | "texts" | "dms";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "all" },
  { id: "calls", label: "calls" },
  { id: "texts", label: "texts" },
  { id: "dms", label: "dms" },
];

export default function InboxIndex() {
  const [filter, setFilter] = useState<Filter>("all");
  const query = trpc.messaging.inboxFeed.useQuery({ filter, limit: 30 });
  const items = query.data ?? [];
  const needs = items.filter((i) => !i.handled);
  const done = items.filter((i) => i.handled);

  function openItem(item: { id: string; kind: "thread" | "call" }) {
    router.push({
      pathname: "/inbox/[id]",
      params: { id: item.id, kind: item.kind },
    });
  }

  return (
    <TabbedScreen>
      <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.push("/home")} hitSlop={10}>
          <Text style={styles.back}>← home</Text>
        </Pressable>
        <Text style={styles.filterLink}>filter</Text>
      </View>

      <Text style={styles.tag}>today</Text>
      <Text style={styles.title}>
        handled {items.filter((i) => i.handled).length} messages
      </Text>
      <Text style={styles.sub}>
        {needs.length} need your input
      </Text>

      <View style={styles.chips}>
        {FILTERS.map((f) => (
          <Pressable
            key={f.id}
            onPress={() => setFilter(f.id)}
            style={[styles.chip, filter === f.id && styles.chipOn]}
          >
            <Text
              style={[styles.chipText, filter === f.id && styles.chipTextOn]}
            >
              {f.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {query.isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.ink4} />
        </View>
      ) : items.length === 0 ? (
        <Text style={styles.empty}>
          no messages yet — once calls and texts land, they&apos;ll show up
          here.
        </Text>
      ) : (
        <>
          {needs.length ? (
            <>
              <Text style={styles.sectionLabel}>NEEDS YOU</Text>
              <View style={styles.list}>
                {needs.map((item) => (
                  <MsgRow
                    key={`${item.kind}-${item.id}`}
                    item={item}
                    tone="needs"
                    onPress={() => openItem(item)}
                  />
                ))}
              </View>
            </>
          ) : null}

          {done.length ? (
            <>
              <Text style={[styles.sectionLabel, { marginTop: 16 }]}>
                HANDLED
              </Text>
              <View style={styles.list}>
                {done.map((item) => (
                  <MsgRow
                    key={`${item.kind}-${item.id}`}
                    item={item}
                    tone="done"
                    onPress={() => openItem(item)}
                  />
                ))}
              </View>
            </>
          ) : null}
        </>
      )}
      </ScrollView>
    </TabbedScreen>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 100 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  back: { fontFamily: "Menlo", fontSize: fontSizes.sm, color: colors.ink },
  filterLink: {
    fontFamily: "Menlo",
    fontSize: fontSizes.xs,
    color: colors.ink5,
  },
  tag: {
    fontFamily: "Menlo",
    fontSize: fontSizes.xs,
    color: colors.ink5,
    letterSpacing: 1.6,
  },
  title: {
    fontSize: 21,
    fontWeight: "500",
    color: colors.ink,
    letterSpacing: -0.4,
    marginVertical: 4,
  },
  sub: { fontSize: fontSizes.sm, color: colors.ink4, marginBottom: 16 },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 14,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.full,
    borderWidth: 0.5,
    borderColor: colors.border,
    backgroundColor: "white",
  },
  chipOn: { backgroundColor: colors.ink, borderColor: colors.ink },
  chipText: {
    fontFamily: "Menlo",
    fontSize: fontSizes.xs,
    color: colors.ink3,
  },
  chipTextOn: { color: "white" },
  sectionLabel: {
    fontFamily: "Menlo",
    fontSize: 10,
    color: colors.ink5,
    letterSpacing: 2,
    marginBottom: 8,
  },
  list: { flexDirection: "column" },
  loading: { paddingVertical: 32, alignItems: "center" },
  empty: {
    fontSize: fontSizes.sm,
    color: colors.ink3,
    paddingVertical: 20,
  },
});
