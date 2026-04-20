window.Wheel = (function () {
  // Arranged so the same-value 0s are on opposite sides of the wheel.
  var SECTIONS = [500, 0, 100, 250, 10, 0, 150, 200];
  var COLORS = [
    '#f28482', // rose
    '#f6bd60', // gold
    '#ffb5a7', // peach
    '#b5ead7', // mint
    '#c7ceea', // lavender
    '#fcd5ce', // blush
    '#a0c4ff', // sky
    '#ffc8dd'  // pink
  ];

  var canvas, ctx, cssSize, radius, cx, cy;
  var rotation = 0;       // current radians
  var spinning = false;
  var animId = null;
  var onResultCb = null;
  var hasSpun = false;

  function init(opts) {
    opts = opts || {};
    onResultCb = opts.onResult || null;

    canvas = document.getElementById('wheel-canvas');
    if (!canvas) return;
    ctx = canvas.getContext('2d');

    rotation = 0;
    spinning = false;
    hasSpun = false;

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    draw();
  }

  function resizeCanvas() {
    if (!canvas) return;
    var rect = canvas.getBoundingClientRect();
    var size = Math.max(220, Math.min(rect.width || 300, 320));
    cssSize = size;
    var dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = size + 'px';
    canvas.style.height = size + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cx = size / 2;
    cy = size / 2;
    radius = size / 2 - 6;
    draw();
  }

  function draw() {
    if (!ctx) return;
    ctx.clearRect(0, 0, cssSize, cssSize);

    var n = SECTIONS.length;
    var arc = (Math.PI * 2) / n;

    for (var i = 0; i < n; i++) {
      var start = rotation + i * arc;
      var end = start + arc;

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, radius, start, end);
      ctx.closePath();
      ctx.fillStyle = COLORS[i % COLORS.length];
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(255,255,255,0.85)';
      ctx.stroke();

      // Label
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(start + arc / 2);
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#4a3a4e';
      ctx.font = 'bold 16px Poppins, sans-serif';
      ctx.fillText(String(SECTIONS[i]), radius - 14, 0);
      ctx.restore();
    }

    // Center hub
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 0.16, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#e8879c';
    ctx.stroke();

    // Heart in center
    ctx.fillStyle = '#e8879c';
    ctx.font = '18px Poppins, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('♥', cx, cy + 1);
  }

  function spin() {
    if (spinning || hasSpun) return;
    spinning = true;
    hasSpun = true;

    var n = SECTIONS.length;
    var arc = (Math.PI * 2) / n;

    // Pick a random winning section (uniform).
    var winIdx = Math.floor(Math.random() * n);

    // Pointer is at the top (angle = -PI/2). We want the center of winIdx
    // to end up under the pointer: rotation + winIdx*arc + arc/2 === -PI/2 + 2*PI*k
    // So target final rotation (mod 2PI) = -PI/2 - winIdx*arc - arc/2.
    var targetBase = -Math.PI / 2 - (winIdx * arc + arc / 2);
    // Add several full revolutions for drama.
    var fullTurns = 5 + Math.floor(Math.random() * 3); // 5..7 turns
    // Normalize current rotation
    var current = rotation % (Math.PI * 2);
    if (current > 0) current -= Math.PI * 2;
    var delta = (targetBase - current) + fullTurns * Math.PI * 2;
    var startRotation = rotation;
    var endRotation = rotation + delta;
    var duration = 4200;
    var startTime = performance.now();

    function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

    function tick(now) {
      var t = Math.min(1, (now - startTime) / duration);
      rotation = startRotation + (endRotation - startRotation) * easeOutCubic(t);
      draw();
      if (t < 1) {
        animId = requestAnimationFrame(tick);
      } else {
        spinning = false;
        animId = null;
        var points = SECTIONS[winIdx];
        if (onResultCb) onResultCb(points);
      }
    }
    animId = requestAnimationFrame(tick);
  }

  function stop() {
    if (animId) {
      cancelAnimationFrame(animId);
      animId = null;
    }
    spinning = false;
    window.removeEventListener('resize', resizeCanvas);
  }

  return {
    init: init,
    spin: spin,
    stop: stop,
    SECTIONS: SECTIONS
  };
})();
