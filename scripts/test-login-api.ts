import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function testLoginApi() {
  console.log('=== LOGIN API TEST ===');
  
  const adminEmail = process.env.INITIAL_ADMIN_EMAIL || 'admin@viafinds.com';
  const adminPassword = process.env.INITIAL_ADMIN_PASSWORD;

  console.log('adminEmail:', adminEmail);
  console.log('hasPassword:', !!adminPassword);

  if (!adminPassword) {
    console.log('FAIL: INITIAL_ADMIN_PASSWORD not set');
    return;
  }

  console.log('\nTesting login API...');
  
  try {
    const response = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: adminEmail,
        password: adminPassword,
      }),
    });

    const data = await response.json();
    console.log('loginStatus:', response.status);
    console.log('loginSuccess:', data.success);
    
    if (data.success) {
      const setCookieHeader = response.headers.get('set-cookie');
      console.log('setCookieHeaderPresent:', !!setCookieHeader);
      console.log('adminSessionInCookie:', setCookieHeader?.includes('admin_session=') || false);
      console.log('cookieHttpOnly:', setCookieHeader?.includes('HttpOnly') || false);
      console.log('cookieSameSite:', setCookieHeader?.includes('SameSite=Strict') || false);
    } else {
      console.log('loginError:', data.error);
    }
  } catch (error) {
    console.log('loginApiError:', error instanceof Error ? error.message : String(error));
  }

  console.log('\n=== LOGIN API TEST COMPLETE ===');
}

testLoginApi().catch((error) => {
  console.error('FATAL:', error instanceof Error ? error.message : String(error));
  process.exit(1);
});
