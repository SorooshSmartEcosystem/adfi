import { NextResponse } from "next/server";
import { requireAdmin } from "../../../../lib/require-admin";

// Reports whether key server-side env vars are present at request time.
// Returns booleans only — never the values themselves.
export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;
  const present = (k: string) => Boolean(process.env[k] && process.env[k]!.length > 0);
  return NextResponse.json({
    NEXT_PUBLIC_SUPABASE_URL: present("NEXT_PUBLIC_SUPABASE_URL"),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: present("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    SUPABASE_SERVICE_ROLE_KEY: present("SUPABASE_SERVICE_ROLE_KEY"),
    ANTHROPIC_API_KEY: present("ANTHROPIC_API_KEY"),
    REPLICATE_API_TOKEN: present("REPLICATE_API_TOKEN"),
    STRIPE_SECRET_KEY: present("STRIPE_SECRET_KEY"),
    SENDGRID_API_KEY: present("SENDGRID_API_KEY"),
    DATABASE_URL: present("DATABASE_URL"),
    META_APP_ID: present("META_APP_ID"),
    META_APP_SECRET: present("META_APP_SECRET"),
    META_WEBHOOK_VERIFY_TOKEN: present("META_WEBHOOK_VERIFY_TOKEN"),
    TOKEN_ENCRYPTION_KEY: present("TOKEN_ENCRYPTION_KEY"),
    NEXT_PUBLIC_WEB_URL: present("NEXT_PUBLIC_WEB_URL"),
  });
}
