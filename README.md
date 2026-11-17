# zzcym.github.io

一个手写的个人博客：没有框架，没有构建步骤，没有 CMS。
文章就是 HTML 文件，想插动图、想加特效，直接写。

**线上地址 → https://zzcym.github.io**

---

## 本地看一眼

```bash
node tools/serve.mjs        # 或者 npm run dev
# → http://localhost:8765
```

只需要 Node（≥18），不需要 `npm install`。

> 为什么不能直接双击 HTML？因为首页列表、搜索、目录都是从
> `/posts.json` 读的，`file://` 协议下浏览器会拦截。起个本地服务就好。

## 写一篇新文章

```bash
node tools/new-post.mjs "标题" "标签1,标签2"     # 会生成 posts/xxx.html
node tools/build-index.mjs                       # 重新生成索引
```

`build-index.mjs` 会扫描 `posts/*.html`，把每篇开头的这几行读出来：

```html
<meta name="post:title"   content="标题">
<meta name="post:date"    content="2026-11-18">
<meta name="post:tags"    content="设计,界面">
<meta name="post:excerpt" content="一句摘要，出现在列表和 RSS 里。">
```

然后生成 `posts.json`、`feed.xml`、`sitemap.xml`。
首页的「最近的写作」、`writing.html` 的标签筛选、`⌘K` 搜索，全都来自 `posts.json`。

**推送到 GitHub 后，`.github/workflows/build.yml` 会自动再跑一遍这个脚本**，
所以你其实可以忘了 `build-index` 这件事——直接 `git push` 就行。

## 正文里能用的东西

都是普通 HTML，下面是本站预置的样式与特效类名：

| 写法 | 效果 |
| --- | --- |
| `<p class="lead">…</p>` | 导语，字号更大、颜色更亮 |
| `<div class="callout"><span class="ic">i</span><div>…</div></div>` | 提示块 |
| `<figure><img src="/assets/img/x.gif" alt="…"><figcaption>…</figcaption></figure>` | 图 + 说明；点击自动全屏（GIF 也能放大） |
| `<blockquote><p>…</p></blockquote>` | 引用，衬线斜体 + 朱红竖线 |
| `<pre data-lang="js"><code>…</code></pre>` | 代码块，自动带语言角标和复制按钮 |
| `<span class="fx-scramble" data-text="HOVER ME">HOVER ME</span>` | 文字解码 |
| `<button class="fx-magnet">…</button>` | 磁吸按钮 |
| `<div class="fx-spot">…</div>` | 局部聚光 |
| `<div class="fx-burst">…</div>` | 点击爆散粒子 |
| `<div class="fx-tilt">…</div>` | 3D 倾斜卡片 |
| `<div class="fx-shimmer">…</div>` | 渐变动字 |
| `<img class="fx-reveal-img" …>` | 滚动揭示 |
| `<div class="marquee"><div class="marquee-track"><span>…</span><span>…</span></div></div>` | 跑马灯 |

在线看效果：<https://zzcym.github.io/lab.html>

## 改成你自己的

1. **名字 / 邮箱 / 链接**：`assets/js/core.js` 顶部的 `SITE` 对象（`name`、`email`、`links`）。
   邮箱填上之后，页脚的邮件入口会自动出现。
2. **站点标题与描述**：每个页面 `<head>` 里的 `<title>`、`<meta name="description">`。
3. **域名**：如果换了 GitHub 用户名，仓库要改名成 `<用户名>.github.io`，
   同时把 `tools/build-index.mjs` 里的 `SITE.url` 和页面里的绝对链接换掉。
4. **配色**：`assets/css/style.css` 顶部的 `:root` 变量，改 `--accent` 就能换掉全站的朱红。

## 目录

```
.
├── index.html               首页（点阵球体 + 最近文章 + 在做的东西）
├── writing.html             全部文章，可按标签筛选 / 搜索
├── lab.html                 特效实验室
├── about.html               关于
├── 404.html                 404
├── posts/                   每篇文章一个 HTML
│   ├── hello-world.html     这个博客是怎么写出来的（建议先看这篇）
│   ├── html-effects.html    六个可以抄走的小特效
│   ├── eatmap.html
│   └── dark-ui.html
├── assets/
│   ├── css/style.css        全站唯一一份样式
│   ├── js/core.js           全站交互 + 特效组件
│   ├── js/orb.js            首页那颗点阵球
│   ├── fonts/               自托管字体（约 120KB，不依赖外部 CDN）
│   └── img/
├── tools/
│   ├── build-index.mjs      生成 posts.json / feed.xml / sitemap.xml
│   ├── new-post.mjs         新建文章
│   └── serve.mjs            本地预览服务器
├── posts.json               （自动生成，不要手改）
├── feed.xml                 （自动生成）
└── sitemap.xml              （自动生成）
```

## 一些实现上的小决定

- **字体自托管**：Instrument Serif（拉丁标题）、Inter（正文）、JetBrains Mono（标签）。
  中文走系统字体栈（PingFang SC / 微软雅黑），不额外下载中文字库——首屏更快。
- **只写普通 `<script>`，不用 ES module**：这样本地直接打开也不会因为 CORS 白屏。
- **`?static=1`**：加上这个参数会关掉全部动效，方便截图、打印，或者就是不想看动画。
- **移动端**：球体会缩小、聚光和磁吸自动关闭，`prefers-reduced-motion` 同样会关掉动效。
- **无障碍**：跳转链接、`aria-current`、键盘可达的命令面板（`⌘K` / `/`）、可见焦点环。

## 参考

- 字体：[Instrument Serif](https://fonts.google.com/specimen/Instrument+Serif)、
  [Inter](https://rsms.me/inter/)、[JetBrains Mono](https://www.jetbrains.com/lp/mono/)
- 托管：[GitHub Pages](https://pages.github.com/)

---

© zzcym · 手写 HTML，0 个框架。
