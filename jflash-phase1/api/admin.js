// All admin-only actions go through this one function (Vercel Hobby allows ~12 functions).
// Call it like:  /api/admin?action=whoami   (later phases add more actions below)
const { requireAdmin } = require('./_lib/auth');

const actions = {
  // Phase 1: lets the admin page confirm, on the server, that you really are an admin.
  async whoami(req, res, user) {
    res.status(200).json({ ok: true, user: { email: user.email, full_name: user.full_name, role: user.role } });
  },
};

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  try {
    const action = (req.query && req.query.action) || (req.body && req.body.action);
    const handler = actions[action];
    if (!handler) return res.status(400).json({ error: 'Unknown action.' });
    const user = await requireAdmin(req, res);
    if (!user) return; // requireAdmin already replied
    await handler(req, res, user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Something went wrong.' });
  }
};
