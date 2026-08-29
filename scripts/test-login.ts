import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';

dotenv.config({ path: '.env.local' });

async function testLogin() {
  console.log('=== LOGIN TEST ===');
  
  const adminEmail = process.env.INITIAL_ADMIN_EMAIL || 'admin@viafinds.com';
  const adminPassword = process.env.INITIAL_ADMIN_PASSWORD;
  const jwtSecret = process.env.ADMIN_JWT_SECRET;

  console.log('adminEmail:', adminEmail);
  console.log('hasPassword:', !!adminPassword);
  console.log('hasJwtSecret:', !!jwtSecret);

  if (!adminPassword || !jwtSecret) {
    console.log('FAIL: Missing INITIAL_ADMIN_PASSWORD or ADMIN_JWT_SECRET');
    return;
  }

  console.log('\n=== JWT CREATION TEST ===');
  try {
    const token = jwt.sign(
      { sub: 'admin-1', email: adminEmail, role: 'admin' },
      jwtSecret,
      { expiresIn: '1h' }
    );
    console.log('jwtCreated:', !!token);
    console.log('jwtLength:', token.length);
  } catch (error) {
    console.log('jwtCreateError:', error instanceof Error ? error.message : String(error));
  }

  console.log('\n=== LOGIN TEST COMPLETE ===');
}

testLogin().catch((error) => {
  console.error('FATAL:', error instanceof Error ? error.message : String(error));
  process.exit(1);
});
