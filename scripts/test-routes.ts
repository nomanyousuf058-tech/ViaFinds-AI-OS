const http = require('http')

function request(options, body) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      const chunks = []
      res.on('data', (c) => chunks.push(c))
      res.on('end', () => {
        const data = Buffer.concat(chunks).toString()
        resolve({ status: res.statusCode, headers: res.headers, body: data })
      })
    })
    req.on('error', reject)
    req.setTimeout(15000, () => {
      req.destroy()
      reject(new Error('Timeout'))
    })
    if (body) {
      req.write(body)
    }
    req.end()
  })
}

async function main() {
  console.log('=== Testing Auth Endpoints ===')
  
  const loginBody = JSON.stringify({ email: 'admin@viafinds.com', password: 'project.viafinds058' })
  const loginRes = await request({
    hostname: '127.0.0.1',
    port: 3000,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(loginBody), 'Connection': 'close' }
  }, loginBody)
  console.log('POST /api/auth/login:', loginRes.status, loginRes.body)
  const cookieHeader = loginRes.headers['set-cookie']
  let cookie = ''
  if (cookieHeader) {
    cookie = cookieHeader.find(c => c.startsWith('admin_session='))?.split(';')[0] || ''
  }
  console.log('Cookie obtained:', !!cookie)

  const verifyRes = await request({
    hostname: '127.0.0.1',
    port: 3000,
    path: '/api/auth/verify',
    method: 'GET',
    headers: { Cookie: cookie, Connection: 'close' }
  })
  console.log('GET /api/auth/verify:', verifyRes.status, verifyRes.body)

  console.log('\n=== Testing Automation Route ===')
  const automationRes = await request({
    hostname: '127.0.0.1',
    port: 3000,
    path: '/api/automation/run',
    method: 'GET',
    headers: { Cookie: cookie, Connection: 'close' }
  })
  console.log('GET /api/automation/run:', automationRes.status, automationRes.body.substring(0, 200))

  console.log('\n=== Testing Services Health Route ===')
  const servicesHealthRes = await request({
    hostname: '127.0.0.1',
    port: 3000,
    path: '/api/services/health',
    method: 'GET',
    headers: { Cookie: cookie, Connection: 'close' }
  })
  console.log('GET /api/services/health:', servicesHealthRes.status, servicesHealthRes.body.substring(0, 200))

  console.log('\n=== Testing Search Intelligence Status Route ===')
  const searchStatusRes = await request({
    hostname: '127.0.0.1',
    port: 3000,
    path: '/api/search-intelligence/status',
    method: 'GET',
    headers: { Cookie: cookie, Connection: 'close' }
  })
  console.log('GET /api/search-intelligence/status:', searchStatusRes.status, searchStatusRes.body.substring(0, 200))

  console.log('\n=== Testing Dashboard Stats Route ===')
  const statsRes = await request({
    hostname: '127.0.0.1',
    port: 3000,
    path: '/api/dashboard/stats',
    method: 'GET',
    headers: { Cookie: cookie, Connection: 'close' }
  })
  console.log('GET /api/dashboard/stats:', statsRes.status, statsRes.body)
}

main().catch(e => console.error('Fatal:', e))
