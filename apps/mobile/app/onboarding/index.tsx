import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { colors, fontSizes, radii } from "@orb/ui";
import { Shell } from "../../components/onboarding/shell";
import { Heading } from "../../components/onboarding/heading";
import { PrimaryButton } from "../../components/onboarding/primary-button";
import { trpc } from "../../lib/trpc";

const EXAMPLES = [
  { label: "ceramics studio", text: "handmade ceramics studio in toronto" },
  { label: "yoga studio", text: "yoga studio with private classes" },
  { label: "dentist", text: "family dental practice" },
];

export default function OnboardingStart() {
  const [text, setText] = useState("");
  const mutation = trpc.onboarding.saveBusinessDescription.useMutation({
    onSuccess: () => router.push("/onboarding/goal"),
  });

  const hasBrief = text.trim().length >= 10;

  return (
    <Shell step={1}>
      <Heading
        title={"what does your\nbusiness do?"}
        sub="one line. i'll figure out the rest from your website and instagram."
      />

      <TextInput
        value={text}
        onChangeText={setText}
        multiline
        placeholder="i sell handmade ceramics in toronto"
        placeholderTextColor={colors.ink5}
        style={styles.input}
        editable={!mutation.isPending}
      />

      <Text style={styles.hint}>OR TRY AN EXAMPLE</Text>
      <View style={styles.chips}>
        {EXAMPLES.map((ex) => (
          <Pressable
            key={ex.label}
            onPress={() => setText(ex.text)}
            style={styles.chip}
          >
            <Text style={styles.chipText}>{ex.label}</Text>
          </Pressable>
        ))}
      </View>

      <PrimaryButton
        label={
          mutation.isPending
            ? "saving..."
            : hasBrief
              ? "continue →"
              : "write something to continue"
        }
        onPress={() => mutation.mutate({ text })}
        disabled={!hasBrief || mutation.isPending}
      />

      {mutation.error ? (
        <Text style={styles.error}>{mutation.error.message}</Text>
      ) : null}
    </Shell>
  );
}

const styles = StyleSheet.create({
  input: {
    minHeight: 100,
    backgroundColor: "white",
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: 14,
    fontSize: fontSizes.md,
    color: colors.ink,
    marginBottom: 20,
    textAlignVertical: "top",
  },
  hint: {
    fontFamily: "Menlo",
    fontSize: 10,
    color: colors.ink5,
    letterSpacing: 2,
    marginBottom: 10,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 24,
  },
  chip: {
    borderWidth: 0.5,
    borderColor: colors.border,
    backgroundColor: "white",
    borderRadius: radii.full,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  chipText: {
    fontFamily: "Menlo",
    fontSize: fontSizes.xs,
    color: colors.ink3,
  },
  error: {
    color: colors.urgent,
    fontFamily: "Menlo",
    fontSize: fontSizes.sm,
    marginTop: 12,
    textAlign: "center",
  },
});
