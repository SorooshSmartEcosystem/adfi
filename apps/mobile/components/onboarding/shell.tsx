import type { ReactNode } from "react";
import { ScrollView, StyleSheet } from "react-native";
import { colors } from "@orb/ui";
import { Progress } from "./progress";

export function Shell({
  step,
  children,
}: {
  step: number;
  children: ReactNode;
}) {
  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <Progress step={step} />
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: 28, paddingTop: 20, paddingBottom: 40 },
});
