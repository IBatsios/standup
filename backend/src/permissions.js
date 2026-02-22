const db = require('./db');
const { ROLE_HIERARCHY } = require('./auth');

// Get all team IDs a user belongs to (via user_teams junction table)
async function getUserTeamIds(userId) {
  const res = await db.query('SELECT team_id FROM user_teams WHERE user_id = $1', [userId]);
  return res.rows.map(r => r.team_id);
}

async function canEdit(currentUserId, targetUserId) {
  if (currentUserId === targetUserId) return true;

  const cuRes = await db.query('SELECT id, role FROM users WHERE id = $1', [currentUserId]);
  const tuRes = await db.query('SELECT id, role FROM users WHERE id = $1', [targetUserId]);
  if (!cuRes.rows[0] || !tuRes.rows[0]) return false;

  const cu = cuRes.rows[0];
  const tu = tuRes.rows[0];

  if (cu.role === 'owner') return true;

  if (cu.role === 'manager') {
    const teamsRes = await db.query('SELECT id, lead_id FROM teams WHERE manager_id = $1', [currentUserId]);
    const managedTeamIds = teamsRes.rows.map(r => r.id);
    const leadIds = teamsRes.rows.map(r => r.lead_id).filter(Boolean);
    if (leadIds.includes(targetUserId)) return true;
    const tuTeams = await getUserTeamIds(targetUserId);
    return tuTeams.some(tid => managedTeamIds.includes(tid));
  }

  if (cu.role === 'team_lead') {
    const ledTeamsRes = await db.query('SELECT id FROM teams WHERE lead_id = $1', [currentUserId]);
    const ledTeamIds = ledTeamsRes.rows.map(r => r.id);
    const cuTeams = await getUserTeamIds(currentUserId);
    const allLeadTeams = [...new Set([...ledTeamIds, ...cuTeams])];
    const tuTeams = await getUserTeamIds(targetUserId);
    const sharedTeam = tuTeams.some(tid => allLeadTeams.includes(tid));
    return sharedTeam && ROLE_HIERARCHY[tu.role] < ROLE_HIERARCHY[cu.role];
  }

  return false;
}

async function getVisibleUserIds(userId) {
  const userRes = await db.query('SELECT id, role FROM users WHERE id = $1', [userId]);
  if (!userRes.rows[0]) return [];
  const user = userRes.rows[0];

  if (user.role === 'owner') {
    const all = await db.query('SELECT id FROM users');
    return all.rows.map(r => r.id);
  }

  if (user.role === 'manager') {
    const teamsRes = await db.query('SELECT id, lead_id FROM teams WHERE manager_id = $1', [userId]);
    const managedTeamIds = teamsRes.rows.map(r => r.id);
    const leadIds = teamsRes.rows.map(r => r.lead_id).filter(Boolean);
    const membersRes = await db.query(
      'SELECT DISTINCT user_id FROM user_teams WHERE team_id = ANY($1)',
      [managedTeamIds]
    );
    const ids = new Set([userId, ...membersRes.rows.map(r => r.user_id), ...leadIds]);
    return [...ids];
  }

  if (user.role === 'team_lead') {
    const ledTeamsRes = await db.query('SELECT id FROM teams WHERE lead_id = $1', [userId]);
    const ledTeamIds = ledTeamsRes.rows.map(r => r.id);
    const myTeams = await getUserTeamIds(userId);
    const allTeamIds = [...new Set([...ledTeamIds, ...myTeams])];
    if (allTeamIds.length === 0) return [userId];
    const membersRes = await db.query(
      'SELECT DISTINCT user_id FROM user_teams WHERE team_id = ANY($1)',
      [allTeamIds]
    );
    const ids = new Set([userId, ...membersRes.rows.map(r => r.user_id)]);
    return [...ids];
  }

  return [userId];
}

module.exports = { canEdit, getVisibleUserIds };
