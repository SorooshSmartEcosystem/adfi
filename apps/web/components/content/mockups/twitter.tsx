// TwitterMockup — X / Twitter post frame.

"use client";

import { useState } from "react";
import type { MockupProps } from "./types";
import { pickPrimaryText } from "./types";

export function TwitterMockup({ business, content, menu }: MockupProps) {
  const handle =
    business.handle ?? business.name.toLowerCase().replace(/\s+/g, "");
  const fullText = pickPrimaryText(content);
  const tags = content.hashtags ?? [];
  const [expanded, setExpanded] = useState(false);

  // X cuts long tweets at ~280 chars in feed; we mimic that with
  // a "Show more" link inside the body.
  const TRUNC = 240;
  const isLong = fullText.length > TRUNC;
  const shown = expanded || !isLong ? fullText : fullText.slice(0, TRUNC).trimEnd() + "…";
  const inlineTags =
    tags.length > 0
      ? "\n\n" + tags.map((t) => (t.startsWith("#") ? t : `#${t}`)).join(" ")
      : "";

  return (
    <div className="bg-white border-hairline border-[#cfd9de] rounded-2xl overflow-hidden max-w-[560px] w-full px-lg py-md">
      <div className="flex gap-sm">
        <Avatar business={business} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-xs text-[14px] flex-wrap relative">
            <span className="font-bold text-[#0f1419]">{business.name}</span>
            {business.verified ? (
              <svg width="16" height="16" viewBox="0 0 22 22" fill="#1d9bf0" aria-label="verified">
                <path d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681s.075-1.299-.165-1.903c.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816zM9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z" />
              </svg>
            ) : null}
            <span className="text-[#536471]">@{handle}</span>
            <span className="text-[#536471]">·</span>
            <span className="text-[#536471]">just now</span>

            {/* ⋯ menu trigger sits at top-right of the tweet header */}
            <div className="ml-auto relative">
              <button
                type="button"
                onClick={menu?.onToggle}
                disabled={!menu}
                className="text-[#536471] hover:text-[#0f1419] text-lg leading-none w-6 h-6 flex items-center justify-center rounded-full hover:bg-[#1d9bf0]/10 disabled:opacity-30"
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
          </div>

          <div className="mt-xs text-[15px] leading-[1.4] text-[#0f1419] whitespace-pre-wrap" dir="auto">
            {linkify(shown + inlineTags)}
            {isLong && !expanded ? (
              <button
                type="button"
                onClick={() => setExpanded(true)}
                className="text-[#1d9bf0] ml-xs"
              >
                Show more
              </button>
            ) : null}
          </div>

          {content.imageUrl ? (
            <div className="mt-md rounded-2xl overflow-hidden border-hairline border-[#cfd9de]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={content.imageUrl} alt="" className="w-full" />
            </div>
          ) : null}

          <div className="flex items-center mt-md text-[13px] text-[#536471] gap-xl">
            <Stat icon={<TwitterIcon path="M1.751 10c0-4.42 3.584-8 8.005-8h4.366c4.49 0 8.129 3.64 8.129 8.13 0 2.96-1.607 5.68-4.196 7.11l-8.054 4.46v-3.69h-.067c-4.49.1-8.183-3.51-8.183-8.01z" />} value="12" />
            <Stat icon={<TwitterIcon path="M4.5 3.88l4.432 4.43-1.42 1.42L5 7.21V19a3 3 0 003 3h6v-2H8a1 1 0 01-1-1V7.21L4.51 9.71l-1.42-1.42L7.5 3.88zM18 10v9a1 1 0 001 1h2v2h-2a3 3 0 01-3-3v-9h-3l3.92-3.92L19.92 10H18z" />} value="4" />
            <Stat icon={<TwitterIcon path="M16.697 5.5c-1.222-.06-2.679.51-3.89 2.16l-.805 1.09-.806-1.09C9.984 6.01 8.526 5.44 7.304 5.5c-1.243.07-2.349.78-2.91 1.91-.552 1.12-.633 2.78.479 4.82 1.074 1.97 3.257 4.27 7.129 6.61 3.87-2.34 6.052-4.64 7.126-6.61 1.111-2.04 1.03-3.7.477-4.82-.561-1.13-1.666-1.84-2.908-1.91z" />} value="89" />
            <Stat icon={<TwitterIcon path="M8.75 21V3h2v18h-2zM18 21V8.5h2V21h-2zM4 21l.004-10h2L6 21H4z" />} value="1.2k" />
          </div>
        </div>
      </div>
    </div>
  );
}

function linkify(text: string): React.ReactNode {
  const parts = text.split(/(\s+)/);
  return parts.map((p, i) => {
    if (p.startsWith("#") || p.startsWith("@")) {
      return (
        <span key={i} style={{ color: "#1d9bf0" }}>
          {p}
        </span>
      );
    }
    if (/^https?:\/\//.test(p)) {
      return (
        <span key={i} style={{ color: "#1d9bf0" }}>
          {p}
        </span>
      );
    }
    return <span key={i}>{p}</span>;
  });
}

function Avatar({ business }: { business: MockupProps["business"] }) {
  if (business.logoUrl) {
    return (
      <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={business.logoUrl} alt="" className="w-full h-full object-cover" />
      </div>
    );
  }
  return (
    <div className="w-10 h-10 rounded-full bg-[#cfd9de] flex items-center justify-center flex-shrink-0 text-[12px] font-medium text-[#536471]">
      {business.initials}
    </div>
  );
}

function Stat({ icon, value }: { icon: React.ReactNode; value: string }) {
  return (
    <div className="flex items-center gap-xs">
      {icon}
      <span>{value}</span>
    </div>
  );
}

function TwitterIcon({ path }: { path: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d={path} />
    </svg>
  );
}
