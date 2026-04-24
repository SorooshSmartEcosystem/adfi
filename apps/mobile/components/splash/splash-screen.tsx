import { StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { colors } from "@orb/ui";
import { SplashHeader } from "./splash-header";
import { SplashHero } from "./splash-hero";
import { SplashSubtitle } from "./splash-subtitle";
import { LiveTicker } from "./live-ticker";
import { SplashCta } from "./splash-cta";

const TICKER_EVENTS = [
  "booked a $850 lead 3 min ago",
  "posted to instagram for someone in toronto",
  "replied to 14 dms this week",
  "caught a missed call — rebooked in 4 minutes",
];

export function SplashScreen() {
  return (
    <View style={styles.root}>
      <SplashHeader />

      <View style={styles.center}>
        <SplashHero />

        <View style={styles.divider} />

        <SplashSubtitle />

        <View style={styles.tickerWrap}>
          <LiveTicker events={TICKER_EVENTS} />
        </View>
      </View>

      <SplashCta
        onStart={() => router.push("/signin")}
        onSignIn={() => router.push("/signin")}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: 32,
    backgroundColor: colors.bg,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    marginTop: -40,
  },
  divider: {
    height: 0.5,
    backgroundColor: colors.border,
    width: 48,
    marginTop: 28,
    marginBottom: 20,
  },
  tickerWrap: {
    marginTop: 18,
  },
});
