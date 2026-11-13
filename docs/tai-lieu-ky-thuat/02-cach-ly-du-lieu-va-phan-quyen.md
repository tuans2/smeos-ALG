# 02 — Cách ly dữ liệu và phân quyền

ALG là SaaS nhiều tổ chức trên một CSDL. Mọi bảng thuộc tổ chức có cột `organization_id` và chỉ mục
`@@index([organization_id])`. Cách ly được giữ ở bốn lớp: phiên, repository, Row Level Security, test.

## 1. Ngữ cảnh tổ chức

- `organization_id` **chỉ** lấy từ `requireTenantContext(request)` (`org/use-cases/resolve-session.ts`), tức từ bản ghi phiên
  phía máy chủ. Không bao giờ đọc từ body, query hay header.
- `TenantContext` (`src/core/tenancy/tenant-context.ts`) mang `organizationId`, `userId`, vai, tập mã năng lực, `branchId`.
- Repository nhận `ctx` hoặc `organizationId` và lọc theo đó; ghi thì gán `organization_id` từ ngữ cảnh.
- Bản ghi của tổ chức khác **trả 404, không bao giờ 403** (`notFound()` ở `src/core/http/errors.ts`), để không lộ sự tồn tại
  của dữ liệu. Cập nhật/xoá dùng điều kiện `{ id, organization_id }` (`updateMany`/`deleteMany`) rồi kiểm `count`.
- Trang công khai (Thẻ Chào, catalog, báo giá, theo dõi đơn) suy ra tổ chức từ mã trong đường dẫn, không nhận tổ chức từ trình
  duyệt, và chỉ trả trường dành cho khách (không giá vốn, không ghi chú nội bộ).

## 2. Row Level Security (checklist 1.18, ADR-013)

| Thành phần | Tệp |
|---|---|
| Chính sách `tenant_isolation` + `FORCE ROW LEVEL SECURITY` trên mọi bảng có `organization_id` | migration `20261106020000_row_level_security`; bảng mới thêm chính sách trong migration của chính bảng đó (ví dụ `20261106040000_custom_domains`) |
| Sinh SQL chính sách từ sổ bảng thuộc tổ chức | `scripts/gen-rls-policies.mjs`, sổ `src/core/tenancy/generated/tenant-table-registry.ts` (`npm run gen:tenant-registry`) |
| Ngữ cảnh CSDL theo luồng (AsyncLocalStorage) | `src/core/tenancy/db-context.ts` — `runWithDbContext`, `bindTenantDb`, `withTenantDb`, `asSystemDb` |
| Pool đặt biến phiên mỗi lần lấy kết nối | `src/core/tenancy/infra/rls-pool.ts` — `app.org_id`, `app.rls_system`, `app.rls_mode` |
| Worker | `workers/shared/rls.py` — nhận job bằng quyền hệ thống, xử lý trong tổ chức của dòng job |
| Vai CSDL | `scripts/db/create-roles.sql` — `alg_app`, `alg_worker`, `alg_system` (bỏ qua RLS), `alg_readonly` (luôn chặn) |

Chế độ đặt bằng `DB_RLS_MODE`: `off` (không đặt ngữ cảnh), `audit` (đặt ngữ cảnh, ghi log `db.rls.unscoped_query` khi truy vấn
chưa gắn tổ chức chạm bảng thuộc tổ chức), `enforce` (CSDL trả 0 dòng / từ chối ghi sai tổ chức). Production đang ở `audit`; điều
kiện và cách chuyển sang `enforce` ở `docs/handover/OPERATIONS_RUNBOOK.md` §12.

Quyền hệ thống (`asSystemDb`) dùng cho: tra phiên, trang công khai tra theo mã, Console, webhook, bộ quét nền, định tuyến tên miền
riêng. Mỗi chỗ dùng quyền hệ thống phải tự lọc đúng tổ chức trong truy vấn.

**Lưu ý khi viết mã:** `PrismaPromise` chỉ chạy khi được `await`; phải `await` bên trong hàm truyền cho `withTenantDb`/`asSystemDb`,
nếu không truy vấn chạy ngoài ngữ cảnh.

## 3. Phân quyền theo mã năng lực

- Kiểm quyền bằng mã năng lực: `requireCapability(ctx, "R1")` (`src/core/rbac/capabilities.ts`). Không kiểm theo tên vai hay
  `roleKey` trên giao diện.
- Danh mục mã: `src/core/rbac/capability-catalog.ts` (174 mã; mô tả ở `docs/dac-ta/02-function-catalog.md`). Mỗi mã có nhóm,
  nhãn, vai mặc định, và có thể có **trần cứng** (`hardCap`) — danh sách vai hệ thống duy nhất được giữ mã đó.
- Quyền hiệu lực của một vai = ba lớp (`src/core/rbac/permission-resolver.ts`, `org/infra/capability-repository.ts`):
  1. `role_capabilities` — mặc định của vai;
  2. `capability_overrides` — tổ chức bật/tắt thêm cho vai;
  3. trần cứng — cắt sau cùng; vai tự tạo không bao giờ có mã bị trần cứng.
- Quyền tính lại ở mỗi request, nên đổi vai / gỡ thành viên có hiệu lực ngay.
- Thêm mã mới: khai trong `capability-catalog.ts`, cập nhật `capability-catalog.test.ts` (số mã, số mã trần cứng), đặc tả 02 và
  ma trận `docs/kien-truc/as-is/02a-ma-tran-quyen.md`. Vai hệ thống nhận mã mặc định ở lần `npm run db:seed` kế tiếp
  (`ensureSystemRoles` → `seedDefaultsForSystemRole`, chạy trong bước pre-deploy của Render). Tệp danh mục được miễn giới hạn 350
  dòng vì là tệp dữ liệu (`scripts/file-size-baseline.json`).
- Giao diện ẩn/hiện bằng `useSession().can("<mã>")` (`src/lib/session.tsx`); ẩn trên giao diện không thay cho kiểm ở máy chủ.
- Truy cập bị chặn ghi `security.access_denied` (`src/core/http/request-audit.ts`), tối đa một dòng/phút/đường dẫn.

### Mã trần cứng tiêu biểu

| Mã | Ý nghĩa | Vai được giữ |
|---|---|---|
| `C10` | Đặt giá dưới sàn | Điều hành |
| `R6` | Huỷ đơn | Điều hành |
| `R10` | Hoàn tiền | Điều hành |
| `R11` | Xác nhận tiền về | Điều hành |
| `F5` | Tạo/sửa vai | Điều hành |
| `F7` | Quản lý mọi chi nhánh | Điều hành |
| `F9` | Token tích hợp | Điều hành |
| `D18` | Trường dữ liệu riêng của cửa hàng | Điều hành |
| `D19` | Tên miền riêng | Điều hành |

## 4. Vai hệ thống

Khai ở `org/domain/system-roles.ts`: Điều hành (`dieu_hanh`, vai chủ tiệm), Điều phối, Sale, Quản lý sản phẩm, Marketing, Chăm sóc
khách hàng (`crm`, `customer_service`), Cửa hàng nhận gia công (`cua_hang`), Thợ chế tác (`tho_cam`), Shipper, Kế toán
(`ke_toan`), Người dùng trải nghiệm (`experience_user`). Trang chủ theo vai: `org/domain/role-ux-operations.ts`, `src/app/(app)/page.tsx`.

## 5. Phạm vi chi nhánh (checklist 9.13)

`src/core/tenancy/branch-scope.ts`: nhân viên gắn chi nhánh (`memberships.branch_id`) chỉ thấy dữ liệu chi nhánh đó, trừ khi có
`F7`. Dùng `branchScopedWhere(ctx)` trong truy vấn và `inBranchScope(ctx, branchId)` khi đọc một bản ghi; ngoài phạm vi → 404.

## 6. Tự duyệt và thao tác nhạy cảm (checklist 9.11, 9.12)

- Tự duyệt mặc định tắt (`org/domain/self-approval-policy.ts`); chốt chung `org/use-cases/assert-not-self-approval.ts` ở giảm giá,
  huỷ đơn, đề xuất sửa mẫu, giao trước thu sau, xác nhận sổ thu.
- Không tự đổi vai của mình, không thao tác trên tài khoản của mình (`org/use-cases/staff-accounts.ts`).

## 7. Console vận hành nền tảng

- Người vận hành nền tảng (`platform_operators`) tách hẳn khỏi tài khoản cửa hàng. Ngữ cảnh `PlatformContext`
  (`src/core/platform/platform-context.ts`) chỉ có `userId` và tập mã `N…`.
- Danh mục mã nền tảng riêng: `src/core/platform/platform-capability-catalog.ts` (`N1`–`N8`, `N12`–`N20`); kiểm bằng
  `requirePlatformCapability`. Mã nền tảng không bao giờ xuất hiện trong bảng quyền của tổ chức.
- Gán mã cho người vận hành: `npm run gan-van-hanh-nen-tang -- --email=<địa chỉ thư> [--capabilities=N1,N4]`. Mã mới thêm sau
  này cấp cho superadmin hiện có bằng migration dữ liệu (tiền lệ `20261103090000_grant_marketplace_delete_to_superadmin`,
  `20261106040100_grant_custom_domains_to_superadmin`).
- Thao tác Console ghi `platform_audit_logs`.

## 8. Test cách ly

- `tests/tenant/` chạy trên CSDL thật, mỗi test dựng hai tổ chức bằng luồng đăng ký thật (`tests/helpers/fixtures.ts`) và kiểm
  tổ chức B nhận 404 với dữ liệu của A. Context từ fixture có tập quyền rỗng; test tự đặt mã cần thiết.
- `tests/tenant/rls.test.ts` kiểm RLS bằng vai CSDL thường (superuser bỏ qua RLS nên không dùng được).
- `tests/unit/architecture/tenant-table-registry.test.ts`, `rls-policies.test.ts`: bảng mới thiếu `organization_id`, chỉ mục hoặc
  chính sách RLS → đỏ.
