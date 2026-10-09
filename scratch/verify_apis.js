// Verify dashboard APIs return truthful data over the live server.
const { SignJWT } = require('jose');
require('dotenv').config({ path: '.env.local' });
const BASE = process.env.WAKE_BASE_URL || 'http://localhost:3000';

async function main() {
  const secret = new TextEncoder().encode(process.env.ADMIN_JWT_SECRET);
  const token = await new SignJWT({ sub: '8db92716-57b3-4d52-94bd-6f6b292f6742', email: 'admin@viafinds.com', role: 'admin' })
    .setProtectedHeader({ alg: 'HS256' }).setExpirationTime('1h').sign(secret);

  const endpoints = [
    '/api/brain/status',
    '/api/brain/schedules',
    '/api/brain/activity?type=approvals&limit=10',
    '/api/brain/opportunities?limit=10',
    '/api/db/health',
  ];
  for (const ep of endpoints) {
    try {
      const res = await fetch(BASE + ep, { headers: { Cookie: `admin_session=${token}` } });
      const text = await res.text();
      let snippet;
      try { snippet = JSON.stringify(JSON.parse(text)).slice(0, 220); } catch { snippet = text.slice(0, 220); }
      console.log(ep.padEnd(52) + ' HTTP ' + res.status + '  ' + snippet);
    } catch (e) {
      console.log(ep.padEnd(52) + ' FAIL ' + e.message);
    }
  }

  // Unauthorized rejection check
  const res = await fetch(BASE + '/api/brain/status');
  const text = await res.text();
  console.log('\nUNAUTH /api/brain/status HTTP ' + res.status + '  ' + text.slice(0, 120));
}
main().catch(e => { console.error(e.stack || e.message); process.exit(2); });