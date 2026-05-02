# Motion-reel redesign — phased upgrade

The motion-reel engine is the code-as-video pipeline that produces ADFI's
short-form reels. The agent (Haiku, prompt-cached) emits a `VideoScript`;
the renderer plays each scene back-to-back via Remotion's `<Sequence>`;
Lambda renders the mp4. **Cost stays fixed at ~1.1¢ per video** because
every visual upgrade is pure React/CSS animation — no extra LLM or media
API calls.

This doc tracks the multi-phase redesign that takes the engine from
"clean PowerPoint export" to "professionally-edited reel."

---

## Phase 1 — visual + transition variety (shipped)

Goal: kill the "every scene looks identical" problem. One week of work,
biggest single visual win, zero recurring cost.

### What shipped

**4 layout primitives** — scenes can pick a layout per beat instead of
all being centered:

| File | Purpose |
|---|---|
| `primitives/SplitFrame.tsx` | left/right two-column layout, configurable ratio + per-side bg |
| `primitives/LayeredFrame.tsx` | full-bleed image bg + overlay + text content (consumes Echo b-roll) |
| `primitives/OverlayFrame.tsx` | small floating badge in any corner (status / scene number / mark) |
| `primitives/GrainOverlay.tsx` | animated film-grain texture, soft-light blend, swimming seed |

**4 transitions** — applied between scenes via deterministic rotation:

| File | Purpose |
|---|---|
| `transitions/WipeReveal.tsx` | colored block slides off in chosen direction over first ~12 frames |
| `transitions/ColorFlash.tsx` | full-frame accent flash for 2-3 frames, then fade |
| `transitions/BlurDip.tsx` | brief gaussian blur over the cut, eases back to sharp |
| `transitions/MatchCutShape.tsx` | recurring brand shape entering at fixed position (continuity tell) |

**Pace knob is now functional** — `motion/pace.ts` exports
`paceMultiplier()` (1.35 / 1.0 / 0.75), `paceEasing()`, and
`paceStaggerFrames()`. Used by `ScriptReel` to multiply scene durations
and by `HookScene` + `StatScene` to drive easing curves and stagger
between sub-elements. Other scenes will adopt this in Phase 2.

**`ScriptReel` upgrades** — `compositions/ScriptReel.tsx`:
- Multiplies each scene duration by the pace multiplier
- `computeScriptFrames()` mirrors the same multiplier (host total
  matches renderer total)
- Each scene gets a deterministic transition based on `index % 4`:
  index 0 → wipe-down (rhythm-setter), then wipe-left (accent), blur
  dip, color flash, match-cut dot, repeat
- `<GrainOverlay>` runs over every scene as a single composition-level
  layer at intensity 0.07, soft-light blend

### Visual contract changes

- Scene durations as written by the agent are now **suggestions**;
  the renderer scales them by pace. Agents should keep emitting
  durations in seconds; the multiplier is invisible to them.
- The transition layer is **renderer-owned**. Agents do not pick
  transitions; the renderer rotates through the four options
  deterministically.
- Grain is always on. If a brand specifically wants a glossy aesthetic
  later, we'll add a `grain: false` design knob in Phase 2.

### Files added (Phase 1)

```
packages/motion-reel/src/
├── motion/
│   └── pace.ts                       # NEW — pace multiplier + easings
├── primitives/
│   ├── SplitFrame.tsx                # NEW
│   ├── LayeredFrame.tsx              # NEW
│   ├── OverlayFrame.tsx              # NEW
│   └── GrainOverlay.tsx              # NEW
└── transitions/                      # NEW DIRECTORY
    ├── WipeReveal.tsx                # NEW
    ├── ColorFlash.tsx                # NEW
    ├── BlurDip.tsx                   # NEW
    └── MatchCutShape.tsx             # NEW
```

### Files changed (Phase 1)

- `compositions/ScriptReel.tsx` — pace wiring, per-scene transition
  rotation, GrainOverlay
- `scenes/HookScene.tsx` — pace-aware easing + stagger
- `scenes/StatScene.tsx` — pace-aware easing + stagger
- `client.ts` — exports new primitives, transitions, pace utilities

### Cost impact

- Render time: +~20-30% per video (more interpolations, audio mixing,
  blur filters). Lambda cost increase: ~$0.002–0.004 per video.
- Per-video total stays under $0.02. No new LLM or third-party API
  calls were introduced.

---

## Phase 1.5 — icons + bar chart + responsive type (shipped 2026-05-02)

A second commit on top of Phase 1, prompted by user feedback that
"text-only on a wash" still read as "AI PowerPoint" even after grain
+ transitions.

### What shipped

- **Icon registry** (`icons/index.ts`) — 38 curated 24×24 stroke icons
  in 5 categories (finance, growth, alert, social, misc). Single
  source of truth for what icons the agent can pick. Each icon is
  1–4 SVG paths, designed for 2px stroke at any display size.
- **`primitives/Icon.tsx`** — renders an icon by name. Supports
  optional draw-on animation (stroke-dashoffset over N frames).
- **`primitives/BackdropIcon.tsx`** — giant outline icon at low
  opacity, sits behind hero text. Anchorable to any corner or
  centered.
- **`scenes/DataBarScene.tsx`** — new scene type. Animated horizontal
  bar chart with 2–5 bars. Each bar grows from 0 to its proportional
  share of the largest value while the value counts up. One bar
  height (8px), one color (accent), thin lines, tabular-nums values.
- **`motion/fitText.ts`** — picks a font size from character count +
  container width + line budget so display text never overflows.
  Wired into Hook (320 → 96 floor), Stat (280 → 88 floor), Punchline
  (96 → 44 floor), Quote (72 → 38 floor) scenes.

### Schema changes

- All scenes get an optional `icon?: IconName` field. Hook renders it
  as a backdrop; Stat renders it small above the label. (Other scenes
  ignore for now; will adopt in Phase 2 as appropriate.)
- New scene type: `data-bar` with `bars: { label, value, prefix?, suffix? }[]`.
- Both the agent's `VideoScriptSchema` and the router's
  `VideoScriptSchema` (input validator on `renderScript`) updated.

### Prompt changes

- New `ICON LIBRARY` section in `VIDEO_SYSTEM_PROMPT` listing the 5
  category buckets and picking rules. Agent only picks icons when the
  scene subject is a clean match — empty space over a wrong icon.
- New `data-bar` entry in scene catalog. Used when the brief has 2–5
  comparable numbers (e.g. "Bitcoin $48B, Ether $12B, Solana $4B")
  instead of cramming into one stat scene's suffix.
- Tightened stat scene rules: `prefix`/`suffix` are CURRENCY/UNIT
  marks ONLY ("$", "%", "k"), not descriptive context. Fixes the
  "46.7Binto crypto ETPs" output the agent was producing.
- New `GROUNDING — DO NOT INVENT FACTS` section forbidding fabricated
  numbers / years / tickers / proper nouns. Agent restructures
  qualitatively if the brief has no specific data.

### Visual rules (locked)

- Minimal palette: every visual element pulls from BrandTokens (ink +
  one accent picked by `design.accent`). No new colors introduced
  per element.
- Thin strokes: icons at 2px, bar tracks at 8px height, no fills.
- Generous whitespace: BackdropIcon at 5–10% opacity, never above
  the type.
- Mono labels for support text; display sans for hero text.

## Phase 2 — animation depth + style presets + remaining scenes (planned)

Goal: layer real motion-design vocabulary on the Phase 1 foundation,
extend the style palette beyond minimal/bold/warm/editorial, and
adopt pace + icons across remaining scenes.

### Planned files

```
packages/motion-reel/src/
├── primitives/
│   ├── KineticLine.tsx              # word-by-word reveal, variable timing
│   ├── KenBurns.tsx                 # slow pan + zoom on a still image
│   └── MaskReveal.tsx               # clip-path reveal in any direction
├── scenes/
│   └── ImageCueScene.tsx            # NEW scene type — Ken-Burns + caption
└── styles/
    ├── flat.ts                      # NEW preset — pure flat, no shadows, sharp corners
    ├── radius.ts                    # NEW preset — soft rounded everything, pillowy
    ├── luxury.ts                    # NEW preset — serif accents, deep ink + gold tones
    └── liquidglass.ts               # NEW preset — glassmorphism, frosted cards
```

### Style presets

The `style` enum gains four values: `flat`, `radius`, `luxury`,
`liquidglass`. Each preset is a config object that adjusts:

- **Card chrome** (corner radius, shadow, hairline)
- **Type pair** (display + editorial fonts)
- **Color treatment** (palette tint, accent saturation)
- **Background recipe** (gradient, glass, flat)
- **Stroke language** (icon stroke width, bar height, divider style)

`flat` (zero radius, no shadow, hard edges) suits b2b SaaS / tech.
`radius` (16-24px radius everywhere, soft shadows) suits consumer /
wellness / family.
`luxury` (slim serif, deep navy + gold, generous letter-spacing) suits
high-end retail / fashion / hospitality.
`liquidglass` (semi-transparent cards over blurred background, subtle
specular highlight) suits modern fintech / design / DTC.

### Schema changes

`packages/api/src/agents/video.ts`:
- Add `image-cue` and `data-bar` to the scene discriminated union
- Update `VIDEO_SYSTEM_PROMPT` so Haiku knows when to emit each

`packages/motion-reel/src/types.ts`:
- Mirror the new scene shapes for type-safe Remotion components

### Visual contract

- All transform animations get motion blur via interpolated
  `filter: blur()` based on velocity
- `BrandTokens` gets a typography pair (display + editorial fonts) so
  scenes can introduce contrast (heavy display headline + italic serif
  pull-quote)
- Adopt pace-aware easing across remaining scenes (Contrast, Quote,
  Punchline, List, Hashtag, BrandStamp)

---

## Phase 3 — brand depth, audio, RTL (planned)

Goal: make every reel feel like it belongs to one specific brand and
add the audio layer that's required for in-feed performance.

### Planned files

```
packages/motion-reel/src/
├── primitives/
│   └── BrandMotif.tsx               # recurring SVG shapes pulled from BrandKit
├── audio/
│   ├── loops/
│   │   ├── slow.mp3                 # static royalty-free loops, paired to pace
│   │   ├── medium.mp3
│   │   └── fast.mp3
│   ├── stings/
│   │   ├── hook.mp3                 # one-frame impact sounds
│   │   ├── beat.mp3
│   │   ├── data.mp3
│   │   └── end.mp3
│   └── AudioLayer.tsx               # Remotion <Audio> mixer
└── presets/
    ├── glitch.ts                    # NEW style preset — RGB shift, hard cuts
    └── documentary.ts               # NEW style preset — slow Ken-Burns, restrained palette
```

### Schema changes

- Add `glitch` and `documentary` to the `style` enum in
  `VideoDesign`
- Add `direction: "ltr" | "rtl"` (auto-detected from script content) to
  `VideoScript`
- BrandKit gets a `shapeMotifs: string[]` field — 3 SVG fragments
  generated at brand-kit creation time, reused across every video for
  that brand

### Visual contract

- Audio is always on by default; a `mute` design knob disables it
- RTL is auto-detected from the first non-whitespace character of the
  script's first scene; flips the layout direction for every scene

---

## Cost ceiling — what stays out of scope

The plan deliberately excludes:

- **Music generation per video** (Suno, ElevenLabs) — would 5-20× cost
  per video. Static royalty-free loops + stings are credible enough.
- **Per-scene image generation** beyond the b-roll Echo already
  produces — `image-cue` reuses Echo's existing reel `beats[].imageUrl`.
- **Voiceover** (TTS narration) — possible but inflationary; deferred
  to Phase 4 if requested.

If we need ANY of these later, they'll be opt-in design knobs the user
explicitly toggles per video, not defaults.
