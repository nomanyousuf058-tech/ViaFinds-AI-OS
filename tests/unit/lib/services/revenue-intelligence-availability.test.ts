/**
 * PART 2 — REGRESSION TESTS: Revenue Data Semantics (UNAVAILABLE != ZERO)
 *
 * These tests verify that the DataAvailability model correctly distinguishes
 * an observed zero from an unavailable measurement. They must never fabricate
 * production data — sensor activity is set explicitly per test case.
 */
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { DataAvailabilityChecker } from '@/lib/services/revenue-intelligence';

describe('DataAvailabilityChecker', () => {
  beforeEach(() => {
    delete process.env.AFFILIATE_CONVERSION_SENSOR;
    delete process.env.AFFILIATE_REVENUE_SENSOR;
    delete process.env.DIGISTORE24_API_KEY;
    delete process.env.REVENUE_LEDGER_ENABLED;
  });

  describe('clickAvailability', () => {
    it('reports OBSERVED_ZERO when the click sensor is active and 0 clicks recorded', () => {
      const result = DataAvailabilityChecker.clickAvailability();
      expect(result.availability).toBe('OBSERVED_ZERO');
      expect(result.value).toBe(0);
      expect(result.reason).toContain('active');
    });

    it('reports click sensor as active', () => {
      expect(DataAvailabilityChecker.clickSensorActive()).toBe(true);
    });
  });

  describe('conversionAvailability — sensor inactive (production default)', () => {
    it('reports UNAVAILABLE when no conversion sensor is configured', () => {
      const result = DataAvailabilityChecker.conversionAvailability(0);
      expect(result.availability).toBe('UNAVAILABLE');
      expect(result.value).toBe(0);
      expect(result.reason).toContain('UNAVAILABLE');
      expect(result.reason).toContain('not zero');
    });

    it('reports UNAVAILABLE even when conversionCount is non-zero (sensor inactive)', () => {
      const result = DataAvailabilityChecker.conversionAvailability(5);
      expect(result.availability).toBe('UNAVAILABLE');
    });

    it('reports conversion sensor as inactive by default', () => {
      expect(DataAvailabilityChecker.isConversionSensorActive()).toBe(false);
    });
  });

  describe('conversionAvailability — sensor active (test/stub only)', () => {
    beforeEach(() => {
      process.env.AFFILIATE_CONVERSION_SENSOR = 'active';
    });

    it('reports OBSERVED_ZERO when sensor is active and 0 conversions', () => {
      const result = DataAvailabilityChecker.conversionAvailability(0);
      expect(result.availability).toBe('OBSERVED_ZERO');
      expect(result.value).toBe(0);
      expect(result.reason).toContain('active');
    });

    it('reports OBSERVED_VALUE when sensor is active and conversions exist', () => {
      const result = DataAvailabilityChecker.conversionAvailability(10);
      expect(result.availability).toBe('OBSERVED_VALUE');
      expect(result.value).toBe(10);
    });
  });

  describe('revenueAvailability — sensor inactive (production default)', () => {
    it('reports UNAVAILABLE when no revenue sensor is configured', () => {
      const result = DataAvailabilityChecker.revenueAvailability(0);
      expect(result.availability).toBe('UNAVAILABLE');
      expect(result.value).toBe(0);
      expect(result.reason).toContain('UNAVAILABLE');
    });

    it('reports UNAVAILABLE even when revenue is non-zero (sensor inactive)', () => {
      const result = DataAvailabilityChecker.revenueAvailability(500);
      expect(result.availability).toBe('UNAVAILABLE');
    });

    it('reports revenue sensor as inactive by default', () => {
      expect(DataAvailabilityChecker.isRevenueSensorActive()).toBe(false);
    });
  });

  describe('revenueAvailability — sensor active (test/stub only)', () => {
    beforeEach(() => {
      process.env.AFFILIATE_REVENUE_SENSOR = 'active';
    });

    it('reports OBSERVED_ZERO when sensor is active and 0 revenue', () => {
      const result = DataAvailabilityChecker.revenueAvailability(0);
      expect(result.availability).toBe('OBSERVED_ZERO');
    });

    it('reports OBSERVED_VALUE when sensor is active and revenue exists', () => {
      const result = DataAvailabilityChecker.revenueAvailability(250);
      expect(result.availability).toBe('OBSERVED_VALUE');
    });
  });

  describe('CASE A: 0 clicks + conversion sensor unavailable', () => {
    it('returns NOT_VERIFIABLE / UNAVAILABLE — not zero conversions', () => {
      const conv = DataAvailabilityChecker.conversionAvailability(0);
      const rev = DataAvailabilityChecker.revenueAvailability(0);
      expect(conv.availability).toBe('UNAVAILABLE');
      expect(rev.availability).toBe('UNAVAILABLE');
      // Must NOT be OBSERVED_ZERO — that would imply a real measurement.
      expect(conv.availability).not.toBe('OBSERVED_ZERO');
      expect(rev.availability).not.toBe('OBSERVED_ZERO');
    });
  });

  describe('CASE B: real clicks + conversion sensor unavailable', () => {
    it('returns NOT_VERIFIABLE / UNAVAILABLE — not zero conversions', () => {
      const conv = DataAvailabilityChecker.conversionAvailability(0);
      expect(conv.availability).toBe('UNAVAILABLE');
      // Even with real clicks, conversion data is UNAVAILABLE.
      expect(conv.availability).not.toBe('OBSERVED_ZERO');
    });
  });

  describe('CASE C: real clicks + active conversion sensor + verified zero conversions', () => {
    beforeEach(() => {
      process.env.AFFILIATE_CONVERSION_SENSOR = 'active';
    });

    it('returns OBSERVED_ZERO — zero conversions may be reported', () => {
      const conv = DataAvailabilityChecker.conversionAvailability(0);
      expect(conv.availability).toBe('OBSERVED_ZERO');
    });
  });

  describe('CASE D: real clicks + active conversion sensor + real conversions', () => {
    beforeEach(() => {
      process.env.AFFILIATE_CONVERSION_SENSOR = 'active';
    });

    it('returns OBSERVED_VALUE — observed conversion data', () => {
      const conv = DataAvailabilityChecker.conversionAvailability(20);
      expect(conv.availability).toBe('OBSERVED_VALUE');
      expect(conv.value).toBe(20);
    });
  });

  describe('env-based sensor activation', () => {
    it('activates conversion sensor via DIGISTORE24_API_KEY', () => {
      process.env.DIGISTORE24_API_KEY = 'test-key';
      expect(DataAvailabilityChecker.isConversionSensorActive()).toBe(true);
    });

    it('activates revenue sensor via REVENUE_LEDGER_ENABLED', () => {
      process.env.REVENUE_LEDGER_ENABLED = 'true';
      expect(DataAvailabilityChecker.isRevenueSensorActive()).toBe(true);
    });
  });
});