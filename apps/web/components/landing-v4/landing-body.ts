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
      <a href="#pricing" class="nav-link">pricing</a>
      <a href="#faq" class="nav-link">faq</a>
      <a href="#" class="nav-cta">get the app</a>
    </div>
  </div>
</nav>

<!-- Hero -->
<section class="hero">
  <div class="hero-grid">
    <div class="hero-text">
      <div class="hero-eyebrow">
        <span class="hero-eyebrow-dot"></span>
        <span>LIVE · RUNNING FOR SOLOPRENEURS NOW</span>
      </div>
      <h1>Your marketing team, hired.</h1>
      <p class="sub">adfi is a team of ai agents that run your marketing end to end. calls, posts, dms, competitor watch. you focus on your craft. i handle the rest.</p>
      <div class="hero-ctas">
        <a href="#" class="btn-primary">
          start 7 days free
        </a>
        <a href="#how" class="btn-secondary">see how it works</a>
      </div>
      <div class="hero-trust-row">
        <span class="hero-trust-item">7 DAYS FREE</span>
        <span class="hero-trust-item">NO CHARGE TODAY</span>
        <span class="hero-trust-item">CANCEL ANYTIME</span>
      </div>
    </div>

    <!-- Auto-playing capability canvas -->
    <div class="canvas" id="heroCanvas">
      <div class="canvas-step-dots">
        <div class="canvas-step-dot" data-step="0"></div>
      <div class="canvas-step-dot" data-step="1"></div>
      <div class="canvas-step-dot" data-step="2"></div>
      <div class="canvas-step-dot" data-step="3"></div>
      <div class="canvas-step-dot" data-step="4"></div>
    </div>

    <div class="orb-stage" id="orbStage">
      <div class="canvas-orb" id="canvasOrb"></div>
    </div>

    <!-- Moment 1: Call -->
    <div class="canvas-card cc-call" data-moment="call">
      <div class="cc-mono">
        <span class="cc-dot urgent"></span>
        <span>INCOMING · TUE 2:14PM</span>
      </div>
      <div class="cc-title">+1 (416) 555-0934</div>
      <div class="cc-meta">a designer asking about custom dinnerware</div>
      <div class="cc-tag alive">✓ booked thursday 2pm</div>
    </div>

    <!-- Moment 2: DMs -->
    <div class="canvas-card cc-dm-card cc-dm-1" data-moment="dm">
      <div class="cc-dm-platform">
        <div class="cc-dm-icon">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="18" height="18" rx="5"/>
            <circle cx="12" cy="12" r="4"/>
            <circle cx="17.5" cy="6.5" r="0.8" fill="currentColor"/>
          </svg>
        </div>
        <span class="cc-dm-name">INSTAGRAM</span>
        <span class="cc-dm-status">✓</span>
      </div>
      <div class="cc-dm-text">"do you ship internationally?"</div>
      <div class="cc-dm-from">@studioloft</div>
    </div>
    <div class="canvas-card cc-dm-card cc-dm-2" data-moment="dm">
      <div class="cc-dm-platform">
        <div class="cc-dm-icon">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c5.05-.5 9-4.76 9-9.95 0-5.52-4.48-10-10-10z"/>
          </svg>
        </div>
        <span class="cc-dm-name">FACEBOOK</span>
        <span class="cc-dm-status">✓</span>
      </div>
      <div class="cc-dm-text">"price for a set of 4?"</div>
      <div class="cc-dm-from">hana m.</div>
    </div>
    <div class="canvas-card cc-dm-card cc-dm-3" data-moment="dm">
      <div class="cc-dm-platform">
        <div class="cc-dm-icon">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
        </div>
        <span class="cc-dm-name">WHATSAPP</span>
        <span class="cc-dm-status">✓</span>
      </div>
      <div class="cc-dm-text">"can i pick up tomorrow?"</div>
      <div class="cc-dm-from">+44 7700 900</div>
    </div>
    <div class="canvas-card cc-dm-summary" data-moment="dm">
      i answered 14 dms across 3 platforms today.
    </div>

    <!-- Moment 3: Content -->
    <div class="canvas-card cc-post" data-moment="content">
      <div class="cc-post-img"></div>
      <div class="cc-post-body">
        <div class="cc-post-cap">"the way light catches glaze at golden hour ✨ wheel-thrown this morning."</div>
        <div class="cc-post-stats">
          <span>♡ 1,240</span>
          <span>↑ 18%</span>
        </div>
      </div>
    </div>
    <div class="canvas-card cc-drafting" data-moment="content">
      <div class="cc-mono">
        <span class="cc-dot alive"></span>
        <span>DRAFTING IN YOUR VOICE</span>
      </div>
      <div class="cc-drafting-text">
        <span>matching your tone</span><span class="cc-cursor"></span>
      </div>
    </div>

    <!-- Moment 4: Scout -->
    <div class="canvas-card cc-scout" data-moment="scout">
      <div class="cc-mono" style="color: #8a6a1e;">
        <span class="cc-dot attn"></span>
        <span>RIVAL MOVE · MON 9:00AM</span>
      </div>
      <div class="cc-title">east fork ran a wholesale promo.</div>
      <div class="cc-meta">20% off to interior designers — worth considering for you.</div>
    </div>

    <!-- Moment 5: Dashboard -->
    <div class="canvas-card cc-kpi cc-kpi-1" data-moment="dash">
      <div class="cc-kpi-label">REVENUE</div>
      <div class="cc-kpi-num">$4.2k</div>
      <div class="cc-kpi-delta">↑ 38%</div>
    </div>
    <div class="canvas-card cc-kpi cc-kpi-2" data-moment="dash">
      <div class="cc-kpi-label">REACH</div>
      <div class="cc-kpi-num">8.4k</div>
      <div class="cc-kpi-delta">↑ 23%</div>
    </div>
    <div class="canvas-card cc-kpi cc-kpi-3" data-moment="dash">
      <div class="cc-kpi-label">CONVOS</div>
      <div class="cc-kpi-num">21</div>
      <div class="cc-kpi-delta">↑ 12%</div>
    </div>
    <div class="canvas-card cc-kpi cc-kpi-4" data-moment="dash">
      <div class="cc-kpi-label">SAVED</div>
      <div class="cc-kpi-num">~6h</div>
      <div class="cc-kpi-delta">this week</div>
    </div>

    <div class="canvas-caption" id="canvasCaption">i caught a missed call.</div>
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

<!-- DMs Everywhere — auto-managing all DM platforms -->
<section class="dms-section">
  <div class="dms-wrap">
    <div class="dms-grid">
      <div class="dms-text">
        <div class="dms-text-eyebrow">DMS · ANSWERED · EVERYWHERE</div>
        <h2>I auto-manage your DMs on Instagram, Facebook, and WhatsApp.</h2>
        <p>every message, every platform, every customer — answered in your voice while you work. i ask the right questions, send pricing, book consultations, and only ping you when a real human moment is needed.</p>
        <div class="dms-platform-list">
          <div class="dms-platform-row">
            <div class="dms-platform-icon">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="18" height="18" rx="5"/>
                <circle cx="12" cy="12" r="4"/>
                <circle cx="17.5" cy="6.5" r="0.8" fill="currentColor"/>
              </svg>
            </div>
            <div class="dms-platform-meta">
              <div class="dms-platform-name">Instagram</div>
              <div class="dms-platform-tag">DMS · STORY REPLIES · COMMENTS</div>
            </div>
            <span class="dms-platform-status">LIVE</span>
          </div>
          <div class="dms-platform-row">
            <div class="dms-platform-icon">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c5.05-.5 9-4.76 9-9.95 0-5.52-4.48-10-10-10z"/>
              </svg>
            </div>
            <div class="dms-platform-meta">
              <div class="dms-platform-name">Facebook Messenger</div>
              <div class="dms-platform-tag">PAGE MESSAGES · COMMENTS</div>
            </div>
            <span class="dms-platform-status">LIVE</span>
          </div>
          <div class="dms-platform-row">
            <div class="dms-platform-icon">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
            </div>
            <div class="dms-platform-meta">
              <div class="dms-platform-name">WhatsApp Business</div>
              <div class="dms-platform-tag">CUSTOMER CHATS · QUICK REPLIES</div>
            </div>
            <span class="dms-platform-status">LIVE</span>
          </div>
        </div>
        <a href="#" class="btn-primary" style="display: inline-flex;">connect your accounts →</a>
      </div>

      <!-- Phone showing unified inbox -->
      <div>
        <div class="dms-phone">
          <div class="dms-phone-screen">
            <div class="dms-phone-header">
              <div class="dms-phone-orb"></div>
              <div style="flex: 1;">
                <div class="dms-phone-title">unified inbox</div>
                <div class="dms-phone-subtitle">14 ANSWERED TODAY</div>
              </div>
            </div>
            <div class="dms-thread">
              <div class="dms-thread-head">
                <div class="dms-thread-platform">
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="3" width="18" height="18" rx="5"/>
                    <circle cx="12" cy="12" r="4"/>
                  </svg>
                </div>
                <span class="dms-thread-name">@studioloft</span>
                <span class="dms-thread-time">2M AGO</span>
              </div>
              <div class="dms-thread-message">"do you ship internationally?" — i answered with rates and timing.</div>
              <span class="dms-thread-tag">handled</span>
            </div>
            <div class="dms-thread">
              <div class="dms-thread-head">
                <div class="dms-thread-platform">
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c5.05-.5 9-4.76 9-9.95 0-5.52-4.48-10-10-10z"/>
                  </svg>
                </div>
                <span class="dms-thread-name">hana m.</span>
                <span class="dms-thread-time">12M AGO</span>
              </div>
              <div class="dms-thread-message">"price for a set of 4?" — sent your wholesale catalog and a discount code.</div>
              <span class="dms-thread-tag">handled</span>
            </div>
            <div class="dms-thread">
              <div class="dms-thread-head">
                <div class="dms-thread-platform">
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                </div>
                <span class="dms-thread-name">+44 7700 900</span>
                <span class="dms-thread-time">23M AGO</span>
              </div>
              <div class="dms-thread-message">"can i pick up tomorrow?" — confirmed pickup time + sent address.</div>
              <span class="dms-thread-tag">handled</span>
            </div>
            <div class="dms-thread">
              <div class="dms-thread-head">
                <div class="dms-thread-platform">
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="3" width="18" height="18" rx="5"/>
                    <circle cx="12" cy="12" r="4"/>
                  </svg>
                </div>
                <span class="dms-thread-name">@designhouse_to</span>
                <span class="dms-thread-time">1H AGO</span>
              </div>
              <div class="dms-thread-message">"interested in 50+ pieces for our showroom" — flagged for you, real wholesale lead.</div>
              <span class="dms-thread-tag" style="color: #8a6a1e;">↗ needs you</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- Service: Calls + SMS (Signal) -->
<section class="svc-section alt" id="signal-svc">
  <div class="svc-wrap">
    <div class="svc-grid reverse">
      <div class="svc-text">
        <div class="svc-text-eyebrow">CALLS · SMS · APPOINTMENTS</div>
        <h2>I catch every call you miss.</h2>
        <p>i answer in your voice. i ask the right questions. i book appointments straight to your calendar. when you can't pick up, i don't let leads walk past.</p>
        <div class="svc-features">
          <div class="svc-feature">
            <span class="svc-feature-dot"></span>
            <span class="svc-feature-text">a dedicated <strong>adfi number</strong> — forward your business line to it</span>
          </div>
          <div class="svc-feature">
            <span class="svc-feature-dot"></span>
            <span class="svc-feature-text">i answer in <strong>your voice</strong>, your tone, your style</span>
          </div>
          <div class="svc-feature">
            <span class="svc-feature-dot"></span>
            <span class="svc-feature-text">i book straight into <strong>your calendar</strong> with confirmation texts</span>
          </div>
          <div class="svc-feature">
            <span class="svc-feature-dot"></span>
            <span class="svc-feature-text">full transcripts so you can review what i said</span>
          </div>
        </div>
        <div class="svc-cta-row">
          <a href="#" class="svc-cta-primary">try it free for 7 days →</a>
          <a href="#" class="svc-cta-secondary">listen to a sample call</a>
        </div>
      </div>
      <div class="svc-phone-wrap">
        <div class="svc-phone">
          <div class="svc-phone-screen" data-scene="call">
            <div class="mc-status-bar">
              <div class="mc-status-orb"></div>
              <span class="mc-status-text">SIGNAL · LIVE</span>
              <span class="mc-status-time">2:14PM</span>
            </div>
            <div class="mc-call-anim">
              <div class="mc-call-orb"></div>
            </div>
            <div class="mc-card" data-scene-step="1">
              <div class="mc-card-mono">
                <span class="mc-card-dot urgent"></span>
                <span>INCOMING CALL</span>
              </div>
              <div class="mc-card-title">+1 (416) 555-0934</div>
              <div class="mc-card-meta">i'm answering in your voice...</div>
            </div>
            <div class="mc-card" data-scene-step="2">
              <div class="mc-card-mono">
                <span class="mc-card-dot ink"></span>
                <span>WHAT THEY ASKED</span>
              </div>
              <div class="mc-card-meta">"do you do custom dinnerware for restaurants?"</div>
            </div>
            <div class="mc-card amber-card" data-scene-step="3">
              <div class="mc-card-mono">
                <span class="mc-card-dot attn"></span>
                <span>BOOKED FOR YOU</span>
              </div>
              <div class="mc-card-title">thursday · 2:00pm</div>
              <div class="mc-card-meta">design consultation · est. $4-8k</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- Service: Content (Echo) -->
<section class="svc-section" id="echo-svc">
  <div class="svc-wrap">
    <div class="svc-grid">
      <div class="svc-text">
        <div class="svc-text-eyebrow">CONTENT · INSTAGRAM · LINKEDIN</div>
        <h2>I post your content for you.</h2>
        <p>i write captions in your voice, draft posts in your style, and publish on the rhythm that actually works for your industry. you stay in your craft. i keep your feed alive.</p>
        <div class="svc-features">
          <div class="svc-feature">
            <span class="svc-feature-dot"></span>
            <span class="svc-feature-text">i learn <strong>your voice</strong> from your past posts</span>
          </div>
          <div class="svc-feature">
            <span class="svc-feature-dot"></span>
            <span class="svc-feature-text">i draft <strong>weekly content plans</strong> across platforms</span>
          </div>
          <div class="svc-feature">
            <span class="svc-feature-dot"></span>
            <span class="svc-feature-text">i publish on the <strong>best times</strong> for your audience</span>
          </div>
          <div class="svc-feature">
            <span class="svc-feature-dot"></span>
            <span class="svc-feature-text">i learn what's working and double down on it</span>
          </div>
        </div>
        <div class="svc-cta-row">
          <a href="#" class="svc-cta-primary">start posting today →</a>
          <a href="#" class="svc-cta-secondary">see sample posts</a>
        </div>
      </div>
      <div class="svc-phone-wrap">
        <div class="svc-phone">
          <div class="svc-phone-screen" data-scene="echo">
            <div class="mc-status-bar">
              <div class="mc-status-orb"></div>
              <span class="mc-status-text">ECHO · DRAFTING</span>
              <span class="mc-status-time">11:02AM</span>
            </div>
            <div class="mc-card dark-card" data-scene-step="1">
              <div class="mc-card-mono">
                <span class="mc-card-dot alive"></span>
                <span>WRITING IN YOUR VOICE</span>
              </div>
              <div class="mc-card-meta" style="color: white;">matching tone, format, hashtags...</div>
              <div class="mc-progress show"><div class="mc-progress-fill"></div></div>
            </div>
            <div class="mc-card" data-scene-step="2" style="padding: 8px;">
              <div class="mc-post-img"></div>
              <div class="mc-post-cap">"the way light catches glaze at golden hour ✨ wheel-thrown this morning."</div>
              <div class="mc-post-stats">
                <span>♡ 1,240</span>
                <span>↑ 18%</span>
              </div>
            </div>
            <div class="mc-card" data-scene-step="3">
              <div class="mc-card-mono">
                <span class="mc-card-dot alive"></span>
                <span>PUBLISHED · INSTAGRAM</span>
              </div>
              <div class="mc-card-meta">scheduling 2 more for this week</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- Service: Competitor Watch (Scout) -->
<section class="svc-section alt" id="scout-svc">
  <div class="svc-wrap">
    <div class="svc-grid reverse">
      <div class="svc-text">
        <div class="svc-text-eyebrow">COMPETITORS · MARKET INTEL</div>
        <h2>I watch your rivals so you don't have to.</h2>
        <p>every week, i check what your competitors are doing — what's working, what's flopping, what they're charging — and surface what's worth your attention. you stay informed without scrolling through their feeds.</p>
        <div class="svc-features">
          <div class="svc-feature">
            <span class="svc-feature-dot"></span>
            <span class="svc-feature-text">i track up to <strong>10 rivals</strong> in your industry</span>
          </div>
          <div class="svc-feature">
            <span class="svc-feature-dot"></span>
            <span class="svc-feature-text">i notice <strong>what's working</strong> for them</span>
          </div>
          <div class="svc-feature">
            <span class="svc-feature-dot"></span>
            <span class="svc-feature-text">i spot <strong>price changes, promos, new launches</strong></span>
          </div>
          <div class="svc-feature">
            <span class="svc-feature-dot"></span>
            <span class="svc-feature-text">weekly digest — never check social again</span>
          </div>
        </div>
        <div class="svc-cta-row">
          <a href="#" class="svc-cta-primary">start watching for free →</a>
          <a href="#" class="svc-cta-secondary">see a sample digest</a>
        </div>
      </div>
      <div class="svc-phone-wrap">
        <div class="svc-phone">
          <div class="svc-phone-screen" data-scene="scout">
            <div class="mc-status-bar">
              <div class="mc-status-orb"></div>
              <span class="mc-status-text">SCOUT · WEEKLY DIGEST</span>
              <span class="mc-status-time">MON 9AM</span>
            </div>
            <div class="mc-card amber-card" data-scene-step="1">
              <div class="mc-card-mono">
                <span class="mc-card-dot attn"></span>
                <span>RIVAL MOVE · EAST FORK</span>
              </div>
              <div class="mc-card-title">20% off to interior designers.</div>
              <div class="mc-card-meta">running through end of month</div>
              <span class="mc-card-tag attn">consider matching</span>
            </div>
            <div class="mc-card" data-scene-step="2">
              <div class="mc-card-mono">
                <span class="mc-card-dot ink"></span>
                <span>WHAT'S WORKING FOR THEM</span>
              </div>
              <div class="mc-card-meta">heath ceramics' wheel-throwing reels are getting 4x their normal reach</div>
            </div>
            <div class="mc-card" data-scene-step="3">
              <div class="mc-card-mono">
                <span class="mc-card-dot ink"></span>
                <span>PRICE INTEL</span>
              </div>
              <div class="mc-card-meta">avg dinnerware set in your region: $185-240. you're at $165.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- Service: Market Signals (Pulse) -->
<section class="svc-section" id="pulse-svc">
  <div class="svc-wrap">
    <div class="svc-grid">
      <div class="svc-text">
        <div class="svc-text-eyebrow">TRENDS · NEWS · OPPORTUNITIES</div>
        <h2>I spot trends before your competitors do.</h2>
        <p>i scan trends, news, and cultural moments relevant to your business — and surface what could move your needle. when "ceramic mugs" trend on tiktok or a press piece mentions your craft, i'm the first to tell you.</p>
        <div class="svc-features">
          <div class="svc-feature">
            <span class="svc-feature-dot"></span>
            <span class="svc-feature-text">i monitor <strong>trends across platforms</strong></span>
          </div>
          <div class="svc-feature">
            <span class="svc-feature-dot"></span>
            <span class="svc-feature-text">i spot <strong>news mentions</strong> in your industry</span>
          </div>
          <div class="svc-feature">
            <span class="svc-feature-dot"></span>
            <span class="svc-feature-text">i flag <strong>act-fast opportunities</strong></span>
          </div>
          <div class="svc-feature">
            <span class="svc-feature-dot"></span>
            <span class="svc-feature-text">daily summaries · only what matters</span>
          </div>
        </div>
        <div class="svc-cta-row">
          <a href="#" class="svc-cta-primary">never miss a moment →</a>
          <a href="#" class="svc-cta-secondary">see what i track</a>
        </div>
      </div>
      <div class="svc-phone-wrap">
        <div class="svc-phone">
          <div class="svc-phone-screen" data-scene="pulse">
            <div class="mc-status-bar">
              <div class="mc-status-orb"></div>
              <span class="mc-status-text">PULSE · TRENDING NOW</span>
              <span class="mc-status-time">TODAY</span>
            </div>
            <div class="mc-card" data-scene-step="1">
              <div class="mc-card-mono">
                <span class="mc-card-dot alive"></span>
                <span>TRENDING · TIKTOK</span>
              </div>
              <div class="mc-card-title">"handmade ceramic mugs" +180%</div>
              <div class="mc-card-meta">3.4M views this week · post a making-of reel?</div>
              <span class="mc-card-tag alive">good moment</span>
            </div>
            <div class="mc-card" data-scene-step="2">
              <div class="mc-card-mono">
                <span class="mc-card-dot ink"></span>
                <span>PRESS · TORONTO LIFE</span>
              </div>
              <div class="mc-card-title">"ontario's craft revival"</div>
              <div class="mc-card-meta">they're profiling local potters. i can pitch you.</div>
            </div>
            <div class="mc-card amber-card" data-scene-step="3">
              <div class="mc-card-mono">
                <span class="mc-card-dot attn"></span>
                <span>HOLIDAY OPPORTUNITY</span>
              </div>
              <div class="mc-card-meta">mother's day in 14 days · gift bundles outsell singles 3:1</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- Service: Strategy + Reports (Strategist) -->
<section class="svc-section alt" id="strategist-svc">
  <div class="svc-wrap">
    <div class="svc-grid reverse">
      <div class="svc-text">
        <div class="svc-text-eyebrow">STRATEGY · WEEKLY REPORTS</div>
        <h2>I give you a weekly business review.</h2>
        <p>every sunday, i tell you exactly what i did, what's growing, what's at risk, and what i'd focus on next week. like having a marketing strategist on call — minus the meetings.</p>
        <div class="svc-features">
          <div class="svc-feature">
            <span class="svc-feature-dot"></span>
            <span class="svc-feature-text"><strong>weekly business review</strong> sent every sunday</span>
          </div>
          <div class="svc-feature">
            <span class="svc-feature-dot"></span>
            <span class="svc-feature-text">revenue impact, reach, time saved — all in one place</span>
          </div>
          <div class="svc-feature">
            <span class="svc-feature-dot"></span>
            <span class="svc-feature-text">i tell you <strong>what to focus on</strong> next week</span>
          </div>
          <div class="svc-feature">
            <span class="svc-feature-dot"></span>
            <span class="svc-feature-text">written like a colleague, not a spreadsheet</span>
          </div>
        </div>
        <div class="svc-cta-row">
          <a href="#" class="svc-cta-primary">get your first report →</a>
          <a href="#" class="svc-cta-secondary">see a sample</a>
        </div>
      </div>
      <div class="svc-phone-wrap">
        <div class="svc-phone">
          <div class="svc-phone-screen" data-scene="strategist">
            <div class="mc-status-bar">
              <div class="mc-status-orb"></div>
              <span class="mc-status-text">WEEKLY REVIEW · APR 22-28</span>
              <span class="mc-status-time">SUN 6PM</span>
            </div>
            <div class="mc-kpi-row">
              <div class="mc-kpi-mini" data-scene-step="1">
                <div class="mc-kpi-label-mini">REVENUE</div>
                <div class="mc-kpi-num-mini">$4.2k</div>
                <div class="mc-kpi-delta-mini">↑ 38%</div>
              </div>
              <div class="mc-kpi-mini" data-scene-step="1">
                <div class="mc-kpi-label-mini">REACH</div>
                <div class="mc-kpi-num-mini">8.4k</div>
                <div class="mc-kpi-delta-mini">↑ 23%</div>
              </div>
              <div class="mc-kpi-mini" data-scene-step="2">
                <div class="mc-kpi-label-mini">CONVOS</div>
                <div class="mc-kpi-num-mini">21</div>
                <div class="mc-kpi-delta-mini">↑ 12%</div>
              </div>
              <div class="mc-kpi-mini" data-scene-step="2">
                <div class="mc-kpi-label-mini">SAVED</div>
                <div class="mc-kpi-num-mini">~6h</div>
                <div class="mc-kpi-delta-mini">this week</div>
              </div>
            </div>
            <div class="mc-card" data-scene-step="3">
              <div class="mc-card-mono">
                <span class="mc-card-dot ink"></span>
                <span>THIS WEEK'S STORY</span>
              </div>
              <div class="mc-card-meta">your reels outperformed 80% of past posts. a designer called — i booked a $4-8k project.</div>
            </div>
          </div>
        </div>
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

<!-- Meet the team -->
<section id="team">
  <div class="container-narrow">
    <div class="section-label">meet the team</div>
    <h2 class="section-title">There's not one of me. There are six.</h2>
    <p class="section-intro">adfi is a team of specialists working under one name. you talk to one interface. behind the scenes, six agents coordinate. you never have to manage them — that's my job.</p>

    <div class="team-wrap reveal">
      <div class="team-item">
        <span class="team-dot"></span>
        <div class="team-body">
          <div class="team-name">strategist</div>
          <div class="team-role">studies your business, defines your voice, sets the weekly plan.</div>
        </div>
      </div>
      <div class="team-item">
        <span class="team-dot"></span>
        <div class="team-body">
          <div class="team-name">signal</div>
          <div class="team-role">answers calls, replies to sms and dms, books appointments.</div>
        </div>
      </div>
      <div class="team-item">
        <span class="team-dot"></span>
        <div class="team-body">
          <div class="team-name">echo</div>
          <div class="team-role">writes your posts, matches your voice, publishes on schedule.</div>
        </div>
      </div>
      <div class="team-item">
        <span class="team-dot"></span>
        <div class="team-body">
          <div class="team-name">scout</div>
          <div class="team-role">tracks your competitors. surfaces what's working in your market.</div>
        </div>
      </div>
      <div class="team-item">
        <span class="team-dot"></span>
        <div class="team-body">
          <div class="team-name">pulse</div>
          <div class="team-role">watches news and trends that matter to your business.</div>
        </div>
      </div>
      <div class="team-item">
        <span class="team-dot coming"></span>
        <div class="team-body">
          <div class="team-name">ads <span class="soon-pill">COMING SOON</span></div>
          <div class="team-role">runs and optimizes your paid campaigns on meta and google.</div>
        </div>
      </div>
      <div class="team-item">
        <span class="team-dot coming"></span>
        <div class="team-body">
          <div class="team-name">site <span class="soon-pill">COMING SOON</span></div>
          <div class="team-role">builds and updates your website without you touching a template.</div>
        </div>
      </div>
    </div>
    <p class="team-note">you don't need to learn any of their names. you talk to adfi. we handle the rest internally.</p>
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
          <span class="price-name">starter</span>
          <span class="price-amt">$39<span class="per">/mo</span></span>
        </div>
        <div class="price-tagline">THE ESSENTIALS</div>
        <ul class="price-list">
          <li>i answer your calls and texts</li>
          <li>i give you business insights each week</li>
          <li>no content, no ads — yet</li>
        </ul>
        <a href="#" class="price-cta">start 7 days free</a>
      </div>

      <div class="price-card featured">
        <div class="price-badge">MOST POPULAR</div>
        <div class="price-head">
          <span class="price-name">team</span>
          <span class="price-amt">$99<span class="per">/mo</span></span>
        </div>
        <div class="price-tagline">MOST SOLOPRENEURS PICK THIS</div>
        <ul class="price-list">
          <li>everything in starter</li>
          <li>i post to instagram and linkedin</li>
          <li>i watch your competitors</li>
          <li>i run your weekly business review</li>
        </ul>
        <a href="#" class="price-cta">start 7 days free</a>
      </div>

      <div class="price-card">
        <div class="price-head">
          <span class="price-name">studio</span>
          <span class="price-amt">$299<span class="per">/mo</span></span>
        </div>
        <div class="price-tagline">A FULL MARKETING TEAM</div>
        <ul class="price-list">
          <li>everything in team</li>
          <li>i run your paid ad campaigns</li>
          <li>i build and update your website</li>
          <li>unlimited everything</li>
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
