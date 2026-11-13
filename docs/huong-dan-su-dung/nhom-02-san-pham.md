# Nhóm 2 — Sản phẩm, mẫu & hình ảnh

9 chức năng: tạo và quản lý mẫu, phiên bản, công thức, nhập hàng loạt, khả dụng theo ngày, nội dung bán hàng.

---

## 2.1 Tạo sản phẩm mới

**Ai dùng:** Điều hành, Quản lý sản phẩm (người có quyền tạo sản phẩm).
**Mở ở:** Sản phẩm → **Tạo sản phẩm mới**, hoặc nút **Thêm sản phẩm** ở màn Danh mục sản phẩm.

1. **Thông tin chung:** tên sản phẩm, mã sản phẩm (để trống thì hệ thống tự tạo), phân loại, giá bán niêm yết, giá vốn dự kiến.
2. Chọn **dịp** phù hợp và **kích thước** ước tính (cao × rộng).
3. Chọn **kiểu dáng** để tính phí chế tác (xem 3.6).
4. **Công thức thành phần:** bấm **Thêm thành phần**, nhập tên nguyên liệu, số lượng, màu.
5. Thêm ảnh, mô tả, quy cách đóng gói. Lưu.

**Lưu ý:** mã đã có trong cửa hàng thì hệ thống báo trùng. Sản phẩm mới ở trạng thái **Bản nháp** cho tới khi mở bán.

## 2.2 Cập nhật sản phẩm

**Ai dùng:** người có quyền sửa sản phẩm.
**Mở ở:** Danh mục sản phẩm → bấm **Chi tiết** ở thẻ sản phẩm.

1. Sửa thông tin ở các khối: tổng quan, thiết kế, công thức, câu chuyện, khả dụng, phí chế tác.
2. Lưu. Thẻ Chào đang gửi cho khách hiện thông tin mới ngay; đơn khách đã đặt giữ nguyên thông tin lúc đặt.

## 2.3 Trạng thái sản phẩm

**Ai dùng:** Điều hành, Quản lý sản phẩm.

| Trạng thái | Ý nghĩa |
|---|---|
| Bản nháp | Đang soạn, chưa bán |
| Đang bán | Hiện trên Thẻ Chào và link khách |
| Tạm ngưng | Tạm không bán (hết nguyên liệu, hết mùa…), giữ nguyên dữ liệu |
| Đã lưu trữ | Ngừng bán lâu dài |

1. Đổi trạng thái một mẫu trong trang chi tiết.
2. Đổi nhiều mẫu cùng lúc: ở danh sách, tích chọn các mẫu, dùng thanh thao tác hàng loạt (ví dụ **Tạm ngưng**).
3. Mẫu đã có đơn không xoá hẳn được, chỉ lưu trữ. Xoá mẫu chưa có đơn: **Chuyển vào thùng rác** (chỉ Điều hành; khôi phục được trong
   30 ngày).

**Lưu ý:** mở bán mẫu chưa đủ điều kiện (ảnh, danh mục, giá/công thức, nội dung bán hàng đã duyệt) vẫn được, hệ thống hiện danh sách
còn thiếu để bổ sung (xem 7.3).

## 2.4 Phiên bản theo kích cỡ, màu

**Ai dùng:** Điều hành, Quản lý sản phẩm.
**Mở ở:** chi tiết sản phẩm → khối giá.

1. Chọn kiểu giá theo phiên bản; chọn nhóm đặc điểm (Kích cỡ, Màu, hoặc tự đặt tên nhóm) và các giá trị (Nhỏ, Vừa, Lớn, VIP…).
2. Bảng phiên bản hiện mọi tổ hợp. Nhập **Giá thường**, **Giá cao điểm** (để trống = như giá thường), **Số cành**, ảnh riêng nếu có.
   Có thể nhập **Giá chung** cho các ô còn trống và **% tăng giá ngày cao điểm**.
3. Lưu.

**Lưu ý:** ngày cao điểm là các ngày lễ cửa hàng đã khai (Cài đặt tiệm → tab Thẻ Chào & quy trình → Ngày lễ), có thể tính cả Thứ 7,
Chủ nhật. Khách chọn phiên bản khi đặt; thợ thấy đúng phiên bản và số cành trên phiếu việc. Giá vốn hiện tính theo công thức chung
của mẫu.

## 2.5 Công thức nguyên liệu

**Ai dùng:** Điều hành, Quản lý sản phẩm.
**Mở ở:** chi tiết sản phẩm → khối **Định mức vật tư & thành phần**, hoặc Kho & nguyên liệu → **Tính giá** → Công thức.

1. Thêm từng dòng: nguyên liệu, nhóm (chủ đạo, phụ, lá…), số lượng, đơn vị, màu.
2. Lưu. Có thể bấm **Dùng AI nhận diện** để lấy thành phần từ ảnh mẫu rồi sửa lại.

**Lưu ý:** công thức dùng để tính giá vốn (3.3), in phiếu thợ (4.9), đề xuất đổi thành phần cho khách (5.14).

## 2.6 Nhập danh mục từ Excel

**Ai dùng:** Điều hành, Quản lý sản phẩm.
**Mở ở:** Sản phẩm → **Nhập từ Excel & ảnh**.

1. Bấm **Tải file mẫu Excel**, điền danh sách sản phẩm và link ảnh.
2. Kéo thả tệp vào ô tải lên.
3. Xem trước: dòng lỗi (thiếu thông tin, trùng mã) được đánh dấu — sửa trong tệp rồi tải lại, hoặc bỏ qua dòng đó.
4. Bấm **Xác nhận nhập danh mục**.

## 2.7 Đề xuất sửa thông tin/giá và duyệt

**Ai dùng:** nhân viên gửi đề xuất; Điều hành duyệt.
**Mở ở:** chi tiết sản phẩm → khối đề xuất thay đổi.

1. Nhân viên sửa thông tin hoặc giá và gửi thành **đề xuất**. Thẻ sản phẩm hiện nhãn **Đề xuất · chờ duyệt**.
2. Điều hành mở đề xuất, xem giá trị cũ và mới, chọn **Duyệt** hoặc **Từ chối**.
3. Đề xuất không được xử lý trong thời hạn tự hết hạn.

**Lưu ý:** không ai tự duyệt đề xuất của chính mình.

## 2.8 Khả dụng và khoá theo ngày

**Ai dùng:** Điều hành, Quản lý sản phẩm.
**Mở ở:** chi tiết sản phẩm → khối **Cơ chế khả dụng & đặt hàng**; xem tổng ở Sản phẩm → **Khả dụng & lịch**.

1. Chọn chế độ khả dụng của mẫu.
2. Thêm **ngày không nhận đơn** (ví dụ ngày nghỉ, ngày hết nguyên liệu). Lưu.
3. Khách chọn giao vào ngày đã khoá thì hệ thống báo mẫu không nhận đơn ngày đó và mời chọn ngày khác.

**Lưu ý:** mẫu vẫn hiện trong danh sách trên link; chỉ khi khách chọn đúng ngày bị khoá mới bị chặn.

## 2.9 Nội dung tư vấn bán hàng

**Ai dùng:** Điều hành, Marketing, Quản lý sản phẩm (soạn, duyệt); Sale (dùng).
**Mở ở:** chi tiết sản phẩm → khối **Câu chuyện & thông điệp sản phẩm**.

1. Bấm **Tạo câu chuyện sản phẩm với AI**, hoặc tự viết: tiêu đề ngắn, điểm nổi bật, câu chuyện, từ khoá tìm kiếm.
2. Sửa lại, xem so sánh bản AI và bản đã sửa, rồi duyệt.
3. Sale mở **Tư vấn bán hàng** để sao chép kịch bản gửi khách.

**Lưu ý:** tạo bằng AI trừ credit; lỗi thì credit được hoàn.
