# ALG COORDINATOR — AI AGENT PACKAGE

This package is the documentation contract for implementing Coordinator Operations as a **feature/module added to the existing ALG system**.

## Required reading order

1. `ALG_COORDINATOR_EXISTING_SYSTEM_INTEGRATION.md`
2. `ALG_COORDINATOR_OPERATIONS_SYSTEM.md`
3. `ALG_COORDINATOR_WORKFLOW_ORCHESTRATION.md`
4. `ALG_COORDINATOR_DATABASE_ARCHITECTURE.md`
5. `ALG_COORDINATOR_USER_JOURNEY.md`
6. `ALG_COORDINATOR_TEMPLATE_ARCHITECTURE.md`
7. `ALG_COORDINATOR_PRD_WIREFRAME.md`
8. `ALG_COORDINATOR_PLAYBOOK.md`
9. `ALG_COORDINATOR_AI_AGENT_IMPLEMENTATION_CONTRACT.md`
10. `ALG_COORDINATOR_CONSISTENCY_MATRIX.md`

## Core architecture

```text
Existing ALG
      ↓
Coordinator Module
      ↓
Business Process
      ↓
User Journey
      ↓
Workflow Orchestration
      ↓
Templates
      ↓
Database
      ↓
API / UI / Automation / AI
```

## Golden rule

> **Do not build a new system. Extend the existing system without creating duplicate sources of truth.**

The repository itself must be inspected first. These documents define the intended Coordinator capability and the cross-layer contract; they do not authorize replacing existing infrastructure.
