#!/usr/bin/env node
/**
 * 新建一篇文章：node tools/new-post.mjs "标题" [标签1,标签2]
 * 会生成 posts/<slug>.html，并把标题 / 日期 / 模板都填好。
 */
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** 中文标题转 slug：保留英文数字，中文用拼音太重，这里退化成一个日期短码 */
function slugify(title) {
  const ascii = title
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const latin = ascii.replace(/[\u4e00-\u9fa5]/g, '');
  if (latin.replace(/-/g, '').length >= 3) return latin.replace(/-+/g, '-');
  const d = new Date();
  return `post-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
}

const args = process.argv.slice(2);
let title = args[0];
const tagArg = args[1];

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
function ask(q) {
  return new Promise((res) => rl.question(q, (a) => res(a.trim())));
}

if (!title) title = await ask('文章标题：');
if (!title) {
  console.error('没有标题，不写了。');
  process.exit(1);
}

const tags = (tagArg || '随笔').split(/[,，]/).map((t) => t.trim()).filter(Boolean);
const slug = slugify(title);
const now = new Date();
const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
const file = path.join(ROOT, 'posts', `${slug}.html`);

if (fs.existsSync(file)) {
  console.error(`已经存在：posts/${slug}.html`);
  process.exit(1);
}

const html = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title} — zzcym</title>
<meta name="description" content="在这里写一句摘要。">
<meta name="theme-color" content="#070709">
<meta property="og:type" content="article">
<meta property="og:title" content="${title}">
<!-- 文章元信息：只改这几行，首页列表 / 搜索 / RSS 会自动跟着变 -->
<meta name="post:title" content="${title}">
<meta name="post:date" content="${date}">
<meta name="post:tags" content="${tags.join(',')}">
<meta name="post:excerpt" content="在这里写一句摘要。">
<link rel="icon" href="/assets/img/favicon.svg" type="image/svg+xml">
<link rel="preload" href="/assets/fonts/instrument-serif.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/assets/css/style.css">
</head>
<body data-post="${slug}">

<a class="skip" href="#main">跳到正文</a>
<div class="progress" data-progress></div>

<header class="site-head">
  <div class="wrap nav">
    <a class="brand" href="/" aria-label="回到首页"><b data-site="name">zzcym</b><i>®</i></a>
    <nav class="nav-links" aria-label="主导航">
      <a class="nav-link" href="/writing.html">写作</a>
      <a class="nav-link" href="/lab.html">实验室</a>
      <a class="nav-link" href="/about.html">关于</a>
    </nav>
    <div class="nav-right">
      <button class="cmdk-key" type="button" data-open-palette aria-label="搜索与跳转">
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><circle cx="7" cy="7" r="4.6"/><path d="m10.4 10.4 3 3"/></svg>
        <span>⌘K</span>
      </button>
    </div>
  </div>
</header>

<main id="main">
  <article class="wrap">
    <header class="article-head">
      <div class="article-meta mono">
        <time datetime="${date}">${date.replace(/-/g, '.')}</time>
        <span class="sep" aria-hidden="true"></span>
        <span data-reading>—</span>
        <span class="sep" aria-hidden="true"></span>
        ${tags.map((t) => `<span class="tag">${t}</span>`).join('')}
      </div>
      <h1 class="article-title">${title}</h1>
      <p class="article-dek">在这里写一句摘要。</p>
    </header>

    <div class="article-body">
      <div class="prose">

        <p class="lead">第一段。想插动图就写 &lt;img src="/assets/img/xxx.gif"&gt;，想加特效就用下面这些类名。</p>

        <h2>第一节</h2>
        <p>正文。</p>

        <div class="callout"><span class="ic">i</span><div>一个提示块。</div></div>

        <figure>
          <img src="/assets/img/loop.gif" alt="示例动图">
          <figcaption>点一下可以放大</figcaption>
        </figure>

        <blockquote><p>一句想被记住的话。</p></blockquote>

        <h2>第二节</h2>
        <pre data-lang="html"><code>&lt;span class="fx-scramble" data-text="HOVER ME"&gt;HOVER ME&lt;/span&gt;</code></pre>

      </div>
      <aside class="toc" data-toc aria-label="目录"></aside>
    </div>
  </article>

  <div class="wrap">
    <nav class="pager" data-pager aria-label="上下篇"></nav>
  </div>
</main>

<footer class="site-foot">
  <div class="wrap">
    <div class="foot-top">
      <div>
        <p class="foot-big">写点<em>东西</em>。</p>
        <p class="foot-note">这个博客没有评论、没有统计、没有广告。只有一些被认真写下来的字，和一处可以随便逛逛的地方。</p>
      </div>
      <div class="foot-links">
        <div class="foot-col">
          <h4>页面</h4>
          <a href="/writing.html">写作</a>
          <a href="/lab.html">实验室</a>
          <a href="/about.html">关于</a>
          <a href="/feed.xml">RSS</a>
        </div>
        <div class="foot-col">
          <h4>别处</h4>
          <a href="https://github.com/zzcym" target="_blank" rel="noopener">GitHub ↗</a>
          <a href="mailto:" data-email style="display:none">邮箱</a>
          <a href="/posts/hello-world.html">从这里开始 →</a>
        </div>
      </div>
    </div>
    <div class="foot-bottom">
      <span class="mono">© <span data-year>2026</span> zzcym</span>
      <span class="mono">手写 HTML · 0 个框架 · GitHub Pages</span>
      <span class="mono">本地 <b data-clock style="color:var(--muted);font-weight:400">--:--:--</b> CST</span>
    </div>
  </div>
</footer>

<script src="/assets/js/core.js"></script>
</body>
</html>
`;

fs.mkdirSync(path.join(ROOT, 'posts'), { recursive: true });
fs.writeFileSync(file, html, 'utf8');
rl.close();

console.log(`✓ posts/${slug}.html`);
console.log('  下一步：node tools/build-index.mjs');
