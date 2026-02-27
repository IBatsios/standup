const db = require('../db');
const { generateToken } = require('../auth');

function isEnabled() {
  return !!(process.env.SAML_ENTRYPOINT && process.env.SAML_ISSUER && process.env.SAML_CERT);
}

let samlInstance = null;

async function getSaml() {
  if (samlInstance) return samlInstance;
  // Dynamic import — only loaded when SAML is enabled, avoids hard dependency
  const { SAML } = require('@node-saml/node-saml');
  samlInstance = new SAML({
    callbackUrl: process.env.SAML_CALLBACK_URL || 'http://localhost:8880/api/auth/saml/acs',
    entryPoint: process.env.SAML_ENTRYPOINT,
    issuer: process.env.SAML_ISSUER || 'standup',
    idpCert: process.env.SAML_CERT || '',
    wantAssertionsSigned: true,
    wantAuthnResponseSigned: false,
    acceptedClockSkewMs: 5000,
  });
  return samlInstance;
}

// JIT (Just-In-Time) user provisioning from SAML attributes
async function findOrCreateUser(profile) {
  const email = profile.nameID || '';
  const firstName = profile['urn:oid:2.5.4.42'] || profile.firstName || '';
  const lastName = profile['urn:oid:2.5.4.4'] || profile.lastName || '';
  const displayName = profile['urn:oid:2.16.840.1.113730.3.1.241']
    || profile.displayName
    || `${firstName} ${lastName}`.trim()
    || email;

  // Derive user ID from email: "john.doe@company.com" -> "john.doe"
  const userId = email.split('@')[0].toLowerCase().replace(/[^a-z0-9.]/g, '.');

  const existing = await db.query('SELECT * FROM users WHERE id = $1', [userId]);
  if (existing.rows[0]) return existing.rows[0];

  // Auto-provision new user (no team — admin assigns later)
  const defaultRole = process.env.SAML_DEFAULT_ROLE || 'employee';

  await db.query(
    'INSERT INTO users (id, name, role, team_id, password_hash) VALUES ($1, $2, $3, $4, $5)',
    [userId, displayName, defaultRole, null, null]
  );

  const created = await db.query('SELECT * FROM users WHERE id = $1', [userId]);
  return created.rows[0];
}

function getRoutes(app) {
  // Initiate SAML login — browser navigates here directly
  app.get('/api/auth/saml/login', async (req, res) => {
    try {
      const saml = await getSaml();
      const url = await saml.getAuthorizeUrlAsync('', req.headers.host, {});
      res.redirect(url);
    } catch (err) {
      console.error('SAML login initiation error:', err);
      res.redirect('/?error=saml_init_failed');
    }
  });

  // ACS (Assertion Consumer Service) — Keycloak POSTs here after authentication
  app.post('/api/auth/saml/acs', async (req, res) => {
    try {
      const saml = await getSaml();
      const { profile } = await saml.validatePostResponseAsync(req.body);
      const user = await findOrCreateUser(profile);
      const token = generateToken(user);
      const frontendUrl = process.env.FRONTEND_URL || '/';
      res.redirect(`${frontendUrl}?token=${encodeURIComponent(token)}`);
    } catch (err) {
      console.error('SAML ACS error:', err);
      res.redirect('/?error=saml_auth_failed');
    }
  });

  // SP metadata endpoint for Keycloak configuration
  app.get('/api/auth/saml/metadata', async (req, res) => {
    try {
      const saml = await getSaml();
      const metadata = saml.generateServiceProviderMetadata(null, null);
      res.type('application/xml');
      res.send(metadata);
    } catch (err) {
      console.error('SAML metadata error:', err);
      res.status(500).json({ error: 'Failed to generate metadata' });
    }
  });
}

module.exports = { name: 'saml', isEnabled, getRoutes };
