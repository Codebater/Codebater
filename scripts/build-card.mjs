/**
 * Builds card.svg — a nutrition-facts panel of real GitHub stats.
 *
 * Every number is fetched live. The jokes are in the labels, never in the data:
 * if a figure here is unflattering it is because it is true.
 *
 * Run: GITHUB_TOKEN=... node scripts/build-card.mjs
 */
import { writeFileSync } from 'node:fs';

const LOGIN = process.env.CARD_LOGIN || 'Codebater';
const TOKEN = process.env.GITHUB_TOKEN;
if (!TOKEN) throw new Error('GITHUB_TOKEN is required');

const QUERY = `
query($login: String!) {
  user(login: $login) {
    createdAt
    followers { totalCount }
    repositories(first: 100, ownerAffiliations: OWNER, isFork: false) {
      totalCount
      nodes { isPrivate stargazerCount forkCount diskUsage primaryLanguage { name } }
    }
    contributionsCollection {
      totalCommitContributions
      totalPullRequestContributions
      totalIssueContributions
      contributionCalendar { totalContributions }
    }
  }
}`;

const res = await fetch('https://api.github.com/graphql', {
  method: 'POST',
  headers: { Authorization: `bearer ${TOKEN}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ query: QUERY, variables: { login: LOGIN } }),
});
const json = await res.json();
if (json.errors) throw new Error(JSON.stringify(json.errors));

const u = json.data.user;
const repos = u.repositories.nodes;
const sum = (f) => repos.reduce((a, r) => a + (f(r) || 0), 0);

const total = repos.length;
const pub = repos.filter((r) => !r.isPrivate).length;
const priv = total - pub;
const stars = sum((r) => r.stargazerCount);
const forks = sum((r) => r.forkCount);
const mb = Math.round(sum((r) => r.diskUsage) / 1024);
const commits = u.contributionsCollection.totalCommitContributions;
const prs = u.contributionsCollection.totalPullRequestContributions;
const issues = u.contributionsCollection.totalIssueContributions;
const followers = u.followers.totalCount;

const langs = [...new Set(repos.map((r) => r.primaryLanguage?.name).filter(Boolean))];
const months = Math.max(
  1,
  Math.round((Date.now() - new Date(u.createdAt)) / (1000 * 60 * 60 * 24 * 30.44))
);

const pct = (n, d) => (d ? Math.round((n / d) * 100) : 0);
const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// ── layout ────────────────────────────────────────────────────────────────
const W = 460;
const PAD = 20;
const R = W - PAD; // right edge for right-aligned figures
let y = 0;
const out = [];

const push = (s) => out.push(s);
const rule = (h, gap = 6) => {
  y += gap;
  push(`<rect x="${PAD}" y="${y}" width="${W - PAD * 2}" height="${h}" fill="#000"/>`);
  y += h + gap;
};
const text = (s, opts = {}) => {
  const { size = 13, weight = 400, x = PAD, anchor = 'start', dy = 0 } = opts;
  push(
    `<text x="${x}" y="${y + dy}" font-size="${size}" font-weight="${weight}" ` +
      `text-anchor="${anchor}" fill="#000">${esc(s)}</text>`
  );
};
// one label/value line with a hairline under it
const row = (label, value, note, indent = 0) => {
  y += 17;
  text(label, { x: PAD + indent, weight: indent ? 400 : 700 });
  if (note !== undefined && note !== null)
    text(note, { x: R, anchor: 'end', weight: 700 });
  text(value, { x: note !== undefined && note !== null ? R - 54 : R, anchor: 'end' });
  y += 5;
  push(
    `<rect x="${PAD}" y="${y}" width="${W - PAD * 2}" height="1" fill="#000" opacity="0.25"/>`
  );
  y += 1;
};

y = 14;
text('Nutrition Facts', { size: 34, weight: 800, dy: 22 });
y += 34;
y += 2;
text(`1 developer per container · ${months} months in service`, { size: 12 });
y += 6;

rule(9, 5);

text('Amount per year', { size: 12, weight: 700, dy: 11 });
y += 16;
text('Commits', { size: 24, weight: 800, dy: 18 });
text(String(commits), { size: 24, weight: 800, x: R, anchor: 'end', dy: 18 });
y += 24;

rule(5, 5);
text('% Daily Value*', { size: 12, weight: 700, x: R, anchor: 'end', dy: 11 });
y += 14;
push(`<rect x="${PAD}" y="${y}" width="${W - PAD * 2}" height="1" fill="#000"/>`);
y += 1;

row('Repositories', String(total), '');
row('of which public', String(pub), `${pct(pub, total)}%`, 14);
row('of which "not yet"', String(priv), `${pct(priv, total)}%`, 14);
row('Stars received', String(stars), `${pct(stars, 1000)}%`);
row('Forks by other people', String(forks), `${pct(forks, 100)}%`);
row('Pull requests', String(prs), '');
row('Issues filed', String(issues), '');
row('Followers', String(followers), '');
row('Languages spoken fluently', String(langs.length), '');
row('Disk consumed', `${mb} MB`, '');

rule(9, 7);

const foot = [
  '* Percent Daily Value is based on a 2,000 commit diet.',
  'Your values may vary depending on how many side',
  `projects you refuse to abandon (currently ${priv}).`,
  '',
  'Contains: ' + (langs.join(', ') || 'no declared languages') + '.',
  'May contain traces of ffmpeg.',
];
foot.forEach((line) => {
  y += 14;
  text(line, { size: 11 });
});
y += 16;

const H = y;
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Nutrition facts panel of GitHub statistics for ${esc(LOGIN)}">
<style>text{font-family:"Helvetica Neue",Helvetica,Arial,sans-serif}</style>
<rect width="${W}" height="${H}" rx="4" fill="#fff"/>
<rect x="1.5" y="1.5" width="${W - 3}" height="${H - 3}" rx="3" fill="none" stroke="#000" stroke-width="3"/>
${out.join('\n')}
</svg>
`;

writeFileSync('card.svg', svg);
console.log(`card.svg written — ${W}x${H}`);
console.log(
  `repos ${total} (${pub} public / ${priv} private) · stars ${stars} · commits ${commits} · ${mb} MB`
);
