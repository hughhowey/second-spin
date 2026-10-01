'use strict';
// Saved game, the rack you own, Spotify now-playing, and earning by listening.

const EARN = 0.5;           // dollars for one song heard all the way through (tune here)
const FULL_LISTEN = 0.9;    // how much of a song counts as "all the way through"
const SAVE_KEY = 'wf-save';
const UNITS = ['tuner', 'eq', 'deck', 'cd', 'amp', 'power', 'reel'];

async function loadGame() {
  let s = null;
  try { s = hasWF ? await window.wf.loadSave() : JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); } catch (e) { s = null; }
  if (s && typeof s === 'object') game = { cash: Number(s.cash) || 0, owned: s.owned || {}, plays: s.plays || {} };
  game.owned.tuner = game.owned.tuner || 'new';
}
let saveTimer;
function saveGame() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => { try { hasWF ? window.wf.writeSave(game) : localStorage.setItem(SAVE_KEY, JSON.stringify(game)); } catch (e) { /* no storage */ } }, 400);
}
function showCash() { $('#cash').textContent = '$' + game.cash.toFixed(2); }
let flashTimer;
function flash(text) {
  const e = $('#earn'); e.textContent = text; e.classList.add('show');
  clearTimeout(flashTimer); flashTimer = setTimeout(() => e.classList.remove('show'), 1800);
}

// ---------- the rack shows only what you own ----------
function renderRack() {
  UNITS.forEach(id => {
    const box = document.querySelector(`.u[data-unit="${id}"]`), tier = game.owned[id];
    box.classList.toggle('hidden', !tier);
    $('.unit', box).classList.toggle('silver', tier === 'used' || id === 'reel');
  });
  $('#empty').style.display = Object.keys(game.owned).length > 1 ? 'none' : '';
  fit();
}

// ---------- Spotify, through the Spotify app on this Mac ----------
let spErr = '', cur = null;
const trunc = (s, n) => (s || '').length > n ? s.slice(0, n - 1) + '…' : (s || '');
const mmss = t => { t = Math.max(0, Math.floor(t)); return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`; };

async function pollSpotify() {
  if (!hasWF) return;
  let s;
  try { s = await window.wf.spotify('state'); } catch (e) { return; }
  if (!s) return;
  if (s.error) {
    if (s.error === 'permission' && spErr !== 'permission') { note(s.detail); }
    spErr = s.error; applyNowPlaying({ state: 'error' }); return;
  }
  spErr = '';
  applyNowPlaying(s); trackEarnings(s);
}
function applyNowPlaying(s) {
  const playing = s.state === 'playing';
  listening = playing;
  $('#door').classList.toggle('playing', playing);
  $('#reelunit').classList.toggle('playing', playing);
  if (s.title) {
    $('#lblTitle').textContent = trunc(s.title, 19); $('#lblArtist').textContent = trunc(s.artist, 26);
    $('#dcount').textContent = mmss(s.pos);
    $('#dside').textContent = `Deck A · ${playing ? 'Play' : 'Pause'}`;
    const p = clamp(s.pos / Math.max(1, s.durMs / 1000), 0, 1);
    $('#packL').setAttribute('r', 13 + (1 - p) * 6); $('#packR').setAttribute('r', 13 + p * 6);
    $('#cdisp').textContent = `D1 T${String(s.trackNo || 1).padStart(2, '0')}`;
    $('#csub').textContent = trunc(`${s.album}`, 30);
    $('#now').textContent = `${playing ? '▶' : '❚❚'} ${s.artist} — ${s.title}`;
  } else {
    $('#dside').textContent = 'Deck A · No tape';
    $('#now').textContent = s.state === 'notrunning' ? 'Open Spotify and play something' : s.state === 'error' ? (spErr === 'permission' ? 'Allow control of Spotify: System Settings > Privacy & Security > Automation' : 'Spotify is not answering') : 'Nothing playing in Spotify';
  }
}

// ---------- earning: a song counts only if you hear (nearly) all of it ----------
function trackEarnings(s) {
  if (s.state !== 'playing' && s.state !== 'paused') { cur = null; return; }
  if (!cur || cur.uri !== s.uri) { cur = { uri: s.uri, dur: s.durMs / 1000, played: 0, last: s.pos, paid: false }; return; }
  const d = s.pos - cur.last;
  if (cur.paid && d < -5) { cur.paid = false; cur.played = 0; }          // started over: a repeat listen
  if (s.state === 'playing' && d > 0 && d < 4) cur.played += d;           // skipping ahead earns nothing
  cur.last = s.pos;
  if (!cur.paid && cur.dur > 20 && cur.played >= cur.dur * FULL_LISTEN) { cur.paid = true; pay(s.uri); }
}
function pay(uri) {
  const n = game.plays[uri] || 0, mult = Math.min(2, 1 + 0.25 * n), amt = EARN * mult;   // it grows on you: repeats pay more
  game.plays[uri] = n + 1; game.cash += amt; saveGame(); showCash();
  flash(`+$${amt.toFixed(2)}${n ? ' · it grows on you' : ''}`);
  if ($('#flyer') && !$('#flyer').hidden) renderFlyer();
}

// ---------- start up ----------
(async () => {
  await loadGame(); showCash(); renderRack();
  if (hasWF) { $('#listen').style.display = 'none'; pollSpotify(); setInterval(pollSpotify, 1000); }
  fit(); tune(band); addEventListener('resize', fit);
  if (document.fonts) document.fonts.ready.then(() => { drawDial(); drawSpectrum(); });
})();
