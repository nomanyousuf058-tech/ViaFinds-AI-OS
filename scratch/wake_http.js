// Mint a real admin JWT (same algorithm as lib/auth.createAdminToken) and
// POST to the real /api/brain/wake endpoint over HTTP.
require('dotenv').config({ path: '.env.local' });
const { SignJWT } = require('jose');
const http = require('http');

const ADMIN_ID = '8db92716-57b3-4d52-94bd-6f6b292f6742';
const ADMIN_EMAIL = 'admin@viafinds.com';
const SECRET = process.env.ADMIN_JWT_SECRET || '';
const BASE = process.env.WAKE_BASE_URL || 'http://localhost:3000';
console.error('DEBUG secret len=' + SECRET.length + ' cwd=' + process.cwd());

async function main() {
  if (!SECRET) { console.error('ADMIN_JWT_SECRET missing'); process.exit(2); }
  const secret = new TextEncoder().encode(SECRET);
  const token = await new SignJWT({ sub: ADMIN_ID, email: ADMIN_EMAIL, role: 'admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('1h')
    .sign(secret);

  const body = JSON.stringify({ researchQuery: 'controlled production recovery wake' });
  const url = new URL('/api/brain/wake', BASE);
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': `admin_session=${token}`,
    },
    body,
  });
  const text = await res.text();
  console.log('HTTP ' + res.status);
  let json;
  try { json = JSON.parse(text); } catch { json = { raw: text.slice(0, 500) }; }
  console.log(JSON.stringify(json, null, 2));
}
main().catch(e => { console.error('WAKE HTTP FAILED:', e.stack || e.message); process.exit(2); });