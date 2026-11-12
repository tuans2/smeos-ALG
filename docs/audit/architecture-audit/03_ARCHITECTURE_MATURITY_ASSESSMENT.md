# 03 — Đánh giá mức trưởng thành kiến trúc (15 miền)

Thang điểm: 0 Không thấy · 1 Khởi đầu · 2 Đã định nghĩa · 3 Đã triển khai · 4 Đã kiểm chứng · 5 Tối ưu.
Quy tắc chấm: **4 chỉ khi có bằng chứng kiểm chứng tự động đang xanh trên mã hiện tại**. Vì ở commit `c27f39e1` các bộ unit/tenant/platform/build **bị SKIP** trong CI (ARC-001), không miền nào phụ thuộc các bộ đó được chấm 4 dù trước đây từng xanh.
Phân loại bằng chứng: **V** Verified · **PV** Partially Verified · **NV** Not Verified · **NA** Not Applicable.

---

## A. Kiến trúc hệ thống — **3**

- Khám phá: modular monolith Next.js + worker Python nối qua bảng `generation_jobs` (`SKIP LOCKED` + `LISTEN/NOTIFY`), quyết định D6-1 (TRANG_THAI §4). V.
- Ranh giới: `domain/` không import Prisma (grep 0 kết quả ngoài `infra/`; test `khong-import-prisma-ngoai-infra`). V. Nhưng 8 interface repository trong `domain/` import **kiểu** entity Prisma từ `infra/entities` (ARC-018). V.
- Dịch vụ dùng chung: `src/core/*` (17 gói), 16 port. V.
- Khả năng mở rộng: lịch nền `setInterval` trong tiến trình web, SSE hub trong bộ nhớ → không an toàn khi nhiều instance (ARC-010). PV.
- 4 tầng: Mẹ và Chuỗi/Cửa hàng chạy thật; Ngành chỉ là plugin code (ARC-008). V.
- Lý do không lên 4: CI đỏ; mô hình 4 tầng chưa trọn; worker Python nằm ngoài cổng AI.

## B. Kiến trúc repository — **3**

- Cấu trúc rõ: `src/app` (route), `src/modules/<m>/{domain,use-cases,infra,adapters}`, `src/core`, `workers/`, `prisma/`, `tests/{unit,tenant,platform,e2e}`. V.
- Quy ước tên kebab-case, alias `@/*`. V.
- Vi phạm: 105 tệp > 350 dòng (luật bất biến #7) (ARC-013); `docs/Audit` và `docs/audit` trùng tên khác hoa/thường (ARC-015); tệp cấu hình lỗi thời `cron-job-entry.txt` trỏ `/Users/tuan/...`, `vercel.json` song song `render.yaml` (ARC-026). V.
- Tách môi trường: chỉ `.env.example` + `render.yaml` production; không có cấu hình staging (ARC-005). V.
- Bàn giao: `export-ignore` loại tài liệu agent khỏi `git archive`; `handover-check` đạt. V.

## C. CSDL & dữ liệu — **3**

- 133 model; 100 có `organization_id`; 98 có index bắt đầu bằng `organization_id`. Hai ngoại lệ: `sessions` (cột nullable, tra theo `token_hash`/`user_id` — chấp nhận được) và `internal_chat_participants` (index `[user_id, organization_id]`). V.
- 33 model không có `organization_id`: dữ liệu nền tảng (`platform_*`, `ai_models`, `field_*`, `market_*`), bảng con kế thừa qua khoá cha (`job_events`, `video_scenes`, `internal_chat_messages`), bảng quan hệ xuyên tenant (`chain_partnerships`), bảng khoá thông báo theo `scope_id`. Bảng con không có `organization_id` buộc mọi truy vấn phải đi qua cha (ARC-019). V.
- Toàn vẹn: 87 `onDelete: Cascade`, 97 cột `Json`; một số bảng mới dùng `String` cho trạng thái thay vì enum (ARC-019); ràng buộc `orders_balance_vnd_check` chưa có (HO_SO_BAN_GIAO §6). V.
- Migration: `prisma migrate deploy` qua `scripts/db-deploy.mjs`; CI kiểm `migrate diff --exit-code`; lịch sử rebaseline 22/10/2026; CI dựng DB test bằng `db push` (không bằng migration). V.
- ERD: không có sơ đồ (ARC-027). V (không thấy).
- Sao lưu/PITR: NV (runbook §4 [CẦN XÁC NHẬN]).
- Vòng đời dữ liệu: thùng rác 30 ngày, legal hold, xuất ZIP tổ chức; soft-delete chỉ 2 cột `deleted_at`; hạn lưu PII chưa có (ARC-011). PV.

## D. API — **3**

- 440 route, tiền tố `/api/v1`, 354 route dùng `handle()` (envelope lỗi `AppError`, `src/core/http/response.ts`); 6 route trả `NextResponse.json` trực tiếp. V.
- Xác thực/phân quyền: 327 route `requireTenantContext`, 286 gọi `requireCapability` trực tiếp (thêm qua handler/use-case — test gác quét sâu 2 bước); 37 route console nền tảng; 76 route không có ngữ cảnh tenant/nền tảng đều là công khai/webhook/auth/cron/URL ký và được liệt kê có lý do. V.
- Validation: 222 route dùng zod trực tiếp; số còn lại ủy thác use-case. PV.
- Rate limit: 40/44 route công khai + auth; 4 còn lại là `logout`, `me`, `session-status`, `public/catalog/[slug]`. V.
- Idempotency: bảng `idempotency_keys`, 49 tệp dùng. PV.
- Tài liệu: đặc tả 06 dạng markdown 510 dòng endpoint, đối chiếu hai chiều bằng `check:docs` (đạt). Không có OpenAPI, không có tài liệu API cho khách (ARC-024). V.
- Versioning: chỉ theo đường dẫn `v1`; không có chính sách khai tử. V.

## E. Logic nghiệp vụ — **3**

- Domain thuần có test: `orders/domain/order-rules.ts` (3 bảng chuyển trạng thái), `coordinator/domain/stage-transitions.ts` + `state-mapper.ts`, `greeting-card/domain/*` (101 tệp), `governance-decisions.ts`, `usage/domain/pricing.ts`. V.
- Trùng lặp/lệch: ba động cơ trạng thái trên cùng bảng `orders`; `orders/domain/business-reporting.ts` khai `PENDING` (không có trong enum `order_status`) và thiếu `DELIVERED` (ARC-017). V.
- Kênh gửi tin nghiệp vụ viết trong Thẻ chào thay vì Hub/Notification (ARC-007). V.
- Giá trị cứng: trần giảm giá 50% (`BUILT_IN_MOTHER_LOCKS`) là quyết định PO có chủ đích; bảng giá credit là hằng (D14 v1). V.
- Đóng băng Thẻ chào ngăn hợp nhất logic trùng (ARC-029). V.

## F. Bảo mật — **3**

- Xác thực: token phiên ngẫu nhiên lưu dạng băm (`hashSessionToken`), kiểm thành viên ACTIVE mỗi request, một phiên mỗi tài khoản (`single-session-per-account.test.ts`), bcrypt cost 12. V.
- Cookie: HttpOnly, SameSite=Lax, Secure ở production. V.
- Bí mật: AES-256-GCM + HKDF theo mục đích (`src/core/security/secret-box.ts`); env bắt buộc 3 khoá ≥ 16 ký tự (`src/lib/env.ts`). V.
- Webhook: HMAC Facebook (`X-Hub-Signature-256`) và Zalo, so sánh thời gian hằng. V.
- Header: HSTS, nosniff, X-Frame SAMEORIGIN; **CSP chỉ Report-Only**; không có token CSRF/kiểm Origin (dựa SameSite=Lax) (ARC-022). V.
- Cửa hậu môi trường không-production (ARC-003). V.
- Mật khẩu seed chưa xoay trên production (ARC-002). NV (theo tài liệu).
- Kiểm thử xâm nhập: chưa có. V (theo HO_SO_BAN_GIAO §6).

## G. RBAC & quản trị quyền 4 tầng — **3**

- 163 mã năng lực tổ chức, 49 trần cứng, 9 vai hệ thống; 17 mã nền tảng `N*` ở bảng riêng. V.
- Ba lớp cắt có test: "bật ngoại lệ cho mã có trần cứng vẫn không mở được" (`permission-resolver.test.ts`). V.
- Frontend vs backend: điều hướng/khuôn UI dùng khoá vai (`store_admin`, `chain_admin`, `industry_admin`, `flower_network_admin`, `platform_admin`) **không tồn tại** trong `SYSTEM_ROLES`; backend vẫn gác bằng mã năng lực nên không mở quyền, nhưng UI và quyền dùng hai bộ từ vựng (ARC-008, ARC-016). V.
- Đường truy cập trái phép: không thấy ở production; ở môi trường không-production có (ARC-003). V.
- Ma trận toàn cục: `05` §4.
- **Bổ sung sau giai đoạn 4 (`13`):** phạm vi quyền (`BRANCH`) bị bỏ khi dựng `TenantContext` (ARC-035), gói dịch vụ không được thực thi (ARC-033), ba mô hình Chuỗi → Cửa hàng (ARC-034). Giữ điểm 3 cho RBAC theo mã năng lực ở cấp tổ chức; riêng **quản trị quyền 4 tầng xét tổng thể chỉ đạt 2**.

## H. UX/UI — **3**

- Design system: `src/components/ui`, `src/lib/ui-system`, token ngữ nghĩa; `lint:ux --check` ratchet (xanh ở run #292). V.
- Journey-First + 12 mẫu UX (`docs/dac-ta/ux-patterns/p01…p12`); `src/components/journey/`. PV (không duyệt giao diện thật).
- Trợ năng: `tests/e2e/ux/a11y.spec.ts`, `a11y-done-tools.spec.ts` (axe) xanh ở run #292. V.
- Responsive/mobile: `bottom-nav`, `mobile-nav-drawer`; không kiểm tay. NV.
- Hạn chế: 105 tệp lớn, nhiều trang > 1.000 dòng → khó giữ nhất quán.

## I. Screen Contract — **2**

- Khung có: `README.md`, `_TEMPLATE.md`, QA matrix (03a §34). V.
- Độ phủ: 47 tệp (≈42 hợp đồng tuyến) cho 104 trang; thiếu hẳn cho `bao-gia`, `chat`, `creative-studio`, `cua-hang`, `dieu-phoi`, `du-lieu`, `noi-bo`, `tich-hop`, `tin-nhan`, `uu-dai`, `dang-nhap` và các trang công khai; 22 trang `/van-hanh/*` chỉ có `van-hanh.md` (ARC-020). V.
- Tuân thủ: cột "Trạng thái QA" do người viết tự khai; không có kiểm tự động. NV.

## J. Nội dung UI & i18n — **2**

- Có `src/lib/i18n` (vi/en, 13 namespace), test toàn vẹn, glossary, chuẩn I18N/L10N, ratchet thuật ngữ ngành. V.
- Áp dụng: 238/924 tệp TSX (26%) dùng hook i18n; còn lại hardcode tiếng Việt (ARC-021). V.
- Ratchet thuật ngữ ngành đang **đỏ** trên `main` (nguyên nhân trực tiếp của ARC-001). V.

## K. Lưu trữ & artifact — **3**

- Port `StorageProvider` + `S3StorageProvider`/`LocalDiskStorageProvider`, một factory duy nhất. V.
- Khoá `org/<org>/…`, URL ký theo phương thức + hạn, kiểm nội dung tải lên (MIME + kích thước, đọc có trần). V.
- Thùng rác 30 ngày, legal hold, outbox xoá payload, đối soát (`storage:reconcile`), test tenant `storage-*`. V.
- Lùi về đĩa cục bộ trong im lặng (ARC-006). V.
- CDN, sao lưu kho tệp: NV.

## L. Tích hợp — **2**

- Khung Integration Hub: manifest, vòng đời kết nối, credential vault mã hoá, nhật ký sự kiện, retry policy, redact payload, governance 4 tầng (W1–W5, N16). V.
- Đầu nối thật trong registry: 0 (chỉ `test_echo`, `test_shop`). V.
- Kênh thật nằm ngoài Hub: Zalo OA/ZNS, eSMS, Messenger, WhatsApp, Telegram trong `greeting-card/adapters`; webhook FB/Zalo ở route riêng; Telegram API viết hai lần (ARC-007). V.
- Thanh toán: chỉ khớp chuyển khoản SePay; không có VNPay/MoMo/PayOS/thẻ. V (không thấy).
- Giám sát: health-check kết nối qua cron `integrations-sweep`. PV.

## M. Quản trị AI agent — **3**

- `CLAUDE.md` (ngắn, có thứ bậc xung đột), `AGENTS.md` 665 dòng, `.agents/AGENT_RULES.md` (12 anti-pattern, 15 mẫu lỗi đã gặp), 13 skill (`.claude/skills` symlink `.agents/skills`), 20 tệp standard, hook `guard-bash.mjs`. V.
- `check:docs` có mục "Tài liệu cho agent". V.
- Lệch: không có `CONTEXT.md`; TRANG_THAI §3/§6 lỗi thời; cổng 3100 vs 3200; `AGENT_RULES` thiếu §12; README rbac ghi 31 trần cứng (thật 49); `CLAUDE.md` ghi 78 lỗi ESLint (baseline 58) (ARC-014). V.

## N. DevOps & hạ tầng — **2**

- CI: 4 job (`web`, `worker`, `e2e-ux`, `security`) + CodeQL. V.
- Thực tế: `main` đỏ 4 run liền; `autoDeploy: true` không chờ CI (ARC-001). V.
- Build: `ignoreBuildErrors: true` (ARC-004); build chạy migration + seed vào CSDL production. V.
- Môi trường: chỉ production (ARC-005). V.
- Quan trắc: log JSON, `x-request-id`, Sentry chỉ khi có `SENTRY_DSN` (không khai trong `render.yaml`), SLO đo tay; 62 `console.*` trong `src`, 59 `print()` trong worker (ARC-023). V.
- Sao lưu/DR/rollback migration: NV.

## O. Tài liệu & bàn giao — **2**

| Tài liệu yêu cầu | Có? | Vị trí | Đánh giá |
|---|---|---|---|
| Kiến trúc hệ thống | Có | `ALG_SAAS_TARGET_ARCHITECTURE_V2.md`, `SMEOS_4_TIER_…` | Mô tả đích, lẫn hiện trạng |
| CSDL | Có | đặc tả 07 (khớp mã theo `check:docs`) | Tốt |
| ERD | Không | — | Thiếu |
| API | Có (nội bộ) | đặc tả 06 | Không có bản cho khách / OpenAPI |
| Bảo mật | Một phần | HO_SO_BAN_GIAO §4, runbook §6, standard 05 | Không có tài liệu bảo mật riêng cho khách |
| Tích hợp | Có | đặc tả 08, 22 | Mô tả đích nhiều hơn hiện trạng |
| Logic nghiệp vụ | Có | `docs/kien-truc/*`, function catalog | Rải rác |
| Triển khai | Có | runbook §3, `VAN_HANH_CAP_NHAT_CSDL.md` | Đủ cho Render |
| Cài đặt | Một phần | README "Chạy tại máy" | Chỉ cho dev |
| Cấu hình | Có | `.env.example`, runbook §2 | Tốt |
| Quản trị | Không riêng | — | Thiếu |
| Người dùng | Một phần | `docs/production-feature-map/` (vai Điều hành) | Thiếu các vai khác |
| Bảo trì | Một phần | runbook §5 | — |
| Nâng cấp & migration | Một phần | `VAN_HANH_CAP_NHAT_CSDL.md` | Không có chính sách phiên bản |
| Gói bàn giao | Bản nháp | HO_SO_BAN_GIAO, runbook §8 trống | Chưa đủ (ARC-028) |

Tách tài liệu nội bộ/khách: có `export-ignore` cho tệp agent, nhưng `docs/` (gồm audit nội bộ, kế hoạch, tài liệu khách hàng `docs/Audit/*.docx`) vẫn đi trong bản giao (ARC-015).

---

## 17. Đánh giá sẵn sàng tổng hợp

| # | Hạng mục | Kết luận | Bằng chứng chính |
|---|---|---|---|
| 1 | Đầy đủ kiến trúc | **Một phần** | Thiếu tầng Ngành dữ liệu, ERD, staging, OpenAPI, đầu nối Hub (ARC-005/007/008/024/027) |
| 2 | Đúng đắn kiến trúc | **Một phần** | Lõi tenancy/RBAC đúng; AI worker ngoài cổng (ARC-009), tích hợp trùng (ARC-007), trạng thái đơn lệch (ARC-017) |
| 3 | Nhất quán kiến trúc | **Thấp–Trung bình** | Hai bộ từ vựng vai, ba động cơ trạng thái, tài liệu lệch (ARC-014/016/017) |
| 4 | Hoàn thiện triển khai | **Một phần** | 3/6 ma trận chưa áp; kênh thông báo stub; 14 endpoint RS-7 chưa xây |
| 5 | Sẵn sàng bảo mật | **Chưa** | ARC-002 (P0), ARC-003, ARC-022; chưa pentest |
| 6 | Sẵn sàng production | **Chưa** | ARC-001, 004, 005, 006, 010 |
| 7 | Sẵn sàng thương mại | **Chưa** | Không có cổng thanh toán, SMS/Zalo chưa nối chuẩn, Nghị định 13 mở (ARC-007/011) |
| 8 | Sẵn sàng enterprise | **Chưa** | Một môi trường, không DR kiểm chứng, không SSO doanh nghiệp (SSO hiện chỉ liên-app nội bộ), không pentest |
| 9 | Sẵn sàng bàn giao khách | **Chưa** | ARC-028, runbook §8 trống, tài liệu nội bộ lẫn trong bản giao |
