/**
 * PART 3 — REGRESSION TESTS: Verification Confidence
 *
 * Verifies that VerificationLoop.computeVerificationConfidence derives
 * confidence from stored evidence, never from a constant. A single
 * observation can never exceed 0.5.
 */
import { describe, it, expect } from '@jest/globals';
import { VerificationLoop } from '@/lib/brain/qualityVerification';

describe('VerificationLoop.computeVerificationConfidence', () => {
  it('returns 0.0 for NOT_VERIFIABLE — nothing was observed', () => {
    const conf = VerificationLoop.computeVerificationConfidence({
      status: 'NOT_VERIFIABLE',
      expectedMetrics: { traffic: 100 },
      observedMetrics: {},
      evidenceEntries: 0,
      dataChannelsAvailable: 0,
      sampleSize: 0,
    });
    expect(conf).toBe(0.0);
  });

  it('returns 0.0 for FAIL — verification did not pass', () => {
    const conf = VerificationLoop.computeVerificationConfidence({
      status: 'FAIL',
      expectedMetrics: { traffic: 100 },
      observedMetrics: { traffic: 50 },
      evidenceEntries: 2,
      dataChannelsAvailable: 1,
      sampleSize: 5,
    });
    expect(conf).toBe(0.0);
  });

  it('caps confidence at 0.5 for a single observation', () => {
    const conf = VerificationLoop.computeVerificationConfidence({
      status: 'PASS',
      expectedMetrics: { traffic: 100 },
      observedMetrics: { traffic: 100 },
      evidenceEntries: 3,
      dataChannelsAvailable: 1,
      sampleSize: 1,
    });
    expect(conf).toBeLessThanOrEqual(0.5);
  });

  it('allows higher confidence for multiple matching observations', () => {
    const conf = VerificationLoop.computeVerificationConfidence({
      status: 'PASS',
      expectedMetrics: { traffic: 100, revenue: 50 },
      observedMetrics: { traffic: 100, revenue: 50 },
      evidenceEntries: 5,
      dataChannelsAvailable: 2,
      sampleSize: 10,
    });
    expect(conf).toBeGreaterThan(0.5);
    expect(conf).toBeLessThanOrEqual(1.0);
  });

  it('returns 0.0 when no expected metrics exist', () => {
    const conf = VerificationLoop.computeVerificationConfidence({
      status: 'PASS',
      expectedMetrics: {},
      observedMetrics: {},
      evidenceEntries: 0,
      dataChannelsAvailable: 0,
      sampleSize: 0,
    });
    expect(conf).toBe(0.0);
  });

  it('reduces confidence for PARTIAL status', () => {
    const full = VerificationLoop.computeVerificationConfidence({
      status: 'PASS',
      expectedMetrics: { traffic: 100, revenue: 50 },
      observedMetrics: { traffic: 100, revenue: 50 },
      evidenceEntries: 5,
      dataChannelsAvailable: 2,
      sampleSize: 10,
    });
    const partial = VerificationLoop.computeVerificationConfidence({
      status: 'PARTIAL',
      expectedMetrics: { traffic: 100, revenue: 50 },
      observedMetrics: { traffic: 100, revenue: 50 },
      evidenceEntries: 5,
      dataChannelsAvailable: 2,
      sampleSize: 10,
    });
    expect(partial).toBeLessThanOrEqual(0.7);
    expect(partial).toBeLessThanOrEqual(full);
  });

  it('returns 0.0 for unavailable analytics (no observed metrics)', () => {
    const conf = VerificationLoop.computeVerificationConfidence({
      status: 'PASS',
      expectedMetrics: { traffic: 100, revenue: 50 },
      observedMetrics: {},
      evidenceEntries: 0,
      dataChannelsAvailable: 0,
      sampleSize: 0,
    });
    expect(conf).toBe(0.0);
  });

  it('returns 0.0 for real execution verification with no observed data', () => {
    const conf = VerificationLoop.computeVerificationConfidence({
      status: 'PASS',
      expectedMetrics: { actions: 5 },
      observedMetrics: {},
      evidenceEntries: 0,
      dataChannelsAvailable: 0,
      sampleSize: 0,
    });
    expect(conf).toBe(0.0);
  });

  it('returns 0.0 for business outcome unavailable', () => {
    const conf = VerificationLoop.computeVerificationConfidence({
      status: 'PASS',
      expectedMetrics: { revenue: 100, conversions: 5 },
      observedMetrics: {},
      evidenceEntries: 0,
      dataChannelsAvailable: 0,
      sampleSize: 0,
    });
    expect(conf).toBe(0.0);
  });

  it('is deterministic — same input yields same confidence', () => {
    const input = {
      status: 'PASS',
      expectedMetrics: { traffic: 100 },
      observedMetrics: { traffic: 100 },
      evidenceEntries: 2,
      dataChannelsAvailable: 1,
      sampleSize: 3,
    };
    const a = VerificationLoop.computeVerificationConfidence(input);
    const b = VerificationLoop.computeVerificationConfidence(input);
    expect(a).toBe(b);
  });

  it('never returns a constant regardless of input similarity', () => {
    // Two different evidence profiles must not both yield 0.8.
    const low = VerificationLoop.computeVerificationConfidence({
      status: 'PASS',
      expectedMetrics: { traffic: 100 },
      observedMetrics: {},
      evidenceEntries: 0,
      dataChannelsAvailable: 0,
      sampleSize: 0,
    });
    const high = VerificationLoop.computeVerificationConfidence({
      status: 'PASS',
      expectedMetrics: { traffic: 100, revenue: 50, conversions: 5 },
      observedMetrics: { traffic: 100, revenue: 50, conversions: 5 },
      evidenceEntries: 6,
      dataChannelsAvailable: 3,
      sampleSize: 15,
    });
    expect(low).not.toBe(high);
    expect(low).toBe(0.0);
    expect(high).toBeGreaterThan(0.5);
  });
});