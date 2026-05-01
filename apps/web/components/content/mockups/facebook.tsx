// FacebookMockup — Page post format. Header (logo + name + privacy
// icon + timestamp), text body with see-more, optional image, action
// row (Like / Comment / Share).

import type { MockupProps } from "./types";
import { pickPrimaryText, truncate } from "./types";

export function FacebookMockup({ business, content }: MockupProps) {
  const text = pickPrimaryText(content);
  const isLong = text.length > 220;

  return (
    <div className="bg-white border-hairline border-[#dadde1] rounded-md overflow-hidden max-w-[560px] w-full">
      <div className="px-md py-sm flex items-start gap-sm">
        <Avatar business={business} />
        <div className="flex-1 min-w-0">
          <div className="text-[15px] font-semibold text-[#050505] truncate">
            {business.name}
          </div>
          <div className="text-[13px] text-[#65676b] flex items-center gap-xs">
            <span>just now</span>
            <span>·</span>
            <span>🌐</span>
          </div>
        </div>
        <button type="button" className="text-[#65676b] text-xl leading-none">⋯</button>
      </div>

      <div className="px-md pb-sm text-[15px] leading-[1.4] text-[#050505] whitespace-pre-wrap" dir="auto">
        {truncate(text, 280)}
        {isLong ? (
          <span className="text-[#65676b] font-medium ml-xs">…See more</span>
        ) : null}
      </div>

      {content.imageUrl ? (
        <div className="bg-[#f0f2f5] aspect-[4/3] flex items-center justify-center overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={content.imageUrl} alt="" className="w-full h-full object-cover" />
        </div>
      ) : null}

      <div className="px-md py-sm flex items-center justify-between text-[13px] text-[#65676b] border-t-hairline border-[#e4e6eb]">
        <div className="flex items-center gap-xs">
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#1b74e4] text-white text-[10px]">👍</span>
          <span>62</span>
        </div>
        <div>3 comments · 2 shares</div>
      </div>

      <div className="grid grid-cols-3 border-t-hairline border-[#e4e6eb] text-[#65676b] text-[14px] font-semibold">
        <div className="text-center py-sm">👍 Like</div>
        <div className="text-center py-sm">💬 Comment</div>
        <div className="text-center py-sm">↗ Share</div>
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
    <div className="w-10 h-10 rounded-full bg-[#dadde1] flex items-center justify-center flex-shrink-0 text-[12px] font-semibold text-[#65676b]">
      {business.initials}
    </div>
  );
}
