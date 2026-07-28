// populateEliteCollectiblesL2.js
// Creates the Level 1 "Elite Collectibles" root category and all 20 Level 2 subcategories.
// Safe to re-run: uses createIfNotExists so no duplicates are ever made.
// Run from the /studio directory:
//   npx sanity exec scripts/populateEliteCollectiblesL2.js --with-user-token

import { getCliClient } from 'sanity/cli'
import { randomUUID } from 'crypto'

const client = getCliClient({ apiVersion: '2024-01-01' })

// ─── Level 1 Root ─────────────────────────────────────────────────────────────
const ROOT = {
  title: 'Elite Collectibles',
  slug: 'elite-collectibles',
  description:
    'The most comprehensive destination for serious collectors — spanning trading cards, coins, fine art, vintage memorabilia, luxury watches, and every major collectibles category in between.',
  seo: {
    metaTitle: 'Elite Collectibles | ViaFinds',
    metaDescription:
      "Explore the world's finest collectibles — trading cards, rare coins, fine art, sports memorabilia, luxury watches, and more. Curated for serious collectors.",
    noIndex: false,
    noFollow: false,
  },
}

// ─── Level 2 Categories ───────────────────────────────────────────────────────
// Sorted highest to lowest demand. icon field stores the Material Symbol name.
const L2_CATEGORIES = [
  {
    title: 'Trading Cards',
    slug: 'trading-cards',
    icon: 'playing_cards',
    description:
      'Sports cards, Pokemon, Magic: The Gathering, non-sports, and graded trading cards from all eras — the largest and most actively traded collectibles market in the world.',
    seo: {
      metaTitle: 'Trading Cards | Elite Collectibles — ViaFinds',
      metaDescription:
        'Shop and compare trading cards — from vintage sports cards and Pokemon TCG to graded PSA and BGS slabs. Find the best deals on collectible trading cards.',
      noIndex: false,
      noFollow: false,
    },
  },
  {
    title: 'Coins & Currency',
    slug: 'coins-currency',
    icon: 'monetization_on',
    description:
      'Rare coins, ancient and world currency, bullion, error coins, paper money, and certified numismatic pieces from hobbyist to investment grade.',
    seo: {
      metaTitle: 'Coins & Currency | Elite Collectibles — ViaFinds',
      metaDescription:
        'Discover rare coins, world currency, bullion, and certified numismatic pieces. From ancient Roman coins to modern PCGS-graded slabs.',
      noIndex: false,
      noFollow: false,
    },
  },
  {
    title: 'Sports Memorabilia & Autographs',
    slug: 'sports-memorabilia-autographs',
    icon: 'emoji_events',
    description:
      'Game-used jerseys, equipment, signed balls, gloves, helmets, bats, and authenticated autographs from professional athletes across all major sports.',
    seo: {
      metaTitle: 'Sports Memorabilia & Autographs | Elite Collectibles — ViaFinds',
      metaDescription:
        'Browse authenticated sports memorabilia and autographs — game-worn jerseys, signed equipment, and PSA/JSA certified pieces from your favourite athletes.',
      noIndex: false,
      noFollow: false,
    },
  },
  {
    title: 'Action Figures & Collectible Statues',
    slug: 'action-figures-statues',
    icon: 'smart_toy',
    description:
      'Premium articulated figures, limited-edition statues, and high-end figurines spanning comic book heroes, sci-fi, fantasy, anime, and film franchises.',
    seo: {
      metaTitle: 'Action Figures & Collectible Statues | Elite Collectibles — ViaFinds',
      metaDescription:
        'Find premium action figures and collectible statues from Hot Toys, Sideshow, NECA, and more. Marvel, Star Wars, anime, and limited-edition releases.',
      noIndex: false,
      noFollow: false,
    },
  },
  {
    title: 'Comic Books & Graphic Novels',
    slug: 'comic-books-graphic-novels',
    icon: 'auto_stories',
    description:
      'Single issues, complete runs, and graphic novel collections spanning Golden Age, Silver Age, Bronze Age, and Modern era comics — including CGC-graded and raw copies.',
    seo: {
      metaTitle: 'Comic Books & Graphic Novels | Elite Collectibles — ViaFinds',
      metaDescription:
        'Explore collectible comic books from Golden Age to Modern — key issues, first appearances, and CGC-graded slabs across Marvel, DC, Image, and beyond.',
      noIndex: false,
      noFollow: false,
    },
  },
  {
    title: 'Vintage Toys & Diecast Models',
    slug: 'vintage-toys-diecast-models',
    icon: 'toys',
    description:
      'Original vintage toys, tin toys, diecast vehicles, model kits, LEGO sets, and miniature vehicles from iconic eras — MOC and loose examples from the 1940s through the 1990s.',
    seo: {
      metaTitle: 'Vintage Toys & Diecast Models | Elite Collectibles — ViaFinds',
      metaDescription:
        'Shop vintage toys, tin toys, diecast cars, model kits, and classic LEGO sets. AFA-graded and MOC examples from the golden age of toy collecting.',
      noIndex: false,
      noFollow: false,
    },
  },
  {
    title: 'Fine Art & Limited Edition Prints',
    slug: 'fine-art-limited-edition-prints',
    icon: 'palette',
    description:
      'Original paintings, drawings, sculptures, and limited-edition artist prints — including pop art, street art, photography, and works by both established and emerging artists.',
    seo: {
      metaTitle: 'Fine Art & Limited Edition Prints | Elite Collectibles — ViaFinds',
      metaDescription:
        'Collect fine art and limited-edition prints — original paintings, sculptures, photography, and signed artist prints with full provenance.',
      noIndex: false,
      noFollow: false,
    },
  },
  {
    title: 'Antiques & Decorative Arts',
    slug: 'antiques-decorative-arts',
    icon: 'museum',
    description:
      'Pre-1900 and early 20th-century furniture, ceramics, glassware, silverware, clocks, and decorative objects with historical or artistic provenance.',
    seo: {
      metaTitle: 'Antiques & Decorative Arts | Elite Collectibles — ViaFinds',
      metaDescription:
        'Discover antiques and decorative arts — furniture, ceramics, silverware, clocks, and historical objects with authenticated provenance from major auction houses.',
      noIndex: false,
      noFollow: false,
    },
  },
  {
    title: 'Luxury Watches & Timepieces',
    slug: 'luxury-watches-timepieces',
    icon: 'watch',
    description:
      'Vintage and modern pre-owned luxury timepieces — including wristwatches, pocket watches, and rare complications with collector-grade provenance from iconic Swiss and global manufacturers.',
    seo: {
      metaTitle: 'Luxury Watches & Timepieces | Elite Collectibles — ViaFinds',
      metaDescription:
        'Browse luxury and vintage watches — Rolex, Patek Philippe, Omega, and more. Authenticated pre-owned timepieces with collector-grade provenance.',
      noIndex: false,
      noFollow: false,
    },
  },
  {
    title: 'Movie, TV & Entertainment Memorabilia',
    slug: 'movie-tv-entertainment-memorabilia',
    icon: 'movie',
    description:
      'Screen-used props, original costumes, film scripts, production artwork, lobby cards, and certified memorabilia from iconic movies, television shows, and theatrical productions.',
    seo: {
      metaTitle: 'Movie, TV & Entertainment Memorabilia | Elite Collectibles — ViaFinds',
      metaDescription:
        "Find authentic movie and TV memorabilia — screen-used props, costumes, signed scripts, and production art from Hollywood's most iconic productions.",
      noIndex: false,
      noFollow: false,
    },
  },
  {
    title: 'Stamps & Philately',
    slug: 'stamps-philately',
    icon: 'mail',
    description:
      'Rare and collectible postage stamps, first-day covers, postal history, revenue stamps, and certified philatelic material from around the world spanning the 19th century to modern issues.',
    seo: {
      metaTitle: 'Stamps & Philately | Elite Collectibles — ViaFinds',
      metaDescription:
        'Explore rare stamps and philatelic collectibles — first-day covers, postal history, error stamps, and certified philatelic material from global specialists.',
      noIndex: false,
      noFollow: false,
    },
  },
  {
    title: 'Video Games & Gaming Collectibles',
    slug: 'video-games-gaming-collectibles',
    icon: 'sports_esports',
    description:
      'Factory-sealed retro and modern video games, limited-edition consoles, arcade machines, handheld hardware, and gaming memorabilia — including WATA and VGA graded titles.',
    seo: {
      metaTitle: 'Video Games & Gaming Collectibles | Elite Collectibles — ViaFinds',
      metaDescription:
        'Shop sealed retro video games, graded titles (WATA, VGA), limited consoles, and gaming memorabilia. The fastest-growing alternative collectibles category.',
      noIndex: false,
      noFollow: false,
    },
  },
  {
    title: 'Vinyl Records & Music Memorabilia',
    slug: 'vinyl-records-music-memorabilia',
    icon: 'album',
    description:
      'First-press vinyl records, signed albums, original concert posters, tour merchandise, instruments, and music-related ephemera from rock, jazz, hip-hop, and all major genres.',
    seo: {
      metaTitle: 'Vinyl Records & Music Memorabilia | Elite Collectibles — ViaFinds',
      metaDescription:
        'Collect first-press vinyl, signed albums, concert posters, and rare music memorabilia. Spanning rock, jazz, hip-hop, and every major musical era.',
      noIndex: false,
      noFollow: false,
    },
  },
  {
    title: 'Sneakers & Streetwear',
    slug: 'sneakers-streetwear',
    icon: 'style',
    description:
      'Deadstock, limited-edition, and collaboration sneakers alongside rare streetwear drops — including authenticated pairs from Jordan Brand, Nike, Adidas, and Supreme.',
    seo: {
      metaTitle: 'Sneakers & Streetwear | Elite Collectibles — ViaFinds',
      metaDescription:
        'Find deadstock sneakers and rare streetwear — limited Jordan Brand, Nike, Adidas, and Supreme drops, fully authenticated with StockX and GOAT provenance.',
      noIndex: false,
      noFollow: false,
    },
  },
  {
    title: 'Rare Books & Manuscripts',
    slug: 'rare-books-manuscripts',
    icon: 'library_books',
    description:
      'First editions, signed author copies, illuminated manuscripts, historical documents, maps, and antiquarian books with bibliographic or historical significance.',
    seo: {
      metaTitle: 'Rare Books & Manuscripts | Elite Collectibles — ViaFinds',
      metaDescription:
        'Discover rare books, first editions, signed author copies, illuminated manuscripts, and antiquarian volumes with provenance from specialist bibliographic dealers.',
      noIndex: false,
      noFollow: false,
    },
  },
  {
    title: 'Militaria & Historical Artifacts',
    slug: 'militaria-historical-artifacts',
    icon: 'military_tech',
    description:
      'Military uniforms, medals, insignia, edged weapons, helmets, maps, and historical documents from major conflicts — spanning ancient warfare through the 20th century.',
    seo: {
      metaTitle: 'Militaria & Historical Artifacts | Elite Collectibles — ViaFinds',
      metaDescription:
        'Browse authenticated militaria and historical artifacts — WWII medals, antique edged weapons, uniforms, and rare documents from specialist auction houses.',
      noIndex: false,
      noFollow: false,
    },
  },
  {
    title: 'Jewelry & Gemstones',
    slug: 'jewelry-gemstones',
    icon: 'diamond',
    description:
      'Estate, vintage, and signed designer jewelry alongside certified loose gemstones — including Art Deco, Victorian, Mid-Century, and contemporary fine jewelry with GIA or equivalent provenance.',
    seo: {
      metaTitle: 'Jewelry & Gemstones | Elite Collectibles — ViaFinds',
      metaDescription:
        'Explore estate jewelry and certified gemstones — Art Deco rings, Victorian brooches, signed designer pieces, and GIA-certified diamonds and coloured stones.',
      noIndex: false,
      noFollow: false,
    },
  },
  {
    title: 'Wine, Spirits & Cigars',
    slug: 'wine-spirits-cigars',
    icon: 'wine_bar',
    description:
      'Investment-grade fine wine, rare single malt whiskies, aged cognacs, limited-edition spirits releases, and vintage cigars — collected for connoisseurship, provenance, and appreciating value.',
    seo: {
      metaTitle: 'Wine, Spirits & Cigars | Elite Collectibles — ViaFinds',
      metaDescription:
        'Invest in fine wine, rare whisky, aged cognac, and vintage cigars. Provenance-backed bottles and cases from specialist auction houses worldwide.',
      noIndex: false,
      noFollow: false,
    },
  },
  {
    title: 'Rocks, Minerals & Fossils',
    slug: 'rocks-minerals-fossils',
    icon: 'landscape',
    description:
      'Museum-quality mineral specimens, meteorites, gemstone crystals, fossilised dinosaur bones, amber inclusions, and certified natural history specimens for serious collectors.',
    seo: {
      metaTitle: 'Rocks, Minerals & Fossils | Elite Collectibles — ViaFinds',
      metaDescription:
        'Shop museum-quality minerals, meteorites, dinosaur fossils, and gemstone specimens. Natural history collectibles from the Tucson Gem Show circuit and beyond.',
      noIndex: false,
      noFollow: false,
    },
  },
  {
    title: 'Vintage Advertising & Paper Ephemera',
    slug: 'vintage-advertising-paper-ephemera',
    icon: 'newspaper',
    description:
      'Original vintage posters, tin signs, trade cards, postcards, cigarette cards, matchbooks, menus, broadsides, and printed advertising art from the 19th and 20th centuries.',
    seo: {
      metaTitle: 'Vintage Advertising & Paper Ephemera | Elite Collectibles — ViaFinds',
      metaDescription:
        'Discover original vintage posters, tin signs, trade cards, and printed advertising art from the 19th and 20th centuries — affordable entry-point collectibles with rich history.',
      noIndex: false,
      noFollow: false,
    },
  },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────
function buildDoc({ title, slug, description, seo, icon, parentRef }) {
  const doc = {
    _type: 'category',
    _id: `cat-${randomUUID()}`,
    title,
    slug: { _type: 'slug', current: slug },
    description,
    featured: false,
    seo: { _type: 'seo', ...seo },
  }
  if (icon) doc.icon = icon
  if (parentRef) doc.parentCategory = { _type: 'reference', _ref: parentRef }
  return doc
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n  Starting Elite Collectibles L1 + L2 population...\n')

  // 1. Fetch existing slugs so we can skip already-created docs
  const existing = await client.fetch(
    `*[_type == "category"]{ _id, "slug": slug.current }`
  )
  const existingBySlug = new Map(existing.map((d) => [d.slug, d._id]))

  console.log(`  Found ${existing.length} existing category documents in Sanity.\n`)

  let created = 0
  let skipped = 0

  // 2. Create or resolve Level 1 root
  let rootId = existingBySlug.get(ROOT.slug)
  if (rootId) {
    console.log(`  SKIP  [L1] ${ROOT.title} (already exists: ${rootId})`)
    skipped++
  } else {
    const rootDoc = buildDoc(ROOT)
    rootId = rootDoc._id
    await client.createIfNotExists(rootDoc)
    console.log(`  CREATE [L1] ${ROOT.title} -> ${rootId}`)
    created++
  }

  // 3. Create all Level 2 categories
  console.log('\n  Processing Level 2 categories...')
  console.log('  ------------------------------------------------------')
  for (const cat of L2_CATEGORIES) {
    const existingId = existingBySlug.get(cat.slug)
    if (existingId) {
      console.log(`  SKIP  [L2] ${cat.title} (already exists: ${existingId})`)
      skipped++
    } else {
      const doc = buildDoc({ ...cat, parentRef: rootId })
      await client.createIfNotExists(doc)
      console.log(`  CREATE [L2] ${cat.title} -> ${doc._id}`)
      created++
    }
  }

  // 4. Summary
  console.log('\n  ======================================================')
  console.log('            POPULATION COMPLETE')
  console.log('  ======================================================')
  console.log(`  Created : ${created} documents`)
  console.log(`  Skipped : ${skipped} (already existed)`)
  console.log(`  Total   : ${created + skipped} documents processed`)
  console.log('\n  Done! Open Sanity Studio -> Categories to verify.\n')
}

main().catch((err) => {
  console.error('\n  Fatal error:', err.message)
  process.exit(1)
})
