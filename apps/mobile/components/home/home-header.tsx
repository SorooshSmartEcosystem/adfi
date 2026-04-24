import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { colors, fontSizes } from "@orb/ui";

export function HomeHeader({ dateLabel }: { dateLabel: string }) {
  return (
    <View style={styles.row}>
      <View style={styles.leftGroup}>
        <View style={styles.orb} />
        <Text style={styles.date}>{dateLabel}</Text>
      </View>
      <Pressable onPress={() => router.push("/settings")} hitSlop={8}>
        <Text style={styles.settings}>settings</Text>
      </Pressable>
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
  leftGroup: { flexDirection: "row", alignItems: "center", gap: 10 },
  orb: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.ink,
  },
  date: {
    fontFamily: "Menlo",
    fontSize: fontSizes.xs,
    color: colors.ink4,
    letterSpacing: 1.6,
  },
  settings: {
    fontFamily: "Menlo",
    fontSize: fontSizes.xs,
    color: colors.ink5,
  },
});
