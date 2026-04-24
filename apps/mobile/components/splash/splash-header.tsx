import { StyleSheet, Text, View } from "react-native";
import { colors, fontSizes } from "@orb/ui";

// Small top-bar mark — sphere dot + "adfi" wordmark. Lives at the very top of
// the splash. Uses the darker near-black "ink" dot to match the prototype's
// radial-gradient orb without needing actual gradient rendering.
export function SplashHeader() {
  return (
    <View style={styles.row}>
      <View style={styles.dot} />
      <Text style={styles.mark}>adfi</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.ink,
  },
  mark: {
    fontFamily: "Menlo",
    fontSize: fontSizes.xs,
    letterSpacing: 2.5,
    color: colors.ink,
  },
});
