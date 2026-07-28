// patchEliteCollectiblesL2.js
// Patches all 21 Elite Collectibles category documents to add:
//   - featured (boolean)
//   - status  ('active')
//   - displayOrder (number — demand-ranked)
//   - visibility ('public')
//   - SEO metaTitle (≤60 chars) and metaDescription (≤160 chars)
//
// Run from the /studio directory:
//   npx sanity exec scripts/patchEliteCollectiblesL2.js --with-user-token

import { getCliClient } from 'sanity/cli'

const client = getCliClient({ apiVersion: '2024-01-01' })

// ─── Patch Data ───────────────────────────────────────────────────────────────
// Keys = slug.current. Every metaTitle ≤60 chars, every metaDescription ≤160 chars.
const PATCHES = {
  'elite-collectibles': {
    featured: true,
    status: 'active',
    displayOrder: 0,
    visibility: 'public',
    seo: {
      _type: 'seo',
      metaTitle: 'Elite Collectibles | ViaFinds',                        // 30
      metaDescription:
        'Explore the finest collectibles — trading cards, rare coins, fine art, sports memorabilia, luxury watches, and more for serious collectors.',  // 143
      noIndex: false,
      noFollow: false,
    },
  },

  'trading-cards': {
    featured: true,
    status: 'active',
    displayOrder: 10,
    visibility: 'public',
    seo: {
      _type: 'seo',
      metaTitle: 'Trading Cards | ViaFinds',                              // 26
      metaDescription:
        'Shop and compare trading cards — vintage sports cards, Pokemon TCG, graded PSA and BGS slabs. Find the best deals on collectible cards.',  // 140
      noIndex: false,
      noFollow: false,
    },
  },

  'coins-currency': {
    featured: false,
    status: 'active',
    displayOrder: 20,
    visibility: 'public',
    seo: {
      _type: 'seo',
      metaTitle: 'Coins & Currency | ViaFinds',                           // 29
      metaDescription:
        'Discover rare coins, world currency, bullion, and certified numismatic pieces. From ancient Roman coins to modern PCGS-graded slabs.',  // 136
      noIndex: false,
      noFollow: false,
    },
  },

  'sports-memorabilia-autographs': {
    featured: true,
    status: 'active',
    displayOrder: 30,
    visibility: 'public',
    seo: {
      _type: 'seo',
      metaTitle: 'Sports Memorabilia & Autographs | ViaFinds',            // 44
      metaDescription:
        'Browse authenticated sports memorabilia and autographs — game-worn jerseys, signed equipment, and PSA/JSA certified pieces.',  // 127
      noIndex: false,
      noFollow: false,
    },
  },

  'action-figures-statues': {
    featured: false,
    status: 'active',
    displayOrder: 40,
    visibility: 'public',
    seo: {
      _type: 'seo',
      metaTitle: 'Action Figures & Statues | ViaFinds',                   // 39
      metaDescription:
        'Find premium action figures and collectible statues from Hot Toys, Sideshow, NECA. Marvel, Star Wars, anime, and limited editions.',  // 137
      noIndex: false,
      noFollow: false,
    },
  },

  'comic-books-graphic-novels': {
    featured: true,
    status: 'active',
    displayOrder: 50,
    visibility: 'public',
    seo: {
      _type: 'seo',
      metaTitle: 'Comic Books & Graphic Novels | ViaFinds',               // 41
      metaDescription:
        'Explore collectible comics from Golden Age to Modern — key issues, first appearances, and CGC-graded slabs across Marvel, DC, and more.',  // 140
      noIndex: false,
      noFollow: false,
    },
  },

  'vintage-toys-diecast-models': {
    featured: false,
    status: 'active',
    displayOrder: 60,
    visibility: 'public',
    seo: {
      _type: 'seo',
      metaTitle: 'Vintage Toys & Diecast Models | ViaFinds',              // 42
      metaDescription:
        'Shop vintage toys, tin toys, diecast cars, model kits, and classic LEGO sets. AFA-graded and MOC examples from the golden age of collecting.',  // 149
      noIndex: false,
      noFollow: false,
    },
  },

  'fine-art-limited-edition-prints': {
    featured: false,
    status: 'active',
    displayOrder: 70,
    visibility: 'public',
    seo: {
      _type: 'seo',
      metaTitle: 'Fine Art & Limited Edition Prints | ViaFinds',          // 44
      metaDescription:
        'Collect fine art and limited-edition prints — original paintings, sculptures, photography, and signed artist prints with provenance.',  // 138
      noIndex: false,
      noFollow: false,
    },
  },

  'antiques-decorative-arts': {
    featured: false,
    status: 'active',
    displayOrder: 80,
    visibility: 'public',
    seo: {
      _type: 'seo',
      metaTitle: 'Antiques & Decorative Arts | ViaFinds',                 // 39
      metaDescription:
        'Discover antiques and decorative arts — furniture, ceramics, silverware, clocks, and historical objects with authenticated provenance.',  // 139
      noIndex: false,
      noFollow: false,
    },
  },

  'luxury-watches-timepieces': {
    featured: true,
    status: 'active',
    displayOrder: 90,
    visibility: 'public',
    seo: {
      _type: 'seo',
      metaTitle: 'Luxury Watches & Timepieces | ViaFinds',                // 40
      metaDescription:
        'Browse luxury and vintage watches — Rolex, Patek Philippe, Omega, and more. Authenticated pre-owned timepieces with collector provenance.',  // 147
      noIndex: false,
      noFollow: false,
    },
  },

  'movie-tv-entertainment-memorabilia': {
    featured: false,
    status: 'active',
    displayOrder: 100,
    visibility: 'public',
    seo: {
      _type: 'seo',
      metaTitle: 'Movie & TV Memorabilia | ViaFinds',                     // 35
      metaDescription:
        "Find authentic movie and TV memorabilia — screen-used props, costumes, signed scripts, and production art from Hollywood's iconic films.",  // 143
      noIndex: false,
      noFollow: false,
    },
  },

  'stamps-philately': {
    featured: false,
    status: 'active',
    displayOrder: 110,
    visibility: 'public',
    seo: {
      _type: 'seo',
      metaTitle: 'Stamps & Philately | ViaFinds',                         // 31
      metaDescription:
        'Explore rare stamps and philatelic collectibles — first-day covers, postal history, error stamps, and certified material from global dealers.',  // 149
      noIndex: false,
      noFollow: false,
    },
  },

  'video-games-gaming-collectibles': {
    featured: false,
    status: 'active',
    displayOrder: 120,
    visibility: 'public',
    seo: {
      _type: 'seo',
      metaTitle: 'Video Games & Gaming Collectibles | ViaFinds',          // 46
      metaDescription:
        'Shop sealed retro video games, graded titles (WATA, VGA), limited consoles, and gaming memorabilia. The fastest-growing collectibles niche.',  // 149
      noIndex: false,
      noFollow: false,
    },
  },

  'vinyl-records-music-memorabilia': {
    featured: false,
    status: 'active',
    displayOrder: 130,
    visibility: 'public',
    seo: {
      _type: 'seo',
      metaTitle: 'Vinyl Records & Music Memorabilia | ViaFinds',          // 46
      metaDescription:
        'Collect first-press vinyl, signed albums, concert posters, and rare music memorabilia spanning rock, jazz, hip-hop, and every major era.',  // 143
      noIndex: false,
      noFollow: false,
    },
  },

  'sneakers-streetwear': {
    featured: false,
    status: 'active',
    displayOrder: 140,
    visibility: 'public',
    seo: {
      _type: 'seo',
      metaTitle: 'Sneakers & Streetwear | ViaFinds',                      // 34
      metaDescription:
        'Find deadstock sneakers and rare streetwear — limited Jordan, Nike, Adidas, and Supreme drops, fully authenticated with provenance.',  // 136
      noIndex: false,
      noFollow: false,
    },
  },

  'rare-books-manuscripts': {
    featured: false,
    status: 'active',
    displayOrder: 150,
    visibility: 'public',
    seo: {
      _type: 'seo',
      metaTitle: 'Rare Books & Manuscripts | ViaFinds',                   // 37
      metaDescription:
        'Discover rare books, first editions, signed copies, illuminated manuscripts, and antiquarian volumes from specialist bibliographic dealers.',  // 147
      noIndex: false,
      noFollow: false,
    },
  },

  'militaria-historical-artifacts': {
    featured: false,
    status: 'active',
    displayOrder: 160,
    visibility: 'public',
    seo: {
      _type: 'seo',
      metaTitle: 'Militaria & Historical Artifacts | ViaFinds',           // 43
      metaDescription:
        'Browse authenticated militaria — WWII medals, antique edged weapons, uniforms, and rare historical documents from specialist dealers.',  // 139
      noIndex: false,
      noFollow: false,
    },
  },

  'jewelry-gemstones': {
    featured: false,
    status: 'active',
    displayOrder: 170,
    visibility: 'public',
    seo: {
      _type: 'seo',
      metaTitle: 'Jewelry & Gemstones | ViaFinds',                        // 32
      metaDescription:
        'Explore estate jewelry and certified gemstones — Art Deco, Victorian, signed designer pieces, and GIA-certified diamonds and coloured stones.',  // 150
      noIndex: false,
      noFollow: false,
    },
  },

  'wine-spirits-cigars': {
    featured: false,
    status: 'active',
    displayOrder: 180,
    visibility: 'public',
    seo: {
      _type: 'seo',
      metaTitle: 'Wine, Spirits & Cigars | ViaFinds',                     // 36
      metaDescription:
        'Invest in fine wine, rare whisky, aged cognac, and vintage cigars. Provenance-backed bottles from specialist auction houses worldwide.',  // 142
      noIndex: false,
      noFollow: false,
    },
  },

  'rocks-minerals-fossils': {
    featured: false,
    status: 'active',
    displayOrder: 190,
    visibility: 'public',
    seo: {
      _type: 'seo',
      metaTitle: 'Rocks, Minerals & Fossils | ViaFinds',                  // 38
      metaDescription:
        'Shop museum-quality minerals, meteorites, dinosaur fossils, and gemstone specimens. Natural history collectibles from specialist dealers.',  // 147
      noIndex: false,
      noFollow: false,
    },
  },

  'vintage-advertising-paper-ephemera': {
    featured: false,
    status: 'active',
    displayOrder: 200,
    visibility: 'public',
    seo: {
      _type: 'seo',
      metaTitle: 'Vintage Advertising & Ephemera | ViaFinds',             // 43
      metaDescription:
        'Discover original vintage posters, tin signs, trade cards, and printed advertising art from the 19th and 20th centuries. Affordable collectibles.',  // 155
      noIndex: false,
      noFollow: false,
    },
  },
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n  Starting Elite Collectibles L2 patch...\n')

  // 1. Fetch all category docs under Elite Collectibles
  const docs = await client.fetch(
    `*[_type == "category"]{ _id, title, "slug": slug.current }`
  )

  console.log(`  Found ${docs.length} category documents in Sanity.\n`)

  let patched = 0
  let skipped = 0
  const errors = []

  for (const doc of docs) {
    const patchData = PATCHES[doc.slug]
    if (!patchData) {
      console.log(`  SKIP  ${doc.title} (slug "${doc.slug}" — not in patch set)`)
      skipped++
      continue
    }

    try {
      await client
        .patch(doc._id)
        .set({
          featured: patchData.featured,
          status: patchData.status,
          displayOrder: patchData.displayOrder,
          visibility: patchData.visibility,
          seo: patchData.seo,
        })
        .commit()

      console.log(
        `  PATCH ✓ ${doc.title}  →  status=${patchData.status}, order=${patchData.displayOrder}, vis=${patchData.visibility}, featured=${patchData.featured}`
      )
      patched++
    } catch (err) {
      console.error(`  ERROR ✗ ${doc.title}: ${err.message}`)
      errors.push(doc.title)
    }
  }

  // Summary
  console.log('\n  ======================================================')
  console.log('            PATCH COMPLETE')
  console.log('  ======================================================')
  console.log(`  Patched : ${patched} documents`)
  console.log(`  Skipped : ${skipped} (not in patch set)`)
  if (errors.length) {
    console.log(`  Errors  : ${errors.length} → ${errors.join(', ')}`)
  }
  console.log(`  Total   : ${docs.length} documents processed`)
  console.log('\n  Done! Open Sanity Studio → Categories to verify.\n')
}

main().catch((err) => {
  console.error('\n  Fatal error:', err.message)
  process.exit(1)
})
