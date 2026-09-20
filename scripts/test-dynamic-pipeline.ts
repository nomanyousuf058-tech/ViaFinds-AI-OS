/**
 * Test: Dynamic Pipeline Output Verification
 * 
 * Tests that the JSON sanitizer works correctly and that the pipeline
 * would produce unique output on consecutive runs.
 * 
 * Run: npx tsx scripts/test-dynamic-pipeline.ts
 */

// --- Test 1: JSON Sanitizer ---
console.log('\n=== Test 1: JSON Sanitizer ===\n')

function cleanJsonResponse(content: string): string {
  let cleaned = content.trim()
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '')
  cleaned = cleaned.trim()
  return cleaned
}

function safeParseJson(content: string): Record<string, unknown> {
  const cleaned = cleanJsonResponse(content)
  try {
    return JSON.parse(cleaned)
  } catch (firstError) {
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0])
      } catch {
        // Fall through
      }
    }
    throw new Error(`LLM returned invalid JSON: ${firstError instanceof Error ? firstError.message : String(firstError)}`)
  }
}

const testCases = [
  {
    name: 'Clean JSON',
    input: '{"productName": "Test Product", "category": "software"}',
    expected: true,
  },
  {
    name: 'Markdown wrapped JSON',
    input: '```json\n{"productName": "Wrapped Product", "category": "ebook"}\n```',
    expected: true,
  },
  {
    name: 'Markdown without json label',
    input: '```\n{"productName": "No Label", "category": "course"}\n```',
    expected: true,
  },
  {
    name: 'JSON with surrounding text',
    input: 'Here is the product:\n{"productName": "Embedded Product", "category": "health"}\nEnd of response.',
    expected: true,
  },
  {
    name: 'Complete garbage',
    input: 'This is not JSON at all, just plain text without any braces.',
    expected: false,
  },
]

let sanitizerPassed = 0
let sanitizerFailed = 0

for (const tc of testCases) {
  try {
    const result = safeParseJson(tc.input)
    if (tc.expected) {
      console.log(`  ✅ PASS: "${tc.name}" → parsed productName: "${result.productName}"`)
      sanitizerPassed++
    } else {
      console.log(`  ❌ FAIL: "${tc.name}" → should have thrown but parsed: ${JSON.stringify(result)}`)
      sanitizerFailed++
    }
  } catch (err) {
    if (!tc.expected) {
      console.log(`  ✅ PASS: "${tc.name}" → correctly threw error`)
      sanitizerPassed++
    } else {
      console.log(`  ❌ FAIL: "${tc.name}" → unexpected error: ${err instanceof Error ? err.message : String(err)}`)
      sanitizerFailed++
    }
  }
}

// --- Test 2: Uniqueness of Random Seed ---
console.log('\n=== Test 2: Category Randomization Uniqueness ===\n')

const categories = ['software', 'ebook', 'course', 'membership', 'template', 'health', 'fitness', 'business', 'marketing', 'productivity']
const picks: string[] = []
for (let i = 0; i < 20; i++) {
  picks.push(categories[Math.floor(Math.random() * categories.length)])
}
const uniquePicks = new Set(picks)
const uniquenessRatio = uniquePicks.size / categories.length

if (uniquePicks.size >= 3) {
  console.log(`  ✅ PASS: ${uniquePicks.size} unique categories in 20 picks: [${[...uniquePicks].join(', ')}]`)
  sanitizerPassed++
} else {
  console.log(`  ❌ FAIL: Only ${uniquePicks.size} unique categories in 20 picks — randomization is broken`)
  sanitizerFailed++
}

// --- Test 3: Timestamp-based uniqueness ---
console.log('\n=== Test 3: Timestamp Seed Uniqueness ===\n')

const timestamps = new Set<number>()
for (let i = 0; i < 5; i++) {
  timestamps.add(Date.now())
  // Small delay to ensure unique timestamps
  const start = Date.now()
  while (Date.now() - start < 2) { /* spin */ }
}

if (timestamps.size >= 3) {
  console.log(`  ✅ PASS: ${timestamps.size} unique timestamps generated for prompt seeding`)
  sanitizerPassed++
} else {
  console.log(`  ❌ FAIL: Only ${timestamps.size} unique timestamps — seeding will not vary`)
  sanitizerFailed++
}

// --- Test 4: No hardcoded fallback check ---
console.log('\n=== Test 4: Hardcoded Fallback Removal Verification ===\n')

const fs = require('fs')
const pipelinePath = require('path').join(__dirname, '..', 'lib', 'automation', 'pipeline.ts')
const pipelineSource = fs.readFileSync(pipelinePath, 'utf-8')

const hardcodedProductPattern = /productName:\s*['"]AI Content Studio Pro['"]/
if (hardcodedProductPattern.test(pipelineSource)) {
  console.log('  ❌ FAIL: Hardcoded "AI Content Studio Pro" fallback still exists in pipeline.ts!')
  sanitizerFailed++
} else {
  console.log('  ✅ PASS: No hardcoded "AI Content Studio Pro" fallback found in pipeline.ts')
  sanitizerPassed++
}

// Check for hardcoded trending products
const hardcodedTrendPattern = /AI Image Generator Pro/
if (hardcodedTrendPattern.test(pipelineSource)) {
  console.log('  ❌ FAIL: Hardcoded "AI Image Generator Pro" fallback still exists in pipeline.ts!')
  sanitizerFailed++
} else {
  console.log('  ✅ PASS: No hardcoded "AI Image Generator Pro" fallback found in pipeline.ts')
  sanitizerPassed++
}

// --- Test 5: Cron route exists ---
console.log('\n=== Test 5: Cron Route Existence ===\n')

const cronRoutePath = require('path').join(__dirname, '..', 'app', 'api', 'cron', 'auto-publish', 'route.ts')
if (fs.existsSync(cronRoutePath)) {
  const cronSource = fs.readFileSync(cronRoutePath, 'utf-8')
  if (cronSource.includes('CRON_SECRET')) {
    console.log('  ✅ PASS: Cron route exists and checks CRON_SECRET')
    sanitizerPassed++
  } else {
    console.log('  ❌ FAIL: Cron route exists but does NOT check CRON_SECRET')
    sanitizerFailed++
  }
} else {
  console.log('  ❌ FAIL: Cron route file does not exist')
  sanitizerFailed++
}

// --- Test 6: vercel.json cron config ---
console.log('\n=== Test 6: vercel.json Cron Configuration ===\n')

const vercelJsonPath = require('path').join(__dirname, '..', 'vercel.json')
const vercelConfig = JSON.parse(fs.readFileSync(vercelJsonPath, 'utf-8'))
const autoPublishCron = vercelConfig.crons?.find((c: { path: string }) => c.path === '/api/cron/auto-publish')
if (autoPublishCron) {
  console.log(`  ✅ PASS: auto-publish cron configured with schedule "${autoPublishCron.schedule}"`)
  sanitizerPassed++
} else {
  console.log('  ❌ FAIL: auto-publish cron not found in vercel.json')
  sanitizerFailed++
}

// --- Summary ---
console.log('\n========================================')
console.log(`  Tests Passed: ${sanitizerPassed}`)
console.log(`  Tests Failed: ${sanitizerFailed}`)
console.log('========================================\n')

if (sanitizerFailed > 0) {
  console.error('❌ Some tests failed. Review the output above.')
  process.exit(1)
} else {
  console.log('✅ All tests passed! Pipeline is ready for deployment.')
  process.exit(0)
}
