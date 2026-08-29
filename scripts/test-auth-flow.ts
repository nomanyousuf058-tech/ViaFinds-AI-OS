import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function testAuthFlow() {
  console.log('=== AUTH FLOW TEST ===');
  
  const adminEmail = process.env.INITIAL_ADMIN_EMAIL || 'admin@viafinds.com';
  const adminPassword = process.env.INITIAL_ADMIN_PASSWORD;

  console.log('adminEmail:', adminEmail);
  console.log('hasPassword:', !!adminPassword);

  if (!adminPassword) {
    console.log('FAIL: INITIAL_ADMIN_PASSWORD not set');
    return;
  }

  console.log('\n1. Testing login API...');
  let adminSessionCookie: string | undefined;
  
  try {
    const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: adminEmail,
        password: adminPassword,
      }),
    });

    const loginData = await loginResponse.json();
    console.log('   loginStatus:', loginResponse.status);
    console.log('   loginSuccess:', loginData.success);
    
    if (loginData.success) {
      const setCookieHeader = loginResponse.headers.get('set-cookie');
      const cookieMatch = setCookieHeader?.match(/admin_session=([^;]+)/);
      adminSessionCookie = cookieMatch?.[1];
      console.log('   cookieCaptured:', !!adminSessionCookie);
    } else {
      console.log('   loginError:', loginData.error);
      return;
    }
  } catch (error) {
    console.log('   loginApiError:', error instanceof Error ? error.message : String(error));
    return;
  }

  console.log('\n2. Testing verify API with session...');
  try {
    const verifyResponse = await fetch('http://localhost:3000/api/auth/verify', {
      headers: {
        'Cookie': `admin_session=${adminSessionCookie}`,
      },
    });

    const verifyData = await verifyResponse.json();
    console.log('   verifyStatus:', verifyResponse.status);
    console.log('   verifySuccess:', verifyData.success);
    console.log('   verifyUserEmail:', verifyData.user?.email || 'none');
  } catch (error) {
    console.log('   verifyApiError:', error instanceof Error ? error.message : String(error));
  }

  console.log('\n3. Testing dashboard access with session...');
  try {
    const dashboardResponse = await fetch('http://localhost:3000/dashboard', {
      headers: {
        'Cookie': `admin_session=${adminSessionCookie}`,
      },
    });
    console.log('   dashboardStatus:', dashboardResponse.status);
    console.log('   dashboardRedirect:', dashboardResponse.redirected ? dashboardResponse.url : 'no redirect');
  } catch (error) {
    console.log('   dashboardError:', error instanceof Error ? error.message : String(error));
  }

  console.log('\n4. Testing logout...');
  try {
    const logoutResponse = await fetch('http://localhost:3000/api/auth/logout', {
      method: 'POST',
      headers: {
        'Cookie': `admin_session=${adminSessionCookie}`,
      },
    });

    const logoutData = await logoutResponse.json();
    console.log('   logoutStatus:', logoutResponse.status);
    console.log('   logoutSuccess:', logoutData.success);
  } catch (error) {
    console.log('   logoutError:', error instanceof Error ? error.message : String(error));
  }

  console.log('\n5. Testing verify API after logout...');
  try {
    const verifyAfterLogoutResponse = await fetch('http://localhost:3000/api/auth/verify', {
      headers: {
        'Cookie': `admin_session=${adminSessionCookie}`,
      },
    });

    const verifyAfterLogoutData = await verifyAfterLogoutResponse.json();
    console.log('   verifyStatus:', verifyAfterLogoutResponse.status);
    console.log('   verifySuccess:', verifyAfterLogoutData.success);
  } catch (error) {
    console.log('   verifyAfterLogoutError:', error instanceof Error ? error.message : String(error));
  }

  console.log('\n=== AUTH FLOW TEST COMPLETE ===');
}

testAuthFlow().catch((error) => {
  console.error('FATAL:', error instanceof Error ? error.message : String(error));
  process.exit(1);
});
