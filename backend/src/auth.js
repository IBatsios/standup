const jwt = require('jsonwebtoken');
const SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

function generateToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role, team_id: user.team_id },
    SECRET,
    { expiresIn: '24h' }
  );
}

function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  try {
    const decoded = jwt.verify(header.slice(7), SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// Role hierarchy for permission checks
const ROLE_HIERARCHY = { owner: 4, manager: 3, team_lead: 2, employee: 1 };

module.exports = { generateToken, authMiddleware, ROLE_HIERARCHY, SECRET };
