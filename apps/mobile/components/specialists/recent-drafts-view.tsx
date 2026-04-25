import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { colors, fontSizes } from "@orb/ui";
import { trpc } from "../../lib/trpc";

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

function previewOf(content: unknown): string {
  if (!content || typeof content !== "object") return "(empty)";
  const c = content as Record<string, unknown>;
  if (typeof c.caption === "string" && c.caption) return c.caption;
  if (typeof c.subject === "string" && c.subject) return c.subject;
  if (typeof c.hook === "string" && c.hook) return c.hook;
  if (
    c.coverSlide &&
    typeof c.coverSlide === "object" &&
    typeof (c.coverSlide as { title?: string }).title === "string"
  ) {
    return (c.coverSlide as { title: string }).title;
  }
  return "(empty)";
}

function heroImageOf(content: unknown): string | null {
  if (!content || typeof content !== "object") return null;
  const c = content as Record<string, unknown>;
  const hero = c.heroImage as { url?: string } | undefined;
  return typeof hero?.url === "string" ? hero.url : null;
}

export function RecentDraftsView() {
  const draftsQuery = trpc.content.listDrafts.useQuery({ limit: 6 });
  const items = draftsQuery.data?.items ?? [];

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.label}>RECENT DRAFTS</Text>
        <Pressable onPress={() => router.push("/content")} hitSlop={8}>
          <Text style={styles.linkRight}>see all →</Text>
        </Pressable>
      </View>

      {draftsQuery.isLoading ? (
        <Text style={styles.empty}>one second</Text>
      ) : items.length === 0 ? (
        <Text style={styles.empty}>
          no drafts yet — hit &lsquo;run now&rsquo; above or open content to
          plan the week.
        </Text>
      ) : (
        items.map((d, i) => {
          const preview = previewOf(d.content);
          const hero = heroImageOf(d.content);
          return (
            <View
              key={d.id}
              style={[
                styles.row,
                i < items.length - 1 && styles.rowDivider,
              ]}
            >
              <Text style={styles.meta}>
                {d.format.toLowerCase().replace(/_/g, " ")} ·{" "}
                {d.status.toLowerCase()} · {timeLabel(d.createdAt)}
              </Text>
              {hero ? (
                <Image source={{ uri: hero }} style={styles.hero} />
              ) : null}
              <Text style={styles.preview} numberOfLines={3}>
                {preview}
              </Text>
            </View>
          );
        })
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "white",
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border2,
  },
  label: {
    fontFamily: "Menlo",
    fontSize: fontSizes.sm,
    color: colors.ink4,
    letterSpacing: 1.6,
  },
  linkRight: {
    fontFamily: "Menlo",
    fontSize: fontSizes.xs,
    color: colors.ink2,
    textDecorationLine: "underline",
  },
  row: { padding: 14 },
  rowDivider: {
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border2,
  },
  meta: {
    fontFamily: "Menlo",
    fontSize: 10,
    color: colors.ink4,
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  preview: {
    fontSize: fontSizes.sm,
    color: colors.ink,
    lineHeight: fontSizes.sm * 1.5,
  },
  hero: {
    width: "100%",
    aspectRatio: 4 / 5,
    borderRadius: 10,
    backgroundColor: colors.border2,
    marginBottom: 8,
  },
  empty: { padding: 14, fontSize: fontSizes.sm, color: colors.ink3 },
});
