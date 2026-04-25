import { StyleSheet, Text, View } from "react-native";
import { colors, fontSizes, radii } from "@orb/ui";

type BrandVoice = {
  voiceTone?: string[];
  brandValues?: string[];
  audienceSegments?: { name: string; description: string }[];
  contentPillars?: string[];
  doNotDoList?: string[];
};

function timeAgo(d: Date | null | undefined): string {
  if (!d) return "never refreshed";
  const ms = Date.now() - d.getTime();
  const days = Math.floor(ms / (24 * 60 * 60 * 1000));
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks} week${weeks === 1 ? "" : "s"} ago`;
  const months = Math.floor(days / 30);
  return `${months} month${months === 1 ? "" : "s"} ago`;
}

function SectionCard({
  label,
  accent,
  children,
}: {
  label: string;
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.sectionHeader}>
        <View style={[styles.dot, { backgroundColor: accent }]} />
        <Text style={[styles.sectionLabel, { color: accent }]}>{label}</Text>
      </View>
      {children}
    </View>
  );
}

export function BrandVoiceView({
  voice,
  lastRefreshedAt,
}: {
  voice: BrandVoice | null;
  lastRefreshedAt: Date | null;
}) {
  if (!voice) {
    return (
      <View style={styles.card}>
        <Text style={styles.emptyLabel}>NO VOICE YET</Text>
        <Text style={styles.emptyBody}>
          finish onboarding (business description + goal) and i&apos;ll
          generate your brand voice here.
        </Text>
      </View>
    );
  }

  return (
    <>
      <View style={styles.headerRow}>
        <Text style={styles.headerLabel}>BRAND VOICE FINGERPRINT</Text>
        <Text style={styles.headerStamp}>
          refreshed {timeAgo(lastRefreshedAt)}
        </Text>
      </View>

      <SectionCard label="● HOW YOU SOUND" accent={colors.aliveDark}>
        <Text style={styles.body}>
          {(voice.voiceTone ?? []).join(" · ")}
        </Text>
      </SectionCard>

      <SectionCard label="● VALUES" accent={colors.aliveDark}>
        <View style={styles.chips}>
          {(voice.brandValues ?? []).map((v) => (
            <View key={v} style={styles.chip}>
              <Text style={styles.chipText}>{v}</Text>
            </View>
          ))}
        </View>
      </SectionCard>

      <SectionCard label="● AUDIENCE" accent={colors.attentionText}>
        {(voice.audienceSegments ?? []).map((seg) => (
          <Text key={seg.name} style={styles.audienceLine}>
            <Text style={styles.audienceName}>{seg.name}</Text>
            <Text style={styles.audienceDesc}> — {seg.description}</Text>
          </Text>
        ))}
      </SectionCard>

      <SectionCard label="● CONTENT PILLARS" accent={colors.ink4}>
        {(voice.contentPillars ?? []).map((p) => (
          <Text key={p} style={styles.bulletLine}>
            · {p}
          </Text>
        ))}
      </SectionCard>

      <SectionCard label="● THINGS I'LL AVOID" accent={colors.urgent}>
        {(voice.doNotDoList ?? []).map((d) => (
          <Text key={d} style={[styles.bulletLine, { color: colors.ink3 }]}>
            · {d}
          </Text>
        ))}
      </SectionCard>
    </>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  headerLabel: {
    fontFamily: "Menlo",
    fontSize: fontSizes.sm,
    color: colors.ink4,
    letterSpacing: 1.6,
  },
  headerStamp: {
    fontFamily: "Menlo",
    fontSize: fontSizes.xs,
    color: colors.ink4,
  },
  card: {
    backgroundColor: "white",
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  dot: { width: 6, height: 6, borderRadius: 6 },
  sectionLabel: {
    fontFamily: "Menlo",
    fontSize: 10,
    letterSpacing: 1.6,
  },
  body: {
    fontSize: fontSizes.base,
    color: colors.ink,
    lineHeight: fontSizes.base * 1.5,
  },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: {
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: radii.full,
  },
  chipText: { fontSize: fontSizes.sm, color: colors.ink },
  audienceLine: { marginBottom: 6 },
  audienceName: {
    fontSize: fontSizes.base,
    fontWeight: "500",
    color: colors.ink,
  },
  audienceDesc: { fontSize: fontSizes.base, color: colors.ink3 },
  bulletLine: {
    fontSize: fontSizes.base,
    color: colors.ink,
    lineHeight: fontSizes.base * 1.5,
    marginBottom: 4,
  },
  emptyLabel: {
    fontFamily: "Menlo",
    fontSize: fontSizes.sm,
    color: colors.ink4,
    letterSpacing: 1.6,
    marginBottom: 8,
  },
  emptyBody: {
    fontSize: fontSizes.base,
    color: colors.ink3,
    lineHeight: fontSizes.base * 1.5,
  },
});
