"use client";

import { useState } from "react";
import type { MockupProps } from "./types";

export function EmailMockup({ business, content, menu }: MockupProps) {
  const subject = content.subject ?? content.hook ?? "newsletter draft";
  const sections = content.sections ?? [];
  const fallbackBody = content.body ?? content.caption ?? "";
  const [expanded, setExpanded] = useState(false);

  // Compute the visible body text: when collapsed show only the
  // first section (or the first ~280 chars of the fallback body).
  const fullText =
    sections.length > 0
      ? sections
          .map((s) => (s.heading ? `${s.heading}\n${s.body}` : s.body))
          .join("\n\n")
      : fallbackBody;
  const TRUNC = 280;
  const isLong = fullText.length > TRUNC;

  return (
    <div className="bg-white border-hairline border-[#d4d4d8] rounded-md overflow-hidden max-w-[640px] w-full">
      {/* Email-client toolbar */}
      <div className="bg-[#f4f4f5] px-md py-sm flex items-center gap-sm border-b-hairline border-[#e4e4e7] relative">
        <div className="flex gap-xs">
          <span className="w-3 h-3 rounded-full bg-[#ff5f56]" />
          <span className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
          <span className="w-3 h-3 rounded-full bg-[#27c93f]" />
        </div>
        <span className="text-[12px] text-[#71717a] ml-md">Mail · Inbox</span>
        <button
          type="button"
          onClick={menu?.onToggle}
          disabled={!menu}
          className="ml-auto text-[#71717a] hover:text-[#27272a] text-lg leading-none disabled:opacity-30"
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

      {/* From / subject header */}
      <div className="px-lg pt-md pb-sm">
        <div className="flex items-start gap-md">
          <Avatar business={business} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-xs flex-wrap">
              <span className="text-[14px] font-semibold text-[#18181b]">
                {business.name}
              </span>
              <span className="text-[12px] text-[#71717a]">
                &lt;hello@{business.handle ?? "yourbrand"}.com&gt;
              </span>
            </div>
            <div className="text-[12px] text-[#71717a] mt-[2px]">
              to me · just now
            </div>
            <div className="text-[18px] font-semibold text-[#18181b] mt-sm">
              {subject}
            </div>
            {content.preheader ? (
              <div className="text-[13px] text-[#71717a] mt-xs italic" dir="auto">
                {content.preheader}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Hero image */}
      {content.imageUrl ? (
        <div className="bg-[#f4f4f5] flex items-center justify-center overflow-hidden max-h-[280px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={content.imageUrl} alt="" className="w-full object-cover" />
        </div>
      ) : null}

      {/* Body */}
      <div className="px-lg pt-lg pb-md text-[14px] leading-[1.65] text-[#27272a]" dir="auto">
        {sections.length > 0 ? (
          <>
            {(expanded ? sections : sections.slice(0, 1)).map((s, i) => (
              <div key={i} className={i > 0 ? "mt-lg" : ""}>
                {s.heading ? (
                  <div className="text-[16px] font-semibold text-[#18181b] mb-xs">
                    {s.heading}
                  </div>
                ) : null}
                <div className="whitespace-pre-wrap">{s.body}</div>
              </div>
            ))}
            {sections.length > 1 && !expanded ? (
              <button
                type="button"
                onClick={() => setExpanded(true)}
                className="mt-md text-[#0a66c2] font-medium"
              >
                show full email →
              </button>
            ) : null}
          </>
        ) : (
          <>
            {expanded || !isLong ? (
              <div className="whitespace-pre-wrap">{fullText}</div>
            ) : (
              <>
                <div className="whitespace-pre-wrap">
                  {fullText.slice(0, TRUNC).trimEnd()}…
                </div>
                <button
                  type="button"
                  onClick={() => setExpanded(true)}
                  className="mt-sm text-[#0a66c2] font-medium"
                >
                  show full email →
                </button>
              </>
            )}
          </>
        )}
      </div>

      {/* CTA button */}
      {content.cta?.label ? (
        <div className="px-lg pb-lg">
          <span className="inline-block bg-[#0a66c2] text-white text-[14px] font-medium px-lg py-sm rounded-full">
            {content.cta.label}
          </span>
        </div>
      ) : null}

      {/* Footer */}
      <div className="px-lg pb-md text-[11px] text-[#a1a1aa] border-t-hairline border-[#e4e4e7] pt-sm">
        you're receiving this because you subscribed to {business.name}.
        <span className="ml-xs underline">unsubscribe</span>
      </div>
    </div>
  );
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
    <div className="w-10 h-10 rounded-full bg-[#e4e4e7] flex items-center justify-center flex-shrink-0 text-[12px] font-semibold text-[#52525b]">
      {business.initials}
    </div>
  );
}
