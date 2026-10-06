# 01 - Search Provider Diagnosis

## Google Custom Search Analysis

**Issue:** The Google Custom Search API returns `403 Forbidden` for all queries.

**Findings:**
1. **API Key & Engine ID:** Both are configured and syntactically valid in `.env.local`.
2. **Endpoint:** `https://www.googleapis.com/customsearch/v1`
3. **Response Body:**
```json
{
  "error": {
    "code": 403,
    "message": "Requests from referer <empty> are blocked.",
    "status": "PERMISSION_DENIED",
    "details": [
      {
        "reason": "API_KEY_HTTP_REFERRER_BLOCKED",
        "domain": "googleapis.com"
      }
    ]
  }
}
```
4. **Referer Tests:** We tested server-side requests with `<empty>`, `https://viafinds.com`, and `http://localhost:3000` as the `Referer` header. All were explicitly blocked by the Google Cloud API Gateway.

**Diagnosis:** 
The API Key (`GOOGLE_CUSTOM_SEARCH_API_KEY`) is locked down with strict HTTP Referrer restrictions in the Google Cloud Console. However, server-side API requests (like those made by the Node.js backend) do not natively send browser referrers, and spoofing the referrers did not bypass the restriction (likely due to missing IP allowlisting or a mismatched wildcard pattern). 

**Conclusion:** 
**NOT REPAIRABLE IN CODE**. This requires an infrastructure change (modifying the API Key restrictions in Google Cloud Console to allow IP-based requests or removing the HTTP Referrer restriction entirely). Until the key is updated, Google Custom Search cannot be used for server-side research.

## Alternative: SerpAPI

SerpAPI is completely missing an API key in `.env.local` (`SERPAPI_API_KEY=`). 

**Overall Search Status:** The application currently has ZERO functional search providers.
