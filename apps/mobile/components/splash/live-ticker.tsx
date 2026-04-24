import { useEffect, useRef, useState } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { colors, fontSizes } from "@orb/ui";
import { LiveDot } from "../shared/live-dot";

// Rotating ticker — each event string fades in/out every 3.5s. When wired to
// real data, pass a live feed of recent agent events instead of the fixtures.
export function LiveTicker({ events }: { events: string[] }) {
  const [index, setIndex] = useState(0);
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (events.length === 0) return;
    const timer = setInterval(() => {
      Animated.timing(opacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start(() => {
        setIndex((i) => (i + 1) % events.length);
        Animated.timing(opacity, {
          toValue: 1,
          duration: 350,
          useNativeDriver: true,
        }).start();
      });
    }, 3500);
    return () => clearInterval(timer);
  }, [events.length, opacity]);

  const current = events[index] ?? "";

  return (
    <View style={styles.row}>
      <LiveDot size={6} animated />
      <Animated.Text style={[styles.text, { opacity }]}>{current}</Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minHeight: 18,
  },
  text: {
    fontFamily: "Menlo",
    fontSize: fontSizes.xs,
    color: colors.ink2,
    letterSpacing: 0.2,
  },
});
