# Nhóm 6 — Báo cáo (9 chức năng)

Báo cáo theo kỳ dựng ở `src/modules/reporting/` (truy vấn tổng hợp phía máy chủ, khoảng ngày + nhóm ngày/tuần/tháng theo giờ Việt
Nam, phạm vi chi nhánh/Sale theo 9.13), API `api/reports/*` (`R20` — Điều hành và Kế toán), màn `src/app/(app)/bao-cao/page.tsx`
(mục menu "Báo cáo theo kỳ"; tuyến thuộc danh sách khoá production `src/lib/feature-lock.ts`). Kỳ thời gian: `src/modules/reporting/domain/report-period.ts`.

---

### 6.1 Đơn hàng, tỷ lệ huỷ / trễ

- **Hành vi:** tổng đơn, hoàn tất, huỷ, giao trễ hẹn (sau giờ hẹn Điều phối, cuối khung giờ, hoặc cuối ngày giao), đang trễ — tính trên
  toàn bộ đơn trong kỳ.
- **Mã chính:** `api/reports/orders/route.ts`, `src/modules/reporting/domain/order-revenue-report.ts`,
  `src/components/reporting/order-revenue-panels.tsx`.
- **Test:** `tt/reports.test.ts`, `tests/unit/reporting/report-rules.test.ts`.

### 6.2 Doanh thu thực thu và dự kiến

- **Hành vi:** dự kiến = đơn chưa huỷ; thực thu = khoản thu đã xác nhận trừ hoàn; bấm một kỳ mở danh sách đơn của kỳ (`?detail=orders`).
- **Mã chính:** `api/reports/revenue/route.ts`, `order-revenue-panels.tsx`.
- **Test:** `tt/reports.test.ts`.

### 6.3 Sản phẩm bán chạy, màu, phong cách

- **Hành vi:** xếp hạng mẫu theo số lượng và giá trị; tỷ trọng màu chủ đạo (`attributes.mainColor`/`color`) và phong cách
  (`style`/`craftStyle`).
- **Mã chính:** `api/reports/products/route.ts`, `src/modules/reporting/domain/product-performance-report.ts`,
  `src/components/reporting/product-performance-panels.tsx`.
- **Test:** `tt/reports.test.ts`.

### 6.4 Phễu chuyển đổi Thẻ Chào theo Sale, kênh, bộ sưu tập

- **Hành vi:** gửi → mở → đặt → thu tiền, kèm doanh thu; 7/30/90 ngày; theo Sale và theo kênh/bộ sưu tập.
- **Mã chính:** `api/greeting-card/stats/route.ts`, `api/greeting-card/stats/channels/route.ts`, `gc/use-cases/get-sales-funnel.ts`,
  `gc/use-cases/catalog-channel-events.ts`; giao diện `src/components/greeting-card/sales/sales-funnel-stats.tsx`,
  `channel-funnel-stats.tsx`, gắn ở Thẻ Chào → Theo dõi đơn → Dashboard (`src/components/greeting-card/tracking/views/dashboard-view.tsx`).
- **Test:** `tt/greeting-card-scope.test.ts`, `gc/domain/__tests__/link-expiry-and-funnel.test.ts`,
  `tests/unit/architecture/ui-mounted.test.ts` (khối phễu phải gắn vào trang).

### 6.5 Hiệu suất Sale / thợ / shipper

- **Hành vi:** doanh số theo Sale; sản lượng theo thợ (phân công đang hiệu lực, xong khi sẵn sàng/đã giao); tỷ lệ giao đúng giờ theo
  shipper (khớp thành viên qua số điện thoại).
- **Mã chính:** `api/reports/performance/route.ts`, `product-performance-panels.tsx`.
- **Test:** `tt/reports.test.ts`.

### 6.6 Đối chiếu thu tiền: sổ thu và ngân hàng

- **Hành vi:** dòng tiền theo hình thức (chuyển khoản/VietQR, tiền mặt, thẻ, ví, thu hộ); theo ngày, sổ thu chuyển khoản so với giao
  dịch ngân hàng nhận qua SePay (khớp, chưa khớp, lệch); danh sách giao dịch chưa khớp.
- **Mã chính:** `api/reports/cashflow/route.ts`, `src/modules/reporting/domain/cashflow-report.ts`, `src/components/reporting/cashflow-panel.tsx`.
- **Test:** `tt/reports.test.ts`.

### 6.7 Truy vết lịch sử đơn khi khiếu nại

- **Mã chính:** `src/components/greeting-card/evidence-timeline-diagram.tsx` (sơ đồ bằng chứng, nút sao chép).
- **Test:** `tt/greeting-card-tracking-views.test.ts`.

### 6.8 Xuất báo cáo tài chính Excel

- **Mã chính:** `src/modules/orders/use-cases/export-orders.ts` (4 sheet), `api/orders/export/route.ts` (`R13`).
- **Test:** `src/modules/orders/use-cases/export-orders.test.ts`, `tests/unit/architecture/export-audit.test.ts`, `export-capability.test.ts`.

### 6.9 Tiêu thụ hạn mức AI theo kỳ

- **Hành vi:** `?period=YYYY-MM` lọc theo tháng, kèm hạn mức tháng, trần AI, credit tặng theo gói.
- **Mã chính:** `api/usage/summary/route.ts` (`G8`), `src/modules/usage/use-cases/get-usage-summary.ts`, màn `src/app/(app)/muc-dung/page.tsx`.
- **Test:** `tt/usage-summary.test.ts`.
- **Lưu ý:** `/muc-dung` thuộc danh sách khoá production.
