"use client";

import { useState } from "react";
import type { MockupProps } from "./types";
import { pickPrimaryText } from "./types";

export function TelegramMockup({ business, content, menu }: MockupProps) {
  const text = pickPrimaryText(content);
  const tags = content.hashtags ?? [];
  const [expanded, setExpanded] = useState(false);
  const TRUNC = 280;
  const isLong = text.length > TRUNC;
  const shown = expanded || !isLong ? text : text.slice(0, TRUNC).trimEnd() + "…";

  return (
    <div className="bg-[#e6ebee] p-md rounded-md max-w-[480px] w-full">
      <div className="bg-white rounded-md overflow-hidden shadow-sm relative">
        <div className="flex items-center gap-sm px-md pt-md">
          <Avatar business={business} />
          <div className="flex-1 min-w-0">
            <div className="text-[14px] font-semibold text-[#222] truncate">
              {business.name}
            </div>
            <div className="text-[11px] text-[#909499]">
              channel · 2.4k subscribers
            </div>
          </div>
          <button
            type="button"
            onClick={menu?.onToggle}
            disabled={!menu}
            className="text-[#909499] hover:text-[#222] text-lg leading-none disabled:opacity-30"
            aria-label="post actions"
          >
            ⋯
          </button>
          {menu?.open ? (
            <div className="absolute right-md top-full mt-xs z-30">
              {menu.content}
            </div>
          ) : null}
        </div>

        {content.imageUrl ? (
          <div className="mt-sm bg-[#f0f0f0]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={content.imageUrl} alt="" className="w-full max-h-[400px] object-cover" />
          </div>
        ) : null}

        <div className="px-md pt-sm pb-md text-[14px] leading-relaxed text-[#222] whitespace-pre-wrap" dir="auto">
          {shown}
          {isLong && !expanded ? (
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="text-[#168acd] ml-xs"
            >
              Read more
            </button>
          ) : null}
          {tags.length > 0 ? (
            <div className="mt-sm">
              {tags.slice(0, 6).map((t, i) => (
                <span key={i} className="text-[#168acd] mr-xs">
                  {t.startsWith("#") ? t : `#${t}`}
                </span>
              ))}
            </div>
          ) : null}
        </div>

        <div className="px-md pb-sm flex items-center gap-sm text-[11px] text-[#909499]">
          <span className="inline-flex items-center gap-xs">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            <span>1.4k</span>
          </span>
          <span className="ml-auto">just now</span>
        </div>
      </div>
    </div>
  );
}

function Avatar({ business }: { business: MockupProps["business"] }) {
  if (business.logoUrl) {
    return (
      <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={business.logoUrl} alt="" className="w-full h-full object-cover" />
      </div>
    );
  }
  return (
    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#5eb3f0] to-[#168acd] flex items-center justify-center flex-shrink-0 text-[11px] font-semibold text-white">
      {business.initials}
    </div>
  );
}
