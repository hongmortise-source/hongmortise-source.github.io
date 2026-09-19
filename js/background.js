/* ==========================================================
   动态风景背景：摄影底图（雾谷日出，Unsplash 免费授权）
   + 氛围层：昼夜调色 / 流动雾气 / 星空 / 飞鸟 / 体积光 / 鼠标视差
   可用 ?hour=19.5 这种 URL 参数固定时刻预览。
   ========================================================== */
(function () {
  'use strict';

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const FIXED_HOUR = (() => {
    const v = parseFloat(new URLSearchParams(location.search).get('hour'));
    return Number.isFinite(v) ? ((v % 24) + 24) % 24 : null;
  })();

  const photo = document.getElementById('bgPhoto');
  const parallaxEl = document.getElementById('bgParallax');
  const canvas = document.getElementById('atmosphere');
  const ctx = canvas.getContext('2d');

  let W = 0, H = 0, DPR = 1;

  /* ---------------- 照片底图（data URI 加载，规避图片代理压缩） ---------------- */
  const photoImg = new Image();
  let photoReady = false;
  photoImg.onload = () => { photoReady = true; if (reducedMotion) renderFrame(0); };
  photoImg.src = window.BG_PHOTO_DATA || 'assets/bg-valley-2000.jpg';

  /* ---------------- 小工具 ---------------- */
  const lerp = (a, b, t) => a + (b - a) * t;
  const mixAll = (c1, c2, t) => c1.map((v, i) => lerp(v, c2[i], t));

  function mulberry(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function currentHour() {
    if (FIXED_HOUR !== null) return FIXED_HOUR;
    const d = new Date();
    return d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600;
  }

  /* ---------------- 昼夜调色关键帧 ----------------
     bright/sat/contrast → 照片 filter；tint → 全屏色调叠加；
     stars/mist/rays → 氛围层各元素强度；birds → 飞鸟可见度 */
  const KEYS = [
    { h: 0,    bright: 0.46, contrast: 1.06, sat: 0.80, tint: [10, 18, 44, 0.30],  stars: 1,    mist: 0.30, rays: 0,    birds: 0 },
    { h: 4.5,  bright: 0.52, contrast: 1.04, sat: 0.86, tint: [16, 26, 56, 0.26],  stars: 0.8,  mist: 0.36, rays: 0,    birds: 0 },
    { h: 6.5,  bright: 0.86, contrast: 1.02, sat: 1.08, tint: [255, 158, 92, 0.09], stars: 0.05, mist: 0.58, rays: 0.8,  birds: 0.7 },
    { h: 9,    bright: 1.0,  contrast: 1.0,  sat: 1.04, tint: [255, 220, 160, 0.03], stars: 0,   mist: 0.42, rays: 0.45, birds: 1 },
    { h: 16,   bright: 1.0,  contrast: 1.0,  sat: 1.06, tint: [255, 236, 190, 0.02], stars: 0,   mist: 0.34, rays: 0.35, birds: 1 },
    { h: 17.5, bright: 0.96, contrast: 1.02, sat: 1.10, tint: [255, 150, 70, 0.10], stars: 0,   mist: 0.40, rays: 0.8,  birds: 0.9 },
    { h: 19.5, bright: 0.76, contrast: 1.04, sat: 0.98, tint: [52, 42, 88, 0.16],  stars: 0.3,  mist: 0.32, rays: 0.1,  birds: 0.2 },
    { h: 22,   bright: 0.48, contrast: 1.06, sat: 0.82, tint: [10, 18, 44, 0.30],  stars: 1,    mist: 0.30, rays: 0,    birds: 0 },
  ];

  function getGrade(h) {
    if (h >= KEYS[KEYS.length - 1].h) {
      // 22 点后过渡回午夜
      const t = (h - KEYS[KEYS.length - 1].h) / 2;
      return gradeLerp(KEYS[KEYS.length - 1], KEYS[0], Math.min(1, t));
    }
    let a = KEYS[0], b = KEYS[1];
    for (let i = 0; i < KEYS.length - 1; i++) {
      if (h >= KEYS[i].h && h <= KEYS[i + 1].h) { a = KEYS[i]; b = KEYS[i + 1]; break; }
    }
    return gradeLerp(a, b, Math.min(1, Math.max(0, (h - a.h) / Math.max(0.0001, b.h - a.h))));
  }

  function gradeLerp(a, b, t) {
    return {
      bright: lerp(a.bright, b.bright, t),
      contrast: lerp(a.contrast, b.contrast, t),
      sat: lerp(a.sat, b.sat, t),
      tint: mixAll(a.tint, b.tint, t),
      stars: lerp(a.stars, b.stars, t),
      mist: lerp(a.mist, b.mist, t),
      rays: lerp(a.rays, b.rays, t),
      birds: lerp(a.birds, b.birds, t),
    };
  }

  /* ---------------- 雾气纹理（可水平无缝平铺） ---------------- */
  const FOG_W = 1400, FOG_H = 360;
  const fogTile = document.createElement('canvas');
  fogTile.width = FOG_W; fogTile.height = FOG_H;

  (function buildFog() {
    const rnd = mulberry(2024);
    const c = fogTile.getContext('2d');
    for (let i = 0; i < 70; i++) {
      const x = rnd() * FOG_W, y = FOG_H * (0.30 + rnd() * 0.4);
      const r = 60 + rnd() * 130;
      const a = 0.03 + rnd() * 0.07;
      for (const dx of [-FOG_W, 0, FOG_W]) { // 左右各画一遍保证无缝
        const g = c.createRadialGradient(x + dx, y, 0, x + dx, y, r);
        g.addColorStop(0, `rgba(255,255,255,${a})`);
        g.addColorStop(1, 'rgba(255,255,255,0)');
        c.fillStyle = g;
        c.save();
        c.translate(x + dx, y);
        c.scale(1.9, 1); // 横向拉长，雾更绵延
        c.translate(-(x + dx), -y);
        c.beginPath(); c.arc(x + dx, y, r, 0, Math.PI * 2); c.fill();
        c.restore();
      }
    }
    // 上下淡出包络，消除雾带矩形硬边
    c.globalCompositeOperation = 'destination-in';
    const env = c.createLinearGradient(0, 0, 0, FOG_H);
    env.addColorStop(0, 'rgba(0,0,0,0)');
    env.addColorStop(0.28, 'rgba(0,0,0,1)');
    env.addColorStop(0.72, 'rgba(0,0,0,1)');
    env.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = env;
    c.fillRect(0, 0, FOG_W, FOG_H);
    c.globalCompositeOperation = 'source-over';
  })();

  // 三条雾带：贴合雾谷照片里本身的雾层位置（都在上部），轻抹而非盖住
  const MIST_BANDS = [
    { y: 0.26, h: 0.12, speed: 8,  alpha: 0.50, scale: 1.35, ph: 0.0 },
    { y: 0.38, h: 0.14, speed: 4,  alpha: 0.62, scale: 1.9,  ph: 2.1 },
    { y: 0.50, h: 0.12, speed: 12, alpha: 0.38, scale: 1.1,  ph: 4.2 },
  ];

  /* ---------------- 星空 / 飞鸟 ---------------- */
  let stars = [];
  function buildStars() {
    const rnd = mulberry(777);
    stars = Array.from({ length: 130 }, () => ({
      x: rnd() * W, y: rnd() * H * 0.55,
      r: 0.4 + rnd() * 1.1, ph: rnd() * Math.PI * 2,
    }));
  }

  let flock = null, flockDelay = 6;
  function updateFlock(dt, t) {
    if (!flock) {
      flockDelay -= dt;
      if (flockDelay <= 0) {
        const n = W < 700 ? 2 : 3 + Math.floor(Math.random() * 3);
        const by = H * (0.14 + Math.random() * 0.18);
        const sp = 46 + Math.random() * 30;
        flock = {
          x: -80, y: by, speed: sp,
          birds: Array.from({ length: n }, (_, i) => ({
            ox: -i * (16 + Math.random() * 10) - Math.random() * 8,
            oy: (Math.random() - 0.5) * 22,
            ph: Math.random() * Math.PI * 2,
          })),
        };
      }
      return;
    }
    flock.x += flock.speed * dt;
    if (flock.x > W + 220) {
      flock = null;
      flockDelay = 10 + Math.random() * 18;
    }
  }

  function drawFlock(t, alpha) {
    if (!flock || alpha < 0.02) return;
    const w = W < 700 ? 5 : 7;
    ctx.strokeStyle = `rgba(28, 36, 46, ${0.62 * alpha})`;
    ctx.lineWidth = W < 700 ? 1.3 : 1.7;
    ctx.lineCap = 'round';
    for (const b of flock.birds) {
      const x = flock.x + b.ox, y = flock.y + b.oy + Math.sin(t * 0.9 + b.ph) * 4;
      const flap = Math.sin(t * 9 + b.ph);
      const lift = 2 + flap * 3.4;
      ctx.beginPath();
      ctx.moveTo(x - w, y - lift);
      ctx.quadraticCurveTo(x - w * 0.35, y + 1.5, x, y);
      ctx.quadraticCurveTo(x + w * 0.35, y + 1.5, x + w, y - lift);
      ctx.stroke();
    }
  }

  /* ---------------- 体积光（右上方斜射光束，若有似无） ---------------- */
  function drawRays(t, intensity) {
    if (intensity < 0.02) return;
    const ox = W * 0.80 + par.x * 6, oy = -H * 0.06;
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    for (let i = 0; i < 4; i++) {
      const base = (0.42 + i * 0.085) + Math.sin(t * 0.05 + i * 1.7) * 0.018;
      const spread = 0.13 + i * 0.02;
      const len = H * 1.05;
      const g = ctx.createLinearGradient(ox, oy, ox + Math.sin(base) * len, Math.cos(base) * len);
      g.addColorStop(0, `rgba(255, 236, 190, ${0.04 * intensity})`);
      g.addColorStop(0.4, `rgba(255, 236, 190, ${0.02 * intensity})`);
      g.addColorStop(1, 'rgba(255, 236, 190, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(ox, oy);
      ctx.lineTo(ox + Math.sin(base - spread) * len, Math.cos(base - spread) * len);
      ctx.lineTo(ox + Math.sin(base + spread) * len, Math.cos(base + spread) * len);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  /* ---------------- 雾气绘制 ---------------- */
  function drawMist(t, intensity) {
    // 竖屏裁切容易撞上照片雾区，小屏减轻雾气
    const dim = W < 700 ? 0.5 : 1;
    if (intensity * dim < 0.02) return;
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    for (const band of MIST_BANDS) {
      const bh = H * band.h;
      const by = H * band.y + Math.sin(t * 0.07 + band.ph) * 6;
      const bw = W * band.scale;
      let off = (t * band.speed) % bw;
      ctx.globalAlpha = intensity * dim * band.alpha;
      for (let x = -off - bw; x < W; x += bw) {
        ctx.drawImage(fogTile, x + par.x * 10, by, bw, bh);
      }
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  /* ---------------- 布局 / 视差 ---------------- */
  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    buildStars();
    if (reducedMotion) renderFrame(0);
  }

  const par = { tx: 0, ty: 0, x: 0, y: 0 };
  window.addEventListener('pointermove', (e) => {
    par.tx = (e.clientX / W - 0.5) * 2;
    par.ty = (e.clientY / H - 0.5) * 2;
  });

  /* ---------------- 主循环 ---------------- */
  function renderFrame(t) {
    const grade = getGrade(currentHour());

    // 照片层：cover 裁切 + Ken Burns 缓动 + 鼠标视差 + 昼夜调色
    if (photoReady) {
      const narrow = W / H < 0.8; // 竖屏取景偏向青山崖壁
      const posX = narrow ? 0.16 : 0.5;
      const posY = narrow ? 0.82 : 0.42;
      const cycle = 0.5 + 0.5 * Math.sin(t * Math.PI * 2 / 64 - Math.PI / 2); // 0→1→0 慢速
      const s = 1.025 + 0.075 * cycle;
      const cover = Math.max(W / photoImg.naturalWidth, H / photoImg.naturalHeight) * s;
      const bw = W / cover, bh = H / cover;
      let bx = (photoImg.naturalWidth - bw) * posX + 24 * Math.sin(t * Math.PI * 2 / 47);
      let by = (photoImg.naturalHeight - bh) * (posY - 0.03 * cycle);
      bx -= (par.x * 16) / cover;
      by -= (par.y * 10) / cover;
      bx = Math.min(Math.max(bx, 0), photoImg.naturalWidth - bw);
      by = Math.min(Math.max(by, 0), photoImg.naturalHeight - bh);
      ctx.save();
      ctx.filter = `brightness(${grade.bright.toFixed(3)}) contrast(${grade.contrast.toFixed(3)}) saturate(${grade.sat.toFixed(3)})`;
      ctx.drawImage(photoImg, bx, by, bw, bh, 0, 0, W, H);
      ctx.restore();
    } else {
      ctx.fillStyle = '#16233c';
      ctx.fillRect(0, 0, W, H);
    }

    // 全屏色调
    if (grade.tint[3] > 0.005) {
      ctx.fillStyle = `rgba(${grade.tint[0] | 0},${grade.tint[1] | 0},${grade.tint[2] | 0},${grade.tint[3]})`;
      ctx.fillRect(0, 0, W, H);
    }

    // 星空
    if (grade.stars > 0.02) {
      ctx.fillStyle = '#ffffff';
      for (const s of stars) {
        const a = grade.stars * (0.35 + 0.65 * Math.abs(Math.sin(t * 1.4 + s.ph)));
        if (a < 0.03) continue;
        ctx.globalAlpha = a;
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    drawRays(t, grade.rays);
    drawMist(t, grade.mist);
    drawFlock(t, grade.birds);
  }

  let last = performance.now();

  function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (!document.hidden) {
      const t = now / 1000;
      par.x += (par.tx - par.x) * 0.04;
      par.y += (par.ty - par.y) * 0.04;
      updateFlock(dt, t);
      renderFrame(t);
    }
    requestAnimationFrame(loop);
  }

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resize, 120);
  });

  resize();  if (!reducedMotion) requestAnimationFrame(loop);
})();
