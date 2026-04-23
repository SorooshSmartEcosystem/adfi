import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import superjson from "superjson";
import { useState, type ReactNode } from "react";
import { trpc } from "./trpc";
import { supabase } from "./supabase";

export function TrpcProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 30_000 },
        },
      }),
  );
  const [trpcClient] = useState(() => {
    const url =
      process.env.EXPO_PUBLIC_WEB_URL ?? "http://localhost:3000";
    return trpc.createClient({
      links: [
        httpBatchLink({
          url: `${url}/api/trpc`,
          transformer: superjson,
          async headers() {
            const { data } = await supabase.auth.getSession();
            return data.session
              ? { Authorization: `Bearer ${data.session.access_token}` }
              : {};
          },
        }),
      ],
    });
  });

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpc.Provider>
  );
}
