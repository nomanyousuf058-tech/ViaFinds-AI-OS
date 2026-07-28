// fixCategoryTitles.js
// Fixes the empty "title" field on all Elite Collectibles category documents.
// Run from the /studio directory:
//   npx sanity exec scripts/fixCategoryTitles.js --with-user-token

import { getCliClient } from 'sanity/cli'

const client = getCliClient({ apiVersion: '2024-01-01' })

// Slug → Title mapping (all 21 documents)
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
  console.log('\n  Fixing category titles...\n')

  // Fetch ALL versions — published and drafts
  const docs = await client.fetch(
    `*[_type == "category"]{ _id, title, "slug": slug.current }`
  )

  console.log(`  Found ${docs.length} category documents.\n`)

  let fixed = 0
  let skipped = 0

  for (const doc of docs) {
    const expectedTitle = SLUG_TO_TITLE[doc.slug]

    if (!expectedTitle) {
      console.log(`  SKIP  ${doc._id} — slug "${doc.slug}" not in mapping`)
      skipped++
      continue
    }

    if (doc.title === expectedTitle) {
      console.log(`  OK    ${expectedTitle} (title already correct)`)
      skipped++
      continue
    }

    // Patch the published document
    try {
      await client
        .patch(doc._id)
        .set({ title: expectedTitle })
        .commit({ publish: true })

      console.log(`  FIX ✓ ${expectedTitle}  (was: "${doc.title || 'empty'}")`)
      fixed++
    } catch (err) {
      console.error(`  ERROR  ${doc._id}: ${err.message}`)
    }

    // Also patch the draft version if it exists
    const draftId = `drafts.${doc._id}`
    try {
      await client
        .patch(draftId)
        .set({ title: expectedTitle })
        .commit()
      console.log(`  FIX ✓ ${expectedTitle} (draft)`)
    } catch {
      // Draft may not exist — that's fine
    }
  }

  console.log('\n  ======================================================')
  console.log('            TITLE FIX COMPLETE')
  console.log('  ======================================================')
  console.log(`  Fixed   : ${fixed} documents`)
  console.log(`  Skipped : ${skipped} (already correct or not matched)`)
  console.log('\n  Refresh Sanity Studio (Ctrl+Shift+R) to verify.\n')
}

main().catch((err) => {
  console.error('\n  Fatal error:', err.message)
  process.exit(1)
})
