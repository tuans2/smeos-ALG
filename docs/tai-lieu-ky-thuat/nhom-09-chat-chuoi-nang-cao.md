# Nhóm 9 — Chat nội bộ, chuỗi & phân quyền nâng cao (14 chức năng)

---

### 9.1 Trao đổi nội bộ trên từng đơn

- **Hành vi:** khung trao đổi gắn đơn Thẻ Chào (tin, đánh dấu đã đọc, xin giảm giá); chat nội bộ của tổ chức và giữa chuỗi–đối tác
  (`/tin-nhan`). Khung trao đổi của đơn không có API xoá tin. Chat nội bộ: người gửi sửa / thu hồi tin chữ, tin ảnh của chính mình trong
  24 giờ (`PATCH`/`DELETE /api/v1/internal-chat/messages/:id`, PO 09/11/2026); thẻ đơn gia công và tin hệ thống không sửa, không thu hồi.
- **Mã chính:** `api/greeting-card/messages` (+ `/read`), `src/components/greeting-card/inbox/message-thread.tsx`, `message-composer.tsx`,
  `api/internal-chat`, `src/app/(app)/tin-nhan/page.tsx`, `src/modules/internal-chat/domain/message-change-policy.ts`,
  `src/components/internal-chat/message-actions.tsx`.
- **Dữ liệu:** tin nhắn đơn (`last_read_at`), `internal_chat_messages`.
- **Test:** `tt/greeting-card-messages.test.ts`, `tt/internal-chat-isolation.test.ts`, `tt/internal-chat-edit-delete.test.ts`.
- **Lưu ý:** `/tin-nhan` thuộc danh sách khoá production; khung trao đổi trong đơn Thẻ Chào vẫn dùng được.

### 9.2 Hồ sơ thương hiệu

- **Hành vi:** logo, màu, giọng văn; AI đọc khi viết nội dung.
- **Mã chính:** `api/brand-profile/route.ts`, `src/components/profiles/brand-profile-form.tsx`,
  `src/modules/product-copies/adapters/product-copy-adapter.ts`, `src/modules/content-engine/infra/read-shop-context.ts`.
- **Test:** `tt/cach-ly-endpoint.test.ts`.

### 9.3 Hồ sơ kinh doanh

- **Hành vi:** tên pháp lý, SĐT, địa chỉ, mô tả, thông điệp thương hiệu, khách mục tiêu; đưa vào ngữ cảnh AI.
- **Mã chính:** `api/business-profile/route.ts` (`F1`/`F2`), `src/components/profiles/business-profile-form.tsx`, `brand-audience-fields.tsx`,
  `src/modules/content-engine/domain/brief-builder.ts`.
- **Dữ liệu:** `business_profiles` (migration `20261105230000_business_profile_brand_audience`).
- **Test:** `tt/cach-ly-endpoint.test.ts`, `tests/unit/content-engine/brief-brand-audience.test.ts`.

### 9.4 Thư viện tài nguyên, thùng rác 30 ngày

- **Hành vi:** xoá → vào thùng rác 30 ngày; khôi phục hoặc xoá hẳn; giữ dữ liệu theo yêu cầu pháp lý chặn xoá.
- **Mã chính:** `src/modules/storage/domain/trash-types.ts`, `api/storage/trash/[id]/restore`, `src/components/storage/storage-trash-tab.tsx`
  (màn `/kho-du-lieu`).
- **Test:** `tt/storage-trash.test.ts`, `tt/storage-lifecycle.test.ts`.

### 9.5 Webhook / khoá API tích hợp

- **Hành vi:** cấp, xoay vòng, thu hồi khoá tích hợp theo tổ chức.
- **Mã chính:** `api/integration-tokens` (+ `[id]/rotate`), `src/components/integrations/api-tokens-panel.tsx`, màn `/tich-hop`.
- **Quyền:** `F9` (trần cứng Điều hành).
- **Test:** `tt/integration.test.ts`, `src/modules/integration/use-cases/__tests__/integration-use-cases.test.ts`.

### 9.6 Tác vụ nền, chạy lại tác vụ lỗi

- **Mã chính:** `api/jobs/[id]/{cancel,retry,events}`, `src/modules/jobs/use-cases/scan-stuck-jobs.ts`; hàng đợi lỗi Console (`N15`).
- **Test:** `tt/job-retry-backoff.test.ts`, `tp/dead-letter-jobs.test.ts`.
- **Lưu ý:** `/job` thuộc danh sách khoá production.

### 9.7 Chính sách AI và trần chi phí tháng

- **Hành vi:** mô hình được phép, trần chi phí mỗi lượt, sàn riêng tư; lọc nội dung; trần credit AI theo tháng do Điều hành đặt, chặn
  mọi lượt AI tính phí khi trừ credit.
- **Mã chính:** bảng chính sách AI theo tổ chức (`allowed_models`, `cost_ceiling`, `privacy_floor`), `api/content-guard/validate`,
  `api/usage/limits/route.ts` (`U2`), `src/modules/usage/use-cases/monthly-limits.ts`, `src/modules/usage/infra/usage-limit-repository.ts`.
- **Test:** `tt/ai-policy.test.ts`, `tt/usage-limits.test.ts`.
- **Khi nâng cấp:** sàn riêng tư AI và bộ lọc giấy phép mô hình là vùng cần PO duyệt trước khi nới.

### 9.8 Console quản trị đa cửa hàng

- **Hành vi:** tổng quan: số cửa hàng theo trạng thái thuê bao, doanh thu thuê bao đã thu 6 tháng, sức khoẻ hệ thống khi có `N5`; danh
  sách và chi tiết tổ chức.
- **Mã chính:** `src/app/(platform)/van-hanh/to-chuc`, `suc-khoe`, `api/platform/overview/route.ts`,
  `src/modules/platform/use-cases/platform-overview.ts`, `src/components/platform/subscription-overview-card.tsx`.
- **Test:** `tp/subscriptions.test.ts`.

### 9.9 Thẩm định và duyệt đăng ký mới

- **Mã chính:** `org/use-cases/sign-up.ts`, `api/platform/registrations/[userId]/decision` (`N13`), màn `/van-hanh/dang-ky`.
- **Test:** `tp/registration-approval.test.ts`, `tt/registration-approval.test.ts`.

### 9.10 Khởi tạo tổ chức và gói dịch vụ

- **Hành vi:** Console tạo cửa hàng theo ngành, workspace vận hành, chủ tiệm vai Điều hành với mật khẩu tạm (buộc đổi lần đầu), gói thuê
  bao; nhật ký nền tảng không chứa mật khẩu.
- **Mã chính:** `api/platform/organizations/route.ts` (POST, `N7`; gán gói thêm `N19`), `src/modules/platform/use-cases/create-organization.ts`,
  `src/components/platform/create-organization-card.tsx`.
- **Test:** `tp/subscriptions.test.ts`.

### 9.11 Duyệt 2 bước cho thao tác nhạy cảm

- **Hành vi:** phiếu duyệt cho đổi thông tin/giá mẫu (2.7), huỷ đơn (4.7), giảm giá (3.7), giao trước thu sau (4.26); giá dưới sàn chỉ
  hiệu lực khi Điều hành duyệt/lập; ghi thu chờ xác nhận (1.16).
- **Mã chính:** `src/modules/costing/use-cases/price-floor-guard.ts`, `src/components/orders/workspace/approval-requests-list.tsx`.
- **Test:** `tt/below-floor.test.ts`, `tt/payment-confirmation.test.ts`, `tt/product-governance.test.ts`.

### 9.12 Chặn tự nâng quyền / tự duyệt

- **Mã chính:** `org/domain/self-approval-policy.ts`, `org/use-cases/assert-not-self-approval.ts`, `org/use-cases/staff-accounts.ts`.
- **Test:** `tt/self-approval.test.ts`, `tt/member-role-change.test.ts`.

### 9.13 Cách ly dữ liệu theo chi nhánh

- **Hành vi:** nhân viên gắn chi nhánh, không có `F7` → chỉ thấy dữ liệu chi nhánh đó (đơn đa nguồn, bảng việc, hàng đợi điều phối, xuất
  Excel, Thẻ Chào, sản phẩm, tồn kho); đơn mới mang chi nhánh người tạo; đơn Thẻ Chào mang chi nhánh Sale.
- **Mã chính:** `src/core/tenancy/branch-scope.ts`, `gc/infra/sale-branch.ts`.
- **Test:** `tt/branch-scope.test.ts`, `tt/branch-portal.test.ts`.

### 9.14 Đăng nhập một lần (SSO 15 phút)

- **Hành vi:** đăng bài chạy ngay trong smeOS (D-46): Công cụ → Tạo nội dung → Đăng tự động dùng phiên smeOS, không cần đăng nhập
  lại (quyền `J5`). JWT liên-app 15 phút (`POST /api/v1/sso/refresh`) dành cho ứng dụng ngoài dùng chung đăng nhập; chỉ kiểm bằng test.
- **Mã chính:** `src/components/content-studio/auto-publish-step.tsx`, `src/app/api/v1/social-publishing/`, `src/modules/sso/domain/sso-claims.ts`, `src/modules/sso/`.
- **Test:** `tt/integration-sso.test.ts`.
