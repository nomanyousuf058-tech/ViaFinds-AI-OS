import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'

function analyzeEnv(filePath: string) {
  if (!fs.existsSync(filePath)) {
    console.log(`${filePath} not found`)
    return {}
  }
  
  const content = fs.readFileSync(filePath, 'utf8')
  const parsed = dotenv.parse(content)
  
  const inventory: Record<string, string> = {}
  for (const [key, value] of Object.entries(parsed)) {
    if (!value || value.trim() === '') {
      inventory[key] = 'MISSING'
    } else {
      inventory[key] = 'CONFIGURED'
    }
  }
  return inventory
}

const local = analyzeEnv('.env.local')
const example = analyzeEnv('.env.example')

// Find all unique keys
const allKeys = new Set([...Object.keys(local), ...Object.keys(example)])

console.log('=== ENV AUDIT ===')
for (const key of allKeys) {
  const localStatus = local[key] || 'NOT_IN_LOCAL'
  const exampleStatus = example[key] || 'NOT_IN_EXAMPLE'
  console.log(`KEY: ${key} | STATUS: ${localStatus} | IN_EXAMPLE: ${exampleStatus !== 'NOT_IN_EXAMPLE'}`)
}

console.log('=================')
