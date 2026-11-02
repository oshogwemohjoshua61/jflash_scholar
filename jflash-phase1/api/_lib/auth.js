// Shared helpers for the serverless functions.
// Files starting with "_" inside /api are NOT turned into web endpoints by Vercel.
const { createClient } = require('@supabase/supabase-js');

let client;
// Server-side Supabase client using the secret key. Never sent to the browser.
function db() {
  if (!client) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error('Server is not set up: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing in Vercel.');
    }
    client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  }
  return client;
}

// Works out who is calling, from the sign-in token the browser sends.
// Returns the profile, or null if not signed in or the account is deactivated.
async function getUser(req) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return null;
  const { data, error } = await db().auth.getUser(token);
  if (error || !data || !data.user) return null;
  const { data: profile } = await db()
    .from('profiles')
    .select('id, email, full_name, role, is_active')
    .eq('id', data.user.id)
    .single();
  if (!profile || !profile.is_active) return null;
  return profile;
}

// Use at the top of every admin-only action. Sends the error reply itself.
async function requireAdmin(req, res) {
  const user = await getUser(req);
  if (!user) { res.status(401).json({ error: 'Please sign in.' }); return null; }
  if (user.role !== 'admin') { res.status(403).json({ error: 'This account is not an admin.' }); return null; }
  return user;
}

module.exports = { db, getUser, requireAdmin };
