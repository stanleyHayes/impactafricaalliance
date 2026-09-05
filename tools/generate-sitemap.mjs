#!/usr/bin/env node
/**
 * Build the marketing sitemap, including the CMS-driven pages.
 *
 * The sitemap was previously a hand-maintained file. It had drifted — it still
 * listed a pillar that no longer exists — and it could never list events or
 * articles, because those live in the CMS. Google therefore had no way to
 * discover an event page except by crawling a link to it.
 *
 * Static routes come from the shared PILLARS constant, so a pillar rename can
 * no longer leave a dead URL behind. Dynamic routes are fetched from the API.
 *
 * A failed fetch is NOT fatal: the static sitemap is still written, because a
 * deploy should not break when the API is briefly unreachable.
 *
 * Usage: node tools/generate-sitemap.mjs [--api <url>] [--site <url>]
 */
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { PILLARS } from '@iaa/shared';

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const index = args.indexOf(`--${name}`);
  return index !== -1 ? args[index + 1] : fallback;
};

const API = (flag('api', process.env.VITE_API_URL ?? 'https://iaa-api.onrender.com/api')).replace(/\/$/, '');
const SITE = (flag('site', 'https://www.impactafricaalliance.org')).replace(/\/$/, '');
// Resolved from this file, not the working directory, so the script behaves
// the same whether npm runs it from the repo root or from apps/marketing.
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(REPO_ROOT, 'apps/marketing/public/sitemap.xml');

const STATIC_ROUTES = [
  { path: '/', priority: '1.0' },
  { path: '/about', priority: '0.9' },
  { path: '/our-work', priority: '0.9' },
  ...PILLARS.map((pillar) => ({ path: pillar.path, priority: '0.8' })),
  { path: '/impact', priority: '0.9' },
  { path: '/get-involved', priority: '0.9' },
  { path: '/events', priority: '0.9' },
  { path: '/news', priority: '0.8' },
  { path: '/resources', priority: '0.7' },
  { path: '/contact', priority: '0.7' },
  { path: '/privacy-policy', priority: '0.3' },
  { path: '/cookie-policy', priority: '0.3' },
  { path: '/terms-of-use', priority: '0.3' },
  { path: '/privacy-request', priority: '0.3' },
];

/** The API caps pageSize at 100, so walk the pages rather than asking for more. */
const fetchList = async (resource) => {
  const items = [];
  try {
    for (let page = 1; page <= 20; page += 1) {
      const response = await fetch(`${API}/${resource}?pageSize=100&page=${page}`, {
        signal: AbortSignal.timeout(20_000),
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const body = await response.json();
      const batch = Array.isArray(body.items) ? body.items : [];
      items.push(...batch);
      if (batch.length < 100 || items.length >= (body.total ?? items.length)) {
        break;
      }
    }
    return items;
  } catch (error) {
    console.warn(`  ${resource}: could not fetch (${error.message}) — omitted`);
    return items;
  }
};

const escapeXml = (value) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const run = async () => {
  console.log(`Sitemap: ${SITE}\n  API: ${API}`);

  const [events, articles, team] = await Promise.all([
    fetchList('events'),
    fetchList('articles'),
    fetchList('team'),
  ]);

  const entries = [
    ...STATIC_ROUTES.map((route) => ({ ...route, lastmod: undefined })),
    ...events.map((event) => ({
      path: `/events/${event.id}`,
      priority: '0.8',
      lastmod: event.updatedAt,
    })),
    ...articles
      .filter((article) => article.slug)
      .map((article) => ({
        path: `/news/${article.slug}`,
        priority: '0.7',
        lastmod: article.updatedAt,
      })),
    ...team.map((member) => ({
      path: `/about/team/${member.id}`,
      priority: '0.5',
      lastmod: member.updatedAt,
    })),
  ];

  const body = entries
    .map(({ path, priority, lastmod }) =>
      [
        '  <url>',
        `    <loc>${escapeXml(SITE + path)}</loc>`,
        lastmod ? `    <lastmod>${String(lastmod).slice(0, 10)}</lastmod>` : null,
        `    <priority>${priority}</priority>`,
        '  </url>',
      ]
        .filter(Boolean)
        .join('\n'),
    )
    .join('\n');

  writeFileSync(
    OUT,
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`,
  );

  console.log(
    `  ${STATIC_ROUTES.length} static, ${events.length} events, ${articles.length} articles, ${team.length} team`,
  );
  console.log(`  wrote ${OUT} (${entries.length} URLs)`);
};

run().catch((error) => {
  console.error('Sitemap generation failed:', error.message);
  process.exitCode = 1;
});
