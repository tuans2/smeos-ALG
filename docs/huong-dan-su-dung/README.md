# Hướng dẫn sử dụng ALG

Bộ hướng dẫn thao tác cho nhân sự cửa hàng và đội vận hành nền tảng, gồm đủ 123 chức năng trong checklist bàn giao, chia theo 10
nhóm. Mỗi chức năng có: dùng để làm gì, ai dùng được, mở ở đâu, các bước thao tác và lưu ý.

## Mục lục

| Nhóm | Hướng dẫn | Số chức năng |
|---|---|---:|
| 1 | [Tài khoản, cửa hàng & phân quyền](nhom-01-tai-khoan-phan-quyen.md) | 19 |
| 2 | [Sản phẩm, mẫu & hình ảnh](nhom-02-san-pham.md) | 9 |
| 3 | [Báo giá](nhom-03-bao-gia.md) | 13 |
| 4 | [Đơn hàng](nhom-04-don-hang.md) | 32 |
| 5 | [Thẻ Chào & trang khách hàng](nhom-05-the-chao.md) | 15 |
| 6 | [Báo cáo](nhom-06-bao-cao.md) | 9 |
| 7 | [AI phân tích & nội dung](nhom-07-ai-noi-dung.md) | 3 |
| 8 | [Landing page](nhom-08-landing-page.md) | 1 |
| 9 | [Trao đổi nội bộ, chuỗi & quản trị nâng cao](nhom-09-trao-doi-chuoi-quan-tri.md) | 14 |
| 10 | [Credit, hạn mức, thuê bao & tên miền](nhom-10-credit-thue-bao.md) | 8 |

## 1. Bắt đầu

1. Mở địa chỉ của hệ thống, vào trang **Đăng nhập**, nhập email và mật khẩu.
2. Tài khoản do Điều hành cấp có **mật khẩu tạm**: lần đăng nhập đầu, hệ thống yêu cầu đổi mật khẩu trước khi dùng.
3. Mỗi tài khoản chỉ đăng nhập ở **một nơi**. Đăng nhập trên máy khác thì phiên trên máy cũ tự đăng xuất.
4. Sau khi đăng nhập, trang chủ hiện theo vai của bạn (ví dụ Thợ chế tác thấy ngay việc cần làm, Shipper thấy đơn cần giao).

Cửa hàng mới tự đăng ký ở trang Đăng nhập → **Dùng thử** / **Đăng ký**. Tài khoản tự đăng ký cần đội vận hành nền tảng duyệt trước
khi dùng được.

## 2. Vai trò

| Vai | Công việc chính |
|---|---|
| **Điều hành** | Chủ cửa hàng: toàn quyền, cài đặt cửa hàng, nhân sự, xác nhận tiền, huỷ đơn, hoàn tiền, duyệt giá dưới sàn |
| **Điều phối** | Nhận và điều phối đơn, phân công thợ, theo dõi giao hàng |
| **Sale** | Tư vấn, gửi Thẻ Chào, lập báo giá, tạo đơn, chăm khách |
| **Thợ chế tác** | Nhận việc chế tác, làm theo công thức, báo xong |
| **Shipper** | Nhận đơn cần giao, chụp ảnh giao, báo giao không được |
| **Kế toán** | Đối soát thu tiền, xem báo cáo, xuất Excel |
| Quản lý sản phẩm, Marketing, Chăm sóc khách hàng | Quản lý mẫu và giá, nội dung bán hàng, chăm sóc khách |
| Cửa hàng nhận gia công | Tài khoản của chi nhánh/xưởng trong chuỗi, chỉ thấy đơn gia công của mình |

Bạn chỉ thấy trên menu những mục vai của mình được dùng. Thiếu quyền mà vẫn thao tác, hệ thống báo không đủ quyền và ghi lại.

## 3. Menu chính của cửa hàng

| Nhóm menu | Mục |
|---|---|
| Công cụ | Chế tác tự động, Thẻ chào sản phẩm, Tạo catalog, Phân tích ảnh bằng AI, Tạo video, Viết nội dung marketing, Mẫu ấn phẩm, Trợ lý tối ưu |
| Bán hàng & khách | Đơn hàng, Khách hàng, Hội thoại |
| Sản phẩm | Danh mục sản phẩm, Tạo sản phẩm mới, Nhập từ Excel & ảnh, Khả dụng & lịch |
| Kho & nguyên liệu | Kho & nguyên liệu, Tính giá |
| Vận hành | Đơn nhận từ mạng lưới, Sản xuất & điều phối, Giao hàng & bàn giao, Việc chờ duyệt (QC), Trao đổi nội bộ |
| Quản trị tiệm | Báo cáo kinh doanh, Báo cáo theo kỳ, Sổ quỹ & thu chi, Tri thức & quy trình, Hồ sơ cửa hàng, Cài đặt tiệm, Đội ngũ & phân quyền, Nhật ký thao tác, các ma trận chính sách |

Cửa hàng thuộc chuỗi thấy thêm các mục của chuỗi (Tháp điều phối, Chi nhánh & xưởng…). Đội vận hành nền tảng dùng **Console**
(`/van-hanh`).

## 4. Màn đang ở trạng thái "Sắp ra mắt"

Trên bản chính thức, một số màn được tạm khoá theo quyết định của chủ sản phẩm: mục trên menu mờ đi và trang hiện **Sắp ra mắt**.
Chức năng vẫn có trong hệ thống và sẽ dùng được khi màn được mở. Các màn liên quan tới checklist:

| Màn | Chức năng bị ảnh hưởng |
|---|---|
| Sản xuất & điều phối (`/dieu-phoi`) | Bảng điều phối, rủi ro trễ giờ (4.12) |
| Việc chờ duyệt (`/duyet`) | Duyệt kết quả nhận diện ảnh (7.1) |
| Báo cáo kinh doanh, Báo cáo theo kỳ (`/so-lieu`, `/bao-cao`) | Báo cáo nhóm 6 |
| Sổ quỹ & mức dùng (`/muc-dung`) | Credit và hạn mức (10.1, 10.3, 10.7) |
| Nhật ký thao tác (`/audit`) | Nhật ký thao tác (1.17) |
| Tính giá (`/gia`) | Quy tắc giá, giá theo hạng khách (3.1, 3.4) |
| Khách hàng (`/khach-hang`) | Lịch sử đơn của khách (4.11) |
| Trao đổi nội bộ (`/tin-nhan`) | Chat nội bộ (9.1) |
| Catalog, Hội thoại, Tạo video, Viết nội dung… | Landing page (8.1) và công cụ nội dung |

Mỗi hướng dẫn của chức năng thuộc các màn trên có ghi chú **Sắp ra mắt**.

## 5. Thuật ngữ

| Từ | Nghĩa |
|---|---|
| Thẻ Chào | Bộ sưu tập mẫu gửi cho khách qua link; khách xem, thả tim, đặt hàng ngay trên điện thoại |
| Bộ sưu tập (catalog) | Nhóm mẫu theo chủ đề hoặc dịp |
| Phiên bản | Biến thể của một mẫu theo kích cỡ, màu (ví dụ Nhỏ / Vừa / Lớn) |
| Công thức (BOM) | Định mức nguyên liệu của một mẫu |
| Giá sàn | Giá thấp nhất được bán, tính từ giá vốn |
| QC | Kiểm tra chất lượng thành phẩm trước khi giao |
| Ảnh giao (POD) | Ảnh chụp lúc giao tận tay người nhận |
| Credit | Đơn vị trừ khi dùng AI và gửi tin nhắn cho khách |
| Console | Màn quản trị của đội vận hành nền tảng |

## 6. Khi cần hỗ trợ

Lỗi hiện kèm **mã yêu cầu**. Gửi mã đó cho bộ phận hỗ trợ để tra nhanh.

## 7. Nghiệm thu

Checklist chạy một vòng nghiệm thu theo bộ hướng dẫn này: `docs/nghiem-thu/CHECKLIST_NGHIEM_THU_123_CHUC_NANG.xlsx` — chuẩn bị dữ liệu,
10 luồng đầu–cuối theo vai, ca kiểm tra quyền và bảo mật, bảng đối chiếu đủ 123 chức năng tự tính trạng thái Đạt / Không đạt.
