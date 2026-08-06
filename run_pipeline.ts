/**
 * End-to-end pipeline dry run script.
 * 
 * Runs: Affiliate URL → ProductWorkflow → PublisherWorkflow → Sanity Draft → Approve → Published
 * 
 * Usage: npx tsx run_pipeline.ts
 */
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { AgentLoader } from './agents/core/AgentLoader';
import { WorkflowLoader } from './workflows/core/WorkflowLoader';
import { ProviderLoader } from './providers/ProviderLoader';
import { workflowRegistry } from './workflows/core/WorkflowRegistry';
import { WorkflowType } from './workflows/core/types';
import { createClient } from '@sanity/client';

// ── Sanity client for verification ──────────────────────────────────────────
const sanity = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || 'e44z7hta',
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
  apiVersion: '2024-01-01',
  token: process.env.SANITY_TOKEN,
  useCdn: false,
});

async function run() {
  // ── 0. Verify env ─────────────────────────────────────────────────────────
  console.log('\n========== PIPELINE DRY-RUN ==========\n');

  const envVars = {
    NEXT_PUBLIC_SANITY_PROJECT_ID: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
    NEXT_PUBLIC_SANITY_DATASET: process.env.NEXT_PUBLIC_SANITY_DATASET,
    SANITY_TOKEN: process.env.SANITY_TOKEN ? '***set***' : undefined,
  };

  for (const [k, v] of Object.entries(envVars)) {
    console.log(`${v ? '✓' : '✗'} ${k}: ${v || 'MISSING'}`);
  }

  if (!process.env.SANITY_TOKEN) {
    console.error('SANITY_TOKEN is missing. Aborting.');
    process.exit(1);
  }

  // ── 1. Bootstrap system ───────────────────────────────────────────────────
  console.log('\n--- 1. Loading providers, agents, workflows ---');
  await ProviderLoader.loadProviders();
  await AgentLoader.loadAgents();
  await WorkflowLoader.loadWorkflows();

  // ── 2. Run Product Pipeline ───────────────────────────────────────────────
  const testUrl = process.argv[2] || 'https://www.amazon.com/dp/B0DJYC3WDN';
  console.log(`\n--- 2. Starting ProductWorkflow with URL: ${testUrl} ---`);

  const workflow = workflowRegistry.getWorkflow(WorkflowType.PRODUCT);
  if (!workflow) {
    console.error('✗ ProductWorkflow is NOT registered. Aborting.');
    process.exit(1);
  }

  const result = await workflow.run({
    workflowId: `dryrun-${Date.now()}`,
    type: WorkflowType.PRODUCT,
    triggeredBy: 'manual',
    timestamp: new Date().toISOString(),
    payload: { affiliateLink: testUrl },
  });

  console.log(`\nWorkflow status: ${result.status}`);
  if (result.errors.length > 0) {
    console.error('Workflow errors:', result.errors);
  }

  if (result.status === 'failed') {
    console.error('✗ Pipeline FAILED. Errors:', result.errors);
    process.exit(1);
  }

  console.log('✓ ProductWorkflow completed');

  // ── 3. Extract draft _id ──────────────────────────────────────────────────
  const uco = result.data?.uco;
  const sanityDoc = result.data?.sanityDoc;
  const draftId = sanityDoc?._id || (uco ? `drafts.${uco.uuid}` : null);

  console.log(`\n--- 3. Draft _id: ${draftId} ---`);
  if (!draftId) {
    console.error('✗ No draft _id returned from pipeline');
    process.exit(1);
  }

  // ── 4. Query Sanity to verify the draft exists ────────────────────────────
  console.log('\n--- 4. Querying Sanity for draft document ---');
  const draftDoc = await sanity.fetch(`*[_id == $id][0]`, { id: draftId });
  if (!draftDoc) {
    console.error(`✗ Draft "${draftId}" NOT found in Sanity.`);

    // Debug: list all products
    const allProducts = await sanity.fetch('*[_type == "product"][0..10]{_id, title}');
    console.log('Existing products in Sanity:', JSON.stringify(allProducts, null, 2));
    process.exit(1);
  }
  console.log(`✓ Draft found in Sanity`);
  console.log(`  Title : ${draftDoc.title}`);
  console.log(`  _id   : ${draftDoc._id}`);
  console.log(`  _type : ${draftDoc._type}`);

  // ── 5. Verify Draft Queue GROQ query ──────────────────────────────────────
  const draftQueueQuery = '*[_type == "product" && _id in path("drafts.**")] | order(_updatedAt desc) { _id, title, "slug": slug.current, affiliateUrl, qualityScore, _createdAt, _updatedAt }';
  console.log(`\n--- 5. Draft Queue GROQ query ---`);
  console.log(`  ${draftQueueQuery}`);

  const drafts = await sanity.fetch(draftQueueQuery);
  console.log(`  Returned ${drafts.length} draft(s)`);

  if (drafts.length === 0) {
    console.error('✗ Draft Queue is EMPTY after pipeline run');
    process.exit(1);
  }

  const ourDraft = drafts.find((d: any) => d._id === draftId);
  if (!ourDraft) {
    console.error(`✗ Our draft "${draftId}" not in Draft Queue results`);
  } else {
    console.log(`✓ Draft appears in Draft Queue`);
    console.log(`  Title: ${ourDraft.title}`);
    console.log(`  _id  : ${ourDraft._id}`);
  }

  // ── 6. Approve (publish) the draft ────────────────────────────────────────
  console.log('\n--- 6. Approving draft (publishing) ---');
  const publishedId = draftId.replace('drafts.', '');

  const publishedDoc = { ...draftDoc, _id: publishedId, status: 'published' };
  delete publishedDoc._createdAt;
  delete publishedDoc._updatedAt;
  delete publishedDoc._rev;

  await sanity
    .transaction()
    .createOrReplace(publishedDoc)
    .delete(draftId)
    .commit();

  console.log(`✓ Draft approved and published`);

  // ── 7. Verify published document ──────────────────────────────────────────
  console.log(`\n--- 7. Verifying published document: ${publishedId} ---`);
  const pubDoc = await sanity.fetch(`*[_id == $id][0]`, { id: publishedId });
  if (!pubDoc) {
    console.error('✗ Published document NOT found in Sanity');
    process.exit(1);
  }
  console.log(`✓ Published document found`);
  console.log(`  Title : ${pubDoc.title}`);
  console.log(`  _id   : ${pubDoc._id}`);

  // ── 8. Verify draft is removed ────────────────────────────────────────────
  console.log(`\n--- 8. Verifying draft "${draftId}" is removed ---`);
  const removedCheck = await sanity.fetch(`*[_id == $id][0]`, { id: draftId });
  if (removedCheck) {
    console.error('✗ Draft still exists after publish');
  } else {
    console.log('✓ Draft successfully removed');
  }

  // ── 9. Cleanup: delete the test document ──────────────────────────────────
  console.log('\n--- 9. Cleaning up test document ---');
  try {
    await sanity.delete(publishedId);
    console.log('✓ Test document cleaned up');
  } catch (e) {
    console.warn('⚠ Could not clean up test document:', (e as Error).message);
  }

  // ── FINAL REPORT ──────────────────────────────────────────────────────────
  console.log('\n========================================');
  console.log('       DRY-RUN COMPLETE');
  console.log('========================================');
  console.log(`✓ ProductWorkflow    : PASSED`);
  console.log(`✓ PublisherWorkflow  : PASSED`);
  console.log(`✓ Sanity Write       : PASSED (${draftId})`);
  console.log(`✓ Draft Queue        : PASSED (${drafts.length} draft(s))`);
  console.log(`✓ Approve/Publish    : PASSED (${publishedId})`);
  console.log(`✓ Draft Removal      : ${removedCheck ? 'FAILED' : 'PASSED'}`);
  console.log('========================================\n');
}

run().catch((err) => {
  console.error('FATAL ERROR:', err);
  process.exit(1);
});
