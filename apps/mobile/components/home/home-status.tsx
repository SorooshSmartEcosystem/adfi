import { StyleSheet, Text, View } from "react-native";
import { colors, fontSizes } from "@orb/ui";
import { LiveDot } from "../shared/live-dot";

export function HomeStatus({
  headline,
  subhead,
}: {
  headline: string;
  subhead: string[];
}) {
  return (
    <View style={styles.wrap}>
      <View style={styles.statusRow}>
        <LiveDot size={7} animated />
        <Text style={styles.statusLabel}>EVERYTHING IS RUNNING</Text>
      </View>
      <Text style={styles.headline}>{headline}</Text>
      {subhead.map((line) => (
        <Text key={line} style={styles.sub}>
          {line}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 24 },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  statusLabel: {
    fontFamily: "Menlo",
    fontSize: 10,
    color: colors.aliveDark,
    letterSpacing: 2,
  },
  headline: {
    fontSize: fontSizes["3xl"],
    fontWeight: "500",
    color: colors.ink,
    letterSpacing: -0.7,
    lineHeight: fontSizes["3xl"] * 1.15,
    marginBottom: 10,
  },
  sub: {
    fontSize: fontSizes.md,
    color: colors.ink3,
    lineHeight: fontSizes.md * 1.5,
  },
});
