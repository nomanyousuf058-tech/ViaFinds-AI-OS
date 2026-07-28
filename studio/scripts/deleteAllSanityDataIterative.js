// deleteAllSanityDataIterative.js
// Deletes every document and asset from the Sanity dataset.
// Handles reference dependencies by retrying failed deletions.

const { createClient } = require('@sanity/client');

const client = createClient({
  projectId: 'e44z7hta',
  dataset:   'production',
  apiVersion:'2024-01-01',
  useCdn:    false,
  token: 'skJVxm07DvEZM4QAAKyrbndQsEKBNLAzf8eHStpehVJMGd5lyaa7RKxVuctCodbgu6unBXRUFV6Uzy3yG4bMWgH1kao6FenxfjJoZUb3BOm5PXpvahpM0M29JjbkDHbbQS3nkuu6xCgygtiugr14F73jTUfcHihA9Yz8u8RM3UATzRlMG8vw', // full‑access token
});

async function deleteAll() {
  console.log('Fetching all document IDs...');
  const docs = await client.fetch(`*[_type != "_"]{_id}`);
  console.log(`Found ${docs.length} documents.`);

  // Keep a list of IDs that still need to be deleted
  let pending = docs.map(d => d._id);
  const maxAttempts = 10;
  let attempt = 0;

  while (pending.length && attempt < maxAttempts) {
    attempt++;
    console.log(`Deletion attempt ${attempt}, ${pending.length} items remaining...`);
    const nextPending = [];
    for (const _id of pending) {
      try {
        await client.delete(_id);
      } catch (err) {
        // If the error is due to references, keep it for a later retry
        const msg = err.message || '';
        if (msg.includes('cannot be deleted as there are references')) {
          nextPending.push(_id);
        } else {
          console.error(`Failed to delete ${_id}:`, msg);
        }
      }
    }
    if (nextPending.length === pending.length) {
      console.warn('No progress made in this attempt – possible circular references. Stopping.');
      break;
    }
    pending = nextPending;
  }

  if (pending.length) {
    console.warn(`Finished with ${pending.length} documents still undeleted due to unresolved references.`);
  } else {
    console.log('All documents deleted successfully.');
  }

  console.log('Fetching all asset IDs...');
  const assets = await client.fetch(`*[_type == "sanity.imageAsset" || _type == "sanity.fileAsset"]{_id}`);
  console.log(`Found ${assets.length} assets.`);

  for (const { _id } of assets) {
    try {
      await client.delete(_id);
    } catch (err) {
      console.error(`Failed to delete asset ${_id}:`, err.message);
    }
  }

  console.log('✅ Deletion process completed.');
}

deleteAll().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
