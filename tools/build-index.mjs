#!/usr/bin/env node
/**
 * 生成索引：扫描 posts/*.html，读出 <meta name="post:*">，
 * 写出 posts.json / feed.xml / sitemap.xml。
 *
 *   node tools/build-index.mjs
 *
 * 只依赖 Node 内置模块，不需要 npm install。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const POSTS_DIR = path.join(ROOT, 'posts');

const SITE = {
  title: 'zzcym',
  url: 'https://zzcym.github.io',
  author: 'zzcym',
  description: '关于界面、地图与夜晚的笔记。手写 HTML，零框架。'
};

/** 从 HTML 里取 <meta name="X" content="Y"> */
function meta(html, name) {
  const re = new RegExp(`<meta\\s+name=["']${name}["']\\s+content=["']([\\s\\S]*?)["']\\s*/?>`, 'i');
  const m = html.match(re);
  return m ? decode(m[1]).trim() : '';
}

function decode(s) {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');
}

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function readPosts() {
  if (!fs.existsSync(POSTS_DIR)) return [];
  const files = fs.readdirSync(POSTS_DIR).filter((f) => f.endsWith('.html'));

  const posts = files.map((file) => {
    const html = fs.readFileSync(path.join(POSTS_DIR, file), 'utf8');
    const slug = file.replace(/\.html$/, '');
    const body = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
    const title = meta(html, 'post:title') || slug;
    const date = meta(html, 'post:date') || '1970-01-01';
    const tags = (meta(html, 'post:tags') || '')
      .split(/[,，]/)
      .map((t) => t.trim())
      .filter(Boolean);
    const excerpt = meta(html, 'post:excerpt') || '';
    const reading = Math.max(1, Math.round(body.length / 620));

    return { slug, title, date, tags, excerpt, reading, file };
  });

  return posts.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.title.localeCompare(b.title)));
}

function buildJson(posts) {
  return JSON.stringify({ generated: new Date().toISOString(), posts }, null, 2) + '\n';
}

function buildFeed(posts) {
  const items = posts
    .map(
      (p) => `    <item>
      <title>${esc(p.title)}</title>
      <link>${SITE.url}/posts/${p.slug}.html</link>
      <guid isPermaLink="true">${SITE.url}/posts/${p.slug}.html</guid>
      <pubDate>${new Date(p.date + 'T09:00:00+08:00').toUTCString()}</pubDate>
      <description>${esc(p.excerpt)}</description>
    </item>`
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${esc(SITE.title)}</title>
    <link>${SITE.url}/</link>
    <atom:link href="${SITE.url}/feed.xml" rel="self" type="application/rss+xml"/>
    <description>${esc(SITE.description)}</description>
    <language>zh-CN</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${items}
  </channel>
</rss>
`;
}

function buildSitemap(posts) {
  const urls = ['/', '/writing.html', '/about.html', '/lab.html']
    .map((u) => `  <url><loc>${SITE.url}${u}</loc></url>`)
    .concat(posts.map((p) => `  <url><loc>${SITE.url}/posts/${p.slug}.html</loc><lastmod>${p.date}</lastmod></url>`))
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
}

const posts = readPosts();

fs.writeFileSync(path.join(ROOT, 'posts.json'), buildJson(posts), 'utf8');
fs.writeFileSync(path.join(ROOT, 'feed.xml'), buildFeed(posts), 'utf8');
fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), buildSitemap(posts), 'utf8');

console.log(`✓ ${posts.length} 篇文章 → posts.json / feed.xml / sitemap.xml`);
posts.forEach((p) => console.log(`  ${p.date}  ${p.slug.padEnd(16)} ${p.title}`));
