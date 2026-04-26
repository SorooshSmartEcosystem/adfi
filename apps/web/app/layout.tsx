import type { Metadata } from "next";
import { TrpcProvider } from "../lib/trpc-provider";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.adfi.ca"),
  title: {
    default: "ADFI — an ai marketing team for solopreneurs",
    template: "%s · adfi",
  },
  description:
    "Your AI marketing team. Hire it, don't supervise it. Drafts posts, books calls, sends the newsletter — so you stay focused on the work.",
  openGraph: {
    type: "website",
    siteName: "adfi",
    title: "ADFI — an ai marketing team for solopreneurs",
    description:
      "Hire it, don't supervise it. Drafts posts, books calls, sends the newsletter.",
    url: "https://www.adfi.ca",
  },
  twitter: {
    card: "summary_large_image",
    title: "ADFI — an ai marketing team for solopreneurs",
    description:
      "Hire it, don't supervise it. Drafts posts, books calls, sends the newsletter.",
  },
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
