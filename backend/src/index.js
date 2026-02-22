const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const db = require('./db');
const { generateToken, authMiddleware } = require('./auth');
const { canEdit, getVisibleUserIds } = require('./permissions');

const app = express();
app.use(cors());
app.use(express.json());

// ─── Auth ─────────────────────────────────────────────────────────────────────
app.post('/api/auth/login', async (req, res) => {
  try {
    const { id, password } = req.body;
    if (!id || !password) return res.status(400).json({ error: 'Missing credentials' });
    const result = await db.query('SELECT * FROM users WHERE id = $1', [id]);
    const user = result.rows[0];
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
    const token = generateToken(user);
    res.json({ token, user: { id: user.id, name: user.name, role: user.role, team_id: user.team_id } });
  } catch (err) { console.error('Login error:', err); res.status(500).json({ error: 'Server error' }); }
});

app.get('/api/auth/me', authMiddleware, async (req, res) => {
  try {
    const result = await db.query('SELECT id, name, role, team_id FROM users WHERE id = $1', [req.user.id]);
    if (!result.rows[0]) return res.status(404).json({ error: 'User not found' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// ─── Users ────────────────────────────────────────────────────────────────────
app.get('/api/users', authMiddleware, async (req, res) => {
  try {
    const visibleIds = await getVisibleUserIds(req.user.id);
    const result = await db.query('SELECT id, name, role, team_id FROM users WHERE id = ANY($1) ORDER BY name', [visibleIds]);
    const teamsRes = await db.query('SELECT user_id, team_id, team_role FROM user_teams WHERE user_id = ANY($1)', [visibleIds]);
    const teamMap = {};
    teamsRes.rows.forEach(r => {
      if (!teamMap[r.user_id]) teamMap[r.user_id] = [];
      teamMap[r.user_id].push({ team_id: r.team_id, role: r.team_role });
    });
    const users = result.rows.map(u => ({
      ...u,
      team_ids: (teamMap[u.id] || []).map(t => t.team_id),
      team_memberships: teamMap[u.id] || []
    }));
    res.json(users);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// Returns all users sharing a team with the current user (for handoff dropdown)
app.get('/api/users/teammates', authMiddleware, async (req, res) => {
  try {
    const myTeams = await db.query(
      'SELECT team_id FROM user_teams WHERE user_id = $1',
      [req.user.id]
    );
    const teamIds = myTeams.rows.map(r => r.team_id);
    if (teamIds.length === 0) return res.json([]);

    const result = await db.query(
      `SELECT DISTINCT u.id, u.name, u.role, u.team_id
       FROM users u
       JOIN user_teams ut ON ut.user_id = u.id
       WHERE ut.team_id = ANY($1)
       ORDER BY u.name`,
      [teamIds]
    );
    const allIds = result.rows.map(r => r.id);
    const teamsRes = await db.query(
      'SELECT user_id, team_id, team_role FROM user_teams WHERE user_id = ANY($1)',
      [allIds]
    );
    const teamMap = {};
    teamsRes.rows.forEach(r => {
      if (!teamMap[r.user_id]) teamMap[r.user_id] = [];
      teamMap[r.user_id].push({ team_id: r.team_id, role: r.team_role });
    });
    const users = result.rows.map(u => ({
      ...u,
      team_ids: (teamMap[u.id] || []).map(t => t.team_id),
      team_memberships: teamMap[u.id] || []
    }));
    res.json(users);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

app.post('/api/users', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'owner' && req.user.role !== 'manager') return res.status(403).json({ error: 'Insufficient permissions' });
    const { id, name, role, team_memberships, password } = req.body;
    if (!id || !name || !role || !password) return res.status(400).json({ error: 'Missing required fields' });
    const hash = await bcrypt.hash(password, 10);
    const memberships = team_memberships || [];
    const primaryTeam = memberships.length > 0 ? memberships[0].team_id : null;
    await db.query('INSERT INTO users (id, name, role, team_id, password_hash) VALUES ($1, $2, $3, $4, $5)', [id, name, role, primaryTeam, hash]);
    for (const m of memberships) {
      await db.query('INSERT INTO user_teams (user_id, team_id, team_role) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING', [id, m.team_id, m.role || 'employee']);
    }
    res.status(201).json({ id, name, role, team_id: primaryTeam, team_ids: memberships.map(m => m.team_id), team_memberships: memberships });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'User ID already exists' });
    console.error(err); res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/users/:id', authMiddleware, async (req, res) => {
  try {
    const allowed = await canEdit(req.user.id, req.params.id);
    if (!allowed) return res.status(403).json({ error: 'Insufficient permissions' });
    const { name, role, team_memberships, password } = req.body;
    const memberships = team_memberships || [];
    const primaryTeam = memberships.length > 0 ? memberships[0].team_id : null;
    if (password) {
      const hash = await bcrypt.hash(password, 10);
      await db.query('UPDATE users SET name = COALESCE($1, name), role = COALESCE($2, role), team_id = COALESCE($3, team_id), password_hash = $4 WHERE id = $5', [name, role, primaryTeam, hash, req.params.id]);
    } else {
      await db.query('UPDATE users SET name = COALESCE($1, name), role = COALESCE($2, role), team_id = COALESCE($3, team_id) WHERE id = $4', [name, role, primaryTeam, req.params.id]);
    }
    if (team_memberships !== undefined) {
      await db.query('DELETE FROM user_teams WHERE user_id = $1', [req.params.id]);
      for (const m of memberships) {
        await db.query('INSERT INTO user_teams (user_id, team_id, team_role) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING', [req.params.id, m.team_id, m.role || 'employee']);
      }
    }
    res.json({ success: true });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

app.delete('/api/users/:id', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'owner' && req.user.role !== 'manager') return res.status(403).json({ error: 'Insufficient permissions' });
    if (req.params.id === req.user.id) return res.status(400).json({ error: 'Cannot delete yourself' });
    await db.query('UPDATE teams SET manager_id = NULL WHERE manager_id = $1', [req.params.id]);
    await db.query('UPDATE teams SET lead_id = NULL WHERE lead_id = $1', [req.params.id]);
    await db.query('DELETE FROM users WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// ─── Teams ────────────────────────────────────────────────────────────────────
app.get('/api/teams', authMiddleware, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM teams ORDER BY name');
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

app.get('/api/teams/led-by-me', authMiddleware, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM teams WHERE lead_id = $1 ORDER BY name', [req.user.id]);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

app.post('/api/teams', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'owner' && req.user.role !== 'manager') return res.status(403).json({ error: 'Insufficient permissions' });
    const { id, name, manager_id, lead_id } = req.body;
    if (!id || !name) return res.status(400).json({ error: 'Missing required fields' });
    await db.query('INSERT INTO teams (id, name, manager_id, lead_id) VALUES ($1, $2, $3, $4)', [id, name, manager_id || null, lead_id || null]);
    res.status(201).json({ id, name, manager_id, lead_id });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Team ID already exists' });
    console.error(err); res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/teams/:id', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'owner' && req.user.role !== 'manager') return res.status(403).json({ error: 'Insufficient permissions' });
    const { name, manager_id, lead_id } = req.body;
    await db.query('UPDATE teams SET name = COALESCE($1, name), manager_id = $2, lead_id = $3 WHERE id = $4', [name, manager_id || null, lead_id || null, req.params.id]);
    res.json({ success: true });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

app.delete('/api/teams/:id', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'owner' && req.user.role !== 'manager') return res.status(403).json({ error: 'Insufficient permissions' });
    await db.query('UPDATE users SET team_id = NULL WHERE team_id = $1', [req.params.id]);
    await db.query('DELETE FROM teams WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// ─── Clients ──────────────────────────────────────────────────────────────────
app.get('/api/clients', authMiddleware, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM clients ORDER BY name');
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

app.post('/api/clients', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'owner' && req.user.role !== 'manager') return res.status(403).json({ error: 'Insufficient permissions' });
    const { id, name } = req.body;
    if (!id || !name) return res.status(400).json({ error: 'Missing required fields' });
    await db.query('INSERT INTO clients (id, name) VALUES ($1, $2)', [id, name]);
    res.status(201).json({ id, name });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Client ID already exists' });
    console.error(err); res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/clients/:id', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'owner' && req.user.role !== 'manager') return res.status(403).json({ error: 'Insufficient permissions' });
    const { name } = req.body;
    await db.query('UPDATE clients SET name = $1 WHERE id = $2', [name, req.params.id]);
    res.json({ success: true });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

app.delete('/api/clients/:id', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'owner' && req.user.role !== 'manager') return res.status(403).json({ error: 'Insufficient permissions' });
    await db.query('UPDATE tasks SET client_id = NULL WHERE client_id = $1', [req.params.id]);
    await db.query('DELETE FROM clients WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// ─── Migration ────────────────────────────────────────────────────────────────
(async () => {
  try {
    await db.query(`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS task_date DATE`);
    await db.query(`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS url TEXT`);
    const today = new Date().toISOString().slice(0, 10);
    const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
    await db.query(`UPDATE tasks SET task_date = $1 WHERE section = 'today' AND task_date IS NULL`, [today]);
    await db.query(`UPDATE tasks SET task_date = $1 WHERE section = 'tomorrow' AND task_date IS NULL`, [tomorrow]);

    await db.query(`
      CREATE TABLE IF NOT EXISTS user_teams (
        user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
        team_id TEXT REFERENCES teams(id) ON DELETE CASCADE,
        team_role TEXT NOT NULL DEFAULT 'employee',
        PRIMARY KEY (user_id, team_id)
      )
    `);
    await db.query(`ALTER TABLE user_teams ADD COLUMN IF NOT EXISTS team_role TEXT NOT NULL DEFAULT 'employee'`);
    await db.query(`
      INSERT INTO user_teams (user_id, team_id, team_role)
      SELECT id, team_id, role FROM users WHERE team_id IS NOT NULL
      ON CONFLICT (user_id, team_id) DO NOTHING
    `);

    // Task handoff history table
    await db.query(`
      CREATE TABLE IF NOT EXISTS task_history (
        id SERIAL PRIMARY KEY,
        task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
        user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
        action TEXT NOT NULL,
        time_spent INTEGER DEFAULT 0,
        note TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    console.log('Migrations complete');
  } catch (err) { console.error('Migration error:', err); }
})();

// Helper: safely convert pg DATE value (JS Date object or string) to YYYY-MM-DD
function toDateStr(d) {
  if (!d) return null;
  if (typeof d === 'string') return d.slice(0, 10);
  // pg returns DATE columns as JS Date at midnight UTC — use UTC methods to avoid timezone shift
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// ─── Tasks ────────────────────────────────────────────────────────────────────
app.get('/api/tasks/:userId', authMiddleware, async (req, res) => {
  try {
    const visibleIds = await getVisibleUserIds(req.user.id);
    if (!visibleIds.includes(req.params.userId)) return res.status(403).json({ error: 'Cannot view this user' });

    const today = req.query.date || toDateStr(new Date());
    const tomorrow = toDateStr(new Date(new Date(today + 'T00:00:00').getTime() + 86400000));

    if (!req.query.date) {
      await db.query(`UPDATE tasks SET task_date = $1 WHERE user_id = $2 AND task_date < $1`, [today, req.params.userId]);
    }

    const result = await db.query('SELECT * FROM tasks WHERE user_id = $1 ORDER BY task_date, sort_order, id', [req.params.userId]);
    const grouped = { today: [], tomorrow: [], future: [] };
    for (const row of result.rows) {
      const d = row.task_date ? toDateStr(new Date(row.task_date)) : today;
      if (d <= today) grouped.today.push({ ...row, section: 'today' });
      else if (d === tomorrow) grouped.tomorrow.push({ ...row, section: 'tomorrow' });
      else grouped.future.push({ ...row, section: 'future' });
    }
    res.json(grouped);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

app.post('/api/tasks', authMiddleware, async (req, res) => {
  try {
    const { user_id, section, text, client_id, expected_time, actual_time, url } = req.body;
    if (!user_id || !section || !text) return res.status(400).json({ error: 'Missing required fields' });

    // canEdit handles own tasks (always true) and subordinate tasks
    const allowed = await canEdit(req.user.id, user_id);
    if (!allowed) return res.status(403).json({ error: 'Insufficient permissions' });

    const baseDate = req.body.selected_date || toDateStr(new Date());
    const tomorrow = toDateStr(new Date(new Date(baseDate + 'T00:00:00').getTime() + 86400000));
    const farFuture = toDateStr(new Date(new Date(baseDate + 'T00:00:00').getTime() + 86400000 * 7)); // 7 days out
	const task_date = section === 'today' ? baseDate : section === 'tomorrow' ? tomorrow : farFuture;
    const orderRes = await db.query('SELECT COALESCE(MAX(sort_order), -1) + 1 as next_order FROM tasks WHERE user_id = $1 AND task_date IS NOT DISTINCT FROM $2', [user_id, task_date]);
    const result = await db.query(
      'INSERT INTO tasks (user_id, section, task_date, text, client_id, expected_time, actual_time, url, sort_order) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *',
      [user_id, section, task_date, text, client_id || null, expected_time || 0, actual_time, url || null, orderRes.rows[0].next_order]
    );

    // Log creation in history
    await db.query('INSERT INTO task_history (task_id, user_id, action, note) VALUES ($1, $2, $3, $4)', [result.rows[0].id, req.user.id, 'created', text]);

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Task creation error:', err.message, err.detail || '');
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

app.put('/api/tasks/:id', authMiddleware, async (req, res) => {
  try {
    const taskRes = await db.query('SELECT * FROM tasks WHERE id = $1', [req.params.id]);
    if (!taskRes.rows[0]) return res.status(404).json({ error: 'Task not found' });
    const allowed = await canEdit(req.user.id, taskRes.rows[0].user_id);
    if (!allowed) return res.status(403).json({ error: 'Insufficient permissions' });

    const { text, client_id, expected_time, actual_time, section, url } = req.body;
    let task_date = taskRes.rows[0].task_date;
    if (section && section !== taskRes.rows[0].section) {
      const today = toDateStr(new Date());
      const tomorrow = toDateStr(new Date(Date.now() + 86400000));
      task_date = section === 'today' ? today : section === 'tomorrow' ? tomorrow : null;
    }
    const result = await db.query(
      `UPDATE tasks SET text = COALESCE($1, text), client_id = $2, expected_time = COALESCE($3, expected_time),
       actual_time = $4, section = COALESCE($5, section), task_date = $6, url = $7, updated_at = NOW()
       WHERE id = $8 RETURNING *`,
      [text, client_id, expected_time, actual_time, section, task_date, url !== undefined ? url : taskRes.rows[0].url, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

app.delete('/api/tasks/:id', authMiddleware, async (req, res) => {
  try {
    const taskRes = await db.query('SELECT * FROM tasks WHERE id = $1', [req.params.id]);
    if (!taskRes.rows[0]) return res.status(404).json({ error: 'Task not found' });
    const allowed = await canEdit(req.user.id, taskRes.rows[0].user_id);
    if (!allowed) return res.status(403).json({ error: 'Insufficient permissions' });
    await db.query('DELETE FROM tasks WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// ─── Task Handoff ─────────────────────────────────────────────────────────────
app.post('/api/tasks/:id/handoff', authMiddleware, async (req, res) => {
  try {
    const taskRes = await db.query('SELECT * FROM tasks WHERE id = $1', [req.params.id]);
    if (!taskRes.rows[0]) return res.status(404).json({ error: 'Task not found' });
    const allowed = await canEdit(req.user.id, taskRes.rows[0].user_id);
    if (!allowed) return res.status(403).json({ error: 'Insufficient permissions' });

    const { to_user_id, time_spent, note } = req.body;
    if (!to_user_id) return res.status(400).json({ error: 'to_user_id required' });

    // Log the handoff from current owner
    await db.query('INSERT INTO task_history (task_id, user_id, action, time_spent, note) VALUES ($1, $2, $3, $4, $5)',
	  [req.params.id, req.user.id, 'handoff', time_spent || 0, note || null]);

    // Transfer task to new user, keep in their today
    const today = toDateStr(new Date());
    await db.query('UPDATE tasks SET user_id = $1, actual_time = 0, task_date = $2, section = $3, updated_at = NOW() WHERE id = $4',
      [to_user_id, today, 'today', req.params.id]);

    // Log receipt by new user
    await db.query('INSERT INTO task_history (task_id, user_id, action, note) VALUES ($1, $2, $3, $4)',
      [req.params.id, to_user_id, 'received', note || null]);

    const updated = await db.query('SELECT * FROM tasks WHERE id = $1', [req.params.id]);
    res.json(updated.rows[0]);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// ─── Task History ─────────────────────────────────────────────────────────────
app.get('/api/tasks/:id/history', authMiddleware, async (req, res) => {
  try {
    const taskRes = await db.query('SELECT * FROM tasks WHERE id = $1', [req.params.id]);
    if (!taskRes.rows[0]) return res.status(404).json({ error: 'Task not found' });
    const visibleIds = await getVisibleUserIds(req.user.id);
    if (!visibleIds.includes(taskRes.rows[0].user_id)) return res.status(403).json({ error: 'Cannot view this task' });

    const result = await db.query(`
      SELECT th.*, u.name as user_name
      FROM task_history th
      LEFT JOIN users u ON u.id = th.user_id
      WHERE th.task_id = $1
      ORDER BY th.created_at ASC
    `, [req.params.id]);
    res.json({ task: taskRes.rows[0], history: result.rows });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/api/health', async (req, res) => {
  try {
    await db.query('SELECT 1');
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  } catch { res.status(503).json({ status: 'db_error' }); }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => { console.log(`StandUp API running on port ${PORT}`); });
