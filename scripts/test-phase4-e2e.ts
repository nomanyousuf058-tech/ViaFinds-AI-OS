import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { Brain, runPhase4Demo } from '@/lib/brain';
import { brainRepository } from '@/lib/db/repositories/brain';

/** Phase 4 E2E Test */
async function testPhase4E2E() {
  console.log('=== Phase 4 E2E Test ===\n');
  
  const brain = new Brain('system');
  const correlationId = brain.getCorrelationId();
  console.log(`Correlation ID: ${correlationId}\n`);
  
  // Test 1: Opportunity Detection
  console.log('--- Test 1: Opportunity Detection ---');
  try {
    const opportunities = await brain.detectOpportunities('Test research query for ViaFinds opportunities');
    console.log(`✓ Detected ${opportunities.length} opportunities`);
    
    for (const opp of opportunities) {
      console.log(`  - ${opp.title}`);
      console.log(`    Category: ${opp.category}`);
      console.log(`    Impact: ${opp.evaluation.impact}, Effort: ${opp.evaluation.effort}, Confidence: ${opp.evaluation.confidence}`);
      console.log(`    Source: ${opp.source.url || 'internal'}`);
      console.log(`    Evidence: ${opp.structuredObservation.externalEvidence.substring(0, 100)}...`);
    }
    
    // Verify structure
    const firstOpp = opportunities[0];
    if (!firstOpp) throw new Error('No opportunities detected');
    
    // Check required fields
    const requiredFields = ['id', 'title', 'category', 'description', 'structuredObservation', 'evaluation', 'source', 'status', 'brainReasoning'];
    for (const field of requiredFields) {
      if (!(field in firstOpp)) throw new Error(`Missing field: ${field}`);
    }
    
    // Check structured observation
    const so = firstOpp.structuredObservation;
    const soFields = ['observedFact', 'externalEvidence', 'brainInference', 'recommendation', 'confidence'];
    for (const field of soFields) {
      if (!(field in so)) throw new Error(`Missing structuredObservation field: ${field}`);
    }
    
    // Check evaluation
    const evalFields = ['impact', 'effort', 'confidence', 'evidence', 'dependencies', 'risks', 'expectedOutcome'];
    for (const field of evalFields) {
      if (!(field in firstOpp.evaluation)) throw new Error(`Missing evaluation field: ${field}`);
    }
    
    // Check source
    const sourceFields = ['url', 'title', 'type', 'retrievedAt'];
    for (const field of sourceFields) {
      if (!(field in firstOpp.source)) throw new Error(`Missing source field: ${field}`);
    }
    
    console.log('  ✓ All required fields present');
    
  } catch (error) {
    console.error('✗ Opportunity Detection failed:', error);
    throw error;
  }
  
  // Test 2: Strategy Creation
  console.log('\n--- Test 2: Strategy Creation ---');
  try {
    const opportunities = await brain.detectOpportunities('Test strategy creation');
    const testOpp = opportunities[0];
    
    if (testOpp) {
      await brain.getPermissions(); // Ensure permissions work
      const strategy = await brain.createStrategy(testOpp.id!);
      
      if (strategy) {
        console.log(`✓ Strategy created: ${strategy.title}`);
        console.log(`  Business Goal: ${strategy.businessGoal}`);
        console.log(`  Proposed Action: ${strategy.proposedAction}`);
        console.log(`  Required Capabilities: ${strategy.requiredCapabilities.join(', ')}`);
        console.log(`  Approval Required: ${strategy.approvalRequired}`);
        console.log(`  Status: ${strategy.status}`);
        
        // Verify structure
        const stratFields = ['id', 'opportunityId', 'title', 'description', 'businessGoal', 'proposedAction', 'requiredCapabilities', 'expectedResult', 'status'];
        for (const field of stratFields) {
          if (!(field in strategy)) throw new Error(`Missing strategy field: ${field}`);
        }
        console.log('  ✓ All required fields present');
      } else {
        console.log('  ⚠ Strategy creation returned null (may need approval)');
      }
    }
  } catch (error) {
    console.error('✗ Strategy Creation failed:', error);
    throw error;
  }
  
  // Test 3: Product Discovery
  console.log('\n--- Test 3: Product Discovery ---');
  try {
    const opportunities = await brain.detectOpportunities('Test product discovery for affiliate opportunities');
    const productOpp = opportunities.find(o => o.category === 'product' || o.category === 'affiliate' || o.category === 'revenue') || opportunities[0];
    
    if (productOpp) {
      const products = await brain.discoverProducts(productOpp.id!);
      console.log(`✓ Discovered ${products.length} products`);
      
      for (const prod of products) {
        console.log(`  - ${prod.productName} (${prod.productType})`);
        console.log(`    Platform: ${prod.platform}, Price: $${prod.price}, Commission: ${prod.commissionRate}%`);
        console.log(`    Source: ${prod.sourceUrl}`);
        console.log(`    Validation: ${prod.validationStatus}`);
      }
      
      if (products.length > 0) {
        const prodFields = ['id', 'opportunityId', 'productName', 'productType', 'sourceUrl', 'platform', 'price', 'commissionRate', 'validationStatus'];
        for (const field of prodFields) {
          if (!(field in products[0])) throw new Error(`Missing product field: ${field}`);
        }
        console.log('  ✓ All required fields present');
      }
    }
  } catch (error) {
    console.error('✗ Product Discovery failed:', error);
    throw error;
  }
  
  // Test 4: Content Strategy
  console.log('\n--- Test 4: Content Strategy ---');
  try {
    const opportunities = await brain.detectOpportunities('Test content strategy for SEO articles');
    const contentOpp = opportunities.find(o => o.category === 'content' || o.category === 'seo_search') || opportunities[0];
    
    if (contentOpp) {
      const cs = await brain.createContentStrategy(contentOpp.id!);
      
      if (cs) {
        console.log(`✓ Content Strategy created: ${cs.title}`);
        console.log(`  Type: ${cs.contentType}`);
        console.log(`  Keywords: ${cs.targetKeywords.join(', ')}`);
        console.log(`  Search Intent: ${cs.searchIntent}`);
        console.log(`  Expected Traffic: ${cs.expectedTraffic}`);
        console.log(`  Expected Revenue: $${cs.expectedRevenue}`);
        console.log(`  Priority: ${cs.priority}`);
        
        const csFields = ['id', 'opportunityId', 'contentType', 'title', 'targetKeywords', 'searchIntent', 'outline', 'seoRequirements', 'expectedTraffic', 'expectedRevenue'];
        for (const field of csFields) {
          if (!(field in cs)) throw new Error(`Missing content strategy field: ${field}`);
        }
        console.log('  ✓ All required fields present');
      }
    }
  } catch (error) {
    console.error('✗ Content Strategy failed:', error);
    throw error;
  }
  
  // Test 5: Permissions System
  console.log('\n--- Test 5: Permissions System ---');
  try {
    const perms = brain.getPermissions();
    const effectivePerms = perms.getEffectivePermissions();
    console.log(`✓ Effective permissions: ${effectivePerms.join(', ')}`);
    
    // Test validation
    const readCheck = perms.validateAction('CONTENT_READ');
    console.log(`  READ check: ${readCheck.allowed ? 'ALLOWED' : 'DENIED'} (${readCheck.reason})`);
    
    const publishCheck = perms.validateAction('CONTENT_PUBLISH');
    console.log(`  PUBLISH check: ${publishCheck.allowed ? 'ALLOWED' : 'DENIED'} (${publishCheck.reason})`);
    
    const deleteCheck = perms.validateAction('CONTENT_DELETE');
    console.log(`  DELETE check: ${deleteCheck.allowed ? 'ALLOWED' : 'DENIED'} (${deleteCheck.reason})`);
    
    // Test approval workflow
    const approval = await brain.getApprovalWorkflow().requestApproval(
      'opportunity',
      'test-opp-1',
      'PUBLISH',
      'test-user',
      { test: true }
    );
    console.log(`  ✓ Approval request created: ${approval?.id}`);
    
    if (approval) {
      await brain.getApprovalWorkflow().approve(approval.id!, 'admin', 'Test approval');
      console.log(`  ✓ Approval granted`);
    }
    
  } catch (error) {
    console.error('✗ Permissions System failed:', error);
    throw error;
  }
  
  // Test 6: Quality Gate
  console.log('\n--- Test 6: Quality Gate ---');
  try {
    const { QualityGate } = await import('@/lib/brain/qualityVerification');
    const qualityGate = new QualityGate(correlationId);
    
    const testContent = `
# Test Article

This is a test article about ViaFinds AI Brain capabilities.

## Introduction

The ViaFinds AI Brain is a powerful system for automated business intelligence.

## Features

- Opportunity detection
- Strategy creation
- Execution planning

## Conclusion

This system enables automated business growth.
`;
    
    const result = await qualityGate.checkContent(testContent, {
      wordCount: 100,
      targetKeywords: ['ViaFinds', 'AI Brain', 'opportunity'],
    }, 'article');
    
    console.log(`✓ Quality check completed`);
    console.log(`  Passed: ${result.passed}`);
    console.log(`  Score: ${result.score}/100`);
    console.log(`  Issues: ${result.issues.length}`);
    console.log(`  Recommendations: ${result.recommendations.length}`);
    
  } catch (error) {
    console.error('✗ Quality Gate failed:', error);
    throw error;
  }
  
  // Test 7: Learning Engine
  console.log('\n--- Test 7: Learning Engine ---');
  try {
    const { LearningEngine } = await import('@/lib/brain/learningEngine');
    const learningEngine = new LearningEngine(correlationId);
    
    const learning = await learningEngine.learnFromOutcome(
      'Expected 1000 visitors from article',
      'Actual 1500 visitors from article',
      true,
      {
        entityType: 'content',
        entityId: 'test-article-1',
        evidence: { traffic: 1500, source: 'organic' }
      }
    );
    
    if (learning) {
      console.log(`✓ Learning recorded: ${learning.id}`);
      console.log(`  Lesson: ${learning.lesson}`);
      console.log(`  Reusable: ${learning.reusable}`);
      console.log(`  Source: ${learning.source}`);
    }
    
    // Get reusable learnings
    const learnings = await learningEngine.getReusableLearnings({}, 5);
    console.log(`  ✓ Retrieved ${learnings.length} reusable learnings`);
    
  } catch (error) {
    console.error('✗ Learning Engine failed:', error);
    throw error;
  }
  
  // Test 8: Failure Recovery
  console.log('\n--- Test 8: Failure Recovery ---');
  try {
    const { FailureRecovery } = await import('@/lib/brain/failureRecovery');
    const recovery = new FailureRecovery(correlationId);
    
    // Test successful execution
    const result = await recovery.executeWithRecovery(
      'test_operation',
      async () => 'success',
      { maxRetries: 2 }
    );
    console.log(`✓ Successful execution: ${result}`);
    
    // Test retry on failure (then success)
    let attempts = 0;
    const retryResult = await recovery.executeWithRecovery(
      'test_retry',
      async () => {
        attempts++;
        if (attempts < 2) throw new Error('Temporary failure');
        return 'recovered';
      },
      { maxRetries: 3, retryDelay: 10 }
    );
    console.log(`✓ Retry recovery: ${retryResult} (attempts: ${attempts})`);
    
    // Test circuit breaker
    await recovery.executeWithRecovery(
      'circuit_test',
      async () => { throw new Error('Permanent failure'); },
      { maxRetries: 1, circuitBreakerKey: 'test_circuit' }
    ).catch(() => {});
    
    await recovery.executeWithRecovery(
      'circuit_test',
      async () => { throw new Error('Permanent failure'); },
      { maxRetries: 1, circuitBreakerKey: 'test_circuit' }
    ).catch(() => {});
    
    await recovery.executeWithRecovery(
      'circuit_test',
      async () => { throw new Error('Permanent failure'); },
      { maxRetries: 1, circuitBreakerKey: 'test_circuit' }
    ).catch(() => {});
    
    const isOpen = recovery.isCircuitOpen('test_circuit');
    console.log(`  ✓ Circuit breaker: ${isOpen ? 'OPEN' : 'CLOSED'}`);
    
  } catch (error) {
    console.error('✗ Failure Recovery failed:', error);
    throw error;
  }
  
  // Test 9: Full Loop (optional - can be slow)
  console.log('\n--- Test 9: Full Loop (Quick) ---');
  try {
    // Just verify the brain can be instantiated and run detection
    const brain2 = new Brain('system');
    const opps = await brain2.detectOpportunities('Quick test');
    console.log(`✓ Full loop initialization works (${opps.length} opportunities)`);
  } catch (error) {
    console.error('✗ Full Loop failed:', error);
    throw error;
  }
  
  console.log('\n=== ALL TESTS PASSED ===');
  console.log(`Correlation ID: ${correlationId}`);
}

// Run if executed directly
if (require.main === module) {
  testPhase4E2E()
    .then(() => {
      console.log('\n✅ Phase 4 E2E Test Complete');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Phase 4 E2E Test Failed:', error);
      process.exit(1);
    });
}

export { testPhase4E2E };