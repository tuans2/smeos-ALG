# ALG COORDINATOR — AI AGENT IMPLEMENTATION CONTRACT

**Document ID:** ALG-COORD-AGENT-001  
**Version:** 1.0  
**Status:** Mandatory Coding Contract

---

## 1. Mission

Implement Coordinator Operations **inside the existing ALG repository**.

Do not create a separate repository, separate application, duplicate domain model, or parallel infrastructure.

The goal is:

> Add Coordinator capability to the existing product while preserving current functionality and creating a coherent, testable, production-ready workflow.

---

# 2. Read These Documents First

Before coding, read in this order:

```text
01 ALG_COORDINATOR_EXISTING_SYSTEM_INTEGRATION.md
02 ALG_COORDINATOR_OPERATIONS_SYSTEM.md
03 ALG_COORDINATOR_WORKFLOW_ORCHESTRATION.md
04 ALG_COORDINATOR_DATABASE_ARCHITECTURE.md
05 ALG_COORDINATOR_USER_JOURNEY.md
06 ALG_COORDINATOR_TEMPLATE_ARCHITECTURE.md
07 ALG_COORDINATOR_PRD_WIREFRAME.md
08 ALG_COORDINATOR_PLAYBOOK.md
```

Then inspect the repository.

---

# 3. Consistency Gate

Before coding any feature, use `ALG_COORDINATOR_CONSISTENCY_MATRIX.md` to trace Workstream → Journey → Workflow → Template → Database → Status → Automation → Test.

# 4. Implementation Order

Do NOT start by building screens.

Use:

```text
Phase 0 — Repository Discovery
        ↓
Phase 1 — Gap / Impact Map
        ↓
Phase 2 — Data Model & Migrations
        ↓
Phase 3 — Domain Services
        ↓
Phase 4 — Workflow / State Machine
        ↓
Phase 5 — Templates / Communication
        ↓
Phase 6 — Control Tower UI
        ↓
Phase 7 — Production / QC / Delivery
        ↓
Phase 8 — Automation
        ↓
Phase 9 — AI Assistance
        ↓
Phase 10 — Tests / Observability
```

---

# 5. Phase 0 — Repository Discovery

Inspect actual repository structure.

Output an internal map:

```text
Framework:
Database:
ORM:
Auth:
Tenant:
Orders:
Customers:
Partners:
Storage:
Notifications:
Jobs:
AI:
Testing:
UI system:
Routing:
```

Never infer these from the documentation.

---

# 6. Phase 1 — Gap / Impact Map

For every Coordinator requirement:

```text
Existing capability?
Existing table?
Existing API?
Existing UI?
Existing service?
Existing workflow?
Existing permission?
```

Classify:

```text
REUSE
EXTEND
CREATE
DEPRECATE
CONFLICT
```

Do not silently resolve `CONFLICT`.

---

# 7. Phase 2 — Database

Implement only the required delta.

Canonical principles:

```text
Order = canonical business object
Template = projection/interaction
Event = immutable history
AI output = separate intelligence layer
Evidence = explicit data
```

Use migrations.

Do not mutate production schema manually.

---

# 8. Phase 3 — Domain Services

Recommended logical modules:

```text
Order Intake
Order Validation
Order Planning
Partner Matching
Partner Assignment
Production
QC
Delivery
Exception
Closure
Learning
```

Keep business logic out of UI components.

---

# 9. Phase 4 — Workflow

Implement deterministic workflow before AI automation.

Every transition must define:

```text
trigger
actor
permission
preconditions
action
DB write
status transition
event
evidence
next action
exception
```

---

# 10. Phase 5 — Templates

Templates must be generated from canonical order/domain data.

Do not copy data manually from one template to another.

Example:

```text
Order Object
     ↓
T07 Production Card
     ↓
Partner Response
     ↓
T08 / T09
     ↓
Canonical DB
```

---

# 11. Phase 6 — Control Tower

Control Tower must answer:

```text
What orders need attention?
Why?
What is the next action?
Who owns it?
When is it due?
What is the risk?
```

Minimum row:

```text
Order
Status
Next Action
Owner
Risk
Deadline
```

Do not build a dashboard that merely displays large amounts of information.

---

# 12. Phase 7 — Operations

Implement:

```text
Partner
→ Production
→ QC
→ Delivery
→ Closure
```

Each stage must use the same Order Object.

---

# 13. Phase 8 — Automation

Automation should remove repetitive work.

Examples:

```text
Auto-generate production card
Auto-send partner message
Auto-remind pending partner
Auto-detect delay risk
Auto-create QC request
Auto-notify delivery
Auto-close after required evidence
```

Every automation must be:

- idempotent;
- observable;
- retry-safe;
- auditable.

---

# 14. Phase 9 — AI

AI is introduced only where it improves the workflow.

Priority:

```text
1. Order extraction/validation
2. Partner matching recommendation
3. Message classification
4. Delay prediction
5. Image QC
6. Learning
```

AI should expose:

```text
recommendation
confidence
reason
source
```

Do not let AI silently change critical business state.

---

# 15. Permissions

At minimum distinguish:

```text
SALES
COORDINATOR
PARTNER
QC
OPS
ADMIN
```

Every mutation must check authorization.

---

# 16. Testing

Required test levels:

```text
Unit
Integration
Workflow
Permission
Migration
Regression
E2E for critical journeys
```

Critical E2E:

```text
Sales creates order
→ Coordinator validates
→ Partner accepts
→ Production
→ QC
→ Delivery
→ POD
→ Completion
```

Exception E2E:

```text
Partner declines
→ replacement
→ new assignment
```

QC E2E:

```text
QC fail
→ rework
→ QC pass
→ delivery
```

---

# 17. No Regression Rule

Before declaring done:

```text
Existing tests pass
+
New tests pass
+
Existing core workflows still work
+
No duplicate source of truth
+
No broken permissions
```

---

# 18. Coding Rules

### Rule 1

Inspect before modifying.

### Rule 2

Reuse before creating.

### Rule 3

Extend before duplicating.

### Rule 4

Database is canonical.

### Rule 5

UI is not business logic.

### Rule 6

Template is not business logic.

### Rule 7

AI is not authoritative business state.

### Rule 8

Every important state transition is auditable.

### Rule 9

No destructive migration without explicit approval.

### Rule 10

No unrelated refactor during Coordinator implementation.

### Rule 11

Keep commits/change sets scoped to the feature.

### Rule 12

Document deviations from the canonical architecture.

---

# 19. Completion Report

At the end, produce:

```text
Implemented:
Changed:
Created:
Reused:
Database migrations:
APIs:
UI:
Automation:
AI:
Tests:
Known gaps:
Architecture deviations:
Rollback considerations:
```

---

# 20. Final Acceptance Criteria

Coordinator implementation is complete only when:

- [ ] Existing repository was inspected.
- [ ] Existing entities were reused where appropriate.
- [ ] No duplicate order/customer/partner/auth system exists.
- [ ] Database migration is complete.
- [ ] Canonical workflow is implemented.
- [ ] Templates map to workflow.
- [ ] User Journey is executable.
- [ ] Control Tower is functional.
- [ ] Production/QC/Delivery flow works.
- [ ] Exceptions work.
- [ ] AI assistance is separated from business decisions.
- [ ] Automation is idempotent.
- [ ] Critical tests pass.
- [ ] Existing functionality remains intact.
