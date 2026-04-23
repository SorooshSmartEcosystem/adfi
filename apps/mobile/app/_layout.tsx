import { Stack } from "expo-router";
import { TrpcProvider } from "../lib/trpc-provider";

export default function RootLayout() {
  return (
    <TrpcProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </TrpcProvider>
  );
}
