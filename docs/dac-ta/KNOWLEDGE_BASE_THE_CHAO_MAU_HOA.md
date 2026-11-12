# CẨM NANG TRI THỨC VẬN HÀNH THẺ CHÀO MẪU HOA (SSOT KNOWLEDGE BASE)

> **Tài liệu chuẩn mực (Single Source of Truth - SSOT)** về toàn bộ các tình huống nghiệp vụ thực tế, quy trình thao tác và hướng dẫn xử lý cho mọi vai trò (Điều hành, Sale, Điều phối, Khách hàng) trong chức năng **Thẻ Chào Mẫu Hoa (Greeting Card / Brochure Order & Tracking)** của nền tảng ALG.

---

## 1. TỔNG QUAN HỆ THỐNG & CHU TRÌNH NGHIỆP VỤ KHÉP KÍN

Chức năng **Thẻ Chào Mẫu Hoa** là giải pháp bán hàng đa kênh hiện đại, giúp tiệm hoa gửi bộ sưu tập mẫu hoa cho khách lướt chọn trên điện thoại, tự động tạo đơn, thanh toán chuyển khoản VietQR và theo dõi tiến độ đơn hàng theo thời gian thực.

### Chuỗi tác vụ chuẩn mực 9 bước:
1. **Bước 1 — Mở link (`STEP_1_OPENED`):** Khách hàng mở link chào hàng do nhân viên Sale gửi hoặc quét mã QR.
2. **Bước 2 — Chọn mẫu (`STEP_2_CHOOSING`):** Khách lướt xem các mẫu hoa trong bộ sưu tập và chọn mẫu ưng ý.
3. **Bước 3 — Nhập Form (`STEP_3_FILLING_FORM`):** Khách điền thông tin người đặt, người nhận, địa chỉ, chọn khung giờ giao và ghi lời chúc thiệp mừng. Khách xác nhận đồng ý với Cam kết & Thỏa thuận của cửa hàng.
4. **Bước 4 — Đã thanh toán (`STEP_4_PAYMENT_PENDING`):** Khách quét mã VietQR chuyển khoản và bấm nút *"Tôi đã chuyển khoản thanh toán"*.
5. **Bước 5 — Xác nhận TT (`STEP_5_PAYMENT_CONFIRMED`):** Điều hành kiểm tra tài khoản ngân hàng và bấm *"Xác nhận tiền về"* trên hệ thống. Nút *"Theo dõi tiến độ"* trên điện thoại khách hàng lập tức được kích hoạt.
6. **Bước 6 — Đang cắm hoa (`STEP_6_ARRANGING`):** Đơn tự động chuyển sang bảng Điều phối; xưởng phân công thợ hoa bắt đầu thực hiện tác phẩm.
7. **Bước 7 — Đã cắm xong & QC (`STEP_7_READY_QC`):** Xưởng chụp ảnh hoa thành phẩm tải lên hệ thống. Khách nhận thông báo kèm đồng hồ đếm ngược 10 phút để duyệt ảnh trước khi giao.
8. **Bước 8 — Đang giao (`STEP_8_DELIVERING`):** Bàn giao hoa cho shipper giao đến địa chỉ người nhận.
9. **Bước 9 — Hoàn tất (`STEP_9_COMPLETED`):** Shipper chụp ảnh giao hoa tận tay thành công. Màn hình khách hàng chuyển sang **Màn hình Cảm ơn** trang trọng với 3 nút tác vụ: *Xem lại thông tin đơn*, *Theo dõi tiến độ* và *Đặt đơn mới*.

---

## 2. HƯỚNG DẪN DÀNH CHO VAI TRÒ ĐIỀU HÀNH / KẾ TOÁN

### A. Quản trị thanh toán & Cổng kiểm soát tiền về
- **Nguyên tắc cổng thanh toán (Payment Gate Blocker):** Khi khách bấm *"Tôi đã chuyển khoản thanh toán"*, nút *"Theo dõi tiến độ"* của khách vẫn ở trạng thái **vô hiệu hóa (deactivated)** để chống gian lận chưa chuyển tiền đã đòi giao hoa.
- **Quy trình duyệt tiền:**
  1. Vào tab **Điều hành** trên trang Thẻ Chào (`/the-chao`).
  2. Rà soát danh sách đơn đang chờ xác nhận thanh toán (đối chiếu mã đơn, số tiền chuyển khoản trên app ngân hàng).
  3. Bấm **"Xác nhận tiền về"**. Khi hoàn tất, hệ thống tự động:
     - Ghi nhận trạng thái thanh toán của đơn (`PAID` hoặc `DEPOSIT_PAID`).
     - Kích hoạt nút *"Theo dõi tiến độ"* trên màn hình điện thoại của khách hàng.
     - Chuyển đơn vào hàng đợi công việc của xưởng cắm hoa.

### B. Xử lý Đề xuất Hủy đơn & Hoàn tiền
- Sale hoặc Điều phối chỉ có quyền gửi **Đề xuất Hủy / Hoàn tiền** kèm lý do cụ thể.
- Điều hành nhận thông báo và là người có thẩm quyền cao nhất phê duyệt (**Approve / Reject**).
- Chỉ sau khi Điều hành duyệt, trạng thái đơn mới cập nhật và số tiền hoàn mới được ghi nhận vào sổ quỹ.

### C. Giải quyết Khiếu nại / Tranh chấp bằng Sơ đồ Milestones
- Khi khách hàng thắc mắc hoa sai mẫu, giao trễ, hoặc tiền chưa nhận:
  1. Mở Pop-up **Chi tiết Đơn hàng** → Chọn tab **"Sơ đồ Lịch sử Milestones"**.
  2. Hệ thống hiển thị minh bạch toàn bộ các mắt xích kèm timestamp chính xác từng giây:
     - Thời điểm khách chọn mẫu & đồng ý Thỏa thuận thay hoa lúc đặt.
     - Thời điểm khách chuyển khoản & Điều hành xác nhận tiền về.
     - Ảnh hoa thành phẩm + thời điểm khách bấm duyệt hoặc tự động duyệt sau 10 phút.
     - Ảnh shipper giao hoa tận tay cho người nhận.
  3. Bấm nút **"Sao chép tóm tắt đối soát"** để chép toàn bộ văn bản chứng cứ gửi qua Zalo cho khách hàng.

---

## 3. HƯỚNG DẪN DÀNH CHO NHÂN VIÊN BÁN HÀNG (SALE)

### A. Tạo & Cá nhân hóa Link chào mẫu hoa
- Vào tab **Bộ sưu tập** hoặc tab **Bán hàng** → Bấm **"Tạo Thẻ Chào Mới"**.
- Chọn bộ sưu tập mẫu phù hợp với nhu cầu khách (Sinh nhật, Khai trương, Tình yêu...).
- Bấm **"Sao chép link gửi khách"**. Link được tự động gắn **Mã nhân viên phụ trách** của bạn để đảm bảo ghi nhận doanh số và hoa hồng.

### B. Theo dõi khách trên Bảng Kanban 9 bước
- Bảng Kanban của Sale phản ánh đúng 9 bước chuẩn của toàn bộ hành trình khách hàng.
- **Mốc thời gian giao hàng to rõ:** Mỗi thẻ đơn hiển thị rõ khung giờ giao hẹn trước (ví dụ: `⏰ 10:00 - 12:00 | Hôm nay`) và được sắp xếp ưu tiên theo mốc giờ giao sớm nhất để bạn tiện theo dõi.
- **Click vào thẻ đơn mở Pop-up chi tiết:** Cho phép bạn xem toàn bộ thông tin người đặt, người nhận, số điện thoại, địa chỉ cụ thể, lời chúc trên thiệp mừng và mẫu hoa khách đã chọn mà không cần hỏi lại khách.
- **Chủ động hỗ trợ khách kẹt:**
  - Cột có huy hiệu đỏ *"Cần bạn"* thể hiện các khách đang dừng lại quá lâu (khách mở link chưa chọn, bỏ dở điền form, chưa chuyển khoản).
  - Bấm nút **"Gọi"** hoặc **"Zalo"** ngay trên thẻ đơn để liên hệ tư vấn và hỗ trợ khách tức thì.

---

## 4. HƯỚNG DẪN DÀNH CHO ĐIỀU PHỐI & XƯỞNG CẮM HOA

### A. Quản trị Bảng Kanban Xưởng
- Bảng Kanban Điều phối phân thành 6 cột công đoạn: *Chờ xử lý → Đã phân công → Đang cắm → Đã cắm xong → Đang giao → Đã giao*.
- **Sắp xếp ưu tiên thời gian giao hàng:** Các đơn hàng cần giao sớm nhất trong ngày tự động được đẩy lên đầu cột để thợ hoa cắm trước, tránh nguy cơ trễ hẹn SLA.
- Nhấp vào thẻ đơn để xem chi tiết mẫu hoa, ảnh chụp thực tế, ghi chú kỹ thuật cắm hoa và nội dung thiệp mừng.

### B. Nghiệm thu Ảnh Thành phẩm & Cơ chế Bỏ qua duyệt ảnh
- Khi hoa cắm hoàn thiện, bấm nút **"Ảnh TP"** trên thẻ đơn để chụp và tải ảnh hoa lên hệ thống.
- **Trường hợp có tải ảnh:** Hệ thống gửi ảnh ngay lập tức đến link theo dõi của khách hàng kèm **đồng hồ đếm ngược 10 phút**.
  - *Nếu khách bấm đồng ý:* Đơn hoàn tất duyệt ngay, mở cổng thu tiền Đợt 2.
  - *Nếu khách không phản hồi sau 10 phút:* Hệ thống **tự động xác nhận (Auto-approved)** để xưởng kịp thu tiền và giao ship.
- **Trường hợp không tải ảnh (Bỏ qua duyệt ảnh):**
  - Nếu tiệm/xưởng không tải ảnh thành phẩm lên (đơn gấp, khách quen, hoặc không áp dụng gửi ảnh), ngay khi hoa chuyển sang trạng thái **Đã cắm xong (`READY`)**, hệ thống tự động **bỏ qua bước chờ duyệt ảnh** và mở ngay nút **"Thu lần 2"** trên bảng Điều hành.

### C. Quyền Quyết Định Thu Tiền & Giao Ship của Điều Phối
- **Quyền quyết định thuộc về Điều hành & Điều phối:** 
  - Kể cả khi khách **chưa thanh toán lần 2**, **chưa gửi ảnh bill**, hoặc khách thanh toán riêng ngoài hệ thống (tiền mặt, COD cho shipper thu, chuyển khoản trực tiếp cho chủ tiệm):
  - Điều phối có nút **"Xác nhận thu đủ (Lần 2)"** trực tiếp trên thẻ đơn ở tab Điều phối.
  - Khi Điều phối hoặc Điều hành bấm xác nhận, hệ thống ghi nhận đã thu đủ tiền và **mở khóa ngay nút "Giao Ship"** để phân công tài xế chuyển hoa đi đúng giờ hẹn, không bị ách tắc quy trình giao vận.

### D. Xử lý Tình huống Khẩn cấp (Giao gấp bỏ qua ảnh)
- Trong trường hợp khách đặt gấp, hoa cần chuyển đi ngay cho sự kiện bắt đầu:
- Điều phối có thể bấm nút **"Bỏ qua ảnh sản phẩm hoàn thiện"** để chuyển thẳng sang bước giao hàng.
- Hệ thống ghi nhận trạng thái *"Skipped"* một cách minh bạch trong lịch sử đơn.

### E. Bàn giao Shipper & Nghiệm thu Người nhận
- Bấm **"Giao Ship"** để cập nhật thông tin tài xế và số điện thoại liên hệ.
- Khi giao hoa thành công, tài xế chụp ảnh người nhận tươi cười nhận hoa và Điều phối tải lên mục **"Ảnh nhận"**.
- Đơn hàng chuyển sang trạng thái Hoàn tất, lưu trữ vĩnh viễn làm bằng chứng đối soát.

---

## 5. HƯỚNG DẪN TRẢI NGHIỆM KHÁCH HÀNG (CUSTOMER EXPERIENCE)

1. **Khách lướt xem mẫu hoa:** Giao diện điện thoại vuốt chạm mượt mà, xem giá và thông số hoa rõ ràng.
2. **Điền form đặt hoa & Cam kết:** Chọn khung giờ giao hoa, điền địa chỉ, ghi thiệp mừng và tick đồng ý Thỏa thuận chất lượng của cửa hàng.
3. **Thanh toán VietQR:** Quét mã ngân hàng thanh toán nhanh chóng. Dưới nút *"Tôi đã chuyển khoản thanh toán"* có nút *"Theo dõi tiến độ đơn hàng"* ở trạng thái chờ mở khóa.
4. **Kích hoạt theo dõi tiến độ:** Ngay khi cửa hàng nhận được tiền, nút Theo dõi tiến độ lập tức sáng lên, đưa khách vào màn hình cập nhật hành trình hoa theo thời gian thực.
5. **Duyệt ảnh hoa trước khi giao:** Khách xem ảnh hoa thực tế do xưởng chụp và bấm xác nhận hài lòng trong vòng 10 phút.
6. **Màn hình Cảm ơn sau hoàn tất:** Sau khi hoa giao thành công, khách nhận màn hình Cảm ơn trang trọng với 3 nút:
   - 🔍 **Xem lại thông tin đơn hàng**: Mở lại chi tiết hoa, thiệp chúc và địa chỉ.
   - 🚚 **Theo dõi tiến độ**: Xem lại ảnh hoa thành phẩm và ảnh giao hoa làm kỷ niệm.
   - 🌸 **Đặt đơn mới**: Đưa khách về lại bộ sưu tập để tiếp tục đặt hoa tặng bạn bè, người thân.
