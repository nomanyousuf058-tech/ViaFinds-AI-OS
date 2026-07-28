// deleteAllSanityData.js
// **WARNING**: This script permanently deletes every document and asset in the Sanity project.

const { createClient } = require('@sanity/client');

const client = createClient({
  projectId: 'e44z7hta',
  dataset:   'production',
  apiVersion:'2024-01-01',
  useCdn:    false,
  token: 'skwnKTLEPiT0azfXobLjG74BEhAUlWQslzZCopfTs4TNoGLOHHD3j75xVy93lDJu7BUCiovdU4IGFKE7E9hOsQC1NrQ8MNlHMdfmU09ebWQms8pIuiDC3gv275EvuLoSSzyQZESXEETxP5hHK31X4w3zY7pWUhDAJ7mH13ciqxYkQAqMp2ph', // token with full manage permissions
});

async function main() {
  console.log('Fetching all document IDs...');
  const docs = await client.fetch(`*[_type != "_"]{_id}`);
  const ids = docs.map(d => d._id);
  console.log(`Found ${ids.length} documents.`);

  console.log('Fetching all asset IDs...');
  const assets = await client.fetch(`*[_type == "sanity.imageAsset" || _type == "sanity.fileAsset"]{_id}`);
  const assetIds = assets.map(a => a._id);
  console.log(`Found ${assetIds.length} assets.`);

  const tx = client.transaction();
  ids.forEach(id => tx.delete(id));
  assetIds.forEach(id => tx.delete(id));

  try {
    await tx.commit();
    console.log('✅ All documents and assets have been permanently deleted.');
  } catch (err) {
    console.error('❌ Deletion failed:', err.message);
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
