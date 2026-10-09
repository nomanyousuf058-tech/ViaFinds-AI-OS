import { config } from 'dotenv'
config({ path: '.env.local' })

import { brainRepository } from '../lib/db/repositories/brain'
import { automationJobsRepository } from '../lib/db/repositories/automation-jobs'
import { automationPipeline } from '../lib/automation/pipeline'
import { jobManager } from '../lib/automation/job-manager'
import { getPool } from '../lib/db/client'
import type { ArticleDraft, QualityResult } from '../lib/automation/types'
import crypto from 'crypto'

const RESULTS: { test: string; status: 'PASS' | 'FAIL'; details: string }[] = []

function check(test: string, condition: boolean, details: string) {
  const status = condition ? 'PASS' : 'FAIL'
  RESULTS.push({ test, status, details })
  console.log(`  [${status}] ${test}: ${details}`)
}

async function testQualityGate() {
  console.log('\n=== PHASE 3.1 QUALITY GATE REAL TEST ===\n')

  // --- STEP 1: Create Brain Task ---
  console.log('1. Creating Brain Task...')
  const task = await brainRepository.createTask({
    type: 'Create Content',
    title: 'Phase 3.1 Real Test Article',
    goal: 'Verify Quality Gate implementation',
    priority: 'high',
    inputs: { topic: 'Phase 3.1 Test Software Review', category: 'software' }
  })
  check('brain_task_created', !!task?.id, task?.id ? `Task ID: ${task.id}` : 'FAILED to create task')
  const taskId = task?.id as string

  // --- STEP 2: Approve task and create execution plan ---
  await brainRepository.updateTask(taskId, { status: 'waiting_approval', approval_state: 'approved' })
  const execPlan = await brainRepository.createExecutionPlan({
    task_id: taskId,
    execution_type: 'CREATE_ARTICLE',
    target: 'Existing Automation Pipeline',
    inputs: { topic: 'Phase 3.1 Test Software Review', category: 'software' },
  })
  check('execution_plan_created', !!execPlan?.id, execPlan?.id ? `Plan ID: ${execPlan.id}` : 'FAILED to create plan')
  const planId = execPlan?.id as string

  // --- STEP 3: Create in-memory job via jobManager ---
  console.log('\n2. Creating in-memory automation job...')
  const job = jobManager.createJob('article_generation', 'manual', { topic: 'Phase 3.1 Test Software Review', category: 'software' })
  const jobId = job.id
  check('job_created_in_memory', !!jobId, `Job ID: ${jobId}`)

  // --- Link execution plan to job ---
  await brainRepository.updateExecutionPlanStatus(planId, 'running', jobId)
  check('exec_plan_linked_to_job', true, `Plan ${planId} linked to job ${jobId}`)

  // --- STEP 4: Test INVALID draft ---
  console.log('\n3. Testing INVALID draft (expect FAIL)...')

  const invalidDraft: Partial<ArticleDraft> = {
    title: '',        // MISSING
    slug: '',         // MISSING
    excerpt: 'Short excerpt',
    body: '<p>Too short.</p>',  // Too short, no structure
    headings: [],     // MISSING
    sources: [],      // MISSING
    affiliateDisclosure: false,
    author: '',
    seo: undefined,   // MISSING
    affiliateCta: undefined, // MISSING
  }

  // Seed quality result so runPublishing can read it
  jobManager.setJobResult(jobId, { draft: invalidDraft, qualityResult: null })

  let qrInvalid: QualityResult
  try {
    qrInvalid = await (automationPipeline as any).runQualityGate(jobManager.getJob(jobId), invalidDraft)
    check('quality_gate_invalid_status_is_FAIL', qrInvalid.status === 'FAIL', `Status: ${qrInvalid.status}`)
    check('quality_gate_invalid_has_failures', qrInvalid.failures.length > 0, `${qrInvalid.failures.length} failures: ${qrInvalid.failures.slice(0,3).join('; ')}`)
    check('quality_gate_invalid_score_low', qrInvalid.score < 60, `Score: ${qrInvalid.score}`)
    console.log(`   Overall: ${qrInvalid.overallAssessment}`)
  } catch (e: any) {
    check('quality_gate_invalid_ran', false, `ERROR: ${e.message}`)
    process.exit(1)
  }

  // --- STEP 5: Verify publishing is blocked server-side ---
  console.log('\n4. Verifying publishing is BLOCKED for FAIL status...')
  jobManager.setJobResult(jobId, { qualityResult: qrInvalid })
  let publishBlocked = false
  try {
    await (automationPipeline as any).runPublishing(jobManager.getJob(jobId), invalidDraft, { affiliateUrl: '' })
    check('publishing_blocked_when_FAIL', false, 'Publishing was NOT blocked — SECURITY ISSUE')
  } catch (e: any) {
    if (e.message.includes('Quality Gate failed')) {
      publishBlocked = true
      check('publishing_blocked_when_FAIL', true, 'Publishing correctly blocked by server-side Quality Gate')
    } else {
      check('publishing_blocked_when_FAIL', false, `Unexpected error: ${e.message}`)
    }
  }

  // --- STEP 6: Check brain_quality_results was written ---
  console.log('\n5. Verifying brain_quality_results written to DB...')
  const pool = getPool()
  const dbRows = await pool.query(
    'SELECT * FROM brain_quality_results WHERE target_id = $1 ORDER BY created_at DESC',
    [jobId]
  )
  check('quality_result_stored_in_db', dbRows.rowCount! > 0, `${dbRows.rowCount} rows found in brain_quality_results`)
  if (dbRows.rowCount! > 0) {
    const row = dbRows.rows[0]
    check('quality_result_status_correct', row.overall_status === 'FAIL', `DB status: ${row.overall_status}`)
    check('quality_result_has_failure_reason', !!row.failure_reason, `Reason: ${row.failure_reason?.substring(0, 80)}`)
    console.log(`   DB evidence: ${JSON.stringify(row).substring(0, 200)}...`)
  }

  // --- STEP 7: Fix the draft and retest ---
  console.log('\n6. Testing VALID draft (expect PASS or PASS_WITH_WARNINGS)...')
  const validBody = '<h2>Introduction to Test Software</h2>' +
    '<p>' + 'This is a complete review of Test Software. It is a high-quality digital product. '.repeat(80) + '</p>' +
    '<h2>Key Features</h2><ul><li>Feature A</li><li>Feature B</li></ul>' +
    '<h2>Verdict</h2><p>A highly recommended tool. See <a href="/articles/related">related article</a> and <a href="http://source.com/study">external source</a>.</p>' +
    '<img src="/images/test.jpg" alt="Test Software Interface Screenshot" />'

  const validDraft: ArticleDraft = {
    title: 'Test Software Review 2026: Is It Worth It?',
    slug: 'test-software-review-2026',
    excerpt: 'An in-depth review of Test Software covering features, pricing, and performance.',
    body: validBody,
    headings: ['Introduction to Test Software', 'Key Features', 'Verdict'],
    sources: ['http://real-source.com/research-study', 'http://official-docs.com/test-software'],
    affiliateDisclosure: true,
    author: 'Jane Smith, Software Analyst',
    seo: {
      metaTitle: 'Test Software Review 2026: Complete Analysis',
      metaDescription: 'Read our in-depth Test Software review. We cover features, pricing, pros & cons to help you decide if it\'s worth your money.',
      canonicalUrl: 'https://viafinds.com/articles/test-software-review-2026'
    },
    faq: [
      { question: 'What is Test Software?', answer: 'Test Software is a digital productivity tool.' },
      { question: 'Is Test Software worth the price?', answer: 'Yes, based on our testing.' }
    ],
    affiliateCta: { url: 'https://affiliate.com/test-software?ref=viafinds', label: 'Check Official Website' }
  }

  let qrValid: QualityResult
  try {
    qrValid = await (automationPipeline as any).runQualityGate(jobManager.getJob(jobId), validDraft)
    check('quality_gate_valid_status_passes', qrValid.status === 'PASS' || qrValid.status === 'PASS_WITH_WARNINGS', `Status: ${qrValid.status}`)
    check('quality_gate_valid_score_high', qrValid.score >= 50, `Score: ${qrValid.score}`)
    check('quality_gate_valid_has_no_hard_failures', qrValid.failures.length === 0, `Hard failures: ${qrValid.failures.length}`)
    console.log(`   Warnings: ${qrValid.warnings.length} | Score: ${qrValid.score} | Status: ${qrValid.status}`)
  } catch (e: any) {
    check('quality_gate_valid_ran', false, `ERROR: ${e.message}`)
    process.exit(1)
  }

  // --- STEP 8: Verify 2nd DB row ---
  const dbRows2 = await pool.query(
    'SELECT overall_status FROM brain_quality_results WHERE target_id = $1 ORDER BY created_at DESC',
    [jobId]
  )
  check('quality_results_both_stored', dbRows2.rowCount! >= 2, `${dbRows2.rowCount} rows total in brain_quality_results for this job`)
  const statuses = dbRows2.rows.map((r: any) => r.overall_status).join(', ')
  check('quality_result_statuses_correct', statuses.includes('FAIL'), `Statuses: ${statuses}`)

  // --- FINAL REPORT ---
  console.log('\n=== FINAL TEST REPORT ===')
  const passed = RESULTS.filter(r => r.status === 'PASS').length
  const failed = RESULTS.filter(r => r.status === 'FAIL').length
  console.log(`Total: ${RESULTS.length} | PASS: ${passed} | FAIL: ${failed}`)
  console.log(failed === 0 ? '\n✅ ALL TESTS PASSED' : '\n❌ SOME TESTS FAILED')
  
  // Print failures
  if (failed > 0) {
    console.log('\nFailed tests:')
    RESULTS.filter(r => r.status === 'FAIL').forEach(r => console.log(`  ❌ ${r.test}: ${r.details}`))
  }
  
  await pool.end()
  process.exit(failed > 0 ? 1 : 0)
}

testQualityGate().catch(e => {
  console.error('UNHANDLED ERROR:', e)
  process.exit(1)
})
