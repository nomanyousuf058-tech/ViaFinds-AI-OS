import { DecisionCenter } from '../lib/brain/decisionCenter'
import { getPool } from '../lib/db/client'

async function runTest() {
  const dc = new DecisionCenter()
  const p = getPool()
  
  await p.query('DELETE FROM brain_decisions')
  
  // Create a mock experiment if needed, or just test persistDecisions directly
  const decision = {
    type: 'STRATEGY_CHANGE' as any,
    title: 'Test Race',
    rationale: 'Race Condition Test',
    evidence: { test: true },
    provenance: 'TEST',
    confidence: 0.9,
    expectedImpact: 'None',
    risks: [],
    prerequisites: [],
    requiredPermissions: [],
    status: 'PROPOSED' as any
  }
  
  // Call persistDecisions concurrently
  await Promise.all([
    (dc as any).persistDecisions([decision]),
    (dc as any).persistDecisions([decision]),
    (dc as any).persistDecisions([decision])
  ])
  
  const result = await p.query('SELECT COUNT(*) FROM brain_decisions WHERE title = $1', ['Test Race'])
  console.log('Duplicates found:', result.rows[0].count)
  
  process.exit(0)
}

runTest().catch(console.error)
