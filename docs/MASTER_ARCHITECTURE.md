# ViaFinds AI OS

Version: 1.0
Status: Planning
Author: ViaFinds

---

# Vision

ViaFinds AI OS is an AI-powered automation platform that manages the complete lifecycle of affiliate products on ViaFinds.

Its purpose is to:

- Discover products
- Understand products
- Organize products
- Generate product pages
- Generate articles
- Optimize SEO
- Manage categories
- Publish content
- Continuously improve the website

The ultimate goal is to reduce manual work while maintaining premium-quality content and a scalable website architecture.

---
# Core Principles

## Principle 1 — Quality First

Every product and article must provide value to users.

The system must never publish thin, duplicated, or low-quality content.

---

## Principle 2 — AI Assists, Not Guesses

AI must use available product information to generate accurate content.

If important information is missing, the workflow should stop and request review instead of inventing facts.

---

## Principle 3 — Modular Architecture

Every AI Agent has one responsibility only.

No agent should perform multiple unrelated tasks.

---

## Principle 4 — Human Approval

Initially, every product and article will be saved as Draft.

Publishing requires manual approval.

Automatic publishing can be enabled later.

---

## Principle 5 — Taxonomy Integrity

The category structure must remain clean.

AI should:

- Reuse existing categories whenever possible.
- Never create duplicate categories.
- Suggest better category placement.
- Create new Level 3–5 categories only when justified.
- Merge duplicate categories when necessary.

---

## Principle 6 — SEO First

Every page must include:

- SEO Title
- Meta Description
- Slug
- Schema
- Internal Links
- Image Alt Text

---

## Principle 7 — Scalable Design

Every workflow should support future integrations such as:

- Affiliate APIs
- Product feeds
- Multiple AI models
- Additional affiliate networks

# Project Structure

ViaFinds AI OS follows a modular architecture.

```
ViaFinds-AI-OS/

│
├── app/                        # Next.js Website
├── components/                 # UI Components
├── studio/                     # Sanity Studio
│
├── docs/
│   ├── MASTER_ARCHITECTURE.md
│   ├── AGENTS.md
│   ├── WORKFLOWS.md
│   ├── API.md
│   └── ROADMAP.md
│
├── agents/
│   ├── product-agent/
│   ├── category-agent/
│   ├── taxonomy-agent/
│   ├── seo-agent/
│   ├── article-agent/
│   ├── publisher-agent/
│   ├── quality-agent/
│   └── analytics-agent/
│
├── workflows/
│   ├── product-import/
│   ├── product-publish/
│   ├── article-publish/
│   └── maintenance/
│
├── prompts/
│
├── docker/
│
├── logs/
│
├── backups/
│
└── scripts/
```

---

# Folder Responsibilities

## docs

Contains all system documentation.

---

## agents

Contains one folder for each AI Agent.

Each agent has a single responsibility.

---

## workflows

Contains n8n workflows.

Each workflow performs one complete business process.

---

## prompts

Contains production-ready prompts used by AI Agents.

No prompts should be hardcoded inside workflows.

---

## logs

Stores workflow logs and debugging information.

---

## backups

Stores workflow backups and configuration exports.

---

## scripts

Contains helper scripts used by the automation platform.

# AI Agent Architecture

ViaFinds AI OS uses specialized AI Agents.

Each agent has ONE responsibility.

Agents never perform another agent's job.

The output of one agent becomes the input of the next agent.

---

# Agent 1 — Product Intelligence Agent

Purpose

Understand the product.

Responsibilities

- Read product data
- Clean extracted information
- Normalize data
- Identify product type
- Identify brand
- Identify manufacturer
- Generate structured product data

Input

- Product URL (optional)
- Affiliate Link
- Merchant Name

Output

- Clean Product JSON

Cannot

- Publish
- Write Articles
- Modify Categories

---

# Agent 2 — Category Intelligence Agent

Purpose

Determine the correct location inside ViaFinds.

Responsibilities

- Find Parent Category
- Find Level 2
- Find Level 3
- Find Level 4
- Find Level 5
- Detect duplicate categories
- Suggest category improvements

If category does not exist

- Create Draft Category

If confidence is high

- Auto Create Category

If confidence is low

- Request Human Approval

Output

Category Structure

---

# Agent 3 — SEO Intelligence Agent

Purpose

Optimize discoverability.

Responsibilities

Generate

- SEO Title
- Meta Description
- URL Slug
- Schema
- Open Graph Data
- Image Alt Text

Cannot

- Publish

---

# Agent 4 — Product Content Agent

Purpose

Create premium product pages.

Responsibilities

Generate

- Product Description
- Key Features
- Specifications
- Pros
- Cons
- FAQ
- Buying Advice

Must never invent product specifications.

---

# Agent 5 — Article Intelligence Agent

Purpose

Generate one high-quality article.

AI chooses the best article type.

Possible outputs

- Review
- Buying Guide
- Comparison
- Alternatives
- Best Of
- Gift Guide
- Beginner Guide

Only ONE article per product during Version 1.

---

# Agent 6 — Internal Linking Agent

Purpose

Improve website structure.

Responsibilities

Find

- Related Products
- Related Articles
- Related Categories

Generate internal links.

---

# Agent 7 — Publisher Agent

Purpose

Publish content into Sanity.

Responsibilities

Create

- Product
- Article
- Category (if approved)

Version 1

Everything is saved as Draft.

---

# Agent 8 — Quality Control Agent

Purpose

Validate quality.

Checks

- Duplicate content
- Missing fields
- SEO score
- Category accuracy
- Broken affiliate links
- Image availability

If quality fails

Return workflow for correction.

Never publish low-quality content.

# Workflow Pipeline

Version 1 starts with manual product selection.

The system will later support Affiliate APIs and Product Feeds.

---

# Version 1 Workflow

User

↓

Select Merchant

↓

Paste Affiliate Link

↓

(Optional) Paste Product URL

↓

(Optional) Add Notes

↓

Product Intelligence Agent

↓

Category Intelligence Agent

↓

SEO Intelligence Agent

↓

Product Content Agent

↓

Article Intelligence Agent

↓

Internal Linking Agent

↓

Quality Control Agent

↓

Publisher Agent

↓

Sanity Draft

↓

Human Review

↓

Publish

---

# Future Workflow

Affiliate API

↓

Detect New Products

↓

Same AI Pipeline

↓

Publish Draft

↓

Human Review

↓

Publish

---

# Human Approval Rules

Version 1

Everything requires approval.

Nothing is automatically published.

The user reviews

- Product
- Article
- Category
- SEO

before publishing.

---

# Automatic Approval (Future)

Automatic publishing can be enabled only when:

- Quality Score > 95
- Affiliate Link Valid
- Category Confidence > 95%
- SEO Complete
- Images Available

Otherwise

↓

Draft

↓

Human Review

---

# Workflow Logging

Every workflow stores

- Start Time
- Finish Time
- Product ID
- Merchant
- Workflow Duration
- Agent Results
- Errors
- Warnings

No workflow runs without logging.

---

# Error Recovery

If any agent fails

↓

Stop Workflow

↓

Save Progress

↓

Generate Error Report

↓

Allow Resume

No work should be lost.

---

# Retry Policy

Transient failures

Retry automatically

Maximum

3 attempts

Permanent failures

Require Human Review.

# Taxonomy Intelligence System

ViaFinds AI OS manages the complete website taxonomy.

The goal is to maintain a clean, scalable, and SEO-friendly category structure.

---

# Taxonomy Levels

Level 1

Parent Category

Examples

- Elite Collectibles
- Home & Living
- Tech
- Luxury Beauty
- Books & Courses

---

Level 2

Major Category

Example

Tech

↓

Computers

↓

Audio

↓

Gaming

---

Level 3

Sub Category

Example

Audio

↓

Headphones

↓

Speakers

↓

Soundbars

---

Level 4

Product Group

Example

Headphones

↓

Noise Cancelling

↓

Gaming

↓

Studio

↓

Wireless

---

Level 5

Micro Category

Example

Wireless

↓

Over Ear

↓

On Ear

↓

Open Back

↓

Closed Back

---

# Taxonomy Rules

Rule 1

Never create duplicate categories.

---

Rule 2

Search the existing taxonomy before creating anything.

---

Rule 3

Use existing categories whenever possible.

---

Rule 4

Only create new categories when they improve navigation.

---

Rule 5

Never create categories for one product only.

---

Rule 6

Merge similar categories.

Example

"Wireless Earbuds"

and

"Bluetooth Earbuds"

↓

Recommend Merge

---

Rule 7

Do not create categories based on brands.

Example

❌ Sony

❌ Samsung

❌ Apple

Brands belong as Attributes.

---

Rule 8

Do not create categories based on colours.

Use Attributes.

---

Rule 9

Do not create categories based on size.

Use Attributes.

---

Rule 10

Always recommend the deepest useful category.

Example

Tech

↓

Audio

↓

Headphones

↓

Noise Cancelling

↓

Over Ear

Not

Tech

↓

Audio

---

# Category Creation

If category exists

↓

Use Existing Category

If category does not exist

↓

Evaluate

Confidence

High

↓

Create Draft Category

Confidence

Low

↓

Human Review

---

# Category Metadata

Every category contains

- Name
- Description
- Slug
- SEO Title
- Meta Description
- Parent Category
- Level
- Banner Prompt
- Cover Prompt
- Sort Order
- Visibility

---

# Taxonomy Maintenance

Regularly scan

- Empty Categories
- Duplicate Categories
- Orphan Categories
- Broken Parent Relationships
- Low Quality Categories

Generate maintenance report.

---

# Human Approval

Version 1

Every new category requires approval before becoming live.

Future

Automatic approval only if confidence exceeds configured threshold.

# Universal Product Standard

Every product entering ViaFinds AI OS must first be converted into the ViaFinds Universal Product Object (VUP).

No AI Agent is allowed to process raw merchant data.

Every connector must transform merchant data into the same format.

# Taxonomy Learning Engine

ViaFinds AI OS continuously improves the taxonomy using multiple data sources.

The system must NEVER rely only on imported products.

Instead, it continuously learns from:

## Search Console

Monitor

- High impression keywords
- Low CTR keywords
- Rising search trends
- Keywords with no dedicated category
- Keywords with no dedicated article

Recommend

- New Categories
- New Articles
- Category Improvements

---

## Search Volume

Monitor keyword demand using available keyword sources.

Recommend categories based on demand instead of assumptions.

High search demand should increase category confidence.

---

## ViaFinds Internal Search

Monitor what visitors search on ViaFinds.

Examples

Users search

Mechanical Keyboard

50 times

No category exists

↓

Recommend

Tech

↓

Computers

↓

Mechanical Keyboards

---

## Product Analysis

Monitor products that repeatedly fail category assignment.

If multiple products naturally belong together

↓

Recommend new category.

---

## Content Gap Detection

Detect

- Missing Categories
- Missing Buying Guides
- Missing Reviews
- Missing Comparison Articles
- Missing Best Of Articles

Generate recommendations.

---

## Category Demand Score

Every suggested category receives a score.

Factors

- Search Volume
- Search Console
- Internal Search
- Product Count
- User Behaviour

Categories with higher demand receive higher priority.

---

## AI Recommendations

AI should recommend

- New Categories
- Category Merges
- Category Splits
- Better Parent Categories
- Better Level 3–5 Categories

Every recommendation must include a reason.

---

## Human Approval

Version 1

Every recommendation requires approval.

Future

Automatic approval only when confidence exceeds configured threshold.

---

# Product Sources

Version 1

- Manual Product URL
- Manual Affiliate Link

Future

- Impact API
- CJ API
- Awin API
- Amazon PA API
- Product Feeds
- CSV Import
- XML Feed
- JSON Feed

---

# Universal Product Object

Every product should contain the following fields.

Product ID

Merchant

Affiliate Link

Original Product URL

Product Name

Brand

Manufacturer

Parent Category

Level 2 Category

Level 3 Category

Level 4 Category

Level 5 Category

Price

Currency

Availability

Images

Videos

Specifications

Key Features

Description

Product Attributes

Warranty

Ratings

Reviews Count

Product Tags

Merchant SKU

Last Updated

Status

---

# Required Fields

The following fields are mandatory.

- Product Name
- Merchant
- Affiliate Link
- Brand
- Images
- Product Description

If missing

↓

Stop Workflow

↓

Human Review

---

# Optional Fields

- Videos
- Warranty
- Ratings
- Reviews
- Specifications

Missing optional fields should not stop the workflow.

---

# Data Cleaning Rules

Normalize

- Capitalization
- Whitespace
- HTML
- Symbols
- Duplicate Features

Remove

- Tracking Parameters
- Invalid Characters
- Broken HTML

---

# Product Validation

Before AI processing

Validate

- Affiliate Link
- Product Name
- Merchant
- Brand
- Image Availability

If validation fails

↓

Quality Control

↓

Stop Workflow

---

# Product Status

Possible status

New

Updated

Duplicate

Draft

Published

Archived

Rejected

---

# Product History

Every update creates a version.

Never overwrite product history.

Store

- Previous Description
- Previous Price
- Previous Category
- Previous SEO
# Category Creation Rules

The AI must create categories that improve navigation, SEO, and user experience.

Categories are permanent website assets.

They must never be created using temporary or overly specific product attributes.

---

# Allowed Category Dimensions

Categories MAY be created using:

- Product Type
- Product Family
- Use Case
- Collection
- Genre
- Theme
- Technology
- Compatibility
- Skill Level
- Audience
- Room
- Activity

Examples

Tech

↓

Audio

↓

Headphones

↓

Noise Cancelling

↓

Over Ear

--------------------------------------------------

Books

↓

Technology

↓

Artificial Intelligence

↓

Machine Learning

--------------------------------------------------

Home & Living

↓

Kitchen

↓

Coffee Makers

↓

Espresso Machines

---

# Forbidden Category Dimensions

The AI MUST NEVER create categories using:

- Brand
- Colour
- Size
- Capacity
- Weight
- Material
- Price
- Discount
- Seller
- Merchant
- Model Number
- Year
- Temporary Trends
- Limited Editions (unless it is a permanent collectible series)

Examples

❌ Black Headphones

❌ Sony Headphones

❌ 32GB USB Drives

❌ Under £50

❌ Red Coffee Mugs

❌ 1.7L Electric Kettles

❌ Stainless Steel Toasters

---

# Attribute vs Category

The AI must understand the difference.

Categories describe WHAT the product IS.

Attributes describe DETAILS about the product.

Example

Category

Coffee Makers

Attributes

Brand: DeLonghi

Colour: Black

Capacity: 1.7L

Material: Stainless Steel

Voltage: 220V

---

# Maximum Taxonomy Depth

Default

Level 5

Only extend beyond Level 5 with human approval.

---

# Category Creation Threshold

Before creating a category, verify:

- Minimum product count
- Search demand
- SEO value
- User demand
- Future scalability

Only create categories that are expected to contain multiple products over time.

---

# Future-Proof Rule

Every new category should be able to contain at least 10–20 products over time.

If not,

Use Attributes instead.
# Category Creation Rules

The AI must create categories that improve navigation, SEO, and user experience.

Categories are permanent website assets.

---

## Allowed Category Types

The AI MAY create categories based on:

- Product Type
- Product Family
- Product Collection
- Use Case
- Technology
- Genre
- Theme
- Audience
- Skill Level
- Room
- Activity

Examples

Tech
→ Audio
→ Headphones
→ Noise Cancelling
→ Over Ear

Books & Courses
→ Technology & Programming
→ Artificial Intelligence
→ Machine Learning

Home & Living
→ Kitchen
→ Coffee Makers
→ Espresso Machines

---

## Forbidden Category Types

The AI MUST NEVER create categories based on:

- Brand
- Colour
- Size
- Capacity
- Weight
- Material
- Price
- Discount
- Merchant
- Seller
- Model Number
- Year
- Temporary Trends

Examples

❌ Sony Headphones

❌ Black Headphones

❌ 1.7L Electric Kettles

❌ Under £100

❌ Stainless Steel Toasters

❌ Summer Sale

❌ New Arrivals

---

## Categories vs Attributes

The AI must understand the difference.

Categories describe WHAT the product IS.

Attributes describe DETAILS about the product.

Example

Category

Coffee Makers

Attributes

Brand: DeLonghi

Colour: Black

Capacity: 1.7L

Material: Stainless Steel

Voltage: 220V

---

## Category Creation Requirements

Before creating a new category, the AI must verify:

- Category does not already exist.
- Category is not a duplicate.
- Category improves navigation.
- Category has SEO value.
- Category has future scalability.
- Category is expected to contain multiple products.

---

## Minimum Product Threshold

A new category should normally represent at least 10 products over time.

If fewer products are expected, use Tags or Attributes instead.

---

## Maximum Category Depth

Default maximum depth is Level 5.

Creating Level 6 or deeper requires human approval.

---

## Category Confidence

When confidence is:

95–100%
→ Create Draft Category

80–94%
→ Recommend Category for Human Review

Below 80%
→ Do Not Create Category

---

## Taxonomy Maintenance

The AI must continuously monitor:

- Duplicate Categories
- Empty Categories
- Orphan Categories
- Low Quality Categories
- Broken Parent Relationships

Generate recommendations for improvements.

---

## Taxonomy Learning

The AI must improve the taxonomy using:

- Google Search Console keywords
- Search volume data
- Internal ViaFinds search queries
- Product analysis
- User behaviour
- Existing product catalogue

The AI should recommend:

- New Categories
- Category Merges
- Category Splits
- Better Parent Categories
- Better Level 3–5 Categories

Every recommendation must include a reason.

---

## Human Approval

Version 1

All newly created categories must be saved as Draft and require manual approval before becoming live.
# Article Intelligence Engine

The Article Intelligence Engine is responsible for creating, updating, and maintaining high-quality articles for ViaFinds.

The AI must create helpful content for users instead of publishing articles only for SEO.

---

## Objectives

- Create valuable articles.
- Improve user experience.
- Increase organic traffic.
- Support affiliate conversions.
- Build topical authority.
- Avoid duplicate content.

---

## Article Decision Process

For every product the AI must determine whether:

- Create a new article.
- Update an existing article.
- Add the product to an existing article.
- Do nothing.

The AI must always choose the option that provides the highest value to users.

---

## Supported Article Types

The AI may generate one or more of the following article types.

- Product Review
- Buying Guide
- Best Products
- Product Comparison
- Alternatives
- Gift Guide
- Beginner Guide
- Complete Guide
- Frequently Asked Questions
- Product Roundup
- Category Guide
- Maintenance Guide
- Setup Guide
- Troubleshooting Guide

---

## Article Selection Rules

If the product is unique

↓

Create Product Review

---

If multiple similar products exist

↓

Create Best Products article

---

If competing products exist

↓

Create Comparison article

---

If beginners need education

↓

Create Beginner Guide

---

If users need help purchasing

↓

Create Buying Guide

---

If article already exists

↓

Update Existing Article

---

## Duplicate Detection

Before creating an article the AI must check

- Existing articles
- Existing reviews
- Existing buying guides
- Existing comparisons

Duplicate articles are not allowed.

---

## Content Requirements

Every article should contain

- Clear Introduction
- Helpful Content
- Product Recommendations
- Internal Links
- External References (when appropriate)
- Frequently Asked Questions
- Conclusion

---

## Writing Rules

Every article must

- Be original.
- Be helpful.
- Be easy to read.
- Be factually accurate.
- Avoid keyword stuffing.
- Avoid duplicate content.
- Avoid unnecessary repetition.

---

## Internal Linking

The AI should automatically link

- Related Products
- Related Articles
- Parent Categories
- Child Categories

Internal links must improve navigation.

---

## Affiliate Links

Affiliate links should be inserted naturally.

Affiliate links must never interrupt readability.

Affiliate links should appear only where they provide value.

---

## Article Updates

The AI should periodically review existing articles.

Possible actions

- No Update Required
- Minor Update
- Major Update
- Complete Rewrite

---

## Content Quality Score

Every article receives a quality score.

Evaluation factors

- Accuracy
- Readability
- SEO
- Internal Linking
- User Value
- Originality
- Structure

Articles below the minimum quality threshold must not be published.

---

## Human Approval

Version 1

All generated articles are saved as Draft.

Manual approval is required before publishing.

# SEO Intelligence Engine

The SEO Intelligence Engine is responsible for optimizing every product, article, category, and landing page for search engines while maintaining an excellent user experience.

SEO must always support users first and search engines second.

---

## Objectives

- Increase organic traffic.
- Improve search rankings.
- Improve click-through rate.
- Improve topical authority.
- Maintain technical SEO.
- Improve user experience.

---

## SEO Responsibilities

Generate

- SEO Title
- Meta Description
- URL Slug
- Canonical URL
- Open Graph Title
- Open Graph Description
- Open Graph Image
- Twitter Card Metadata
- Image Alt Text
- Structured Data

---

## SEO Rules

Every page must have

- Unique SEO Title
- Unique Meta Description
- Unique URL Slug
- Canonical URL
- Proper Heading Structure
- Internal Links
- External References (when appropriate)

Duplicate SEO metadata is not allowed.

---

## URL Structure

URLs must be

- Short
- Readable
- Keyword Focused
- Lowercase
- Hyphen Separated

Example

/products/lego-millennium-falcon

/articles/best-noise-cancelling-headphones

/categories/espresso-machines

---

## Title Rules

SEO Titles should

- Clearly describe the page.
- Include the primary keyword.
- Encourage clicks.
- Avoid clickbait.
- Remain unique.

---

## Meta Description Rules

Meta descriptions should

- Summarize the page.
- Encourage clicks.
- Include important keywords naturally.
- Avoid duplication.

---

## Heading Structure

Every page should contain

H1

↓

H2

↓

H3

↓

H4

Headings must follow logical hierarchy.

---

## Keyword Optimization

The AI should identify

- Primary Keyword
- Secondary Keywords
- Related Keywords
- Semantic Keywords

Keywords should be naturally integrated.

Keyword stuffing is prohibited.

---

## Internal Linking Strategy

Automatically link

- Parent Categories
- Child Categories
- Related Products
- Related Articles
- Buying Guides
- Comparison Articles

Internal links should improve navigation.

---

## Structured Data

Generate structured data where appropriate.

Examples

- Product
- Article
- FAQ
- Breadcrumb
- Review
- Organization
- WebPage

---

## Image SEO

Every image should contain

- Descriptive File Name
- Alt Text
- Caption (when appropriate)

Alt text should describe the image accurately.

---

## SEO Validation

Before publishing verify

- Missing Title
- Missing Meta Description
- Missing Alt Text
- Duplicate Slug
- Duplicate Metadata
- Broken Internal Links
- Broken External Links
- Missing Structured Data

---

## SEO Monitoring

Continuously monitor

- Organic Traffic
- Keyword Rankings
- Click Through Rate
- Search Impressions
- Indexed Pages
- Crawl Errors

Generate improvement recommendations.

---

## Human Approval

Version 1

All SEO metadata requires manual approval before publishing.

# Image Intelligence Engine

The Image Intelligence Engine is responsible for managing all images used across ViaFinds.

Its purpose is to maintain a premium visual identity while ensuring consistency across the website.

---

## Objectives

- Maintain premium branding.
- Improve user experience.
- Improve SEO.
- Keep visual consistency.
- Reduce manual work.
- Generate reusable image prompts.

---

## Responsibilities

Generate

- Product Cover Images
- Product Gallery Images
- Category Cover Images
- Category Banner Images
- Article Featured Images
- Open Graph Images
- Social Sharing Images

---

## Image Priority

Version 1

Priority Order

1. Official Merchant Images
2. Official Brand Images
3. AI Generated Images
4. Placeholder Images

Whenever official images are available, they should be preferred.

---

## Product Images

Product pages should contain

- Primary Image
- Gallery Images
- Lifestyle Images (if available)

Images must accurately represent the product.

---

## Category Cover Images

Category Cover Images should

- Clearly represent the category.
- Focus on one iconic subject.
- Remain recognizable at small sizes.
- Avoid unnecessary objects.
- Never contain text.
- Maintain a premium appearance.

---

## Category Banner Images

Category Banner Images should

- Represent the complete category environment.
- Feel cinematic and premium.
- Never appear crowded.
- Never contain text.
- Match ViaFinds branding.
- Be suitable for homepage cards and category pages.

---

## Article Images

Article images should

- Support the article topic.
- Improve readability.
- Maintain visual consistency.
- Avoid clickbait.

---

## Image Style Guide

Every generated image should follow these principles

- Premium
- Professional
- Realistic
- Clean
- Elegant
- High Detail
- Soft Natural Lighting
- Modern Composition
- High Resolution

Avoid

- Cartoon Style
- Low Quality Renders
- Overcrowded Scenes
- Artificial Looking Objects
- Heavy Filters
- Visible Text
- Watermarks
- Logos

---

## Image Prompt Generation

The AI should generate reusable prompts for

- Cover Image
- Banner Image
- Open Graph Image

Prompts should follow ViaFinds branding standards.

---

## Image SEO

Every image should contain

- File Name
- Alt Text
- Caption (when appropriate)

Alt text should accurately describe the image.

---

## Image Validation

Before publishing verify

- Image Exists
- Correct Resolution
- Correct Aspect Ratio
- No Watermarks
- No Visible Text
- Correct Category
- Premium Appearance

---

## Human Approval

Version 1

All AI generated images and prompts require manual approval before publishing.
# Affiliate Intelligence Engine

The Affiliate Intelligence Engine is responsible for managing affiliate links, merchant information, commission tracking, and affiliate compliance across ViaFinds.

Its purpose is to maximize affiliate revenue while ensuring every affiliate link remains accurate, valid, and user-friendly.

---

## Objectives

- Maximize affiliate conversions.
- Ensure affiliate link accuracy.
- Detect broken affiliate links.
- Maintain merchant information.
- Support multiple affiliate networks.
- Prevent revenue loss.

---

## Supported Affiliate Sources

Version 1

- Manual Affiliate Links

Future

- Impact
- CJ Affiliate
- Awin
- Amazon Associates
- ShareASale
- Rakuten Advertising
- PartnerStack
- ClickBank
- Custom Merchant APIs

---

## Responsibilities

Manage

- Affiliate Links
- Merchant Information
- Commission Information
- Product Source
- Affiliate Network
- Link Status
- Merchant Status

---

## Affiliate Link Validation

Every affiliate link must be validated before publishing.

Verify

- Link Format
- Redirect Success
- Landing Page
- Merchant Availability
- HTTPS
- Invalid Parameters

If validation fails

↓

Stop Workflow

↓

Human Review

---

## Merchant Management

Maintain merchant information including

- Merchant Name
- Affiliate Network
- Website
- Logo
- Supported Countries
- Supported Currency
- Commission Type
- Commission Rate
- Cookie Duration
- Approval Status

---

## Product Source Tracking

Every product must store

- Merchant
- Affiliate Network
- Source URL
- Affiliate URL
- Import Date
- Last Verification Date

---

## Link Health Monitoring

Regularly monitor

- Broken Links
- Redirect Failures
- Removed Products
- Merchant Errors
- Expired Offers

Generate reports for review.

---

## Duplicate Detection

The AI must detect

- Duplicate Affiliate Links
- Duplicate Products
- Duplicate Merchant Listings

Duplicate entries must not be published.

---

## Affiliate Compliance

The AI must

- Preserve affiliate parameters.
- Never modify affiliate tracking codes.
- Never remove affiliate identifiers.
- Never expose private affiliate credentials.

---

## Future Features

Support

- Automatic Product Import
- Merchant APIs
- Product Feeds
- Commission Analytics
- Price Monitoring
- Stock Monitoring
- Deal Detection

---

## Human Approval

Version 1

All affiliate links require manual verification before publishing.
# Publishing Engine

The Publishing Engine is responsible for safely publishing products, articles, categories, and related content to ViaFinds.

No content may bypass the publishing pipeline.

---

## Objectives

- Publish high-quality content.
- Prevent accidental publication.
- Maintain content consistency.
- Support future automation.
- Preserve content history.

---

## Publishable Content

The Publishing Engine manages

- Products
- Articles
- Categories
- Tags
- SEO Metadata
- Images
- Internal Links

---

## Publishing Pipeline

Every item follows the same workflow.

Create

↓

Validate

↓

Quality Check

↓

Draft

↓

Human Approval

↓

Publish

---

## Draft Mode

Version 1

Every item must first be saved as Draft.

Draft content should be fully editable before publication.

---

## Publishing Validation

Before publishing verify

- Required fields completed.
- Affiliate link validated.
- Category assigned.
- SEO generated.
- Images available.
- Internal links generated.
- Quality score meets minimum threshold.

If any validation fails

↓

Return to Draft

---

## Publishing Rules

Products cannot be published without

- Product Title
- Affiliate Link
- Parent Category
- Product Description
- Featured Image

Articles cannot be published without

- Title
- Featured Image
- SEO Metadata
- Internal Links
- Conclusion

Categories cannot be published without

- Name
- Parent Category
- Description
- SEO Metadata

---

## Publishing Status

Every item must have one status.

Possible values

- Draft
- Pending Review
- Approved
- Scheduled
- Published
- Archived
- Rejected

---

## Scheduled Publishing

Future versions should support

- Date Scheduling
- Time Scheduling
- Batch Publishing
- Queue Processing

---

## Update Workflow

When updating existing content

Retrieve Existing Version

↓

Compare Changes

↓

Generate Updated Version

↓

Save Draft

↓

Human Approval

↓

Publish

---

## Rollback

Every published item must support rollback.

Rollback should restore

- Previous Content
- Previous SEO
- Previous Images
- Previous Categories
- Previous Internal Links

---

## Publishing Log

Every publish action must record

- Item ID
- Item Type
- Publish Date
- User
- Workflow ID
- Version Number
- Approval Status

---

## Human Approval

Version 1

Manual approval is mandatory before publishing any content.

Future versions may support automatic publishing based on configurable quality thresholds.
# Logging & Monitoring Engine

The Logging & Monitoring Engine is responsible for recording every important action performed by ViaFinds AI OS.

Every workflow, AI Agent, and publishing operation must generate logs for debugging, auditing, and performance analysis.

---

## Objectives

- Track all workflow activity.
- Detect failures.
- Improve debugging.
- Monitor system health.
- Measure AI performance.
- Support future analytics.

---

## Logging Scope

The system must log

- Workflow Executions
- AI Agent Executions
- Product Imports
- Category Changes
- Article Generation
- SEO Generation
- Image Processing
- Affiliate Validation
- Publishing Actions
- User Approvals
- Errors
- Warnings

---

## Workflow Log

Every workflow execution must store

- Workflow ID
- Workflow Name
- Start Time
- Finish Time
- Duration
- Status
- Trigger Source
- Product ID
- Merchant
- User
- Result

---

## AI Agent Log

Every AI Agent execution must store

- Agent Name
- Input
- Output
- Processing Time
- Confidence Score
- Errors
- Warnings
- Retry Count

---

## Error Logging

Every error must include

- Error ID
- Workflow
- Agent
- Timestamp
- Error Type
- Error Message
- Stack Trace (if available)
- Recovery Status

---

## Warning Logging

Warnings should include

- Warning Type
- Description
- Workflow
- Timestamp
- Suggested Action

Warnings must not stop the workflow unless configured.

---

## Performance Monitoring

Monitor

- Workflow Duration
- AI Response Time
- Product Processing Time
- Article Generation Time
- Publishing Time
- Queue Length
- Retry Count

---

## Health Monitoring

Continuously monitor

- AI Availability
- Ollama Availability
- n8n Status
- Sanity Status
- Database Status
- Storage Usage
- Disk Space
- Memory Usage
- CPU Usage

---

## Audit Trail

Every important action must create an audit record.

Track

- Created
- Updated
- Deleted
- Published
- Approved
- Rejected
- Archived

Audit records must never be deleted.

---

## Notifications

Generate notifications for

- Failed Workflows
- AI Errors
- Publishing Failures
- Broken Affiliate Links
- Missing Images
- Missing Categories
- System Errors

---

## Dashboard

Future versions should provide a monitoring dashboard displaying

- Active Workflows
- Failed Workflows
- Queue Status
- AI Performance
- Publishing Statistics
- Product Statistics
- Article Statistics
- Affiliate Statistics

---

## Log Retention

Logs should be retained according to configurable retention policies.

Old logs may be archived but should never be silently deleted.

---

## Human Review

Critical failures require manual investigation before affected workflows resume.
# Configuration & Knowledge Base

ViaFinds AI OS must never hardcode configuration values.

All settings must be centralized and reusable across the system.

---

## Objectives

- Centralize configuration.
- Simplify maintenance.
- Improve security.
- Support multiple environments.
- Allow future scalability.

---

# Configuration Categories

System Configuration

- Environment
- Time Zone
- Language
- Default Currency
- Default Country

---

AI Configuration

- AI Provider
- Ollama Model
- Temperature
- Max Tokens
- Retry Attempts
- Timeout

---

Sanity Configuration

- Project ID
- Dataset
- API Version
- Write Token
- Read Token

---

n8n Configuration

- Base URL
- Workflow Settings
- Queue Settings
- Retry Settings

---

Affiliate Configuration

- Default Network
- Merchant Settings
- Commission Settings
- Cookie Duration

---

Publishing Configuration

- Draft Mode
- Auto Publish
- Approval Required
- Scheduled Publishing

---

SEO Configuration

- Default Meta Title Template
- Default Meta Description Template
- Canonical Rules
- Sitemap Rules

---

Image Configuration

- Default Resolution
- Compression Rules
- Aspect Ratios
- File Naming Rules

---

Logging Configuration

- Log Level
- Log Retention
- Error Notifications
- Performance Monitoring

---

# Knowledge Base

The Knowledge Base contains the permanent rules used by all AI Agents.

Every AI Agent must reference the Knowledge Base before making decisions.

---

## Website Knowledge

Store

- Website Structure
- Parent Categories
- Level 2 Categories
- Level 3 Categories
- Level 4 Categories
- Level 5 Categories

---

## Brand Knowledge

Store

- ViaFinds Branding
- Tone of Voice
- Writing Standards
- Visual Style
- Image Rules

---

## Content Knowledge

Store

- Article Templates
- Product Templates
- Buying Guide Templates
- FAQ Templates
- Comparison Templates

---

## SEO Knowledge

Store

- SEO Rules
- Internal Linking Rules
- URL Rules
- Metadata Rules
- Structured Data Rules

---

## Category Knowledge

Store

- Category Rules
- Category Creation Rules
- Merge Rules
- Split Rules
- Taxonomy Standards

---

## Prompt Library

Every AI prompt must be stored separately.

Prompts should never be hardcoded inside workflows.

Example

prompts/

- product.md
- category.md
- article.md
- seo.md
- image.md
- publisher.md
- quality.md

---

## Reusable Templates

Store reusable templates for

- Product Pages
- Articles
- Category Pages
- SEO Metadata
- FAQ Sections
- Buying Guides
- Comparison Articles

---

## Version Control

Every prompt, template, and configuration change must be versioned.

Older versions should remain available for rollback.

---

## Human Approval

Critical configuration changes require manual approval before becoming active.
# Security & Data Protection

ViaFinds AI OS must protect sensitive information, prevent unauthorized actions, and ensure data integrity.

Security is mandatory for every workflow, AI Agent, and external integration.

---

## Objectives

- Protect sensitive data.
- Prevent unauthorized access.
- Secure API credentials.
- Protect affiliate information.
- Maintain data integrity.
- Ensure safe AI operations.

---

## API Keys

API keys must never be

- Hardcoded
- Logged
- Exposed to AI
- Stored inside prompts
- Committed to Git

API keys must be stored securely using environment variables or a secure secrets manager.

---

## Access Control

Different system roles should have different permissions.

Examples

- Administrator
- Editor
- Reviewer
- Automation
- Read Only

Every action should be permission controlled.

---

## Authentication

Every external service should authenticate securely.

Examples

- Sanity
- n8n
- Affiliate APIs
- Future AI APIs

---

## Data Validation

Every external input must be validated before processing.

Examples

- Product URL
- Affiliate Link
- Merchant Name
- Images
- API Responses

Invalid data must stop the workflow.

---

## Sensitive Information

The AI must never expose

- API Keys
- Tokens
- Passwords
- Secret URLs
- Private Configuration
- Internal System Information

---

## AI Restrictions

The AI must never

- Invent affiliate links.
- Modify affiliate tracking parameters.
- Delete published products automatically.
- Delete published articles automatically.
- Delete categories automatically.
- Expose confidential data.
- Execute unknown code.
- Access unauthorized resources.

---

## External Requests

Before using external data verify

- Source validity
- HTTPS connection
- Response status
- Data format

Reject untrusted sources.

---

## Backup Strategy

Regularly backup

- Products
- Articles
- Categories
- Images
- Prompts
- Configurations
- Workflows
- Logs

Backups should support full restoration.

---

## Recovery Strategy

The system should support

- Product Recovery
- Article Recovery
- Category Recovery
- Workflow Recovery
- Configuration Recovery

Recovery should never overwrite newer versions without approval.

---

## Security Monitoring

Continuously monitor

- Failed Logins
- API Failures
- Unauthorized Requests
- Workflow Errors
- Configuration Changes

Generate alerts for suspicious activity.

---

## Audit Requirements

Every security-related action must create an audit record.

Record

- User
- Timestamp
- Action
- Result
- IP Address (if available)
- System Component

Audit records must not be modified.

---

## Human Approval

Critical security changes require administrator approval before becoming active.
# Development Roadmap

ViaFinds AI OS will be developed in phases.

Each phase must be completed, tested, and documented before moving to the next phase.

---

# Phase 1 — Foundation

Objectives

- Configure Docker
- Configure n8n
- Configure Sanity
- Configure Ollama
- Configure Git Repository
- Create Folder Structure
- Create Project Documentation

Deliverables

- Working Development Environment
- MASTER_ARCHITECTURE.md
- Basic Project Structure

Status

Completed

---

# Phase 2 — Core Product Pipeline

Objectives

- Manual Product Input
- Product Intelligence Agent
- Category Intelligence Agent
- Product Content Agent
- SEO Intelligence Agent
- Publisher Agent
- Save Product as Draft

Deliverables

- Product created in Sanity
- Product saved as Draft
- Product fully categorized

---

# Phase 3 — Article Pipeline

Objectives

- Article Intelligence Engine
- Buying Guide Generation
- Review Generation
- Comparison Generation
- Internal Linking
- FAQ Generation

Deliverables

- Complete Article
- Internal Links
- SEO Metadata
- Draft Article

---

# Phase 4 — Quality Control

Objectives

- Quality Validation
- Duplicate Detection
- Broken Link Detection
- Missing Data Detection
- Content Scoring

Deliverables

- Quality Reports
- Validation Reports
- Publishing Approval

---

# Phase 5 — Image Intelligence

Objectives

- Image Prompt Generation
- Category Cover Images
- Category Banner Images
- Article Featured Images
- Image Validation

Deliverables

- Premium Image Prompts
- Image Metadata
- Image SEO

---

# Phase 6 — Affiliate Intelligence

Objectives

- Merchant Management
- Affiliate Link Validation
- Product Source Tracking
- Broken Link Detection
- Commission Management

Deliverables

- Valid Affiliate Links
- Merchant Database
- Link Monitoring

---

# Phase 7 — API Integration

Objectives

Support

- Impact
- CJ Affiliate
- Awin
- Amazon PA API
- ShareASale
- Product Feeds
- CSV Import
- XML Import

Deliverables

- Automatic Product Import
- Merchant Connectors

---

# Phase 8 — Automation

Objectives

- Automatic Product Discovery
- Automatic Product Import
- Automatic Product Updates
- Automatic Category Suggestions
- Automatic Article Updates

Deliverables

- Fully Automated Product Pipeline

---

# Phase 9 — Website Intelligence

Objectives

Monitor

- Google Search Console
- Internal Search
- Product Performance
- Article Performance
- SEO Performance
- Category Performance

Generate

- Recommendations
- Reports
- Improvement Tasks

Deliverables

- AI Business Dashboard
- Growth Reports

---

# Phase 10 — AI Business Manager

Objectives

Transform ViaFinds AI OS into an intelligent business management platform.

Responsibilities

- Discover Opportunities
- Detect Content Gaps
- Recommend New Categories
- Recommend New Articles
- Detect Outdated Content
- Detect Missing Products
- Improve Internal Linking
- Optimize SEO
- Monitor Affiliate Revenue

Deliverables

- Self-Improving Affiliate Platform

---

# Version 1 Scope

Version 1 includes

- Manual Product Input
- Manual Affiliate Link
- AI Product Generation
- AI Article Generation
- AI SEO
- AI Category Assignment
- Draft Publishing
- Human Approval

No automatic publishing.

No automatic product discovery.

No automatic category publishing.

---

# Long-Term Vision

ViaFinds AI OS should become a complete AI-powered affiliate business operating system capable of managing products, content, SEO, taxonomy, affiliate partnerships, and website growth with minimal manual effort while maintaining premium quality and full human oversight.

# Future Integrations & Expansion

ViaFinds AI OS is designed to be platform-independent.

Every external integration should connect through a standardized connector without requiring changes to the core AI workflow.

---

# Supported Integration Types

The architecture should support

- Affiliate Networks
- Merchant APIs
- Product Feeds
- AI Providers
- Analytics Platforms
- Email Services
- Notification Services
- Cloud Storage
- Payment Platforms

---

# Affiliate Network Connectors

Future supported affiliate networks

- Impact
- CJ Affiliate
- Awin
- Amazon Associates
- ShareASale
- Rakuten Advertising
- PartnerStack
- ClickBank
- FlexOffers
- Webgains

Each network must have its own connector.

The AI workflow must remain unchanged regardless of the affiliate network.

---

# Merchant Connectors

Each merchant connector should convert merchant data into the Universal Product Object before sending it to the AI Pipeline.

Merchant-specific logic must never exist inside AI Agents.

---

# AI Provider Support

Version 1

- Ollama

Future

- OpenAI
- Anthropic
- Google Gemini
- OpenRouter
- DeepSeek
- Mistral
- Grok
- Future Local Models

The AI provider should be configurable without changing workflows.

---

# Product Feed Support

Supported formats

- CSV
- XML
- JSON
- RSS
- Merchant APIs

Every feed must first be normalized into the Universal Product Object.

---

# Search Engine Integrations

Future integrations

- Google Search Console
- Google Analytics
- Bing Webmaster Tools

Purpose

- SEO Analysis
- Content Gap Detection
- Performance Monitoring

---

# Notification Integrations

Support

- Email
- Discord
- Slack
- Telegram
- WhatsApp
- Microsoft Teams

Notifications should include

- Workflow Failures
- Publishing Events
- System Alerts
- Affiliate Errors

---

# Cloud Storage

Future support

- Google Drive
- Dropbox
- OneDrive
- Amazon S3
- Cloudflare R2

Used for

- Images
- Backups
- Workflow Exports
- Logs

---

# Version Compatibility

Every connector should define

- Version
- API Version
- Supported Features
- Last Updated

Breaking changes must not affect the core AI system.

---

# Connector Principles

Every connector must

- Validate incoming data.
- Normalize data.
- Handle errors gracefully.
- Generate logs.
- Support retries.
- Never bypass validation.

---

# Scalability

New integrations should require only

- A new connector.
- Configuration.
- Authentication.

No modification to existing AI Agents should be required.

---

# Long-Term Objective

ViaFinds AI OS should support unlimited integrations while maintaining a single standardized workflow for products, content, SEO, taxonomy, publishing, and analytics.

# Development Standards

All code developed for ViaFinds AI OS must follow consistent standards to ensure maintainability, scalability, and reliability.

---

# General Principles

Every component must be

- Modular
- Reusable
- Readable
- Maintainable
- Well Documented
- Easily Testable

---

# Architecture Rules

The system must follow

Single Responsibility Principle

Each Agent performs one task only.

Each Workflow performs one business process only.

Each Module has one responsibility.

---

# Naming Convention

Use consistent naming.

Folders

lowercase-with-hyphens

Example

product-agent

category-agent

image-intelligence

---

Files

kebab-case

Example

product-agent.ts

generate-article.ts

seo-validator.ts

---

Variables

camelCase

Example

productName

affiliateLink

categoryConfidence

---

Classes

PascalCase

Example

ProductAgent

ArticleGenerator

SEOValidator

---

Constants

UPPER_CASE

Example

MAX_RETRY_COUNT

DEFAULT_TIMEOUT

---

# Folder Rules

Every folder should have a single purpose.

Do not mix

- Business Logic
- UI
- Configuration
- Prompts
- Utilities

---

# Workflow Rules

Each workflow must

- Start with validation
- Generate logs
- Handle errors
- Support retries
- End with status reporting

No workflow should exceed its intended responsibility.

---

# AI Agent Rules

Every AI Agent must

- Receive structured input
- Produce structured output
- Never modify unrelated data
- Never bypass validation
- Never publish directly

---

# Code Quality

Every function should

- Be small
- Be reusable
- Be documented
- Return predictable results

Avoid unnecessary complexity.

---

# Error Handling

Every module must

- Validate input
- Catch exceptions
- Log failures
- Return meaningful errors

The system must never fail silently.

---

# Documentation

Every module should contain

- Purpose
- Inputs
- Outputs
- Dependencies
- Version

---

# Versioning

Every major change must increase the project version.

Every release should include

- Version Number
- Release Date
- Change Log
- Breaking Changes

---

# Testing

Every major feature should be tested before deployment.

Testing includes

- Workflow Testing
- AI Output Testing
- Sanity Integration
- Affiliate Validation
- SEO Validation
- Publishing Validation

---

# Performance

Optimize for

- Low AI response time
- Low memory usage
- Reliable workflow execution
- Easy maintenance

---

# Maintainability

Future developers should understand the system without needing to rewrite existing code.

Code should prioritize clarity over cleverness.

---

# Project Philosophy

ViaFinds AI OS should always prioritize

- Quality
- Reliability
- Scalability
- User Experience
- Long-Term Maintainability

Every new feature must follow these principles.
# Disaster Recovery & Backup Strategy

ViaFinds AI OS must be able to recover from hardware failures, software failures, human mistakes, and data corruption.

No critical data should ever be permanently lost.

---

# Objectives

- Prevent data loss.
- Support fast recovery.
- Protect workflows.
- Protect AI prompts.
- Protect product data.
- Protect website content.

---

# Backup Scope

The system must backup

- Products
- Articles
- Categories
- Images
- Sanity Data
- n8n Workflows
- Configuration Files
- Prompt Library
- Documentation
- Logs

---

# Backup Frequency

Version 1

Daily Backup

Weekly Full Backup

Monthly Archive Backup

---

# Backup Types

Incremental Backup

Stores only changed data.

---

Full Backup

Stores complete system data.

---

Manual Backup

Created before major updates.

---

# Recovery Targets

The system must support recovery of

- Single Product
- Single Article
- Single Category
- Workflow
- Prompt
- Configuration
- Complete Website

---

# Rollback Support

Rollback should restore

- Previous Product Version
- Previous Article Version
- Previous Category Version
- Previous Workflow Version
- Previous Prompt Version

Rollback must not overwrite newer versions without approval.

---

# Failure Recovery

If a workflow fails

↓

Save Current Progress

↓

Generate Error Report

↓

Pause Workflow

↓

Allow Resume From Last Successful Step

The workflow should never restart from the beginning unless required.

---

# Backup Validation

Every backup should be verified.

Verify

- Backup Exists
- Backup Complete
- Backup Readable
- Backup Restorable

---

# Disaster Scenarios

The system should recover from

- Server Failure
- Database Failure
- Workflow Failure
- AI Failure
- Storage Failure
- Human Error
- Configuration Errors

---

# Recovery Priority

Priority 1

Website Availability

Priority 2

Product Data

Priority 3

Articles

Priority 4

Categories

Priority 5

Analytics

---

# Human Approval

Restoring backups requires administrator approval.

---

# Long-Term Goal

The system should recover from any critical failure with minimal downtime and without permanent data loss.
# Project Completion Criteria

This document defines when ViaFinds AI OS is considered complete for Version 1 and future releases.

No feature is considered complete until it satisfies all acceptance criteria.

---

# Version 1 Objectives

Version 1 focuses on building a stable, high-quality AI-powered affiliate publishing system.

Version 1 does not attempt full automation.

Human approval remains mandatory.

---

# Version 1 Success Criteria

The system must successfully

- Accept manual affiliate links.
- Process products through the AI pipeline.
- Assign correct categories.
- Generate product content.
- Generate one high-quality article.
- Generate SEO metadata.
- Generate image prompts.
- Save products as Draft.
- Save articles as Draft.
- Require manual approval before publishing.

---

# Product Completion Checklist

Every product must contain

- Product Title
- Affiliate Link
- Merchant
- Brand
- Product Description
- Key Features
- Category Assignment
- SEO Metadata
- Featured Image
- Status

---

# Article Completion Checklist

Every article must contain

- Title
- Introduction
- Main Content
- Internal Links
- FAQ Section
- Conclusion
- SEO Metadata
- Featured Image Prompt

---

# Category Completion Checklist

Every category must contain

- Name
- Parent Category
- Level
- Description
- SEO Metadata
- Cover Image Prompt
- Banner Image Prompt

---

# Workflow Completion Checklist

Every workflow must

- Validate Input
- Log Activity
- Handle Errors
- Support Retry
- Save Progress
- Produce Output
- Generate Status Report

---

# AI Agent Completion Checklist

Every AI Agent must

- Accept Structured Input
- Return Structured Output
- Produce Logs
- Handle Errors
- Support Retries
- Never Bypass Validation

---

# Quality Requirements

Before publishing

Quality Score must meet the configured minimum.

Content must pass

- Grammar Validation
- SEO Validation
- Duplicate Detection
- Affiliate Validation
- Image Validation
- Category Validation

---

# System Stability

The system should

- Recover from failures.
- Resume interrupted workflows.
- Preserve data integrity.
- Prevent duplicate content.
- Prevent duplicate products.

---

# Documentation Requirements

Every major feature must be documented.

Documentation should include

- Purpose
- Inputs
- Outputs
- Dependencies
- Workflow
- Configuration
- Future Improvements

---

# Version 1 Definition of Done

Version 1 is complete when

- All core AI Agents operate successfully.
- Manual product processing works end-to-end.
- Products are saved to Sanity.
- Articles are generated successfully.
- SEO metadata is generated.
- Categories are assigned correctly.
- Draft publishing works.
- Manual approval works.
- No critical workflow failures remain.

---

# Future Versions

Future releases may introduce

- Automatic Product Discovery
- Affiliate API Imports
- Automatic Category Creation
- Automatic Publishing
- Revenue Analytics
- AI Business Dashboard
- Multi-language Support
- Advanced Recommendation Engine

Each future release must preserve backward compatibility whenever possible.

---

# Final Mission

ViaFinds AI OS exists to build a premium, scalable, AI-powered affiliate platform that prioritizes user value, content quality, maintainability, and long-term business growth over short-term automation.
# Future AI Vision

ViaFinds AI OS is not designed to be an AI content generator.

Its long-term goal is to become an AI-powered business operating system capable of managing an entire affiliate business with minimal human effort while maintaining premium quality.

---

# Long-Term Objectives

The AI should continuously improve

- Website Structure
- Product Database
- Articles
- SEO
- Categories
- User Experience
- Affiliate Revenue

---

# AI Responsibilities

The AI should eventually become capable of

- Discovering new opportunities
- Finding content gaps
- Finding missing products
- Detecting outdated content
- Monitoring website health
- Monitoring affiliate performance
- Improving internal linking
- Improving taxonomy
- Improving user engagement

---

# AI Decision Principles

Every AI decision must prioritize

1. User Value
2. Content Quality
3. Website Quality
4. Long-Term SEO
5. Business Growth

Revenue should never be prioritized over user trust.

---

# Continuous Learning

The AI should continuously learn from

- Google Search Console
- Website Analytics
- Internal Search
- User Behaviour
- Product Performance
- Article Performance
- SEO Performance
- Affiliate Performance

Learning should improve future recommendations without changing historical data.

---

# Recommendation Engine

The AI should generate recommendations such as

- Create New Product
- Create New Article
- Update Existing Article
- Improve SEO
- Improve Internal Linking
- Create New Category
- Merge Categories
- Remove Low Value Content
- Refresh Outdated Content

Recommendations should always include a confidence score and explanation.

---

# Business Intelligence

Future versions should provide insights including

- Best Performing Categories
- Best Performing Products
- Best Performing Articles
- Highest Revenue Merchants
- Highest Converting Content
- Low Performing Content
- Content Opportunities
- SEO Opportunities

---

# Automation Philosophy

Automation should remove repetitive work.

Automation must never reduce content quality.

Every automated action should remain transparent, traceable, and reversible.

---

# Human Role

Humans remain responsible for

- Business Strategy
- Final Approval
- Brand Direction
- Legal Compliance
- Major Taxonomy Decisions
- Critical Configuration Changes

The AI assists decision-making but does not replace business ownership.

---

# System Evolution

The architecture must support future expansion without requiring a complete redesign.

New

- AI Models
- Affiliate Networks
- Merchant APIs
- Content Types
- Languages
- Integrations

should be added through modular components rather than modifying the core architecture.

---

# Final Principle

Every feature added to ViaFinds AI OS must answer one question:

"Does this improve the experience for users while helping build a stronger, more scalable affiliate business?"

If the answer is no, the feature should not be implemented.
# Coding Rules for AI Developers

These rules apply to every AI developer working on ViaFinds AI OS, including Antigravity and future AI coding assistants.

The architecture defined in this document is the single source of truth.

AI developers must follow these rules before writing, modifying, or deleting any code.

---

# Architecture First

Never write code before understanding the architecture.

Always follow

- Project Structure
- AI Agent Responsibilities
- Workflow Pipeline
- Universal Product Standard
- Category Rules
- Development Standards

---

# Never Break Existing Features

When implementing a new feature

- Do not modify working features unless required.
- Maintain backward compatibility.
- Avoid unnecessary refactoring.
- Never remove functionality without approval.

---

# Build Modular Components

Every new feature should be implemented as an independent module.

Modules should communicate through clearly defined interfaces.

Avoid tightly coupled code.

---

# Reuse Before Creating

Before creating

- Workflow
- Function
- Component
- Utility
- Service

Search the existing project first.

Reuse existing functionality whenever possible.

---

# Documentation

Every new module must include

- Purpose
- Inputs
- Outputs
- Dependencies
- Version
- Last Updated

---

# Code Comments

Use comments only where they improve understanding.

Avoid unnecessary comments.

Prefer readable code over excessive commenting.

---

# Configuration

Never hardcode

- URLs
- API Keys
- Tokens
- Secrets
- Merchant IDs
- Project IDs

Always use centralized configuration.

---

# Error Handling

Every module must

- Validate input.
- Handle expected failures.
- Generate logs.
- Return meaningful errors.
- Never fail silently.

---

# AI Output Validation

Never trust AI output directly.

Validate

- Product Data
- Categories
- SEO
- Affiliate Links
- Image Prompts
- Articles

before saving.

---

# Database Rules

Never

- Delete production data automatically.
- Overwrite published content.
- Remove categories automatically.
- Remove articles automatically.

Use versioning and draft workflows.

---

# Workflow Rules

Each workflow should

- Perform one business process.
- Produce logs.
- Support retries.
- Save progress.
- Return a final status.

---

# Testing

Before completing a task verify

- No existing functionality is broken.
- Workflow executes successfully.
- Logs are generated.
- Validation passes.
- Draft creation works.
- Publishing remains unaffected.

---

# Git Rules

Every meaningful change should include

- Clear Commit Message
- Related Documentation Update
- Version Update (if applicable)

---

# Human Approval

Major architecture changes require manual approval before implementation.

---

# Final Rule

When uncertain,

Do not guess.

Analyze the architecture, review existing code, and follow the documented standards before making changes.
# Master Workflow Rules

Every workflow in ViaFinds AI OS must follow the same execution standard.

This guarantees consistency, reliability, maintainability, and scalability.

No workflow is allowed to bypass these rules.

---

# Standard Workflow Pipeline

Every workflow must execute in the following order.

Receive Input

↓

Validate Input

↓

Normalize Data

↓

Generate Workflow ID

↓

Create Initial Log

↓

Execute Business Logic

↓

Validate Results

↓

Quality Control

↓

Save Draft

↓

Generate Final Log

↓

Return Result

---

# Workflow Principles

Every workflow must

- Have a single responsibility.
- Produce predictable output.
- Support retries.
- Support recovery.
- Generate logs.
- Return execution status.

---

# Input Validation

Every workflow must validate

- Required Fields
- Data Types
- Empty Values
- Invalid Characters
- Duplicate Data
- Broken URLs

Invalid input must stop the workflow immediately.

---

# Data Normalization

Normalize

- Text
- Capitalization
- URLs
- Dates
- Currency
- Images
- HTML

The AI must always work with clean data.

---

# Workflow ID

Every execution must generate a unique Workflow ID.

This ID must be attached to

- Logs
- Products
- Articles
- Errors
- Audit Records

---

# Quality Control

Every workflow must verify

- Required data exists.
- AI output is complete.
- Confidence threshold is met.
- Validation passed.
- No duplicate content exists.

---

# Retry Rules

Retry only temporary failures.

Maximum retries

3

Examples

- Network Error
- Timeout
- Temporary API Failure

Permanent failures require manual review.

---

# Workflow Recovery

If a workflow stops unexpectedly

- Save current progress.
- Save workflow state.
- Record failure.
- Allow resume from last successful step.

Restarting from the beginning should be avoided whenever possible.

---

# Output Validation

Before completing

Validate

- Output Structure
- Required Fields
- Quality Score
- Status
- Error Messages

---

# Workflow Status

Possible workflow status

- Pending
- Running
- Waiting
- Completed
- Failed
- Cancelled
- Paused

---

# Audit Trail

Every workflow execution must create

- Workflow ID
- Start Time
- End Time
- Duration
- Trigger
- Status
- User
- AI Agents Executed
- Errors
- Warnings

---

# Workflow Completion

A workflow is complete only when

- Validation Passed
- Quality Passed
- Logs Saved
- Output Saved
- Status Returned

---

# Future Compatibility

Every future workflow must follow these standards without exception.

This ensures all workflows behave consistently regardless of their purpose.
# Human Approval System

Version 1 of ViaFinds AI OS follows a Human-in-the-Loop architecture.

The AI assists with content creation and decision making, but humans retain final control over publishing and major business decisions.

---

# Objectives

- Prevent low-quality publishing.
- Protect brand reputation.
- Maintain content accuracy.
- Prevent AI mistakes.
- Ensure business control.

---

# Approval Levels

Level 1

Automatic Processing

The AI may

- Import Product Data
- Clean Data
- Generate Content
- Generate SEO
- Generate Image Prompts
- Generate Internal Links

No publishing occurs at this level.

---

Level 2

Draft Approval

A human reviews

- Product
- Article
- Category
- SEO
- Image Prompts

Possible actions

- Approve
- Reject
- Edit
- Request Regeneration

---

Level 3

Publishing Approval

Only approved content may be published.

Publishing changes

Draft

↓

Published

---

# Actions Requiring Approval

The following always require approval in Version 1

- New Product
- New Article
- New Category
- Category Merge
- Category Split
- Product Update
- Article Rewrite
- SEO Rewrite
- Publishing
- Archive
- Restore

---

# Approval Decision

Possible outcomes

Approved

↓

Publish

--------------------------------

Rejected

↓

Return to AI

--------------------------------

Edited

↓

Save Draft

--------------------------------

Needs Review

↓

Human Investigation

---

# Approval History

Every approval must record

- Item ID
- Item Type
- Reviewer
- Decision
- Date
- Comments
- Version

Approval history must never be deleted.

---

# Regeneration

The reviewer may request

- Regenerate Product Content
- Regenerate Article
- Regenerate SEO
- Regenerate Category Suggestion
- Regenerate Image Prompt

Previous versions must remain available.

---

# Future Automation

Future versions may automatically approve low-risk changes.

Examples

- Grammar Improvements
- Broken Internal Link Fixes
- Alt Text Updates
- Metadata Improvements

Automatic approval must remain configurable.

---

# Approval Dashboard

Future versions should provide a dashboard showing

- Pending Products
- Pending Articles
- Pending Categories
- Pending SEO
- Pending Image Prompts
- Pending Updates

---

# Final Rule

Nothing may be published without satisfying all validation requirements and the configured approval policy.
# Data Model & Sanity Architecture

Sanity CMS is the primary content database for ViaFinds AI OS.

All products, articles, categories, prompts, settings, and logs must use structured schemas.

The AI must never write directly to the database.

All data must pass through validation before saving.

---

# Core Document Types

The system should manage the following document types.

- Product
- Article
- Category
- Merchant
- Brand
- Author
- Prompt
- Configuration
- Workflow
- Image Asset
- Tag
- FAQ

---

# Product Schema

Every product should contain

- Product ID
- Product Name
- Slug
- Merchant
- Affiliate Link
- Product URL
- Brand
- Manufacturer
- Description
- Features
- Specifications
- Images
- Videos
- Categories
- Tags
- SEO
- Status
- Version
- Created Date
- Updated Date

---

# Article Schema

Every article should contain

- Article ID
- Title
- Slug
- Introduction
- Body
- FAQ
- Conclusion
- Related Products
- Related Categories
- SEO
- Featured Image
- Status
- Version
- Author
- Published Date

---

# Category Schema

Every category should contain

- Category ID
- Name
- Slug
- Description
- Parent Category
- Level
- Cover Image Prompt
- Banner Image Prompt
- SEO
- Sort Order
- Visibility
- Status

---

# Merchant Schema

Every merchant should contain

- Merchant ID
- Merchant Name
- Website
- Affiliate Network
- Commission Type
- Commission Rate
- Cookie Duration
- Status

---

# Brand Schema

Every brand should contain

- Brand ID
- Brand Name
- Website
- Description
- Logo
- Related Products

---

# Prompt Schema

Every AI prompt should contain

- Prompt ID
- Name
- Purpose
- Version
- Prompt Content
- AI Model
- Last Updated

---

# Configuration Schema

Configuration documents should contain

- Configuration Name
- Version
- Values
- Environment
- Last Updated

---

# Relationships

The system should support relationships between

Product ↔ Category

Product ↔ Brand

Product ↔ Merchant

Product ↔ Article

Article ↔ Product

Article ↔ Category

Category ↔ Parent Category

Prompt ↔ AI Agent

---

# Validation Rules

Every document must validate

- Required Fields
- Slug Uniqueness
- Relationship Integrity
- Status
- Version

Invalid documents must not be published.

---

# Version History

Every document should support

- Version Number
- Previous Version
- Updated By
- Updated Date
- Change Summary

Previous versions must remain recoverable.
# n8n Workflow Architecture

n8n is the workflow orchestration platform for ViaFinds AI OS.

It is responsible for coordinating AI Agents, external services, validation, logging, and publishing.

Business logic should remain modular and reusable.

---

# Objectives

- Automate business processes.
- Coordinate AI Agents.
- Handle errors.
- Manage workflow execution.
- Connect external services.
- Maintain scalability.

---

# Workflow Design Principles

Every workflow must

- Have a single responsibility.
- Be modular.
- Be reusable.
- Be independently testable.
- Produce logs.
- Support retries.
- Support recovery.

---

# Master Workflow

Master Workflow

↓

Receive Request

↓

Validate Input

↓

Determine Workflow Type

↓

Execute Required Sub Workflow

↓

Collect Results

↓

Quality Validation

↓

Save Draft

↓

Return Status

---

# Core Workflows

Version 1 should contain

- Product Import Workflow
- Product Intelligence Workflow
- Category Intelligence Workflow
- Product Content Workflow
- Article Intelligence Workflow
- SEO Workflow
- Image Workflow
- Affiliate Validation Workflow
- Quality Control Workflow
- Publisher Workflow
- Logging Workflow

Each workflow should operate independently.

---

# Trigger Types

Supported triggers

- Manual
- Webhook
- Scheduled
- API
- Future Queue Trigger

Version 1 primarily uses Manual triggers.

---

# Workflow Communication

Workflows should communicate using structured JSON.

Each workflow must define

- Input
- Output
- Status
- Errors

No workflow should depend on hidden data.

---

# Error Handling

Every workflow must

- Catch exceptions.
- Log errors.
- Return meaningful messages.
- Retry temporary failures.
- Stop permanent failures.

---

# Retry Policy

Temporary failures

- Network Timeout
- API Timeout
- Temporary Service Unavailable

Maximum retries

3

Permanent failures require manual review.

---

# Workflow Queue

Future versions should support queue-based execution.

Queue priorities

High

- Publishing
- Product Import

Medium

- Article Generation
- SEO

Low

- Analytics
- Reports
- Maintenance

---

# Workflow Logging

Every workflow execution must record

- Workflow ID
- Workflow Name
- Start Time
- End Time
- Duration
- Status
- Trigger Source
- Errors
- Warnings

---

# Workflow Recovery

If interrupted

- Save current state.
- Record failure.
- Allow resume from last completed step.

Restarting from the beginning should be avoided whenever possible.

---

# External Integrations

Workflows may communicate with

- Ollama
- Sanity
- Affiliate APIs
- Merchant APIs
- Search Console
- Analytics
- Notification Services

Every integration must use dedicated connector nodes.

---

# Version Control

Every workflow should maintain

- Version Number
- Last Updated
- Author
- Change Summary

Previous versions should remain recoverable.

---

# Human Approval

Version 1

Publishing workflows must always pause for manual approval before content becomes live.
# Ollama & AI Model Management

Ollama is the primary AI inference engine for Version 1 of ViaFinds AI OS.

All AI requests should be routed through the AI Management Layer instead of calling models directly.

This allows future AI providers to be added without changing the workflow architecture.

---

# Objectives

- Centralize AI requests.
- Support multiple AI models.
- Reduce operational cost.
- Improve reliability.
- Enable future AI providers.

---

# AI Management Layer

Every AI request follows

Workflow

↓

AI Management Layer

↓

Model Selection

↓

AI Execution

↓

Response Validation

↓

Return Result

No workflow should communicate directly with Ollama.

---

# Version 1 AI Provider

Primary Provider

- Ollama

Execution Mode

- Local

Internet Access

- Disabled by default

---

# Future AI Providers

The architecture should support

- OpenAI
- Anthropic
- Google Gemini
- OpenRouter
- DeepSeek
- Mistral
- Grok
- Future Local Models

Changing providers must not require workflow changes.

---

# AI Model Assignment

Each task should use the most appropriate model.

Examples

Product Intelligence

↓

Fast Model

--------------------------------

SEO

↓

Balanced Model

--------------------------------

Article Writing

↓

High Quality Model

--------------------------------

Category Intelligence

↓

Reasoning Model

--------------------------------

Quality Validation

↓

Reasoning Model

---

# AI Request Format

Every AI request should include

- Task Name
- Agent Name
- Prompt
- Input Data
- Configuration
- Expected Output Format

---

# AI Response Format

Every response should return

- Status
- Result
- Confidence Score
- Processing Time
- Errors
- Warnings

---

# AI Validation

Every AI response must be validated before use.

Validate

- JSON Structure
- Missing Fields
- Invalid Output
- Hallucinations
- Empty Responses

Invalid responses must not continue through the workflow.

---

# AI Retry Policy

Retry only for

- Timeout
- Empty Response
- Temporary Failure

Maximum Retries

3

Permanent failures require manual review.

---

# AI Prompt Loading

Prompts must be loaded from the Prompt Library.

Prompts must never be hardcoded inside

- n8n Workflows
- JavaScript Code
- API Requests

---

# AI Logging

Every AI request must record

- Request ID
- Model
- Agent
- Prompt Version
- Processing Time
- Token Usage (if available)
- Status

---

# Future Features

Future versions should support

- Automatic Model Selection
- Model Benchmarking
- Prompt Optimization
- AI Cost Analysis
- AI Performance Reports
- Multi-Model Collaboration

---

# Human Approval

Version 1

All AI-generated content must pass Quality Control and Human Approval before publication.
# Prompt Engineering Standards

The Prompt Engineering System defines how every AI Agent communicates with AI models.

Prompts are critical system assets and must be managed separately from workflows and source code.

Prompts must be reusable, versioned, and centrally managed.

---

# Objectives

- Produce consistent AI output.
- Reduce hallucinations.
- Improve maintainability.
- Simplify prompt updates.
- Support multiple AI providers.

---

# Prompt Library

All prompts must be stored in a dedicated Prompt Library.

Example

prompts/

- product-intelligence.md
- category-intelligence.md
- product-content.md
- article-intelligence.md
- seo-intelligence.md
- image-intelligence.md
- affiliate-intelligence.md
- quality-control.md
- publisher.md

No prompts should be hardcoded inside workflows.

---

# Prompt Structure

Every prompt should contain

- Prompt Name
- Purpose
- AI Agent
- Version
- Input Requirements
- Output Requirements
- Validation Rules

---

# Prompt Principles

Every prompt should

- Be clear.
- Be specific.
- Produce structured output.
- Avoid ambiguity.
- Define success criteria.
- Minimize hallucinations.

---

# Input Rules

Every prompt should clearly define

- Required Inputs
- Optional Inputs
- Expected Format
- Validation Requirements

AI must never assume missing information.

---

# Output Rules

Every prompt must return structured output.

Preferred formats

- JSON
- Markdown
- Plain Text (when appropriate)

Outputs must be predictable and easy to validate.

---

# Context Rules

The AI should receive only the context required for the current task.

Avoid unnecessary information.

Minimize prompt size while preserving quality.

---

# Prompt Versioning

Every prompt must maintain

- Version Number
- Created Date
- Updated Date
- Change Summary

Older versions must remain available for rollback.

---

# Prompt Testing

Every prompt update should be tested before deployment.

Testing should verify

- Output Quality
- Output Structure
- Accuracy
- Consistency
- Validation Compatibility

---

# Prompt Optimization

Future versions should monitor

- Prompt Performance
- AI Accuracy
- Response Time
- Failure Rate
- Hallucination Rate

Generate recommendations for prompt improvements.

---

# AI Independence

Prompts should avoid provider-specific features whenever possible.

The same prompt should work with

- Ollama
- OpenAI
- Anthropic
- Gemini
- OpenRouter

with minimal modification.

---

# Human Approval

Major prompt changes require testing and approval before becoming the active production version.
# Analytics & Business Intelligence

The Analytics & Business Intelligence Engine transforms website data into actionable business insights.

Its purpose is not only to measure performance but also to help the AI improve the website over time.

---

# Objectives

- Measure website growth.
- Measure content performance.
- Measure affiliate performance.
- Detect opportunities.
- Support business decisions.
- Improve AI recommendations.

---

# Data Sources

Version 1

- Sanity CMS
- n8n Logs
- Workflow Logs

Future

- Google Analytics
- Google Search Console
- Bing Webmaster Tools
- Affiliate Network APIs
- Merchant APIs

---

# Website Metrics

Monitor

- Total Products
- Total Articles
- Total Categories
- Published Content
- Draft Content
- Archived Content

---

# SEO Metrics

Monitor

- Organic Traffic
- Search Impressions
- Click Through Rate
- Average Position
- Indexed Pages
- Crawl Errors
- Broken Links

---

# Product Metrics

Monitor

- Product Views
- Product Clicks
- Affiliate Clicks
- Product Updates
- Product Quality Score
- Product Status

---

# Article Metrics

Monitor

- Page Views
- Reading Time
- Scroll Depth
- Internal Link Clicks
- Affiliate Link Clicks
- Update Frequency
- Quality Score

---

# Category Metrics

Monitor

- Category Views
- Product Count
- Article Count
- SEO Performance
- User Engagement

---

# Affiliate Metrics

Monitor

- Merchant Performance
- Affiliate Clicks
- Conversion Rate
- Revenue
- Commission
- Broken Affiliate Links

---

# AI Performance Metrics

Monitor

- AI Response Time
- Success Rate
- Failure Rate
- Retry Count
- Validation Failures
- Quality Scores

---

# Workflow Metrics

Monitor

- Workflow Executions
- Success Rate
- Failed Executions
- Average Duration
- Queue Size
- Recovery Events

---

# Business Reports

Generate

- Daily Report
- Weekly Report
- Monthly Report
- Quarterly Report

Reports should include

- Growth
- Problems
- Recommendations
- Opportunities

---

# AI Recommendations

Based on collected data, the AI should recommend

- New Products
- New Articles
- Category Improvements
- SEO Improvements
- Internal Linking Improvements
- Content Refresh
- Merchant Improvements

Every recommendation must include

- Confidence Score
- Business Impact
- Reason

---

# Dashboard

Future versions should include dashboards for

- Website Overview
- SEO Overview
- Product Performance
- Article Performance
- Affiliate Performance
- AI Performance
- Workflow Health
- Revenue Overview

---

# Human Approval

Analytics may generate recommendations automatically.

Business decisions remain under human control.
# Testing & Quality Assurance Framework

The Testing & Quality Assurance Framework ensures that every component of ViaFinds AI OS functions correctly before deployment.

No feature should be considered complete until it has passed all required tests.

---

# Objectives

- Prevent bugs.
- Ensure workflow reliability.
- Validate AI output.
- Maintain content quality.
- Protect production data.
- Support continuous improvement.

---

# Testing Levels

The system should support

- Unit Testing
- Integration Testing
- Workflow Testing
- AI Output Testing
- User Acceptance Testing
- Regression Testing
- Performance Testing

---

# Unit Testing

Every module should verify

- Input Validation
- Output Validation
- Error Handling
- Edge Cases

Modules must work independently.

---

# Integration Testing

Verify communication between

- n8n
- Sanity
- Ollama
- AI Agents
- External APIs
- Logging System

---

# Workflow Testing

Every workflow must verify

- Trigger
- Validation
- Business Logic
- AI Execution
- Logging
- Recovery
- Completion

No workflow should skip validation.

---

# AI Output Testing

Every AI output should be checked for

- Structure
- Completeness
- Accuracy
- Hallucinations
- Formatting
- Quality Score

Invalid AI output must not continue.

---

# Product Testing

Verify

- Product Creation
- Product Update
- Duplicate Detection
- Affiliate Link Validation
- Category Assignment
- SEO Generation

---

# Article Testing

Verify

- Structure
- Internal Links
- FAQ
- SEO
- Readability
- Duplicate Detection

---

# Category Testing

Verify

- Parent Relationship
- Level Assignment
- SEO
- Image Prompts
- Duplicate Detection

---

# Publishing Testing

Verify

- Draft Creation
- Manual Approval
- Publishing
- Rollback
- Version History

---

# Regression Testing

Before every release verify

- Existing workflows still function.
- Existing AI Agents still function.
- Existing integrations remain compatible.

No existing functionality should break.

---

# Performance Testing

Measure

- Workflow Execution Time
- AI Response Time
- Database Response Time
- Memory Usage
- CPU Usage

---

# Test Environment

Testing should be performed in a development environment before deployment to production.

Production data should never be used for testing unless explicitly approved.

---

# Test Reports

Every test execution should record

- Test Name
- Date
- Result
- Duration
- Errors
- Tester
- Version

---

# Release Requirement

A release is approved only when

- All critical tests pass.
- No critical bugs remain.
- Documentation is updated.
- Approval has been completed.

---

# Human Approval

Production deployment requires final human approval after successful testing.

# Deployment & Environment Strategy

ViaFinds AI OS must support multiple environments while maintaining consistent behavior, security, and reliability.

Every environment should have its own configuration and resources.

---

# Objectives

- Separate development from production.
- Reduce deployment risk.
- Protect production data.
- Support future scaling.
- Enable safe testing.

---

# Environments

The system should support

- Local Development
- Testing
- Staging
- Production

Each environment must have independent configuration.

---

# Version 1 Environment

Development

- Windows
- Docker Desktop
- n8n
- Ollama
- Sanity
- Local Storage

Production

- Vercel
- Sanity
- Docker Services
- External APIs

---

# Configuration Management

Each environment must maintain its own

- Environment Variables
- API Keys
- URLs
- Database Settings
- AI Configuration
- Logging Configuration

Configuration must never be hardcoded.

---

# Environment Variables

Store

- Sanity Project ID
- Sanity Dataset
- Sanity Tokens
- Ollama URL
- n8n URL
- Affiliate API Keys
- Future AI API Keys

Secrets must never be committed to Git.

---

# Deployment Pipeline

Standard deployment

Develop

↓

Test

↓

Review

↓

Approve

↓

Deploy

↓

Verify

↓

Monitor

---

# Deployment Validation

Before deployment verify

- All Tests Passed
- No Critical Errors
- Configuration Valid
- Environment Variables Present
- Documentation Updated
- Version Updated

---

# Post Deployment Validation

After deployment verify

- Website Online
- AI Available
- n8n Running
- Sanity Connected
- Workflows Running
- Logging Active
- Publishing Functional

---

# Rollback Strategy

If deployment fails

↓

Stop Deployment

↓

Restore Previous Version

↓

Verify Recovery

↓

Generate Incident Report

Rollback should preserve all production data.

---

# Monitoring

After deployment continuously monitor

- Website Availability
- AI Availability
- Workflow Health
- API Health
- Database Health
- Error Rate
- Performance

---

# Maintenance Mode

Future versions should support

- Scheduled Maintenance
- Emergency Maintenance
- Read Only Mode

Users should receive clear maintenance notifications.

---

# Disaster Recovery

Every production deployment must support

- Backup Before Deployment
- Rollback
- Recovery Validation

No deployment should risk permanent data loss.

---

# Human Approval

Production deployments require manual approval.

Automatic production deployment is not permitted in Version 1.
# Final Architecture Summary & Guiding Principles

This document is the official architecture for ViaFinds AI OS.

Every future feature, workflow, AI Agent, integration, and deployment must follow the principles defined in this document.

If future requirements conflict with this architecture, the architecture must be reviewed before implementation.

---

# Vision

Build the world's most reliable, scalable, and intelligent AI-powered affiliate business operating system.

The goal is not simply to automate content creation.

The goal is to build an intelligent platform that continuously improves itself while maintaining premium quality and full human control.

---

# Core Principles

Every decision should follow these principles.

1. User Value First

Always prioritize helping users before generating affiliate revenue.

---

2. Quality Over Quantity

Publish fewer high-quality products and articles rather than many low-quality pages.

---

3. Human Control

Version 1 always requires human approval before publishing.

The AI assists.

Humans decide.

---

4. Modular Architecture

Every component should be replaceable without rebuilding the entire system.

AI Models

Affiliate Networks

Merchant APIs

Workflows

CMS

should all be replaceable independently.

---

5. Scalability

The system should support

- Unlimited Products
- Unlimited Articles
- Unlimited Categories
- Unlimited Affiliate Networks
- Unlimited AI Providers

without requiring architectural redesign.

---

6. Reliability

Every workflow should

- Validate
- Log
- Recover
- Retry
- Report

The system must fail safely.

---

7. Maintainability

Future developers should understand the project without needing to reverse engineer the code.

Documentation is considered part of the software.

---

8. Security

Sensitive information must remain protected.

Secrets should never be exposed.

Data integrity should never be compromised.

---

9. Consistency

Products

Articles

Categories

SEO

Images

Prompts

must all follow consistent standards.

---

10. Continuous Improvement

The AI should continuously recommend improvements using

- Search Console
- Analytics
- Internal Search
- Product Performance
- Article Performance
- Affiliate Performance
- User Behaviour

The AI should improve the business without changing approved content automatically.

---

# Version 1 Mission

Version 1 delivers

- Manual Product Input
- AI Product Processing
- AI Category Assignment
- AI Product Content
- AI Article Generation
- AI SEO
- AI Image Prompt Generation
- Draft Publishing
- Human Approval

Version 1 intentionally avoids fully autonomous publishing.

---

# Long-Term Mission

ViaFinds AI OS should evolve into an intelligent business platform capable of

- Managing Products
- Managing Articles
- Managing SEO
- Managing Taxonomy
- Managing Affiliate Partnerships
- Discovering Growth Opportunities
- Improving User Experience
- Supporting Business Decisions

while remaining transparent, maintainable, secure, and fully controllable.

---

# Single Source of Truth

This document is the authoritative reference for

- System Architecture
- Development Standards
- Workflow Design
- AI Behaviour
- Business Rules
- Future Development

When uncertainty exists, this document takes precedence.

---

# End of Document

Version: 1.0

Status: Architecture Complete

Project: ViaFinds AI OS

Architecture Owner: ViaFinds

Document Type: Master Architecture

This document serves as the foundation for all future development of ViaFinds AI OS.
# Universal Product Object (UPO)

The Universal Product Object (UPO) is the canonical product format used throughout ViaFinds AI OS.

Every product, regardless of its source, must be converted into this standard structure before entering the AI pipeline.

This ensures that all AI Agents work with identical data regardless of whether the product originates from

- Manual Entry
- Affiliate API
- CSV Feed
- XML Feed
- JSON Feed
- Merchant API
- Future Connectors

No AI Agent should receive raw merchant data.

---

# Objectives

- Standardize product data.
- Eliminate merchant-specific logic.
- Simplify AI processing.
- Improve scalability.
- Support unlimited affiliate networks.

---

# Product Flow

Merchant Data

↓

Connector

↓

Data Validation

↓

Universal Product Object

↓

AI Pipeline

↓

Sanity CMS

---

# Required Fields

Every Universal Product Object must contain

## Identity

- Product ID
- External Product ID
- Merchant ID
- Merchant Name
- Affiliate Network
- Source Type

---

## Product Information

- Product Name
- Brand
- Manufacturer
- Model
- Short Description
- Long Description
- Key Features
- Specifications

---

## Pricing

- Currency
- Current Price
- Original Price
- Discount
- Availability
- Stock Status

---

## Affiliate

- Affiliate Link
- Original Product URL
- Tracking Status
- Cookie Duration
- Commission Type

---

## Media

- Featured Image
- Gallery Images
- Product Videos
- Image Alt Text

---

## Taxonomy

- Parent Category
- Level 2
- Level 3
- Level 4
- Level 5
- Tags

---

## SEO

- Suggested SEO Title
- Suggested Meta Description
- Suggested Keywords
- Suggested Slug

---

## Metadata

- Date Imported
- Date Updated
- Language
- Country
- Source Version

---

## AI Fields

These fields are generated by AI.

- AI Summary
- Buying Recommendation
- Quality Score
- Category Confidence
- SEO Score
- Content Status
- Publishing Status

---

# Validation Rules

Every Universal Product Object must validate

- Required Fields
- Valid URLs
- Duplicate Detection
- Image Availability
- Affiliate Link Validation
- Merchant Validation
- Category Validation

Invalid objects must never enter the AI pipeline.

---

# Merchant Independence

Affiliate-specific fields should never be used directly by AI Agents.

Merchant-specific formats must always be converted into the Universal Product Object before processing.

---

# Future Compatibility

Every future connector must map its product data into the Universal Product Object without modifying any AI Agent.

This guarantees long-term scalability regardless of future affiliate networks or merchant APIs.
# Agent-to-Agent Communication Protocol

The Agent-to-Agent Communication Protocol defines how AI Agents exchange information within ViaFinds AI OS.

No AI Agent should communicate directly using raw text.

All communication must use structured data.

This ensures consistency, reliability, scalability, and easier debugging.

---

# Objectives

- Standardize communication.
- Prevent information loss.
- Improve debugging.
- Support future AI providers.
- Enable independent AI Agents.

---

# Communication Flow

Input

↓

Agent Processing

↓

Structured Output

↓

Validation

↓

Next Agent

↓

Validation

↓

Continue Pipeline

---

# Communication Rules

Every AI Agent must

- Receive structured input.
- Validate received data.
- Never modify unrelated fields.
- Produce structured output.
- Include execution metadata.
- Return processing status.

---

# Standard Message Structure

Every message exchanged between agents must contain

## Header

- Message ID
- Workflow ID
- Agent Name
- Previous Agent
- Next Agent
- Timestamp
- Version

---

## Payload

Contains only business data required for the next agent.

Examples

- Product Data
- Category Data
- SEO Data
- Article Data
- Quality Scores

Agents must not send unnecessary information.

---

## Metadata

Every message should include

- Confidence Score
- Processing Time
- AI Model
- Prompt Version
- Retry Count

---

## Status

Possible values

- Success
- Warning
- Failed
- Needs Review

---

## Errors

If an error occurs

Return

- Error Code
- Error Message
- Suggested Resolution

---

# Communication Standards

Communication must use

- JSON
- UTF-8 Encoding
- Standard Field Names

No custom formats.

---

# Validation

Before sending data

Validate

- Required Fields
- Data Types
- Empty Values
- Duplicate IDs
- Status

Invalid messages must never be forwarded.

---

# Confidence Score

Each AI Agent should include

Confidence

0–100

Example

Category Agent

Confidence

96

Meaning

The AI is 96% confident in the category assignment.

---

# AI Independence

Agents should never depend on

- Internal memory of another agent.
- Hidden prompts.
- Previous conversation.

Every required input must exist inside the message.

---

# Agent Pipeline

Example

Product Intelligence Agent

↓

Category Intelligence Agent

↓

Product Content Agent

↓

Article Intelligence Agent

↓

SEO Intelligence Agent

↓

Image Intelligence Agent

↓

Quality Control Agent

↓

Publisher Agent

Each agent should only know

- Its own task
- The received input
- The expected output

---

# Message Logging

Every message should be logged.

Store

- Message ID
- Sender
- Receiver
- Workflow ID
- Status
- Processing Time
- Confidence Score

---

# Future Compatibility

The communication protocol must remain compatible with

- Local AI Models
- Cloud AI Models
- Multi-Agent Collaboration
- Future AI Providers

Changing an AI model must not require changing the communication protocol.

---

# Human Approval

Messages marked

Needs Review

must stop the workflow until manual approval is completed.
# Universal Quality Score (UQS)

The Universal Quality Score (UQS) is the centralized quality evaluation system used throughout ViaFinds AI OS.

Every Product, Article, Category, SEO Asset, and AI Output must receive a quality score before it can proceed to the next workflow stage.

No content may be published without passing the required quality threshold.

---

# Objectives

- Maintain premium quality.
- Standardize quality evaluation.
- Prevent poor AI output.
- Improve consistency.
- Support future automation.

---

# Universal Scoring Scale

Every item receives a score between

0 – 100

Meaning

0–39

Critical Failure

Reject immediately.

--------------------------------

40–59

Poor

Requires regeneration.

--------------------------------

60–79

Acceptable

Needs manual review.

--------------------------------

80–89

Good

Suitable for draft approval.

--------------------------------

90–100

Premium

Ready for publishing after human approval.

---

# Product Quality Score

Evaluate

- Product Title
- Description
- Features
- Specifications
- Affiliate Link
- Images
- Category Assignment
- SEO Metadata
- Brand Information
- Duplicate Detection

Generate one final Product Quality Score.

---

# Article Quality Score

Evaluate

- Readability
- Grammar
- Structure
- Accuracy
- Internal Linking
- Product Integration
- SEO
- User Value
- FAQ Quality
- Conclusion

Generate one final Article Quality Score.

---

# Category Quality Score

Evaluate

- Correct Parent
- Correct Level
- Naming Consistency
- SEO
- Description
- Duplicate Detection
- Taxonomy Compliance

Generate one final Category Quality Score.

---

# SEO Quality Score

Evaluate

- Meta Title
- Meta Description
- URL Slug
- Keyword Usage
- Heading Structure
- Internal Links
- Canonical Rules
- Structured Data

Generate one final SEO Quality Score.

---

# Image Quality Score

Evaluate

- Prompt Quality
- Relevance
- Category Match
- Product Match
- Visual Clarity
- Branding Consistency

Generate one final Image Quality Score.

---

# AI Output Score

Every AI Agent should evaluate

- Completeness
- Accuracy
- Consistency
- Confidence
- Formatting
- Validation

Generate one AI Output Score.

---

# Website Quality Dashboard

Future versions should display

- Average Product Score
- Average Article Score
- Average Category Score
- Average SEO Score
- Average AI Score
- Overall Website Quality Score

---

# Automatic Decisions

Score

90+

↓

Continue Automatically

--------------------------------

80–89

↓

Save Draft

--------------------------------

60–79

↓

Human Review Required

--------------------------------

Below 60

↓

Reject and Regenerate

---

# Continuous Improvement

Quality scores should improve over time using

- Search Console
- User Behaviour
- Internal Search
- Analytics
- Human Feedback
- AI Performance Reports

---

# Quality History

Every quality evaluation must store

- Item ID
- Workflow ID
- AI Agent
- Score
- Timestamp
- Version
- Evaluation Criteria

Historical quality scores must never be deleted.

---

# Final Principle

The Universal Quality Score is the final gatekeeper before any content moves toward publishing.

Quality always takes priority over speed or automation.
# AI Memory System

The AI Memory System provides persistent business knowledge for ViaFinds AI OS.

Its purpose is not to remember conversations but to remember the business, website, taxonomy, quality standards, and historical decisions.

AI Memory enables better consistency, smarter recommendations, and continuous improvement.

---

# Objectives

- Maintain consistent decisions.
- Prevent repetitive work.
- Preserve business knowledge.
- Improve AI recommendations.
- Support long-term learning.

---

# Memory Types

The AI Memory System consists of five layers.

- Session Memory
- Workflow Memory
- Business Memory
- Knowledge Memory
- Learning Memory

Each layer has a specific purpose.

---

# Session Memory

Session Memory exists only while a workflow is running.

Examples

- Current Product
- Current Article
- Current Category
- Current Workflow State
- Current AI Outputs

Session Memory is cleared when the workflow completes.

---

# Workflow Memory

Workflow Memory stores temporary execution data.

Examples

- Workflow ID
- Completed Steps
- Failed Steps
- Retry Count
- Validation Results
- Processing Status

Used for workflow recovery.

---

# Business Memory

Business Memory stores permanent knowledge about ViaFinds.

Examples

- Website Structure
- Parent Categories
- Approved Categories
- Merchant Database
- Brand Database
- Affiliate Networks
- Business Rules
- Publishing Rules
- SEO Rules

Business Memory should remain consistent across all AI Agents.

---

# Knowledge Memory

Knowledge Memory stores reusable information.

Examples

- Prompt Library
- Writing Standards
- Image Standards
- SEO Standards
- Taxonomy Standards
- Category Naming Rules
- Internal Linking Rules

Every AI Agent should consult Knowledge Memory before generating output.

---

# Learning Memory

Learning Memory stores historical performance.

Examples

- Search Console Keywords
- Search Volume Trends
- Internal Search Queries
- Product Performance
- Article Performance
- Category Performance
- Affiliate Performance
- Human Feedback
- Quality Scores

Learning Memory is used to improve future recommendations.

---

# Memory Sources

The AI may learn from

- Sanity CMS
- n8n Logs
- Search Console
- Google Analytics
- Internal Website Search
- Quality Reports
- Approval History
- Business Reports

The AI must never invent memory.

---

# Memory Rules

The AI must

- Use factual stored knowledge.
- Never overwrite approved business rules automatically.
- Never delete memory without approval.
- Validate memory before use.

---

# Memory Updates

Business Memory may only be updated through

- Human Approval
- Approved Workflow
- Administrator Action

Learning Memory updates automatically from analytics and performance data.

---

# Memory Usage

Before making important decisions the AI should consult

1. Business Memory
2. Knowledge Memory
3. Learning Memory

Current workflow data should always take precedence over historical information.

---

# Memory Privacy

The AI must never expose

- API Keys
- Tokens
- Credentials
- Private Configuration
- Internal Logs
- Sensitive Business Information

Memory should only contain information required for business operations.

---

# Future Vision

Future versions should allow the AI to become increasingly intelligent by learning from historical business performance while always respecting approved business rules and maintaining human oversight.
# Universal Event System

The Universal Event System (UES) is the central communication mechanism for ViaFinds AI OS.

Every important action performed by the system must generate an event.

Events allow workflows, AI Agents, monitoring systems, analytics, dashboards, and future plugins to react without tightly coupling components.

The system should become event-driven wherever possible.

---

# Objectives

- Decouple system components.
- Improve scalability.
- Improve monitoring.
- Enable future automation.
- Simplify debugging.
- Support plugins.

---

# Event Lifecycle

Action Occurs

↓

Generate Event

↓

Validate Event

↓

Store Event

↓

Notify Subscribers

↓

Execute Follow-up Actions

↓

Log Completion

---

# Standard Event Structure

Every event must contain

## Event Information

- Event ID
- Event Name
- Event Type
- Event Version
- Timestamp
- Workflow ID

---

## Source

- AI Agent
- Workflow
- User
- API
- Scheduled Task

---

## Target

- Product
- Article
- Category
- Merchant
- Workflow
- Configuration
- Plugin

---

## Payload

Contains structured business data required by subscribers.

---

## Status

Possible values

- Pending
- Processing
- Completed
- Failed
- Cancelled

---

# Core Events

## Product Events

- Product Imported
- Product Created
- Product Updated
- Product Validated
- Product Approved
- Product Published
- Product Archived

---

## Article Events

- Article Generated
- Article Updated
- Article Approved
- Article Published
- Article Archived

---

## Category Events

- Category Suggested
- Category Created
- Category Updated
- Category Approved
- Category Merged
- Category Split

---

## SEO Events

- SEO Generated
- SEO Updated
- SEO Validated
- SEO Approved

---

## AI Events

- AI Request Started
- AI Request Completed
- AI Validation Passed
- AI Validation Failed
- AI Retry Started

---

## Workflow Events

- Workflow Started
- Workflow Paused
- Workflow Resumed
- Workflow Completed
- Workflow Failed

---

## System Events

- Configuration Updated
- Backup Created
- Recovery Started
- Recovery Completed
- Plugin Installed
- Plugin Updated

---

# Event Subscribers

Future subscribers may include

- Analytics
- Dashboard
- Notification System
- Reporting Engine
- Plugin Manager
- Audit Logger
- Business Intelligence Engine

Subscribers should never modify the original event.

---

# Event Logging

Every generated event must record

- Event ID
- Timestamp
- Source
- Target
- Status
- Processing Time
- Related Workflow
- Related User (if applicable)

---

# Event Storage

Events should be stored in chronological order.

Future versions should support

- Event Search
- Event Filtering
- Event Replay
- Event History

---

# Event Rules

Events should be

- Immutable
- Traceable
- Versioned
- Auditable

Once created, an event should never be modified.

---

# Future Vision

The Universal Event System should become the backbone of ViaFinds AI OS, allowing every workflow, AI Agent, plugin, analytics service, and future integration to communicate efficiently without direct dependencies.
# AI Cost Optimization

The AI Cost Optimization Engine ensures that ViaFinds AI OS delivers the highest possible content quality while minimizing AI computation, API usage, and operational cost.

Version 1 uses Ollama locally, but the architecture must support future cloud AI providers without changing workflows.

The system should always choose the most efficient solution before using additional AI resources.

---

# Objectives

- Reduce AI costs.
- Minimize unnecessary AI calls.
- Improve response speed.
- Maximize hardware efficiency.
- Support multiple AI providers.
- Scale economically.

---

# AI Provider Priority

When processing a task, the system should use providers in the following order.

Priority 1

Local AI (Ollama)

↓

Priority 2

Cached Results

↓

Priority 3

Cloud AI (if enabled)

↓

Priority 4

Human Review

The system should never use expensive cloud AI when a local model can perform the task successfully.

---

# Model Selection

Different tasks require different models.

Simple Tasks

- Text Cleaning
- Grammar Fixes
- JSON Formatting
- Metadata Generation

↓

Fast Local Model

---

Medium Tasks

- Product Description
- SEO Metadata
- Category Suggestions

↓

Balanced Local Model

---

Complex Tasks

- Buying Guides
- Long Articles
- Comparison Articles
- Advanced Reasoning

↓

Best Available Model

Local first.

Cloud only if required.

---

# AI Cache

Before calling an AI model, check whether an equivalent result already exists.

Examples

- Product already processed.
- SEO already generated.
- Article already exists.
- Image prompt already generated.

If cached content is valid, reuse it.

Do not regenerate unnecessarily.

---

# Duplicate AI Detection

Prevent repeated AI requests for

- Same Product
- Same Article
- Same Category
- Same Prompt
- Same SEO Task

The AI should reuse existing high-quality output whenever possible.

---

# Incremental Processing

When updating content

Do not regenerate the entire document.

Only regenerate the sections that changed.

Examples

- Update Specifications
- Update Price
- Update FAQ
- Update SEO

Leave unchanged sections intact.

---

# Batch Processing

When possible

Group similar AI tasks together.

Examples

- SEO Generation
- Product Validation
- Category Validation

This reduces processing overhead.

---

# AI Retry Policy

Retry only for

- Timeout
- Temporary Failure
- Empty Response

Maximum Retries

3

Do not retry permanently invalid requests.

---

# Prompt Optimization

Prompts should

- Be concise.
- Avoid repetition.
- Include only required context.
- Exclude irrelevant information.

Smaller prompts improve speed and reduce resource usage.

---

# Resource Monitoring

Continuously monitor

- CPU Usage
- RAM Usage
- GPU Usage (if available)
- AI Response Time
- Queue Length
- Average Processing Time

Future versions should dynamically adjust workload based on available resources.

---

# Cloud AI Policy

If cloud AI providers are enabled

The system should

- Prefer the cheapest suitable model.
- Use premium models only for complex reasoning.
- Limit unnecessary API calls.
- Track usage statistics.
- Monitor operational cost.

Cloud AI usage should always be configurable.

---

# Cost Analytics

Future versions should report

- Local AI Usage
- Cloud AI Usage
- Average Processing Time
- Cache Hit Rate
- Estimated Cost Savings
- Total AI Requests

These reports help optimize long-term operational efficiency.

---

# Human Approval

Major AI configuration changes, provider changes, or cost-control policies require administrator approval before becoming active.

---

# Final Principle

The system should always achieve the required quality using the lowest practical computational cost.

Quality comes first.

Efficiency comes second.

Unnecessary AI computation should always be avoided.
# Plugin & Extension System

The Plugin & Extension System allows ViaFinds AI OS to grow without modifying the core architecture.

Every new integration should be added as an independent plugin.

The core system should remain unchanged regardless of how many plugins are installed.

---

# Objectives

- Keep the core architecture stable.
- Add new features without modifying existing code.
- Support unlimited integrations.
- Simplify maintenance.
- Enable future expansion.

---

# Plugin Principles

Every plugin must

- Be independent.
- Be modular.
- Have a single responsibility.
- Follow project standards.
- Support versioning.
- Generate logs.
- Support configuration.

Plugins must never modify the core system directly.

---

# Plugin Categories

The system should support the following plugin types.

## Affiliate Plugins

Examples

- Amazon Associates
- Impact
- CJ Affiliate
- Awin
- ShareASale
- Rakuten
- PartnerStack
- ClickBank

Each plugin converts merchant data into the Universal Product Object.

---

## Merchant Plugins

Examples

- LEGO
- Nike
- Best Buy
- Walmart
- Etsy
- eBay

Merchant-specific logic belongs only inside merchant plugins.

---

## AI Provider Plugins

Examples

- Ollama
- OpenAI
- Anthropic
- Google Gemini
- OpenRouter
- DeepSeek
- Mistral
- Grok

Changing providers must not affect workflows.

---

## Analytics Plugins

Examples

- Google Analytics
- Google Search Console
- Bing Webmaster Tools
- Microsoft Clarity

Analytics plugins provide insights but do not modify business data.

---

## Notification Plugins

Examples

- Email
- Telegram
- Discord
- Slack
- WhatsApp
- Microsoft Teams

Notifications should subscribe to system events.

---

## Storage Plugins

Examples

- Google Drive
- Dropbox
- OneDrive
- Amazon S3
- Cloudflare R2

Used for backups, images, exports, and archives.

---

## Social Plugins (Future)

Examples

- Pinterest
- Facebook
- Instagram
- X
- LinkedIn
- YouTube
- TikTok

These plugins are optional and independent from the website.

---

## Payment Plugins (Future)

Examples

- Stripe
- PayPal
- Paddle
- Lemon Squeezy

Used only if future business models require payments.

---

# Plugin Lifecycle

Plugin Installed

↓

Plugin Configured

↓

Plugin Validated

↓

Plugin Enabled

↓

Plugin Running

↓

Plugin Updated

↓

Plugin Disabled

↓

Plugin Removed

---

# Plugin Configuration

Every plugin must contain

- Plugin Name
- Version
- Author
- Configuration
- Permissions
- Dependencies
- Status

---

# Plugin Validation

Before activation verify

- Required Configuration
- API Connection
- Authentication
- Version Compatibility
- Dependencies

Invalid plugins must remain disabled.

---

# Plugin Permissions

Plugins should receive only the permissions they require.

Examples

Read Only

Read + Write

Publishing

Analytics

Notifications

Administrator Approval Required

Least privilege should always be applied.

---

# Plugin Logging

Every plugin should generate logs including

- Installation
- Updates
- Errors
- API Requests
- Status Changes
- Performance

---

# Plugin Versioning

Every plugin must maintain

- Version Number
- Release Date
- Change Log
- Compatibility Version

Older versions should remain recoverable.

---

# Future Marketplace

Future versions may include a Plugin Marketplace where administrators can install, update, or remove supported plugins without changing the core system.

---

# Final Principle

The core of ViaFinds AI OS should remain small, stable, and maintainable.

Every new capability should be added through plugins whenever possible rather than modifying the core architecture.