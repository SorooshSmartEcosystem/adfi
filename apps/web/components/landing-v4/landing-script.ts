// V4 landing page interactive script. Inlined as a string so it ships
// verbatim through a <script> tag and runs on the client against the
// dangerouslySetInnerHTML body.
//
// Blocks:
//   - FAQ accordion toggle
//   - Scroll-in reveal via IntersectionObserver
//   - Hero canvas tabs — auto-rotate + manual click-to-tab + pause/play
//     + progress bar fill + IntersectionObserver pause + reduced-motion
//     support. Replaces the older auto-only engine and the per-svc-section
//     mini-canvas (which was removed when the 5 svc-sections collapsed
//     into the hero canvas tab interface).

export const LANDING_SCRIPT = `\
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
  // HERO CANVAS — 5-moment auto-rotate + manual tabs + pause/play
  // ===================================
  (function() {
    const canvas = document.getElementById('heroCanvas');
    if (!canvas) return;

    const orb = document.getElementById('canvasOrb');
    const orbStage = document.getElementById('orbStage');
    const caption = document.getElementById('canvasCaption');
    const stepDots = canvas.querySelectorAll('.canvas-step-dot');
    const tabs = canvas.querySelectorAll('.canvas-tab');
    const tabProgressEls = canvas.querySelectorAll('.canvas-tab-progress');
    const cards = canvas.querySelectorAll('.canvas-card');
    const pauseBtn = document.getElementById('canvasPause');

    const moments = [
      { id: 'call', duration: 5000, orbMode: 'mode-call', tilt: 'tilt-left',
        caption: 'i caught a missed call.', cardDelay: 240 },
      { id: 'dm', duration: 5500, orbMode: 'mode-dm', tilt: '',
        caption: 'i answered dms on instagram, facebook, and whatsapp.', cardDelay: 180, staggered: true },
      { id: 'content', duration: 5200, orbMode: 'mode-content', tilt: 'tilt-right',
        caption: 'i drafted your next post in your voice.', cardDelay: 240 },
      { id: 'scout', duration: 5000, orbMode: 'mode-scout', tilt: 'tilt-right',
        caption: 'i spotted what your rivals are doing.', cardDelay: 240 },
      { id: 'dash', duration: 5200, orbMode: 'mode-dash', tilt: '',
        caption: 'and your business grew this week.', cardDelay: 120, staggered: true }
    ];

    const reduceMotion = window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let currentStep = 0;
    let timerId = null;
    let progressRaf = null;
    let progressStart = 0;
    // 'auto' = auto-rotating, 'paused' = user-paused, 'offscreen' =
    // section out of view, 'manual' = user clicked a tab (auto resumes
    // after MANUAL_RESUME_AFTER ms of inactivity).
    let mode = reduceMotion ? 'paused' : 'auto';
    let manualResumeTimer = null;
    const MANUAL_RESUME_AFTER = 10000;

    function setOrbMode(mode) {
      orb.className = 'canvas-orb';
      if (mode) orb.classList.add(mode);
    }
    function setOrbTilt(tilt) {
      orbStage.className = 'orb-stage';
      if (tilt) orbStage.classList.add(tilt);
    }
    function setStepDot(idx) {
      stepDots.forEach((d, i) => d.classList.toggle('active', i === idx));
      tabs.forEach((t, i) => {
        const active = i === idx;
        t.classList.toggle('active', active);
        t.setAttribute('aria-selected', active ? 'true' : 'false');
      });
    }
    function clearAllCards() {
      cards.forEach(c => c.classList.remove('show'));
    }
    function showMomentCards(momentId, staggered, delay) {
      const cardsForMoment = canvas.querySelectorAll('[data-moment="' + momentId + '"]');
      if (staggered) {
        cardsForMoment.forEach((c, i) => {
          setTimeout(() => c.classList.add('show'), delay + (i * 120));
        });
      } else {
        cardsForMoment.forEach(c => {
          setTimeout(() => c.classList.add('show'), delay);
        });
      }
    }

    function clearProgress() {
      if (progressRaf) {
        cancelAnimationFrame(progressRaf);
        progressRaf = null;
      }
      tabProgressEls.forEach(el => { el.style.transform = 'scaleX(0)'; });
    }

    function startProgress(idx, durationMs) {
      clearProgress();
      const target = tabProgressEls[idx];
      if (!target || mode !== 'auto') return;
      progressStart = performance.now();
      function tick(now) {
        const elapsed = now - progressStart;
        const pct = Math.min(1, elapsed / durationMs);
        target.style.transform = 'scaleX(' + pct + ')';
        if (pct < 1 && mode === 'auto') {
          progressRaf = requestAnimationFrame(tick);
        }
      }
      progressRaf = requestAnimationFrame(tick);
    }

    function playMoment(idx, opts) {
      opts = opts || {};
      if (idx >= moments.length) idx = 0;
      if (idx < 0) idx = moments.length - 1;
      currentStep = idx;
      const m = moments[idx];

      clearAllCards();
      setOrbMode(m.orbMode);
      setOrbTilt(m.tilt);
      setStepDot(idx);

      caption.style.opacity = '0';
      setTimeout(() => {
        caption.textContent = m.caption;
        caption.style.opacity = '1';
      }, 180);

      showMomentCards(m.id, m.staggered, m.cardDelay);

      if (timerId) {
        clearTimeout(timerId);
        timerId = null;
      }
      if (mode === 'auto') {
        startProgress(idx, m.duration);
        timerId = setTimeout(() => playMoment(idx + 1), m.duration);
      } else {
        clearProgress();
      }
    }

    function setMode(next) {
      mode = next;
      if (pauseBtn) {
        const isAuto = mode === 'auto';
        pauseBtn.querySelector('.canvas-pause-icon').textContent = isAuto ? '⏸' : '▶';
        pauseBtn.setAttribute('aria-label', isAuto ? 'pause auto-rotation' : 'resume auto-rotation');
        pauseBtn.title = isAuto ? 'pause' : 'resume';
      }
      canvas.classList.toggle('paused', mode !== 'auto');
    }

    function pause() {
      setMode('paused');
      if (timerId) {
        clearTimeout(timerId);
        timerId = null;
      }
      clearProgress();
    }

    function resumeAuto() {
      if (manualResumeTimer) {
        clearTimeout(manualResumeTimer);
        manualResumeTimer = null;
      }
      setMode('auto');
      // Replay current moment to restart its timer + progress.
      playMoment(currentStep);
    }

    // Tab click — jump + pause auto. Auto resumes after inactivity.
    tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        const idx = parseInt(tab.dataset.tab, 10) || 0;
        setMode('manual');
        clearProgress();
        if (timerId) {
          clearTimeout(timerId);
          timerId = null;
        }
        playMoment(idx);
        if (manualResumeTimer) clearTimeout(manualResumeTimer);
        manualResumeTimer = setTimeout(() => {
          if (mode === 'manual') resumeAuto();
        }, MANUAL_RESUME_AFTER);
      });
    });

    // Pause / play button
    if (pauseBtn) {
      pauseBtn.addEventListener('click', () => {
        if (mode === 'auto') {
          pause();
        } else {
          resumeAuto();
        }
      });
    }

    // Pause when off-screen (only resume if user hadn't explicitly paused).
    let wasAutoBeforeOffscreen = !reduceMotion;
    const canvasObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          if (mode === 'offscreen' && wasAutoBeforeOffscreen) {
            resumeAuto();
          }
        } else {
          if (mode === 'auto') wasAutoBeforeOffscreen = true;
          else wasAutoBeforeOffscreen = false;
          if (mode === 'auto') {
            setMode('offscreen');
            if (timerId) {
              clearTimeout(timerId);
              timerId = null;
            }
            clearProgress();
          }
        }
      });
    }, { threshold: 0.2 });

    canvasObserver.observe(canvas);

    // Initial render — for reduced-motion, just show the first moment
    // statically. Otherwise start auto-rotation.
    setTimeout(() => playMoment(0), 600);
    if (reduceMotion) setMode('paused');
  })();
`;
