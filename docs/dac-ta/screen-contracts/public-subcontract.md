---
id: SCR-PUB-subcontract
tier: PUBLIC
module: coordinator
route: /subcontract/[orderCode]
archetype: C
snapshots:
  - 390x844
  - 1280x800
acceptance:
  - Hoàn toàn KHÔNG dùng dữ liệu giả demo (§2 OPERATING_PRINCIPLES)
  - Vòng đời nhận việc 4 bước (Spotlight Stepper): Nhận đơn ➔ Tải ảnh QC ➔ Bàn giao Shipper ➔ Hoàn tất
  - Cập nhật tiến độ thời gian thực (refreshInterval: 10s)
  - Hỗ trợ gửi yêu cầu bỏ qua bước khẩn cấp (SubcontractBypassControl)
  - Đầy đủ 6 trạng thái UI và chuẩn WCAG 2.2 AA
---

# Screen Contract — Nhận & Cập Nhật Tiến Độ Gia Công Ngoài (Subcontract Claim)

**Mã màn:** `SCR-PUB-subcontract` · **Tuyến:** `/subcontract/[orderCode]` · **Tầng:** `PUBLIC` · **Bố cục (Archetype):** `C` (Tiến trình hành động)

## 1. Vai & Mục đích
- **Vai chính (03b):** Xưởng gia công ngoài / Thợ chế tác chi nhánh liên kết (`partner`).
- **Phạm vi dữ liệu:** Tiến độ đơn hàng gia công ngoài theo mã đơn (`orderCode`).
- **Mục tiêu chính:** Hướng dẫn đối tác từng bước: xác nhận nhận đơn, tải ảnh thành phẩm kiểm định AI QC, cung cấp số điện thoại shipper và theo dõi tiền công.
- **Câu hỏi cốt lõi:** "Tôi cần làm bước nào tiếp theo cho đơn gia công này và tải ảnh ở đâu?"
- **Mật độ thông tin (Density):** `comfortable`

## 2. Cấu trúc Bố cục & Thứ bậc (Visual Hierarchy)
- **Header:** `SubcontractSpotlightShell` với thanh tiến trình 4 chặng (`SubcontractSpotlightStepper`).
- **Vùng làm việc:** Khối thao tác tập trung tương ứng với bước hiện tại của đơn.
- **Khối chức năng chính:**
  1. L0 (Thiết yếu): Mã đơn, hạn chót hoàn thành (countdown), tiền công đối tác.
  2. L1 (Hành động): Nút thực hiện tác vụ bước hiện tại (nhận đơn, chụp ảnh thành phẩm, điền shipper).
  3. L2 (Bổ trợ): Bảng tính giảm trừ phí (nếu giao trễ), yêu cầu vượt bước khẩn cấp (`SubcontractBypassControl`).

## 3. Hành động cấp trang (Actions)
- **Hành động chính (Primary CTA):** Nút hành động theo từng bước ("Xác nhận nhận đơn" ➔ "Gửi ảnh duyệt QC" ➔ "Bàn giao Shipper").
- **Hành động phụ (Secondary):** "Yêu cầu hỗ trợ khẩn", "Gọi điều phối viên".

## 4. Đặc tả 6 Trạng thái Giao diện (States)
1. **Đang tải (Loading):** Khung Skeleton mô phỏng thanh stepper và khối thông tin đơn.
2. **Rỗng (Empty):** Đơn hàng không tồn tại hoặc đã bị thu hồi.
3. **Lỗi (Error):** Hộp cảnh báo lỗi tải dữ liệu từ API hoặc lỗi xác thực token truy cập. Từ 07/11/2026 (ADR-014 P-4), chi nhánh không còn quyền xem đơn (chi nhánh khác đã nhận, hết vòng mời, đã huỷ nhận, hoặc đơn đóng quá 7 ngày) cũng nhận trạng thái này (API 404).
4. **Không có quyền (Forbidden):** Token bảo mật không trùng khớp với chi nhánh được mời.
5. **Dữ liệu một phần (Partial):** Hiển thị trạng thái bước trước trong khi đợi đồng bộ mạng.
6. **Thành công (Success):** Chuyển bước mượt mà kèm thông báo xác nhận thành công.

## 5. Quy chuẩn Trợ năng & Responsive (A11y & Responsive)
- Giao diện dạng thẻ nổi (Spotlight Card) tối ưu 100% cho điện thoại thông minh.
- Phản hồi rung/âm thanh nhẹ khi hoàn thành bước (nếu thiết bị hỗ trợ).
- Tuân thủ độ tương phản WCAG 2.2 AA cho thợ dễ thao tác.
