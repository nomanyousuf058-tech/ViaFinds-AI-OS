import { getCliClient } from 'sanity/cli'
import { randomUUID } from 'crypto'

const client = getCliClient({ apiVersion: '2024-01-01' })

async function main() {
  console.log('\n  Testing Category Creation...\n')
  
  const hierarchy = [
    { name: 'Electronics', level: 1 },
    { name: 'Collectibles', level: 2 },
    { name: 'Action Figures', level: 3 },
    { name: 'Marvel', level: 4 },
    { name: 'Deadpool', level: 5 }
  ]

  let parentId = null
  let createdIds = []

  let displayOrder = 10
  for (const item of hierarchy) {
    const id = `cat-test-${randomUUID()}`
    createdIds.push(id)
    
    const doc = {
      _type: 'category',
      _id: id,
      title: `${item.name} Test`,
      name: item.name,
      slug: { _type: 'slug', current: item.name.toLowerCase().replace(/\s+/g, '-') + '-test' },
      level: item.level,
      parentCategory: parentId ? { _type: 'reference', _ref: parentId } : undefined,
      displayOrder,
      status: 'active',
      visibility: 'public'
    }

    await client.createOrReplace(doc)
    console.log(`  ✓ Created ${item.name} (Level ${item.level}) [ID: ${id}]`)
    
    if (parentId) {
      // also update the parent's childCategories array just to test
      await client.patch(parentId)
        .setIfMissing({ childCategories: [] })
        .append('childCategories', [{ _type: 'reference', _ref: id }])
        .commit()
    }
    
    parentId = id
    displayOrder += 10
  }

  console.log('\n  ✓ Hierarchy created successfully.')
  console.log('  To delete these, run a delete script or delete them from the studio.')
}

main().catch(console.error)
