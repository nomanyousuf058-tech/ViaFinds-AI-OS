// fixCategoryNamesProperty.js
// Updates the "name" field of all 21 category documents to have the correct human-readable name.
// This is critical because Next.js frontend queries "name" and Sanity Studio now uses the "name" field.
// Run from the /studio directory:
//   npx sanity exec scripts/fixCategoryNamesProperty.js --with-user-token

import { getCliClient } from 'sanity/cli'

const client = getCliClient({ apiVersion: '2024-01-01' })

const SLUG_TO_TITLE = {
  'elite-collectibles': 'Elite Collectibles',
  'trading-cards': 'Trading Cards',
  'coins-currency': 'Coins & Currency',
  'sports-memorabilia-autographs': 'Sports Memorabilia & Autographs',
  'action-figures-statues': 'Action Figures & Collectible Statues',
  'comic-books-graphic-novels': 'Comic Books & Graphic Novels',
  'vintage-toys-diecast-models': 'Vintage Toys & Diecast Models',
  'fine-art-limited-edition-prints': 'Fine Art & Limited Edition Prints',
  'antiques-decorative-arts': 'Antiques & Decorative Arts',
  'luxury-watches-timepieces': 'Luxury Watches & Timepieces',
  'movie-tv-entertainment-memorabilia': 'Movie, TV & Entertainment Memorabilia',
  'stamps-philately': 'Stamps & Philately',
  'video-games-gaming-collectibles': 'Video Games & Gaming Collectibles',
  'vinyl-records-music-memorabilia': 'Vinyl Records & Music Memorabilia',
  'sneakers-streetwear': 'Sneakers & Streetwear',
  'rare-books-manuscripts': 'Rare Books & Manuscripts',
  'militaria-historical-artifacts': 'Militaria & Historical Artifacts',
  'jewelry-gemstones': 'Jewelry & Gemstones',
  'wine-spirits-cigars': 'Wine, Spirits & Cigars',
  'rocks-minerals-fossils': 'Rocks, Minerals & Fossils',
  'vintage-advertising-paper-ephemera': 'Vintage Advertising & Paper Ephemera',
}

async function main() {
  console.log('\n  Setting "name" field to human-readable names on ALL category docs...\n')

  // Step 1: Remove all draft documents to avoid out-of-sync edits
  console.log('  Step 1: Removing all draft category documents...')
  const drafts = await client.fetch(
    `*[_type == "category" && _id in path("drafts.**")]{ _id }`
  )
  for (const draft of drafts) {
    await client.delete(draft._id)
    console.log(`    Deleted draft: ${draft._id}`)
  }
  console.log(`    → ${drafts.length} drafts deleted.\n`)

  // Step 2: Fetch all published category documents
  console.log('  Step 2: Fetching all published category documents...')
  const published = await client.fetch(
    `*[_type == "category" && !(_id in path("drafts.**"))]{ _id, name, title, "slug": slug.current }`
  )
  console.log(`    → Found ${published.length} published category documents.\n`)

  // Step 3: Patch the "name" field on every document
  console.log('  Step 3: Updating the "name" field...')
  let transaction = client.transaction()
  let count = 0

  for (const doc of published) {
    const expectedName = SLUG_TO_TITLE[doc.slug]
    if (!expectedName) {
      console.log(`    SKIP ${doc._id} — slug "${doc.slug}" not recognized`)
      continue
    }

    transaction = transaction.patch(doc._id, (patch) =>
      patch.set({ name: expectedName })
    )
    console.log(`    QUEUE ✓ "${expectedName}" → ${doc._id}  (was name: "${doc.name || '<empty>'}", was title: "${doc.title || '<empty>'}")`)
    count++
  }

  if (count > 0) {
    console.log(`\n  Committing transaction to Sanity...`)
    await transaction.commit()
    console.log('  Transaction committed successfully!\n')
  }

  // Step 4: Verification
  console.log('  Step 4: Verification query...')
  const verify = await client.fetch(
    `*[_type == "category" && !(_id in path("drafts.**"))] | order(name asc) { _id, name, title, "slug": slug.current }`
  )
  for (const doc of verify) {
    const status = doc.name === SLUG_TO_TITLE[doc.slug] ? '✓' : '✗ WRONG/EMPTY'
    console.log(`    ${status}  name: "${doc.name}"  (slug: ${doc.slug})`)
  }

  console.log('\n  ======================================================')
  console.log('            NAME PROPERTIES FIX COMPLETE')
  console.log('  ======================================================')
  console.log(`  Drafts deleted  : ${drafts.length}`)
  console.log(`  Names updated   : ${count}`)
  console.log(`  Total verified  : ${verify.length}`)
  console.log('\n  Please hard-refresh Sanity Studio (Ctrl+Shift+R).\n')
}

main().catch((err) => {
  console.error('\n  Fatal error:', err.message)
  process.exit(1)
})
