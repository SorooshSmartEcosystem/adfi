// InstagramPostMockup — square frame mimicking IG feed UI.
// Header (avatar + handle), 1:1 image, action row (heart/comment/
// share/bookmark), like count, caption with handle prefix and
// truncated …more, hashtags color-shifted to IG link blue.

import type { MockupProps } from "./types";
import { pickPrimaryText, truncate } from "./types";

export function InstagramPostMockup({ business, content }: MockupProps) {
  const handle = business.handle ?? business.name.toLowerCase().replace(/\s+/g, "_");
  const caption = pickPrimaryText(content);
  const tags = content.hashtags ?? [];

  return (
    <div className="bg-white border-hairline border-border rounded-md overflow-hidden max-w-[420px] w-full">
      {/* Header */}
      <div className="flex items-center gap-sm px-md py-sm">
        <Avatar business={business} />
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-medium text-ink truncate">
            {handle}
          </div>
          <div className="text-[11px] text-ink4">sponsored · just now</div>
        </div>
        <div className="text-ink3 text-lg leading-none">⋯</div>
      </div>

      {/* Image */}
      <div className="aspect-square bg-surface flex items-center justify-center overflow-hidden">
        {content.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={content.imageUrl}
            alt=""
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="font-mono text-[10px] text-ink4 tracking-[0.2em]">
            IMAGE PENDING
          </div>
        )}
      </div>

      {/* Action row */}
      <div className="flex items-center gap-md px-md pt-sm pb-xs text-ink2">
        <IgIcon path="M12 21s-7-4.5-7-10a4 4 0 017-2.6A4 4 0 0119 11c0 5.5-7 10-7 10z" />
        <IgIcon path="M21 11.5a8.4 8.4 0 01-1.3 4.5L21 21l-5-1.3a8.5 8.5 0 11-3-15.7 8.4 8.4 0 018 7.5z" />
        <IgIcon path="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
        <span className="ml-auto" />
        <IgIcon path="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2v16z" />
      </div>

      {/* Likes */}
      <div className="px-md text-[13px] font-medium text-ink">
        liked by{" "}
        <span className="font-medium">jane</span> and{" "}
        <span className="font-medium">47 others</span>
      </div>

      {/* Caption */}
      <div className="px-md pt-xs pb-sm text-[13px] leading-relaxed text-ink" dir="auto">
        <span className="font-medium mr-xs">{handle}</span>
        {truncate(caption, 130)}
        {caption.length > 130 ? (
          <span className="text-ink4"> more</span>
        ) : null}
        {tags.length > 0 ? (
          <div className="text-[#385898] mt-xs">
            {tags
              .slice(0, 8)
              .map((t) => (t.startsWith("#") ? t : `#${t}`))
              .join(" ")}
          </div>
        ) : null}
      </div>

      {/* Comments hint */}
      <div className="px-md pb-md text-[12px] text-ink4">
        view all 3 comments
      </div>
    </div>
  );
}

function Avatar({ business }: { business: MockupProps["business"] }) {
  if (business.logoUrl) {
    return (
      <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 ring-2 ring-pink-500/40">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={business.logoUrl}
          alt=""
          className="w-full h-full object-cover"
        />
      </div>
    );
  }
  return (
    <div className="w-8 h-8 rounded-full bg-surface flex items-center justify-center flex-shrink-0 text-[10px] font-medium text-ink2">
      {business.initials}
    </div>
  );
}

function IgIcon({ path }: { path: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d={path} />
    </svg>
  );
}
