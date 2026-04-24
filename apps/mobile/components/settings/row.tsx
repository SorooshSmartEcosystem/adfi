import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, fontSizes } from "@orb/ui";

export function SettingRow({
  label,
  value,
  onPress,
  isLast,
  labelColor,
  rightNode,
}: {
  label: string;
  value?: string;
  onPress?: () => void;
  isLast?: boolean;
  labelColor?: string;
  rightNode?: ReactNode;
}) {
  const Wrap = onPress ? Pressable : View;
  return (
    <Wrap
      onPress={onPress}
      style={[styles.row, !isLast && styles.rowDivider]}
    >
      <Text style={[styles.label, labelColor ? { color: labelColor } : null]}>
        {label}
      </Text>
      {rightNode ??
        (value ? <Text style={styles.value}>{value}</Text> : null)}
    </Wrap>
  );
}

export function SectionLabel({ children }: { children: string }) {
  return <Text style={styles.sectionLabel}>{children}</Text>;
}

export function RowGroup({ children }: { children: ReactNode }) {
  return <View style={styles.group}>{children}</View>;
}

const styles = StyleSheet.create({
  group: {
    backgroundColor: "white",
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: 14,
    overflow: "hidden",
    marginBottom: 18,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  rowDivider: {
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border2,
  },
  label: { fontSize: fontSizes.sm, color: colors.ink },
  value: {
    fontFamily: "Menlo",
    fontSize: fontSizes.sm,
    color: colors.ink4,
  },
  sectionLabel: {
    fontFamily: "Menlo",
    fontSize: 10,
    color: colors.ink5,
    letterSpacing: 2,
    marginBottom: 8,
    paddingLeft: 4,
  },
});
