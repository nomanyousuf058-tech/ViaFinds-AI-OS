# ADDITIONAL REQUIREMENT — SOCIAL PLATFORM API FALLBACK

The social-media automation system MUST NOT depend on having an API for every platform.

Today I may not have API access for every social platform.

Therefore, the architecture must support TWO publishing modes.

## MODE 1 — AUTOMATIC API PUBLISHING

When a platform has a working, configured, authorized API:

The system can:

1. Generate platform-specific content.
2. Generate/select required media.
3. Validate the content.
4. Schedule or publish through the API.
5. Record the publishing result.
6. Store the platform post ID/URL where available.
7. Track publishing status and errors.

Examples may include platforms such as:

* Pinterest
* Instagram
* Facebook
* X/Twitter
* Reddit
* YouTube
* TikTok
* LinkedIn
* other supported platforms

Do NOT assume every platform has the required API access.

Verify the actual integration capability before enabling automatic publishing.

---

# MODE 2 — MANUAL PUBLISHING FALLBACK

If a platform does NOT have:

* an API
* valid API credentials
* required permissions
* an available automation integration
* a working connection
* or an API that supports the required publishing action

the automation MUST NOT fail.

Instead, generate a **Manual Publishing Package**.

The dashboard should clearly show:

### Platform

Example:

Instagram

### Publishing status

Manual publishing required

### Content

Show the complete final content exactly as intended for that platform.

### Media

Show the actual generated/selected media.

### Caption

Provide the final platform-specific caption.

### Hashtags

Provide the recommended hashtags.

### Title

Where the platform requires a title.

### Description

Where appropriate.

### Link

Show the destination URL.

### Affiliate link

Where appropriate and allowed.

### Call to action

Show the final CTA.

### Publishing instructions

Provide concise instructions for the administrator.

---

# DOWNLOAD / COPY OPTIONS

For every manually published social item, the dashboard should provide useful actions such as:

* Copy Caption
* Copy Full Post
* Copy Hashtags
* Copy Link
* Copy Everything
* Download Media
* Download Publishing Package
* Mark as Published
* Mark as Skipped
* Remove
* Archive

Where useful, provide a downloadable package containing:

* media
* caption
* hashtags
* title
* description
* link
* publishing instructions

Do NOT require the administrator to manually reconstruct the post from separate fields.

---

# MANUAL PUBLISHING STATUS

The dashboard should support statuses such as:

* Draft
* Ready
* Waiting for API
* Manual Publishing Required
* Copied
* Downloaded
* Published Manually
* Published Automatically
* Failed
* Skipped
* Archived

The administrator should be able to change the status after manually publishing.

For example:

Generated → Manual Publishing Required → Copy/Download → Published Manually → Mark as Published

---

# PLATFORM CAPABILITY REGISTRY

Create an abstraction for platform capabilities.

The system should know whether a platform supports:

* trend collection
* content generation
* media publishing
* text publishing
* video publishing
* scheduling
* analytics
* link publishing
* API authentication

Do NOT hard-code assumptions throughout the application.

Use a platform capability/provider adapter structure.

Example conceptual model:

Platform
→ capabilities
→ API connection
→ publishing mode
→ fallback mode

---

# API AVAILABILITY SHOULD NOT BREAK AUTOMATION

If Instagram API is unavailable but Reddit API works:

Instagram:

Manual Publishing Package

Reddit:

Automatic Publishing

The overall marketing automation continues.

If X/Twitter API credentials are missing:

X/Twitter:

Manual Publishing Package

The system must NOT mark the entire marketing workflow as failed simply because one platform cannot automatically publish.

---

# DASHBOARD VISIBILITY

The administrator should be able to clearly see:

| Platform   | API       | Status         | Publishing Mode |
| ---------- | --------- | -------------- | --------------- |
| Platform A | Available | Connected      | Automatic       |
| Platform B | Missing   | Not configured | Manual          |
| Platform C | Error     | Failed         | Manual          |
| Platform D | Available | Healthy        | Automatic       |

Use actual system state.

Do not invent API availability.

---

# CLEANUP REQUIREMENT

The dashboard must remain clean.

Generated trend results, product opportunities, tool opportunities, blog ideas, social posts and manual publishing packages should NOT remain permanently cluttering active views.

Provide actions such as:

* Remove
* Delete
* Archive
* Dismiss
* Mark as Used
* Mark as Published

The exact behavior must follow the database/architecture rules.

IMPORTANT:

Do not permanently delete important business history simply to clean the dashboard.

Prefer:

ACTIVE → USED/COMPLETED → ARCHIVED

where historical records are valuable.

Use permanent Delete only where appropriate and authorized.

---

# MANUAL CONTENT LIFECYCLE

For social content without API access:

Trend
→ Content Strategy
→ Platform Content
→ Media
→ Manual Publishing Package
→ Copy/Download
→ Administrator publishes manually
→ Mark as Published
→ Remove from active queue / Archive

For platforms with API access:

Trend
→ Content Strategy
→ Platform Content
→ Media
→ API Publishing
→ Published
→ Performance Tracking
→ Archive when appropriate

Both paths must coexist in the same architecture.

---

# IMPORTANT FUTURE-PROOFING RULE

When I later obtain an API for a currently manual platform:

I should only need to:

1. Add credentials/configuration.
2. Enable the platform integration.
3. Configure permissions/capabilities.
4. Test the connection.

I should NOT need to redesign the marketing/content architecture.

Therefore:

CONTENT GENERATION MUST BE SEPARATED FROM PUBLISHING.

The content engine creates the platform-specific publishing package.

The platform adapter decides whether it can:

* publish automatically

OR

* provide the manual publishing package.

This separation is mandatory.
