import { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { skipToken } from "@tanstack/react-query";
import { colors, fontSizes, radii } from "@orb/ui";
import { Shell } from "../../components/onboarding/shell";
import { Heading } from "../../components/onboarding/heading";
import { PrimaryButton } from "../../components/onboarding/primary-button";
import { LiveDot } from "../../components/shared/live-dot";
import { trpc } from "../../lib/trpc";

type BrandVoice = {
  voiceTone: string[];
  brandValues: string[];
  audienceSegments: { name: string; description: string }[];
  contentPillars: string[];
  doNotDoList: string[];
};

const STEPS = [
  "reading your business description",
  "learning how you sound",
  "finding your real audience",
  "spotting your biggest opportunity",
];

export default function OnboardingAnalysis() {
  const hasStarted = useRef(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [brandVoice, setBrandVoice] = useState<BrandVoice | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const runMutation = trpc.onboarding.runAnalysis.useMutation({
    onSuccess: (data) => setJobId(data.jobId),
    onError: (err) => setErrorMessage(err.message),
  });

  const resultQuery = trpc.onboarding.getAnalysisResult.useQuery(
    jobId ? { jobId } : skipToken,
    {
      refetchInterval: (query) => {
        const data = query.state.data;
        if (!data || ("pending" in data && data.pending)) return 1500;
        return false;
      },
    },
  );

  useEffect(() => {
    if (!hasStarted.current) {
      hasStarted.current = true;
      runMutation.mutate();
    }
  }, [runMutation]);

  useEffect(() => {
    const data = resultQuery.data;
    if (data && !data.pending) setBrandVoice(data.result as BrandVoice);
  }, [resultQuery.data]);

  if (errorMessage) {
    return (
      <Shell step={3}>
        <Heading title="something went sideways." sub={errorMessage} />
        <PrimaryButton
          label="try again"
          onPress={() => {
            hasStarted.current = false;
            setErrorMessage(null);
            setJobId(null);
            runMutation.reset();
            runMutation.mutate();
          }}
        />
      </Shell>
    );
  }

  if (!brandVoice) {
    return (
      <Shell step={3}>
        <Heading
          title="give me 30 seconds."
          sub="i'll look at your business and tell you what i see."
        />

        <View style={styles.analyzing}>
          <View style={styles.row}>
            <LiveDot size={8} animated />
            <Text style={styles.analyzingLabel}>ANALYZING</Text>
          </View>
          <View style={styles.steps}>
            {STEPS.map((s, i) => (
              <View
                key={s}
                style={[styles.stepRow, i > 0 && styles.stepDim]}
              >
                <Text style={styles.stepNum}>
                  {String(i + 1).padStart(2, "0")}
                </Text>
                <Text style={styles.stepText}>{s}</Text>
              </View>
            ))}
          </View>
        </View>
        <Text style={styles.footnote}>
          no card needed yet · just a quick look
        </Text>
      </Shell>
    );
  }

  return (
    <Shell step={3}>
      <Heading
        title="here's what i see."
        sub="nice business."
      />

      <View style={[styles.card, styles.cardWhite]}>
        <View style={styles.row}>
          <View style={[styles.smallDot, { backgroundColor: colors.aliveDark }]} />
          <Text style={[styles.cardLabel, { color: colors.aliveDark }]}>
            HOW I&apos;LL REPRESENT YOU
          </Text>
        </View>
        <Text style={styles.cardBody}>
          you sound {brandVoice.voiceTone.join(" · ")}. i&apos;ll keep your
          values front-and-centre: {brandVoice.brandValues.join(", ")}.
        </Text>
      </View>

      <View style={[styles.card, styles.cardAttn]}>
        <View style={styles.row}>
          <View style={[styles.smallDot, { backgroundColor: colors.attentionBorder }]} />
          <Text style={[styles.cardLabel, { color: colors.attentionText }]}>
            YOUR REAL AUDIENCE
          </Text>
        </View>
        {brandVoice.audienceSegments.map((seg) => (
          <Text key={seg.name} style={styles.cardBody}>
            • <Text style={styles.bold}>{seg.name}</Text> — {seg.description}
          </Text>
        ))}
      </View>

      <View style={[styles.card, styles.cardWhite]}>
        <View style={styles.row}>
          <View style={[styles.smallDot, { backgroundColor: colors.ink }]} />
          <Text style={[styles.cardLabel, { color: colors.ink3 }]}>
            WHAT I&apos;LL POST ABOUT
          </Text>
        </View>
        {brandVoice.contentPillars.map((p) => (
          <Text key={p} style={styles.cardBody}>
            • {p}
          </Text>
        ))}
      </View>

      <View style={styles.trialPitch}>
        <Text style={styles.trialTitle}>
          want me to actually do this for you?
        </Text>
        <Text style={styles.trialSub}>
          7 days free · i won&apos;t charge until i&apos;ve proven i&apos;m
          working
        </Text>
      </View>

      <PrimaryButton
        label="start my free trial →"
        onPress={() => router.push("/onboarding/plan")}
      />
    </Shell>
  );
}

const styles = StyleSheet.create({
  analyzing: {
    backgroundColor: colors.ink,
    borderRadius: radii.xl,
    padding: 20,
    marginBottom: 20,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 16 },
  analyzingLabel: {
    fontFamily: "Menlo",
    fontSize: 11,
    color: "rgba(255,255,255,0.8)",
    letterSpacing: 2,
  },
  steps: { flexDirection: "column", gap: 10 },
  stepRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  stepDim: { opacity: 0.5 },
  stepNum: {
    fontFamily: "Menlo",
    fontSize: 11,
    color: "rgba(255,255,255,0.5)",
  },
  stepText: { fontSize: fontSizes.sm, color: "white" },
  footnote: {
    fontFamily: "Menlo",
    fontSize: fontSizes.xs,
    color: colors.ink5,
    textAlign: "center",
    marginTop: 10,
  },
  card: {
    borderRadius: radii.xl,
    padding: 16,
    marginBottom: 10,
    borderWidth: 0.5,
  },
  cardWhite: { backgroundColor: "white", borderColor: colors.border },
  cardAttn: {
    backgroundColor: colors.attentionBg,
    borderColor: colors.attentionBorder,
  },
  smallDot: { width: 6, height: 6, borderRadius: 6 },
  cardLabel: {
    fontFamily: "Menlo",
    fontSize: 10,
    letterSpacing: 2,
  },
  cardBody: {
    fontSize: fontSizes.base,
    color: colors.ink,
    lineHeight: fontSizes.base * 1.55,
    marginTop: 4,
  },
  bold: { fontWeight: "500" },
  trialPitch: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: 14,
    marginBottom: 18,
    alignItems: "center",
  },
  trialTitle: {
    fontSize: fontSizes.base,
    fontWeight: "500",
    color: colors.ink,
    marginBottom: 4,
  },
  trialSub: {
    fontSize: fontSizes.sm,
    color: colors.ink3,
    textAlign: "center",
  },
});
