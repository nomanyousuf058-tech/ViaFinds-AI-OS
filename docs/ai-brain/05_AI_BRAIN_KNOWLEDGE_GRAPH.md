# 05 AI BRAIN KNOWLEDGE GRAPH

## Technology Choice
**Decision**: Use PostgreSQL relational tables with JSONB + `pgvector` (if semantic search becomes strictly necessary), NOT a standalone Vector DB like Pinecone.
**Reason**: ViaFinds is already built on Supabase. Keeping the graph in Postgres ensures transaction safety, reduces infrastructure complexity, and maintains the Free-First strategy.

## Core Graph Entities & Relationships

### 1. The Audience & Funnel Graph
- **Audience** $\rightarrow$ **Intent** (e.g., "Biohackers" $\rightarrow$ "Want to increase deep sleep")
- **Intent** $\rightarrow$ **Topic** (e.g., "Sleep tracking rings")
- **Topic** $\rightarrow$ **Article** (e.g., "Oura vs Ultrahuman Review")
- **Article** $\rightarrow$ **Product/Offer** (e.g., "Ultrahuman Affiliate Link")
- **Offer** $\rightarrow$ **Conversion/Revenue** 

### 2. The Content Architecture Graph
- **Topic** $\rightarrow$ **Cluster** (e.g., "Sleep Tech" $\rightarrow$ "Wearables Cluster")
- **Article** $\rightarrow$ **Search Intent** (e.g., "Informational", "Transactional")
- **Article** $\rightarrow$ **Related Article** (Internal linking graph)

### 3. The Product Intelligence Graph
- **Product** $\rightarrow$ **Problem Solved** 
- **Product** $\rightarrow$ **Competitors** (Dynamic list maintained by Research Agent)
- **Product** $\rightarrow$ **Content Opportunities** (Gaps where we have no articles)

### 4. The Technology Graph (Internal)
- **Technology** (e.g., "PostHog") $\rightarrow$ **Capability** ("Analytics") $\rightarrow$ **Tool** ("QueryAnalyticsTool")

## Implementation Mechanism
Since PostgreSQL is relational, the Knowledge Graph is largely an abstraction over well-designed JOIN tables and recursive queries. 

**Example Schema**:
- `brain_nodes` (id, type, name, attributes JSONB)
- `brain_edges` (id, source_node_id, target_node_id, relationship_type, weight, metadata JSONB)

When the Brain needs to "understand" a topic, it queries `brain_edges` to pull the sub-graph.
