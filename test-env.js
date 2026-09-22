const fs = require('fs');
const dotenv = require('dotenv');
const { Client } = require('pg');
const { google } = require('googleapis');

async function fetchWithTimeout(resource, options = {}) {
  const { timeout = 8000 } = options;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(resource, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
}

async function testServices() {
  console.log("=== PARSING .ENV.LOCAL ===");
  const envConfig = dotenv.parse(fs.readFileSync('.env.local'));
  
  const results = {
    working: [],
    broken: [],
    missing: []
  };

  const addWorking = (name, msg) => {
    console.log(`[WORKING] ${name}: ${msg}`);
    results.working.push({ name, msg });
  };
  const addBroken = (name, msg) => {
    console.log(`[BROKEN] ${name}: ${msg}`);
    results.broken.push({ name, msg });
  };
  const addMissing = (name, msg) => {
    console.log(`[MISSING] ${name}: ${msg}`);
    results.missing.push({ name, msg });
  };

  // 1. Supabase (Postgres)
  console.log("\n=== TESTING SUPABASE (POSTGRES) ===");
  if (envConfig.DATABASE_URL) {
    const client = new Client({
      connectionString: envConfig.DATABASE_URL,
      ssl: envConfig.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
      connectionTimeoutMillis: 5000
    });
    try {
      await client.connect();
      const res = await client.query('SELECT NOW()');
      addWorking('DATABASE_URL (Supabase Postgres)', 'Connected and executed SELECT NOW()');
      await client.end();
    } catch (e) {
      addBroken('DATABASE_URL (Supabase Postgres)', `Failed to connect: ${e.message}`);
    }
  } else {
    addMissing('DATABASE_URL', 'Missing in .env.local');
  }

  // 2. OpenAI
  console.log("\n=== TESTING OPENAI ===");
  if (envConfig.OPENAI_API_KEY) {
    try {
      const response = await fetchWithTimeout('https://api.openai.com/v1/models', {
        headers: { 'Authorization': `Bearer ${envConfig.OPENAI_API_KEY}` },
        timeout: 5000
      });
      if (response.ok) {
        addWorking('OPENAI_API_KEY', 'Authenticated successfully');
      } else {
        const body = await response.text();
        addBroken('OPENAI_API_KEY', `Failed with status ${response.status}: ${body.substring(0, 50)}...`);
      }
    } catch (e) {
      addBroken('OPENAI_API_KEY', `Fetch error: ${e.message}`);
    }
  } else if (envConfig.ENABLE_OPENAI === 'true') {
    addMissing('OPENAI_API_KEY', 'Enabled but missing');
  }

  // 3. Anthropic
  console.log("\n=== TESTING ANTHROPIC ===");
  if (envConfig.ANTHROPIC_API_KEY) {
    try {
      const response = await fetchWithTimeout('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': envConfig.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307',
          max_tokens: 1,
          messages: [{ role: 'user', content: 'Ping' }]
        }),
        timeout: 5000
      });
      if (response.status !== 401 && response.status !== 403) {
        addWorking('ANTHROPIC_API_KEY', 'Authenticated successfully');
      } else {
        const body = await response.text();
        addBroken('ANTHROPIC_API_KEY', `Failed with status ${response.status}: ${body.substring(0, 50)}...`);
      }
    } catch (e) {
      addBroken('ANTHROPIC_API_KEY', `Fetch error: ${e.message}`);
    }
  } else if (envConfig.ENABLE_ANTHROPIC === 'true') {
    addMissing('ANTHROPIC_API_KEY', 'Enabled but missing');
  }

  // 4. OpenRouter
  console.log("\n=== TESTING OPENROUTER ===");
  if (envConfig.OPENROUTER_API_KEY) {
    try {
      const response = await fetchWithTimeout('https://openrouter.ai/api/v1/auth/key', {
        headers: { 'Authorization': `Bearer ${envConfig.OPENROUTER_API_KEY}` },
        timeout: 5000
      });
      if (response.ok) {
        addWorking('OPENROUTER_API_KEY', 'Authenticated successfully');
      } else {
        const body = await response.text();
        addBroken('OPENROUTER_API_KEY', `Failed with status ${response.status}: ${body.substring(0, 50)}...`);
      }
    } catch (e) {
      addBroken('OPENROUTER_API_KEY', `Fetch error: ${e.message}`);
    }
  } else if (envConfig.ENABLE_OPENROUTER === 'true') {
    addMissing('OPENROUTER_API_KEY', 'Enabled but missing');
  }
  
  // 5. Gemini
  console.log("\n=== TESTING GEMINI ===");
  if (envConfig.GEMINI_API_KEY) {
    try {
      const response = await fetchWithTimeout(`https://generativelanguage.googleapis.com/v1beta/models?key=${envConfig.GEMINI_API_KEY}`, {
        timeout: 5000
      });
      if (response.ok) {
        addWorking('GEMINI_API_KEY', 'Authenticated successfully');
      } else {
        const body = await response.text();
        addBroken('GEMINI_API_KEY', `Failed with status ${response.status}: ${body.substring(0, 50)}...`);
      }
    } catch (e) {
      addBroken('GEMINI_API_KEY', `Fetch error: ${e.message}`);
    }
  } else if (envConfig.ENABLE_GEMINI === 'true') {
    addMissing('GEMINI_API_KEY', 'Enabled but missing');
  }

  // 6. Google Search Console Service Account
  console.log("\n=== TESTING GOOGLE SERVICE ACCOUNT ===");
  if (envConfig.GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY && envConfig.GOOGLE_SEARCH_CONSOLE_SERVICE_ACCOUNT_EMAIL) {
    try {
      let privateKey = envConfig.GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY;
      if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
        privateKey = privateKey.slice(1, -1).replace(/\\n/g, '\n');
      } else {
        privateKey = privateKey.replace(/\\n/g, '\n');
      }
      const auth = new google.auth.GoogleAuth({
        credentials: {
          client_email: envConfig.GOOGLE_SEARCH_CONSOLE_SERVICE_ACCOUNT_EMAIL.replace(/"/g, ''),
          private_key: privateKey
        },
        scopes: ['https://www.googleapis.com/auth/webmasters.readonly']
      });
      const client = await auth.getClient();
      addWorking('GOOGLE_SEARCH_CONSOLE_CREDENTIALS', 'JWT Auth Client created successfully');
    } catch (e) {
      addBroken('GOOGLE_SEARCH_CONSOLE_CREDENTIALS', `Auth error: ${e.message}`);
    }
  } else if (envConfig.ENABLE_GOOGLE_SEARCH_CONSOLE === 'true') {
    addMissing('GOOGLE_SEARCH_CONSOLE_CREDENTIALS', 'Missing private key or client email for service account');
  }

  // Check others
  console.log("\n=== CHECKING OTHER ENABLED SERVICES ===");
  if (envConfig.ENABLE_X === 'true' && !envConfig.X_API_KEY) {
    addMissing('X_API_KEY', 'ENABLE_X is true but X_API_KEY is missing');
  }
  if (envConfig.ENABLE_EMAIL === 'true' && !envConfig.DEFAULT_EMAIL_PROVIDER && !envConfig.RESEND_API_KEY && !envConfig.SENDGRID_API_KEY && !envConfig.SMTP_HOST) {
    addMissing('EMAIL_PROVIDER', 'ENABLE_EMAIL is true but no email provider is configured');
  }

  fs.writeFileSync('audit-results.json', JSON.stringify(results, null, 2));
  console.log("\nResults written to audit-results.json");
}

testServices();
