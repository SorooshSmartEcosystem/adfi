// Type system for the motion-reel pipeline.
//
// A "scene" is a hand-tuned choreography — fixed timing, fixed
// animation curves, fixed structural beats. What varies per business
// is the brand tokens (palette + mark) and the content slots
// (customer messages, business name, stats). Same pattern as the
// design-agent application templates: typeset, not generated.

// Brand tokens consumed by every scene. Sourced from BrandKit on the
// server side; the scene renderer treats them as opaque hex values.
export type BrandTokens = {
  bg: string;
  surface: string;
  surface2: string;
  border: string;
  ink: string;
  ink2: string;
  ink3: string;
  ink4: string;
  alive: string;
  aliveDark: string;
  attnBg: string;
  attnBorder: string;
  attnText: string;
  // Inner SVG fragment (no outer <svg> wrapper) for the business mark.
  // Falls back to a solid orb when null.
  markInner?: string;
  businessName: string;
};

// Per-scene content shapes — each scene narrows this with its own type.
// `SceneInput<typeof signalScene>` resolves to the precise shape.
export type SceneInput<S extends Scene<unknown>> = S extends Scene<infer I>
  ? I
  : never;

export type Scene<TInput> = {
  // Stable identifier (used as the URL slug + the storage key prefix).
  id: string;
  // Human label shown in admin / picker UI.
  label: string;
  // Total duration of the scene in seconds. The render pipeline uses
  // this to set MediaRecorder timeslice + Puppeteer eviction.
  durationSec: number;
  // Output frame size. All scenes target 1080×1920 (9:16) for now —
  // Reels / TikToks / Shorts are vertical-first.
  width: number;
  height: number;
  // Render the scene as a complete standalone HTML document. Includes
  // <html>, <head><style>, <body> + the inline JS that drives the
  // animation off `document.startTime` (a global the recorder sets
  // before kicking off capture).
  html: (tokens: BrandTokens, content: TInput) => string;
};

// Signal-scene content shape — what a "Signal handles a real customer
// interaction" Reel needs to populate.
export type SignalSceneContent = {
  // Channel that signal answered through: a call, a DM, or an SMS.
  channel: "CALL" | "DM" | "SMS";
  // Display name for the channel (e.g. "INCOMING CALL", "INSTAGRAM DM").
  // Falls back to the channel value when omitted.
  channelLabel?: string;
  // Identifier shown above the message — phone number for a call,
  // username for a DM, etc. Phone numbers should be masked client-side
  // (e.g. "+1 (416) ••• 0934") before passing in.
  fromIdentifier: string;
  // The customer's message in their words. One sentence is ideal.
  customerMessage: string;
  // What signal did about it, in the brand's voice.
  // E.g. "i answered with rates", "i booked thursday at 2pm".
  replySummary: string;
  // Outcome line — e.g. "booked thursday · 2:00pm · est. $4-8k".
  outcomeLine: string;
  // Final stat shown at the end — e.g. "responded in 14s".
  statLine: string;
};
