/**
 * Builds card-discord.svg — a Discord-style profile card, animated, with real stats.
 *
 * Animation is SMIL + CSS only. An SVG loaded through <img> (which is how GitHub
 * renders README images) runs animations but will NOT fetch external resources,
 * so the avatar has to be inlined as a data URI.
 *
 * Run: GITHUB_TOKEN=... node scripts/build-discord-card.mjs
 */
import { writeFileSync } from 'node:fs';

const LOGIN = process.env.CARD_LOGIN || 'Codebater';
const TOKEN = process.env.GITHUB_TOKEN;
if (!TOKEN) throw new Error('GITHUB_TOKEN is required');

const gql = async (query, variables) => {
  const r = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: { Authorization: `bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  const j = await r.json();
  if (j.errors) throw new Error(JSON.stringify(j.errors));
  return j.data;
};

const data = await gql(
  `query($login:String!){ user(login:$login){
      name login avatarUrl(size:160) createdAt
      followers{totalCount}
      repositories(first:100, ownerAffiliations:OWNER, isFork:false){
        nodes{ isPrivate stargazerCount forkCount diskUsage primaryLanguage{name} } }
      contributionsCollection{ totalCommitContributions
        contributionCalendar{ totalContributions } }
   }}`,
  { login: LOGIN }
);

const u = data.user;
const repos = u.repositories.nodes;
const sum = (f) => repos.reduce((a, r) => a + (f(r) || 0), 0);
const total = repos.length;
const pub = repos.filter((r) => !r.isPrivate).length;
const priv = total - pub;
const stars = sum((r) => r.stargazerCount);
const mb = Math.round(sum((r) => r.diskUsage) / 1024);
const commits = u.contributionsCollection.totalCommitContributions;
const contributions = u.contributionsCollection.contributionCalendar.totalContributions;
const followers = u.followers.totalCount;
const langCount = new Set(repos.map((r) => r.primaryLanguage?.name).filter(Boolean)).size;

// Avatar must be inlined; SVG-as-image cannot fetch it at render time.
const avatarBuf = Buffer.from(await (await fetch(u.avatarUrl)).arrayBuffer());
const avatar = `data:image/png;base64,${avatarBuf.toString('base64')}`;

const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// ── the rotating status line. Every one of these is true. ──────────────────
const activities = [
  ['Playing', `Something nobody asked for`],
  ['Committing', `to a private repo · ${priv} of them`],
  ['Rendering', `${mb} MB and climbing`],
  ['Speaking', `${langCount} languages, none of them fluently`],
  ['Collecting', `${stars} stars · a clean slate`],
];

const SLOT = 2.6; // seconds per line
const TOTAL = (activities.length * SLOT).toFixed(2);

// Fade item i in for its slot, out again, looping over the whole cycle.
const carousel = (i, y) => {
  const n = activities.length;
  const a = i / n;
  const b = (i + 1) / n;
  const f = 0.015;
  const kt = [0, Math.max(0.0001, a), a + f, b - f, b, 1]
    .map((v) => Math.min(1, Math.max(0, v)).toFixed(4))
    .join(';');
  const [verb, detail] = activities[i];
  return `
    <g opacity="0">
      <animate attributeName="opacity" values="0;0;1;1;0;0" keyTimes="${kt}"
               dur="${TOTAL}s" repeatCount="indefinite" calcMode="linear"/>
      <text x="112" y="${y}" class="verb">${esc(verb.toUpperCase())}</text>
      <text x="112" y="${y + 18}" class="detail">${esc(detail)}</text>
    </g>`;
};

// Discord-ish equaliser: four bars, offset so they never move in lockstep.
const bars = [0, 0.35, 0.7, 1.05]
  .map(
    (delay, i) => `
    <rect x="${420 + i * 11}" y="104" width="6" height="14" rx="3" fill="#5865F2">
      <animate attributeName="height" values="6;20;9;17;6" dur="1.5s"
               begin="${delay}s" repeatCount="indefinite" calcMode="spline"
               keySplines=".4 0 .6 1;.4 0 .6 1;.4 0 .6 1;.4 0 .6 1"/>
      <animate attributeName="y" values="118;104;115;107;118" dur="1.5s"
               begin="${delay}s" repeatCount="indefinite" calcMode="spline"
               keySplines=".4 0 .6 1;.4 0 .6 1;.4 0 .6 1;.4 0 .6 1"/>
    </rect>`
  )
  .join('');

const chip = (x, label, value) => `
  <g>
    <rect x="${x}" y="150" width="96" height="36" rx="8" fill="#2b2d31"/>
    <text x="${x + 48}" y="165" class="chipval">${esc(value)}</text>
    <text x="${x + 48}" y="179" class="chiplab">${esc(label)}</text>
  </g>`;

const W = 480;
const H = 200;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Discord-style profile card for ${esc(u.name || LOGIN)}: ${total} repositories, ${pub} public, ${priv} private, ${stars} stars, ${commits} commits this year, ${followers} followers">
<defs>
  <linearGradient id="banner" gradientUnits="userSpaceOnUse" x1="-480" y1="0" x2="0" y2="64">
    <stop offset="0"    stop-color="#5865F2"/>
    <stop offset="0.35" stop-color="#EB459E"/>
    <stop offset="0.7"  stop-color="#57F287"/>
    <stop offset="1"    stop-color="#5865F2"/>
    <animateTransform attributeName="gradientTransform" type="translate"
                      from="0 0" to="480 0" dur="6s" repeatCount="indefinite"/>
  </linearGradient>
  <clipPath id="card"><rect width="${W}" height="${H}" rx="14"/></clipPath>
  <clipPath id="pfp"><circle cx="66" cy="76" r="32"/></clipPath>
</defs>
<style>
  text{font-family:"gg sans","Helvetica Neue",Helvetica,Arial,sans-serif}
  .name{font-size:19px;font-weight:700;fill:#f2f3f5}
  .handle{font-size:13px;fill:#b5bac1}
  .verb{font-size:10px;font-weight:700;fill:#b5bac1;letter-spacing:.09em}
  .detail{font-size:14px;font-weight:600;fill:#f2f3f5}
  .chipval{font-size:15px;font-weight:700;fill:#f2f3f5;text-anchor:middle}
  .chiplab{font-size:9px;fill:#b5bac1;text-anchor:middle;letter-spacing:.07em}
</style>

<g clip-path="url(#card)">
  <rect width="${W}" height="${H}" fill="#1e1f22"/>
  <rect width="${W}" height="64" fill="url(#banner)"/>

  <!-- avatar, with the cut-out ring Discord puts behind it -->
  <circle cx="66" cy="76" r="38" fill="#1e1f22"/>
  <image href="${avatar}" x="34" y="44" width="64" height="64" clip-path="url(#pfp)"/>

  <!-- online dot -->
  <circle cx="90" cy="100" r="11" fill="#1e1f22"/>
  <circle cx="90" cy="100" r="7" fill="#23A55A">
    <animate attributeName="r" values="7;7.8;7" dur="2.4s" repeatCount="indefinite"/>
  </circle>
  <circle cx="90" cy="100" r="7" fill="none" stroke="#23A55A" stroke-width="2">
    <animate attributeName="r" values="7;15" dur="2.4s" repeatCount="indefinite"/>
    <animate attributeName="opacity" values="0.55;0" dur="2.4s" repeatCount="indefinite"/>
  </circle>

  <text x="112" y="80" class="name">${esc(u.name || LOGIN)}</text>
  <text x="112" y="98" class="handle">${esc(LOGIN.toLowerCase())}</text>

  ${activities.map((_, i) => carousel(i, 124)).join('')}
  ${bars}

  ${chip(16, 'REPOS', String(total))}
  ${chip(120, 'PUBLIC', String(pub))}
  ${chip(224, 'COMMITS', String(commits))}
  ${chip(328, 'STARS', String(stars))}

  <rect width="${W}" height="${H}" rx="14" fill="none" stroke="#000" stroke-opacity="0.5" stroke-width="2"/>
</g>
</svg>
`;

writeFileSync('card-discord.svg', svg);
console.log(`card-discord.svg written — ${W}x${H}, ${(svg.length / 1024).toFixed(1)} KB`);
console.log(
  `repos ${total} (${pub}/${priv}) · stars ${stars} · commits ${commits} · contributions ${contributions} · followers ${followers}`
);
