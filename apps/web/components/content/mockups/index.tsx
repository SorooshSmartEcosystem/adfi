// PlatformMockup — dispatcher. Picks the right mockup component
// based on the draft's platform + format. Format wins over platform
// when there's a conflict (a REEL_SCRIPT on INSTAGRAM picks the reel
// mockup, not the post mockup).

import { InstagramPostMockup } from "./instagram-post";
import { InstagramReelMockup } from "./instagram-reel";
import { TwitterMockup } from "./twitter";
import { LinkedInMockup } from "./linkedin";
import { FacebookMockup } from "./facebook";
import { TelegramMockup } from "./telegram";
import { EmailMockup } from "./email";
import type { MockupProps } from "./types";

type Platform =
  | "INSTAGRAM"
  | "FACEBOOK"
  | "LINKEDIN"
  | "EMAIL"
  | "PINTEREST"
  | "TWITTER"
  | "TELEGRAM"
  | "WEBSITE_ARTICLE";

type Format =
  | "SINGLE_POST"
  | "CAROUSEL"
  | "REEL_SCRIPT"
  | "EMAIL_NEWSLETTER"
  | "STORY_SEQUENCE";

type Props = MockupProps & {
  platform: Platform;
  format: Format;
};

export function PlatformMockup({
  platform,
  format,
  business,
  content,
  mp4Url,
  menu,
  onCreateVideo,
  videoBusy,
  postedAt,
}: Props) {
  // Format-driven dispatch first
  if (format === "REEL_SCRIPT") {
    return (
      <InstagramReelMockup
        business={business}
        content={content}
        mp4Url={mp4Url}
        menu={menu}
        onCreateVideo={onCreateVideo}
        videoBusy={videoBusy}
        postedAt={postedAt}
      />
    );
  }
  if (format === "EMAIL_NEWSLETTER" || platform === "EMAIL") {
    return (
      <EmailMockup
        business={business}
        content={content}
        menu={menu}
        postedAt={postedAt}
      />
    );
  }

  // Platform-driven dispatch
  switch (platform) {
    case "INSTAGRAM":
      return (
        <InstagramPostMockup
          business={business}
          content={content}
          menu={menu}
          postedAt={postedAt}
        />
      );
    case "TWITTER":
      return (
        <TwitterMockup
          business={business}
          content={content}
          menu={menu}
          postedAt={postedAt}
        />
      );
    case "LINKEDIN":
      return (
        <LinkedInMockup
          business={business}
          content={content}
          menu={menu}
          postedAt={postedAt}
        />
      );
    case "FACEBOOK":
      return (
        <FacebookMockup
          business={business}
          content={content}
          menu={menu}
          postedAt={postedAt}
        />
      );
    case "TELEGRAM":
      return (
        <TelegramMockup
          business={business}
          content={content}
          menu={menu}
          postedAt={postedAt}
        />
      );
    default:
      return (
        <InstagramPostMockup
          business={business}
          content={content}
          menu={menu}
          postedAt={postedAt}
        />
      );
  }
}

export type { MockupProps, MockupBusiness, DraftContent } from "./types";
