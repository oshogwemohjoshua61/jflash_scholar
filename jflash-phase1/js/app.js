// Shared browser helpers. Plain JavaScript, no build step. Exposes one global: JF.
(function () {
  var cfg = window.JF_CONFIG || {};
  var key = cfg.SUPABASE_ANON_KEY || '';
  var configured = /^https?:\/\//.test(cfg.SUPABASE_URL || '') && key.length > 20 && key.indexOf('PASTE_') !== 0;
  var sb = configured && window.supabase ? window.supabase.createClient(cfg.SUPABASE_URL, key) : null;
  var JF = { configured: configured, sb: sb };

  // Show (or clear) a message box. kind: 'ok' | 'error' | 'info'
  JF.msg = function (el, text, kind) {
    if (!el) return;
    if (!text) { el.hidden = true; el.textContent = ''; return; }
    el.textContent = text;
    el.className = 'msg msg-' + (kind || 'info');
    el.hidden = false;
  };

  JF.session = async function () {
    if (!sb) return null;
    var r = await sb.auth.getSession();
    return r.data && r.data.session ? r.data.session : null;
  };

  // The signed-in person's own profile row (row-level security makes sure it is only theirs).
  JF.profile = async function () {
    var s = await JF.session();
    if (!s) return null;
    var r = await sb.from('profiles').select('*').eq('id', s.user.id).single();
    return r.data || null;
  };

  // Where to go after login. Only same-site paths are allowed.
  JF.safeNext = function () {
    var n = new URLSearchParams(location.search).get('next') || '';
    return /^\/(?![\/\\])/.test(n) ? n : '';
  };

  JF.requireLogin = async function () {
    var s = await JF.session();
    if (!s) { location.replace('/login?next=' + encodeURIComponent(location.pathname)); return null; }
    return s;
  };

  JF.signOut = async function () {
    if (sb) await sb.auth.signOut();
    location.href = '/';
  };

  // Calls the admin function. The server re-checks that you are an admin every time.
  JF.api = async function (action) {
    var s = await JF.session();
    if (!s) return { ok: false, status: 401, data: { error: 'Please sign in.' } };
    try {
      var res = await fetch('/api/admin?action=' + encodeURIComponent(action), {
        headers: { Authorization: 'Bearer ' + s.access_token }
      });
      var data = await res.json().catch(function () { return {}; });
      return { ok: res.ok, status: res.status, data: data };
    } catch (e) {
      return { ok: false, status: 0, data: { error: 'Could not reach the server. Check your internet connection.' } };
    }
  };

  // Fills the top-right menu: Log in / Register, or Dashboard / Log out.
  JF.buildNav = async function () {
    var slot = document.getElementById('nav-auth');
    if (!slot) return;
    var s = await JF.session();
    function link(text, href, cls) {
      var a = document.createElement('a');
      a.href = href; a.textContent = text;
      if (cls) a.className = cls;
      return a;
    }
    slot.textContent = '';
    if (s) {
      slot.appendChild(link('Dashboard', '/dashboard'));
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'btn btn-ghost btn-sm'; b.textContent = 'Log out';
      b.addEventListener('click', JF.signOut);
      slot.appendChild(b);
    } else {
      slot.appendChild(link('Log in', '/login'));
      slot.appendChild(link('Register', '/register', 'btn btn-sm'));
    }
  };

  document.addEventListener('DOMContentLoaded', function () {
    if (!configured) {
      var d = document.createElement('div');
      d.className = 'banner';
      d.textContent = 'Setup needed: this site is not connected to Supabase yet. See README, Step 4.';
      document.body.insertBefore(d, document.body.firstChild);
    }
    JF.buildNav();
  });

  window.JF = JF;
})();
