import { StyleSheet, Text, View } from "react-native";
import { colors, fontSizes, fontWeights } from "@orb/ui";

export function SplashHero() {
  return (
    <View>
      <Text style={styles.line}>stop doing</Text>
      <Text style={styles.line}>your own</Text>
      <Text style={[styles.line, styles.faded]}>marketing.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  line: {
    fontSize: fontSizes["5xl"],
    fontWeight: `${fontWeights.medium}` as "500",
    letterSpacing: -1.8,
    lineHeight: fontSizes["5xl"],
    color: colors.ink,
  },
  faded: {
    color: colors.ink4,
  },
});
