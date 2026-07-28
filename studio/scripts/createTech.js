import { getCliClient } from 'sanity/cli'
import { randomUUID } from 'crypto'

const client = getCliClient({ apiVersion: '2024-01-01' })

const PARENT_CATEGORY = {
  name: 'Tech',
  slug: 'tech',
  desc: 'The latest in technology, electronics, software, and digital services.',
  seoTitle: 'Technology & Electronics',
  seoDesc: 'Shop the latest technology, consumer electronics, software, and digital services from top brands.',
  displayOrder: 30 // Assuming Elite Collectibles is 10, Luxury Beauty is 20
}

const LEVEL_2_CATEGORIES = [
  { name: 'Computers & Laptops', slug: 'computers-laptops', desc: 'Desktops, gaming laptops, and high-performance workstations.', seoDesc: 'Shop high-performance computers, gaming laptops, and professional workstations.' },
  { name: 'PC Components', slug: 'pc-components', desc: 'Processors, graphics cards, motherboards, and PC building parts.', seoDesc: 'Find top-tier PC components, GPUs, CPUs, and motherboards for your next build.' },
  { name: 'Computer Accessories', slug: 'computer-accessories', desc: 'Mechanical keyboards, gaming mice, monitors, and peripherals.', seoDesc: 'Upgrade your setup with premium computer accessories, monitors, and peripherals.' },
  { name: 'Smartphones & Tablets', slug: 'smartphones-tablets', desc: 'The latest mobile devices, iOS and Android tablets.', seoDesc: 'Discover the latest smartphones, unlocked mobile devices, and high-end tablets.' },
  { name: 'Wearable Technology', slug: 'wearable-technology', desc: 'Smartwatches, fitness trackers, and VR headsets.', seoDesc: 'Shop smartwatches, fitness trackers, and the latest in wearable technology and VR.' },
  { name: 'Smart Home', slug: 'smart-home', desc: 'Home automation, security cameras, and smart lighting.', seoDesc: 'Automate your life with smart home devices, security cameras, and smart lighting.' },
  { name: 'Networking', slug: 'networking', desc: 'Routers, mesh Wi-Fi systems, and network switches.', seoDesc: 'Ensure fast, reliable internet with advanced routers, mesh Wi-Fi, and networking gear.' },
  { name: 'Audio', slug: 'audio', desc: 'Audiophile headphones, wireless earbuds, and home theater speakers.', seoDesc: 'Experience premium sound with audiophile headphones, earbuds, and home audio systems.' },
  { name: 'Cameras & Photography', slug: 'cameras-photography', desc: 'Mirrorless cameras, DSLR, lenses, and photography equipment.', seoDesc: 'Capture the moment with professional mirrorless cameras, DSLRs, and premium lenses.' },
  { name: 'Gaming', slug: 'gaming', desc: 'Gaming consoles, video games, and essential gaming accessories.', seoDesc: 'Shop the latest gaming consoles, blockbuster video games, and gaming accessories.' },
  { name: 'TVs & Home Entertainment', slug: 'tvs-home-entertainment', desc: 'OLED TVs, soundbars, and home theater systems.', seoDesc: 'Upgrade your living room with OLED TVs, premium soundbars, and home entertainment.' },
  { name: 'Office Electronics', slug: 'office-electronics', desc: 'Printers, scanners, and essential electronic office supplies.', seoDesc: 'Equip your workspace with reliable printers, scanners, and office electronics.' },
  { name: 'Storage & Memory', slug: 'storage-memory', desc: 'NVMe SSDs, external hard drives, and high-speed RAM.', seoDesc: 'Expand your capacity with high-speed SSDs, external hard drives, and memory modules.' },
  { name: 'Software', slug: 'software', desc: 'Operating systems, utility software, and enterprise solutions.', seoDesc: 'Find essential operating systems, utility programs, and enterprise software solutions.' },
  { name: 'AI Tools', slug: 'ai-tools', desc: 'Artificial intelligence software, generative AI, and automation tools.', seoDesc: 'Leverage the future with cutting-edge AI tools, generative software, and automation.' },
  { name: 'Web Hosting & Domains', slug: 'web-hosting-domains', desc: 'Cloud hosting, VPS, domain registration, and website builders.', seoDesc: 'Start your online presence with reliable web hosting, VPS, and domain registration.' },
  { name: 'Cybersecurity & VPN', slug: 'cybersecurity-vpn', desc: 'Antivirus software, secure VPN services, and privacy tools.', seoDesc: 'Protect your digital life with top-rated cybersecurity software and secure VPNs.' },
  { name: 'Productivity Tools', slug: 'productivity-tools', desc: 'Project management, communication, and office suite software.', seoDesc: 'Boost efficiency with professional productivity tools and project management software.' },
  { name: 'Creative Software', slug: 'creative-software', desc: 'Video editing, graphic design, and audio production software.', seoDesc: 'Unleash your creativity with professional video editing and graphic design software.' },
  { name: 'Developer Tools', slug: 'developer-tools', desc: 'IDEs, coding platforms, and specialized development software.', seoDesc: 'Build better software with powerful developer tools, IDEs, and coding platforms.' },
  { name: 'Cloud Services', slug: 'cloud-services', desc: 'Cloud storage, computing platforms, and SaaS solutions.', seoDesc: 'Scale your business with reliable cloud storage, computing platforms, and SaaS.' },
  { name: 'Smart Gadgets', slug: 'smart-gadgets', desc: 'Innovative tech gadgets, smart lifestyle accessories, and novelties.', seoDesc: 'Discover innovative smart gadgets, unique tech gifts, and lifestyle accessories.' },
  { name: 'Tech Accessories', slug: 'tech-accessories', desc: 'Cables, chargers, power banks, and everyday tech essentials.', seoDesc: 'Stock up on essential tech accessories, fast chargers, cables, and power banks.' },
  { name: 'Digital Services', slug: 'digital-services', desc: 'Online subscriptions, streaming services, and digital platforms.', seoDesc: 'Subscribe to premium digital services, streaming platforms, and online memberships.' },
]

async function main() {
  console.log('\n  Creating "Tech" Taxonomy...\n')
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
        metaTitle: `${cat.name} | Tech`,
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
  console.log('            TECH CREATION COMPLETE')
  console.log('  ======================================================')
  console.log(`  Parent categories created : 1`)
  console.log(`  Level 2 categories        : ${LEVEL_2_CATEGORIES.length}`)
  console.log('\n')
}

main().catch((err) => {
  console.error('\n  Fatal error:', err.message)
  process.exit(1)
})
