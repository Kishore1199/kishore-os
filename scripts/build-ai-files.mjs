/**
 * Writes llms.txt, robots.txt and sitemap.xml, and the structured data inside src/index.html, from the portfolio data.
 *   npm run ai-files      (run it after editing portfolio.data.ts)
 * Phone and email are left out on purpose, so they are not easier to harvest.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const root = fileURLToPath(new URL('..', import.meta.url));
const { outputFiles } = await build({ entryPoints: [root + 'src/app/data/portfolio.data.ts'], bundle: true, format: 'esm', write: false });
const { PROFILE, PROJECTS, EXPERIENCE, EDUCATION, SKILL_CATEGORIES } = await import('data:text/javascript;base64,' + Buffer.from(outputFiles[0].contents).toString('base64'));
const SITE = 'https://kishore-os.web.app';
const [city, state, country] = PROFILE.location.split(',').map(s => s.trim());
const now = EXPERIENCE.find(e => e.current);
const degree = EDUCATION.at(-1);

writeFileSync(root + 'public/llms.txt', `# ${PROFILE.name}

> ${PROFILE.role} in ${PROFILE.location}. Currently ${now.role} at ${now.company}. Open to Java full-stack roles and freelance work.

Contact through the form at ${SITE}/#contact or ${PROFILE.linkedin}

## Experience
${EXPERIENCE.map(e => `- ${e.role}, ${e.company} (${e.period}, ${e.duration}): ${e.summary} Technology: ${e.tech.join(', ')}.`).join('\n')}

## Projects
${PROJECTS.map(p => `- ${p.link ? `[${p.title}](${p.link})` : p.title} (${p.org}, ${p.period}): ${p.features.slice(0, 3).join('; ')}. Technology: ${p.tech.join(', ')}.`).join('\n')}

## Skills
${SKILL_CATEGORIES.map(c => `- ${c.name}: ${c.skills.map(s => s.name).join(', ')}`).join('\n')}

## Education
${EDUCATION.map(e => `- ${e.degree}, ${e.institution} (${e.period})`).join('\n')}

## Links
- [Resume](${SITE}/${PROFILE.resume})
- [GitHub](${PROFILE.github})
- [LinkedIn](${PROFILE.linkedin})
- [AI tools on this site](${SITE}/#ailab)
`);
writeFileSync(root + 'public/robots.txt', `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`);
writeFileSync(root + 'public/sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${['/', '/assets/study/java-fullstack-guide', '/assets/study/dsa-coding-prep'].map(u => `  <url><loc>${SITE}${u}</loc></url>`).join('\n')}\n</urlset>\n`);

const data = {
  '@context': 'https://schema.org', '@type': 'ProfilePage', url: SITE,
  mainEntity: {
    '@type': 'Person', name: PROFILE.name, jobTitle: PROFILE.role, url: SITE,
    address: { '@type': 'PostalAddress', addressLocality: city, addressRegion: state, addressCountry: country },
    worksFor: { '@type': 'Organization', name: now.company },
    alumniOf: { '@type': 'CollegeOrUniversity', name: degree.institution.split(',')[0] },
    knowsAbout: SKILL_CATEGORIES.slice(0, 3).flatMap(c => c.skills.map(s => s.name)),
    sameAs: [PROFILE.github, PROFILE.linkedin],
  },
};
const page = root + 'src/index.html';
const html = readFileSync(page, 'utf8');
const block = `<!-- structured data: npm run ai-files -->\n  <script type="application/ld+json">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>\n  <!-- /structured data -->`;
const marked = /<!-- structured data: npm run ai-files -->[\s\S]*?<!-- \/structured data -->/;
writeFileSync(page, marked.test(html) ? html.replace(marked, () => block) : html.replace('</head>', () => `  ${block}\n</head>`));
console.log('llms.txt, robots.txt, sitemap.xml and structured data written');
