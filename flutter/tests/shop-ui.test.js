const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { JSDOM } = require('jsdom');
const { ShopService } = require('../shop/service');
const evidence = 'I enjoy gentle guitars and quiet harmonies.';
const reply = { message: 'The Sundays have those gentle guitars. What draws you to that sound?', facts: [{ scope: 'characteristic', subject: 'gentle guitars', relation: 'sound', evidence }], records: [{ albumId: 'sundays', reason: 'A connection to the gentle guitars you enjoy.', evidence, songs: ['Can’t Be Sure'] }] };
const successful = () => ({ ok: true, text: async () => JSON.stringify({ status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify(reply) }] }] }) });
async function until(fn) { const deadline = Date.now() + 3000; while (!fn()) { if (Date.now() > deadline) throw new Error('UI did not reach its expected state.'); await new Promise(resolve => setTimeout(resolve, 5)); } }
function setup(t, fetchImpl = async () => successful()) {
 const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wf-shop-ui-')); const service = new ShopService({ file: path.join(dir, 'shop.json'), apiKey: 'test-only', fetchImpl });
 const dom = new JSDOM(fs.readFileSync(path.resolve(__dirname, '../renderer/index.html'), 'utf8'), { runScripts: 'outside-only', url: 'https://preview.invalid/' }); const w = dom.window;
 w.CSS ||= {}; w.CSS.escape = s => s.replace(/[^a-zA-Z0-9_-]/g, '\\$&');
 w.HTMLDialogElement.prototype.showModal = function () { this.open = true; };
 w.HTMLDialogElement.prototype.close = function () { this.open = false; };
 const errors = []; w.addEventListener('error', e => errors.push(e.message)); w.alert = s => errors.push(s);
 const wrapped = fn => async req => { try { return { ok: true, value: await fn(req) }; } catch(e) { return { ok: false, error: e.message }; } };
 w.wf = { shopState: wrapped(() => service.snapshot()), shopAction: wrapped(req => service.action(req)), shopChat: wrapped(req => service.chat(req)), shopCancel: wrapped(() => service.cancel()) };
 w.eval(fs.readFileSync(path.resolve(__dirname, '../renderer/shop.js'), 'utf8'));
 t.after(() => { dom.window.close(); fs.rmSync(dir, { recursive: true, force: true }); });
 const d = w.document;
 return { w, d, service, errors, button: label => [...d.querySelectorAll('button')].find(b => b.textContent === label), field: label => [...d.querySelectorAll('label')].find(l => l.querySelector('span')?.textContent === label)?.querySelector('input,select,textarea') };
}
test('renderer completes conversation → counter → sampler → explicit feedback → separate listener using service bridge', async t => {
 const ui = setup(t); const { d, w, service, button, field } = ui;
 d.querySelector('#visitshop').click(); await until(() => d.querySelector('#recordshop').open);
 assert.equal(d.activeElement.id, 'shop-title');
 d.querySelector('#shop-message').value = evidence;
 d.querySelector('.shop-chat-form').dispatchEvent(new w.Event('submit', { bubbles: true, cancelable: true }));
 await until(() => d.querySelector('.shop-record') && !d.querySelector('#shop-cancel'));
 assert.equal(d.querySelectorAll('.shop-record').length, 1); assert.ok(d.querySelector('.shop-record a').href.startsWith('https://open.spotify.com/search/'));
 assert.equal(service.profile(service.state.activeId).facts.length, 0);
 button('Confirm memory').click(); await until(() => service.profile(service.state.activeId).facts.length === 1); await until(() => !button('Confirm memory'));
 d.querySelector('.shop-on-counter input').value = 'Evening sampler'; d.querySelector('.shop-on-counter form').dispatchEvent(new w.Event('submit', { bubbles: true, cancelable: true }));
 await until(() => d.querySelector('.shop-sampler')); assert.equal(d.querySelector('#shop-title').textContent, 'Samplers at home');
 const feedback = d.querySelector('.shop-sampler select'); feedback.focus(); const feedbackId = feedback.id; feedback.value = 'pass'; feedback.dispatchEvent(new w.Event('change'));
 await until(() => service.profile(service.state.activeId).samplers[0].records[0].tracks[0].feedback === 'pass'); await until(() => !feedback.isConnected && d.activeElement.id === feedbackId);
 d.querySelector('[aria-label="New listener name"]').value = 'Guest'; d.querySelector('.shop-identities form').dispatchEvent(new w.Event('submit', { bubbles: true, cancelable: true }));
 await until(() => service.state.profiles.length === 2); await until(() => !d.querySelector('.shop-sampler'));
 assert.equal(service.profile(service.state.activeId).facts.length, 0);
 button('Visit the counter').click(); assert.equal(d.querySelectorAll('.shop-record').length, 0); assert.equal(d.querySelectorAll('.shop-log article').length, 0);
 button('Return to stereo').click(); assert.equal(d.querySelector('#recordshop').open, false); assert.ok(d.querySelector('#cdplay')); assert.deepEqual(ui.errors, []);
});
test('renderer cancellation preserves one message and presents manual retry without duplicate requests', async t => {
 const ui = setup(t, (_, req) => new Promise((resolve, reject) => req.signal.addEventListener('abort', () => reject(new Error('aborted'))))); const { d, w, service, button } = ui;
 d.querySelector('#visitshop').click(); await until(() => d.querySelector('#recordshop').open);
 d.querySelector('#shop-message').value = evidence; d.querySelector('.shop-chat-form').dispatchEvent(new w.Event('submit', { cancelable: true }));
 await until(() => d.querySelector('#shop-cancel')); assert.equal(d.activeElement.id, 'shop-cancel');
 button('Cancel reply').click(); await until(() => button('Retry this message'));
 assert.equal(service.profile(service.state.activeId).messages.length, 1); assert.equal(service.profile(service.state.activeId).messages[0].status, 'failed');
 service.fetch = async () => successful(); button('Retry this message').click(); await until(() => d.querySelector('.shop-record') && !d.querySelector('#shop-cancel'));
 assert.equal(service.profile(service.state.activeId).messages.length, 2); assert.equal(service.profile(service.state.activeId).suggestions.length, 1); assert.deepEqual(ui.errors, []);
});
