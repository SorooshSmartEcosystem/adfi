import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { colors, fontSizes, radii } from "@orb/ui";
import { Shell } from "../../components/onboarding/shell";
import { Heading } from "../../components/onboarding/heading";
import { PrimaryButton } from "../../components/onboarding/primary-button";

type PlanId = "starter" | "team" | "studio";

const PLANS: {
  id: PlanId;
  name: string;
  price: number;
  tagline: string;
  recommended?: boolean;
  features: string[];
}[] = [
  {
    id: "starter",
    name: "starter",
    price: 39,
    tagline: "the essentials",
    features: [
      "i answer your calls and texts",
      "i give you business insights each week",
    ],
  },
  {
    id: "team",
    name: "team",
    price: 99,
    tagline: "most solopreneurs pick this",
    recommended: true,
    features: [
      "everything in starter, plus:",
      "i post to instagram and linkedin",
      "i watch your competitors",
    ],
  },
  {
    id: "studio",
    name: "studio",
    price: 299,
    tagline: "a full marketing team",
    features: [
      "everything in team, plus:",
      "i run your paid ads",
      "unlimited everything",
    ],
  },
];

export default function OnboardingPlan() {
  const [selected, setSelected] = useState<PlanId>("team");

  return (
    <Shell step={4}>
      <Heading
        title="start my free trial."
        sub="7 days free. pick what you want me to do. change anytime."
      />

      <View style={styles.list}>
        {PLANS.map((p) => {
          const sel = selected === p.id;
          return (
            <Pressable
              key={p.id}
              onPress={() => setSelected(p.id)}
              style={[styles.card, sel && styles.cardSelected]}
            >
              {p.recommended ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>MOST POPULAR</Text>
                </View>
              ) : null}
              <View style={styles.topRow}>
                <View style={styles.nameRow}>
                  <View
                    style={[
                      styles.radio,
                      sel ? styles.radioOn : styles.radioOff,
                    ]}
                  />
                  <Text style={styles.name}>{p.name}</Text>
                </View>
                <Text style={styles.price}>
                  ${p.price}
                  <Text style={styles.per}>/mo</Text>
                </Text>
              </View>
              <Text style={styles.tagline}>{p.tagline}</Text>
              {sel ? (
                <View style={styles.featureList}>
                  {p.features.map((f) => (
                    <Text key={f} style={styles.feature}>
                      • {f}
                    </Text>
                  ))}
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.sectionLabel}>CARD ON FILE</Text>
      <View style={styles.cardInputWrap}>
        <View style={styles.cardLineTop}>
          <View style={styles.cardTag}>
            <Text style={styles.cardTagText}>CARD</Text>
          </View>
          <TextInput
            placeholder="card number"
            placeholderTextColor={colors.ink5}
            style={styles.cardInput}
          />
        </View>
        <View style={styles.cardLineBottom}>
          <View style={styles.cardLineHalf}>
            <TextInput
              placeholder="mm / yy"
              placeholderTextColor={colors.ink5}
              style={styles.cardInput}
            />
          </View>
          <View style={[styles.cardLineHalf, styles.cardLineHalfRight]}>
            <TextInput
              placeholder="cvc"
              placeholderTextColor={colors.ink5}
              style={styles.cardInput}
            />
          </View>
        </View>
      </View>

      <View style={styles.reassurance}>
        <Text style={styles.reassuranceText}>
          <Text style={styles.reassuranceBold}>
            you won&apos;t be charged today.
          </Text>{" "}
          your card will only be used after i&apos;ve shown real results.
        </Text>
      </View>

      <PrimaryButton
        label="start my 7 days free →"
        onPress={() => router.push("/onboarding/phone")}
      />
      <Text style={styles.footnote}>🔒 stripe · cancel anytime</Text>
    </Shell>
  );
}

const styles = StyleSheet.create({
  list: { gap: 10, marginBottom: 18 },
  card: {
    position: "relative",
    backgroundColor: "white",
    borderRadius: radii.xl,
    padding: 16,
    borderWidth: 0.5,
    borderColor: colors.border,
  },
  cardSelected: { borderWidth: 1.5, borderColor: colors.ink },
  badge: {
    position: "absolute",
    top: -9,
    left: 16,
    backgroundColor: colors.ink,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: radii.full,
  },
  badgeText: {
    color: "white",
    fontFamily: "Menlo",
    fontSize: 9,
    letterSpacing: 1.4,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  radio: { width: 16, height: 16, borderRadius: 8 },
  radioOn: { borderWidth: 5, borderColor: colors.ink },
  radioOff: { borderWidth: 1.5, borderColor: "#D5D2C5" },
  name: { fontSize: fontSizes.lg, fontWeight: "500", color: colors.ink },
  price: { fontSize: fontSizes.md, color: colors.ink, fontWeight: "500" },
  per: { color: colors.ink4, fontSize: fontSizes.xs },
  tagline: {
    fontFamily: "Menlo",
    fontSize: 10,
    color: colors.ink4,
    paddingLeft: 24,
    letterSpacing: 1,
  },
  featureList: {
    paddingLeft: 24,
    paddingTop: 8,
    marginTop: 8,
    borderTopWidth: 0.5,
    borderTopColor: colors.border2,
    gap: 5,
  },
  feature: {
    fontSize: fontSizes.sm,
    color: colors.ink2,
    lineHeight: fontSizes.sm * 1.5,
  },
  sectionLabel: {
    fontFamily: "Menlo",
    fontSize: 10,
    color: colors.ink5,
    letterSpacing: 2,
    marginBottom: 8,
  },
  cardInputWrap: {
    backgroundColor: "white",
    borderRadius: radii.lg,
    borderWidth: 0.5,
    borderColor: colors.border,
    marginBottom: 10,
    overflow: "hidden",
  },
  cardLineTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
  },
  cardTag: {
    width: 32,
    height: 22,
    backgroundColor: colors.surface,
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTagText: {
    fontFamily: "Menlo",
    fontSize: 9,
    color: colors.ink3,
  },
  cardLineBottom: {
    flexDirection: "row",
    borderTopWidth: 0.5,
    borderTopColor: colors.border2,
  },
  cardLineHalf: {
    flex: 1,
    padding: 14,
  },
  cardLineHalfRight: {
    borderLeftWidth: 0.5,
    borderLeftColor: colors.border2,
  },
  cardInput: {
    flex: 1,
    fontSize: fontSizes.base,
    color: colors.ink,
  },
  reassurance: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: 12,
    marginBottom: 18,
  },
  reassuranceText: {
    fontSize: fontSizes.sm,
    color: colors.ink3,
    lineHeight: fontSizes.sm * 1.6,
  },
  reassuranceBold: { color: colors.ink, fontWeight: "500" },
  footnote: {
    fontFamily: "Menlo",
    fontSize: 10,
    color: colors.ink5,
    textAlign: "center",
    marginTop: 10,
  },
});
