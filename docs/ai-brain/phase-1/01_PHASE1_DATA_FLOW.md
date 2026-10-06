# 01 PHASE 1 DATA FLOW

## Flow of Execution

1. **Trigger**: Admin clicks "Wake Brain" in the Dashboard.
2. **API**: Request hits `POST /api/brain/wake`.
3. **Init Report**: `wakeBrain()` creates a `brain_reports` record marked `generating`.
4. **Context Building**: `buildBrainContext()` queries Supabase for:
   - Total Articles, Published Articles
   - Total Products, Jobs, Services
   - (Revenue and external Analytics are marked NOT CONNECTED in Phase 1 as they aren't fully wired up yet).
5. **Analysis**: Context is stringified and sent to `AIRouter.route()` as an `AIPromptPayload`.
   - The router uses the best available provider (e.g. Gemini).
   - Response requested is strict `JSON`.
6. **Parsing & Storage**:
   - JSON is parsed into observations, opportunities, and recommendations.
   - Saved to `brain_observations`.
   - A summary memory is pushed to `brain_memory`.
7. **Complete**: Report status is set to `completed`.
8. **UI Refresh**: Dashboard fetches the updated report and renders it.
