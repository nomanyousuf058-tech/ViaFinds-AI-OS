import { DecisionCenter } from '../lib/brain/decisionCenter'
import { getPool } from '../lib/db/client'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

async function runTests() {
  const dc = new DecisionCenter()
  const p = getPool()

  console.log('--- RUNNING CONCURRENCY TESTS ---')

  try {
    // Clear for clean run
    await p.query("DELETE FROM brain_decisions WHERE rationale = 'Race Condition Rationale'")

    // 1. Idempotency Concurrency Test
    const decision = {
      type: 'STRATEGY_CHANGE' as any,
      title: 'Concurrent Idempotency Test',
      rationale: 'Race Condition Rationale',
      evidence: { stats: 'some data' },
      provenance: 'TEST_PROVENANCE',
      confidence: 0.95,
      expectedImpact: 'Scale',
      risks: [],
      prerequisites: [],
      requiredPermissions: [],
      status: 'PROPOSED' as any
    }

    console.log('Testing 10 simultaneous persistDecisions calls...')
    const promises = []
    for (let i = 0; i < 10; i++) {
      promises.push((dc as any).persistDecisions([decision]))
    }

    await Promise.all(promises)

    const countRes = await p.query("SELECT COUNT(*) FROM brain_decisions WHERE rationale = 'Race Condition Rationale'")
    console.log(`Expected 1 row, found: ${countRes.rows[0].count}`)
    if (countRes.rows[0].count !== '1') throw new Error('Duplicate decisions were created!')

    const rowRes = await p.query("SELECT id, status FROM brain_decisions WHERE rationale = 'Race Condition Rationale'")
    const decisionId = rowRes.rows[0].id

    // Create a mock admin user for transition test (use real UUID)
    const adminRes = await p.query(`
      INSERT INTO admin_users (id, email, role, password_hash) 
      VALUES (uuid_generate_v4(), 'race-concurrency-test@test.com', 'admin', '$2b$10$dummyhashfortesting000000000000000000000000000000')
      ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email
      RETURNING id
    `)
    const adminId = adminRes.rows[0].id

    // 2. Transition Concurrency Test
    console.log('Testing simultaneous valid and invalid state transitions (PROPOSED -> APPROVED and PROPOSED -> REJECTED)')
    
    // We fire them at the exact same time
    const transitionPromises = [
      dc.transitionDecision(decisionId, 'APPROVED', adminId),
      dc.transitionDecision(decisionId, 'REJECTED', adminId)
    ]

    let successes = 0
    let failures = 0
    let transitionError = null

    const results = await Promise.allSettled(transitionPromises)
    for (const res of results) {
      if (res.status === 'fulfilled') {
        if (res.value === true) successes++
      } else {
        failures++
        transitionError = res.reason.message
      }
    }

    console.log(`Successes: ${successes} (Expected 1)`)
    console.log(`Failures: ${failures} (Expected 1)`)
    console.log(`Failure Reason: ${transitionError}`)

    if (successes !== 1 || failures !== 1) {
      throw new Error('Transition race condition failed! Both or neither succeeded.')
    }

    const finalStatus = await p.query('SELECT status FROM brain_decisions WHERE id = $1', [decisionId])
    console.log(`Final Status: ${finalStatus.rows[0].status}`)

    console.log('--- ALL CONCURRENCY TESTS PASSED ---')
  } catch (e) {
    console.error(e)
    process.exitCode = 1
  } finally {
    await p.end()
  }
}

runTests()
