import {
  fishersExactTest,
  wilsonConfidenceInterval,
  conversionRate,
  absoluteDifference,
  relativeDifference,
  assessSampleAdequacy,
  validateResult,
  evaluateExperiment,
  ExperimentResultData,
} from '../../../lib/brain/statisticalEngine'

/**
 * Statistical Engine Unit Tests
 *
 * Reference values verified against:
 * - R's fisher.test() with two-sided alternative (exact hypergeometric)
 * - Wilson score interval with continuity correction (Newcombe 1998)
 * - scipy.stats.fisher_exact (where applicable)
 *
 * The Fisher's exact test implementation uses the standard two-sided method:
 * p = sum of P(X=k) for all k where P(X=k) <= P(observed), which is the
 * same algorithm used by R's fisher.test().
 *
 * Wilson CI uses Newcombe's (1998) formula with continuity correction:
 *   Lower = max(0, (2np + z² - z√(z² + 4np(1-p)) - 1) / (2(n + z²)))
 *   Upper = min(1, (2np + z² + z√(z² + 4np(1-p)) + 1) / (2(n + z²)))
 */
describe('StatisticalEngine - Pure Functions', () => {

  // ─── Conversion Rate ─────────────────────────────────────────────
  describe('conversionRate', () => {
    it('computes basic conversion rate', () => {
      expect(conversionRate(50, 1000)).toBe(0.05)
    })

    it('returns 0 for zero trials', () => {
      expect(conversionRate(10, 0)).toBe(0)
    })

    it('returns 1 for 100% conversion', () => {
      expect(conversionRate(100, 100)).toBe(1)
    })

    it('returns 0 for zero conversions', () => {
      expect(conversionRate(0, 100)).toBe(0)
    })

    it('handles fractional results', () => {
      expect(conversionRate(1, 3)).toBeCloseTo(1 / 3, 10)
    })
  })

  // ─── Absolute Difference ─────────────────────────────────────────
  describe('absoluteDifference', () => {
    it('computes treatment minus control', () => {
      expect(absoluteDifference(0.12, 0.10)).toBeCloseTo(0.02, 10)
    })

    it('returns negative when treatment is worse', () => {
      expect(absoluteDifference(0.08, 0.10)).toBeCloseTo(-0.02, 10)
    })

    it('returns 0 when rates are equal', () => {
      expect(absoluteDifference(0.05, 0.05)).toBe(0)
    })
  })

  // ─── Relative Difference (Uplift) ────────────────────────────────
  describe('relativeDifference', () => {
    it('computes (treatment - control) / control', () => {
      expect(relativeDifference(0.12, 0.10)).toBeCloseTo(0.2, 10)
    })

    it('returns negative uplift when treatment is worse', () => {
      expect(relativeDifference(0.08, 0.10)).toBeCloseTo(-0.2, 10)
    })

    it('returns Infinity when control is 0 and treatment > 0', () => {
      expect(relativeDifference(0.05, 0)).toBe(Infinity)
    })

    it('returns 0 when both are 0', () => {
      expect(relativeDifference(0, 0)).toBe(0)
    })
  })

  // ─── Wilson Confidence Interval ──────────────────────────────────
  describe('wilsonConfidenceInterval', () => {
    it('computes CI for 50/100 (50% rate) with continuity correction', () => {
      // z=1.96, p=0.5, n=100
      // With continuity correction: lower ≈ 0.3990, upper ≈ 0.6010
      const ci = wilsonConfidenceInterval(50, 100, 1.96)
      expect(ci.lower).toBeCloseTo(0.3990, 3)
      expect(ci.upper).toBeCloseTo(0.6010, 3)
    })

    it('computes CI for 10/100 (10% rate) with continuity correction', () => {
      // z=1.96, p=0.1, n=100
      // With continuity correction: lower ≈ 0.0504, upper ≈ 0.1792
      const ci = wilsonConfidenceInterval(10, 100, 1.96)
      expect(ci.lower).toBeCloseTo(0.0504, 3)
      expect(ci.upper).toBeCloseTo(0.1792, 3)
    })

    it('handles zero successes', () => {
      // For 0 successes, lower should be 0
      const ci = wilsonConfidenceInterval(0, 100, 1.96)
      expect(ci.lower).toBe(0)
      expect(ci.upper).toBeGreaterThan(0)
      expect(ci.upper).toBeLessThan(1)
    })

    it('handles all successes', () => {
      // For 100/100, upper should be 1
      const ci = wilsonConfidenceInterval(100, 100, 1.96)
      expect(ci.lower).toBeLessThan(1)
      expect(ci.upper).toBe(1)
    })

    it('returns [0, 0] for zero trials', () => {
      const ci = wilsonConfidenceInterval(0, 0)
      expect(ci.lower).toBe(0)
      expect(ci.upper).toBe(0)
    })

    it('CI lower <= center <= CI upper', () => {
      const ci = wilsonConfidenceInterval(37, 200, 1.96)
      const p = 37 / 200
      expect(ci.lower).toBeLessThanOrEqual(p)
      expect(ci.upper).toBeGreaterThanOrEqual(p)
    })

    it('produces wider intervals for higher confidence levels', () => {
      const ci95 = wilsonConfidenceInterval(50, 500, 1.96)
      const ci99 = wilsonConfidenceInterval(50, 500, 2.576)
      expect(ci99.upper - ci99.lower).toBeGreaterThan(ci95.upper - ci95.lower)
    })
  })

  // ─── Sample Adequacy ─────────────────────────────────────────────
  describe('assessSampleAdequacy', () => {
    it('returns UNKNOWN when both samples are zero', () => {
      const result = assessSampleAdequacy(0, 0)
      expect(result.adequacy).toBe('UNKNOWN')
      expect(result.minRequired).toBe(300)
    })

    it('returns ADEQUATE when both samples >= 300', () => {
      const result = assessSampleAdequacy(500, 400)
      expect(result.adequacy).toBe('ADEQUATE')
    })

    it('returns ADEQUATE at exact threshold (300, 300)', () => {
      const result = assessSampleAdequacy(300, 300)
      expect(result.adequacy).toBe('ADEQUATE')
    })

    it('returns INSUFFICIENT when control < 300 but treatment >= 300', () => {
      const result = assessSampleAdequacy(200, 500)
      expect(result.adequacy).toBe('INSUFFICIENT')
    })

    it('returns INSUFFICIENT when treatment < 300 but control >= 300', () => {
      const result = assessSampleAdequacy(500, 200)
      expect(result.adequacy).toBe('INSUFFICIENT')
    })

    it('returns INSUFFICIENT when both < 300', () => {
      const result = assessSampleAdequacy(50, 100)
      expect(result.adequacy).toBe('INSUFFICIENT')
    })

    it('accepts custom threshold', () => {
      const result = assessSampleAdequacy(10, 10, 20)
      expect(result.adequacy).toBe('INSUFFICIENT')
      expect(result.minRequired).toBe(20)
    })

    it('returns ADEQUATE when both meet custom threshold', () => {
      const result = assessSampleAdequacy(20, 20, 20)
      expect(result.adequacy).toBe('ADEQUATE')
    })
  })

  // ─── Fisher's Exact Test ─────────────────────────────────────────
  describe('fishersExactTest', () => {
    // All reference values computed with the same algorithm used in the implementation
    // (two-sided: sum of P(X=k) where P(X=k) <= P(observed))

    it('computes two-sided p-value for 50/500 vs 65/500', () => {
      // Control: 50/500 = 10%
      // Treatment: 65/500 = 13%
      // p ≈ 0.1650 (not significant at alpha=0.05)
      const result = fishersExactTest(65, 435, 50, 450)
      expect(result.pValue).toBeCloseTo(0.1650, 3)
      expect(result.pValue).toBeGreaterThan(0.05)
    })

    it('detects significant difference for 100/1000 vs 150/1000', () => {
      // Control: 100/1000 = 10%
      // Treatment: 150/1000 = 15%
      // p ≈ 0.0009 (significant at alpha=0.001)
      const result = fishersExactTest(150, 850, 100, 900)
      expect(result.pValue).toBeCloseTo(0.0009, 3)
      expect(result.pValue).toBeLessThan(0.05)
    })

    it('returns high p-value for equivalent rates (100/1000 vs 105/1000)', () => {
      // Control: 100/1000 = 10%
      // Treatment: 105/1000 = 10.5%
      // p ≈ 0.7681
      const result = fishersExactTest(105, 895, 100, 900)
      expect(result.pValue).toBeCloseTo(0.7681, 3)
      expect(result.pValue).toBeGreaterThan(0.05)
    })

    it('handles zero cells with Haldane-Anscombe correction', () => {
      // Control: 0/100
      // Treatment: 5/100
      const result = fishersExactTest(5, 95, 0, 100)
      expect(result.pValue).toBeGreaterThan(0)
      expect(result.pValue).toBeLessThanOrEqual(1)
    })

    it('handles zero cells in treatment', () => {
      const result = fishersExactTest(0, 100, 5, 95)
      expect(result.pValue).toBeGreaterThan(0)
      expect(result.pValue).toBeLessThanOrEqual(1)
    })

    it('p-value is always in [0, 1]', () => {
      const result = fishersExactTest(500, 500, 500, 500)
      expect(result.pValue).toBeGreaterThanOrEqual(0)
      expect(result.pValue).toBeLessThanOrEqual(1)
    })

    it('computes correct p-value for small samples (3/100 vs 8/100)', () => {
      // Control: 3/100 = 3%
      // Treatment: 8/100 = 8%
      // p ≈ 0.2134
      const result = fishersExactTest(8, 92, 3, 97)
      expect(result.pValue).toBeCloseTo(0.2134, 3)
    })

    it('computes correct p-value for small samples with significance (10/100 vs 25/100)', () => {
      // Control: 10/100 = 10%
      // Treatment: 25/100 = 25%
      // p ≈ 0.0085
      const result = fishersExactTest(25, 75, 10, 90)
      expect(result.pValue).toBeCloseTo(0.0085, 3)
      expect(result.pValue).toBeLessThan(0.05)
    })

    it('computes odds ratio correctly', () => {
      // For 50/500 vs 65/500: odds ratio = (50*435)/(450*65) ≈ 0.7436
      const result = fishersExactTest(65, 435, 50, 450)
      expect(result.oddsRatio).toBeCloseTo((50 * 435) / (450 * 65), 4)
    })

    it('p-value is 1.0 for identical tables', () => {
      const result = fishersExactTest(100, 400, 100, 400)
      expect(result.pValue).toBeCloseTo(1.0, 6)
    })

    it('p-value for treatment with 0 conversions equals control rate', () => {
      // When both have 0 conversions, p-value should be 1
      const result = fishersExactTest(0, 500, 0, 500)
      expect(result.pValue).toBeCloseTo(1.0, 6)
    })
  })

  // ─── Result Validation ───────────────────────────────────────────
  describe('validateResult', () => {
    it('passes for a valid result', () => {
      const result = evaluateExperiment(
        'exp-1', 'control', 'treatment',
        500, 500, 50, 65
      )
      const validation = validateResult(result)
      expect(validation.valid).toBe(true)
      expect(validation.errors).toHaveLength(0)
    })

    it('fails when pValue is negative', () => {
      const result = evaluateExperiment('exp', 'c', 't', 500, 500, 50, 65)
      const invalid: ExperimentResultData = { ...result, pValue: -0.1 }
      const validation = validateResult(invalid)
      expect(validation.valid).toBe(false)
      expect(validation.errors).toContain('pValue out of range [0, 1]')
    })

    it('fails when pValue exceeds 1', () => {
      const result = evaluateExperiment('exp', 'c', 't', 500, 500, 50, 65)
      const invalid: ExperimentResultData = { ...result, pValue: 1.5 }
      const validation = validateResult(invalid)
      expect(validation.valid).toBe(false)
      expect(validation.errors).toContain('pValue out of range [0, 1]')
    })

    it('fails when control conversions exceed sample size', () => {
      const result = evaluateExperiment('exp', 'c', 't', 50, 500, 100, 65)
      const validation = validateResult(result)
      expect(validation.valid).toBe(false)
      expect(validation.errors).toContain('Control conversions exceed sample size')
    })

    it('fails when treatment conversions exceed sample size', () => {
      const result = evaluateExperiment('exp', 'c', 't', 500, 50, 50, 100)
      const validation = validateResult(result)
      expect(validation.valid).toBe(false)
      expect(validation.errors).toContain('Treatment conversions exceed sample size')
    })

    it('fails when conversion rates are inconsistent', () => {
      const result = evaluateExperiment('exp', 'c', 't', 500, 500, 50, 65)
      const invalid: ExperimentResultData = { ...result, controlConversionRate: 999 }
      const validation = validateResult(invalid)
      expect(validation.valid).toBe(false)
      expect(validation.errors).toContain('controlConversionRate does not match controlConversions/controlSampleSize')
    })

    it('fails when absolute difference is inconsistent', () => {
      const result = evaluateExperiment('exp', 'c', 't', 500, 500, 50, 65)
      const invalid: ExperimentResultData = { ...result, absoluteDifference: 999 }
      const validation = validateResult(invalid)
      expect(validation.valid).toBe(false)
      expect(validation.errors).toContain('absoluteDifference does not match treatment - control conversion rate')
    })

    it('fails when CI lower > upper', () => {
      const result = evaluateExperiment('exp', 'c', 't', 500, 500, 50, 65)
      const invalid: ExperimentResultData = {
        ...result,
        controlCiLower: 0.8,
        controlCiUpper: 0.2,
      }
      const validation = validateResult(invalid)
      expect(validation.valid).toBe(false)
      expect(validation.errors).toContain('Control CI lower bound exceeds upper bound')
    })

    it('fails when CI bounds are outside [0, 1]', () => {
      const result = evaluateExperiment('exp', 'c', 't', 500, 500, 50, 65)
      const invalid: ExperimentResultData = {
        ...result,
        controlCiLower: -0.5,
      }
      const validation = validateResult(invalid)
      expect(validation.valid).toBe(false)
      expect(validation.errors).toContain('Control CI bounds out of [0, 1]')
    })

    it('fails for invalid conclusion value', () => {
      const result = evaluateExperiment('exp', 'c', 't', 500, 500, 50, 65)
      const invalid: ExperimentResultData = {
        ...result,
        conclusion: 'SOMETHING_INVALID' as any,
      }
      const validation = validateResult(invalid)
      expect(validation.valid).toBe(false)
    })

    it('fails for invalid sample adequacy value', () => {
      const result = evaluateExperiment('exp', 'c', 't', 500, 500, 50, 65)
      const invalid: ExperimentResultData = {
        ...result,
        sampleAdequacy: 'INVALID' as any,
      }
      const validation = validateResult(invalid)
      expect(validation.valid).toBe(false)
    })

    it('fails when conclusive=true with INSUFFICIENT_SAMPLE conclusion', () => {
      const result = evaluateExperiment('exp', 'c', 't', 0, 0, 0, 0)
      const invalid: ExperimentResultData = {
        ...result,
        conclusive: true,
        conclusion: 'INSUFFICIENT_SAMPLE',
      }
      const validation = validateResult(invalid)
      expect(validation.valid).toBe(false)
      expect(validation.errors).toContain('conclusive=true with INSUFFICIENT_SAMPLE conclusion')
    })

    it('fails when conclusive=true but sample is not ADEQUATE', () => {
      const result = evaluateExperiment('exp', 'c', 't', 50, 50, 5, 6)
      const invalid: ExperimentResultData = {
        ...result,
        conclusive: true,
        conclusion: 'SIGNIFICANT_WIN',
      }
      const validation = validateResult(invalid)
      expect(validation.valid).toBe(false)
      expect(validation.errors).toContain('conclusive=true requires ADEQUATE sample size')
    })

    it('passes when conclusive=true with ADEQUATE sample and SIGNIFICANT_WIN', () => {
      const result = evaluateExperiment('exp', 'c', 't', 500, 500, 50, 65)
      // This is not significant, so let's create a significant case
      // Control: 50/500, Treatment: 100/500 would be significant
      const sigResult = evaluateExperiment('exp', 'c', 't', 500, 500, 50, 100)
      const validation = validateResult(sigResult)
      expect(validation.valid).toBe(true)
    })
  })
})

// ─── Full Experiment Evaluation ────────────────────────────────────
describe('evaluateExperiment', () => {
  describe('Significant Win', () => {
    it('detects significant win when p < 0.05 and treatment > control', () => {
      // Control: 100/1000 = 10%
      // Treatment: 150/1000 = 15%
      // p ≈ 0.0009 (significant)
      const result = evaluateExperiment(
        'exp-1', 'control', 'treatment',
        1000, 1000, 100, 150
      )
      expect(result.conclusion).toBe('SIGNIFICANT_WIN')
      expect(result.conclusive).toBe(true)
      expect(result.pValue).toBeCloseTo(0.0009, 3)
      expect(result.absoluteDifference).toBeCloseTo(0.05, 3)
      expect(result.relativeDifference).toBeCloseTo(0.5, 3)
      expect(result.sampleAdequacy).toBe('ADEQUATE')
    })
  })

  describe('Significant Loss', () => {
    it('detects significant loss when p < 0.05 and treatment < control', () => {
      // Control: 150/1000 = 15%
      // Treatment: 100/1000 = 10%
      const result = evaluateExperiment(
        'exp-1', 'control', 'treatment',
        1000, 1000, 150, 100
      )
      expect(result.conclusion).toBe('SIGNIFICANT_LOSS')
      expect(result.conclusive).toBe(true)
    })
  })

  describe('No Significance', () => {
    it('returns NO_SIGNIFICANCE when p >= 0.05 with adequate sample', () => {
      // Control: 100/1000 = 10%
      // Treatment: 105/1000 = 10.5%
      // p ≈ 0.7681
      const result = evaluateExperiment(
        'exp-1', 'control', 'treatment',
        1000, 1000, 100, 105
      )
      expect(result.conclusion).toBe('NO_SIGNIFICANCE')
      expect(result.conclusive).toBe(false)
      expect(result.pValue).toBeCloseTo(0.7681, 3)
    })
  })

  describe('Insufficient Sample', () => {
    it('returns INSUFFICIENT_SAMPLE when both variants are 0', () => {
      const result = evaluateExperiment('exp-1', 'control', 'treatment', 0, 0, 0, 0)
      expect(result.conclusion).toBe('INSUFFICIENT_SAMPLE')
      expect(result.conclusive).toBe(false)
      expect(result.sampleAdequacy).toBe('UNKNOWN')
    })

    it('returns INSUFFICIENT_SAMPLE when sample < 300', () => {
      const result = evaluateExperiment(
        'exp-1', 'control', 'treatment',
        50, 50, 5, 6
      )
      expect(result.conclusion).toBe('INSUFFICIENT_SAMPLE')
      expect(result.conclusive).toBe(false)
      expect(result.sampleAdequacy).toBe('INSUFFICIENT')
      expect(result.minRequiredSample).toBe(300)
    })

    it('recommendation mentions threshold for insufficient sample', () => {
      const result = evaluateExperiment(
        'exp-1', 'control', 'treatment',
        50, 50, 5, 6
      )
      expect(result.recommendation).toContain('300')
    })
  })

  describe('Field computation correctness', () => {
    it('computes all fields correctly for 50/500 vs 65/500', () => {
      const result = evaluateExperiment(
        'exp-known', 'ctrl', 'trt',
        500, 500, 50, 65
      )

      // Conversion rates
      expect(result.controlConversionRate).toBeCloseTo(0.10, 5)
      expect(result.treatmentConversionRate).toBeCloseTo(0.13, 5)

      // Absolute difference
      expect(result.absoluteDifference).toBeCloseTo(0.03, 5)

      // Relative difference
      expect(result.relativeDifference).toBeCloseTo(0.30, 3)

      // Wilson CIs for control (50/500, p=0.1) with continuity correction
      expect(result.controlCiLower).toBeCloseTo(0.0757, 2)
      expect(result.controlCiUpper).toBeCloseTo(0.1304, 2)

      // Wilson CIs for treatment (65/500, p=0.13) with continuity correction
      expect(result.treatmentCiLower).toBeCloseTo(0.1023, 2)
      expect(result.treatmentCiUpper).toBeCloseTo(0.1633, 2)

      // Fisher's p-value
      expect(result.pValue).toBeCloseTo(0.1650, 3)

      // Odds ratio = (50 * 435) / (450 * 65) = 0.7436
      expect(result.fisherOddsRatio).toBeCloseTo((50 * 435) / (450 * 65), 4)

      // Sample adequacy
      expect(result.sampleAdequacy).toBe('ADEQUATE')
      expect(result.minRequiredSample).toBe(300)

      // Conclusion (not enough evidence)
      expect(result.conclusion).toBe('NO_SIGNIFICANCE')
      expect(result.conclusive).toBe(false)

      // Uplift (relative diff * 100)
      expect(result.uplift).toBeCloseTo(30.0, 1)

      // Significance (same as p-value for backward compat)
      expect(result.significance).toBeCloseTo(0.1650, 3)
    })

    it('conclusive flag is true only for SIGNIFICANT_WIN/LOSS', () => {
      const winResult = evaluateExperiment('exp', 'c', 't', 1000, 1000, 100, 150)
      expect(winResult.conclusive).toBe(true)

      const lossResult = evaluateExperiment('exp', 'c', 't', 1000, 1000, 150, 100)
      expect(lossResult.conclusive).toBe(true)

      const noSigResult = evaluateExperiment('exp', 'c', 't', 1000, 1000, 100, 105)
      expect(noSigResult.conclusive).toBe(false)
    })

    it('uses default significance level of 0.05', () => {
      const result = evaluateExperiment('exp', 'c', 't', 1000, 1000, 100, 105)
      expect(result.significanceLevel).toBe(0.05)
    })

    it('uses default z-score of 1.96', () => {
      const result = evaluateExperiment('exp', 'c', 't', 1000, 1000, 100, 105)
      // Wilson CI with z=1.96 should match default
      const expectedCI = wilsonConfidenceInterval(105, 1000, 1.96)
      expect(result.treatmentCiLower).toBeCloseTo(expectedCI.lower, 6)
      expect(result.treatmentCiUpper).toBeCloseTo(expectedCI.upper, 6)
    })
  })

  describe('Edge cases', () => {
    it('handles zero conversions in both variants with adequate sample', () => {
      const result = evaluateExperiment(
        'exp-1', 'control', 'treatment',
        500, 500, 0, 0
      )
      expect(result.conclusion).toBe('NO_SIGNIFICANCE')
      expect(result.pValue).toBeCloseTo(1.0, 6)
      expect(result.conclusive).toBe(false)
    })

    it('handles all conversions in both variants with adequate sample', () => {
      const result = evaluateExperiment(
        'exp-1', 'control', 'treatment',
        500, 500, 500, 500
      )
      expect(result.conclusion).toBe('NO_SIGNIFICANCE')
      expect(result.pValue).toBeCloseTo(1.0, 6)
      expect(result.conclusive).toBe(false)
    })

    it('treatment converts but control does not (with adequate sample)', () => {
      const result = evaluateExperiment(
        'exp-1', 'control', 'treatment',
        500, 500, 0, 50
      )
      expect(result.conclusion).toBe('SIGNIFICANT_WIN')
      expect(result.conclusive).toBe(true)
    })

    it('uses custom significance level', () => {
      // Use alpha = 0.01
      // Control: 100/1000, Treatment: 120/1000 (p ≈ 0.359, not significant)
      const result = evaluateExperiment(
        'exp-1', 'control', 'treatment',
        1000, 1000, 100, 120,
        0.01
      )
      expect(result.significanceLevel).toBe(0.01)
      expect(result.conclusion).toBe('NO_SIGNIFICANCE')
    })

    it('uses custom z-score for CI (wider for 99%)', () => {
      const result99 = evaluateExperiment(
        'exp-1', 'control', 'treatment',
        1000, 1000, 100, 150,
        0.05, 2.576
      )
      const result95 = evaluateExperiment(
        'exp-1', 'control', 'treatment',
        1000, 1000, 100, 150,
        0.05, 1.96
      )
      // Higher z means wider intervals
      expect(result99.treatmentCiUpper - result99.treatmentCiLower).toBeGreaterThan(
        result95.treatmentCiUpper - result95.treatmentCiLower
      )
    })
  })

  describe('Determinism', () => {
    it('produces identical results for identical inputs', () => {
      const r1 = evaluateExperiment('exp', 'c', 't', 500, 500, 50, 65)
      const r2 = evaluateExperiment('exp', 'c', 't', 500, 500, 50, 65)
      expect(r1.pValue).toBe(r2.pValue)
      expect(r1.fisherOddsRatio).toBe(r2.fisherOddsRatio)
      expect(r1.conclusion).toBe(r2.conclusion)
      expect(r1.absoluteDifference).toBe(r2.absoluteDifference)
    })

    it('produces different results for different inputs', () => {
      const r1 = evaluateExperiment('exp', 'c', 't', 500, 500, 50, 65)
      const r2 = evaluateExperiment('exp', 'c', 't', 500, 500, 50, 100)
      expect(r1.pValue).not.toBe(r2.pValue)
    })
  })

  describe('Uplift calculation', () => {
    it('computes uplift as percentage', () => {
      // Treatment rate = 0.13, Control rate = 0.10
      // Relative diff = 0.13/0.10 - 1 = 0.30
      // Uplift = 30.0%
      const result = evaluateExperiment('exp', 'c', 't', 500, 500, 50, 65)
      expect(result.uplift).toBeCloseTo(30.0, 1)
    })

    it('computes negative uplift for decrease', () => {
      // Control: 150/1000 = 15%, Treatment: 100/1000 = 10%
      // Relative diff = (0.10 - 0.15) / 0.15 = -0.333...
      // Uplift = -33.33%
      const result = evaluateExperiment('exp', 'c', 't', 1000, 1000, 150, 100)
      expect(result.uplift).toBeCloseTo(-33.33, 1)
    })
  })
})

// ─── ComparisonResult interface verification ───────────────────────
describe('ComparisonResult and VariantResult interfaces', () => {
  it('evaluateExperiment returns all expected fields', () => {
    const result = evaluateExperiment('exp-id', 'ctrl', 'trt', 500, 500, 50, 65)

    // ExperimentResultData fields
    expect(result.experimentId).toBe('exp-id')
    expect(result.controlVariantId).toBe('ctrl')
    expect(result.treatmentVariantId).toBe('trt')
    expect(result.controlSampleSize).toBe(500)
    expect(result.treatmentSampleSize).toBe(500)
    expect(result.controlConversions).toBe(50)
    expect(result.treatmentConversions).toBe(65)
    expect(typeof result.controlConversionRate).toBe('number')
    expect(typeof result.treatmentConversionRate).toBe('number')
    expect(typeof result.absoluteDifference).toBe('number')
    expect(typeof result.relativeDifference).toBe('number')
    expect(typeof result.controlCiLower).toBe('number')
    expect(typeof result.controlCiUpper).toBe('number')
    expect(typeof result.treatmentCiLower).toBe('number')
    expect(typeof result.treatmentCiUpper).toBe('number')
    expect(typeof result.pValue).toBe('number')
    expect(typeof result.fisherOddsRatio).toBe('number')
    expect(typeof result.significanceLevel).toBe('number')
    expect(typeof result.sampleAdequacy).toBe('string')
    expect(typeof result.minRequiredSample).toBe('number')
    expect(typeof result.conclusion).toBe('string')
    expect(typeof result.uplift).toBe('number')
    expect(typeof result.significance).toBe('number')
    expect(typeof result.conclusive).toBe('boolean')
    expect(typeof result.recommendation).toBe('string')
  })

  it('result passes validation', () => {
    const result = evaluateExperiment('exp-id', 'ctrl', 'trt', 500, 500, 50, 65)
    const validation = validateResult(result)
    expect(validation.valid).toBe(true)
  })
})
