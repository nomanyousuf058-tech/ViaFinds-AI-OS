import dotenv from 'dotenv';
import { connect } from '../lib/db/client';

dotenv.config({ path: '.env.local' });

async function testConnection() {
  console.log('Testing connection...');
  try {
    const result = await connect();
    console.log('SELECT_1_RESULT:', result);
  } catch (error) {
    console.log('SELECT_1_ERROR:', error instanceof Error ? error.message : String(error));
  }
}

testConnection();
