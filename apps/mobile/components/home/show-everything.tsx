import { Pressable, StyleSheet, Text } from "react-native";
import { colors, fontSizes } from "@orb/ui";

export function ShowEverything({ onPress }: { onPress: () => void }) {
  return (
    <Pressable onPress={onPress} hitSlop={10} style={styles.wrap}>
      <Text style={styles.text}>show me everything</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", paddingTop: 20 },
  text: {
    fontSize: fontSizes.sm,
    color: colors.ink4,
    borderBottomWidth: 0.5,
    borderColor: colors.ink5,
    paddingBottom: 2,
  },
});
