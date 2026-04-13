window.Confetti = (function () {
  var canvas, ctx;
  var particles = [];
  var animFrame = null;
  var running = false;

  var COLORS = [
    '#e8879c', '#f4a9ba', '#c3aed6', '#f5cac3',
    '#f28482', '#dfe7fd', '#fde2e4', '#fad2e1'
  ];

  function init() {
    canvas = document.getElementById('confetti-canvas');
    ctx = canvas.getContext('2d');
    resize();
    window.addEventListener('resize', resize);
  }

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  function createParticle() {
    return {
      x: Math.random() * canvas.width,
      y: -10 - Math.random() * 40,
      w: 4 + Math.random() * 6,
      h: 6 + Math.random() * 8,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      rotation: Math.random() * 360,
      rotSpeed: (Math.random() - 0.5) * 8,
      vx: (Math.random() - 0.5) * 3,
      vy: 2 + Math.random() * 3,
      opacity: 1
    };
  }

  function launch(duration) {
    duration = duration || 2500;
    if (running) return;
    running = true;
    particles = [];

    for (var i = 0; i < 80; i++) {
      particles.push(createParticle());
    }

    var spawnEnd = Date.now() + duration * 0.6;

    function loop() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (Date.now() < spawnEnd && particles.length < 160) {
        for (var s = 0; s < 2; s++) particles.push(createParticle());
      }

      for (var i = particles.length - 1; i >= 0; i--) {
        var p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.04;
        p.rotation += p.rotSpeed;

        if (p.y > canvas.height * 0.7) {
          p.opacity -= 0.02;
        }

        if (p.opacity <= 0 || p.y > canvas.height + 20) {
          particles.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.globalAlpha = p.opacity;
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }

      if (particles.length > 0) {
        animFrame = requestAnimationFrame(loop);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        running = false;
      }
    }

    animFrame = requestAnimationFrame(loop);
  }

  function stop() {
    if (animFrame) cancelAnimationFrame(animFrame);
    particles = [];
    running = false;
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  return { init: init, launch: launch, stop: stop };
})();
