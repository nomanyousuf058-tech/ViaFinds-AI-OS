# 38 AI BRAIN UI ARCHITECTURE

## Dashboard Integration
The existing Next.js Admin Dashboard (`app/dashboard/`) must be extended to accommodate the Brain.

## Proposed New Routes (`app/dashboard/brain/`)

### 1. Brain Overview (`/dashboard/brain`)
- **Status Panel**: Is the Brain Awake, Sleeping, or Blocked?
- **Current Strategy**: Displays the active `Strategy V2` and its goals.
- **Performance Metrics**: Shows EPC and Traffic generated specifically by autonomous tasks.

### 2. Approvals Queue (`/dashboard/brain/approvals`)
- A priority inbox for the Admin.
- Displays the Brain's logic: "I want to publish this article because X."
- Action buttons: Approve, Reject (requires feedback modal), Edit.

### 3. Task Center (`/dashboard/brain/tasks`)
- Replaces or augments the existing `/dashboard/jobs`.
- Displays the high-level DAG: "Researching SaaS" $\rightarrow$ "Scraping Top 5" $\rightarrow$ "Generating 5 Articles".

### 4. Memory & Knowledge Graph (`/dashboard/brain/memory`)
- A search interface for `brain_memory`.
- Admin can manually delete false memories or insert new explicit policies.

### 5. Brain Activity Log (`/dashboard/brain/activity`)
- A terminal-like scrolling feed of the Brain's internal thoughts and tool calls, essential for debugging.
