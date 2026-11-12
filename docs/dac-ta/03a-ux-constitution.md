> [!NOTE]
> **VAI TRÒ TÀI LIỆU — CHUẨN CHẤT LƯỢNG UX TOÀN CỤC (Level 3, CANONICAL)**
> Tệp này quy định chuẩn chất lượng UX, thứ bậc thông tin L0–L4, mật độ, ngân sách nội dung (content budget), trạng thái, chuẩn trợ năng WCAG 2.2, quy cách Screen Contract, UX Lint và định nghĩa Production/Commercial-ready cho toàn bộ hệ sinh thái ALG.
> Áp dụng bình đẳng cho mọi vai trải nghiệm trong `docs/dac-ta/03b-role-ux.md` và bổ sung chuẩn thực thi cho `docs/dac-ta/03-ux-architecture.md`.
> **Quyết định phê duyệt của Product Owner:** 26/09/2026 (K1–K6, D-RU4, Q-TC, Q-MO, Q-E2E).

---

## §0. Áp dụng trong floraos-core

Tài liệu này xác lập chuẩn chất lượng UX toàn cục cho ALG, áp dụng bình đẳng cho mọi vai trải nghiệm (03b). Mọi quy chuẩn được thi hành kết hợp với các quyết định của Product Owner ngày 26/09/2026.

### 1. Bảng phán quyết K1–K3 của Product Owner

| Quyết định | Nội dung áp dụng trong floraos-core | Điều chỉnh mục trong Constitution |
|---|---|---|
| **K1** | **Khối hướng dẫn (`FeatureGuidanceCard`)**: Giữ nguyên cấu trúc, vị trí, hành vi tự thu gọn sau lần xem đầu. Màu chuyển sang token ngữ nghĩa `--color-guidance-*` với giá trị thị giác giữ nguyên. **Tối đa 1 khối mỗi màn/tab**. Độ dài mô tả ≤ 3 dòng ở khổ 390px, ≤ 3 mẹo thao tác nhanh. | Điều chỉnh UX-008 & §43 (giới hạn mật độ khối hướng dẫn, tránh tình trạng 3 khối như trước) |
| **K2** | **Thanh nút tác vụ góc phải (Top-Right Action Header)**: Giữ vị trí góc trên cùng bên phải. Hiển thị trực tiếp **tối đa 1 nút chính (`variant: "primary"`)** cho hành động quan trọng nhất + **tối đa 2 nút phụ (`outline`/`secondary`)**; toàn bộ các tác vụ còn lại đưa vào menu mở rộng `…`. `TabActionHeader` tự động cảnh báo ở môi trường dev nếu có > 1 nút primary. | Điều chỉnh UX-010 & UX-011 (One Primary Action per Viewport, Action Architecture) |
| **K3** | **Dẫn chứng video kép Market Intelligence**: Giữ nguyên bắt buộc dẫn chứng video từ TikTok và YouTube. Tuy nhiên, trên thẻ **danh sách** chỉ hiển thị chỉ báo gọn ("2 video dẫn chứng" + 2 biểu tượng nền tảng); cặp thumbnail đầy đủ kèm trình phát chỉ render ở **lớp chi tiết** (drawer/modal). | Điều chỉnh §41 & UX-005 (giảm tải DOM và triệt tiêu 1.476 lớp màu thô trên mobile) |

### 2. Vị trí tài liệu theo cấu trúc SSOT của ALG (thay thế §52)

- **Chuẩn chất lượng UX toàn cục**: `docs/dac-ta/03a-ux-constitution.md` (tệp này, Level 3, CANONICAL).
- **Trải nghiệm theo 14 vai**: `docs/dac-ta/03b-role-ux.md` (Level 3, CANONICAL).
- **Khung kiến trúc UX & Bản đồ màn**: `docs/dac-ta/03-ux-architecture.md` (Level 3, CANONICAL).
- **Hồ sơ hợp đồng từng màn (Screen Contracts)**: `docs/dac-ta/screen-contracts/` (Level 3, SUPPORTING).
- **Progressive Disclosure & Enterprise UX (mở rộng bắt buộc của tệp này, PO 29/10/2026)**: `docs/dac-ta/03c-ux-progressive-disclosure.md` (Level 3, CANONICAL) · thư viện luồng `docs/dac-ta/ux-patterns/` (Level 3, SUPPORTING).

### 3. Thứ bậc giải quyết xung đột

### 4. Bảng luật UX Lint v0 (Tự động hóa kiểm soát chất lượng qua `npm run lint:ux`)

Mọi màn hình và component trong `src/app` và `src/components` được kiểm soát tự động qua bộ linter AST (`scripts/ux-lint.ts`). Baseline vi phạm hiện hành được khoá theo cơ chế Ratchet (không bao giờ tăng):

| Mã | Luật | Cách phát hiện (AST) | Mức hiện hành | Nguồn |
|---|---|---|---|---|
| R1 | Lớp màu Tailwind thô | Quét chuỗi `className` & `cn()`, khớp lớp màu Tailwind gốc `(bg/text/border/...)-(red/rose/emerald/...)-\d{2,3}` | Ratchet (baseline) | 03a §31 |
| R2 | Cỡ chữ tuỳ ý | Khớp chuỗi cỡ chữ tuỳ tiện `text-[\d+(.\d+)?px]` | Ratchet (baseline) | 03a §31 |
| R3 | Mã hex trong giao diện | Chuỗi `#[0-9a-fA-F]{3,8}` trong prop màu hoặc className | Ratchet (baseline) | 03a §31 |
| R4 | Hơn 1 nút chính | Đếm nút `<Button variant="primary">` hoặc nút mặc định trong cùng một khối | Cảnh báo (WARNING) | 03a UX-010, K2 |
| R5 | `onClick` trên phần tử không tương tác | `div/span/li/tr/td/img/Card` có `onClick` thiếu role/tabIndex/keyboard | FAIL với tệp mới | WCAG 2.1.1 |
| R6 | Nút chỉ có icon thiếu nhãn | Nút chỉ chứa icon mà không có `aria-label`/`aria-labelledby`/`title` | FAIL với tệp mới | WCAG 4.1.2 |
| R7 | Ảnh thiếu `alt` | `<img>` hoặc `<Image>` thiếu thuộc tính `alt` | FAIL với tệp mới | WCAG 1.1.1 |
| R8 | Mã kỹ thuật trong nhãn | Chứa mã kỹ thuật `M01a`, `Khu vực A-F`, `SSOT`, `Chức năng \d+` | Cảnh báo (WARNING) | 03a §39 |
| R9 | "Đang tải" dạng chữ | Chuỗi chữ trơ trụi "Đang tải…" thay vì Skeleton | Cảnh báo (WARNING) | 03-UX §15 |
| R10 | Thiếu nhánh rỗng/lỗi | Có gọi API (`fetch`) nhưng thiếu xử lý rỗng/lỗi | Cảnh báo (WARNING) | 03a §24 |
| R11 | Nút không làm gì | `<button>` không có onClick, không submit, không nằm trong form/link | FAIL với tệp mới | 03a §22 |
| R12 | Component trùng | Tên component trùng hoặc gần giống export có sẵn trong `ui/**` | Cảnh báo (WARNING) | 03a §30 |

### 5. Thang Token Cỡ Chữ và Màu Ngữ Nghĩa (T4.2 & T4.3 SSOT)

Toàn bộ cỡ chữ và màu sắc trong ALG bắt buộc tuân theo bảng token chuẩn hóa khai báo tại `src/app/globals.css`. Tuyệt đối không dùng các lớp tùy tiện `text-[Npx]` (vi phạm R2) hoặc màu Tailwind thô `red-*`, `stone-*` (vi phạm R1).

#### Bảng Thang Cỡ Chữ Chuẩn Hóa
| Lớp Token | Kích thước | Chiều cao dòng (line-height) | Quy tắc sử dụng |
|---|---|---|---|
| `text-caption` | 11px | 1.35 | Huy hiệu, tag, nhãn nhỏ, trạng thái phụ (thay thế `text-[10px]`, `text-[10.5px]`, `text-[11px]`, `text-[11.5px]`) |
| `text-meta` | 12px | 1.4 | Ngày tháng, metadata, chú giải bảng, thanh điều hướng phụ (thay thế `text-[12px]`, `text-[12.5px]`) |
| `text-body-sm` | 13px | 1.5 | Đoạn mô tả ngắn gọn, thông báo inline, ghi chú form (thay thế `text-[13px]`) |
| `text-body` | 13.5px | 1.5 | Văn bản nội dung thông thường, nhãn trường nhập liệu, nội dung thẻ (thay thế `text-[13.5px]`, `text-[14px]`) |
| `text-title-sm` | 14.5px | 1.4 | Tiêu đề khối con, tiêu đề card, tiêu đề nhóm (thay thế `text-[14.5px]`, `text-[15px]`) |
| `text-title` | 17px | 1.3 | Tiêu đề màn hình chính, tiêu đề modal, đề mục quan trọng (thay thế `text-[16px]`, `text-[17px]`, `text-[18px]`) |
| `text-display` | 20px | 1.25 | Chỉ số KPI lớn, số liệu thống kê nổi bật (thay thế `text-[19px]`, `text-[20px]`) |

#### Bảng Token Màu Ngữ Nghĩa Bổ Sung
| Token CSS | Lớp tiện ích Tailwind | Mục đích | Tỷ lệ tương phản WCAG (Luminance) |
|---|---|---|---|
| `--color-selected` / `--color-selected-text` | `bg-selected`, `text-selected-text` | Mục đang chọn trong danh sách / thanh điều hướng | 7.15:1 (Đạt AAA/AA) |
| `--color-info` / `--color-info-bg` | `text-info`, `bg-info-bg` | Thông tin hướng dẫn, gợi ý phụ | 5.12:1 (Đạt AA) |
| `--color-guidance` / `--color-guidance-bg` | `text-guidance`, `bg-guidance-bg` | Khối hướng dẫn thao tác `FeatureGuidanceCard` | 5.42:1 (Đạt AA) |
| `--color-guidance-border` | `border-guidance-border` | Viền nét đứt của khối hướng dẫn | Phân biệt rõ rệt |
| `--color-guidance-text` | `text-guidance-text` | Tiêu đề chính của khối hướng dẫn | 12.80:1 (Đạt AAA) |
| `--color-accent-text` | `text-accent-text` | Chữ mang màu nhấn (nhãn, liên kết, badge) trên nền sáng. `text-accent` (#C89B3C, ~2.4:1) chỉ dành cho icon/trang trí | Mộc Lan 7.61:1 surface · 7.09:1 background; modern-slate 7.31 · 6.98; pure-swiss 5.48 · 5.25 (Đạt AA) |

---

# ALG UX CONSTITUTION
## Global UX Quality & Production Readiness Standard

**Document ID:** `ALG-UX-CONSTITUTION-001`  
**Version:** `1.0.0`  
**Status:** GOVERNANCE BASELINE  
**Audience:** Claude Code, Antigravity, Cursor, Codex, product designers, UX designers, frontend engineers, AI design agents  
**Applies to:** FloraOS and `floraos-core`

---

# 00. PURPOSE

This document defines the **global UX governance rules** for ALG.

It exists to solve a recurring problem:

> A UI can be technically correct, visually attractive, and component-consistent while still being cluttered, text-heavy, difficult to scan, difficult to operate, and not production/commercial-ready.

Therefore ALG UX quality MUST be governed at multiple levels:

```text
ROLE UX
+
INFORMATION ARCHITECTURE
+
INFORMATION DENSITY
+
INTERACTION DESIGN
+
DESIGN SYSTEM
+
ACCESSIBILITY
+
PRODUCTION QA
```

This document defines those global rules.

The existing:

```text
ALG-ROLE-UX-AI-AGENT-EXECUTION-CONTRACT.md
```

defines role-specific UX behavior.

This document defines the **global UX quality system** that applies across all roles.

---

# 01. UX GOVERNANCE ARCHITECTURE

The target architecture is:

```text
                    ALG UX SYSTEM
                           │
              ┌────────────┴────────────┐
              │                         │
       GLOBAL UX CONSTITUTION      ROLE UX LAYER
              │                         │
       Universal UX Rules          Role Philosophy
       IA Rules                    Jobs
       Density Rules               Priorities
       Interaction Rules           Workflows
       Accessibility               AI Behavior
       Production QA               Handoffs
              │                         │
              └────────────┬────────────┘
                           ↓
                    SCREEN CONTRACT
                           ↓
                   EXISTING DESIGN SYSTEM
                           ↓
                 COMPONENTS / PATTERNS
                           ↓
                    IMPLEMENTATION
                           ↓
                    UX LINT / QA
                           ↓
                 PRODUCTION READY
```

---

# 02. CORE UX PRINCIPLES

## UX-001 — One Screen, One Primary Job

Every screen MUST have one clearly identifiable primary job.

The Agent MUST be able to answer:

```text
What is the user here to accomplish?
```

If the answer contains multiple unrelated jobs, the screen MUST be reviewed for:

- separation
- progressive disclosure
- navigation
- workflow restructuring

### Example

Bad:

```text
Sales Dashboard
+ CRM
+ Marketing
+ Product Analytics
+ Customer Analytics
+ Finance
+ Reports
```

Better:

```text
Sales
→ Pipeline
→ Opportunity
→ Next Action
```

---

# 03. UX-002 — One Primary Question

Every major screen MUST have one primary user question.

Examples:

### Sales

```text
Which opportunities need my action?
```

### Coordinator

```text
What is at risk right now?
```

### CSKH

```text
What does this customer need right now?
```

### Product Manager

```text
Which products are not commercially ready?
```

### Finance

```text
Which transactions require attention?
```

The UI hierarchy MUST support the primary question.

---

# 04. UX-003 — Information Is Not Equal

Not all information deserves equal visual weight.

Every screen SHOULD classify information into:

```text
L0 — Essential
L1 — Actionable
L2 — Context
L3 — Detail
L4 — Advanced / Technical
```

## L0 — Essential

Information the user must understand immediately.

## L1 — Actionable

Information that leads directly to a user action.

## L2 — Context

Information needed to make a decision.

## L3 — Detail

Information useful for investigation or verification.

## L4 — Advanced

Technical, raw, historical or expert-level information.

### Default visibility

```text
Initial viewport:
L0 + L1

Expanded:
L2

Detail:
L3

Advanced:
L4
```

The Agent MUST NOT expose every available field simply because the field exists.

---

# 05. UX-004 — Progressive Disclosure by Default

ALG MUST progressively reveal complexity.

Preferred information flow:

```text
WHAT MATTERS?
      ↓
WHAT SHOULD I DO?
      ↓
WHY?
      ↓
DETAIL
      ↓
RAW / ADVANCED DATA
```

Avoid:

```text
ALL DATA
+
ALL METRICS
+
ALL HISTORY
+
ALL SETTINGS
+
ALL ACTIONS
```

### Example

Bad:

```text
128 orders
43 pending
12 delayed
8 cancelled
35 completed
...
20 columns of order data
...
```

Better:

```text
8 orders need attention

3 SLA at risk
2 partner issues
3 address issues

[Resolve issues]

────────────────────

128 active orders
92 on track
28 in progress
8 at risk

[View all]
```

The user can progressively enter deeper levels.

---

# 06. UX-005 — Information Density Must Be Controlled

Every screen MUST have an intentional information-density level.

Recommended levels:

```text
LOW
MEDIUM
HIGH
EXPERT
```

### LOW

Use for:
- onboarding
- first-time workflows
- simple actions
- executive summaries

### MEDIUM

Default for most operational screens.

### HIGH

Use for:
- operational control
- pipeline management
- transaction processing
- quality inspection

### EXPERT

Use for:
- admin
- technical configuration
- advanced analytics
- audit
- data management

High density MUST NOT mean:

> Show everything at once.

High density means:

> Efficiently expose relevant information for an expert workflow while preserving hierarchy.

---

# 07. UX-006 — Content Budget

Every major screen SHOULD have a content budget.

This is a governance mechanism to prevent AI-generated UI from continuously adding information.

## Dashboard / Workspace

Recommended starting constraints:

```yaml
primary_message: 1
primary_action_group: <= 1
primary_ctas: <= 3
critical_alert_groups: <= 3
major_sections: <= 5
```

## Detail Page

```yaml
primary_object: 1
primary_action: 1
secondary_actions: <= 3
major_information_groups: <= 7
```

## Modal

```yaml
purpose: 1
primary_action: 1
secondary_actions: <= 2
```

These are **design heuristics**, not absolute mathematical limits.

The Agent may exceed them only when workflow evidence justifies the additional density.

---

# 08. UX-007 — Visual Hierarchy

Every screen MUST have an obvious hierarchy.

Recommended hierarchy:

```text
1. Page purpose
2. Primary state / problem
3. Primary action
4. Important supporting context
5. Secondary information
6. Detail
7. Advanced information
```

Visual hierarchy SHOULD be expressed through:

- typography
- spacing
- grouping
- positioning
- contrast
- size
- progressive disclosure

Do not use color alone to create hierarchy.

---

# 09. UX-008 — Reduce Text, Preserve Meaning

ALG MUST NOT solve unclear UX by adding explanatory paragraphs everywhere.

When text is excessive, first investigate:

```text
Can hierarchy solve this?
Can grouping solve this?
Can labeling solve this?
Can an icon + label solve this?
Can progressive disclosure solve this?
Can a better component solve this?
Can a tooltip solve this?
Can the workflow be simplified?
```

Only then add explanatory text.

---

# 10. UX-009 — UI Copy Must Be Action-Oriented

Prefer:

```text
Resolve issue
Add customer
Create campaign
Assign order
Review partner
Publish product
```

Avoid vague:

```text
Continue
Submit
Process
Manage
Proceed
Action
```

unless context makes the meaning unambiguous.

Buttons SHOULD describe the result of the action.

---

# 11. UX-010 — Primary CTA Discipline

Every screen MUST have a clearly identifiable primary action where an action is expected.

Primary CTA should:

- correspond to the primary job
- be visually dominant
- be singular where possible
- be placed consistently
- not compete with multiple equally strong CTAs

If there are many equally important actions, reconsider whether the screen contains multiple jobs.

---

# 12. UX-011 — Secondary Actions

Secondary actions SHOULD remain visually subordinate.

Examples:

```text
Primary:
Resolve

Secondary:
View details
Assign
Escalate
```

Avoid:

```text
[Resolve]
[Edit]
[Delete]
[Duplicate]
[Export]
[Share]
[Archive]
[Assign]
[Escalate]
```

all receiving equal visual weight.

---

# 13. UX-012 — Exception-First Where Appropriate

For operational roles, exceptions often have greater value than normal activity.

Examples:

```text
Coordinator
Quality Control
Operations Manager
Customer Service
Finance
```

For these roles:

```text
Exception
>
Normal activity
```

The Agent MUST NOT automatically prioritize historical KPI dashboards over active operational problems.

---

# 14. UX-013 — Role Determines Density

The same business object may legitimately appear differently for different roles.

Example:

```text
Order
```

### Sales

Focus:

```text
Customer
Opportunity
Value
Next Action
```

### Coordinator

Focus:

```text
Status
SLA
Assignment
Location
Exception
```

### Finance

Focus:

```text
Transaction
Payment
Reconciliation
Settlement
```

Same underlying object.

Different UX hierarchy.

---

# 15. UX-014 — Do Not Duplicate Source of Truth

Role-specific UX MUST NOT create separate copies of the same business object.

One:

```text
Customer
```

may have multiple role views.

It must not become:

```text
Sales Customer
CRM Customer
CSKH Customer
Marketing Customer
```

unless there is an explicit domain reason.

Preferred:

```text
Shared Business Object
        +
Role-specific presentation
```

---

# 16. INFORMATION ARCHITECTURE GOVERNANCE

## IA-001 — Organize Around User Jobs

Navigation SHOULD reflect:

```text
What users do
```

rather than only:

```text
What data exists
```

Bad:

```text
Customers
Orders
Products
Reports
Settings
```

Better where appropriate:

```text
My Work
Sales
Customers
Operations
Marketing
Products
Performance
```

The actual IA must be reconciled with current ALG-Core before implementation.

---

# 17. IA-002 — Avoid Navigation Explosion

Do not create a new navigation item for every new feature.

Before adding navigation:

1. Does the feature represent a distinct user job?
2. Does it have a distinct workflow?
3. Is it used frequently?
4. Can it belong naturally to an existing workspace?
5. Can progressive disclosure solve the requirement?

If not, do not add another top-level navigation item.

---

# 18. IA-003 — Workspace Before Object Where Appropriate

When a role is workflow-oriented, the default entry point SHOULD be a workspace.

Examples:

```text
Sales → Pipeline
Marketing → Creative Workspace
Coordinator → Control Tower
CSKH → Conversation Workspace
Finance → Transaction Workspace
```

Object detail remains accessible inside the workspace.

---

# 19. IA-004 — Context Preservation

When navigating between related objects, preserve relevant context.

Example:

```text
Customer
→ Order
→ Issue
→ Partner
```

The user should not lose the original context unnecessarily.

---

# 20. IA-005 — Scope Must Be Visible

When information spans:

```text
Platform
Tenant
Chain
Store
```

the active scope MUST be understandable.

Never allow a user to wonder:

> "Am I changing this store or every store?"

Scope becomes especially important for:

- Admin
- CEO
- Manager
- Partner Manager
- Marketing
- Product
- Finance

---

# 21. INTERACTION DESIGN STANDARD

ALG SHOULD align interaction behavior with recognized human-centered interaction principles.

The design should support:

- suitability for the task
- self-descriptiveness
- conformity with expectations
- learnability
- controllability
- error tolerance
- user engagement

These principles are intended as UX evaluation criteria, not as permission to introduce unnecessary complexity.

---

# 22. Interaction Predictability

Users should be able to predict:

```text
What will happen if I click this?
Where will I go?
What will change?
Can I undo it?
```

Actions with significant consequences MUST communicate:

- impact
- scope
- consequence
- confirmation requirements where appropriate

---

# 23. Interaction Feedback

Every meaningful action should provide appropriate feedback.

Possible states:

```text
Idle
Loading
Success
Partial Success
Error
Disabled
Empty
Pending
Processing
Completed
```

The Agent MUST NOT design only the happy path.

---

# 24. STATE COMPLETENESS STANDARD

Every major component/screen MUST consider:

```text
Default
Loading
Empty
Error
Success
Disabled
Permission Restricted
No Access
Partial Data
Offline / Connection Issue where relevant
```

A production-ready UI is not complete when only the default state works.

---

# 25. ERROR DESIGN

Errors MUST help the user recover.

Bad:

```text
Error 500
Something went wrong.
```

Better:

```text
Unable to publish this product.

The product is missing:
• Price
• Main image

[Complete product]
```

Error messages SHOULD communicate:

```text
What happened?
Why?
What can I do?
```

---

# 26. EMPTY STATE DESIGN

Empty states MUST explain:

1. What is empty?
2. Why?
3. What should the user do?

Example:

```text
No campaigns yet.

Create your first campaign to start publishing content.

[Create campaign]
```

Avoid decorative empty states with no next action.

---

# 27. LOADING STATE DESIGN

Loading should preserve layout where possible.

Prefer:

```text
Skeleton
Progressive loading
Clear processing state
```

Avoid:

```text
Blank page
Spinner without context
Layout jumping
```

For long-running AI operations, show:

```text
What is happening
Current stage
Expected next step
Cancel / stop where supported
```

---

# 28. RESPONSIVE UX

Responsive behavior MUST be designed intentionally.

The Agent MUST NOT treat mobile as:

> Desktop but narrower.

For each important screen define:

```yaml
desktop:
tablet:
mobile:
```

Determine:

- what remains visible
- what collapses
- what becomes secondary
- what becomes a drawer
- what becomes tabs
- what remains primary CTA
- how tables transform
- how dense workflows remain usable

---

# 29. DESIGN SYSTEM GOVERNANCE

The Design System is shared across roles.

Shared elements include:

```text
Typography
Color
Spacing
Grid
Icons
Buttons
Inputs
Tables
Cards
Dialogs
Navigation
Tabs
Badges
Alerts
Charts
States
```

Role UX does not authorize arbitrary visual divergence.

---

# 30. COMPONENT CREATION RULE

Before creating a new component:

```text
SEARCH
→ REUSE
→ EXTEND
→ COMPOSE
→ CREATE
```

A new component requires:

```yaml
existing_component_checked:
existing_pattern_checked:
why_existing_is_insufficient:
new_component_name:
purpose:
variants:
states:
reuse_scope:
accessibility:
responsive_behavior:
```

---

# 31. DESIGN TOKEN GOVERNANCE

Do not introduce arbitrary:

- colors
- font sizes
- spacing values
- border radii
- shadows
- breakpoints

when equivalent design tokens already exist.

If a new token is necessary:

```yaml
token:
purpose:
existing_token_checked:
reason_new_token_required:
scope:
```

---

# 32. ACCESSIBILITY BASELINE

ALG SHOULD use **WCAG 2.2** as its accessibility baseline.

Accessibility considerations MUST include:

- contrast
- keyboard navigation
- focus visibility
- semantic structure
- labels
- error identification
- target sizes
- alternative text
- status communication
- screen-reader semantics where relevant

Accessibility is not a final-stage polish task.

It belongs inside component and screen design.

---

# 33. PRODUCTION READINESS STANDARD

A screen is not production-ready merely because:

```text
It renders.
```

Production readiness requires:

```text
UX
+
Visual
+
Interaction
+
Responsive
+
Accessibility
+
Data
+
Permission
+
Error Handling
+
Loading
+
Empty States
+
Performance
```

---

# 34. PRODUCTION QA MATRIX

Every significant screen SHOULD pass:

| QA Dimension | Question |
|---|---|
| Role | Is this correct for the role? |
| Job | Is the primary job obvious? |
| IA | Is information in the correct place? |
| Density | Is there unnecessary information? |
| Hierarchy | Can users scan it quickly? |
| CTA | Is the primary action obvious? |
| Workflow | Can the user complete the task? |
| States | Are non-default states covered? |
| Responsive | Does it work across viewport sizes? |
| Accessibility | Can users operate it accessibly? |
| Data | Does it use the correct source of truth? |
| Permission | Are access boundaries correct? |
| AI | Is AI behavior role/scope aware? |
| Consistency | Does it follow the design system? |

---

# 35. UX LINT

ALG SHOULD eventually implement an automated or AI-assisted **UX Lint** layer.

UX Lint should detect:

```text
Too many primary CTAs
Too many cards
Too many sections
Duplicate information
Long unnecessary text
Weak hierarchy
Missing empty state
Missing loading state
Missing error state
Missing permission state
Missing mobile behavior
Missing focus state
Poor contrast
Unclear action labels
Role mismatch
Unnecessary navigation
Duplicate components
Duplicate data
```

Output:

```text
PASS
WARNING
FAIL
BLOCKED
```

---

# 36. UX LINT — EXAMPLE

Example:

```text
SCREEN: Coordinator Dashboard

FAIL
- 7 competing primary actions

WARNING
- 14 visual cards
- 3 duplicated metrics
- SLA information appears below normal orders

FAIL
- Critical exception cannot be resolved from first viewport

PASS
- Existing table component reused
- Scope is visible
```

The Agent SHOULD provide remediation recommendations.

---

# 37. SCREEN CONTRACT

Every major screen created or significantly modified by an AI Agent SHOULD have a Screen Contract.

Template:

```yaml
screen:
route:
role:
scope:

purpose:
primary_job:
primary_question:

information:
  essential:
  actionable:
  contextual:
  detail:
  advanced:

actions:
  primary:
  secondary:

content_budget:
  primary_ctas:
  cards:
  sections:
  visible_text:

states:
  default:
  loading:
  empty:
  error:
  success:
  disabled:
  permission_restricted:

responsive:
  desktop:
  tablet:
  mobile:

accessibility:
  target_level:
  keyboard:
  focus:
  contrast:
  semantics:

ai:
  recommendations:
  automation:
  approval:

data:
  source_of_truth:
  required_fields:

permissions:
  required:
  scope:

validation:
  role_fit:
  usability:
  visual:
  responsive:
  accessibility:
  data:
  performance:
```

---

# 38. SCREEN CONTRACT — REQUIRED REASONING

Before implementation, the Agent MUST answer:

```text
1. Why does this screen exist?
2. Who is it for?
3. What is the user trying to accomplish?
4. What is the one primary question?
5. What is the one primary action?
6. What information is essential?
7. What information can be hidden?
8. What is the expected workflow?
9. What exceptions exist?
10. What happens on mobile?
11. What happens when data is empty?
12. What happens when data fails?
13. What permission constraints exist?
14. What existing components can be reused?
```

---

# 39. COMMERCIAL-READY UX PRINCIPLES

A commercial product should communicate:

```text
Clarity
Confidence
Control
Consistency
Speed
Trust
```

The UI should avoid communicating:

```text
Complexity
Uncertainty
Noise
Technical implementation details
Uncontrolled data density
Inconsistent behavior
```

Commercial readiness is primarily about **confidence and usability**, not decorative visual polish.

---

# 40. VISUAL POLISH RULE

Visual polish comes AFTER:

```text
Information hierarchy
+
Workflow
+
Interaction
+
Content clarity
```

Do not attempt to solve structural UX problems using:

- gradients
- shadows
- animations
- larger cards
- more colors
- decorative illustrations
- excessive icons

---

# 41. ANTI-PATTERN: CARD EXPLOSION

Avoid:

```text
Card
Card
Card
Card
Card
Card
Card
Card
```

Cards should be used when they communicate a meaningful independent information or action group.

If many cards contain small fragments of the same workflow, consider:

- table
- list
- grouped section
- timeline
- workspace
- compact summary

---

# 42. ANTI-PATTERN: DASHBOARD EVERYTHING

Not every screen needs:

```text
KPI
Chart
Trend
Chart
Table
Activity
Chart
```

A dashboard is appropriate only when monitoring/overview is the actual job.

Operational roles may need:

```text
Queue
Exception
Action
Status
```

instead.

---

# 43. ANTI-PATTERN: TEXT WALL

Avoid long explanatory blocks.

Replace with:

```text
Hierarchy
Labels
Progressive disclosure
Tooltips
Inline guidance
Examples
Structured summaries
```

Use paragraphs only when the user genuinely needs to read prose.

---

# 44. ANTI-PATTERN: DATA DUMP

Never expose all fields simply because the backend provides them.

Instead:

```text
Primary data
→ Context
→ Detail
→ Advanced
```

---

# 45. ANTI-PATTERN: AI UI GENERATION WITHOUT GOVERNANCE

AI MUST NOT be instructed simply:

```text
"Make this page beautiful."
```

Preferred:

```text
Apply the ALG UX Constitution.
Identify the role.
Identify the primary job.
Create the Screen Contract.
Respect information density.
Reuse existing components.
Implement all required states.
Run UX Lint.
Validate production readiness.
```

---

# 46. AI DESIGN WORKFLOW

All AI-generated UI SHOULD follow:

```text
1. IDENTIFY ROLE
        ↓
2. IDENTIFY SCOPE
        ↓
3. IDENTIFY PRIMARY JOB
        ↓
4. IDENTIFY PRIMARY QUESTION
        ↓
5. REVIEW CURRENT IA
        ↓
6. REVIEW CURRENT COMPONENTS
        ↓
7. CREATE SCREEN CONTRACT
        ↓
8. DESIGN INFORMATION HIERARCHY
        ↓
9. DESIGN INTERACTION
        ↓
10. IMPLEMENT
        ↓
11. CHECK STATES
        ↓
12. CHECK RESPONSIVE
        ↓
13. CHECK ACCESSIBILITY
        ↓
14. RUN UX LINT
        ↓
15. RUN PRODUCTION QA
        ↓
16. DOCUMENT
```

---

# 47. AI MUST NOT

The Agent MUST NOT:

- redesign the entire application for one screen
- invent business rules
- invent data
- invent permissions
- create duplicate components unnecessarily
- create duplicate business objects
- add excessive copy to compensate for poor UX
- add dashboards by default
- add cards by default
- add animations by default
- create new colors arbitrarily
- create new spacing arbitrarily
- hide important exceptions
- treat mobile as an afterthought
- skip error/empty/loading states
- claim production-ready without validation

---

# 48. AI SHOULD

The Agent SHOULD:

- simplify
- reduce unnecessary text
- prioritize
- group
- progressively disclose
- reuse
- compose
- preserve context
- expose the next action
- make state visible
- make exceptions actionable
- maintain accessibility
- validate all states
- document decisions

---

# 49. UX DECISION HIERARCHY

When design decisions conflict, use:

```text
1. User safety / data integrity
2. Permission / scope correctness
3. Primary job
4. Workflow correctness
5. Information hierarchy
6. Accessibility
7. Design-system consistency
8. Visual polish
```

Visual aesthetics MUST NOT override workflow correctness.

---

# 50. UX CHANGE IMPACT

Before a significant UX change, evaluate:

```yaml
affected_roles:
affected_routes:
affected_workflows:
affected_entities:
affected_permissions:
affected_components:
affected_ai_behavior:
affected_documentation:
migration_required:
```

Do not make local changes that silently break another role.

---

# 51. UX GOVERNANCE WITH ROLE UX

The two governance documents have different responsibilities.

## This document

Controls:

```text
Global UX Quality
IA
Density
Interaction
Design System
Accessibility
Production QA
UX Lint
Screen Contract
```

## Role UX Execution Contract

Controls:

```text
Role
Mission
Jobs
Information Priority
Homepage
Navigation Priority
Workflow
AI Behavior
Exceptions
Handoffs
Role Acceptance Criteria
```

Relationship:

```text
GLOBAL UX CONSTITUTION
          +
ROLE UX CONSTITUTION
          ↓
SCREEN CONTRACT
          ↓
IMPLEMENTATION
```

---

# 52. RECOMMENDED UX DOCUMENTATION ARCHITECTURE

Recommended:

```text
docs/
└── ux/
    ├── ALG-UX-CONSTITUTION.md
    │
    ├── role-ux/
    │   ├── role-ux-constitution.md
    │   ├── role-ux-philosophy-matrix.md
    │   ├── role-ux-pattern-map.md
    │   ├── role-ux-handoff-matrix.md
    │   ├── role-ux-ai-rules.md
    │   ├── role-ux-notification-rules.md
    │   ├── role-ux-exception-rules.md
    │   └── role-ux-acceptance-criteria.md
    │
    ├── information-architecture/
    ├── design-system/
    ├── components/
    ├── patterns/
    ├── workflows/
    ├── screens/
    └── audits/
```

The actual location MUST be reconciled with the existing ALG-Core documentation architecture.

---

# 53. EXTERNAL STANDARDS BASELINE

ALG UX governance SHOULD use recognized external standards as references.

## ISO 9241-210

Use for:

- human-centred design
- design process
- understanding users
- iterative evaluation
- human-system interaction lifecycle

## ISO 9241-110

Use for:

- interaction principles
- task suitability
- self-descriptiveness
- conformity with expectations
- learnability
- controllability
- error robustness
- user engagement

## ISO 9241-112

Use for:

- information presentation
- organization
- clarity
- perception
- understanding

## WCAG 2.2

Use for:

- accessibility
- perceivable content
- operability
- understandable interfaces
- robust implementation

## Nielsen Usability Heuristics

Use for:

- usability inspection
- visibility of system status
- match with real world
- consistency
- error prevention
- recognition over recall
- flexibility
- minimalist design
- error recovery
- help/documentation

These standards/frameworks are **reference criteria**, not permission to copy another product's UI.

---

# 54. IMPORTANT: ISO IS NOT A DESIGN SYSTEM

Do not interpret ISO as:

```text
ISO = UI component library
```

ISO provides principles and process guidance.

ALG still requires:

```text
Design System
+
UX Constitution
+
Role UX
+
Screen Contracts
+
UX Lint
+
QA
```

---

# 55. PRODUCTION-READY DEFINITION

A screen is considered **Production Ready** only when:

```text
[ ] Primary job is clear
[ ] Primary question is clear
[ ] Information hierarchy is intentional
[ ] Information density is controlled
[ ] Primary CTA is clear
[ ] Secondary actions are subordinate
[ ] Progressive disclosure is applied
[ ] Current design system is reused
[ ] No unnecessary new components exist
[ ] Loading state exists
[ ] Empty state exists
[ ] Error state exists
[ ] Permission state exists where relevant
[ ] Responsive behavior is defined
[ ] Accessibility is addressed
[ ] Data source is verified
[ ] Permissions are verified
[ ] AI behavior is role-aware where applicable
[ ] Exceptions are handled
[ ] Handoffs are preserved
[ ] UX Lint passes
[ ] Visual QA passes
[ ] No known critical UX blocker remains
```

---

# 56. COMMERCIAL-READY DEFINITION

Commercial-ready means the product is sufficiently clear, reliable and coherent that a real customer can use it without feeling that the system is unfinished.

Minimum characteristics:

```text
Clear
Consistent
Predictable
Fast to understand
Fast to operate
Trustworthy
Recoverable
Accessible
Responsive
Professional
```

Commercial readiness is not equivalent to:

```text
More animation
More colors
More charts
More cards
More information
```

---

# 57. FINAL UX QUALITY MODEL

ALG UX quality should be evaluated as:

```text
             UX QUALITY
                 │
     ┌───────────┼───────────┐
     ↓           ↓           ↓
  CLARITY     CONTROL      CONFIDENCE
     │           │           │
     ↓           ↓           ↓
    IA        Workflow     Consistency
  Hierarchy   Actions      Design System
  Density     States       Accessibility
  Content     Recovery     Reliability
     │           │           │
     └───────────┼───────────┘
                 ↓
          COMMERCIAL READY
```

---

# 58. FINAL AGENT DIRECTIVE

When creating or modifying any ALG UI, the Agent MUST NOT start by asking:

```text
"What would look good?"
```

The Agent MUST start with:

```text
Who is the user?
What is their role?
What is their scope?
What are they trying to accomplish?
What is the one primary question?
What information is essential?
What action matters?
What can be hidden?
What is the workflow?
What exceptions exist?
What existing components can be reused?
What states must be supported?
```

Then:

```text
DESIGN
→ IMPLEMENT
→ LINT
→ TEST
→ VALIDATE
```

---

# 59. MASTER UX RULE

> **ALG should not show users everything the system knows. It should show users what they need to know, when they need to know it, in the order required to make the next correct decision or action.**

This is the central rule of the ALG UX Constitution.

---

# 60. RELATIONSHIP TO AI AGENT EXECUTION CONTRACT

The AI Agent MUST use both documents together.

```text
ALG-UX-CONSTITUTION.md
        │
        │ Global UX quality rules
        ↓
ALG-ROLE-UX-AI-AGENT-EXECUTION-CONTRACT.md
        │
        │ Role-specific rules
        ↓
CURRENT ALG-CORE
        │
        ↓
AUDIT
        │
        ↓
SCREEN CONTRACT
        │
        ↓
IMPLEMENTATION
        │
        ↓
UX LINT
        │
        ↓
PRODUCTION QA
```

Neither document should silently override the other.

If a conflict is found:

```text
STOP
→ IDENTIFY CONFLICT
→ DOCUMENT EVIDENCE
→ REQUEST HUMAN DECISION
```

---

# 61. CHANGE CONTROL

This document is a governance document.

Agents MUST NOT silently modify:

- global UX principles
- information-density principles
- content-budget principles
- role/global separation
- production-readiness criteria
- component reuse rules
- accessibility baseline
- Screen Contract structure

If change is required, create:

```yaml
change_id:
current_rule:
problem:
evidence:
proposed_change:
affected_roles:
affected_screens:
affected_systems:
risk:
migration:
```

Then wait for explicit authorization.

---

# 62. VERSIONING

Version format:

```text
MAJOR.MINOR.PATCH
```

### MAJOR

Changes global UX philosophy or governance architecture.

### MINOR

Adds a new governed UX capability or rule without breaking existing principles.

### PATCH

Clarification, typo correction, example improvement or non-semantic refinement.

---

# 63. END STATE

The final ALG UX system should operate as:

```text
                 ALG UX GOVERNANCE
                          │
          ┌───────────────┴────────────────┐
          │                                │
 GLOBAL UX CONSTITUTION              ROLE UX LAYER
          │                                │
   IA / Density                     Role Philosophy
   Interaction                     Jobs / Priorities
   Design System                   Workflow
   Accessibility                   AI
   Production QA                   Exceptions
   UX Lint                         Handoffs
          │                                │
          └───────────────┬────────────────┘
                          ↓
                   SCREEN CONTRACT
                          ↓
                  CURRENT DESIGN SYSTEM
                          ↓
                     IMPLEMENTATION
                          ↓
                     UX LINT
                          ↓
                   PRODUCTION QA
                          ↓
                  COMMERCIAL READY
```

The objective is not to make every ALG screen visually impressive.

The objective is to make every ALG screen:

**clear, purposeful, role-appropriate, efficient, predictable, consistent, accessible, recoverable, and commercially trustworthy.**

---

**END OF ALG UX CONSTITUTION**
