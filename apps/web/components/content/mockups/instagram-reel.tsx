// InstagramReelMockup — vertical 9:16 frame mimicking IG Reels.
// Video plays inline if mp4Url is present; otherwise a "render needed"
// placeholder. Side icon stack (like / comment / share / save / mark
// + audio thumbnail), bottom caption with hashtags.

"use client";

import { useRef, useState } from "react";
import type { MockupProps } from "./types";
import { pickPrimaryText } from "./types";

export function InstagramReelMockup({
  business,
  content,
  mp4Url,
  menu,
  onCreateVideo,
  videoBusy,
}: MockupProps) {
  const handle = business.handle ?? business.name.toLowerCase().replace(/\s+/g, "_");
  const caption = pickPrimaryText(content);
  const tags = content.hashtags ?? [];
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [errored, setErrored] = useState(false);

  function togglePlay() {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      // Try to play with audio. Some browsers reject autoplay-with-sound,
      // so fall back to muted playback.
      v.muted = false;
      const p = v.play();
      if (p && typeof p.then === "function") {
        p.catch(() => {
          v.muted = true;
          v.play().catch(() => setErrored(true));
        });
      }
    } else {
      v.pause();
    }
  }

  return (
    <div
      className="relative bg-black rounded-md overflow-hidden mx-auto"
      style={{ aspectRatio: "9 / 16", maxWidth: 320 }}
    >
      {/* Video / placeholder */}
      {mp4Url && !errored ? (
        <>
          <video
            ref={videoRef}
            src={mp4Url}
            playsInline
            loop
            preload="metadata"
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onError={() => setErrored(true)}
            className="absolute inset-0 w-full h-full object-cover"
          />
          {/* Tap-anywhere play/pause overlay. Bigger hit target than
              native controls and works on mobile. Hides while playing
              so the post is fully visible. */}
          <button
            type="button"
            onClick={togglePlay}
            aria-label={playing ? "pause" : "play"}
            className={`absolute inset-0 z-20 flex items-center justify-center ${
              playing ? "opacity-0 hover:opacity-100" : "opacity-100"
            } transition-opacity`}
          >
            <span className="w-16 h-16 rounded-full bg-black/50 backdrop-blur flex items-center justify-center">
              {playing ? (
                <span className="flex gap-[3px]">
                  <span className="w-[4px] h-[18px] bg-white rounded-sm" />
                  <span className="w-[4px] h-[18px] bg-white rounded-sm" />
                </span>
              ) : (
                <span className="w-0 h-0 border-y-[10px] border-y-transparent border-l-[14px] border-l-white ml-[3px]" />
              )}
            </span>
          </button>
        </>
      ) : (
        // Empty state — when there's no mp4 (or it's broken) we make
        // the whole 9:16 area a single button that triggers video
        // creation. No more "play button does nothing" confusion.
        <button
          type="button"
          onClick={onCreateVideo}
          disabled={!onCreateVideo || videoBusy}
          className="absolute inset-0 flex flex-col items-center justify-center gap-md text-white px-md text-center disabled:cursor-default group"
          aria-label={videoBusy ? "creating video" : "create video"}
        >
          <span
            className={`w-20 h-20 rounded-full flex items-center justify-center transition-all ${
              videoBusy
                ? "bg-white/15 border-2 border-white/30 animate-pulse"
                : onCreateVideo
                  ? "bg-white/20 border-2 border-white/60 group-hover:bg-white/30 group-hover:scale-105"
                  : "bg-white/10 border-2 border-white/30"
            }`}
          >
            {videoBusy ? (
              <span className="font-mono text-[10px] tracking-[0.2em] text-white/85">
                ⏳
              </span>
            ) : (
              <span className="w-0 h-0 border-y-[12px] border-y-transparent border-l-[18px] border-l-white ml-[3px]" />
            )}
          </span>
          <span className="font-mono text-[10px] tracking-[0.22em] uppercase text-white/85">
            {videoBusy
              ? "creating video…"
              : errored
                ? "video unavailable"
                : onCreateVideo
                  ? "tap to create video"
                  : "no video yet"}
          </span>
          {errored && !videoBusy ? (
            <span className="text-[11px] leading-relaxed text-white/60 max-w-[240px]">
              the previous render's gone. tap to make a fresh one.
            </span>
          ) : null}
          {!errored && onCreateVideo && !videoBusy ? (
            <span className="text-[10px] leading-relaxed text-white/55">
              ~10 seconds · ~1¢
            </span>
          ) : null}
        </button>
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
        <div className="flex items-center gap-sm">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14.31 8l5.74 9.94M9.69 8h11.48M7.38 12l5.74-9.94M9.69 16L3.95 6.06M14.31 16H2.83M16.62 12l-5.74 9.94" />
          </svg>
          <button
            type="button"
            onClick={menu?.onToggle}
            disabled={!menu}
            className="text-white/90 hover:text-white text-lg leading-none disabled:opacity-30 relative"
            aria-label="post actions"
          >
            ⋯
          </button>
        </div>
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
