# Nhóm 9 — Trao đổi nội bộ, chuỗi & quản trị nâng cao

14 chức năng. Mục 9.8–9.10 dành cho đội vận hành nền tảng (Console).

---

## 9.1 Trao đổi nội bộ trên đơn

**Ai dùng:** mọi nhân sự làm đơn.

- **Trong đơn Thẻ Chào:** mở khung trao đổi của đơn, nhắn cho người phụ trách; tin đã đọc được đánh dấu. Tin không xoá được để giữ lịch sử.
- **Chat nội bộ** (Vận hành → **Trao đổi nội bộ**, `/tin-nhan`) — **Sắp ra mắt** trên bản chính thức.

## 9.2 Hồ sơ thương hiệu

**Ai dùng:** Điều hành, Marketing.
**Mở ở:** Cài đặt tiệm → tab **2. Thương hiệu**.

Khai logo, màu, giọng văn. AI dùng hồ sơ này khi viết nội dung bán hàng và bài đăng.

## 9.3 Hồ sơ kinh doanh

**Ai dùng:** Điều hành.
**Mở ở:** Quản trị tiệm → **Hồ sơ cửa hàng**.

Khai tên pháp lý, số điện thoại, địa chỉ, mô tả, **thông điệp thương hiệu**, **khách mục tiêu**. Thông tin này hiện trên trang khách và
giúp AI viết đúng giọng cửa hàng.

## 9.4 Thư viện tài nguyên và thùng rác

**Mở ở:** Kho & nguyên liệu → **Kho & nguyên liệu** (`/kho-du-lieu`) → tab thùng rác.

1. Ảnh, tệp, sản phẩm đã xoá nằm trong thùng rác 30 ngày.
2. Tìm theo tên hoặc mã, bấm **Khôi phục** để lấy lại, hoặc **Xóa hẳn** để xoá vĩnh viễn ngay.
3. Quá 30 ngày hệ thống tự xoá.

## 9.5 Khoá API và webhook

**Ai dùng:** chỉ Điều hành.
**Mở ở:** Quản trị tiệm → **Tích hợp**.

1. Cấp khoá mới cho hệ thống bên ngoài; khoá chỉ hiện đầy đủ một lần — chép và lưu an toàn.
2. Xoay vòng khoá khi nghi lộ; thu hồi khoá không dùng.

## 9.6 Tác vụ nền

**Mở ở:** Vận hành → **Giao hàng & bàn giao** (`/job`) — **Sắp ra mắt** trên bản chính thức.

Theo dõi tác vụ AI (nhận diện ảnh, tạo nội dung, ảnh, video): đang chạy, xong, lỗi. Tác vụ lỗi bấm chạy lại (credit đã hoàn sẽ được trừ
lại khi chạy) hoặc huỷ.

## 9.7 Chính sách AI và trần chi phí

**Ai dùng:** Điều hành.

- **Trần credit AI theo tháng:** đặt ở **Sổ quỹ & thu chi** (`/muc-dung`). Chạm trần thì các lượt AI tính phí bị dừng tới tháng sau hoặc
  khi nâng trần.
- **Chính sách AI** (mô hình được dùng, mức bảo mật dữ liệu) ở `/cai-dat-ai` — **Sắp ra mắt** trên bản chính thức.

## 9.8 Console quản trị nền tảng

**Ai dùng:** đội vận hành nền tảng.
**Mở ở:** Console (`/van-hanh`).

- **Tổng quan:** số cửa hàng đang thuê bao / quá hạn / chưa gán gói / đã huỷ, doanh thu thuê bao 6 tháng, sức khoẻ hệ thống.
- **Tổ chức:** danh sách cửa hàng; mở một cửa hàng để xem thông tin, gói thuê bao, credit, tên miền riêng.

## 9.9 Duyệt đăng ký mới

**Mở ở:** Console → **Đăng ký** (`/van-hanh/dang-ky`).

Danh sách tài khoản tự đăng ký đang chờ (tài khoản, tổ chức, hình thức, thời điểm). Kiểm tra rồi duyệt hoặc từ chối. Chưa duyệt thì tài
khoản chưa đăng nhập được.

## 9.10 Tạo cửa hàng mới từ Console

**Mở ở:** Console → khối **Tạo tổ chức mới**.

1. Nhập **Tên cửa hàng**, **Ngành**, **Tên chủ tiệm**, **Thư chủ tiệm**.
2. Bật **Gán gói thuê bao** nếu cần: chọn **Gói**, **Chu kỳ** (Theo tháng / Theo năm), **Giá mỗi kỳ**, **Credit tặng mỗi tháng**, đánh dấu
   **Đã thu tiền kỳ đầu** nếu đã thu.
3. Bấm **Tạo**. Hệ thống hiện **mật khẩu tạm** của chủ tiệm một lần — gửi cho chủ tiệm; lần đầu đăng nhập phải đổi mật khẩu.

## 9.11 Duyệt hai bước cho việc nhạy cảm

Các việc sau luôn qua bước duyệt của Điều hành: đổi thông tin/giá mẫu (2.7), huỷ đơn (4.7), giảm giá (3.7), giao trước thu sau (4.26),
khoản thu do nhân viên ghi (1.16), giá dưới sàn (3.4). Yêu cầu chờ duyệt nằm ở tab **Phê duyệt** (Đơn hàng) và **Hộp việc** (Thẻ chào).

## 9.12 Không tự duyệt, không tự nâng quyền

Không ai duyệt được yêu cầu của chính mình, tự đổi vai hay thao tác trên tài khoản của chính mình.

## 9.13 Dữ liệu theo chi nhánh

Nhân viên được gán một chi nhánh (1.10) chỉ thấy đơn, doanh số, tồn kho, Thẻ Chào của chi nhánh đó. Đơn mới tự gắn chi nhánh của người
tạo. Điều hành và người được giao quản lý mọi chi nhánh thấy toàn cửa hàng.

## 9.14 Đăng nhập một lần

Đã đăng nhập ALG thì mở các ứng dụng liên kết của hệ thống không phải đăng nhập lại. Mỗi lần mở, phiên liên kết có hiệu lực 15 phút.
