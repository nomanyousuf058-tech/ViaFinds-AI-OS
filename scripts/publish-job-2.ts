import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { automationPipeline } from '@/lib/automation';

async function main() {
  const jobId = 'job_1790400815358_8h2u69d';
  console.log('Publishing job:', jobId);
  try {
    const result = await automationPipeline.runPublishDraft(jobId, {});
    console.log('Result:', JSON.stringify(result, null, 2));
  } catch(e) {
    console.error('Error:', e);
  }
}
main();