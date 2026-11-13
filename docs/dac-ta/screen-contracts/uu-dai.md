---
id: SCR-STORE-uu-dai
tier: STORE
module: promotions
route: /uu-dai
archetype: F
snapshots:
  - 390x844
  - 1280x800
acceptance:
  - Quản trị chính sách ưu đãi & giảm giá theo ma trận quản trị 4 tầng (TierGovernanceMatrixClient)
  - Đồng bộ SSOT với Cài đặt → Ưu đãi (/cai-dat/ma-tran-uudai)
  - Điều hướng nhóm công cụ quảng bá qua PromotionsHubNav
  - Đầy đủ 6 trạng thái UI và chuẩn WCAG 2.2 AA
---

# Screen Contract — Chính Sách Ưu Đãi & Giảm Giá Bán Hàng

**Mã màn:** `SCR-STORE-uu-dai` · **Tuyến:** `/uu-dai` · **Tầng:** `STORE` · **Bố cục (Archetype):** `F` (Cài đặt ma trận)

## 1. Vai & Mục đích
- **Vai chính (03b):** `owner` / `store_manager` / `marketing_lead`.
- **Phạm vi dữ liệu:** `organization` (Chính sách khuyến mại áp dụng cho khách hàng).
- **Mục tiêu chính:** Cấu hình các chương trình giảm giá, voucher mã ưu đãi khi khách mua qua Thẻ chào và Catalog.
- **Câu hỏi cốt lõi:** "Cửa hàng đang có những chương trình ưu đãi nào và mức giảm là bao nhiêu?"
- **Mật độ thông tin (Density):** `comfortable`

## 2. Cấu trúc Bố cục & Thứ bậc (Visual Hierarchy)
- **Header:** Thanh điều hướng nhóm công cụ quảng bá (`PromotionsHubNav`).
- **Vùng làm việc:** `TierGovernanceMatrixClient` hiển thị ma trận các loại ưu đãi.
- **Khối chức năng chính:**
  1. L0 (Thiết yếu): Danh sách các loại ưu đãi: Giảm theo phần trăm, Giảm số tiền cố định, Miễn phí vận chuyển.
  2. L1 (Hành động): Công tắc bật/tắt ưu đãi, chỉnh sửa mức giảm giá.
  3. L2 (Bổ trợ): Ghi chú điều kiện áp dụng, khoá cấp trên (chuỗi áp đặt).

## 3. Hành động cấp trang (Actions)
- **Hành động chính (Primary CTA):** Nút "Lưu chính sách ưu đãi".
- **Hành động phụ (Secondary):** "Thêm chương trình khuyến mại mới".

## 4. Đặc tả 6 Trạng thái Giao diện (States)
1. **Đang tải (Loading):** Skeleton danh sách công tắc ưu đãi.
2. **Rỗng (Empty):** Khi chưa có chương trình ưu đãi nào được kích hoạt.
3. **Lỗi (Error):** Báo lỗi khi cập nhật ma trận chính sách thất bại.
4. **Khoá cấp trên (Tier Locked):** Huy hiệu khoá hiển thị khi chuỗi mẹ áp đặt chính sách ưu đãi chung.
5. **Dữ liệu một phần (Partial):** Báo trạng thái đồng bộ khi lưu cấu hình.
6. **Thành công (Success):** Thay đổi chính sách có hiệu lực ngay lập tức trên các kênh bán công khai.

## 5. Quy chuẩn Trợ năng & Responsive (A11y & Responsive)
- Các công tắc bật/tắt (Switch) có nhãn trợ năng đầy đủ.
- Tuân thủ chuẩn WCAG 2.2 AA.
