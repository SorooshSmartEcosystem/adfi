// InstagramReelMockup — vertical 9:16 frame mimicking IG Reels.
// Video plays inline if mp4Url is present; otherwise a "render needed"
// placeholder. Side icon stack (like / comment / share / save / mark
// + audio thumbnail), bottom caption with hashtags.

import type { MockupProps } from "./types";
import { pickPrimaryText } from "./types";

export function InstagramReelMockup({ business, content, mp4Url }: MockupProps) {
  const handle = business.handle ?? business.name.toLowerCase().replace(/\s+/g, "_");
  const caption = pickPrimaryText(content);
  const tags = content.hashtags ?? [];

  return (
    <div
      className="relative bg-black rounded-md overflow-hidden mx-auto"
      style={{ aspectRatio: "9 / 16", maxWidth: 320 }}
    >
      {/* Video / placeholder */}
      {mp4Url ? (
        <video
          src={mp4Url}
          controls
          playsInline
          loop
          muted
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-md text-white/70">
          <div className="w-16 h-16 rounded-full border-2 border-white/40 flex items-center justify-center">
            <div
              className="w-0 h-0 border-y-[10px] border-y-transparent border-l-[14px] border-l-white/70 ml-1"
            />
          </div>
          <div className="font-mono text-[10px] tracking-[0.2em]">
            REEL · NOT RENDERED
          </div>
        </div>
      )}

      {/* Top gradient overlay */}
      <div
        className="absolute top-0 left-0 right-0 h-16 pointer-events-none"
        style={{
          background:
            "linear-gradient(180deg, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0) 100%)",
        }}
      />
      <div className="absolute top-3 left-3 right-3 flex items-center justify-between text-white text-[12px]">
        <span className="font-semibold">Reels</span>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14.31 8l5.74 9.94M9.69 8h11.48M7.38 12l5.74-9.94M9.69 16L3.95 6.06M14.31 16H2.83M16.62 12l-5.74 9.94" />
        </svg>
      </div>

      {/* Right action stack */}
      <div className="absolute right-2 bottom-24 flex flex-col gap-md text-white items-center">
        <ReelIcon path="M12 21s-7-4.5-7-10a4 4 0 017-2.6A4 4 0 0119 11c0 5.5-7 10-7 10z" />
        <ReelIcon path="M21 11.5a8.4 8.4 0 01-1.3 4.5L21 21l-5-1.3a8.5 8.5 0 11-3-15.7 8.4 8.4 0 018 7.5z" />
        <ReelIcon path="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
        <ReelIcon path="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2v16z" />
      </div>

      {/* Bottom caption */}
      <div
        className="absolute bottom-0 left-0 right-0 p-md text-white pointer-events-none"
        style={{
          background:
            "linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.55) 100%)",
        }}
      >
        <div className="text-[13px] font-semibold mb-xs">{handle}</div>
        <div className="text-[12px] leading-relaxed line-clamp-3" dir="auto">
          {caption}
        </div>
        {tags.length > 0 ? (
          <div className="text-[11px] text-white/85 mt-xs line-clamp-1">
            {tags.slice(0, 5).map((t) => (t.startsWith("#") ? t : `#${t}`)).join(" ")}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ReelIcon({ path }: { path: string }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d={path} />
    </svg>
  );
}
