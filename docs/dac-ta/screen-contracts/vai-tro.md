---
id: SCR-STORE-vai-tro
tier: STORE
module: organization
route: /vai-tro
archetype: B
snapshots:
  - 390x844
  - 1280x800
acceptance:
  - Tiêu đề cấp 1 qua PageHeader/ToolHero (ADR-011 D-UI-05)
  - Tối đa 1 nút chính (primary) theo K2
  - Đủ trạng thái tải, rỗng, lỗi, không quyền
  - Không vi phạm axe-core critical/serious ở 390px và 1280px
---

# Screen Contract — Danh mục vai trò (`/vai-tro`)

**Tuyến:** `/vai-tro` · **Tệp chính:** `src/app/(app)/vai-tro/page.tsx` · **Cập nhật:** 26/09/2026 · **Thẻ:** T5.A3

## 1. Vai và mục đích
- **Vai chính (03b):** Tất cả các vai (Màn tham chiếu danh mục vai trò hệ thống).
- **Phạm vi:** Toàn hệ thống (15 vai: 2 Platform, 10 One-Store, 3 Chain).
- **Việc chính:** Xem danh mục các vai trò theo lộ trình ALG, biết vai nào đang khả dụng, vai hiện tại của mình là gì, và vai nào đang phát triển.
- **Câu hỏi chính:** "ALG có những vai trò nào và vai của tôi có thể làm gì?"
- **Mật độ:** MEDIUM (Phân 3 nhóm theo phân khúc: Nền tảng, Một cửa hàng, Chuỗi cửa hàng).

## 2. Hiện trạng (audit)
- **API gọi:** Không gọi API trực tiếp. Dữ liệu tĩnh từ SSOT `ROLE_UX_CATALOG` (`src/modules/organization/domain/role-ux-catalog.ts`).
- **Khối:** Header (Nút quay lại, Tiêu đề, Thống kê số vai khả dụng) + 3 nhóm vai trò (`PLATFORM`, `ONE_STORE`, `CHAIN`).
- **Trạng thái:** Tĩnh, render tức thì từ catalog mã nguồn.

## 3. Thứ bậc thông tin
| Lớp | Nội dung | Vị trí hiển thị |
|---|---|---|
| L0 Thiết yếu | Header đếm số vai khả dụng + Nút trở về trang chủ | Đỉnh trang |
| L1 Nhóm vai | 3 nhóm: Nền tảng, Một cửa hàng, Chuỗi cửa hàng | 3 cột trên Desktop 1280px, xếp dọc trên mobile |
| L2 Dòng vai | Tên vai, Huy hiệu (Vai của bạn / Đang dùng được / Đang phát triển), Mô tả trang chủ & câu hỏi chính (≤ 2 dòng) | Trong từng thẻ danh sách nhóm |
| L3 Hành động | Nút "Mở" / "Console" dẫn trực tiếp tới `entryHref` của vai khả dụng | Bên phải mỗi dòng vai khả dụng |

## 4. Hành động
- **Chính:** Nút "Mở" hoặc "Console" (đối với Platform) chuyển tới trang chính của vai khả dụng.
- **Phụ:** Nút quay lại trang chủ ở Header.
- **Trạng thái không khả dụng:** Vai `IN_DEVELOPMENT` có `aria-disabled="true"`, không có thẻ `<Link>` tương tác, không nhận focus bàn phím, có nhãn `aria-label="Trạng thái: Đang phát triển"` đầy đủ cho screen reader.

## 5. Content budget
- Nút nổi: 0.
- Khối chính: 3 nhóm vai trò. Mô tả mỗi vai bị giới hạn `line-clamp-2` (≤ 2 dòng theo 03a UX-008).

## 6. Responsive
- **390px (Mobile):** Xếp dọc 1 cột, các nút bấm đều đạt chiều cao tối thiểu 44px (`min-h-11`).
- **768px (Tablet):** Bố cục 1 cột thoáng đãng.
- **1280px (Desktop):** Lưới 3 cột (`xl:grid xl:grid-cols-3 xl:items-start`), hiển thị 3 nhóm song song.

## 7. Trợ năng
- Header có nút trở về trang chủ với `aria-label="Về trang chủ"`.
- Vai đang phát triển có `aria-disabled="true"` và nhãn phụ cho icon khoá `aria-hidden="true"`.
- Bàn phím: Phím Tab chỉ dừng lại ở các nút có thể tương tác ("Mở", "Console", nút Back).
- Semantic typography dùng 100% token (`text-title`, `text-body-sm`, `text-caption`).

## 8. QA Matrix (03a §34)
| Chiều | Kết quả | Ghi chú |
|---|---|---|
| Vai | PASS | Mọi vai đều có thể xem danh mục |
| Việc | PASS | Tra cứu danh mục vai trò hệ thống |
| IA | PASS | 3 nhóm chuẩn SSOT 03b |
| Mật độ | PASS | 3 nhóm, mô tả ≤ 2 dòng |
| Thứ bậc | PASS | Thống kê -> Danh sách 3 nhóm |
| CTA | PASS | Mở / Console cho vai khả dụng |
| Luồng | PASS | Chuyển tới entryHref của vai |
| Trạng thái | PASS | Rõ ràng AVAILABLE vs IN_DEVELOPMENT |
| Responsive | PASS | 1280px chia 3 cột đẹp mắt |
| Trợ năng | PASS | Đạt chuẩn aria-disabled, touch target ≥ 44px |
| Dữ liệu | PASS | Nguồn SSOT ROLE_UX_CATALOG |
| Quyền | PASS | Không phân quyền xem danh mục tham chiếu |
| Nhất quán | PASS | Dùng 100% token Semantic |
