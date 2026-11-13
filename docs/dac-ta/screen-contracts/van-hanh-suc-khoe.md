---
id: SCR-MOTHER-suc-khoe
tier: MOTHER
module: platform
route: /van-hanh/suc-khoe
archetype: A
snapshots:
  - 390x844
  - 1280x800
acceptance:
  - Giám sát sức khỏe hạ tầng, worker nền và phát hiện job treo
  - Áp dụng chủ đề giao diện hiện đại modern-slate
  - Chỉ báo trạng thái rõ ràng (Xanh/Vàng/Đỏ) không dựa duy nhất vào màu sắc
  - Đầy đủ 6 trạng thái UI và chuẩn WCAG 2.2 AA
---

# Screen Contract — Sức Khỏe Hạ Tầng & Giám Sát Tác Vụ Nền

**Mã màn:** `SCR-MOTHER-suc-khoe` · **Tuyến:** `/van-hanh/suc-khoe` · **Tầng:** `MOTHER` · **Bố cục (Archetype):** `A` (Bảng điều khiển)

## 1. Vai & Mục đích
- **Vai chính (03b):** `platform_admin`.
- **Phạm vi dữ liệu:** `platform` (Hạ tầng, worker Python, hàng đợi CSDL).
- **Mục tiêu chính:** Giám sát trạng thái hoạt động của các worker xử lý ảnh/video, phát hiện job bị kẹt và cảnh báo sự cố.
- **Câu hỏi cốt lõi:** "Các worker có đang chạy bình thường không và có job nào bị treo cần xử lý không?"
- **Mật độ thông tin (Density):** `compact`

## 2. Cấu trúc Bố cục & Thứ bậc (Visual Hierarchy)
- **Header:** `PageHeader` với huy hiệu trạng thái hệ thống tổng thể.
- **Vùng làm việc:** `DashboardLayout` hiển thị lưới thẻ trạng thái worker và bảng hàng đợi.
- **Khối chức năng chính:**
  1. L0 (Thiết yếu): Trạng thái các worker (Vision Worker, Media Worker, Video Worker).
  2. L1 (Hành động): Nút xem danh sách việc bị lỗi `/van-hanh/hang-doi-loi`.
  3. L2 (Bổ trợ): Bảng phân bổ job theo loại tác vụ và thời gian chờ.

## 3. Hành động cấp trang (Actions)
- **Hành động chính (Primary CTA):** Nút "Làm mới trạng thái" (Refresh).
- **Hành động phụ (Secondary):** "Xem việc bị lỗi (Hàng đợi lỗi)".

## 4. Đặc tả 6 Trạng thái Giao diện (States)
1. **Đang tải (Loading):** Skeleton các thẻ worker và bảng hàng đợi.
2. **Rỗng (Empty):** Khi hàng đợi trống (mọi việc đã hoàn tất).
3. **Lỗi (Error):** Báo lỗi khi không thể truy vấn API `/api/v1/platform/health`.
4. **Không có quyền (Forbidden):** Yêu cầu quyền năng lực `N5`.
5. **Dữ liệu một phần (Partial):** Báo trạng thái cảnh báo nếu có 1 worker mất kết nối.
6. **Thành công (Success):** Toàn bộ chỉ số hạ tầng hiển thị thời gian thực.

## 5. Quy chuẩn Trợ năng & Responsive (A11y & Responsive)
- Chỉ báo trạng thái kết hợp icon và nhãn chữ (CheckCircle2 / AlertTriangle / AlertCircle).
- Tuân thủ chuẩn WCAG 2.2 AA.
