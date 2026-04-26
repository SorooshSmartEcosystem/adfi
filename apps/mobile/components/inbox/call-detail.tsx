import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { colors, fontSizes, radii } from "@orb/ui";
import { trpc } from "../../lib/trpc";

const STATUS_LABEL: Record<string, string> = {
  ANSWERED_BY_SIGNAL: "i answered the call.",
  ANSWERED_BY_USER: "you answered this one.",
  MISSED_AND_RECOVERED: "i caught a missed call.",
  MISSED_NO_RESPONSE: "missed — no response yet.",
};

export function CallDetail({ callId }: { callId: string }) {
  const query = trpc.calls.get.useQuery({ id: callId });

  if (query.isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.ink4} />
      </View>
    );
  }
  if (!query.data) {
    return <Text style={styles.empty}>call not found.</Text>;
  }

  const call = query.data;
  const intent = (call.extractedIntent ?? {}) as {
    summary?: string;
    category?: string;
  };
  const appt = call.appointments[0];

  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <Text style={styles.from}>{call.fromNumber}</Text>
        <Text style={styles.channel}>
          call ·{" "}
          {call.startedAt
            .toLocaleString("en-US", {
              weekday: "short",
              hour: "numeric",
              minute: "2-digit",
            })
            .toLowerCase()}
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>
          {STATUS_LABEL[call.recoveredStatus] ?? "call."}
        </Text>
        <Text style={styles.cardBody}>
          {intent.summary ??
            "no transcript yet — check back once i finish processing."}
        </Text>
      </View>

      {appt ? (
        <View style={styles.appt}>
          <View style={styles.apptTopRow}>
            <Text style={styles.apptLabel}>appointment booked</Text>
            {appt.estimatedValueCents ? (
              <Text style={styles.apptValue}>
                est. ${Math.round(appt.estimatedValueCents / 100)}
              </Text>
            ) : null}
          </View>
          <Text style={styles.apptTitle}>
            {appt.scheduledFor
              .toLocaleString("en-US", {
                weekday: "long",
                hour: "numeric",
                minute: "2-digit",
              })
              .toLowerCase()}{" "}
            · {appt.customerName}
          </Text>
          {appt.notes ? <Text style={styles.apptNotes}>{appt.notes}</Text> : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  head: { gap: 4, marginBottom: 4 },
  channel: {
    fontSize: fontSizes.xs,
    color: colors.ink4,
    marginTop: 2,
  },
  from: { fontSize: fontSizes.lg, fontWeight: "500", color: colors.ink },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: 16,
  },
  cardLabel: {
    fontSize: fontSizes.sm,
    color: colors.ink,
    fontWeight: "500",
    marginBottom: 8,
  },
  cardBody: {
    fontSize: fontSizes.base,
    color: colors.ink,
    lineHeight: fontSizes.base * 1.5,
  },
  appt: {
    backgroundColor: colors.attentionBg,
    borderWidth: 0.5,
    borderColor: colors.attentionBorder,
    borderRadius: radii.xl,
    padding: 16,
  },
  apptTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  apptLabel: {
    fontSize: fontSizes.xs,
    color: colors.attentionText,
  },
  apptValue: {
    fontSize: fontSizes.xs,
    color: colors.attentionText,
  },
  apptTitle: { fontSize: fontSizes.base, fontWeight: "500", color: colors.ink },
  apptNotes: { fontSize: fontSizes.sm, color: colors.ink3, marginTop: 4 },
  loading: { paddingVertical: 40, alignItems: "center" },
  empty: { fontSize: fontSizes.sm, color: colors.ink3, padding: 20 },
});
