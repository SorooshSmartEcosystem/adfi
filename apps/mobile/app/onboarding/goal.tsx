import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { colors, fontSizes, radii } from "@orb/ui";
import { Shell } from "../../components/onboarding/shell";
import { Heading } from "../../components/onboarding/heading";
import { PrimaryButton } from "../../components/onboarding/primary-button";
import { trpc } from "../../lib/trpc";

type GoalValue = "MORE_CUSTOMERS" | "MORE_REPEAT_BUYERS" | "MORE_VISIBILITY";

const GOALS: { id: GoalValue; title: string; sub: string }[] = [
  {
    id: "MORE_CUSTOMERS",
    title: "more customers",
    sub: "get new people to discover and buy from you",
  },
  {
    id: "MORE_REPEAT_BUYERS",
    title: "more repeat buyers",
    sub: "keep existing customers coming back",
  },
  {
    id: "MORE_VISIBILITY",
    title: "more visibility",
    sub: "grow your audience and brand presence",
  },
];

export default function OnboardingGoal() {
  const [choice, setChoice] = useState<GoalValue | null>(null);
  const mutation = trpc.onboarding.saveGoal.useMutation({
    onSuccess: () => router.push("/onboarding/analysis"),
  });

  return (
    <Shell step={2}>
      <Heading
        title={"what do you\nwant more of?"}
        sub="pick one. you can change this anytime."
      />

      <View style={styles.list}>
        {GOALS.map((g) => {
          const sel = choice === g.id;
          return (
            <Pressable
              key={g.id}
              onPress={() => setChoice(g.id)}
              style={[styles.card, sel && styles.cardOn]}
            >
              <View style={[styles.dot, sel && styles.dotOn]} />
              <View style={styles.cardText}>
                <Text style={[styles.title, sel && styles.titleOn]}>
                  {g.title}
                </Text>
                <Text style={[styles.sub, sel && styles.subOn]}>{g.sub}</Text>
              </View>
              {sel ? <Text style={styles.check}>✓</Text> : null}
            </Pressable>
          );
        })}
      </View>

      <PrimaryButton
        label={
          mutation.isPending
            ? "saving..."
            : choice
              ? "continue →"
              : "pick a goal to continue"
        }
        onPress={() => choice && mutation.mutate({ goal: choice })}
        disabled={!choice || mutation.isPending}
      />

      {mutation.error ? (
        <Text style={styles.error}>{mutation.error.message}</Text>
      ) : null}
    </Shell>
  );
}

const styles = StyleSheet.create({
  list: { gap: 10, marginBottom: 24 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 16,
    borderRadius: radii.lg,
    borderWidth: 0.5,
    borderColor: colors.border,
    backgroundColor: "white",
  },
  cardOn: { backgroundColor: colors.ink, borderColor: colors.ink },
  dot: {
    width: 9,
    height: 9,
    borderRadius: 9,
    backgroundColor: "#D5D2C5",
  },
  dotOn: { backgroundColor: "rgba(255,255,255,0.7)" },
  cardText: { flex: 1 },
  title: { fontSize: fontSizes.md, fontWeight: "500", color: colors.ink },
  titleOn: { color: "white" },
  sub: {
    fontFamily: "Menlo",
    fontSize: fontSizes.xs,
    color: colors.ink4,
    marginTop: 3,
  },
  subOn: { color: "rgba(255,255,255,0.6)" },
  check: {
    fontFamily: "Menlo",
    fontSize: fontSizes.md,
    color: "white",
  },
  error: {
    color: colors.urgent,
    fontFamily: "Menlo",
    fontSize: fontSizes.sm,
    marginTop: 12,
    textAlign: "center",
  },
});
