import type { ExpoConfig } from "expo/config";

const config: ExpoConfig = {
  name: "ADFI",
  slug: "adfi",
  scheme: "orb",
  version: "0.1.0",
  orientation: "portrait",
  userInterfaceStyle: "light",
  newArchEnabled: true,
  ios: {
    bundleIdentifier: "com.adfi.app",
    supportsTablet: false,
  },
  android: {
    package: "com.adfi.app",
  },
  plugins: ["expo-router"],
  experiments: {
    typedRoutes: true,
  },
};

export default config;
