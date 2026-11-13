# Nhóm 10 — Credit, hạn mức, thuê bao & tên miền

8 chức năng. **Credit** là đơn vị chung trừ khi dùng AI và gửi tin nhắn cho khách.

---

## 10.1 Xem số dư và lịch sử dùng credit

**Ai dùng:** Điều hành, Kế toán.
**Mở ở:** Quản trị tiệm → **Sổ quỹ & thu chi** (`/muc-dung`) — **Sắp ra mắt** trên bản chính thức.

Màn hiện **Số dư credit khả dụng**, **Bảng phân bổ chi phí credit theo phân hệ** (số lượt, credit tiêu thụ) và **Lịch sử giao dịch sử
dụng credit gần nhất**. Chọn **Xem theo tháng** để xem từng tháng.

## 10.2 Hoàn credit khi tác vụ lỗi

Tự động. Tác vụ AI lỗi được hoàn 100% credit; dòng hoàn hiện trong lịch sử giao dịch.

## 10.3 Hạn mức dùng

- **Cửa hàng (Điều hành):** ở `/muc-dung`, khối hạn mức tháng — xem **Tổng credit trong tháng**, **Credit AI trong tháng**; nhập **Trần credit
  AI mỗi tháng** (để trống = không giới hạn), bấm **Lưu trần AI**. Dùng tới 80% có thông báo; chạm hạn mức thì tác vụ dùng credit tạm dừng
  tới tháng sau.
- **Console (đội vận hành):** chi tiết tổ chức → khối Credit → **Hạn mức credit mỗi tháng** → **Lưu hạn mức**. Trang tổng Console → **Quy
  đổi credit**: số credit mỗi tin SMS/Zalo, tỷ giá, giá trị credit, hạn mức mặc định, mức âm tối đa cho tin nhắn.
- **Tin nhắn cho khách:** hết credit vẫn gửi trong mức âm cho phép (mặc định 50 credit) và Điều hành được báo; vượt mức thì ngừng gửi tới khi
  nạp thêm.

## 10.4 Chi phí thật và biên lợi nhuận

**Ai dùng:** đội vận hành nền tảng.
**Mở ở:** Console → **Biên lợi nhuận**.

Chọn kỳ báo cáo; bảng theo tổ chức: credit đã dùng, doanh thu (credit quy ra tiền), chi phí (AI thật, tin nhắn), biên và tỷ lệ; dòng tổng.

## 10.5 Cảnh báo credit thấp

Tự động. Điều hành nhận thông báo khi số dư còn dưới 20% lần nạp gần nhất, hoặc khi dùng tới 80% hạn mức tháng / trần AI. Mỗi kỳ báo một lần.

## 10.6 Nạp, tặng, hoàn credit

**Ai dùng:** đội vận hành nền tảng.
**Mở ở:** Console → **Tổ chức** → mở cửa hàng → khối **Credit**.

1. Chọn **Nạp**, **Tặng** hoặc **Hoàn**; nhập **Số credit** và **Lý do**; bấm **Ghi**.
2. Cửa hàng chuyển khoản mua credit: dùng **Mã VietQR nạp**; xác nhận chuyển khoản ghi khoản nạp.
3. Sổ credit hiện 20 dòng gần nhất: loại, lý do, thời điểm, số credit, số dư sau. Mọi lần nạp, tặng, hoàn, dùng đều ghi vào sổ.

## 10.7 Gói thuê bao và thanh toán

**Đội vận hành nền tảng:**

1. Console → **Tài khoản nhận tiền thuê bao**: khai ngân hàng, số tài khoản, chủ tài khoản. Lưu.
2. Console → Tổ chức → mở cửa hàng → **Gói thuê bao**: chọn gói, chu kỳ, giá mỗi kỳ, credit tặng mỗi tháng; lưu. Hoá đơn kỳ đầu được tạo.
3. Khách chuyển khoản theo VietQR (nội dung là mã hoá đơn). Khi đã kết nối SePay, hoá đơn tự chuyển **Đã thu**; nếu chưa, bấm xác nhận đã
   nhận tiền kèm ghi chú.

**Cửa hàng (Điều hành):** ở `/muc-dung`, khối gói thuê bao hiện gói, kỳ hiện tại, hoá đơn và mã VietQR. Hệ thống nhắc gia hạn trước 7 ngày
và 1 ngày.

**Quá hạn thanh toán:** tài khoản chuyển **chỉ xem** — xem được dữ liệu, không thao tác được; link Thẻ Chào/catalog ngừng nhận đơn. Thanh
toán hoá đơn để mở lại ngay.

## 10.8 Tên miền riêng

**Ai dùng:** chỉ Điều hành (cửa hàng); đội vận hành nền tảng (khoá/mở).
**Mở ở:** Cài đặt tiệm → tab **12. Tên miền riêng**.

1. Nhập tên miền (ví dụ `hoa.tiemcuaban.vn`), bấm **Thêm tên miền**. Mỗi cửa hàng gắn tối đa 3 tên miền.
2. Bấm **Hướng dẫn DNS**, vào nơi quản lý tên miền (nhà cung cấp tên miền) và thêm hai bản ghi:
   - **TXT** — tên `_smeos-verify.<tên miền>`, giá trị như màn hiện (chứng minh cửa hàng sở hữu tên miền);
   - **CNAME** — tên miền trỏ về máy chủ như màn hiện.
3. Chờ bản ghi có hiệu lực (có thể vài giờ), bấm **Kiểm tra**. Đúng thì trạng thái chuyển **Đang hoạt động**; chứng chỉ HTTPS được cấp tự động.
4. Khách mở tên miền của cửa hàng sẽ thấy trang cửa hàng, bộ sưu tập, Thẻ Chào, landing page của chính cửa hàng. Trang đăng nhập và quản trị
   không mở trên tên miền riêng.
5. Không dùng nữa: bấm **Gỡ**, xác nhận.

**Đội vận hành nền tảng:** Console → Tổ chức → mở cửa hàng → khối **Tên miền riêng**. Ghi **Lý do khoá** (ít nhất 5 ký tự) → **Khoá**: tên
miền ngừng mở trang ngay, cửa hàng không tự gỡ được. **Mở lại**: tên miền về **Chờ xác minh**, cửa hàng bấm **Kiểm tra** lại.

**Lưu ý:** trạng thái "Đội vận hành đang cấp chứng chỉ HTTPS" nghĩa là hệ thống chưa được cấu hình tự cấp chứng chỉ; đội vận hành sẽ hoàn
tất thủ công.
