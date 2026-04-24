import { StyleSheet, Text, View } from "react-native";
import { colors } from "@orb/ui";

const TOTAL = 6;

export function Progress({ step }: { step: number }) {
  const safe = Math.min(Math.max(step, 1), TOTAL);
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{String(safe).padStart(2, "0")} / 06</Text>
      <View style={styles.dots}>
        {Array.from({ length: TOTAL }).map((_, i) => (
          <View
            key={i}
            style={[styles.pill, i < safe ? styles.pillOn : styles.pillOff]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 28,
  },
  label: {
    fontFamily: "Menlo",
    fontSize: 11,
    color: colors.ink5,
    letterSpacing: 1.6,
  },
  dots: { flexDirection: "row", gap: 4 },
  pill: { width: 14, height: 3, borderRadius: 2 },
  pillOn: { backgroundColor: colors.ink },
  pillOff: { backgroundColor: colors.border },
});
