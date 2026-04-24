import { StyleSheet, View } from "react-native";
import { colors } from "@orb/ui";

export function Hairline({ marginVertical = 0 }: { marginVertical?: number }) {
  return <View style={[styles.line, { marginVertical }]} />;
}

const styles = StyleSheet.create({
  line: {
    height: 0.5,
    backgroundColor: colors.border,
    alignSelf: "stretch",
  },
});
