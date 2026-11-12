# 12 — Kiến trúc hiện trạng (As-Is) của ALG

> Mục đích: trả lời "ALG **đang có** gì", không đánh giá đúng/sai (đánh giá ở `03`, `04`, `13`). Mô tả theo mã thật ở commit `c27f39e1`; khi tài liệu nói khác mã, tài liệu này theo mã.
> Phạm vi: repo `antranhub22/smeOS`. Các repo khác chỉ được mô tả ở điểm tiếp giáp với `ALG` (xem `14`).

## 1. Bối cảnh hệ thống

```
   Chủ tiệm / nhân viên ──► Web app (app)            ┐
   Người vận hành SaaS  ──► Console /van-hanh        │
   Khách cuối           ──► Trang công khai /c /g /b /s /bst /ch, đặt hàng, chat AI
   Đối tác gia công     ──► /subcontract/[orderCode] (link ký HMAC), /cua-hang
   Facebook / Zalo      ──► Webhook chat (ký HMAC)   │──►  ALG (Next.js 16, 1 tiến trình web)
   SePay                ──► Webhook/khớp chuyển khoản│        │
   LocalBudd, SocialFlow──► /api/v1/integration/*    │        ├─► PostgreSQL 16 (dữ liệu + hàng đợi job)
                            (token máy-máy, JWT SSO) ┘        ├─► Redis (đếm rate-limit)
                                                              ├─► Kho tệp S3 (hoặc đĩa cục bộ)
                                                              ├─► Nhà cung cấp AI (OpenAI, Anthropic, Gemini, fal, Stability, Replicate, ElevenLabs…)
                                                              └─► Kênh gửi tin (email SMTP, Telegram, Zalo OA/ZNS, eSMS, Messenger, WhatsApp)
                              Worker Python × 3 ◄── generation_jobs (SKIP LOCKED + LISTEN/NOTIFY)
                              Cron Render (5 phút) ──► /api/v1/internal/* (x-cron-secret)
```

## 2. Kiến trúc triển khai

| Đơn vị | Chạy gì | Ghi chú hiện trạng |
|---|---|---|
| `smeos-web` | Next.js (UI + 440 API route) + 3 lịch nền `setInterval` + SSE thông báo | 1 instance, gói starter; build chạy migration + seed |
| `smeos-worker-media` / `-video` / `-vision` | Python, lấy job từ Postgres | gọi trực tiếp nhà cung cấp AI |
| `smeos-cron-dispatch-sweep` | `curl` 3 endpoint nội bộ | nhắc mốc chuỗi, sức khoẻ, quét tích hợp |
| `smeos-postgres` | Postgres 16 basic-256mb | sao lưu chưa kiểm chứng |
| `smeos-redis` | 256 MB, chỉ mạng nội bộ | chỉ dùng cho rate-limit |
| Worker nghiên cứu thị trường (TS) | **không triển khai** | chỉ chạy tay bằng `npm run worker:market-intelligence` |
| Môi trường | **chỉ production** + máy dev (docker-compose) | `main` tự deploy |

## 3. Kiến trúc ứng dụng (lớp)

```
src/app/api/v1/<route>/route.ts
   handle()                                    ← envelope lỗi AppError → HTTP
   requireTenantContext(request)               ← phiên → TenantContext {org, workspace, user, branchId, capabilities:Set<code>}
     └ assertToolUnlocked()                    ← khoá công cụ của tầng trên (9 công cụ)
   requireCapability(ctx, "<mã>")             ← tra Set mã đã tính sẵn
   zod.parse(body)
   use-case(ctx, input, deps)                  ← src/modules/<m>/use-cases
      domain (thuần)                           ← src/modules/<m>/domain
      repository (Prisma + scopedWhere)        ← src/modules/<m>/infra
      adapter (SDK/HTTP)                       ← src/modules/<m>/adapters, src/core/ai/adapters
```

Đường riêng song song:
- **Console nền tảng**: `requirePlatformContext` (bảng `platform_operators`) → `requirePlatformCapability("N*")` ở use-case.
- **Integration API**: `requireIntegrationContext` (token máy-máy hoặc JWT `smeos_sso`/`floraos_sso`).
- **Công khai**: rate-limit + slug/mã/chữ ký; không phiên.
- **Cron**: `isAuthorizedCronRequest`.

## 4. Kiến trúc dữ liệu

| Nhóm bảng | Ví dụ | Khoá phân vùng |
|---|---|---|
| Danh tính & tổ chức | `users`, `organizations` (type: EXPERIENCE/SINGLE/STORE/CHAIN/FLOWER_NETWORK, `settings` JSON gồm `industry`, `governance_matrix`, `unlocked_tools`), `workspaces`, `memberships` (`role_id`, `branch_id`, `chain_branch_code`), `sessions`, `roles`, `role_capabilities`, `capability_overrides` | `organization_id` |
| Chuỗi | `chain_partnerships` (tổ chức ↔ tổ chức), `chain_branches` (chi nhánh là dòng trong tổ chức chuỗi), `branches` (chi nhánh nội bộ cho giá/tồn) | xem `13` §3 |
| Nền tảng | `platform_operators`, `platform_role_capabilities`, `platform_settings`, `platform_audit_logs`, `platform_secrets`, `field_*`, `partner_marketplace_stores` | không có tenant |
| Sản phẩm & giá | `products`, `product_images`, giá theo cấp, `costing_*`, `catalog_links`, `product_copies` | `organization_id` |
| Đơn hàng | `orders` (source phân biệt Thẻ chào/thường), `order_items`, `order_events`, `order_payments`, `order_coordinations`, `order_approval_requests`, `order_*` | `organization_id` |
| Thẻ chào | `greeting_*` (11 bảng) | `organization_id` |
| Asset & job | `assets`, `generation_jobs`, `job_events`, `video_jobs`, `video_scenes`, `ai_requests`, `usage_*` | `organization_id` (bảng con qua cha) |
| Thông báo | `notification_*` (khoá cứng theo `tier` + `scope_id`) | `organization_id` hoặc `scope_id` |
| Tích hợp | `integration_*`, `sales_channel_*`, `integration_governance` (`tier` + `scope_id`) | `organization_id` hoặc `scope_id` |
| Kho dữ liệu | thùng rác, legal hold, outbox, idempotency keys | `organization_id` |

133 model · 53 enum · 32 migration (baseline 22/10/2026) · 97 cột JSON.

## 5. Kiến trúc 4 tầng như đang chạy

| Tầng | Cách hệ thống nhận ra | Dữ liệu riêng | Giao diện | Quyền |
|---|---|---|---|---|
| 1 Mẹ | Có dòng `platform_operators` ACTIVE | `platform_settings` (ma trận Mẹ), khoá thông báo/tích hợp `GLOBAL` | `/van-hanh/*` (22 trang), `nav-mother.ts` | 14 mã `N*` |
| 2 Ngành | Chỉ có trong mã: plugin `organization/domain/industries/*`; `organizations.settings.industry` là chuỗi | Khoá tích hợp `industry:<key>` (do Mẹ đặt) | `nav-industry.ts` — chỉ thấy qua xem trước tầng / dev | Không có |
| 3 Chuỗi | `organizations.type ∈ {CHAIN, FLOWER_NETWORK}` | `settings.governance_matrix`, `chain_partnerships`, `chain_branches` | `nav-chain.ts`, `/dieu-phoi/*` | 163 mã tổ chức |
| 4 Cửa hàng | Mọi loại tổ chức khác | `settings.*` của chính mình | `nav-store.ts` | 163 mã tổ chức |

Ba trục quyết định độc lập: **RBAC** (mã năng lực), **Entitlement** (khoá công cụ `unlocked_tools`; gói dịch vụ `credit_plan` → `PLAN_FEATURES`), **Governance** (ma trận 6 hệ thống, khoá thông báo, khoá tích hợp) — cùng lõi `core/governance/layered-resolver.ts`.

## 6. Luồng nghiệp vụ chính

| Luồng | Đường đi |
|---|---|
| Đăng ký → dùng | `auth/signup` → chờ duyệt (`N13`) → đăng nhập → chọn tổ chức → `TenantContext` |
| Ảnh → phân tích → sản phẩm | upload URL ký → `assets` → `generation_jobs` → worker vision → duyệt (`product.approve`) → `products` |
| Ảnh → biến thể/nội dung/video | `creative-production`/`content-engine`/`video-studio` → job → worker media/video → asset → duyệt |
| Đơn hàng | Nhập tay / chat / catalog công khai / kênh bán → `orders/ingest-order.ts` → báo giá/cọc hoặc duyệt giao trước → điều phối (`coordinator`) → giao → hoàn tất; Thẻ chào chạy luồng riêng trên cùng bảng |
| Gia công chuỗi | Đơn chuỗi → đối tác (`chain_partnerships`/`chain_branches`) → link HMAC → QC ảnh → giao |
| Thanh toán | SePay chuyển khoản → khớp Thẻ chào → khớp đơn thường (lịch nền) |
| Thông báo | use-case đơn hàng → `notifyOrganization` → phân giải tầng/khoá → in-app/SSE, email, Telegram (SMS/Zalo/Push stub) |
| AI | TS: `callCapability` (định tuyến, sàn riêng tư, giấy phép, sổ chi phí); Python: gọi thẳng + tự ghi `ai_requests` |

## 7. Chất lượng & quản trị đang vận hành

- CI: `web` (typecheck → ESLint ratchet → `check:docs` → `lint:ux` → ratchet thuật ngữ → unit → template SSOT → tenant → platform → build), `worker`, `e2e-ux`, `security`, CodeQL. Chuỗi bước **tuần tự**: một bước đỏ chặn mọi bước sau.
- Trạng thái ở `c27f39e1`: `web` đỏ ở ratchet thuật ngữ; tenant/platform/unit/build không chạy.
- Quản trị agent: `CLAUDE.md`, `AGENTS.md`, `.agents/` (luật, 13 skill, 20 standard), hook bash.
- Tài liệu SSOT: sổ đăng ký 82 mục; đặc tả 06/07 kiểm tự động.
