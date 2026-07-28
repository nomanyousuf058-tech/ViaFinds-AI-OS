import { getCliClient } from 'sanity/cli'
import { randomUUID } from 'crypto'

const client = getCliClient({ apiVersion: '2024-01-01' })

const PARENT_CATEGORY = {
  name: 'Luxury Beauty',
  slug: 'luxury-beauty',
  desc: 'Premium skincare, designer fragrances, and luxury beauty products.',
  seoTitle: 'Luxury Beauty & Premium Cosmetics',
  seoDesc: 'Shop high-end luxury beauty products including designer fragrances, premium skincare, and top-tier cosmetics.',
  displayOrder: 20 // Assuming Elite Collectibles is 10, or this comes after
}

const LEVEL_2_CATEGORIES = [
  { name: 'Luxury Fragrances', slug: 'luxury-fragrances', desc: 'Designer perfumes, niche fragrances, and luxury colognes.', seoDesc: 'Discover high-end designer perfumes, exclusive niche fragrances, and luxury colognes.' },
  { name: 'Skincare', slug: 'skincare', desc: 'Premium anti-aging serums, moisturizers, and luxury skincare routines.', seoDesc: 'Shop premium skincare, anti-aging serums, and luxury moisturizers from top brands.' },
  { name: 'Makeup', slug: 'makeup', desc: 'High-end cosmetics, designer lipsticks, and professional makeup.', seoDesc: 'Find luxury makeup, designer lipsticks, and high-end cosmetics for a flawless look.' },
  { name: 'Hair Care', slug: 'hair-care', desc: 'Professional salon hair care, luxury shampoos, and styling products.', seoDesc: 'Buy professional hair care products, luxury shampoos, and premium styling treatments.' },
  { name: 'Beauty Tools & Devices', slug: 'beauty-tools-devices', desc: 'High-tech skincare devices, premium brushes, and styling tools.', seoDesc: 'Invest in high-tech beauty devices, premium makeup brushes, and professional styling tools.' },
  { name: 'Bath & Body', slug: 'bath-body', desc: 'Luxury body washes, rich body butters, and premium bath oils.', seoDesc: 'Pamper yourself with luxury body washes, premium bath oils, and rich body moisturizers.' },
  { name: 'K-Beauty', slug: 'k-beauty', desc: 'Premium Korean skincare, essence, and innovative K-Beauty makeup.', seoDesc: 'Shop authentic premium K-Beauty, Korean skincare innovations, and high-quality cosmetics.' },
  { name: 'Clean Beauty', slug: 'clean-beauty', desc: 'Non-toxic, safe, and highly effective premium clean beauty products.', seoDesc: 'Discover top-tier clean beauty products made with safe, non-toxic, and effective ingredients.' },
  { name: 'Organic & Natural Beauty', slug: 'organic-natural-beauty', desc: 'Luxury organic skincare and 100% natural cosmetic formulations.', seoDesc: 'Buy luxury organic skincare and natural beauty products crafted from pure ingredients.' },
  { name: "Men's Grooming", slug: 'mens-grooming', desc: 'High-end shaving kits, luxury beard care, and premium skincare for men.', seoDesc: 'Shop luxury men\'s grooming products, high-end shaving kits, and premium beard care.' },
  { name: 'Nail Care', slug: 'nail-care', desc: 'Designer nail polishes, strengthening treatments, and manicure tools.', seoDesc: 'Find designer nail polishes, premium nail treatments, and professional manicure sets.' },
  { name: 'Beauty Gift Sets', slug: 'beauty-gift-sets', desc: 'Curated luxury beauty collections and premium skincare sets.', seoDesc: 'Gift the best with curated luxury beauty collections and premium skincare gift sets.' },
  { name: 'Spa & Wellness', slug: 'spa-wellness', desc: 'Aromatherapy, wellness supplements, and luxury spa-at-home products.', seoDesc: 'Relax with luxury spa products, premium aromatherapy, and high-end wellness supplements.' },
  { name: 'Professional Beauty', slug: 'professional-beauty', desc: 'Salon-grade treatments, professional peels, and esthetician supplies.', seoDesc: 'Shop salon-grade beauty treatments, professional peels, and high-quality esthetician supplies.' },
  { name: 'Beauty Accessories', slug: 'beauty-accessories', desc: 'Luxury makeup bags, premium mirrors, and essential beauty organizers.', seoDesc: 'Organize in style with luxury makeup bags, premium mirrors, and high-end beauty accessories.' },
]

async function main() {
  console.log('\n  Creating "Luxury Beauty" Taxonomy...\n')
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
        metaTitle: `${cat.name} | Luxury Beauty`,
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
  console.log('            LUXURY BEAUTY CREATION COMPLETE')
  console.log('  ======================================================')
  console.log(`  Parent categories created : 1`)
  console.log(`  Level 2 categories        : ${LEVEL_2_CATEGORIES.length}`)
  console.log('\n')
}

main().catch((err) => {
  console.error('\n  Fatal error:', err.message)
  process.exit(1)
})
