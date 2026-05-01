// EmailNewsletterMockup — Mac Mail / iOS Mail style preview frame.
// From line, subject, preview snippet, body. Doesn't try to look like
// Gmail or Outlook in particular — a generic email-client frame is
// universally readable.

import type { MockupProps } from "./types";

export function EmailMockup({ business, content }: MockupProps) {
  const subject = content.subject ?? content.hook ?? "newsletter draft";
  const body = content.body ?? content.caption ?? "";

  return (
    <div className="bg-white border-hairline border-[#d4d4d8] rounded-md overflow-hidden max-w-[640px] w-full">
      {/* Email-client toolbar */}
      <div className="bg-[#f4f4f5] px-md py-sm flex items-center gap-sm border-b-hairline border-[#e4e4e7]">
        <div className="flex gap-xs">
          <span className="w-3 h-3 rounded-full bg-[#ff5f56]" />
          <span className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
          <span className="w-3 h-3 rounded-full bg-[#27c93f]" />
        </div>
        <span className="text-[12px] text-[#71717a] ml-md">Mail · Inbox</span>
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
          </div>
        </div>
      </div>

      {/* Body */}
      <div
        className="px-lg pb-lg text-[14px] leading-[1.6] text-[#27272a] whitespace-pre-wrap"
        dir="auto"
      >
        {body || (
          <span className="text-[#a1a1aa] italic">draft body pending — echo will fill this in once approved.</span>
        )}
      </div>

      {/* Footer (unsubscribe etc.) */}
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
