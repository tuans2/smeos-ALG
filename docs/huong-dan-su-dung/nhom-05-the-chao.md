# Nhóm 5 — Thẻ Chào & trang khách hàng

15 chức năng. **Thẻ Chào** là bộ sưu tập mẫu cửa hàng gửi khách qua link: khách xem trên điện thoại, thả tim, hỏi tư vấn, đặt hàng,
trả tiền và theo dõi đơn — không cần cài ứng dụng.

**Mở ở:** Công cụ → **Thẻ chào sản phẩm** (`/the-chao`). Hai chế độ:

- **Gửi nhanh** — 3 bước: chọn bộ sưu tập → nhập khách → lấy link.
- **Quản lý** — các tab **Bộ sưu tập**, **Theo dõi đơn**, **Bán hàng**, **Điều hành**, **Điều phối**.

---

## 5.1 Tạo bộ sưu tập

**Ai dùng:** Điều hành, Sale (theo quyền).

1. Chế độ **Quản lý** → tab **Bộ sưu tập** → **Tạo bộ sưu tập**.
2. Chọn **Loại**: **Tiêu chuẩn (dùng chung)** cho mọi khách, hoặc **Riêng theo khách**.
3. Nhập **Mã nhận dạng** (ví dụ `20-10-basic`, `valentine-2027`), mô tả nội bộ. Lưu.
4. Mở bộ sưu tập → **Thêm mẫu**, tìm và chọn mẫu.
5. Không dùng nữa: **Ẩn bộ sưu tập** (khôi phục được).

## 5.2 Gửi link mang tên bạn

**Ai dùng:** Sale.

- **Gửi riêng một khách:** chế độ **Gửi nhanh** → chọn bộ sưu tập → nhập tên khách (ví dụ "Anh Minh"), số điện thoại (không bắt buộc) →
  lấy link, dán vào Zalo / Messenger / tin nhắn.
- **Link dùng chung:** ở thẻ bộ sưu tập, bấm **Sao chép link mang tên bạn**, chọn kênh (hoặc không chọn kênh).

Khách đặt từ link được tính cho bạn.

## 5.3 Thời hạn và thu hồi link

- **Thời hạn:** Điều hành đặt **Thời hạn link gửi khách** (số giờ link dùng được) ở Cài đặt tiệm → tab **8. Thẻ Chào & quy trình**.
- **Thu hồi:** tab **Bán hàng** → bảng khách → ở dòng khách bấm **Thu hồi link**. Link hiện **Đã thu hồi**; khách mở sẽ không xem được
  nữa. Link quá hạn hiện **Đã hết hạn**.

## 5.4 Ảnh ghép và mã QR

1. Ở thẻ bộ sưu tập, bấm **Tải ảnh catalog để đăng lên Zalo/Facebook**.
2. Ảnh ghép 3–4 mẫu đầu (nhiều hơn thì hiện "+N") kèm mã QR mở đúng link.
3. Dán link vào Zalo/Facebook cũng tự hiện ảnh ghép này làm ảnh xem trước.

## 5.5 Ẩn/hiện giá, giảm giá, thành phần

**Ai dùng:** Điều hành.
**Mở ở:** chế độ **Gửi nhanh** → bước chọn bộ sưu tập → khối **Giao diện khách xem** → cài đặt hiển thị.

1. Phần **Giá và ưu đãi · áp dụng cho mọi mẫu của cửa hàng**:
   - **Giá tiền** tắt → khách thấy "Liên hệ báo giá"; khách vẫn đặt được, cửa hàng báo giá sau (đơn hiện **Chờ báo giá**).
   - **Thông tin giảm giá** tắt → khách không thấy ưu đãi; đơn không áp ưu đãi.
   - **Mã cảm ơn sau đơn hoàn tất** và **Mức giảm (%)** — xem 5.15.
2. Thành phần của từng mẫu bật/tắt riêng trong cùng hộp cài đặt.

## 5.6 Theo dõi khách theo từng bước

**Ai dùng:** Sale, Điều hành.
**Mở ở:** tab **Bán hàng** (**Khách của tôi**) hoặc tab **Theo dõi đơn** → cách xem **Kanban**.

Mỗi khách nằm ở một cột theo bước: đã gửi, đã mở, đang xem, đã chọn, đã đặt, đã trả tiền. Bảng tự cập nhật mỗi 30 giây; khách cần
nhắc được đưa lên đầu.

## 5.7 Hộp việc hôm nay

**Ai dùng:** mọi vai làm việc với Thẻ Chào.

Hộp việc liệt kê việc cần làm ngay: khách báo đã chuyển tiền, đơn chờ xác nhận, đơn sắp trễ, giao không thành công, thiếu thông tin…
Việc gấp lên đầu. Bấm **Xử lý** để mở đúng tab và đúng đơn. Điều hành chọn **Góc nhìn vai trò** để xem hộp việc của vai khác.

## 5.8 Sale được xem khách nào

**Ai dùng:** Điều hành.
**Mở ở:** Cài đặt tiệm → tab **8. Thẻ Chào & quy trình** → **Sale được xem khách nào**.

Chọn cho từng Sale: chỉ khách của mình, hoặc mọi khách; đặt **mặc định cho Sale mới**. Điều hành, Điều phối, giao hàng, kế toán luôn
thấy tất cả.

## 5.9 Khách xem mẫu: vuốt, thả tim, lọc màu

**Ai dùng:** khách mua.

Khách mở link, vuốt qua từng mẫu, lọc theo **tông màu** và **khoảng giá**, thả tim mẫu thích. Cửa hàng xem mẫu được thả tim trong
bộ sưu tập.

## 5.10 Khách đặt hàng ngay trên link

1. Khách chọn mẫu → chọn phiên bản (kích cỡ, màu) → ngày, khung giờ, khu vực giao.
2. Nhập người đặt, người nhận, địa chỉ, lời thiệp.
3. Xem báo giá, tiền cọc, xác nhận đặt → chuyển khoản theo mã VietQR (4.23).

## 5.11 Nút "Nhắn tư vấn mẫu này"

Khách bấm ở mẫu đang xem để gửi câu hỏi; câu hỏi đến cửa hàng kèm mã mẫu, Sale trả lời đúng mẫu khách hỏi.

## 5.12 Trang theo dõi đơn của khách

Khách mở link theo dõi để xem tiến độ (đã nhận, đang làm, đã xong, đang giao, đã giao), ảnh thành phẩm, ảnh giao. Người không chứng minh
được là người đặt chỉ thấy thông tin rút gọn.

## 5.13 Khách duyệt ảnh thành phẩm trong 10 phút

1. Cửa hàng tải ảnh thành phẩm lên đơn.
2. Khách nhận yêu cầu duyệt ảnh, có 10 phút để đồng ý hoặc góp ý; hết giờ coi như đồng ý.
3. Đổi số phút cho một bộ sưu tập: mở bộ sưu tập → **Chính sách & cam kết áp dụng cho bộ sưu tập** → **Thời gian khách duyệt ảnh hoàn thiện (phút)**.

## 5.14 Đề xuất đổi thành phần khi thiếu nguyên liệu

**Ai dùng:** Điều phối, Sale (người có quyền đề xuất); khách duyệt.

1. Mở đơn → đề xuất đổi. Chọn dòng thành phần phụ cần đổi (thành phần chủ đạo không đổi ở đây — đề xuất đổi cả mẫu).
2. Nhập tên thành phần thay thế, màu, **chụp ảnh** thành phần thay thế, ghi lý do. Gửi.
3. Khách thấy đề xuất trên trang theo dõi, chọn **đồng ý** hoặc **không đồng ý**, có thể ghi chú.
4. Đồng ý → công thức của đơn tự đổi đúng dòng đó, tổng tiền giữ nguyên, thợ thấy ghi chú. Không đồng ý → cửa hàng liên hệ khách
   trước khi làm.

**Lưu ý:** mỗi đơn chỉ một đề xuất chờ khách trả lời; đơn đã giao shipper thì không đề xuất được.

## 5.15 Màn cảm ơn và mã giảm cho lần sau

1. Điều hành bật **Mã cảm ơn sau đơn hoàn tất** và đặt **Mức giảm (%)** trong cài đặt hiển thị (5.5).
2. Đơn hoàn tất → trang của khách hiện lời cảm ơn và một **mã giảm dùng một lần** riêng cho khách đó.
3. Khách đồng ý lưu thông tin người đặt trên máy để lần sau không nhập lại; bấm đặt thêm để đặt đơn mới.
