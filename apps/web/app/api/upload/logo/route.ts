import { NextResponse } from "next/server";
import { createServerClient, createServiceRoleClient } from "@orb/auth/server";

// Logo upload — accepts multipart/form-data, stores in the
// `business-assets` bucket under {userId}/logo-{timestamp}.{ext},
// returns the public URL ready for User.businessLogoUrl.
//
// Bucket setup (one-time, in the Supabase dashboard):
//   Storage → New bucket → name 'business-assets' → Public bucket: ON
//
// We use the service-role key for the upload because the user's
// JWT-scoped client doesn't have storage write permission unless
// you configure a Storage RLS policy. Service-role bypasses RLS,
// which is fine here because we authenticate the user first.

export const runtime = "nodejs";

const ALLOWED = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];
const MAX_BYTES = 2 * 1024 * 1024; // 2 MB

export async function POST(request: Request) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let admin;
  try {
    admin = createServiceRoleClient();
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "supabase not configured" },
      { status: 500 },
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "expected form data" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "missing 'file' field" },
      { status: 400 },
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `file too large (max ${MAX_BYTES / 1024 / 1024} MB)` },
      { status: 400 },
    );
  }
  if (!ALLOWED.includes(file.type)) {
    return NextResponse.json(
      { error: `unsupported type — use png, jpg, webp, or svg` },
      { status: 400 },
    );
  }

  const ext = file.type.split("/")[1]?.replace("svg+xml", "svg") ?? "png";
  const path = `${user.id}/logo-${Date.now()}.${ext}`;

  const bytes = new Uint8Array(await file.arrayBuffer());
  const { error: uploadErr } = await admin.storage
    .from("business-assets")
    .upload(path, bytes, {
      contentType: file.type,
      upsert: true,
    });

  if (uploadErr) {
    return NextResponse.json(
      {
        error: `upload failed: ${uploadErr.message}. ensure the 'business-assets' bucket exists in supabase storage and is public.`,
      },
      { status: 500 },
    );
  }

  const { data: publicUrl } = admin.storage
    .from("business-assets")
    .getPublicUrl(path);

  return NextResponse.json({ url: publicUrl.publicUrl });
}
