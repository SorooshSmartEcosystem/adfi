import { Pressable, StyleSheet, Text } from "react-native";
import { colors, fontSizes, radii } from "@orb/ui";

export function PrimaryButton({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.btn,
        disabled && styles.btnDisabled,
        pressed && !disabled && styles.btnPressed,
      ]}
    >
      <Text style={styles.text}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    backgroundColor: colors.ink,
    borderRadius: radii.lg,
    paddingVertical: 14,
    alignItems: "center",
  },
  btnDisabled: { opacity: 0.35 },
  btnPressed: { opacity: 0.85 },
  text: {
    color: colors.bg,
    fontFamily: "Menlo",
    fontSize: fontSizes.sm,
    fontWeight: "500",
    letterSpacing: 0.2,
  },
});
