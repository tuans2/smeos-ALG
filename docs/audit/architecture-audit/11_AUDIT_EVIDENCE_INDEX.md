# 11 — Chỉ mục bằng chứng audit

Commit được audit: `c27f39e1` (HEAD `main`, 31/10/2026). Mọi lệnh dưới đây chỉ đọc; không lệnh nào ghi ra ngoài `docs/audit/architecture-audit/` (tệp tạm nằm ở thư mục scratchpad ngoài repo).

## 1. Lệnh/kiểm tra đã chạy

| # | Lệnh / nguồn | Kết quả |
|---|---|---|
| E1 | `node scripts/check-docs.mjs` | "✓ Tài liệu khớp mã." (endpoint, bảng, enum, cách ly tenant, tài liệu agent) |
| E2 | `node scripts/handover-check.mjs` | "Bản giao (HEAD) sạch: 6016 mục"; 4 cảnh báo tên tệp giống tài liệu agent trong `docs/` |
| E3 | GitHub Actions `ci.yml` trên `main` (MCP `actions_list`) | Run #292 (`41253314217`, `c27f39e1`) failure; #290 (`6e426e5d`) failure; #288 (`f661e505`) failure; #286 (`420f1fab`) failure; #284 (`14053a06`) success |
| E4 | Jobs của run #292 | `e2e-ux` ✅, `security` ✅ (gitleaks + npm audit), `worker` ✅ (pytest), `web` ❌ ở bước 15 "Thuật ngữ ngành hardcode"; bước 16–20 (`npm test`, `check:template-ssot`, `test:tenant`, `test:platform`, `build`) **skipped**; bước typecheck, ESLint ratchet, `check:docs`, `lint:ux` ✅ |
| E5 | Script Python đọc `prisma/schema.prisma` | 133 model; 100 có `organization_id`; thiếu index đầu `organization_id`: `sessions`, `internal_chat_participants`; 33 model không có cột; 53 enum; 87 `onDelete: Cascade`; 97 `Json`; 2 `deleted_at` |
| E6 | Script Python đọc `src/core/rbac/capability-catalog.ts` | 163 mã, 49 trần cứng, ma trận nhóm × vai (`05` §4.1) |
| E7 | Phân loại 440 `route.ts` theo `requireTenantContext` / ngữ cảnh nền tảng | 76 route không có ngữ cảnh tenant/nền tảng — tất cả thuộc công khai, auth, webhook, cron, URL ký, dev, hoặc re-export handler có gác (`greeting-card/orders/[id]/*` → `_coordinator-handlers`) |
| E8 | `grep` rate limit trên 44 route công khai + auth | 40 có; thiếu: `auth/logout`, `auth/me`, `auth/session-status`, `public/catalog/[slug]` |
| E9 | `find … | xargs wc -l` | 105 tệp > 350 dòng |
| E10 | `grep` import Prisma ngoài `infra/` | 0 |
| E11 | `grep` `from ".../infra/"` trong `domain/` và `.tsx` | 8 interface domain, 7 component |
| E12 | `grep` host nhà cung cấp | Telegram: `integration-hub/.../telegram-bot-api.ts`, `greeting-card/.../telegram-photo-upload.ts`; Zalo/Messenger/WhatsApp: `greeting-card/adapters/staff-channels/*`, `zalo-zns-adapter.ts`, webhook routes; OpenAI/fal/Stability/Replicate trong `workers/*/providers` |
| E13 | Đếm i18n | 238/924 tệp TSX dùng hook i18n |
| E14 | Đối chiếu tuyến ↔ Screen Contract | Tuyến cấp 1 không có hợp đồng: bao-gia, bst, ch, chat, chinh-sach-bao-mat, creative-studio, cua-hang, dang-ky-thanh-cong, dang-nhap, dieu-phoi, du-lieu, noi-bo, subcontract, tich-hop, tin-nhan, uu-dai, xem-truoc-trang |
| E15 | Kiểm đường dẫn trong `00-DOCUMENTATION-REGISTRY.yaml` | 82 mục, 0 đường dẫn hỏng |

| E16 | `grep` `requireFeatureAccess`/`hasPlanEntitlement`/`resolvePlanFromOrg` | Chỉ `integration-hub/infra/org-profile.ts` dùng (ARC-033) |
| E17 | Đọc `resolve-session.ts`, `grep "\"BRANCH\""` | `capabilities: new Set(grants.map(g => g.code))`; `"BRANCH"` chỉ ở khai báo kiểu (ARC-035) |
| E18 | Đối chiếu `href` trong `nav-{mother,industry,chain,store}.ts` với `page.tsx` | Hỏng: `/van-hanh/san-pham`, `/cong-cu/toi-uu-he-thong`; `nav-mother.ts` 0 trường `capability` (ARC-039) |
| E19 | Quét 36 route `api/v1/platform` (route + use-case nhập trực tiếp) | 35 kiểm mã N; `notification/events` chỉ kiểm là người vận hành |
| E20 | MCP `list_repos` | Truy cập được: smeOS, floraos-core, localbudd, floraos-v1, AVI-GIFT, ALG_Internal_Tool, LocalTrove…; không thấy SocialFlow |

## 2. Tệp nguồn được trích dẫn

### Bổ sung cho giai đoạn 4 và hệ sinh thái
- `src/core/entitlements/entitlement-service.ts`
- `src/modules/organization/domain/tool-route-entitlement.ts`
- `src/components/layout/nav/{index,nav-mother,nav-industry,nav-chain,nav-store}.ts`
- `src/modules/organization/infra/governance-decisions-repository.ts`
- `src/modules/integration-hub/{domain/integration-governance.ts, infra/governance-repository.ts, infra/org-profile.ts}`
- `src/modules/notification/domain/{cascading-policy.ts, events/industry-events.ts}`
- `prisma/schema.prisma` — `chain_partnerships`, `chain_branches`, `branches`, `memberships`, `integration_governance`, `notification_hard_locks`
- `src/modules/{sso,proxy,integration}/**`, `src/app/api/v1/{integration,proxy,sso}/**`

### Tenancy, phiên, RBAC, nền tảng
- `src/core/tenancy/tenant-context.ts` — `scopedWhere`, `scopedData`, `ownedByTenant`
- `src/modules/organization/use-cases/resolve-session.ts` — `resolveSession`, `tenantContextFor`, `requireTenantContext`, `assertToolUnlocked`
- `src/modules/organization/use-cases/resolve-app-session.ts` — dev override (UI), tier preview
- `src/core/rbac/{capabilities,permission-resolver,capability-catalog}.ts`, `src/core/rbac/README.md`
- `src/modules/organization/domain/system-roles.ts`
- `src/core/platform/{platform-capabilities,platform-capability-catalog}.ts`
- `src/modules/platform/use-cases/resolve-platform-session.ts` dòng 30–75 (ARC-003)
- `src/app/api/dev/role-override/route.ts`, `src/lib/dev-role-override.ts`
- `src/core/governance/{tier-of,layered-resolver}.ts`
- `src/modules/organization/domain/governance-decisions.ts`, `tool-route-entitlement.ts`
- `tests/unit/architecture/route-capability-guard.test.ts`

### HTTP & bảo mật
- `src/core/http/{cookies,errors,response,rate-limit,cron-auth,webhook-signature}.ts`
- `src/core/security/secret-box.ts`
- `src/modules/organization/infra/password-hasher.ts`
- `src/proxy.ts`, `next.config.ts`, `src/lib/env.ts`
- `src/app/api/v1/chat/webhooks/{facebook,zalo}/route.ts`
- `src/app/api/v1/storage/[...key]/route.ts`, `src/modules/assets/infra/storage-signing.ts`

### Nghiệp vụ
- `src/modules/orders/domain/{order-rules,business-reporting}.ts`
- `src/modules/coordinator/domain/{stage-transitions,state-mapper}.ts`
- `src/modules/greeting-card/domain/*` (101 tệp), `tests/unit/architecture/the-chao-freeze.test.ts`
- `src/modules/notification/use-cases/notify-organization.ts`, `domain/events/industry-events.ts`
- `src/modules/notification/infra/channel-adapters/{sms,zalo,web-push,telegram,email}-adapter.ts`
- `src/modules/integration-hub/domain/connector-catalog.ts`, `adapters/connectors/index.ts`

### Lưu trữ, AI, worker
- `src/modules/assets/adapters/storage-provider-factory.ts`
- `src/core/ai/gateway.ts`, `src/core/ai/domain/privacy.ts`
- `workers/media_ai/jobs/worker.py`, `workers/media_ai/providers/chung.py`, `workers/media_ai/providers/**`, `workers/vision/providers/openai_*.py`
- `src/instrumentation.ts`, `src/modules/{greeting-card,acquisition,orders}/use-cases/*-scheduler.ts`
- `src/modules/notification/adapters/notification-sse-adapter.ts`

### Hạ tầng & CI
- `render.yaml`, `vercel.json`, `docker-compose.yml`, `cron-job-entry.txt`, `package.json`
- `.github/workflows/ci.yml`, `.github/workflows/codeql.yml`
- `scripts/db-deploy.mjs`, `scripts/check-docs.mjs`, `scripts/handover-check.mjs`, `scripts/eslint-baseline.json`
- `prisma/schema.prisma`, `prisma/migrations/*` (32), `prisma/seed.ts`

## 3. Tham chiếu kiểm thử

| Bộ | Tệp tiêu biểu |
|---|---|
| Tenant | `tests/tenant/cach-ly-endpoint.test.ts`, `cach-ly-repository.test.ts`, `order-isolation.test.ts`, `customer-isolation.test.ts`, `product-image-asset-isolation.test.ts`, `governance-matrix.test.ts`, `partner-tool-unlock.test.ts`, `coordinator-subcontract-guards.test.ts`, `subcontract-public-link.test.ts`, `single-session-per-account.test.ts`, `storage-*.test.ts`, `khong-import-prisma-ngoai-infra.test.ts` (137 tệp) |
| Platform | `tests/platform/cach-ly-platform.test.ts`, `registration-approval.test.ts`, `saas-policy-guard.test.ts` (10 tệp) |
| Kiến trúc | `tests/unit/architecture/route-capability-guard.test.ts`, `the-chao-freeze.test.ts` |
| RBAC | `src/core/rbac/{capabilities,capability-catalog,permission-resolver}.test.ts` |
| E2E UX | `tests/e2e/ux/{a11y,a11y-done-tools,navigation,role-homepage,route-states,visual}.spec.ts` |
| Worker | `workers/tests/**` (45 tệp) |

## 4. Tham chiếu tài liệu

- `CLAUDE.md`, `AGENTS.md`, `.agents/AGENT_RULES.md`, `.agents/standards/alg/01-tier-governance.md`, `.claude/skills/*`
- `docs/00-DOCUMENTATION-CONSTITUTION.md`, `docs/00-DOCUMENTATION-REGISTRY.yaml`
- `docs/kien-truc/TRANG_THAI.md` §2–6, `HO_SO_BAN_GIAO.md`, `ALG_4_TIER_ARCHITECTURE_AND_NAVIGATION_SSOT.md`
- `docs/handover/OPERATIONS_RUNBOOK.md`
- `docs/dac-ta/06-api-specification.md`, `07-database-specification.md`, `TECHNICAL_DEBT.md`
- `docs/dac-ta/screen-contracts/README.md`
- `docs/audit/04-system-wide-audit.md`, `08-release-readiness-report.md` (audit trước, 28/10)

Đối chiếu với audit 28/10 (`docs/audit/08`): AUD-028 (webhook không ký) **đã sửa** — xác minh trong mã; AUD-005 (khoá công cụ chỉ ẩn nav) **đã sửa** — `assertToolUnlocked` trả 403; AUD-007 (thông báo không có nguồn phát) **đã sửa một phần** — 6 sự kiện đơn hàng gọi `notifyOrganization`; AUD-006 (ma trận không lưu) **đã sửa một phần** — 3/6 áp vào luồng thật.

## 5. Vùng chưa kiểm chứng (Not Verified) và lý do

| Vùng | Lý do |
|---|---|
| Kết quả typecheck/unit/tenant/platform/build ở `c27f39e1` | Container không có `node_modules`; cài dependency bị cấm trong audit; CI đã SKIP các bước này |
| Trạng thái production (biến môi trường thật, `NODE_ENV`, `STORAGE_*`, `SENTRY_DSN`, mật khẩu đã xoay chưa) | Không truy cập Render/CSDL production |
| Sao lưu/PITR, khả năng khôi phục | Không truy cập Render; runbook ghi [CẦN XÁC NHẬN] |
| Kết quả CodeQL | Không đọc tab Security |
| GitHub ruleset/branch protection hiện hành | Không kiểm được qua công cụ trong phiên |
| Chính sách AI trong worker Python (có tự áp privacy/license không) | Chỉ đọc lướt; cần đọc toàn bộ `workers/media_ai/providers/**` |
| Tính idempotent của 3 lịch nền | Chưa đọc logic quét chi tiết |
| Giao diện thật: responsive, mobile-first, tuân thủ Screen Contract | Không chạy app/trình duyệt |
| Nội dung `public/mock-data` | Chưa rà |
| Vai trò `src/layers/` | Chưa tìm thấy tài liệu |
| Repo `LocalBudd`, `SocialFlow`, `FloraOS` v1 | Ngoài phạm vi phiên |
| Hiệu năng/tải, pentest | Ngoài phạm vi audit tĩnh |
