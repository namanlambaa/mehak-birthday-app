(function () {
  // DOM refs
  var els = {};
  var currentContest = null;
  var userData = null;
  var flappySubmitting = false;
  var brickbreakerSubmitting = false;

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
    els.flappyBack = document.getElementById('flappy-back');
    els.btnStartGraded = document.getElementById('btn-start-graded');
    els.flappyTriesLeft = document.getElementById('flappy-tries-left');
    els.flappyBestScore = document.getElementById('flappy-best-score');

    els.emojiBack = document.getElementById('emoji-back');
    els.emojiCheck = document.getElementById('emoji-check');
    els.emojiInput = document.getElementById('emoji-input');

    els.mazeBack = document.getElementById('maze-back');
    els.mazeTriesLeft = document.getElementById('maze-tries-left');
    els.mazeEarned = document.getElementById('maze-earned');

    els.bbBack = document.getElementById('bb-back');
    els.bbStart = document.getElementById('bb-start');
    els.bbRetry = document.getElementById('bb-retry');
    els.bbClaim = document.getElementById('bb-claim');
    els.bbStatus = document.getElementById('bb-status');

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
    els.flappyBack.addEventListener('click', function () {
      if (window.FlappyGame) {
        FlappyGame.stop();
      }
      showDashboard();
    });
    els.btnStartGraded.addEventListener('click', handleStartGradedGame);
    els.emojiBack.addEventListener('click', function () {
      showDashboard();
    });
    els.mazeBack.addEventListener('click', handleMazeBack);
    els.bbBack.addEventListener('click', function () {
      if (window.BrickBreakerGame) {
        BrickBreakerGame.stop();
      }
      showDashboard();
    });
    els.emojiCheck.addEventListener('click', function () {
      if (window.EmojiGame) EmojiGame.checkAnswer();
    });
    els.emojiInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (window.EmojiGame) EmojiGame.checkAnswer();
      }
    });
    els.btnModalHome.addEventListener('click', function () {
      hideModal();
      showDashboard();
    });

    if (els.bbStart) {
      els.bbStart.addEventListener('click', function () {
        if (window.BrickBreakerGame) BrickBreakerGame.start();
      });
    }
    if (els.bbRetry) {
      els.bbRetry.addEventListener('click', function () {
        if (window.BrickBreakerGame) BrickBreakerGame.retryLevel();
      });
    }
    if (els.bbClaim) {
      els.bbClaim.addEventListener('click', function () {
        if (window.BrickBreakerGame) BrickBreakerGame.endRun();
      });
    }
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
    if (window.FlappyGame) {
      FlappyGame.stop();
    }
    if (window.MemoryMaze) {
      MemoryMaze.stop();
    }
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

        return Store.getCurrentContest().then(function (contest) {
          var isFlappy = contest && contest.type === 'flappy';
          var isMaze = contest && contest.type === 'memory-maze';

          if (isAdmin) {
            els.btnPlay.disabled = false;
            els.playStatus.textContent = '🔧 Admin mode — testing only';
            els.playStatus.hidden = false;
          } else if (isMaze) {
            if (Store.isMazeCompleted(data)) {
              els.btnPlay.disabled = true;
              els.playStatus.textContent = 'Memory Maze completed! Earned: ' + (data.mazeTotalEarned || 0) + ' pts 💖';
              els.playStatus.hidden = false;
            } else {
              var mazeTriesLeft = Store.getMazeTriesLeft(data);
              if (mazeTriesLeft <= 0) {
                els.btnPlay.disabled = true;
                els.playStatus.textContent = 'All 3 tries used! Earned: ' + (data.mazeTotalEarned || 0) + ' pts 💖';
                els.playStatus.hidden = false;
              } else {
                els.btnPlay.disabled = false;
                els.playStatus.textContent = mazeTriesLeft + ' tries remaining 🧠';
                els.playStatus.hidden = false;
              }
            }
          } else if (isFlappy) {
            var triesLeft = Store.getFlappyTriesLeft(data);
            if (triesLeft <= 0) {
              els.btnPlay.disabled = true;
              els.playStatus.textContent = 'All 15 tries used! Total earned: ' + (data.flappyTotalEarned || 0) + ' pts 💖';
              els.playStatus.hidden = false;
            } else {
              els.btnPlay.disabled = false;
              els.playStatus.textContent = triesLeft + ' graded tries remaining 🎮';
              els.playStatus.hidden = false;
            }
          } else if (Store.hasPlayedToday(data)) {
            els.btnPlay.disabled = true;
            els.playStatus.textContent = "You've already played today! Come back tomorrow 💫";
            els.playStatus.hidden = false;
          } else {
            els.btnPlay.disabled = false;
          }
        });
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
    els.btnPlay.disabled = true;
    Store.getCurrentContest()
      .then(function (contest) {
        // Admin-only URL override: ?contest=<type> lets us force-test a contest type locally.
        if (Auth.isAdmin()) {
          try {
            var override = new URLSearchParams(window.location.search).get('contest');
            if (override) {
              contest = Object.assign({}, contest || {}, { type: override });
            }
          } catch (e) { /* ignore */ }
        }
        if (!contest) {
          els.btnPlay.disabled = false;
          els.playStatus.textContent = 'No contest available today. Check back later!';
          els.playStatus.hidden = false;
          return;
        }

        if (contest.type === 'flappy') {
          currentContest = contest;
          openFlappyContest();
          return;
        }

        if (contest.type === 'emoji') {
          currentContest = contest;
          openEmojiContest();
          return;
        }

        if (contest.type === 'memory-maze') {
          currentContest = contest;
          openMazeContest();
          return;
        }

        if (contest.type === 'brickbreaker') {
          currentContest = contest;
          openBrickBreakerContest();
          return;
        }

        Router.navigate('view-contest');
        loadContest();
      })
      .catch(function (err) {
        console.error('Failed to detect contest type:', err);
        els.btnPlay.disabled = false;
        els.playStatus.textContent = 'Could not start contest. Please try again.';
        els.playStatus.hidden = false;
      });
  }

  function openFlappyContest() {
    Router.navigate('view-flappy');
    flappySubmitting = false;
    els.btnStartGraded.disabled = true;
    els.btnStartGraded.textContent = 'Loading...';
    els.flappyTriesLeft.textContent = '—';
    els.flappyBestScore.textContent = '0';

    if (!window.FlappyGame) {
      alert('Flappy game failed to load.');
      showDashboard();
      return;
    }

    FlappyGame.init({
      onGradedEnd: handleFlappyGradedEnd
    });

    Store.getUserDoc().then(function (data) {
      var triesLeft = Store.getFlappyTriesLeft(data);
      var earned = data.flappyTotalEarned || 0;
      updateFlappyTriesUI(triesLeft, earned);
    }).catch(function () {
      updateFlappyTriesUI(Store.FLAPPY_MAX_TRIES, 0);
    });
  }

  function updateFlappyTriesUI(triesLeft, totalEarned) {
    els.flappyTriesLeft.textContent = triesLeft;
    els.flappyBestScore.textContent = totalEarned;

    if (triesLeft <= 0) {
      els.btnStartGraded.textContent = 'All 15 tries used!';
      els.btnStartGraded.disabled = true;
    } else {
      els.btnStartGraded.textContent = 'Start Graded Game (' + triesLeft + ' left)';
      els.btnStartGraded.disabled = false;
    }
  }

  function handleStartGradedGame() {
    if (!window.FlappyGame || flappySubmitting) return;
    els.btnStartGraded.disabled = true;
    els.btnStartGraded.textContent = 'Graded Game Running...';
    FlappyGame.startGraded();
  }

  function handleFlappyGradedEnd(points) {
    if (flappySubmitting) return;
    flappySubmitting = true;

    var isAdmin = Auth.isAdmin();
    if (isAdmin) {
      els.btnStartGraded.textContent = 'Start Graded Game';
      els.btnStartGraded.disabled = false;
      flappySubmitting = false;
      FlappyGame.startPractice();
      showModal('Admin test run. Score: ' + points + ' (no points saved).');
      return;
    }

    Store.submitFlappyTry(points)
      .then(function (result) {
        flappySubmitting = false;
        updateFlappyTriesUI(result.triesLeft, result.totalEarned);

        Confetti.launch(2000);
        var msg = '+' + points + ' pts! Total earned: ' + result.totalEarned + ' pts. ' + result.triesLeft + ' tries left.';

        if (result.triesLeft <= 0) {
          msg = '+' + points + ' pts! All 15 tries used — grand total: ' + result.totalEarned + ' pts!';
        }

        FlappyGame.startPractice();
        showModal(msg);
      })
      .catch(function (err) {
        console.error('Flappy try submit failed:', err);
        flappySubmitting = false;
        els.btnStartGraded.disabled = false;
        els.btnStartGraded.textContent = 'Start Graded Game';
        alert('Something went wrong. Please try again.');
      });
  }

  // ==================== Emoji Contest ====================
  function openEmojiContest() {
    Router.navigate('view-emoji');
    if (!window.EmojiGame) {
      alert('Emoji game failed to load.');
      showDashboard();
      return;
    }
    EmojiGame.init({ onComplete: handleEmojiComplete });
  }

  function handleEmojiComplete(totalPoints) {
    var isAdmin = Auth.isAdmin();
    if (isAdmin) {
      showModal('Admin test run. Total: ' + totalPoints + ' pts (no points saved).');
      return;
    }

    Store.submitContest(totalPoints)
      .then(function () {
        Confetti.launch(3000);
        showModal('You decoded all 10! +' + totalPoints + ' points added to your total 💖');
      })
      .catch(function (err) {
        console.error('Emoji submit failed:', err);
        alert('Something went wrong. Please try again.');
      });
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

  // ==================== Memory Maze ====================
  function openMazeContest() {
    Router.navigate('view-memory-maze');

    if (!window.MemoryMaze) {
      alert('Memory Maze failed to load.');
      showDashboard();
      return;
    }

    Store.getUserDoc().then(function (data) {
      var triesLeft = Store.getMazeTriesLeft(data);
      var earned = data.mazeTotalEarned || 0;
      els.mazeTriesLeft.textContent = triesLeft;
      els.mazeEarned.textContent = earned;
    }).catch(function () {
      els.mazeTriesLeft.textContent = Store.MAZE_MAX_TRIES;
      els.mazeEarned.textContent = '0';
    });

    MemoryMaze.init({
      onComplete: handleMazeComplete,
      onFail: handleMazeFail
    });
  }

  function handleMazeComplete(totalPoints) {
    var isAdmin = Auth.isAdmin();
    if (isAdmin) {
      showModal('Admin test run. Total: ' + totalPoints + ' pts (no points saved).');
      return;
    }

    Store.submitMazeTry(totalPoints, true)
      .then(function (result) {
        Confetti.launch(4000);
        els.mazeTriesLeft.textContent = result.triesLeft;
        els.mazeEarned.textContent = result.totalEarned;
        showModal('You completed the Memory Maze! +' + totalPoints + ' points added to your total 💖');
      })
      .catch(function (err) {
        console.error('Maze complete submit failed:', err);
        alert('Something went wrong. Please try again.');
      });
  }

  function handleMazeFail(stageReached, pointsThisRun) {
    var isAdmin = Auth.isAdmin();
    if (isAdmin) {
      showModal('Admin test — reached stage ' + (stageReached + 1) + '. Points: ' + pointsThisRun + ' (not saved).');
      return;
    }

    Store.submitMazeTry(pointsThisRun, false)
      .then(function (result) {
        els.mazeTriesLeft.textContent = result.triesLeft;
        els.mazeEarned.textContent = result.totalEarned;

        var msg;
        if (result.triesLeft <= 0) {
          if (result.pointsAdded > 0) {
            msg = 'Last try! +' + result.pointsAdded + ' pts from your best run added. Total earned: ' + result.totalEarned + ' pts.';
          } else {
            msg = 'All 3 tries used. Total earned: ' + result.totalEarned + ' pts.';
          }
        } else {
          msg = 'Reached stage ' + (stageReached + 1) + '. ' + result.triesLeft + ' tries left — no points until you finish all 20 stages!';
        }
        showModal(msg);
      })
      .catch(function (err) {
        console.error('Maze fail submit failed:', err);
        alert('Something went wrong. Please try again.');
      });
  }

  function handleMazeBack() {
    if (window.MemoryMaze) {
      var stage = MemoryMaze.getCurrentStage();
      if (stage > 0) {
        var pts = MemoryMaze.getPointsSoFar();
        MemoryMaze.stop();
        handleMazeFail(stage, pts);
        return;
      }
      MemoryMaze.stop();
    }
    showDashboard();
  }

  // ==================== Brick Breaker ====================
  function openBrickBreakerContest() {
    Router.navigate('view-brickbreaker');
    brickbreakerSubmitting = false;

    if (!window.BrickBreakerGame) {
      alert('Brick Breaker failed to load.');
      showDashboard();
      return;
    }

    if (els.bbStatus) {
      els.bbStatus.hidden = true;
      els.bbStatus.textContent = '';
    }

    // If already played today (non-admin), show locked state.
    Store.getUserDoc().then(function (data) {
      if (!Auth.isAdmin() && Store.hasPlayedToday(data)) {
        if (els.bbStatus) {
          els.bbStatus.hidden = false;
          els.bbStatus.textContent = "You've already claimed points today. Come back tomorrow 💫";
        }
        if (els.bbStart) els.bbStart.disabled = true;
        if (els.bbRetry) els.bbRetry.disabled = true;
        if (els.bbClaim) els.bbClaim.disabled = true;
      } else {
        if (els.bbStart) els.bbStart.disabled = false;
        if (els.bbRetry) els.bbRetry.disabled = false;
        if (els.bbClaim) els.bbClaim.disabled = false;
      }

      BrickBreakerGame.init({
        onClaimPoints: handleBrickBreakerClaim
      });
    }).catch(function () {
      BrickBreakerGame.init({
        onClaimPoints: handleBrickBreakerClaim
      });
    });
  }

  function handleBrickBreakerClaim(pointsBanked) {
    if (brickbreakerSubmitting) return;
    brickbreakerSubmitting = true;

    var isAdmin = Auth.isAdmin();
    if (isAdmin) {
      brickbreakerSubmitting = false;
      showModal('Admin test run. Banked: ' + pointsBanked + ' pts (no points saved).');
      return;
    }

    // Double-check user hasn't already claimed today
    Store.getUserDoc()
      .then(function (freshData) {
        if (Store.hasPlayedToday(freshData)) {
          brickbreakerSubmitting = false;
          showModal("You've already claimed today! Points were already counted. 💖");
          return;
        }

        return Store.submitContest(pointsBanked || 0).then(function () {
          brickbreakerSubmitting = false;
          if (window.BrickBreakerGame) BrickBreakerGame.stop();
          Confetti.launch(3500);
          showModal('+' + (pointsBanked || 0) + ' points added to your total 💖');
        });
      })
      .catch(function (err) {
        console.error('Brick Breaker claim failed:', err);
        brickbreakerSubmitting = false;
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
