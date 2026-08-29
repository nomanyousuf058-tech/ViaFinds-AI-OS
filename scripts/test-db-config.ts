import dotenv from 'dotenv';
import { connect, getConnectionDiagnostics } from '../lib/db/client';
import { lookup } from 'node:dns';

dotenv.config({ path: '.env.local' });

async function testDnsResolution(host: string): Promise<boolean> {
  return new Promise((resolve) => {
    lookup(host, (err) => {
      if (err) {
        console.log('DNS_RESOLVE_ERROR:', err.message);
        resolve(false);
      } else {
        console.log('DNS_RESOLVE_OK:', host);
        resolve(true);
      }
    });
  });
}

async function runDiagnostics() {
  const diagnostics = getConnectionDiagnostics();

  console.log('connectionMode:', diagnostics.mode);
  console.log('host:', diagnostics.host);
  console.log('port:', diagnostics.port);
  console.log('database:', diagnostics.database);
  console.log('username:', diagnostics.user);
  console.log('hasPassword:', diagnostics.passwordSet);
  console.log('sslEnabled:', diagnostics.sslEnabled);

  console.log('Testing DNS resolution for:', diagnostics.host);
  const dnsOk = await testDnsResolution(diagnostics.host);
  console.log('DNS_RESOLVED:', dnsOk);

  console.log('Testing PostgreSQL connection (SELECT 1)...');
  try {
    const connected = await connect();
    console.log('SELECT_1_RESULT:', connected);
  } catch (error) {
    console.log('SELECT_1_ERROR:', error instanceof Error ? error.message : String(error));
  }
}

runDiagnostics();
