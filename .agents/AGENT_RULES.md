# AGENT RULES & STANDARDS — FLORAOS CORE

> This document is the **mandatory core rulebook** for all AI coding agents.
> Designed in a **3-Tier Architecture (Global / Project-Enterprise / On-Demand Skills)** to optimize context token efficiency and ensure zero-friction portability to other SaaS projects.

---

# 🌐 PART I: GLOBAL SAAS STANDARDS (Universal Tier)
*100% portable across all Web/SaaS projects — Do NOT modify when copying to other repositories.*

## 1. PRIORITY CONFLICT RESOLUTION
When rules conflict, resolve strictly in this order (lower numbers ALWAYS take precedence):
1. **Safety & Stability** (Never break working features, zero data loss)
2. **System Consistency** (Follow existing patterns, no rogue abstractions)
3. **User Understanding & Accessibility** (Intuitive workflow, correct localization)
4. **Task Efficiency** (Clean, minimal, effective code changes)
5. **Visual Refinement & Polish** (Aesthetics, micro-interactions)

## 2. MODE SELECTION
- **Default `[PROD]` Mode**: ZERO scope creep. Strictly fulfill the user's explicit request. NEVER refactor unrelated code or dependencies unless directly requested.
- **`[EXPLORE]` Mode**: Active ONLY when the user explicitly includes `[EXPLORE]`. Architectural refactoring and open analysis are permitted.

## 3. CODE HYGIENE & SRP (Single Responsibility Principle)
- **1 Unit of Code = 1 Reason to Change**.
- **File Limit: Maximum 350 lines per file**. New files must not exceed it; files already over it must not grow (split first). Pure data/catalog `.ts` files may be exempted with a reason — `docs/plan/k11-file-size-policy.md`, gate `tests/unit/architecture/file-size-ratchet.test.ts`.
- **Naming Conventions**:
  - Folders / Files: `kebab-case` (e.g., `mapping-engine.ts`)
  - React Components / Types / Interfaces: `PascalCase` (e.g., `UserProfile.tsx`, `TenantContext`)
  - Variables / Functions / Hooks: `camelCase` (e.g., `calculateTotal()`, `useTenantSession()`)
  - Constants: `UPPER_SNAKE_CASE` (e.g., `MAX_RETRY_LIMIT`, `DEFAULT_TIMEOUT_MS`)

## 4. 12 SAAS ANTI-PATTERNS (Strictly Prohibited)
| # | Anti-Pattern | Critical Risk | Correct Alternative |
|---|---|---|---|
| A1 | `console.log()` in production code | Data leaks, server log spam | Centralized logger (`src/core/observability/`) |
| A2 | Hardcoded URL/Key/Secret | Severe security vulnerability | Environment variables (`.env`) |
| A3 | TypeScript `any` type | Breaks compile-time safety | Explicit types or `unknown` with type guards |
| A4 | Unchecked `as` type assertion | Masks runtime errors | Type guards or Zod `.parse()` validation |
| A5 | Direct data fetch in Client Components | Exposes internal endpoints, N+1 queries, CLS | Server Component or API Route |
| A6 | `useEffect` for data fetching | Race conditions, infinite loops | Server Components, SWR, or React Query |
| A7 | Architectural leaks (e.g., ORM in Domain) | High coupling, impossible unit testing | Port Interfaces & Dependency Inversion |
| A8 | Files exceeding 350 lines | Violates SRP, unmaintainable | Decompose into sub-components/hooks |
| A9 | Direct third-party SDK calls (AI, Payments) | Uncontrolled quota, bypasses fallback/attempt limits, privacy floor and license filter | Centralized Gateway abstraction |
| A10 | `SELECT *` or over-fetching columns | DB memory bloat, network latency | Precise column projection (`select`) |
| A11 | Manual SQL string concatenation | SQL Injection vulnerability | Parameterized queries / ORM methods |
| A12 | Tenant ID accepted from client request body | Critical cross-tenant security breach | Verified Server-Side Session ONLY |

## 5. SECURITY BASELINE
- **Zero-Trust Client Input**: ALL client input MUST pass through strict schema validation (e.g., Zod) before processing.
- **Error Obfuscation**: NEVER return raw error stacks or DB exceptions to the client. Return standardized application errors (`AppError`).
- **Server-Side File Validation**: Validate actual MIME type and file size on the server. Never rely solely on client-side validation.
- **Secret Zero-Exposure**: Secrets MUST NEVER be logged, sent to client state, or committed to git.

## 6. PERFORMANCE & WEB VITALS
- **N+1 Prevention**: Fetching relational data MUST use eager batching (`include`/`join`). NEVER execute queries inside loops.
- **Mandatory Pagination**: All list endpoints MUST enforce pagination (`limit` max 100). Cursor-based pagination is preferred over offset.
- **Server Components Default**: Default to React Server Components (RSC). Use `"use client"` ONLY when state, effects, or browser listeners are mandatory.
- **Bundle Optimization**: Use tree-shakable imports. Heavy components (charts, rich editors) MUST be dynamically loaded (`dynamic(() => import(...))`).

## 7. VERIFICATION & ERROR LEARNING PROTOCOL
- **Mandatory Pre-Handoff Checklist**:
  - [ ] Meets 100% of the user's original request?
  - [ ] User-facing strings: 100% Vietnamese verified (§8)?
  - [ ] Zero violations of the 12 Anti-patterns (§4) and SRP limit (§3)?
  - [ ] Passes typecheck, linting, and automated test suites?
- **Learning Protocol**: When fixing a recurring failure, document the root cause and solution in §14 (Known Failure Patterns) to prevent regression.

---

# 🏢 PART II: PROJECT & ENTERPRISE CONSTRAINTS (Project Tier)
*Specific to FloraOS — Customize this section when porting to another repository.*

## 8. STRICT LOCALIZATION REQUIREMENT
- **User-Facing Text MUST BE 100% VIETNAMESE**:
  - Navigation, buttons, labels, placeholders, tooltips, validation messages, empty/loading states, dialogs, and notifications MUST be in natural Vietnamese.
  - Technical terms: Use `Friendly Vietnamese (Original term if necessary)`.
  - Code identifiers (variables, functions, schema, routes) remain in English.

## 9. TECH STACK SPECIFICATIONS
| Layer | Technologies |
|---|---|
| Web & Framework | Next.js 16 (App Router), Port `3200`, React 19 (Server Components default) |
| Language & Styling | TypeScript 5.9 strict (alias `@/*`), Tailwind CSS 4, Radix UI / shadcn/ui |
| Database & ORM | PostgreSQL (Docker), Prisma 7, English `snake_case` schema |
| Background Worker | Python 3.10+ (`workers/`), `psycopg3` (SKIP LOCKED + LISTEN/NOTIFY) |
| AI Integration | OpenAI, Anthropic, ElevenLabs routed via AI Gateway (`src/core/ai/`) |
| Testing Suites | Vitest (Unit/Integration) + Playwright (E2E) |

## 10. CLEAN ARCHITECTURE (4-Layer Module Structure)
```
API Route (src/app/api/v1/) → handle() → requireTenantContext() → requireCapability()
  ├── use-cases/  : Business workflow orchestration
  ├── domain/     : Pure business rules (STRICTLY PROHIBITED from importing Prisma)
  ├── infra/      : Database persistence (Prisma repositories, scopedWhere/scopedData)
  └── adapters/   : External service connectors conforming to Ports (src/core/ports/)
```

## 11. MULTI-TENANT ISOLATION (Enterprise Data Boundary)
- **Session-Derived Tenant ID**: `organization_id` MUST be extracted from the verified server session (`requireTenantContext(req)`). NEVER accept tenant identity from client payload.
- **Zero-Leak Policy**: Cross-tenant unauthorized access MUST return `404 Not Found` or empty results. **NEVER return `403 Forbidden`** (HTTP 403 leaks the existence of another tenant's confidential record).
- **Database Schema**: Every tenant-owned table MUST contain an `organization_id` column with an index `@@index([organization_id])`.

## 13. JOURNEY-FIRST UX ARCHITECTURE (J1–J7 Standards)
- **Journey-First Entry Point**: Entry pages/dashboards start with the user's action goal (`ChoiceGrid` asking "What do you want to do?") rather than raw metrics or module menus.
- **Mandatory Dual-Mode Entry & Dual-Source Input (PO 24/10/2026)**:
  1. *Automatic AI Fast-Track (`SmartInputDropzone`)*: User inputs raw media/text ➔ AI analyzes (Vision OCR, Content Engine) and **pre-fills all wizard steps (Human-in-the-loop)**.
  2. *Manually Guided Wizard*: Step-by-step sequential guided progress (Progressive Disclosure J2).
  3. *Dual-Source Media/Product Input*: BẮT BUỘC cho phép chọn từ **Kho sản phẩm của tiệm** (`store-catalog`) HOẶC **Tải từ máy/thiết bị** (`device-upload`). Hỗ trợ lưu ngược vào kho tiệm khi upload từ máy.
- **7 Core Principles**:
  1. `J1` Journey-First: Action-oriented choice grid over module hierarchy.
  2. `J2` Progressive Disclosure: Show only the relevant steps/inputs for the current stage.
  3. `J3` Next Best Actions: Every result state MUST lead to recommended next actions (`NextActions`).
  4. `J4` Contextual AI: AI embedded directly into workflow stages, not isolated.
  5. `J5` Role UX ≠ Capability: Role UX personalizes the journey, but RBAC / Capability Codes strictly enforce authorization.
  6. `J6` 7-Step Action Contract: `Select` → `Input` → `Preview` → `Execute` → `Processing` → `Result` → `Next Action` (`ActionContractWrapper`).
  7. `J7` "WRAP, not REPLACE" & Expert Mode: Wrap existing dashboards as journey destinations; provide toggleable Expert Mode for power users.
- **Core Modules & UI Kit**: `src/modules/journey/` (domain/catalog) & `src/components/journey/` (`ChoiceGrid`, `ActionCard`, `JourneyShell`, `NextActions`).

## 14. KNOWN FAILURE PATTERNS (FloraOS Battle-Tested Log)
| # | Issue | Root Cause | Standard Remedy |
|---|---|---|---|
| 1 | `server-only` crash in Vitest | Missing `react-server` condition in Vitest | Use stub at `tests/helpers/server-only-stub.ts` |
| 2 | TS error assigning `undefined` | `exactOptionalPropertyTypes: true` active | Omit the key or type as `{ key?: T \| undefined }` |
| 3 | Tenant test failure on new table | Table missing `organization_id` column | Add `organization_id` + verify with `npm run test:tenant` |
| 4 | Python worker idle / missing jobs | Missing PostgreSQL `NOTIFY` trigger after INSERT | Check `LISTEN/NOTIFY` triggers on the `jobs` table |
| 5 | Duplicate images in Creative Studio | Local fallback returned raw unsegmented bytes | Use `StudioLocalImageProvider` with active segmentation |
| 6 | Flaky tests in parallel runs | Shared DB race condition across test files | Keep `fileParallelism: false` in `vitest.config.ts` |
| 7 | Guard silently bypassed after a sync→async change (`assertBrochureOwner`, 14/10/2026: 8 public routes) | Function made `async` but call sites kept no `await` — the 404 becomes an unhandled rejection and the route runs on | `await` every call; guarded by `tests/unit/architecture/brochure-owner-guard.test.ts`. When making a guard async, grep every caller in the same commit |
| 8 | Business guard + its tests deleted inside an unrelated commit (balance-collection guard removed in a products commit) | Large mixed commits; deleted tests not noticed in review | Never delete a test to make a change pass; review `git diff --stat -- "*test*"` for deletions before pushing; restore guard + tests |
| 9 | Foreign-tenant asset linked as a product image (14/10/2026: `PATCH /products/:id`, batch import, approve) | `product_images.asset_id` has no FK to `assets`, so an `assetId` from the body was never checked for ownership; the list then signed the other tenant's storage key | Before linking any client-supplied `assetId`, load it with `scopedWhere(ctx, { id })` and throw `notFound()` (`assertOwnedAsset` in `products/infra/product-main-image.ts`); scope every `assets.findMany` by `organization_id` |
| 10 | Direct `fetch` to OpenAI/Ollama inside a module (Ops Copilot tone agent, 14/10/2026) | "LLM polish with template fallback" written as raw provider calls, bypassing `callCapability` (no privacy floor, metering, license filter, timeout) | Route through `callCapability` with a registered AI capability, or stay on the deterministic template; `tests/unit/architecture/ops-copilot-no-direct-ai.test.ts` guards Ops Copilot |
| 11 | Agent followed `AGENTS.md` into dead code (`core/governance/cascading-resolver.ts`, Journey components that never existed — audit 30/10/2026) | Rule docs described the target architecture as if built; untracked agent files drifted from code | Check `.agents/standards/smeos/*` status column first; trust code over prose; a doc naming a file/function must be verified with `grep` before use |
| 12 | Every local commit blocked by the industry-term pre-commit hook although no code was staged (30/10/2026) | Hook ran the whole-repo ratchet, already red on `main` | Hook runs only when `src/`, `workers/`, `scripts/`, `prisma/` are staged; fix the ratchet on its own branch, never `--no-verify` |
| 13 | `storage-write-contract.test.ts` timed out locally (5 s) on 3 runs but passed alone and on CI (30/10/2026) | Repo walker skipped `node_modules`/`__pycache__` but not the local Python virtualenv under workers (`.venv`, 677 MB, ~7.6k `.py`), which exists only on dev machines | Every repo walker in architecture tests skips `.venv`; a test that passes alone but times out in the suite → look for an unexcluded local-only directory before rerunning |
| 14 | CI `security` red on `main` with no secret in its own diff (31/10/2026: fake HMAC key `const SECRET = "…"` in Integration hub unit tests) | gitleaks scans every fetched branch, so a fake key in a test on any branch turns every PR red | Prefer an obviously fake value without a `key/secret/token = "…"` assignment shape; otherwise add `<commit>:<file>:generic-api-key:<line>` to `.gitleaksignore` with a comment |
| 15 | A new cross-tenant scanner (cron, sweep, reconciliation, report over all organizations) returns 0 rows with no error once RLS blocks for real (ADR-013, 07/11/2026) | Policy `tenant_isolation` hides other organizations' rows when the session carries neither `app.org_id` nor the system flag; in audit mode it only records a `pending` event | In the web process wrap the scan in `asSystemDb("<reason>", fn)` (`src/core/tenancy/db-context.ts`) or serve it from a path classified as system there; scripts and tools outside the app connect as `smeos_system` (`BYPASSRLS`). Before merging, run the suites with `DB_RLS_MODE=audit DB_RLS_AUDIT_FILE=<file>` and expect 0 `pending` events (plan I-5) |
| 15 | E2E checks the old UI instead of the new flagged flow (31/10/2026: `/cong-cu/bo-anh-san-pham` "credit" not found) | Test waited for the flag cache by checking "Công cụ 0x" was absent; removing tool codes from the old UI made that wait a no-op | Wait for a landmark only the new flow renders (`ready` region in `a11y-done-tools.spec.ts`) |
| 16 | Tạo alias palette Tailwind để né luật lint (01/11/2026, ADR-011 D-UI-02) | Tạo 12 thang màu alias trong `src/app/globals.css:189` (`stone→cool`, `rose→blush`...) để lách regex R1 khiến ux-lint báo xanh giả, màu không áp theo preset theme | TUYỆT ĐỐI CẤM tạo alias hoặc đổi tên palette Tailwind để né lint. Mọi màu sắc phải dùng token ngữ nghĩa (`bg-primary`, `bg-surface`, `text-text`...) hoặc token phân loại được chuẩn hóa (`--color-chart-1..8`, `--color-tone-*`). Thêm/sửa token chỉ qua PR chạm `src/styles/tokens/` được PO duyệt |
| 17 | Báo cáo bàn giao ghi số liệu không có nguồn đo (03/11/2026: bảng LCP/CLS không có tệp đo, "4 preset" trong khi có 3, biên bản WCAG "đã ký" không có kết quả chạy) | Báo cáo viết theo mục tiêu kế hoạch thay vì theo kết quả lệnh | Mỗi con số trong tài liệu bàn giao kèm lệnh đo hoặc tệp kết quả lưu trong repo; chưa chạy thì ghi "Chưa kiểm chứng" (`docs/audit/ui-architecture-audit/13_RE_AUDIT_ENTERPRISE_REPORT.md`) |
| 18 | Commit dọn nợ UX sửa vùng PO khoá (03/11/2026: 90 tệp Thẻ chào, 11 tệp Catalog trong một commit "refactor(ui)") | Sửa hàng loạt theo luật lint không lọc vùng đóng băng | Chạy `catalog-freeze.test.ts` trước khi commit; tệp Catalog chỉ sửa khi PO duyệt và ghi ngày duyệt ở đầu test. Thẻ chào: PO gỡ đóng băng 05/11/2026 (D-47) — vẫn theo B5 (`KIEN_TRUC_SSOT_DON_HANG_DA_NGUON.md` §0) |
| 19 | Luật lint làm mất `<h1>` trên diện rộng (03/11/2026: R20 "h1 chỉ trong PageHeader" → ~70 tệp hạ `<h1>` thành `<h2>`, `test:e2e:ux` đỏ 11 ca) | Sửa để lint xanh bằng cách hạ cấp tiêu đề thay vì đổi sang component đầu trang | Trang nội bộ dùng `PageHeader`, trang công cụ dùng `ToolHero`, trang công khai giữ `<h1>` kèm miễn trừ R20 có lý do; chạy `npm run test:e2e:ux` sau mọi thay đổi tiêu đề trang |
| 20 | Hạ baseline R18 bằng `<div role="button" tabIndex={0} onKeyDown>` thay `<button>` (04/11/2026: 191 chỗ trong 104 tệp; radio đổi thành nút bấm) | Lint chỉ bắt thẻ `<button>/<input>` thô, nên giả lập điều khiển làm số giảm mà mất `disabled`, hành vi form, ngữ nghĩa nhóm lựa chọn | Dùng `Button`/`RadioGroup`/`Checkbox` của `src/components/ui/`; chưa chuyển được thì giữ thẻ gốc. R18 bắt cả phần tử không phải điều khiển gắn `role` điều khiển (`scripts/ux-lint/rules-enterprise.ts`) |
| 21 | Nhánh dọn nợ UX dựng trên nền cũ lặp lại lỗi đã sửa ở `main` (05/11/2026: 4 commit nhánh Enterprise thêm lại 15 `div role`, sửa 73 tệp Thẻ chào khoá, tách tệp lớn mà cắt mất gợi ý phí credit, bỏ `aria-selected`) | Nhánh không cập nhật từ `main` nên thiếu luật R18 mới, lint của nhánh vẫn xanh; tách tệp chép tay làm rơi chuỗi `title` | Rebase lên `main` trước khi dọn nợ; chạy `lint:ux --check` và các test khoá trên bản đã hợp nhất; khi tách tệp so tập chuỗi tiếng Việt trước/sau — mọi chuỗi biến mất phải có lý do |
| 22 | Đổi `<button>` thô sang `Button` làm cắt chữ, xuống dòng (05/11/2026: thẻ nổi bật `/van-hanh` bị bóp còn 48px, tab `/dang-nhap` xuống dòng) | `Button` mặc định `h-12 px-5 text-title-sm`; nút gốc (sau preflight) không có chiều cao, đệm 0 và kế thừa cỡ chữ — class cũ chỉ ghi đè thuộc tính nó có | Khi chuyển, thiếu chiều cao thêm `h-auto`, thiếu đệm ngang/dọc thêm `px-0`/`py-0`, thiếu cỡ chữ thêm `text-[length:inherit]`; nút không ghi `type` giữ `type="submit"`; chạy `test:e2e:ux` và xem ảnh khác biệt trước khi cập nhật ảnh mốc |

## 15. OPS COPILOT KNOWLEDGE SYNC & ZERO-LEAKAGE PERIMETER
- **Mandatory Triad Sync**: Any modification to webapp UI, routes, action buttons, or business workflows (`src/app/(app)/`) MUST update both:
  1. User Guide SSOT (`docs/production-feature-map/Huong_Dan_Su_Dung_FloraOS_DungchoDIEUHANH.md`)
  2. OPS Copilot Knowledge Nodes (`src/modules/chat-assistant/ops-copilot/knowledge-base/node-*.ts`)
- **Zero-Leakage Security Perimeter**: User-facing manual & Copilot knowledge MUST ONLY contain what shop staff see and interact with on the browser.
  - **STRICTLY PROHIBITED**: Third-party AI providers (OpenAI, Anthropic, Dify), API raw costs, `.env` variables, database schema/SQL, raw capability codes (`A3`, `F4`, `T2`), internal stack traces, and multi-tenant infrastructure internals.

---

# ⚡ PART III: ON-DEMAND SKILLS REGISTRY (Workflow Tier)
*Load specialized domain instructions dynamically from `.agents/skills/`. Claude Code discovers the same files automatically via the `.claude/skills` symlink — keep one source here.*

| When working on... | Read Skill File |
|---|---|
| API routes, use-cases, repositories, validation | [`api-development`](skills/api-development/SKILL.md) |
| React components, UI layouts, forms, modals, Vietnamese UX | [`ui-development`](skills/ui-development/SKILL.md) |
| AI gateway, provider adapters, port interfaces, LLM calls | [`ai-integration`](skills/ai-integration/SKILL.md) |
| Python workers, background queues, media processing | [`worker-python`](skills/worker-python/SKILL.md) |
| Prisma schema updates, DB migrations, data modeling | [`database-schema`](skills/database-schema/SKILL.md) |
| Writing tests, debugging Vitest / Playwright, tenant tests | [`testing`](skills/testing/SKILL.md) |
| Creative Studio features, 14-step Product-to-Market Journey | [`creative-studio`](skills/creative-studio/SKILL.md) |
| Feature mapping, production specs audit, UI documentation | [`feature-mapping`](skills/feature-mapping/SKILL.md) |
| 4-tier governance, nav theo tầng, khoá công cụ, gói dịch vụ, plugin ngành | [`tier-governance`](skills/tier-governance/SKILL.md) |
| Ghi/đọc/xoá tệp, thùng rác, legal hold, Kho dữ liệu | [`storage`](skills/storage/SKILL.md) |
| Sự kiện & kênh thông báo | [`notifications`](skills/notifications/SKILL.md) |
| Tiêu chuẩn kiến trúc (chung + SMEOS, trạng thái ✅/🟡/🔴) | [`standards/README.md`](standards/README.md) |
