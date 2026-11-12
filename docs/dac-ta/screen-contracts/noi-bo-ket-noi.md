---
id: SCR-STORE-noi-bo-ket-noi
tier: STORE
module: internal-network
route: /noi-bo/ket-noi
archetype: B
snapshots:
  - 390x844
  - 1280x800
acceptance:
  - Mạng lưới kết nối nội bộ & chi nhánh liên kết
  - Mã mời tham gia chuỗi, mã QR kết nối nhanh
  - Quản lý danh sách đối tác xưởng ngoài và trạng thái hợp tác
  - Đầy đủ 6 trạng thái UI và chuẩn WCAG 2.2 AA
---

# Screen Contract — Kết Nối Mạng Lưới Nội Bộ & Đối Tác

> **Trạng thái production (12/11/2026, audit L-03):** tuyến thuộc tiền tố khoá `/noi-bo/ket-noi` trong `LOCKED_ROUTE_PREFIXES` (`src/lib/feature-lock.ts`). `src/app/(app)/noi-bo/ket-noi/layout.tsx` bọc `FeatureLockedGuard`, nên khi `NEXT_PUBLIC_APP_ENV=production` cả URL gõ thẳng cũng hiện màn "Sắp ra mắt" (trước đây chỉ làm mờ mục sidebar). Bản giao GD1 không đặt biến này nên không bị khoá.

**Mã màn:** `SCR-STORE-noi-bo-ket-noi` · **Tuyến:** `/noi-bo/ket-noi` · **Tầng:** `STORE` · **Bố cục (Archetype):** `B` (Danh mục kết nối)

## 1. Vai & Mục đích
- **Vai chính (03b):** `owner` / `store_manager`.
- **Phạm vi dữ liệu:** `organization` (Liên kết đối tác và chi nhánh).
- **Mục tiêu chính:** Kết nối với các cửa hàng khác trong hệ sinh thái chuỗi, tạo mã mời đối tác xưởng ngoài.
- **Câu hỏi cốt lõi:** "Làm sao để kết nối chi nhánh mới hoặc mời thợ ngoài vào mạng lưới của tiệm?"
- **Mật độ thông tin (Density):** `comfortable`

## 2. Cấu trúc Bố cục & Thứ bậc (Visual Hierarchy)
- **Header:** `PageHeader` tiêu đề "Kết Nối Mạng Lưới", hướng dẫn thiết lập chuỗi.
- **Vùng làm việc:** Thẻ mã mời QR, danh sách đối tác đang hoạt động.
- **Khối chức năng chính:**
  1. L0 (Thiết yếu): Mã định danh chuỗi, liên kết mời tham gia nhanh.
  2. L1 (Hành động): Nút sao chép liên kết, tạo mã kết nối mới, quét QR.
  3. L2 (Bổ trợ): Danh sách đối tác liên kết, lịch sử kết nối.

## 3. Hành động cấp trang (Actions)
- **Hành động chính (Primary CTA):** Nút "Tạo liên kết mời chi nhánh".
- **Hành động phụ (Secondary):** "Sao chép link mời", "Xem mã QR".

## 4. Đặc tả 6 Trạng thái Giao diện (States)
1. **Đang tải (Loading):** Skeleton khối thông tin kết nối và danh sách đối tác.
2. **Rỗng (Empty):** `EmptyState kind="none"` khi tiệm chưa kết nối với chi nhánh hay đối tác nào.
3. **Lỗi (Error):** Lỗi tải thông tin mã kết nối từ máy chủ.
4. **Không có quyền (Forbidden):** Yêu cầu quyền quản lý tổ chức.
5. **Dữ liệu một phần (Partial):** Hiển thị mã mời trong khi chờ tải danh sách đối tác.
6. **Thành công (Success):** Toàn bộ thông tin mạng lưới hiển thị rõ ràng.

## 5. Quy chuẩn Trợ năng & Responsive (A11y & Responsive)
- Nút sao chép mã có phản hồi thông báo tức thì ("Đã sao chép!").
- Tuân thủ chuẩn WCAG 2.2 AA.
