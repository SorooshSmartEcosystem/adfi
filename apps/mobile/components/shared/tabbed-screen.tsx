import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { colors } from "@orb/ui";
import { TabBar } from "./tab-bar";

// Layout helper: any screen that should show the bottom tab bar wraps its
// content in <TabbedScreen>. The tab bar floats at the bottom; child
// scroll views should add ~80px of paddingBottom so content isn't hidden.
export function TabbedScreen({ children }: { children: ReactNode }) {
  return (
    <View style={styles.root}>
      <View style={styles.content}>{children}</View>
      <TabBar />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { flex: 1 },
});
