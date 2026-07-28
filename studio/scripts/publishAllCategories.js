// publishAllCategories.js
// Publishes all draft category documents so they stop showing as "Untitled".
// Run from the /studio directory:
//   npx sanity exec scripts/publishAllCategories.js --with-user-token

import { getCliClient } from 'sanity/cli'

const client = getCliClient({ apiVersion: '2024-01-01' })

// Slug → Title mapping
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
  console.log('\n  Publishing all category documents...\n')

  // 1. Fetch all drafts
  const drafts = await client.fetch(
    `*[_type == "category" && _id in path("drafts.**")]{ _id, title, "slug": slug.current }`
  )
  console.log(`  Found ${drafts.length} draft category documents.\n`)

  // 2. Delete each draft after ensuring the published version has the title
  let published = 0

  for (const draft of drafts) {
    const publishedId = draft._id.replace('drafts.', '')
    const expectedTitle = SLUG_TO_TITLE[draft.slug]

    if (!expectedTitle) {
      console.log(`  SKIP  ${draft._id} — not in our category set`)
      continue
    }

    try {
      // Ensure published version has all fields from draft
      const publishedDoc = await client.fetch(
        `*[_id == $id][0]`,
        { id: publishedId }
      )

      if (publishedDoc) {
        // Patch published doc with title to be sure, then delete draft
        await client
          .patch(publishedId)
          .set({ title: expectedTitle })
          .commit()

        await client.delete(draft._id)
        console.log(`  PUBLISH ✓ ${expectedTitle}  (draft removed)`)
        published++
      }
    } catch (err) {
      console.error(`  ERROR  ${expectedTitle}: ${err.message}`)
    }
  }

  // 3. Also make sure all published docs have titles
  const allPublished = await client.fetch(
    `*[_type == "category" && !(_id in path("drafts.**"))]{ _id, title, "slug": slug.current }`
  )

  let titleFixed = 0
  for (const doc of allPublished) {
    const expectedTitle = SLUG_TO_TITLE[doc.slug]
    if (!expectedTitle) continue
    if (doc.title === expectedTitle) continue

    await client.patch(doc._id).set({ title: expectedTitle }).commit()
    console.log(`  TITLE FIX ✓ ${expectedTitle}`)
    titleFixed++
  }

  console.log('\n  ======================================================')
  console.log('            PUBLISH COMPLETE')
  console.log('  ======================================================')
  console.log(`  Drafts removed : ${published}`)
  console.log(`  Titles fixed   : ${titleFixed}`)
  console.log('\n  Hard-refresh Sanity Studio (Ctrl+Shift+R) to see names.\n')
}

main().catch((err) => {
  console.error('\n  Fatal error:', err.message)
  process.exit(1)
})
