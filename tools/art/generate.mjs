// Générateur d'assets « Phare Vectoriel » pour Lumen, le dernier phare.
// Chaque asset est dessiné en SVG (code), puis rendu en PNG transparent par Chromium.
// Usage : node tools/art/generate.mjs   (depuis la racine du dépôt)
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const OUT = 'public/assets';
const C = {
  nuit: '#070912', surface: '#10142A', lanterne: '#FFD97A', feu: '#FF5A36', givre: '#5EE8FF',
  foudre: '#B98CFF', brume: '#3A3F6B', creature: '#6A70A8', texte: '#E8ECFF',
  manteau: '#1D2A4A', manteauOmbre: '#131C33', peau: '#F1C9A5', bois: '#3A2A22', boisClair: '#6B4A34',
  roche: '#1B2035', rocheClair: '#2E3656', mousse: '#19282C', mousseClair: '#2F5A46', sable: '#1E1E2C', sableClair: '#3A3445',
  eau: '#0B1A2E', eauClair: '#1E4A6E',
};

const DEFS = `<defs>
<filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
<filter id="glowBig" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
<filter id="soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3"/></filter>
<radialGradient id="halo"><stop offset="0" stop-color="${C.lanterne}" stop-opacity=".55"/><stop offset="1" stop-color="${C.lanterne}" stop-opacity="0"/></radialGradient>
<radialGradient id="haloFeu"><stop offset="0" stop-color="${C.feu}" stop-opacity=".6"/><stop offset="1" stop-color="${C.feu}" stop-opacity="0"/></radialGradient>
<radialGradient id="haloGivre"><stop offset="0" stop-color="${C.givre}" stop-opacity=".6"/><stop offset="1" stop-color="${C.givre}" stop-opacity="0"/></radialGradient>
<radialGradient id="haloFoudre"><stop offset="0" stop-color="${C.foudre}" stop-opacity=".6"/><stop offset="1" stop-color="${C.foudre}" stop-opacity="0"/></radialGradient>
<radialGradient id="brumeFill" cx=".5" cy=".4"><stop offset="0" stop-color="${C.creature}" stop-opacity=".95"/><stop offset="1" stop-color="${C.brume}" stop-opacity=".9"/></radialGradient>
</defs>`;

// Générateur pseudo-aléatoire déterministe (mêmes assets à chaque génération).
function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
const TAU = Math.PI * 2;
const f = n => n.toFixed(1);

// Contour fermé ondulant (corps de brume).
function blobPath(cx, cy, rx, ry, phase, amp = 0.12, lobes = 5, tail = 0) {
  let d = '';
  for (let i = 0; i <= 48; i++) {
    const a = (i / 48) * TAU;
    let r = 1 + amp * Math.sin(a * lobes + phase) + amp * 0.5 * Math.sin(a * (lobes + 2) - phase * 1.3);
    let y = Math.sin(a) * ry * r, x = Math.cos(a) * rx * r;
    if (tail && Math.sin(a) > 0) y += tail * Math.sin(a) ** 3 * (0.8 + 0.2 * Math.sin(a * 7 + phase * 2));
    d += (i ? 'L' : 'M') + f(cx + x) + ' ' + f(cy + y);
  }
  return d + 'Z';
}
const shadow = (cx, cy, rx, ry, o = 0.45) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="#000" opacity="${o}" filter="url(#soft)"/>`;

// ---------- Personnage : le gardien ----------
function keeper(frame, n, mode) {
  const t = (frame / n) * TAU;
  const walk = mode === 'walk';
  const bob = walk ? Math.abs(Math.sin(t)) * -3 : Math.sin(t) * 1.2;
  const legA = walk ? Math.sin(t) * 6 : 0, legB = -legA;
  const sway = walk ? Math.sin(t) * 4 : Math.sin(t) * 1.5;
  const flick = 1 + 0.08 * Math.sin(t * 3 + 1);
  const cx = 48, by = 62 + bob;
  const lx = 72 + sway * 0.4, ly = 52 + bob + Math.abs(sway) * 0.3;
  return `
  <circle cx="${f(lx)}" cy="${f(ly)}" r="${f(30 * flick)}" fill="url(#halo)"/>
  ${shadow(cx, 84, 20, 6)}
  <g stroke="${C.manteauOmbre}" stroke-width="6" stroke-linecap="round">
    <line x1="${cx - 6}" y1="${f(by + 10)}" x2="${f(cx - 7 + legA)}" y2="82"/>
    <line x1="${cx + 6}" y1="${f(by + 10)}" x2="${f(cx + 7 + legB)}" y2="82"/>
  </g>
  <g fill="${C.bois}"><ellipse cx="${f(cx - 7 + legA)}" cy="83" rx="5" ry="3"/><ellipse cx="${f(cx + 7 + legB)}" cy="83" rx="5" ry="3"/></g>
  <path d="M${cx - 15} ${f(by - 22)} Q${cx} ${f(by - 30)} ${cx + 15} ${f(by - 22)} L${cx + 19} ${f(by + 12)} Q${cx} ${f(by + 17)} ${cx - 19} ${f(by + 12)} Z" fill="${C.manteau}" stroke="${C.texte}" stroke-opacity=".85" stroke-width="1.6"/>
  <path d="M${cx} ${f(by - 24)} L${cx} ${f(by + 14)}" stroke="${C.manteauOmbre}" stroke-width="2"/>
  <g fill="${C.lanterne}"><circle cx="${cx - 3}" cy="${f(by - 10)}" r="1.4"/><circle cx="${cx - 3}" cy="${f(by - 2)}" r="1.4"/><circle cx="${cx - 3}" cy="${f(by + 6)}" r="1.4"/></g>
  <path d="M${cx - 15} ${f(by - 22)} Q${cx} ${f(by - 14)} ${cx + 15} ${f(by - 22)} L${cx + 13} ${f(by - 17)} Q${cx} ${f(by - 10)} ${cx - 13} ${f(by - 17)} Z" fill="${C.lanterne}" opacity=".9"/>
  <path d="M${cx + 13} ${f(by - 18)} Q${f(lx - 4)} ${f(ly - 10)} ${f(lx)} ${f(ly - 9)}" stroke="${C.manteau}" stroke-width="6" fill="none" stroke-linecap="round"/>
  <path d="M${cx - 14} ${f(by - 18)} Q${cx - 22} ${f(by - 6)} ${cx - 19} ${f(by + 2 - sway * 0.5)}" stroke="${C.manteau}" stroke-width="6" fill="none" stroke-linecap="round"/>
  <circle cx="${cx}" cy="${f(by - 32)}" r="11" fill="${C.peau}" stroke="${C.texte}" stroke-width="1.2"/>
  <path d="M${cx - 13} ${f(by - 34)} Q${cx} ${f(by - 52)} ${cx + 13} ${f(by - 34)} Z" fill="${C.manteauOmbre}" stroke="${C.texte}" stroke-width="1.2"/>
  <rect x="${cx - 15}" y="${f(by - 36)}" width="30" height="4" rx="2" fill="${C.manteauOmbre}" stroke="${C.texte}" stroke-width="1"/>
  <rect x="${cx - 3}" y="${f(by - 45)}" width="6" height="3" rx="1" fill="${C.lanterne}"/>
  <g fill="${C.nuit}"><circle cx="${cx - 4}" cy="${f(by - 30)}" r="1.6"/><circle cx="${cx + 4}" cy="${f(by - 30)}" r="1.6"/></g>
  <path d="M${cx - 8} ${f(by - 26)} Q${cx} ${f(by - 22)} ${cx + 8} ${f(by - 26)}" stroke="#C9A182" stroke-width="2" fill="none"/>
  <g transform="translate(${f(lx)} ${f(ly)}) rotate(${f(sway * 2)})">
    <line x1="0" y1="-12" x2="0" y2="-8" stroke="${C.texte}" stroke-width="1.5"/>
    <path d="M-5 -8 L5 -8 L6 6 L-6 6 Z" fill="${C.surface}" stroke="${C.lanterne}" stroke-width="1.5"/>
    <rect x="-3.2" y="-5" width="6.4" height="9" rx="1.5" fill="${C.lanterne}" filter="url(#glowBig)" opacity="${f(0.85 + 0.15 * Math.sin(t * 3))}"/>
    <path d="M-7 6 L7 6 L5 9 L-5 9 Z" fill="${C.bois}"/>
  </g>`;
}

// ---------- Créatures de brume ----------
function wisp(frame, n) { // « Brumeux » : petit, lent, nombreux
  const t = (frame / n) * TAU, y = 30 + Math.sin(t) * 2;
  return `${shadow(32, 54, 13, 4, .35)}
  <path d="${blobPath(32, y, 15, 13, t, .1, 4, 9)}" fill="url(#brumeFill)" stroke="${C.creature}" stroke-width="1.6" filter="url(#glow)"/>
  <path d="${blobPath(30, y - 4, 7, 5, -t, .15, 3)}" fill="${C.texte}" opacity=".08"/>
  <g fill="${C.givre}" filter="url(#glow)"><ellipse cx="26" cy="${f(y - 2)}" rx="2.6" ry="${f(3 - Math.max(0, Math.sin(t * 2 - 2)) * 2.4)}"/><ellipse cx="38" cy="${f(y - 2)}" rx="2.6" ry="${f(3 - Math.max(0, Math.sin(t * 2 - 2)) * 2.4)}"/></g>`;
}
function prowler(frame, n) { // « Rôdeur » : massif, griffes
  const t = (frame / n) * TAU, y = 44 + Math.sin(t) * 1.5, arm = Math.sin(t) * 5;
  return `${shadow(48, 80, 26, 6, .4)}
  <path d="M22 ${f(y)} Q8 ${f(y + 10 + arm)} 12 ${f(y + 26 + arm)}" stroke="${C.creature}" stroke-width="6" fill="none" stroke-linecap="round" filter="url(#glow)"/>
  <path d="M74 ${f(y)} Q88 ${f(y + 10 - arm)} 84 ${f(y + 26 - arm)}" stroke="${C.creature}" stroke-width="6" fill="none" stroke-linecap="round" filter="url(#glow)"/>
  <g stroke="${C.texte}" stroke-width="1.6" stroke-linecap="round"><path d="M10 ${f(y + 26 + arm)} l-3 5 M13 ${f(y + 27 + arm)} l0 6 M16 ${f(y + 26 + arm)} l3 5"/><path d="M86 ${f(y + 26 - arm)} l3 5 M83 ${f(y + 27 - arm)} l0 6 M80 ${f(y + 26 - arm)} l-3 5"/></g>
  <path d="${blobPath(48, y, 28, 24, t, .08, 6, 12)}" fill="url(#brumeFill)" stroke="${C.creature}" stroke-width="2" filter="url(#glow)"/>
  <path d="M30 ${f(y - 18)} L26 ${f(y - 32)} L36 ${f(y - 22)} M66 ${f(y - 18)} L70 ${f(y - 32)} L60 ${f(y - 22)}" fill="${C.brume}" stroke="${C.creature}" stroke-width="1.5"/>
  <g fill="${C.feu}" filter="url(#glow)"><path d="M34 ${f(y - 6)} l8 3 l-8 2 Z"/><path d="M62 ${f(y - 6)} l-8 3 l8 2 Z"/></g>
  <path d="M38 ${f(y + 8)} Q48 ${f(y + 14 + Math.sin(t * 2) * 2)} 58 ${f(y + 8)}" stroke="${C.nuit}" stroke-width="3" fill="none"/>
  <g fill="${C.texte}"><path d="M41 ${f(y + 9)} l2 4 l2 -3.5 Z"/><path d="M51 ${f(y + 9.5)} l2 4 l2 -4 Z"/></g>`;
}
function wraith(frame, n) { // « Spectre » : rapide, allongé
  const t = (frame / n) * TAU, y = 26 + Math.sin(t) * 2;
  let tendrils = '';
  for (let i = 0; i < 4; i++) { const x = 22 + i * 7, w = Math.sin(t + i) * 5; tendrils += `<path d="M${x} ${f(y + 8)} Q${f(x + w)} ${f(y + 22)} ${f(x - w * 0.6)} ${f(y + 34)}" stroke="${C.creature}" stroke-width="2.4" fill="none" stroke-linecap="round" opacity=".85"/>`; }
  return `${shadow(32, 58, 12, 3.5, .3)}<g filter="url(#glow)">${tendrils}</g>
  <path d="${blobPath(32, y, 13, 15, t, .12, 3, 4)}" fill="url(#brumeFill)" stroke="${C.foudre}" stroke-opacity=".7" stroke-width="1.6" filter="url(#glow)"/>
  <path d="M24 ${f(y - 4)} L30 ${f(y - 1)} M40 ${f(y - 4)} L34 ${f(y - 1)}" stroke="${C.foudre}" stroke-width="2.4" stroke-linecap="round" filter="url(#glow)"/>
  <ellipse cx="32" cy="${f(y + 6)}" rx="3" ry="${f(4 + Math.sin(t * 2) * 1.5)}" fill="${C.nuit}"/>`;
}
function boss(frame, n) { // « La Marée » : boss de fin de nuit
  const t = (frame / n) * TAU, cx = 128, cy = 118 + Math.sin(t) * 3;
  let arms = '';
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU + 0.3, w = Math.sin(t + i * 1.7) * 14;
    const x1 = cx + Math.cos(a) * 60, y1 = cy + Math.sin(a) * 46, x2 = cx + Math.cos(a) * 112, y2 = cy + Math.sin(a) * 96;
    arms += `<path d="M${f(x1)} ${f(y1)} Q${f((x1 + x2) / 2 + w)} ${f((y1 + y2) / 2 - w)} ${f(x2)} ${f(y2)}" stroke="${C.creature}" stroke-width="10" fill="none" stroke-linecap="round"/>
    <circle cx="${f(x2)}" cy="${f(y2)}" r="4" fill="${C.feu}" filter="url(#glow)"/>`;
  }
  const eyes = [[-28, -14, 7], [28, -14, 7], [0, -30, 9], [-14, 6, 5], [14, 6, 5]].map(([x, y, r], i) => {
    const o = Math.max(0.15, 1 - Math.max(0, Math.sin(t * 2 + i * 1.3)) * 0.9);
    return `<ellipse cx="${f(cx + x)}" cy="${f(cy + y)}" rx="${r}" ry="${f(r * o)}" fill="${C.feu}"/><circle cx="${f(cx + x)}" cy="${f(cy + y)}" r="${f(r * 0.35 * o)}" fill="${C.lanterne}"/>`;
  }).join('');
  let crown = '';
  for (let i = 0; i < 7; i++) { const x = cx - 54 + i * 18, h = 26 + (i % 2) * 14 + Math.sin(t + i) * 4; crown += `<path d="M${x - 8} ${f(cy - 48)} L${x} ${f(cy - 48 - h)} L${x + 8} ${f(cy - 48)} Z" fill="${C.brume}" stroke="${C.foudre}" stroke-width="1.6"/>`; }
  return `${shadow(cx, 228, 90, 18, .5)}
  <circle cx="${cx}" cy="${f(cy)}" r="120" fill="url(#haloFeu)" opacity=".35"/>
  <g filter="url(#glow)">${arms}</g>
  <g filter="url(#glow)">${crown}</g>
  <path d="${blobPath(cx, cy, 72, 60, t, .07, 7, 22)}" fill="url(#brumeFill)" stroke="${C.creature}" stroke-width="3" filter="url(#glow)"/>
  <path d="${blobPath(cx, cy - 6, 52, 40, -t, .1, 5)}" fill="${C.brume}" opacity=".6"/>
  <g filter="url(#glow)">${eyes}</g>
  <path d="M${cx - 30} ${f(cy + 26)} Q${cx} ${f(cy + 44 + Math.sin(t * 2) * 6)} ${cx + 30} ${f(cy + 26)}" stroke="${C.nuit}" stroke-width="6" fill="none"/>`;
}

// ---------- Effets ----------
const ELEM = { feu: [C.feu, 'haloFeu', '#FFB25C'], givre: [C.givre, 'haloGivre', '#E8FBFF'], foudre: [C.foudre, 'haloFoudre', '#F1E6FF'] };
function projectile(el) {
  const [c, h, core] = ELEM[el];
  return (frame, n) => {
    const t = (frame / n) * TAU, s = 1 + 0.12 * Math.sin(t);
    if (el === 'feu') return `<circle cx="16" cy="16" r="15" fill="url(#${h})"/><path d="M4 16 Q10 ${f(10 + Math.sin(t) * 2)} 18 9 Q28 12 27 16 Q28 20 18 23 Q10 ${f(22 - Math.sin(t) * 2)} 4 16Z" fill="${c}" filter="url(#glow)"/><circle cx="20" cy="16" r="${f(4 * s)}" fill="${core}"/>`;
    if (el === 'givre') return `<circle cx="16" cy="16" r="15" fill="url(#${h})"/><g transform="rotate(${f(frame * 22.5)} 16 16)" filter="url(#glow)"><path d="M16 4 L20 16 L16 28 L12 16 Z M4 16 L16 12 L28 16 L16 20 Z" fill="${c}"/></g><circle cx="16" cy="16" r="${f(3 * s)}" fill="${core}"/>`;
    const r = rng(frame + 7); let d = 'M4 16'; for (let i = 1; i <= 5; i++) d += ` L${4 + i * 5} ${f(16 + (r() - 0.5) * 12)}`;
    return `<circle cx="16" cy="16" r="15" fill="url(#${h})"/><path d="${d}" stroke="${core}" stroke-width="2" fill="none" filter="url(#glow)"/><path d="${d}" stroke="${c}" stroke-width="4" fill="none" opacity=".6" filter="url(#glow)"/><circle cx="28" cy="16" r="${f(3.5 * s)}" fill="${core}" filter="url(#glow)"/>`;
  };
}
function impact(el) {
  const [c, h, core] = ELEM[el];
  return (frame, n) => {
    const p = frame / (n - 1), r = rng(el.length * 31);
    let sparks = '';
    for (let i = 0; i < 10; i++) { const a = r() * TAU, d1 = 6 + p * 22, d2 = d1 + 6 * (1 - p); sparks += `<line x1="${f(32 + Math.cos(a) * d1)}" y1="${f(32 + Math.sin(a) * d1)}" x2="${f(32 + Math.cos(a) * d2)}" y2="${f(32 + Math.sin(a) * d2)}" stroke="${i % 3 ? c : core}" stroke-width="2.4" stroke-linecap="round"/>`; }
    return `<g opacity="${f(1 - p * 0.9)}"><circle cx="32" cy="32" r="${f(10 + p * 20)}" fill="url(#${h})"/><circle cx="32" cy="32" r="${f(4 + p * 18)}" fill="none" stroke="${c}" stroke-width="${f(3 * (1 - p) + 0.5)}" filter="url(#glow)"/><g filter="url(#glow)">${sparks}</g><circle cx="32" cy="32" r="${f(7 * (1 - p))}" fill="${core}"/></g>`;
  };
}
function puff(frame, n) { // dissipation d'une créature
  const p = frame / (n - 1), r = rng(99); let s = '';
  for (let i = 0; i < 9; i++) { const a = r() * TAU, d = 4 + p * 22 * (0.6 + r() * 0.6); s += `<circle cx="${f(32 + Math.cos(a) * d)}" cy="${f(32 + Math.sin(a) * d - p * 6)}" r="${f((5 + r() * 5) * (1 - p * 0.6))}" fill="${C.creature}"/>`; }
  return `<g opacity="${f(0.9 * (1 - p))}" filter="url(#glow)">${s}</g>`;
}
function shard(frame, n) { // éclat de lumière (expérience)
  const t = (frame / n) * TAU, s = 1 + 0.15 * Math.sin(t);
  return `<circle cx="12" cy="12" r="11" fill="url(#halo)"/><g transform="translate(12 12) scale(${f(s)}) rotate(${f(frame * 15)})"><path d="M0 -7 L4 0 L0 7 L-4 0 Z" fill="${C.lanterne}" filter="url(#glow)"/><path d="M0 -7 L4 0 L0 0 Z" fill="#FFF3CF"/></g>`;
}

// ---------- Tuiles 64×64 ----------
function tileBase(fill, seed, dots, dotColor, lines = 0, lineColor = '') {
  const r = rng(seed); let s = `<rect width="64" height="64" fill="${fill}"/>`;
  for (let i = 0; i < dots; i++) s += `<circle cx="${f(r() * 64)}" cy="${f(r() * 64)}" r="${f(0.6 + r() * 1.6)}" fill="${dotColor}" opacity="${f(0.3 + r() * 0.5)}"/>`;
  for (let i = 0; i < lines; i++) { const x = r() * 64, y = r() * 64, a = r() * TAU, l = 4 + r() * 8; s += `<line x1="${f(x)}" y1="${f(y)}" x2="${f(x + Math.cos(a) * l)}" y2="${f(y + Math.sin(a) * l)}" stroke="${lineColor}" stroke-width="1" opacity=".6" stroke-linecap="round"/>`; }
  return s;
}
const TILES = [
  ['roche_1', () => tileBase(C.roche, 1, 18, C.rocheClair, 6, C.rocheClair)],
  ['roche_2', () => tileBase(C.roche, 2, 10, C.rocheClair, 3, C.rocheClair) + `<path d="M10 40 L22 30 L34 36 L30 48 L16 50Z" fill="${C.rocheClair}" opacity=".5"/>`],
  ['roche_3', () => tileBase(C.roche, 3, 22, C.rocheClair, 8, C.brume) + `<path d="M40 8 L52 14 L50 24 L38 22Z" fill="${C.rocheClair}" opacity=".45"/>`],
  ['mousse_1', () => tileBase(C.mousse, 4, 26, C.mousseClair, 10, C.mousseClair)],
  ['mousse_2', () => tileBase(C.mousse, 5, 14, C.mousseClair, 4, C.mousseClair) + `<g stroke="${C.mousseClair}" stroke-width="1.4" stroke-linecap="round"><path d="M20 44 l-3 -8 M22 44 l0 -10 M24 44 l3 -8"/><path d="M44 22 l-3 -7 M46 22 l0 -9 M48 22 l3 -7"/></g>`],
  ['sable_1', () => tileBase(C.sable, 6, 40, C.sableClair)],
  ['sable_2', () => tileBase(C.sable, 7, 24, C.sableClair) + `<ellipse cx="22" cy="40" rx="5" ry="3.5" fill="${C.sableClair}"/><ellipse cx="44" cy="20" rx="3" ry="2" fill="${C.sableClair}"/>`],
  ['planches_1', () => { let s = `<rect width="64" height="64" fill="${C.bois}"/>`; for (let i = 0; i < 4; i++) s += `<rect x="0" y="${i * 16}" width="64" height="15" fill="${i % 2 ? C.bois : '#33251E'}"/><line x1="0" y1="${i * 16 + 15.5}" x2="64" y2="${i * 16 + 15.5}" stroke="${C.nuit}" stroke-width="1"/><circle cx="${6 + (i % 2) * 50}" cy="${i * 16 + 8}" r="1.3" fill="${C.boisClair}"/>`; return s; }],
  ['planches_2', () => { let s = `<rect width="64" height="64" fill="${C.nuit}"/>`; for (let i = 0; i < 4; i++) if (i !== 2) s += `<rect x="0" y="${i * 16}" width="64" height="15" fill="${C.bois}"/><circle cx="${6 + (i % 2) * 50}" cy="${i * 16 + 8}" r="1.3" fill="${C.boisClair}"/>`; return s + `<rect x="0" y="32" width="40" height="15" fill="#33251E" transform="rotate(4 0 32)"/>`; }],
  ['pave_1', () => { let s = `<rect width="64" height="64" fill="${C.nuit}"/>`; const r = rng(8); for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) s += `<rect x="${x * 16 + 1 + ((y % 2) * 8) % 16}" y="${y * 16 + 1}" width="14" height="14" rx="3" fill="${r() > .5 ? C.roche : C.rocheClair}" opacity="${f(.7 + r() * .3)}"/>`; return s; }],
  ['eau_1', () => tileBase(C.eau, 9, 0, '') + `<path d="M4 20 q8 -4 16 0 t16 0 M28 44 q8 -4 16 0 t16 0" stroke="${C.eauClair}" stroke-width="1.6" fill="none" stroke-linecap="round"/>`],
  ['eau_2', () => tileBase(C.eau, 10, 0, '') + `<path d="M12 30 q8 -4 16 0 t16 0" stroke="${C.eauClair}" stroke-width="1.6" fill="none" stroke-linecap="round"/><circle cx="50" cy="52" r="1.4" fill="${C.givre}" opacity=".6"/>`],
  ['falaise_bord', () => tileBase(C.roche, 11, 12, C.rocheClair) + `<path d="M0 44 L10 40 L20 46 L32 41 L44 47 L54 42 L64 45 L64 64 L0 64Z" fill="${C.nuit}"/><path d="M0 44 L10 40 L20 46 L32 41 L44 47 L54 42 L64 45" stroke="${C.givre}" stroke-opacity=".35" stroke-width="1.4" fill="none"/>`],
  ['sable_eau_bord', () => tileBase(C.sable, 12, 20, C.sableClair) + `<path d="M0 40 Q16 34 32 40 T64 40 L64 64 L0 64Z" fill="${C.eau}"/><path d="M0 40 Q16 34 32 40 T64 40" stroke="${C.texte}" stroke-opacity=".5" stroke-width="1.6" fill="none"/>`],
  ['herbe_haute', () => tileBase(C.mousse, 13, 8, C.mousseClair) + Array.from({ length: 7 }, (_, i) => `<path d="M${6 + i * 9} 60 Q${4 + i * 9} 40 ${10 + i * 9} ${24 + (i % 3) * 6}" stroke="${C.mousseClair}" stroke-width="2" fill="none" stroke-linecap="round"/>`).join('')],
  ['vide', () => `<rect width="64" height="64" fill="${C.nuit}"/>`],
];

// ---------- Décors ----------
const PROPS = [
  ['phare', 192, 384, () => `
    ${shadow(96, 372, 70, 10)}
    <circle cx="96" cy="70" r="90" fill="url(#halo)"/>
    <path d="M60 360 L74 120 L118 120 L132 360 Z" fill="${C.surface}" stroke="${C.texte}" stroke-opacity=".8" stroke-width="2"/>
    <path d="M68 300 L124 300 L127 330 L65 330Z M71 220 L121 220 L123 250 L69 250Z M73 150 L119 150 L120 175 L72 175Z" fill="${C.feu}" opacity=".75"/>
    <rect x="86" y="318" width="20" height="42" rx="10" fill="${C.nuit}" stroke="${C.bois}" stroke-width="3"/>
    <rect x="90" y="196" width="12" height="18" rx="6" fill="${C.lanterne}" filter="url(#glow)" opacity=".8"/>
    <rect x="64" y="108" width="64" height="12" fill="${C.manteauOmbre}" stroke="${C.texte}" stroke-width="1.5"/>
    <path d="M58 108 L134 108" stroke="${C.texte}" stroke-width="2"/>
    <g stroke="${C.texte}" stroke-width="1.2">${[66, 78, 90, 102, 114, 126].map(x => `<line x1="${x}" y1="96" x2="${x}" y2="108"/>`).join('')}</g>
    <rect x="74" y="66" width="44" height="42" fill="${C.nuit}" stroke="${C.texte}" stroke-width="2"/>
    <rect x="80" y="72" width="32" height="32" rx="4" fill="${C.lanterne}" filter="url(#glowBig)"/>
    <path d="M70 66 L96 36 L122 66Z" fill="${C.feu}" stroke="${C.texte}" stroke-width="2"/>
    <line x1="96" y1="36" x2="96" y2="22" stroke="${C.texte}" stroke-width="2"/><circle cx="96" cy="20" r="3" fill="${C.lanterne}" filter="url(#glow)"/>`],
  ['rocher_grand', 128, 96, () => `${shadow(64, 84, 54, 9)}<path d="M14 80 L22 44 L46 22 L80 18 L106 38 L116 76 Z" fill="${C.roche}" stroke="${C.rocheClair}" stroke-width="2"/><path d="M46 22 L54 50 L22 44 M80 18 L76 52 L106 38 M54 50 L76 52 L84 80 M54 50 L40 80" stroke="${C.rocheClair}" stroke-width="1.4" fill="none"/><path d="M46 22 L80 18 L76 52 L54 50Z" fill="${C.rocheClair}" opacity=".5"/><path d="M22 44 L46 22 L80 18 L106 38" stroke="${C.givre}" stroke-opacity=".35" stroke-width="1.5" fill="none"/>`],
  ['rocher_petit', 64, 48, () => `${shadow(32, 42, 24, 5)}<path d="M8 40 L14 20 L32 12 L50 18 L56 40Z" fill="${C.roche}" stroke="${C.rocheClair}" stroke-width="1.6"/><path d="M14 20 L32 12 L34 28Z" fill="${C.rocheClair}" opacity=".5"/>`],
  ['arbre_mort', 128, 160, () => `${shadow(64, 150, 34, 7)}<path d="M58 150 L60 90 L44 60 L30 44 M60 90 L76 64 L98 46 L110 40 M76 64 L80 36 M44 60 L48 30 M98 46 L104 24" stroke="${C.bois}" stroke-width="7" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M58 150 L60 90 L44 60 L30 44 M60 90 L76 64 L98 46 L110 40 M76 64 L80 36 M44 60 L48 30 M98 46 L104 24" stroke="${C.creature}" stroke-opacity=".35" stroke-width="1.4" fill="none" stroke-linecap="round"/><path d="M50 150 Q58 140 70 150" fill="${C.bois}"/>`],
  ['barque', 128, 80, () => `${shadow(64, 70, 54, 8)}<path d="M10 34 Q64 28 118 34 L106 60 Q64 68 22 60 Z" fill="${C.bois}" stroke="${C.boisClair}" stroke-width="2"/><path d="M18 40 Q64 36 110 40" stroke="${C.boisClair}" stroke-width="1.4" fill="none"/><line x1="40" y1="36" x2="44" y2="62" stroke="${C.nuit}" stroke-width="3"/><line x1="84" y1="36" x2="80" y2="62" stroke="${C.nuit}" stroke-width="3"/><path d="M60 44 L96 10 L100 14 L66 48Z" fill="${C.boisClair}"/>`],
  ['caisse', 64, 64, () => `${shadow(32, 58, 24, 5)}<rect x="10" y="14" width="44" height="42" rx="2" fill="${C.bois}" stroke="${C.boisClair}" stroke-width="2"/><path d="M10 14 L54 56 M54 14 L10 56" stroke="${C.boisClair}" stroke-width="2"/><rect x="10" y="14" width="44" height="6" fill="${C.boisClair}" opacity=".7"/>`],
  ['tonneau', 64, 64, () => `${shadow(32, 58, 18, 4)}<path d="M16 14 Q12 34 16 54 L48 54 Q52 34 48 14 Z" fill="${C.bois}" stroke="${C.boisClair}" stroke-width="2"/><ellipse cx="32" cy="14" rx="16" ry="5" fill="#33251E" stroke="${C.boisClair}" stroke-width="2"/><path d="M14 26 Q32 30 50 26 M14 42 Q32 46 50 42" stroke="${C.rocheClair}" stroke-width="3" fill="none"/>`],
  ['brasero', 64, 96, () => `<circle cx="32" cy="30" r="30" fill="url(#halo)"/>${shadow(32, 90, 16, 4)}<path d="M26 40 L22 88 M38 40 L42 88 M24 70 L40 70" stroke="${C.rocheClair}" stroke-width="3"/><path d="M14 34 L50 34 L44 44 L20 44 Z" fill="${C.surface}" stroke="${C.lanterne}" stroke-width="1.6"/><path d="M20 34 Q22 18 30 10 Q30 22 36 16 Q44 24 44 34 Z" fill="${C.feu}" filter="url(#glow)"/><path d="M26 34 Q28 24 32 20 Q36 26 38 34Z" fill="${C.lanterne}"/>`],
  ['ruine_mur', 192, 96, () => `${shadow(96, 88, 86, 8)}${Array.from({ length: 4 }, (_, row) => Array.from({ length: 6 - (row > 1 ? row - 1 : 0) }, (_, i) => `<rect x="${8 + i * 30 + (row % 2) * 14}" y="${70 - row * 18}" width="28" height="16" rx="2" fill="${C.roche}" stroke="${C.rocheClair}" stroke-width="1.4"/>`).join('')).join('')}<path d="M120 28 l10 -8 l6 10" stroke="${C.mousseClair}" stroke-width="2" fill="none"/>`],
  ['lanterne_sol', 32, 48, () => `<circle cx="16" cy="22" r="16" fill="url(#halo)"/>${shadow(16, 44, 9, 3)}<path d="M10 14 L22 14 L24 40 L8 40 Z" fill="${C.surface}" stroke="${C.lanterne}" stroke-width="1.4"/><rect x="12.5" y="18" width="7" height="16" rx="2" fill="${C.lanterne}" filter="url(#glowBig)"/><path d="M12 14 Q16 6 20 14" stroke="${C.texte}" stroke-width="1.4" fill="none"/>`],
  ['touffe_herbe', 32, 32, () => `<g stroke="${C.mousseClair}" stroke-width="2" fill="none" stroke-linecap="round"><path d="M8 30 Q6 18 4 10"/><path d="M14 30 Q14 16 16 6"/><path d="M20 30 Q22 18 26 12"/><path d="M26 30 Q28 22 30 18"/></g>`],
  ['ossements', 64, 32, () => `<g stroke="${C.texte}" stroke-opacity=".65" stroke-width="3" stroke-linecap="round"><line x1="10" y1="22" x2="34" y2="12"/><line x1="30" y1="24" x2="54" y2="20"/></g><circle cx="48" cy="12" r="6" fill="${C.texte}" opacity=".6"/><circle cx="46" cy="11" r="1.4" fill="${C.nuit}"/><circle cx="50" cy="11" r="1.4" fill="${C.nuit}"/>`],
];

// ---------- Icônes UI 48×48 ----------
const ICONS = [
  ['flamme_feu', () => `<circle cx="24" cy="24" r="22" fill="url(#haloFeu)"/><path d="M24 6 Q34 18 34 28 Q34 40 24 42 Q14 40 14 28 Q14 22 20 16 Q20 24 24 26 Q22 16 24 6Z" fill="${C.feu}" filter="url(#glow)"/><path d="M24 26 Q30 30 28 36 Q24 40 20 36 Q20 30 24 26Z" fill="${C.lanterne}"/>`],
  ['flamme_givre', () => `<circle cx="24" cy="24" r="22" fill="url(#haloGivre)"/><g stroke="${C.givre}" stroke-width="3" stroke-linecap="round" filter="url(#glow)">${[0, 60, 120].map(a => `<line x1="24" y1="8" x2="24" y2="40" transform="rotate(${a} 24 24)"/>`).join('')}</g><circle cx="24" cy="24" r="4" fill="#E8FBFF"/>`],
  ['flamme_foudre', () => `<circle cx="24" cy="24" r="22" fill="url(#haloFoudre)"/><path d="M28 4 L12 26 L22 26 L18 44 L36 20 L26 20 Z" fill="${C.foudre}" stroke="#F1E6FF" stroke-width="1.5" filter="url(#glow)"/>`],
  ['coeur', () => `<path d="M24 40 L8 24 Q2 14 12 9 Q20 6 24 14 Q28 6 36 9 Q46 14 40 24 Z" fill="${C.feu}" stroke="${C.texte}" stroke-width="2" filter="url(#glow)"/>`],
  ['lanterne', () => `<circle cx="24" cy="26" r="22" fill="url(#halo)"/><path d="M16 14 L32 14 L34 40 L14 40 Z" fill="${C.surface}" stroke="${C.lanterne}" stroke-width="2"/><rect x="19" y="19" width="10" height="16" rx="3" fill="${C.lanterne}" filter="url(#glowBig)"/><path d="M18 14 Q24 4 30 14" stroke="${C.texte}" stroke-width="2" fill="none"/>`],
  ['eclat', () => `<circle cx="24" cy="24" r="20" fill="url(#halo)"/><path d="M24 8 L32 24 L24 40 L16 24 Z" fill="${C.lanterne}" filter="url(#glow)"/><path d="M24 8 L32 24 L24 24Z" fill="#FFF3CF"/>`],
  ['crane', () => `<path d="M24 6 Q40 6 40 22 Q40 30 34 32 L34 40 L14 40 L14 32 Q8 30 8 22 Q8 6 24 6Z" fill="${C.texte}" opacity=".9"/><circle cx="17" cy="22" r="4.5" fill="${C.nuit}"/><circle cx="31" cy="22" r="4.5" fill="${C.nuit}"/><path d="M20 40 L20 34 M24 40 L24 34 M28 40 L28 34" stroke="${C.nuit}" stroke-width="2"/>`],
];

// ---------- Rendu ----------
const SHEETS = [
  ['sprites/gardien_idle', 96, 96, 4, (i, n) => keeper(i, n, 'idle')],
  ['sprites/gardien_marche', 96, 96, 6, (i, n) => keeper(i, n, 'walk')],
  ['sprites/brumeux', 64, 64, 4, wisp],
  ['sprites/rodeur', 96, 96, 4, prowler],
  ['sprites/spectre', 64, 64, 4, wraith],
  ['sprites/boss_maree', 256, 256, 4, boss],
  ['fx/projectile_feu', 32, 32, 4, projectile('feu')],
  ['fx/projectile_givre', 32, 32, 4, projectile('givre')],
  ['fx/projectile_foudre', 32, 32, 4, projectile('foudre')],
  ['fx/impact_feu', 64, 64, 6, impact('feu')],
  ['fx/impact_givre', 64, 64, 6, impact('givre')],
  ['fx/impact_foudre', 64, 64, 6, impact('foudre')],
  ['fx/dissipation', 64, 64, 6, puff],
  ['fx/eclat_lumiere', 24, 24, 4, shard],
];

const svgDoc = (w, h, body) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${DEFS}${body}</svg>`;

const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 1 });
async function render(file, w, h, svg, scale = 1) {
  mkdirSync(join(OUT, file.split('/').slice(0, -1).join('/')), { recursive: true });
  writeFileSync(join(OUT, file + '.svg'), svg);
  await page.setViewportSize({ width: w * scale, height: h * scale });
  await page.setContent(`<html><body style="margin:0;background:transparent">${svg.replace('<svg ', `<svg style="display:block;width:${w * scale}px;height:${h * scale}px" `)}</body></html>`);
  await page.screenshot({ path: join(OUT, file + '.png'), omitBackground: true, clip: { x: 0, y: 0, width: w * scale, height: h * scale } });
}

const manifest = { style: 'Phare Vectoriel', palette: C, spritesheets: [], tiles: { file: 'tiles/tileset.png', tileSize: 64, columns: 8, names: [] }, props: [], icons: [] };

for (const [name, fw, fh, n, fn] of SHEETS) {
  let body = '';
  for (let i = 0; i < n; i++) body += `<g transform="translate(${i * fw} 0)"><svg width="${fw}" height="${fh}" viewBox="0 0 ${fw} ${fh}" overflow="hidden">${fn(i, n)}</svg></g>`;
  await render(name, fw * n, fh, svgDoc(fw * n, fh, body));
  manifest.spritesheets.push({ key: name.split('/')[1], file: name + '.png', frameWidth: fw, frameHeight: fh, frames: n });
}

// Tileset : 8 colonnes, ordre = index Tiled (firstgid 1).
const cols = 8, rows = Math.ceil(TILES.length / cols);
let tb = '';
TILES.forEach(([name, fn], i) => { tb += `<g transform="translate(${(i % cols) * 64} ${Math.floor(i / cols) * 64})"><svg width="64" height="64" viewBox="0 0 64 64">${fn()}</svg></g>`; manifest.tiles.names.push(name); });
await render('tiles/tileset', cols * 64, rows * 64, svgDoc(cols * 64, rows * 64, tb));

for (const [name, w, h, fn] of PROPS) { await render('props/' + name, w, h, svgDoc(w, h, fn())); manifest.props.push({ key: name, file: `props/${name}.png`, width: w, height: h }); }
for (const [name, fn] of ICONS) { await render('ui/' + name, 48, 48, svgDoc(48, 48, fn())); manifest.icons.push({ key: name, file: `ui/${name}.png`, size: 48 }); }

// Aperçu d'une scène « Falaise du Phare » (maquette de référence, pas une carte jouable).
{
  const W = 1280, H = 720, r = rng(2024), tileFn = Object.fromEntries(TILES);
  let s = `<rect width="${W}" height="${H}" fill="${C.nuit}"/>`;
  for (let y = 0; y < H / 64; y++) for (let x = 0; x < W / 64; x++) {
    let k;
    if (x > 15 - (y % 3 === 0 ? 1 : 0)) k = x === 16 - (y % 3 === 0 ? 1 : 0) ? 'sable_eau_bord' : 'eau_' + (1 + ((x + y) % 2));
    else if (y > 9) k = 'falaise_bord';
    else if (x > 8 && x < 11 && y > 6) k = 'pave_1';
    else { const nz = Math.sin(x * 0.55 + 1.3) + Math.cos(y * 0.7 + x * 0.2) + Math.sin((x + y) * 0.3); k = nz > 0.9 ? 'mousse_' + (1 + Math.floor(r() * 2)) : nz < -0.8 ? 'sable_' + (1 + Math.floor(r() * 2)) : 'roche_' + (1 + Math.floor(r() * 3)); if (nz > 1.6 && r() < .4) k = 'herbe_haute'; }
    if (y === 10 && x > 15) k = 'eau_1';
    s += `<g transform="translate(${x * 64} ${y * 64})"><svg width="64" height="64" viewBox="0 0 64 64">${tileFn[k]()}</svg></g>`;
  }
  const P = Object.fromEntries(PROPS.map(p => [p[0], p]));
  const put = (k, x, y) => { const [, w, h, fn] = P[k]; s += `<g transform="translate(${x} ${y})"><svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" overflow="visible">${fn()}</svg></g>`; };
  put('phare', 120, 20); put('ruine_mur', 380, 70); put('arbre_mort', 820, 60); put('rocher_grand', 520, 420); put('rocher_petit', 300, 520);
  put('barque', 1100, 500); put('caisse', 700, 260); put('tonneau', 760, 280); put('brasero', 560, 300); put('ossements', 980, 360);
  put('touffe_herbe', 420, 300); put('touffe_herbe', 880, 520); put('lanterne_sol', 340, 380); put('lanterne_sol', 900, 250);
  const spr = (fn, w, h, x, y, i = 0, n = 4) => { s += `<g transform="translate(${x} ${y})"><svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" overflow="visible">${fn(i, n)}</svg></g>`; };
  spr((i, n) => keeper(i, n, 'walk'), 96, 96, 600, 360, 1, 6);
  spr(wisp, 64, 64, 820, 400, 0); spr(wisp, 64, 64, 450, 430, 2); spr(wisp, 64, 64, 760, 520, 1); spr(prowler, 96, 96, 880, 430, 1); spr(wraith, 64, 64, 520, 230, 3);
  spr(projectile('feu'), 32, 32, 700, 410, 0); spr(projectile('givre'), 32, 32, 640, 300, 1); spr(impact('foudre'), 64, 64, 790, 400, 2, 6);
  // Obscurité : la lanterne découpe un cercle de lumière.
  s += `<defs><radialGradient id="nuitMask" cx="${(672 / W).toFixed(3)}" cy="${(412 / H).toFixed(3)}" r="0.42" gradientTransform="translate(${(672 / W).toFixed(3)} ${(412 / H).toFixed(3)}) scale(${(H / W).toFixed(3)} 1) translate(-${(672 / W).toFixed(3)} -${(412 / H).toFixed(3)})"><stop offset=".45" stop-color="${C.nuit}" stop-opacity="0"/><stop offset=".8" stop-color="${C.nuit}" stop-opacity=".78"/><stop offset="1" stop-color="${C.nuit}" stop-opacity=".9"/></radialGradient></defs>
  <rect width="${W}" height="${H}" fill="url(#nuitMask)"/><circle cx="216" cy="110" r="120" fill="url(#halo)" opacity=".6"/>`;
  s += `<g font-family="Chakra Petch, sans-serif" font-weight="700"><text x="28" y="44" fill="${C.lanterne}" font-size="22" letter-spacing="2">NUIT 07</text><text x="${W - 28}" y="44" fill="${C.givre}" font-size="22" text-anchor="end">◆ 1 284</text></g>
  <rect x="28" y="62" width="220" height="10" rx="5" fill="${C.surface}" stroke="${C.lanterne}" stroke-opacity=".6"/><rect x="30" y="64" width="150" height="6" rx="3" fill="${C.lanterne}"/>`;
  await render('preview/falaise_du_phare_maquette', W, H, svgDoc(W, H, s));
}

writeFileSync(join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2));
await browser.close();
console.log('ok', manifest.spritesheets.length, 'sheets,', TILES.length, 'tiles,', PROPS.length, 'props,', ICONS.length, 'icons');
