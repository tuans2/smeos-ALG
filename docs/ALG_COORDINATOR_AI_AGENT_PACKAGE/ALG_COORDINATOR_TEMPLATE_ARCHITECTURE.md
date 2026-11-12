# ALG — Coordinator Template Architecture
## Template System v1.0

> **Purpose:** Define the canonical template architecture for the Coordinator operating system.
>
> **Relationship:** Templates are the operational interface between Sales, Coordinator, Partner, QC and Delivery. They must use the canonical Order Object and must not create a second source of truth.


> **IMPLEMENTATION CONTEXT — EXISTING SYSTEM EXTENSION**  
> Tài liệu này mô tả chức năng **Coordinator Operations** là một capability/module bổ sung vào **hệ thống ALG hiện có**, không phải một sản phẩm hoặc repository độc lập. Khi triển khai, AI Agent phải inspect repository hiện tại, tái sử dụng architecture, authentication, tenant model, database conventions, components, APIs, services và infrastructure đang có; không tạo một repo mới và không dựng lại các capability đã tồn tại.  
>  
> **Repository hiện tại là nguồn sự thật cho implementation detail.** Tài liệu này là canonical specification cho capability Coordinator. Nếu specification xung đột với behavior production hiện có, phải ưu tiên backward compatibility và ghi nhận gap/decision trước khi thay đổi behavior hiện hữu.  

---

# 1. Template Architecture Principle

```text
ONE ORDER OBJECT
       ↓
Template Engine
       ↓
Role-specific Views
       ├── Sales View
       ├── Coordinator View
       ├── Partner View
       ├── QC View
       └── Delivery View
```

The same order data is transformed into different templates according to:

- Role
- Stage
- Purpose
- Channel
- Required action

## Core principle

> **Input once → structure once → reuse everywhere.**

---

# 2. Template Anatomy

Every template must define:

| Attribute | Description |
|---|---|
| Template ID | Unique identifier |
| Name | Human-readable name |
| Purpose | Why the template exists |
| Trigger | What causes it to appear/send |
| Owner | Who creates/controls it |
| Recipient | Who receives it |
| Stage | Where it belongs in order lifecycle |
| Channel | Web / WhatsApp / Zalo / Email / internal |
| Input Source | Where data comes from |
| Auto Fields | System-populated |
| AI Fields | AI-generated |
| Manual Fields | Human-entered |
| Required Fields | Mandatory |
| Optional Fields | Optional |
| CTA | Available actions |
| Status Change | Resulting order/status change |
| Evidence | Required proof |
| Automation | Follow-up automation |
| Version | Template version |

---

# 3. Field Classification

Every field must be classified as one of four types.

### SYSTEM
Automatically populated from Order Object.

Example:
- Order ID
- Customer
- Deadline
- Partner

### AI
Generated or interpreted by AI.

Example:
- Order summary
- Risk explanation
- Partner brief wording
- QC observation

### HUMAN
Entered or confirmed by a user.

Example:
- Special instruction
- Exception decision
- Override reason

### PARTNER
Entered/confirmed by Partner.

Example:
- Accept/decline
- ETA
- Material issue
- Production completion

---

# 4. Canonical Template Matrix

| ID | Template | Sender | Receiver | Stage | Channel |
|---|---|---|---|---|---|
| T01 | Sales Order Intake | Sales | ALG | WS01 | Web |
| T02 | Sales Order Brief | System/AI | Coordinator | WS01 | Web |
| T03 | Missing Information Request | Coordinator/AI | Sales | WS01 | Web/Message |
| T04 | Order Change Request | Sales | Coordinator | WS02/Exception | Web |
| T05 | Coordinator Order Card | System | Coordinator | All | Web |
| T06 | Partner Candidate Card | AI/System | Coordinator | WS03 | Web |
| T07 | Partner Production Card | Coordinator/System | Partner | WS03 | Web/Message |
| T08 | Partner Acceptance | Partner | ALG | WS03 | Web |
| T09 | Partner Question | Partner | Coordinator | WS03/Exception | Web/Message |
| T10 | Production Status Update | Partner | Coordinator | WS04 | Web |
| T11 | Production Issue Report | Partner | Coordinator | WS04/Exception | Web |
| T12 | Production Completion | Partner | Coordinator | WS04 | Web |
| T13 | QC Request | System/Coordinator | Partner/QC | WS05 | Web |
| T14 | QC Checklist | Coordinator/QC | System | WS05 | Web |
| T15 | AI QC Report | AI | Coordinator | WS05 | Web |
| T16 | Rework Request | Coordinator | Partner | WS05 | Web/Message |
| T17 | Replacement Request | Coordinator | Partner/Leader | WS05 | Web/Message |
| T18 | Delivery Card | System | Delivery/Coordinator | WS06 | Web |
| T19 | Pickup Request | Coordinator/System | Partner/Delivery | WS06 | Web/Message |
| T20 | Delivery Status | Delivery | Coordinator | WS06 | Web |
| T21 | POD | Delivery | System | WS06 | Web |
| T22 | Exception Card | System/AI | Coordinator | Any | Web |
| T23 | Escalation Request | Coordinator | Leader | Exception | Web |
| T24 | Partner Replacement | Coordinator | Partner/Leader | Exception | Web |
| T25 | Order Completion | System | Coordinator | WS07 | Web |
| T26 | Partner Performance Record | System | Partner Management | WS07 | Web |
| T27 | Order Learning Record | Coordinator/AI | System | WS07 | Web |

---

# 5. T01 — Sales Order Intake

## Purpose

Allow Sales to submit an order once without requiring Coordinator re-entry.

## Required fields

### Customer
- Customer name
- Contact

### Recipient
- Recipient name
- Phone
- Address

### Product
- Product type
- Quantity
- Budget
- Reference image(s)
- Description

### Delivery
- Required date
- Required time
- Delivery address
- Delivery note

### Message
- Card/message text

### Special requirements
- Free text
- Attachments

## AI behavior

After submit:

1. Normalize text.
2. Extract structured fields.
3. Detect missing information.
4. Detect contradictions.
5. Estimate order complexity.
6. Flag risk.

## Output

`Order Object + Validation Result`

---

# 6. T02 — Sales Order Brief

Coordinator-facing summary automatically generated from T01.

```text
ORDER #FLR-001
Priority: HIGH

PRODUCT
Premium Bouquet × 1

REFERENCE
[Images]

BUDGET
1,200,000đ

DELIVERY
Ba Dinh
17:00

SPECIAL
Pastel / premium / birthday

AI ALERT
⚠ Production window is tight

NEXT ACTION
Find Partner
```

---

# 7. T03 — Missing Information Request

Purpose: request only missing information.

```text
ORDER #FLR-001

Missing information:
⚠ Recipient phone
⚠ Card message

Please provide:
[Recipient phone]
[Card message]

[SUBMIT]
```

The system should never ask for information already present.

---

# 8. T05 — Coordinator Order Card

The main operational card.

## Header

- Order ID
- Priority
- Current status
- Deadline countdown
- Risk

## Main information

- Product
- Reference
- Customer/recipient
- Delivery
- Partner
- Current stage

## Operational control

- Next action
- Owner
- Last update
- Risk
- Exception

## CTA examples

- Find Partner
- Contact Sales
- Contact Partner
- Review QC
- Monitor Delivery
- Resolve Exception

---

# 9. T06 — Partner Candidate Card

```text
PARTNER A

95% MATCH

Capability       ✓
Territory        ✓
Availability     ✓
Capacity         ✓
Quality          94%
On-time          97%

Estimated cost   850K

[SELECT]
```

AI recommendation must show reasons, not only a score.

---

# 10. T07 — Partner Production Card

This is the primary Partner execution template.

```text
ALG
ORDER #FLR-001

PRODUCT
Premium Bouquet

REFERENCE
[IMAGE]

REQUIREMENTS
• Pastel / white
• Premium style
• Medium
• Quantity 1

READY BY
16:00

DELIVERY
Ba Dinh — 17:00

CARD MESSAGE
"Happy Birthday..."

SPECIAL REQUIREMENT
[if applicable]

[ACCEPT]
[DECLINE]
[ASK QUESTION]
```

Partner should not see unnecessary internal information.

---

# 11. T08 — Partner Acceptance

```text
ORDER #FLR-001

[✓ ACCEPTED]

Partner confirms:
✓ Can produce
✓ Can meet deadline
✓ Requirements understood

ETA: 16:00
Cost: 850K
```

System automatically changes:

`PARTNER_PENDING → PARTNER_CONFIRMED`

---

# 12. T09 — Partner Question

Partner can select:

- Product clarification
- Reference clarification
- Material issue
- Deadline issue
- Cost issue
- Other

AI converts free text into a structured issue.

---

# 13. T10 — Production Status Update

```text
ORDER #FLR-001

STATUS
● Started
● In progress
○ Ready

ETA
15:45

PROGRESS
[Optional]

NOTE
...
```

---

# 14. T11 — Production Issue Report

```text
ISSUE TYPE
○ Material
○ Capacity
○ Quality
○ Deadline
○ Other

DESCRIPTION
[................]

IMPACT
○ Low
○ Medium
○ High

PHOTO
[Upload]

[SUBMIT]
```

AI classifies risk and alerts Coordinator.

---

# 15. T12 — Production Completion

Partner submits:

- Ready status
- Completion time
- Product photos
- Notes

System moves:

`IN_PRODUCTION → READY_FOR_QC`

---

# 16. T14 — QC Checklist

```text
ORDER #FLR-001

PRODUCT
☐ Correct product
☐ Correct quantity
☐ Reference acceptable
☐ Colour/style acceptable
☐ Packaging correct
☐ Card correct
☐ No visible defect

PHOTO
[Evidence]

RESULT
[PASS]
[REWORK]
[REPLACE]
```

---

# 17. T15 — AI QC Report

AI analyses uploaded evidence.

```text
AI QC

Product match      92%
Colour match       88%
Composition        94%
Packaging          PASS
Card               PASS

⚠ Detected:
Colour deviation

Recommendation:
REVIEW
```

AI does not automatically override human approval in MVP.

---

# 18. T16 — Rework Request

```text
ORDER #FLR-001

QC RESULT: REWORK

Please correct:
1. Colour deviation
2. Packaging alignment

Required ready time:
15:50

[CONFIRM REWORK]
```

---

# 19. T18 — Delivery Card

```text
ORDER #FLR-001

PRODUCT
Premium Bouquet

PICKUP
Partner A

READY
16:05

DELIVERY
17:00

RECIPIENT
Nguyen Van A

PHONE
09xxxxxxxx

ADDRESS
Ba Dinh, Hanoi

NOTE
Call before delivery

[START DELIVERY]
```

---

# 20. T21 — Proof of Delivery

Required evidence may include:

- Delivered status
- Delivery time
- Recipient confirmation
- Photo/signature where applicable
- Delivery note

---

# 21. T22 — Exception Card

Every exception uses the same structure.

```text
🔴 HIGH RISK

ORDER #FLR-001

ISSUE
Partner delay

IMPACT
Potential SLA breach

DEADLINE
17:00

CURRENT ETA
17:25

AI SUGGESTION
Contact Partner
or
Find backup Partner

[RESOLVE]
[ESCALATE]
[CHANGE PARTNER]
```

---

# 22. T23 — Escalation Request

```text
ORDER #FLR-001

ISSUE
Partner cannot meet deadline.

IMPACT
30-minute delay risk.

ACTIONS TAKEN
• Contacted Partner
• Requested acceleration

DECISION NEEDED
• Approve replacement
• Accept delay
• Other

[SUBMIT]
```

---

# 23. T25 — Order Completion

Auto-generated when all closure requirements are met.

```text
ORDER #FLR-001

✓ Delivered
✓ POD captured
✓ Partner recorded
✓ Cost recorded
✓ Exceptions resolved

ORDER STATUS
COMPLETED
```

---

# 24. Template Automation Rules

## Rule A — Order created

T01 → T02 → validation → T05

## Rule B — Missing information

Validation failure → T03 → wait → revalidate

## Rule C — Partner selected

T06 → T07

## Rule D — Partner accepted

T08 → status update → T10

## Rule E — Production ready

T12 → T13/T14 → AI QC

## Rule F — QC failed

T15 → T16 or T17

## Rule G — QC passed

T18 → Delivery

## Rule H — Delivered

T21 → T25 → T26 → T27

---

# 25. Template UX Rules

1. Show only information relevant to the recipient.
2. Use structured fields whenever possible.
3. Prefer buttons over free-text responses.
4. Allow free text as fallback.
5. Never duplicate data entry.
6. Every action should update the Order Object.
7. Every exception should have owner + next action.
8. Every important completion should have evidence.
9. AI-generated content must be visually identifiable where necessary.
10. Template changes require versioning.

---

# 26. MVP Template Priority

### P0 — Build first

T01 Sales Order Intake  
T02 Coordinator Order Brief  
T03 Missing Information  
T05 Coordinator Order Card  
T07 Partner Production Card  
T08 Partner Acceptance  
T10 Production Status  
T12 Production Completion  
T14 QC Checklist  
T18 Delivery Card  
T21 POD  
T22 Exception Card  
T25 Order Completion

### P1

T06 Partner Candidate Card  
T09 Partner Question  
T11 Production Issue  
T15 AI QC  
T16 Rework  
T19 Pickup Request  
T20 Delivery Status  
T23 Escalation

### P2

T24 Partner Replacement  
T26 Partner Performance  
T27 Order Learning

---

# 27. Template Governance

The template system must follow:

```text
System Documentation
       ↓
Process Specification
       ↓
Template Specification
       ↓
UI / Message Template
       ↓
Automation
```

A template must never become the source of business rules.

Business rules remain in the System Documentation.

