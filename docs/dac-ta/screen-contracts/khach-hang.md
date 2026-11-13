---
id: SCR-STORE-khach-hang
tier: STORE
module: crm
route: /khach-hang
archetype: B
snapshots:
  mobile: 390x844
  desktop: 1280x800
acceptance:
  - Tất cả bộ lọc hạng khách và tìm kiếm phản hồi trong 300ms
  - Có đủ 6 trạng thái UI: loading, empty, error, forbidden, partial, success
  - Bàn phím tab điều hướng được toàn bộ bảng và các nút hành động
---

# Screen Contract — Quản lý Khách hàng & CRM (`/khach-hang`)

**Tuyến:** `/khach-hang` · **Tệp chính:** `src/app/(app)/khach-hang/page.tsx` · **Cập nhật:** 12/11/2026 · **Thẻ:** T5.B3

## 1. Vai và mục đích
- **Vai chính (03b):** `sales`, `store_manager`, `marketer`.
- **Phạm vi:** organization (danh bạ khách hàng, phân tầng RFM và ngày kỷ niệm).
- **Việc chính:** Quản lý hồ sơ khách hàng, phân tầng RFM tự động, rà soát ngày kỷ niệm sắp tới để gửi thiệp/hoa và chăm sóc khách.
- **Câu hỏi chính:** "Khách nào cần chăm sóc?" → **Nút chính:** "Thêm khách hàng".
- **Mật độ:** MEDIUM (Bảng dữ liệu kết hợp bộ lọc phân tầng RFM).

## 2. Hiện trạng (audit)
- **API gọi:**
  - `GET /api/v1/crm/customers` → `Q1` (`crm.read`)
  - `GET /api/v1/crm/customers/:id` → `Q1` (`crm.read`)
  - `GET /api/v1/crm/reminders/upcoming?days=14` → `Q1` (`crm.read`)
  - `POST /api/v1/crm/customers` → `Q2` (`crm.create`)
  - `PATCH /api/v1/crm/customers/:id` → `Q3` (`crm.update`)
  - `GET /api/v1/crm/customers/:id/orders` → `Q1` + `R1` — tab "Đơn đã đặt" (checklist ALG 4.11), chỉ hiện khi có `R1`; bấm một đơn mở `OrderDetailModal`
  - Tab "Quyền riêng tư" → khu "Yêu cầu về dữ liệu" (ADR-014 D-P5, P-7b): `GET /api/v1/crm/data-requests?customer_id=` → `Q1`; `POST /api/v1/crm/customers/:id/data-requests/export` → `R13` (tải JSON / CSV); `.../rectify` → `Q3`; `.../erase` → `Q4` (`ConfirmDialog` bắt gõ "XOÁ"); `PATCH /api/v1/crm/data-requests/:id` → `Q3`. Nút ẩn khi thiếu mã năng lực.
- **Khối chính:**
  - Header: Nút chính "Thêm khách hàng", Nút phụ "Quét dịp sắp tới (14 ngày)".
  - FeatureGuidanceCard chuẩn hóa (tối đa 1 khối, 3 tips, không spam).
  - Thanh tìm kiếm và bộ lọc viên thuốc phân tầng RFM.
  - Bảng danh sách khách hàng.
  - Drawer nhắc hẹn dịp kỷ niệm (Reminders).
  - Modal: `CreateCustomerModal`, `CustomerDetailModal`.
- **Trạng thái:** Tải (`SkeletonBlock`), Rỗng (thông báo thân thiện), Lỗi.

## 3. Thứ bậc thông tin
| Lớp | Nội dung | Vị trí hiển thị |
|---|---|---|
| L0 Thiết yếu | Header trang, Nút chính "Thêm khách hàng", Thanh tìm kiếm & bộ lọc RFM | Đỉnh trang |
| L1 Hành động | Quét ngày kỷ niệm sắp tới (trong 14 ngày tới) | Nút phụ trên header & Drawer nhắc hẹn |
| L1 Chi tiết khách | Dịp kỷ niệm sắp tới của từng khách | Cột bảng & Nâng lên đầu tab Hồ sơ modal |
| L2 Phân tầng RFM | Phân hạng VIP, Vàng, Bạc, Đồng, Khách mới (bằng cả chữ + màu) | Cột Phân hạng |
| L3 Chi tiết hồ sơ | Modal `CustomerDetailModal` (Hồ sơ Master, Đơn đã đặt, Dịp kỷ niệm, Consent riêng tư) | Modal popup |
| L3 Yêu cầu về dữ liệu | Xuất / sửa / xoá dữ liệu cá nhân theo yêu cầu khách; danh sách yêu cầu, nhãn "Quá hạn" (72 giờ) | Cuối tab Quyền riêng tư |

## 4. Hành động
- **Chính:** "Thêm khách hàng" (`variant="primary"`).
- **Phụ:** "⚡ Quét dịp sắp tới (14 ngày)" (`variant="outline"`).
- **Bộ lọc:** Các nút viên thuốc chọn phân tầng RFM (`Tất cả`, `VIP`, `GOLD`, `SILVER`, `BRONZE`, `NEW`).
- **Thao tác dòng:** Nút "Xem hồ sơ" (icon con mắt) mở chi tiết khách hàng.

## 5. Responsive
- **390px (Mobile):** Bảng hỗ trợ cuộn ngang nhẹ nhàng, các nút lọc và nút xem hồ sơ đều đạt `min-h-11` (≥ 44px).
- **1280px (Desktop):** Bảng hiển thị đầy đủ 8 cột rõ nét, phân bổ thông tin tối ưu.

## 6. Trợ năng
- Toàn bộ nút bấm tương tác đạt touch target ≥ 44px, có `focus-visible:outline-2 focus-visible:outline-primary`.
- Huy hiệu phân hạng RFM hiển thị bằng chữ tiếng Việt kèm màu sắc (đạt 03a §08).
- Biểu tượng trang trí có `aria-hidden="true"`.

## 7. QA Matrix (03a §34)
| Chiều | Kết quả | Ghi chú |
|---|---|---|
| Vai | PASS | Đạt chuẩn cho Sales, Store Manager, Marketer |
| Việc | PASS | Trả lời "Khách nào cần chăm sóc?" |
| IA | PASS | Danh bạ -> Phân tầng RFM -> Dịp kỷ niệm |
| Mật độ | PASS | 1 FeatureGuidanceCard duy nhất (K1) |
| Thứ bậc | PASS | Thêm khách -> Quét dịp -> Danh sách |
| CTA | PASS | Thêm khách hàng là nút chính duy nhất |
| Luồng | PASS | /khach-hang -> Quét dịp -> Chi tiết hồ sơ |
| Trạng thái | PASS | Tải (Skeleton), rỗng, drawer |
| Responsive | PASS | Chuẩn xác trên mobile và desktop |
| Trợ năng | PASS | Text + Color badge, touch target ≥ 44px |
| Dữ liệu | PASS | Kết nối API CRM Master Index thật |
| Quyền | PASS | Gating theo Q1, Q2, Q3 |
| Nhất quán | PASS | 100% token Semantic, font token chuẩn |
