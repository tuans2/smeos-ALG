# ALG — Coordinator Operations System
## System Documentation v1.0

> **Purpose:** Single Source of Truth for the Coordinator operating system.
>
> **Relationship:** This document defines how the operating system is designed. The companion `ALG_COORDINATOR_PLAYBOOK.md` translates the same system into a simple human execution guide.
>
> **Synchronization rule:** The Workstream → Stage → Step taxonomy in this document is the canonical taxonomy. The Coordinator Playbook must not introduce a different process structure; it may simplify language and execution detail only.


> **IMPLEMENTATION CONTEXT — EXISTING SYSTEM EXTENSION**  
> Tài liệu này mô tả chức năng **Coordinator Operations** là một capability/module bổ sung vào **hệ thống ALG hiện có**, không phải một sản phẩm hoặc repository độc lập. Khi triển khai, AI Agent phải inspect repository hiện tại, tái sử dụng architecture, authentication, tenant model, database conventions, components, APIs, services và infrastructure đang có; không tạo một repo mới và không dựng lại các capability đã tồn tại.  
>  
> **Repository hiện tại là nguồn sự thật cho implementation detail.** Tài liệu này là canonical specification cho capability Coordinator. Nếu specification xung đột với behavior production hiện có, phải ưu tiên backward compatibility và ghi nhận gap/decision trước khi thay đổi behavior hiện hữu.  

---

## 0. Document Control

| Field | Value |
|---|---|
| System | ALG Operations |
| Function | Order Coordination |
| Document Type | System Architecture / Process Specification |
| Version | 1.0 |
| Status | Baseline |
| Canonical taxonomy | Yes |
| Companion document | `ALG_COORDINATOR_PLAYBOOK.md` |

### Core principle

**Sales sells the order. Coordinator turns the sold order into a successfully delivered order through the Partner Network.**

Coordinator success is defined by:

> **Right requirement → Right partner → Right execution → Right quality → Right delivery → Right closure**

---

# 1. Role Definition

## 1.1 Coordinator Mission

The Coordinator is the operational owner of an order from the moment Sales hands it over until the order is successfully closed.

The Coordinator does not replace Sales, Partner, QC, or Delivery. The Coordinator **coordinates the complete order flow and owns operational continuity**.

## 1.2 Core Responsibilities

1. Receive and validate the order.
2. Convert customer requirements into an executable order plan.
3. Select and confirm an appropriate Partner.
4. Brief and coordinate Partner production.
5. Monitor progress and intervene when risk appears.
6. Coordinate quality control and rework/replacement when required.
7. Coordinate delivery.
8. Close the order and capture operational/Partner performance data.
9. Handle exceptions and escalate according to defined rules.

---

# 2. Coordinator Work Architecture

## L0 — Business Purpose

**Purpose:** Deliver every accepted ALG order accurately, on time, with the required quality and within the approved commercial/operational constraints.

## L1 — Workstreams

| ID | Workstream | Purpose |
|---|---|---|
| WS01 | Receive Order | Receive and validate the Sales handover |
| WS02 | Plan Order | Convert the customer order into an executable production/delivery plan |
| WS03 | Assign Partner | Select and confirm the appropriate Partner |
| WS04 | Execute Order | Coordinate Partner production |
| WS05 | Control & QC | Verify the actual product against requirements |
| WS06 | Deliver Order | Coordinate successful delivery |
| WS07 | Close & Learn | Close the order and capture learning/performance |

These seven Workstreams are the canonical structure used by the Coordinator Playbook.

---

# 3. L2 — Stage Architecture

## WS01 — Receive Order

| ID | Stage |
|---|---|
| 1.1 | Receive Sales Handover |
| 1.2 | Validate Order Information |
| 1.3 | Clarify Missing / Conflicting Information |
| 1.4 | Accept Order for Operations |

**Exit condition:** Order is operationally complete enough to plan.

## WS02 — Plan Order

| ID | Stage |
|---|---|
| 2.1 | Understand Customer Requirement |
| 2.2 | Define Production Requirement |
| 2.3 | Define Partner Requirement |
| 2.4 | Define Delivery Requirement |
| 2.5 | Confirm Order Plan |

**Exit condition:** Coordinator has a clear executable plan.

## WS03 — Assign Partner

| ID | Stage |
|---|---|
| 3.1 | Generate Partner Candidates |
| 3.2 | Evaluate Partner Fit |
| 3.3 | Select Partner |
| 3.4 | Send Production Brief |
| 3.5 | Confirm Partner Acceptance |
| 3.6 | Lock Partner Assignment |

**Exit condition:** One Partner has accepted the order and committed to the required delivery timeline.

## WS04 — Execute Order

| ID | Stage |
|---|---|
| 4.1 | Confirm Production Start |
| 4.2 | Monitor Production Progress |
| 4.3 | Manage Production Changes |
| 4.4 | Confirm Production Completion |

**Exit condition:** Product is reported ready for QC.

## WS05 — Control & QC

| ID | Stage |
|---|---|
| 5.1 | Receive Production Evidence |
| 5.2 | Check Against Requirement |
| 5.3 | Approve / Rework / Replace |
| 5.4 | Confirm QC Pass |

**Exit condition:** Product passes the applicable quality gate.

## WS06 — Deliver Order

| ID | Stage |
|---|---|
| 6.1 | Prepare Delivery |
| 6.2 | Coordinate Pickup |
| 6.3 | Monitor Delivery |
| 6.4 | Confirm Delivery |
| 6.5 | Capture Proof of Delivery |

**Exit condition:** Delivery is confirmed with required evidence.

## WS07 — Close & Learn

| ID | Stage |
|---|---|
| 7.1 | Close Operational Order |
| 7.2 | Reconcile Order Data |
| 7.3 | Record Partner Performance |
| 7.4 | Record Issues / Learning |
| 7.5 | Complete Order |

**Exit condition:** Order is closed and required data is captured.

---

# 4. L3 — Step Architecture

## WS01 — Receive Order

### 1.1 Receive Sales Handover
- Receive Order ID and Sales Order Brief.
- Confirm the handover channel/system record.
- Start operational ownership.

### 1.2 Validate Order Information
Check:
- Product/service
- Reference images
- Quantity
- Customer/recipient information
- Address
- Delivery date/time
- Card/message
- Approved budget/cost constraints
- Special requirements

### 1.3 Clarify Missing / Conflicting Information
- Identify missing data.
- Identify contradictions.
- Return questions to Sales/customer owner.
- Do not release an ambiguous order to a Partner.

### 1.4 Accept Order for Operations
- Mark the order operationally ready.
- Record required deadline.
- Move to planning.

## WS02 — Plan Order

### 2.1 Understand Customer Requirement
Separate:
- Must-have requirements
- Quality expectations
- Reference/visual expectations
- Delivery constraints
- Special handling

### 2.2 Define Production Requirement
Translate customer language into production language:
- Product specification
- Materials/components
- Style/colour/tone
- Size
- Quantity
- Reference
- Packaging/card
- Special production instructions

### 2.3 Define Partner Requirement
Identify required Partner capabilities:
- Product capability
- Location
- Capacity
- Time availability
- Quality level
- Special capability

### 2.4 Define Delivery Requirement
Confirm:
- Delivery location
- Delivery time
- Recipient
- Contact information
- Delivery constraints
- Required delivery evidence

### 2.5 Confirm Order Plan
Ensure all operational requirements are coherent before Partner assignment.

## WS03 — Assign Partner

### 3.1 Generate Partner Candidates
Use the Partner Network based on:
- Capability
- Territory
- Availability
- Capacity
- Quality history
- SLA performance
- Cost/approved commercial constraints

### 3.2 Evaluate Partner Fit
Compare candidates against the order requirement.

### 3.3 Select Partner
Select the Partner that satisfies the applicable requirements and rules.

### 3.4 Send Production Brief
Send a complete, unambiguous brief containing:
- Order ID
- Product
- Reference
- Quantity
- Production requirements
- Delivery deadline
- Special requirements
- Approved cost/commercial information as applicable

### 3.5 Confirm Partner Acceptance
Partner must confirm:
- Acceptance
- Ability to execute
- Agreed cost where applicable
- Expected completion time
- Any material deviation

### 3.6 Lock Partner Assignment
Record the confirmed Partner and agreed execution commitment.

## WS04 — Execute Order

### 4.1 Confirm Production Start
Verify that Partner has started or is ready to start.

### 4.2 Monitor Production Progress
Track:
- Current status
- Expected completion
- Risk to deadline
- Requirement changes
- Partner questions

### 4.3 Manage Production Changes
Any change must be:
- Understood
- Approved by the appropriate owner
- Communicated to Partner
- Recorded

### 4.4 Confirm Production Completion
Receive completion confirmation and required production evidence.

## WS05 — Control & QC

### 5.1 Receive Production Evidence
Obtain applicable photos/videos/status evidence.

### 5.2 Check Against Requirement
Compare:
- Product
- Quantity
- Reference
- Quality
- Packaging
- Card/message
- Other order-specific requirements

### 5.3 Approve / Rework / Replace
If compliant → approve.
If correctable → request rework.
If materially non-compliant → initiate replacement/escalation according to rules.

### 5.4 Confirm QC Pass
Record QC result and release the order to delivery.

## WS06 — Deliver Order

### 6.1 Prepare Delivery
Confirm product readiness, address, recipient, timing, and delivery instructions.

### 6.2 Coordinate Pickup
Coordinate Partner handover to delivery resource.

### 6.3 Monitor Delivery
Monitor status against required delivery time.

### 6.4 Confirm Delivery
Confirm successful delivery to intended recipient/address.

### 6.5 Capture Proof of Delivery
Record applicable evidence such as delivery confirmation/photo/status.

## WS07 — Close & Learn

### 7.1 Close Operational Order
Confirm all operational milestones are complete.

### 7.2 Reconcile Order Data
Capture:
- Partner
- Actual operational cost where applicable
- Delivery status/cost where applicable
- Timing
- Exceptions

### 7.3 Record Partner Performance
Record relevant:
- Acceptance
- Timeliness
- Quality
- Responsiveness
- Issue rate

### 7.4 Record Issues / Learning
Capture root issue, resolution, and useful learning.

### 7.5 Complete Order
Move order to final completed status.

---

# 5. L4 — Action Standard

Every operational Step should ultimately be executable through a small set of actions:

**Check → Confirm → Communicate → Update → Monitor → Escalate → Close**

Actions must always identify:
- What is checked?
- Who is contacted?
- What evidence is required?
- What system status changes?
- What happens if the expected condition is not met?

---

# 6. L5 — Decision Rules

The system uses decision gates rather than assuming every order follows a perfect linear path.

## Gate A — Order Ready?

- **YES:** Continue to WS02.
- **NO:** Clarify with Sales/order owner.

## Gate B — Partner Suitable?

- **YES:** Send brief and confirm.
- **NO:** Evaluate next candidate.

## Gate C — Partner Accepted?

- **YES:** Lock assignment.
- **NO:** Return to Partner selection.

## Gate D — Production On Track?

- **YES:** Continue monitoring.
- **NO:** Assess recovery or escalate.

## Gate E — QC Pass?

- **YES:** Continue to WS06.
- **NO:** Rework/replacement according to severity.

## Gate F — Delivery Successful?

- **YES:** Continue to WS07.
- **NO:** Activate delivery exception handling.

---

# 7. L6 — Exception Architecture

Exceptions are grouped into five categories:

1. **Information Exception** — missing/incorrect/contradictory order information.
2. **Partner Exception** — decline, capacity, capability, responsiveness, or performance issue.
3. **Production Exception** — material shortage, quality risk, delay, or deviation.
4. **Delivery Exception** — pickup, route, recipient, address, or timing issue.
5. **Customer/Commercial Exception** — change request, cancellation, additional requirement, or commercial conflict.

General response pattern:

**Detect → Assess impact → Contain → Resolve / Escalate → Record → Resume or Replace**

---

# 8. L7 — Output & Evidence

| Workstream | Required output/evidence |
|---|---|
| WS01 | Validated operational order |
| WS02 | Order plan / production & delivery requirements |
| WS03 | Confirmed Partner + accepted brief |
| WS04 | Production status + completion evidence |
| WS05 | QC result / approval or rework decision |
| WS06 | Delivery confirmation + POD |
| WS07 | Completed order + performance/learning record |

---

# 9. L8 — Status Model

Recommended canonical order lifecycle:

`NEW → VALIDATING → READY_FOR_PLANNING → PLANNED → FINDING_PARTNER → PARTNER_PENDING → PARTNER_CONFIRMED → IN_PRODUCTION → READY_FOR_QC → QC_PENDING → QC_PASSED → READY_FOR_DELIVERY → IN_DELIVERY → DELIVERED → CLOSING → COMPLETED`

Exception statuses may be layered separately and should not replace the primary lifecycle unless the system requires it.

---

# 10. L9 — Roles / RACI

| Activity | Sales | Coordinator | Partner | Delivery | Leader |
|---|---|---|---|---|---|
| Order sale | A/R | I | I | I | I |
| Order handover | R | A/R | I | I | I |
| Order validation | C | A/R | I | I | I |
| Partner selection | C | A/R | I | I | C |
| Production | I | A | R | I | I |
| Production monitoring | I | A/R | R | I | I |
| QC coordination | C | A/R | R | I | C |
| Delivery coordination | I | A/R | R | R | I |
| Exception escalation | C | R | C | C | A |
| Order closure | I | A/R | C | C | I |
| Partner performance record | I | A/R | C | I | C |

**A = Accountable, R = Responsible, C = Consulted, I = Informed**

---

# 11. L10 — SLA / KPI Framework

The exact numerical SLA should be configured by order type and service level. The architecture should measure:

### Speed
- Sales handover → operational acceptance
- Operational acceptance → Partner confirmation
- Partner confirmation → production start
- Production completion → QC result
- QC pass → pickup
- Pickup → delivery

### Quality
- QC pass rate
- Rework rate
- Replacement rate
- Order defect rate

### Reliability
- On-time production
- On-time delivery
- Partner acceptance rate
- Failed delivery rate

### Overall
- **OTIF — On Time In Full**
- Exception rate
- Order completion rate

---

# 12. L11 — System / Automation Layer

The digital system should eventually support:

- Automatic status progression
- Missing-information alerts
- Partner matching
- Partner availability/capacity visibility
- Deadline countdown
- Delay-risk alerts
- QC evidence capture
- Delivery tracking
- Exception queues
- Partner performance scoring/data
- Audit trail

Automation should enforce the process, not create a second conflicting process.

---

# 13. L12 — Governance

## Change control

Changes to:
- Workstream
- Stage
- Step
- Decision rule
- Status
- SLA
- KPI
- RACI

must be reflected in the canonical System Documentation first.

The Coordinator Playbook is then updated from the approved system change.

## Synchronization rule

**System Documentation → Process Specification → Coordinator Playbook → Training**

Never make a Playbook-only process change that contradicts the system architecture.

---

# 14. Canonical Mapping to Coordinator Playbook

| System | Coordinator Playbook |
|---|---|
| WS01 Receive Order | 01. NHẬN ĐƠN |
| WS02 Plan Order | 02. KIỂM TRA & LẬP KẾ HOẠCH |
| WS03 Assign Partner | 03. TÌM & XÁC NHẬN SHOP |
| WS04 Execute Order | 04. THEO DÕI SHOP GIA CÔNG |
| WS05 Control & QC | 05. KIỂM TRA & QC |
| WS06 Deliver Order | 06. ĐIỀU PHỐI GIAO HÀNG |
| WS07 Close & Learn | 07. HOÀN TẤT ĐƠN |
| L6 Exceptions | 08. XỬ LÝ PHÁT SINH |

This mapping is mandatory for synchronization.
