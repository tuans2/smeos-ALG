---
id: SCR-STORE-bao-gia
tier: STORE
module: sales
route: /bao-gia
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

# Screen Contract — Báo giá bán hàng (Quotations)

**Tuyến:** `/bao-gia`, `/bg/[token]` · **Tệp chính:** `src/app/(app)/bao-gia/page.tsx`, `src/components/sales/quotation/` · **Cập nhật:** 01/11/2026 (PO 01/11/2026, PR-4) · **Thẻ:** công cụ #58 · **Asset:** #24 (Bản báo giá chi tiết — Sẵn)

## 1. Vai và mục đích
- Vai chính (03b): `dieu_hanh`, `sale` · Vai phụ: `cua_hang` (đối tác nhận gia công)
- Quyền năng lực: `R15` (order.quote — tạo và sửa báo giá), `Q1` (crm.customer.read — xem báo giá)
- Phạm vi: organization (cách ly tenant)
- Việc chính: tạo bảng báo giá chi tiết có mã số, thời hạn hiệu lực gửi khách hoặc đối tác, theo dõi trạng thái và chuyển đổi thành đơn hàng.
- Câu hỏi chính: "Khách đang hỏi mẫu nào, giá bao nhiêu và khi nào hết hạn chốt đơn?"
- Mật độ: MEDIUM
- Archetype: B Danh sách · C Biểu mẫu tạo / Xem trước trực tiếp

## 2. Luồng nghiệp vụ
1. **Gửi khách mua:**
   - Chọn sản phẩm từ kho hoặc nhập sản phẩm mới.
   - Nhập mức giảm giá (nếu có), chọn thời hạn hiệu lực (3-30 ngày), ghi chú điều khoản.
   - Hệ thống tự động tính: Tiền hàng (`subtotal`), Giảm giá (`discountAmount`), Tổng thanh toán (`totalAmount`).
   - Bấm "Lưu báo giá & Lấy link": tạo bản ghi trong CSDL `quotations`, cập nhật trạng thái `SENT`.
   - Sinh link công khai `/bg/[token]` (token ngẫu nhiên 256 bit, không phải mã BG-xxxx) khi báo giá đã gửi; bản nháp không có link. Sao chép gửi Zalo/tin nhắn.
   - Soạn báo giá: chọn phiên bản kích cỡ cho từng mẫu và nhập phí vận chuyển (`QuoteLineOptions`); mỗi báo giá trong danh sách có mục "Lịch sử sửa" (các phiên bản trước).
   - Khi gắn với Lead: tự động cập nhật trạng thái Lead sang `QUOTATION_SENT`.
2. **Báo giá đối tác (Gia công):**
   - Chọn nhanh sản phẩm từ kho hoặc nhập yêu cầu sản xuất.
   - Nhập giá trả đối tác, phí hỗ trợ giao nhận, hạn chót hoàn thành.
   - Xuất phiếu báo giá gia công lưu trữ trong hệ thống kèm mã số và link theo dõi.
3. **Danh sách & Chuyển đổi thành đơn hàng:**
   - Xem toàn bộ báo giá với 6 trạng thái: `DRAFT`, `SENT`, `ACCEPTED`, `REJECTED`, `EXPIRED`, `CONVERTED`.
   - Báo giá hết hạn được tự động nhận diện `EXPIRED`.
   - Bấm "Tạo đơn": chuyển đổi báo giá thành đơn hàng thật qua cổng nhận đơn chung `ingestOrder` (nguồn `QUOTATION`), gắn `convertedOrderId` và cập nhật báo giá sang `CONVERTED`.

## 3. Thứ bậc thông tin
| Lớp | Nội dung | Vị trí |
|---|---|---|
| L0 | Tiêu đề trang, nút chuyển chế độ (Khách mua / Đối tác / Danh sách) | Header & Tabs |
| L1 | Bộ lọc sản phẩm, danh sách sản phẩm chọn vào bộ | Cột trái (7 cột) |
| L1 | Bản xem trước chuẩn A6, các dòng tiền subtotal/discount/total | Cột phải (5 cột) |
| L2 | Ô nhập giảm giá, hạn hiệu lực, điều khoản | Khối cấu hình dưới thẻ xem trước |
| L3 | Nút lưu & lấy link, sao chép chữ, xem đơn hàng | Dưới cùng cột phải |

## 4. Dữ liệu và quyền
- Bảng CSDL: `quotations`, `quotation_items` (kết nối `leads`, `customers`, `orders`, `asset_usages`).
- Nguồn đơn: `orders.source = 'QUOTATION'`.
- Quyền: `R15` (tạo/sửa/chuyển đổi), `Q1` (xem danh sách/chi tiết).
- Trang công khai: `/bg/[token]` — truy cập không cần đăng nhập, chỉ đọc các trường công khai (tên người nhận, dòng hàng kèm ảnh mẫu, phiên bản và thành phần hoa, phí vận chuyển, tổng tiền, điều khoản); không số điện thoại, ghi chú nội bộ, giá vốn; báo giá nháp trả 404; không lập chỉ mục. Nút "Tải ảnh" (PNG) và "Tải PDF A6" (`QuoteExportButtons`, `html-to-image` + `jspdf`) chụp đúng khung báo giá.

