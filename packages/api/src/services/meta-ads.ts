// Meta Ads — Marketing API integration. Phase 2 stub.
//
// Phase 1 generates campaign drafts but doesn't push them anywhere.
// This file exposes the eventual interface so the router and service
// layer can be written against final signatures from day 1.
//
// Phase 2 implementation references:
//   https://developers.facebook.com/docs/marketing-api/buying-api
//   https://developers.facebook.com/docs/marketing-api/reference/ad-campaign-group
//   https://developers.facebook.com/docs/marketing-api/reference/ad-campaign  (ad-set)
//   https://developers.facebook.com/docs/marketing-api/reference/adgroup     (ad)
//
// Required scope: `ads_management`. Currently NOT in META_OAUTH_SCOPES
// — needs adding when Phase 2 starts. App Review will be required for
// production use (Meta restricts ads_management).

const PHASE_2_NOT_WIRED =
  "Meta Ads push lands in Phase 2 — Phase 1 only generates drafts";

export type MetaCampaignPushArgs = {
  pageAccessToken: string;
  adAccountId: string;
  campaignId: string; // our internal Campaign.id
};

export async function pushCampaignToMeta(_args: MetaCampaignPushArgs): Promise<never> {
  throw new Error(PHASE_2_NOT_WIRED);
}

export async function pauseMetaAd(_args: {
  pageAccessToken: string;
  externalAdId: string;
}): Promise<never> {
  throw new Error(PHASE_2_NOT_WIRED);
}

export async function getMetaInsights(_args: {
  pageAccessToken: string;
  externalCampaignId: string;
  since: Date;
  until: Date;
}): Promise<never> {
  throw new Error(PHASE_2_NOT_WIRED);
}
