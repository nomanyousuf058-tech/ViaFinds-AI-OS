import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import bcrypt from 'bcryptjs';
import { query } from '../lib/db/client';

async function run() {
  const hash = await bcrypt.hash('project.viafinds058', 12);
  await query('UPDATE admin_users SET password_hash = $1 WHERE email = $2', [hash, 'admin@viafinds.com']);
  console.log('Password updated successfully');
  process.exit(0);
}

run().catch(console.error);
