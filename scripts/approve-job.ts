import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { automationPipeline } from '@/lib/automation';

async function main() {
  const jobId = 'job_1790399508235_47xe8rl';
  console.log('Approving and continuing job:', jobId);
  try {
    const result = await automationPipeline.run(jobId);
    console.log('Result:', JSON.stringify(result, null, 2));
  } catch(e) {
    console.error('Error:', e);
  }
}
main();