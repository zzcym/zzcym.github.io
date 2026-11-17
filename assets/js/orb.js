/* ============================================================
   orb.js — 首页的点阵球体
   用 canvas 画 1500 个斐波那契球面点，缓慢自转、跟随鼠标倾角、
   点击时向外炸开再弹回。只为首页服务，离开视口自动暂停。
   ============================================================ */
(function () {
  'use strict';

  var canvas = document.getElementById('orb');
  if (!canvas) return;

  var ctx = canvas.getContext('2d');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
    /[?&]static\b/.test(location.search);
  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  var W = 0, H = 0, R = 0, cx = 0, cy = 0;

  var COUNT = window.innerWidth < 760 ? 1200 : 2800;
  var PHI = Math.PI * (3 - Math.sqrt(5));
  var pts = [];

  /* 按纬线排点，再加一点抖动：像被风吹过的星尘，而不是网格 */
  var BANDS = window.innerWidth < 760 ? 15 : 21;
  var DENSITY = window.innerWidth < 760 ? 27 : 38;
  for (var b = 0; b < BANDS; b++) {
    var lat = (-1 + (2 * (b + 0.5)) / BANDS) * Math.PI * 0.5 * 0.94;
    var yv = Math.sin(lat);
    var rr = Math.cos(lat);
    var n = Math.max(6, Math.round(2 * Math.PI * rr * DENSITY));
    for (var k = 0; k < n; k++) {
      var lon = (k / n) * Math.PI * 2 + b * 0.37 + (Math.random() - 0.5) * 0.05;
      var jy = (Math.random() - 0.5) * 0.045;
      pts.push({
        x: Math.cos(lon) * rr,
        y: yv + jy,
        z: Math.sin(lon) * rr,
        vx: 0, vy: 0,
        ox: 0, oy: 0,
        rnd: 0.55 + Math.random() * 0.9,
        hot: Math.random() < 0.006
      });
    }
  }

  /* 弧线：球面上的几条“航线”，让球有点故事 */
  var ARCS = [];
  function buildArcs() {
    ARCS = [];
    var pairs = [[0.03, 0.44], [0.16, 0.63], [0.29, 0.86], [0.45, 0.95], [0.08, 0.72]];
    pairs.forEach(function (pr, k) {
      var a = pts[Math.floor(pr[0] * (pts.length - 1))];
      var b = pts[Math.floor(pr[1] * (pts.length - 1))];
      var d = Math.max(-1, Math.min(1, a.x * b.x + a.y * b.y + a.z * b.z));
      var om = Math.acos(d);
      if (om < 0.7) return;
      var so = Math.sin(om);
      var seg = [];
      for (var s = 0; s <= 30; s++) {
        var t = s / 30;
        var w1 = Math.sin((1 - t) * om) / so;
        var w2 = Math.sin(t * om) / so;
        seg.push({
          x: a.x * w1 + b.x * w2,
          y: a.y * w1 + b.y * w2,
          z: a.z * w1 + b.z * w2
        });
      }
      ARCS.push({ pts: seg, phase: k * 9 });
    });
  }
  buildArcs();

  function resize() {
    var box = canvas.parentElement.getBoundingClientRect();
    W = Math.max(box.width, 1);
    H = Math.max(box.height, 1);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    R = Math.min(W, H) * 0.325;
    cx = W / 2;
    cy = H / 2;
  }
  resize();
  window.addEventListener('resize', resize);

  var angleY = 0.6;
  var angleX = -0.28;
  var targetX = -0.28;
  var spin = 0;
  var running = true;
  var mx = 0, my = 0, smx = 0, smy = 0;

  var wrap = canvas.parentElement;
  wrap.addEventListener('mousemove', function (e) {
    var b = wrap.getBoundingClientRect();
    mx = (e.clientX - b.left) / b.width - 0.5;
    my = (e.clientY - b.top) / b.height - 0.5;
  }, { passive: true });
  wrap.addEventListener('mouseleave', function () { mx = 0; my = 0; });

  /* 点击：从点击位置向外炸开 */
  function burst(px, py, power) {
    var cxp = cx, cyp = cy;
    for (var i = 0; i < pts.length; i++) {
      var p = pts[i];
      var dx = (cx + p.x * R) - (px || cxp);
      var dy = (cy + p.y * R) - (py || cyp);
      var d = Math.sqrt(dx * dx + dy * dy) || 1;
      var f = (power || 5.5) * (1 - Math.min(d / (R * 2.2), 1));
      p.vx += (dx / d) * f + (Math.random() - 0.5) * 1.4;
      p.vy += (dy / d) * f + (Math.random() - 0.5) * 1.4;
    }
  }

  wrap.addEventListener('click', function (e) {
    var b = canvas.getBoundingClientRect();
    burst(e.clientX - b.left, e.clientY - b.top, 7);
  });
  wrap.style.cursor = 'crosshair';

  var t0 = performance.now();

  function frame(now) {
    if (running) {
      draw((now - t0) / 1000);
      requestAnimationFrame(frame);
    }
  }

  function draw(t) {

    smx += (mx - smx) * 0.05;
    smy += (my - smy) * 0.05;

    if (!reduce) angleY += 0.0035;
    angleX += (targetX + smy * 0.5 - angleX) * 0.06;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    var sy = Math.sin(angleY), cyA = Math.cos(angleY);
    var sx = Math.sin(angleX), cxA = Math.cos(angleX);

    /* 先画弧线 */
    ctx.lineWidth = 0.85;
    ctx.strokeStyle = 'rgba(255, 96, 58, .40)';
    ctx.setLineDash([5, 9]);
    for (var ai = 0; ai < ARCS.length; ai++) {
      var arc = ARCS[ai];
      ctx.lineDashOffset = -(t * 14 + arc.phase);
      ctx.beginPath();
      var pen = false;
      for (var q = 0; q < arc.pts.length; q++) {
        var v = arc.pts[q];
        var ax = v.x * cyA - v.z * sy;
        var az1 = v.x * sy + v.z * cyA;
        var ay = v.y * cxA - az1 * sx;
        var az = v.y * sx + az1 * cxA;
        var af = 1.08 - az * 0.17;
        if (az > 0.55) { pen = false; continue; }
        var apx = cx + ax * R * af;
        var apy = cy + ay * R * af;
        if (!pen) { ctx.moveTo(apx, apy); pen = true; }
        else ctx.lineTo(apx, apy);
      }
      ctx.stroke();
    }
    ctx.setLineDash([]);

    for (var i = 0; i < pts.length; i++) {
      var p = pts[i];

      // 爆开回弹
      p.ox += p.vx; p.oy += p.vy;
      p.vx *= 0.9; p.vy *= 0.9;
      p.ox *= 0.9; p.oy *= 0.9;

      var x1 = p.x * cyA - p.z * sy;
      var z1 = p.x * sy + p.z * cyA;
      var y1 = p.y * cxA - z1 * sx;
      var z2 = p.y * sx + z1 * cxA;

      var f = 1.08 - z2 * 0.17;           // 温和的透视，别让球胀出圈
      var px = cx + x1 * R * f + p.ox;
      var py = cy + y1 * R * f + p.oy;

      var depth = (1 - (z2 + 1) / 2);      // 1 = 靠近观众
      // 左上方打一盏灯，让球有明暗
      var lit = Math.max(0, -0.42 * x1 - 0.5 * y1 - 0.76 * z2);
      var shade = 0.04 + Math.pow(lit, 1.35) * 1.55;
      var size = (0.15 + Math.pow(depth, 0.8) * 0.5) * f * (0.72 + lit * 0.45) * (p.rnd || 1);
      var alpha = (0.05 + Math.pow(depth, 1.6) * 0.9) * shade * (0.75 + (p.rnd || 1) * 0.35);

      // 呼吸：让部分点亮起来
      var pulse = 0.5 + 0.5 * Math.sin(t * 1.1 + p.y * 6 + p.x * 2);
      if (!reduce) alpha *= 0.8 + pulse * 0.3;

      ctx.beginPath();
      ctx.arc(px, py, Math.max(size, 0.35), 0, 6.2832);
      if (p.hot) {
        ctx.fillStyle = 'rgba(255,90,54,' + Math.min(alpha + 0.15, 0.95).toFixed(3) + ')';
      } else {
        ctx.fillStyle = 'rgba(241,236,226,' + Math.min(alpha, 1).toFixed(3) + ')';
      }
      ctx.fill();
    }
  }

  if (reduce) {
    draw(0);
    running = false;
    window.addEventListener('resize', function () { draw(0); });
  } else {
    requestAnimationFrame(frame);
  }

  // 离开视口就停，别浪费电
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      var vis = entries[0].isIntersecting;
      if (vis && !running && !reduce) {
        running = true;
        requestAnimationFrame(frame);
      } else if (!vis) {
        running = false;
      }
    }, { threshold: 0.05 }).observe(canvas);
  }
})();
