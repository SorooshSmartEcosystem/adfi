import { StyleSheet, Text, View } from "react-native";
import { colors, fontSizes } from "@orb/ui";

export function Heading({ title, sub }: { title: string; sub?: string }) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{title}</Text>
      {sub ? <Text style={styles.sub}>{sub}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 24 },
  title: {
    fontSize: fontSizes["3xl"],
    fontWeight: "500",
    color: colors.ink,
    letterSpacing: -0.8,
    lineHeight: fontSizes["3xl"] * 1.15,
    marginBottom: 8,
  },
  sub: {
    fontSize: fontSizes.base,
    color: colors.ink4,
    lineHeight: fontSizes.base * 1.5,
  },
});
