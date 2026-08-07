// ─────────────────────────────────────────────────────────────────────────────
// ViaFinds GROQ Queries — Unified, production-ready
// All queries use the new schema field names while maintaining backwards
// compatibility with existing Sanity content.
// ─────────────────────────────────────────────────────────────────────────────

// ── Reusable Fragments ────────────────────────────────────────────────────────

const CATEGORY_BREADCRUMB_FRAGMENT = `
  _id, name, "slug": slug.current,
  parentCategory->{
    _id, name, "slug": slug.current,
    parentCategory->{
      _id, name, "slug": slug.current,
      parentCategory->{
        _id, name, "slug": slug.current,
        parentCategory->{
          _id, name, "slug": slug.current
        }
      }
    }
  }
`

const PRODUCT_CARD_FRAGMENT = `
  _id, title, "slug": slug.current,
  price, salePrice, discount, currency, rating, availability,
  status, featured, editorChoice, trending, bestSeller, newest, limitedEdition,
  "image": gallery[0],
  brand->{ _id, "name": coalesce(title, name), "slug": slug.current },
  category->{ _id, name, "slug": slug.current }
`

const ARTICLE_CARD_FRAGMENT = `
  _id, title, "slug": slug.current,
  excerpt, coverImage, publishedAt, readingTime, featured, trending,
  category->{ _id, name, "slug": slug.current },
  author->{ _id, name, "slug": slug.current, avatar, role }
`

const SEO_FRAGMENT = `
  seo { metaTitle, metaDescription, canonicalUrl, ogImage, noIndex, noFollow },
  seoTitle, seoDescription
`

// ── Site Settings ─────────────────────────────────────────────────────────────

export const SITE_SETTINGS_QUERY = `
  *[_type == "siteSettings"][0] {
    _id, siteName, tagline, logo, favicon,
    announcementBar,
    heroHeadline, heroSubheadline, heroImage, heroQuickLinks,
    socialLinks, contactEmail, defaultSeo, popularSearches
  }
`

// ── Navigation ────────────────────────────────────────────────────────────────

export const NAVIGATION_QUERY = `
  *[_type == "navigation"][0] {
    _id, title,
    mainMenu[] {
      label, href, openInNewTab, icon, badge,
      megaMenu[] {
        columnTitle,
        links[] { label, href, openInNewTab, icon, badge }
      }
    },
    mobileMenu[] {
      label, href, openInNewTab, icon, badge,
      children[] { label, href, openInNewTab, icon, badge }
    },
    footerColumns[] {
      heading,
      links[] { label, href, openInNewTab, icon, badge }
    },
    legalLinks[] { label, href, openInNewTab }
  }
`

// ── Categories ────────────────────────────────────────────────────────────────

export const ALL_CATEGORIES_QUERY = `
  *[_type == "category" && (active == true || status == "active" || !defined(status))] | order(displayOrder asc) {
    _id, name, "slug": slug.current, icon, coverImage, bannerImage,
    "parentRef": parentCategory->_id,
    "parentSlug": parentCategory->slug.current,
    description, thumbnail, featured, status, visibility, displayOrder
  }
`

export const FEATURED_CATEGORIES_QUERY = `
  *[_type == "category" && featured == true && (active == true || status == "active" || !defined(status)) && !defined(parentCategory)] | order(displayOrder asc) [0...8] {
    _id, name, "slug": slug.current, description, icon, thumbnail, banner, coverImage, bannerImage,
    "productCount": count(*[_type == "product" && references(^._id) && status == "published"])
  }
`

export const CATEGORY_BY_SLUG_QUERY = `
  *[_type == "category" && slug.current == $slug][0] {
    _id, name, "slug": slug.current, description, banner, thumbnail, icon, coverImage, bannerImage,
    displayOrder, status, active, visibility,
    ${SEO_FRAGMENT},
    parentCategory->{ ${CATEGORY_BREADCRUMB_FRAGMENT} },
    "subcategories": *[_type == "category" && parentCategory._ref == ^._id] | order(displayOrder asc) {
      _id, name, "slug": slug.current, description, thumbnail, icon, coverImage, bannerImage,
      "productCount": count(*[_type == "product" && references(^._id) && status == "published"])
    },
    "productCount": count(*[_type == "product" && references(^._id) && status == "published"])
  }
`

// ── Products ──────────────────────────────────────────────────────────────────

export const PRODUCT_BY_SLUG_QUERY = `
  *[_type == "product" && slug.current == $slug && status == "published"][0] {
    _id, title, "slug": slug.current,
    shortDescription, description,
    price, salePrice, discount, currency, availability, rating,
    featured, editorChoice, trending, bestSeller, newest, limitedEdition, publishedAt,
    status,
    gallery,
    specifications,
    affiliateNetwork, affiliateUrl,
    brand->{ _id, "name": coalesce(title, name), "slug": slug.current, logo, description, websiteUrl, country },
    manufacturer->{ _id, name, "slug": slug.current, country, logo, website },
    category->{ ${CATEGORY_BREADCRUMB_FRAGMENT} },
    collections[]->{ _id, title, "slug": slug.current },
    affiliateLinks[]->{ _id, title, merchant, url, price },
    relatedProducts[]->{ ${PRODUCT_CARD_FRAGMENT} },
    ${SEO_FRAGMENT}
  }
`

export const PRODUCTS_BY_CATEGORY_QUERY = `
  *[_type == "product" && status == "published" && (
    category._ref == $categoryId ||
    category->parentCategory._ref == $categoryId ||
    category->parentCategory->parentCategory._ref == $categoryId ||
    category->parentCategory->parentCategory->parentCategory._ref == $categoryId ||
    category->parentCategory->parentCategory->parentCategory->parentCategory._ref == $categoryId
  )] | order(coalesce(publishedAt, _createdAt) desc) [$from...$to] {
    ${PRODUCT_CARD_FRAGMENT}
  }
`

export const PRODUCTS_COUNT_BY_CATEGORY_QUERY = `
  count(*[_type == "product" && status == "published" && (
    category._ref == $categoryId ||
    category->parentCategory._ref == $categoryId ||
    category->parentCategory->parentCategory._ref == $categoryId ||
    category->parentCategory->parentCategory->parentCategory._ref == $categoryId ||
    category->parentCategory->parentCategory->parentCategory->parentCategory._ref == $categoryId
  )])
`

export const TRENDING_PRODUCTS_QUERY = `
  *[_type == "product" && trending == true && status == "published"] | order(publishedAt desc) [0...$limit] {
    ${PRODUCT_CARD_FRAGMENT}
  }
`

export const EDITOR_PICKS_QUERY = `
  *[_type == "product" && editorChoice == true && status == "published"] | order(publishedAt desc) [0...$limit] {
    ${PRODUCT_CARD_FRAGMENT}
  }
`

export const FEATURED_PRODUCTS_QUERY = `
  *[_type == "product" && featured == true && status == "published"] | order(publishedAt desc) [0...$limit] {
    ${PRODUCT_CARD_FRAGMENT}
  }
`

// ── Articles ──────────────────────────────────────────────────────────────────

export const ARTICLE_BY_SLUG_QUERY = `
  *[_type == "article" && slug.current == $slug][0] {
    _id, title, "slug": slug.current,
    excerpt, content, publishedAt, readingTime, featured, trending,
    coverImage, gallery,
    author->{ _id, name, "slug": slug.current, avatar, role, bio, socialLinks },
    category->{ _id, name, "slug": slug.current,
      parentCategory->{ _id, name, "slug": slug.current }
    },
    relatedProducts[]->{ ${PRODUCT_CARD_FRAGMENT} },
    relatedArticles[]->{ ${ARTICLE_CARD_FRAGMENT} },
    ${SEO_FRAGMENT}
  }
`

export const ALL_ARTICLES_QUERY = `
  *[_type == "article" && publishedAt <= now()] | order(publishedAt desc) [$from...$to] {
    ${ARTICLE_CARD_FRAGMENT}
  }
`

export const LATEST_ARTICLES_QUERY = `
  *[_type == "article" && publishedAt <= now()] | order(publishedAt desc) [0...$limit] {
    ${ARTICLE_CARD_FRAGMENT}
  }
`

export const FEATURED_ARTICLES_QUERY = `
  *[_type == "article" && featured == true && publishedAt <= now()] | order(publishedAt desc) [0...$limit] {
    ${ARTICLE_CARD_FRAGMENT}
  }
`

export const ARTICLES_BY_CATEGORY_QUERY = `
  *[_type == "article" && category._ref == $categoryId && publishedAt <= now()] | order(publishedAt desc) [$from...$to] {
    ${ARTICLE_CARD_FRAGMENT}
  }
`

// ── Homepage ──────────────────────────────────────────────────────────────────

export const HOME_PAGE_QUERY = `
  {
    "settings": *[_type == "siteSettings"][0] {
      siteName, tagline, heroHeadline, heroSubheadline, heroImage, heroQuickLinks,
      announcementBar, popularSearches
    },
    "categories": *[_type == "category" && featured == true && (active == true || status == "active" || !defined(status)) && !defined(parentCategory)] | order(displayOrder asc) [0...8] {
      _id, name, "slug": slug.current, description, icon, thumbnail, banner, coverImage, bannerImage
    },
    "trendingProducts": *[_type == "product" && trending == true && status == "published"] | order(publishedAt desc) [0...8] {
      ${PRODUCT_CARD_FRAGMENT}
    },
    "editorPicks": *[_type == "product" && editorChoice == true && status == "published"] | order(publishedAt desc) [0...4] {
      ${PRODUCT_CARD_FRAGMENT}
    },
    "featuredProducts": *[_type == "product" && featured == true && status == "published"] | order(publishedAt desc) [0...8] {
      ${PRODUCT_CARD_FRAGMENT}
    },
    "latestArticles": *[_type == "article" && publishedAt <= now()] | order(publishedAt desc) [0...4] {
      ${ARTICLE_CARD_FRAGMENT}
    }
  }
`

// ── Brands ────────────────────────────────────────────────────────────────────

export const ALL_BRANDS_QUERY = `
  *[_type == "brand"] | order(coalesce(title, name) asc) {
    _id, "name": coalesce(title, name), "slug": slug.current, logo, country, featured
  }
`

export const BRAND_BY_SLUG_QUERY = `
  *[_type == "brand" && slug.current == $slug][0] {
    _id, "name": coalesce(title, name), "slug": slug.current, logo, coverImage, description, websiteUrl, country, featured,
    ${SEO_FRAGMENT},
    "products": *[_type == "product" && brand._ref == ^._id && status == "published"] | order(publishedAt desc) [0...24] {
      ${PRODUCT_CARD_FRAGMENT}
    }
  }
`

// ── Search ────────────────────────────────────────────────────────────────────

export const SEARCH_QUERY = `
  {
    "products": *[_type == "product" && status == "published" && (
      title match $keyword ||
      shortDescription match $keyword ||
      pt::text(description) match $keyword ||
      brand->name match $keyword
    )] | order(score() desc) [0...20] {
      ${PRODUCT_CARD_FRAGMENT}
    },
    "articles": *[_type == "article" && publishedAt <= now() && (
      title match $keyword ||
      excerpt match $keyword
    )] | order(publishedAt desc) [0...10] {
      ${ARTICLE_CARD_FRAGMENT}
    },
    "brands": *[_type == "brand" && name match $keyword] [0...6] {
      _id, "name": coalesce(title, name), "slug": slug.current, logo, country
    },
    "categories": *[_type == "category" && (active == true || status == "active" || !defined(status)) && (
      name match $keyword ||
      description match $keyword
    )] [0...6] {
      _id, name, "slug": slug.current, icon, thumbnail
    },
    "tools": *[_type == "tool" && title match $keyword] | order(order asc) [0...4] {
      _id, title, "slug": slug.current, toolType, shortDescription, icon
    }
  }
`

export const AUTOCOMPLETE_QUERY = `
  {
    "products": *[_type == "product" && status == "published" && title match $keyword] | order(title asc) [0...5] {
      _id, title, "slug": slug.current, "image": gallery[0]
    },
    "articles": *[_type == "article" && publishedAt <= now() && title match $keyword] | order(title asc) [0...3] {
      _id, title, "slug": slug.current
    },
    "categories": *[_type == "category" && (active == true || status == "active" || !defined(status)) && name match $keyword] [0...3] {
      _id, name, "slug": slug.current
    }
  }
`

// ── Tools ─────────────────────────────────────────────────────────────────────

export const TOOLS_QUERY = `
  *[_type == "tool"] | order(order asc) {
    _id, title, "slug": slug.current, toolType, shortDescription, icon, route, buttonLabel, featured, order
  }
`

export const TOOL_BY_SLUG_QUERY = `
  *[_type == "tool" && slug.current == $slug][0] {
    _id, title, "slug": slug.current, toolType, description, shortDescription,
    icon, route, buttonLabel, featured,
    relatedArticles[]->{ ${ARTICLE_CARD_FRAGMENT} },
    relatedProducts[]->{ ${PRODUCT_CARD_FRAGMENT} },
    ${SEO_FRAGMENT}
  }
`

// ── Reviews ───────────────────────────────────────────────────────────────────

export const REVIEWS_BY_PRODUCT_QUERY = `
  *[_type == "review" && product._ref == $productId] | order(publishedAt desc) {
    _id, title, "slug": slug.current, reviewType, rating, verdict, pros, cons,
    author->{ _id, name, "slug": slug.current, avatar, role },
    publishedAt
  }
`

export const ALL_PRODUCTS_QUERY = `
  *[_type == "product" && status == "published"] | order(publishedAt desc, _createdAt desc) {
    _id, title, "slug": slug.current, 
    "brand": brand->{_id, "name": coalesce(title, name), "slug": slug.current},
    "category": category->{_id, name, "slug": slug.current},
    price, salePrice, discount, image, badge
  }
`

// ── Redirects ─────────────────────────────────────────────────────────────────

export const ALL_REDIRECTS_QUERY = `
  *[_type == "redirect"] {
    _id, from, to, statusCode
  }
`

// ── Sitemap ───────────────────────────────────────────────────────────────────

export const SITEMAP_PRODUCTS_QUERY = `
  *[_type == "product" && status == "published" && defined(slug.current)] | order(_updatedAt desc) {
    "slug": slug.current,
    category->{ "slug": slug.current },
    _updatedAt
  }
`

export const SITEMAP_ARTICLES_QUERY = `
  *[_type == "article" && publishedAt <= now() && defined(slug.current)] | order(publishedAt desc) {
    "slug": slug.current,
    _updatedAt
  }
`

export const SITEMAP_CATEGORIES_QUERY = `
  *[_type == "category" && defined(slug.current) && (active == true || status == "active" || !defined(status))] {
    "slug": slug.current,
    _updatedAt
  }
`

export const SITEMAP_BRANDS_QUERY = `
  *[_type == "brand" && defined(slug.current)] {
    "slug": slug.current,
    _updatedAt
  }
`

// ── Legacy aliases (backwards compatibility for any existing imports) ──────────

/** @deprecated Use PRODUCT_BY_SLUG_QUERY */
export const PRODUCT_SLUG_QUERY = PRODUCT_BY_SLUG_QUERY

/** @deprecated Use CATEGORY_BY_SLUG_QUERY */
export const CATEGORY_SLUG_QUERY = CATEGORY_BY_SLUG_QUERY

/** @deprecated Use PRODUCTS_BY_CATEGORY_QUERY with $from=0 and $to=48 */
export const PRODUCTS_BY_CATEGORY_QUERY_LEGACY = `
  *[_type == "product" && (
    category._ref == $categoryId ||
    category->parentCategory._ref == $categoryId ||
    category->parentCategory->parentCategory._ref == $categoryId ||
    category->parentCategory->parentCategory->parentCategory._ref == $categoryId ||
    category->parentCategory->parentCategory->parentCategory->parentCategory._ref == $categoryId
  ) && status == "published"] | order(title asc) {
    ${PRODUCT_CARD_FRAGMENT},
    affiliateLinks[]->{ merchant, url, price }
  }
`

/** @deprecated Use REVIEWS_BY_PRODUCT_QUERY */
export const REVIEWS_BY_PRODUCT_QUERY_LEGACY = REVIEWS_BY_PRODUCT_QUERY

/** @deprecated comparison type is now built into review schema */
export const COMPARISONS_BY_PRODUCT_QUERY = `
  *[_type == "review" && reviewType == "comparison" && $productId in [product._ref, ...comparisonProducts[]._ref]] {
    _id, title, "slug": slug.current, rating,
    comparisonProducts[]->{ _id, title, price, rating, "image": gallery[0] }
  }
`
