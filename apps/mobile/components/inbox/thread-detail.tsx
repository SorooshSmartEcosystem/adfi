import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { colors, fontSizes, radii } from "@orb/ui";
import { trpc } from "../../lib/trpc";

function timeLabel(at: Date): string {
  return at.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export function ThreadDetail({ threadId }: { threadId: string }) {
  const utils = trpc.useUtils();
  const query = trpc.messaging.getThread.useQuery({ threadId });
  const [reply, setReply] = useState("");

  const sendReply = trpc.messaging.sendReply.useMutation({
    onSuccess: () => {
      setReply("");
      utils.messaging.getThread.invalidate({ threadId });
      utils.messaging.inboxFeed.invalidate();
    },
  });

  if (query.isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.ink4} />
      </View>
    );
  }

  const messages = query.data?.messages ?? [];
  const contact = query.data?.contact;
  if (messages.length === 0) {
    return <Text style={styles.empty}>this thread is empty.</Text>;
  }

  const first = messages[0]!;
  const headerName = contact?.displayName ?? first.fromAddress;

  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <Text style={styles.from}>{headerName}</Text>
        <Text style={styles.channel}>
          {first.channel} · {timeLabel(first.createdAt)}
        </Text>
      </View>

      <View style={styles.messages}>
        {messages.map((m) => {
          const outbound = m.direction === "OUTBOUND";
          return (
            <View
              key={m.id}
              style={[
                styles.bubbleRow,
                outbound ? styles.rowRight : styles.rowLeft,
              ]}
            >
              <View
                style={[
                  styles.bubble,
                  outbound ? styles.bubbleOut : styles.bubbleIn,
                ]}
              >
                <Text
                  style={[
                    styles.bubbleText,
                    outbound ? styles.bubbleTextOut : styles.bubbleTextIn,
                  ]}
                >
                  {m.body}
                </Text>
                <Text
                  style={[
                    styles.bubbleMeta,
                    outbound ? styles.bubbleMetaOut : styles.bubbleMetaIn,
                  ]}
                >
                  {outbound ? "me" : "them"} · {timeLabel(m.createdAt)}
                </Text>
              </View>
            </View>
          );
        })}
      </View>

      <View style={styles.replyRow}>
        <TextInput
          value={reply}
          onChangeText={setReply}
          placeholder="type a reply..."
          placeholderTextColor={colors.ink5}
          style={styles.input}
          editable={!sendReply.isPending}
        />
        <Pressable
          onPress={() =>
            reply.trim() && sendReply.mutate({ threadId, body: reply.trim() })
          }
          disabled={sendReply.isPending || !reply.trim()}
          style={[
            styles.sendBtn,
            (!reply.trim() || sendReply.isPending) && styles.sendBtnOff,
          ]}
        >
          <Text style={styles.sendText}>
            {sendReply.isPending ? "..." : "send"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 16 },
  head: { gap: 4 },
  channel: {
    fontFamily: "Menlo",
    fontSize: fontSizes.xs,
    color: colors.ink4,
    letterSpacing: 1.4,
  },
  from: { fontSize: fontSizes.lg, fontWeight: "500", color: colors.ink },
  messages: { gap: 8 },
  bubbleRow: { flexDirection: "row" },
  rowRight: { justifyContent: "flex-end" },
  rowLeft: { justifyContent: "flex-start" },
  bubble: { maxWidth: "78%", paddingHorizontal: 14, paddingVertical: 10 },
  bubbleIn: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderBottomLeftRadius: 4,
  },
  bubbleOut: {
    backgroundColor: colors.ink,
    borderRadius: 16,
    borderBottomRightRadius: 4,
  },
  bubbleText: { fontSize: fontSizes.base, lineHeight: fontSizes.base * 1.4 },
  bubbleTextIn: { color: colors.ink },
  bubbleTextOut: { color: "white" },
  bubbleMeta: {
    fontFamily: "Menlo",
    fontSize: 10,
    marginTop: 4,
  },
  bubbleMetaIn: { color: colors.ink4 },
  bubbleMetaOut: { color: "rgba(255,255,255,0.5)" },
  replyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 0.5,
    borderTopColor: colors.border2,
  },
  input: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: colors.bg,
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: radii.full,
    fontSize: fontSizes.sm,
    color: colors.ink,
  },
  sendBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    backgroundColor: colors.ink,
    borderRadius: radii.full,
  },
  sendBtnOff: { opacity: 0.4 },
  sendText: {
    color: "white",
    fontFamily: "Menlo",
    fontSize: fontSizes.sm,
    fontWeight: "500",
  },
  loading: { paddingVertical: 40, alignItems: "center" },
  empty: { fontSize: fontSizes.sm, color: colors.ink3, padding: 20 },
});
