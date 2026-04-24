import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { colors, fontSizes, radii } from "@orb/ui";
import { Shell } from "../../components/onboarding/shell";
import { Heading } from "../../components/onboarding/heading";
import { PrimaryButton } from "../../components/onboarding/primary-button";
import { LiveDot } from "../../components/shared/live-dot";
import { trpc } from "../../lib/trpc";

function formatPhone(raw: string): string {
  const m = raw.match(/^\+(\d{1,2})(\d{3})(\d{3})(\d{4})$/);
  if (!m) return raw;
  const [, c, a, p, l] = m;
  return `+${c} (${a}) ${p}-${l}`;
}

export default function OnboardingPhone() {
  const [number, setNumber] = useState<string | null>(null);
  const provision = trpc.onboarding.provisionPhone.useMutation({
    onSuccess: (data) => setNumber(data.number),
  });

  return (
    <Shell step={5}>
      <Heading
        title="here's your adfi number."
        sub="this is how i catch calls and texts for you."
      />

      <View style={styles.phoneCard}>
        <View style={styles.row}>
          <LiveDot size={7} animated />
          <Text style={styles.label}>
            {number ? "ACTIVE · READY FOR CALLS" : "LET ME GRAB A LOCAL NUMBER"}
          </Text>
        </View>
        {number ? (
          <>
            <Text style={styles.number}>{formatPhone(number)}</Text>
            <Text style={styles.region}>local · toronto</Text>
          </>
        ) : (
          <Text style={styles.pending}>
            i&apos;ll reserve a number in your area so calls and texts come
            straight to me.
          </Text>
        )}
      </View>

      <Text style={styles.sectionLabel}>TWO WAYS TO USE IT</Text>
      <View style={styles.howCard}>
        <View style={styles.howRow}>
          <Text style={styles.howNum}>01</Text>
          <View style={styles.howBody}>
            <Text style={styles.howTitle}>
              forward your business line to this
            </Text>
            <Text style={styles.howSub}>
              when you miss a call, it rings me. i answer in your voice.
            </Text>
          </View>
        </View>
        <View style={styles.howDivider} />
        <View style={styles.howRow}>
          <Text style={styles.howNum}>02</Text>
          <View style={styles.howBody}>
            <Text style={styles.howTitle}>
              put it on your website or google business
            </Text>
            <Text style={styles.howSub}>
              new inquiries hit me directly — i qualify, answer, and book.
            </Text>
          </View>
        </View>
      </View>

      {number ? (
        <PrimaryButton
          label="continue →"
          onPress={() => router.push("/onboarding/instagram")}
        />
      ) : (
        <PrimaryButton
          label={provision.isPending ? "finding a number..." : "get me a number →"}
          onPress={() => provision.mutate()}
          disabled={provision.isPending}
        />
      )}

      <Pressable
        onPress={() => router.push("/onboarding/instagram")}
        hitSlop={10}
        style={styles.skipWrap}
      >
        <Text style={styles.skip}>i&apos;ll set it up later</Text>
      </Pressable>

      {provision.error ? (
        <Text style={styles.error}>{provision.error.message}</Text>
      ) : null}
    </Shell>
  );
}

const styles = StyleSheet.create({
  phoneCard: {
    backgroundColor: colors.ink,
    borderRadius: radii.xl,
    padding: 24,
    marginBottom: 16,
    alignItems: "center",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  label: {
    fontFamily: "Menlo",
    fontSize: 10,
    color: "rgba(255,255,255,0.6)",
    letterSpacing: 2,
  },
  number: {
    fontFamily: "Menlo",
    fontSize: 22,
    fontWeight: "500",
    color: "white",
    letterSpacing: -0.22,
    marginBottom: 6,
  },
  region: { fontSize: fontSizes.xs, color: "rgba(255,255,255,0.5)" },
  pending: {
    fontSize: fontSizes.sm,
    color: "rgba(255,255,255,0.8)",
    lineHeight: fontSizes.sm * 1.5,
    textAlign: "center",
  },
  sectionLabel: {
    fontFamily: "Menlo",
    fontSize: 10,
    color: colors.ink5,
    letterSpacing: 2,
    marginBottom: 8,
  },
  howCard: {
    backgroundColor: "white",
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: radii.lg,
    overflow: "hidden",
    marginBottom: 20,
  },
  howRow: { flexDirection: "row", gap: 10, padding: 14, alignItems: "flex-start" },
  howNum: {
    fontFamily: "Menlo",
    fontSize: 11,
    color: colors.ink,
    fontWeight: "500",
    marginTop: 2,
  },
  howBody: { flex: 1 },
  howTitle: {
    fontSize: fontSizes.sm,
    fontWeight: "500",
    color: colors.ink,
    marginBottom: 3,
  },
  howSub: {
    fontSize: fontSizes.xs,
    color: colors.ink4,
    lineHeight: fontSizes.xs * 1.5,
  },
  howDivider: { height: 0.5, backgroundColor: colors.border2 },
  skipWrap: { alignItems: "center", marginTop: 12 },
  skip: {
    fontFamily: "Menlo",
    fontSize: 11,
    color: colors.ink5,
  },
  error: {
    color: colors.urgent,
    fontFamily: "Menlo",
    fontSize: fontSizes.sm,
    marginTop: 12,
    textAlign: "center",
  },
});
