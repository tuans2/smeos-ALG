# ALG COORDINATOR — WORKFLOW ORCHESTRATION

**Document ID:** ALG-COORD-WORKFLOW-001  
**Version:** 1.0  
**Status:** Canonical Workflow Contract  
**Scope:** Coordinator Operations as an extension of the existing ALG system

---

## 1. Purpose

Đây là lớp **orchestration** nối toàn bộ:

```text
Business System
→ User Journey
→ Workstream / Stage / Step
→ Business Action
→ Template
→ Actor
→ Rule / Decision
→ Database
→ Status Transition
→ Automation
→ Evidence
→ Next Action
```

Đây là tài liệu quan trọng nhất để đảm bảo các file khác không phát triển độc lập.

## 2. Existing-System Rule

Coordinator là **module bổ sung vào hệ thống ALG hiện có**.

AI Agent MUST:

- inspect existing repository before coding;
- reuse existing auth, users, organizations/tenants, customers, orders, partners, storage, notifications, API conventions and UI components when available;
- extend existing models rather than duplicating them;
- preserve current production behavior;
- avoid creating a second order/customer/partner source of truth;
- avoid creating a second authentication or tenant system;
- avoid creating a separate Coordinator application/repository.

---

# 3. Canonical Chain

Mọi workflow mới phải map được:

```text
WS
 ↓
Stage
 ↓
Step
 ↓
Action
 ↓
Template
 ↓
Actor
 ↓
Input
 ↓
Decision
 ↓
DB Read/Write
 ↓
Status Transition
 ↓
Automation
 ↓
Evidence
 ↓
Next Action
```

Nếu một implementation không map được chain này, nó chưa được coi là hoàn chỉnh.

---

# 4. Source-of-Truth Hierarchy

Khi coding:

1. Existing production behavior — để bảo vệ backward compatibility.
2. Existing repository schema/API/auth/tenant conventions.
3. Coordinator System Architecture.
4. Coordinator Workflow Orchestration.
5. Database Architecture.
6. User Journey.
7. Template Architecture.
8. PRD/Wireframe.
9. Playbook.

Nếu có conflict:

```text
DO NOT silently overwrite.
→ document gap
→ choose backward-compatible implementation
→ record decision
```

---

# 5. Master Workflow Matrix

| WS | Stage | Step | Action | Template | Actor | DB | Status | Next |
|---|---|---|---|---|---|---|---|---|
| WS01 | Receive Order | Intake | Create/ingest order | T01 | Sales/System | orders, items | NEW | Validate |
| WS01 | Validation | Validate | Detect missing/conflict | T02/T03 | AI/Coordinator | requirements, ai_analyses | VALIDATING | Ready planning |
| WS02 | Planning | Brief | Build order brief | T05 | Coordinator/System | orders, requirements | READY_FOR_PLANNING | Plan |
| WS03 | Partner | Match | Generate candidates | T06 | AI/Coordinator | partner_candidates | FINDING_PARTNER | Contact |
| WS03 | Partner | Contact | Send production card | T07 | System | production_orders | PARTNER_PENDING | Wait |
| WS03 | Partner | Response | Accept | T08 | Partner | assignments | PARTNER_CONFIRMED | Production |
| WS03 | Partner | Response | Ask question | T09 | Partner | comments/requirements | PARTNER_PENDING | Coordinator |
| WS04 | Production | Monitor | Update status | T10 | Partner | production_updates | IN_PRODUCTION | Monitor |
| WS04 | Production | Issue | Report issue | T11 | Partner/System | production_issues/exceptions | Current lifecycle status + EXCEPTION_OPEN overlay | Resolve |
| WS04 | Production | Complete | Mark ready | T12 | Partner | production_orders/events | READY_FOR_QC | QC |
| WS05 | QC | Request | Request QC | T13 | Coordinator/System | qc_requests | QC_PENDING | Inspect |
| WS05 | QC | Inspect | Evaluate | T14/T15 | QC/AI | qc_results/ai_analyses | QC_PASSED or QC_PENDING + EXCEPTION_OPEN overlay | Delivery/Rework |
| WS05 | QC | Rework | Request rework | T16 | QC/Coordinator | qc_issues/exceptions | IN_PRODUCTION | Re-QC |
| WS06 | Delivery | Prepare | Create delivery | T18/T19 | Coordinator/System | deliveries | READY_FOR_DELIVERY | Pickup |
| WS06 | Delivery | Track | Update | T20 | Delivery/System | delivery_updates | IN_DELIVERY | POD |
| WS06 | Delivery | Evidence | POD | T21 | Delivery | proof_of_delivery | DELIVERED | Closing |
| WS07 | Closure | Resolve | Handle exception | T22/T23/T24 | Coordinator | exceptions/escalations | CLOSING | Complete |
| WS07 | Closure | Complete | Close order | T25 | System/Coordinator | orders/events | COMPLETED | Learning |
| WS07 | Learning | Learn | Record signal | T26/T27 | System | performance/learning | COMPLETED | Analytics |

---

# 6. Template Dependency Graph

```text
T01 Sales Order Intake
  ↓
T02 Sales Order Brief
  ├── T03 Missing Information Request
  └── T04 Order Change Request
  ↓
T05 Coordinator Order Card
  ↓
T06 Partner Candidate Card
  ↓
T07 Partner Production Card
  ├── T08 Partner Acceptance → PARTNER_CONFIRMED
  ├── T09 Partner Question → Coordinator task / T03 or clarification
  ├── T24 Partner Replacement → new candidate / assignment
  └── T11 Production Issue → Exception Center / T22
  ↓
T10 Production Status Update
  ↓
T12 Production Completion
  ↓
T13 QC Request
  ↓
T14 QC Checklist
  ↓
T15 AI QC Report
  ├── PASS → T18 Delivery Card
  └── REVIEW/FAIL → T16 Rework Request or T17 Replacement Request
                         ↓
                      T10/T12 or T24
  ↓
T18 Delivery Card
  ↓
T19 Pickup Request
  ↓
T20 Delivery Status
  ├── Delivery issue → T22 Exception Card → T23 Escalation if needed
  └── Delivered → T21 POD
  ↓
T25 Order Completion
  ├── T26 Partner Performance
  └── T27 Order Learning
```

---

# 7. Exception Overlay Model

`EXCEPTION_OPEN` is **not** a canonical order lifecycle status. It is an operational overlay attached to an order/exception record.

```text
Canonical Order Status
        +
Exception Overlay (OPEN / RESOLVED)
```

Examples:

```text
IN_PRODUCTION + EXCEPTION_OPEN
QC_PENDING + EXCEPTION_OPEN
IN_DELIVERY + EXCEPTION_OPEN
```

When the exception is resolved, the order returns/continues through the canonical lifecycle.

---

# 7. Decision Matrix

## Partner response

```text
ACCEPT
→ PARTNER_CONFIRMED
→ create/activate production order

QUESTION
→ PARTNER_PENDING
→ coordinator task

DECLINE
→ partner candidate rejected
→ exception if required
→ next candidate / replacement
```

## QC

```text
PASS
→ QC_PASSED
→ READY_FOR_DELIVERY

FAIL / REWORK
→ exception / qc issue
→ IN_PRODUCTION
→ rework
→ QC again
```

## Delivery

```text
DELIVERED + POD
→ CLOSING
→ COMPLETED
```

---

# 8. Workflow Invariants

1. Every active order has owner, next action, deadline and risk.
2. Every important status transition produces an event.
3. Every template has a business purpose and a stage.
4. Every business action writes to canonical DB entities.
5. Every completion requiring evidence stores evidence.
6. AI recommendation does not equal business decision.
7. Exceptions are cross-cutting and should not destroy the main lifecycle.
8. A template cannot invent a new status without updating the canonical lifecycle.
9. UI state must not become the only source of workflow truth.
10. Automation must be idempotent.

---

# 9. Workflow Definition Format

Every future workflow must be documented in this form:

```yaml
workflow_id: WF-XXX
workstream: WSXX
stage: STXX
step: STEPXX
action: ACTIONXX

trigger:
  type: event|schedule|human|ai

actor:
  primary: coordinator
  secondary: partner

input:
  - entity.field

template:
  outbound: TXX
  inbound: TXX

decision:
  - condition: ...
    result: ...

database:
  reads:
    - table.field
  writes:
    - table.field

status:
  from: ...
  to: ...

automation:
  - ...

evidence:
  required: true
  source: ...

next_action:
  ...

exception:
  possible: true
```

---

# 10. Definition of Done

A workflow is not done until:

- [ ] Journey step exists.
- [ ] System stage exists.
- [ ] Template is mapped.
- [ ] Actor is defined.
- [ ] Input/output is defined.
- [ ] DB read/write is defined.
- [ ] Status transition is defined.
- [ ] Automation is defined.
- [ ] Evidence is defined.
- [ ] Exception path is defined.
- [ ] Next action is defined.
- [ ] Existing-system impact is reviewed.
