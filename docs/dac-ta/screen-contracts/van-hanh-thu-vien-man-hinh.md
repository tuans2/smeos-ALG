---
id: SCR-MOTHER-thu-vien-man-hinh
tier: MOTHER
module: platform
route: /van-hanh/thu-vien-man-hinh
archetype: B
snapshots:
  - 390x844
  - 1280x800
acceptance:
  - "Liệt kê chính xác 100% màn hình thực tế được quét động từ src/app"
  - "Có thanh tìm kiếm theo URL, tiêu đề, mã ID và module"
  - "Có bộ lọc phân loại theo Tầng (StoreOS, ChainOS, SaaS Mother, Public, Auth) và Archetype (A-F)"
  - "Mỗi mục có liên kết trực tiếp cho phép click mở màn hình ngay lập tức"
---

# Screen Contract — Thư Viện Màn Hình Toàn Hệ Thống (SaaS Mother)

**Mã màn:** `SCR-MOTHER-thu-vien-man-hinh` · **Tuyến:** `/van-hanh/thu-vien-man-hinh` · **Tầng:** `MOTHER` · **Bố cục (Archetype):** `B` (Danh sách)

## 1. Vai & Mục đích
- **Vai chính (03b):** `platform_admin`.
- **Phạm vi dữ liệu:** `platform` (Danh mục toàn bộ các màn hình giao diện trong toàn bộ hệ thống ALG).
- **Mục tiêu chính:** Cung cấp trung tâm đối soát, kiểm tra trực tiếp và phân loại 100% màn hình thực tế trong hệ sinh thái đa tenant ALG. Dữ liệu được quét tự động và cập nhật tức thì theo mã nguồn.
- **Câu hỏi cốt lõi:** "Hệ thống hiện có bao nhiêu màn hình, phân bố theo tầng thế nào và làm sao click vào kiểm tra trực tiếp từng màn hình?"
- **Mật độ thông tin (Density):** `compact`

## 2. Cấu trúc Bố cục & Thứ bậc (Visual Hierarchy)
- **Header:** `PageHeader` tiêu đề "Thư viện Màn hình Toàn hệ thống", mô tả và huy hiệu số lượng màn hình.
- **KPI Summary:** 4 thẻ `KpiTile` (Tổng số màn hình, StoreOS, SaaS Mother & Chuỗi, Tỷ lệ bao phủ Screen Contract).
- **Vùng làm việc:** `ScreenLibraryExplorer` với:
  1. L0 (Thiết yếu): Ô tìm kiếm nhanh, nút chuyển đổi dạng lưới (Grid) / dạng bảng (Table), số lượng kết quả.
  2. L1 (Bộ lọc): Tab chọn tầng (Tất cả, StoreOS, Mother, Chain, Public, Auth) và Chip lọc theo Archetype (A–F), Trạng thái contract.
  3. L2 (Thẻ màn hình): Tên màn hình, mã ID, huy hiệu Tầng/Archetype, tuyến đường dẫn, nút "Mở trang" trực tiếp.

## 3. Hành động cấp trang (Actions)
- **Hành động chính (Primary CTA):** Click nút "Mở trang" để chuyển hướng / mở tab mới kiểm tra màn hình trực tiếp.
- **Hành động phụ (Secondary):** Sao chép đường dẫn route vào clipboard, chuyển đổi chế độ xem Grid/Table.

## 4. Đặc tả 6 Trạng thái Giao diện (States)
1. **Đang tải (Loading):** SSR Server Component hiển thị ngay lập tức không có giật lag.
2. **Rỗng (Empty):** Khi bộ lọc tìm kiếm không khớp màn hình nào, hiển thị nút "Đặt lại tất cả bộ lọc".
3. **Lỗi (Error):** Báo lỗi và fallback danh mục mặc định.
4. **Không có quyền (Forbidden):** Yêu cầu vai trò `platform_admin`.
5. **Dữ liệu đầy đủ (Success):** Hiển thị toàn bộ các màn hình kèm link điều hướng trực tiếp.
