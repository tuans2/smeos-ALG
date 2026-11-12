# ALG CORE — CAPABILITY MAP PLATFORM ADMIN

## 1. Mục tiêu

Capability Map này xác định các khả năng FloraOS Core cần cung cấp cho **Platform Admin**.

Platform Admin quản trị **toàn bộ nền tảng FloraOS**, không trực tiếp vận hành một cửa hàng hoa hay một hoạt động điện hoa cụ thể.

Mục tiêu của Platform Admin là bảo đảm:

- Nền tảng hoạt động ổn định.
- Tổ chức và người dùng được quản lý đúng.
- Gói dịch vụ và quyền sử dụng được kiểm soát.
- Tính năng được quản lý đúng phạm vi.
- AI và Credit được kiểm soát.
- Tích hợp hoạt động đúng.
- Dữ liệu và bảo mật được kiểm soát.
- Các thay đổi hệ thống có thể truy vết.
- Quản trị viên luôn biết hệ thống đang ở trạng thái nào và cần làm gì tiếp theo.

---

# 2. Nguyên tắc Capability Map

1. Platform Admin dùng FloraOS để **quản trị nền tảng**, không phải để thực hiện nghiệp vụ của Store Admin hoặc Điện hoa Admin.
2. Capability được tổ chức theo **mục tiêu quản trị**, không theo cấu trúc kỹ thuật nội bộ.
3. Không biến Platform Admin thành một dashboard chỉ để xem số liệu.
4. Mọi báo cáo quan trọng phải dẫn tới hành động tiếp theo.
5. Mọi thay đổi quan trọng phải có kiểm tra, xác nhận và khả năng truy vết.
6. UX không tự cấp quyền.
7. `role_ux` quyết định cách thông tin được ưu tiên và trình bày.
8. RBAC và Capability quyết định người dùng có được phép thực hiện hành động hay không.
9. Không đánh dấu capability đã có nếu chưa kiểm tra code.
10. Không cho phép thay đổi cấu hình quan trọng mà không kiểm tra tác động.
11. Các hành động ảnh hưởng nhiều tổ chức phải hỗ trợ phạm vi áp dụng rõ ràng.
12. Các hoạt động nhạy cảm phải có Audit Log.
13. AI hỗ trợ phân tích và đề xuất nhưng không tự vượt qua quyền kiểm soát.
14. Platform Admin phải nhìn được mối liên hệ:

```text
NỀN TẢNG
↓
TỔ CHỨC
↓
NGƯỜI DÙNG
↓
GÓI DỊCH VỤ
↓
TÍNH NĂNG
↓
AI / CREDIT
↓
TÍCH HỢP
↓
SỬ DỤNG
↓
SỨC KHỎE HỆ THỐNG
↓
AUDIT
```

---

# 3. Mô hình UX của Platform Admin

Trang chủ bắt đầu bằng:

> **Bạn muốn làm gì với FloraOS?**

Các lựa chọn chính:

```text
Xem báo cáo
Quản lý tổ chức
Quản lý người dùng
Quản lý gói dịch vụ
Quản lý tính năng
AI & Credit
Quản lý tích hợp
Sức khỏe hệ thống
Cài đặt hệ thống
Quản trị & bảo mật
```

Không mở toàn bộ capability cùng lúc.

Người dùng chọn mục tiêu trước.

FloraOS mở đúng workspace.

Sau đó:

```text
MỤC TIÊU
↓
CHỌN VIỆC
↓
WORKSPACE
↓
NHẬP / CHỌN DỮ LIỆU
↓
THỰC HIỆN
↓
KẾT QUẢ
↓
VIỆC TIẾP THEO
```

---

# 4. PA — QUẢN LÝ TỔ CHỨC

## PA-01 — Xem danh sách tổ chức

Hiển thị:
- Tên tổ chức
- Trạng thái
- Gói dịch vụ
- Người dùng
- Mức sử dụng
- AI/Credit
- Ngày tạo
- Trạng thái hoạt động

**Next Actions:**
- Mở tổ chức
- Xem mức sử dụng
- Xem người dùng
- Xem gói
- Xem Audit

---

## PA-02 — Tìm tổ chức

Tìm theo:
- Tên
- Mã
- Email
- Trạng thái
- Gói dịch vụ
- Ngày tạo

---

## PA-03 — Xem hồ sơ tổ chức

Hồ sơ gồm:
- Thông tin tổ chức
- Gói dịch vụ
- Người dùng
- Tính năng
- AI/Credit
- Tích hợp
- Mức sử dụng
- Lịch sử thay đổi

---

## PA-04 — Tạo tổ chức

**Input:**
- Tên tổ chức
- Thông tin liên hệ
- Gói dịch vụ
- Cấu hình ban đầu

**Output:** Tổ chức mới.

**Next Actions:**
- Cấu hình
- Tạo người dùng
- Kiểm tra tính năng
- Kiểm tra gói

---

## PA-05 — Chỉnh sửa thông tin tổ chức

Cho phép thay đổi các thông tin được phép.

**Audit Required:** Có.

---

## PA-06 — Kích hoạt tổ chức

Đưa tổ chức vào trạng thái hoạt động.

---

## PA-07 — Tạm ngưng tổ chức

Tạm dừng quyền sử dụng theo chính sách.

**Audit Required:** Có.

**Confirmation:** Bắt buộc.

---

## PA-08 — Khôi phục tổ chức

Khôi phục tổ chức đã tạm ngưng.

---

## PA-09 — Xem mức sử dụng của tổ chức

Theo dõi:
- Người dùng
- Tính năng
- AI
- Credit
- Lưu trữ
- Số lượng dữ liệu
- Mức sử dụng theo thời gian

---

## PA-10 — Xem lịch sử thay đổi tổ chức

Xem:
- Ai thay đổi
- Thay đổi gì
- Khi nào
- Giá trị trước
- Giá trị sau

---

# 5. PAU — QUẢN LÝ NGƯỜI DÙNG

## PAU-01 — Xem danh sách người dùng

Theo:
- Tổ chức
- Trạng thái
- Vai trò
- Ngày tạo
- Lần hoạt động gần nhất

---

## PAU-02 — Tìm người dùng

Tìm theo:
- Tên
- Email
- Tổ chức
- Vai trò
- Trạng thái

---

## PAU-03 — Xem hồ sơ người dùng

Thông tin:
- Hồ sơ
- Tổ chức
- Vai trò
- Quyền
- Tính năng được sử dụng
- AI/Credit
- Lịch sử hoạt động

---

## PAU-04 — Tạo người dùng

Tạo người dùng mới trong phạm vi được phép.

---

## PAU-05 — Mời người dùng

Gửi lời mời tham gia tổ chức.

---

## PAU-06 — Kích hoạt người dùng

---

## PAU-07 — Tạm ngưng người dùng

**Audit Required:** Có.

---

## PAU-08 — Khôi phục người dùng

---

## PAU-09 — Quản lý vai trò

Quản lý vai trò được hệ thống hỗ trợ.

**Lưu ý:** Không dùng UX để thay thế RBAC.

---

## PAU-10 — Xem quyền người dùng

Xem:
- Vai trò
- Capability
- Phạm vi
- Quyền thực thi

---

## PAU-11 — Quản lý phiên đăng nhập

Hỗ trợ:
- Xem phiên
- Phát hiện phiên bất thường
- Thu hồi phiên theo chính sách

---

## PAU-12 — Xem hoạt động người dùng

Xem:
- Đăng nhập
- Hành động quan trọng
- Thay đổi cấu hình
- Hoạt động nhạy cảm

---

# 6. PL — QUẢN LÝ GÓI DỊCH VỤ

## PL-01 — Xem danh sách gói

Theo dõi:
- Tên gói
- Giá
- Tính năng
- Giới hạn
- AI/Credit
- Trạng thái

---

## PL-02 — Tạo gói dịch vụ

Cấu hình:
- Tên
- Giá
- Chu kỳ
- Tính năng
- Giới hạn
- Credit

---

## PL-03 — Chỉnh sửa gói

**Audit Required:** Có.

---

## PL-04 — Kích hoạt / tạm ngưng gói

---

## PL-05 — Quản lý giới hạn gói

Ví dụ:
- Người dùng
- Số lượng dữ liệu
- AI Usage
- Credit
- Lưu trữ
- Tính năng

---

## PL-06 — Quản lý tính năng trong gói

Xác định:
- Gói nào được dùng capability nào.
- Giới hạn nào áp dụng.

---

## PL-07 — Gán gói cho tổ chức

**Input:**
- Tổ chức
- Gói
- Ngày hiệu lực
- Điều kiện áp dụng

**Next Actions:**
- Kiểm tra quyền
- Kiểm tra tính năng
- Xem mức sử dụng

---

## PL-08 — Thay đổi gói tổ chức

Hỗ trợ nâng cấp/hạ cấp theo chính sách.

---

## PL-09 — Xem lịch sử gói

Theo dõi:
- Gói cũ
- Gói mới
- Thời gian
- Người thay đổi
- Lý do

---

## PL-10 — Phân tích sử dụng theo gói

Phân tích:
- Tỷ lệ sử dụng
- Tính năng phổ biến
- AI Usage
- Credit
- Tổ chức theo gói

---

# 7. FT — QUẢN LÝ TÍNH NĂNG

## FT-01 — Danh mục capability

Quản lý danh sách capability của FloraOS.

Mỗi capability có:

```text
ID
Tên
Nhóm
Mô tả
Trạng thái
Capability Required
Gói áp dụng
```

---

## FT-02 — Kích hoạt tính năng

Bật capability theo phạm vi được phép.

---

## FT-03 — Tạm ngưng tính năng

Tắt capability theo chính sách.

---

## FT-04 — Quản lý tính năng theo gói

Xác định capability nào thuộc từng gói.

---

## FT-05 — Quản lý tính năng theo tổ chức

Cho phép quản lý override nếu kiến trúc thương mại hỗ trợ.

---

## FT-06 — Kiểm tra phụ thuộc tính năng

Phát hiện:
- Capability phụ thuộc capability khác
- Tích hợp bắt buộc
- Dữ liệu bắt buộc
- Quyền bắt buộc

---

## FT-07 — Kiểm tra tác động khi thay đổi

Trước khi thay đổi:
- Tổ chức bị ảnh hưởng
- Người dùng bị ảnh hưởng
- Workflow bị ảnh hưởng
- Dữ liệu bị ảnh hưởng
- AI/Credit bị ảnh hưởng

---

## FT-08 — Quản lý trạng thái tính năng

Các trạng thái có thể gồm:

```text
ĐỀ XUẤT
ĐANG PHÁT TRIỂN
BETA
ĐANG HOẠT ĐỘNG
TẠM NGƯNG
NGỪNG HỖ TRỢ
```

---

# 8. AI & CREDIT

## AIC-01 — Tổng quan AI Usage

Theo dõi:
- Số lượt AI
- Loại tác vụ
- Tổ chức
- Người dùng
- Chi phí
- Xu hướng

---

## AIC-02 — Phân tích AI Usage theo tổ chức

So sánh mức sử dụng theo:
- Tổ chức
- Gói
- Tính năng
- Thời gian

---

## AIC-03 — Quản lý Credit

Theo dõi:
- Credit được cấp
- Credit đã dùng
- Credit còn lại
- Credit hết hạn
- Credit điều chỉnh

---

## AIC-04 — Cấp Credit

Cấp Credit theo:
- Tổ chức
- Người dùng
- Chương trình
- Điều kiện

**Audit Required:** Có.

---

## AIC-05 — Điều chỉnh Credit

Cho phép điều chỉnh khi có lý do hợp lệ.

**Audit Required:** Có.

---

## AIC-06 — Theo dõi chi phí AI

Theo dõi:
- Mô hình
- Tác vụ
- Tổ chức
- Tính năng
- Chi phí

---

## AIC-07 — Phân tích hiệu quả AI

Phân tích:
- Usage
- Chi phí
- Giá trị sử dụng
- Tính năng sử dụng nhiều
- Tính năng sử dụng ít

---

## AIC-08 — Cảnh báo AI Usage bất thường

Phát hiện:
- Tăng đột biến
- Tổ chức sử dụng bất thường
- Tính năng có chi phí bất thường

**AI Support:** Có thể hỗ trợ phát hiện.

---

## AIC-09 — Quản lý chính sách AI

Quản lý các giới hạn/chính sách được hệ thống hỗ trợ.

---

# 9. INT — QUẢN LÝ TÍCH HỢP

## INT-01 — Xem danh sách tích hợp

Theo:
- Loại
- Trạng thái
- Tổ chức
- Môi trường

---

## INT-02 — Cấu hình tích hợp

Quản lý cấu hình được phép.

---

## INT-03 — Kiểm tra kết nối

Kiểm tra:
- Kết nối
- Xác thực
- API
- Trạng thái dịch vụ

---

## INT-04 — Kích hoạt tích hợp

---

## INT-05 — Tạm ngưng tích hợp

---

## INT-06 — Xem lỗi tích hợp

Theo dõi:
- Lỗi API
- Lỗi xác thực
- Timeout
- Rate limit
- Lỗi dữ liệu

---

## INT-07 — Retry tích hợp

Cho phép chạy lại các tác vụ có thể retry.

---

## INT-08 — Theo dõi trạng thái đồng bộ

Theo dõi:
- Đồng bộ thành công
- Đang chờ
- Thất bại
- Cần retry

---

# 10. SH — SỨC KHỎE HỆ THỐNG

## SH-01 — Tổng quan sức khỏe hệ thống

Theo dõi:
- API
- Worker
- AI
- Job
- Database
- Storage
- Integration

---

## SH-02 — Kiểm tra API

Theo dõi:
- Availability
- Response time
- Error rate

---

## SH-03 — Kiểm tra Worker

Theo dõi:
- Worker đang chạy
- Worker lỗi
- Worker chờ
- Queue

---

## SH-04 — Kiểm tra AI

Theo dõi:
- Availability
- Error
- Timeout
- Usage
- Chi phí

---

## SH-05 — Kiểm tra Job

Theo dõi:
- Job thành công
- Job thất bại
- Job đang chạy
- Job bị treo

---

## SH-06 — Kiểm tra Integration

Theo dõi:
- Kết nối
- Lỗi
- Đồng bộ

---

## SH-07 — Xem lỗi hệ thống

Tìm theo:
- Thành phần
- Thời gian
- Mức độ
- Loại lỗi

---

## SH-08 — Xem chi tiết lỗi

Thông tin:
- Error
- Thời gian
- Thành phần
- Context
- Request/Job ID nếu được phép
- Trạng thái xử lý

---

## SH-09 — Retry tác vụ

Chỉ cho phép với tác vụ có thể retry an toàn.

---

## SH-10 — Xác nhận hệ thống phục hồi

Sau khi xử lý:
- Kiểm tra lại
- Xác nhận trạng thái
- Ghi nhận kết quả

---

# 11. SYS — CÀI ĐẶT HỆ THỐNG

## SYS-01 — Xem cấu hình hệ thống

Phân nhóm:
- Nền tảng
- AI
- Credit
- Email
- Tích hợp
- Thông báo
- Bảo mật
- Workflow

---

## SYS-02 — Chỉnh sửa cấu hình

Cho phép thay đổi các cấu hình được cấp quyền.

---

## SYS-03 — Xem tác động trước khi thay đổi

Phân tích:
- Thành phần ảnh hưởng
- Tổ chức ảnh hưởng
- Người dùng ảnh hưởng
- Workflow ảnh hưởng

---

## SYS-04 — Xác nhận thay đổi

Các thay đổi quan trọng phải yêu cầu xác nhận.

---

## SYS-05 — Áp dụng cấu hình

Áp dụng thay đổi sau khi xác nhận.

---

## SYS-06 — Kiểm tra sau thay đổi

Kiểm tra:
- Hệ thống
- Tính năng
- Tích hợp
- Workflow liên quan

---

## SYS-07 — Xem lịch sử cấu hình

Theo dõi:
- Ai thay đổi
- Thay đổi gì
- Khi nào
- Giá trị trước
- Giá trị sau

---

# 12. SEC — QUẢN TRỊ & BẢO MẬT

## SEC-01 — Xem trạng thái bảo mật

Theo dõi các tín hiệu bảo mật được hệ thống hỗ trợ.

---

## SEC-02 — Quản lý chính sách truy cập

Quản lý các chính sách được cấp quyền.

---

## SEC-03 — Theo dõi đăng nhập bất thường

Phát hiện:
- Nhiều lần đăng nhập thất bại
- Hoạt động bất thường
- Phiên bất thường

---

## SEC-04 — Quản lý phiên

Xem và thu hồi phiên theo chính sách.

---

## SEC-05 — Quản lý Audit Log

Tìm theo:
- Người dùng
- Tổ chức
- Hành động
- Thời gian
- Đối tượng
- Kết quả

---

## SEC-06 — Xem chi tiết Audit

Thông tin:
- Ai
- Làm gì
- Khi nào
- Trên đối tượng nào
- Giá trị trước
- Giá trị sau
- Kết quả

---

## SEC-07 — Phát hiện hành động nhạy cảm

Theo dõi các hành động:
- Thay đổi quyền
- Thay đổi gói
- Cấp Credit
- Thay đổi cấu hình
- Tạm ngưng tổ chức
- Tạm ngưng người dùng
- Thay đổi tích hợp

---

# 13. REP — BÁO CÁO NỀN TẢNG

## REP-01 — Báo cáo nền tảng

Theo dõi:
- Tổ chức
- Người dùng
- Usage
- Tính năng
- AI
- Credit
- Tích hợp
- Sức khỏe hệ thống

---

## REP-02 — Báo cáo người dùng

Phân tích:
- Người dùng
- Hoạt động
- Tần suất sử dụng
- Tổ chức
- Vai trò

---

## REP-03 — Báo cáo tổ chức

Phân tích:
- Số tổ chức
- Tăng trưởng
- Gói
- Usage
- AI/Credit
- Hoạt động

---

## REP-04 — Báo cáo mức sử dụng

Phân tích:
- Tính năng
- Tổ chức
- Người dùng
- Thời gian
- Xu hướng

---

## REP-05 — Báo cáo AI & Credit

Phân tích:
- Usage
- Credit
- Chi phí
- Tổ chức
- Tính năng
- Xu hướng

---

## REP-06 — Báo cáo doanh thu

Theo dõi dữ liệu doanh thu mà hệ thống thương mại cung cấp.

---

## REP-07 — Báo cáo tăng trưởng

Theo dõi:
- Tổ chức mới
- Người dùng mới
- Usage
- Gói
- Mức sử dụng

---

## REP-08 — Phân tích xu hướng

AI có thể hỗ trợ phát hiện:
- Xu hướng tăng/giảm
- Tính năng nổi bật
- Tổ chức có biến động
- Usage bất thường

---

## REP-09 — Drill-down

Từ báo cáo tổng quan đi xuống:

```text
Nền tảng
↓
Tổ chức
↓
Tính năng
↓
Người dùng
↓
Hành động
```

---

## REP-10 — Tạo hành động từ báo cáo

Một báo cáo không kết thúc ở số liệu.

Ví dụ:

```text
AI Usage tăng mạnh
↓
Xem tổ chức
↓
Xem tính năng
↓
Xem nguyên nhân
↓
Kiểm tra Credit
↓
Kiểm tra chi phí
↓
Tạo hành động
```

---

# 14. OPS — QUẢN TRỊ VẬN HÀNH

## OPS-01 — Theo dõi công việc quản trị

Theo dõi:
- Việc cần xử lý
- Việc đang xử lý
- Việc quá hạn
- Người phụ trách

---

## OPS-02 — Quản lý yêu cầu hỗ trợ hệ thống

Theo dõi:
- Vấn đề
- Tổ chức
- Người báo
- Mức độ
- Trạng thái
- Người xử lý

---

## OPS-03 — Phân loại vấn đề

Phân loại:
- Người dùng
- Tổ chức
- Tính năng
- AI
- Credit
- Tích hợp
- Hệ thống
- Bảo mật

---

## OPS-04 — Theo dõi xử lý vấn đề

Luồng:

```text
MỚI
→ ĐÁNH GIÁ
→ ĐANG XỬ LÝ
→ CHỜ
→ ĐÃ XỬ LÝ
→ XÁC NHẬN
→ ĐÓNG
```

---

## OPS-05 — Ghi nhận nguyên nhân

Ghi nhận:
- Nguyên nhân
- Cách xử lý
- Kết quả
- Bài học

---

# 15. Combo chức năng

## CB-01 — Onboarding tổ chức

```text
Tạo tổ chức
→ Chọn gói
→ Cấu hình tính năng
→ Tạo người dùng
→ Kiểm tra quyền
→ Kiểm tra tích hợp
→ Kiểm tra AI/Credit
→ Kích hoạt
```

---

## CB-02 — Xử lý tổ chức có vấn đề

```text
Phát hiện vấn đề
→ Mở hồ sơ tổ chức
→ Kiểm tra Usage
→ Kiểm tra tính năng
→ Kiểm tra AI/Credit
→ Kiểm tra tích hợp
→ Kiểm tra Audit
→ Xác định nguyên nhân
→ Xử lý
→ Kiểm tra lại
```

---

## CB-03 — Thay đổi gói dịch vụ

```text
Chọn tổ chức
→ Xem gói hiện tại
→ Chọn gói mới
→ Kiểm tra tính năng
→ Kiểm tra giới hạn
→ Kiểm tra ảnh hưởng
→ Xác nhận
→ Áp dụng
→ Kiểm tra
```

---

## CB-04 — Xử lý tính năng gặp vấn đề

```text
Phát hiện lỗi
→ Xác định capability
→ Xác định tổ chức ảnh hưởng
→ Kiểm tra hệ thống
→ Kiểm tra tích hợp
→ Xử lý
→ Kiểm tra
→ Khôi phục
→ Ghi Audit
```

---

## CB-05 — Xử lý AI/Credit bất thường

```text
Phát hiện bất thường
→ Xác định tổ chức
→ Xác định tính năng
→ Kiểm tra Usage
→ Kiểm tra Credit
→ Kiểm tra chi phí
→ Xác định nguyên nhân
→ Xử lý
→ Kiểm tra lại
```

---

# 16. AI Workflow

## WF-01 — Phân tích sức khỏe nền tảng

```text
Dữ liệu hệ thống
→ Phân tích API
→ Phân tích Worker
→ Phân tích Job
→ Phân tích AI
→ Phân tích Integration
→ Phát hiện bất thường
→ Xác định nguyên nhân có khả năng
→ Đề xuất hành động
```

**Người dùng xác nhận trước hành động có tác động lớn.**

---

## WF-02 — Phân tích Usage của tổ chức

```text
Chọn tổ chức
→ Phân tích Usage
→ Phân tích tính năng
→ Phân tích AI
→ Phân tích Credit
→ So sánh theo thời gian
→ Phát hiện bất thường
→ Đề xuất hành động
```

---

## WF-03 — Phân tích AI & Credit

```text
AI Usage
→ Credit
→ Chi phí
→ Tính năng
→ Tổ chức
→ Xu hướng
→ Bất thường
→ Đề xuất
```

---

## WF-04 — Kiểm tra tác động khi thay đổi cấu hình

```text
Thay đổi cấu hình
→ Xác định thành phần phụ thuộc
→ Xác định tổ chức ảnh hưởng
→ Xác định workflow ảnh hưởng
→ Xác định rủi ro
→ Tạo báo cáo tác động
→ Người dùng xác nhận
→ Áp dụng
→ Kiểm tra
```

---

## WF-05 — Hỗ trợ điều tra sự cố

```text
Sự cố
→ Xác định thời gian
→ Xác định thành phần
→ Đọc log / trạng thái được phép
→ Tìm dấu hiệu liên quan
→ Khoanh vùng
→ Đề xuất nguyên nhân
→ Đề xuất bước kiểm tra
→ Người dùng xử lý
→ Kiểm tra lại
```

---

# 17. FloraOS đề xuất

Platform Admin có thể nhận đề xuất dựa trên:

- Usage
- AI Usage
- Credit
- Tổ chức
- Người dùng
- Tính năng
- Tích hợp
- Lỗi
- Sức khỏe hệ thống
- Audit
- Xu hướng

Ví dụ:

```text
AI Usage tăng bất thường
↓
FloraOS phát hiện
↓
Xác định tổ chức
↓
Xác định tính năng
↓
Kiểm tra Credit
↓
Kiểm tra chi phí
↓
Đề xuất kiểm tra
↓
Platform Admin quyết định
```

FloraOS không tự thực hiện hành động quản trị có tác động lớn nếu chưa có quyền và xác nhận phù hợp.

---

# 18. Các loại kết quả

Platform Admin có thể tạo hoặc xử lý:

- Tổ chức
- Người dùng
- Vai trò
- Gói dịch vụ
- Cấu hình gói
- Capability
- Trạng thái tính năng
- Credit
- Cấu hình AI
- Tích hợp
- Cấu hình hệ thống
- Báo cáo
- Cảnh báo
- Sự cố
- Audit Log
- Đề xuất hành động
- Kết quả kiểm tra hệ thống

Mỗi kết quả phải có Next Actions phù hợp.

---

# 19. Liên kết giữa các Capability

Platform Admin cũng phải có Capability liên kết, không phải các công cụ độc lập.

### Chuỗi quản lý tổ chức

```text
Tổ chức
→ Gói
→ Tính năng
→ Người dùng
→ Usage
→ AI/Credit
→ Báo cáo
```

### Chuỗi xử lý sự cố

```text
Phát hiện
→ Xác định phạm vi
→ Kiểm tra hệ thống
→ Kiểm tra tích hợp
→ Phân tích
→ Xử lý
→ Kiểm tra lại
→ Audit
```

### Chuỗi quản lý tính năng

```text
Capability
→ Gói
→ Tổ chức
→ Người dùng
→ Quyền
→ Usage
→ Báo cáo
```

### Chuỗi AI/Credit

```text
AI Usage
→ Credit
→ Chi phí
→ Tổ chức
→ Tính năng
→ Phân tích
→ Điều chỉnh
```

---

# 20. Capability Contract

Mỗi capability phải có:

```text
ID
Tên
Nhóm
Mục tiêu
Scope
Input
Output
Dependencies
Next Actions
AI Support
Workflow Support
Capability Required
Audit Required
Confirmation Required
Trạng thái triển khai
```

Ví dụ:

## AIC-08 — Cảnh báo AI Usage bất thường

**Nhóm:** AI & Credit

**Mục tiêu:** Phát hiện mức sử dụng AI có dấu hiệu bất thường để Platform Admin kiểm tra.

**Scope:**
- Toàn nền tảng
- Tổ chức
- Tính năng
- Người dùng

**Input:**
- AI Usage
- Thời gian
- Tính năng
- Tổ chức

**Output:**
- Cảnh báo
- Mức độ
- Đối tượng liên quan
- Dữ liệu hỗ trợ

**Dependencies:**
- AI Usage
- Tổ chức
- Tính năng

**Next Actions:**
- Xem tổ chức
- Xem tính năng
- Xem Credit
- Xem chi phí
- Điều tra

**AI Support:** Có.

**Workflow Support:** Có.

**Capability Required:** Xác định theo hệ thống quyền thực tế.

**Audit Required:** Tùy hành động tiếp theo.

**Confirmation Required:** Có nếu thực hiện thay đổi có tác động.

**Trạng thái triển khai:** CẦN XÁC MINH.

---

# 21. Trạng thái triển khai

Không được tự giả định capability đã tồn tại trong code.

Chỉ sử dụng:

- `CÓ — ĐÃ XÁC MINH`
- `CÓ MỘT PHẦN — ĐÃ XÁC MINH`
- `CHƯA CÓ — ĐÃ XÁC MINH`
- `CẦN XÁC MINH`
- `ĐỀ XUẤT`

Capability Map xác định **hệ thống cần có khả năng gì**.

Việc xác định đã triển khai đến đâu phải được kiểm tra bằng code và hệ thống thực tế.

---

# 22. Quyền và Capability

Platform Admin không được cấp quyền chỉ vì UX hiển thị một chức năng.

Luồng đúng:

```text
PLATFORM ADMIN
↓
ROLE_UX
↓
JOURNEY
↓
CAPABILITY
↓
RBAC / PERMISSION
↓
POLICY
↓
THỰC THI
↓
AUDIT
```

Đặc biệt với các hành động:

- Tạm ngưng tổ chức
- Tạm ngưng người dùng
- Cấp Credit
- Điều chỉnh Credit
- Thay đổi gói
- Thay đổi tính năng
- Thay đổi cấu hình hệ thống
- Thay đổi tích hợp
- Thay đổi quyền

phải kiểm tra quyền và yêu cầu xác nhận theo chính sách.

---

# 23. Journey-First UX cho Platform Admin

## Journey 1 — Xem báo cáo

```text
Xem báo cáo
↓
Chọn loại báo cáo
↓
Chọn thời gian
↓
Chọn phạm vi
↓
Chọn tổ chức nếu cần
↓
Xem báo cáo
↓
Drill-down
↓
Phân tích
↓
Hành động tiếp theo
```

---

## Journey 2 — Quản lý tổ chức

```text
Quản lý tổ chức
↓
Tìm tổ chức
↓
Mở hồ sơ
↓
Xem trạng thái
↓
Xem gói
↓
Xem người dùng
↓
Xem tính năng
↓
Xem Usage
↓
Thực hiện hành động
↓
Kiểm tra lại
```

---

## Journey 3 — Quản lý gói

```text
Quản lý gói
↓
Chọn gói
↓
Xem tính năng
↓
Xem giới hạn
↓
Chỉnh sửa
↓
Xem tác động
↓
Xác nhận
↓
Áp dụng
↓
Kiểm tra
```

---

## Journey 4 — Quản lý AI & Credit

```text
AI & Credit
↓
Xem Usage
↓
Chọn tổ chức
↓
Chọn tính năng
↓
Xem Credit
↓
Xem chi phí
↓
Phân tích
↓
Điều chỉnh nếu cần
↓
Audit
```

---

## Journey 5 — Xử lý sức khỏe hệ thống

```text
Sức khỏe hệ thống
↓
Tổng quan
↓
Chọn thành phần
↓
API / Worker / AI / Job / Integration
↓
Xem lỗi
↓
Xem chi tiết
↓
Xử lý
↓
Kiểm tra lại
↓
Xác nhận phục hồi
```

---

## Journey 6 — Thay đổi cấu hình hệ thống

```text
Cài đặt hệ thống
↓
Chọn nhóm cấu hình
↓
Chọn cấu hình
↓
Xem giá trị hiện tại
↓
Thay đổi
↓
Xem tác động
↓
Xác nhận
↓
Áp dụng
↓
Kiểm tra
↓
Audit
```

---

# 24. Các nguyên tắc không được vi phạm

### 1. Không biến Platform Admin thành dashboard-only

Dashboard chỉ là điểm quan sát.

Kết quả cuối cùng phải dẫn đến hành động quản trị khi cần.

### 2. Không cho phép thao tác ngoài quyền

UX không thay thế RBAC.

### 3. Không tự động thay đổi cấu hình quan trọng

Phải có kiểm tra tác động và xác nhận phù hợp.

### 4. Không bỏ qua Audit

Các hành động nhạy cảm phải truy vết được.

### 5. Không để báo cáo trở thành điểm kết thúc

Ví dụ:

```text
Báo cáo AI Usage
→ Phát hiện bất thường
→ Mở tổ chức
→ Kiểm tra tính năng
→ Kiểm tra Credit
→ Hành động
```

### 6. Không để cảnh báo không có hành động

Ví dụ:

```text
API lỗi
→ Xem lỗi
→ Xem chi tiết
→ Xử lý
→ Kiểm tra lại
```

### 7. Không để cấu hình thay đổi mà không kiểm tra tác động

```text
Thay đổi
→ Tác động
→ Xác nhận
→ Áp dụng
→ Kiểm tra
```

---

# 25. Mục tiêu cuối cùng

Platform Admin phải giúp quản trị viên đi từ:

```text
NHÌN THẤY
↓
HIỂU
↓
XÁC ĐỊNH
↓
QUYẾT ĐỊNH
↓
THỰC HIỆN
↓
KIỂM TRA
↓
AUDIT
```

Thay vì:

```text
DASHBOARD
→ MODULE
→ FORM
→ SAVE
```

Mục tiêu của Platform Admin:

> **Quản trị FloraOS từ tổ chức, người dùng, gói dịch vụ và tính năng đến AI, Credit, tích hợp, sức khỏe hệ thống và bảo mật — trong một hành trình rõ ràng, có kiểm soát và có thể truy vết.**
