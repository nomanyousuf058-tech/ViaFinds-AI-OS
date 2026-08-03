const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env.local') });

async function run() {
  const { GET } = require('./app/api/health-debug/route');
  const response = await GET();
  const json = await response.json();
  console.log(JSON.stringify(json, null, 2));
}

run();
