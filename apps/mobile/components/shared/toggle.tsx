import { useEffect, useRef } from "react";
import { Animated, Pressable, StyleSheet, View } from "react-native";
import { colors } from "@orb/ui";

// Mirrors the prototype's .toggle-sw — a 42×24 pill with a 20×20 thumb
// that slides on toggle.
export function Toggle({
  on,
  onChange,
  disabled,
}: {
  on: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
}) {
  const x = useRef(new Animated.Value(on ? 18 : 0)).current;

  useEffect(() => {
    Animated.timing(x, {
      toValue: on ? 18 : 0,
      duration: 180,
      useNativeDriver: true,
    }).start();
  }, [on, x]);

  return (
    <Pressable
      onPress={() => !disabled && onChange(!on)}
      style={[
        styles.track,
        { backgroundColor: on ? colors.ink : "#D5D2C5" },
        disabled && { opacity: 0.4 },
      ]}
    >
      <Animated.View style={[styles.thumb, { transform: [{ translateX: x }] }]}>
        <View />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: {
    width: 42,
    height: 24,
    borderRadius: 12,
    padding: 2,
    justifyContent: "center",
  },
  thumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "white",
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 1.5,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
});
