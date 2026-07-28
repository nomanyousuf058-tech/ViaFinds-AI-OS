import { getCliClient } from 'sanity/cli'
import { randomUUID } from 'crypto'

const client = getCliClient({ apiVersion: '2024-01-01' })

const PARENT_ID = 'cat-5cf53fd3-f040-4373-a7d5-2442ed920514' // Elite Collectibles ID

const NEW_CATEGORIES = [
  { name: 'Action Figures', slug: 'action-figures', desc: 'Vintage and modern action figures from major franchises.', seoDesc: 'Shop collectible action figures from Star Wars, Marvel, DC, and other major pop culture franchises.' },
  { name: 'Anime Collectibles', slug: 'anime-collectibles', desc: 'Figures, merchandise, and memorabilia from popular anime series.', seoDesc: 'Buy rare anime collectibles, import figures, and exclusive merchandise from top series.' },
  { name: 'Trading Cards', slug: 'trading-cards', desc: 'Graded sports cards, Pokémon, Magic: The Gathering, and other CCGs.', seoDesc: 'Invest in graded sports cards, Pokémon cards, Magic: The Gathering, and rare trading cards.' },
  { name: 'Sports Memorabilia', slug: 'sports-memorabilia', desc: 'Game-used equipment, signed jerseys, and authenticated sports items.', seoDesc: 'Find authenticated sports memorabilia, autographed jerseys, and game-used equipment.' },
  { name: 'Coins', slug: 'coins', desc: 'Rare coins, historical currency, and precious metal bullion coins.', seoDesc: 'Collect rare coins, silver and gold bullion, and historical coinage from around the world.' },
  { name: 'Paper Money', slug: 'paper-money', desc: 'Historic banknotes, rare paper currency, and graded notes.', seoDesc: 'Buy and sell historic banknotes, rare paper money, and graded currency from various eras.' },
  { name: 'Stamps', slug: 'stamps', desc: 'Rare postage stamps, historical covers, and complete collections.', seoDesc: 'Discover rare postage stamps, historical mail covers, and valuable philatelic collections.' },
  { name: 'Funko Pop!', slug: 'funko-pop', desc: 'Exclusive, vaulted, and limited edition Funko Pop! vinyl figures.', seoDesc: 'Shop vaulted, exclusive, and rare Funko Pop! vinyl figures from your favorite fandoms.' },
  { name: 'Statues', slug: 'statues', desc: 'Premium format statues, limited edition sculpts, and resin models.', seoDesc: 'Collect premium format statues, resin sculpts, and limited edition character models.' },
  { name: 'Model Kits', slug: 'model-kits', desc: 'Unbuilt vintage kits, Gunpla, and highly detailed scale models.', seoDesc: 'Find unbuilt vintage model kits, Gundam (Gunpla), and highly detailed scale models.' },
  { name: 'Die-Cast Models', slug: 'die-cast-models', desc: 'Collectible die-cast cars, planes, and construction equipment.', seoDesc: 'Shop collectible die-cast model cars, aircraft, and high-quality replica vehicles.' },
  { name: 'Comic Books & Graphic Novels', slug: 'comic-books-graphic-novels', desc: 'Graded comic books, original comic art, and rare graphic novels.', seoDesc: 'Invest in graded comic books, first appearances, and rare original comic book art.' },
  { name: 'Dolls', slug: 'dolls', desc: 'Antique dolls, collectible Barbies, and limited edition fashion dolls.', seoDesc: 'Collect antique porcelain dolls, vintage Barbies, and limited edition fashion dolls.' },
  { name: 'Plush Toys', slug: 'plush-toys', desc: 'Vintage stuffed animals, limited run plushies, and character plush.', seoDesc: 'Find vintage plush toys, limited edition stuffed animals, and rare character plushies.' },
  { name: 'Vintage Toys', slug: 'vintage-toys', desc: 'Classic tin toys, vintage board games, and nostalgic playthings.', seoDesc: 'Discover classic tin toys, retro board games, and highly sought-after vintage toys.' },
  { name: 'Movie Memorabilia', slug: 'movie-memorabilia', desc: 'Authentic film props, original posters, and cinema artifacts.', seoDesc: 'Own authentic movie props, original theatrical posters, and rare cinematic artifacts.' },
  { name: 'TV Show Memorabilia', slug: 'tv-show-memorabilia', desc: 'Screen-used wardrobes, scripts, and classic television props.', seoDesc: 'Collect screen-used wardrobes, original scripts, and authentic TV show memorabilia.' },
  { name: 'Music Memorabilia', slug: 'music-memorabilia', desc: 'Signed instruments, concert posters, and artist artifacts.', seoDesc: 'Buy signed guitars, vintage concert posters, and authentic music industry memorabilia.' },
  { name: 'Vinyl Records', slug: 'vinyl-records', desc: 'Rare vinyl pressings, first editions, and sealed vintage albums.', seoDesc: 'Shop rare vinyl records, first pressings, and sealed vintage albums for audiophiles.' },
  { name: 'Antique Collectibles', slug: 'antique-collectibles', desc: 'Fine antiques, historical artifacts, and period decorative arts.', seoDesc: 'Invest in fine antiques, historical artifacts, and highly collectible period pieces.' },
  { name: 'Fine Art & Limited Edition Prints', slug: 'fine-art-limited-edition-prints', desc: 'Original paintings, sculptures, and numbered art prints.', seoDesc: 'Acquire original paintings, fine art sculptures, and signed limited edition prints.' },
  { name: 'Luxury Watches', slug: 'luxury-watches', desc: 'High-end mechanical watches, vintage chronographs, and timepieces.', seoDesc: 'Shop high-end mechanical watches, vintage chronographs, and luxury timepieces.' },
  { name: 'Jewelry', slug: 'jewelry', desc: 'Vintage fine jewelry, precious gemstones, and estate pieces.', seoDesc: 'Find vintage fine jewelry, precious loose gemstones, and exquisite estate pieces.' },
  { name: 'Militaria & Historical Artifacts', slug: 'militaria-historical-artifacts', desc: 'Historic military gear, wartime relics, and historical items.', seoDesc: 'Collect historic military gear, authentic wartime relics, and significant artifacts.' },
  { name: 'Vintage Advertising & Paper Ephemera', slug: 'vintage-advertising-paper-ephemera', desc: 'Antique signs, historical posters, and paper collectibles.', seoDesc: 'Discover antique advertising signs, vintage promotional posters, and paper ephemera.' },
  { name: 'Keychains', slug: 'keychains', desc: 'Collectible vintage keychains, promotional tags, and fobs.', seoDesc: 'Shop collectible vintage keychains, promotional fobs, and rare novelty tags.' },
  { name: 'Pins & Badges', slug: 'pins-badges', desc: 'Enamel pins, vintage campaign buttons, and collectible badges.', seoDesc: 'Find rare enamel pins, vintage political campaign buttons, and collectible badges.' },
  { name: 'Collecting Supplies', slug: 'collecting-supplies', desc: 'Protective cases, grading tools, and display accessories.', seoDesc: 'Buy protective cases, storage boxes, display stands, and essential collecting supplies.' }
]

async function main() {
  console.log('\n  Rebuilding Elite Collectibles Taxonomy (V3)...\n')

  // Step 1: Delete existing Level 2 categories
  console.log('  Step 1: Deleting existing Level 2 categories...')
  const existingL2 = await client.fetch(
    `*[_type == "category" && parentCategory._ref == $parentId]`,
    { parentId: PARENT_ID }
  )
  
  let deleteTransaction = client.transaction()
  for (const doc of existingL2) {
    deleteTransaction.delete(doc._id)
    console.log(`    - Queued for deletion: ${doc.name || doc.slug?.current || doc._id}`)
  }

  // Also catch any drafts of those
  const existingL2Drafts = await client.fetch(
    `*[_type == "category" && _id in path("drafts.**")]`
  )
  for (const draft of existingL2Drafts) {
    if (existingL2.some(l2 => l2._id === draft._id.replace('drafts.', ''))) {
      deleteTransaction.delete(draft._id)
      console.log(`    - Queued for deletion (draft): ${draft._id}`)
    }
  }

  if (existingL2.length > 0 || existingL2Drafts.length > 0) {
    await deleteTransaction.commit()
    console.log(`  ✓ Deleted ${existingL2.length} published and any associated drafts.\n`)
  } else {
    console.log('  - No existing L2 categories found.\n')
  }

  // Step 2: Create new categories
  console.log('  Step 2: Creating 28 new categories...')
  let createTransaction = client.transaction()
  let displayOrder = 10

  for (const cat of NEW_CATEGORIES) {
    const newDoc = {
      _type: 'category',
      _id: `cat-${randomUUID()}`,
      name: cat.name,
      slug: { _type: 'slug', current: cat.slug },
      description: cat.desc,
      parentCategory: { _type: 'reference', _ref: PARENT_ID },
      featured: false,
      status: 'active',
      displayOrder: displayOrder,
      visibility: 'public',
      seo: {
        metaTitle: `${cat.name} Collectibles`,
        metaDescription: cat.seoDesc
      }
    }
    
    // Safety check for SEO title length
    if (newDoc.seo.metaTitle.length > 60) {
      newDoc.seo.metaTitle = cat.name // fallback if too long
    }

    createTransaction.create(newDoc)
    console.log(`    + Created: ${cat.name} (${cat.slug}) [Order: ${displayOrder}]`)
    displayOrder += 10
  }

  console.log(`\n  Committing creation transaction to Sanity...`)
  await createTransaction.commit()
  console.log('  Transaction committed successfully!\n')

  console.log('\n  ======================================================')
  console.log('            TAXONOMY REBUILD COMPLETE')
  console.log('  ======================================================')
  console.log(`  Categories deleted : ${existingL2.length}`)
  console.log(`  New categories     : ${NEW_CATEGORIES.length}`)
  console.log('\n')
}

main().catch((err) => {
  console.error('\n  Fatal error:', err.message)
  process.exit(1)
})
