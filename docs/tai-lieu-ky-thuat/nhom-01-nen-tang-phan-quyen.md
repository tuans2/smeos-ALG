# Nhóm 1 — Nền tảng chung & phân quyền (19 chức năng)

Nguyên lý chung của cách ly tổ chức, RLS và mã năng lực: [02 — Cách ly dữ liệu và phân quyền](02-cach-ly-du-lieu-va-phan-quyen.md).
Rút gọn đường dẫn: `org/` = `src/modules/organization/`, `gc/` = `src/modules/greeting-card/`, `api/` = `src/app/api/v1/`,
`tt/` = `tests/tenant/`, `tp/` = `tests/platform/`, `tu/` = `tests/unit/`.

---

### 1.1 Truy cập theo tổ chức (multi-tenant)

- **Hành vi:** mỗi request lấy tổ chức từ bản ghi phiên phía máy chủ; dữ liệu tổ chức khác trả 404.
- **Mã chính:** `org/use-cases/resolve-session.ts` (`resolveSession`, `requireTenantContext`), `src/core/tenancy/tenant-context.ts`.
- **Dữ liệu:** `sessions`, `memberships`, `organizations`; mọi bảng thuộc tổ chức có `organization_id`.
- **Test:** `tt/order-isolation.test.ts`, `tt/cach-ly-endpoint.test.ts` và toàn bộ `tests/tenant/`.
- **Khi nâng cấp:** không thêm đường nào đọc `organization_id` từ body/query/header. Repository mới nhận `ctx`/`organizationId` từ
  use-case.

### 1.2 Đăng nhập và thu hồi phiên cũ

- **Hành vi:** đăng nhập thành công thu hồi mọi phiên cũ của tài khoản trong cùng giao dịch (mỗi tài khoản một phiên). Phiên bị
  thay trả lý do `SESSION_SUPERSEDED`. Trang chủ chọn theo vai.
- **Mã chính:** `org/use-cases/log-in.ts`, `org/use-cases/resolve-session.ts`, `src/app/(auth)/dang-nhap/`, `src/app/(app)/page.tsx`
  (`resolveRoleUx`).
- **Test:** `tt/single-session-per-account.test.ts`.

### 1.3 Đăng xuất và vô hiệu phiên tức thì

- **Hành vi:** thu hồi phiên, xoá cookie; token cũ trả 401 ngay.
- **Mã chính:** `api/auth/logout/route.ts`, `org/use-cases/log-out.ts`.
- **Test:** `tt/single-session-per-account.test.ts`.
- **Giới hạn hiện tại:** token SSO liên ứng dụng đã phát hành còn hiệu lực tối đa 15 phút sau đăng xuất (thiết kế của 9.14).

### 1.4 Bắt buộc đổi mật khẩu tạm lần đầu

- **Hành vi:** tài khoản cấp bằng mật khẩu tạm có cờ `users.must_change_password`; mọi API (trừ đổi mật khẩu, đăng xuất) trả
  `PASSWORD_CHANGE_REQUIRED` cho tới khi đổi; giao diện hiện hộp đổi mật khẩu bắt buộc.
- **Mã chính:** bật cờ ở `org/infra/staff-account-repository.ts`, `src/modules/platform/infra/account-approval-repository.ts`,
  `src/modules/chain-partnership/infra/prisma-partnership-repository.ts`; chặn ở `org/use-cases/resolve-session.ts`; giao diện
  `src/components/layout/forced-password-change.tsx`.
- **Dữ liệu:** `users.must_change_password` (migration `20261104090000_password_change_and_payment_confirmation`).
- **Test:** `tt/temporary-password-gate.test.ts`.
- **Khi nâng cấp:** mọi đường mới cấp mật khẩu thay người dùng phải bật cờ này.

### 1.5 Thông tin cửa hàng và logo

- **Hành vi:** hồ sơ kinh doanh (tên, liên hệ, địa chỉ, mô tả) và hồ sơ thương hiệu (logo, màu). Logo là tài sản riêng của tổ
  chức, hiện qua URL ký có hạn.
- **Mã chính:** `api/business-profile/route.ts` (đọc `F1`, sửa `F2`), `api/brand-profile/route.ts` (`logo_asset_id`),
  `src/components/profiles/business-profile-form.tsx`, `brand-profile-form.tsx`; màn Cài đặt tab "Thông tin tiệm", "Thương hiệu".
- **Test:** `tt/cach-ly-endpoint.test.ts`.

### 1.6 Chi nhánh và toạ độ khu vực

- **Hành vi:** khai chi nhánh với địa chỉ, phường/quận/tỉnh, vùng phục vụ (`service_wards`), toạ độ; điều phối chuỗi xếp hạng chi
  nhánh theo vùng.
- **Mã chính:** `api/greeting-card/chain-branches/bulk-import/route.ts`, giao diện nhập `src/components/products/bulk-import/branch-import-panel.tsx`
  (màn `/san-pham/nhap-hang-loat`), xếp hạng `gc/domain/chain-dispatch-engine.ts`.
- **Dữ liệu:** `branches` (địa chỉ, `ward`, `service_wards`, `latitude`/`longitude`); `chain_branches` đang trong giai đoạn gộp vào
  `branches` — đọc đặc tả 07 §41 trước khi sửa hai bảng này.
- **Test:** `tt/chain-branch-area.test.ts`, `tt/chain-branches-table.test.ts`.
- **Giới hạn hiện tại:** khai theo lô từ Excel; không có form thêm từng chi nhánh.

### 1.7 Dịp tặng chuẩn của ngành

- **Hành vi:** danh mục dịp mặc định theo ngành; cửa hàng thêm, sửa, bật/tắt dịp và đặt giọng điệu cho mỗi dịp.
- **Mã chính:** `api/occasions/route.ts`, `api/occasions/[id]/route.ts`, mặc định `org/infra/occasion-repository.ts`, giao diện
  `src/components/organization/occasions-settings-form.tsx` (Cài đặt → "Đặt cọc & giá").
- **Test:** `tt/occasions-isolation.test.ts` (Sale 403, tổ chức khác 404).

### 1.8 Chính sách cửa hàng (ngân hàng, phụ thu lễ)

- **Hành vi:** tài khoản nhận tiền, % đặt cọc, phụ phí và số đơn tối đa ngày lễ, trần đơn theo khung giờ.
- **Mã chính:** `gc/domain/store-payment-methods.ts`, `gc/domain/brochure-payment-policy.ts`, `gc/domain/holiday-policy.ts`,
  `gc/domain/slot-capacity.ts`; giao diện Cài đặt tab "Nhận thanh toán", "Đặt cọc & giá", "Thẻ Chào & quy trình".
- **Test:** `tt/greeting-card-holiday.test.ts`, `tt/greeting-card-promotion-slot.test.ts`, `tt/greeting-card-payments.test.ts`.

### 1.9 Trường dữ liệu linh hoạt theo cửa hàng

- **Hành vi:** cửa hàng thêm trường riêng cho đơn/đối tác, ẩn hoặc đổi tên trường không bắt buộc của nền tảng; không hạ mức yêu
  cầu, không ẩn trường bắt buộc, không mở trường chỉ nội bộ.
- **Mã chính:** `src/modules/field-platform/use-cases/manage-shop-fields.ts`, sàn `src/modules/field-platform/domain/shop-field-floor.ts`,
  `api/field-config/route.ts`, `api/field-config/settings/route.ts`, giao diện `src/components/organization/shop-fields-settings-tab.tsx`.
- **Dữ liệu:** `field_definitions.owner_organization_id`, `field_config_overrides`.
- **Quyền:** `D18` (trần cứng Điều hành). Console nền tảng quản trường hệ thống bằng `N12`.
- **Test:** `tt/field-config-tenant.test.ts`, `tp/field-registry.test.ts`.

### 1.10 Quản lý và thêm thành viên

- **Hành vi:** Điều hành tạo tài khoản nhân viên: họ tên, email đăng nhập, vai, chi nhánh, số điện thoại; hệ thống sinh mật khẩu
  tạm hiện một lần; ghi nhật ký.
- **Mã chính:** `org/use-cases/staff-accounts.ts`, màn `src/app/(app)/cai-dat/thanh-vien/` (`_components/add-staff-dialog.tsx`,
  `temporary-password-notice.tsx`, `member-account-actions.tsx`).
- **Test:** `tt/staff-accounts.test.ts`.
- **Điều hướng:** mục menu "Đội ngũ & phân quyền" (`src/components/layout/nav/nav-store-entries.ts`, `nav-chain.ts`, `F1`).
- **Giới hạn hiện tại:** luồng mời qua email (`org/use-cases/invite-member.ts`) chưa có bước nhận lời mời.

### 1.11 Đổi vai / gỡ thành viên và thu hồi quyền ngay

- **Hành vi:** đổi vai, đổi chi nhánh, gỡ khỏi tổ chức; quyền tính lại ở request kế tiếp. Không tự đổi vai của mình.
- **Mã chính:** `api/members/[id]/route.ts` (`F4`), `org/use-cases/change-member-role.ts`, giao diện `_components/change-role-dialog.tsx`.
- **Test:** `tu/organization/remove-member.test.ts`, `tt/member-role-change.test.ts`.

### 1.12 Vai trò mặc định

- **Hành vi:** vai hệ thống dùng chung mọi tổ chức (`roles.organization_id = null`): Điều hành, Điều phối, Sale, Thợ chế tác,
  Shipper, Kế toán và các vai mở rộng (Quản lý sản phẩm, Marketing, Chăm sóc khách hàng, Cửa hàng nhận gia công). Mỗi vai có trang
  chủ riêng.
- **Mã chính:** `org/domain/system-roles.ts`, quyền mặc định `src/core/rbac/capability-catalog.ts`, trang chủ theo vai
  `org/domain/role-ux-operations.ts`, `src/components/dashboard/florist-queue-home.tsx`, `shipper-runs-home.tsx`,
  `accounting-workspace.tsx`.
- **Test:** `src/core/rbac/capability-catalog.test.ts`, `org/domain/role-ux-catalog.test.ts`, `tt/system-roles.test.ts`.
- **Khi nâng cấp:** đổi quyền mặc định của vai → sửa `defaultRoles` trong danh mục; `npm run db:seed` nạp mã mới cho vai hệ thống
  (không gỡ mã cũ — gỡ cần migration dữ liệu).

### 1.13 Vai trò tuỳ chỉnh

- **Hành vi:** tạo vai riêng của tổ chức (khởi đầu không có quyền), bật/tắt mã năng lực cho vai; yêu cầu chứa mã vượt trần cứng
  bị từ chối toàn bộ.
- **Mã chính:** `org/use-cases/create-role.ts`, `org/use-cases/update-role-capabilities.ts`, `api/roles/route.ts` (đọc `F1`,
  tạo `F5`), `api/roles/[id]/capabilities/route.ts`; màn `src/app/(app)/cai-dat/thanh-vien/vai-tro/page.tsx`,
  `src/components/organization/custom-roles-manager.tsx`; nhóm và nhãn quyền, lọc mã trần cứng `org/domain/custom-role-editor.ts`.
- **Quyền:** `F5` (trần cứng Điều hành).
- **Test:** `src/core/rbac/permission-resolver.test.ts`, `org/domain/custom-role-editor.test.ts`, `tt/greeting-card-transfer-confirm.test.ts`.
- **Lưu ý:** màn `/vai-tro` là danh mục vai trải nghiệm (xem trước theo tầng), không phải nơi sửa quyền. Chưa có API xoá vai tự tạo.

### 1.14 Giao diện và menu theo quyền

- **Hành vi:** mỗi mục menu mang mã năng lực, ẩn khi thiếu quyền.
- **Mã chính:** `src/components/layout/nav/` (`nav-store-entries.ts`, `nav-chain.ts`, `nav-mother.ts`), `useSession().can()`.
- **Test:** `src/components/layout/nav-model.test.ts`, `nav-matrix.test.ts`.
- **Lưu ý:** một số tuyến bị khoá "Sắp ra mắt" trên production theo quyết định PO, độc lập với quyền — `src/lib/feature-lock.ts`
  (`LOCKED_ROUTE_PREFIXES`, bật khi `NEXT_PUBLIC_APP_ENV=production`). Mở một tuyến = xoá khỏi danh sách đó (cần PO duyệt).

### 1.15 Chặn thao tác vượt quyền và ghi log vi phạm

- **Hành vi:** thiếu mã → 403 `CAPABILITY_DENIED`; ghi `security.access_denied` (người, đường dẫn, mã, IP, thiết bị), tối đa một
  dòng/phút/đường dẫn.
- **Mã chính:** `src/core/rbac/capabilities.ts`, `src/core/http/request-audit.ts`, gắn ở `src/core/http/response.ts`.
- **Test:** `tt/audit-trail.test.ts`.

### 1.16 Khoá cứng quyền nhạy cảm ở máy chủ

- **Hành vi:** `C10`, `R6`, `R10`, `R11` chỉ Điều hành. Sale/Điều phối ghi khoản thu thì khoản ở trạng thái chờ, Điều hành xác
  nhận. Thẻ Chào mặc định chỉ Điều hành xác nhận tiền.
- **Mã chính:** `src/core/rbac/capability-catalog.ts`, `src/modules/coordinator/use-cases/record-payment.ts`,
  `decide-pending-payment.ts`, `api/coordinator/orders/[id]/payments/[paymentId]/decision`, `gc/domain/brochure-payment-policy.ts`,
  `gc/domain/brochure-workflow-policy.ts`.
- **Dữ liệu:** `order_payments.status`.
- **Test:** `tt/payment-confirmation.test.ts`, `tt/greeting-card-transfer-confirm.test.ts`.

### 1.17 Nhật ký thao tác có IP và thiết bị

- **Hành vi:** mọi thao tác ghi thành công tạo dòng `api.mutation`; IP/thiết bị tự điền từ ngữ cảnh request; lọc theo loại thao
  tác, đối tượng, người, khoảng ngày.
- **Mã chính:** `src/core/http/request-audit.ts`, `src/core/observability/request-context.ts`,
  `src/modules/audit/infra/audit-log-repository.ts`, `api/audit-logs/route.ts`, màn `src/app/(app)/audit/page.tsx`.
- **Test:** `tt/audit-trail.test.ts`.
- **Lưu ý:** mục menu "Nhật ký thao tác" (`G9`); `/audit` nằm trong danh sách khoá production (`src/lib/feature-lock.ts`).

### 1.18 Gắn dữ liệu với tổ chức ở tầng CSDL (RLS)

- **Hành vi:** chính sách `tenant_isolation` trên mọi bảng có `organization_id`; ba chế độ `off`/`audit`/`enforce`.
- **Mã chính:** xem [02 §2](02-cach-ly-du-lieu-va-phan-quyen.md#2-row-level-security-checklist-118-adr-013).
- **Test:** `tt/rls.test.ts`, `tests/unit/architecture/rls-policies.test.ts`, `workers/tests/test_shared_rls.py`.
- **Khi nâng cấp:** bảng mới có `organization_id` phải kèm chính sách trong migration của nó (`scripts/gen-rls-policies.mjs`).

### 1.19 Chặn truy cập chéo bằng 404

- **Hành vi:** bản ghi ngoài tổ chức (hoặc ngoài chi nhánh) trả 404, không 403.
- **Mã chính:** `notFound()` ở `src/core/http/errors.ts`; `inBranchScope` ở `src/core/tenancy/branch-scope.ts`.
- **Test:** khẳng định 404 trong hầu hết tệp `tests/tenant/`.
