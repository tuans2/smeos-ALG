# 2. User Roles & Permissions — As-Is

## 2.1 Bốn loại danh tính có trong mã

| Danh tính | Cách nhận diện | Ngữ cảnh quyền | Bằng chứng |
|---|---|---|---|
| Thành viên tổ chức | Cookie `floraos_session` → `sessions` → `memberships.status = ACTIVE` | `TenantContext.capabilities` (tập mã năng lực) | `src/modules/organization/use-cases/resolve-session.ts` |
| Người vận hành nền tảng | Cùng cookie phiên + bản ghi `platform_operators` (không `revoked_at`) | `PlatformContext.capabilities` (mã `N*`) | `src/modules/platform/use-cases/resolve-platform-session.ts` |
| App tích hợp (LocalBudd/SocialFlow) | `Authorization: Bearer <token>` (bảng `integration_tokens`) hoặc header `X-FloraOS-SSO` (JWT) | Token: `capabilities` rỗng, phạm vi theo `client`; SSO: năng lực thật của người dùng trừ `L5` | `src/modules/integration/use-cases/resolve-integration-context.ts`, `src/modules/integration/domain/boundary-capabilities.ts` |
| Khách cuối (không đăng nhập) | Mã trong URL (`sendCode`, mã share link, slug) + cookie chủ phiên Thẻ chào; tra cứu đơn bằng 4 số cuối SĐT | Không có mã năng lực | `src/app/s/[code]/mo/route.ts`, `src/modules/greeting-card/domain/tracking-privacy.ts` |

## 2.2 Cơ chế phân quyền tổ chức (3 lớp)

```text
lớp 1: role_capabilities (mặc định theo vai hệ thống, seed từ catalog)
  → lớp 2: capability_overrides (bật/tắt theo tổ chức × vai × mã)
    → lớp 3: hardCap (hằng trong mã, cắt sau cùng)
      → TenantContext.capabilities (Set mã) → requireCapability(ctx, code)
```

- Catalog: `src/core/rbac/capability-catalog.ts` — **151 mã**, 17 nhóm; **43 mã có trần cứng**; 76 mã A–E sinh từ bản thu hoạch `src/lib/maChucNang.ts`.
- Gộp lớp: `src/core/rbac/permission-resolver.ts` (`mergeOverrides`, `applyHardCap`); đọc CSDL ở `src/modules/organization/infra/capability-repository.ts`.
- Kiểm: `requireCapability` ném `AppError("CAPABILITY_DENIED")` → HTTP 403 (`src/core/rbac/capabilities.ts`, `src/core/http/errors.ts:22`).
- Giao diện ẩn/hiện bằng `can(code)` đọc danh sách mã từ `GET /auth/me` (`src/lib/session.tsx`, `src/modules/organization/use-cases/describe-session.ts`).
- **Phạm vi (`scope`)**: cột `role_capabilities.scope` (`ORGANIZATION|BRANCH|STORE|FLOWER_NETWORK`) được lưu và trả trong grant, nhưng `TenantContext.capabilities` chỉ giữ **mã** (`resolve-session.ts`: `new Set(grants.map((grant) => grant.code))`). Không tìm thấy chỗ nào cắt dữ liệu theo `scope` → hiệu lực của `scope` khi kiểm quyền: **Referenced but not implemented**.
- Vai riêng của tổ chức (`POST /roles`) bắt đầu **không có mã nào**; mã có trần cứng không bao giờ mở được cho vai riêng vì trần cứng so khoá vai hệ thống (`permission-resolver.ts:passesHardCap`).
- 6 cặp chạy/duyệt tách rời: `H1↔H3`, `I1↔I2`, `I4↔I5`, `J1↔J2`, `J3↔J4`, `H5↔H6` (`SPLIT_CAPABILITY_PAIRS`).

## 2.3 Vai hệ thống (bản ghi `roles` với `organization_id = null`)

Seed bởi `ensureSystemRoles()` duyệt `SYSTEM_ROLES` (`src/modules/organization/domain/system-roles.ts`) — **8 vai**. Người đăng ký mới nhận vai `dieu_hanh` (`FOUNDER_ROLE_KEY`).

| Khoá | Tên | Số mã mặc định | Mục điều hướng thấy được (mặc định, chưa khoá production) | Ràng buộc nổi bật |
|---|---|---|---|---|
| `dieu_hanh` | Điều hành | 150 / 151 (thiếu `K1`) | Toàn bộ 30 mục | Là vai duy nhất qua được hầu hết trần cứng |
| `dieu_phoi` | Điều phối | 96 | Mọi mục trừ Tính giá (`L6`), Hàng chờ duyệt (`H3`), Số liệu (`U3`), Mức dùng (`G8`), Nhật ký kiểm toán (`G9`), Bộ máy phân tích ảnh (`H4`) | Không duyệt Product Master/ảnh (`H3`,`I2`,`I5`,`H6`), không huỷ đơn (`R6`), không hoàn tiền (`R10`) |
| `sale` | Sale | 33 | Khách hàng, Đơn hàng, Hội thoại, Thẻ chào, Sản phẩm, Quét ảnh, Kho dữ liệu, Nghiên cứu thị trường, Creative Studio, Ảnh marketing, Video, Viết nội dung, Job, Hồ sơ, Cài đặt + 4 mục không gác mã | Không `R3/R4/R5` (cập nhật sản xuất/giao), không `J1` |
| `product_manager` | Quản lý sản phẩm | 4 (`L1,L2,L3,L5`) | Sản phẩm, Tạo mẫu, Nhập Excel + 4 mục không gác mã | Không có `F1` (không xem hồ sơ tổ chức), không `G*` |
| `marketing` | Marketing | 19 | Catalog, Sản phẩm, Quét ảnh, Kho dữ liệu, Nghiên cứu thị trường, Creative Studio, Ảnh marketing, Video, Viết nội dung, Job + 4 mục không gác mã | Không có `F1`, không `R*`, không `Q*` |
| `crm` | Chăm sóc khách hàng | 10 | Khách hàng, Đơn hàng, Hội thoại, Thẻ chào, Sản phẩm + 4 mục không gác mã | Không có `T2` (gửi tin), không `R2` |
| `customer_service` | Chăm sóc khách hàng (CSKH) | 13 | Khách hàng, Đơn hàng, Hội thoại, Thẻ chào + 4 mục không gác mã | Không có `L1` |
| `experience_user` | Người dùng trải nghiệm | 2 (`K1`,`K2`) | Chỉ 4 mục không gác mã (Lịch đăng, Kho mẫu, Tri thức, Kết nối kênh) | `K1/K2` không được kiểm ở đâu trong mã |

"4 mục không gác mã" = Lịch đăng, Kho mẫu, Tri thức, Kết nối kênh (mục điều hướng không khai `capability`). Ma trận đủ 151 mã: [02a-ma-tran-quyen.md](02a-ma-tran-quyen.md).

Ghi chú: trên production (`NEXT_PUBLIC_APP_ENV=production`), 8 tiền tố tuyến bị khoá cho mọi vai (`/hoi-thoai`, `/catalog`, `/market-intelligence`, `/creative-studio`, `/video`, `/noi-dung`, `/lich-dang`, `/kho-templates`) — `src/lib/feature-lock.ts`. Giá trị biến này trên môi trường thật: **NOT VERIFIED**.

## 2.4 Vai trải nghiệm (Role UX) — chỉ đổi giao diện, không đổi quyền

`src/modules/organization/domain/role-ux-catalog.ts` khai **16 khuôn** (+ bí danh `store_manager`). Hàm `resolveRoleUx` ánh xạ vai hệ thống → khuôn; chỉ khuôn `AVAILABLE` được dùng.

| Khuôn | Trạng thái | Vai hệ thống gắn | Trang vào |
|---|---|---|---|
| `platform_admin` | AVAILABLE | — (dùng cho `/van-hanh`) | `/van-hanh` |
| `store_admin` | AVAILABLE | `dieu_hanh` | `/` |
| `flower_network_admin` | AVAILABLE | `dieu_hanh` khi `organizations.type ∈ {FLOWER_NETWORK, CHAIN}` | `/dieu-phoi` |
| `sales` | AVAILABLE | `sale` | `/` |
| `crm` | AVAILABLE | `crm` | `/khach-hang` |
| `lead_marketing` | AVAILABLE | `marketing` | `/creative-studio` |
| `coordinator` | AVAILABLE | `dieu_phoi` | `/dieu-phoi` |
| `customer_service` | AVAILABLE | `customer_service` | `/hoi-thoai` |
| `marketing` | AVAILABLE | — | `/creative-studio` |
| `product_manager` | AVAILABLE | `product_manager` | `/san-pham` |
| `ceo`, `manager`, `quality_control`, `partner_manager`, `finance_accounting`, `florist` | IN_DEVELOPMENT | — | `null` (homepage `NOT_BUILT`) |

Trang `/vai-tro` hiển thị danh mục này (chỉ đọc).

## 2.5 Người vận hành nền tảng

- Catalog riêng `src/core/platform/platform-capability-catalog.ts`: `N1`–`N8`, `N12` (9 mã). `N9`–`N11` ghi chú là giữ chỗ, không khai.
- Gán quyền chỉ bằng script `npm run gan-van-hanh-nen-tang` (`scripts/gan-van-hanh-nen-tang.ts`); không có API/màn hình cấp quyền.
- Layout `(platform)` không có ngữ cảnh → `redirect("/")` (`src/app/(platform)/layout.tsx`).

| Mã | Tên | Được kiểm ở |
|---|---|---|
| N1 | `platform.organizations.read` | `GET /platform/organizations`, `GET /platform/organizations/:id` |
| N2 | `platform.upgrade_requests.manage` | **không có nơi kiểm** (Referenced but not implemented) |
| N3 | `platform.credit.manage` | **không có nơi kiểm** — nạp/hoàn credit qua script `nap-credit.ts`, `hoan-credit.ts` |
| N4 | `platform.usage.read` | `GET /platform/usage` |
| N5 | `platform.health.read` | `GET /platform/health` |
| N6 | `platform.audit.read` | `GET /platform/audit-logs` |
| N7 | `platform.organizations.create` | **không có nơi kiểm** |
| N8 | `platform.integration_tokens.manage` | **không có nơi kiểm** |
| N12 | `platform.field_catalog.manage` | `/platform/fields*`, `/platform/catalogs*`, `/platform/behaviors`, `/platform/organizations/:id/field-*` |

## 2.6 App tích hợp

- `integration_client` enum: `LOCALBUDD`, `SOCIALFLOW`. Token do `F9` cấp/xoay/thu hồi (`/integration-tokens*`); CSDL giữ HMAC (`token_hash`), `expires_at`, `revoked_at`, `rotated_from_id`.
- Nhánh SSO dựng `TenantContext` thật của người dùng qua `tenantContextFor()` rồi trừ `L5` (`CAPABILITIES_NEVER_CROSSING_BOUNDARY = ["L5"]`).
- Phía app ngoài kiểm quyền thế nào: **NOT VERIFIED** (repo ngoài).

## 2.7 Mã năng lực được khai nhưng không được kiểm ở đâu

Phép dò `requireCapability`/`capabilities.has`/`can()`/`capability:` trên toàn `src/` (trừ catalog và test):

- **Kiểm ở máy chủ:** 67/151 mã (gồm 10 mã mà Thẻ chào dùng lại qua `GREETING_CARD_CAPABILITY` và 7 mã trong bảng `MODULE_RUN_CAPABILITY` của `POST /jobs/batch`).
- **Chỉ kiểm ở giao diện:** `C23` (mục điều hướng "Điều phối"; API `/coordinator/*` gác bằng `R*`).
- **Không kiểm ở đâu (83 mã):** toàn bộ `A1`,`A2`,`A4`–`A7`, `B1`–`B5`,`B7`–`B16`, `C1`–`C22`,`C24`–`C28`, `D1`–`D17`, `E1`–`E8`, cùng `J3`, `J4`, `J6`, `U4`, `K1`, `K2`, `R8`, `Q5`, `Q8`, `V3`. (`A3` và `B6` chỉ xuất hiện như một trong các điều kiện "hoặc" của `requireExecutiveRole` ở `src/modules/storage/use-cases/manage-trash.ts`.)
- `POST /jobs/batch` tham chiếu `P1` (M04b) và `O1` (M07) — **hai mã này không tồn tại trong catalog**, nên hai nhánh đó luôn bị từ chối (`src/app/api/v1/jobs/batch/route.ts`).

## 2.8 Cơ chế liên quan quyền nhưng không có nơi gọi (Dead/unused code)

| Mã | Mô tả | Bằng chứng |
|---|---|---|
| `src/core/entitlements/entitlement-service.ts` | Gói thương mại `EXPERIENCE/STARTER/PRO/FLOWER_NETWORK/ENTERPRISE`, `requireFeatureAccess` | Không tệp production nào import (chỉ test) |
| `src/modules/organization/domain/self-approval-policy.ts` | Công tắc `cho_phep_tu_duyet` | Chỉ test import |
| `src/modules/organization/domain/role-compatibility.ts` | Cầu nối khoá cũ `ONE_STORE/CHAIN/store_manager` | Chỉ test import |
| `membership_status.SUSPENDED` | Enum | Không có mã ghi giá trị này |
| `membership_status.INVITED → ACTIVE` | `POST /members/invite` tạo `INVITED`; không có API chấp nhận lời mời | `invite-member.ts` ghi chú "chưa có luồng email"; thêm thành viên ACTIVE qua script `them-thanh-vien.ts` |
