const bcrypt = require('bcrypt');
const db = require('../db');
const { generateToken } = require('../auth');

function isEnabled() {
  return process.env.AUTH_LOCAL_DISABLED !== 'true';
}

function getRoutes(app) {
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { id, password } = req.body;
      if (!id || !password) return res.status(400).json({ error: 'Missing credentials' });
      const result = await db.query('SELECT * FROM users WHERE id = $1', [id]);
      const user = result.rows[0];
      if (!user) return res.status(401).json({ error: 'Invalid credentials' });
      if (!user.password_hash) return res.status(401).json({ error: 'This account uses SSO login' });
      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
      const token = generateToken(user);
      res.json({ token, user: { id: user.id, name: user.name, role: user.role, team_id: user.team_id } });
    } catch (err) { console.error('Login error:', err); res.status(500).json({ error: 'Server error' }); }
  });
}

module.exports = { name: 'local', isEnabled, getRoutes };
