import dotenv from 'dotenv';
import { connect, getConnectionDiagnostics } from '../lib/db/client';
import { runMigrations, verifyMigration } from '../lib/db/migrate';
import { adminUsersRepository } from '../lib/db/repositories';
import bcrypt from 'bcryptjs';

dotenv.config({ path: '.env.local' });

async function testDatabase() {
  console.log('=== DATABASE CONNECTION TEST ===');
  
  const diagnostics = getConnectionDiagnostics();
  console.log('connectionMode:', diagnostics.mode);
  console.log('host:', diagnostics.host);
  console.log('port:', diagnostics.port);
  console.log('database:', diagnostics.database);
  console.log('username:', diagnostics.user);
  console.log('hasPassword:', diagnostics.passwordSet);
  console.log('sslEnabled:', diagnostics.sslEnabled);

  console.log('\n=== SELECT 1 TEST ===');
  try {
    const connected = await connect();
    console.log('SELECT_1_RESULT:', connected);
    if (!connected) {
      console.log('FAIL: Database connection failed');
      return;
    }
  } catch (error) {
    console.log('SELECT_1_ERROR:', error instanceof Error ? error.message : String(error));
    return;
  }

  console.log('\n=== MIGRATION TEST ===');
  const migrationResult = await runMigrations();
  console.log('migrationSuccess:', migrationResult.success);
  if (migrationResult.applied) {
    console.log('appliedTables:', migrationResult.applied);
  }
  if (migrationResult.error) {
    console.log('migrationError:', migrationResult.error);
  }

  console.log('\n=== VERIFICATION TEST ===');
  const verificationResult = await verifyMigration();
  console.log('verificationSuccess:', verificationResult.success);
  if (verificationResult.counts) {
    console.log('tableCounts:', JSON.stringify(verificationResult.counts));
  }
  if (verificationResult.error) {
    console.log('verificationError:', verificationResult.error);
  }

  console.log('\n=== ADMIN USERS CHECK ===');
  const adminEmail = process.env.INITIAL_ADMIN_EMAIL || 'admin@viafinds.com';
  console.log('checkingAdminEmail:', adminEmail);
  
  try {
    const existingAdmin = await adminUsersRepository.findByEmail(adminEmail);
    console.log('adminExists:', !!existingAdmin);
    
    if (!existingAdmin && process.env.INITIAL_ADMIN_PASSWORD) {
      console.log('Bootstrapping admin user...');
      const passwordHash = await bcrypt.hash(process.env.INITIAL_ADMIN_PASSWORD, 12);
      const newAdmin = await adminUsersRepository.create({
        email: adminEmail,
        password_hash: passwordHash,
        role: 'admin',
      });
      console.log('adminBootstrapped:', !!newAdmin);
    }
  } catch (error) {
    console.log('adminCheckError:', error instanceof Error ? error.message : String(error));
  }

  console.log('\n=== PASSWORD VERIFICATION TEST ===');
  if (process.env.INITIAL_ADMIN_PASSWORD) {
    try {
      const admin = await adminUsersRepository.findByEmail(adminEmail);
      if (admin) {
        const isValid = await bcrypt.compare(process.env.INITIAL_ADMIN_PASSWORD, admin.password_hash);
        console.log('passwordValid:', isValid);
      } else {
        console.log('passwordCheckSkipped: admin not found');
      }
    } catch (error) {
      console.log('passwordCheckError:', error instanceof Error ? error.message : String(error));
    }
  } else {
    console.log('passwordCheckSkipped: INITIAL_ADMIN_PASSWORD not set');
  }

  console.log('\n=== DATABASE TEST COMPLETE ===');
}

testDatabase().catch((error) => {
  console.error('FATAL:', error instanceof Error ? error.message : String(error));
  process.exit(1);
});
