/**
 * Builds card-founder.svg — an artistic pastel card. No text.
 *
 * The figure is a photo of me in the forest, segmented off the background
 * (rembg, birefnet-portrait) and inlined as a base64 PNG: an SVG rendered
 * through <img> — how GitHub serves README images — cannot fetch external
 * resources.
 *
 * The cutout is defined ONCE in <defs> and drawn four times with <use>, so the
 * data URI is not repeated. Three of those are flat pastel silhouettes drifting
 * out of register behind the real figure, like a misprinted riso poster.
 *
 * Run: node scripts/build-founder-card.mjs
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const CUTOUT = process.env.FOUNDER_CUTOUT || 'assets/founder-cutout.png';
if (!existsSync(CUTOUT)) {
  console.error(`cutout not found at ${CUTOUT} — nothing written`);
  process.exit(1);
}
const png = readFileSync(CUTOUT);
const cutout = `data:image/png;base64,${png.toString('base64')}`;
// PNG IHDR: width and height are the big-endian uint32s at bytes 16 and 20
const ratio = png.readUInt32BE(16) / png.readUInt32BE(20);

const W = 460;
const H = 440;

// figure geometry. The photo is cropped mid-thigh, so the figure is anchored
// to the bottom edge and bleeds past it — the float never reveals the cut.
const FH = 404;
const FW = Math.round(FH * ratio);
const FX = Math.round(W / 2 - FW / 2) + 14;
const FY = H - FH + 12;

const PASTEL = {
  pink: '#F4A8C4',
  mint: '#9AD9BC',
  lilac: '#C2ABEA',
  sky: '#A9CDEF',
  peach: '#FBC9A4',
  butter: '#F7E39B',
};

// a flat single-colour stamp of the figure, taken from its alpha
const tint = (color) => `
  <filter id="t${color.slice(1)}" x="-20%" y="-20%" width="140%" height="140%" color-interpolation-filters="sRGB">
    <feFlood flood-color="${color}" result="c"/>
    <feComposite in="c" in2="SourceAlpha" operator="in"/>
  </filter>`;

// one drifting silhouette
const ghost = (color, dx, dy, dur, op) => `
  <g opacity="${op}" filter="url(#t${color.slice(1)})">
    <animateTransform attributeName="transform" type="translate"
      values="${dx} ${dy};${(-dx * 0.7).toFixed(1)} ${(dy * 0.5).toFixed(1)};${dx} ${dy}"
      dur="${dur}s" repeatCount="indefinite" calcMode="spline"
      keySplines=".45 0 .55 1;.45 0 .55 1"/>
    <use href="#fig"/>
  </g>`;

// a slow-drifting pastel blob
const blob = (cx, cy, r, color, op, dur, ax, ay) => `
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="${color}" opacity="${op}">
    <animateTransform attributeName="transform" type="translate"
      values="0 0;${ax} ${ay};0 0" dur="${dur}s" repeatCount="indefinite"
      calcMode="spline" keySplines=".45 0 .55 1;.45 0 .55 1"/>
    <animate attributeName="r" values="${r};${Math.round(r * 1.08)};${r}" dur="${(dur * 0.8).toFixed(1)}s"
      repeatCount="indefinite" calcMode="spline" keySplines=".45 0 .55 1;.45 0 .55 1"/>
  </circle>`;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="An artistic pastel composition: a photo of me, cut out, floating in front of soft drifting shapes, with pastel silhouettes of the same figure shifting slowly out of register behind it">
<defs>
  <image id="fig" href="${cutout}" x="${FX}" y="${FY}" width="${FW}" height="${FH}"/>

  <linearGradient id="sky" x1="0" y1="0" x2="0.35" y2="1">
    <stop offset="0" stop-color="#FBE2D3">
      <animate attributeName="stop-color" values="#FBE2D3;#EBDCF7;#D9EFE7;#FBE2D3" dur="24s" repeatCount="indefinite"/>
    </stop>
    <stop offset="1" stop-color="#E3D4F4">
      <animate attributeName="stop-color" values="#E3D4F4;#D5E8F6;#F9D8E4;#E3D4F4" dur="24s" repeatCount="indefinite"/>
    </stop>
  </linearGradient>

  <radialGradient id="halo" cx="0.5" cy="0.5" r="0.5">
    <stop offset="0"    stop-color="${PASTEL.butter}" stop-opacity="0.85"/>
    <stop offset="0.72" stop-color="${PASTEL.peach}"  stop-opacity="0.45"/>
    <stop offset="1"    stop-color="${PASTEL.peach}"  stop-opacity="0"/>
  </radialGradient>

  <clipPath id="card"><rect width="${W}" height="${H}" rx="14"/></clipPath>
  <filter id="blur30"><feGaussianBlur stdDeviation="17"/></filter>
  <filter id="blur8"><feGaussianBlur stdDeviation="8"/></filter>
  ${tint(PASTEL.pink)}
  ${tint(PASTEL.mint)}
  ${tint(PASTEL.lilac)}
</defs>

<g clip-path="url(#card)">
  <rect width="${W}" height="${H}" fill="url(#sky)"/>

  <!-- soft drifting colour fields -->
  <g filter="url(#blur30)">
    ${blob(112, 142, 128, PASTEL.pink, 0.8, 19, 18, -14)}
    ${blob(356, 108, 116, PASTEL.sky, 0.78, 23, -16, 16)}
    ${blob(88, 352, 112, PASTEL.mint, 0.72, 17, 14, 12)}
    ${blob(380, 336, 124, PASTEL.lilac, 0.75, 21, -12, -16)}
  </g>

  <!-- halo behind the figure -->
  <circle cx="${W / 2}" cy="${Math.round(FY + FH * 0.3)}" r="146" fill="url(#halo)">
    <animate attributeName="r" values="146;156;146" dur="13s" repeatCount="indefinite"
             calcMode="spline" keySplines=".45 0 .55 1;.45 0 .55 1"/>
  </circle>


  <!-- riso misregistration: the same figure, three pastels, drifting apart -->
  ${ghost(PASTEL.pink, -21, 7, 11, 0.7)}
  ${ghost(PASTEL.mint, 19, -6, 14, 0.65)}
  ${ghost(PASTEL.lilac, 8, 17, 9, 0.6)}


  <!-- the figure -->
  <g>
    <animateTransform attributeName="transform" type="translate"
      values="0 0;0 -7;0 0" dur="6s" repeatCount="indefinite"
      calcMode="spline" keySplines=".45 0 .55 1;.45 0 .55 1"/>
    <use href="#fig"/>
  </g>

  <rect width="${W}" height="${H}" rx="14" fill="none" stroke="#fff" stroke-opacity="0.55" stroke-width="2"/>
</g>
</svg>
`;

writeFileSync('card-founder.svg', svg);
console.log(`card-founder.svg written — ${W}x${H}, ${(svg.length / 1024).toFixed(1)} KB`);
