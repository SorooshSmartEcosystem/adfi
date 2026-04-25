// Replicate image generation. We call Flux Schnell (fast + cheap) by default —
// sync prediction via the `Prefer: wait` header so the caller gets a URL back
// in one round trip. Replicate's CDN expires output URLs in ~24h, so we copy
// the bytes into our own `business-assets` bucket and return a permanent
// public URL.

import { createServiceRoleClient } from "@orb/auth/server";

export type AspectRatio =
  | "1:1"
  | "4:5"
  | "5:4"
  | "16:9"
  | "9:16"
  | "3:2"
  | "2:3";

export type ImageModel = "flux-schnell" | "flux-1.1-pro";

const MODEL_PATH: Record<ImageModel, string> = {
  "flux-schnell": "black-forest-labs/flux-schnell",
  "flux-1.1-pro": "black-forest-labs/flux-1.1-pro",
};

// Approximate per-image cost (cents) for admin financials.
export const IMAGE_COST_CENTS: Record<ImageModel, number> = {
  "flux-schnell": 1, // ~$0.003 → round up to 1 cent
  "flux-1.1-pro": 4, // ~$0.04
};

function token(): string {
  const t = process.env.REPLICATE_API_TOKEN;
  if (!t) throw new Error("REPLICATE_API_TOKEN must be set");
  return t;
}

async function runPrediction(args: {
  model: ImageModel;
  prompt: string;
  aspectRatio: AspectRatio;
}): Promise<string> {
  const res = await fetch(
    `https://api.replicate.com/v1/models/${MODEL_PATH[args.model]}/predictions`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token()}`,
        "Content-Type": "application/json",
        Prefer: "wait=60",
      },
      body: JSON.stringify({
        input: {
          prompt: args.prompt,
          aspect_ratio: args.aspectRatio,
          output_format: "webp",
          output_quality: 90,
        },
      }),
    },
  );

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Replicate ${res.status}: ${body.slice(0, 400)}`);
  }

  const data = (await res.json()) as {
    status: string;
    output?: string | string[] | null;
    error?: string | null;
  };

  if (data.status === "failed" || data.error) {
    throw new Error(`Replicate failed: ${data.error ?? "unknown"}`);
  }
  if (!data.output) {
    throw new Error(`Replicate returned no output (status: ${data.status})`);
  }
  return Array.isArray(data.output) ? data.output[0]! : data.output;
}

async function persistToStorage(args: {
  userId: string;
  draftId: string;
  slug: string;
  sourceUrl: string;
}): Promise<string> {
  const imageRes = await fetch(args.sourceUrl);
  if (!imageRes.ok) {
    throw new Error(`failed to fetch generated image: ${imageRes.status}`);
  }
  const bytes = new Uint8Array(await imageRes.arrayBuffer());

  const path = `${args.userId}/drafts/${args.draftId}/${args.slug}-${Date.now()}.webp`;
  const admin = createServiceRoleClient();
  const { error } = await admin.storage
    .from("business-assets")
    .upload(path, bytes, {
      contentType: "image/webp",
      upsert: true,
    });
  if (error) throw new Error(`storage upload failed: ${error.message}`);

  const { data } = admin.storage.from("business-assets").getPublicUrl(path);
  return data.publicUrl;
}

export async function generateImage(args: {
  userId: string;
  draftId: string;
  slug: string;
  prompt: string;
  aspectRatio?: AspectRatio;
  model?: ImageModel;
}): Promise<{ url: string; model: ImageModel; costCents: number }> {
  const model = args.model ?? "flux-schnell";
  const aspectRatio = args.aspectRatio ?? "1:1";

  const sourceUrl = await runPrediction({
    model,
    prompt: args.prompt,
    aspectRatio,
  });
  const url = await persistToStorage({
    userId: args.userId,
    draftId: args.draftId,
    slug: args.slug,
    sourceUrl,
  });

  return { url, model, costCents: IMAGE_COST_CENTS[model] };
}

// Best-effort image gen — never throws into the caller. Logs and returns null.
// Use this when image is a nice-to-have addition to a draft.
export async function generateImageSafe(
  args: Parameters<typeof generateImage>[0],
): Promise<{ url: string; costCents: number } | null> {
  try {
    const { url, costCents } = await generateImage(args);
    return { url, costCents };
  } catch (err) {
    console.warn("generateImage failed:", err);
    return null;
  }
}
