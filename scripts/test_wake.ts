import { config } from 'dotenv';
config({ path: '.env.local' });
import { wakeBrain } from '../lib/brain/index';

async function testWake() {
  console.log("Starting Brain Wake Up...");
  try {
    const result = await wakeBrain();
    console.log("Success:", JSON.stringify(result, null, 2));
  } catch (error) {
    console.error("Failed:", error);
  }
}

testWake().catch(console.error).finally(() => process.exit(0));
