// V4 landing page interactive script. Inlined as a string so it ships
// verbatim through a <script> tag and runs on the client against the
// dangerouslySetInnerHTML body.
//
// Blocks:
//   - FAQ accordion toggle
//   - Scroll-in reveal via IntersectionObserver
//   - Meet-the-team engine: agent rows on left, phone scene on right.
//     Auto-advances every 12s; click any agent to switch (auto resumes
//     after 30s of no interaction). IntersectionObserver pauses when
//     scrolled out of view. Replaced the old hero-canvas + 5
//     svc-section mini-canvas engines.

export const LANDING_SCRIPT = `\
  // Mobile burger toggle. Drawer is rendered with the [hidden] attribute
  // by default; click flips it on/off and updates aria-expanded so the
  // animated burger -> X transition fires via CSS attribute selectors.
  (function setupBurger() {
    const btn = document.querySelector('.nav-burger');
    const drawer = document.getElementById('nav-drawer');
    if (!btn || !drawer) return;
    function close() {
      drawer.setAttribute('hidden', '');
      btn.setAttribute('aria-expanded', 'false');
    }
    function open() {
      drawer.removeAttribute('hidden');
      btn.setAttribute('aria-expanded', 'true');
    }
    btn.addEventListener('click', () => {
      const expanded = btn.getAttribute('aria-expanded') === 'true';
      if (expanded) close(); else open();
    });
    // Close on link tap so the user lands on the section without
    // having to dismiss the menu manually.
    drawer.addEventListener('click', (e) => {
      if (e.target && e.target.tagName === 'A') close();
    });
  })();

  // FAQ toggle
  function toggleFaq(header) {
    const item = header.parentElement;
    item.classList.toggle('open');
  }

  // Scroll-in reveal
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

  // ===================================
  // MEET-THE-TEAM ENGINE
  // ===================================
  (function() {
    const list = document.getElementById('agentList');
    const phoneInner = document.getElementById('phoneInner');
    if (!list || !phoneInner) return;

    const AGENT_DURATION = 12000;
    const PROGRESS_TICK = 100;
    const RESUME_AFTER = 30000;

    const SCENES = {
      signal: {
        statusLabel: 'SIGNAL · LIVE',
        statusTime: '2:14PM',
        content:
          '<div class="pc-call-orb-wrap"><div class="pc-call-orb"></div></div>' +
          '<div class="pc-card" style="animation-delay: 0.2s;">' +
            '<div class="pc-mono"><span class="pc-mono-dot urgent"></span><span>INCOMING CALL</span></div>' +
            '<div class="pc-title">+1 (416) 555-0934</div>' +
            '<div class="pc-meta">i answered in your voice. booked thursday 2pm.</div>' +
          '</div>' +
          '<div class="pc-card" style="animation-delay: 2.5s;">' +
            '<div class="pc-dm-platform">' +
              '<div class="pc-dm-icon"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/></svg></div>' +
              '<span class="pc-dm-name">INSTAGRAM DM</span>' +
              '<span class="pc-dm-status">✓ replied</span>' +
            '</div>' +
            '<div class="pc-meta">"do you ship internationally?" — i answered with rates.</div>' +
          '</div>' +
          '<div class="pc-card amber-card" style="animation-delay: 4.8s;">' +
            '<div class="pc-mono"><span class="pc-mono-dot attn"></span><span>BOOKED FOR YOU</span></div>' +
            '<div class="pc-title">thursday · 2:00pm</div>' +
            '<div class="pc-meta">design consultation · est. $4-8k</div>' +
          '</div>'
      },
      echo: {
        statusLabel: 'ECHO · DRAFTING',
        statusTime: '11:02AM',
        content:
          '<div class="pc-card dark-card" style="animation-delay: 0.2s;">' +
            '<div class="pc-mono"><span class="pc-mono-dot alive"></span><span>WRITING IN YOUR VOICE</span></div>' +
            '<div class="pc-meta">matching tone, format, hashtags...</div>' +
            '<div class="pc-progress"><div class="pc-progress-fill"></div></div>' +
          '</div>' +
          '<div class="pc-card" style="animation-delay: 3.0s; padding: 8px;">' +
            '<div class="pc-post-img"></div>' +
            '<div class="pc-post-cap">"the way light catches glaze at golden hour ✨ wheel-thrown this morning."</div>' +
            '<div class="pc-post-stats"><span>♡ 1,240</span><span>↑ 18%</span></div>' +
          '</div>' +
          '<div class="pc-card" style="animation-delay: 5.5s;">' +
            '<div class="pc-mono"><span class="pc-mono-dot alive"></span><span>PUBLISHED · INSTAGRAM</span></div>' +
            '<div class="pc-meta">scheduling 2 more for this week</div>' +
          '</div>'
      },
      scout: {
        statusLabel: 'SCOUT · WEEKLY DIGEST',
        statusTime: 'MON 9AM',
        content:
          '<div class="pc-card amber-card" style="animation-delay: 0.2s;">' +
            '<div class="pc-mono"><span class="pc-mono-dot attn"></span><span>RIVAL MOVE · EAST FORK</span></div>' +
            '<div class="pc-title">20% off to interior designers.</div>' +
            '<div class="pc-meta">running through end of month</div>' +
            '<span class="pc-tag" style="background: #FFF9ED; color: #8a6a1e;">consider matching</span>' +
          '</div>' +
          '<div class="pc-card" style="animation-delay: 2.5s;">' +
            '<div class="pc-mono"><span class="pc-mono-dot ink"></span><span>WHAT\\'S WORKING FOR THEM</span></div>' +
            '<div class="pc-meta">heath ceramics\\' wheel-throwing reels are getting 4x their normal reach</div>' +
          '</div>' +
          '<div class="pc-card" style="animation-delay: 5.0s;">' +
            '<div class="pc-mono"><span class="pc-mono-dot ink"></span><span>PRICE INTEL</span></div>' +
            '<div class="pc-meta">avg dinnerware set in your region: $185-240. you\\'re at $165.</div>' +
          '</div>'
      },
      pulse: {
        statusLabel: 'PULSE · TRENDING NOW',
        statusTime: 'TODAY',
        content:
          '<div class="pc-card" style="animation-delay: 0.2s;">' +
            '<div class="pc-mono"><span class="pc-mono-dot alive"></span><span>TRENDING · TIKTOK</span></div>' +
            '<div class="pc-title">"handmade ceramic mugs" +180%</div>' +
            '<div class="pc-meta">3.4M views this week · post a making-of reel?</div>' +
            '<span class="pc-tag alive">good moment</span>' +
          '</div>' +
          '<div class="pc-card" style="animation-delay: 2.5s;">' +
            '<div class="pc-mono"><span class="pc-mono-dot ink"></span><span>PRESS · TORONTO LIFE</span></div>' +
            '<div class="pc-title">"ontario\\'s craft revival"</div>' +
            '<div class="pc-meta">they\\'re profiling local potters. i can pitch you.</div>' +
          '</div>' +
          '<div class="pc-card amber-card" style="animation-delay: 5.0s;">' +
            '<div class="pc-mono"><span class="pc-mono-dot attn"></span><span>HOLIDAY OPPORTUNITY</span></div>' +
            '<div class="pc-meta">mother\\'s day in 14 days · gift bundles outsell singles 3:1</div>' +
          '</div>'
      },
      strategist: {
        statusLabel: 'WEEKLY REVIEW · APR 22-28',
        statusTime: 'SUN 6PM',
        content:
          '<div class="pc-kpi-row">' +
            '<div class="pc-kpi" style="animation-delay: 0.2s;"><div class="pc-kpi-label">REVENUE</div><div class="pc-kpi-num">$4.2k</div><div class="pc-kpi-delta">↑ 38%</div></div>' +
            '<div class="pc-kpi" style="animation-delay: 0.5s;"><div class="pc-kpi-label">REACH</div><div class="pc-kpi-num">8.4k</div><div class="pc-kpi-delta">↑ 23%</div></div>' +
            '<div class="pc-kpi" style="animation-delay: 0.8s;"><div class="pc-kpi-label">CONVOS</div><div class="pc-kpi-num">21</div><div class="pc-kpi-delta">↑ 12%</div></div>' +
            '<div class="pc-kpi" style="animation-delay: 1.1s;"><div class="pc-kpi-label">SAVED</div><div class="pc-kpi-num">~6h</div><div class="pc-kpi-delta">this week</div></div>' +
          '</div>' +
          '<div class="pc-card" style="animation-delay: 2.5s;">' +
            '<div class="pc-mono"><span class="pc-mono-dot ink"></span><span>THIS WEEK\\'S STORY</span></div>' +
            '<div class="pc-meta">your reels outperformed 80% of past posts. a designer called — i booked a $4-8k project.</div>' +
          '</div>' +
          '<div class="pc-card" style="animation-delay: 5.5s;">' +
            '<div class="pc-mono"><span class="pc-mono-dot alive"></span><span>WHAT TO FOCUS ON NEXT</span></div>' +
            '<div class="pc-meta">double down on process videos. mornings 8-10am are your sweet spot.</div>' +
          '</div>'
      },
      campaigns: {
        statusLabel: 'CAMPAIGNS · OPTIMIZING',
        statusTime: 'TODAY',
        content:
          '<div class="pc-card" style="animation-delay: 0.2s;">' +
            '<div class="pc-dm-platform"><span class="pc-dm-name">FACEBOOK · META</span><span class="pc-dm-status">↑ 2.4x roas</span></div>' +
            '<div class="pc-meta">"interior designers · 25-45 · ontario" — i shifted $40 here today.</div>' +
          '</div>' +
          '<div class="pc-card" style="animation-delay: 2.8s;">' +
            '<div class="pc-dm-platform"><span class="pc-dm-name">GOOGLE ADS</span><span class="pc-dm-status">✓ live</span></div>' +
            '<div class="pc-meta">"custom dinnerware toronto" — bidding on 12 keywords.</div>' +
          '</div>' +
          '<div class="pc-card" style="animation-delay: 5.4s;">' +
            '<div class="pc-dm-platform"><span class="pc-dm-name">TIKTOK ADS</span><span class="pc-dm-status">⚡ trending</span></div>' +
            '<div class="pc-meta">"making-of reel boosted to lookalikes — 14k views, $8 cpm."</div>' +
          '</div>' +
          '<div class="pc-card amber-card" style="animation-delay: 8.0s;">' +
            '<div class="pc-mono"><span class="pc-mono-dot attn"></span><span>WEEKLY · ALL CAMPAIGNS</span></div>' +
            '<div class="pc-title">$340 spent · $1,180 attributed revenue</div>' +
            '<div class="pc-meta">i killed 2 underperforming ads. shifted budget to top performers.</div>' +
          '</div>'
      }
    };

    const ORDER = ['signal', 'echo', 'scout', 'pulse', 'strategist', 'campaigns'];
    const rows = list.querySelectorAll('.agent-row');

    let currentIdx = 0;
    let progressMs = 0;
    let progressTimer = null;
    let advanceTimer = null;
    let userInteracted = false;
    let userInteractedTimer = null;
    let isVisible = true;

    function renderScene(agentId) {
      const scene = SCENES[agentId];
      if (!scene) return;
      phoneInner.style.animation = 'none';
      void phoneInner.offsetHeight;
      phoneInner.style.animation = 'meet-fade-in 0.4s ease';
      phoneInner.innerHTML =
        '<div class="ps-bar">' +
          '<div class="ps-orb"></div>' +
          '<span class="ps-text">' + scene.statusLabel + '</span>' +
          '<span class="ps-time">' + scene.statusTime + '</span>' +
        '</div>' +
        scene.content;
    }

    function setActive(idx) {
      currentIdx = idx;
      const agentId = ORDER[idx];
      rows.forEach((row, i) => {
        row.classList.toggle('active', i === idx);
        const progress = row.querySelector('.agent-progress');
        if (progress) progress.style.width = '0%';
      });
      renderScene(agentId);

      progressMs = 0;
      if (progressTimer) clearInterval(progressTimer);
      if (advanceTimer) clearTimeout(advanceTimer);
      if (!isVisible) return;

      const activeProgress = rows[idx] && rows[idx].querySelector('.agent-progress');
      progressTimer = setInterval(() => {
        progressMs += PROGRESS_TICK;
        const pct = (progressMs / AGENT_DURATION) * 100;
        if (activeProgress) {
          activeProgress.style.width = Math.min(pct, 100) + '%';
        }
      }, PROGRESS_TICK);

      advanceTimer = setTimeout(() => {
        if (!userInteracted) {
          setActive((idx + 1) % ORDER.length);
        }
      }, AGENT_DURATION);
    }

    function handleAgentClick(idx) {
      userInteracted = true;
      if (userInteractedTimer) clearTimeout(userInteractedTimer);
      setActive(idx);
      userInteractedTimer = setTimeout(() => {
        userInteracted = false;
        setActive((currentIdx + 1) % ORDER.length);
      }, RESUME_AFTER);
    }

    rows.forEach((row, i) => {
      row.addEventListener('click', () => handleAgentClick(i));
      row.addEventListener('click', () => {
        if (window.innerWidth < 900) {
          row.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' });
        }
      });
    });

    const sectionEl = document.querySelector('.meet');
    if (sectionEl) {
      const sectionObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          isVisible = entry.isIntersecting;
          if (!isVisible) {
            if (progressTimer) clearInterval(progressTimer);
            if (advanceTimer) clearTimeout(advanceTimer);
          } else {
            setActive(currentIdx);
          }
        });
      }, { threshold: 0.1 });
      sectionObserver.observe(sectionEl);
    }

    // Initial render
    setActive(0);
  })();
`;

