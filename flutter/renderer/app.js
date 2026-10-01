'use strict';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const NS = 'http://www.w3.org/2000/svg';

const hasWF = !!window.wf;
let game = { cash: 0, owned: { tuner: 'new' }, plays: {} };
let powered = true, listening = false, band = 91.5, vol = 0.55, cash = 0, loud = false, pure = false;
const note = t => { $('#note').textContent = t; };

// ---------- scaling: the rack fills the window side to side ----------
function fit() {
  const z = Math.max(0.55, (innerWidth - 56) / 1100);
  ['#rack', '#rear'].forEach(s => { $(s).style.zoom = z; });
  drawDial(); drawSpectrumFrame();
}
function fitCanvas(cv) {
  const box = cv.parentElement, r = box.getBoundingClientRect();
  const k = (box.offsetWidth ? r.width / box.offsetWidth : 1) || 1, dpr = window.devicePixelRatio || 1;
  cv.width = Math.round(box.offsetWidth * k * dpr); cv.height = Math.round(box.offsetHeight * k * dpr);
  const ctx = cv.getContext('2d'); ctx.setTransform(k * dpr, 0, 0, k * dpr, 0, 0);
  return { ctx, w: box.offsetWidth, h: box.offsetHeight };
}

// ---------- knobs ----------
function makeKnob(host, { value = 0.5, detent = false, onChange = () => {} } = {}) {
  host.innerHTML = '<div class="rot"></div><div class="gloss"></div>';
  const rot = $('.rot', host); let v = value;
  const paint = () => { rot.style.transform = `rotate(${-135 + v * 270}deg)`; };
  const set = (nv, fire = true) => { v = clamp(nv, 0, 1); paint(); if (fire) onChange(v); };
  let drag = false, y0 = 0, v0 = 0;
  host.addEventListener('pointerdown', e => { drag = true; y0 = e.clientY; v0 = v; host.setPointerCapture(e.pointerId); });
  host.addEventListener('pointermove', e => { if (drag) set(v0 + (y0 - e.clientY) / 220); });
  host.addEventListener('pointerup', () => { drag = false; });
  host.addEventListener('wheel', e => { e.preventDefault(); set(v - e.deltaY / 800); }, { passive: false });
  paint();
  return { set, get: () => v };
}

// ---------- VU meters (drawn dials) ----------
function svg(tag, attrs, parent) { const n = document.createElementNS(NS, tag); for (const k in attrs) n.setAttribute(k, attrs[k]); if (parent) parent.appendChild(n); return n; }
function buildVU(host, { paper = ['#ffe9b0', '#e8a944', '#7a4712'], label = 'VU' } = {}) {
  const s = svg('svg', { viewBox: '0 0 330 150', preserveAspectRatio: 'xMidYMid slice' }); host.appendChild(s);
  const id = 'g' + Math.random().toString(36).slice(2, 7);
  const defs = svg('defs', {}, s);
  const rg = svg('radialGradient', { id: id + 'p', cx: '50%', cy: '85%', r: '95%' }, defs);
  [[0, paper[0]], [0.55, paper[1]], [1, paper[2]]].forEach(([o, c]) => svg('stop', { offset: o, 'stop-color': c }, rg));
  svg('rect', { width: 330, height: 150, fill: `url(#${id}p)` }, s);
  const cx = 165, cy = 182, R = 138, a0 = -42, a1 = 42;
  const pt = (a, r) => [cx + r * Math.sin(a * Math.PI / 180), cy - r * Math.cos(a * Math.PI / 180)];
  const POS = [[-20, 0], [-10, .25], [-7, .4], [-5, .52], [-3, .66], [-2, .73], [-1, .78], [0, .84], [1, .89], [2, .945], [3, 1]];
  const ang = v => { for (let i = 1; i < POS.length; i++) if (v <= POS[i][0]) { const [v0, p0] = POS[i - 1], [v1, p1] = POS[i]; return a0 + (p0 + (v - v0) / (v1 - v0) * (p1 - p0)) * (a1 - a0); } return a1; };
  // red zone
  const [rx0, ry0] = pt(ang(0), R + 4), [rx1, ry1] = pt(ang(3), R + 4);
  svg('path', { d: `M${rx0} ${ry0} A${R + 4} ${R + 4} 0 0 1 ${rx1} ${ry1}`, stroke: '#b3201a', 'stroke-width': 6, fill: 'none' }, s);
  const [bx0, by0] = pt(a0, R + 4), [bx1, by1] = pt(ang(0), R + 4);
  svg('path', { d: `M${bx0} ${by0} A${R + 4} ${R + 4} 0 0 1 ${bx1} ${by1}`, stroke: '#2a1608', 'stroke-width': 1.5, fill: 'none' }, s);
  [-20, -10, -7, -5, -3, -2, -1, 0, 1, 2, 3].forEach(v => {
    const major = [-20, -10, -7, -5, -3, 0, 3].includes(v), a = ang(v);
    const [x0, y0] = pt(a, R + 4), [x1, y1] = pt(a, R - (major ? 14 : 8));
    svg('line', { x1: x0, y1: y0, x2: x1, y2: y1, stroke: v >= 0 ? '#b3201a' : '#2a1608', 'stroke-width': major ? 2 : 1.2 }, s);
    if (major) { const [tx, ty] = pt(a, R - 28); const t = svg('text', { x: tx, y: ty + 4, 'text-anchor': 'middle', 'font-family': 'Barlow Condensed', 'font-weight': 800, 'font-size': 14, fill: v >= 0 ? '#b3201a' : '#2a1608' }, s); t.textContent = v > 0 ? '+' + v : v; }
  });
  const t = svg('text', { x: cx, y: 118, 'text-anchor': 'middle', 'font-family': 'Michroma', 'font-size': 20, fill: '#2a1608', opacity: .85 }, s); t.textContent = label;
  const t2 = svg('text', { x: 30, y: 138, 'font-family': 'Barlow Condensed', 'font-weight': 600, 'font-size': 10, 'letter-spacing': 2, fill: '#2a1608', opacity: .7 }, s); t2.textContent = 'W&F';
  const g = svg('g', { class: 'nd', style: `transform-origin:${cx}px ${cy}px;transform:rotate(${a0}deg)` }, s);
  svg('line', { x1: cx + 3, y1: cy + 3, x2: cx + 3, y2: 34, stroke: 'rgba(0,0,0,.35)', 'stroke-width': 3 }, g);
  svg('line', { x1: cx, y1: cy, x2: cx, y2: 30, stroke: '#16100a', 'stroke-width': 2.2 }, g);
  svg('rect', { x: 0, y: 150, width: 330, height: 40, fill: '#17110c' }, s);
  svg('ellipse', { cx, cy: 152, rx: 46, ry: 22, fill: '#17110c' }, s);
  return v => { g.style.transform = `rotate(${a0 + clamp(v, 0, 1) * (a1 - a0)}deg)`; };
}
const vus = [
  buildVU($('#vu1')), buildVU($('#vu2')),
  buildVU($('#vu3'), { paper: ['#f4f0e4', '#d9d3c0', '#8f8670'], label: 'VU' }),
  buildVU($('#vu4'), { paper: ['#f4f0e4', '#d9d3c0', '#8f8670'], label: 'VU' })
];

// ---------- cassette and reels ----------
function buildCassette() {
  const d = $('#door');
  const teeth = (cx, cy) => [0, 60, 120, 180, 240, 300].map(a => `<rect x="${cx - 1.4}" y="${cy - 10.5}" width="2.8" height="5.5" fill="#222" transform="rotate(${a} ${cx} ${cy})"/>`).join('');
  d.innerHTML = `<svg viewBox="0 0 314 200" preserveAspectRatio="xMidYMid meet">
  <defs><linearGradient id="cb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3b3733"/><stop offset="1" stop-color="#1b1917"/></linearGradient>
  <linearGradient id="cl" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#f1e5c2"/><stop offset="1" stop-color="#e3d3a6"/></linearGradient>
  <linearGradient id="cw" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#171412"/><stop offset="1" stop-color="#0a0908"/></linearGradient></defs>
  <rect width="314" height="200" rx="9" fill="url(#cb)" stroke="#000" stroke-width="2"/>
  <rect x="20" y="13" width="274" height="124" rx="4" fill="url(#cl)"/>
  <rect x="20" y="13" width="274" height="22" rx="4" fill="#c9302c"/>
  <text x="30" y="30" font-family="Barlow Condensed" font-weight="800" font-size="15" letter-spacing="3" fill="#fff">A</text>
  <text x="266" y="30" font-family="Barlow Condensed" font-weight="800" font-size="12" letter-spacing="2" fill="#fff" text-anchor="end">C-90</text>
  <text id="lblTitle" x="34" y="62" font-family="Reenie Beanie" font-size="30" fill="#1d3c8f">Mix, 1992</text>
  <text id="lblArtist" x="34" y="84" font-family="Reenie Beanie" font-size="22" fill="#1d3c8f" fill-opacity=".8">don't lose this one</text>
  <g stroke="rgba(80,110,165,.4)"><line x1="30" y1="68" x2="284" y2="68"/><line x1="30" y1="90" x2="284" y2="90"/></g>
  <rect x="94" y="94" width="126" height="40" rx="20" fill="url(#cw)" stroke="#000" stroke-width="2"/>
  <circle id="packL" cx="125" cy="114" r="14" fill="#3a2314"/><circle id="packR" cx="189" cy="114" r="14" fill="#3a2314"/>
  <g class="hub"><circle cx="125" cy="114" r="10" fill="#ececef"/><circle cx="125" cy="114" r="5" fill="#222"/>${teeth(125, 114)}</g>
  <g class="hub"><circle cx="189" cy="114" r="10" fill="#ececef"/><circle cx="189" cy="114" r="5" fill="#222"/>${teeth(189, 114)}</g>
  <path d="M60 148 H254 L272 193 H42 Z" fill="#2a2724" stroke="#000" stroke-width="1.5"/>
  <circle cx="90" cy="172" r="8" fill="#0a0908"/><circle cx="224" cy="172" r="8" fill="#0a0908"/><rect x="140" y="162" width="34" height="22" rx="2" fill="#0a0908"/>
  <circle cx="12" cy="12" r="4.5" fill="#7a7c81"/><circle cx="302" cy="12" r="4.5" fill="#7a7c81"/><circle cx="12" cy="188" r="4.5" fill="#7a7c81"/><circle cx="302" cy="188" r="4.5" fill="#7a7c81"/>
  <circle cx="157" cy="146" r="4" fill="#7a7c81"/>
  </svg>`;
}
function buildReel(host) {
  const s = $(host);
  const defs = svg('defs', {}, s);
  const g = svg('radialGradient', { id: host.slice(1) + 'f', cx: '35%', cy: '30%', r: '90%' }, defs);
  [[0, '#f7f7f9'], [0.5, '#bdbfc5'], [1, '#6e7076']].forEach(([o, c]) => svg('stop', { offset: o, 'stop-color': c }, g));
  svg('circle', { cx: 105, cy: 108, r: 100, fill: 'rgba(0,0,0,.35)' }, s);
  const spin = svg('g', { class: 'hub' }, s);
  svg('circle', { cx: 105, cy: 105, r: 100, fill: `url(#${host.slice(1)}f)`, stroke: '#55575c', 'stroke-width': 2 }, spin);
  svg('circle', { cx: 105, cy: 105, r: 94, fill: 'none', stroke: 'rgba(255,255,255,.7)', 'stroke-width': 1 }, spin);
  [0, 120, 240].forEach(a => {
    svg('circle', { cx: 105, cy: 47, r: 29, fill: '#2a190f', stroke: '#6a6c72', 'stroke-width': 2, transform: `rotate(${a} 105 105)` }, spin);
    svg('circle', { cx: 105, cy: 47, r: 22, fill: '#3b2314', transform: `rotate(${a} 105 105)` }, spin);
  });
  svg('circle', { cx: 105, cy: 105, r: 24, fill: '#d6d7db', stroke: '#6a6c72', 'stroke-width': 2 }, spin);
  [0, 120, 240].forEach(a => svg('circle', { cx: 105, cy: 90, r: 4, fill: '#55575c', transform: `rotate(${a} 105 105)` }, spin));
  svg('circle', { cx: 105, cy: 105, r: 7, fill: '#8d8f95', stroke: '#444', 'stroke-width': 1 }, spin);
  svg('path', { d: 'M40 40 A92 92 0 0 1 130 12', stroke: 'rgba(255,255,255,.75)', 'stroke-width': 5, fill: 'none', 'stroke-linecap': 'round', opacity: .6 }, s);
}
buildCassette(); buildReel('#reelL'); buildReel('#reelR');

// ---------- audio: static between stations ----------
let ac, noise;
function audio() {
  if (ac) return;
  ac = new (window.AudioContext || window.webkitAudioContext)();
  const b = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const src = ac.createBufferSource(); src.buffer = b; src.loop = true;
  noise = ac.createGain(); noise.gain.value = 0;
  const hp = ac.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 1400;
  src.connect(hp).connect(noise).connect(ac.destination); src.start();
}

// ---------- tuner ----------
const stations = [
  { f: 88.3, n: 'THE BASEMENT', g: 'college · indie' }, { f: 90.7, n: 'NIGHT SCHOOL', g: 'jangle · folk' },
  { f: 93.1, n: 'ALT 93', g: 'alternative' }, { f: 96.5, n: 'THE RIDE', g: 'driving songs' },
  { f: 99.9, n: 'HEAVY ROTATION', g: 'grunge · heavy' }, { f: 102.7, n: 'BLOCK PARTY', g: 'hip-hop' },
  { f: 105.3, n: 'GOLD', g: "your parents' records" }
];
const presets = Array(6).fill(null);
function drawDial() {
  const cv = $('#dialcv'); if (!cv.parentElement.offsetWidth) return;
  const { ctx, w, h } = fitCanvas(cv);
  ctx.clearRect(0, 0, w, h);
  const glow = ctx.createLinearGradient(0, 0, 0, h); glow.addColorStop(0, 'rgba(255,170,60,.0)'); glow.addColorStop(.55, 'rgba(255,170,60,.22)'); glow.addColorStop(1, 'rgba(255,170,60,.05)');
  ctx.fillStyle = glow; ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#ffc470'; ctx.fillStyle = '#ffc470'; ctx.font = '600 13px "Barlow Condensed"'; ctx.textAlign = 'center';
  ctx.shadowColor = 'rgba(255,170,60,.7)'; ctx.shadowBlur = 4;
  for (let f = 88; f <= 108.001; f += 0.2) {
    const x = 14 + (f - 88) / 20 * (w - 28), whole = Math.abs(f - Math.round(f)) < 0.01, half = Math.abs(f * 2 - Math.round(f * 2)) < 0.01;
    ctx.globalAlpha = whole ? 1 : half ? .8 : .45; ctx.lineWidth = whole ? 1.5 : 1;
    ctx.beginPath(); ctx.moveTo(x, h - 4); ctx.lineTo(x, h - (whole ? 22 : half ? 15 : 9)); ctx.stroke();
    if (whole && Math.round(f) % 2 === 0) { ctx.globalAlpha = 1; ctx.fillText(Math.round(f), x, h - 28); }
  }
  ctx.globalAlpha = .95; ctx.shadowBlur = 0;
  stations.forEach(s => { const x = 14 + (s.f - 88) / 20 * (w - 28); ctx.fillStyle = '#fff'; ctx.fillRect(x - 1.5, 8, 3, 7); });
  ctx.textAlign = 'left'; ctx.font = '600 10px "Barlow Condensed"'; ctx.fillStyle = 'rgba(255,196,112,.9)'; ctx.globalAlpha = .9;
  ctx.fillText('FM  MHz', 14, 14);
}
const nearest = () => stations.reduce((a, s) => Math.abs(s.f - band) < Math.abs(a.f - band) ? s : a);
let tuneKnob;
function tune(f, fromKnob) {
  band = clamp(Math.round(f * 10) / 10, 88, 108);
  const w = $('#dial').offsetWidth;
  $('#needle').style.left = (14 + (band - 88) / 20 * (w - 28)) + 'px';
  const s = nearest(), dist = Math.abs(s.f - band), lock = dist < 0.35;
  $('#tfreq').textContent = 'FM ' + band.toFixed(1);
  $('#tname').textContent = lock ? `${s.n} · ${s.g}` : dist < 1.2 ? '~ ~ ~ static' : 'scanning…';
  if (noise) noise.gain.value = powered ? (lock ? 0 : Math.min(0.16, dist * 0.09)) * (0.2 + vol) : 0;
  if (tuneKnob && !fromKnob) tuneKnob.set((band - 88) / 20, false);
  renderPresets();
}
function renderPresets() {
  ['#presets1', '#presets2'].forEach(s => { $(s).innerHTML = ''; });
  presets.forEach((p, i) => {
    const b = el('button', 'btn pbtn' + (p ? ' set' : '') + (p === band ? ' cur' : ''), String(i + 1));
    let t;
    b.addEventListener('pointerdown', () => { t = setTimeout(() => { presets[i] = band; t = null; note(`Preset ${i + 1} stored: FM ${band.toFixed(1)}.`); renderPresets(); }, 900); });
    const up = () => { if (t) { clearTimeout(t); t = null; if (presets[i]) { audio(); tune(presets[i]); } } };
    b.addEventListener('pointerup', up); b.addEventListener('pointerleave', () => { clearTimeout(t); t = null; });
    $(i < 3 ? '#presets1' : '#presets2').appendChild(b);
  });
}
{
  const dial = $('#dial'); let drag = false;
  const at = e => { audio(); const r = dial.getBoundingClientRect(); tune(88 + clamp((e.clientX - r.left - 14 * r.width / dial.offsetWidth) / (r.width - 28 * r.width / dial.offsetWidth), 0, 1) * 20); };
  dial.addEventListener('pointerdown', e => { drag = true; dial.setPointerCapture(e.pointerId); at(e); });
  dial.addEventListener('pointermove', e => { if (drag) at(e); });
  dial.addEventListener('pointerup', () => { drag = false; });
  dial.addEventListener('wheel', e => { e.preventDefault(); audio(); tune(band + (e.deltaY > 0 ? 0.1 : -0.1)); }, { passive: false });
  tuneKnob = makeKnob($('#tuneknob'), { value: (band - 88) / 20, onChange: v => { audio(); tune(88 + v * 20, true); } });
}

// ---------- equalizer ----------
const EQ = [31, 62, 125, 250, 500, 1000, 2000, 4000, 8000, 16000], eqv = EQ.map(() => 0.5), eqThumbs = [];
EQ.forEach((f, i) => {
  const fd = el('div', 'fader'), slot = el('div', 'slot'), th = el('div', 'thumb');
  slot.append(el('div', 'ticks'), el('div', 'ticks r'), th);
  fd.append(slot, el('span', 'print', f >= 1000 ? (f / 1000) + 'k' : f));
  $('#faders').appendChild(fd); eqThumbs.push(th);
  const paint = () => { th.style.top = (6 + (1 - eqv[i]) * 66) + 'px'; };
  const set = e => { const r = slot.getBoundingClientRect(); eqv[i] = clamp(1 - (e.clientY - r.top - 6 * r.height / 78) / (66 * r.height / 78), 0, 1); paint(); setPreset(null); };
  let drag = false;
  slot.addEventListener('pointerdown', e => { drag = true; slot.setPointerCapture(e.pointerId); set(e); });
  slot.addEventListener('pointermove', e => { if (drag) set(e); });
  slot.addEventListener('pointerup', () => { drag = false; });
  th._paint = paint; paint();
});
const shapes = { flat: EQ.map(() => .5), rock: [.78, .7, .56, .4, .36, .46, .62, .74, .8, .78], vocal: [.3, .34, .42, .56, .72, .78, .72, .6, .46, .36] };
function setPreset(name) { ['flat', 'rock', 'vocal'].forEach(n => $('#' + n).classList.toggle('on', n === name)); }
['flat', 'rock', 'vocal'].forEach(n => $('#' + n).addEventListener('click', () => { shapes[n].forEach((v, i) => { eqv[i] = v; eqThumbs[i]._paint(); }); setPreset(n); note(n === 'flat' ? 'Flat. Exactly as pressed.' : n === 'rock' ? 'Rock: bass and treble up, the middle scooped.' : 'Vocal: mids forward.'); }));
setPreset('flat');

// ---------- spectrum analyzer (LED segments) ----------
const COLS = 22, SEGS = 14, lv = Array(COLS).fill(0), pk = Array(COLS).fill(0);
function drawSpectrumFrame() { drawSpectrum(); }
function drawSpectrum() {
  const cv = $('#spcv'); if (!cv.parentElement.offsetWidth) return;
  const { ctx, w, h } = fitCanvas(cv);
  ctx.fillStyle = '#020605'; ctx.fillRect(0, 0, w, h);
  const padX = 14, padY = 10, cw = (w - padX * 2) / COLS, sh = (h - padY * 2 - 14) / SEGS;
  for (let c = 0; c < COLS; c++) {
    for (let s = 0; s < SEGS; s++) {
      const on = s < Math.round(lv[c] * SEGS), peak = s === Math.round(pk[c] * SEGS) - 1 && pk[c] > 0.05;
      const col = s > SEGS - 3 ? '#ff4a35' : s > SEGS - 6 ? '#ffd23a' : '#58ff5c';
      const x = padX + c * cw + 1.5, y = h - padY - 14 - (s + 1) * sh + 1.5;
      ctx.fillStyle = (on || peak) ? col : 'rgba(255,255,255,.055)';
      if (on || peak) { ctx.shadowColor = col; ctx.shadowBlur = 7; } else ctx.shadowBlur = 0;
      ctx.fillRect(x, y, cw - 3, sh - 3);
    }
  }
  ctx.shadowBlur = 0; ctx.fillStyle = 'rgba(210,214,220,.6)'; ctx.font = '600 9px "Barlow Condensed"'; ctx.textAlign = 'center';
  [['31', 0], ['125', 4], ['500', 8], ['2k', 12], ['8k', 16], ['16k', 21]].forEach(([t, c]) => ctx.fillText(t, padX + c * cw + cw / 2, h - 8));
}

// ---------- cassette deck ----------
let tapeT = 0, tapeTimer = null;
function deckRun(run) {
  $('#door').classList.toggle('playing', run);
  clearInterval(tapeTimer);
  if (run) tapeTimer = setInterval(() => {
    tapeT++;
    $('#dcount').textContent = `${Math.floor(tapeT / 60)}:${String(tapeT % 60).padStart(2, '0')}`;
    const p = clamp(tapeT / 2700, 0, 1);
    $('#packL').setAttribute('r', 13 + (1 - p) * 6); $('#packR').setAttribute('r', 13 + p * 6);
  }, 1000);
  $('#dside').textContent = run ? 'Deck A · Play' : 'Deck A · Stop';
}
[['◀◀', 'rew'], ['▶', 'play'], ['▶▶', 'ff'], ['■', 'stop'], ['●', 'rec'], ['❚❚', 'pause']].forEach(([g, id]) => {
  const b = el('button', 'btn' + (id === 'rec' ? ' rec' : ''), g); b.dataset.id = id; $('#transport').appendChild(b);
  b.addEventListener('click', () => {
    if (hasWF && id !== 'rec') {
      const cmd = { play: 'play', stop: 'pause', pause: 'pause', rew: 'previous', ff: 'next' }[id];
      window.wf.spotify(cmd).then(r => { if (r && r.error) note(r.detail || r.error); pollSpotify(); });
      return;
    }
    if (id === 'play') deckRun(true);
    else if (id === 'stop' || id === 'pause') deckRun(false);
    else if (id === 'rew') { tapeT = 0; deckRun(false); $('#dcount').textContent = '0:00'; $('#dside').textContent = 'Deck A · Rewound'; }
    else if (id === 'rec') note('Recording off the tuner. Only a full listen records, like Phony. Dubbing to Phony comes later.');
  });
});
makeKnob($('#reclvl'), { value: .6 });

// ---------- CD changer ----------
for (let i = 0; i < 6; i++) {
  const d = el('button', 'disc' + (i === 0 ? ' cur' : '')); d.title = 'Disc ' + (i + 1);
  d.addEventListener('click', () => { $$('.disc').forEach((x, j) => x.classList.toggle('cur', j === i)); $('#cdisp').textContent = `D${i + 1} T––`; $('#csub').textContent = 'Empty slot'; });
  $('#discs').appendChild(d);
}
$('#intro').addEventListener('click', () => {
  $('#intro').classList.add('on'); let t = 1;
  const iv = setInterval(() => { $('#cdisp').textContent = `D1 T${String(t).padStart(2, '0')}`; $('#csub').textContent = 'Intro · 10 sec per track'; if (++t > 3) { clearInterval(iv); $('#intro').classList.remove('on'); note('INTRO plays three tracks, ten seconds each. Three songs before the album.'); } }, 1200);
});
$('#program').addEventListener('click', e => { e.currentTarget.classList.toggle('on'); note('Program: you choose the track order.'); });
$('#cdplay').addEventListener('click', () => { if (hasWF) window.wf.spotify('play').then(pollSpotify); else note('Load an album first. Your shelf comes next.'); });
$('#cdstop').addEventListener('click', () => { if (hasWF) window.wf.spotify('pause').then(pollSpotify); });

// ---------- amplifier ----------
let src = 'TUNER';
['PHONO', 'TUNER', 'CD', 'TAPE', 'AUX'].forEach(n => {
  const b = el('button', 'btn led' + (n === src ? ' on' : ''), n);
  b.addEventListener('click', () => { src = n; $$('#inputs .btn').forEach(x => x.classList.toggle('on', x.textContent === n)); $('#adisp').textContent = n; note(n === 'PHONO' ? "No turntable yet. It's on the shelf below." : 'Source: ' + n); });
  $('#inputs').appendChild(b);
});
makeKnob($('#bass')); makeKnob($('#treble')); makeKnob($('#balance'));
const volKnob = makeKnob($('#vol'), { value: vol, onChange: v => { vol = v; $('#avol').textContent = 'Volume −' + Math.round((1 - v) * 60) + ' dB'; tune(band); } });
$('#avol').textContent = 'Volume −' + Math.round((1 - vol) * 60) + ' dB';
$('#loud').addEventListener('click', e => { loud = !loud; e.currentTarget.classList.toggle('on', loud); note(loud ? 'Loudness on: leans harder on what you already love.' : 'Loudness off.'); });
$('#pure').addEventListener('click', e => { pure = !pure; e.currentTarget.classList.toggle('on', pure); note(pure ? 'Pure direct: no personalization. The era, as it was.' : 'Pure direct off.'); });
(() => { const s = $('#volticks'); for (let i = 0; i <= 10; i++) { const a = (-135 + i * 27) * Math.PI / 180, c = 75; const x0 = c + 58 * Math.sin(a), y0 = c - 58 * Math.cos(a), x1 = c + 66 * Math.sin(a), y1 = c - 66 * Math.cos(a), tx = c + 72 * Math.sin(a), ty = c - 72 * Math.cos(a); svg('line', { x1: x0, y1: y0, x2: x1, y2: y1, stroke: 'rgba(226,229,233,.8)', 'stroke-width': i % 5 === 0 ? 2 : 1 }, s); if (i % 2 === 0) { const t = svg('text', { x: tx, y: ty + 3, 'text-anchor': 'middle', 'font-family': 'Barlow Condensed', 'font-weight': 600, 'font-size': 9, fill: 'rgba(226,229,233,.7)' }, s); t.textContent = i; } } })();

// ---------- reel to reel ----------
$('#rrplay').addEventListener('click', () => { const on = $('#reelunit').classList.toggle('playing'); note(on ? 'Open reel rolling. For the really old songs.' : 'Reel stopped.'); });
$$('.rearunit .aux').forEach(j => j.addEventListener('click', () => { $('#rnote').textContent = "AUX is empty. Phony's cable will plug in here one day (RCA to headphone jack)."; }));

// ---------- the listening loop, earnings, meters ----------
let nl = 0, nr = 0, nl2 = 0, nr2 = 0, ph = 0;
setInterval(() => {
  const run = powered && listening; ph += 0.35;
  for (let c = 0; c < COLS; c++) {
    const eq = eqv[Math.min(EQ.length - 1, Math.floor(c / COLS * EQ.length))];
    const target = run ? clamp((0.18 + Math.random() * 0.62 * (0.3 + vol)) * (0.55 + eq * 0.9) * (loud ? 1.12 : 1) * (0.75 + 0.25 * Math.sin(ph + c * 0.6)), 0, 1) : 0;
    lv[c] += (target - lv[c]) * (target > lv[c] ? 0.6 : 0.25);
    pk[c] = Math.max(lv[c], pk[c] - 0.018);
  }
  drawSpectrum();
  const t = run ? clamp((0.3 + Math.random() * 0.45) * (0.35 + vol) , 0, 1) : 0;
  nl += (t - nl) * 0.5; nr += (t * (0.82 + Math.random() * 0.3) - nr) * 0.5; nl2 += (nl - nl2) * 0.5; nr2 += (nr - nr2) * 0.5;
  vus[0](nl); vus[1](nr); vus[2](nl2); vus[3](nr2);
  $('#peak').style.background = nl > 0.82 || nr > 0.82 ? '#ff3b2a' : '#3a0d08';
}, 70);
setInterval(() => { if (!hasWF && powered && listening) { game.cash += 0.01; showCash(); saveGame(); } }, 1000);
$('#listen').addEventListener('click', e => {
  audio(); listening = !listening; e.currentTarget.classList.toggle('down', listening); deckRun(listening);
  note(listening ? 'Simulated listening: a cent a second. In the real app it pays only on confirmed full songs; whole albums pay more; repeats pay most.' : 'Stopped.');
});
$('#flip').addEventListener('click', e => {
  const back = $('#rear').style.display === 'block';
  $('#rear').style.display = back ? 'none' : 'block'; $('#rack').style.display = back ? 'block' : 'none';
  e.currentTarget.textContent = back ? 'Turn rack around' : 'Turn it back'; fit();
});

// ---------- updates (the desktop app only) ----------
if (window.wf) {
  const toast = $('#toast'), msg = $('#toastmsg');
  const show = u => {
    if (u.state === 'ready') { msg.textContent = `Version ${u.version} is ready.`; $('#restart').style.display = ''; toast.classList.add('show'); }
    else if (u.state === 'downloading' && u.percent > 0) { msg.textContent = `Downloading version ${u.version}… ${Math.round(u.percent)}%`; $('#restart').style.display = 'none'; toast.classList.add('show'); }
  };
  window.wf.onUpdate(show); window.wf.updateState().then(show);
  $('#restart').addEventListener('click', () => window.wf.installUpdate());
  window.wf.version().then(v => { $('#bar h1 small').textContent = 'STEREO MEMORY SYSTEM · v' + v; });
}

