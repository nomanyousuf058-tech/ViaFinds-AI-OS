import { config } from 'dotenv'
config({ path: '.env.local' })

/**
 * Phase 3.1 Execute Endpoint + State Machine Test
 * Uses direct JWT creation to bypass login form (since this is a test script)
 */

import { brainRepository } from '../lib/db/repositories/brain'
import { createAdminToken } from '../lib/auth'
import { getPool } from '../lib/db/client'

const BASE_URL = 'http://localhost:3099'
const RESULTS: { test: string; status: 'PASS' | 'FAIL' | 'SKIP'; details: string }[] = []

function check(test: string, condition: boolean, details: string, skip = false) {
  const status = skip ? 'SKIP' : (condition ? 'PASS' : 'FAIL')
  RESULTS.push({ test, status, details })
  const icon = status === 'PASS' ? '✅' : status === 'SKIP' ? '⏭️' : '❌'
  console.log(`  [${status}] ${test}: ${details}`)
}

async function getAdminToken(): Promise<string> {
  const pool = getPool()
  // Find admin user from DB
  const r = await pool.query('SELECT id, email FROM admin_users LIMIT 1')
  if (!r.rows[0]) {
    console.warn('  WARN: No admin user in DB')
    return ''
  }
  const admin = r.rows[0] as { id: string; email: string }
  const token = await createAdminToken(admin.id, admin.email)
  return token
}

async function callExecute(taskId: string, token: string, plan: object, method: 'GET' | 'POST' = 'POST') {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers['Cookie'] = `admin_session=${token}`
  
  const opts: RequestInit = { method, headers }
  if (method === 'POST') opts.body = JSON.stringify({ plan })
  
  const resp = await fetch(`${BASE_URL}/api/brain/tasks/${taskId}/execute`, opts)
  let body: Record<string, unknown> = {}
  try { body = await resp.json() } catch {}
  return { status: resp.status, body }
}

async function createTask(status: string): Promise<string> {
  const t = await brainRepository.createTask({
    type: 'Create Content',
    title: `SM Test [${status}]`,
    goal: 'Test',
    priority: 'normal',
    inputs: {}
  })
  if (!t?.id) throw new Error('Failed to create task')
  await brainRepository.updateTask(t.id, { status })
  return t.id
}

async function main() {
  console.log('\n=== EXECUTE ENDPOINT & STATE MACHINE TEST ===\n')

  // Verify server
  let serverUp = false
  for (let i = 0; i < 10; i++) {
    try {
      const r = await fetch(`${BASE_URL}/api/brain/status`)
      if (r.status < 500) { serverUp = true; break }
    } catch {}
    await new Promise(r => setTimeout(r, 2000))
  }
  check('server_reachable', serverUp, serverUp ? `Running at ${BASE_URL}` : 'Not responding')
  if (!serverUp) { process.exit(1) }

  // Get admin JWT
  let token = ''
  try {
    token = await getAdminToken()
    check('admin_token_created', !!token, token ? 'JWT created from DB admin user' : 'Failed to create JWT')
  } catch (e: any) {
    check('admin_token_created', false, `Error: ${e.message}`)
  }

  // --- 1. Unauthenticated (no token) ---
  console.log('\n1. Unauthenticated request →')
  {
    const r = await callExecute('any-id', '', { execution_type: 'CREATE_ARTICLE', inputs: {} })
    check('unauthenticated_blocked_401', r.status === 401, `HTTP ${r.status} - ${r.body.error || ''}`)
  }

  // --- 2. Invalid task ID (authenticated) ---
  console.log('\n2. Invalid task ID (authenticated) →')
  {
    const r = await callExecute('00000000-0000-0000-0000-000000000000', token, { execution_type: 'CREATE_ARTICLE', inputs: {} })
    check('invalid_task_id_404', r.status === 404, `HTTP ${r.status} - ${r.body.error || ''}`)
  }

  // --- 3. queued task → should succeed ---
  console.log('\n3. queued task (valid for execution) →')
  {
    const id = await createTask('queued')
    const r = await callExecute(id, token, { execution_type: 'CREATE_ARTICLE', inputs: { topic: 'Test' }, target: 'Pipeline', expected_output: 'Article' })
    check('queued_task_can_execute', r.status === 200 && !!r.body.success, `HTTP ${r.status}, job_id: ${r.body.job_id}`)
  }

  // --- 4. waiting_approval task → should succeed ---
  console.log('\n4. waiting_approval task (approved for execution) →')
  {
    const id = await createTask('waiting_approval')
    const r = await callExecute(id, token, { execution_type: 'CREATE_ARTICLE', inputs: { topic: 'Test' }, target: 'Pipeline', expected_output: 'Article' })
    check('waiting_approval_task_executes', r.status === 200 && !!r.body.success, `HTTP ${r.status}, success: ${r.body.success}`)
  }

  // --- 5. completed task → BLOCKED (state machine) ---
  console.log('\n5. completed task (already done — no re-execution) →')
  {
    const id = await createTask('completed')
    const r = await callExecute(id, token, { execution_type: 'CREATE_ARTICLE', inputs: {}, target: 'Pipeline', expected_output: 'Article' })
    check('completed_task_blocked_400', r.status === 400, `HTTP ${r.status} - ${r.body.error || ''}`)
  }

  // --- 6. running task → BLOCKED ---
  console.log('\n6. running task (already in flight — no duplicate execution) →')
  {
    const id = await createTask('running')
    const r = await callExecute(id, token, { execution_type: 'CREATE_ARTICLE', inputs: {}, target: 'Pipeline', expected_output: 'Article' })
    check('running_task_blocked_400', r.status === 400, `HTTP ${r.status} - ${r.body.error || ''}`)
  }

  // --- 7. failed task → BLOCKED ---
  console.log('\n7. failed task →')
  {
    const id = await createTask('failed')
    const r = await callExecute(id, token, { execution_type: 'CREATE_ARTICLE', inputs: {}, target: 'Pipeline', expected_output: 'Article' })
    check('failed_task_blocked_400', r.status === 400, `HTTP ${r.status} - ${r.body.error || ''}`)
  }

  // --- 8. Invalid execution type → BLOCKED (403) ---
  console.log('\n8. Invalid execution type →')
  {
    const id = await createTask('waiting_approval')
    const r = await callExecute(id, token, { execution_type: 'DROP_ALL_TABLES', inputs: {}, target: 'Pipeline', expected_output: 'Article' })
    check('invalid_exec_type_403', r.status === 403, `HTTP ${r.status} - ${r.body.error || ''}`)
  }

  // --- 9. Duplicate execution (task gets set to 'completed' after 1st execution) ---
  console.log('\n9. Duplicate execution (second call should be blocked) →')
  {
    const id = await createTask('waiting_approval')
    const plan = { execution_type: 'CREATE_ARTICLE', inputs: { topic: 'Dup' }, target: 'Pipeline', expected_output: 'Article' }
    const r1 = await callExecute(id, token, plan)
    const r2 = await callExecute(id, token, plan)
    check('duplicate_first_call_succeeds', r1.status === 200, `1st call: HTTP ${r1.status}`)
    check('duplicate_second_call_blocked', r2.status !== 200, `2nd call: HTTP ${r2.status} (duplicate correctly blocked — task cannot be re-executed)`)
  }

  // --- STATE MACHINE DIAGRAM ---
  console.log('\n--- ENFORCED STATE MACHINE TRANSITIONS ---')
  console.log('  queued           →[execute]→ automation_job queued  (ALLOWED)')
  console.log('  waiting_approval →[execute]→ automation_job queued  (ALLOWED)')
  console.log('  running          →[execute]→ 400 BLOCKED            (ENFORCED)')
  console.log('  completed        →[execute]→ 400 BLOCKED            (ENFORCED)')
  console.log('  failed           →[execute]→ 400 BLOCKED            (ENFORCED)')
  console.log('  (no retry/re-execution without explicit state reset) ')

  // --- FINAL REPORT ---
  console.log('\n=== FINAL REPORT ===')
  const pool = getPool()
  const passed = RESULTS.filter(r => r.status === 'PASS').length
  const failed = RESULTS.filter(r => r.status === 'FAIL').length
  const skipped = RESULTS.filter(r => r.status === 'SKIP').length
  console.log(`Total: ${RESULTS.length} | ✅ PASS: ${passed} | ❌ FAIL: ${failed} | ⏭️ SKIP: ${skipped}`)
  
  if (failed > 0) {
    console.log('\nFailed tests:')
    RESULTS.filter(r => r.status === 'FAIL').forEach(r => console.log(`  ❌ ${r.test}: ${r.details}`))
  }

  await pool.end()
  process.exit(failed > 0 ? 1 : 0)
}

main().catch(e => { console.error('UNHANDLED:', e); process.exit(1) })
