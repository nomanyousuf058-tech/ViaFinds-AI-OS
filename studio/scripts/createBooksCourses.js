import { getCliClient } from 'sanity/cli'
import { randomUUID } from 'crypto'

const client = getCliClient({ apiVersion: '2024-01-01' })

const PARENT_CATEGORY = {
  name: 'Books & Courses',
  slug: 'books-courses',
  desc: 'Bestselling books, audiobooks, and premium online courses.',
  seoTitle: 'Books, Audiobooks & Online Courses',
  seoDesc: 'Expand your knowledge with bestselling books, premium audiobooks, and professional online courses.',
  displayOrder: 50 // Assuming Elite Collectibles is 10, Luxury Beauty is 20, Tech is 30, Home is 40
}

const LEVEL_2_CATEGORIES = [
  { name: 'Business & Entrepreneurship', slug: 'business-entrepreneurship', desc: 'Books on startups, leadership, and business strategy.', seoDesc: 'Read top books on startups, leadership, and successful business strategies.' },
  { name: 'Personal Finance & Investing', slug: 'personal-finance-investing', desc: 'Guides on wealth building, stock market, and real estate.', seoDesc: 'Master your money with top personal finance, investing, and real estate books.' },
  { name: 'Technology & Programming', slug: 'technology-programming', desc: 'Coding bootcamps, software engineering books, and tech guides.', seoDesc: 'Learn to code with the best technology books and programming courses.' },
  { name: 'Artificial Intelligence', slug: 'artificial-intelligence', desc: 'Machine learning resources, AI guides, and generative tech.', seoDesc: 'Stay ahead with the latest books and courses on Artificial Intelligence and ML.' },
  { name: 'Marketing & Sales', slug: 'marketing-sales', desc: 'Digital marketing courses, sales tactics, and brand strategy.', seoDesc: 'Boost your skills with premium marketing courses and sales strategy books.' },
  { name: 'Design & Creativity', slug: 'design-creativity', desc: 'Graphic design books, UX/UI courses, and creative skills.', seoDesc: 'Unlock your creativity with graphic design books and professional UX/UI courses.' },
  { name: 'Health & Wellness', slug: 'health-wellness', desc: 'Nutrition guides, fitness plans, and mental health resources.', seoDesc: 'Improve your life with top health, wellness, and fitness books and courses.' },
  { name: 'Self-Improvement', slug: 'self-improvement', desc: 'Productivity hacks, motivation, and personal growth books.', seoDesc: 'Achieve your goals with the best self-improvement and personal growth books.' },
  { name: 'Education', slug: 'education', desc: 'Academic textbooks, teaching resources, and study guides.', seoDesc: 'Find academic textbooks, teaching resources, and comprehensive study guides.' },
  { name: 'Career Development', slug: 'career-development', desc: 'Resume guides, interview prep, and professional growth.', seoDesc: 'Advance your career with resume guides, interview prep, and professional courses.' },
  { name: 'Language Learning', slug: 'language-learning', desc: 'Language apps, audio courses, and vocabulary workbooks.', seoDesc: 'Master a new language with top-rated language learning books and audio courses.' },
  { name: 'Science & Mathematics', slug: 'science-mathematics', desc: 'Popular science books, math textbooks, and scientific journals.', seoDesc: 'Explore the universe with popular science books and mathematics textbooks.' },
  { name: 'History', slug: 'history', desc: 'Biographies, historical accounts, and world history books.', seoDesc: 'Dive into the past with captivating historical accounts and biographies.' },
  { name: 'Politics & Current Affairs', slug: 'politics-current-affairs', desc: 'Political science books, global affairs, and social issues.', seoDesc: 'Stay informed with the latest books on politics, current affairs, and global issues.' },
  { name: 'Religion & Spirituality', slug: 'religion-spirituality', desc: 'Theological texts, spiritual guides, and meditation books.', seoDesc: 'Discover inner peace with top books on religion, spirituality, and meditation.' },
  { name: 'Arts & Photography', slug: 'arts-photography', desc: 'Art history, photography guides, and artist monographs.', seoDesc: 'Explore beautiful arts and photography books, artist monographs, and guides.' },
  { name: 'Cooking & Food', slug: 'cooking-food', desc: 'Gourmet cookbooks, culinary courses, and wine guides.', seoDesc: 'Cook like a chef with gourmet cookbooks, culinary courses, and wine guides.' },
  // Note: 'home-living' already exists as a parent category, using 'home-living-books' for unique slug
  { name: 'Home & Living', slug: 'home-living-books', desc: 'Interior design books, gardening guides, and DIY manuals.', seoDesc: 'Get inspired with interior design books, gardening guides, and DIY manuals.' },
  { name: 'Travel', slug: 'travel', desc: 'Travel guides, adventure memoirs, and language phrasebooks.', seoDesc: 'Plan your next adventure with comprehensive travel guides and phrasebooks.' },
  { name: 'Fiction', slug: 'fiction', desc: 'Bestselling novels, sci-fi, fantasy, and classic literature.', seoDesc: 'Escape into bestselling fiction novels, sci-fi, fantasy, and classic literature.' },
  { name: 'Children\'s Books', slug: 'childrens-books', desc: 'Picture books, early readers, and middle-grade fiction.', seoDesc: 'Spark imagination with the best children\'s picture books and early readers.' },
  { name: 'Audiobooks', slug: 'audiobooks', desc: 'Top narrated audiobooks across all genres and topics.', seoDesc: 'Listen on the go with top narrated audiobooks across fiction and non-fiction.' },
  { name: 'Online Courses', slug: 'online-courses', desc: 'Video lessons, masterclasses, and e-learning platforms.', seoDesc: 'Learn new skills with premium online courses, masterclasses, and video lessons.' },
  { name: 'Professional Certifications', slug: 'professional-certifications', desc: 'Exam prep, IT certifications, and professional credentials.', seoDesc: 'Pass your exams with study guides and courses for professional certifications.' },
  { name: 'Educational Resources', slug: 'educational-resources', desc: 'Learning tools, software, and supplemental education materials.', seoDesc: 'Find essential learning tools, software, and supplemental educational resources.' },
]

async function main() {
  console.log('\n  Creating "Books & Courses" Taxonomy...\n')
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
        metaTitle: `${cat.name} | Books & Courses`,
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
  console.log('            BOOKS & COURSES CREATION COMPLETE')
  console.log('  ======================================================')
  console.log(`  Parent categories created : 1`)
  console.log(`  Level 2 categories        : ${LEVEL_2_CATEGORIES.length}`)
  console.log('\n')
}

main().catch((err) => {
  console.error('\n  Fatal error:', err.message)
  process.exit(1)
})
