(function () {
  // DOM refs
  var els = {};
  var currentContest = null;
  var userData = null;

  function cacheDom() {
    els.loginForm = document.getElementById('login-form');
    els.inputUser = document.getElementById('input-username');
    els.inputPass = document.getElementById('input-password');
    els.loginError = document.getElementById('login-error');

    els.statPlayed = document.getElementById('stat-played');
    els.statRemaining = document.getElementById('stat-remaining');
    els.statPoints = document.getElementById('stat-points');
    els.dailyMessage = document.getElementById('daily-message');
    els.btnPlay = document.getElementById('btn-play');
    els.playStatus = document.getElementById('play-status');
    els.btnLogout = document.getElementById('btn-logout');

    els.btnBack = document.getElementById('btn-back');
    els.contestBody = document.getElementById('contest-body');
    els.contestAnswer = document.getElementById('contest-answer');
    els.btnSubmit = document.getElementById('btn-submit');

    els.modalOverlay = document.getElementById('modal-overlay');
    els.btnModalHome = document.getElementById('btn-modal-home');
  }

  // ==================== Boot ====================
  function boot() {
    cacheDom();
    Router.init();
    Confetti.init();

    var firebaseReady = DB.init();

    var user = Auth.getUser();
    if (user && firebaseReady) {
      showDashboard();
    } else {
      Router.navigate('view-login');
    }

    bindEvents();
  }

  // ==================== Events ====================
  function bindEvents() {
    els.loginForm.addEventListener('submit', handleLogin);
    els.btnPlay.addEventListener('click', handlePlayContest);
    els.btnLogout.addEventListener('click', handleLogout);
    els.btnBack.addEventListener('click', function () {
      showDashboard();
    });
    els.btnSubmit.addEventListener('click', handleSubmit);
    els.btnModalHome.addEventListener('click', function () {
      hideModal();
      showDashboard();
    });
  }

  // ==================== Login ====================
  function handleLogin(e) {
    e.preventDefault();
    els.loginError.hidden = true;

    var user = Auth.login(els.inputUser.value, els.inputPass.value);
    if (!user) {
      els.loginError.hidden = false;
      shakeElement(els.loginError);
      return;
    }

    var firebaseReady = DB.getDb() || DB.init();
    if (!firebaseReady && !DB.getDb()) {
      els.loginError.textContent = 'Firebase not configured';
      els.loginError.hidden = false;
      return;
    }

    els.loginForm.reset();
    showDashboard();
  }

  function handleLogout() {
    Auth.logout();
    Router.navigate('view-login');
    resetDashboard();
  }

  // ==================== Dashboard ====================
  function showDashboard() {
    Router.navigate('view-dashboard');
    loadDashboardData();
  }

  function loadDashboardData() {
    els.dailyMessage.textContent = AppConfig.getDailyMessage();
    els.statRemaining.textContent = AppConfig.getDaysRemaining();
    markLoaded(els.statRemaining);

    clearLoaded(els.statPlayed);
    clearLoaded(els.statPoints);
    els.btnPlay.disabled = true;
    els.playStatus.hidden = true;

    Store.getUserDoc()
      .then(function (data) {
        userData = data;
        els.statPlayed.textContent = data.contestsPlayed || 0;
        els.statPoints.textContent = '₹' + (data.points || 0);
        markLoaded(els.statPlayed);
        markLoaded(els.statPoints);

        var isAdmin = Auth.isAdmin();
        var alreadyPlayed = Store.hasPlayedToday(data);

        if (!isAdmin && alreadyPlayed) {
          els.btnPlay.disabled = true;
          els.playStatus.textContent = "You've already played today! Come back tomorrow 💫";
          els.playStatus.hidden = false;
        } else {
          els.btnPlay.disabled = false;
          if (isAdmin) {
            els.playStatus.textContent = '🔧 Admin mode — testing only';
            els.playStatus.hidden = false;
          }
        }
      })
      .catch(function (err) {
        console.error('Failed to load user data:', err);
        els.statPlayed.textContent = '—';
        els.statPoints.textContent = '—';
        markLoaded(els.statPlayed);
        markLoaded(els.statPoints);
        els.btnPlay.disabled = false;
      });
  }

  function resetDashboard() {
    els.statPlayed.textContent = '—';
    els.statRemaining.textContent = '—';
    els.statPoints.textContent = '—';
    els.playStatus.hidden = true;
    els.btnPlay.disabled = true;
    userData = null;
    currentContest = null;
  }

  // ==================== Contest ====================
  function handlePlayContest() {
    Router.navigate('view-contest');
    loadContest();
  }

  function loadContest() {
    els.contestBody.innerHTML =
      '<div class="shimmer-block"></div><div class="shimmer-block short"></div>';
    els.contestAnswer.value = '';
    els.btnSubmit.disabled = true;

    Store.getCurrentContest()
      .then(function (contest) {
        if (!contest) {
          els.contestBody.textContent = 'No contest available today. Check back later!';
          return;
        }
        currentContest = contest;

        var title = contest.title || 'Today\'s Challenge';
        var body = contest.body || '';
        var pts = contest.points || 0;

        els.contestBody.innerHTML = '';

        var h = document.createElement('h3');
        h.style.marginBottom = '10px';
        h.style.fontSize = '1.05rem';
        h.textContent = title;
        els.contestBody.appendChild(h);

        var p = document.createElement('p');
        p.style.whiteSpace = 'pre-wrap';
        p.style.lineHeight = '1.7';
        p.textContent = body;
        els.contestBody.appendChild(p);

        var badge = document.createElement('div');
        badge.style.marginTop = '16px';
        badge.style.fontSize = '0.78rem';
        badge.style.color = 'var(--accent-pink)';
        badge.style.fontWeight = '600';
        badge.textContent = '🎁 ' + pts + ' points up for grabs!';
        els.contestBody.appendChild(badge);

        els.btnSubmit.disabled = false;
      })
      .catch(function (err) {
        console.error('Failed to load contest:', err);
        els.contestBody.textContent = 'Could not load contest. Please try again.';
      });
  }

  function handleSubmit() {
    if (!currentContest) return;

    var answer = els.contestAnswer.value.trim();
    if (!answer) {
      shakeElement(els.contestAnswer);
      return;
    }

    var isAdmin = Auth.isAdmin();
    els.btnSubmit.disabled = true;
    els.btnSubmit.textContent = 'Submitting…';

    if (isAdmin) {
      // Admin: don't write to Firestore
      setTimeout(function () {
        els.btnSubmit.textContent = 'Submit Answer';
        showModal('Test submission recorded (admin mode — no points saved).');
      }, 500);
      return;
    }

    // Double-check user hasn't already played
    Store.getUserDoc()
      .then(function (freshData) {
        if (Store.hasPlayedToday(freshData)) {
          els.btnSubmit.textContent = 'Submit Answer';
          showModal("You've already submitted today! Points were already counted. 💖");
          return;
        }

        return Store.submitContest(currentContest.points || 0).then(function () {
          els.btnSubmit.textContent = 'Submit Answer';
          Confetti.launch(3000);
          showModal('Your points have been added to your total.');
        });
      })
      .catch(function (err) {
        console.error('Submit failed:', err);
        els.btnSubmit.textContent = 'Submit Answer';
        els.btnSubmit.disabled = false;
        alert('Something went wrong. Please try again.');
      });
  }

  // ==================== Modal ====================
  function showModal(message) {
    var textEl = els.modalOverlay.querySelector('.modal-text');
    if (textEl && message) textEl.textContent = message;
    els.modalOverlay.hidden = false;
  }

  function hideModal() {
    els.modalOverlay.hidden = true;
    Confetti.stop();
  }

  // ==================== Helpers ====================
  function markLoaded(el) {
    el.classList.add('loaded');
  }

  function clearLoaded(el) {
    el.classList.remove('loaded');
    el.textContent = '—';
  }

  function shakeElement(el) {
    el.style.animation = 'none';
    void el.offsetWidth;
    el.style.animation = 'shake 0.4s ease';
    setTimeout(function () { el.style.animation = ''; }, 400);
  }

  // ==================== Init ====================
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
