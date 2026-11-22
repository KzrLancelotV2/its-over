(() => {
  const el = id => document.getElementById(id);
  const dialog = el('board-dialog');
  let world = 'city', mode = 'easy', version = 0, run, busy = false;
  const local = ['localhost', '127.0.0.1'].includes(location.hostname);
  async function api(route, data) {
    const options = data ? {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(data)} : {};
    const response = await fetch('/api/' + route, {...options, cache:'no-store', signal:AbortSignal.timeout(10000)});
    const result = await response.json().catch(() => { throw Error('Global records are unavailable on this host.'); });
    if (!response.ok) throw Object.assign(Error(result.error || 'Request failed.'), {status:response.status});
    return result;
  }
  function rows(id, entries, format) {
    el(id).replaceChildren(...entries.map(entry => {
      const row = document.createElement('li');
      row.textContent = format(entry);
      return row;
    }));
  }
  async function refresh() {
    const request = ++version;
    el('board-message').textContent = 'Loading records…';
    el('board-list').replaceChildren();
    el('board-recent').replaceChildren();
    try {
      const board = await api('board?world='+el('board-world').value+'&mode='+el('board-mode').value);
      if (request !== version) return;
      rows('board-list', board.top, row => row.name+' · '+row.score.toLocaleString());
      rows('board-recent', board.recent, row => new Date(row.ended*1000).toLocaleString()+' · '+row.score.toLocaleString());
      el('board-profile').hidden = !board.name;
      el('board-account').hidden = !!board.name;
      el('board-player').textContent = board.name || '';
      el('board-message').textContent = board.top.length ? 'Top 20 · best score per player' : 'No records on this board yet.';
    } catch (error) { if (request === version) el('board-message').textContent = error.message; }
  }
  for (const button of document.querySelectorAll('.board-open')) button.onclick = () => {
    el('board-world').value = world;
    el('board-mode').value = mode;
    const securePlay = document.querySelector('meta[name=secure-play]')?.content;
    if (!local && location.protocol === 'http:' && securePlay) { location.assign(securePlay+'#leaderboard'); return; }
    dialog.showModal();
    refresh();
  };
  el('board-world').onchange = el('board-mode').onchange = refresh;
  dialog.onclose = () => { el('board-secret').textContent = ''; el('board-secret').hidden = true; };
  el('board-form').onsubmit = async event => {
    event.preventDefault();
    if (busy) return;
    busy = true;
    try {
      if (!local && location.protocol !== 'https:') throw Error('Open the HTTPS game link to sign in.');
      const result = await api(event.submitter?.value || 'login',{name:el('board-name').value.trim(),code:el('board-code').value});
      el('board-code').value = '';
      if (result.code) {
        el('board-secret').hidden = false;
        el('board-secret').textContent = 'Save your private code for '+result.name+' before closing: '+result.code;
      }
      await refresh();
    } catch(error) { el('board-message').textContent = error.message; }
    finally { busy = false; }
  };
  el('board-logout').onclick = async () => {
    try {
      await api('logout',{});
      el('board-secret').hidden = true; el('board-secret').textContent = '';
      await refresh();
    } catch(error) { el('board-message').textContent = error.message; }
  };
  window.addEventListener('load', () => {
    if (location.hash === '#leaderboard') { el('endless-menu').click(); document.querySelector('.board-open').click(); }
  });
  window.endlessBoard = {
    select(w,m) { world=w; mode=m; },
    start(w,m) {
      const current = {ticket:api('start',{world:w,mode:m}).catch(error => ({error}))};
      run = current;
      el('record-status').textContent = '';
    },
    async finish(score) {
      const current = run;
      if (!current) return;
      const status = message => { if (current === run) el('record-status').textContent = message; };
      status('Saving record…');
      const result = await current.ticket;
      if (result.error) {
        status(result.error.status === 401 ? 'Guest run · sign in before a run to rank.' : 'Local score only · global records unavailable.');
        return;
      }
      try { await api('finish',{ticket:result.ticket,score}); status('Global record saved.'); if(dialog.open) refresh(); }
      catch(error) { status('Global record could not be saved. '+error.message); }
    }
  };
})();
