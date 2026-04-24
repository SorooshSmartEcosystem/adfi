import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, fontSizes, radii } from "@orb/ui";

export function HomeNeedsYou({
  title,
  subtitle,
  onPress,
}: {
  title: string;
  subtitle?: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.row}>
        <View style={styles.dot} />
        <Text style={styles.label}>ONE THING NEEDS YOU</Text>
      </View>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.sub}>{subtitle}</Text> : null}
      <Text style={styles.cta}>tap to help →</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.attentionBg,
    borderWidth: 0.5,
    borderColor: colors.attentionBorder,
    borderRadius: radii.xl,
    padding: 20,
    marginBottom: 22,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 7,
    backgroundColor: colors.attentionBorder,
  },
  label: {
    fontFamily: "Menlo",
    fontSize: 10,
    color: colors.attentionText,
    letterSpacing: 2,
  },
  title: {
    fontSize: fontSizes.lg,
    fontWeight: "500",
    color: colors.ink,
    letterSpacing: -0.17,
    lineHeight: fontSizes.lg * 1.3,
    marginBottom: 8,
  },
  sub: {
    fontSize: fontSizes.base,
    color: colors.ink3,
    lineHeight: fontSizes.base * 1.5,
    marginBottom: 14,
  },
  cta: {
    fontFamily: "Menlo",
    fontSize: fontSizes.xs,
    color: colors.attentionText,
  },
});
