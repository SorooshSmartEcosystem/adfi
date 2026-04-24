import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, fontSizes, fontWeights, radii } from "@orb/ui";

export function SplashCta({
  onStart,
  onSignIn,
}: {
  onStart: () => void;
  onSignIn: () => void;
}) {
  return (
    <View style={styles.wrap}>
      <Pressable style={styles.primary} onPress={onStart}>
        <Text style={styles.primaryText}>START HIRING →</Text>
      </Pressable>
      <Pressable onPress={onSignIn}>
        <Text style={styles.secondary}>already have an account? sign in</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingBottom: 24,
    gap: 14,
  },
  primary: {
    backgroundColor: colors.ink,
    paddingVertical: 16,
    borderRadius: radii.full,
    alignItems: "center",
  },
  primaryText: {
    color: colors.bg,
    fontSize: fontSizes.md,
    fontWeight: `${fontWeights.medium}` as "500",
    letterSpacing: 1.2,
  },
  secondary: {
    fontFamily: "Menlo",
    fontSize: fontSizes.xs,
    color: colors.ink4,
    letterSpacing: 0.2,
    textAlign: "center",
  },
});
