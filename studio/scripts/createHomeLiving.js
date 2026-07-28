import { getCliClient } from 'sanity/cli'
import { randomUUID } from 'crypto'

const client = getCliClient({ apiVersion: '2024-01-01' })

const PARENT_CATEGORY = {
  name: 'Home & Living',
  slug: 'home-living',
  desc: 'Furniture, home décor, kitchenware, and outdoor living essentials.',
  seoTitle: 'Home & Living, Furniture & Decor',
  seoDesc: 'Shop premium furniture, home décor, kitchenware, and outdoor living essentials to elevate your space.',
  displayOrder: 40 // Assuming Elite Collectibles is 10, Luxury Beauty is 20, Tech is 30
}

const LEVEL_2_CATEGORIES = [
  { name: 'Furniture', slug: 'furniture', desc: 'Couches, dining tables, bedroom sets, and premium furnishings.', seoDesc: 'Shop premium living room couches, dining tables, and high-quality bedroom sets.' },
  { name: 'Home Décor', slug: 'home-decor', desc: 'Vases, decorative accents, throw pillows, and interior design items.', seoDesc: 'Elevate your interior design with premium home décor, vases, and decorative accents.' },
  { name: 'Lighting', slug: 'lighting', desc: 'Chandeliers, floor lamps, pendants, and ambient home lighting.', seoDesc: 'Illuminate your home with luxury chandeliers, modern floor lamps, and pendant lights.' },
  { name: 'Wall Art', slug: 'wall-art', desc: 'Canvas prints, framed photography, and modern wall decor.', seoDesc: 'Decorate your space with contemporary wall art, canvas prints, and framed photography.' },
  { name: 'Bedding & Linens', slug: 'bedding-linens', desc: 'Luxury sheets, duvet covers, comforters, and premium bedding.', seoDesc: 'Sleep in comfort with luxury sheets, premium duvet covers, and high-quality bedding.' },
  { name: 'Rugs & Floor Coverings', slug: 'rugs-floor-coverings', desc: 'Area rugs, runners, Persian carpets, and modern floor coverings.', seoDesc: 'Find the perfect area rug, Persian carpet, or modern runner for your floors.' },
  { name: 'Kitchen & Dining', slug: 'kitchen-dining', desc: 'Dinnerware, flatware, drinkware, and dining room essentials.', seoDesc: 'Entertain with premium kitchen & dining essentials, dinnerware, and elegant flatware.' },
  { name: 'Cookware & Bakeware', slug: 'cookware-bakeware', desc: 'Pots, pans, Dutch ovens, and professional baking equipment.', seoDesc: 'Cook like a pro with high-quality pots, pans, Dutch ovens, and professional bakeware.' },
  { name: 'Small Kitchen Appliances', slug: 'small-kitchen-appliances', desc: 'Espresso machines, blenders, stand mixers, and air fryers.', seoDesc: 'Upgrade your kitchen with premium espresso machines, stand mixers, and top-tier appliances.' },
  { name: 'Storage & Organization', slug: 'storage-organization', desc: 'Closet systems, storage bins, and home organization solutions.', seoDesc: 'Declutter your life with premium closet systems, storage bins, and organization tools.' },
  { name: 'Bathroom', slug: 'bathroom', desc: 'Towels, bath mats, shower curtains, and vanity accessories.', seoDesc: 'Refresh your bathroom with plush towels, stylish shower curtains, and vanity accessories.' },
  { name: 'Cleaning & Household', slug: 'cleaning-household', desc: 'Vacuums, cleaning supplies, and everyday household essentials.', seoDesc: 'Keep your home spotless with powerful vacuums and premium household cleaning supplies.' },
  { name: 'Laundry & Garment Care', slug: 'laundry-garment-care', desc: 'Irons, steamers, laundry baskets, and garment care accessories.', seoDesc: 'Care for your clothes with high-end garment steamers, irons, and laundry accessories.' },
  { name: 'Home Improvement', slug: 'home-improvement', desc: 'Hardware, fixtures, tools, and DIY home renovation supplies.', seoDesc: 'Tackle DIY projects with quality hardware, fixtures, and home improvement tools.' },
  // Note: 'smart-home' already exists in Tech, using 'smart-home-living' for unique slug
  { name: 'Smart Home', slug: 'smart-home-living', desc: 'Smart thermostats, security systems, and connected home devices.', seoDesc: 'Automate your home with smart thermostats, security systems, and connected devices.' },
  { name: 'Outdoor Living', slug: 'outdoor-living', desc: 'Outdoor rugs, patio heaters, fire pits, and exterior decor.', seoDesc: 'Enhance your backyard with premium outdoor rugs, fire pits, and exterior decor.' },
  { name: 'Garden & Landscaping', slug: 'garden-landscaping', desc: 'Planters, seeds, soil, and beautiful landscaping accessories.', seoDesc: 'Grow your oasis with quality planters, seeds, and beautiful landscaping accessories.' },
  { name: 'Gardening Tools', slug: 'gardening-tools', desc: 'Trowels, pruners, hoses, and essential gardening equipment.', seoDesc: 'Maintain your garden with durable trowels, pruners, and essential gardening equipment.' },
  { name: 'Patio Furniture', slug: 'patio-furniture', desc: 'Outdoor dining sets, lounge chairs, and weather-resistant seating.', seoDesc: 'Relax outside with premium patio dining sets, lounge chairs, and outdoor seating.' },
  { name: 'BBQ & Outdoor Cooking', slug: 'bbq-outdoor-cooking', desc: 'Gas grills, smokers, pizza ovens, and grilling accessories.', seoDesc: 'Master the grill with high-end gas grills, smokers, pizza ovens, and accessories.' },
  { name: 'Home Fragrance', slug: 'home-fragrance', desc: 'Luxury candles, essential oil diffusers, and room sprays.', seoDesc: 'Fill your home with luxury candles, essential oil diffusers, and premium room sprays.' },
  { name: 'Home Safety & Security', slug: 'home-safety-security', desc: 'Smoke detectors, safes, locks, and home security essentials.', seoDesc: 'Protect your family with reliable smoke detectors, home safes, and security locks.' },
  { name: 'Seasonal Décor', slug: 'seasonal-decor', desc: 'Holiday decorations, wreaths, and seasonal home accents.', seoDesc: 'Celebrate the holidays with beautiful seasonal décor, wreaths, and festive home accents.' },
  { name: 'Pet Supplies', slug: 'pet-supplies', desc: 'Premium dog beds, cat trees, pet food, and grooming accessories.', seoDesc: 'Pamper your pets with premium beds, cat trees, quality food, and grooming accessories.' },
]

async function main() {
  console.log('\n  Creating "Home & Living" Taxonomy...\n')
  let transaction = client.transaction()

  // Step 1: Create the parent category
  console.log('  Step 1: Creating Parent Category...')
  const parentId = `cat-${randomUUID()}`
  const parentDoc = {
    _type: 'category',
    _id: parentId,
    name: PARENT_CATEGORY.name,
    slug: { _type: 'slug', current: PARENT_CATEGORY.slug },
    description: PARENT_CATEGORY.desc,
    featured: true, // Make root categories featured by default
    status: 'active',
    displayOrder: PARENT_CATEGORY.displayOrder,
    visibility: 'public',
    seo: {
      metaTitle: PARENT_CATEGORY.seoTitle,
      metaDescription: PARENT_CATEGORY.seoDesc
    }
  }
  transaction.create(parentDoc)
  console.log(`    + Created Root: ${PARENT_CATEGORY.name}`)

  // Step 2: Create Level 2 categories
  console.log('\n  Step 2: Creating Level 2 Categories...')
  let displayOrder = 10

  for (const cat of LEVEL_2_CATEGORIES) {
    const newDoc = {
      _type: 'category',
      _id: `cat-${randomUUID()}`,
      name: cat.name,
      slug: { _type: 'slug', current: cat.slug },
      description: cat.desc,
      parentCategory: { _type: 'reference', _ref: parentId },
      featured: false,
      status: 'active',
      displayOrder: displayOrder,
      visibility: 'public',
      seo: {
        metaTitle: `${cat.name} | Home & Living`,
        metaDescription: cat.seoDesc
      }
    }
    
    // Safety check for SEO title length
    if (newDoc.seo.metaTitle.length > 60) {
      newDoc.seo.metaTitle = cat.name // fallback if too long
    }

    transaction.create(newDoc)
    console.log(`    + Created L2: ${cat.name} (${cat.slug})`)
    displayOrder += 10
  }

  console.log(`\n  Committing transaction to Sanity...`)
  await transaction.commit()
  console.log('  Transaction committed successfully!\n')

  console.log('\n  ======================================================')
  console.log('            HOME & LIVING CREATION COMPLETE')
  console.log('  ======================================================')
  console.log(`  Parent categories created : 1`)
  console.log(`  Level 2 categories        : ${LEVEL_2_CATEGORIES.length}`)
  console.log('\n')
}

main().catch((err) => {
  console.error('\n  Fatal error:', err.message)
  process.exit(1)
})
