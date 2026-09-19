/* ==========================================================
   萤火虫粒子层 —— 夜晚更亮、白天变成淡淡的光尘；
   会轻轻追随鼠标 / 手指。尊重"减少动态效果"偏好。
   ========================================================== */
(function () {
  'use strict';

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const canvas = document.getElementById('fireflies');
  const ctx = canvas.getContext('2d');
  const isCoarse = window.matchMedia('(pointer: coarse)').matches;

  const FIXED_HOUR = (() => {
    const v = parseFloat(new URLSearchParams(location.search).get('hour'));
    return Number.isFinite(v) ? ((v % 24) + 24) % 24 : null;
  })();

  let W = 0, H = 0, DPR = 1;
  const N = isCoarse ? 16 : 34;
  const parts = [];
  const mouse = { x: -9999, y: -9999 };

  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }

  function ambientLight() {
    // 0 = 深夜，1 = 正午；用于控制萤火虫亮度（夜里越亮）
    const h = FIXED_HOUR !== null ? FIXED_HOUR
      : new Date().getHours() + new Date().getMinutes() / 60;
    if (h >= 8 && h < 16) return 0;
    if (h >= 21 || h < 4.5) return 1;
    if (h >= 4.5 && h < 8) return 1 - (h - 4.5) / 3.5;
    return (h - 16) / 5; // 16→21 渐入夜晚
  }

  function spawn(i) {
    return {
      x: Math.random() * W,
      y: Math.random() * H,
      a: Math.random() * Math.PI * 2,
      sp: 10 + Math.random() * 16,
      r: 1.1 + Math.random() * 1.7,
      ph: Math.random() * Math.PI * 2,
      tw: 0.5 + Math.random() * 1.3,
    };
  }

  window.addEventListener('pointermove', (e) => { mouse.x = e.clientX; mouse.y = e.clientY; });
  window.addEventListener('pointerleave', () => { mouse.x = -9999; mouse.y = -9999; });
  window.addEventListener('touchmove', (e) => {
    if (e.touches[0]) { mouse.x = e.touches[0].clientX; mouse.y = e.touches[0].clientY; }
  }, { passive: true });

  let last = performance.now();

  function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const t = now / 1000;
    const night = ambientLight();

    ctx.clearRect(0, 0, W, H);

    // 白天：极淡的金色光尘；夜晚：暖黄萤火虫
    const core = night > 0.5 ? [255, 240, 150] : [255, 250, 220];
    const baseAlpha = 0.16 + night * 0.55;

    for (let i = 0; i < N; i++) {
      const p = parts[i];
      // 随机漫游
      p.a += (Math.random() - 0.5) * 1.6 * dt * 8;
      p.x += Math.cos(p.a) * p.sp * dt;
      p.y += Math.sin(p.a) * p.sp * dt - 3 * dt; // 微微上飘

      // 靠近鼠标时被轻轻吸引
      const dx = mouse.x - p.x, dy = mouse.y - p.y;
      const d = Math.hypot(dx, dy);
      if (d < 200 && d > 0.001) {
        const pull = (1 - d / 200) * 46 * dt;
        p.x += (dx / d) * pull;
        p.y += (dy / d) * pull;
      }

      // 边缘环绕
      if (p.x < -20) p.x = W + 20; else if (p.x > W + 20) p.x = -20;
      if (p.y < -20) p.y = H + 20; else if (p.y > H + 20) p.y = -20;

      const alpha = baseAlpha * (0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * p.tw + p.ph)));
      if (alpha < 0.02) continue;

      const halo = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 5);
      halo.addColorStop(0, `rgba(${core[0]},${core[1]},${core[2]},${alpha * 0.45})`);
      halo.addColorStop(1, `rgba(${core[0]},${core[1]},${core[2]},0)`);
      ctx.fillStyle = halo;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 5, 0, Math.PI * 2); ctx.fill();

      ctx.fillStyle = `rgba(${core[0]},${core[1]},${core[2]},${alpha})`;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
    }

    if (!document.hidden) requestAnimationFrame(loop);
    else setTimeout(() => { last = performance.now(); requestAnimationFrame(loop); }, 400);
  }

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resize, 120);
  });

  resize();
  for (let i = 0; i < N; i++) parts.push(spawn(i));
  requestAnimationFrame(loop);
})();
