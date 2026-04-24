import { ScrollView, StyleSheet } from "react-native";
import { router } from "expo-router";
import { colors } from "@orb/ui";
import { HomeHeader } from "./home-header";
import { HomeStatus } from "./home-status";
import { HomeNeedsYou } from "./home-needs-you";
import { ShowEverything } from "./show-everything";
import { Hairline } from "../shared/hairline";

type HomeData = {
  weeklyStats: {
    postsCount: number;
    reach: number;
    messagesHandled: number;
  };
  pendingFinding: { summary: string } | null;
};

function formatHeadline(postsCount: number): string {
  if (postsCount === 0) return "still warming up.";
  if (postsCount === 1) return "i posted 1 thing\nthis week.";
  return `i posted ${postsCount} things\nthis week.`;
}

function formatSubhead({
  reach,
  messagesHandled,
}: {
  reach: number;
  messagesHandled: number;
}): string[] {
  const lines: string[] = [];
  if (reach > 0) {
    lines.push(`${reach.toLocaleString()} people saw them.`);
  }
  if (messagesHandled > 0) {
    const s = messagesHandled === 1 ? "" : "s";
    lines.push(
      `${messagesHandled} customer${s} messaged you — i handled them.`,
    );
  }
  if (lines.length === 0) {
    lines.push("no traffic yet. i'll keep watching.");
  }
  return lines;
}

function formatDateLabel(): string {
  const d = new Date();
  const weekday = d.toLocaleDateString("en-US", { weekday: "long" });
  const month = d.toLocaleDateString("en-US", { month: "short" });
  const day = d.getDate();
  return `${weekday.toUpperCase()} · ${month.toUpperCase()} ${day}`;
}

export function HomeScreen({ data }: { data: HomeData }) {
  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <HomeHeader dateLabel={formatDateLabel()} />
      <HomeStatus
        headline={formatHeadline(data.weeklyStats.postsCount)}
        subhead={formatSubhead(data.weeklyStats)}
      />
      <Hairline marginVertical={0} />
      {data.pendingFinding ? (
        <HomeNeedsYou
          title={data.pendingFinding.summary}
          onPress={() => router.push("/needs-you")}
        />
      ) : null}
      <ShowEverything onPress={() => router.push("/everything")} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: 24, paddingTop: 30, paddingBottom: 40 },
});
