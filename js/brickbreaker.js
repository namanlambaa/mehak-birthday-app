(function () {
  // ==================== DOM refs ====================
  var refs = {
    canvas: null,
    stage: null,
    overlay: null,
    level: null,
    score: null,
    lives: null,
    start: null,
    retry: null,
    claim: null
  };

  var ctx = null;
  var rafId = null;
  var isReady = false;
  var isBound = false;
  var audioCtx = null;

  var mehakImg = new Image();
  mehakImg.src = 'assets/mehak.jpeg';

  // ==================== Constants ====================
  var LEVEL_POINTS = [84, 84, 84, 84, 500];
  var TOTAL_LEVELS = 5;

  // Logical render space (scaled to canvas via DPR and CSS size).
  // We design gameplay against a fixed logical resolution and draw into actual canvas size.
  var VIEW_W = 360;
  var VIEW_H = 520;

  // ==================== State ====================
  var state = {
    running: false,
    paused: false,
    level: 0,           // 0-indexed
    lives: 3,
    banked: 0,          // points already locked in (completed levels sum)
    levelCleared: false,
    gameOver: false,
    victory: false,
    paddle: null,
    balls: [],
    bricks: [],
    powerUps: [],
    particles: [],
    effects: {
      expandUntil: 0,
      slowUntil: 0,
      lasersUntil: 0
    },
    lastTs: 0,
    shakeMs: 0,
    speedMul: 1.0,      // grows with time/bricks
    bricksBroken: 0,
    onClaim: null,
    pointerX: null,
    submitted: false,
    startedOnce: false
  };

  // ==================== Public API ====================
  function init(options) {
    refs.canvas = document.getElementById('bb-canvas');
    refs.stage = document.getElementById('bb-stage');
    refs.overlay = document.getElementById('bb-overlay');
    refs.level = document.getElementById('bb-level');
    refs.score = document.getElementById('bb-score');
    refs.lives = document.getElementById('bb-lives');
    refs.start = document.getElementById('bb-start');
    refs.retry = document.getElementById('bb-retry');
    refs.claim = document.getElementById('bb-claim');

    if (!refs.canvas || !refs.stage || !refs.overlay) return;

    ctx = refs.canvas.getContext('2d');
    if (!ctx) return;

    state.onClaim = options && typeof options.onClaimPoints === 'function' ? options.onClaimPoints : null;

    resizeCanvas();
    if (!isBound) bindEvents();

    isReady = true;
    resetToLevelStart(0, true);
    renderHud();
    showOverlay(
      '<div class="bb-overlay-card">' +
        '<div class="bb-overlay-title">Brick Breaker 🧱</div>' +
        '<p>Clear all breakable Mehaks.</p>' +
        '<p>Levels 1–4: +84 pts each. Level 5: +500 pts.</p>' +
        '<p class="bb-overlay-sub">Tap <strong>Start</strong> to play.</p>' +
      '</div>'
    );
  }

  function bindEvents() {
    refs.canvas.addEventListener('pointermove', onPointerMove);
    refs.canvas.addEventListener('pointerdown', onPointerDown);
    refs.canvas.addEventListener('touchstart', preventScrollTouch, { passive: false });
    refs.canvas.addEventListener('touchmove', preventScrollTouch, { passive: false });
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('resize', resizeCanvas);
    isBound = true;
  }

  function preventScrollTouch(e) {
    e.preventDefault();
  }

  var keyLeft = false, keyRight = false;
  function onKeyDown(e) {
    if (e.code === 'ArrowLeft') { keyLeft = true; e.preventDefault(); }
    if (e.code === 'ArrowRight') { keyRight = true; e.preventDefault(); }
    if (e.code === 'Space') {
      e.preventDefault();
      if (!state.running && !state.gameOver && !state.victory) {
        start();
      } else if (state.running) {
        launchStuckBalls();
      }
    }
  }
  function onKeyUp(e) {
    if (e.code === 'ArrowLeft') keyLeft = false;
    if (e.code === 'ArrowRight') keyRight = false;
  }

  function onPointerMove(e) {
    var rect = refs.canvas.getBoundingClientRect();
    var x = e.clientX - rect.left;
    state.pointerX = (x / rect.width) * VIEW_W;
  }

  function onPointerDown(e) {
    onPointerMove(e);
    if (!state.running && !state.gameOver && !state.victory) {
      start();
      launchStuckBalls();
    } else if (state.running) {
      launchStuckBalls();
    }
  }

  function launchStuckBalls() {
    if (!state.balls || !state.balls.length) return;
    for (var i = 0; i < state.balls.length; i++) {
      var b = state.balls[i];
      if (b.stuckToPaddle) {
        b.stuckToPaddle = false;
        var speed = Math.hypot(b.vx, b.vy) || (LEVEL_CONFIGS[state.level].baseSpeed);
        var angle = -Math.PI / 2 + (Math.random() * 0.4 - 0.2);
        b.vx = Math.cos(angle) * speed;
        b.vy = Math.sin(angle) * speed;
      }
    }
  }

  function resizeCanvas() {
    if (!refs.canvas) return;
    var dpr = window.devicePixelRatio || 1;
    var cssW = refs.canvas.clientWidth;
    var cssH = refs.canvas.clientHeight;
    if (cssW <= 0 || cssH <= 0) return;
    refs.canvas.width = Math.floor(cssW * dpr);
    refs.canvas.height = Math.floor(cssH * dpr);
    if (ctx) {
      // Scale so drawing in VIEW_W x VIEW_H fills the canvas, but preserve aspect via letterboxing via scale.
      var scaleX = (cssW * dpr) / VIEW_W;
      var scaleY = (cssH * dpr) / VIEW_H;
      var s = Math.min(scaleX, scaleY);
      ctx.setTransform(s, 0, 0, s, ((cssW * dpr) - VIEW_W * s) / 2, ((cssH * dpr) - VIEW_H * s) / 2);
    }
  }

  function start() {
    if (!isReady) return;
    if (state.gameOver || state.victory) {
      resetToLevelStart(0, true);
    }
    state.running = true;
    state.paused = false;
    state.startedOnce = true;
    clearOverlay();
    setButtonStates();
    cancelFrame();
    state.lastTs = 0;
    launchStuckBalls();
    rafId = window.requestAnimationFrame(loop);
  }

  function retryLevel() {
    if (!isReady) return;
    if (state.victory) return;
    resetToLevelStart(state.level, false);
    state.running = true;
    state.paused = false;
    clearOverlay();
    setButtonStates();
    cancelFrame();
    state.lastTs = 0;
    launchStuckBalls();
    rafId = window.requestAnimationFrame(loop);
  }

  function endRun() {
    if (!isReady) return;
    if (state.submitted) return;
    state.submitted = true;
    state.running = false;
    cancelFrame();
    showOverlay(
      '<div class="bb-overlay-card">' +
        '<div class="bb-overlay-title">Claiming…</div>' +
        '<p>Banked ' + state.banked + ' pts</p>' +
      '</div>'
    );
    if (typeof state.onClaim === 'function') {
      state.onClaim(state.banked);
    }
  }

  function stop() {
    state.running = false;
    cancelFrame();
  }

  function cancelFrame() {
    if (rafId) {
      window.cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  // ==================== Level setup ====================
  function resetToLevelStart(levelIdx, fullReset) {
    state.level = levelIdx;
    if (fullReset) {
      state.banked = 0;
      state.lives = 3;
      state.gameOver = false;
      state.victory = false;
      state.submitted = false;
    }
    state.levelCleared = false;
    state.balls = [];
    state.powerUps = [];
    state.particles = [];
    state.effects = { expandUntil: 0, slowUntil: 0, lasersUntil: 0 };
    state.bricksBroken = 0;
    state.speedMul = 1.0;
    state.shakeMs = 0;

    var cfg = LEVEL_CONFIGS[levelIdx];
    state.paddle = makePaddle(cfg.paddleWidth);
    state.balls.push(makeBall(cfg.baseSpeed));
    state.bricks = buildBricks(cfg.layout);
    renderHud();
  }

  function makePaddle(width) {
    return {
      x: VIEW_W / 2 - width / 2,
      y: VIEW_H - 38,
      w: width,
      h: 12,
      baseW: width
    };
  }

  function makeBall(speed) {
    var angle = -Math.PI / 2 + (Math.random() * 0.6 - 0.3);
    return {
      x: VIEW_W / 2,
      y: VIEW_H - 60,
      r: 6,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      speed: speed,
      stuckToPaddle: true,
      stuckOffset: 0
    };
  }

  function buildBricks(layout) {
    var bricks = [];
    var rows = layout.length;
    var cols = layout[0].length;
    var pad = 4;
    var sideMargin = 12;
    var topMargin = 48;
    var gridW = VIEW_W - sideMargin * 2;
    var bw = (gridW - (cols - 1) * pad) / cols;
    var bh = 18;

    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        var t = layout[r][c];
        if (t === 0) continue;
        var brick = {
          x: sideMargin + c * (bw + pad),
          y: topMargin + r * (bh + pad),
          w: bw,
          h: bh,
          type: t, // 1=normal, 2=strong, 3=steel
          hp: t === 2 ? 2 : (t === 1 ? 1 : Infinity),
          alive: true
        };
        bricks.push(brick);
      }
    }
    return bricks;
  }

  // ==================== Levels ====================
  // 0 = empty, 1 = normal (Mehak), 2 = strong (red, 2-hit), 3 = steel (unbreakable)
  var LEVEL_CONFIGS = [
    // Level 1 - slow, simple
    {
      paddleWidth: 80,
      baseSpeed: 3.6,
      speedRamp: 0.00004,
      powerupChance: 0.12,
      layout: [
        [1,1,1,1,1,1,1,1],
        [1,1,1,1,1,1,1,1],
        [0,1,1,1,1,1,1,0],
        [0,0,1,1,1,1,0,0]
      ]
    },
    // Level 2 - faster, introduce strong
    {
      paddleWidth: 78,
      baseSpeed: 4.2,
      speedRamp: 0.00006,
      powerupChance: 0.14,
      layout: [
        [2,1,1,1,1,1,1,2],
        [1,2,1,1,1,1,2,1],
        [1,1,2,1,1,2,1,1],
        [0,1,1,1,1,1,1,0]
      ]
    },
    // Level 3 - steel introduced with clear paths
    {
      paddleWidth: 72,
      baseSpeed: 4.8,
      speedRamp: 0.00008,
      powerupChance: 0.14,
      layout: [
        [1,1,3,1,1,3,1,1],
        [1,2,1,1,1,1,2,1],
        [3,1,1,2,2,1,1,3],
        [0,1,1,1,1,1,1,0],
        [0,0,1,1,1,1,0,0]
      ]
    },
    // Level 4 - dense + tricky
    {
      paddleWidth: 66,
      baseSpeed: 5.4,
      speedRamp: 0.00012,
      powerupChance: 0.18,
      layout: [
        [3,1,1,2,2,1,1,3],
        [2,1,2,1,1,2,1,2],
        [1,2,1,3,3,1,2,1],
        [2,1,2,1,1,2,1,2],
        [3,1,1,2,2,1,1,3],
        [0,1,1,1,1,1,1,0]
      ]
    },
    // Level 5 - brutal maze-like
    {
      paddleWidth: 56,
      baseSpeed: 6.4,
      speedRamp: 0.00018,
      powerupChance: 0.10,
      layout: [
        [3,3,1,3,3,1,3,3],
        [3,1,2,1,1,2,1,3],
        [1,2,3,1,1,3,2,1],
        [3,1,1,2,2,1,1,3],
        [1,2,3,1,1,3,2,1],
        [3,1,2,3,3,2,1,3],
        [3,3,1,1,1,1,3,3],
        [0,1,3,1,1,3,1,0]
      ]
    }
  ];

  // ==================== Main loop ====================
  function loop(ts) {
    if (!state.running) return;
    if (!state.lastTs) state.lastTs = ts;
    var dt = Math.min(35, ts - state.lastTs);
    state.lastTs = ts;

    update(dt);
    render();

    if (state.gameOver || state.victory || state.levelCleared) {
      handleEndOfRoundFlow();
      return;
    }

    rafId = window.requestAnimationFrame(loop);
  }

  function update(dt) {
    var cfg = LEVEL_CONFIGS[state.level];
    var step = dt / 16.67;

    // Speed ramp
    state.speedMul += cfg.speedRamp * dt;
    var slow = performance.now() < state.effects.slowUntil ? 0.55 : 1.0;

    // Paddle movement (keys + pointer)
    var paddleSpeed = 7 * step;
    if (keyLeft) state.paddle.x -= paddleSpeed;
    if (keyRight) state.paddle.x += paddleSpeed;
    if (state.pointerX != null) {
      var targetX = state.pointerX - state.paddle.w / 2;
      // ease toward pointer
      state.paddle.x += (targetX - state.paddle.x) * Math.min(1, 0.3 * step);
    }
    // Paddle expand effect
    if (performance.now() < state.effects.expandUntil) {
      state.paddle.w = state.paddle.baseW * 1.6;
    } else {
      state.paddle.w = state.paddle.baseW;
    }
    // Clamp paddle
    if (state.paddle.x < 0) state.paddle.x = 0;
    if (state.paddle.x + state.paddle.w > VIEW_W) state.paddle.x = VIEW_W - state.paddle.w;

    // Balls
    for (var i = 0; i < state.balls.length; i++) {
      var b = state.balls[i];
      if (b.stuckToPaddle) {
        b.x = state.paddle.x + state.paddle.w / 2 + b.stuckOffset;
        b.y = state.paddle.y - b.r - 1;
        continue;
      }
      var vmul = state.speedMul * slow * step;
      b.x += b.vx * vmul;
      b.y += b.vy * vmul;

      // Wall bounces
      if (b.x - b.r < 0) { b.x = b.r; b.vx = Math.abs(b.vx); }
      if (b.x + b.r > VIEW_W) { b.x = VIEW_W - b.r; b.vx = -Math.abs(b.vx); }
      if (b.y - b.r < 0) { b.y = b.r; b.vy = Math.abs(b.vy); }

      // Paddle bounce
      if (b.vy > 0 &&
          b.y + b.r >= state.paddle.y &&
          b.y + b.r <= state.paddle.y + state.paddle.h + 6 &&
          b.x >= state.paddle.x - b.r &&
          b.x <= state.paddle.x + state.paddle.w + b.r) {
        var hitPos = ((b.x - (state.paddle.x + state.paddle.w / 2)) / (state.paddle.w / 2));
        hitPos = Math.max(-1, Math.min(1, hitPos));
        var angle = hitPos * (Math.PI / 3); // up to 60°
        var speed = Math.hypot(b.vx, b.vy);
        b.vx = Math.sin(angle) * speed;
        b.vy = -Math.abs(Math.cos(angle) * speed);
        b.y = state.paddle.y - b.r - 1;
        playTone(620, 0.03);
      }

      // Brick collision
      collideBallWithBricks(b, cfg);

      // Off bottom
      if (b.y - b.r > VIEW_H) {
        state.balls.splice(i, 1);
        i--;
      }
    }

    if (state.balls.length === 0) {
      state.lives -= 1;
      renderHud();
      if (state.lives <= 0) {
        state.gameOver = true;
      } else {
        // respawn one ball
        state.balls.push(makeBall(cfg.baseSpeed));
      }
    }

    // Power-ups falling
    for (var j = 0; j < state.powerUps.length; j++) {
      var p = state.powerUps[j];
      p.y += 1.6 * step;
      // paddle catch
      if (p.y + p.h >= state.paddle.y &&
          p.y <= state.paddle.y + state.paddle.h &&
          p.x + p.w >= state.paddle.x &&
          p.x <= state.paddle.x + state.paddle.w) {
        applyPowerUp(p.kind, cfg);
        state.powerUps.splice(j, 1);
        j--;
        continue;
      }
      if (p.y > VIEW_H) {
        state.powerUps.splice(j, 1);
        j--;
      }
    }

    // Particles
    for (var k = 0; k < state.particles.length; k++) {
      var pt = state.particles[k];
      pt.x += pt.vx * step;
      pt.y += pt.vy * step;
      pt.vy += 0.15 * step;
      pt.life -= dt;
      if (pt.life <= 0) {
        state.particles.splice(k, 1);
        k--;
      }
    }

    if (state.shakeMs > 0) state.shakeMs -= dt;

    // Win check
    var breakable = 0;
    for (var bi = 0; bi < state.bricks.length; bi++) {
      if (state.bricks[bi].alive && state.bricks[bi].type !== 3) breakable++;
    }
    if (breakable === 0) {
      state.levelCleared = true;
    }
  }

  function collideBallWithBricks(b, cfg) {
    for (var i = 0; i < state.bricks.length; i++) {
      var br = state.bricks[i];
      if (!br.alive) continue;
      if (b.x + b.r < br.x || b.x - b.r > br.x + br.w ||
          b.y + b.r < br.y || b.y - b.r > br.y + br.h) continue;

      // Collision — resolve axis with smaller penetration
      var overlapX = Math.min(b.x + b.r - br.x, br.x + br.w - (b.x - b.r));
      var overlapY = Math.min(b.y + b.r - br.y, br.y + br.h - (b.y - b.r));

      if (overlapX < overlapY) {
        b.vx = -b.vx;
        b.x += (b.vx > 0 ? overlapX : -overlapX);
      } else {
        b.vy = -b.vy;
        b.y += (b.vy > 0 ? overlapY : -overlapY);
      }

      if (br.type === 3) {
        playTone(180, 0.04);
        continue;
      }

      br.hp -= 1;
      state.shakeMs = 120;
      if (br.hp <= 0) {
        br.alive = false;
        state.bricksBroken++;
        spawnParticles(br.x + br.w / 2, br.y + br.h / 2);
        playTone(880, 0.05);

        // Speed bump every 6 bricks
        if (state.bricksBroken % 6 === 0) {
          state.speedMul += 0.05;
        }

        // Maybe spawn power-up
        if (Math.random() < cfg.powerupChance) {
          spawnPowerUp(br.x + br.w / 2 - 10, br.y + br.h / 2);
        }
      } else {
        playTone(520, 0.04);
      }

      // Only break once per frame to avoid double-hit tunneling
      break;
    }
  }

  // ==================== Power-ups ====================
  function spawnPowerUp(x, y) {
    var kinds = ['multi', 'expand', 'slow'];
    var kind = kinds[Math.floor(Math.random() * kinds.length)];
    state.powerUps.push({ x: x, y: y, w: 20, h: 14, kind: kind });
  }

  function applyPowerUp(kind, cfg) {
    var now = performance.now();
    if (kind === 'expand') {
      state.effects.expandUntil = now + 8000;
    } else if (kind === 'slow') {
      state.effects.slowUntil = now + 5000;
    } else if (kind === 'multi') {
      var base = state.balls[0] || makeBall(cfg.baseSpeed);
      var extra = Math.random() < 0.4 ? 2 : 1;
      for (var i = 0; i < extra; i++) {
        var speed = Math.hypot(base.vx || cfg.baseSpeed, base.vy || cfg.baseSpeed);
        var angle = -Math.PI / 2 + (Math.random() * 1.2 - 0.6);
        state.balls.push({
          x: base.x,
          y: base.y,
          r: base.r,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          speed: speed,
          stuckToPaddle: false,
          stuckOffset: 0
        });
      }
    }
    playTone(1200, 0.08);
  }

  function spawnParticles(x, y) {
    for (var i = 0; i < 8; i++) {
      var a = Math.random() * Math.PI * 2;
      var s = 1 + Math.random() * 2.5;
      state.particles.push({
        x: x,
        y: y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        life: 400 + Math.random() * 300
      });
    }
  }

  // ==================== End of round flow ====================
  function handleEndOfRoundFlow() {
    if (state.levelCleared) {
      state.banked += LEVEL_POINTS[state.level];
      renderHud();
      state.running = false;
      cancelFrame();

      if (state.level >= TOTAL_LEVELS - 1) {
        state.victory = true;
        showOverlay(
          '<div class="bb-overlay-card">' +
            '<div class="bb-overlay-title">VICTORY! 🏆</div>' +
            '<p>You beat all 5 levels.</p>' +
            '<p><strong>Total: ' + state.banked + ' pts</strong></p>' +
            '<p class="bb-overlay-sub">Tap <em>End Run &amp; Claim Points</em>.</p>' +
          '</div>'
        );
      } else {
        var nextLevel = state.level + 1;
        showOverlay(
          '<div class="bb-overlay-card">' +
            '<div class="bb-overlay-title">Level ' + (state.level + 1) + ' Cleared!</div>' +
            '<p>+' + LEVEL_POINTS[state.level] + ' pts</p>' +
            '<p class="bb-overlay-sub">Next up: Level ' + (nextLevel + 1) + '</p>' +
          '</div>'
        );
        setTimeout(function () {
          resetToLevelStart(nextLevel, false);
          clearOverlay();
          state.running = true;
          state.lastTs = 0;
          cancelFrame();
          rafId = window.requestAnimationFrame(loop);
        }, 1200);
      }
      return;
    }

    if (state.gameOver) {
      state.running = false;
      cancelFrame();
      showOverlay(
        '<div class="bb-overlay-card">' +
          '<div class="bb-overlay-title">Out of lives</div>' +
          '<p>Banked so far: <strong>' + state.banked + '</strong> pts</p>' +
          '<p class="bb-overlay-sub">Tap <em>Retry Level</em> for unlimited retries, or <em>Claim</em> to bank.</p>' +
        '</div>'
      );
    }
  }

  // ==================== Render ====================
  function render() {
    var w = VIEW_W, h = VIEW_H;
    ctx.save();
    var shakeX = 0, shakeY = 0;
    if (state.shakeMs > 0) {
      shakeX = (Math.random() - 0.5) * 4;
      shakeY = (Math.random() - 0.5) * 4;
    }
    ctx.translate(shakeX, shakeY);

    // Background
    var grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#fde2e4');
    grad.addColorStop(1, '#e7d6ef');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    drawBricks();
    drawPowerUps();
    drawParticles();
    drawPaddle();
    drawBalls();

    ctx.restore();
  }

  function drawBricks() {
    for (var i = 0; i < state.bricks.length; i++) {
      var b = state.bricks[i];
      if (!b.alive) continue;

      ctx.save();
      roundedPath(b.x, b.y, b.w, b.h, 5);
      ctx.clip();

      if (b.type === 3) {
        // Steel brick - metallic
        var g = ctx.createLinearGradient(0, b.y, 0, b.y + b.h);
        g.addColorStop(0, '#c7cdd4');
        g.addColorStop(0.5, '#9aa3ad');
        g.addColorStop(1, '#6b7380');
        ctx.fillStyle = g;
        ctx.fillRect(b.x, b.y, b.w, b.h);
        // rivets
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.beginPath(); ctx.arc(b.x + 4, b.y + 4, 1.4, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(b.x + b.w - 4, b.y + 4, 1.4, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(b.x + 4, b.y + b.h - 4, 1.4, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(b.x + b.w - 4, b.y + b.h - 4, 1.4, 0, Math.PI * 2); ctx.fill();
      } else {
        // Sticker brick: Mehak face fill + overlay
        if (mehakImg.complete && mehakImg.naturalWidth > 0) {
          ctx.drawImage(mehakImg, b.x, b.y, b.w, b.h);
        } else {
          ctx.fillStyle = '#ffd56b';
          ctx.fillRect(b.x, b.y, b.w, b.h);
        }
        if (b.type === 2) {
          // Strong brick - red tint, cracked if hp==1
          ctx.fillStyle = b.hp === 2 ? 'rgba(232, 60, 90, 0.38)' : 'rgba(232, 60, 90, 0.55)';
          ctx.fillRect(b.x, b.y, b.w, b.h);
          if (b.hp === 1) {
            ctx.strokeStyle = 'rgba(255,255,255,0.9)';
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.moveTo(b.x + 3, b.y + b.h / 2);
            ctx.lineTo(b.x + b.w / 2, b.y + 4);
            ctx.lineTo(b.x + b.w - 4, b.y + b.h / 2);
            ctx.stroke();
          }
        } else {
          // Soft pink glow overlay
          ctx.fillStyle = 'rgba(255, 200, 220, 0.18)';
          ctx.fillRect(b.x, b.y, b.w, b.h);
        }
      }
      ctx.restore();

      // Border
      ctx.save();
      roundedPath(b.x, b.y, b.w, b.h, 5);
      ctx.lineWidth = 1.4;
      ctx.strokeStyle = b.type === 3 ? 'rgba(60,70,80,0.65)' : 'rgba(232,135,156,0.85)';
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawPaddle() {
    var p = state.paddle;
    ctx.save();
    roundedPath(p.x, p.y, p.w, p.h, 6);
    var g = ctx.createLinearGradient(p.x, p.y, p.x, p.y + p.h);
    g.addColorStop(0, '#f7a8b8');
    g.addColorStop(1, '#c9a7d4');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  }

  function drawBalls() {
    for (var i = 0; i < state.balls.length; i++) {
      var b = state.balls[i];
      ctx.save();
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      if (mehakImg.complete && mehakImg.naturalWidth > 0) {
        ctx.drawImage(mehakImg, b.x - b.r, b.y - b.r, b.r * 2, b.r * 2);
      } else {
        ctx.fillStyle = '#fff';
        ctx.fill();
      }
      ctx.restore();
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.strokeStyle = '#e8879c';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }

  function drawPowerUps() {
    for (var i = 0; i < state.powerUps.length; i++) {
      var p = state.powerUps[i];
      var color = p.kind === 'multi' ? '#6bbf59'
                : p.kind === 'expand' ? '#f2a03d'
                : '#4aa9d8';
      ctx.fillStyle = color;
      roundedPath(p.x, p.y, p.w, p.h, 4);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 10px Poppins, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      var label = p.kind === 'multi' ? '×3' : p.kind === 'expand' ? '↔' : '◐';
      ctx.fillText(label, p.x + p.w / 2, p.y + p.h / 2 + 1);
    }
  }

  function drawParticles() {
    for (var i = 0; i < state.particles.length; i++) {
      var p = state.particles[i];
      var a = Math.max(0, Math.min(1, p.life / 500));
      ctx.fillStyle = 'rgba(232,135,156,' + a + ')';
      ctx.fillRect(p.x, p.y, 2, 2);
    }
  }

  function roundedPath(x, y, w, h, r) {
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

  // ==================== HUD / overlay ====================
  function renderHud() {
    if (refs.level) refs.level.textContent = (state.level + 1);
    if (refs.score) refs.score.textContent = state.banked;
    if (refs.lives) refs.lives.textContent = state.lives;
  }

  function setButtonStates() {
    if (refs.start) {
      if (state.running) {
        refs.start.textContent = 'Playing…';
        refs.start.disabled = true;
      } else {
        refs.start.textContent = state.startedOnce ? 'Resume' : 'Start';
        refs.start.disabled = false;
      }
    }
  }

  function showOverlay(html) {
    if (!refs.overlay) return;
    refs.overlay.innerHTML = html;
    refs.overlay.classList.add('bb-overlay-visible');
  }

  function clearOverlay() {
    if (!refs.overlay) return;
    refs.overlay.innerHTML = '';
    refs.overlay.classList.remove('bb-overlay-visible');
  }

  // ==================== Audio ====================
  function playTone(freq, dur) {
    try {
      if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      var o = audioCtx.createOscillator();
      var g = audioCtx.createGain();
      o.type = 'triangle';
      o.frequency.value = freq;
      g.gain.value = 0.05;
      o.connect(g);
      g.connect(audioCtx.destination);
      o.start();
      g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + dur);
      o.stop(audioCtx.currentTime + dur + 0.02);
    } catch (e) { /* ignore */ }
  }

  window.BrickBreakerGame = {
    init: init,
    start: start,
    retryLevel: retryLevel,
    endRun: endRun,
    stop: stop
  };
})();
