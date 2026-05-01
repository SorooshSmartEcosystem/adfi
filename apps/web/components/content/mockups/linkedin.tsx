"use client";

import { useState } from "react";
import type { MockupProps } from "./types";
import { pickPrimaryText } from "./types";

export function LinkedInMockup({ business, content, menu }: MockupProps) {
  const text = pickPrimaryText(content);
  const [expanded, setExpanded] = useState(false);
  const TRUNC = 280;
  const isLong = text.length > TRUNC;
  const shown = expanded || !isLong ? text : text.slice(0, TRUNC).trimEnd() + "…";

  return (
    <div className="bg-white border-hairline border-[#dde1e6] rounded-md overflow-hidden max-w-[560px] w-full">
      <div className="px-md py-md">
        <div className="flex items-start gap-sm mb-sm relative">
          <Avatar business={business} />
          <div className="flex-1 min-w-0">
            <div className="text-[14px] font-semibold text-[#000000e6] truncate">
              {business.name}
            </div>
            <div className="text-[12px] text-[#00000099] truncate">
              business · {business.handle ? `linkedin.com/in/${business.handle}` : ""}
            </div>
            <div className="text-[12px] text-[#00000099] flex items-center gap-xs mt-[2px]">
              <span>just now</span>
              <span>·</span>
              <span>🌐</span>
            </div>
          </div>
          <button
            type="button"
            onClick={menu?.onToggle}
            disabled={!menu}
            className="text-[#00000099] hover:text-[#000000e6] text-xl leading-none disabled:opacity-30"
            aria-label="post actions"
          >
            ⋯
          </button>
          {menu?.open ? (
            <div className="absolute right-0 top-full mt-xs z-30">
              {menu.content}
            </div>
          ) : null}
        </div>

        <div className="text-[14px] leading-[1.5] text-[#000000e6] whitespace-pre-wrap" dir="auto">
          {shown}
          {isLong && !expanded ? (
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="text-[#0a66c2] font-medium ml-xs"
            >
              …see more
            </button>
          ) : null}
        </div>
      </div>

      {content.imageUrl ? (
        <div className="bg-[#f3f2ef] aspect-[4/3] flex items-center justify-center overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={content.imageUrl} alt="" className="w-full h-full object-cover" />
        </div>
      ) : null}

      <div className="px-md pt-sm pb-xs flex items-center gap-xs text-[12px] text-[#00000099] border-t-hairline border-[#e9e9e9]">
        <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-[#0a66c2] text-white text-[8px]">👍</span>
        <span>jane and 47 others</span>
        <span className="ml-auto">3 comments · 2 reposts</span>
      </div>

      <div className="grid grid-cols-4 border-t-hairline border-[#e9e9e9] text-[#00000099] text-[12px] font-medium">
        <Action label="Like" />
        <Action label="Comment" />
        <Action label="Repost" />
        <Action label="Send" />
      </div>
    </div>
  );
}

function Avatar({ business }: { business: MockupProps["business"] }) {
  if (business.logoUrl) {
    return (
      <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={business.logoUrl} alt="" className="w-full h-full object-cover" />
      </div>
    );
  }
  return (
    <div className="w-12 h-12 rounded-full bg-[#dde1e6] flex items-center justify-center flex-shrink-0 text-[13px] font-semibold text-[#00000099]">
      {business.initials}
    </div>
  );
}

function Action({ label }: { label: string }) {
  return (
    <div className="text-center py-sm hover:bg-[#f3f2ef] cursor-default">
      {label}
    </div>
  );
}
