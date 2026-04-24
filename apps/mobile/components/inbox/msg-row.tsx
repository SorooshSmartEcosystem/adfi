import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, fontSizes, radii } from "@orb/ui";

function channelLabel(channel: string): string {
  if (channel === "CALL") return "CALL";
  if (channel === "SMS") return "SMS";
  if (channel === "INSTAGRAM_DM") return "DM";
  return "EMAIL";
}

function timeLabel(at: Date): string {
  const diff = Date.now() - at.getTime();
  const h = Math.floor(diff / (60 * 60 * 1000));
  if (h < 1) return "just now";
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d === 1) return "yesterday";
  if (d < 7) return `${d}d ago`;
  return at.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

type Item = {
  kind: "thread" | "call";
  id: string;
  channel: string;
  fromAddress: string;
  preview: string;
  at: Date;
  handled: boolean;
  booked?: boolean;
};

export function MsgRow({
  item,
  tone,
  onPress,
}: {
  item: Item;
  tone: "needs" | "done";
  onPress: () => void;
}) {
  const isAmber = tone === "needs";
  const metaColor = isAmber ? colors.attentionText : colors.ink5;
  const statusColor = isAmber ? colors.attentionText : colors.aliveDark;
  const rightLabel = item.booked ? "booked" : item.handled ? "replied" : "";
  return (
    <Pressable
      onPress={onPress}
      style={[styles.row, isAmber ? styles.amber : styles.plain]}
    >
      <View style={styles.topLine}>
        <Text style={[styles.meta, { color: metaColor }]}>
          {channelLabel(item.channel)} · {timeLabel(item.at)}
        </Text>
        {rightLabel ? (
          <Text style={[styles.status, { color: statusColor }]}>
            {rightLabel}
          </Text>
        ) : null}
      </View>
      <Text style={styles.title} numberOfLines={1}>
        {item.fromAddress}
      </Text>
      <Text style={styles.sub} numberOfLines={1}>
        {item.preview}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    borderRadius: radii.lg,
    padding: 14,
    borderWidth: 0.5,
    marginBottom: 6,
  },
  amber: {
    backgroundColor: colors.attentionBg,
    borderColor: colors.attentionBorder,
  },
  plain: { backgroundColor: "white", borderColor: colors.border },
  topLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 3,
  },
  meta: { fontFamily: "Menlo", fontSize: 11 },
  status: { fontFamily: "Menlo", fontSize: 11 },
  title: {
    fontSize: fontSizes.sm,
    fontWeight: "500",
    color: colors.ink,
    marginBottom: 2,
  },
  sub: { fontSize: fontSizes.xs, color: colors.ink4 },
});
