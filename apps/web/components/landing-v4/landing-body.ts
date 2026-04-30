// V4 landing page body HTML — ported verbatim from
// /prototype/ADFI_Landing_v4.html (lines 1788-2710). Hrefs to "#" are
// rewritten below the constant so CTAs route into the real app surfaces
// (/onboarding/wow for show-me, /signup for trial start, anchor links
// stay anchor links).
const RAW_BODY = `\

<!-- Nav -->
<nav>
  <div class="nav-inner">
    <a href="#" class="logo">
      <span class="logo-dot"></span>
      <span>adfi</span>
    </a>
    <div class="nav-links">
      <a href="#team" class="nav-link">agents</a>
      <a href="#pricing" class="nav-link">pricing</a>
      <a href="#faq" class="nav-link">faq</a>
      <a href="/signin" class="nav-link">sign in</a>
      <a href="#" class="nav-cta">get the app</a>
    </div>
    <button class="nav-burger" type="button" aria-label="open menu" aria-controls="nav-drawer" aria-expanded="false">
      <span></span>
      <span></span>
      <span></span>
    </button>
  </div>
  <div class="nav-drawer" id="nav-drawer" hidden>
    <a href="#team" class="nav-drawer-link">agents</a>
    <a href="#pricing" class="nav-drawer-link">pricing</a>
    <a href="#faq" class="nav-drawer-link">faq</a>
    <a href="/signin" class="nav-drawer-link">sign in</a>
    <a href="/download" class="nav-drawer-cta">get the app</a>
  </div>
</nav>

<!-- Hero · v5 (minimal) — 3D orb with pulse rings, centered headline,
     business-description textarea, continue button. Four corner cards
     fade in/out on independent loops to suggest live agent activity. -->
<section class="hero">

  <!-- Corner animations (desktop only) -->
  <div class="corner corner-tl">
    <div class="corner-card">
      <div class="cc-mono">
        <span class="cc-dot urgent"></span>
        <span>CALL · ANSWERED</span>
      </div>
      <div class="cc-title">+1 (416) 555-0934</div>
      <div class="cc-meta">booked thursday 2pm</div>
    </div>
  </div>

  <div class="corner corner-tr">
    <div class="corner-card">
      <div class="cc-mono">
        <span class="cc-dot alive"></span>
        <span>ECHO · PUBLISHED</span>
      </div>
      <div class="cc-title">"wheel-thrown this morning ✨"</div>
      <div class="cc-meta">↑ 18% reach · instagram</div>
    </div>
  </div>

  <div class="corner corner-bl">
    <div class="corner-card">
      <div class="cc-mono">
        <span class="cc-dot alive"></span>
        <span>PULSE · TRENDING</span>
      </div>
      <div class="cc-title">handmade ceramic mugs</div>
      <div class="cc-meta">↑ 180% on tiktok this week</div>
    </div>
  </div>

  <div class="corner corner-br">
    <div class="corner-card amber">
      <div class="cc-mono">
        <span class="cc-dot attn"></span>
        <span>SCOUT · RIVAL MOVE</span>
      </div>
      <div class="cc-title">east fork · 20% off</div>
      <div class="cc-meta">to interior designers</div>
    </div>
  </div>

  <div class="hero-inner">
    <div class="orb-wrap">
      <div class="orb-ring"></div>
      <div class="orb-ring"></div>
      <div class="orb-ring"></div>
      <div class="orb-3d"></div>
    </div>
    <div class="wordmark">adfi</div>

    <h1 class="hero-h1">Your marketing team, hired.</h1>
    <p class="hero-sub">tell me about your business. i'll show you what i can do for it.</p>

    <form class="form-wrap" id="heroForm" action="/onboarding/wow" method="get">
      <textarea
        id="bizDesc"
        name="biz"
        class="business-textarea"
        placeholder="e.g. ceramics studio in toronto, mostly handmade dinnerware. we sell on instagram and at saturday markets."
        required
        minlength="10"
      ></textarea>
      <button type="submit" class="continue-btn">continue →</button>
    </form>

    <!-- Mobile ticker (replaces corner cards on small screens) -->
    <div class="mobile-ticker">
      <div class="ticker-card">
        <span class="ticker-dot urgent"></span>
        <span>call answered · booked thu</span>
      </div>
      <div class="ticker-card">
        <span class="ticker-dot alive"></span>
        <span>echo published · ↑ 18%</span>
      </div>
      <div class="ticker-card">
        <span class="ticker-dot alive"></span>
        <span>pulse trending · ↑ 180%</span>
      </div>
      <div class="ticker-card">
        <span class="ticker-dot attn"></span>
        <span>scout · rival move</span>
      </div>
    </div>
  </div>
</section>

<!-- What I do -->
<section id="what">
  <div class="container">
    <div class="section-label">what i do</div>
    <h2 class="section-title">I run the parts of your business that aren't your craft.</h2>
    <p class="section-intro">you didn't start your business to write captions or answer dms. i did. here's what i quietly handle while you work on what matters.</p>

    <div class="what-grid reveal">
      <div class="what-item">
        <div class="what-head">
          <span class="what-dot"></span>
          <span class="what-label">SIGNAL</span>
        </div>
        <div class="what-title">I catch your calls.</div>
        <p class="what-desc">when a customer calls and you can't pick up, i answer in your voice. book appointments, answer questions, save the lead.</p>
      </div>
      <div class="what-item">
        <div class="what-head">
          <span class="what-dot"></span>
          <span class="what-label">ECHO</span>
        </div>
        <div class="what-title">I post for you.</div>
        <p class="what-desc">instagram, linkedin, email. i write in your voice, draft in your style, and publish on the rhythm that actually works for your industry.</p>
      </div>
      <div class="what-item">
        <div class="what-head">
          <span class="what-dot"></span>
          <span class="what-label">SCOUT</span>
        </div>
        <div class="what-title">I watch your rivals.</div>
        <p class="what-desc">every week, i check what your competitors are doing and surface what's worth copying — and what's worth ignoring.</p>
      </div>
    </div>
  </div>
</section>


<!-- How it works -->
<section id="how">
  <div class="container">
    <div class="section-label">how it works</div>
    <h2 class="section-title">Three steps. Then I start working.</h2>
    <p class="section-intro">no calls with account managers, no onboarding checklists. tell me about your business and i'll be running inside of an hour.</p>

    <div class="how-steps reveal">
      <div class="how-step">
        <div class="how-num">01</div>
        <div class="how-title">tell me about your business.</div>
        <p class="how-desc">in one sentence. two if it's complex. i'll fill in the rest from your instagram, website, and what i already know about your industry.</p>
      </div>
      <div class="how-step">
        <div class="how-num">02</div>
        <div class="how-title">pick what you want more of.</div>
        <p class="how-desc">more customers? more repeat buyers? more visibility? your answer shapes what i prioritize each week.</p>
      </div>
      <div class="how-step">
        <div class="how-num">03</div>
        <div class="how-title">i start working.</div>
        <p class="how-desc">within minutes i've analyzed your business, picked your rivals to track, and drafted your first week of posts. you approve the first few. then i go on autopilot.</p>
      </div>
    </div>
  </div>
</section>

<!-- Meet the team · v2 — agent rows on left, phone mockup on right.
     Auto-advances every 12s; click any agent to switch (auto resumes
     after 30s of no interaction). IntersectionObserver pauses when
     scrolled out of view. Per-agent scenes are inlined in the script. -->
<section id="team" class="meet">
  <div class="meet-wrap">
    <div class="meet-eyebrow">MEET THE TEAM</div>
    <h2>Six specialists. One colleague.</h2>
    <p class="meet-sub">you talk to adfi. behind the scenes, six agents coordinate so you don't have to manage them. here's what each one does.</p>

    <div class="meet-grid">
      <div class="agent-list" id="agentList">
        <button type="button" class="agent-row active" data-agent="signal">
          <div class="agent-row-head">
            <span class="agent-row-dot"></span>
            <span class="agent-row-name">signal</span>
          </div>
          <div class="agent-row-desc">answers calls, replies to sms and dms, books appointments.</div>
          <div class="agent-progress"></div>
        </button>
        <button type="button" class="agent-row" data-agent="echo">
          <div class="agent-row-head">
            <span class="agent-row-dot"></span>
            <span class="agent-row-name">echo</span>
          </div>
          <div class="agent-row-desc">writes posts in your voice, publishes on the right schedule.</div>
          <div class="agent-progress"></div>
        </button>
        <button type="button" class="agent-row" data-agent="scout">
          <div class="agent-row-head">
            <span class="agent-row-dot"></span>
            <span class="agent-row-name">scout</span>
          </div>
          <div class="agent-row-desc">tracks your competitors. surfaces what's worth your attention.</div>
          <div class="agent-progress"></div>
        </button>
        <button type="button" class="agent-row" data-agent="pulse">
          <div class="agent-row-head">
            <span class="agent-row-dot"></span>
            <span class="agent-row-name">pulse</span>
          </div>
          <div class="agent-row-desc">spots trends and news that could move your business.</div>
          <div class="agent-progress"></div>
        </button>
        <button type="button" class="agent-row" data-agent="strategist">
          <div class="agent-row-head">
            <span class="agent-row-dot"></span>
            <span class="agent-row-name">strategist</span>
          </div>
          <div class="agent-row-desc">runs your weekly business review and sets the plan.</div>
          <div class="agent-progress"></div>
        </button>
        <button type="button" class="agent-row" data-agent="campaigns">
          <div class="agent-row-head">
            <span class="agent-row-dot"></span>
            <span class="agent-row-name">campaign manager</span>
          </div>
          <div class="agent-row-desc">runs your ads on meta, google, youtube, and tiktok.</div>
          <div class="agent-progress"></div>
        </button>
      </div>

      <div class="phone-wrap">
        <div class="phone">
          <div class="phone-screen">
            <div class="phone-screen-inner" id="phoneInner"></div>
          </div>
        </div>
      </div>
    </div>

    <div class="meet-cta-row">
      <a href="#" class="btn-primary">hire the team free for 7 days</a>
      <a href="#how" class="btn-secondary">see all features</a>
    </div>
  </div>
</section>

<!-- Pricing -->
<section id="pricing">
  <div class="container">
    <div class="section-label">pricing</div>
    <h2 class="section-title">Pay when it's working.</h2>
    <p class="section-intro">7 days free. no charge until i've shown real results. cancel any time from the app.</p>

    <div class="pricing-grid reveal">
      <div class="price-card">
        <div class="price-head">
          <span class="price-name">solo</span>
          <span class="price-amt">$29<span class="per">/mo</span></span>
        </div>
        <div class="price-tagline">GET YOUR HOURS BACK</div>
        <ul class="price-list">
          <li>1 business · 60 drafts a month</li>
          <li>i write all your posts, carousels, reels, newsletters</li>
          <li>i answer dms in your voice</li>
        </ul>
        <a href="#" class="price-cta">start 7 days free</a>
      </div>

      <div class="price-card featured">
        <div class="price-badge">MOST POPULAR</div>
        <div class="price-head">
          <span class="price-name">team</span>
          <span class="price-amt">$79<span class="per">/mo</span></span>
        </div>
        <div class="price-tagline">NEVER MISS A CUSTOMER</div>
        <ul class="price-list">
          <li>everything in solo · 250 drafts</li>
          <li>i answer your calls and texts in your voice</li>
          <li>i cite real, fresh data in every article</li>
          <li>i watch your competitors daily</li>
          <li>priority queue · drafts ~2× faster</li>
        </ul>
        <a href="#" class="price-cta">start 7 days free</a>
      </div>

      <div class="price-card">
        <div class="price-head">
          <span class="price-name">studio</span>
          <span class="price-amt">$199<span class="per">/mo</span></span>
        </div>
        <div class="price-tagline">RUN MULTIPLE BRANDS</div>
        <ul class="price-list">
          <li>everything in team · 600 shared drafts</li>
          <li>2 businesses · separate voices, channels, dashboards</li>
          <li>custom newsletter domain</li>
          <li>multi-language drafts · advanced analytics</li>
        </ul>
        <a href="#" class="price-cta">start 7 days free</a>
      </div>

      <div class="price-card">
        <div class="price-head">
          <span class="price-name">agency</span>
          <span class="price-amt">$499<span class="per">/mo</span></span>
        </div>
        <div class="price-tagline">WHITE-LABEL FOR CLIENTS</div>
        <ul class="price-list">
          <li>everything in studio · 2000 shared drafts</li>
          <li>up to 8 client businesses</li>
          <li>white-label · your logo, your domain</li>
          <li>3 team seats · client dashboards · bulk planning</li>
        </ul>
        <a href="#" class="price-cta">start 7 days free</a>
      </div>
    </div>
    <p class="pricing-note">🔒 stripe · you can change plans any time</p>
  </div>
</section>

<!-- FAQ -->
<section id="faq">
  <div class="container-narrow">
    <div class="section-label">honest answers</div>
    <h2 class="section-title">What you're probably wondering.</h2>

    <div class="faq-list reveal">
      <div class="faq-item">
        <div class="faq-q" onclick="toggleFaq(this)">
          <span>can i trust an ai with my calls and posts?</span>
          <span class="faq-toggle">+</span>
        </div>
        <div class="faq-a"><div class="faq-a-inner">for the first 7 days, i work in shadow mode — i draft everything, but nothing goes out without your text-message approval. that's enough time for you to see how i work. after that, you can switch to autopilot, stay on manual, or anywhere in between. you're always in control.</div></div>
      </div>

      <div class="faq-item">
        <div class="faq-q" onclick="toggleFaq(this)">
          <span>what if i want to take over a call or a dm?</span>
          <span class="faq-toggle">+</span>
        </div>
        <div class="faq-a"><div class="faq-a-inner">tap the live call banner and you're in. i hand off to you immediately. same for dms and sms — one tap and the conversation is yours. i never lock you out.</div></div>
      </div>

      <div class="faq-item">
        <div class="faq-q" onclick="toggleFaq(this)">
          <span>what's this "orb number" i keep hearing about?</span>
          <span class="faq-toggle">+</span>
        </div>
        <div class="faq-a"><div class="faq-a-inner">during signup i give you a dedicated phone number. forward your business line to it (i'll show you how, it takes 30 seconds), and any call you miss rings me. i answer in your voice and book when i can. you can also put this number directly on your website or google business — new inquiries come straight to me.</div></div>
      </div>

      <div class="faq-item">
        <div class="faq-q" onclick="toggleFaq(this)">
          <span>what platforms do you support?</span>
          <span class="faq-toggle">+</span>
        </div>
        <div class="faq-a"><div class="faq-a-inner">at launch: instagram, linkedin, email, sms, and phone calls. facebook and google business are coming soon. if you have a specific platform you need, tell us — prioritization is user-driven.</div></div>
      </div>

      <div class="faq-item">
        <div class="faq-q" onclick="toggleFaq(this)">
          <span>how does billing work?</span>
          <span class="faq-toggle">+</span>
        </div>
        <div class="faq-a"><div class="faq-a-inner">card on file at signup, but no charge for 7 days. on day 3-7 i'll show you what i've done — caught calls, posts published, competitors analyzed. if you're happy, billing starts. if not, cancel in one tap from settings and you're not charged. no support call needed.</div></div>
      </div>

      <div class="faq-item">
        <div class="faq-q" onclick="toggleFaq(this)">
          <span>what about my data?</span>
          <span class="faq-toggle">+</span>
        </div>
        <div class="faq-a"><div class="faq-a-inner">your call recordings, messages, and customer data are yours. we encrypt them at rest, never sell them, and never use your content to train general models. you can export everything or delete everything, anytime. full privacy details in our policy.</div></div>
      </div>
    </div>
  </div>
</section>

<!-- Hire Me -->
<section class="hire-me">
  <div class="hire-me-wrap">
    <div class="hire-me-orb"></div>
    <div class="hire-me-eyebrow">READY WHEN YOU ARE</div>
    <h2>hire me.</h2>
    <p class="hire-me-sub">start today. i'll show you what i can do in the first 7 days — no charge. if i haven't proven myself, you cancel in one tap. if i have, we work together.</p>
    <div class="hire-me-cta-row">
      <a href="#" class="btn-hire-primary">
        start my 7 days free
      </a>
      <a href="#pricing" class="btn-hire-secondary">see the plans</a>
    </div>
    <div class="hire-me-trust">
      <span class="hire-me-trust-item">NO CARD CHARGED TODAY</span>
      <span class="hire-me-trust-item">CANCEL IN 1 TAP</span>
      <span class="hire-me-trust-item">WORKING IN 60 SECONDS</span>
    </div>
  </div>
</section>

<!-- Footer -->
<footer>
  <div class="container">
    <div class="footer-inner">
      <div class="footer-logo">adfi.</div>
      <div class="footer-links">
        <a href="#">privacy</a>
        <a href="#">terms</a>
        <a href="#">contact</a>
        <a href="#">status</a>
      </div>
      <div class="footer-copy">© 2026 ADFI · MADE FOR SOLOPRENEURS</div>
    </div>
  </div>
</footer>

`;

// Rewrite placeholder hrefs to real routes. Anchors (#how, #pricing, #faq,
// #team) are intra-page jumps — leave as-is.
export const LANDING_BODY = RAW_BODY
  // Nav "get the app" CTA — points to /download (App Store + Play Store
  // links). signup/pricing CTAs further down still point to /signup
  // because their copy is about starting a trial, not downloading the app.
  .replace(
    /<a href="#" class="nav-cta">get the app<\/a>/,
    '<a href="/download" class="nav-cta">get the app</a>',
  )
  // Hero primary CTA — points to the wow preview flow
  .replace(
    /<a href="#" class="btn-primary">\s*start 7 days free\s*<\/a>/,
    '<a href="/onboarding/wow" class="btn-primary">show me what you would do</a>',
  )
  // Service section primary CTAs
  .replace(
    /<a href="#" class="svc-cta-primary">/g,
    '<a href="/onboarding/wow" class="svc-cta-primary">',
  )
  // Service section secondary CTAs (sample/learn-more — point at how-it-works)
  .replace(
    /<a href="#" class="svc-cta-secondary">/g,
    '<a href="#how" class="svc-cta-secondary">',
  )
  // Pricing card CTAs
  .replace(
    /<a href="#" class="price-cta">/g,
    '<a href="/signup" class="price-cta">',
  )
  // Hire-me primary CTA
  .replace(
    /<a href="#" class="btn-hire-primary">/,
    '<a href="/signup" class="btn-hire-primary">',
  )
  // Footer links
  .replace(/<a href="#">privacy<\/a>/, '<a href="/privacy">privacy</a>')
  .replace(/<a href="#">terms<\/a>/, '<a href="/terms">terms</a>')
  .replace(
    /<a href="#">contact<\/a>/,
    '<a href="mailto:hi@adfi.ca">contact</a>',
  )
  .replace(/<a href="#">status<\/a>/, '<a href="/status">status</a>')
  // Logo link in nav
  .replace(/<a href="#" class="logo">/, '<a href="/" class="logo">');
