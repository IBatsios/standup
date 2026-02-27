const local = require('./local');
const saml = require('./saml');

// Register all auth providers here. To add a new provider:
// 1. Create a module in this directory with { name, isEnabled(), getRoutes(app) }
// 2. Add it to this array
const providers = [local, saml];

function getEnabledProviders() {
  return providers.filter(p => p.isEnabled());
}

function mountAll(app) {
  const enabled = getEnabledProviders();
  console.log('Auth providers:', enabled.map(p => p.name).join(', ') || 'none');
  enabled.forEach(p => p.getRoutes(app));
}

function getProviderNames() {
  return getEnabledProviders().map(p => p.name);
}

module.exports = { mountAll, getProviderNames };
