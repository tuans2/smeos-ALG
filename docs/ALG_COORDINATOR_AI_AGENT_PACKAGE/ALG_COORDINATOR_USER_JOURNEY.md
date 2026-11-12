# ALG — Coordinator User Journey
## End-to-End User Journey v1.0

> **Purpose:** Define the complete experience of the Coordinator, from receiving a Sales order to closing the order.
>
> **Related documents:** `ALG_COORDINATOR_OPERATIONS_SYSTEM.md`, `ALG_COORDINATOR_PLAYBOOK.md`, `ALG_COORDINATOR_PRD_WIREFRAME.md`, `ALG_COORDINATOR_TEMPLATE_ARCHITECTURE.md`.


> **IMPLEMENTATION CONTEXT — EXISTING SYSTEM EXTENSION**  
> Tài liệu này mô tả chức năng **Coordinator Operations** là một capability/module bổ sung vào **hệ thống ALG hiện có**, không phải một sản phẩm hoặc repository độc lập. Khi triển khai, AI Agent phải inspect repository hiện tại, tái sử dụng architecture, authentication, tenant model, database conventions, components, APIs, services và infrastructure đang có; không tạo một repo mới và không dựng lại các capability đã tồn tại.  
>  
> **Repository hiện tại là nguồn sự thật cho implementation detail.** Tài liệu này là canonical specification cho capability Coordinator. Nếu specification xung đột với behavior production hiện có, phải ưu tiên backward compatibility và ghi nhận gap/decision trước khi thay đổi behavior hiện hữu.  

---

# 1. Journey North Star

The Coordinator should experience ALG as:

> **A system that tells me what needs my attention, gives me the information I need, prepares repetitive work for me, and lets me intervene only when human judgment is required.**

The ideal journey is not:

> Open order → read → search → copy → call → update → repeat.

It is:

> **See → Decide → Act → Monitor → Intervene → Close**

---

# 2. Actors

| Actor | Primary responsibility |
|---|---|
| Sales | Sell and hand over a valid order |
| Coordinator | Own operational execution |
| Partner | Produce the order |
| QC | Validate quality where applicable |
| Delivery | Deliver product |
| Leader | Handle escalations |
| AI | Understand, validate, predict, recommend |
| Automation | Move data, notify, update status |

---

# 3. End-to-End Journey

```text
SALES
  │
  ▼
ORDER CREATED
  │
  ▼
AI VALIDATION
  │
  ├── Missing → Sales clarification
  │
  ▼
COORDINATOR CONTROL TOWER
  │
  ▼
ORDER PLANNING
  │
  ▼
PARTNER MATCHING
  │
  ▼
PARTNER PRODUCTION CARD
  │
  ▼
PARTNER ACCEPTS
  │
  ▼
PRODUCTION MONITORING
  │
  ├── Risk → Exception handling
  │
  ▼
QC
  │
  ├── Fail → Rework / Replace
  │
  ▼
DELIVERY
  │
  ├── Risk → Exception handling
  │
  ▼
DELIVERED
  │
  ▼
AUTO CLOSURE
  │
  ▼
LEARNING / PERFORMANCE
```

---

# 4. Journey Stage 1 — Sales Creates Order

## User

Sales

## Goal

Submit a complete order without needing Coordinator assistance.

## User action

Sales completes T01.

## System response

- Creates Order ID.
- Creates Order Object.
- Runs AI validation.
- Creates Coordinator task if needed.

## User feeling / UX goal

> "I only enter the information once."

## Pain to eliminate

- Sales sends fragmented information through chat.
- Coordinator retypes data.
- Missing information is discovered too late.

---

# 5. Journey Stage 2 — AI Validates Order

## System

AI checks the order before Coordinator acts.

## Possible outcomes

### Green

Order complete.

→ Send to Coordinator queue.

### Amber

Potential issue.

→ Show warning.

### Red

Missing/contradictory information prevents execution.

→ Generate T03.

## UX principle

Do not make Coordinator read every field to discover obvious problems.

---

# 6. Journey Stage 3 — Coordinator Opens Control Tower

## User

Coordinator

## Goal

Know what needs attention immediately.

### First screen

```text
TODAY

42 Orders
31 On Track
7 Attention
4 At Risk

NEXT ACTIONS

🔴 #001 Review QC
🔴 #007 Delivery risk
🔴 #013 Partner delay
🟡 #021 Missing information
```

## Desired behavior

Coordinator starts from **exceptions and priorities**, not from a blank order list.

---

# 7. Journey Stage 4 — Coordinator Opens Order

## Goal

Understand an order in seconds.

The Order Detail should answer:

1. What is the order?
2. What does the customer want?
3. When must it be delivered?
4. Where is it now?
5. Who is responsible?
6. What is the next action?
7. Is there a risk?

## Primary UI hierarchy

```text
STATUS
↓
RISK
↓
NEXT ACTION
↓
ORDER SUMMARY
↓
TIMELINE
↓
DETAIL
↓
EVIDENCE
```

---

# 8. Journey Stage 5 — Coordinator Plans Order

## Goal

Turn customer requirements into Partner-executable requirements.

## System assists with

- Structured product information.
- Reference.
- Required completion time.
- Delivery requirement.
- Partner capability requirement.
- Risk.

## Coordinator action

Confirm plan.

## System output

Order becomes:

`PLANNED`

---

# 9. Journey Stage 6 — Partner Matching

## Goal

Find the right Partner quickly.

## System presents

```text
Partner A — 95%
Partner B — 89%
Partner C — 82%
```

Each recommendation explains:

- Capability
- Territory
- Availability
- Quality
- SLA
- Capacity
- Cost

## Coordinator action

Select Partner.

## System

Automatically prepares T07.

---

# 10. Journey Stage 7 — Send Production Card

## Goal

Send the Partner one clear execution brief.

Coordinator should not manually compose a long message.

## Action

Review T07 → Send.

## Partner sees

Only relevant execution information.

## System

Starts response timer.

---

# 11. Journey Stage 8 — Partner Responds

## Green path

Partner accepts.

```text
Partner Accepted
      ↓
Partner Confirmed
      ↓
Production timer starts
```

## Alternative paths

### Decline

→ Find next Partner.

### Question

→ Create Coordinator task.

### Material issue

→ Exception.

### Deadline issue

→ Risk analysis.

---

# 12. Journey Stage 9 — Production Monitoring

## Ideal Coordinator experience

Coordinator should not repeatedly ask:

> "Shop làm đến đâu rồi?"

Instead, Control Tower shows:

```text
Production
████████░░ 80%

ETA 15:45

Deadline 16:00

Risk: GREEN
```

If risk changes:

```text
GREEN → AMBER → RED
```

the Coordinator receives an alert.

---

# 13. Journey Stage 10 — Exception Intervention

When risk appears:

## System shows

```text
WHAT HAPPENED?
Partner delay

WHAT IS THE IMPACT?
25 min

WHAT SHOULD I DO?
Contact Partner
or
Find backup Partner
```

Coordinator does not need to diagnose everything manually.

AI provides context + recommended options.

Human chooses.

---

# 14. Journey Stage 11 — Production Completion

Partner submits:

- Ready status
- Photos
- Notes

System automatically:

`IN_PRODUCTION → READY_FOR_QC`

Coordinator receives:

> **QC required**

---

# 15. Journey Stage 12 — QC

## First layer

AI analyzes evidence.

## Second layer

Coordinator reviews AI findings.

### Green

```text
AI: PASS
Coordinator: Approve
```

### Amber

```text
AI: Review required
Coordinator: Decide
```

### Red

```text
AI: Major deviation
Coordinator: Rework / Replace / Escalate
```

The system should make the decision easy, not hide the evidence.

---

# 16. Journey Stage 13 — Rework

If rework:

```text
QC Fail
  ↓
System generates T16
  ↓
Partner receives exact correction
  ↓
Partner resubmits photo
  ↓
AI rechecks
  ↓
Coordinator approves
```

Avoid restarting the entire order manually.

---

# 17. Journey Stage 14 — Delivery

Once QC passes:

`QC_PASSED → READY_FOR_DELIVERY`

System generates T18.

Coordinator verifies:

- Address
- Recipient
- Phone
- Delivery time
- Product readiness

Then starts delivery.

---

# 18. Journey Stage 15 — Delivery Monitoring

Control Tower shows:

```text
Pickup
✓

In Delivery
●

ETA
16:52

Required
17:00

Risk
GREEN
```

If ETA becomes 17:15:

```text
🔴 DELIVERY SLA RISK

Suggested:
Contact driver
Notify owner
Review recovery
```

---

# 19. Journey Stage 16 — Delivery Complete

Delivery submits POD.

System:

- Updates status.
- Saves evidence.
- Stops SLA timer.
- Updates Partner performance.
- Creates closure task only if something is missing.

---

# 20. Journey Stage 17 — Auto Closure

Ideal experience:

> Coordinator does not manually close every normal order.

System checks:

```text
Delivered ✓
POD ✓
Partner ✓
Cost ✓
Exception ✓
```

Then:

`CLOSING → COMPLETED`

Only incomplete data creates a Coordinator task.

---

# 21. Journey Stage 18 — Learning

After completion:

System records:

- Partner
- Acceptance time
- Production time
- QC result
- Delivery time
- Issues
- Rework
- Replacement
- SLA

AI can later use this data for:

- Partner matching
- Risk prediction
- Capacity planning
- Partner performance
- Coordinator workload planning

---

# 22. Coordinator Daily Journey

A normal working day should feel like:

```text
LOGIN
  ↓
CONTROL TOWER
  ↓
REVIEW RED
  ↓
REVIEW AMBER
  ↓
EXECUTE NEXT ACTIONS
  ↓
MONITOR ACTIVE ORDERS
  ↓
HANDLE EXCEPTIONS
  ↓
ORDERS AUTO-CLOSE
  ↓
END-OF-DAY REVIEW
```

---

# 23. Three Coordinator Modes

## Mode 1 — Monitor

For Green orders.

Coordinator only observes.

## Mode 2 — Act

For normal actions:

- Assign Partner
- Send brief
- Review QC
- Start delivery

## Mode 3 — Resolve

For exceptions:

- Delay
- Quality failure
- Partner replacement
- Customer change
- Delivery problem

The UI should clearly distinguish these three modes.

---

# 24. User Journey by Responsibility

| Stage | Human | AI | Automation |
|---|---|---|---|
| Order Intake | Sales submits | Structure/validate | Create order |
| Planning | Coordinator confirms | Recommend | Populate |
| Partner | Coordinator selects | Match/recommend | Generate card |
| Production | Partner produces | Monitor/analyze | Remind/update |
| QC | Coordinator decides | Analyze image | Trigger QC |
| Delivery | Delivery executes | Risk prediction | Track/alert |
| Closure | Coordinator handles exceptions | Summarize | Auto-close |
| Learning | Leader reviews | Detect patterns | Update data |

---

# 25. Happy Path

The ideal order should require minimal Coordinator interaction:

```text
Sales submits
    ↓
AI validates
    ↓
Coordinator confirms
    ↓
AI recommends Partner
    ↓
Coordinator selects
    ↓
Production Card sent automatically
    ↓
Partner accepts
    ↓
Production monitored automatically
    ↓
Partner uploads photos
    ↓
AI QC
    ↓
Coordinator approves
    ↓
Delivery
    ↓
POD
    ↓
Auto-close
```

Coordinator touchpoints:

**Validate → Select → Approve → Exception if needed**

---

# 26. Exception Path

```text
Order
 ↓
Problem detected
 ↓
AI classifies
 ↓
Risk/impact shown
 ↓
Recommended action
 ↓
Coordinator decides
 ↓
Action executed
 ↓
Result monitored
 ↓
Order resumes normal journey
```

---

# 27. UX Success Criteria

A Coordinator should be able to answer within seconds:

### Q1
**Which orders need my attention?**

### Q2
**What is wrong?**

### Q3
**What should I do next?**

### Q4
**What information do I need?**

### Q5
**Who am I waiting for?**

### Q6
**When must this be completed?**

### Q7
**What evidence proves it is done?**

If the UI cannot answer these questions quickly, the workflow is not sufficiently optimized.

---

# 28. North Star User Experience

The desired transformation is:

```text
OLD

Search
→ Read
→ Remember
→ Copy
→ Message
→ Wait
→ Ask
→ Update
→ Repeat


NEW

SEE
→ DECIDE
→ ACT
→ MONITOR
→ INTERVENE ONLY WHEN NEEDED
→ AUTO-CLOSE
```

---

# 29. Product Design Principle

> **Do not build a system that gives the Coordinator more information. Build a system that reduces the amount of information the Coordinator has to process.**

The system should progressively disclose:

```text
Macro
 ↓
Risk
 ↓
Next Action
 ↓
Order
 ↓
Stage
 ↓
Detail
 ↓
Evidence
```

This keeps the Coordinator fast, accurate and focused.
