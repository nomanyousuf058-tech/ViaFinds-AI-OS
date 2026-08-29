import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function testDashboardAccess() {
  console.log('=== DASHBOARD ACCESS TEST ===');
  
  const adminEmail = process.env.INITIAL_ADMIN_EMAIL || 'admin@viafinds.com';
  const adminPassword = process.env.INITIAL_ADMIN_PASSWORD;

  if (!adminPassword) {
    console.log('FAIL: INITIAL_ADMIN_PASSWORD not set');
    return;
  }

  console.log('1. Logging in...');
  let adminSessionCookie: string | undefined;
  
  try {
    const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: adminEmail, password: adminPassword }),
    });

    const loginData = await loginResponse.json();
    console.log('   loginSuccess:', loginData.success);
    
    if (loginData.success) {
      const setCookieHeader = loginResponse.headers.get('set-cookie');
      const cookieMatch = setCookieHeader?.match(/admin_session=([^;]+)/);
      adminSessionCookie = cookieMatch?.[1];
      console.log('   cookieCaptured:', !!adminSessionCookie);
    }
  } catch (error) {
    console.log('   loginError:', error instanceof Error ? error.message : String(error));
    return;
  }

  const paths = ['/dashboard', '/dashboard/', '/dashboard/articles', '/dashboard/articles/'];
  
  for (const path of paths) {
    console.log(`\n2. Testing ${path}...`);
    try {
      const response = await fetch(`http://localhost:3000${path}`, {
        headers: { 'Cookie': `admin_session=${adminSessionCookie}` },
      });
      console.log(`   status: ${response.status}`);
      console.log(`   redirected: ${response.redirected}`);
      if (response.redirected) {
        console.log(`   redirectUrl: ${response.url}`);
      }
    } catch (error) {
      console.log(`   error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  console.log('\n=== DASHBOARD ACCESS TEST COMPLETE ===');
}

testDashboardAccess().catch((error) => {
  console.error('FATAL:', error instanceof Error ? error.message : String(error));
  process.exit(1);
});
