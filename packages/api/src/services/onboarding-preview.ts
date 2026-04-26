// Generates a one-shot "wow" demo for the unauthenticated onboarding screen:
// brand voice tokens + a single Instagram post + a hero photo. No user row,
// no DB writes — pure pass-through over Strategist + Echo + Replicate.
//
// Cost: ~5¢ Anthropic (Strategist + Echo) + ~1¢ Replicate (Flux Schnell).
// The preview is the strongest converting moment in the funnel; budget for it.

import { runStrategist, type BrandVoice } from "../agents/strategist";
import { runEcho } from "../agents/echo";
import { generateImageSafe } from "./replicate";

const PREVIEW_USER_ID_PLACEHOLDER = "preview";

function aspectRatioForInstagram() {
  return "4:5" as const;
}

export type OnboardingPreviewResult = {
  voice: {
    tone: string[];
    pillars: string[];
  };
  post: {
    hook: string;
    body: string;
    cta: string | null;
    hashtags: string[];
    visualDirection: string;
  };
  imageUrl: string | null;
};

export async function runOnboardingPreview(args: {
  businessDescription: string;
  previewId: string;
}): Promise<OnboardingPreviewResult> {
  const description = args.businessDescription.trim();
  if (description.length < 10) {
    throw new Error("Tell me a little more about your business — one sentence.");
  }
  if (description.length > 500) {
    throw new Error("Keep it under 500 characters — i'll figure out the rest.");
  }

  // 1. Brand voice — full Strategist run, no DB persistence (no userId).
  const voice = await runStrategist({
    businessDescription: description,
    goal: "MORE_CUSTOMERS",
  });

  // 2. First post — Echo's SINGLE_POST. Same: no userId, no draft row.
  const post = await runEcho({
    format: "SINGLE_POST",
    platform: "INSTAGRAM",
    businessDescription: description,
    brandVoice: voice,
    recentCaptions: [],
  });
  if (post.format !== "SINGLE_POST") {
    throw new Error("preview produced an unexpected format");
  }

  // 3. Hero image — best-effort. Failure leaves imageUrl null and the UI
  //    falls back to the gradient placeholder.
  const image = await generateImageSafe({
    userId: PREVIEW_USER_ID_PLACEHOLDER,
    draftId: args.previewId,
    slug: "hero",
    prompt: post.visualDirection,
    aspectRatio: aspectRatioForInstagram(),
  });

  return {
    voice: {
      tone: voice.voiceTone,
      pillars: voice.contentPillars,
    },
    post: {
      hook: post.hook,
      body: post.body,
      cta: post.cta,
      hashtags: post.hashtags,
      visualDirection: post.visualDirection,
    },
    imageUrl: image?.url ?? null,
  };
}

// Re-export for callers that want to type the brand voice they pass in.
export type { BrandVoice };
