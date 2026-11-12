# ALG COORDINATOR — EXISTING SYSTEM INTEGRATION

**Document ID:** ALG-COORD-INTEGRATION-001  
**Version:** 1.0  
**Status:** Mandatory Implementation Contract

---

## 1. Fundamental Requirement

**Coordinator Operations is NOT a standalone application.**

It is a new capability/module added to the existing ALG product.

```text
EXISTING ALG
├── existing authentication
├── existing tenant / organization model
├── existing users
├── existing customers
├── existing orders
├── existing partners
├── existing products
├── existing UI shell
├── existing API/services
└── existing infrastructure

              +
              ↓

COORDINATOR OPERATIONS MODULE
├── Control Tower
├── Order Planning
├── Partner Assignment
├── Production Monitoring
├── QC
├── Delivery
├── Exceptions
├── AI Assistance
└── Learning
```

---

# 2. Mandatory Agent Behavior

Before changing code, the AI Agent MUST inspect:

```text
package.json / package manager
README
architecture docs
src/app or equivalent
database schema
migrations
auth
tenant/org model
order model
customer model
partner/shop model
API routes
server actions/services
existing UI components
design system
state management
storage
notifications
background jobs
tests
environment configuration
```

Do not assume the stack from this documentation.

The repository's actual stack is authoritative.

---

# 3. Reuse Before Create

For every required capability:

```text
SEARCH EXISTING
      ↓
REUSE
      ↓
EXTEND
      ↓
CREATE ONLY IF ABSENT
```

Examples:

- Existing `orders` → extend it; do not create `coordinator_orders`.
- Existing `partners` → extend it; do not create `coordinator_partners`.
- Existing `users` → reuse it; do not create `coordinator_users`.
- Existing notification service → reuse it.
- Existing file storage → reuse it.
- Existing authentication → reuse it.

---

# 4. No Duplicate Sources of Truth

Forbidden unless explicitly justified:

```text
coordinator_orders
coordinator_users
coordinator_customers
coordinator_partners
coordinator_auth
coordinator_notifications
```

A module may have a module-specific table only when the entity genuinely does not exist in the current system.

---

# 5. Integration Discovery

Before coding, produce an internal gap map:

| Capability | Existing | Required | Action |
|---|---|---|---|
| Orders | ? | Order Object | Reuse/extend |
| Partner | ? | Matching | Reuse/extend |
| Auth | ? | Coordinator roles | Reuse |
| Storage | ? | QC/POD images | Reuse |
| Notifications | ? | Partner alerts | Reuse/extend |
| Background jobs | ? | Automation | Reuse/extend |
| AI | ? | Validation/QC | Extend |
| Analytics | ? | Performance | Extend |

The agent should inspect the repository and resolve `?` before implementation.

---

# 6. Safe Change Policy

Changes must be:

- additive where possible;
- backward compatible;
- migration-based;
- test-covered;
- reversible where practical.

Do not:

- drop existing columns;
- rename existing business entities;
- replace current auth;
- replace current tenant model;
- replace existing order lifecycle;
- change existing customer-facing behavior

without explicit impact analysis.

---

# 7. Existing Order Lifecycle Conflict

If the existing repository already has an order lifecycle:

```text
Existing lifecycle
       ↓
Map to Coordinator lifecycle
```

Do NOT create a second lifecycle merely because the Coordinator documentation uses different terminology.

If a new Coordinator-specific operational state is necessary:

```text
Existing commercial order status
+
Coordinator operational status
```

may be modeled separately, provided the relationship is explicit.

---

# 8. Integration Layers

Recommended module structure:

```text
Existing Application
│
├── Existing Domain
│
└── Coordinator Module
    ├── domain/
    ├── services/
    ├── workflows/
    ├── ai/
    ├── automation/
    ├── queries/
    ├── components/
    └── pages/
```

Do not create a second application unless the existing architecture explicitly requires it.

---

# 9. Database Integration

Before adding tables:

1. Find existing equivalent entity.
2. Determine ownership.
3. Determine tenant boundary.
4. Determine existing foreign keys.
5. Determine migration convention.
6. Extend existing entity if appropriate.
7. Add new entity only if justified.

All new tables must have documented relationships to existing entities.

---

# 10. UI Integration

Coordinator UI must use:

- existing application shell;
- existing navigation;
- existing typography;
- existing component library;
- existing permissions;
- existing data-fetching patterns.

Do not introduce a separate design system.

---

# 11. API Integration

Reuse existing:

- API conventions;
- auth middleware;
- validation;
- error format;
- logging;
- authorization;
- service layer.

New endpoints should be grouped under the existing API architecture.

---

# 12. Feature Flag

If the existing product supports feature flags, Coordinator should be introduced behind a feature flag during rollout.

Example:

```text
COORDINATOR_OPERATIONS_ENABLED
```

Do not introduce a new feature-flag framework if one already exists.

---

# 13. Rollout

Recommended:

```text
Schema migration
→ backend/domain
→ internal UI
→ coordinator pilot
→ production validation
→ automation
→ AI assistance
→ optimization
```

AI automation should not be activated globally before deterministic workflows are stable.

---

# 14. Integration Definition of Done

- [ ] Existing architecture inspected.
- [ ] Existing order/customer/partner entities identified.
- [ ] Existing auth and tenant model reused.
- [ ] Existing UI system reused.
- [ ] Existing API conventions reused.
- [ ] Database migrations are additive/safe.
- [ ] No duplicate source of truth.
- [ ] Existing tests still pass.
- [ ] Coordinator feature can be disabled if required.
- [ ] Backward compatibility verified.
- [ ] New workflow has monitoring/logging.
