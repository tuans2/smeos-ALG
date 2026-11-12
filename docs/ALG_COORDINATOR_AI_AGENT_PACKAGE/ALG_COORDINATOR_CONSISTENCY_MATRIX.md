# ALG COORDINATOR — CONSISTENCY MATRIX

**Document ID:** ALG-COORD-CONSISTENCY-001  
**Version:** 1.0  
**Status:** Canonical Cross-Document Validation Layer  
**Purpose:** Verify that Operations, User Journey, Workflow, Templates, Database, PRD/UI and AI Agent implementation remain synchronized.

---

## 1. Canonical Rule

This matrix is the cross-document contract for Coordinator Operations.

Every implementation unit must be traceable across:

```text
Business Process
→ User Journey
→ Workflow
→ Template
→ Database
→ Status
→ Automation
→ UI/API
→ Evidence
→ Test
```

If a change cannot be mapped across affected layers, it is not implementation-ready.

---

## 2. Canonical Lifecycle

```text
NEW
→ VALIDATING
→ READY_FOR_PLANNING
→ PLANNED
→ FINDING_PARTNER
→ PARTNER_PENDING
→ PARTNER_CONFIRMED
→ IN_PRODUCTION
→ READY_FOR_QC
→ QC_PENDING
→ QC_PASSED
→ READY_FOR_DELIVERY
→ IN_DELIVERY
→ DELIVERED
→ CLOSING
→ COMPLETED
```

### Exception overlay

`EXCEPTION_OPEN` is NOT an `order_status`.

It is an operational overlay linked to `exceptions`.

Examples:

```text
IN_PRODUCTION + EXCEPTION_OPEN
QC_PENDING + EXCEPTION_OPEN
IN_DELIVERY + EXCEPTION_OPEN
```

---

## 3. Workstream Mapping

| WS | Canonical Workstream | Playbook Section | Main Journey Area |
|---|---|---|---|
| WS01 | Receive Order | 01 Nhận đơn | Sales handover + validation |
| WS02 | Plan Order | 02 Kiểm tra & lập kế hoạch | Order planning |
| WS03 | Assign Partner | 03 Tìm & xác nhận Shop | Partner matching/confirmation |
| WS04 | Execute Order | 04 Theo dõi Shop gia công | Production |
| WS05 | Control & QC | 05 Kiểm tra & QC | QC/rework |
| WS06 | Deliver Order | 06 Điều phối giao hàng | Delivery/POD |
| WS07 | Close & Learn | 07 Hoàn tất đơn | Closure/learning |

---

## 4. Template Master Matrix

| Template | Workstream | Journey Function | Primary Actor | Primary DB | Main Transition / Result |
|---|---|---|---|---|---|
| T01 Sales Order Intake | WS01 | Sales creates order | Sales/System | orders, items, requirements | NEW |
| T02 Sales Order Brief | WS01 | Validate/structure order | System/AI | orders, requirements, ai_analyses | VALIDATING → READY_FOR_PLANNING |
| T03 Missing Information Request | WS01 | Resolve missing data | Coordinator/AI → Sales | requirements, comments | remains VALIDATING until complete |
| T04 Order Change Request | WS02 | Change requirement | Sales → Coordinator | requirements, order_events | revalidation required |
| T05 Coordinator Order Card | WS02 | Operational planning | Coordinator/System | orders, requirements | PLANNED |
| T06 Partner Candidate Card | WS03 | Candidate selection | AI/System → Coordinator | partner_candidates | FINDING_PARTNER |
| T07 Partner Production Card | WS03 | Send production brief | Coordinator/System → Partner | production_orders | PARTNER_PENDING |
| T08 Partner Acceptance | WS03 | Partner accepts | Partner | assignments, production_orders | PARTNER_CONFIRMED |
| T09 Partner Question | WS03 | Partner asks clarification | Partner → Coordinator | comments, requirements | PARTNER_PENDING / task |
| T10 Production Status Update | WS04 | Monitor production | Partner | production_updates, events | IN_PRODUCTION |
| T11 Production Issue Report | WS04 | Report production issue | Partner/System | production_issues, exceptions | lifecycle + EXCEPTION_OPEN |
| T12 Production Completion | WS04 | Production ready | Partner | production_orders, events | READY_FOR_QC |
| T13 QC Request | WS05 | Request inspection | System/Coordinator | qc_requests | QC_PENDING |
| T14 QC Checklist | WS05 | Structured inspection | QC/Coordinator | qc_checklists | QC result input |
| T15 AI QC Report | WS05 | AI inspection support | AI → QC/Coordinator | ai_analyses, qc_results | PASS or review/rework path |
| T16 Rework Request | WS05 | Request correction | Coordinator/QC → Partner | qc_issues, exceptions | IN_PRODUCTION |
| T17 Replacement Request | WS05 | Request replacement | Coordinator → Partner/Leader | exceptions, assignments | replacement path |
| T18 Delivery Card | WS06 | Prepare delivery | System → Delivery/Coordinator | deliveries | READY_FOR_DELIVERY |
| T19 Pickup Request | WS06 | Request pickup | Coordinator/System | deliveries | pickup workflow |
| T20 Delivery Status | WS06 | Track delivery | Delivery/System | delivery_updates | IN_DELIVERY |
| T21 POD | WS06 | Capture delivery evidence | Delivery | proof_of_delivery | DELIVERED |
| T22 Exception Card | Cross-cutting | Resolve operational exception | Coordinator | exceptions | exception opened/resolved |
| T23 Escalation Request | Cross-cutting | Escalate unresolved issue | Coordinator → Leader | escalations | exception escalation |
| T24 Partner Replacement | Cross-cutting | Replace partner | Coordinator | partner_candidates, assignments | new PARTNER_PENDING / CONFIRMED |
| T25 Order Completion | WS07 | Close order | System/Coordinator | orders, events | CLOSING → COMPLETED |
| T26 Partner Performance Record | WS07 | Measure partner | System | partner_performance | learning/analytics |
| T27 Order Learning Record | WS07 | Capture learning | Coordinator/AI | order_learning | analytics |

---

## 5. End-to-End Workflow Matrix

### WS01 — Receive Order

```text
T01
 ↓
T02
 ├── complete → READY_FOR_PLANNING
 └── incomplete → T03 → revalidate
```

### WS02 — Plan Order

```text
T05
 ↓
PLANNED
 ↓
FINDING_PARTNER
```

Order changes use T04 and must trigger validation/replanning where affected.

### WS03 — Assign Partner

```text
T06
 ↓
T07
 ↓
T08 ACCEPT → PARTNER_CONFIRMED
T09 QUESTION → Coordinator task → PARTNER_PENDING
DECLINE → next candidate / T24 if replacement required
```

### WS04 — Execute Order

```text
T10
 ↓
IN_PRODUCTION
 ├── normal → T12
 └── issue → T11 → T22 / escalation if needed
T12 → READY_FOR_QC
```

### WS05 — Control & QC

```text
T13
 ↓
T14
 ↓
T15
 ├── PASS → QC_PASSED → T18
 └── REVIEW/FAIL → T16 or T17
                       ↓
                    T10/T12 or T24
```

### WS06 — Deliver Order

```text
T18
 ↓
T19
 ↓
T20
 ├── normal → T21
 └── delivery issue → T22 → T23 if escalation required
T21 → DELIVERED
```

### WS07 — Close & Learn

```text
T25
 ↓
CLOSING
 ↓
COMPLETED
 ├── T26 Partner Performance
 └── T27 Order Learning
```

---

## 6. Database Traceability

Every template must map to canonical entities, never to a duplicate module database.

```text
T01/T02/T03/T04/T05
→ orders / order_items / order_requirements / order_events

T06/T07/T08/T09/T24
→ partners / partner_candidates / partner_assignments / production_orders / comments

T10/T11/T12
→ production_orders / production_updates / production_issues / exceptions / order_events

T13/T14/T15/T16/T17
→ qc_requests / qc_checklists / qc_results / qc_issues / ai_analyses / exceptions

T18/T19/T20/T21
→ deliveries / delivery_updates / proof_of_delivery

T22/T23
→ exceptions / escalations

T25/T26/T27
→ orders / order_events / partner_performance / order_learning
```

---

## 7. User Journey Traceability

| Journey Intent | Workflow | Templates | Data |
|---|---|---|---|
| Sales submits order | Receive | T01 | orders/items/requirements |
| AI validates | Validate | T02/T03 | requirements/ai |
| Coordinator plans | Plan | T05 | orders/requirements |
| Partner matching | Assign | T06 | candidates |
| Partner confirmation | Assign | T07/T08/T09/T24 | assignments/production |
| Production monitoring | Execute | T10/T11/T12 | production |
| Exception intervention | Cross-cutting | T11/T22/T23/T24 | exceptions/escalations |
| QC | Control | T13/T14/T15 | qc/ai |
| Rework/replacement | Control | T16/T17 | qc issues/exceptions |
| Delivery | Deliver | T18/T19/T20/T21 | delivery/POD |
| Closure | Close | T25 | orders/events |
| Learning | Learn | T26/T27 | performance/learning |

---

## 8. AI / Human / Automation Boundary

| Capability | AI | Automation | Human |
|---|---:|---:|---:|
| Order extraction | ✓ | ✓ | Review when needed |
| Missing information detection | ✓ | ✓ | Resolve ambiguity |
| Partner matching | ✓ | ✓ | Approve/override |
| Partner communication | Draft/classify | Send/remind | Judgment |
| Delay detection | ✓ | ✓ | Intervention |
| QC image analysis | ✓ | ✓ | Final decision in MVP |
| Exception diagnosis | Assist | Create alert/task | Resolve |
| Order closure | Validate completeness | Auto-close when rules pass | Exception override |
| Learning | ✓ | ✓ | Governance |

---

## 9. Synchronization Rules

### Rule 01
A new template requires a Workflow mapping.

### Rule 02
A new workflow requires a Journey mapping.

### Rule 03
A new DB entity requires a business purpose and Workflow mapping.

### Rule 04
A new status must be approved in the canonical lifecycle before implementation.

### Rule 05
Exceptions use the exception overlay and do not create a competing order lifecycle.

### Rule 06
Changes to one layer must trigger a dependency review across all affected layers.

### Rule 07
The existing ALG repository remains the implementation source of truth for actual code/schema conventions.

### Rule 08
Coordinator documents define the intended capability, not permission to replace existing infrastructure.

---

## 10. Pre-Coding Gate

Before coding any Coordinator feature, the AI Agent must be able to answer:

```text
1. Which existing entity does this use?
2. Which Workstream?
3. Which Journey stage?
4. Which Workflow?
5. Which Template?
6. Which DB read/write?
7. Which status transition?
8. Which automation?
9. Which evidence?
10. Which exception path?
11. Which permission?
12. Which tests?
```

If any answer is missing, implementation must pause at design level rather than inventing an isolated solution.

---

## 11. Validation Status

This document is the checklist used whenever the Coordinator specification changes.

Target state:

```text
100% traceable
100% cross-referenced
0 duplicate source of truth
0 orphan templates
0 orphan workflow steps
0 undocumented status transitions
```
