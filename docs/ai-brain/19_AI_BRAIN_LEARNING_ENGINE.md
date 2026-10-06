# 19 AI BRAIN LEARNING ENGINE

## Purpose
Separates the act of *storing data* (Memory) from the act of *deriving insight* (Learning).

## The Learning Process
1. **Input**: A batch of evaluations from the Evaluation Engine. (e.g., "5 listicles failed to rank. 2 deep-dive reviews ranked #1").
2. **Analysis**: The Learning Engine prompts an LLM to find the correlation.
3. **Insight Generation**: "Deep-dive reviews are outperforming listicles in the Software category."
4. **Rule Creation**: The Engine formats this insight into a structured Rule.
5. **Commit**: The Rule is saved to `brain_memory` with a `confidence` score.

## Distinguishing Components
- **Memory**: The database table where facts and rules live.
- **Learning**: The active process of analyzing past performance to write new Memory.
- **Strategy**: The directional plan that *uses* the learned Memory to decide what to do next.
