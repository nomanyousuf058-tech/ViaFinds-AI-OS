import { NextResponse } from 'next/server';
import { automationPipeline } from '@/lib/automation';
import { jobManager } from '@/lib/automation';
import { articleRepository } from '@/lib/db/repositories';

export async function GET() {
  try {
    const job = jobManager.createJob('article_generation', 'auto', {
      topic: 'Best AI Website Builders for Startups 2026',
      category: 'ai-tools'
    });

    console.log(`Started QA Job: ${job.id}`);
    
    // Run the pipeline
    const result = await automationPipeline.run(job.id);
    
    // Check if article was created
    let article = null;
    if (result && result.status === 'completed' && result.result.published) {
      article = await articleRepository.findBySlug(result.result.slug as string);
    }
    
    return NextResponse.json({
      success: true,
      jobStatus: result?.status,
      jobResult: result?.result,
      articleSavedInDb: !!article,
      affiliateLink: result?.result?.affiliateUrl || null
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
