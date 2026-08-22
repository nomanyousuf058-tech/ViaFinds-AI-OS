/**
 * seed.mjs — Seeds the Sanity dataset with 3 placeholder documents
 * Run: cd studio && npm install && node seed.mjs
 *
 * Requires a Sanity API token with write access.
 * Set it via environment variable: SANITY_TOKEN=<your-token>
 *
 * Get a token at: https://www.sanity.io/manage/project/e44z7hta/api#tokens
 */

import { createClient } from '@sanity/client';

const token = process.env.SANITY_TOKEN || process.env.SANITY_API_TOKEN;

if (!token) {
  console.error(
    '\n❌ Missing SANITY_TOKEN environment variable.\n' +
    'Create a write token at:\n' +
    '  https://www.sanity.io/manage/project/e44z7hta/api#tokens\n' +
    '\nThen run:\n' +
    '  set SANITY_TOKEN=<your-token> && node seed.mjs\n'
  );
  process.exit(1);
}

const client = createClient({
  projectId: 'e44z7hta',
  dataset: 'production',
  apiVersion: '2024-01-01',
  token,
  useCdn: false,
});

// --- Placeholder image URLs (royalty-free from Unsplash) ---
const PLACEHOLDER_IMAGES = {
  product: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=800&q=80',
  blog: 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=800&q=80',
};

/**
 * Upload an image URL to Sanity assets and return the asset reference.
 */
async function uploadImageFromUrl(url, filename) {
  console.log(`  📸 Uploading image: ${filename}...`);
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch image: ${url}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  const asset = await client.assets.upload('image', buffer, {
    filename,
    contentType: 'image/jpeg',
  });
  return {
    _type: 'image',
    asset: { _type: 'reference', _ref: asset._id },
  };
}

async function seed() {
  console.log('\n🌱 Seeding ViaFinds Sanity dataset...\n');

  // 1. Seed a Product
  console.log('1️⃣  Creating product...');
  const productImage = await uploadImageFromUrl(
    PLACEHOLDER_IMAGES.product,
    'seed-product-keyboard.jpg'
  );
  await client.createOrReplace({
    _id: 'seed-product-001',
    _type: 'product',
    title: 'Midnight Precision Mechanical Keyboard',
    image: productImage,
    parentCategory: 'Tech',
    subCategory: 'Workspace',
    price: 189.0,
    oldPrice: 225.0,
    span: 48,
    details:
      'The Obsidian series features custom-tuned tactile silent switches housed in a heavy basalt-grey anodized aluminum frame.',
    spec: [
      { _key: 'conn', key: 'Connection', value: 'USB-C / BT 5.0' },
      { _key: 'switch', key: 'Switch', value: 'Tactile Silent' },
      { _key: 'battery', key: 'Battery', value: '72 Hours' },
      { _key: 'material', key: 'Material', value: 'Aero-Aluminum' },
    ],
  });
  console.log('   ✅ Product created: seed-product-001\n');

  // 2. Seed a Blog Post
  console.log('2️⃣  Creating blog post...');
  const blogImage = await uploadImageFromUrl(
    PLACEHOLDER_IMAGES.blog,
    'seed-blog-workspace.jpg'
  );
  await client.createOrReplace({
    _id: 'seed-blog-001',
    _type: 'blog',
    title: 'Tactile Feedback Over Sound: The Silent Switch Revolution',
    slug: { _type: 'slug', current: 'tactile-feedback-over-sound' },
    image: blogImage,
    category: 'Workspace Layouts',
    excerpt:
      'Why the shift toward silent, custom-tuned mechanical switches is completely transforming high-performance engineering productivity environments.',
    body: [
      {
        _type: 'block',
        _key: 'intro',
        style: 'normal',
        markDefs: [],
        children: [
          {
            _type: 'span',
            _key: 'span1',
            text: 'The modern workspace demands tools that disappear into the background. Silent mechanical switches achieve exactly that — providing the tactile satisfaction of mechanical keyboards without the acoustic fatigue.',
            marks: [],
          },
        ],
      },
    ],
    publishedAt: '2024-05-14T10:00:00Z',
  });
  console.log('   ✅ Blog post created: seed-blog-001\n');

  // 3. Seed a Tool
  console.log('3️⃣  Creating tool...');
  await client.createOrReplace({
    _id: 'seed-tool-001',
    _type: 'tool',
    title: 'Minimalist Budget Planner',
    description:
      'Track asset investment metrics against core monthly expenditures dynamically.',
    icon: 'payments',
    route: '#/tools/budget-calculator',
    buttonLabel: 'Launch Calculator',
    order: 1,
  });
  console.log('   ✅ Tool created: seed-tool-001\n');

  console.log('🎉 Seeding complete! 3 documents created in the "production" dataset.');
  console.log('   Open your Sanity Studio to verify: npx sanity dev\n');
}

seed().catch((err) => {
  console.error('\n❌ Seeding failed:', err.message);
  process.exit(1);
});
