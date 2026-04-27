// V4 landing page interactive script — ported from
// /prototype/ADFI_Landing_v4.html (lines 2712-2927). Inlined as a string
// so it ships verbatim through a <script> tag and runs on the client
// against the dangerouslySetInnerHTML body.
//
// Three blocks:
//   - FAQ accordion toggle
//   - Scroll-in reveal via IntersectionObserver
//   - Hero canvas auto-loop (5 moments, ~27s cycle, pauses off-screen)
//   - Mini-canvas engine for the service-section phone scenes

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
  // HERO CANVAS — 5-moment auto-loop
  // ===================================
  (function() {
    const canvas = document.getElementById('heroCanvas');
    if (!canvas) return;

    const orb = document.getElementById('canvasOrb');
    const orbStage = document.getElementById('orbStage');
    const caption = document.getElementById('canvasCaption');
    const stepDots = canvas.querySelectorAll('.canvas-step-dot');
    const cards = canvas.querySelectorAll('.canvas-card');

    const moments = [
      { id: 'call', duration: 5000, orbMode: 'mode-call', tilt: 'tilt-left',
        caption: 'i caught a missed call.', cardDelay: 400 },
      { id: 'dm', duration: 6000, orbMode: 'mode-dm', tilt: '',
        caption: 'i answered dms on instagram, facebook, and whatsapp.', cardDelay: 300, staggered: true },
      { id: 'content', duration: 5500, orbMode: 'mode-content', tilt: 'tilt-right',
        caption: 'i drafted your next post in your voice.', cardDelay: 400 },
      { id: 'scout', duration: 5000, orbMode: 'mode-scout', tilt: 'tilt-right',
        caption: 'i spotted what your rivals are doing.', cardDelay: 400 },
      { id: 'dash', duration: 5500, orbMode: 'mode-dash', tilt: '',
        caption: 'and your business grew this week.', cardDelay: 200, staggered: true }
    ];

    let currentStep = 0;
    let timerId = null;
    let isPlaying = true;

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
    }
    function clearAllCards() {
      cards.forEach(c => c.classList.remove('show'));
    }
    function showMomentCards(momentId, staggered, delay) {
      const cardsForMoment = canvas.querySelectorAll('[data-moment="' + momentId + '"]');
      if (staggered) {
        cardsForMoment.forEach((c, i) => {
          setTimeout(() => c.classList.add('show'), delay + (i * 200));
        });
      } else {
        cardsForMoment.forEach(c => {
          setTimeout(() => c.classList.add('show'), delay);
        });
      }
    }

    function playMoment(idx) {
      if (idx >= moments.length) idx = 0;
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
      }, 300);

      showMomentCards(m.id, m.staggered, m.cardDelay);

      if (isPlaying) {
        timerId = setTimeout(() => playMoment(idx + 1), m.duration);
      }
    }

    // Pause when off-screen
    const canvasObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          if (!isPlaying) {
            isPlaying = true;
            if (!timerId) playMoment(currentStep);
          }
        } else {
          isPlaying = false;
          if (timerId) {
            clearTimeout(timerId);
            timerId = null;
          }
        }
      });
    }, { threshold: 0.2 });

    canvasObserver.observe(canvas);

    // Start
    setTimeout(() => playMoment(0), 600);
  })();

  // ===================================
  // MINI-CANVAS ENGINE — for service section phone mockups
  // Each phone screen has data-scene attribute; cards inside have
  // data-scene-step. Cards reveal in sequence, then loop.
  // ===================================
  (function() {
    const phoneScreens = document.querySelectorAll('.svc-phone-screen[data-scene]');
    if (!phoneScreens.length) return;

    const sceneStates = new Map(); // screen → { running, timerId, currentStep }

    function getStepCards(screen) {
      const all = screen.querySelectorAll('[data-scene-step]');
      const grouped = {};
      all.forEach(el => {
        const step = parseInt(el.dataset.sceneStep, 10);
        if (!grouped[step]) grouped[step] = [];
        grouped[step].push(el);
      });
      return grouped;
    }

    function playStep(screen, step, totalSteps) {
      const grouped = getStepCards(screen);

      // Hide cards from steps AFTER this one (keep prior ones visible for build-up)
      Object.entries(grouped).forEach(([s, els]) => {
        if (parseInt(s, 10) > step) {
          els.forEach(el => el.classList.remove('show'));
        }
      });

      // Show this step's cards (staggered if multiple)
      if (grouped[step]) {
        grouped[step].forEach((el, i) => {
          setTimeout(() => el.classList.add('show'), i * 150);
        });
      }
    }

    function startScene(screen) {
      const grouped = getStepCards(screen);
      const totalSteps = Math.max(...Object.keys(grouped).map(n => parseInt(n, 10)));
      const state = sceneStates.get(screen) || { currentStep: 0 };
      state.running = true;
      sceneStates.set(screen, state);

      function next() {
        if (!state.running) return;
        state.currentStep = state.currentStep >= totalSteps ? 1 : state.currentStep + 1;
        playStep(screen, state.currentStep, totalSteps);

        const STEP_DURATION = 2400; // ms per step
        const LOOP_PAUSE = 1200; // pause before restarting
        const nextDelay = state.currentStep === totalSteps ? STEP_DURATION + LOOP_PAUSE : STEP_DURATION;

        state.timerId = setTimeout(() => {
          if (state.currentStep >= totalSteps) {
            // Reset all cards before restart
            screen.querySelectorAll('[data-scene-step]').forEach(el => el.classList.remove('show'));
            setTimeout(next, 200);
          } else {
            next();
          }
        }, nextDelay);
      }

      // Initial play
      setTimeout(next, 400);
    }

    function stopScene(screen) {
      const state = sceneStates.get(screen);
      if (state) {
        state.running = false;
        if (state.timerId) clearTimeout(state.timerId);
      }
    }

    // Pause/resume based on visibility
    const phoneObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        const screen = entry.target;
        if (entry.isIntersecting) {
          if (!sceneStates.has(screen) || !sceneStates.get(screen).running) {
            startScene(screen);
          }
        } else {
          stopScene(screen);
        }
      });
    }, { threshold: 0.3 });

    phoneScreens.forEach(screen => phoneObserver.observe(screen));
  })();
`;
