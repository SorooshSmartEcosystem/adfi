import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { colors, fontSizes } from "@orb/ui";
import { ThreadDetail } from "../../components/inbox/thread-detail";
import { CallDetail } from "../../components/inbox/call-detail";

export default function InboxDetail() {
  const { id, kind } = useLocalSearchParams<{
    id: string;
    kind?: "thread" | "call";
  }>();

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Text style={styles.back}>← inbox</Text>
        </Pressable>
      </View>
      {kind === "call" ? (
        <CallDetail callId={id} />
      ) : (
        <ThreadDetail threadId={id} />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 40 },
  headerRow: { marginBottom: 16 },
  back: { fontFamily: "Menlo", fontSize: fontSizes.sm, color: colors.ink },
});
