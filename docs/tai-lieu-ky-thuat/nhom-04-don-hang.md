# Nhóm 4 — Đơn hàng (32 chức năng)

Hai nguồn đơn dùng chung bảng `orders`:

- **Đơn nguồn khác** (tạo tay, điều phối, báo giá, catalog): `src/modules/orders/`, `src/modules/coordinator/`; màn `/don-hang`
  (khu làm việc theo vai `src/components/orders/workspace/`), `/dieu-phoi` (khoá production).
- **Đơn Thẻ Chào** (khách tự đặt qua link): `gc/` (`place-brochure-order.ts`, `update-brochure-order-status.ts`…); màn `/the-chao`
  (tab Điều hành, Điều phối, Theo dõi đơn).

Ba trục trạng thái độc lập trên `orders`: xử lý (`status`), sản xuất (`production_status`), giao (`delivery_status`); mọi chuyển trạng
thái ghi `order_events` (trục, từ, đến, người, thời điểm). Thanh toán ở `order_payments` (`status` chờ/đã xác nhận).

---

### 4.1 Tạo đơn bán lẻ / chuỗi

- **Mã chính:** `src/modules/coordinator/adapters/http-schemas.ts` (địa chỉ 4 tầng bắt buộc), `src/components/orders/create-order-modal.tsx`,
  `api/coordinator/orders/route.ts`, `api/orders/route.ts`.
- **Test:** `tt/coordinator.test.ts`.

### 4.2 Tự tạo đơn từ form khách (Thẻ Chào / link)

- **Hành vi:** khách đặt trên link → đơn mới gắn Sale theo phiên link; cửa hàng quá hạn thuê bao thì ngừng nhận đơn công khai.
- **Mã chính:** `api/public/brochure/[sendCode]/order`, `api/public/greeting-catalog/[id]/order`, `gc/use-cases/place-brochure-order.ts`,
  `src/modules/orders/use-cases/place-public-catalog-order.ts`, `src/modules/subscription/use-cases/public-order-guard.ts`.
- **Test:** `tt/greeting-card-checkout.test.ts`, `tt/public-catalog-order.test.ts`, `tt/greeting-card-session-owner.test.ts`,
  `tt/public-order-subscription.test.ts`.

### 4.3 Danh sách, chi tiết, lọc nâng cao

- **Hành vi:** lọc theo trạng thái, thanh toán, từ khoá, khoảng ngày giao, chi nhánh, Sale; điều kiện dùng chung cho hai nguồn đơn.
- **Mã chính:** `api/greeting-card/orders/route.ts`, `api/orders/route.ts`, `src/modules/orders/domain/order-list-filter.ts`,
  `src/modules/orders/infra/order-list-where.ts`, `src/components/orders/order-advanced-filters.tsx`.
- **Test:** `tt/order-filters.test.ts`.

### 4.4 Ba trục trạng thái độc lập

- **Dữ liệu:** `orders.status`, `production_status`, `delivery_status`; `order_events`.
- **Test:** `tt/coordinator.test.ts`, `tt/order-isolation.test.ts`.
- **Khi nâng cấp:** thêm giá trị trạng thái → cập nhật enum/CHECK và `tests/unit/architecture/status-check-constraints.test.ts`.

### 4.5 Khung giờ giao, sức chứa, màn Shipper

- **Hành vi:** địa chỉ 4 tầng bắt buộc; sức chứa theo khung giờ; Shipper thấy "Đơn cần giao" (người nhận, SĐT, địa chỉ, khung giờ, lời
  thiệp) — gắn theo số điện thoại Điều phối ghi khi điều xe; báo giao xong cần ảnh, báo giao không được cần lý do.
- **Mã chính:** `gc/domain/slot-capacity.ts`, `src/modules/coordinator/use-cases/shipper-runs.ts`, `api/delivery/my-runs`,
  `src/modules/coordinator/domain/shipper-match.ts`, `api/members/[id]/phone`, `src/modules/coordinator/use-cases/record-delivery-update.ts`,
  `src/components/dashboard/shipper-runs-home.tsx`.
- **Test:** `tt/shipper-view.test.ts`, `tt/greeting-card-promotion-slot.test.ts`.
- **Giới hạn hiện tại:** shipper thuê ngoài (không có tài khoản) chỉ được ghi tên + SĐT, chưa có link giao riêng.

### 4.6 Đổi thông tin đơn có lưu vết

- **Dữ liệu:** `order_change_requests` (giá trị cũ/mới, lý do, người, thời điểm).
- **Mã chính:** `gc/use-cases/order-change.ts`.
- **Test:** `tt/greeting-card-order-change.test.ts`.

### 4.7 Huỷ đơn và hoàn tiền, duyệt 2 bước

- **Hành vi:** yêu cầu huỷ → Điều hành duyệt (`R6`); hoàn tiền (`R10`) — đều trần cứng Điều hành; không tự duyệt.
- **Mã chính:** `api/greeting-card/orders/[id]/cancel`, `api/greeting-card/orders/[id]/refund`, `gc/infra/cancellation-repository.ts`,
  `gc/infra/cancellation-follow-up-repository.ts`, `src/components/greeting-card/admin/pending-cancellation-panel.tsx`.
- **Test:** `tt/greeting-card-cancellation.test.ts`, `tt/greeting-card-cancellation-follow-up.test.ts`, `tt/coordinator.test.ts`.

### 4.8 Lịch sử thao tác đơn

- **Mã chính:** tab "Lịch sử đơn hàng" `src/components/greeting-card/brochure-order-detail-modal.tsx`, sơ đồ bằng chứng có nút sao chép
  `src/components/greeting-card/evidence-timeline-diagram.tsx`.
- **Test:** `tt/order-isolation.test.ts`.

### 4.9 In phiếu xưởng A6 và băng rôn

- **Hành vi:** trang in ngoài khung ứng dụng: phiếu A6 (ảnh mẫu, phiên bản, số cành, công thức có ô đánh dấu, lời thiệp), băng rôn A4 ngang.
- **Mã chính:** `src/app/in-phieu/[id]/page.tsx`, `src/components/orders/print/florist-ticket-a6.tsx`, `ribbon-banner-print.tsx`,
  `api/orders/[id]/print` (`R7`), `src/modules/orders/use-cases/get-order-printout.ts`.
- **Test:** `tt/print-ticket.test.ts`.

### 4.10 Xuất danh sách đơn Excel

- **Hành vi:** tệp .xlsx 4 sheet (Đơn hàng, Chi tiết SP, Sổ thu tiền, Thẻ Chào), theo phạm vi Sale/chi nhánh, ghi nhật ký xuất.
- **Mã chính:** `api/orders/export/route.ts` (`R13`), `src/modules/orders/use-cases/export-orders.ts`, `src/modules/orders/infra/order-export-query.ts`.
- **Test:** `src/modules/orders/use-cases/export-orders.test.ts`, `tt/order-export-scope.test.ts`, `tests/unit/architecture/export-audit.test.ts`.

### 4.11 Lịch sử đơn của cùng khách

- **Hành vi:** tab "Đơn đã đặt" trong chi tiết khách: đơn gắn khách và đơn chưa gắn nhưng cùng SĐT người đặt, trong phạm vi chi nhánh.
- **Mã chính:** `src/components/crm/customer-orders-tab.tsx`, `api/crm/customers/[id]/orders` (`Q1` + `R1`), `src/modules/orders/use-cases/list-customer-orders.ts`.
- **Test:** `tt/customer-orders.test.ts`.
- **Lưu ý:** `/khach-hang` thuộc danh sách khoá production.

### 4.12 Bảng điều phối, 4 mức rủi ro trễ

- **Mã chính:** `src/modules/coordinator/domain/coordinator-types.ts`, `operation-rules.ts`, `src/components/coordinator/control-tower-dashboard.tsx`.
- **Test:** `tests/unit/coordinator/operation-rules.test.ts`, `tt/greeting-card-coordinator-board.test.ts`.
- **Lưu ý:** `/dieu-phoi` thuộc danh sách khoá production.

### 4.13 Phân công thợ và hàng đợi chế tác

- **Hành vi:** phân công cho thành viên đang hoạt động, giao lại thu hồi phân công cũ; "Việc của tôi" sắp theo giờ giao, có công thức
  và ảnh mẫu, không có giá; nhận việc / báo xong.
- **Mã chính:** `src/modules/orders/use-cases/assign-florist.ts`, `florist-queue.ts`, `src/modules/orders/infra/florist-queue-repository.ts`,
  `api/orders/[id]/my-work`, `api/orders/my-work?scope=team` (`R4`), `src/components/dashboard/florist-queue-home.tsx`.
- **Test:** `tt/florist-queue.test.ts`.
- **Giới hạn hiện tại:** đơn Thẻ Chào giao thợ bằng ghi chú (`gc/use-cases/update-brochure-order-status.ts`, `assignBrochureFlorist`),
  chưa vào hàng đợi tài khoản thợ.

### 4.14 Theo dõi đơn thiếu thông tin

- **Hành vi:** dò trường thiếu (địa chỉ, SĐT người nhận, lời chúc khi có thiệp); tự sinh / tự đóng yêu cầu, quá hạn thì nhắc; yêu cầu tay.
- **Mã chính:** `src/modules/orders/domain/order-info-gaps.ts`, `src/modules/orders/use-cases/order-info-requests.ts`,
  `api/orders/[id]/info-requests`, `gc/use-cases/missing-info-actions.ts`, `src/components/orders/order-info-requests.tsx`.
- **Dữ liệu:** `order_info_requests`.
- **Test:** `tt/order-info-requests.test.ts`.

### 4.15 Kiểm tra chất lượng (QC)

- **Mã chính:** `api/coordinator/orders/[id]/qc`.
- **Test:** `tt/coordinator.test.ts`, `tt/subcontract-customer-photo.test.ts`.

### 4.16 AI chấm ảnh QC so với mẫu

- **Hành vi:** gọi AI qua gateway, trả điểm tin cậy và kết luận; lỗi AI chuyển duyệt tay.
- **Mã chính:** `gc/use-cases/verify-qc-photo-ai.ts`.
- **Test:** `gc/use-cases/verify-qc-photo-ai.test.ts`.

### 4.17 Bàn giao shipper, lịch giao lại

- **Mã chính:** trục `delivery_status`; việc giao lại trong Hộp việc `gc/domain/inbox.ts`.
- **Test:** `tt/greeting-card-delivery-failure.test.ts`.

### 4.18 Ảnh giao tận tay (POD) bắt buộc

- **Hành vi:** bắt buộc ở mọi gói, Điều hành tắt được trong cài đặt quy trình; ảnh hiện cho khách trên trang theo dõi.
- **Mã chính:** `gc/domain/brochure-workflow-policy.ts`, `src/modules/coordinator/domain/operation-rules.ts`,
  `record-delivery-update.ts`, `api/coordinator/orders/[id]/confirm-delivery/route.ts`,
  `src/components/greeting-card/customer/brochure-tracking-view.tsx`.
- **Test:** `tt/greeting-card-coordinator-rules.test.ts`, `tests/unit/coordinator/operation-rules.test.ts`.

### 4.19 Bảng đối tác ngoài, đếm ngược

- **Hành vi:** đối tác gia công nhận đơn qua link công khai, tải ảnh QC, báo shipper, báo giao; khoá giành đơn chống tranh chấp.
- **Mã chính:** `src/app/subcontract/[orderCode]/page.tsx`, `api/public/subcontract/[orderCode]/{upload-qc,submit-shipper,submit-delivery}`.
- **Test:** `tt/subcontract-public-link.test.ts`, `tt/subcontract-claim-race.test.ts`, `tt/subcontract-state-integrity.test.ts`.

### 4.20 Cổng chi nhánh cách ly đơn

- **Hành vi:** tài khoản chi nhánh (`R14`) chỉ thấy đơn gia công giao cho mình; màn `/cua-hang`.
- **Test:** `tt/branch-portal.test.ts`.

### 4.21 Sức chứa tối đa theo khung giờ / ngày lễ

- **Mã chính:** `gc/domain/slot-capacity.ts`; cài đặt `src/components/greeting-card/admin/brochure-holiday-settings.tsx`,
  `brochure-shipping-settings.tsx` (tab Thẻ Chào & quy trình).
- **Test:** `tt/greeting-card-promotion-slot.test.ts`, `tt/greeting-card-holiday.test.ts`.

### 4.22 Kế hoạch cọc / còn lại

- **Hành vi:** % cọc mặc định, chính sách theo ngày giao, mã thanh toán có ngưỡng giá trị đơn.
- **Mã chính:** `gc/domain/payment-plan.ts`; cài đặt `src/components/profiles/payment-policy-section.tsx`, `deposit-levels-section.tsx`.
- **Test:** `tt/greeting-card-payment-codes.test.ts`, `gc/domain/__tests__/payment-plan.test.ts`, `payment-schedule.test.ts`.
- **Giới hạn hiện tại:** đơn lớn áp chính sách qua mã thanh toán, không tự động theo giá trị.

### 4.23 Mã VietQR động

- **Mã chính:** `gc/adapters/vietqr-helper.ts` (số tiền + mã đơn).
- **Test:** `tt/greeting-card-payments.test.ts`.

### 4.24 Ảnh biên lai chuyển khoản, AI gợi ý

- **Mã chính:** `api/public/brochure/[sendCode]/payment-proof`, `gc/use-cases/process-payment-proof-job.ts`.
- **Test:** `gc/use-cases/__tests__/process-payment-proof-job.test.ts`, `confirm-brochure-payment.test.ts`, `reject-reported-payment.test.ts`.

### 4.25 Xác nhận tiền về, mở đơn chế tác

- **Mã chính:** `api/greeting-card/orders/[id]/confirm-deposit` (`R11`, trần cứng Điều hành).
- **Test:** `tt/greeting-card-transfer-confirm.test.ts`, `tt/greeting-card-payments.test.ts`.

### 4.26 Thu phần còn lại

- **Hành vi:** giao xong còn nợ → chờ thu đủ; chỉ hoàn tất khi thu đủ; đóng đơn điều phối còn nợ bị chặn. Giao trước thu sau cần duyệt
  (`R16`), có hạn mức Sale tự quyết.
- **Mã chính:** `api/greeting-card/orders/[id]/confirm-balance`, `gc/domain/order-settlement.ts`, `gc/infra/order-settlement.ts`,
  `src/components/orders/workspace/deliver-before-pay-settings-panel.tsx`.
- **Test:** `tt/greeting-card-coordinator-rules.test.ts`, `tt/coordinator.test.ts`.

### 4.27 Ghi hoàn tiền khi huỷ

- **Quyền:** `R10` (trần cứng Điều hành).
- **Test:** `tt/greeting-card-cancellation.test.ts`, `tt/coordinator.test.ts`.

### 4.28 Đối soát tự động với ngân hàng

- **Hành vi:** webhook SePay nhận giao dịch, khớp mã đơn trong nội dung chuyển khoản; giao dịch chưa khớp hiện cho Kế toán.
- **Mã chính:** `api/public/payments/sepay/route.ts`, `gc/use-cases/payment-webhook.ts`; cấu hình
  `src/components/greeting-card/admin/brochure-bank-sync-settings.tsx` (màn Tích hợp).
- **Test:** `tt/greeting-card-bank-sync.test.ts`, `tt/order-standard-payments.test.ts`.

### 4.29 Trang theo dõi của khách tự cập nhật

- **Mã chính:** `src/components/greeting-card/customer/brochure-tracking-view.tsx` (làm mới 15 giây).
- **Test:** `tt/greeting-card-tracking-views.test.ts`.

### 4.30 Kênh báo tin cho nhân viên

- **Mã chính:** `gc/use-cases/notify-staff.ts`, `gc/domain/staff-notification-types.ts`, `gc/use-cases/background-sweep.ts`;
  cài đặt `src/components/greeting-card/admin/staff-notify-settings.tsx`, `telegram-dispatch-connector.tsx`.
- **Test:** `gc/use-cases/__tests__/notify-staff.test.ts`, `tt/telegram-linked-chats.test.ts`.

### 4.31 Gửi Zalo ZNS / SMS cho khách

- **Hành vi:** gửi theo sự kiện đơn; mỗi tin trừ credit; hết credit vẫn gửi trong mức thấu chi, quá mức thì bỏ tin và báo Điều hành.
- **Mã chính:** `gc/adapters/zalo-zns-adapter.ts`, `gc/adapters/esms-adapter.ts`, `gc/domain/customer-notifications.ts`,
  `gc/use-cases/notify-customer.ts`, `src/modules/usage/domain/message-overdraft.ts`.
- **Test:** `tt/greeting-card-notifications.test.ts`.

### 4.32 Nhắc lịch giao trước giờ hẹn

- **Hành vi:** mặc định nhắc trước 120 và 60 phút; chỉnh được (ví dụ 60 và 30 phút) bằng `R12`.
- **Mã chính:** `src/modules/coordinator/domain/dispatch-reminder-types.ts`, `gc/use-cases/process-dispatch-reminders.ts`.
- **Test:** `src/modules/coordinator/domain/__tests__/dispatch-reminder.test.ts`, `gc/use-cases/__tests__/process-dispatch-reminders.test.ts`,
  `tt/coordinator-reminders-isolation.test.ts`.
