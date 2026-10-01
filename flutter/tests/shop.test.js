const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { ShopService, validateReply, excluded } = require('../shop/service');
const response = value => ({ ok: true, text: async () => JSON.stringify({ status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify(value) }] }] }) });
const evidence = 'I love jangling guitars and quiet harmonies.';
const reply = () => ({ message: 'Try these shimmering guitars. What do you think?', facts: [{ scope: 'characteristic', subject: 'jangling guitars', relation: 'sound', evidence }], records: [{ albumId: 'sundays', reason: 'Shimmering guitars connect to your jangling guitars.', evidence, songs: ['Can’t Be Sure'] }] });
function service(t, fetchImpl = async () => response(reply()), extra = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wf-shop-test-')); t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return new ShopService({ file: path.join(dir, 'shop.json'), apiKey: 'test-secret', fetchImpl, ...extra });
}
test('facts require explicit confirmation; album love does not become artist love; corrections override exclusions', async t => {
  const s = service(t), id = s.state.activeId;
  await s.chat({ profileId: id, message: evidence }); const p = s.profile(id);
  assert.equal(p.facts.length, 0); assert.equal(p.messages.at(-1).proposals.length, 1);
  s.action({ type: 'fact', profileId: id, fact: { scope: 'album', subject: 'fear', relation: 'love', evidence: 'I love fear, not all Toad records.' } });
  assert.equal(excluded(p, { artist: 'Toad the Wet Sprocket', title: 'Other record' }), false);
  s.action({ type: 'fact', profileId: id, fact: { scope: 'artist', subject: 'The Sundays', relation: 'familiar', evidence: 'I know the name, not the songs.' } });
  assert.equal(excluded(p, { artist: 'The Sundays', title: 'Anything' }), true);
  const fact = p.facts.at(-1);
  s.action({ type: 'fact', profileId: id, id: fact.id, fact: { scope: 'artist', subject: 'The Sundays', relation: 'reconsider', evidence: 'Actually let’s revisit The Sundays.' } });
  assert.equal(excluded(p, { artist: 'The Sundays', title: 'Anything' }), false); assert.equal(p.factHistory.length, 1);
  s.action({ type: 'deleteFact', profileId: id, id: fact.id }); assert.equal(p.factHistory.length, 2);
});
test('validated catalog, bounded artists/songs, unsupported evidence and credential-like output rejected', t => {
  const s = service(t), p = s.profile(s.state.activeId); p.messages.push({ role: 'user', content: evidence });
  assert.equal(validateReply(reply(), p).records[0].tracks[0].status, 'unresolved');
  const quoted = reply(); quoted.records[0].evidence = '“' + evidence + '”'; assert.equal(validateReply(quoted, p).records.length, 1);
  for (const mutate of [r => r.records[0].songs = ['Invented song'], r => r.records[0].evidence = 'invented memory', r => r.facts[0].evidence = 'not spoken', r => r.records.push(r.records[0]), r => r.records[0].uri = 'spotify:track:fake', r => r.message = 'sk-proj-' + 'x'.repeat(50)]) {
    const r = reply(); mutate(r); assert.throws(() => validateReply(r, p));
  }
  p.facts.push({ scope: 'artist', subject: 'The Sundays', relation: 'pass', evidence: 'Pass' }); assert.equal(validateReply(reply(), p).records.length, 0);
});
test('profiles isolate conversations, facts, samplers and feedback; restart retains local sampler', async t => {
  const s = service(t), id = s.state.activeId; await s.chat({ profileId: id, message: evidence });
  s.action({ type: 'saveSampler', profileId: id, suggestionId: s.profile(id).suggestions[0].id, name: 'A quiet evening' });
  s.action({ type: 'saveSampler', profileId: id, suggestionId: s.profile(id).suggestions[0].id, name: 'Repeated click' }); assert.equal(s.profile(id).samplers.length, 1);
  const sampler = s.profile(id).samplers[0];
  assert.equal(sampler.records[0].tracks[0].feedback, 'unrated');
  s.action({ type: 'trackFeedback', profileId: id, samplerId: sampler.id, albumId: 'sundays', index: 0, feedback: 'love' });
  s.action({ type: 'createProfile', name: 'Guest' }); const guest = s.profile(s.state.activeId);
  for (const k of ['facts', 'messages', 'samplers', 'suggestions']) assert.equal(guest[k].length, 0);
  const restored = new ShopService({ file: s.file }); assert.equal(restored.profile(id).samplers[0].records[0].tracks[0].feedback, 'love'); assert.equal(restored.profile(guest.id).facts.length, 0);
});
test('failure/retry keeps one user message and one suggestion; no automatic billable retries', async t => {
  let calls = 0; const s = service(t, async () => ++calls === 1 ? { ok: false, status: 429 } : response(reply())); const id = s.state.activeId;
  await s.chat({ profileId: id, message: evidence }); const m = s.profile(id).messages[0]; assert.equal(m.status, 'failed'); assert.equal(calls, 1);
  await assert.rejects(s.chat({ profileId: id, message: 'repeat' }));
  await s.chat({ profileId: id, retryId: m.id }); assert.equal(calls, 2); assert.equal(s.profile(id).messages.length, 2); assert.equal(s.profile(id).suggestions.length, 1);
  await assert.rejects(s.chat({ profileId: id, retryId: m.id }));
});
test('request captures corrected memory, explicit feedback, and bounds recent conversation; no API key in snapshot', async t => {
  let body; const s = service(t, async (_, req) => { body = JSON.parse(req.body); return response(reply()); }); const id = s.state.activeId;
  await s.chat({ profileId: id, message: evidence });
  s.action({ type: 'recordFeedback', profileId: id, suggestionId: s.profile(id).suggestions[0].id, albumId: 'sundays', feedback: 'familiar', evidence: 'I know this artist already.' });
  await s.chat({ profileId: id, message: evidence });
  assert.ok(body.input[0].content.includes('I know this artist already.')); assert.equal(body.store, false); assert.equal(JSON.stringify(s.snapshot()).includes('test-secret'), false);
});
test('cancellation and repeated requests do not create success or duplicate messages', async t => {
  const s = service(t, (_, req) => new Promise((resolve, reject) => req.signal.addEventListener('abort', () => reject(new Error('aborted'))))); const id = s.state.activeId;
  const promise = s.chat({ profileId: id, message: evidence });
  await assert.rejects(s.chat({ profileId: id, message: evidence })); assert.throws(() => s.action({ type: 'createProfile', name: 'Guest' }));
  s.cancel(); await promise; assert.equal(s.profile(id).messages.length, 1); assert.equal(s.profile(id).messages[0].status, 'failed'); assert.equal(s.profile(id).suggestions.length, 0);
});
test('interrupted pending turn is recoverable; corrupt save is preserved', async t => {
  const s = service(t); const p = s.profile(s.state.activeId); p.messages.push({ id: 'interrupted', role: 'user', content: evidence, status: 'pending' }); s.save();
  const reopened = new ShopService({ file: s.file, apiKey: 'test', fetchImpl: async () => response(reply()) }); assert.equal(reopened.profile(p.id).messages[0].status, 'failed'); await reopened.chat({ profileId: p.id, retryId: 'interrupted' }); assert.equal(reopened.profile(p.id).messages[0].status, 'complete');
  fs.writeFileSync(s.file, '{bad'); assert.throws(() => new ShopService({ file: s.file })); assert.equal(fs.readFileSync(s.file, 'utf8'), '{bad');
});
test('unconfigured, malformed, refused and network replies preserve user message', async t => {
  for (const extra of [{ apiKey: '' }, { fetchImpl: async () => ({ ok: true, text: async () => '{bad' }) }, { fetchImpl: async () => ({ ok: true, text: async () => JSON.stringify({ status: 'incomplete' }) }) }, { fetchImpl: async () => { throw new TypeError('fetch failed'); } }]) {
    const s = service(t, undefined, extra); await s.chat({ profileId: s.state.activeId, message: evidence }); assert.equal(s.profile(s.state.activeId).messages[0].status, 'failed'); assert.equal(s.profile(s.state.activeId).messages[0].content, evidence);
  }
});
test('explicit song feedback excludes a passed song and permits later reconsideration', async t => {
 const s = service(t), id = s.state.activeId; await s.chat({ profileId: id, message: evidence }); const p = s.profile(id);
 s.action({ type: 'saveSampler', profileId: id, suggestionId: p.suggestions[0].id, name: 'Feedback test' }); const sampler = p.samplers[0];
 s.action({ type: 'trackFeedback', profileId: id, samplerId: sampler.id, albumId: 'sundays', index: 0, feedback: 'pass' }); assert.equal(validateReply(reply(), p).records.length, 0);
 s.action({ type: 'trackFeedback', profileId: id, samplerId: sampler.id, albumId: 'sundays', index: 0, feedback: 'reconsider' }); assert.equal(validateReply(reply(), p).records.length, 1);
});
test('disk failures roll back actions and unsaved messages instead of reporting success', async t => {
 const s = service(t), id = s.state.activeId; s.save = () => { throw new Error('disk unavailable'); };
 assert.throws(() => s.action({ type: 'createProfile', name: 'Unsaved' })); assert.equal(s.state.profiles.length, 1);
 await assert.rejects(s.chat({ profileId: id, message: evidence }), /Could not save/); assert.equal(s.profile(id).messages.length, 0); assert.equal(s.running, null);
});
