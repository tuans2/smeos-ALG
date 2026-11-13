---
id: SCR-MOTHER-hang-doi-loi
tier: MOTHER
module: platform
route: /van-hanh/hang-doi-loi
archetype: B
snapshots:
  - 390x844
  - 1280x800
acceptance:
  - Quản lý hàng đợi job lỗi xuyên tổ chức: loại việc, tổ chức, số lần thử, nguyên nhân lỗi
  - Thao tác Chạy lại / Gác lại job cần quyền N15 qua ConfirmDialog và ghi nhật ký nền tảng
  - Áp dụng chủ đề giao diện hiện đại modern-slate
  - Đầy đủ 6 trạng thái UI và chuẩn WCAG 2.2 AA
---

# Screen Contract — Hàng Đợi Công Việc Lỗi (Dead Letter Queue)

**Mã màn:** `SCR-MOTHER-hang-doi-loi` · **Tuyến:** `/van-hanh/hang-doi-loi` · **Tầng:** `MOTHER` · **Bố cục (Archetype):** `B` (Danh sách)

## 1. Vai & Mục đích
- **Vai chính (03b):** `platform_admin`.
- **Phạm vi dữ liệu:** `platform` (Các job thất bại hoặc vượt quá số lần thử lại toàn hệ thống).
- **Mục tiêu chính:** Phân tích nguyên nhân lỗi tác vụ nền (chỉnh ảnh, render video, xuất PDF) và thực hiện can thiệp chạy lại hoặc gác lại.
- **Câu hỏi cốt lõi:** "Những job nào bị lỗi, vì sao lỗi và cần can thiệp xử lý ra sao?"
- **Mật độ thông tin (Density):** `compact`

## 2. Cấu trúc Bố cục & Thứ bậc (Visual Hierarchy)
- **Header:** `PageHeader` tiêu đề "Hàng đợi việc bị lỗi", nút quay lại `/van-hanh/suc-khoe`.
- **Vùng làm việc:** `ListLayout` hiển thị bảng chi tiết các job lỗi.
- **Khối chức năng chính:**
  1. L0 (Thiết yếu): Mã job, loại tác vụ, tổ chức bị ảnh hưởng, thông điệp lỗi kỹ thuật.
  2. L1 (Hành động): Nút "Chạy lại" (Retry) và "Gác lại" (Shelve) cho từng job.
  3. L2 (Bổ trợ): Hộp thoại xác nhận thao tác can thiệp hệ thống (`ConfirmDialog`).

## 3. Hành động cấp trang (Actions)
- **Hành động chính (Primary CTA):** "Chạy lại việc" (cần quyền `N15`).
- **Hành động phụ (Secondary):** "Gác lại việc", "Làm mới danh sách".

## 4. Đặc tả 6 Trạng thái Giao diện (States)
1. **Đang tải (Loading):** Skeleton bảng hàng đợi lỗi.
2. **Rỗng (Empty):** `EmptyState kind="none"` báo tin mừng: "Không có công việc nào bị lỗi trong hệ thống!".
3. **Lỗi (Error):** Lỗi tải danh sách job lỗi từ máy chủ.
4. **Không có quyền (Forbidden):** Yêu cầu quyền năng lực `N15`.
5. **Dữ liệu một phần (Partial):** Hiển thị danh sách kèm thông báo có job đang được thử lại.
6. **Thành công (Success):** Danh sách hiển thị chi tiết, thao tác can thiệp an toàn.

## 5. Quy chuẩn Trợ năng & Responsive (A11y & Responsive)
- Nút bấm xác nhận can thiệp có modal cảnh báo phòng chống mất mát dữ liệu.
- Tuân thủ chuẩn WCAG 2.2 AA.
