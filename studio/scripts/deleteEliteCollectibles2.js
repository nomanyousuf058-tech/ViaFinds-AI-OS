// deleteEliteCollectibles.js
// Deletes "Elite Collectibles" taxonomy and all descendants using Sanity client

const { createClient } = require('@sanity/client');

const client = createClient({
  projectId: 'e44z7hta',
  dataset: 'production',
  apiVersion: '2024-01-01',
  useCdn: false,
  token: "skAuDxLf1Ba7JwdVa9RVOF3SGpw1N5Cb4yMRVA1qEnd7kFZaPhu68CdsPFeADK1V11jqJdwH2e7RINAhbHtXjzMHPhZfarPJRxyMdlJBPugZTkKXXNb16OLdbrD01lahzN2RA91wb06GmBCi96zC0A4gexqobL9iAf0fSd28YTixDcHVL8Or", // token with delete permissions
});

async function main() {
  console.log('Fetching Elite Collectibles root category...');
  const root = await client.fetch(`*[_type == "category" && name == "Elite Collectibles"][0]{_id}`);
  if (!root) {
    console.log('✅ Elite Collectibles taxonomy not found – nothing to delete.');
    return;
  }
  console.log(`Root found: ${root._id}`);

  // Build parent-child map
  const allCategories = await client.fetch(`*[_type == "category"]{_id, parentCategory->{_id}}`);
  const childrenMap = new Map();
  for (const cat of allCategories) {
    const parentId = cat.parentCategory?.['_id'];
    if (parentId) {
      if (!childrenMap.has(parentId)) childrenMap.set(parentId, []);
      childrenMap.get(parentId).push(cat);
    }
  }

  // Collect ids in post-order (children first)
  const idsToDelete = [];
  function collect(id) {
    const children = childrenMap.get(id) || [];
    for (const child of children) collect(child._id);
    idsToDelete.push(id);
  }
  collect(root._id);

  console.log(`Total categories to delete (including root): ${idsToDelete.length}`);

  // Unset references in non-category docs
  for (const catId of idsToDelete) {
    const refs = await client.fetch(`*[_type != "category" && references($id)]{_id}`, { id: catId });
    if (refs.length) {
      const tx = client.transaction();
      refs.forEach(doc => tx.patch(doc._id, p => p.unset(["category", "parentCategory"])));
      await tx.commit();
    }
  }

  // Delete categories
  const delTx = client.transaction();
  idsToDelete.forEach(id => delTx.delete(id));
  try {
    await delTx.commit();
    console.log('✅ All Elite Collectibles categories deleted.');
  } catch (e) {
    console.error('❌ Deletion error:', e.message);
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
