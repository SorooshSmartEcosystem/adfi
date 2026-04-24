import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { colors, fontSizes, radii } from "@orb/ui";
import { Shell } from "../../components/onboarding/shell";
import { Heading } from "../../components/onboarding/heading";
import { PrimaryButton } from "../../components/onboarding/primary-button";
import { LiveDot } from "../../components/shared/live-dot";
import { trpc } from "../../lib/trpc";

export default function OnboardingInstagram() {
  const [connected, setConnected] = useState(false);
  const completeMutation = trpc.onboarding.complete.useMutation({
    onSettled: () => router.replace("/home"),
  });

  return (
    <Shell step={6}>
      <Heading
        title="one last thing — instagram."
        sub="connect it so i can post for you too. totally optional."
      />

      <Pressable
        onPress={() => setConnected(true)}
        style={[styles.card, connected && styles.cardConnected]}
      >
        <View style={styles.icon}>
          <View style={styles.iconInner} />
        </View>
        <View style={styles.body}>
          <Text style={styles.title}>Instagram</Text>
          <Text
            style={[
              styles.status,
              { color: connected ? colors.aliveDark : colors.ink4 },
            ]}
          >
            {connected ? "✓ connected" : "tap to connect"}
          </Text>
        </View>
        {connected ? (
          <LiveDot size={8} animated />
        ) : (
          <Text style={styles.arrow}>→</Text>
        )}
      </Pressable>

      <View style={styles.reassurance}>
        <Text style={styles.reassuranceText}>
          we never see your password. more platforms later — for now, one is
          enough.
        </Text>
      </View>

      <PrimaryButton
        label={
          completeMutation.isPending
            ? "starting..."
            : connected
              ? "start working →"
              : "skip & start working →"
        }
        onPress={() => completeMutation.mutate()}
        disabled={completeMutation.isPending}
      />
    </Shell>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "white",
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: radii.xl,
    padding: 20,
    marginBottom: 14,
  },
  cardConnected: { borderColor: colors.alive },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  iconInner: {
    width: 18,
    height: 18,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: colors.ink,
  },
  body: { flex: 1 },
  title: { fontSize: fontSizes.md, fontWeight: "500", color: colors.ink },
  status: {
    fontFamily: "Menlo",
    fontSize: 11,
    marginTop: 3,
  },
  arrow: {
    fontFamily: "Menlo",
    fontSize: fontSizes.sm,
    color: colors.ink,
  },
  reassurance: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: 14,
    marginBottom: 22,
  },
  reassuranceText: {
    fontSize: fontSizes.sm,
    color: colors.ink3,
    lineHeight: fontSizes.sm * 1.6,
  },
});
