# 08 — Sổ rủi ro kiến trúc

Thang: **Mức** P0 Nghiêm trọng · P1 Cao · P2 Trung bình · P3 Thấp. **Khả năng** C (cao) / TB / T (thấp). **Tác động** C / TB / T. **Bằng chứng** V Verified · PV Partially Verified · NV Not Verified. **TT** = điểm trưởng thành của hạng mục liên quan (0–5).
Miền: A Hệ thống · B Repo · C CSDL · D API · E Nghiệp vụ · F Bảo mật · G RBAC · H UX · I Screen Contract · J i18n · K Lưu trữ · L Tích hợp · M Agent · N DevOps · O Tài liệu.

## 1. Bảng tổng hợp

| ID | Miền | Mức | Khả năng | Tác động | BC | TT | Tóm tắt | Ưu tiên xử lý |
|---|---|---|---|---|---|---|---|---|
| ARC-001 | N/F | **P0** | C | C | V | 2 | `main` đỏ 4 run liền; tenant/platform/unit/build SKIP; Render auto-deploy `main` | 1 |
| ARC-002 | F | **P0** | TB | C | NV | — | Mật khẩu seed (trong lịch sử repo công khai) và mật khẩu CSDL đã lộ chưa xoay | 2 |
| ARC-003 | F/G | P1 | TB | C | V | 3 | Cửa hậu console nền tảng theo đuôi email `@dev.com` / cookie khi không-production | 3 |
| ARC-004 | N | P1 | TB | TB | V | 2 | `typescript.ignoreBuildErrors: true` | 4 |
| ARC-005 | N/C | P1 | TB | C | PV | 2 | Một môi trường; migration + seed trong build production; sao lưu/PITR/khôi phục chưa kiểm chứng | 5 |
| ARC-006 | K | P1 | TB | C | PV | 3 | Kho tệp lùi về đĩa cục bộ trong im lặng; `STORAGE_*` không bắt buộc | 6 |
| ARC-007 | L/E | P1 | C | TB | V | 2 | Tích hợp phân mảnh; Hub không có đầu nối thật; kênh trùng; không cổng thanh toán | 9 |
| ARC-008 | A/G | P1 | C | TB | V | 3 | Tầng Ngành không có dữ liệu; vai `industry_admin` không tồn tại; 3/6 ma trận chưa áp | 10 |
| ARC-009 | F/A | P1 | C | TB | PV | 3 | Worker Python gọi thẳng nhà cung cấp AI, ngoài `callCapability` | 8 |
| ARC-010 | A/N | P2 | TB | TB | PV | 3 | 3 lịch nền `setInterval` + SSE hub trong bộ nhớ, không khoá phân tán | 14 |
| ARC-011 | F/C | P1 | TB | C | V | 2 | Nghị định 13/2023: đồng ý, hạn lưu, xoá PII khách cuối chưa có | 7 |
| ARC-012 | F/N | P2 | TB | C | V | — | Một người vận hành nền tảng duy nhất giữ mọi mã N; không tách nhiệm vụ | 13 |
| ARC-013 | B | P2 | C | TB | V | 3 | 105 tệp > 350 dòng (tối đa 1.945) | 20 |
| ARC-014 | O/M | P2 | C | TB | V | 3 | Tài liệu trạng thái/agent lệch mã (TRANG_THAI §3/§6, cổng, số mã, đường dẫn) | 12 |
| ARC-015 | B/O | P2 | TB | TB | V | 3 | `docs/Audit` vs `docs/audit`; tài liệu nội bộ + khách lẫn nhau trong bản giao; tên có dấu/khoảng trắng | 16 |
| ARC-016 | G | P2 | TB | TB | V | 3 | Hai từ vựng vai (UI vs RBAC); `crm`/`customer_service` trùng nhãn; `product_manager` 4 mã | 15 |
| ARC-017 | E | P2 | TB | TB | V | 3 | Ba động cơ trạng thái trên `orders`; `business-reporting.ts` lệch enum | 11 |
| ARC-018 | A | P2 | C | T | V | 3 | Domain/UI import kiểu entity từ `infra/` | 22 |
| ARC-019 | C | P2 | TB | TB | V | 3 | Cột trạng thái kiểu `String`; bảng con không `organization_id`; DB test dựng bằng `db push` | 19 |
| ARC-020 | I | P2 | C | TB | V | 2 | Screen Contract phủ ~40% trang; tuân thủ tự khai | 17 |
| ARC-021 | J | P2 | C | T | V | 2 | 74% tệp TSX chưa dùng i18n | 24 |
| ARC-022 | F | ~~P2~~ **ĐÃ ĐÓNG 12/11/2026** (mã) | T | C | V | 4 | ~~Không kiểm Origin~~ (11/11/2026; production chạy `log` 1 tuần rồi `enforce`) · ~~CSP Report-Only~~ (CSP theo nonce, chặn ngay khi triển khai — D-68) | — |
| ARC-023 | N | P2 | C | TB | V | 2 | Sentry tuỳ chọn, không khai ở `render.yaml`; không metrics; 62 `console.*`, 59 `print()` | 21 |
| ARC-024 | D/O | P3 — **gần đóng** | TB | TB | V | 4 | ~~Không OpenAPI~~ · ~~không tài liệu cho đối tác~~ (trang `/tich-hop/tai-lieu-api` sau đăng nhập, 11/11/2026) · trường nội bộ Integration API đã báo gỡ, **tự gỡ 09/02/2027**; còn 67 mục envelope lệch nội bộ (ratchet) | 23 |
| ARC-025 | G/D | ~~P2~~ ĐÃ ĐÓNG 07/11/2026 | T | TB | V | 4 | ~~`content-engine/rewrite` chưa gác mã năng lực~~ — gác `F2`/`L2`/`L3` + trừ credit | — |
| ARC-026 | B/N | P3 | T | T | V | 3 | `vercel.json`, `cron-job-entry.txt` lỗi thời; `dify-chat-provider.ts` chết | 28 |
| ARC-027 | C/O | P2 | C | T | V | 2 | Không có ERD | 26 |
| ARC-028 | O | P1 | C | C | V | 2 | Gói bàn giao khách thiếu SLA, hướng dẫn quản trị/người dùng, quyền truy cập | 8 |
| ARC-029 | E/A | P2 | C | TB | V | 3 | Mô-đun Thẻ chào 29k dòng, đóng băng tuyệt đối, chứa logic kênh/giá/thanh toán riêng | 27 |
| ARC-030 | A/N | P2 | C | TB | V | — | Worker `market-intelligence` không có trong `render.yaml` → tính năng nghiên cứu thị trường không chạy trên production | 13 |
| ARC-031 | F/B | P3 | T | TB | V | — | `xlsx` cài từ CDN, ngoài Dependabot | 29 |
| ARC-032 | N | P3 | TB | TB | V | — | Gói hạ tầng nhỏ (starter, DB basic-256mb, Redis 256 MB); chưa kiểm tải | 30 |
| ARC-033 | G/E | P1 | C | C | V | 2 | Gói dịch vụ không được thực thi (không route nào gọi `requireFeatureAccess`); tổ chức không có gói → `PRO` | 7 |
| ARC-034 | A/C | P1 | C | C | V | 2 | Ba mô hình Chuỗi → Cửa hàng (`chain_partnerships`, `chain_branches`, `branches`); mô hình `chain_branches` nằm ngoài quản trị tầng | 10 |
| ARC-035 | G | P1 | TB | C | V | 2 | Phạm vi quyền (`BRANCH`…) bị bỏ khi dựng `TenantContext`; giới hạn chi nhánh chỉ ad-hoc | 10 |
| ARC-036 | A/G | P2 | TB | TB | V | 2 | Tầng Ngành biểu diễn ba cách (không có / `industry:<key>` / id tổ chức) | 15 |
| ARC-037 | G/D | P2 | TB | TB | V | 3 | Khoá công cụ chỉ khoá trang với 4 công cụ; 1 công cụ trỏ trang không tồn tại | 18 |
| ARC-038 | E | P2 | T | TB | V | 3 | Logic "chuỗi cha" chép 3 nơi, ngầm chọn chuỗi sớm nhất | 22 |
| ARC-039 | H/G | P3 | TB | T | V | 3 | Nav Mẹ không lọc theo mã N; 2 liên kết nav hỏng | 28 |
| ARC-040 | F (hệ sinh thái) | P2 | T | C | V | 3 | SSO HS256 khoá chung giữa các app, không `aud`/`iss` | 18 |
| ARC-041 | A (hệ sinh thái) | P1 | C | TB | PV | 2 | Ranh giới sở hữu giữa core/LocalBudd/SocialFlow chưa chốt (hai bản Catalog, bảng trùng, D1) | 11 |
| ARC-042 | B (hệ sinh thái) | P2 | TB | TB | NV | — | `smeOS` và `floraos-core` cùng tồn tại công khai; chưa rõ nguồn deploy | 12 |
| ARC-043 | L (hệ sinh thái) | P2 | TB | TB | V | 2 | Proxy/SSO liên-app không cấu hình trên production, không test liên repo | 20 |

## 2. Chi tiết từng phát hiện

### ARC-001 — Cổng chất lượng bắt buộc không chạy, `main` vẫn tự deploy (P0)
- **Mô tả:** Bốn run CI gần nhất trên `main` (#286, #288, #290, #292) kết luận `failure`. Ở run #292 (`c27f39e1`), job `web` đỏ ở bước "Thuật ngữ ngành hardcode (ratchet)"; các bước `npm test`, `check:template-ssot`, `test:tenant`, `test:platform`, `build` bị **skipped**. `render.yaml` khai `autoDeploy: true`, `branch: main` cho web + 3 worker, không phụ thuộc CI.
- **Bằng chứng:** GitHub Actions run 41253314217 (job 124691154154); `render.yaml` dòng 8–16, 124–135; `.github/workflows/ci.yml`.
- **Trạng thái:** Đang xảy ra. Run #284 (08:38 31/10) xanh.
- **Tác động:** Lỗi cách ly tenant/hồi quy nghiệp vụ có thể lên production mà không ai biết; vi phạm luật bất biến #9 của `CLAUDE.md`.
- **Khuyến nghị:** (1) Sửa ratchet thuật ngữ trên `main`. (2) Tắt `autoDeploy`, deploy bằng deploy hook ở cuối CI xanh, hoặc bật "Wait for CI" tương đương. (3) GitHub ruleset bắt buộc `web`, `worker`, `e2e-ux`, `security`. (4) Cân nhắc tách bước ratchet thuật ngữ khỏi chuỗi bắt buộc tuần tự (chạy song song) để một ratchet không che cổng tenant.

### ARC-002 — Thông tin đăng nhập đã lộ chưa xoay (P0)
- **Bằng chứng:** `docs/kien-truc/HO_SO_BAN_GIAO.md` §6 "Việc làm tay còn lại": ô "Đổi mật khẩu… mật khẩu seed nằm trong lịch sử repo công khai" và "Xoay mật khẩu CSDL… đã lộ qua ảnh chụp màn hình" chưa tích. Repo được mô tả công khai (`ci.yml` job `security`).
- **Trạng thái:** NV — không truy cập được production. **Cập nhật 01/11/2026: PO xác nhận đã đổi mật khẩu (D-21) → đóng theo xác nhận của PO.**
- **Khuyến nghị:** Xoay ngay, xác nhận bằng văn bản; kiểm `platform_audit_logs`/`audit_logs` tìm đăng nhập lạ; bật GitHub secret scanning + push protection.

### ARC-003 — Cửa hậu console nền tảng ngoài production (P1)
- **Bằng chứng:** `src/modules/platform/use-cases/resolve-platform-session.ts` dòng 41–63: khi `NODE_ENV !== "production"`, (a) cookie `smeos_dev_role` có `roleKey: "platform_admin"` → trả ngữ cảnh với `N1…N8, N12`; (b) email `tuans2@dev.com` hoặc **bất kỳ email đuôi `@dev.com`** → trả mã của operator nếu có, không thì `N1…N8, N12`. `POST /api/dev/role-override` đặt cookie không cần đăng nhập (chỉ khi không-production). `POST /api/v1/auth/signup` công khai.
- **Tác động:** Mọi môi trường demo/staging/preview chạy `next dev` hoặc thiếu `NODE_ENV=production` mà mở ra Internet → người lạ đọc dữ liệu mọi tổ chức, tạo tổ chức, nạp credit. Production hiện an toàn (`render.yaml` đặt `NODE_ENV=production`).
- **Khuyến nghị:** Xoá nhánh (b); gác nhánh (a) bằng cờ riêng mặc định tắt + `NODE_ENV === "development"`; test platform khẳng định cả hai bị từ chối khi cờ tắt.

### ARC-004 — Build bỏ qua lỗi TypeScript (P1)
- **Bằng chứng:** `next.config.ts` `typescript: { ignoreBuildErrors: true }` (chú thích: Render typecheck lỗi vì migration chờ).
- **Khuyến nghị:** Bỏ cờ; giữ `npm run typecheck` trong CI làm cổng; nếu Render thiếu RAM, chạy typecheck ở CI và chỉ build ở Render sau khi CI xanh (gắn với ARC-001).

### ARC-005 — Một môi trường, deploy thẳng production, DR chưa kiểm chứng (P1)
- **Bằng chứng:** `render.yaml` chỉ có dịch vụ production; `buildCommand` = `npm ci && prisma generate && npm run db:deploy && npm run db:seed && npm run build`; runbook §4 "Lỗi do migration: không có lệnh down… [CẦN XÁC NHẬN] gói basic-256mb có sao lưu/PITR bao lâu; đã thử khôi phục chưa"; runbook §7 "Chưa làm: diễn tập khôi phục CSDL".
- **Khuyến nghị:** Môi trường staging (Render preview hoặc dịch vụ riêng + DB riêng); tách `db:deploy` khỏi build (pre-deploy command), sao lưu trước migration; xác minh PITR; diễn tập khôi phục có biên bản; chính sách migration "expand → migrate → contract".

### ARC-006 — Kho tệp lùi về đĩa cục bộ (P1)
- **Bằng chứng:** `src/modules/assets/adapters/storage-provider-factory.ts` (thiếu 1 trong 4 biến → `LocalDiskStorageProvider`, chỉ `log.warn`); `src/lib/env.ts` `STORAGE_*` `.optional()`; HO_SO_BAN_GIAO §3 ghi "bắt buộc ở production".
- **Tác động:** Ảnh sản phẩm/khách mất sau mỗi deploy; worker và web không thấy cùng tệp.
- **Khuyến nghị:** Ở production ném lỗi khởi động khi thiếu `STORAGE_*`; thêm kiểm vào `/api/health/ready`.

### ARC-007 — Kiến trúc tích hợp phân mảnh (P1)
- **Bằng chứng:** `integration-hub/adapters/connectors/index.ts` chỉ đăng ký `test_echo`, `test_shop`; `connector-catalog.ts` khai `facebook_messenger`, `zalo_oa`, `sepay`, `zalo_zns`, `telegram`, `esms` là `MANAGED`; mã gọi API thật ở `greeting-card/adapters/{esms-adapter,zalo-zns-adapter}.ts`, `greeting-card/adapters/staff-channels/{telegram-photo-upload,zalo-oa-*,messenger,whatsapp}*.ts`, `integration-hub/adapters/connectors/telegram/telegram-bot-api.ts`; `notification/infra/channel-adapters/{sms,zalo,web-push}-adapter.ts` trả `NOT_CONFIGURED`. Không có VNPay/MoMo/PayOS/Stripe.
- **Khuyến nghị:** Mỗi kênh một đầu nối duy nhất trong Hub (theo `connector-contract.ts`); Notification và Thẻ chào gọi qua Hub; nhãn trạng thái danh mục phản ánh đúng (`LEGACY`/`BETA`) tới khi chuyển xong; quyết định PO về cổng thanh toán.

### ARC-008 — Mô hình 4 tầng chưa trọn (P1)
- **Bằng chứng:** enum `organization_type` = `EXPERIENCE, SINGLE, STORE, CHAIN, FLOWER_NETWORK`; `SYSTEM_ROLES` không có `industry_admin`/`platform_admin`/`chain_admin`/`store_admin`; `tier-of.ts` nhận diện Ngành bằng `organization_type === "INDUSTRY"` (không thể xảy ra) hoặc vai `industry_admin`; `notification/domain/events/industry-events.ts` gửi tới `industry_admin`; `.agents/standards/alg/01-tier-governance.md` §3: Thanh toán/Phí gia công/Mẫu 🟡, tầng Ngành 🔴 (nợ #185, #195).
- **Khuyến nghị:** PO quyết: hoặc chính thức hoá Ngành chỉ là plugin (bỏ khỏi RBAC/thông báo/UI), hoặc thêm dữ liệu tầng Ngành (schema + vai + quyền). Áp 3 ma trận còn lại hoặc giữ `GovernanceScopeNote`.

### ARC-009 — Worker Python ngoài cổng AI (P1)
- **Bằng chứng:** `workers/media_ai/providers/{scene/fal_client.py, scene/stability_scene.py, enhancement/openai_enhancer.py, enhancement/replicate_enhancer.py, background/stability_background.py, expansion/fal_outpainter.py}`, `workers/vision/providers/openai_{direct,structured}.py`; sổ AI ghi bởi `workers/media_ai/providers/chung.py::ghi_ai_request`. `CLAUDE.md` #5 và HO_SO_BAN_GIAO §4 nói mọi lời gọi qua `callCapability`.
- **Trạng thái:** PV — chưa đọc hết xem worker có áp `ai_policies`/lọc giấy phép riêng không.
- **Khuyến nghị:** Định nghĩa chính sách AI dùng chung (bảng `ai_policies` + giấy phép mô hình) mà worker bắt buộc đọc trước khi gọi; test kiến trúc cấm gọi nhà cung cấp ngoài `providers/` có kiểm chính sách; cập nhật tài liệu cho đúng.

### ARC-010 — Lịch nền và SSE trong tiến trình (P2)
- **Bằng chứng:** `src/instrumentation.ts` khởi 3 lịch (`background-sweep-scheduler.ts`, `lead-recovery-scheduler.ts`, `orders-sweep-scheduler.ts`) bằng `setInterval`, không có advisory lock; `notification/adapters/notification-sse-adapter.ts` hub trong bộ nhớ.
- **Khuyến nghị:** Chuyển lịch nền sang cron (đã có `smeos-cron-dispatch-sweep`) hoặc khoá `pg_try_advisory_lock`; SSE qua Redis pub/sub / Postgres `LISTEN` trước khi chạy > 1 instance.

### ARC-011 — Dữ liệu cá nhân (P1)
- **Bằng chứng:** TRANG_THAI §5 D13 "chặn go-live M09, M10"; HO_SO_BAN_GIAO §6 (PO hoãn 22/10).
- **Khuyến nghị:** Quyết định pháp lý; bảng đồng ý theo mục đích; hạn lưu; xuất/xoá theo yêu cầu chủ thể; ghi nhật ký xử lý.

### ARC-012 — Một người vận hành nền tảng (P2)
- **Bằng chứng:** HO_SO_BAN_GIAO §6 "Superadmin nền tảng: chỉ `tuans2@dev.com`, đủ mã N"; TRANG_THAI D-N6 "Một người vận hành duy nhất".
- **Khuyến nghị:** Tối thiểu 2 người, tách mã (ví dụ tài chính `N3` riêng), MFA cho tài khoản nền tảng.

### ARC-013 — Tệp quá lớn (P2)
- **Bằng chứng:** 105 tệp > 350 dòng; top: `src/app/(app)/tai-anh/page.tsx` 1.945, `components/creative-studio/variant-workspace.tsx` 1.753, `components/upload/upload-wizard.tsx` 1.455, `workers/media_ai/jobs/variant_worker.py` 1.449, `components/sales/sales-pitch-card.tsx` 1.412.
- **Khuyến nghị:** Ratchet số dòng theo tệp (không cho tăng), tách khi sửa lớn.

### ARC-014 — Tài liệu lệch mã (P2)
- **Bằng chứng:** xem `07` §2 bảng "Độ chính xác"; `04` §5.
- **Khuyến nghị:** Viết lại TRANG_THAI §3/§6 theo hiện trạng; thêm vào `check:docs` kiểm cổng dev, số mã trần cứng, đường dẫn tham chiếu trong README/CLAUDE.

### ARC-015 — Tổ chức tài liệu (P2)
- **Bằng chứng:** `docs/Audit/` và `docs/audit/`; `handover:check` cảnh báo 4 tệp prompt agent trong `docs/`; tài liệu khách ALG `.docx` trong `docs/Audit/`.
- **Khuyến nghị:** Gộp/đổi tên thư mục; tách `docs/internal/` (export-ignore) và `docs/client/`.

### ARC-016 — Từ vựng vai không thống nhất (P2)
- **Bằng chứng:** `organization/domain/system-roles.ts` vs `lib/dev-role-override.ts`, `core/governance/tier-of.ts`, `components/layout/{superadmin-homepage-badge,architecture-nametag}.tsx`, `components/market-intelligence/use-market-intelligence-data.ts` (so `dieu_hanh`, lỗi mạng → `setIsSaaSAdmin(true)`).
- **Khuyến nghị:** Một bảng ánh xạ "khuôn UX" ← (loại tổ chức, mã năng lực); UI không so khoá vai; gộp hoặc phân định `crm`/`customer_service`; xem lại `product_manager`.

### ARC-017 — Trạng thái đơn (P2)
- **Bằng chứng:** `orders/domain/order-rules.ts` dòng 15–39; `coordinator/domain/stage-transitions.ts`, `state-mapper.ts`; `orders/domain/business-reporting.ts` dòng 12; enum `order_status` (`schema.prisma` dòng 1575).
- **Khuyến nghị:** Xem `06` §9.

### ARC-018 — Rò kiểu infra (P2)
- **Bằng chứng:** `audit/domain/repositories/audit-log-repository.interface.ts:8`, `jobs/domain/repositories/generation-job-repository.interface.ts:14` (+6); `components/profiles/business-profile-form.tsx:6`, `components/integrations/sales-channel-panel.tsx:11` (+5).
- **Khuyến nghị:** Kiểu domain riêng; mở rộng `check:layers` cấm `import type` từ `infra/` trong `domain/` và `components/`.

### ARC-019 — Quy ước lược đồ (P2)
- **Bằng chứng:** `chain_partnerships.status String`, `notification_hard_locks.tier String`, `internal_chat_messages` (không `organization_id`); `ci.yml` "Dựng database floraos_test … prisma db push".
- **Khuyến nghị:** Enum cho cột trạng thái mới; cân nhắc `organization_id` dư thừa có chủ đích ở bảng con nhiều dòng (truy vấn trực tiếp + RLS sau này); DB test dựng bằng `migrate deploy`.

### ARC-020 — Screen Contract (P2)
- **Bằng chứng:** `docs/dac-ta/screen-contracts/` 47 tệp; 104 `page.tsx`; danh sách tuyến thiếu ở `03` mục I.
- **Khuyến nghị:** Test kiến trúc: mỗi `page.tsx` trong `(app)`/`(platform)` có hợp đồng hoặc mục miễn trừ có lý do.

### ARC-021 — i18n (P2)
- **Bằng chứng:** 238/924 tệp TSX trong `src/app` + `src/components` dùng `useI18n`/`getI18n`/`t("`.
- **Khuyến nghị:** Ratchet số chuỗi hardcode; ưu tiên thông báo lỗi, trạng thái rỗng, email/thông báo khách.

### ARC-022 — CSP/CSRF (P2) — xem `05` §1.
- **Kiểm Origin (11/11/2026, D-25):** `src/core/http/origin-guard.ts` gọi trong `handle()` — lệnh ghi có cookie phiên và đăng nhập/đăng ký từ origin khác → 403 `CROSS_ORIGIN_REJECTED`; route `GET` không đổi trạng thái (test kiến trúc). `ORIGIN_CHECK_MODE`: production mặc định `log` — sau 1 tuần không có `security.cross_origin_request` hợp lệ trong log Render, đặt `ORIGIN_CHECK_MODE=enforce` (việc của PO trên Render, không sửa `render.yaml`).
- **CSP (12/11/2026, A6, PO D-68 thay phần 2 tuần ghi nhận của D-25):** CSP theo nonce mỗi request (`src/core/http/csp.ts`, gắn ở `src/proxy.ts`), header `Content-Security-Policy` chặn thật ngay khi triển khai; `script-src 'self' 'nonce-…' 'strict-dynamic'`, `object-src 'none'`, `base-uri`/`form-action`/`frame-ancestors 'self'`; mọi trang render động để có nonce. `CSP_MODE=report-only` tạm lùi khi có sự cố; vi phạm vẫn báo về `/api/v1/public/csp-report`.

### ARC-023 — Quan trắc (P2)
- **Bằng chứng:** `src/instrumentation.ts` (Sentry chỉ khi `SENTRY_DSN`); `render.yaml` không khai `SENTRY_DSN`; runbook §10 "chưa có công cụ metrics".
- **Khuyến nghị:** Khai `SENTRY_DSN` trong `render.yaml` (`sync: false`) ở web + 3 worker; metrics (Render metrics / OpenTelemetry); thay `console.*`/`print()` bằng logger.

### ARC-024 — Hợp đồng API (P2)
- **Bằng chứng:** không có tệp OpenAPI; 6 route dùng `NextResponse.json` trực tiếp (gồm webhook, dev).
- **Khuyến nghị:** Sinh OpenAPI từ schema zod cho `/api/v1/integration/*` (bề mặt bên thứ ba) trước.
- **Phần OpenAPI xong 11/11/2026:** `docs/spec/contracts/openapi/{integration,public,platform,internal}.openapi.json` sinh từ zod (đăng ký `DOC-03-OPENAPI-*`), `npm run check:openapi` gác qua `npm test`; route mới bắt buộc `defineRoute`, envelope lệch bị ratchet chặn (`docs/audit/api-architecture-audit/01_API_ARCHITECTURE_AUDIT.md` §8–§38).
- **Còn mở (đính chính 11/11/2026 — trước đó ghi nhầm "đã đóng" cả mục):** (1) chưa có tài liệu API công bố cho đối tác/khách — tệp OpenAPI mới nằm trong repo; (2) phản hồi `/integration/*` trả nguyên bản ghi nội bộ (vd. `usage.user_id`, `generation_jobs.payload`) — thu gọn cần `/v2` hoặc báo trước 90 ngày; (3) 501 route cũ chưa theo chuẩn v1.1, 67 mục envelope lệch. Cần PO duyệt trước khi mở API thương mại cho bên thứ ba.
- **Cập nhật 11/11/2026 (phần B, PO duyệt):** (1) tài liệu cho đối tác: trang `/tich-hop/tai-lieu-api`, xem sau đăng nhập với quyền quản lý khoá ứng dụng, hướng dẫn + tham chiếu sinh từ OpenAPI; (2) trường nội bộ Integration API đánh dấu `deprecated`, máy chủ tự bỏ từ 09/02/2027 (`integration-field-sunset.ts`). Còn: thông báo tới LocalBudd/SocialFlow/đối tác (việc của PO); 67 mục envelope nội bộ theo ratchet.
- **Trả nợ chuẩn v1.1 (12/11/2026):** kế hoạch 5 đợt ở `docs/audit/api-architecture-audit/01_API_ARCHITECTURE_AUDIT.md` §42; đợt 1–3 bọc 498 route bằng `defineRoute` không đổi hợp đồng — route cũ 501 → 3 (webhook/widget chat, ngoại lệ có lý do); đợt 4 envelope lệch 65 → 12 (chỉ còn ngoại lệ nhà cung cấp/vận hành — §42).

### ARC-025 — Route thiếu mã năng lực (P2)
- **Bằng chứng:** `NO_CAPABILITY_GUARD["content-engine/rewrite"] = DEBT_170`.
- **Khuyến nghị:** PO chốt mã, gác, xoá khỏi danh sách.
- **Đã đóng 07/11/2026:** gác một trong `F2`/`L2`/`L3`, trừ credit `content.rewrite`, gỡ khỏi `NO_CAPABILITY_GUARD` (`01_API_ARCHITECTURE_AUDIT.md` §13).

### ARC-026 — Tàn dư cấu hình/mã (P3)
- **Bằng chứng:** `vercel.json`, `cron-job-entry.txt`, `src/modules/chat-assistant/adapters/dify-chat-provider.ts` (không được import).
- **Khuyến nghị:** Xoá hoặc ghi rõ mục đích.

### ARC-027 — ERD (P2) — sinh ERD từ `schema.prisma` theo miền (ít nhất: tổ chức/quyền, đơn hàng, asset/job, tích hợp).

### ARC-028 — Gói bàn giao (P1) — xem `07` §4.

### ARC-029 — Thẻ chào (P2)
- **Bằng chứng:** `src/modules/greeting-card/` 29.083 dòng; `tests/unit/architecture/the-chao-freeze.test.ts`; TRANG_THAI §4 "Thẻ chào đóng băng tuyệt đối".
- **Khuyến nghị:** Lộ trình tách sau mùa cao điểm (xem `10`).

### ARC-030 — Worker nghiên cứu thị trường không được triển khai (P2)
- **Bằng chứng:** `package.json` `worker:market-intelligence` (`tsx src/modules/market-intelligence/jobs/worker.ts`); `render.yaml` không có dịch vụ tương ứng; `market-intelligence-repository.ts` `NOTIFY market_intelligence_research`.
- **Trạng thái:** V (cấu hình); NV (có chạy ở nơi khác không).
- **Khuyến nghị:** Thêm dịch vụ worker hoặc gắn nhãn "chưa vận hành" trên giao diện.

### ARC-031 — `xlsx` từ CDN (P3) — theo dõi tay bản mới; cân nhắc thư viện thay thế có trên npm.

### ARC-032 — Dung lượng hạ tầng (P3) — kiểm tải theo SLO S1–S4 trước khi nhận khách lớn; kế hoạch nâng gói.

### ARC-033 … ARC-039 — Nhất quán xuyên 4 tầng
Chi tiết, bằng chứng và khuyến nghị ở `13_CROSS_TIER_CONSISTENCY_AUDIT.md` §3–§8. Bằng chứng chính:
- ARC-033: `src/core/entitlements/entitlement-service.ts` (`requireFeatureAccess`, `resolvePlanFromOrg` → `"PRO"`); `grep` chỉ thấy `integration-hub/infra/org-profile.ts` dùng.
- ARC-034: `prisma/schema.prisma` model `chain_partnerships`, `chain_branches`, `branches`, `memberships.chain_branch_code`; `governance-decisions-repository.ts` dòng 58, 74; `integration-hub/infra/governance-repository.ts` `scopeOf`.
- ARC-035: `organization/use-cases/resolve-session.ts` (`new Set(grants.map((grant) => grant.code))`); `core/rbac/permission-resolver.ts` `CapabilityScope`.
- ARC-036: `integration-hub/domain/integration-governance.ts` dòng 4–5, 31–35; `notification/domain/cascading-policy.ts` `isLockInScope`; `notification/domain/events/industry-events.ts`.
- ARC-037: `organization/domain/tool-route-entitlement.ts` `TOOL_ROUTE_RULES`.
- ARC-038: ba lời gọi `chain_partnerships.findFirst({ orderBy: { created_at: "asc" } })`.
- ARC-039: `components/layout/nav/nav-mother.ts` (0 trường `capability`), `nav-store.ts` (`/cong-cu/toi-uu-he-thong`), `nav-mother.ts` (`/van-hanh/san-pham`).

Khuyến nghị gộp: `13` §10.

### ARC-040 … ARC-043 — Cấp hệ sinh thái
Chi tiết ở `14_ECOSYSTEM_AUDIT.md` §2–§3. Lỗi cấp hệ sinh thái cần quyết định ở nhiều repo; không sửa được chỉ trong `ALG`.

## 3. Phân bố

| Mức | Số phát hiện |
|---|---|
| P0 | 2 |
| P1 | 13 (ARC-003, 004, 005, 006, 007, 008, 009, 011, 028, 033, 034, 035, 041) |
| P2 | 24 |
| P3 | 4 |
| **Tổng** | **43** (39 cấp repo `ALG`, 4 cấp hệ sinh thái: ARC-040 … 043) |
