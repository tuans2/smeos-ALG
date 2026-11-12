# ALG — Coordinator Module
## PRD tóm tắt + Low-Fidelity Wireframe
### Version 1.0


> **IMPLEMENTATION CONTEXT — EXISTING SYSTEM EXTENSION**  
> Tài liệu này mô tả chức năng **Coordinator Operations** là một capability/module bổ sung vào **hệ thống ALG hiện có**, không phải một sản phẩm hoặc repository độc lập. Khi triển khai, AI Agent phải inspect repository hiện tại, tái sử dụng architecture, authentication, tenant model, database conventions, components, APIs, services và infrastructure đang có; không tạo một repo mới và không dựng lại các capability đã tồn tại.  
>  
> **Repository hiện tại là nguồn sự thật cho implementation detail.** Tài liệu này là canonical specification cho capability Coordinator. Nếu specification xung đột với behavior production hiện có, phải ưu tiên backward compatibility và ghi nhận gap/decision trước khi thay đổi behavior hiện hữu.  

---

# 1. Product Overview

## Tên chức năng

**Coordinator Operations / Điều phối đơn hàng**

## Mục tiêu

Xây dựng một module trong ALG giúp Điều phối viên quản lý toàn bộ vòng đời đơn hàng từ lúc Sales bàn giao đến khi đơn hoàn tất, đồng thời dùng AI + Automation để:

- Giảm nhập liệu thủ công.
- Giảm copy/paste và giao tiếp lặp lại.
- Giảm thời gian tìm và chọn Partner.
- Giảm lỗi do thiếu hoặc sai thông tin.
- Chủ động phát hiện đơn có nguy cơ trễ/lỗi.
- Chuẩn hóa cách giao tiếp với Partner.
- Hỗ trợ QC bằng AI.
- Tự động cập nhật trạng thái và đóng đơn.
- Tạo dữ liệu hiệu suất Partner và Coordinator.

## Product principle

> **One Order Object → Multiple Views → Minimal Manual Touch**

Sales nhập thông tin một lần; hệ thống biến thành Order Object dùng xuyên suốt cho Coordinator, Partner, Delivery, QC và Analytics.

---

# 2. User

## Primary User

**Coordinator / Điều phối viên**

## Secondary Users

- Sales
- Partner Shop
- QC / Operations Leader
- Delivery
- Finance / Admin

---

# 3. Core Workflow

```text
SALES
  │
  ▼
01. RECEIVE ORDER
  │
  ▼
02. VALIDATE & PLAN
  │
  ▼
03. ASSIGN PARTNER
  │
  ▼
04. PRODUCTION
  │
  ▼
05. QC
  │
  ▼
06. DELIVERY
  │
  ▼
07. CLOSE
```

Exception có thể phát sinh ở mọi bước:

```text
ANY STAGE
    │
    ▼
EXCEPTION CENTER
    │
    ├── Resolve
    ├── Escalate
    └── Resume Order
```

---

# 4. Canonical Order Lifecycle

```text
NEW
 ↓
VALIDATING
 ↓
READY_FOR_PLANNING
 ↓
PLANNED
 ↓
FINDING_PARTNER
 ↓
PARTNER_PENDING
 ↓
PARTNER_CONFIRMED
 ↓
IN_PRODUCTION
 ↓
READY_FOR_QC
 ↓
QC_PENDING
 ↓
QC_PASSED
 ↓
READY_FOR_DELIVERY
 ↓
IN_DELIVERY
 ↓
DELIVERED
 ↓
CLOSING
 ↓
COMPLETED
```

Exception status nên là lớp cảnh báo/exception, không phá vỡ lifecycle chính.

---

# 5. Functional Scope

## F01 — Sales Order Intake

Sales tạo đơn bằng form chuẩn.

### Input

- Customer
- Recipient
- Product
- Quantity
- Budget
- Reference images
- Message/card
- Delivery address
- Delivery date/time
- Special requirements

### Automation

Sau khi Sales submit:

1. Tạo Order ID.
2. Tạo Order Object.
3. AI chuẩn hóa dữ liệu.
4. AI kiểm tra thiếu/mâu thuẫn.
5. Tạo Coordinator Order Card.
6. Gán trạng thái `VALIDATING`.

### Giá trị

Coordinator không phải nhập lại thông tin từ Sales.

---

# 6. F02 — AI Order Validator

AI kiểm tra:

- Missing information
- Conflicting information
- Deadline risk
- Unclear product requirement
- Unclear reference
- Delivery information
- Special requirement
- Budget/cost inconsistency

### Output

```text
ORDER HEALTH
✓ Product
✓ Recipient
✓ Address
✓ Deadline

⚠ Missing:
- Card message

🔴 Risk:
- Production window is only 90 minutes
```

Coordinator có thể:

- Resolve
- Ask Sales
- Override
- Continue

Mọi override quan trọng phải được ghi log.

---

# 7. F03 — Coordinator Control Tower

Dashboard trung tâm.

### KPI cards

- Total orders today
- New
- In production
- Waiting QC
- Delivery
- At Risk
- Completed

### Priority

Hệ thống tự ưu tiên:

```text
RED    = Immediate action
AMBER  = Attention required
GREEN  = On track
```

### Next Action

Mỗi order nên hiển thị:

> **NEXT ACTION**

Ví dụ:

- Ask Sales for missing address
- Find Partner
- Confirm Partner
- Check production
- Review QC
- Monitor delivery

Điều phối không cần tự tìm việc tiếp theo.

---

# 8. F04 — Order Detail / Control Center

Một màn hình duy nhất cho toàn bộ đơn.

## Sections

1. Order summary
2. Customer / recipient
3. Product
4. Reference
5. Production
6. Partner
7. QC
8. Delivery
9. Timeline
10. Communication
11. Exception
12. Activity log

---

# 9. F05 — AI Partner Matching

Hệ thống đề xuất Partner dựa trên:

- Product capability
- Territory
- Availability
- Capacity
- Quality history
- SLA
- Response rate
- Historical performance
- Applicable cost

### Output

```text
RECOMMENDED PARTNERS

A. Partner A
95% Match
✓ Product
✓ Territory
✓ Availability
✓ SLA

B. Partner B
89% Match

C. Partner C
82% Match
```

Coordinator vẫn là người xác nhận Partner ở MVP.

---

# 10. F06 — Production Card

Sau khi Partner được chọn, hệ thống tự tạo **Production Card**.

## Partner chỉ nhìn thấy thông tin cần để thực hiện đơn

```text
ORDER #FLR-001

PRODUCT
Premium Bouquet

REFERENCE
[IMAGE]

REQUIREMENTS
• White / pastel
• Premium style
• Medium size

QUANTITY
1

READY BY
16:00

DELIVERY
Ba Dinh — 17:00

CARD MESSAGE
"Happy Birthday..."

[ ACCEPT ]
[ DECLINE ]
[ ASK QUESTION ]
```

Partner không cần biết các thông tin nội bộ không liên quan.

---

# 11. F07 — Partner Response Automation

Partner phản hồi bằng các action chuẩn:

- Accept
- Decline
- Ask Question
- Report Material Issue
- Report Delay
- Mark Ready

AI có thể đọc cả phản hồi tự nhiên:

> "Hoa hồng trắng hôm nay hết, shop có thể thay bằng mẫu khác không?"

→ tạo:

`MATERIAL_CONSTRAINT`

→ alert Coordinator.

---

# 12. F08 — Production Monitoring

Timeline:

```text
14:02 Partner Accepted
14:15 Production Started
15:00 Production In Progress
15:30 QC Photo Requested
15:45 Ready
```

Hiển thị:

- Current status
- ETA
- Deadline countdown
- Partner
- Risk level
- Last update
- Next action

---

# 13. F09 — AI Delay Risk

Tính toán dựa trên:

```text
Current Time
+
Production ETA
+
Pickup Time
+
Delivery ETA
vs
Required Delivery Time
```

### Risk

```text
GREEN
On track

AMBER
Potential delay

RED
High probability of SLA breach
```

AI đề xuất:

- Contact Partner
- Request acceleration
- Find backup Partner
- Escalate
- Notify relevant owner

AI không tự thay đổi commercial commitment nếu chưa được phép.

---

# 14. F10 — AI QC

Partner upload product photos.

AI kiểm tra:

- Product type
- Quantity
- Colour
- Composition
- Reference similarity
- Packaging
- Card/message
- Visible defects

### Output

```text
AI QC

Product Match       92%
Colour Match        88%
Composition         94%
Packaging           PASS
Card                PASS

⚠ Colour deviation detected

[ PASS ]
[ REQUEST REWORK ]
[ ESCALATE ]
```

MVP: AI chỉ **recommend**, Coordinator quyết định.

---

# 15. F11 — Delivery Card

Sau QC Pass:

```text
DELIVERY #FLR-001

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
Call recipient before delivery

[ START DELIVERY ]
```

---

# 16. F12 — Delivery Monitoring

Status:

```text
READY
 ↓
PICKUP
 ↓
IN DELIVERY
 ↓
DELIVERED
```

Risk detection:

```text
Pickup delayed
     ↓
Delivery ETA recalculated
     ↓
SLA risk?
 ┌───┴────┐
NO       YES
 ↓         ↓
Monitor   Alert
```

---

# 17. F13 — Exception Center

Một inbox dành riêng cho các vấn đề cần con người xử lý.

## Categories

- Missing Information
- Partner Decline
- Partner Delay
- Material Issue
- QC Failure
- Delivery Failure
- Customer Change
- Commercial Issue

## Exception Card

```text
🔴 HIGH

ORDER #FLR-001

Issue:
Partner reports material shortage.

Impact:
Potential 30 min delay.

Suggested action:
Review alternative material.

[ RESOLVE ]
[ ESCALATE ]
[ CHANGE PARTNER ]
```

---

# 18. F14 — Auto Closure

Khi delivery thành công:

```text
DELIVERED
   ↓
POD captured
   ↓
Partner performance updated
   ↓
Operational data reconciled
   ↓
Issue recorded
   ↓
COMPLETED
```

Coordinator chỉ xử lý phần còn thiếu.

---

# 19. F15 — Partner Performance

Mỗi order tự tạo dữ liệu:

- Acceptance rate
- Response time
- On-time rate
- QC pass rate
- Rework rate
- Replacement rate
- Issue rate
- Delivery performance

Dữ liệu này dùng cho Partner Management và Partner Matching.

---

# 20. Information Architecture

```text
ALG
│
├── Dashboard
│
├── Orders
│   ├── All Orders
│   ├── New
│   ├── Production
│   ├── QC
│   ├── Delivery
│   ├── At Risk
│   └── Completed
│
├── Coordination
│   ├── Control Tower
│   ├── Exceptions
│   └── Tasks
│
├── Partners
│   ├── Partner Directory
│   ├── Capability
│   ├── Availability
│   └── Performance
│
└── Analytics
    ├── Order Performance
    ├── Coordinator Performance
    └── Partner Performance
```

---

# 21. LOW-FIDELITY WIREFRAMES

## 21.1 Coordinator Control Tower

```text
┌────────────────────────────────────────────────────────────────────┐
│ ALG                                      🔔  👤 Coordinator    │
├───────────────┬────────────────────────────────────────────────────┤
│ COORDINATION  │ CONTROL TOWER                                    │
│               │                                                    │
│ ▸ Control     │  TODAY                                            │
│   Tower       │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐     │
│               │  │  42    │ │   7    │ │   4    │ │   31   │     │
│ ▸ Exceptions  │  │ Orders │ │Attention│ │ At Risk│ │On Track│    │
│               │  └────────┘ └────────┘ └────────┘ └────────┘     │
│ ▸ Tasks       │                                                    │
│               │  NEEDS ATTENTION                                  │
│ ORDERS        │  ┌──────────────────────────────────────────────┐ │
│               │  │ 🔴 #001  QC Risk        → Review QC          │ │
│ ▸ All         │  │ 🔴 #007  Delivery Risk → Contact Driver     │ │
│ ▸ Production  │  │ 🔴 #013  Partner Delay → Contact Partner     │ │
│ ▸ QC          │  │ 🟡 #021  Missing Info  → Ask Sales          │ │
│ ▸ Delivery    │  └──────────────────────────────────────────────┘ │
│ ▸ Completed   │                                                    │
│               │  ALL ACTIVE ORDERS                                 │
│ PARTNERS      │  Search [____________]  Filter [Status ▼]         │
│               │                                                    │
│ ▸ Directory   │  #   Product      Partner    Status      Action   │
│ ▸ Performance │  001 Bouquet     Shop A     🔴 QC       Review    │
│               │  007 Basket      Shop B     🟡 Delivery Monitor   │
│               │  013 Bouquet     Shop C     🔴 Delay    Resolve   │
└───────────────┴────────────────────────────────────────────────────┘
```

---

# 22. Order Detail Wireframe

```text
┌────────────────────────────────────────────────────────────────────┐
│ ← Orders     #FLR-001                 🔴 AT RISK      [Actions ▼] │
├────────────────────────────────────────────────────────────────────┤
│ ORDER SUMMARY                                                       │
│ Premium Bouquet    x1       Delivery 17:00       Ba Dinh          │
│                                                                     │
│ ┌───────────────────┐  ┌────────────────────────────────────────┐ │
│ │ PRODUCT           │  │ NEXT ACTION                            │ │
│ │                   │  │                                        │ │
│ │ [REFERENCE IMAGE] │  │ ⚠ Review Partner delay                │ │
│ │                   │  │                                        │ │
│ │ Premium Bouquet   │  │ [Contact Partner] [Escalate]           │ │
│ └───────────────────┘  └────────────────────────────────────────┘ │
│                                                                     │
│ ORDER TIMELINE                                                      │
│ ● Order received ──● Partner confirmed ──● Production ──○ QC      │
│                                                                     │
├────────────────────────────────────────────────────────────────────┤
│ PRODUCT          │ PARTNER             │ QC          │ DELIVERY    │
│ Requirement      │ Shop A              │ Pending     │ 17:00       │
│ Reference        │ Confirmed           │             │ Ba Dinh     │
│ Special Request  │ ETA 15:45           │             │             │
├────────────────────────────────────────────────────────────────────┤
│ ACTIVITY / COMMUNICATION                                            │
│ 14:02  Partner accepted                                             │
│ 14:15  Production started                                           │
│ 15:10  Partner: "White rose unavailable"                           │
│ 15:11  AI classified: MATERIAL_CONSTRAINT                           │
│                                                                     │
│ [Message Partner...]                                                │
└────────────────────────────────────────────────────────────────────┘
```

---

# 23. Partner Production Card Wireframe

```text
┌─────────────────────────────────────────────┐
│ ALG                                     │
│ PRODUCTION ORDER #FLR-001                   │
├─────────────────────────────────────────────┤
│                                             │
│ PREMIUM BOUQUET                             │
│                                             │
│ [             REFERENCE IMAGE             ] │
│                                             │
│ REQUIREMENTS                                │
│ • White / pastel tone                       │
│ • Premium style                             │
│ • Medium size                               │
│ • Quantity: 1                               │
│                                             │
│ READY BY                                    │
│ 16:00                                       │
│                                             │
│ DELIVERY                                    │
│ Ba Dinh — 17:00                             │
│                                             │
│ CARD MESSAGE                                │
│ "Happy Birthday..."                         │
│                                             │
├─────────────────────────────────────────────┤
│ [ ACCEPT ]                                  │
│                                             │
│ [ DECLINE ]    [ ASK QUESTION ]             │
└─────────────────────────────────────────────┘
```

---

# 24. AI QC Wireframe

```text
┌────────────────────────────────────────────────────┐
│ QC — ORDER #FLR-001                               │
├──────────────────────┬─────────────────────────────┤
│                      │ AI QC                       │
│ [ PRODUCT PHOTO ]    │                             │
│                      │ Product Match     92%       │
│                      │ Colour Match      88%       │
│                      │ Composition       94%       │
│                      │ Packaging         PASS      │
│                      │ Card              PASS      │
│                      │                             │
│                      │ ⚠ Colour deviation         │
│                      │ detected                    │
├──────────────────────┴─────────────────────────────┤
│                                                     │
│ [ PASS ]    [ REQUEST REWORK ]    [ ESCALATE ]     │
└─────────────────────────────────────────────────────┘
```

---

# 25. UX Principles

## 25.1 Macro → Micro

Coordinator trước tiên nhìn:

**Tổng quan → Risk → Next Action**

Sau đó mới drill-down:

**Order → Stage → Detail → Evidence**

## 25.2 Progressive Disclosure

Không hiển thị toàn bộ thông tin cùng lúc.

Mỗi màn hình trả lời câu hỏi quan trọng nhất trước.

## 25.3 Action-first

Mỗi Order phải có:

> **NEXT ACTION**

Không để Coordinator tự tìm việc.

## 25.4 Exception-first

Dashboard ưu tiên:

**At Risk > Attention > On Track**

## 25.5 One source of truth

Không nhập cùng một dữ liệu nhiều lần.

## 25.6 AI recommends, human controls

MVP không để AI tự quyết các hành động có ảnh hưởng lớn đến:

- Customer commitment
- Cost
- Partner replacement
- Product acceptance
- Refund/cancellation

---

# 26. MVP Scope

## Phase 1 — Digitalize

Build first:

1. Sales Order Intake
2. Order Object
3. Coordinator Control Tower
4. Order Detail
5. Partner Assignment
6. Production Card
7. Status Timeline
8. Delivery Card
9. Exception Center

## Phase 2 — Automate

10. Auto Partner Message
11. Partner Accept/Decline
12. Reminder
13. Deadline countdown
14. Auto status update
15. Auto closure

## Phase 3 — AI

16. AI Order Validator
17. AI Partner Matching
18. AI Delay Risk
19. AI Message Understanding
20. AI QC

## Phase 4 — Intelligence

21. Partner Performance Engine
22. Coordinator Productivity
23. Predictive Risk
24. Capacity Forecast
25. Autonomous task routing

---

# 27. Success Metrics

## Coordinator Productivity

- Orders / Coordinator / Day
- Minutes / Order
- Manual touches / Order
- Orders handled simultaneously

## Accuracy

- Missing information rate
- Order error rate
- QC error rate
- Delivery error rate

## Reliability

- Partner acceptance time
- Production on-time rate
- Delivery on-time rate
- OTIF

## Automation

- % orders auto-structured
- % partner messages auto-generated
- % status updates automated
- % exceptions automatically detected
- % orders closed automatically

---

# 28. Technical Concept

## Core Object

```text
Order
├── Customer
├── Recipient
├── Product
├── Requirements
├── Reference
├── Partner
├── Production
├── QC
├── Delivery
├── Exceptions
├── Communications
├── Timeline
├── Cost
└── Performance
```

## Event-driven architecture

```text
Order Created
    ↓
AI Validation
    ↓
Order Ready
    ↓
Partner Assigned
    ↓
Partner Accepted
    ↓
Production Started
    ↓
Production Ready
    ↓
QC Passed
    ↓
Delivery Started
    ↓
Delivered
    ↓
Order Completed
```

Mỗi event có thể kích hoạt:

- Status update
- Notification
- AI analysis
- Task creation
- SLA timer
- Automation
- Analytics event

---

# 29. AI Agent Architecture — Future

```text
                    COORDINATOR OS
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
   Order Agent       Partner Agent       Risk Agent
        │                  │                  │
   Validation         Matching          Delay Prediction
        │                  │                  │
        └──────────────────┼──────────────────┘
                           │
                     QC Agent
                           │
                     Delivery Agent
                           │
                    Learning Agent
```

AI Agents không thay thế Coordinator ngay từ đầu.

Mục tiêu là:

> **AI xử lý information + repetitive work; Coordinator xử lý judgment + exception.**

---

# 30. Product North Star

> **ALG Coordinator OS giúp một Điều phối viên kiểm soát nhiều đơn hàng hơn, với ít thao tác thủ công hơn, nhưng vẫn duy trì hoặc nâng cao độ chính xác, chất lượng và khả năng giao đúng hạn.**

### Core loop

```text
INPUT ONCE
    ↓
AI STRUCTURES
    ↓
SYSTEM ROUTES
    ↓
PARTNER EXECUTES
    ↓
AI MONITORS
    ↓
HUMAN HANDLES EXCEPTIONS
    ↓
SYSTEM CLOSES
    ↓
DATA LEARNS
```
