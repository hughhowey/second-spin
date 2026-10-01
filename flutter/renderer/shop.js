/* Record shop renderer. No credentials or network API access cross this boundary. */
(() => {
  'use strict';
  const bridge = window.wf;
  const dialog = document.createElement('dialog'); dialog.id = 'recordshop'; dialog.setAttribute('aria-labelledby', 'shop-title'); document.body.append(dialog);
  let state, mode = 'shop', busy = false, saving = false, editing = null;
  const node = (tag, text, cls) => { const n = document.createElement(tag); if (text != null) n.textContent = text; if (cls) n.className = cls; return n; };
  const button = (label, fn) => { const b = node('button', label, 'shop-button'); b.type = 'button'; b.addEventListener('click', () => Promise.resolve(fn()).catch(e => status(e.message))); return b; };
  const field = (label, input) => { const l = node('label'); l.append(node('span', label), input); return l; };
  const input = (placeholder, max = 200) => { const n = node('input'); n.placeholder = placeholder; n.maxLength = max; n.required = true; return n; };
  const select = values => { const n = node('select'); values.forEach(([value, label]) => { const o = node('option', label); o.value = value; n.append(o); }); return n; };
  function status(message) { const n = dialog.querySelector('#shop-status'); if (n) n.textContent = message; }
  function unwrap(r) { if (!r?.ok) throw new Error(r?.error || 'The local shop is unavailable.'); return r.value; }
  function profile() { return state.profiles.find(p => p.id === state.activeId); }
  async function action(req) {
    if (saving) throw new Error('A local save is already in progress.');
    saving = true; const focusId = document.activeElement?.id;
    dialog.querySelectorAll('input,select,textarea,button').forEach(n => { n.disabled = true; });
    try { state = unwrap(await bridge.shopAction({ profileId: state.activeId, ...req })); if (['selectProfile', 'createProfile'].includes(req.type)) editing = null; render(); if (focusId) dialog.querySelector('#' + CSS.escape(focusId))?.focus(); }
    finally { saving = false; dialog.querySelectorAll('input,select,textarea,button').forEach(n => { n.disabled = busy; }); }
  }
  async function open(next) {
    mode = next;
    if (!bridge?.shopState) { window.alert('Open the Electron local preview to use the record shop.'); return; }
    try { state = unwrap(await bridge.shopState()); render(); if (!dialog.open) dialog.showModal(); dialog.querySelector('#shop-title').focus(); }
    catch (e) { window.alert(e.message); }
  }
  document.querySelector('#visitshop').addEventListener('click', () => open('shop'));
  document.querySelector('#samplersbtn').addEventListener('click', () => open('home'));
  dialog.addEventListener('cancel', e => { if (busy) { e.preventDefault(); status('Cancel the reply before leaving the counter.'); } });
  function render() {
    const p = profile(); dialog.replaceChildren();
    const head = node('header', null, 'shop-header');
    const title = node('h2', mode === 'shop' ? 'The record shop' : 'Samplers at home'); title.id = 'shop-title'; title.tabIndex = -1;
    head.append(title, button(mode === 'shop' ? 'Take a look at my samplers' : 'Visit the counter', () => { mode = mode === 'shop' ? 'home' : 'shop'; render(); dialog.querySelector('#shop-title').focus(); }), button('Return to stereo', () => { if (busy) { status('Cancel the reply first.'); return; } dialog.close(); }));
    dialog.append(head);
    const identities = node('div', null, 'shop-identities');
    const listeners = select(state.profiles.map(p => [p.id, p.name])); listeners.id = 'shop-listener-select'; listeners.value = p.id; listeners.disabled = busy;
    listeners.onchange = () => action({ type: 'selectProfile', profileId: listeners.value }).catch(e => status(e.message));
    identities.append(field('Listening as', listeners));
    const add = node('form'); const name = input('New listener name', 80); name.setAttribute('aria-label', 'New listener name');
    const addBtn = node('button', 'Add listener', 'shop-button'); addBtn.type = 'submit'; add.append(name, addBtn); add.onsubmit = e => { e.preventDefault(); action({ type: 'createProfile', name: name.value }).catch(e => status(e.message)); };
    identities.append(add); dialog.append(identities);
    const info = node('p', state.configured ? 'Your conversation and confirmed memories are sent to OpenAI. Local listeners keep separate tastes and samplers.' : 'OpenAI is not configured. Launch with your private external env file; saved samplers still work.', 'shop-hint'); dialog.append(info);
    const error = node('p', '', 'shop-error'); error.id = 'shop-status'; error.setAttribute('role', 'status'); error.setAttribute('aria-live', 'polite'); dialog.append(error);
    if (mode === 'home') renderSamplers(p); else renderShop(p);
    if (busy) {
      dialog.querySelectorAll('input,select,textarea,button').forEach(n => { n.disabled = true; });
      const cancel = button('Cancel reply', async () => { unwrap(await bridge.shopCancel()); status('Canceling…'); }); cancel.id = 'shop-cancel'; dialog.querySelector('.shop-header').append(cancel); cancel.focus();
      status('The employee is thinking… Your message is saved.');
    }
  }
  function renderShop(p) {
    const scene = node('div', null, 'shop-counter');
    scene.append(node('span', '☕', 'shop-mug'), node('p', 'STAFF PICKS · a few records, a good conversation', 'shop-handwritten')); dialog.append(scene);
    const grid = node('div', null, 'shop-grid'); const conversation = node('section', null, 'shop-conversation'); conversation.setAttribute('aria-label', 'Conversation');
    const log = node('div', null, 'shop-log'); log.setAttribute('role', 'log'); log.setAttribute('aria-live', 'polite'); log.tabIndex = 0;
    if (!p.messages.length) log.append(node('p', 'Welcome in. What’s a record you keep coming back to—and what holds you there?', 'shop-employee'));
    for (const m of p.messages) {
      const entry = node('article', null, m.role === 'user' ? 'shop-listener' : 'shop-employee');
      entry.append(node('strong', m.role === 'user' ? p.name : 'Behind the counter'), node('p', m.content));
      if (m.status === 'failed') {
        entry.append(node('p', m.error, 'shop-error'));
        if (p.messages.filter(x => x.role === 'user').at(-1)?.id === m.id) entry.append(button('Retry this message', () => chat({ retryId: m.id })));
      }
      for (const f of m.proposals || []) {
        if (p.factHistory.some(x => x.scope === f.scope && x.subject === f.subject && x.evidence === f.evidence) || p.facts.some(x => x.scope === f.scope && x.subject === f.subject && x.relation === f.relation && x.evidence === f.evidence)) continue;
        const proposal = node('div', null, 'shop-proposal'); proposal.append(node('p', `Remember this? ${f.scope}: ${f.subject} · ${f.relation}`), node('small', `Your words: “${f.evidence}”`));
        proposal.append(button('Confirm memory', () => action({ type: 'fact', fact: f })), button('Correct before saving', () => { editing = { ...f, proposal: f }; render(); dialog.querySelector('#fact-subject').focus(); })); entry.append(proposal);
      }
      log.append(entry);
    }
    conversation.append(log);
    const form = node('form', null, 'shop-chat-form'); const message = node('textarea'); message.rows = 3; message.maxLength = 3000; message.required = true; message.placeholder = 'Tell the employee about a record, a memory, or another direction…'; message.setAttribute('aria-label', 'Your message (up to 3000 characters)'); message.id = 'shop-message';
    message.addEventListener('keydown', e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); form.requestSubmit(); } });
    const send = node('button', 'Send · ⌘/Ctrl Enter', 'shop-button'); send.type = 'submit'; form.append(message, send); form.onsubmit = e => { e.preventDefault(); chat({ message: message.value }); }; conversation.append(form); grid.append(conversation);
    const shelf = node('section', null, 'shop-on-counter'); shelf.append(node('h3', 'On the counter'));
    const suggestion = p.suggestions.at(-1);
    if (!suggestion) shelf.append(node('p', 'A few questions first. Records will appear here when there’s a connection to make.'));
    else {
      for (const r of suggestion.records) {
        const card = recordCard(r); const response = select([['', 'What do you think?'], ['familiar', 'I already know this artist'], ['love', 'I love this artist'], ['pass', 'A different direction'], ['later', 'Save the idea for later'], ['reconsider', 'Let’s reconsider this artist']]);
        response.id = 'record-feedback-' + r.albumId; response.setAttribute('aria-label', `Respond to ${r.artist}`); response.value = r.feedback === 'untried' ? '' : r.feedback;
        response.onchange = () => { if (response.value) action({ type: 'recordFeedback', suggestionId: suggestion.id, albumId: r.albumId, feedback: response.value, evidence: `${response.selectedOptions[0].textContent}: ${r.artist}` }).catch(e => status(e.message)); }; card.append(response); shelf.append(card);
      }
      const take = node('form'); const name = input('Name this sampler', 100); name.setAttribute('aria-label', 'Sampler name'); const save = node('button', 'Take it home', 'shop-button'); save.type = 'submit'; take.append(name, save);
      take.onsubmit = async e => { e.preventDefault(); try { await action({ type: 'saveSampler', suggestionId: suggestion.id, name: name.value }); mode = 'home'; render(); dialog.querySelector('#shop-title').focus(); } catch (e) { status(e.message); } }; shelf.append(take);
    }
    grid.append(shelf); dialog.append(grid); renderFacts(p); log.scrollTop = log.scrollHeight;
  }
  function recordCard(r) {
    const card = node('article', null, 'shop-record'); card.append(node('span', `${r.year} · STAFF PICK`, 'shop-handwritten'), node('h4', r.artist), node('p', r.album), node('p', r.reason), node('small', `Connection: “${r.evidence}”`));
    const songs = node('ol'); r.tracks.forEach(t => { const item = node('li', `${t.title} — Spotify availability unresolved`); const a = node('a', 'Search in Spotify'); a.href = t.searchUrl; a.target = '_blank'; a.rel = 'noopener noreferrer'; item.append(document.createTextNode(' · '), a); songs.append(item); }); card.append(songs); return card;
  }
  function renderSamplers(p) {
    dialog.append(node('p', 'Saved here on this Mac. Spotify search links open the catalog search; these samplers are not exported playlists.', 'shop-hint'));
    if (!p.samplers.length) dialog.append(node('p', 'No sampler yet. Visit the counter, name the records you want to take home, then listen.'));
    for (const s of [...p.samplers].reverse()) {
      const section = node('section', null, 'shop-sampler'); section.append(node('h3', s.name), node('small', 'Saved local sampler · ' + new Date(s.createdAt).toLocaleDateString()));
      for (const r of s.records) {
        const card = recordCard(r);
        for (const [index, t] of r.tracks.entries()) {
          const response = select([['unrated', 'Not rated / listening unknown'], ['love', 'Loved this song'], ['pass', 'Pass on this song'], ['later', 'Listen later'], ['reconsider', 'Reconsider this song']]); response.id = 'song-feedback-' + s.id + '-' + r.albumId + '-' + index; response.value = t.feedback;
          response.onchange = () => action({ type: 'trackFeedback', samplerId: s.id, albumId: r.albumId, index, feedback: response.value }).catch(e => status(e.message)); card.append(field(t.title, response));
        }
        section.append(card);
      }
      dialog.append(section);
    }
    renderFacts(p);
  }
  function renderFacts(p) {
    const details = node('details', null, 'shop-memory'); details.open = !!editing;
    details.append(node('summary', `Taste notebook · ${p.facts.length} confirmed facts`), node('p', 'Confirm only what you mean. Artist and album preferences are separate. Edit or remove any memory.'));
    for (const f of p.facts) {
      const row = node('div', null, 'shop-fact'); row.append(node('p', `${f.scope}: ${f.subject} · ${f.relation}`), node('small', `Evidence: “${f.evidence}”`), button('Edit', () => { editing = f; render(); dialog.querySelector('#fact-subject').focus(); }), button('Remove', () => action({ type: 'deleteFact', id: f.id }))); details.append(row);
    }
    const form = node('form', null, 'shop-fact-form');
    const scope = select(['artist', 'album', 'song', 'memory', 'characteristic'].map(s => [s, s]));
    const relation = select([['love', 'Love'], ['familiar', 'Know the name'], ['listened', 'Have listened'], ['favorite', 'Favorite'], ['pass', 'Pass'], ['later', 'Save for later'], ['reconsider', 'Reconsider'], ['parents', 'Heard through parents'], ['independent', 'Discovered independently'], ['nostalgia', 'Life-event nostalgia'], ['sound', 'Musical characteristic']]);
    const subject = input('Artist, album, song, or memory', 200); subject.id = 'fact-subject'; const evidence = input('Your own words / correction', 1000);
    if (editing) { scope.value = editing.scope; relation.value = editing.relation; subject.value = editing.subject; evidence.value = editing.evidence; }
    const save = node('button', editing ? 'Save correction' : 'Add a fact', 'shop-button'); save.type = 'submit'; form.append(field('Applies to', scope), field('Relationship', relation), field('Subject', subject), field('Your evidence', evidence), save);
    if (editing) form.append(button('Cancel edit', () => { editing = null; render(); }));
    form.onsubmit = async e => { e.preventDefault(); try { const req = { type: 'fact', id: editing?.id, proposal: editing?.proposal, fact: { scope: scope.value, relation: relation.value, subject: subject.value, evidence: evidence.value } }; await action(req); editing = null; render(); } catch (e) { status(e.message); } }; details.append(form); dialog.append(details);
  }
  async function chat(req) {
    if (busy) return;
    const message = req.message;
    let chatError = '';
    if (req.message) profile().messages.push({ id: 'pending-local', role: 'user', content: req.message, status: 'pending' });
    busy = true; render();
    try { state = unwrap(await bridge.shopChat({ profileId: state.activeId, ...req })); }
    catch (e) { chatError = e.message; try { state = unwrap(await bridge.shopState()); } catch {} }
    finally { busy = false; render(); if (chatError) status(chatError); const field = dialog.querySelector('#shop-message'); if (field) { if (!state.profiles.find(p => p.id === state.activeId).messages.some(m => m.content === message)) field.value = message || ''; field.focus(); } }
  }
})();
