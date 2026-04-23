import type { Metadata } from "next";
import { TrpcProvider } from "../lib/trpc-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "ADFI",
  description: "Your AI marketing team. Hire it, don't supervise it.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <TrpcProvider>{children}</TrpcProvider>
      </body>
    </html>
  );
}
