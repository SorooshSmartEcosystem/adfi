import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from "react-native";
import { router, usePathname } from "expo-router";
import { colors, fontSizes } from "@orb/ui";
import { LiveDot } from "./live-dot";

type Tab = {
  id: string;
  label: string;
  href: string;
  // Pathname prefixes that should mark this tab active. We match prefixes
  // because nested detail routes ('/inbox/[id]') still belong to the inbox tab.
  match: string[];
};

const TABS: Tab[] = [
  { id: "home", label: "home", href: "/home", match: ["/home"] },
  { id: "inbox", label: "inbox", href: "/inbox", match: ["/inbox"] },
  { id: "content", label: "content", href: "/content", match: ["/content"] },
  {
    id: "specialists",
    label: "agents",
    href: "/specialist/strategist",
    match: ["/specialist", "/specialists"],
  },
  { id: "settings", label: "settings", href: "/settings", match: ["/settings"] },
];

function isActive(pathname: string | null, tab: Tab): boolean {
  if (!pathname) return false;
  return tab.match.some((m) => pathname === m || pathname.startsWith(`${m}/`));
}

export function TabBar({ style }: { style?: ViewStyle }) {
  const pathname = usePathname();

  return (
    <View style={[styles.bar, style]}>
      {TABS.map((tab) => {
        const active = isActive(pathname, tab);
        return (
          <Pressable
            key={tab.id}
            onPress={() => {
              if (!active) router.replace(tab.href);
            }}
            style={styles.item}
            hitSlop={8}
          >
            {active ? (
              <LiveDot size={6} animated={false} />
            ) : (
              <View style={styles.dotIdle} />
            )}
            <Text style={[styles.label, active && styles.labelActive]}>
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingTop: 10,
    paddingBottom: 24,
    paddingHorizontal: 16,
    backgroundColor: "rgba(250, 250, 247, 0.96)",
    borderTopWidth: 0.5,
    borderTopColor: colors.border,
  },
  item: {
    alignItems: "center",
    gap: 4,
    flex: 1,
  },
  dotIdle: {
    width: 6,
    height: 6,
    borderRadius: 6,
    backgroundColor: colors.ink5,
    opacity: 0.4,
  },
  label: {
    fontFamily: "Menlo",
    fontSize: fontSizes.xs,
    color: colors.ink4,
    letterSpacing: 0.4,
  },
  labelActive: {
    color: colors.ink,
  },
});
