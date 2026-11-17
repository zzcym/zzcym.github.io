/* ============================================================
   core.js — 全站交互
   1 站点信息注入   2 导航滚动   3 滚动揭示   4 时钟 / 轮播词
   5 命令面板       6 光标聚光   7 文章目录   8 正文增强
   9 分享           10 文章数据
   全部写成普通脚本（非 module），这样双击本地 HTML 也能跑。
   ============================================================ */
(function () {
  'use strict';

  /* ---------- 1. 站点信息（改这里就能全站改名） ---------- */
  var SITE = {
    name: 'zzcym',
    handle: '@zzcym',
    tagline: '在深色的房间里，做一些会发光的东西。',
    email: '', // 填上邮箱后页脚会自动出现邮件入口
    links: {
      github: 'https://github.com/zzcym',
      rss: '/feed.xml'
    }
  };
  window.SITE = SITE;

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ?static=1 关闭所有动效，方便截图和阅读 */
  if (/[?&]static\b/.test(location.search)) {
    document.documentElement.classList.add('no-anim');
    reduce = true;
  }

  /* 注入姓名 / 标语 */
  $$('[data-site]').forEach(function (el) {
    var key = el.getAttribute('data-site');
    if (key === 'name' && SITE.name) el.textContent = SITE.name;
    if (key === 'tagline' && SITE.tagline) el.textContent = SITE.tagline;
  });
  $$('[data-link="github"]').forEach(function (a) {
    if (SITE.links.github) a.href = SITE.links.github;
  });
  $$('[data-email]').forEach(function (a) {
    if (SITE.email) {
      a.href = 'mailto:' + SITE.email;
      a.textContent = SITE.email;
      a.style.display = '';
    }
  });
  $$('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); });

  /* ---------- 2. 导航吸顶 + 当前页高亮 ---------- */
  var head = $('.site-head');
  if (head) {
    var onScroll = function () {
      head.classList.toggle('is-stuck', window.scrollY > 24);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  var path = location.pathname.replace(/index\.html$/, '');
  if (document.body.hasAttribute('data-post')) {
    var wl = $('.nav-link[href="/writing.html"]');
    if (wl) wl.setAttribute('aria-current', 'page');
  }
  $$('.nav-link').forEach(function (a) {
    var href = a.getAttribute('href') || '';
    if (href === '/' ? path === '/' : path.indexOf(href.replace(/\/$/, '')) === 0 && href !== '/') {
      a.setAttribute('aria-current', 'page');
    }
  });

  /* ---------- 3. 滚动揭示 ---------- */
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.classList.add('is-in');
          io.unobserve(en.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    $$('[data-reveal]').forEach(function (el) { io.observe(el); });
  } else {
    $$('[data-reveal]').forEach(function (el) { el.classList.add('is-in'); });
  }

  /* ---------- 4. 时钟 + 轮播词 ---------- */
  var clockEl = $('[data-clock]');
  if (clockEl) {
    var tick = function () {
      var d = new Date();
      var t = new Intl.DateTimeFormat('zh-CN', {
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        hour12: false, timeZone: 'Asia/Shanghai'
      }).format(d);
      clockEl.textContent = t;
    };
    tick();
    setInterval(tick, 1000);
  }

  var slot = $('[data-rotator]');
  if (slot) {
    var words = (slot.getAttribute('data-words') || '').split('|').filter(Boolean);
    var idx = 0;
    var swap = function () {
      var next = document.createElement('span');
      next.textContent = words[idx++ % words.length];
      slot.appendChild(next);
      requestAnimationFrame(function () { next.classList.add('is-in'); });
      var old = slot.querySelectorAll('span');
      old.forEach(function (s) {
        if (s !== next) {
          s.classList.remove('is-in');
          s.classList.add('is-out');
          setTimeout(function () { s.remove(); }, 800);
        }
      });
    };
    if (words.length) {
      if (reduce) {
        slot.innerHTML = '<span class="is-in">' + words[0] + '</span>';
      } else {
        swap();
        setInterval(swap, 3200);
      }
    }
  }

  /* ---------- 5. 命令面板 ---------- */
  var postsPromise = null;
  function loadPosts() {
    if (!postsPromise) {
      postsPromise = fetch('/posts.json', { cache: 'no-cache' })
        .then(function (r) { return r.ok ? r.json() : { posts: [] }; })
        .catch(function () { return { posts: [] }; });
    }
    return postsPromise;
  }

  var palette = document.createElement('div');
  palette.className = 'palette';
  palette.setAttribute('role', 'dialog');
  palette.setAttribute('aria-modal', 'true');
  palette.setAttribute('aria-label', '快速跳转');
  palette.innerHTML =
    '<div class="palette-box" role="combobox" aria-expanded="true" aria-haspopup="listbox">' +
      '<input class="palette-input" type="text" placeholder="跳转到…  输入标题、标签或页面" aria-controls="palette-list" autocomplete="off" spellcheck="false">' +
      '<div class="palette-list" id="palette-list" role="listbox"></div>' +
      '<div class="palette-foot"><span><b>↵</b> 打开</span><span><b>↑↓</b> 选择</span><span><b>esc</b> 关闭</span></div>' +
    '</div>';
  document.body.appendChild(palette);

  var pInput = $('.palette-input', palette);
  var pList = $('.palette-list', palette);
  var items = [];
  var active = 0;

  var STATIC = [
    { kind: '页面', title: '首页', href: '/', keys: 'home index 首页' },
    { kind: '页面', title: '写作 · 所有文章', href: '/writing.html', keys: 'writing posts 写作 文章 归档' },
    { kind: '页面', title: '关于我', href: '/about.html', keys: 'about 关于 联系' },
    { kind: '页面', title: '实验室（HTML 特效）', href: '/lab.html', keys: 'lab 实验室 特效 动画 demo' }
  ];

  function render() {
    var q = pInput.value.trim().toLowerCase();
    var list = items.filter(function (it) {
      if (!q) return true;
      return (it.title + ' ' + it.keys + ' ' + (it.tags || []).join(' ')).toLowerCase().indexOf(q) > -1;
    }).slice(0, 9);

    active = Math.min(active, Math.max(list.length - 1, 0));
    pList.innerHTML = list.map(function (it, i) {
      return '<a class="palette-item" role="option" aria-selected="' + (i === active) + '" href="' + it.href + '" data-i="' + i + '">' +
        '<span class="p-kind">' + it.kind + '</span><span class="p-title">' + escapeHtml(it.title) + '</span></a>';
    }).join('') || '<div class="empty-state">没有匹配的结果</div>';
    palette._list = list;
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function openPalette() {
    palette.classList.add('is-open');
    pInput.value = '';
    active = 0;
    render();
    setTimeout(function () { pInput.focus(); }, 30);
    document.body.style.overflow = 'hidden';
  }
  function closePalette() {
    palette.classList.remove('is-open');
    document.body.style.overflow = '';
  }

  loadPosts().then(function (data) {
    items = STATIC.concat((data.posts || []).map(function (p) {
      return {
        kind: '文章',
        title: p.title,
        href: '/posts/' + p.slug + '.html',
        tags: p.tags || [],
        keys: (p.tags || []).join(' ') + ' ' + (p.excerpt || '')
      };
    }));
    render();
  });

  $$('[data-open-palette]').forEach(function (b) {
    b.addEventListener('click', openPalette);
  });

  palette.addEventListener('click', function (e) {
    if (e.target === palette) closePalette();
    var a = e.target.closest('.palette-item');
    if (a) closePalette();
  });
  pInput.addEventListener('input', function () { active = 0; render(); });

  document.addEventListener('keydown', function (e) {
    var isOpen = palette.classList.contains('is-open');
    var mod = e.metaKey || e.ctrlKey;

    if (mod && (e.key === 'k' || e.key === 'K')) {
      e.preventDefault();
      isOpen ? closePalette() : openPalette();
      return;
    }
    if (!isOpen) {
      if (e.key === '/' && !/input|textarea/i.test((e.target.tagName || ''))) {
        e.preventDefault();
        openPalette();
      }
      return;
    }
    var list = palette._list || [];
    if (e.key === 'Escape') { e.preventDefault(); closePalette(); }
    else if (e.key === 'ArrowDown') {
      e.preventDefault();
      active = (active + 1) % Math.max(list.length, 1);
      render();
      scrollActive();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      active = (active - 1 + list.length) % Math.max(list.length, 1);
      render();
      scrollActive();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (list[active]) location.href = list[active].href;
    }
  });

  function scrollActive() {
    var el = pList.querySelector('[aria-selected="true"]');
    if (el) el.scrollIntoView({ block: 'nearest' });
  }

  /* ---------- 6. 光标聚光 + 磁吸按钮 ---------- */
  if (window.matchMedia('(pointer:fine)').matches && !reduce) {
    var spot = document.createElement('div');
    spot.className = 'spotlight';
    document.body.appendChild(spot);
    var sx = 0, sy = 0, cx = 0, cy = 0, raf = null;

    document.addEventListener('mousemove', function (e) {
      sx = e.clientX; sy = e.clientY;
      spot.classList.add('on');
      if (!raf) raf = requestAnimationFrame(followSpot);
    }, { passive: true });

    function followSpot() {
      cx += (sx - cx) * 0.16;
      cy += (sy - cy) * 0.16;
      spot.style.transform = 'translate(' + (cx - 260) + 'px,' + (cy - 260) + 'px)';
      raf = (Math.abs(sx - cx) + Math.abs(sy - cy) > 0.5) ? requestAnimationFrame(followSpot) : null;
    }

    /* 卡片聚光 */
    $$('.fcard').forEach(function (card) {
      card.addEventListener('mousemove', function (e) {
        var r = card.getBoundingClientRect();
        card.style.setProperty('--mx', ((e.clientX - r.left) / r.width) * 100 + '%');
        card.style.setProperty('--my', ((e.clientY - r.top) / r.height) * 100 + '%');
      });
    });

    /* 磁吸 */
    $$('[data-magnetic]').forEach(function (el) {
      el.addEventListener('mousemove', function (e) {
        var r = el.getBoundingClientRect();
        var dx = (e.clientX - (r.left + r.width / 2)) / r.width;
        var dy = (e.clientY - (r.top + r.height / 2)) / r.height;
        el.style.transform = 'translate(' + dx * 8 + 'px,' + dy * 6 + 'px)';
      });
      el.addEventListener('mouseleave', function () { el.style.transform = ''; });
    });
  }

  /* ---------- 7/8. 文章页增强 ---------- */
  var prose = $('.prose');
  if (prose) {
    /* 标题 id + 目录 */
    var heads = $$('.prose h2, .prose h3');
    heads.forEach(function (h, i) {
      if (!h.id) {
        h.id = 'sec-' + (i + 1);
      }
    });

    var toc = $('[data-toc]');
    if (toc && heads.length) {
      toc.innerHTML = '<div class="toc-title">目录</div>' + heads.map(function (h) {
        return '<a href="#' + h.id + '" class="' + (h.tagName === 'H3' ? 'lv3' : '') + '">' + escapeHtml(h.textContent.trim()) + '</a>';
      }).join('');

      var links = $$('a', toc);
      if ('IntersectionObserver' in window) {
        var current = null;
        var spy = new IntersectionObserver(function (entries) {
          entries.forEach(function (en) {
            if (en.isIntersecting) {
              var id = en.target.id;
              links.forEach(function (l) { l.classList.toggle('is-active', l.getAttribute('href') === '#' + id); });
              current = id;
            }
          });
        }, { rootMargin: '-15% 0px -70% 0px' });
        heads.forEach(function (h) { spy.observe(h); });
      }
      links.forEach(function (l) {
        l.addEventListener('click', function (e) {
          e.preventDefault();
          var t = document.getElementById(l.getAttribute('href').slice(1));
          if (t) t.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
          history.replaceState(null, '', l.getAttribute('href'));
        });
      });
    }

    /* 阅读进度 */
    var bar = $('[data-progress]');
    if (bar) {
      var body = $('.article-body');
      var upd = function () {
        var start = body ? body.offsetTop - 100 : 0;
        var total = (body ? body.offsetHeight : document.body.scrollHeight) - window.innerHeight * 0.4;
        var p = Math.min(Math.max((window.scrollY - start) / Math.max(total, 1), 0), 1);
        bar.style.transform = 'scaleX(' + p + ')';
      };
      window.addEventListener('scroll', upd, { passive: true });
      window.addEventListener('resize', upd);
      upd();
    }

    /* 代码复制 */
    $$('.prose pre').forEach(function (pre) {
      if (!pre.hasAttribute('data-lang')) pre.setAttribute('data-lang', 'code');
      var btn = document.createElement('button');
      btn.className = 'copy-code';
      btn.type = 'button';
      btn.textContent = '复制';
      btn.addEventListener('click', function () {
        var code = pre.querySelector('code') || pre;
        var text = code.innerText;
        if (navigator.clipboard) {
          navigator.clipboard.writeText(text).then(function () {
            btn.textContent = '已复制';
            setTimeout(function () { btn.textContent = '复制'; }, 1600);
          });
        }
      });
      pre.appendChild(btn);
    });

    /* 图片灯箱 */
    var box = document.createElement('div');
    box.className = 'lightbox';
    box.innerHTML = '<img alt=""><div class="lightbox-cap"></div>';
    document.body.appendChild(box);
    var boxImg = $('img', box);
    var boxCap = $('.lightbox-cap', box);

    $$('.prose img').forEach(function (img) {
      img.addEventListener('click', function () {
        boxImg.src = img.currentSrc || img.src;
        boxImg.alt = img.alt || '';
        boxCap.textContent = img.alt || '';
        box.classList.add('is-open');
        document.body.style.overflow = 'hidden';
      });
    });
    var closeBox = function () {
      box.classList.remove('is-open');
      document.body.style.overflow = '';
    };
    box.addEventListener('click', closeBox);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && box.classList.contains('is-open')) closeBox();
    });

    /* 阅读时长 */
    var wordsEl = $('[data-reading]');
    if (wordsEl) {
      var text = prose.innerText.replace(/\s+/g, '');
      var mins = Math.max(1, Math.round(text.length / 380));
      wordsEl.textContent = mins + ' 分钟';
    }
  }

  /* ---------- 9. 分享 ---------- */
  $$('[data-share]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var data = { title: document.title, url: location.href };
      if (navigator.share) {
        navigator.share(data).catch(function () {});
      } else if (navigator.clipboard) {
        navigator.clipboard.writeText(location.href).then(function () {
          var old = btn.textContent;
          btn.textContent = '链接已复制';
          setTimeout(function () { btn.textContent = old; }, 1600);
        });
      }
      var label = btn.querySelector('[data-label]');
      if (label && !navigator.share) {
        var old = label.textContent;
        label.textContent = '已复制';
        setTimeout(function () { label.textContent = old; }, 1600);
      }
    });
  });

  /* ---------- 10. 首页最新文章 ---------- */
  var latest = $('[data-latest]');
  if (latest) {
    loadPosts().then(function (data) {
      var all = data.posts || [];
      $$('[data-count]').forEach(function (el) { el.textContent = all.length; });
      var posts = all.slice(0, 4);
      if (!posts.length) return;
      latest.innerHTML = posts.map(function (p, i) {
        return '<a class="post-row" href="/posts/' + p.slug + '.html" data-reveal style="--d:' + i + '">' +
          '<span class="post-num">' + String(i + 1).padStart(2, '0') + '</span>' +
          '<span class="post-main"><span class="post-title">' + escapeHtml(p.title) + '</span>' +
            '<span class="post-excerpt">' + escapeHtml(p.excerpt || '') + '</span></span>' +
          '<span class="post-tags">' + (p.tags || []).map(function (t) { return '<span class="tag">' + escapeHtml(t) + '</span>'; }).join('') + '</span>' +
          '<span class="post-date">' + (p.date || '').replace(/-/g, '.') + '</span>' +
          '<span class="post-arrow" aria-hidden="true">↗</span></a>';
      }).join('');
      $$('[data-reveal]', latest).forEach(function (el) {
        el.classList.add('is-in');
      });
    });
  }

  /* ---------- 11. 写作页筛选 ---------- */
  var listHost = $('[data-archive]');
  if (listHost) {
    loadPosts().then(function (data) {
      var posts = data.posts || [];
      if (!posts.length) {
        listHost.innerHTML = '<div class="empty-state">还没有文章 — 在 posts/ 目录新建 HTML 后运行 npm run build</div>';
        return;
      }
      var allTags = {};
      posts.forEach(function (p) { (p.tags || []).forEach(function (t) { allTags[t] = (allTags[t] || 0) + 1; }); });

      var chips = ['<button class="chip is-on" data-tag="">全部<span class="n">' + posts.length + '</span></button>'];
      Object.keys(allTags).forEach(function (t) {
        chips.push('<button class="chip" data-tag="' + escapeHtml(t) + '">' + escapeHtml(t) + '<span class="n">' + allTags[t] + '</span></button>');
      });
      var filters = $('[data-filters]');
      if (filters) filters.innerHTML = chips.join('');

      var render = function (tag, q) {
        var out = posts.filter(function (p) {
          var okTag = !tag || (p.tags || []).indexOf(tag) > -1;
          var okQ = !q || (p.title + ' ' + (p.excerpt || '') + ' ' + (p.tags || []).join(' ')).toLowerCase().indexOf(q) > -1;
          return okTag && okQ;
        });
        listHost.innerHTML = out.map(function (p, i) {
          return '<a class="post-row" href="/posts/' + p.slug + '.html">' +
            '<span class="post-num">' + String(i + 1).padStart(2, '0') + '</span>' +
            '<span class="post-main"><span class="post-title">' + escapeHtml(p.title) + '</span>' +
              '<span class="post-excerpt">' + escapeHtml(p.excerpt || '') + '</span></span>' +
            '<span class="post-tags">' + (p.tags || []).map(function (t) { return '<span class="tag">' + escapeHtml(t) + '</span>'; }).join('') + '</span>' +
            '<span class="post-date">' + (p.date || '').replace(/-/g, '.') + '</span>' +
            '<span class="post-arrow" aria-hidden="true">↗</span></a>';
        }).join('') || '<div class="empty-state">没有找到相关文章</div>';
      };
      render('', '');

      document.addEventListener('click', function (e) {
        var chip = e.target.closest('.chip');
        if (!chip) return;
        $$('.chip').forEach(function (c) { c.classList.toggle('is-on', c === chip); });
        var q = $('.search');
        render(chip.getAttribute('data-tag'), q ? q.value.trim().toLowerCase() : '');
      });
      var search = $('.search');
      if (search) {
        var timer;
        search.addEventListener('input', function () {
          clearTimeout(timer);
          timer = setTimeout(function () {
            var on = $('.chip.is-on');
            render(on ? on.getAttribute('data-tag') : '', search.value.trim().toLowerCase());
          }, 120);
        });
      }
    });
  }

  /* ---------- 12. 上一页 / 下一页 ---------- */
  var pager = $('[data-pager]');
  if (pager) {
    var slug = document.body.getAttribute('data-post') || '';
    loadPosts().then(function (data) {
      var posts = data.posts || [];
      var i = posts.findIndex(function (p) { return p.slug === slug; });
      if (i < 0) return;
      var prev = posts[i + 1];
      var next = posts[i - 1];
      var el = function (p, dir, cls) {
        if (!p) return '<span class="empty ' + cls + '"><span class="dir">' + dir + '</span><span class="ttl">没有更多了</span></span>';
        return '<a href="/posts/' + p.slug + '.html" class="' + cls + '"><span class="dir">' + dir + '</span><span class="ttl">' + escapeHtml(p.title) + '</span></a>';
      };
      pager.innerHTML = el(prev, '← 上一篇', 'prev') + el(next, '下一篇 →', 'next');
    });
  }

  /* ---------- 13. 特效小组件（文章与实验室共用） ---------- */
  var GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/<>[]{}#%&*+=~—';

  $$('.fx-scramble').forEach(function (el) {
    var target = el.getAttribute('data-text') || el.textContent;
    var busy = false;
    var run = function () {
      if (busy) return;
      busy = true;
      var t0 = performance.now();
      var dur = Math.min(1500, 420 + target.length * 40);
      var step = function (now) {
        var p = Math.min((now - t0) / dur, 1);
        var out = '';
        for (var i = 0; i < target.length; i++) {
          var ch = target[i];
          if (ch === ' ') { out += ' '; continue; }
          var th = (i / target.length) * 0.85;
          out += p > th ? ch : GLYPHS[(Math.random() * GLYPHS.length) | 0];
        }
        el.textContent = out;
        if (p < 1) requestAnimationFrame(step);
        else { el.textContent = target; busy = false; }
      };
      requestAnimationFrame(step);
    };
    el.addEventListener('mouseenter', run);
    el.addEventListener('click', run);
    if ('IntersectionObserver' in window && !reduce) {
      var sio = new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          if (e.isIntersecting) {
            setTimeout(run, 260);
            sio.disconnect();
          }
        });
      }, { threshold: 0.5 });
      sio.observe(el);
    }
  });

  if (window.matchMedia('(pointer:fine)').matches && !reduce) {
    $$('.fx-magnet').forEach(function (el) {
      el.addEventListener('mousemove', function (e) {
        var r = el.getBoundingClientRect();
        var dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
        var dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
        el.style.transform = 'translate(' + dx * 10 + 'px,' + dy * 8 + 'px)';
      });
      el.addEventListener('mouseleave', function () { el.style.transform = ''; });
    });

    $$('.fx-tilt').forEach(function (el) {
      el.addEventListener('mousemove', function (e) {
        var r = el.getBoundingClientRect();
        var dx = (e.clientX - r.left) / r.width - 0.5;
        var dy = (e.clientY - r.top) / r.height - 0.5;
        el.style.transform = 'perspective(760px) rotateY(' + dx * 15 + 'deg) rotateX(' + (-dy * 15) + 'deg)';
      });
      el.addEventListener('mouseleave', function () { el.style.transform = ''; });
    });

    $$('.fx-spot').forEach(function (el) {
      el.addEventListener('mousemove', function (e) {
        var r = el.getBoundingClientRect();
        el.style.setProperty('--sx', (e.clientX - r.left) + 'px');
        el.style.setProperty('--sy', (e.clientY - r.top) + 'px');
      });
    });
  }

  $$('.fx-burst').forEach(function (host) {
    var cv = document.createElement('canvas');
    host.insertBefore(cv, host.firstChild);
    var ctx = cv.getContext('2d');
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var W, H;
    var size = function () {
      W = host.clientWidth; H = host.clientHeight;
      cv.width = W * dpr; cv.height = H * dpr;
      cv.style.width = W + 'px'; cv.style.height = H + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    size();
    window.addEventListener('resize', size);

    var ps = [];
    var alive = false;
    var loop = function () {
      ctx.clearRect(0, 0, W, H);
      for (var i = ps.length - 1; i >= 0; i--) {
        var p = ps[i];
        p.x += p.vx; p.y += p.vy;
        p.vy += 0.12; p.vx *= 0.985; p.vy *= 0.985;
        p.life -= 0.012;
        if (p.life <= 0) { ps.splice(i, 1); continue; }
        ctx.globalAlpha = Math.max(p.life, 0);
        ctx.fillStyle = p.c;
        ctx.fillRect(p.x, p.y, p.s, p.s);
      }
      ctx.globalAlpha = 1;
      if (ps.length) requestAnimationFrame(loop);
      else { alive = false; ctx.clearRect(0, 0, W, H); }
    };

    host.addEventListener('click', function (e) {
      var r = host.getBoundingClientRect();
      var x = e.clientX - r.left, y = e.clientY - r.top;
      for (var i = 0; i < 46; i++) {
        var a = Math.random() * Math.PI * 2;
        var sp = 2 + Math.random() * 7;
        ps.push({
          x: x, y: y,
          vx: Math.cos(a) * sp,
          vy: Math.sin(a) * sp - 2,
          life: 0.7 + Math.random() * 0.5,
          s: 1 + Math.random() * 2.4,
          c: Math.random() > 0.72 ? '#ff5a36' : (Math.random() > 0.5 ? '#f1ece2' : '#8d8779')
        });
      }
      if (!alive) { alive = true; requestAnimationFrame(loop); }
    });
  });

  if ('IntersectionObserver' in window) {
    var rio = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('is-in'); rio.unobserve(e.target); }
      });
    }, { threshold: 0.2 });
    $$('.fx-reveal-img').forEach(function (el) { rio.observe(el); });
  } else {
    $$('.fx-reveal-img').forEach(function (el) { el.classList.add('is-in'); });
  }

  /* ---------- 14. 首屏就绪 ---------- */
  var heroName = $('.hero-name');
  if (heroName) {
    var text = heroName.textContent.trim();
    heroName.textContent = '';
    text.split('').forEach(function (ch, i) {
      var s = document.createElement('span');
      s.className = 'ch';
      s.textContent = ch === ' ' ? '\u00a0' : ch;
      s.style.transitionDelay = (0.12 + i * 0.055) + 's';
      heroName.appendChild(s);
    });
    requestAnimationFrame(function () {
      setTimeout(function () { document.body.classList.add('is-ready'); }, 60);
    });
  }
})();
