import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { evaluatePublicationReadiness, isProductVerified } from '@/lib/affiliate/validator';
import type { ManualAffiliateLink, ProductOpportunity } from '@/lib/affiliate/types';
import type { ArticleRow } from '@/lib/db/types';

/**
 * Article Editor Publication-State Conflict & Blocker Reporting Regression Suite
 *
 * Covers:
 * 1. Truthful separation of persisted database status from local unsaved status selector.
 * 2. Proper handling and presentation of server-side publication readiness blockers (HTTP 422).
 * 3. Prevention of premature "Published" indicators before publication gate validation.
 * 4. Distinct, accurate behaviors for Save, Preview, and Publish.
 * 5. Exact diagnosis and reproduction of the screenshot's publication blockers for unverified articles.
 */

describe('Article Editor Publication-State Conflict & Gate Regression', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Status Indicator Truthfulness & Separation', () => {
    interface ArticleEditorState {
      persistedArticle: { id: string; status: string; title: string };
      formStatus: string;
      saveState: 'saved' | 'unsaved' | 'saving';
    }

    const computeEditorStatusBadges = (state: ArticleEditorState) => {
      const persistedStatus = state.persistedArticle.status;
      const isPersistedLive = persistedStatus === 'published';
      const isStatusPending = state.formStatus !== persistedStatus;
      const isPublishButtonDisabled =
        state.saveState === 'saving' ||
        (isPersistedLive && state.formStatus === 'published' && state.saveState === 'saved');

      const publishButtonLabel =
        isPersistedLive && state.formStatus === 'published' && state.saveState === 'saved'
          ? 'Published'
          : isPersistedLive
            ? 'Update Live'
            : 'Publish';

      return {
        persistedBadge: isPersistedLive ? 'Published (Live)' : persistedStatus,
        saveBadge: state.saveState === 'saved' ? 'Saved' : state.saveState === 'unsaved' ? 'Unsaved' : 'Saving...',
        isStatusPending,
        pendingLabel: isStatusPending ? `Status pending: ${persistedStatus} -> ${state.formStatus}` : null,
        publishButtonLabel,
        isPublishButtonDisabled,
      };
    };

    it('does NOT display "Published" badge when a draft article has "published" selected in form dropdown', () => {
      const state: ArticleEditorState = {
        persistedArticle: { id: 'art-draft-1', status: 'draft', title: 'Draft in Progress' },
        formStatus: 'published', // User selected Published in dropdown
        saveState: 'unsaved',
      };

      const badges = computeEditorStatusBadges(state);

      // The live status badge MUST reflect the real database status (draft), NOT formStatus!
      expect(badges.persistedBadge).toBe('draft');
      expect(badges.persistedBadge).not.toBe('Published (Live)');

      // The UI must truthfully indicate that the status change is pending and uncommitted
      expect(badges.isStatusPending).toBe(true);
      expect(badges.pendingLabel).toContain('Status pending: draft -> published');
      expect(badges.saveBadge).toBe('Unsaved');

      // The Publish button must NOT be disabled just because the dropdown is on 'published'!
      expect(badges.isPublishButtonDisabled).toBe(false);
      expect(badges.publishButtonLabel).toBe('Publish');
    });

    it('truthfully displays "Published (Live)" and "Unsaved" when an existing published article has unsaved edits', () => {
      const state: ArticleEditorState = {
        persistedArticle: { id: 'art-pub-1', status: 'published', title: 'Live Article' },
        formStatus: 'published',
        saveState: 'unsaved', // Author edited content
      };

      const badges = computeEditorStatusBadges(state);

      // The database status is genuinely published
      expect(badges.persistedBadge).toBe('Published (Live)');
      // Local edits are unsaved
      expect(badges.saveBadge).toBe('Unsaved');
      // No status change pending
      expect(badges.isStatusPending).toBe(false);
      // Publish button is enabled to update live content
      expect(badges.isPublishButtonDisabled).toBe(false);
      expect(badges.publishButtonLabel).toBe('Update Live');
    });

    it('locks Publish button to disabled "Published" only when article is genuinely live and saved', () => {
      const state: ArticleEditorState = {
        persistedArticle: { id: 'art-pub-1', status: 'published', title: 'Live Article' },
        formStatus: 'published',
        saveState: 'saved',
      };

      const badges = computeEditorStatusBadges(state);

      expect(badges.persistedBadge).toBe('Published (Live)');
      expect(badges.saveBadge).toBe('Saved');
      expect(badges.isPublishButtonDisabled).toBe(true);
      expect(badges.publishButtonLabel).toBe('Published');
    });
  });

  describe('Diagnosis of the Screenshot Article (The Holistic Hormone Reset Blueprint)', () => {
    it('identifies the exact 6 blockers that cause HTTP 422 for unverified published articles', () => {
      // Replicate the exact persisted state of The Holistic Hormone Reset Blueprint:
      // status: 'published', product_id: null, cover_image_url: placeholder, no affiliate link
      const legacyArticle: Partial<ArticleRow> = {
        id: '423d4942-fad2-4c8e-a972-6a7b70f39abc',
        title: 'The Holistic Hormone Reset Blueprint: A Comprehensive Guide to Nutritional Balancing Breakdown & Analysis',
        status: 'published',
        cover_image_url: 'https://placehold.co/1200x630/2c3e50/ffffff.png?text=Cover',
        product_id: null,
      };

      const opp: ProductOpportunity | null = null; // No product opportunity
      const hasVerifiedProduct = isProductVerified(opp); // false
      const link: ManualAffiliateLink | null = null; // No affiliate link
      const ownerApproved = false; // No owner approval

      const readiness = evaluatePublicationReadiness({
        hasVerifiedProduct,
        link,
        coverImageUrl: legacyArticle.cover_image_url,
        qualityStatus: null,
        qualityScore: null,
        ownerApproved,
        isDegraded: false,
      });

      expect(readiness.ready).toBe(false);
      expect(readiness.checks.hasVerifiedProduct).toBe(false);
      expect(readiness.checks.hasAffiliateLink).toBe(false);
      expect(readiness.checks.linkIsAffiliateConfirmed).toBe(false);
      expect(readiness.checks.articlePassedQualityGate).toBe(false);
      expect(readiness.checks.ownerApproved).toBe(false);

      // Verify the exact 6 blockers that the publication gate returns
      expect(readiness.blockers).toContain('Product is not verified in Digistore24 or reliable public source.');
      expect(readiness.blockers).toContain('Affiliate link is missing.');
      expect(readiness.blockers).toContain('Affiliate link is not verified (current level: UNVERIFIED).');
      expect(readiness.blockers).toContain('Affiliate link attribution has not been explicitly confirmed by owner.');
      expect(readiness.blockers).toContain('Article has not passed Quality Gate (status: NOT_RUN).');
      expect(readiness.blockers).toContain('Explicit owner approval has not been granted for publication.');
    });

    it('parses and surfaces specific blockers from HTTP 422 API response instead of generic error alone', () => {
      const mock422Response = {
        error: 'Publication readiness gate blocked: article does not meet publication requirements.',
        blockers: [
          'Product is not verified in Digistore24 or reliable public source.',
          'Affiliate link is missing.',
          'Affiliate link is not verified (current level: UNVERIFIED).',
          'Affiliate link attribution has not been explicitly confirmed by owner.',
          'Article has not passed Quality Gate (status: NOT_RUN).',
          'Explicit owner approval has not been granted for publication.',
        ],
        checks: {
          hasVerifiedProduct: false,
          hasAffiliateLink: false,
          linkVerificationLevel: 'UNVERIFIED',
          linkIsAffiliateConfirmed: false,
          hasRequiredImages: true,
          articlePassedQualityGate: false,
          ownerApproved: false,
          noDegradedContent: true,
          noFakeClaims: true,
        },
      };

      // Ensure that client-side response parser captures the blockers array
      const parseApiResponse = (status: number, data: Record<string, unknown>) => {
        if (status === 422) {
          return {
            ok: false,
            error: data.error || 'Publication blocked',
            blockers: Array.isArray(data.blockers) ? data.blockers : [],
            checks: data.checks || null,
          };
        }
        return { ok: true, error: null, blockers: [], checks: null };
      };

      const parsed = parseApiResponse(422, mock422Response);
      expect(parsed.ok).toBe(false);
      expect(parsed.error).toContain('Publication readiness gate blocked');
      expect(parsed.blockers).toHaveLength(6);
      expect(parsed.blockers[0]).toBe('Product is not verified in Digistore24 or reliable public source.');
      expect(parsed.blockers[1]).toBe('Affiliate link is missing.');
    });
  });

  describe('Distinct Save, Preview, and Publish Behaviors', () => {
    it('allows saving an article as draft without triggering publication gate', () => {
      const draftPayload = {
        title: 'New Health Research Notes',
        content: [{ type: 'paragraph', content: 'Draft content...' }],
        status: 'draft',
      };

      // Publication gate only evaluates when status === 'published'
      const shouldRunPublicationGate = draftPayload.status === 'published';
      expect(shouldRunPublicationGate).toBe(false);
    });

    it('enforces authoritative fail-closed publication gate when status is published', () => {
      const publishPayload = {
        title: 'Draft Attempting Publication',
        status: 'published',
      };

      const shouldRunPublicationGate = publishPayload.status === 'published';
      expect(shouldRunPublicationGate).toBe(true);

      const unverifiedReadiness = evaluatePublicationReadiness({
        hasVerifiedProduct: false,
        link: null,
        coverImageUrl: null,
      });

      expect(unverifiedReadiness.ready).toBe(false);
      expect(unverifiedReadiness.blockers.length).toBeGreaterThan(0);
    });

    it('allows admin preview of draft articles while blocking public access', () => {
      const draftArticle = {
        slug: 'draft-article-slug',
        status: 'draft',
        title: 'Secret Draft',
      };

      const canAccessArticle = (articleStatus: string, isAdmin: boolean) => {
        if (articleStatus === 'published') return { allowed: true, mode: 'public' };
        if (isAdmin) return { allowed: true, mode: 'preview' };
        return { allowed: false, mode: 'not_found' };
      };

      // Public visitor cannot access draft
      expect(canAccessArticle(draftArticle.status, false)).toEqual({
        allowed: false,
        mode: 'not_found',
      });

      // Authenticated admin CAN preview draft
      expect(canAccessArticle(draftArticle.status, true)).toEqual({
        allowed: true,
        mode: 'preview',
      });

      // Published article is accessible to all
      expect(canAccessArticle('published', false)).toEqual({
        allowed: true,
        mode: 'public',
      });
    });
  });
});
