import { StyleSheet, Text } from "react-native";
import { colors, fontSizes } from "@orb/ui";

export function SplashSubtitle() {
  return (
    <Text style={styles.text}>
      six ai agents handle your calls, content, ads, and competitors — while
      you make things.
    </Text>
  );
}

const styles = StyleSheet.create({
  text: {
    fontSize: fontSizes.base,
    color: colors.ink2,
    lineHeight: fontSizes.base * 1.55,
    maxWidth: 260,
  },
});
