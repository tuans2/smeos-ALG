---
id: SCR-PUB-b-sendcode
tier: PUBLIC
module: greeting-card
route: /b/[sendCode]
archetype: D
snapshots:
  - 390x844
  - 1280x800
acceptance:
  - Hoàn toàn KHÔNG dùng dữ liệu giả demo (§2 OPERATING_PRINCIPLES)
  - Bảo vệ quyền riêng tư phiên mở đầu tiên (session isolation qua token cookie)
  - Khối BrochureOrderOptions hiển thị đầy đủ 2 ô mã (mã ưu đãi & mã thanh toán)
  - Đầy đủ 6 trạng thái UI và xử lý liên kết hết hạn/không tồn tại (LinkUnavailable)
  - Tuân thủ chuẩn WCAG 2.2 AA cho khách xem công khai
---

# Screen Contract — Đặt Hàng Trực Tuyến Từ Tuyển Tập Sản Phẩm (Brochure)

**Mã màn:** `SCR-PUB-b-sendcode` · **Tuyến:** `/b/[sendCode]` · **Tầng:** `PUBLIC` · **Bố cục (Archetype):** `D` (Biểu mẫu)

## 1. Vai & Mục đích
- **Vai chính (03b):** Khách hàng công khai (`customer` / `guest`).
- **Phạm vi dữ liệu:** Đơn hàng và bộ sưu tập được gắn với mã gửi (`sendCode`).
- **Mục tiêu chính:** Khách xem bộ sưu tập sản phẩm đã được tiệm chọn lọc, điền thông tin người nhận, thiệp chúc và gửi đơn đặt hàng.
- **Câu hỏi cốt lõi:** "Tôi có thể chọn mẫu và đặt hàng nhanh chóng kèm lời chúc như thế nào?"
- **Mật độ thông tin (Density):** `comfortable`

## 2. Cấu trúc Bố cục & Thứ bậc (Visual Hierarchy)
- **Header:** Thanh thông tin liên hệ cửa hàng (`ShopContactBar`), tiêu đề bộ sưu tập.
- **Vùng làm việc:** Trải nghiệm khách đặt hàng trực tuyến (`BrochureCustomerExperience`).
- **Khối chức năng chính:**
  1. L0 (Thiết yếu): Danh mục mẫu sản phẩm tuyển chọn kèm giá thực tế từ tiệm.
  2. L1 (Hành động): Khối biểu mẫu đặt hàng đa ngành: người nhận, địa chỉ, lời chúc, mã ưu đãi & mã thanh toán.
  3. L2 (Bổ trợ): Chat tư vấn trực tiếp (`PublicChatSlot`), cổng khoá mở lại đơn bằng 4 số cuối SĐT.

## 3. Hành động cấp trang (Actions)
- **Hành động chính (Primary CTA):** Nút "Gửi đơn đặt hàng" hoặc "Xác nhận đặt hàng".
- **Hành động phụ (Secondary):** "Chat với tiệm", "Mở lại bộ sưu tập".

## 4. Đặc tả 6 Trạng thái Giao diện (States)
1. **Đang tải (Loading):** Khung xương Skeleton hiển thị bố cục thẻ sản phẩm và form đặt hàng.
2. **Rỗng (Empty):** Nếu bộ sưu tập không có sản phẩm nào, hiển thị thông báo liên hệ cửa hàng.
3. **Lỗi (Error):** Hiển thị màn hình `LinkUnavailable` với lý do rõ ràng và nút liên hệ tiệm.
4. **Không có quyền / Khoá (Forbidden / Locked):** `BrochureUnlockGate` yêu cầu nhập 4 số cuối SĐT người đặt để mở lại.
5. **Dữ liệu một phần (Partial):** Cho phép xem danh sách sản phẩm dù kết nối chậm.
6. **Thành công (Success):** Hiển thị màn hình xác nhận đơn hàng thành công kèm mã theo dõi.

## 5. Quy chuẩn Trợ năng & Responsive (A11y & Responsive)
- Tối ưu hóa chuyển đổi trên thiết bị di động (mobile-first).
- Vùng chạm tối thiểu 44×44px cho mọi nút chọn sản phẩm và nút gửi.
- Không vi phạm tiêu chuẩn tương phản màu sắc và hỗ trợ đọc màn hình.

## 6. Nút Đặt hàng / Liên hệ theo cài đặt chủ cửa hàng (09/11/2026, PO)
Cùng công tắc với Bộ sưu tập chung (`KIEN_TRUC_SSOT_DON_HANG_DA_NGUON.md` §3.2), nguồn `BROCHURE`; áp cho `/b/[sendCode]`, `/g/[id]`, `/bst/[orgSlug]/[catalogCode]`.
- **Mặc định:** Đặt hàng bật, Liên hệ tắt → trang khách như trước.
- **Tắt Đặt hàng** (chỉ được khi Liên hệ bật): chạm mẫu nào cũng mở khung Gọi / Zalo / Nhắn tin, không có nút Đặt ngay. Máy chủ: chọn mẫu, báo giá, gửi đơn trả 404 (đơn đã có vẫn xem được).
- **Bật Liên hệ:** `/b` thêm nút "Nhắn tin" trên thanh cửa hàng (form tư vấn cho mẫu đang xem); `/g`, `/bst` thêm mục "Cần tư vấn thêm? Nhắn cửa hàng" ở chi tiết mẫu.
- Mẫu giá "Liên hệ" luôn có khung liên hệ, bất kể công tắc.
- **Form nhắn tin** có ô bắt buộc "đồng ý để cửa hàng liên hệ lại". Gửi đi tạo yêu cầu tư vấn trong Hội thoại **và** một khách tiềm năng (lead nguồn `BROCHURE`, lý do `CONTACT`, `source_ref` = mã link hoặc id bộ sưu tập). Bản trang cũ không gửi ô đồng ý → chỉ ghi Hội thoại.
