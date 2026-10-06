# 25 AI BRAIN APPROVAL SYSTEM

## Purpose
Manages the Human-in-the-Loop requirements mandated by the Permission Engine. 

## The Approval Queue
When the Brain hits a permission block (e.g., trying to publish a high-ticket review), it creates a record in `brain_approvals`.

### Approval Record Schema
- `id`: UUID
- `task_id`: Reference to the task that triggered it.
- `action_requested`: String (e.g., "Publish Article: [Slug]")
- `reasoning`: The Brain's justification.
- `evidence`: Links to analytics or research supporting the action.
- `risk_level`: Enum (Low, Medium, High).
- `status`: Enum (Pending, Approved, Rejected).
- `admin_feedback`: Text (Captured if rejected).

## The Admin Workflow
1. Admin logs into the ViaFinds Dashboard.
2. The Dashboard displays an "AI Approvals (3)" notification.
3. Admin reviews the request. They see the Brain's reasoning ("I want to publish this because search volume is spiking today").
4. Admin clicks **Approve** or **Reject**.
5. If **Rejected**, the Admin MUST provide feedback.
6. The feedback is immediately routed to the **Learning Engine** to update `brain_memory` so the Brain does not make the exact same mistake again.

## Progressive Autonomy
As the system matures, the Admin can toggle permission thresholds.
- *Example*: "Auto-approve all actions where `risk_level = Low` and `confidence > 0.9`."
