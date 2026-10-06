import { BrainRepository } from '../db/repositories/brain'

/**
 * Pure, deterministic statistical functions for A/B test experiment evaluation.
 *
 * No external dependencies. All results are reproducible given the same inputs.
 *
 * Methods implemented:
 * - Fisher's Exact Test (two-sided, exact hypergeometric) for 2x2 contingency tables
 * - Wilson Score Confidence Interval with continuity correction (z = 1.96 for 95%)
 * - Sample adequacy assessment (ADEQUATE >= 300/variant, INSUFFICIENT < 300, UNKNOWN before execution)
 * - Conversion rate, absolute difference, relative difference (uplift)
 * - Deterministic validation of result integrity
 */

// ─── Constants ───────────────────────────────────────────────────────

export const Z_95 = 1.96
export const DEFAULT_SIGNIFICANCE_LEVEL = 0.05
export const MIN_SAMPLE_PER_VARIANT = 300

// ─── Result Vocabulary ───────────────────────────────────────────────

export type SampleAdequacy = 'ADEQUATE' | 'INSUFFICIENT' | 'UNKNOWN'

export type ExperimentConclusion =
  | 'SIGNIFICANT_WIN'
  | 'SIGNIFICANT_LOSS'
  | 'NO_SIGNIFICANCE'
  | 'INSUFFICIENT_SAMPLE'
  | 'ERROR'

export type ExperimentStatus =
  | 'PROPOSED'
  | 'RUNNING'
  | 'COMPLETED'
  | 'INCONCLUSIVE'
  | 'CANCELLED'
  | 'ARCHIVED'

// ─── Interfaces ──────────────────────────────────────────────────────

export interface VariantResult {
  variantId: string
  sampleSize: number
  conversions: number
  conversionRate: number
  ciLower: number
  ciUpper: number
  ciLevel: number
}

export interface ComparisonResult {
  control: VariantResult
  treatment: VariantResult
  absoluteDifference: number
  relativeDifference: number
  pValue: number
  fisherOddsRatio: number
  significanceLevel: number
  sampleAdequacy: SampleAdequacy
  minRequiredSample: number
  conclusion: ExperimentConclusion
  conclusive: boolean
  recommendation: string
}

export interface ExperimentResultData {
  experimentId: string
  controlVariantId: string
  treatmentVariantId: string
  controlSampleSize: number
  treatmentSampleSize: number
  controlConversions: number
  treatmentConversions: number
  controlConversionRate: number
  treatmentConversionRate: number
  absoluteDifference: number
  relativeDifference: number
  controlCiLower: number
  controlCiUpper: number
  treatmentCiLower: number
  treatmentCiUpper: number
  pValue: number
  fisherOddsRatio: number
  significanceLevel: number
  sampleAdequacy: SampleAdequacy
  minRequiredSample: number
  conclusion: ExperimentConclusion
  uplift: number
  significance: number
  conclusive: boolean
  recommendation: string
}

// ─── Fisher's Exact Test ────────────────────────────────────────────

/**
 * Lanczos approximation of the log-gamma function.
 * Accurate for all x > 0.5. For x < 0.5, uses reflection formula.
 * This is far more accurate than Stirling's approximation for large n.
 */
function logGamma(x: number): number {
  const g = 7
  const c = [
    0.99999999999980993,
    676.52036812111544,
    -1259.1392167224301,
    771.32342877765313,
    -176.61502916214059,
    12.507343278686905,
    -0.13857109526572012,
    9.9843695780195716e-6,
    1.5056327351493116e-7,
  ]

  if (x < 0.5) {
    return Math.log(Math.PI / Math.sin(Math.PI * x)) - logGamma(1 - x)
  }

  x -= 1
  let a = c[0]
  for (let i = 1; i < g + 2; i++) {
    a += c[i] / (x + i)
  }
  const t = x + g + 0.5
  return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a)
}

/**
 * Log-factorial: log(n!) = logGamma(n + 1).
 * Accurate for any n >= 0.
 */
function logFactorial(n: number): number {
  if (n < 0) return NaN
  if (n < 1) return 0 // log(0!) = log(1) = 0
  return logGamma(n + 1)
}

/**
 * Log of the binomial coefficient C(n, k).
 */
function logBinomial(n: number, k: number): number {
  if (k < 0 || k > n) return -Infinity
  return logFactorial(n) - logFactorial(k) - logFactorial(n - k)
}

/**
 * Two-sided Fisher's Exact Test for a 2x2 contingency table.
 *
 * Table layout:
 *   | Control   Success | Control   Failure |
 *   | Treatment Success | Treatment Failure |
 *
 * @param treatmentSuccess - conversions in treatment
 * @param treatmentFailure - non-conversions in treatment
 * @param controlSuccess - conversions in control
 * @param controlFailure - non-conversions in control
 * @returns { pValue: number, oddsRatio: number }
 */
export function fishersExactTest(
  treatmentSuccess: number,
  treatmentFailure: number,
  controlSuccess: number,
  controlFailure: number
): { pValue: number; oddsRatio: number } {
  const a = controlSuccess
  const b = controlFailure
  const c = treatmentSuccess
  const d = treatmentFailure

  // Odds ratio (with Haldane-Anscombe correction when zeros present)
  const oddsRatio = computeOddsRatio(a, b, c, d)

  const n = a + b + c + d
  const row1 = a + b
  const row2 = c + d
  const col1 = a + c
  void (b + d) // col2 computed for documentation of table structure

  // P(X = k) for hypergeometric distribution
  // P(X=k) = C(row1, k) * C(row2, col1-k) / C(n, col1)
  function hypergeometricPMF(k: number): number {
    if (k < 0 || k > row1 || k > col1) return 0
    if (col1 - k < 0 || col1 - k > row2) return 0
    const logP = logBinomial(row1, k) + logBinomial(row2, col1 - k) - logBinomial(n, col1)
    return Math.exp(logP)
  }

  // The observed table probability
  const pObserved = hypergeometricPMF(a)

  // Two-sided: sum of all probabilities <= p(observed)
  // Numerical tolerance for floating-point comparison
  const tol = 1e-15
  let pValue = 0
  for (let k = Math.max(0, col1 - row2); k <= Math.min(row1, col1); k++) {
    const pk = hypergeometricPMF(k)
    if (pk <= pObserved + tol) {
      pValue += pk
    }
  }

  // Clamp to [0, 1]
  pValue = Math.max(0, Math.min(1, pValue))

  return { pValue, oddsRatio }
}

/**
 * Compute odds ratio with Haldane-Anscombe correction (add 0.5 to all cells)
 * when any cell is 0, to avoid division by zero.
 */
function computeOddsRatio(a: number, b: number, c: number, d: number): number {
  if (a === 0 || b === 0 || c === 0 || d === 0) {
    // Haldane-Anscombe correction
    const corrA = a + 0.5
    const corrB = b + 0.5
    const corrC = c + 0.5
    const corrD = d + 0.5
    return (corrA * corrD) / (corrB * corrC)
  }
  return (a * d) / (b * c)
}

// ─── Wilson Score Confidence Interval ───────────────────────────────

/**
 * Wilson score confidence interval for a proportion, with continuity correction.
 *
 * Uses Newcombe's (1998) formula with continuity correction:
 *   Lower = max(0, (2np + z² - z√(z² + 4np(1-p)) - 1) / (2(n + z²)))
 *   Upper = min(1, (2np + z² + z√(z² + 4np(1-p)) + 1) / (2(n + z²)))
 *
 * @param successes Number of successes
 * @param trials Total number of trials (n)
 * @param z Z-score for the confidence level (default 1.96 for 95%)
 * @returns { lower: number, upper: number }
 */
export function wilsonConfidenceInterval(
  successes: number,
  trials: number,
  z: number = Z_95
): { lower: number; upper: number } {
  if (trials <= 0) {
    return { lower: 0, upper: 0 }
  }

  const n = trials
  const p = successes / n
  const z2 = z * z

  // Newcombe's formula with continuity correction
  // center = (2np + z²) / (2(n + z²))
  const center = (2 * n * p + z2) / (2 * (n + z2))

  // margin = z * sqrt(z² + 4np(1-p)) / (2(n + z²))
  const margin = (z * Math.sqrt(z2 + 4 * n * p * (1 - p))) / (2 * (n + z2))

  // continuity correction = 1 / (2(n + z²))
  const cc = 1 / (2 * (n + z2))

  const lower = Math.max(0, center - margin - cc)
  const upper = Math.min(1, center + margin + cc)

  return { lower, upper }
}

// ─── Conversion Rate ─────────────────────────────────────────────────

/**
 * Compute conversion rate as successes / trials.
 */
export function conversionRate(successes: number, trials: number): number {
  if (trials <= 0) return 0
  return successes / trials
}

/**
 * Absolute difference: treatment rate - control rate
 */
export function absoluteDifference(treatmentRate: number, controlRate: number): number {
  return treatmentRate - controlRate
}

/**
 * Relative difference (uplift): (treatment - control) / control
 * Returns 0 if control is 0 to avoid division by zero.
 */
export function relativeDifference(treatmentRate: number, controlRate: number): number {
  if (controlRate === 0) {
    return treatmentRate > 0 ? Infinity : 0
  }
  return (treatmentRate - controlRate) / controlRate
}

// ─── Sample Adequacy ───────────────────────────────────────────────

/**
 * Assess whether the sample size is adequate for statistical testing.
 *
 * - ADEQUATE: Both variants have >= MIN_SAMPLE_PER_VARIANT observations
 * - INSUFFICIENT: At least one variant has observations but < threshold
 * - UNKNOWN: No observations recorded yet (experiment not started or no data)
 *
 * @param controlSampleSize Number of control observations
 * @param treatmentSampleSize Number of treatment observations
 * @param threshold Minimum samples per variant (default 300)
 */
export function assessSampleAdequacy(
  controlSampleSize: number,
  treatmentSampleSize: number,
  threshold: number = MIN_SAMPLE_PER_VARIANT
): { adequacy: SampleAdequacy; minRequired: number } {
  const minRequired = threshold

  if (controlSampleSize === 0 && treatmentSampleSize === 0) {
    return { adequacy: 'UNKNOWN', minRequired }
  }

  if (controlSampleSize < threshold || treatmentSampleSize < threshold) {
    return { adequacy: 'INSUFFICIENT', minRequired }
  }

  return { adequacy: 'ADEQUATE', minRequired }
}

// ─── Result Validation ───────────────────────────────────────────────

/**
 * Deterministically validate a statistical result for internal consistency.
 * Checks that p-values are in range, conversion rates match expected
 * calculations, confidence intervals are ordered correctly, etc.
 */
export function validateResult(data: ExperimentResultData): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (data.pValue < 0 || data.pValue > 1) {
    errors.push('pValue out of range [0, 1]')
  }

  if (data.controlSampleSize < 0 || data.treatmentSampleSize < 0) {
    errors.push('Sample sizes cannot be negative')
  }

  if (data.controlConversions < 0 || data.treatmentConversions < 0) {
    errors.push('Conversion counts cannot be negative')
  }

  if (data.controlConversions > data.controlSampleSize) {
    errors.push('Control conversions exceed sample size')
  }

  if (data.treatmentConversions > data.treatmentSampleSize) {
    errors.push('Treatment conversions exceed sample size')
  }

  // Verify conversion rates
  const expectedControlRate = data.controlSampleSize > 0
    ? data.controlConversions / data.controlSampleSize
    : 0
  const expectedTreatmentRate = data.treatmentSampleSize > 0
    ? data.treatmentConversions / data.treatmentSampleSize
    : 0

  if (Math.abs(data.controlConversionRate - expectedControlRate) > 1e-6) {
    errors.push('controlConversionRate does not match controlConversions/controlSampleSize')
  }

  if (Math.abs(data.treatmentConversionRate - expectedTreatmentRate) > 1e-6) {
    errors.push('treatmentConversionRate does not match treatmentConversions/treatmentSampleSize')
  }

  // Verify absolute difference
  const expectedAbsDiff = data.treatmentConversionRate - data.controlConversionRate
  if (Math.abs(data.absoluteDifference - expectedAbsDiff) > 1e-6) {
    errors.push('absoluteDifference does not match treatment - control conversion rate')
  }

  // Verify relative difference
  if (data.controlConversionRate > 0) {
    const expectedRelDiff = (data.treatmentConversionRate - data.controlConversionRate) / data.controlConversionRate
    if (Math.abs(data.relativeDifference - expectedRelDiff) > 1e-6) {
      errors.push('relativeDifference does not match expected uplift calculation')
    }
  }

  // Verify CI ordering
  if (data.controlCiLower > data.controlCiUpper) {
    errors.push('Control CI lower bound exceeds upper bound')
  }
  if (data.treatmentCiLower > data.treatmentCiUpper) {
    errors.push('Treatment CI lower bound exceeds upper bound')
  }

  // Verify CI bounds are within [0, 1]
  if (data.controlCiLower < 0 || data.controlCiUpper > 1) {
    errors.push('Control CI bounds out of [0, 1]')
  }
  if (data.treatmentCiLower < 0 || data.treatmentCiUpper > 1) {
    errors.push('Treatment CI bounds out of [0, 1]')
  }

  // Verify conclusion vocabulary
  const validConclusions: ExperimentConclusion[] = [
    'SIGNIFICANT_WIN', 'SIGNIFICANT_LOSS', 'NO_SIGNIFICANCE', 'INSUFFICIENT_SAMPLE', 'ERROR'
  ]
  if (!validConclusions.includes(data.conclusion)) {
    errors.push(`Invalid conclusion: ${data.conclusion}`)
  }

  // Verify adequacy vocabulary
  const validAdequacy: SampleAdequacy[] = ['ADEQUATE', 'INSUFFICIENT', 'UNKNOWN']
  if (!validAdequacy.includes(data.sampleAdequacy)) {
    errors.push(`Invalid sampleAdequacy: ${data.sampleAdequacy}`)
  }

  // Verify conclusive flag consistency
  if (data.conclusive && data.conclusion === 'INSUFFICIENT_SAMPLE') {
    errors.push('conclusive=true with INSUFFICIENT_SAMPLE conclusion')
  }

  if (data.conclusive && data.sampleAdequacy !== 'ADEQUATE') {
    errors.push('conclusive=true requires ADEQUATE sample size')
  }

  return { valid: errors.length === 0, errors }
}

// ─── Core Evaluation Function ───────────────────────────────────────

/**
 * Evaluate an experiment given raw event counts.
 *
 * @param experimentId For database association
 * @param controlVariantId ID of the control variant
 * @param treatmentVariantId ID of the treatment variant
 * @param controlSampleSize Total subjects in control (ASSIGNMENT events + EXPOSURE events depending on metric)
 * @param treatmentSampleSize Total subjects in treatment
 * @param controlConversions Conversion events in control
 * @param treatmentConversions Conversion events in treatment
 * @param significanceLevel Alpha threshold (default 0.05)
 * @param zScore Z-score for CI (default 1.96 for 95%)
 */
export function evaluateExperiment(
  experimentId: string,
  controlVariantId: string,
  treatmentVariantId: string,
  controlSampleSize: number,
  treatmentSampleSize: number,
  controlConversions: number,
  treatmentConversions: number,
  significanceLevel: number = DEFAULT_SIGNIFICANCE_LEVEL,
  zScore: number = Z_95
): ExperimentResultData {
  // Compute rates
  const controlRate = conversionRate(controlConversions, controlSampleSize)
  const treatmentRate = conversionRate(treatmentConversions, treatmentSampleSize)

  // Compute Wilson CIs
  const controlCI = wilsonConfidenceInterval(controlConversions, controlSampleSize, zScore)
  const treatmentCI = wilsonConfidenceInterval(treatmentConversions, treatmentSampleSize, zScore)

  // Compute differences
  const absDiff = absoluteDifference(treatmentRate, controlRate)
  const relDiff = relativeDifference(treatmentRate, controlRate)

  // Compute Fisher's Exact Test
  // Table: [[controlSuccess, controlFailure], [treatmentSuccess, treatmentFailure]]
  const controlFailure = controlSampleSize - controlConversions
  const treatmentFailure = treatmentSampleSize - treatmentConversions
  const fisher = fishersExactTest(
    treatmentConversions, treatmentFailure,
    controlConversions, controlFailure
  )

  // Assess sample adequacy
  const { adequacy, minRequired } = assessSampleAdequacy(controlSampleSize, treatmentSampleSize)

  // Determine conclusion
  let conclusion: ExperimentConclusion
  let conclusive: boolean
  let recommendation: string

  if (adequacy === 'UNKNOWN') {
    conclusion = 'INSUFFICIENT_SAMPLE'
    conclusive = false
    recommendation = 'No data recorded for either variant. Experiment has not started or no events have been observed.'
  } else if (adequacy === 'INSUFFICIENT') {
    conclusion = 'INSUFFICIENT_SAMPLE'
    conclusive = false
    recommendation = `Sample size is below the minimum threshold of ${minRequired} per variant. Continue the experiment until sufficient data is collected.`
  } else {
    // Adequate sample — evaluate significance
    if (fisher.pValue <= significanceLevel) {
      conclusive = true
      if (treatmentRate > controlRate) {
        conclusion = 'SIGNIFICANT_WIN'
        recommendation = `Treatment variant (${treatmentVariantId}) shows a statistically significant improvement over control (${controlVariantId}). Recommend deploying the treatment variant.`
      } else {
        conclusion = 'SIGNIFICANT_LOSS'
        recommendation = `Treatment variant (${treatmentVariantId}) shows a statistically significant decrease compared to control (${controlVariantId}). Recommend keeping the control variant.`
      }
    } else {
      conclusion = 'NO_SIGNIFICANCE'
      conclusive = false
      recommendation = `No statistically significant difference detected between control and treatment variants (p=${fisher.pValue.toFixed(6)} > alpha=${significanceLevel}). Consider continuing the experiment or investigating other variation strategies.`
    }
  }

  // Uplift as percentage (for legacy compatibility)
  const uplift = relDiff === Infinity ? 100 : relDiff * 100

  const result: ExperimentResultData = {
    experimentId,
    controlVariantId,
    treatmentVariantId,
    controlSampleSize,
    treatmentSampleSize,
    controlConversions,
    treatmentConversions,
    controlConversionRate: controlRate,
    treatmentConversionRate: treatmentRate,
    absoluteDifference: absDiff,
    relativeDifference: relDiff,
    controlCiLower: controlCI.lower,
    controlCiUpper: controlCI.upper,
    treatmentCiLower: treatmentCI.lower,
    treatmentCiUpper: treatmentCI.upper,
    pValue: fisher.pValue,
    fisherOddsRatio: fisher.oddsRatio,
    significanceLevel,
    sampleAdequacy: adequacy,
    minRequiredSample: minRequired,
    conclusion,
    uplift,
    significance: fisher.pValue,
    conclusive,
    recommendation,
  }

  return result
}

// ─── Repository Integration ─────────────────────────────────────────

export class StatisticalEngine {
  private brainRepo: BrainRepository

  constructor(brainRepo?: BrainRepository) {
    this.brainRepo = brainRepo || new BrainRepository()
  }

  /**
   * Compute statistical results from experiment events in the database.
   * Aggregates events by variant and computes the statistical evaluation.
   */
  async computeExperimentResult(experimentId: string): Promise<ExperimentResultData | null> {
    const pool = await this.brainRepo.getDbPool()

    // 1. Load experiment definition to get control and treatment variant IDs
    const expResult = await pool.query(
      `SELECT baseline, variant FROM brain_experiments WHERE id = $1`,
      [experimentId]
    )
    if (expResult.rows.length === 0) return null

    const baseline = expResult.rows[0].baseline as { variantId: string }
    const variant = expResult.rows[0].variant as { variantId: string }

    const controlVariantId = baseline.variantId
    const treatmentVariantId = variant.variantId

    // 2. Aggregate events by variant
    // Events are tracked per session_id; a session can have:
    //   - ASSIGNMENT: marks a session as assigned to a variant (sample size denominator)
    //   - EXPOSURE: marks a session as exposed (used for CTR-type metrics)
    //   - CONVERSION: marks a session as converted (numerator for conversion rate)
    const eventResult = await pool.query(
      `SELECT variant_id, event_type, COUNT(*) as count
       FROM brain_experiment_events
       WHERE experiment_id = $1
       GROUP BY variant_id, event_type`,
      [experimentId]
    )

    const controlAssignments = this.countEvents(eventResult.rows, controlVariantId, 'ASSIGNMENT')
    const treatmentAssignments = this.countEvents(eventResult.rows, treatmentVariantId, 'ASSIGNMENT')
    const controlConversions = this.countEvents(eventResult.rows, controlVariantId, 'CONVERSION')
    const treatmentConversions = this.countEvents(eventResult.rows, treatmentVariantId, 'CONVERSION')

    // 3. Evaluate
    return evaluateExperiment(
      experimentId,
      controlVariantId,
      treatmentVariantId,
      controlAssignments,
      treatmentAssignments,
      controlConversions,
      treatmentConversions
    )
  }

  /**
   * Persist a computed result to the brain_experiment_results table.
   */
  async persistResult(data: ExperimentResultData): Promise<{ id: string } | null> {
    const pool = await this.brainRepo.getDbPool()

    // Validate first
    const validation = validateResult(data)
    if (!validation.valid) {
      throw new Error(`Result validation failed: ${validation.errors.join('; ')}`)
    }

    const result = await pool.query(
      `INSERT INTO brain_experiment_results (
        experiment_id, control_variant_id, treatment_variant_id,
        control_sample_size, treatment_sample_size,
        control_conversions, treatment_conversions,
        control_conversion_rate, treatment_conversion_rate,
        absolute_difference, relative_difference,
        control_ci_lower, control_ci_upper,
        treatment_ci_lower, treatment_ci_upper,
        p_value, fisher_odds_ratio, significance_level,
        sample_adequacy, min_required_sample, conclusion,
        uplift, significance, conclusive, recommendation
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25)
      RETURNING id`,
      [
        data.experimentId,
        data.controlVariantId,
        data.treatmentVariantId,
        data.controlSampleSize,
        data.treatmentSampleSize,
        data.controlConversions,
        data.treatmentConversions,
        data.controlConversionRate,
        data.treatmentConversionRate,
        data.absoluteDifference,
        data.relativeDifference,
        data.controlCiLower,
        data.controlCiUpper,
        data.treatmentCiLower,
        data.treatmentCiUpper,
        data.pValue,
        data.fisherOddsRatio,
        data.significanceLevel,
        data.sampleAdequacy,
        data.minRequiredSample,
        data.conclusion,
        data.uplift,
        data.significance,
        data.conclusive,
        data.recommendation,
      ]
    )

    return result.rows[0] || null
  }

  private countEvents(rows: Array<{ variant_id: string; event_type: string; count: string | number }>, variantId: string, eventType: string): number {
    const row = rows.find(r => r.variant_id === variantId && r.event_type === eventType)
    return row ? parseInt(String(row.count)) : 0
  }
}
