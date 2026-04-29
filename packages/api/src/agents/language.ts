// Shared language detection + LANGUAGE LOCK directive used by every
// LLM-driven agent that produces user-facing content. Without this,
// Opus's bias toward English when handed a JSON schema with English
// field names produces English output even when the brand voice and
// description are in Farsi / Arabic / Chinese / etc.
//
// Script-based detection — checks which Unicode block dominates the
// input. Covers the languages where the bias actually bites
// (Arabic / Farsi / Hebrew / CJK / Cyrillic / Thai / Devanagari).
// Latin-script non-English (Spanish / French / etc.) returns "en"
// here as a no-op — Opus follows system-prompt language rules fine
// for those without an extra directive.

export type DetectedLanguage = { code: string; label: string };

export function detectLanguage(text: string): DetectedLanguage {
  const counts = {
    arabicFarsi: 0,
    hebrew: 0,
    cjkHan: 0,
    hiragana: 0,
    katakana: 0,
    hangul: 0,
    cyrillic: 0,
    thai: 0,
    devanagari: 0,
    latin: 0,
  };
  for (const ch of text) {
    const cp = ch.codePointAt(0);
    if (cp === undefined) continue;
    if (cp >= 0x0600 && cp <= 0x06ff) counts.arabicFarsi++;
    else if (cp >= 0x0590 && cp <= 0x05ff) counts.hebrew++;
    else if (cp >= 0x4e00 && cp <= 0x9fff) counts.cjkHan++;
    else if (cp >= 0x3040 && cp <= 0x309f) counts.hiragana++;
    else if (cp >= 0x30a0 && cp <= 0x30ff) counts.katakana++;
    else if (cp >= 0xac00 && cp <= 0xd7af) counts.hangul++;
    else if (cp >= 0x0400 && cp <= 0x04ff) counts.cyrillic++;
    else if (cp >= 0x0e00 && cp <= 0x0e7f) counts.thai++;
    else if (cp >= 0x0900 && cp <= 0x097f) counts.devanagari++;
    else if ((cp >= 65 && cp <= 90) || (cp >= 97 && cp <= 122)) counts.latin++;
  }
  type Match = { code: string; label: string; n: number };
  const candidates: Match[] = [
    {
      code: "fa-or-ar",
      label: "Arabic or Farsi (whichever the source uses)",
      n: counts.arabicFarsi,
    },
    { code: "he", label: "Hebrew", n: counts.hebrew },
    {
      code: "zh",
      label: "Chinese (Simplified or Traditional, whichever the source uses)",
      n: counts.cjkHan,
    },
    {
      code: "ja",
      label: "Japanese",
      n: counts.hiragana + counts.katakana + counts.cjkHan,
    },
    { code: "ko", label: "Korean", n: counts.hangul },
    {
      code: "ru-or-sr",
      label: "Cyrillic-script language (Russian, Serbian, Ukrainian, etc.)",
      n: counts.cyrillic,
    },
    { code: "th", label: "Thai", n: counts.thai },
    {
      code: "hi",
      label: "Hindi or another Devanagari-script language",
      n: counts.devanagari,
    },
  ];
  // Japanese requires hiragana or katakana to disambiguate from Chinese.
  if (counts.hiragana === 0 && counts.katakana === 0) {
    const ja = candidates.find((c) => c.code === "ja");
    if (ja) ja.n = 0;
  }
  const winner = candidates.reduce<Match>(
    (best, c) => (c.n > best.n ? c : best),
    { code: "en", label: "English", n: 0 },
  );
  if (winner.n > counts.latin / 2) return winner;
  return { code: "en", label: "English" };
}

// Builds a LANGUAGE LOCK directive to append to a user message. The
// directive names the detected language explicitly, lists every
// prose-style field that must be in that language, and warns
// against Opus's most common failure mode (outputting English
// transliterations or English persona names like "The Signal Sharer"
// for non-English brands). Returns "" for English so the prompt
// stays terse for the common case.
export function languageLockDirective(
  text: string,
  fieldDescription: string,
): string {
  const lang = detectLanguage(text);
  if (lang.code === "en") return "";
  return `\n\n=== LANGUAGE LOCK ===\nThe input above is in ${lang.label}. EVERY string in your response — ${fieldDescription} — MUST be written in ${lang.label}. Do not write a single word in English. Do not use English transliterations or English brand-style names. The downstream pipeline will publish whatever language you choose here directly to the user's audience; getting this wrong means publishing in the wrong language.`;
}
