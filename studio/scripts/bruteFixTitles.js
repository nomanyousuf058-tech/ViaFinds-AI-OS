// bruteFixTitles.js
// Forcefully sets the title on EVERY category document (published + drafts).
// No skip logic — every document gets its title written regardless.
// Run from the /studio directory:
//   npx sanity exec scripts/bruteFixTitles.js --with-user-token

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
  console.log('\n  BRUTE FORCE title fix — setting title on ALL category docs...\n')

  // Step 1: Delete ALL drafts first
  console.log('  Step 1: Removing all draft documents...')
  const drafts = await client.fetch(
    `*[_type == "category" && _id in path("drafts.**")]{ _id, "slug": slug.current }`
  )
  for (const draft of drafts) {
    await client.delete(draft._id)
    console.log(`    DELETED draft: ${draft._id}`)
  }
  console.log(`    → ${drafts.length} drafts deleted.\n`)

  // Step 2: Get all published documents
  console.log('  Step 2: Fetching all published category documents...')
  const published = await client.fetch(
    `*[_type == "category" && !(_id in path("drafts.**"))]{ _id, title, "slug": slug.current }`
  )
  console.log(`    → Found ${published.length} published documents.\n`)

  // Step 3: Force-set title on every document using a transaction
  console.log('  Step 3: Force-setting titles...')
  let transaction = client.transaction()
  let count = 0

  for (const doc of published) {
    const expectedTitle = SLUG_TO_TITLE[doc.slug]
    if (!expectedTitle) {
      console.log(`    SKIP ${doc._id} — slug "${doc.slug}" not recognized`)
      continue
    }

    transaction = transaction.patch(doc._id, (patch) =>
      patch.set({ title: expectedTitle })
    )
    console.log(`    QUEUE ✓ "${expectedTitle}" → ${doc._id}  (was: "${doc.title || '<empty>'}")`)
    count++
  }

  if (count > 0) {
    console.log(`\n  Committing transaction (${count} patches)...`)
    await transaction.commit()
    console.log('  Transaction committed successfully!\n')
  }

  // Step 4: Verify
  console.log('  Step 4: Verification...')
  const verify = await client.fetch(
    `*[_type == "category" && !(_id in path("drafts.**"))] | order(title asc) { _id, title, "slug": slug.current }`
  )
  for (const doc of verify) {
    const status = doc.title ? '✓' : '✗ EMPTY!'
    console.log(`    ${status}  ${doc.title || '<no title>'}  (slug: ${doc.slug})`)
  }

  console.log('\n  ======================================================')
  console.log('            BRUTE FORCE FIX COMPLETE')
  console.log('  ======================================================')
  console.log(`  Drafts deleted  : ${drafts.length}`)
  console.log(`  Titles set      : ${count}`)
  console.log(`  Total verified  : ${verify.length}`)
  console.log('\n  Hard-refresh Sanity Studio (Ctrl+Shift+R) now!\n')
}

main().catch((err) => {
  console.error('\n  Fatal error:', err.message)
  process.exit(1)
})
