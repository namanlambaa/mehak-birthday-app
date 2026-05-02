window.BirthdayLetter = (function () {
  // Each placard awards POINTS_PER_PLACARD on the "Next" click that follows it.
  var POINTS_PER_PLACARD = 500;

  var PLACARDS = [
    "This is for my most beautiful girl on this planet.\n\nI know we have been missing these contests due to my stupidity, but I don't want you to lose out on anything just because of that.",
    "I love you to the moon and back — and not even our Earth's moon.\n\nThe moon that is maybe in some other dimension, far far away. 🌙",
    "You are the light to my darkness.\n\nIt kills me when I see you cry.",
    "I know I haven't been the best, or maybe not even good.\n\nBut trust me, I want to be the best version of myself for you — exactly how you like, and exactly how you deserve.",
    "You are turning 25 this year, and it is such a beautiful milestone.\n\nI don't want it to be anything less for you. 🎀",
    "I know you have such a beautiful halo of considerate and loving friends, and I feel really happy for that.\n\nBut I don't want to be any less than that.",
    "I want to be the safe place you have, the happy go-to person you want, the sukoon, the strength, the weakness — and everything in between.",
    "I want you to think of anything…\n\nand that should already have been done by me.",
    "And today, when it is your birthday, I want you to be assured of a few things:\n\n1. That I love you more than anything else.",
    "You mean the world to me. 🌍💖",
    "And I don't only love you — that's why I respect you.\n\nIf you hadn't been my girl, I'd still fall for a person like you 100,000 times.",
    "I love you, meri jaan.\n\nI really do. 💕"
  ];

  var els = {};
  var state = {
    index: 0,            // 0-based current placard being viewed
    bankedPoints: 0,     // points already credited in firestore
    busy: false,         // prevents double-clicks during animation/network
    onStep: null,        // (stepNumber) => Promise resolving when persisted
    onFinish: null       // () => void called from "Back to Dashboard"
  };

  function cache() {
    els.stage      = document.getElementById('bd-letter-stage');
    els.placard    = document.getElementById('bd-placard');
    els.placardTxt = document.getElementById('bd-placard-text');
    els.step       = document.getElementById('bd-step');
    els.total      = document.getElementById('bd-total');
    els.banked     = document.getElementById('bd-banked');
    els.btnNext    = document.getElementById('btn-bd-next');
    els.pop        = document.getElementById('bd-points-pop');
    els.finale     = document.getElementById('bd-finale-stage');
    els.finalePts  = document.getElementById('bd-finale-points');
    els.btnFinish  = document.getElementById('btn-bd-finish');
  }

  function init(opts) {
    opts = opts || {};
    if (!els.placard) cache();

    state.index = Math.max(0, Math.min(PLACARDS.length - 1, opts.startIndex || 0));
    state.bankedPoints = opts.bankedPoints || 0;
    state.busy = false;
    state.onStep = typeof opts.onStep === 'function' ? opts.onStep : null;
    state.onFinish = typeof opts.onFinish === 'function' ? opts.onFinish : null;

    els.total.textContent = PLACARDS.length;
    els.banked.textContent = state.bankedPoints;

    els.stage.hidden = false;
    els.finale.hidden = true;
    els.placard.classList.remove('bd-placard-out');
    els.btnNext.disabled = false;
    els.pop.hidden = true;
    els.pop.style.animation = '';

    showPlacard(state.index, false);

    // Bind once
    if (!els.btnNext.dataset.bound) {
      els.btnNext.addEventListener('click', handleNext);
      els.btnNext.dataset.bound = '1';
    }
    if (els.btnFinish && !els.btnFinish.dataset.bound) {
      els.btnFinish.addEventListener('click', function () {
        if (state.onFinish) state.onFinish();
      });
      els.btnFinish.dataset.bound = '1';
    }
  }

  function showPlacard(idx, animate) {
    els.placardTxt.textContent = PLACARDS[idx];
    els.step.textContent = idx + 1;

    var lastOne = idx === PLACARDS.length - 1;
    els.btnNext.textContent = lastOne ? 'Reveal the surprise 🎂' : 'Next →';

    if (animate) {
      els.placard.classList.remove('bd-placard-in');
      void els.placard.offsetWidth;
      els.placard.classList.add('bd-placard-in');
    }
  }

  function showPointsPop() {
    if (!els.pop) return;
    els.pop.hidden = false;
    // Force-restart the keyframe animation by clearing then re-applying it.
    // We also force a reflow in between so the browser actually processes the
    // change instead of coalescing it into a no-op.
    els.pop.style.animation = 'none';
    void els.pop.offsetWidth;
    els.pop.style.animation = 'bdPointsPop 1.4s cubic-bezier(0.22, 1, 0.36, 1) forwards';
    setTimeout(function () {
      els.pop.hidden = true;
      els.pop.style.animation = '';
    }, 1450);
  }

  function handleNext() {
    if (state.busy) return;
    state.busy = true;
    els.btnNext.disabled = true;

    var stepNumber = state.index + 1; // 1-based: "I just finished reading placard N"
    var bankPromise = state.onStep
      ? Promise.resolve(state.onStep(stepNumber)).catch(function (err) {
          console.error('Birthday step persist failed:', err);
          return null;
        })
      : Promise.resolve(null);

    bankPromise.then(function (result) {
      var pointsAdded = result && typeof result.pointsAdded === 'number'
        ? result.pointsAdded
        : POINTS_PER_PLACARD;
      var newTotal = result && typeof result.totalEarned === 'number'
        ? result.totalEarned
        : (state.bankedPoints + POINTS_PER_PLACARD);

      // Even if "already claimed" (e.g. resume), we still animate forward.
      state.bankedPoints = newTotal;
      els.banked.textContent = state.bankedPoints;

      if (pointsAdded > 0) showPointsPop();

      // Animate placard out, then either show next or finale.
      els.placard.classList.add('bd-placard-out');
      setTimeout(function () {
        els.placard.classList.remove('bd-placard-out');
        var isLast = state.index >= PLACARDS.length - 1;
        if (isLast) {
          showFinale();
        } else {
          state.index += 1;
          showPlacard(state.index, true);
          state.busy = false;
          els.btnNext.disabled = false;
        }
      }, 320);
    });
  }

  function showFinale() {
    els.stage.hidden = true;
    els.finale.hidden = false;
    if (els.finalePts) els.finalePts.textContent = state.bankedPoints;
    if (window.Confetti) {
      Confetti.launch(5000);
    }
    state.busy = false;
  }

  function stop() {
    state.busy = false;
  }

  return {
    init: init,
    stop: stop,
    PLACARDS_COUNT: PLACARDS.length,
    POINTS_PER_PLACARD: POINTS_PER_PLACARD,
    TOTAL_POINTS: PLACARDS.length * POINTS_PER_PLACARD
  };
})();
