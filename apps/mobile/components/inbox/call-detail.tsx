import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { colors, fontSizes, radii } from "@orb/ui";
import { trpc } from "../../lib/trpc";

const STATUS_LABEL: Record<string, string> = {
  ANSWERED_BY_SIGNAL: "I ANSWERED THE CALL",
  ANSWERED_BY_USER: "YOU ANSWERED THIS CALL",
  MISSED_AND_RECOVERED: "I CAUGHT A MISSED CALL",
  MISSED_NO_RESPONSE: "MISSED — NO RESPONSE YET",
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
        <Text style={styles.channel}>
          CALL ·{" "}
          {call.startedAt.toLocaleString("en-US", {
            weekday: "short",
            hour: "numeric",
            minute: "2-digit",
          })}
        </Text>
        <Text style={styles.from}>{call.fromNumber}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>
          {STATUS_LABEL[call.recoveredStatus] ?? "CALL"}
        </Text>
        <Text style={styles.cardBody}>
          {intent.summary ?? "no transcript yet — check back once signal finishes processing."}
        </Text>
      </View>

      {appt ? (
        <View style={styles.appt}>
          <View style={styles.apptTopRow}>
            <Text style={styles.apptLabel}>APPOINTMENT BOOKED</Text>
            {appt.estimatedValueCents ? (
              <Text style={styles.apptValue}>
                EST. ${Math.round(appt.estimatedValueCents / 100)}
              </Text>
            ) : null}
          </View>
          <Text style={styles.apptTitle}>
            {appt.scheduledFor.toLocaleString("en-US", {
              weekday: "long",
              hour: "numeric",
              minute: "2-digit",
            })}{" "}
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
    fontFamily: "Menlo",
    fontSize: fontSizes.xs,
    color: colors.ink4,
    letterSpacing: 1.4,
  },
  from: { fontSize: fontSizes.lg, fontWeight: "500", color: colors.ink },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: 16,
  },
  cardLabel: {
    fontFamily: "Menlo",
    fontSize: fontSizes.xs,
    color: colors.ink4,
    letterSpacing: 1.4,
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
    fontFamily: "Menlo",
    fontSize: fontSizes.xs,
    color: colors.attentionText,
    letterSpacing: 1.4,
  },
  apptValue: {
    fontFamily: "Menlo",
    fontSize: fontSizes.xs,
    color: colors.attentionText,
  },
  apptTitle: { fontSize: fontSizes.base, fontWeight: "500", color: colors.ink },
  apptNotes: { fontSize: fontSizes.sm, color: colors.ink3, marginTop: 4 },
  loading: { paddingVertical: 40, alignItems: "center" },
  empty: { fontSize: fontSizes.sm, color: colors.ink3, padding: 20 },
});
