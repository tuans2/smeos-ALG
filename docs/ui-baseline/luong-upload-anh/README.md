# Ảnh luồng upload ảnh (7 chức năng còn thiếu)

Chụp ngày 12/11/2026 theo quyết định của người giao việc ngày 11/11/2026 ("chụp luồng upload ảnh đi"; PO cần xác nhận trước khi gộp nhánh).
Chạy trên **server dev và DB local** (`smeos`), ảnh mẫu `tests/e2e/fixtures/bo-hoa-tong-hop.jpg`. Local không có khoá AI và không chạy worker, nên các bước AI dừng ở trạng thái chờ hoặc bị bỏ qua (đã chấp nhận theo khuyến nghị câu 2 trong `CAU_HOI_CHO_PO.md`).

Tên tệp: `<mã chức năng>-<bước>-<mô tả>-<khổ>.png`, khổ 1280 (máy tính) hoặc 390 (điện thoại).

| Mã | Luồng đã chạy | Kết quả | Ảnh |
|---|---|---|---|
| 4.15 | Thẻ chào → Điều phối → "Chụp thành phẩm" → chọn ảnh → Lưu | `product-photo` 200; thẻ chuyển "Chờ khách duyệt ảnh — còn 11 phút" | `4.15-01…03` |
| 4.16 | Như 4.15 (AI chấm ảnh chạy kèm khi lưu ảnh thành phẩm) | Lỗi AI bị bỏ qua, không chặn luồng (`update-brochure-order-status.ts`) → **không có màn kết quả AI** | — |
| 5.13 | Khách mở `/b/<mã>` → nhập 4 số cuối SĐT người đặt → xem ảnh thành phẩm, đồng hồ duyệt → "Tôi đồng ý với hình ảnh sản phẩm này" | `approve-photo` 200 | `5.13-01…02` (1280, 390) |
| 4.18 | Điều phối → "Giao Ship" (ghi chú shipper) → "Ảnh người nhận" → chọn ảnh → Lưu | `dispatch-shipping` 200, `recipient-photo` 200 | `4.18-01…04` |
| 4.24 | Tiệm tạo link → khách đặt đơn → trang thanh toán VietQR → tải ảnh biên lai → "Tôi đã chuyển khoản"; tiệm lọc "Khách báo đã chuyển" → mở phê duyệt | `payment-proof` 200, `payment-notify` 200; khối "Thẩm định AI" vẫn "Đang đọc dữ liệu biên lai..." sau 28 giây | `4.24-01…06` |
| 7.1 | Tải ảnh → Chọn ảnh từ máy → Tiếp tục → Phân tích | `vision/analyses` 201; job "Xếp hàng chờ xử lý…" (không có worker) | `7.1-01…04` |
| 7.2 | Tab "Bài giới thiệu" | Chỉ dùng ảnh đã nhận diện xong; chưa có ảnh nào → **phụ thuộc 7.1, cần AI thật** | `7.2-01` |

## Dữ liệu đã thay đổi trên DB local (không phải môi trường thật)

- Đơn `DH261111-38DJWJYA`: có ảnh thành phẩm, khách đã duyệt, đã giao ship và có ảnh người nhận.
- Bốn link mới cho "Khách thử biên lai" (`T01-GQ62QN1K`, `T01-N7MFA3BM`, `T01-RNDV7DB0`, `T01-3D6FJ3YB`) và hai đơn thử 480.000 đ.
- Tiệm Siin Store: bật VietQR với **tài khoản ngân hàng giả lập** (VCB, `0000000000`, "TIEM THU NGHIEM") để ô tải biên lai hiện ra. Không có ở môi trường thật.

## Phát hiện kèm (chưa sửa)

1. Khối "Thẩm định AI" trong hộp phê duyệt biên lai không thoát khỏi "Đang đọc dữ liệu biên lai..." khi AI không chạy được (chưa xác định là kẹt vô hạn hay chỉ chậm).
2. Ảnh QR trống trên local vì máy không ra được mạng tới dịch vụ sinh ảnh VietQR (cần kiểm trên môi trường có mạng).
3. Trang khách 390px: bong bóng chat che chữ tên ngân hàng; thanh tiến độ đè chữ hai khung giờ ("07:30–09:30" và "10:00–12:00").
4. Đầu trang Thẻ chào có một nút tròn trống chữ giữa "Hướng dẫn" và "Gửi nhanh" (có huy hiệu số) — cần kiểm như lỗi icon co ở nút Copilot.
