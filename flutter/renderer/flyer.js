'use strict';
// The Sunday flyer: the one place to buy components. Prices are earned by listening.

// ---------- little product pictures, drawn in the same language as the faceplates ----------
function thumb(kind, skin) {
  const silver = skin === 'silver';
  const f1 = silver ? '#d4d6da' : '#2a2b2f', f2 = silver ? '#a3a5ab' : '#141518', ink = silver ? '#202226' : '#d8dbe0', dark = silver ? '#55575c' : '#050506';
  const id = kind + skin;
  const knob = (x, y, r) => `<circle cx="${x}" cy="${y + 2}" r="${r}" fill="#000" opacity=".4"/><circle cx="${x}" cy="${y}" r="${r}" fill="url(#k${id})" stroke="#0a0a0b"/><rect x="${x - 1}" y="${y - r + 2}" width="2" height="${r * 0.5}" fill="#f4f4f6"/>`;
  const btn = (x, y, w, h) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="1.5" fill="${silver ? '#6b6d73' : '#3a3b40'}" stroke="#000" stroke-width=".8"/>`;
  const vfd = (x, y, w, h, t) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="2" fill="#031b19" stroke="#000"/><text x="${x + 6}" y="${y + h * 0.68}" font-family="Michroma" font-size="${h * 0.42}" fill="#7ff9e6">${t}</text>`;
  const vu = (x, y, w, h) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3" fill="url(#a${id})" stroke="#000" stroke-width="1.5"/><path d="M${x + w * 0.2} ${y + h * 0.72} A${w * 0.34} ${w * 0.34} 0 0 1 ${x + w * 0.8} ${y + h * 0.72}" fill="none" stroke="#2a1608" stroke-width="1"/><line x1="${x + w / 2}" y1="${y + h + 4}" x2="${x + w * 0.62}" y2="${y + h * 0.2}" stroke="#16100a" stroke-width="1.6"/>`;
  const reel = (x, y, r) => `<circle cx="${x}" cy="${y}" r="${r}" fill="url(#s${id})" stroke="#55575c" stroke-width="1.5"/>${[0, 120, 240].map(a => `<circle cx="${x}" cy="${y - r * 0.58}" r="${r * 0.27}" fill="#2a190f" transform="rotate(${a} ${x} ${y})"/>`).join('')}<circle cx="${x}" cy="${y}" r="${r * 0.2}" fill="#d6d7db" stroke="#55575c"/>`;
  let body = '';
  if (kind === 'turntable') {
    return `<svg viewBox="0 0 300 96"><defs><linearGradient id="w" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8a4a2a"/><stop offset="1" stop-color="#4f2414"/></linearGradient></defs>
    <rect x="6" y="6" width="288" height="84" rx="3" fill="url(#w)" stroke="#000" stroke-width="1.5"/><rect x="12" y="12" width="276" height="72" fill="#c9cbd0" opacity=".55"/>
    <circle cx="112" cy="48" r="36" fill="#191a1d" stroke="#000"/><circle cx="112" cy="48" r="32" fill="#0b0b0d"/><circle cx="112" cy="48" r="10" fill="#c4161c"/><circle cx="112" cy="48" r="2" fill="#eee"/>
    <circle cx="258" cy="24" r="9" fill="#bfc1c6" stroke="#222"/><line x1="258" y1="24" x2="150" y2="62" stroke="#d9dbe0" stroke-width="3"/><rect x="140" y="58" width="14" height="9" fill="#222" transform="rotate(20 147 62)"/>
    <rect x="200" y="62" width="76" height="12" rx="2" fill="#3a3b40"/><circle cx="210" cy="68" r="3" fill="#7dff5a"/></svg>`;
  }
  const defs = `<defs><linearGradient id="g${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${f1}"/><stop offset="1" stop-color="${f2}"/></linearGradient>
    <radialGradient id="k${id}" cx=".35" cy=".3" r=".9"><stop offset="0" stop-color="#d9dadf"/><stop offset=".5" stop-color="#6b6d73"/><stop offset="1" stop-color="#1e1f23"/></radialGradient>
    <radialGradient id="a${id}" cx=".5" cy="1" r="1"><stop offset="0" stop-color="#ffe9b0"/><stop offset=".6" stop-color="#e8a944"/><stop offset="1" stop-color="#7a4712"/></radialGradient>
    <radialGradient id="s${id}" cx=".35" cy=".3" r=".9"><stop offset="0" stop-color="#f7f7f9"/><stop offset=".5" stop-color="#bdbfc5"/><stop offset="1" stop-color="#6e7076"/></radialGradient></defs>`;
  const plate = `<rect x="2" y="8" width="296" height="80" rx="3" fill="url(#g${id})" stroke="#000" stroke-width="1.5"/><rect x="3" y="9" width="294" height="2" fill="#fff" opacity="${silver ? .8 : .25}"/>`;
  if (kind === 'tuner') body = vfd(14, 28, 74, 34, 'FM 91.5') + `<rect x="98" y="28" width="150" height="34" rx="2" fill="#2a1604" stroke="#000"/>` + Array.from({ length: 21 }, (_, i) => `<line x1="${104 + i * 7}" y1="58" x2="${104 + i * 7}" y2="${i % 2 ? 52 : 46}" stroke="#ffc470"/>`).join('') + `<line x1="170" y1="28" x2="170" y2="62" stroke="#ff3b2a" stroke-width="1.6"/>` + knob(270, 46, 14) + [0, 1, 2, 3, 4, 5].map(i => btn(98 + i * 22, 68, 18, 9)).join('');
  if (kind === 'eq') body = Array.from({ length: 10 }, (_, i) => `<line x1="${26 + i * 15}" y1="22" x2="${26 + i * 15}" y2="68" stroke="${dark}" stroke-width="3"/><rect x="${20 + i * 15}" y="${34 + ((i * 7) % 24)}" width="12" height="7" rx="1" fill="${silver ? '#4a4c52' : '#8e9096'}" stroke="#000" stroke-width=".7"/>`).join('') + `<rect x="188" y="20" width="96" height="52" rx="2" fill="#020605" stroke="#000"/>` + Array.from({ length: 12 }, (_, i) => `<rect x="${192 + i * 7.6}" y="${70 - (10 + ((i * 11) % 36))}" width="5.4" height="${10 + ((i * 11) % 36)}" fill="${i % 5 === 4 ? '#ffd23a' : '#58ff5c'}"/>`).join('');
  if (kind === 'deck') body = `<rect x="18" y="20" width="118" height="62" rx="3" fill="#0a0a0c" stroke="#000"/><rect x="26" y="25" width="102" height="52" rx="4" fill="#3b3733" stroke="#000"/><rect x="32" y="29" width="90" height="26" fill="#efe2bf"/><rect x="56" y="38" width="42" height="14" rx="7" fill="#0a0908"/><circle cx="66" cy="45" r="5" fill="#ececef"/><circle cx="88" cy="45" r="5" fill="#ececef"/>` + vfd(148, 24, 66, 26, '0:00') + [0, 1, 2, 3, 4].map(i => btn(148 + i * 21, 58, 17, 14)).join('') + knob(264, 46, 14);
  if (kind === 'cd') body = `<rect x="16" y="24" width="126" height="46" rx="2" fill="#050506" stroke="#000"/>` + vfd(152, 26, 78, 28, 'D1 T01') + [0, 1, 2, 3, 4, 5].map(i => `<circle cx="${28 + i * 22}" cy="${60}" r="5" fill="#b8bcc6" stroke="#000"/>`).join('') + [0, 1, 2, 3, 4, 5].map(i => btn(240 + (i % 3) * 18, 26 + Math.floor(i / 3) * 18, 14, 14)).join('');
  if (kind === 'amp') body = [0, 1, 2].map(i => knob(34 + i * 30, 62, 10)).join('') + [0, 1, 2, 3, 4].map(i => btn(26 + i * 34, 24, 28, 12)).join('') + vfd(140, 50, 70, 26, 'TUNER') + knob(256, 48, 28);
  if (kind === 'power') body = vu(16, 18, 124, 58) + vu(160, 18, 124, 58) + `<rect x="144" y="40" width="12" height="12" rx="2" fill="#3a3b40" stroke="#000"/>`;
  if (kind === 'reel') body = reel(62, 48, 34) + reel(238, 48, 34) + vu(116, 18, 68, 36) + [0, 1, 2, 3, 4].map(i => btn(112 + i * 16, 62, 13, 12)).join('');
  if (kind === 'minidisc') body = `<rect x="18" y="38" width="96" height="14" rx="2" fill="#050506" stroke="#000"/>` + vfd(126, 24, 110, 34, 'No Disc') + knob(268, 46, 14) + [0, 1, 2, 3, 4, 5].map(i => btn(126 + i * 20, 66, 16, 12)).join('');
  if (kind === 'carousel') body = `<circle cx="70" cy="48" r="32" fill="#050506" stroke="#000"/>` + [0, 1, 2, 3, 4, 5].map(a => `<circle cx="70" cy="22" r="9" fill="#b8bcc6" stroke="#000" transform="rotate(${a * 60} 70 48)"/>`).join('') + vfd(124, 26, 100, 30, '100 DISC') + [0, 1, 2, 3, 4].map(i => btn(124 + i * 24, 62, 20, 14)).join('') + knob(266, 46, 13);
  return `<svg viewBox="0 0 300 96">${defs}${plate}${body}</svg>`;
}

// ---------- what the shop sells (prices end in .99, like a real flyer) ----------
const CATALOG = {
  amp:   { name: 'Integrated Stereo Amplifier', model: 'A-9', kind: 'amp', bullets: ['Input selector: phono, tuner, CD, tape, aux', 'Bass, treble, balance and loudness', 'Pure direct: no tone controls in the path'], used: 29.99, nw: 94.99, yr: ['1978', '1991'] },
  power: { name: 'Stereo Power Amplifier', model: 'M-200', kind: 'power', bullets: ['100 watts per channel', 'Two big backlit VU meters', 'Peak indicator'], used: 44.99, nw: 139.99, yr: ['1977', '1990'] },
  deck:  { name: 'Stereo Cassette Deck', model: 'TD-720', kind: 'deck', bullets: ['Auto reverse: Side A, then Side B', 'HX Pro headroom extension', 'Record off the dial, full songs only'], used: 23.99, nw: 74.99, yr: ['1980', '1989'] },
  cd:    { name: '6-Disc CD Changer', model: 'CD-6', kind: 'cd', bullets: ['Six albums loaded at once', 'INTRO plays 10 seconds of every track', 'Program your own track order'], used: 39.99, nw: 109.99, yr: ['1989', '1993'] },
  reel:  { name: 'Open Reel Tape Recorder', model: 'RR-7', kind: 'reel', bullets: ['Three motors, 7.5 and 15 ips', 'Big silver 10½-inch reels', 'Wow and flutter less than 0.04%', 'Plays the really old songs', 'Handles to carry it, if you dare'], used: 219.99, nw: null, yr: ['1971', null] },
  eq:    { name: 'Graphic Equalizer / Analyzer', model: 'EQ-10', kind: 'eq', bullets: ['Ten sliders, 31 Hz to 16 kHz', 'Spectrum analyzer with peak hold', 'Flat, Rock and Vocal presets'], used: 17.99, nw: 54.99, yr: ['1979', '1990'] }
};
const SOON = [
  { name: 'Belt-Drive Turntable', model: 'TT-3', kind: 'turntable', bullets: ['For vinyl, the oldest records'] },
  { name: 'MiniDisc Recorder', model: 'MD-74', kind: 'minidisc', bullets: ['One 74-minute disc per year', 'Title it letter by letter'] },
  { name: '100-Disc Carousel', model: 'CD-100', kind: 'carousel', bullets: ['A hundred albums, one shelf'] }
];
const dollars = n => Math.floor(n + 1e-9), cents = n => String(Math.round((n - Math.floor(n + 1e-9)) * 100)).padStart(2, '0');
const priceHTML = n => `<span class="price"><sup>$</sup>${dollars(n)}<sup>${cents(n)}</sup></span>`;
const reg = p => Math.max(p + 5, Math.round(p * 1.35 / 5) * 5) - 0.01;
const SECTION_NAME = {};

function newState(it, unit) {
  const owned = game.owned[unit], trade = owned === 'used' ? Math.round(it.used * 0.5) : 0, net = Math.round((it.nw - trade) * 100) / 100;
  if (owned === 'new') return { net, html: `<button class="buy" disabled>In your rack ✓</button>`, trade };
  if (game.cash + 1e-9 >= net) return { net, trade, html: `<button class="buy" data-unit="${unit}" data-tier="new" data-net="${net}">Buy now</button>` };
  return { net, trade, html: `<button class="buy" disabled>Need $${(net - game.cash).toFixed(2)} more</button>` };
}
function usedState(it, unit) {
  const owned = game.owned[unit];
  if (owned === 'used') return `<button class="buy small" disabled>In your rack ✓</button>`;
  if (owned === 'new') return `<button class="buy small" disabled>Have the new one</button>`;
  if (game.cash + 1e-9 >= it.used) return `<button class="buy small" data-unit="${unit}" data-tier="used" data-net="${it.used}">Buy used</button>`;
  return `<button class="buy small" disabled>Need $${(it.used - game.cash).toFixed(2)} more</button>`;
}
function unitTile(unit, span) {
  const it = CATALOG[unit], st = newState(it, unit);
  return `<div class="item span${span}"><span class="tier new">NEW!</span><div class="burst">PRICE BREAK!<b>SAVE $${Math.round(reg(it.nw) - it.nw)}</b></div>
    <div class="pic">${thumb(it.kind, 'black')}</div>
    <h4>${it.name}</h4><div class="mdl">Model ${it.model} · ${it.yr[1]}</div>
    <ul>${it.bullets.map(b => `<li>${b}</li>`).join('')}</ul>
    <div class="row2"><div><div class="was">Reg. $${reg(it.nw).toFixed(2)}</div>${priceHTML(st.net)}${st.trade ? `<div class="was">after $${st.trade} trade-in</div>` : ''}</div>${st.html}</div>
    <div class="usedstrip"><div class="mini">${thumb(it.kind, 'silver')}</div><div><b>Or buy it used, ${it.yr[0]}</b><span>Tested and working. Trade it in later for half.</span></div>${priceHTML(it.used)}${usedState(it, unit)}</div></div>`;
}
function reelPanel() {
  const it = CATALOG.reel, owned = game.owned.reel === 'used', afford = game.cash + 1e-9 >= it.used;
  const btn = owned ? `<button class="buy" disabled>In your rack ✓</button>` : afford ? `<button class="buy" data-unit="reel" data-tier="used" data-net="${it.used}">Buy now</button>` : `<button class="buy" disabled>Need $${(it.used - game.cash).toFixed(2)} more</button>`;
  return `<div class="item span6 vintage"><div class="heat">Here's a <b>HEATWAVE</b> of bargains!</div>
    <div class="vbody"><div class="pic">${thumb('reel', 'silver')}</div>
    <div class="vtext"><div class="newtag">New!</div><h4>${it.name} that has everything!</h4><div class="mdl">Model ${it.model} · Reel and Mike Included</div>
    <div class="chk">Check these features:</div><ul>${it.bullets.map(b => `<li>${b}</li>`).join('')}</ul></div>
    <div class="vprice"><div class="was">at a price that's almost nothing!</div>${priceHTML(it.used)}${btn}</div></div></div>`;
}
function soonTile(it) {
  return `<div class="item span2 soon"><span class="tier">ARRIVING SOON</span><div class="pic">${thumb(it.kind, 'black')}</div>
    <h4>${it.name}</h4><div class="mdl">Model ${it.model}</div><ul>${it.bullets.map(b => `<li>${b}</li>`).join('')}</ul>
    <div class="row2"><div class="was">Not on the shelf yet</div><button class="buy" disabled>On order</button></div></div>`;
}
function renderFlyer() {
  let h = `<header class="mast"><div class="logo">W&amp;F<small>STEREO CENTER</small></div>
    <div class="dateline">Sunday circular<b>Where listening is state of the art!</b>Layaway on every component</div></header>
    <div class="banner">Hi-Fi Stereo Sale ★ prices earned by listening ★ every song, all the way through</div>
    <div class="band red">Receivers &amp; Amplifiers</div>
    <div class="fgrid">${unitTile('amp', 3)}${unitTile('power', 3)}</div>
    <div class="band blue">Tape &amp; Discs · The sound of the 80s and 90s</div>
    <div class="fgrid">${unitTile('deck', 3)}${unitTile('cd', 3)}</div>
    <div class="band red">Tuners &amp; Equalizers</div>
    <div class="fgrid">${unitTile('eq', 3)}
      <div class="item span3 promo"><div class="stamp">LAYAWAY</div><p>Put a little down every day.</p><p class="big">Take it home when it's yours.</p>
      <div class="coupon">CLIP &amp; SAVE<br>Trade in your used component toward the new one and we'll give you half of what you paid.</div></div></div>
    <div class="band blue">Open Reel · For the really old songs</div>
    <div class="fgrid">${reelPanel()}</div>
    <div class="band red">Arriving soon</div>
    <div class="fgrid">${SOON.map(soonTile).join('')}</div>
    <div class="foot"><div class="hours"><b>Store hours</b>Mon–Sat 10a–8:30p<br>Sun 12p–6p<br>Open every day you feel like listening</div>
      <div class="seal"><span>Low price<br>guarantee</span></div>
      <div class="fine">Prices good this week only. Quantities limited, no rain checks. Used items are previously enjoyed, tested and working. Items may not be exactly as shown. Not responsible for typographical errors. W&amp;F Stereo Center is a made-up store.</div></div>`;
  const paper = $('#paper'), top = $('#flyer').scrollTop;
  paper.innerHTML = h; $('#flyer').scrollTop = top;
  $$('.buy[data-unit]', paper).forEach(b => b.addEventListener('click', () => buy(b.dataset.unit, b.dataset.tier, Number(b.dataset.net))));
}
function buy(unit, tier, net) {
  if (game.cash + 1e-9 < net) return;
  game.cash = Math.max(0, game.cash - net); game.owned[unit] = tier; saveGame(); showCash(); renderRack(); renderFlyer();
  note(`Delivered: ${CATALOG[unit].name}. It's in the rack.`); flash(`−$${net.toFixed(2)}`);
}
function openFlyer(open) {
  const f = $('#flyer'); f.hidden = !open;
  if (open) { renderFlyer(); f.scrollTop = 0; }
}
$('#flyerbtn').addEventListener('click', () => openFlyer($('#flyer').hidden));
$('#flyerclose').addEventListener('click', () => openFlyer(false));
addEventListener('keydown', e => { if (e.key === 'Escape') openFlyer(false); });
