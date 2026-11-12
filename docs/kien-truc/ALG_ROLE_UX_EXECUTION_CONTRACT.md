> [!IMPORTANT]
> **Trạng thái trong floraos-core: `SUPPORTING` (Level 3), bản v1.1 — PO duyệt 26/09/2026.**
> SSOT thi hành là **`docs/dac-ta/03b-role-ux.md`** (CANONICAL) + `src/modules/organization/domain/role-ux-catalog.ts`. Tệp này giữ nguyên văn hợp đồng gốc v1.0 để tra cứu lý do và khung audit (Phần B). Chỗ nào khác với 03b thì **03b thắng**.
>
> **Thay đổi v1.0 → v1.1 (PO 26/09/2026):**
> 1. Vai `admin` đổi tên thành **`platform_admin`**, tức Quản trị nền tảng, dùng Console Vận hành `/van-hanh`. Đây không phải vai của tổ chức (D-RU3).
> 2. 14 vai là **vai trải nghiệm** (khuôn UX), gắn vào vai phân quyền có sẵn (`roles.key`). Không đổi khoá vai trong CSDL: `dieu_hanh` dùng khuôn `store_manager`, `sale` dùng `sales`, `dieu_phoi` dùng `coordinator` (D-RU1).
> 3. Vai chưa có dữ liệu hay luồng thì **hiện nhưng vô hiệu**, trạng thái `IN_DEVELOPMENT`, có nợ ở `TECHNICAL_DEBT.md` (#162–#168) (D-RU1).
> 4. Nguyên tắc "một bộ màn hình" của `03-ux-architecture.md` §2 đã sửa để khớp RULE-003: dùng chung màn hình và component, vai quyết định trang chủ, thứ tự và ưu tiên (D-RU2). Anti-pattern #3 không còn mâu thuẫn với tài liệu Level 2/3.
> 5. §15 (đa vai): **hoãn**, mỗi người một vai trong một tổ chức (D-RU4, nợ #162).
> 6. §22 (thư mục `role-ux/` 10 tệp) và §32 (15 tệp `*_ALIGNMENT.md`): **gộp** thành `03b-role-ux.md` + các dòng nợ, theo Hiến pháp tài liệu (chống trôi dạt tài liệu).

---

# ALG ROLE UX — AI AGENT EXECUTION CONTRACT

**Document ID:** `ALG-UX-ROLE-001`  
**Version:** `1.0.0`  
**Status:** EXECUTION BASELINE  
**Audience:** Claude Code, Antigravity, Cursor, Codex, other AI coding/design/documentation agents  
**Applies to:** FloraOS / `floraos-core`  
**Primary objective:** Add a governed Role UX Layer to ALG without blindly redesigning or replacing the existing system.

---

# 00. AGENT OPERATING MODE

This document is an **execution contract**, not a suggestion document.

The AI Agent MUST treat all sections marked `LOCKED`, `MUST`, or `MUST NOT` as binding instructions.

The Agent MUST NOT reinterpret locked decisions unless the human explicitly changes this document.

The Agent MUST distinguish between:

```text
FACT
DECISION
RULE
ASSUMPTION
UNKNOWN
RECOMMENDATION
```

The Agent MUST NOT convert an `UNKNOWN` into an invented `FACT`.

---

# 01. PRIMARY OBJECTIVE

Implement and govern a **Role UX Layer** for ALG.

The Role UX Layer determines:

- role context
- information priority
- primary user questions
- primary actions
- homepage/workspace philosophy
- navigation priority
- workflow priority
- AI behavior
- notification priority
- exception handling
- cross-role handoffs
- role-specific UX acceptance criteria

The Role UX Layer MUST sit above the existing ALG Design System.

Architecture:

```text
ALG DESIGN SYSTEM
        ↓
CURRENT INFORMATION ARCHITECTURE
        ↓
ROLE UX LAYER
        ↓
ROLE-SPECIFIC PRIORITY
        ↓
ROLE WORKFLOWS
        ↓
ROLE ACTIONS
        ↓
ROLE AI BEHAVIOR
        ↓
CURRENT ALG IMPLEMENTATION
```

The objective is NOT:

```text
"Redesign ALG from scratch."
```

The objective IS:

```text
"Bring the existing ALG implementation into alignment
with a governed Role UX architecture."
```

---

# 02. NON-NEGOTIABLE PRINCIPLES

## RULE-001 — Role ≠ Person

A person may hold one or multiple roles.

A role may be assigned to one or multiple people.

Never encode UX philosophy directly as a person-specific assumption.

---

## RULE-002 — Role ≠ Permission

Role defines:

- UX context
- priorities
- jobs
- workflow
- information hierarchy
- AI behavior

Permission defines:

- what the user may access
- what the user may modify
- what scope the user may operate within

Permission always constrains actual capability.

---

## RULE-003 — UX Philosophy ≠ Visual Style

Do not create separate visual design systems for roles.

Shared:

- typography
- colors
- spacing
- tokens
- components
- interaction primitives
- visual language

Role-specific:

- information hierarchy
- navigation priority
- homepage
- primary action
- workflow
- AI behavior
- alerts
- exceptions

---

## RULE-004 — Existing Design System First

Before creating a new UI component:

```text
SEARCH EXISTING COMPONENT
        ↓
SEARCH EXISTING PATTERN
        ↓
CHECK WHETHER IT CAN BE EXTENDED
        ↓
COMPOSE IF POSSIBLE
        ↓
CREATE NEW ONLY IF REQUIRED
```

Priority:

```text
REUSE > EXTEND > COMPOSE > CREATE
```

---

## RULE-005 — Never Invent Current-State Data

When auditing the current system:

The Agent MUST NOT invent:

- fields
- entities
- routes
- permissions
- workflows
- components
- business rules
- SLA definitions
- AI capabilities
- current implementation details

If evidence is missing:

```text
DATA GAP
WORKFLOW GAP
PERMISSION GAP
DESIGN-SYSTEM GAP
BLOCKED
```

must be used.

---

## RULE-006 — Do Not Redesign Before Audit

The Agent MUST inspect the current ALG-Core source before changing existing implementation.

Required sequence:

```text
UNDERSTAND CURRENT STATE
        ↓
MAP CURRENT STATE
        ↓
COMPARE WITH ROLE UX
        ↓
IDENTIFY GAP
        ↓
DECIDE CHANGE
        ↓
IMPLEMENT
        ↓
VALIDATE
```

Never:

```text
ROLE PHILOSOPHY
      ↓
IMMEDIATE REDESIGN
```

---

# 03. LOCKED ROLE MODEL

## 3.1 ALG CORE

### ROLE: `admin`

Primary philosophy:

```text
Governance & Control
```

Supporting philosophy:

```text
Control Tower
```

Mission:

> Govern the ALG platform, configuration, standards, scope and system-wide behavior.

Admin is NOT:

```text
"CEO of the entire business"
```

Admin is:

```text
Platform Governance
```

---

# 04. ONE STORE ROLES

## ROLE: `store_manager`

Primary:

```text
Business & Operations Command Center
```

Supporting:

```text
Executive Dashboard
```

Mission:

> Run the store effectively and intervene where business or operations require attention.

---

## ROLE: `sales`

Primary:

```text
Pipeline-first
```

Mission:

> Convert qualified opportunities into revenue.

Core workflow:

```text
Lead
→ Qualify
→ Opportunity
→ Follow-up
→ Convert
```

---

## ROLE: `crm`

Primary:

```text
Customer Lifecycle Management
```

Supporting:

```text
Relationship Management
```

Core lifecycle:

```text
Acquire
→ Convert
→ Retain
→ Reactivate
→ Grow
```

---

## ROLE: `lead_marketing`

Primary:

```text
Creative Workspace
```

Core workflow:

```text
Research
→ Create
→ Review
→ Publish
→ Learn
```

---

# 05. CHAIN / FLOWER DELIVERY NETWORK ROLES

## ROLE: `ceo`

Primary:

```text
Strategic Command Center
```

Supporting:

```text
Performance Dashboard
```

Core workflow:

```text
Signals
→ Insights
→ Decisions
→ Follow-through
```

---

## ROLE: `manager`

Primary:

```text
Operations Command Center
```

Core workflow:

```text
Plan
→ Allocate
→ Execute
→ Monitor
→ Correct
```

---

## ROLE: `coordinator`

Primary:

```text
Control Tower & Exception Management
```

Supporting:

```text
Real-time Operations
```

Core workflow:

```text
Observe
→ Detect
→ Prioritize
→ Intervene
→ Confirm
```

Critical information:

- live operational state
- critical exceptions
- SLA risk
- blocked work
- unassigned work

---

## ROLE: `quality_control`

Primary:

```text
Quality Control & Exception
```

Core workflow:

```text
Detect
→ Verify
→ Correct
→ Prevent
```

---

## ROLE: `customer_service`

Primary:

```text
Customer Context-first
```

Supporting:

```text
Conversation-first
```

Core workflow:

```text
Context
→ Conversation
→ Resolution
→ Follow-up
```

---

## ROLE: `partner_manager`

Primary:

```text
Relationship Management
```

Supporting:

```text
Partner Growth
Partner Performance
```

Core workflow:

```text
Understand
→ Evaluate
→ Develop
→ Monitor
→ Grow
```

---

## ROLE: `marketing`

Primary:

```text
Creative Workspace
```

Core workflow:

```text
Research
→ Create
→ Review
→ Publish
→ Learn
```

---

## ROLE: `product_manager`

Primary:

```text
Product-centric
```

Supporting:

```text
Catalog-centric
```

Core workflow:

```text
Define
→ Structure
→ Validate
→ Publish
→ Monitor
→ Improve
```

---

## ROLE: `finance_accounting`

Primary:

```text
Transaction-first
```

Core workflow:

```text
Transaction
→ Validate
→ Reconcile
→ Settle
→ Report
```

---

# 06. ROLE UX CONSTITUTION

For every role, the Agent MUST model:

```yaml
role:
mission:
primary_philosophy:
supporting_philosophies:
primary_jobs:
primary_questions:
information_priority:
primary_actions:
secondary_actions:
homepage_model:
navigation_model:
core_workflows:
ai_behavior:
notification_priority:
exception_behavior:
handoffs:
anti_patterns:
acceptance_criteria:
```

If any field cannot be established from this contract or current ALG-Core data, mark it:

```text
UNKNOWN / REQUIRES CORE DATA
```

Do not invent it.

---

# 07. ROLE INFORMATION HIERARCHY

The Agent MUST use role priority rather than treating all data equally.

## ADMIN

P0:
- system state
- configuration
- scope
- conflicts
- governance warnings

P1:
- configuration objects
- dependencies
- impact
- audit history

P2:
- usage
- adoption
- optimization

---

## STORE MANAGER

P0:
- today's business state
- critical exceptions
- operational issues
- intervention queue

P1:
- sales
- customers
- products
- team workload

P2:
- trends
- analysis
- opportunities

---

## SALES

P0:
- active opportunities
- next actions
- stale opportunities

P1:
- stage
- value
- last interaction
- customer context

P2:
- historical analysis
- broader reporting

---

## CRM

P0:
- customer context
- lifecycle state
- recent interaction

P1:
- relationship history
- orders
- value
- preferences

P2:
- growth opportunities
- segmentation analysis

---

## MARKETING

P0:
- campaign priorities
- content requiring action

P1:
- research
- drafts
- review queue
- publishing status

P2:
- performance
- learning

---

## CEO

P0:
- strategic KPIs
- significant changes
- major risks

P1:
- trends
- business-unit performance
- strategic opportunities

P2:
- drill-down evidence

---

## MANAGER

P0:
- current operational state
- blockers
- workload
- exceptions

P1:
- team performance
- resource gaps

P2:
- trends
- optimization

---

## COORDINATOR

P0:
- live state
- critical exceptions
- SLA risk
- blocked work

P1:
- queue
- workload
- dependencies

P2:
- patterns
- optimization

---

## QUALITY CONTROL

P0:
- active quality exceptions
- evidence
- failed checks

P1:
- verification
- corrective action

P2:
- root cause
- recurrence

---

## CUSTOMER SERVICE

P0:
- active conversation
- current issue
- customer context

P1:
- order/service context
- previous interactions

P2:
- broader customer history

---

## PARTNER MANAGER

P0:
- partner health
- current relationship
- active issues

P1:
- performance
- quality
- SLA
- development opportunities

P2:
- portfolio trends
- growth analysis

---

## PRODUCT MANAGER

P0:
- product identity
- status
- completeness
- commercial readiness

P1:
- quality
- availability
- taxonomy
- pricing

P2:
- usage
- performance
- optimization

---

## FINANCE

P0:
- transactions
- exceptions
- payment status

P1:
- reconciliation
- settlement

P2:
- aggregate reporting

---

# 08. HOMEPAGE CONSTITUTION

The homepage MUST be role-oriented.

It is not automatically a dashboard.

| Role | Homepage Model |
|---|---|
| Admin | Control Center |
| Store Manager | Business & Operations Command Center |
| Sales | Pipeline Workspace |
| CRM | Customer Lifecycle Workspace |
| Lead/Marketing | Creative Workspace |
| CEO | Strategic Command Center |
| Manager | Operations Command Center |
| Coordinator | Control Tower |
| Quality Control | Quality Exception Board |
| CSKH | Conversation Workspace |
| Partner Manager | Partner Portfolio |
| Marketing | Creative Workspace |
| Product Manager | Product Workspace |
| Finance | Transaction Workspace |

Every homepage should answer:

```text
WHERE AM I?
WHAT MATTERS NOW?
WHAT REQUIRES ACTION?
WHAT CAN I DO NEXT?
```

---

# 09. NAVIGATION CONSTITUTION

Navigation MUST be driven by role jobs, not only database entities.

The Agent MUST evaluate:

```text
Current navigation
        ↓
Role primary jobs
        ↓
Role workflow
        ↓
Required navigation priority
```

Navigation MUST:

- expose primary work first
- make exceptions discoverable
- preserve scope
- avoid unnecessary duplication
- avoid exposing irrelevant complexity
- preserve existing IA where it remains valid

The Agent MUST NOT rename or restructure routes simply because a theoretical role model suggests doing so.

Current implementation must first be audited.

---

# 10. PRIMARY ACTION CONSTITUTION

Each role MUST have a dominant action pattern.

| Role | Dominant Action |
|---|---|
| Admin | Configure / Validate / Apply |
| Store Manager | Review / Prioritize / Act |
| Sales | Follow up / Advance / Convert |
| CRM | Understand / Engage / Retain |
| Marketing | Create / Review / Publish |
| CEO | Understand / Decide / Direct |
| Manager | Assign / Correct / Control |
| Coordinator | Resolve / Escalate / Reassign |
| Quality Control | Verify / Correct / Close |
| CSKH | Respond / Resolve / Follow up |
| Partner Manager | Evaluate / Develop / Grow |
| Product Manager | Define / Validate / Publish |
| Finance | Validate / Reconcile / Settle |

---

# 11. AI BEHAVIOR CONSTITUTION

AI is an intelligence layer, not a separate role.

AI behavior MUST adapt to active role.

| Role | AI SHOULD |
|---|---|
| Admin | detect configuration issues; explain dependencies |
| Store Manager | summarize state; prioritize action |
| Sales | recommend next best action |
| CRM | recommend retention/reactivation actions |
| Marketing | research and accelerate content creation |
| CEO | surface strategic signals |
| Manager | detect operational gaps |
| Coordinator | predict SLA risk; prioritize exceptions |
| Quality Control | identify quality deviations |
| CSKH | summarize context; suggest response |
| Partner Manager | identify partner risks/opportunities |
| Product Manager | identify product data gaps |
| Finance | detect transaction anomalies |

AI MUST NOT:

- fabricate data
- fabricate business rules
- fabricate permissions
- silently change global configuration
- silently execute high-impact actions
- hide exceptions
- override role scope
- invent product specifications
- present inference as fact
- create a new UX paradigm without justification

---

# 12. NOTIFICATION CONSTITUTION

Priority:

```text
P0 = Critical
P1 = Action Required
P2 = Awareness
P3 = Informational
```

Rules:

- alerts must be actionable
- avoid alert flooding
- group related events
- preserve context
- do not rely only on color
- critical alerts require clear ownership where applicable
- relevance is role-dependent

---

# 13. EXCEPTION CONSTITUTION

Exceptions are first-class objects.

Lifecycle:

```text
Detected
→ Prioritized
→ Assigned
→ Investigated
→ Resolved
→ Verified
→ Closed
→ Learned
```

Conceptual exception data:

```yaml
what_happened:
when:
where:
affected_object:
severity:
evidence:
owner:
status:
recommended_action:
resolution:
verification:
root_cause:
recurrence:
```

Only fields supported by current Master Index may be implemented.

---

# 14. CROSS-ROLE HANDOFF CONSTITUTION

A handoff transfers context, not only status.

Baseline relationships:

```text
Marketing → Sales
Sales → CRM
Sales → Operations
Operations → CSKH
Operations → Quality Control
Quality Control → Partner Manager
Partner Manager → Manager / CEO
Product → Marketing
Finance → Manager / CEO
CRM → Marketing
Manager → Operational Roles
```

Minimum conceptual handoff:

```yaml
object:
current_state:
handoff_reason:
relevant_history:
required_action:
owner:
deadline_or_sla:
evidence:
```

The receiving role MUST NOT be forced to reconstruct the case manually where the source system can preserve context.

---

# 15. MULTI-ROLE USER CONSTITUTION

A user may hold multiple roles.

Role switching may change:

- homepage
- navigation priority
- information hierarchy
- recommended actions
- AI behavior

Role switching MUST NOT create duplicate:

- customers
- products
- orders
- partners
- transactions

Capability hierarchy:

```text
Permission
    >
Scope
    >
Active Role
    >
UX Priority
```

---

# 16. SCOPE CONSTITUTION

Conceptual scope:

```text
Platform
  ↓
Tenant / Organization
  ↓
Chain / Network
  ↓
Store
  ↓
Role
  ↓
User
```

Not every deployment needs every layer.

Scope MUST be explicit when an action may affect multiple entities.

AI MUST know active scope before recommending or executing actions.

---

# 17. ADMIN GOVERNANCE MODEL

Admin governance includes:

- shared fields
- master data
- taxonomy
- global configuration
- role / permission model
- workflow configuration
- SLA/policy
- notification rules
- AI rules
- shared templates
- tenant configuration
- subscription/plan
- feature flags
- defaults
- tenant overrides
- audit/security

Example:

```text
Field: Product → Occasion

Scope:
- All tenants
- Selected tenants
- New tenants only
```

The Agent MUST preserve scope semantics when implementing governance UX.

---

# 18. UX ANTI-PATTERNS

The Agent MUST flag:

1. Generic dashboard-first design.
2. Same UX for every role.
3. Role differences represented only by permissions.
4. Database-first navigation that ignores jobs.
5. KPI overload.
6. Action buried beneath analysis.
7. Critical exceptions buried below normal work.
8. AI recommendations without context.
9. AI actions without scope validation.
10. Duplicate screens for the same object.
11. Duplicate source-of-truth data.
12. New components when existing components suffice.
13. Whole-app redesign for local requirements.
14. Mixing platform governance with business operations.
15. Mixing strategic and transactional detail without hierarchy.

---

# 19. DESIGN-SYSTEM PRESERVATION CONTRACT

Before implementing UI changes, the Agent MUST inspect the current:

- design tokens
- component library
- layout system
- table patterns
- form patterns
- card patterns
- modal patterns
- navigation
- alerts
- dashboard patterns
- responsive behavior

Then classify the implementation:

```text
REUSE
EXTEND
COMPOSE
CREATE
```

A new component requires justification.

Required justification:

```yaml
existing_component_checked:
existing_pattern_checked:
why_existing_is_insufficient:
proposed_component:
scope:
reuse_potential:
impact:
```

---

# 20. AI AGENT UX DECISION CONTRACT

Before changing a UX screen, the Agent MUST produce or internally establish:

```yaml
role:
scope:
primary_job:
primary_question:
current_workflow:
current_screen:
role_philosophy:
information_priority:
primary_action:
exceptions:
handoffs:
existing_components:
required_data:
permissions:
proposed_change:
reason:
impacted_roles:
risks:
```

If required information is unavailable:

```text
DO NOT GUESS.
MARK BLOCKED / GAP.
```

---

# 21. PART A — EXECUTE NOW

Part A does NOT require current ALG implementation data.

The Agent MAY create/update governance documentation for:

1. Role UX Constitution
2. Role philosophy matrix
3. Role mission
4. Role primary jobs
5. Role information hierarchy
6. Role primary actions
7. Homepage philosophy
8. Navigation philosophy
9. Workflow philosophy
10. AI behavior rules
11. Notification rules
12. Exception rules
13. Cross-role handoff rules
14. Multi-role rules
15. Scope rules
16. Anti-patterns
17. UX acceptance criteria
18. AI Agent instructions
19. Documentation architecture

Part A MUST NOT make unsupported claims about current implementation.

---

# 22. PART A OUTPUT REQUIREMENTS

The Agent MUST produce/update documentation equivalent to:

```text
role-ux/
├── README.md
├── role-ux-constitution.md
├── role-ux-philosophy-matrix.md
├── role-ux-pattern-map.md
├── role-ux-handoff-matrix.md
├── role-ux-ai-rules.md
├── role-ux-notification-rules.md
├── role-ux-exception-rules.md
├── role-ux-acceptance-criteria.md
└── role-ux-core-alignment-spec.md
```

The exact folder may be changed only after inspecting the current documentation architecture.

---

# 23. PART B — REQUIRES CURRENT ALG-CORE DATA

Part B MUST NOT begin implementation changes until the Agent has inspected the actual current source.

Required inputs:

## 23.1 Documentation
- Master Index
- documentation constitution
- agent rules
- CLAUDE.md
- AGENTS.md
- other governance documents

## 23.2 Roles
- current role list
- role definitions
- role relationships

## 23.3 Permissions
- RBAC
- scope
- overrides

## 23.4 Information Architecture
- navigation
- routes
- page hierarchy

## 23.5 Data Model
- entities
- fields
- relationships
- lifecycle states
- source of truth

## 23.6 UI
- components
- patterns
- layouts
- screens
- forms

## 23.7 Workflows
- sales
- CRM
- marketing
- orders
- coordination
- QC
- CSKH
- partners
- products
- finance
- governance

## 23.8 AI
- agents
- prompts
- actions
- recommendations
- approval rules

---

# 24. REQUIRED INSPECTION ORDER

The Agent MUST inspect in this order unless a dependency requires otherwise:

```text
1. Master Index
2. Documentation Constitution
3. Agent Rules
4. Roles
5. Permissions
6. Information Architecture
7. Routes
8. Screens
9. Workflows
10. Data Model
11. Forms / Templates
12. Design System
13. AI Behavior
```

Reason:

The Agent must understand vocabulary and governance before interpreting UX.

---

# 25. CURRENT-STATE BASELINE

Before changing implementation, create:

```text
CURRENT_FLORAOS_STATE.md
```

It MUST document only verified current state.

Minimum sections:

```yaml
roles:
permissions:
scope:
navigation:
routes:
screens:
entities:
fields:
workflows:
forms:
templates:
components:
ai:
notifications:
exceptions:
handoffs:
documentation:
unknowns:
```

---

# 26. ROLE → SCREEN AUDIT

Create:

```text
ROLE_SCREEN_ALIGNMENT.md
```

For each relevant screen:

```yaml
screen:
route:
current_purpose:
current_roles:
primary_role:
role_primary_job:
current_primary_action:
current_information_priority:
expected_role_philosophy:
alignment:
evidence:
required_change:
```

Alignment values:

```text
STRONG
PARTIAL
MISALIGNED
MISSING
CONFLICTING
UNKNOWN
```

---

# 27. ROLE → DATA AUDIT

Create:

```text
ROLE_DATA_ALIGNMENT.md
```

For each role:

```yaml
role:
business_objects:
required_fields:
existing_fields:
missing_fields:
field_conflicts:
source_of_truth:
permission_constraints:
ux_implications:
```

No new field may be declared “required” until the Master Index/data model is checked.

---

# 28. ROLE → WORKFLOW AUDIT

Create:

```text
ROLE_WORKFLOW_ALIGNMENT.md
```

Structure:

```yaml
role:
trigger:
context:
decision:
action:
result:
handoff:
exception:
current_implementation:
alignment:
gap:
```

---

# 29. ROLE → PERMISSION AUDIT

Create:

```text
ROLE_PERMISSION_ALIGNMENT.md
```

Verify:

- access
- read
- create
- edit
- delete
- approve
- publish
- execute
- configure
- scope

Do not assume that role membership automatically grants permission.

---

# 30. GAP CLASSIFICATION

Every issue MUST use exactly one primary classification:

```text
KEEP
MODIFY
ADD
REMOVE
RESTRUCTURE
DATA GAP
WORKFLOW GAP
PERMISSION GAP
DESIGN-SYSTEM GAP
BLOCKED
```

Definitions:

### KEEP
Already aligned.

### MODIFY
Correct object/workflow but wrong UX expression.

### ADD
Required capability does not exist.

### REMOVE
Creates duplication or conflict.

### RESTRUCTURE
Existing information/workflow is valid but organized incorrectly.

### DATA GAP
Required data is missing/undefined.

### WORKFLOW GAP
Business process is missing/undefined.

### PERMISSION GAP
Capability boundary is incorrect/missing.

### DESIGN-SYSTEM GAP
Existing component system cannot express the required UX.

### BLOCKED
Cannot safely decide with available evidence.

---

# 31. GAP ANALYSIS ORDER

Do not immediately label a problem as UX.

Check:

```text
DATA
 ↓
WORKFLOW
 ↓
PERMISSION
 ↓
INFORMATION ARCHITECTURE
 ↓
COMPONENT
 ↓
UX
```

Example:

Coordinator cannot see SLA.

First inspect:

```text
Does SLA exist?
→ Is SLA calculated?
→ Is SLA documented?
→ Is SLA accessible?
→ Is SLA displayed?
→ Can current component show it?
→ Only then decide UX change.
```

---

# 32. REQUIRED PART B DELIVERABLES

The Agent MUST eventually produce:

```text
CURRENT_FLORAOS_STATE.md
ROLE_SCREEN_ALIGNMENT.md
ROLE_DATA_ALIGNMENT.md
ROLE_WORKFLOW_ALIGNMENT.md
ROLE_PERMISSION_ALIGNMENT.md
ROLE_UX_GAP_ANALYSIS.md
NAVIGATION_IA_ALIGNMENT.md
HOMEPAGE_ALIGNMENT.md
COMPONENT_REUSE_GAP.md
FORM_TEMPLATE_ALIGNMENT.md
AI_UX_ALIGNMENT.md
EXCEPTION_NOTIFICATION_ALIGNMENT.md
CROSS_ROLE_HANDOFF_MAP.md
UX_MIGRATION_PLAN.md
UX_ACCEPTANCE_TESTS.md
```

---

# 33. CURRENT → TARGET DECISION MATRIX

Every material UX finding should map:

| Current | Target | Decision | Reason | Evidence |
|---|---|---|---|---|
| Current implementation | Role UX requirement | KEEP/MODIFY/etc. | Explanation | Source |

No target should be proposed without an evidence trail when current-state data exists.

---

# 34. IMPLEMENTATION SEQUENCE

After audit:

```text
PHASE 1
Governance / Documentation
        ↓
PHASE 2
Information Architecture
        ↓
PHASE 3
Role Homepages / Workspaces
        ↓
PHASE 4
Core Workflows
        ↓
PHASE 5
Exceptions / Notifications
        ↓
PHASE 6
Cross-role Handoffs
        ↓
PHASE 7
AI UX
        ↓
PHASE 8
Component / Design-System Refinement
        ↓
PHASE 9
Validation
        ↓
PHASE 10
Documentation Lock
```

Do not implement later phases while foundational conflicts remain unresolved unless explicitly authorized.

---

# 35. VALIDATION CONTRACT

Every implemented role UX change MUST pass:

## Role fit
- primary role identified
- primary job identified
- philosophy correctly applied

## Information
- P0 information visible
- irrelevant information does not dominate
- scope is clear

## Action
- primary action is clear
- next action is available
- exceptions are actionable

## Workflow
- workflow state is clear
- handoff context is preserved
- no unnecessary navigation

## Data
- no invented fields
- source of truth preserved
- data dependencies documented

## Permission
- no access escalation
- scope respected
- actions match permissions

## Design system
- existing components reused where possible
- no unnecessary duplicate component
- visual consistency preserved

## AI
- role-aware
- scope-aware
- evidence-based
- approval-aware
- no silent high-impact action

---

# 36. DEFINITION OF DONE

This initiative is complete only when:

```text
[ ] Every role has a locked UX philosophy.
[ ] Every role has a documented primary job.
[ ] Every role has information hierarchy.
[ ] Every role has homepage/workspace model.
[ ] Every role has navigation principles.
[ ] Every role has primary actions.
[ ] Every role has AI behavior.
[ ] Exceptions are modeled.
[ ] Handoffs are modeled.
[ ] Multi-role behavior is defined.
[ ] Scope is defined.
[ ] Current screens are mapped to roles.
[ ] Current data is mapped to roles.
[ ] Current workflows are mapped.
[ ] Permissions are validated.
[ ] Gaps are classified.
[ ] Existing components are reused where possible.
[ ] No duplicate source of truth is introduced.
[ ] AI agent rules are updated.
[ ] Documentation references are consistent.
[ ] Acceptance tests pass.
```

---

# 37. FAILURE CONDITIONS

The Agent MUST STOP and report rather than guess if:

1. Master Index conflicts with another source of truth.
2. Current roles conflict across documents.
3. A critical workflow is undocumented.
4. A required field has no authoritative definition.
5. Permissions contradict role behavior.
6. Multiple sources claim ownership of the same data.
7. A proposed UX requires business rules not defined anywhere.
8. A global change has unclear scope.
9. AI behavior could cause irreversible/high-impact action without approval policy.
10. Existing documentation governance conflicts with this contract.

Required response format:

```yaml
status: BLOCKED
reason:
conflicting_sources:
missing_information:
impact:
recommended_resolution:
```

---

# 38. CHANGE CONTROL

The following are LOCKED unless the human owner explicitly changes them:

- role list
- role philosophy
- primary/supporting philosophy distinction
- Role ≠ Person
- Role ≠ Permission
- Role UX ≠ Visual Design System
- reuse-before-create rule
- no guessing rule
- audit-before-redesign rule

If the Agent believes a locked decision should change:

```text
DO NOT silently change it.
CREATE CHANGE PROPOSAL.
WAIT FOR HUMAN DECISION.
```

Change proposal format:

```yaml
change_id:
locked_rule:
problem:
evidence:
proposed_change:
affected_roles:
affected_systems:
risks:
migration_impact:
```

---

# 39. AGENT RESPONSE FORMAT

When executing this contract, the Agent SHOULD report progress using:

```text
STATUS
CURRENT PHASE
INPUTS VERIFIED
DECISIONS APPLIED
FINDINGS
CHANGES MADE
BLOCKERS
NEXT PHASE
```

Avoid vague statements such as:

```text
"UX improved."
"Dashboard optimized."
"Looks better."
```

Prefer:

```text
"Coordinator homepage changed from KPI-first to exception-first because
the Role UX Constitution defines Control Tower & Exception Management
as the primary philosophy."
```

---

# 40. FINAL AGENT DIRECTIVE

The Agent MUST follow this mental model:

```text
DO NOT ASK:
"What UI looks good?"

ASK:
"What does this role need to know, decide and do?"

THEN:
"What data supports that?"

THEN:
"What workflow supports that?"

THEN:
"What permission supports that?"

THEN:
"What existing component can express that?"

THEN:
"What is the smallest justified implementation change?"
```

The target is not maximum UI complexity.

The target is:

```text
ROLE CLARITY
+
INFORMATION PRIORITY
+
ACTIONABILITY
+
CONTEXT
+
WORKFLOW CONTINUITY
+
AI INTELLIGENCE
+
SYSTEM CONSISTENCY
```

---

# 41. FINAL EXECUTION PRINCIPLE

> **The existing ALG implementation is evidence of the current state, not the definition of the desired UX. The Role UX Constitution defines the desired behavioral architecture. The Agent must reconcile the two through evidence-based audit, not through blind redesign.**

End of Execution Contract.
