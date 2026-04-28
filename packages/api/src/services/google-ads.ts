// Google Ads — Phase 3 stub. Same shape as meta-ads.ts — interface
// surface defined now so the router/service layer doesn't need
// rewriting when Phase 3 wires the actual API.
//
// Required: Google Ads API access (free Standard tier; apply at
//   https://developers.google.com/google-ads/api/docs/access-levels )
//   plus a developer token and an OAuth flow with `adwords` scope.
//   Separate from the existing Supabase Google OAuth — different
//   scope, different consent screen.

const PHASE_3_NOT_WIRED =
  "Google Ads push lands in Phase 3 — Phase 1 only generates drafts";

export type GoogleCampaignPushArgs = {
  refreshToken: string;
  customerId: string;
  campaignId: string; // our internal Campaign.id
};

export async function pushCampaignToGoogle(_args: GoogleCampaignPushArgs): Promise<never> {
  throw new Error(PHASE_3_NOT_WIRED);
}

export async function pauseGoogleAd(_args: {
  refreshToken: string;
  externalAdId: string;
}): Promise<never> {
  throw new Error(PHASE_3_NOT_WIRED);
}

export async function getGoogleInsights(_args: {
  refreshToken: string;
  externalCampaignId: string;
  since: Date;
  until: Date;
}): Promise<never> {
  throw new Error(PHASE_3_NOT_WIRED);
}
