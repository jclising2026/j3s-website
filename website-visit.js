/* Anonymous session counts only. Never collect form fields, URLs or identity. */
(function () {
  'use strict';
  const script = document.currentScript;
  if (!script || navigator.doNotTrack === '1' || navigator.globalPrivacyControl) return;
  const endpoint = script.dataset.endpoint || '/api/public/website-visit';
  const page = script.dataset.page || 'home';
  let session, last = 0;
  const random = () => Array.from(crypto.getRandomValues(new Uint8Array(18)), b => b.toString(16).padStart(2, '0')).join('');
  function sessionId() {
    const now = Date.now();
    try {
      const saved = JSON.parse(sessionStorage.getItem('j3s_visit') || 'null');
      if (saved && now - saved.last < 1800000) { session = saved.id; last = saved.last; }
    } catch (_) { /* Storage may be disabled. */ }
    if (!session || now - last >= 1800000) session = random();
    last = now;
    try { sessionStorage.setItem('j3s_visit', JSON.stringify({id: session, last: last})); } catch (_) {}
    return session;
  }
  function send(kind, branch) {
    if (document.visibilityState === 'hidden' && kind === 'heartbeat') return;
    try {
      const body = {session: sessionId(), event_id: random(), page: page, kind: kind};
      if (branch) body.branch_origin = branch;
      fetch(endpoint, {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body), keepalive: true, credentials: 'omit'}).catch(() => {});
    } catch (_) { /* Analytics must never stop ordering. */ }
  }
  let viewed = false;
  function visible() {
    if (document.visibilityState !== 'hidden') { send(viewed ? 'heartbeat' : 'page_view'); viewed = true; }
  }
  visible(); document.addEventListener('visibilitychange', visible);
  setInterval(() => { if (document.visibilityState !== 'hidden') send('heartbeat'); }, 30000);
  document.addEventListener('click', event => {
    const link = event.target.closest('[data-care-event]');
    if (!link) return;
    send(link.dataset.careEvent, link.dataset.branchOrigin || '');
  }, true);
})();
