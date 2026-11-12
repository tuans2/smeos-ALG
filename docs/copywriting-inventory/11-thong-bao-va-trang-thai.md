# BẢN ĐỒ NỘI DUNG UI — 11. THÔNG BÁO, TRẠNG THÁI & HỘP THOẠI TOÀN HỆ THỐNG

> **Phân hệ**: Toàn bộ hệ thống ALG  
> **Mã phân hệ**: `COMMON`  
> **Mục đích**: Chuẩn hóa 100% microcopy cho Toast thông báo, Kiểm tra lỗi ô nhập liệu, Hộp thoại xác nhận nguy hiểm và Trạng thái AI.  
> **Trạng thái**: Đã chuẩn hóa theo Tiêu chuẩn SaaS Enterprise & Từ điển SSOT.

---

## 1. Thông báo kết quả nổi (Toast Notifications — `MSG`)

| Mã Copy | Loại | Tình huống kích hoạt | Nội dung chuẩn hóa hiển thị | Ghi chú ngữ cảnh |
| :--- | :--- | :--- | :--- | :--- |
| `MSG-OK-01`  | `MSG` | Lưu thành công form | `Đã lưu thay đổi thành công.` | Toast xanh lá |
| `MSG-OK-02`  | `MSG` | Sao chép link | `Đã sao chép link đặt hoa vào bộ nhớ tạm.` | Toast xanh lá |
| `MSG-OK-03`  | `MSG` | Sao chép kịch bản tư vấn | `Đã sao chép kịch bản tư vấn.` | Toast xanh lá |
| `MSG-OK-04`  | `MSG` | Khôi phục từ thùng rác | `Đã khôi phục mẫu hoa về kho chính.` | Toast xanh lá |
| `MSG-OK-05`  | `MSG` | Chuyển vào thùng rác | `Đã chuyển mẫu hoa vào thùng rác.` | Toast thông tin |
| `MSG-OK-06`  | `MSG` | Tạo đơn hàng mới | `Đã tạo đơn hàng mới thành công.` | Toast xanh lá |
| `MSG-OK-07`  | `MSG` | Tải lại dữ liệu | `Đã làm mới dữ liệu.` | Toast trung tính |
| `MSG-ERR-01` | `MSG` | Gián đoạn kết nối mạng | `Mất kết nối mạng. Vui lòng kiểm tra đường truyền và thử lại.` | Toast đỏ cảnh báo |
| `MSG-ERR-02` | `MSG` | Lỗi máy chủ / Timeout | `Chưa hoàn tất được thao tác do lỗi hệ thống. Vui lòng thử lại sau ít phút.` | Toast đỏ |
| `MSG-ERR-03` | `MSG` | Hết phiên đăng nhập | `Phiên làm việc đã hết hạn. Vui lòng tải lại trang hoặc đăng nhập lại.` | Toast đỏ |

---

## 2. Kiểm tra dữ liệu tại từng ô nhập liệu (Field Validation — `ERR`)

| Mã Copy | Loại | Quy tắc kiểm tra | Nội dung thông báo lỗi dưới ô nhập | Ghi chú |
| :--- | :--- | :--- | :--- | :--- |
| `ERR-VAL-01` | `ERR` | Trường bắt buộc để trống | `Vui lòng nhập thông tin này.` | Hiện đỏ dưới ô input |
| `ERR-VAL-02` | `ERR` | Số điện thoại sai định dạng | `Số điện thoại không hợp lệ (cần đủ 10 chữ số).` | Kiểm tra regex SĐT VN |
| `ERR-VAL-03` | `ERR` | Đơn giá âm hoặc bằng 0 | `Đơn giá phải lớn hơn 0 ₫.` | Kiểm tra giá trị số |
| `ERR-VAL-04` | `ERR` | Mã mẫu hoa bị trùng | `Mã mẫu hoa này đã tồn tại trong cửa hàng. Vui lòng chọn mã khác.` | Kiểm tra trùng SKU |
| `ERR-VAL-05` | `ERR` | File vượt quá dung lượng | `Dung lượng file vượt quá giới hạn (tối đa 10 MB).` | Kiểm tra file upload |
| `ERR-VAL-06` | `ERR` | Định dạng file không hợp lệ | `Định dạng file không được hỗ trợ. Vui lòng chọn file JPG, PNG hoặc WebP.` | Kiểm tra đuôi file |
| `ERR-VAL-07` | `ERR` | Tỷ lệ cọc không hợp lệ | `Vui lòng chọn tỷ lệ cọc 50% hoặc 100%.` | Cấu hình cọc |

---

## 3. Hộp thoại xác nhận hành động nguy hiểm (Destructive Modals — `CFM`)

| Mã Copy | Loại | Thao tác nguy hiểm | Tiêu đề hộp thoại (`title`) | Nội dung giải thích (`description`) | Nút xác nhận (`confirm`) | Nút hủy (`cancel`) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `CFM-DEL-01` | `CFM` | Chuyển thùng rác | `Chuyển “{{name}}” vào thùng rác?` | `Mẫu hoa sẽ bị ẩn khỏi danh sách bán và bộ sưu tập. Bạn có thể khôi phục trong Thùng rác trong vòng 30 ngày.` | `Chuyển vào thùng rác` | `Hủy` |
| `CFM-DEL-02` | `CFM` | Xóa vĩnh viễn tài nguyên | `Xóa vĩnh viễn “{{name}}”?` | `Mục này sẽ bị xóa hoàn toàn khỏi kho lưu trữ và không thể khôi phục lại được. Bạn có chắc chắn muốn xóa?` | `Xóa vĩnh viễn` | `Hủy` |
| `CFM-USR-01` | `CFM` | Khóa tài khoản thành viên | `Khóa tài khoản của “{{name}}”?` | `Thành viên này sẽ không thể đăng nhập vào hệ thống của cửa hàng cho đến khi bạn mở khóa lại.` | `Khóa tài khoản` | `Hủy` |
| `CFM-IMP-01` | `CFM` | Bắt đầu lại phiên nhập Excel | `Bắt đầu lại phiên nhập từ đầu?` | `Toàn bộ file Excel và ảnh mẫu hoa đã tải lên trong phiên làm việc này sẽ bị xóa bỏ.` | `Đồng ý bắt đầu lại` | `Tiếp tục nhập` |
| `CFM-ORD-01` | `CFM` | Hủy đơn hàng | `Hủy đơn hàng “{{orderCode}}”?` | `Đơn hàng này sẽ chuyển sang trạng thái Đã hủy và dừng mọi tiến độ cắm hoa, giao vận.` | `Xác nhận hủy đơn` | `Đóng` |

---

## 4. Tiến trình phân tích AI & Ghi chú minh bạch (AI Microcopy — `PRG`)

| Mã Copy | Loại | Vị trí hiển thị | Nội dung hiển thị | Ghi chú ngữ cảnh |
| :--- | :--- | :--- | :--- | :--- |
| `PRG-AI-01` | `HDR` | Đang đọc ảnh hoa | `Đang quan sát hình ảnh mẫu hoa…` | Bước 1 quét ảnh |
| `PRG-AI-02` | `HDR` | Đang nhận diện hoa | `Đang nhận diện loài hoa và số lượng cành…` | Bước 2 quét ảnh |
| `PRG-AI-03` | `HDR` | Đang soạn nội dung | `Đang soạn kịch bản tư vấn và thông điệp cảm xúc…` | Bước 3 quét ảnh |
| `PRG-AI-04` | `LBL` | Nhãn minh bạch AI | `Nội dung do trợ lý AI gợi ý. Bạn có thể tùy chỉnh trực tiếp trước khi gửi khách.` | Ghi chú an toàn dưới kết quả |
| `PRG-AI-05` | `ERR` | Lỗi ảnh mờ / tối | `Ảnh quá mờ hoặc thiếu sáng để nhận diện chính xác. Hãy chụp lại ở nơi đủ sáng và góc chụp rõ hơn.` | Khi AI không đọc được ảnh |
| `PRG-AI-06` | `ERR` | Lỗi không thấy hoa | `Không phát hiện hoa trong ảnh. Vui lòng tải lên ảnh chụp hoa tươi thực tế.` | Khi ảnh sai chủ đề |

---

## 5. Trạng thái rỗng chuẩn hóa (Empty States — `EMP`)

| Mã Copy | Loại | Vị trí hiển thị | Tiêu đề trạng thái rỗng (`title`) | Mô tả chi tiết (`description`) | Nút hành động gợi ý (`action`) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `EMP-PRD-01` | `EMP` | Kho mẫu hoa trống | `Chưa có mẫu hoa nào trong kho` | `Bắt đầu xây dựng danh mục hoa của cửa hàng bằng cách thêm mẫu hoa mới hoặc nhập từ file Excel.` | `Thêm mẫu hoa mới` |
| `EMP-PRD-02` | `EMP` | Không khớp bộ lọc hoa | `Không tìm thấy mẫu hoa phù hợp` | `Không có mẫu hoa nào khớp với từ khóa hoặc bộ lọc đã chọn. Hãy thử xóa bộ lọc để xem toàn bộ danh sách.` | `Xóa bộ lọc` |
| `EMP-ORD-01` | `EMP` | Danh sách đơn trống | `Chưa có đơn hàng nào` | `Khi khách đặt hoa qua link hoặc nhân viên tạo đơn mới, đơn hàng sẽ hiển thị tại đây để phân công cắm hoa.` | `Tạo đơn mới` |
| `EMP-TRH-01` | `EMP` | Thùng rác trống | `Thùng rác đang trống` | `Các mẫu hoa hoặc ảnh bị xóa sẽ được lưu trữ tại đây trong 30 ngày trước khi xóa vĩnh viễn.` | `-` |
| `EMP-MEM-01` | `EMP` | Danh sách thành viên trống | `Chưa có thành viên nào khác` | `Mời thêm nhân viên bán hàng, điều phối viên hoặc thợ cắm hoa vào cùng làm việc trong cửa hàng.` | `Thêm thành viên` |
