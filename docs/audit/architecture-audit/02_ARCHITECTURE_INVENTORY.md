# 02 — Kiểm kê kiến trúc

> Commit `c27f39e1`, 31/10/2026. Số liệu đo trực tiếp bằng lệnh đọc (`find`, `grep`, `wc`, script Python đọc `schema.prisma`) — lệnh ở `11_AUDIT_EVIDENCE_INDEX.md` §2.

## 1. Thành phần hệ thống

| Thành phần | Công nghệ | Vị trí | Triển khai (`render.yaml`) |
|---|---|---|---|
| Web + API | Next.js 16.4.2, React 19.3, TypeScript, Prisma 7.10 (`@prisma/adapter-pg`) | `src/` | `smeos-web` (starter, Singapore) |
| Worker ảnh | Python 3.11, psycopg, `SKIP LOCKED` + `LISTEN/NOTIFY` | `workers/media_ai/jobs/worker.py` | `smeos-worker-media` |
| Worker video | Python | `workers/media_ai/video/video_worker.py` | `smeos-worker-video` |
| Worker đọc ảnh | Python | `workers/vision/jobs/worker.py` | `smeos-worker-vision` |
| Worker nghiên cứu thị trường | TS (`tsx`) | `src/modules/market-intelligence/jobs/worker.ts` | **không có trong `render.yaml`** (chỉ `npm run worker:market-intelligence`) |
| Cron | `curl` gọi 3 endpoint nội bộ, 5 phút | `render.yaml` dòng 242–262 | `smeos-cron-dispatch-sweep` |
| CSDL | PostgreSQL 16 (+ `pg_cron` ở máy dev) | `prisma/schema.prisma` | `smeos-postgres` (basic-256mb) |
| Cache | Redis (ioredis) — bộ đếm rate-limit | `src/core/cache/redis-client.ts` | `smeos-redis` (256 MB) |
| Lịch nền trong tiến trình web | `setInterval` × 3 | `src/instrumentation.ts` | chạy trong `smeos-web` |
| Kho tệp | S3-compatible hoặc đĩa cục bộ | `src/modules/assets/adapters/` | biến `STORAGE_*` (nhập tay) |
| Cấu hình phụ | Vercel cron (`vercel.json`), crontab máy dev (`cron-job-entry.txt`) | gốc repo | không dùng trên Render |

## 2. Quy mô mã

| Hạng mục | Số lượng |
|---|---|
| Tệp TS/TSX trong `src/` | 3.306 (~356.311 dòng) |
| Tệp Python trong `workers/` | 163 (~23.739 dòng) |
| Route API (`route.ts`) | 440 — handler: 225 GET · 243 POST · 40 PATCH · 34 PUT · 23 DELETE |
| Trang (`page.tsx`) | 104 — nhóm `(app)` 73, `(platform)` 22, `(auth)` 1, công khai 8 |
| Mô-đun nghiệp vụ `src/modules/` | 45 |
| Gói lõi `src/core/` | 17 (`ai`, `cache`, `entitlements`, `governance`, `http`, `idempotency`, `media`, `notifications`, `observability`, `platform`, `ports`, `rbac`, `runtime`, `security`, `templates`, `tenancy`, `terminology`) |
| Port (`src/core/ports/`) | 16 interface (llm, image, video, speech, vision, storage, queue, publisher, embedding, segmentation, trend, sales-channel ×2, human-verification, shared-media) |
| Model Prisma / enum / migration | 133 / 53 / 32 (baseline `20261022000000_smeos_baseline` → `20261031205857_order_approval_requests`) |
| Tệp > 350 dòng | 105 (lớn nhất `src/app/(app)/tai-anh/page.tsx` 1.945 dòng) |
| Dependency | 28 runtime + 19 dev; `xlsx` cài từ `cdn.sheetjs.com` |

## 3. Mô-đun nghiệp vụ (đếm tệp không phải test)

Cột: domain · use-cases · infra · adapters · test trong mô-đun / tệp tenant test nhắc tới · dòng mã.

| Mô-đun | dom | uc | infra | adp | test | LOC |
|---|---:|---:|---:|---:|---|---:|
| greeting-card (Thẻ chào) | 101 | 94 | 48 | 17 | 112/59 | 29.083 |
| creative-production | 19 | 13 | 4 | 3 | 2/4 | 9.860 |
| products | 29 | 27 | 11 | 1 | 31/63 | 8.063 |
| organization | 30 | 31 | 18 | 0 | 18/116 | 6.956 |
| coordinator | 18 | 16 | 6 | 1 | 6/14 | 6.705 |
| market-intelligence | 13 | 5 | 2 | 9 | 1/2 | 6.149 |
| content-engine | 25 | 6 | 5 | 2 | 8/1 | 5.049 |
| chat-assistant | 10 | 11 | 5 | 2 | 6/3 | 4.888 |
| field-platform | 19 | 19 | 6 | 1 | 17/1 | 4.799 |
| platform | 10 | 18 | 15 | 1 | 8/6 | 4.192 |
| notification | 14 | 10 | 12 | 1 | 7/5 | 3.359 |
| media | 10 | 11 | 0 | 0 | 5/6 | 3.225 |
| orders | 7 | 21 | 11 | 0 | 15/54 | 3.222 |
| profiles | 12 | 9 | 8 | 0 | 7/7 | 2.829 |
| integration-hub | 8 | 15 | 7 | 5 | 8/2 | 2.610 |
| audio-studio | 9 | 4 | 3 | 1 | 1/1 | 2.450 |
| journey | 11 | 2 | 1 | 1 | 10/7 | 2.065 |
| assets | 8 | 9 | 8 | 3 | 12/25 | 1.972 |
| catalog-studio | 9 | 1 | 0 | 0 | 2/0 | 1.619 |
| product-copies | 6 | 5 | 3 | 1 | 7/1 | 1.634 |
| video-studio | 6 | 7 | 2 | 0 | 3/1 | 1.594 |
| crm | 5 | 9 | 3 | 0 | 4/2 | 1.422 |
| jobs | 4 | 7 | 6 | 1 | 2/15 | 1.157 |
| toolkit | 6 | 0 | 0 | 0 | 3/0 | 1.156 |
| catalog-links | 4 | 6 | 3 | 0 | 4/4 | 1.091 |
| storage | 3 | 3 | 4 | 0 | 5/26 | 1.073 |
| acquisition | 3 | 7 | 3 | 1 | 8/3 | 1.043 |
| ad-banner-poster | 8 | 2 | 0 | 1 | 4/0 | 985 |
| integration | 5 | 9 | 5 | 0 | 5/11 | 963 |
| costing | 8 | 1 | 1 | 0 | 3/1 | 929 |
| avi-gift-import | 2 | 3 | 0 | 0 | 2/2 | 855 |
| internal-chat | 4 | 6 | 1 | 0 | 1/1 | 783 |
| usage | 4 | 6 | 3 | 0 | 3/11 | 744 |
| availability | 3 | 3 | 1 | 0 | 3/5 | 713 |
| chain-partnership | 3 | 3 | 3 | 0 | 1/0 | 682 |
| promotions | 2 | 2 | 4 | 0 | 2/3 | 641 |
| product-photo-studio | 4 | 3 | 0 | 0 | 1/0 | 503 |
| ai-governance | 1 | 4 | 0 | 0 | 2/0 | 454 |
| landing-page | 5 | 1 | 1 | 0 | 2/1 | 441 |
| product-image-set | 4 | 2 | 0 | 0 | 1/0 | 441 |
| proxy | 1 | 1 | 1 | 0 | 2/1 | 435 |
| templates | 2 | 3 | 1 | 0 | 2/3 | 253 |
| shop-reviews | 1 | 2 | 1 | 0 | 0/1 | 209 |
| audit | 1 | 3 | 3 | 0 | 2/26 | 173 |
| sso | 1 | 0 | 1 | 0 | 2/4 | 109 |

Nhận xét: Thẻ chào chiếm ~20% mã mô-đun và bị khoá "đóng băng tuyệt đối" bằng `tests/unit/architecture/the-chao-freeze.test.ts` (TRANG_THAI §4, quyết định 31/10).

## 4. Khung kiến trúc và chuẩn đang có

| Khung / chuẩn | Tài liệu | Cơ chế thực thi trong mã | Trạng thái |
|---|---|---|---|
| Clean architecture 4 lớp mô-đun (route → use-case → domain → infra/adapters) | `.agents/AGENT_RULES.md` §10 | `tests/tenant/khong-import-prisma-ngoai-infra.test.ts`, `npm run check:layers` | Thực thi (không thấy import Prisma ngoài `infra/`) |
| Cách ly tenant | `CLAUDE.md` #2, đặc tả 05 §3 | `src/core/tenancy/`, `requireTenantContext`, 137 test tenant | Thực thi |
| RBAC theo mã năng lực, 3 lớp + trần cứng | `docs/dac-ta/02-function-catalog.md`, `src/core/rbac/README.md` | `capability-catalog.ts`, `permission-resolver.ts`, route guard test | Thực thi |
| Quyền console nền tảng (N1–N17) | TRANG_THAI D-N6 | `src/core/platform/`, `platform_operators` | Thực thi |
| Quản trị 4 tầng (Mẹ → Ngành → Chuỗi → Cửa hàng) | `ALG_4_TIER_ARCHITECTURE_AND_NAVIGATION_SSOT.md`, `.agents/standards/smeos/01-tier-governance.md` | `core/governance/layered-resolver.ts`, `tier-of.ts`, `governance-decisions.ts` | Một phần (xem ARC-008) |
| Gói dịch vụ / entitlement | standard 01 | `core/entitlements/entitlement-service.ts`, `tool-route-entitlement.ts` | Thực thi |
| Cổng AI (`callCapability`) | `CLAUDE.md` #5, kiến trúc V2 §17–19 | `src/core/ai/gateway.ts` (18 tệp gọi) | Thực thi cho TS; không cho worker Python |
| Industry plugin | standard 08 | `organization/domain/industries/*`, `check:industry`, `audit:industry:check` | Thực thi (ratchet đang đỏ trên `main`) |
| Journey-First UX (J1–J7) + Progressive Disclosure | AGENT_RULES §13, `docs/dac-ta/ux-patterns/` (12 mẫu P01–P12) | `src/components/journey/`, `lint:ux` ratchet, E2E UX | Một phần |
| Screen Contract | `docs/dac-ta/screen-contracts/` (47 tệp) | Không có kiểm tự động mức route | Một phần |
| i18n | `ALG_I18N_STANDARD.md`, `ALG_L10N_STANDARD.md`, glossary | `src/lib/i18n/` (vi/en), test toàn vẹn | Một phần |
| Lưu trữ (SDAGF) | `docs/governance/sdagf/`, standard 02 | `StorageProvider`, URL ký, outbox, legal hold, đối soát | Thực thi |
| Thông báo 4 tầng | `NOTIFICATION_SYSTEM_ARCHITECTURE.md` | `modules/notification`, `layered-resolver` | Một phần (kênh SMS/Zalo/Push stub) |
| Integration Hub 4 tầng | `22-integration-hub-spec.md` | `modules/integration-hub` | Khung xong, đầu nối thật chưa |
| Quan trắc | standard 09, runbook §10–11 | `core/observability` (log JSON, request-id, Sentry tuỳ chọn) | Một phần |
| Quản trị tài liệu | `00-DOCUMENTATION-CONSTITUTION.md`, `00-DOCUMENTATION-REGISTRY.yaml` (82 mục) | `check:docs` | Thực thi cho đặc tả 06/07 |
| Quản trị agent | `CLAUDE.md`, `AGENTS.md` (665 dòng), `.agents/AGENT_RULES.md`, 13 skill, 20 standard, hook `.claude/hooks/guard-bash.mjs` | `check:docs` mục "Tài liệu cho agent", hook chặn `vitest run`/Prisma ghi | Thực thi |
| Chuỗi cung ứng | CI job `security`, `codeql.yml` | gitleaks, `npm audit --audit-level=high`, CodeQL | Thực thi |

## 5. Tài liệu hiện có (theo nhóm)

| Nhóm | Vị trí | Ghi chú |
|---|---|---|
| Hiến pháp + sổ đăng ký tài liệu | `docs/00-DOCUMENTATION-*` | 82 mục: 47 CANONICAL, 13 SUPPORTING, 15 ARCHIVED, 5 HISTORICAL, 1 APPROVED, 1 DRAFT; mọi đường dẫn còn tồn tại |
| Đặc tả kỹ thuật (bộ "dac-ta") | `docs/dac-ta/00`–`22` | PRD, yêu cầu, danh mục năng lực, UX, FE, BE, API (510 dòng endpoint), CSDL (3.488 dòng), tích hợp, AI |
| Kiến trúc & kế hoạch | `docs/kien-truc/` (43 tệp) | Kiến trúc đích V2, 4 tầng, thuật ngữ, thông báo, đơn hàng đa nguồn, vận hành CSDL, sự cố & sao lưu, bàn giao |
| ADR | `docs/adr/` (15 tệp) | ADR-001…010, D1…D5 |
| Hợp đồng | `docs/spec/contracts`, `docs/dac-ta/schemas/` | JSON schema cho creative-studio, coordinator, content-engine (kiểm `check:schemas:*`) |
| Audit trước | `docs/audit/00`–`08`, `docs/Audit/*`, `docs/audit/sdagf-2026-10` | Release readiness 28/10: NOT_READY |
| Bàn giao | `docs/kien-truc/HO_SO_BAN_GIAO.md`, `docs/handover/OPERATIONS_RUNBOOK.md` | Bản nháp, nhiều mục [CẦN XÁC NHẬN] |
| Hướng dẫn người dùng | `docs/production-feature-map/` | Cho vai Điều hành |
| Lưu trữ | `docs/archive/` | historical, merged, drafts, guides |
| Tệp nhị phân trong docs | 6 .docx, 3 .xlsx, 2 .pptx, 13 .png | Không đối chiếu được bằng diff |

## 6. Kiểm thử hiện có

| Bộ | Số tệp | Lệnh | Chạy trong CI |
|---|---:|---|---|
| Unit (cạnh mã trong `src/`) | 414 | `npm test` | Có (bị SKIP ở run #292) |
| Unit (`tests/unit/`, gồm kiến trúc) | 172 | `npm test` | như trên |
| Cách ly tenant (Postgres thật) | 137 | `npm run test:tenant` | như trên |
| Cách ly console nền tảng | 10 | `npm run test:platform` | như trên |
| E2E (Playwright) | 8 spec (6 ở `tests/e2e/ux`) | `npm run test:e2e:ux` | Có — xanh ở run #292 |
| Worker Python | 45 | `pytest` | Có — xanh ở run #292 |
| Harvest | 1 | `npm run test:harvest` | Không |
