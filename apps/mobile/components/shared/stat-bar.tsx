import { StyleSheet, Text, View } from "react-native";
import { colors, fontSizes } from "@orb/ui";

type Segment = { label: string; value: number; color?: string };

const PALETTE = [colors.ink, "#666", "#999", "#D5D2C5"];

// Horizontal stacked bar matching the prototype's "channel balance"
// pattern: thin pill made of segments, each labelled below in mono.
export function StatBar({
  segments,
  caption,
  rightCaption,
}: {
  segments: Segment[];
  caption?: string;
  rightCaption?: string;
}) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;

  return (
    <View style={styles.wrap}>
      {(caption || rightCaption) && (
        <View style={styles.headerRow}>
          {caption ? <Text style={styles.caption}>{caption}</Text> : <View />}
          {rightCaption ? (
            <Text style={styles.rightCaption}>{rightCaption}</Text>
          ) : null}
        </View>
      )}
      <View style={styles.bar}>
        {segments.map((seg, i) => (
          <View
            key={i}
            style={{
              flex: seg.value / total,
              backgroundColor: seg.color ?? PALETTE[i % PALETTE.length],
              marginLeft: i === 0 ? 0 : 2,
            }}
          />
        ))}
      </View>
      <View style={styles.legend}>
        {segments.map((seg) => (
          <Text key={seg.label} style={styles.legendItem}>
            {seg.label.toLowerCase()} · {seg.value}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  caption: {
    fontFamily: "Menlo",
    fontSize: 10,
    color: colors.ink3,
    letterSpacing: 2,
  },
  rightCaption: {
    fontFamily: "Menlo",
    fontSize: 10,
    color: colors.aliveDark,
  },
  bar: {
    flexDirection: "row",
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 10,
  },
  legend: {
    flexDirection: "row",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 8,
  },
  legendItem: {
    fontFamily: "Menlo",
    fontSize: fontSizes.xs,
    color: colors.ink3,
  },
});
