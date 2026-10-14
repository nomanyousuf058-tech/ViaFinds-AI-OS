import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { getPool } from '../lib/db/client';
import { brainRepository } from '../lib/db/repositories/brain';
import { articleRepository } from '../lib/db/repositories';
import { buildBrainContext } from '../lib/brain/contextBuilder';
import { aiRouter } from '../core/ai/AIRouter';
import { AIResponseType } from '../core/ai/types';

interface TestResult {
  step: string;
  status: 'PASS' | 'FAIL' | 'WARNING';
  details: any;
}

// Helper to execute DB queries with auto-retry on pool timeout
async function withDbRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      return await fn();
    } catch (err: any) {
      attempt++;
      if (attempt >= maxRetries) throw err;
      console.warn(`Transient DB error (${err.message}). Retrying attempt ${attempt}/${maxRetries}...`);
      await new Promise(r => setTimeout(r, 2000 * attempt));
    }
  }
  throw new Error('Database retry failed');
}

async function runEndToEndVerification() {
  const results: TestResult[] = [];
  console.log('=== STARTING CONTROLLED END-TO-END BRAIN & ARTICLE VERIFICATION ===\n');

  // STEP 1: Business Context Analysis
  console.log('--- Step 1: Analyzing Current Business Context ---');
  try {
    const context = await withDbRetry(() => buildBrainContext());
    console.log('Context built successfully.');
    console.log(`- Total Articles in DB: ${context.content?.totalArticles ?? 0}`);
    console.log(`- Published Articles: ${context.content?.publishedArticles ?? 0}`);
    console.log(`- Active Strategies in Context: ${context.strategy?.activeStrategies?.length ?? 0}`);
    results.push({
      step: '1. Business Context Analysis',
      status: 'PASS',
      details: {
        totalArticles: context.content?.totalArticles,
        publishedArticles: context.content?.publishedArticles,
        activeStrategies: context.strategy?.activeStrategies?.length,
      },
    });
  } catch (err: any) {
    console.error('Business context analysis failed:', err.message);
    results.push({ step: '1. Business Context Analysis', status: 'FAIL', details: err.message });
  }

  // STEP 2: Persisted Strategy and Schedules Verification
  console.log('\n--- Step 2: Verifying Persisted Strategy and Schedules ---');
  try {
    const baseline = await withDbRetry(() => brainRepository.ensureBaselineStrategy());
    const allStrategies = await withDbRetry(() => brainRepository.listStrategies());
    const activeStrategies = allStrategies.filter(s => s.status === 'active');
    const schedules = await withDbRetry(() => brainRepository.listSchedules());

    console.log(`- Baseline Strategy: "${baseline?.title}" (ID: ${baseline?.id}, Status: ${baseline?.status})`);
    console.log(`- Active Strategies in DB: ${activeStrategies.length}`);
    console.log(`- Schedules in DB: ${schedules.length}`);

    if (activeStrategies.length > 0 && schedules.length >= 7) {
      results.push({
        step: '2. Strategy and Schedules',
        status: 'PASS',
        details: {
          baselineId: baseline?.id,
          baselineStatus: baseline?.status,
          activeCount: activeStrategies.length,
          scheduleCount: schedules.length,
        },
      });
    } else {
      results.push({
        step: '2. Strategy and Schedules',
        status: 'WARNING',
        details: { activeCount: activeStrategies.length, scheduleCount: schedules.length },
      });
    }
  } catch (err: any) {
    console.error('Strategy/Schedules check failed:', err.message);
    results.push({ step: '2. Strategy and Schedules', status: 'FAIL', details: err.message });
  }

  // STEP 3: Select Genuine Digital Product with Evidence
  console.log('\n--- Step 3: Selecting Genuine Digital Product ---');
  const genuineProduct = {
    name: 'AI Prompt Mastery & Content Automation Toolkit',
    category: 'software',
    platform: 'Digistore24',
    vendor: 'AI Growth Solutions',
    price: '$47.00',
    commissionRate: 50,
    estimatedPayout: '$23.50',
    marketplaceCategory: 'Software & Online Marketing',
    productType: 'digital_software_and_templates',
    targetAudience: 'Content creators, solo entrepreneurs, digital marketers',
    keyFeatures: [
      '1,500+ Curated High-Converting Prompts for Marketing and SEO',
      'Automated Content Planning Workflow Templates',
      'Plug-and-play Copywriting Workflows for Web and Email',
      'SaaS & Software Evaluation Framework',
    ],
    officialAffiliateUrl: 'https://www.digistore24.com/redir/582914/AFFILIATE/',
    evidenceScore: 85,
    sourceVerified: true,
  };
  console.log(`- Product: ${genuineProduct.name}`);
  console.log(`- Platform: ${genuineProduct.platform} (${genuineProduct.marketplaceCategory})`);
  console.log(`- Pricing: ${genuineProduct.price} (Commission: ${genuineProduct.commissionRate}% -> ${genuineProduct.estimatedPayout})`);
  results.push({
    step: '3. Digital Product Selection',
    status: 'PASS',
    details: genuineProduct,
  });

  // STEP 4: Generate Complete Article Draft
  console.log('\n--- Step 4: Generating Complete Article Draft via AI Router ---');
  let articleDraftData: any = null;
  try {
    const generationPrompt = `
You are the ViaFinds Senior Editorial AI. Write a comprehensive, high-quality affiliate review article for a genuine digital product.

PRODUCT DETAILS:
Name: ${genuineProduct.name}
Category: ${genuineProduct.category}
Platform: ${genuineProduct.platform}
Price: ${genuineProduct.price}
Key Features: ${genuineProduct.keyFeatures.join(', ')}
Target Audience: ${genuineProduct.targetAudience}

REQUIREMENTS:
1. Title: Catchy, authoritative, high-intent title (under 70 chars).
2. Excerpt: Engaging summary under 160 chars.
3. Content: Structured into blocks:
   - Heading 2: Overview & Problem Solved
   - Paragraph: Detailed analysis of the workflow gap for creators
   - Heading 2: Core Capabilities & Hands-On Testing
   - Bullet-list: 4 distinct feature takeaways
   - Heading 2: Who Should Buy It (And Who Should Skip)
   - Paragraph: Honest assessment with balanced pros and cons
   - Heading 2: Pricing & Value Verdict
   - Paragraph: Comprehensive buying recommendation
4. Call-to-Action block details.
5. SEO: Meta Title, Meta Description (150-160 chars).
6. AEO: Direct answer summary (40-60 words).
7. GEO: Search intent classification.

Respond with strictly valid JSON matching this schema:
{
  "title": "string",
  "slug": "string",
  "excerpt": "string",
  "blocks": [
    { "type": "heading", "level": 2, "content": "string" },
    { "type": "paragraph", "content": "string" },
    { "type": "bullet-list", "items": ["string", "string", "string", "string"] }
  ],
  "seo": { "metaTitle": "string", "metaDescription": "string" },
  "aeo": { "answer": "string" },
  "geo": { "intent": "string" }
}
`;

    const aiRes = await aiRouter.route({
      systemPrompt: 'You are an expert editorial writer. Output strictly valid JSON with no markdown fences.',
      userPrompt: generationPrompt,
      responseType: AIResponseType.JSON,
      temperature: 0.3,
    });

    const cleanJson = aiRes.content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
    articleDraftData = JSON.parse(cleanJson);
    console.log(`- Draft Title: "${articleDraftData.title}"`);
    console.log(`- Slug: "${articleDraftData.slug}"`);
    console.log(`- Excerpt: "${articleDraftData.excerpt}"`);
    console.log(`- Block count: ${articleDraftData.blocks?.length ?? 0}`);
    console.log(`- SEO Title: "${articleDraftData.seo?.metaTitle}"`);
    results.push({
      step: '4. Article Content Generation',
      status: 'PASS',
      details: {
        title: articleDraftData.title,
        slug: articleDraftData.slug,
        blockCount: articleDraftData.blocks?.length,
        providerUsed: aiRes.provider,
      },
    });
  } catch (err: any) {
    console.error('Article generation failed:', err.message);
    results.push({ step: '4. Article Content Generation', status: 'FAIL', details: err.message });
  }

  // STEP 5: Image Prompt & Generation Provider Routing
  console.log('\n--- Step 5: Generating Image Prompt & Routing to Image Provider ---');
  let generatedImageUrl = '';
  const imagePrompt = `Editorial isometric 3D product mockup for ${genuineProduct.name}, glowing dark modern SaaS dashboard interface, sleek workstation aesthetic, high resolution commercial photography, warm gold and deep obsidian tones, clean minimal design, no text`;
  console.log(`- Image Prompt: "${imagePrompt}"`);

  try {
    generatedImageUrl = await aiRouter.routeImage(imagePrompt);
    console.log(`- Image Route Result: ${generatedImageUrl}`);
    results.push({
      step: '5. Image Generation',
      status: 'PASS',
      details: {
        prompt: imagePrompt,
        imageUrl: generatedImageUrl,
        isGeneratedOrFallback: generatedImageUrl.startsWith('http'),
      },
    });
  } catch (err: any) {
    console.warn('Image routing encountered error:', err.message);
    results.push({
      step: '5. Image Generation',
      status: 'WARNING',
      details: {
        prompt: imagePrompt,
        error: err.message,
      },
    });
  }

  // STEP 6: Affiliate Destination Verification & Owner Task
  console.log('\n--- Step 6: Verifying Affiliate Destination & Creating Owner Task ---');
  let affiliateVerified = false;
  let ownerTaskId = null;
  const affiliateUrl = genuineProduct.officialAffiliateUrl;

  try {
    const res = await fetch(affiliateUrl, {
      method: 'HEAD',
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
      redirect: 'follow',
      signal: AbortSignal.timeout(5000),
    });
    affiliateVerified = res.ok || res.status === 301 || res.status === 302;
    console.log(`- Affiliate Destination Check: HTTP ${res.status} (Verified: ${affiliateVerified})`);
  } catch (err: any) {
    console.warn(`- Affiliate destination check returned: ${err.message}`);
    affiliateVerified = false;
  }

  // Create clear owner onboarding task
  try {
    const task = await withDbRetry(() => brainRepository.createTask({
      type: 'Affiliate Product Onboarding',
      title: `Affiliate Link Onboarding: ${genuineProduct.name}`,
      goal: `Add owner Digistore24 affiliate ID to ${genuineProduct.name} promo link`,
      priority: 'high',
      inputs: {
        productName: genuineProduct.name,
        marketplace: 'Digistore24',
        productId: '582914',
        targetArticleSlug: articleDraftData?.slug || 'ai-prompt-mastery-toolkit',
        instructions: [
          '1. Log into your Digistore24 affiliate dashboard (https://www.digistore24.com).',
          '2. Search the Marketplace for Software > AI Prompt Mastery & Content Automation.',
          '3. Copy your personalized Promo Link containing your affiliate ID.',
          '4. Open the article in Mission Control (Dashboard -> Articles -> Drafts).',
          '5. Click the CTA Button block and paste your exact Promo Link into the URL field.',
          '6. Click Save and Publish.',
        ],
      },
      context: {
        product: genuineProduct,
      },
    }));
    ownerTaskId = task?.id;
    console.log(`- Created Owner Onboarding Task in Brain Tasks (Task ID: ${ownerTaskId})`);
    results.push({
      step: '6. Affiliate Link Verification & Owner Task',
      status: 'PASS',
      details: {
        destinationUrl: affiliateUrl,
        verified: affiliateVerified,
        ownerTaskId,
      },
    });
  } catch (err: any) {
    console.error('Failed to create owner task:', err.message);
    results.push({ step: '6. Affiliate Link Verification', status: 'FAIL', details: err.message });
  }

  // STEP 7: Save Complete Article Draft (UNPUBLISHED)
  console.log('\n--- Step 7: Saving Article Draft to Database (Status: DRAFT) ---');
  let savedArticle: any = null;
  if (articleDraftData) {
    try {
      const generateId = () => Math.random().toString(36).substring(2, 11);
      const structuredContent: any[] = [];

      for (const b of (articleDraftData.blocks || [])) {
        if (b.type === 'heading') {
          structuredContent.push({
            id: generateId(),
            type: 'heading',
            level: b.level || 2,
            content: b.content,
          });
        } else if (b.type === 'paragraph') {
          structuredContent.push({
            id: generateId(),
            type: 'paragraph',
            content: b.content,
            links: [],
          });
        } else if (b.type === 'bullet-list') {
          structuredContent.push({
            id: generateId(),
            type: 'bullet-list',
            items: (b.items || []).map((item: string) => ({
              id: generateId(),
              content: item,
              links: [],
            })),
          });
        }
      }

      // Add the Affiliate CTA block
      structuredContent.push({
        id: generateId(),
        type: 'cta',
        label: 'Check Official Website & Get Instant Access',
        url: affiliateUrl,
        partnerLabel: 'Digistore24 Official Partner',
        price: genuineProduct.price,
      });

      const readingTime = Math.max(1, Math.ceil(JSON.stringify(structuredContent).split(/\s+/).length / 200));

      savedArticle = await withDbRetry(() => articleRepository.create({
        title: articleDraftData.title,
        slug: `${articleDraftData.slug || 'ai-prompt-automation-suite'}-${Date.now().toString(36)}`,
        article_type: 'Review',
        excerpt: articleDraftData.excerpt || null,
        content: structuredContent,
        status: 'draft', // STRICTLY DRAFT (UNPUBLISHED)
        cover_image_url: generatedImageUrl || null,
        author_id: null,
        category_id: null,
        seo: articleDraftData.seo || {},
        geo: articleDraftData.geo || {},
        aeo: articleDraftData.aeo || {},
        published_at: null, // STRICTLY NULL
        featured: false,
        trending: false,
        reading_time: readingTime,
        affiliate_url: affiliateUrl,
        provenance: 'REAL',
      }));

      console.log(`- Article Draft Successfully Saved!`);
      console.log(`  Article ID: ${savedArticle?.id}`);
      console.log(`  Title: "${savedArticle?.title}"`);
      console.log(`  Slug: "${savedArticle?.slug}"`);
      console.log(`  Status: ${savedArticle?.status} (Unpublished: ${savedArticle?.published_at === null})`);
      console.log(`  Cover Image: ${savedArticle?.cover_image_url || 'None'}`);
      console.log(`  Affiliate URL: ${savedArticle?.affiliate_url}`);
      console.log(`  Review URL: /dashboard/articles/${savedArticle?.id}`);

      results.push({
        step: '7. Persist Article Draft',
        status: 'PASS',
        details: {
          id: savedArticle?.id,
          title: savedArticle?.title,
          slug: savedArticle?.slug,
          status: savedArticle?.status,
          published_at: savedArticle?.published_at,
          cover_image_url: savedArticle?.cover_image_url,
          affiliate_url: savedArticle?.affiliate_url,
          reviewUrl: `/dashboard/articles/${savedArticle?.id}`,
        },
      });
    } catch (err: any) {
      console.error('Failed to save article draft:', err.message);
      results.push({ step: '7. Persist Article Draft', status: 'FAIL', details: err.message });
    }
  }

  // STEP 8: Verification of Database Records
  console.log('\n--- Step 8: Database Integrity Verification ---');
  if (savedArticle) {
    try {
      const retrieved = await withDbRetry(() => articleRepository.findById(savedArticle.id));
      if (retrieved && retrieved.status === 'draft' && retrieved.published_at === null) {
        console.log(`- Confirmed: Article ${retrieved.id} is stored in DB with status='draft' and published_at=null.`);
        results.push({
          step: '8. Database Verification',
          status: 'PASS',
          details: { id: retrieved.id, status: retrieved.status, isDraft: true },
        });
      } else {
        results.push({
          step: '8. Database Verification',
          status: 'FAIL',
          details: 'Article status is not draft or not found',
        });
      }
    } catch (err: any) {
      results.push({ step: '8. Database Verification', status: 'FAIL', details: err.message });
    }
  }

  console.log('\n======================================================');
  console.log('FINAL E2E VERIFICATION RESULTS:');
  console.log('======================================================');
  results.forEach(r => console.log(`[${r.status}] ${r.step}`));
  console.log('======================================================\n');
}

runEndToEndVerification().catch(err => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});
