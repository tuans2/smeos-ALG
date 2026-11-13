---
id: SCR-<TIER>-<slug> # Ví dụ: SCR-STORE-san-pham, SCR-CHAIN-dieu-phoi, SCR-MOTHER-to-chuc
tier: STORE # MOTHER | INDUSTRY | CHAIN | STORE | PUBLIC | AUTH
module: <module-name> # Ví dụ: products, coordinator, platform, orders
route: <route-path> # Ví dụ: /san-pham, /dieu-phoi, /van-hanh/to-chuc
archetype: B # A: Dashboard | B: Danh sách | C: Chi tiết | D: Biểu mẫu | E: Builder | F: Cài đặt
snapshots:
  - 390x844
  - 1280x800
acceptance:
  - Tiêu đề cấp 1 <h1> đúng 20px (text-display)
  - Tối đa 1 nút chính (primary button) theo K2
  - Đầy đủ 6 trạng thái UI (tải, rỗng, lỗi, không quyền, một phần, thành công)
  - Vùng chạm tối thiểu 44×44px khi con trỏ thô (pointer: coarse)
  - Không vi phạm axe-core critical/serious
---

# Screen Contract — <Tên màn hình>

**Mã màn:** `<id>` · **Tuyến:** `<route>` · **Tầng:** `<tier>` · **Bố cục (Archetype):** `<archetype>`

## 1. Vai & Mục đích
- **Vai chính (03b):** `<vai>`
- **Phạm vi dữ liệu:** `organization` | `branch` | `platform`
- **Mục tiêu chính:** <Mục tiêu người dùng hoàn thành tại màn hình này>
- **Câu hỏi cốt lõi:** <Người dùng tự hỏi điều gì khi mở màn hình này>
- **Mật độ thông tin (Density):** `compact` | `comfortable` | `spacious`

## 2. Cấu trúc Bố cục & Thứ bậc (Visual Hierarchy)
- **Header:** `PageHeader` (tiêu đề, breadcrumbs, nút quay lại nếu là trang con, huy hiệu trạng thái, nút CTA duy nhất).
- **Vùng làm việc:** Áp dụng theo Archetype `<archetype>` (ví dụ: `ListLayout`, `DashboardLayout`, `FormLayout`...).
- **Khối chức năng chính:**
  1. L0 (Thiết yếu): ...
  2. L1 (Hành động): ...
  3. L2 (Ngữ cảnh / Bổ trợ): ...

## 3. Hành động cấp trang (Actions)
- **Hành động chính (Primary CTA):** `<nhãn>` → `<tác vụ / endpoint>`
- **Hành động phụ (Secondary):** `<nhãn>` (tối đa 2)
- **Menu tràn (Overflow `…`):** `<danh sách tác vụ ít dùng>`

## 4. Đặc tả 6 Trạng thái Giao diện (States)
1. **Đang tải (Loading):** `<SkeletonBlock />` cấu trúc khớp với nội dung thực tế, không dùng chữ trơ trụi.
2. **Rỗng (Empty):** `<EmptyState kind="none" | "filtered">` giải thích lý do và cung cấp CTA bắt đầu.
3. **Lỗi (Error):** `<EmptyState kind="error">` hoặc thông báo lỗi rõ ràng, có nút thử lại.
4. **Không có quyền (Forbidden):** `<EmptyState kind="forbidden">` hướng dẫn liên hệ quản trị viên.
5. **Dữ liệu một phần (Partial):** Xử lý fallback an toàn khi mất kết nối mạng.
6. **Thành công (Success):** Hiển thị dữ liệu hoàn chỉnh, tương tác phản hồi tức thì.

## 5. Quy chuẩn Trợ năng & Responsive (A11y & Responsive)
- **Màn hình di động (390px):** Single-column stacking, các nút chạm ≥ 44px, không tràn ngang.
- **Màn hình lớn (1280px):** Lưới đầy đủ theo Archetype.
- **Bàn phím & Đọc màn hình:** Tuân thủ thứ tự tab, focus ring rõ nét, các nút icon đều có `aria-label`.
