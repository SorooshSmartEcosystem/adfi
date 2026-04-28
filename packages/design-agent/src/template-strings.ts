// Template strings inlined as TS exports rather than .svg files.
//
// Why inline rather than fs.readFileSync(): Next.js doesn't trace
// non-JS assets from workspace packages by default, so a runtime
// readFileSync against `__dirname/templates/*.svg` succeeds locally
// but fails on Vercel. Inlining sidesteps the bundler entirely and
// also makes the package usable from edge runtimes (no node:fs).
//
// The .svg files in ./templates/ are kept as the canonical authoring
// format — easier to preview in an IDE — but these strings are the
// runtime source of truth. Update both together if you change a layout.

export const FAVICON_TEMPLATE = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
  <rect width="32" height="32" rx="6" fill="{{background}}"/>
  <g transform="translate(4 4) scale(0.75)">
    {{markInner}}
  </g>
</svg>`;

export const SOCIAL_AVATAR_TEMPLATE = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="400" height="400">
  <defs>
    <clipPath id="circle-mask">
      <circle cx="200" cy="200" r="200"/>
    </clipPath>
  </defs>
  <g clip-path="url(#circle-mask)">
    <rect width="400" height="400" fill="{{background}}"/>
    <g transform="translate(80 80) scale(2.4)">
      {{markInner}}
    </g>
  </g>
  <circle cx="200" cy="200" r="199.5" fill="none" stroke="{{border}}" stroke-width="1"/>
</svg>`;

export const BUSINESS_CARD_TEMPLATE = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 856 540" width="856" height="540">
  <rect width="856" height="540" fill="{{surface}}"/>
  <rect x="0.5" y="0.5" width="855" height="539" fill="none" stroke="{{border}}" stroke-width="1"/>
  <g transform="translate(56 64) scale(1.1)">
    {{markInner}}
  </g>
  <text x="56" y="252" font-family="-apple-system, 'SF Pro Display', system-ui, sans-serif" font-size="32" font-weight="500" fill="{{ink}}" letter-spacing="-0.02em">{{businessName}}</text>
  <text x="56" y="284" font-family="-apple-system, 'SF Pro Text', system-ui, sans-serif" font-size="15" fill="{{ink}}" opacity="0.7">{{tagline}}</text>
  <line x1="56" y1="430" x2="800" y2="430" stroke="{{border}}" stroke-width="0.5"/>
  <text x="56" y="468" font-family="'SF Mono', 'JetBrains Mono', monospace" font-size="13" fill="{{ink}}" opacity="0.65">{{contactLine}}</text>
  <text x="56" y="492" font-family="'SF Mono', 'JetBrains Mono', monospace" font-size="13" fill="{{ink}}" opacity="0.65">{{url}}</text>
  <circle cx="788" cy="468" r="6" fill="{{accent}}"/>
</svg>`;

export const EMAIL_HEADER_TEMPLATE = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 200" width="600" height="200">
  <rect width="600" height="200" fill="{{background}}"/>
  <line x1="0" y1="199.5" x2="600" y2="199.5" stroke="{{border}}" stroke-width="0.5"/>
  <g transform="translate(40 50) scale(1)">
    {{markInner}}
  </g>
  <text x="140" y="100" font-family="-apple-system, 'SF Pro Display', system-ui, sans-serif" font-size="28" font-weight="500" fill="{{ink}}" letter-spacing="-0.02em">{{businessName}}</text>
  <text x="140" y="128" font-family="-apple-system, 'SF Pro Text', system-ui, sans-serif" font-size="14" fill="{{ink}}" opacity="0.65">{{tagline}}</text>
</svg>`;

export const INSTAGRAM_POST_TEMPLATE = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1080" width="1080" height="1080">
  <rect width="1080" height="1080" fill="{{background}}"/>
  <g transform="translate(80 80) scale(2)">
    {{markInner}}
  </g>
  <text x="80" y="540" font-family="-apple-system, 'SF Pro Display', system-ui, sans-serif" font-size="84" font-weight="500" fill="{{ink}}" letter-spacing="-0.03em">{{headline}}</text>
  <text x="80" y="612" font-family="-apple-system, 'SF Pro Display', system-ui, sans-serif" font-size="84" font-weight="500" fill="{{ink}}" letter-spacing="-0.03em" opacity="0.55">{{headlineLine2}}</text>
  <line x1="80" y1="940" x2="1000" y2="940" stroke="{{border}}" stroke-width="1"/>
  <text x="80" y="990" font-family="'SF Mono', 'JetBrains Mono', monospace" font-size="22" fill="{{ink}}" opacity="0.6">{{businessName}}</text>
  <circle cx="990" cy="980" r="10" fill="{{accent}}"/>
</svg>`;

export const TEMPLATE_STRINGS = {
  "favicon-template": FAVICON_TEMPLATE,
  "social-avatar-template": SOCIAL_AVATAR_TEMPLATE,
  "business-card-template": BUSINESS_CARD_TEMPLATE,
  "email-header-template": EMAIL_HEADER_TEMPLATE,
  "instagram-post-template": INSTAGRAM_POST_TEMPLATE,
} as const;

export type TemplateName = keyof typeof TEMPLATE_STRINGS;
