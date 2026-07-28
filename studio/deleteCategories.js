import { getCliClient } from 'sanity/cli'

async function deleteCategories() {
  const client = getCliClient()
  console.log('Fetching all categories...')
  
  const categoryIds = await client.fetch(`*[_type == "category"]._id`)
  
  if (categoryIds.length === 0) {
    console.log('No categories to delete.')
    return
  }
  
  console.log(`Found ${categoryIds.length} categories.`)

  const referencingDocs = await client.fetch(`*[references($ids)]`, { ids: categoryIds })
  
  if (referencingDocs.length > 0) {
    console.log(`Found ${referencingDocs.length} documents referencing categories. Unsetting...`)
    const unsetTx = client.transaction()
    referencingDocs.forEach(doc => {
      unsetTx.patch(doc._id, p => p.unset(['category', 'parentCategory']))
    })
    await unsetTx.commit()
    console.log('References unset.')
  }

  console.log(`Deleting categories...`)
  const deleteTx = client.transaction()
  categoryIds.forEach((id) => {
    deleteTx.delete(id)
  })

  try {
    await deleteTx.commit()
    console.log('Successfully deleted all categories.')
  } catch (err) {
    console.error('Error deleting categories:', err.message)
  }
}

deleteCategories()
