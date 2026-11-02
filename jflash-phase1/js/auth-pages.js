// Page logic for: register, login, reset (forgot password), dashboard, admin.
// Each page names itself with <body data-page="...">.
(function () {
  var page = document.body.getAttribute('data-page');
  var $ = function (s) { return document.querySelector(s); };
  var out = $('#msg');
  var routes = { register: register, login: login, reset: reset, dashboard: dashboard, admin: admin };
  if (!routes[page]) return;
  if (!JF.configured) {
    JF.msg(out, 'This site is not connected to its database yet. See README, Step 4.', 'error');
    return;
  }
  routes[page]();

  // Shows "Please wait…" on a button while something is happening.
  function busy(btn, on) {
    if (on) { btn.dataset.label = btn.textContent; btn.textContent = 'Please wait…'; }
    else if (btn.dataset.label) { btn.textContent = btn.dataset.label; }
    btn.disabled = on;
  }

  // Turns technical errors into plain English.
  function friendly(err) {
    var m = (err && err.message) || '';
    if (/rate limit|too many/i.test(m)) return 'Too many attempts or emails right now. Please wait a few minutes and try again.';
    if (/password/i.test(m)) return 'Choose a stronger password of at least 8 characters.';
    if (/email/i.test(m) && /invalid/i.test(m)) return 'That email address does not look right.';
    return 'Something went wrong: ' + m;
  }

  // Shared sign-in form handler (used by the login page and the admin page).
  function signIn(form, btn, onOk) {
    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      var f = new FormData(form);
      JF.msg(out, ''); busy(btn, true);
      var r = await JF.sb.auth.signInWithPassword({
        email: String(f.get('email')).trim(),
        password: String(f.get('password'))
      });
      if (r.error) {
        busy(btn, false);
        var m = r.error.message || '';
        if (/not confirmed/i.test(m)) return JF.msg(out, 'Please verify your email first. Open the link we sent you, then log in.', 'error');
        if (/rate limit|too many/i.test(m)) return JF.msg(out, 'Too many attempts. Please wait a few minutes and try again.', 'error');
        return JF.msg(out, 'Wrong email or password.', 'error');
      }
      var p = await JF.profile();
      if (!p || !p.is_active) {
        await JF.sb.auth.signOut(); busy(btn, false);
        return JF.msg(out, 'This account is not active. Please contact J Flash Scholars.', 'error');
      }
      onOk(p);
    });
  }

  function register() {
    var form = $('#form'), btn = $('#submit');
    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      var f = new FormData(form);
      var email = String(f.get('email')).trim(), pw = String(f.get('password'));
      if (pw.length < 8) return JF.msg(out, 'Your password needs at least 8 characters.', 'error');
      if (pw !== String(f.get('password2'))) return JF.msg(out, 'The two passwords do not match.', 'error');
      JF.msg(out, ''); busy(btn, true);
      var r = await JF.sb.auth.signUp({
        email: email,
        password: pw,
        options: {
          emailRedirectTo: location.origin + '/login',
          data: {
            full_name: String(f.get('full_name')).trim(),
            phone: String(f.get('phone')).trim(),
            school: String(f.get('school')).trim(),
            email_opt_in: f.get('email_opt_in') ? 'true' : 'false'
          }
        }
      });
      busy(btn, false);
      if (r.error) return JF.msg(out, friendly(r.error), 'error');
      var u = r.data.user;
      // Supabase hides whether an email exists; an empty identities list means "already registered".
      if (u && u.identities && u.identities.length === 0) {
        return JF.msg(out, 'This email is already registered. Try logging in, or reset your password.', 'error');
      }
      if (r.data.session) { location.href = '/dashboard'; return; }
      form.hidden = true;
      JF.msg(out, 'Almost done! We sent a verification link to ' + email + '. Open it, then log in. Check your spam folder if you do not see it.', 'ok');
    });
  }

  function login() {
    JF.session().then(function (s) { if (s) location.replace(JF.safeNext() || '/dashboard'); });
    signIn($('#form'), $('#submit'), function () { location.href = JF.safeNext() || '/dashboard'; });
  }

  function reset() {
    var req = $('#request'), upd = $('#update');
    // Supabase fires this when the person arrives from the reset link in their email.
    JF.sb.auth.onAuthStateChange(function (event) {
      if (event === 'PASSWORD_RECOVERY') { req.hidden = true; upd.hidden = false; JF.msg(out, ''); }
    });
    req.addEventListener('submit', async function (e) {
      e.preventDefault();
      var btn = $('#request button');
      busy(btn, true);
      var email = String(new FormData(req).get('email')).trim();
      await JF.sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + '/reset' });
      busy(btn, false);
      // Same message whether or not the email exists, so nobody can probe for accounts.
      JF.msg(out, 'If that email is registered, a reset link is on its way. Check your inbox and spam folder.', 'ok');
    });
    upd.addEventListener('submit', async function (e) {
      e.preventDefault();
      var pw = String(new FormData(upd).get('password'));
      if (pw.length < 8) return JF.msg(out, 'Your password needs at least 8 characters.', 'error');
      var r = await JF.sb.auth.updateUser({ password: pw });
      if (r.error) return JF.msg(out, friendly(r.error), 'error');
      upd.hidden = true; $('#done').hidden = false;
      JF.msg(out, 'Password changed. You are signed in.', 'ok');
    });
  }

  async function dashboard() {
    var s = await JF.requireLogin();
    if (!s) return;
    var p = await JF.profile();
    if (!p || !p.is_active) { await JF.sb.auth.signOut(); location.replace('/login'); return; }
    $('#name').textContent = p.full_name || p.email;
    $('#email').textContent = p.email;
    $('#admin-link').hidden = p.role !== 'admin';
    $('#logout').addEventListener('click', JF.signOut);
    $('#content').hidden = false;
  }

  async function admin() {
    var s = await JF.session();
    if (!s) {
      $('#signin').hidden = false;
      signIn($('#form'), $('#submit'), function () { location.reload(); });
      return;
    }
    // The server decides who is an admin. This page only displays the answer.
    var r = await JF.api('whoami');
    if (r.ok) { $('#who').textContent = r.data.user.email; $('#panel').hidden = false; }
    else { JF.msg(out, r.data.error || 'Could not verify your account.', 'error'); $('#denied').hidden = false; }
    document.querySelectorAll('.js-logout').forEach(function (b) { b.addEventListener('click', JF.signOut); });
  }
})();
