/**
 * Builds card-founder.svg — an animated character-sheet card.
 *
 * The figure is the hero panel of the 4K THE FOUNDER sheet, cropped to the
 * standing full-body shot. It is inlined as a base64 JPEG because an SVG
 * rendered through <img> (how GitHub serves README images) cannot fetch
 * external resources.
 *
 * The source PNG is not in this repo; run with FOUNDER_SRC pointing at it.
 * If the file is missing the existing card.svg is left alone.
 *
 * Run: node scripts/build-founder-card.mjs
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const FIGURE = process.env.FOUNDER_FIGURE || 'assets/founder-figure.jpg';
if (!existsSync(FIGURE)) {
  console.error(`figure not found at ${FIGURE} — nothing written`);
  process.exit(1);
}
const figure = `data:image/jpeg;base64,${readFileSync(FIGURE).toString('base64')}`;

const STATS = [
  ['BUILD', 'LEAN ATHLETIC'],
  ['HAIR', 'DARK BROWN, WAVY'],
  ['EYES', 'HAZEL'],
  ['GLASSES', 'ROUND WIRE-RIM'],
  ['STYLE', 'MINIMAL MONOCHROME'],
  ['NOTES', 'DESIGNER, STORYTELLER'],
];

const W = 460;
const H = 440;
const CYCLE = 9; // seconds for one full loop

// plate holding the photo
const PX = 312, PY = 30, PW = 126, PH = 380;

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Each stat row fades up in turn, holds, then the whole set clears and repeats.
const rows = STATS.map(([k, v], i) => {
  const t0 = 0.12 + i * 0.06;
  const kt = [0, t0, t0 + 0.05, 0.82, 0.9, 1].map((n) => n.toFixed(3)).join(';');
  const y = 182 + i * 30;
  return `
  <g opacity="0">
    <animate attributeName="opacity" values="0;0;1;1;0;0" keyTimes="${kt}"
             dur="${CYCLE}s" repeatCount="indefinite"/>
    <animateTransform attributeName="transform" type="translate"
             values="0 6;0 6;0 0;0 0;0 0;0 0" keyTimes="${kt}"
             dur="${CYCLE}s" repeatCount="indefinite"/>
    <text x="28" y="${y}" class="k">${esc(k)}</text>
    <text x="126" y="${y}" class="v">${esc(v)}</text>
  </g>`;
}).join('');

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Animated character sheet card: THE FOUNDER, a standing full-body figure beside the sheet's stat lines">
<defs>
  <clipPath id="plate"><rect x="${PX}" y="${PY}" width="${PW}" height="${PH}" rx="8"/></clipPath>
  <clipPath id="card"><rect width="${W}" height="${H}" rx="14"/></clipPath>
  <linearGradient id="sheen" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0"   stop-color="#fff" stop-opacity="0"/>
    <stop offset="0.5" stop-color="#fff" stop-opacity="0.55"/>
    <stop offset="1"   stop-color="#fff" stop-opacity="0"/>
  </linearGradient>
  <filter id="soft" x="-60%" y="-60%" width="220%" height="220%">
    <feGaussianBlur stdDeviation="7"/>
  </filter>
</defs>
<style>
  text{font-family:"Helvetica Neue",Helvetica,Arial,sans-serif;fill:#141414}
  .label{font-size:10px;font-weight:700;letter-spacing:.18em;fill:#8a8578}
  .title{font-size:31px;font-weight:800;letter-spacing:-.01em}
  .k{font-size:11px;font-weight:700;letter-spacing:.1em;fill:#8a8578}
  .v{font-size:12px;font-weight:600;letter-spacing:.04em}
  .foot{font-size:10px;letter-spacing:.14em;fill:#8a8578}
</style>

<g clip-path="url(#card)">
  <rect width="${W}" height="${H}" fill="#F4F1EA"/>

  <text x="28" y="46" class="label">CHARACTER SHEET</text>
  <text x="26" y="84" class="title">THE FOUNDER</text>

  <!-- accent rule draws in, then retracts -->
  <rect x="28" y="100" width="0" height="3" fill="#141414">
    <animate attributeName="width" values="0;236;236;0" keyTimes="0;0.16;0.84;1"
             dur="${CYCLE}s" repeatCount="indefinite" calcMode="spline"
             keySplines=".2 0 .2 1;0 0 1 1;.6 0 .8 1"/>
  </rect>

  <text x="28" y="128" class="k">FOUNDER &amp; DESIGNER</text>

  ${rows}

  <text x="28" y="${H - 26}" class="foot">GRAPHIQ STUDIO · GRAPHIQ.ART</text>

  <!-- the plate, with a soft shadow that breathes with the float -->
  <ellipse cx="${PX + PW / 2}" cy="${PY + PH + 12}" rx="46" ry="6" fill="#000" opacity="0.16" filter="url(#soft)">
    <animate attributeName="rx" values="46;39;46" dur="5s" repeatCount="indefinite" calcMode="spline" keySplines=".45 0 .55 1;.45 0 .55 1"/>
    <animate attributeName="opacity" values="0.16;0.10;0.16" dur="5s" repeatCount="indefinite" calcMode="spline" keySplines=".45 0 .55 1;.45 0 .55 1"/>
  </ellipse>

  <rect x="${PX}" y="${PY}" width="${PW}" height="${PH}" rx="8" fill="#EAE7E7"/>

  <g clip-path="url(#plate)">
    <g>
      <!-- idle float -->
      <animateTransform attributeName="transform" type="translate"
                        values="0 0;0 -6;0 0" dur="5s" repeatCount="indefinite"
                        calcMode="spline" keySplines=".45 0 .55 1;.45 0 .55 1"/>
      <image href="${figure}" x="${PX}" y="${PY}" width="${PW}" height="${PH}" preserveAspectRatio="xMidYMid slice"/>
    </g>
    <!-- slow light sweep down the plate -->
    <rect x="${PX}" y="${PY - 150}" width="${PW}" height="150" fill="url(#sheen)" opacity="0.5">
      <animate attributeName="y" values="${PY - 160};${PY + PH + 20}" dur="${CYCLE}s" repeatCount="indefinite"/>
    </rect>
  </g>
  <rect x="${PX}" y="${PY}" width="${PW}" height="${PH}" rx="8" fill="none" stroke="#141414" stroke-opacity="0.12"/>

  <rect width="${W}" height="${H}" rx="14" fill="none" stroke="#141414" stroke-opacity="0.14" stroke-width="2"/>
</g>
</svg>
`;

writeFileSync('card-founder.svg', svg);
console.log(`card-founder.svg written — ${W}x${H}, ${(svg.length / 1024).toFixed(1)} KB`);
