import { getCliClient } from 'sanity/cli'
import { randomUUID } from 'crypto'

const client = getCliClient({ apiVersion: '2024-01-01' })

const PARENT_ID = 'cat-5cf53fd3-f040-4373-a7d5-2442ed920514' // Elite Collectibles ID

const NEW_CATEGORIES = [
  {
    name: 'Designer Handbags & Luxury Fashion',
    slug: 'designer-handbags-luxury-fashion',
    description: 'Authentic luxury handbags, designer vintage apparel, and premium accessories.',
    seoTitle: 'Designer Handbags & Luxury Fashion Collectibles',
    seoDesc: 'Shop authentic vintage designer handbags and luxury fashion from Hermès, Chanel, and Louis Vuitton.',
    displayOrder: 60, // Inserted after Fine Art (50) and before Jewelry (70)
  },
  {
    name: 'Vintage Electronics & Computers',
    slug: 'vintage-electronics-computers',
    description: 'Retro computing, early Apple devices, and classic audio equipment.',
    seoTitle: 'Vintage Electronics & Retro Computers',
    seoDesc: 'Discover collectible retro computers, vintage Apple devices, and classic audio equipment.',
    displayOrder: 210, // Inserted towards the end
  },
  {
    name: 'Musical Instruments & Gear',
    slug: 'musical-instruments-gear',
    description: 'Vintage guitars, classic synthesizers, and collectible studio equipment.',
    seoTitle: 'Vintage Musical Instruments & Studio Gear',
    seoDesc: 'Browse vintage guitars, classic synthesizers, and highly collectible studio recording equipment.',
    displayOrder: 215, // Inserted towards the end
  },
]

const RENAMES = {
  'coins-currency': {
    name: 'Coins, Currency & Bullion',
    slug: 'coins-currency-bullion',
    description: 'Rare coins, historic paper money, and precious metal bullion.',
    seoTitle: 'Rare Coins, Currency & Gold Bullion',
    seoDesc: 'Invest in rare coins, historic currency, and precious metal bullion for elite collectors.',
  },
  'trading-cards': {
    name: 'Trading Cards & CCGs',
    slug: 'trading-cards-ccgs',
    description: 'Graded sports cards and collectible card games like Pokémon and Magic: The Gathering.',
    seoTitle: 'Collectible Trading Cards & CCGs',
    seoDesc: 'Buy and sell graded sports cards, Pokémon, Magic: The Gathering, and other CCGs.',
  },
  'movie-tv-entertainment-memorabilia': {
    name: 'Entertainment Memorabilia',
    slug: 'entertainment-memorabilia',
    description: 'Authentic props, wardrobes, and memorabilia from movies, TV, and theater.',
    seoTitle: 'Authentic Entertainment Memorabilia',
    seoDesc: 'Collect authentic movie props, TV wardrobes, and historical entertainment memorabilia.',
  },
  'video-games-gaming-collectibles': {
    name: 'Retro & Collectible Video Games',
    slug: 'retro-video-games',
    description: 'Graded vintage games, classic consoles, and gaming memorabilia.',
    seoTitle: 'Retro & Collectible Video Games',
    seoDesc: 'Find graded vintage video games, classic retro consoles, and rare gaming collectibles.',
  },
  'wine-spirits-cigars': {
    name: 'Rare Wine, Spirits & Cigars',
    slug: 'rare-wine-spirits-cigars',
    description: 'Collectible vintages, rare spirits, and premium aged cigars.',
    seoTitle: 'Rare Wine, Fine Spirits & Collectible Cigars',
    seoDesc: 'Invest in collectible vintage wine, rare fine spirits, and premium aged cigars.',
  }
}

async function main() {
  console.log('\n  Applying Elite Collectibles Taxonomy V2 Updates...\n')

  // Step 1: Create new categories
  console.log('  Step 1: Creating new categories...')
  let transaction = client.transaction()
  let addedCount = 0

  for (const cat of NEW_CATEGORIES) {
    const newDoc = {
      _type: 'category',
      _id: `cat-${randomUUID()}`,
      name: cat.name,
      slug: { _type: 'slug', current: cat.slug },
      description: cat.description,
      parentCategory: { _type: 'reference', _ref: PARENT_ID },
      featured: false,
      status: 'active',
      displayOrder: cat.displayOrder,
      visibility: 'public',
      seo: {
        metaTitle: cat.seoTitle,
        metaDescription: cat.seoDesc
      }
    }
    transaction.create(newDoc)
    addedCount++
    console.log(`    + Created: ${cat.name} (${cat.slug})`)
  }

  // Step 2: Fetch existing categories to rename
  console.log('\n  Step 2: Renaming existing categories...')
  const existingDocs = await client.fetch(`*[_type == "category" && !(_id in path("drafts.**"))]`)
  
  let renameCount = 0
  for (const doc of existingDocs) {
    const slug = doc.slug?.current
    if (RENAMES[slug]) {
      const update = RENAMES[slug]
      transaction.patch(doc._id, (patch) => 
        patch.set({
          name: update.name,
          slug: { _type: 'slug', current: update.slug },
          description: update.description,
          seo: {
            ...doc.seo,
            metaTitle: update.seoTitle,
            metaDescription: update.seoDesc
          }
        })
      )
      renameCount++
      console.log(`    ~ Renamed: ${slug} -> ${update.slug}`)
    }
  }

  // Commit transaction
  if (addedCount > 0 || renameCount > 0) {
    console.log(`\n  Committing transaction to Sanity...`)
    await transaction.commit()
    console.log('  Transaction committed successfully!\n')
  } else {
    console.log(`\n  No changes to commit.\n`)
  }

  console.log('\n  ======================================================')
  console.log('            TAXONOMY V2 UPDATE COMPLETE')
  console.log('  ======================================================')
  console.log(`  New categories added : ${addedCount}`)
  console.log(`  Categories renamed   : ${renameCount}`)
  console.log('\n')
}

main().catch((err) => {
  console.error('\n  Fatal error:', err.message)
  process.exit(1)
})
