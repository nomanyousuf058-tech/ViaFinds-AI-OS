// deleteEliteCollectibles.js
// Script to safely delete the "Elite Collectibles" taxonomy and all its descendant categories
// Uses Sanity client via sanity/cli

const { getCliClient } = require('sanity/cli');

async function main() {
  const client = getCliClient({ apiVersion: '2023-01-01' })
  console.log('Fetching Elite Collectibles root category...')

  // Fetch the root category (Level 1) by name
  const root = await client.fetch(`*[_type == "category" && name == "Elite Collectibles"][0]{_id, name, slug}`)
  if (!root) {
    console.log('✅ Elite Collectibles taxonomy not found – nothing to delete.')
    return
  }
  console.log(`Found root category: ${root._id}`)

  // Fetch all categories to build a parent‑child map
  const allCategories = await client.fetch(`*[_type == "category"]{_id, name, parentCategory->{_id}}`)
  const childrenMap = new Map()
  for (const cat of allCategories) {
    const parentId = cat.parentCategory?.['_id']
    if (parentId) {
      if (!childrenMap.has(parentId)) childrenMap.set(parentId, [])
      childrenMap.get(parentId).push(cat)
    }
  }

  // Recursive post‑order traversal to collect ids in delete order (children first)
  const idsToDelete = []
  function collectDescendants(id) {
    const children = childrenMap.get(id) || []
    for (const child of children) {
      collectDescendants(child._id)
    }
    idsToDelete.push(id)
  }
  collectDescendants(root._id)

  console.log(`Total categories to delete (including root): ${idsToDelete.length}`)

  // Unset any references to these categories in other documents before deletion
  for (const catId of idsToDelete) {
    const referencingDocs = await client.fetch(`*[_type != "category" && references($id)]{_id}`, { id: catId })
    if (referencingDocs.length > 0) {
      console.log(`Unsetting references to ${catId} in ${referencingDocs.length} documents...`)
      const patchTx = client.transaction()
      referencingDocs.forEach(doc => {
        // Unset generic reference fields; adjust if custom fields exist
        patchTx.patch(doc._id, p => p.unset(["category", "parentCategory"]))
      })
      await patchTx.commit()
    }
  }

  // Delete categories in a single transaction (order already ensures children first)
  const deleteTx = client.transaction()
  idsToDelete.forEach(id => deleteTx.delete(id))
  try {
    await deleteTx.commit()
    console.log('✅ All Elite Collectibles categories have been deleted.')
  } catch (err) {
    console.error('❌ Error during deletion:', err.message)
  }
}

main().catch(err => {
  console.error('Fatal script error:', err)
  process.exit(1)
})
