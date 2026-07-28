import React from 'react'
import { client } from '@/lib/sanity.client'
import { SEARCH_QUERY } from '@/lib/sanity.queries'
import SearchClient from './SearchClient'

import type { Product, Brand, Article, Category, Tool } from '@/lib/types'

interface SearchPageProps {
  searchParams: Promise<{
    q?: string
    favorites?: string
    featured?: string
    type?: string
  }>
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const resolvedParams = await searchParams
  const q = resolvedParams.q || ''
  const favoritesMode = resolvedParams.favorites === 'true'
  const featuredMode = resolvedParams.featured === 'true'
  const brandMode = resolvedParams.type === 'brand'

  let searchResults = {
    products: [] as Product[],
    brands: [] as Brand[],
    articles: [] as Article[],
    categories: [] as Category[],
    tools: [] as Tool[],
  }

  // Fetch results based on query options
  try {
    if (featuredMode) {
      // Fetch featured products
      searchResults.products = await client.fetch(
        `*[_type == "product" && featured == true && status == "published"] | order(publishedAt desc) {
          _id, title, "slug": slug.current, price, salePrice, discount, currency, rating, availability,
          brand->{name, "slug": slug.current},
          category->{name, "slug": slug.current},
          "image": gallery[0]
        }`
      )
    } else if (brandMode) {
      // Fetch all brands
      searchResults.brands = await client.fetch(
        `*[_type == "brand"] | order(name asc) {
          _id, name, "slug": slug.current, logo, description, websiteUrl, country
        }`
      )
    } else if (q) {
      // Text query keyword search
      const keyword = `*${q}*`
      const data = await client.fetch<{
        products?: Product[]
        brands?: Brand[]
        articles?: Article[]
        categories?: Category[]
        tools?: Tool[]
      }>(SEARCH_QUERY, { keyword })
      searchResults = {
        products: data.products || [],
        brands: data.brands || [],
        articles: data.articles || [],
        categories: data.categories || [],
        tools: data.tools || [], // If tools match the search query
      }
    } else if (!favoritesMode) {
      // Browse mode: show recent items
      searchResults.products = await client.fetch(
        `*[_type == "product" && status == "published"] | order(_createdAt desc)[0...16] {
          _id, title, "slug": slug.current, price, salePrice, discount, currency, rating, availability,
          brand->{name, "slug": slug.current},
          category->{name, "slug": slug.current},
          "image": gallery[0]
        }`
      )
    }
  } catch (err) {
    console.error('Failed to execute search queries on Sanity:', err)
  }

  return (
    <SearchClient
      initialProducts={searchResults.products || []}
      initialBrands={searchResults.brands || []}
      initialArticles={searchResults.articles || []}
      initialCategories={searchResults.categories || []}
      query={q}
      favoritesMode={favoritesMode}
      featuredMode={featuredMode}
      brandMode={brandMode}
    />
  )
}
export const revalidate = 60 // ISR: Revalidate search results page every 60 seconds
