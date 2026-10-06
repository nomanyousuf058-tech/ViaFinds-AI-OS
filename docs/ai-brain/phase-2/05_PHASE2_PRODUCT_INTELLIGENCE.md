# 05 PHASE 2 PRODUCT INTELLIGENCE

## Overview
Phase 2 mandates that ViaFinds is not architecturally limited to affiliate products. The Brain must support and recommend Owned Digital Products.

## Implementation
- The `BrainContext` pulls the `totalProducts` count.
- The `AIRouter` prompt explicitly directs the LLM to: `Support both affiliate AND owned digital product thinking.`
- Tasks like "Owned Product Research" can be queued.
- When generating Strategies and Opportunities, the Brain evaluates whether an internal digital product is a better fit than an external affiliate product.
- **Limitation**: The Brain does not *build* the product. It generates the strategic justification for building the product.
