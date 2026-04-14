(function () {
  var refs = {
    canvas: null,
    overlay: null,
    score: null,
    modeBadge: null
  };

  var ctx = null;
  var rafId = null;
  var isReady = false;
  var isBound = false;

  var state = {
    mode: 'practice',
    running: false,
    dead: false,
    score: 0,
    tapLocked: false,
    onGradedEnd: null,
    lastTs: 0,
    spawnTimer: 0,
    bird: null,
    pipes: []
  };

  var GROUND_H = 58;
  var PIPE_W = 68;
  var PIPE_GAP = 160;
  var PIPE_SPEED = 2.6;
  var PIPE_SPAWN_MS = 1450;
  var GRAVITY = 0.35;
  var FLAP = -7.2;
  var BIRD_R = 14;
  var RIGGED_POINT_LIMIT = 900;

  function init(options) {
    refs.canvas = document.getElementById('flappy-canvas');
    refs.overlay = document.getElementById('flappy-overlay');
    refs.score = document.getElementById('flappy-score-overlay');
    refs.modeBadge = document.getElementById('flappy-mode-badge');

    if (!refs.canvas || !refs.overlay || !refs.score || !refs.modeBadge) return;

    ctx = refs.canvas.getContext('2d');
    if (!ctx) return;

    state.onGradedEnd = options && typeof options.onGradedEnd === 'function'
      ? options.onGradedEnd
      : null;

    resizeCanvas();
    if (!isBound) bindEvents();

    isReady = true;
    startPractice();
  }

  function bindEvents() {
    refs.canvas.addEventListener('pointerdown', handleTap);
    refs.canvas.addEventListener('touchstart', preventScrollTouch, { passive: false });
    window.addEventListener('resize', resizeCanvas);
    window.addEventListener('keydown', onKeyDown);
    isBound = true;
  }

  function preventScrollTouch(e) {
    e.preventDefault();
  }

  function onKeyDown(e) {
    if (e.code === 'Space') {
      e.preventDefault();
      handleTap();
    }
  }

  function resizeCanvas() {
    if (!refs.canvas) return;
    var dpr = window.devicePixelRatio || 1;
    var width = refs.canvas.clientWidth;
    var height = refs.canvas.clientHeight;
    refs.canvas.width = Math.floor(width * dpr);
    refs.canvas.height = Math.floor(height * dpr);
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function startPractice() {
    if (!isReady) return;
    state.mode = 'practice';
    refs.modeBadge.textContent = 'Practice';
    runRound();
  }

  function startGraded() {
    if (!isReady) return;
    state.mode = 'graded';
    refs.modeBadge.textContent = 'Graded';
    runRound();
  }

  function runRound() {
    cancelFrame();
    state.running = true;
    state.dead = false;
    state.score = 0;
    state.tapLocked = false;
    state.lastTs = 0;
    state.spawnTimer = 0;
    state.pipes = [];
    state.bird = {
      x: 90,
      y: Math.max(120, getHeight() * 0.45),
      vy: 0,
      r: BIRD_R
    };
    updateScore();
    clearOverlay();
    loop(0);
  }

  function handleTap() {
    if (state.mode === 'practice' && state.dead) {
      runRound();
      return;
    }

    if (!state.running || state.dead || !state.bird) return;

    if (state.tapLocked) {
      return;
    }

    state.bird.vy = FLAP;
  }

  function loop(ts) {
    if (!state.running) return;

    if (!state.lastTs) {
      state.lastTs = ts;
    }
    var dt = Math.min(35, ts - state.lastTs);
    state.lastTs = ts;

    update(dt);
    render();

    if (state.dead) {
      handleDeath();
      return;
    }

    rafId = window.requestAnimationFrame(loop);
  }

  function update(dt) {
    var step = dt / 16.67;
    var h = getHeight();

    state.bird.vy += GRAVITY * step;
    state.bird.y += state.bird.vy * step;

    state.spawnTimer += dt;
    if (state.spawnTimer >= PIPE_SPAWN_MS) {
      spawnPipe();
      state.spawnTimer = 0;
    }

    for (var i = 0; i < state.pipes.length; i++) {
      var pipe = state.pipes[i];
      pipe.x -= PIPE_SPEED * step;

      if (!pipe.passed && (pipe.x + PIPE_W) < state.bird.x) {
        pipe.passed = true;
        state.score += 1;
        updateScore();
        if (state.mode === 'graded' && getPointScore() >= RIGGED_POINT_LIMIT) {
          state.tapLocked = true;
        }
      }
    }

    state.pipes = state.pipes.filter(function (p) {
      return (p.x + PIPE_W) > -4;
    });

    if (state.bird.y - state.bird.r <= 0 || state.bird.y + state.bird.r >= (h - GROUND_H)) {
      state.dead = true;
      return;
    }

    if (hitsPipe()) {
      state.dead = true;
    }
  }

  function render() {
    var w = getWidth();
    var h = getHeight();

    ctx.clearRect(0, 0, w, h);

    var bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, '#cce6ff');
    bg.addColorStop(1, '#f6d7e9');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    drawClouds(w, h);
    drawPipes(h);
    drawGround(w, h);
    drawBird();
  }

  function drawClouds(w, h) {
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    circle(70, 90, 24);
    circle(95, 86, 18);
    circle(w - 120, 140, 26);
    circle(w - 95, 132, 18);
    circle(w * 0.45, 70, 20);
    circle(w * 0.45 + 22, 74, 14);
  }

  function drawPipes(h) {
    ctx.fillStyle = '#80c98b';
    ctx.strokeStyle = '#5ea669';
    ctx.lineWidth = 2;

    for (var i = 0; i < state.pipes.length; i++) {
      var p = state.pipes[i];
      var topH = p.gapY - (PIPE_GAP / 2);
      var bottomY = p.gapY + (PIPE_GAP / 2);

      roundedRect(p.x, 0, PIPE_W, topH, 8);
      ctx.fill();
      ctx.stroke();

      roundedRect(p.x, bottomY, PIPE_W, h - GROUND_H - bottomY, 8);
      ctx.fill();
      ctx.stroke();
    }
  }

  function drawGround(w, h) {
    ctx.fillStyle = '#f5b7c2';
    ctx.fillRect(0, h - GROUND_H, w, GROUND_H);
    ctx.fillStyle = '#ee9ab0';
    ctx.fillRect(0, h - GROUND_H, w, 12);
  }

  function drawBird() {
    var b = state.bird;
    if (!b) return;

    ctx.fillStyle = '#ffd56b';
    circle(b.x, b.y, b.r);

    ctx.fillStyle = '#ff9f43';
    ctx.beginPath();
    ctx.moveTo(b.x + b.r - 2, b.y);
    ctx.lineTo(b.x + b.r + 10, b.y - 4);
    ctx.lineTo(b.x + b.r + 10, b.y + 4);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#3d3040';
    circle(b.x + 4, b.y - 5, 2.7);
  }

  function spawnPipe() {
    var min = 110;
    var max = getHeight() - GROUND_H - 110;
    var gapY = min + Math.random() * (max - min);
    state.pipes.push({
      x: getWidth() + 20,
      gapY: gapY,
      passed: false
    });
  }

  function hitsPipe() {
    var b = state.bird;
    for (var i = 0; i < state.pipes.length; i++) {
      var p = state.pipes[i];
      var withinX = (b.x + b.r) > p.x && (b.x - b.r) < (p.x + PIPE_W);
      if (!withinX) continue;

      var topBottom = p.gapY - (PIPE_GAP / 2);
      var bottomTop = p.gapY + (PIPE_GAP / 2);
      var hitsTop = (b.y - b.r) < topBottom;
      var hitsBottom = (b.y + b.r) > bottomTop;
      if (hitsTop || hitsBottom) return true;
    }
    return false;
  }

  function handleDeath() {
    state.running = false;
    cancelFrame();

    var points = getPointScore();
    if (state.mode === 'practice') {
      showOverlay('Practice over.<br/>Tap to retry practice or start graded game.');
      return;
    }

    showOverlay('Game over.<br/>You scored <strong>' + points + '</strong> points.');
    if (typeof state.onGradedEnd === 'function') {
      state.onGradedEnd(points);
    }
  }

  function updateScore() {
    refs.score.textContent = getPointScore() + ' pts';
  }

  function getPointScore() {
    return state.score * 10;
  }

  function showOverlay(html) {
    if (!refs.overlay) return;
    refs.overlay.innerHTML = '<div class="flappy-overlay-card">' + html + '</div>';
  }

  function clearOverlay() {
    if (!refs.overlay) return;
    refs.overlay.innerHTML = '';
  }

  function stop() {
    state.running = false;
    cancelFrame();
    clearOverlay();
  }

  function cancelFrame() {
    if (rafId) {
      window.cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  function roundedRect(x, y, w, h, r) {
    var radius = Math.max(0, Math.min(r, w / 2, h / 2));
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + w - radius, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
    ctx.lineTo(x + w, y + h - radius);
    ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    ctx.lineTo(x + radius, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  function circle(x, y, r) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  function getWidth() {
    return refs.canvas ? refs.canvas.clientWidth : 0;
  }

  function getHeight() {
    return refs.canvas ? refs.canvas.clientHeight : 0;
  }

  window.FlappyGame = {
    init: init,
    startPractice: startPractice,
    startGraded: startGraded,
    stop: stop
  };
})();
