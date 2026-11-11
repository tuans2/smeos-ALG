# Đối chiếu 123 chức năng với kho ảnh màn hình (BẢN NHÁP)

Nguồn danh mục: `docs/nghiem-thu/CHECKLIST_NGHIEM_THU_123_CHUC_NANG.xlsx`. Ảnh nằm ngoài git (xem `INDEX.md`), đường dẫn tính từ thư mục kho ảnh.

**Lưu ý trung thực:** ảnh được gán theo route, chưa ai mở từng ảnh để xác nhận đúng chức năng. Cột "Ảnh" chỉ là đại diện (tối đa 3).

## Tổng hợp

| Trạng thái | Số chức năng |
|---|---:|
| Có ảnh | 94 |
| Một phần | 14 |
| Không có màn hình riêng (đề xuất, chờ PO) | 7 |
| Có ảnh (đại diện, cần PO xác nhận) | 3 |
| Có ảnh (trong chi tiết sản phẩm, chưa xác nhận khối) | 3 |
| Chưa chụp | 2 |
| **Tổng** | **123** |

Giải thích: **Có ảnh** = có ít nhất 1 ảnh gán; **Một phần** = có ảnh nhưng thiếu trạng thái/luồng quan trọng; **Không có màn hình riêng** = chức năng là quy tắc nền hoặc tự động (đề xuất, cần PO xác nhận); **Chưa chụp** = có màn nhưng chưa có ảnh.

## Chi tiết


### 1. Nền tảng chung & phân quyền

| Mã | Chức năng | Trạng thái | Ảnh đại diện | Ghi chú |
|---|---|---|---|---|
| 1.1 | Truy cập theo tổ chức (Multi-tenant) | Không có màn hình riêng (đề xuất, chờ PO) | — | Quy tắc nền; có thể dùng ảnh tiêu đề tổ chức ở menu làm đại diện |
| 1.2 | Đăng nhập & thu hồi phiên cũ | Có ảnh | `shots/public/desktop/dang-nhap.png` | — |
| 1.3 | Đăng xuất & vô hiệu hóa phiên tức thì | Có ảnh | `shots/public/desktop/dang-nhap.png` | — |
| 1.4 | Bắt buộc đổi mật khẩu tạm lần đầu | Chưa chụp | — | Hộp đổi mật khẩu bắt buộc chỉ hiện ở lần đăng nhập đầu bằng mật khẩu tạm; tài khoản mẫu đã bỏ cờ này. Chụp được nếu tạo nhân viên mới |
| 1.5 | Quản lý thông tin cửa hàng & logo an toàn | Có ảnh | `shots/dieu_hanh/desktop/cai-dat.png`<br>`shots/dieu_hanh/desktop/ho-so.png`<br>`shots2/dieu_hanh/desktop/cai-dat__click1--s-1-s.png` | — |
| 1.6 | Khai báo chi nhánh & tọa độ quận/huyện | Có ảnh | `shots2/dieu_hanh/desktop/nhap-hang-loat__anh.png` | — |
| 1.7 | Khai báo dịp tặng hoa ngành chuẩn | Có ảnh | `shots/dieu_hanh/desktop/cai-dat.png`<br>`shots2/dieu_hanh/desktop/cai-dat__click1--s-1-s.png`<br>`shots2/dieu_hanh/desktop/cai-dat__click10--s-10-s.png` | — |
| 1.8 | Chính sách cửa hàng (ngân hàng, phụ thu lễ) | Có ảnh | `shots/dieu_hanh/desktop/cai-dat.png`<br>`shots2/dieu_hanh/desktop/cai-dat__click1--s-1-s.png`<br>`shots2/dieu_hanh/desktop/cai-dat__click10--s-10-s.png` | — |
| 1.9 | Cấu hình trường dữ liệu linh hoạt theo shop | Có ảnh | `shots/dieu_hanh/desktop/cai-dat.png`<br>`shots2/dieu_hanh/desktop/cai-dat__click1--s-1-s.png`<br>`shots2/dieu_hanh/desktop/cai-dat__click10--s-10-s.png` | — |
| 1.10 | Quản lý & mời thành viên | Có ảnh | `shots/dieu_hanh/desktop/cai-dat_thanh-vien.png`<br>`shots2/dieu_hanh/desktop/cai-dat_thanh-vien__click1-Thêm-thành-viên.png`<br>`shots2/dieu_hanh/desktop/cai-dat_thanh-vien__click2-Mời-người-đã-có-tài-khoản.png` | — |
| 1.11 | Điều chỉnh/gỡ thành viên & thu hồi phiên ngay | Có ảnh | `shots/dieu_hanh/desktop/cai-dat_thanh-vien.png`<br>`shots2/dieu_hanh/desktop/cai-dat_thanh-vien__click1-Thêm-thành-viên.png`<br>`shots2/dieu_hanh/desktop/cai-dat_thanh-vien__click2-Mời-người-đã-có-tài-khoản.png` | — |
| 1.12 | 6 vai trò mặc định | Có ảnh | `shots/dieu_hanh/desktop/cai-dat_thanh-vien_vai-tro.png` | — |
| 1.13 | Tạo vai trò tùy chỉnh | Có ảnh | `shots/dieu_hanh/desktop/cai-dat_thanh-vien.png`<br>`shots/dieu_hanh/desktop/cai-dat_thanh-vien_vai-tro.png`<br>`shots2/dieu_hanh/desktop/cai-dat_thanh-vien__click1-Thêm-thành-viên.png` | — |
| 1.14 | Hiển thị giao diện & menu theo quyền | Có ảnh (đại diện, cần PO xác nhận) | `shots-p1-empty/dieu_hanh/desktop/root.png`<br>`shots-p1-empty/shipper/desktop/root.png`<br>`shots-p1-empty/ke_toan/desktop/root.png` | So sánh menu/trang chủ giữa các vai |
| 1.15 | Chặn thao tác vượt quyền & ghi log vi phạm | Không có màn hình riêng (đề xuất, chờ PO) | — | Chặn ở máy chủ (403) và nhật ký; không có màn riêng |
| 1.16 | Khóa cứng quyền nhạy cảm ở tầng server | Có ảnh | `shots/dieu_hanh/desktop/cai-dat_thanh-vien_vai-tro.png` | — |
| 1.17 | Nhật ký thao tác chi tiết IP/thiết bị | Có ảnh | `shots/dieu_hanh/desktop/audit.png`<br>`shots2/dieu_hanh/desktop/audit__tab1-Thao-tác-trong-tổ-chức.png`<br>`shots2/dieu_hanh/desktop/audit__tab2-Truy-cập-của-nền-tảng.png` | — |
| 1.18 | Gắn dữ liệu với tổ chức ở tầng database (RLS) | Không có màn hình riêng (đề xuất, chờ PO) | — | Khoá ở tầng cơ sở dữ liệu |
| 1.19 | Chặn truy cập chéo (404 Not Found) | Có ảnh (đại diện, cần PO xác nhận) | `shots-p1-empty/public/desktop/chinh-sach-bao-mat.png` | Trang "Không tìm thấy" dùng chung |

### 2. Quản lý sản phẩm, mẫu hoa & hình ảnh

| Mã | Chức năng | Trạng thái | Ảnh đại diện | Ghi chú |
|---|---|---|---|---|
| 2.1 | Tạo thẻ sản phẩm mẫu hoa | Có ảnh | `shots/dieu_hanh/desktop/san-pham.png`<br>`shots/dieu_hanh/desktop/san-pham_kha-dung.png`<br>`shots/dieu_hanh/desktop/san-pham_nhap-hang-loat.png` | — |
| 2.2 | Cập nhật thẻ sản phẩm & đồng bộ Thẻ Chào | Có ảnh | `shots/dieu_hanh/desktop/san-pham.png`<br>`shots/dieu_hanh/desktop/san-pham_kha-dung.png`<br>`shots/dieu_hanh/desktop/san-pham_nhap-hang-loat.png` | — |
| 2.3 | Trạng thái sản phẩm (Nháp/Hoạt động/Lưu trữ) | Có ảnh | `shots/dieu_hanh/desktop/san-pham.png`<br>`shots/dieu_hanh/desktop/san-pham_kha-dung.png`<br>`shots/dieu_hanh/desktop/san-pham_nhap-hang-loat.png` | — |
| 2.4 | Biến thể kích cỡ (Nhỏ/Vừa/Lớn/VIP) | Có ảnh (trong chi tiết sản phẩm, chưa xác nhận khối) | `shots2/dieu_hanh/desktop/san-pham_dev-moclan-prd-0000-0000-000000000001.png` | Khối giá/phiên bản nằm trong trang chi tiết |
| 2.5 | Định mức nguyên liệu BOM | Có ảnh | `shots/dieu_hanh/desktop/tinh-gia.png`<br>`shots2/dieu_hanh/desktop/tinh-gia__tab1-Nguyên-liệu-_-đơn-giá.png`<br>`shots2/dieu_hanh/desktop/tinh-gia__tab2-Công-thức.png` | — |
| 2.6 | Nhập danh mục hàng loạt từ Excel/CSV | Có ảnh | `shots2/dieu_hanh/desktop/nhap-hang-loat__anh.png` | — |
| 2.7 | Duyệt đề xuất thay đổi thông tin/giá 2 bước | Có ảnh (trong chi tiết sản phẩm, chưa xác nhận khối) | `shots2/dieu_hanh/desktop/san-pham_dev-moclan-prd-0000-0000-000000000001.png` | Khối đề xuất thay đổi; chưa có đề xuất mẫu nên khối có thể trống |
| 2.8 | Cấu hình khả dụng, ẩn mẫu theo ngày | Có ảnh | `shots2/dieu_hanh/desktop/san-pham_dev-moclan-prd-0000-0000-000000000001.png` | Khối khả dụng và màn Khả dụng & lịch |
| 2.9 | Lưu bộ nội dung tư vấn bán hàng chuẩn SEO | Có ảnh (trong chi tiết sản phẩm, chưa xác nhận khối) | `shots2/dieu_hanh/desktop/san-pham_dev-moclan-prd-0000-0000-000000000001.png`<br>`shots2/dieu_hanh/desktop/san-pham_dev-moclan-prd-0000-0000-000000000001_tinh-nang.png` | Khối câu chuyện & thông điệp; có thêm trang /tinh-nang |

### 3. Tạo & quản lý báo giá

| Mã | Chức năng | Trạng thái | Ảnh đại diện | Ghi chú |
|---|---|---|---|---|
| 3.1 | Cấu hình quy tắc giá 4 nhóm (Thưởng/Sàn/Trần) | Có ảnh | `shots/dieu_hanh/desktop/bang-gia.png`<br>`shots/dieu_hanh/desktop/gia.png`<br>`shots2/dieu_hanh/desktop/bang-gia_74d06878-87c0-41c0-ba04-6212be082270.png` | — |
| 3.2 | Bộ tính giá tự động (hoa + phí cắm + phụ phí) | Có ảnh | `shots/dieu_hanh/desktop/cai-dat.png`<br>`shots2/dieu_hanh/desktop/cai-dat__click1--s-1-s.png`<br>`shots2/dieu_hanh/desktop/cai-dat__click10--s-10-s.png` | — |
| 3.3 | Tính giá vốn thực tế (nguyên liệu + bao bì + thợ) | Có ảnh | `shots/dieu_hanh/desktop/tinh-gia.png`<br>`shots2/dieu_hanh/desktop/tinh-gia__tab1-Nguyên-liệu-_-đơn-giá.png`<br>`shots2/dieu_hanh/desktop/tinh-gia__tab2-Công-thức.png` | — |
| 3.4 | Kiểm soát cảnh báo & chặn giá dưới sàn | Có ảnh | `shots/dieu_hanh/desktop/bang-gia.png`<br>`shots2/dieu_hanh/desktop/bang-gia_74d06878-87c0-41c0-ba04-6212be082270.png`<br>`shots2/dieu_hanh/desktop/bang-gia__click1-Tạo-bảng-giá.png` | — |
| 3.5 | Quản lý ưu đãi, mã giảm giá, miễn phí ship | Có ảnh | `shots/dieu_hanh/desktop/uu-dai.png` | — |
| 3.6 | Phụ phí 6 kiểu dáng, hệ số ngày lễ 1.3x & VAT | Có ảnh | `shots/dieu_hanh/desktop/cai-dat.png`<br>`shots2/dieu_hanh/desktop/cai-dat__click1--s-1-s.png`<br>`shots2/dieu_hanh/desktop/cai-dat__click10--s-10-s.png` | — |
| 3.7 | Đề xuất & duyệt giảm giá sâu trình Điều hành | Chưa chụp | — | Nằm trong khung trao đổi của đơn (chế độ "Xin giảm giá"); đã có ảnh khung trao đổi nhưng chưa bấm vào chế độ này |
| 3.8 | Soạn & xem trước báo giá chuyên nghiệp | Có ảnh | `shots/dieu_hanh/desktop/bao-gia.png`<br>`shots2/dieu_hanh/desktop/bao-gia__click1-Tạo-Soạn.png` | — |
| 3.9 | Lưu & quản lý báo giá theo mã | Có ảnh | `shots/dieu_hanh/desktop/bao-gia.png`<br>`shots2/dieu_hanh/desktop/bao-gia__click1-Tạo-Soạn.png` | — |
| 3.10 | Điều chỉnh báo giá & lưu vết phiên bản | Có ảnh | `shots/dieu_hanh/desktop/bao-gia.png`<br>`shots2/dieu_hanh/desktop/bao-gia__click1-Tạo-Soạn.png` | — |
| 3.11 | Chia sẻ báo giá qua link / file PDF A6 | Có ảnh | `shots/dieu_hanh/desktop/bao-gia.png`<br>`shots2/dieu_hanh/desktop/bao-gia__click1-Tạo-Soạn.png`<br>`shots2/public/desktop/bg_BHxOs2TE98dtMEka4h9bD642gMNG7sV117A42TxWtFQ.png` | — |
| 3.12 | Chuyển báo giá chốt thành đơn hàng 1-click | Có ảnh | `shots/dieu_hanh/desktop/bao-gia.png`<br>`shots2/dieu_hanh/desktop/bao-gia__click1-Tạo-Soạn.png` | — |
| 3.13 | Báo giá tự động realtime trên Thẻ Chào | Có ảnh (đại diện, cần PO xác nhận) | `shots2/public/desktop/b_T01-B2MYYW0W.png` | Báo giá hiện trên trang khách của Thẻ Chào |

### 4. Tiếp nhận, quản lý & xử lý đơn hàng

| Mã | Chức năng | Trạng thái | Ảnh đại diện | Ghi chú |
|---|---|---|---|---|
| 4.1 | Tạo đơn hàng bán lẻ/chuỗi | Có ảnh | `shots/dieu_hanh/desktop/don-hang.png`<br>`shots2/dieu_hanh/desktop/don-hang__click1-Khách-tiềm-năng.png`<br>`shots2/dieu_hanh/desktop/don-hang__click1-Tạo-đơn.png` | — |
| 4.2 | Tự tạo đơn từ form khách trên Thẻ Chào/Link | Có ảnh | `shots2/public/desktop/b_T01-3FZV23AA.png`<br>`shots2/public/desktop/b_T01-B2MYYW0W.png`<br>`shots2/public/desktop/b_T01-NKM44ECM.png` | — |
| 4.3 | Danh sách/chi tiết đơn & lọc nâng cao | Có ảnh | `shots/dieu_hanh/desktop/don-hang.png`<br>`shots2/dieu_hanh/desktop/don-hang__click1-Khách-tiềm-năng.png`<br>`shots2/dieu_hanh/desktop/don-hang__click1-Tạo-đơn.png` | — |
| 4.4 | 3 hệ thống trạng thái độc lập | Có ảnh | `shots/dieu_hanh/desktop/don-hang.png`<br>`shots2/dieu_hanh/desktop/don-hang__click1-Khách-tiềm-năng.png`<br>`shots2/dieu_hanh/desktop/don-hang__click1-Tạo-đơn.png` | — |
| 4.5 | Quản lý khung giờ giao & sức chứa chi nhánh | Có ảnh | `shots/dieu_hanh/desktop/don-hang.png`<br>`shots2/dieu_hanh/desktop/don-hang__click1-Khách-tiềm-năng.png`<br>`shots2/dieu_hanh/desktop/don-hang__click1-Tạo-đơn.png` | — |
| 4.6 | Đổi thông tin đơn giữ vết | Có ảnh | `shots/dieu_hanh/desktop/don-hang.png`<br>`shots2/dieu_hanh/desktop/don-hang__click1-Khách-tiềm-năng.png`<br>`shots2/dieu_hanh/desktop/don-hang__click1-Tạo-đơn.png` | — |
| 4.7 | Luồng hủy đơn & hoàn tiền duyệt 2 bước | Có ảnh | `shots/dieu_hanh/desktop/don-hang.png`<br>`shots2/dieu_hanh/desktop/don-hang__click1-Khách-tiềm-năng.png`<br>`shots2/dieu_hanh/desktop/don-hang__click1-Tạo-đơn.png` | — |
| 4.8 | Lịch sử thao tác đơn tóm tắt | Có ảnh | `shots/dieu_hanh/desktop/don-hang.png`<br>`shots2/dieu_hanh/desktop/don-hang__click1-Khách-tiềm-năng.png`<br>`shots2/dieu_hanh/desktop/don-hang__click1-Tạo-đơn.png` | — |
| 4.9 | In phiếu xưởng (khổ A6) & thiệp/băng rôn | Có ảnh | `shots/dieu_hanh/desktop/don-hang.png`<br>`shots/dieu_hanh/desktop/in-an.png`<br>`shots2/dieu_hanh/desktop/don-hang__click1-Khách-tiềm-năng.png` | — |
| 4.10 | Xuất danh sách đơn Excel | Có ảnh | `shots/dieu_hanh/desktop/don-hang.png`<br>`shots2/dieu_hanh/desktop/don-hang__click1-Khách-tiềm-năng.png`<br>`shots2/dieu_hanh/desktop/don-hang__click1-Tạo-đơn.png` | — |
| 4.11 | Lịch sử đơn liên quan cùng khách hàng | Có ảnh | `shots/dieu_hanh/desktop/don-hang.png`<br>`shots/dieu_hanh/desktop/khach-hang.png`<br>`shots2/dieu_hanh/desktop/don-hang__click1-Khách-tiềm-năng.png` | — |
| 4.12 | Bảng điều phối phân cấp mức rủi ro trễ giờ | Có ảnh | `shots/dieu_hanh/desktop/the-chao.png`<br>`shots2/dieu_hanh/desktop/the-chao__banhang-chi-tiet-the.png`<br>`shots2/dieu_hanh/desktop/the-chao__banhang-cho-khach.png` | — |
| 4.13 | Phân công thợ cắm & hàng đợi chế tác | Có ảnh | `shots/dieu_hanh/desktop/the-chao.png`<br>`shots2/dieu_hanh/desktop/the-chao__banhang-chi-tiet-the.png`<br>`shots2/dieu_hanh/desktop/the-chao__banhang-cho-khach.png` | — |
| 4.14 | Theo dõi đơn thiếu thông tin | Có ảnh | `shots/dieu_hanh/desktop/don-hang.png`<br>`shots/dieu_hanh/desktop/the-chao.png`<br>`shots2/dieu_hanh/desktop/don-hang__click1-Khách-tiềm-năng.png` | — |
| 4.15 | Kiểm tra chất lượng QC | Một phần | `shots/dieu_hanh/desktop/don-hang.png`<br>`shots/dieu_hanh/desktop/the-chao.png`<br>`shots2/dieu_hanh/desktop/don-hang__click1-Khách-tiềm-năng.png` | Thiếu: màn QC với ảnh thật |
| 4.16 | AI chấm ảnh QC so với mẫu gốc | Một phần | `shots/dieu_hanh/desktop/the-chao.png`<br>`shots2/dieu_hanh/desktop/the-chao__banhang-chi-tiet-the.png`<br>`shots2/dieu_hanh/desktop/the-chao__banhang-cho-khach.png` | Thiếu: kết quả AI chấm ảnh |
| 4.17 | Bàn giao shipper & lên lịch giao lại | Có ảnh | `shots/dieu_hanh/desktop/the-chao.png`<br>`shots2/dieu_hanh/desktop/the-chao__banhang-chi-tiet-the.png`<br>`shots2/dieu_hanh/desktop/the-chao__banhang-cho-khach.png` | — |
| 4.18 | Ảnh xác nhận giao hàng tận tay (POD) bắt buộc | Một phần | `shots/dieu_hanh/desktop/the-chao.png`<br>`shots2/dieu_hanh/desktop/the-chao__banhang-chi-tiet-the.png`<br>`shots2/dieu_hanh/desktop/the-chao__banhang-cho-khach.png` | Thiếu: màn ảnh giao tận tay |
| 4.19 | Bảng điều phối đối tác ngoài, đếm ngược | Một phần | `shots/dieu_hanh/desktop/the-chao.png`<br>`shots2/dieu_hanh/desktop/the-chao__banhang-chi-tiet-the.png`<br>`shots2/dieu_hanh/desktop/the-chao__banhang-cho-khach.png` | Mới có trang gia công/chợ đối tác; chưa có đơn đã được nhận |
| 4.20 | Cổng chi nhánh cách ly đơn hàng | Có ảnh | `shots/dieu_hanh/desktop/the-chao.png`<br>`shots2/dieu_hanh/desktop/the-chao__banhang-chi-tiet-the.png`<br>`shots2/dieu_hanh/desktop/the-chao__banhang-cho-khach.png` | — |
| 4.21 | Cấu hình sức chứa tối đa theo khung giờ/lễ | Có ảnh | `shots/dieu_hanh/desktop/cai-dat.png`<br>`shots/dieu_hanh/desktop/the-chao.png`<br>`shots2/dieu_hanh/desktop/cai-dat__click1--s-1-s.png` | — |
| 4.22 | Lập kế hoạch thanh toán cọc/còn lại tự động | Có ảnh | `shots/dieu_hanh/desktop/the-chao.png`<br>`shots2/dieu_hanh/desktop/the-chao__banhang-chi-tiet-the.png`<br>`shots2/dieu_hanh/desktop/the-chao__banhang-cho-khach.png` | — |
| 4.23 | Mã VietQR động | Có ảnh | `shots/dieu_hanh/desktop/the-chao.png`<br>`shots2/dieu_hanh/desktop/the-chao__banhang-chi-tiet-the.png`<br>`shots2/dieu_hanh/desktop/the-chao__banhang-cho-khach.png` | — |
| 4.24 | Tải ảnh biên lai chuyển khoản & AI gợi ý | Một phần | `shots/dieu_hanh/desktop/the-chao.png`<br>`shots2/dieu_hanh/desktop/the-chao__banhang-chi-tiet-the.png`<br>`shots2/dieu_hanh/desktop/the-chao__banhang-cho-khach.png` | Thiếu: khách tải ảnh biên lai |
| 4.25 | Điều hành "Xác nhận tiền về" mở đơn cắm | Có ảnh | `shots/dieu_hanh/desktop/the-chao.png`<br>`shots2/dieu_hanh/desktop/the-chao__banhang-chi-tiet-the.png`<br>`shots2/dieu_hanh/desktop/the-chao__banhang-cho-khach.png` | — |
| 4.26 | Thu phần tiền còn lại | Có ảnh | `shots/dieu_hanh/desktop/the-chao.png`<br>`shots2/dieu_hanh/desktop/the-chao__banhang-chi-tiet-the.png`<br>`shots2/dieu_hanh/desktop/the-chao__banhang-cho-khach.png` | — |
| 4.27 | Ghi nhận hoàn tiền khi hủy đơn | Có ảnh | `shots/dieu_hanh/desktop/the-chao.png`<br>`shots2/dieu_hanh/desktop/the-chao__banhang-chi-tiet-the.png`<br>`shots2/dieu_hanh/desktop/the-chao__banhang-cho-khach.png` | — |
| 4.28 | Đối soát tự động ngân hàng | Có ảnh | `shots/dieu_hanh/desktop/the-chao.png`<br>`shots2/dieu_hanh/desktop/the-chao__banhang-chi-tiet-the.png`<br>`shots2/dieu_hanh/desktop/the-chao__banhang-cho-khach.png` | — |
| 4.29 | Tự động cập nhật trang theo dõi của khách | Một phần | `shots2/public/desktop/b_T01-3FZV23AA.png`<br>`shots2/public/desktop/b_T01-B2MYYW0W.png`<br>`shots2/public/desktop/b_T01-NKM44ECM.png` | Thiếu: trang theo dõi của khách ở các bước sau |
| 4.30 | Cấu hình kênh báo tin nhân viên | Có ảnh | `shots-p1-empty/dieu_hanh/desktop/cai-dat_thong-bao.png`<br>`shots/dieu_hanh/desktop/cai-dat_thong-bao.png` | Màn cấu hình thông báo |
| 4.31 | Tự động gửi Zalo ZNS / SMS cho khách | Không có màn hình riêng (đề xuất, chờ PO) | — | Tin nhắn gửi ra ngoài (Zalo/SMS), không có màn; cấu hình nằm ở tích hợp |
| 4.32 | Tự động nhắc lịch giao trước 60 & 30 phút | Không có màn hình riêng (đề xuất, chờ PO) | — | Nhắc tự động, không có màn |

### 5. Thẻ Chào mẫu hoa & trang khách hàng

| Mã | Chức năng | Trạng thái | Ảnh đại diện | Ghi chú |
|---|---|---|---|---|
| 5.1 | Tạo bộ mẫu Thẻ Chào theo chủ đề/dịp | Có ảnh | `shots/dieu_hanh/desktop/the-chao.png`<br>`shots2/dieu_hanh/desktop/the-chao__banhang-chi-tiet-the.png`<br>`shots2/dieu_hanh/desktop/the-chao__banhang-cho-khach.png` | — |
| 5.2 | Chia sẻ link rút gọn gắn mã nhân viên bán | Có ảnh | `shots/dieu_hanh/desktop/the-chao.png`<br>`shots2/dieu_hanh/desktop/the-chao__banhang-chi-tiet-the.png`<br>`shots2/dieu_hanh/desktop/the-chao__banhang-cho-khach.png` | — |
| 5.3 | Cấu hình thời hạn & thu hồi link Thẻ Chào | Có ảnh | `shots/dieu_hanh/desktop/the-chao.png`<br>`shots2/dieu_hanh/desktop/the-chao__banhang-chi-tiet-the.png`<br>`shots2/dieu_hanh/desktop/the-chao__banhang-cho-khach.png` | — |
| 5.4 | Tự tạo mã QR & ảnh ghép 3-4 mẫu | Có ảnh | `shots/dieu_hanh/desktop/the-chao.png`<br>`shots2/dieu_hanh/desktop/the-chao__banhang-chi-tiet-the.png`<br>`shots2/dieu_hanh/desktop/the-chao__banhang-cho-khach.png` | — |
| 5.5 | Công tắc cấu hình ẩn/hiện giá & thành phần | Có ảnh | `shots/dieu_hanh/desktop/the-chao.png`<br>`shots2/dieu_hanh/desktop/the-chao__banhang-chi-tiet-the.png`<br>`shots2/dieu_hanh/desktop/the-chao__banhang-cho-khach.png` | — |
| 5.6 | Bảng bán hàng realtime theo dõi hành vi khách | Có ảnh | `shots/dieu_hanh/desktop/the-chao.png`<br>`shots2/dieu_hanh/desktop/the-chao__banhang-chi-tiet-the.png`<br>`shots2/dieu_hanh/desktop/the-chao__banhang-cho-khach.png` | — |
| 5.7 | Màn hình "Hộp thư việc hôm nay" ưu tiên | Có ảnh | `shots/dieu_hanh/desktop/the-chao.png`<br>`shots2/dieu_hanh/desktop/the-chao__banhang-chi-tiet-the.png`<br>`shots2/dieu_hanh/desktop/the-chao__banhang-cho-khach.png` | — |
| 5.8 | Cấu hình phân quyền xem đơn Sale | Có ảnh | `shots/dieu_hanh/desktop/cai-dat.png`<br>`shots/dieu_hanh/desktop/the-chao.png`<br>`shots2/dieu_hanh/desktop/cai-dat__click1--s-1-s.png` | — |
| 5.9 | Khách xem mẫu hoa (vuốt, thả tim) | Có ảnh | `shots2/public/desktop/b_T01-3FZV23AA.png`<br>`shots2/public/desktop/b_T01-B2MYYW0W.png`<br>`shots2/public/desktop/b_T01-NKM44ECM.png` | — |
| 5.10 | Đặt hoa trực tiếp từ Thẻ Chào | Có ảnh | `shots2/public/desktop/b_T01-3FZV23AA.png`<br>`shots2/public/desktop/b_T01-B2MYYW0W.png`<br>`shots2/public/desktop/b_T01-NKM44ECM.png` | — |
| 5.11 | Nút "Nhắn tư vấn mẫu này" gắn mã sản phẩm | Có ảnh | `shots2/public/desktop/b_T01-3FZV23AA.png`<br>`shots2/public/desktop/b_T01-B2MYYW0W.png`<br>`shots2/public/desktop/b_T01-NKM44ECM.png` | — |
| 5.12 | Trang khách xem tiến độ cắm & ảnh thành phẩm | Có ảnh | `shots2/public/desktop/b_T01-3FZV23AA.png`<br>`shots2/public/desktop/b_T01-B2MYYW0W.png`<br>`shots2/public/desktop/b_T01-NKM44ECM.png` | — |
| 5.13 | Khách duyệt ảnh QC thành phẩm trong 10 phút | Một phần | `shots2/public/desktop/b_T01-3FZV23AA.png`<br>`shots2/public/desktop/b_T01-B2MYYW0W.png`<br>`shots2/public/desktop/b_T01-NKM44ECM.png` | Thiếu: khách duyệt ảnh thành phẩm |
| 5.14 | Đề xuất thay loại hoa thiếu qua link duyệt | Một phần | `shots2/public/desktop/b_T01-3FZV23AA.png`<br>`shots2/public/desktop/b_T01-B2MYYW0W.png`<br>`shots2/public/desktop/b_T01-NKM44ECM.png` | Thiếu: trang khách xem đề xuất đổi hoa |
| 5.15 | Màn hình cảm ơn, mã giảm giá & đặt lại đơn | Một phần | `shots2/public/desktop/b_T01-3FZV23AA.png`<br>`shots2/public/desktop/b_T01-B2MYYW0W.png`<br>`shots2/public/desktop/b_T01-NKM44ECM.png` | Thiếu: màn cảm ơn sau đơn |

### 6. Báo cáo hoạt động & tài chính

| Mã | Chức năng | Trạng thái | Ảnh đại diện | Ghi chú |
|---|---|---|---|---|
| 6.1 | Báo cáo tổng hợp đơn hàng & tỷ lệ hủy/trễ | Có ảnh | `shots/dieu_hanh/desktop/bao-cao.png`<br>`shots2/dieu_hanh/desktop/bao-cao__tab1-Đơn-hàng.png`<br>`shots2/dieu_hanh/desktop/bao-cao__tab2-Doanh-thu.png` | — |
| 6.2 | Báo cáo doanh thu thực thu vs dự kiến | Có ảnh | `shots/dieu_hanh/desktop/bao-cao.png`<br>`shots2/dieu_hanh/desktop/bao-cao__tab1-Đơn-hàng.png`<br>`shots2/dieu_hanh/desktop/bao-cao__tab2-Doanh-thu.png` | — |
| 6.3 | Báo cáo sản phẩm bán chạy & tông màu ưa thích | Có ảnh | `shots/dieu_hanh/desktop/bao-cao.png`<br>`shots2/dieu_hanh/desktop/bao-cao__tab1-Đơn-hàng.png`<br>`shots2/dieu_hanh/desktop/bao-cao__tab2-Doanh-thu.png` | — |
| 6.4 | Báo cáo phễu chuyển đổi Thẻ Chào & Sale | Có ảnh | `shots/dieu_hanh/desktop/bao-cao.png`<br>`shots/dieu_hanh/desktop/the-chao.png`<br>`shots2/dieu_hanh/desktop/bao-cao__tab1-Đơn-hàng.png` | — |
| 6.5 | Báo cáo hiệu suất (Sale/Thợ/Shipper) | Có ảnh | `shots/dieu_hanh/desktop/bao-cao.png`<br>`shots2/dieu_hanh/desktop/bao-cao__tab1-Đơn-hàng.png`<br>`shots2/dieu_hanh/desktop/bao-cao__tab2-Doanh-thu.png` | — |
| 6.6 | Báo cáo đối chiếu thu tiền: sổ thu vs ngân hàng | Có ảnh | `shots/dieu_hanh/desktop/bao-cao.png`<br>`shots2/dieu_hanh/desktop/bao-cao__tab1-Đơn-hàng.png`<br>`shots2/dieu_hanh/desktop/bao-cao__tab2-Doanh-thu.png` | — |
| 6.7 | Báo cáo truy vết lịch sử đơn giải quyết khiếu nại | Có ảnh | `shots/dieu_hanh/desktop/bao-cao.png`<br>`shots2/dieu_hanh/desktop/bao-cao__tab1-Đơn-hàng.png`<br>`shots2/dieu_hanh/desktop/bao-cao__tab2-Doanh-thu.png` | — |
| 6.8 | Xuất báo cáo tài chính ra Excel (.xlsx) | Có ảnh | `shots/dieu_hanh/desktop/bao-cao.png`<br>`shots2/dieu_hanh/desktop/bao-cao__tab1-Đơn-hàng.png`<br>`shots2/dieu_hanh/desktop/bao-cao__tab2-Doanh-thu.png` | — |
| 6.9 | Báo cáo tiêu thụ hạn mức AI theo kỳ | Có ảnh | `shots/dieu_hanh/desktop/muc-dung.png` | — |

### 7. AI phân tích, nội dung & marketing

| Mã | Chức năng | Trạng thái | Ảnh đại diện | Ghi chú |
|---|---|---|---|---|
| 7.1 | AI nhận diện ảnh mẫu (loại hoa, cành, màu) | Một phần | `shots/dieu_hanh/desktop/tai-anh.png`<br>`shots2/dieu_hanh/desktop/tai-anh__tab1-Nhận-diện-ảnh.png`<br>`shots2/dieu_hanh/desktop/tai-anh__tab2-Bài-giới-thiệu.png` | Mới có màn khởi đầu, chưa có kết quả nhận diện |
| 7.2 | Bộ nội dung marketing tự động từ 1 ảnh | Một phần | `shots/dieu_hanh/desktop/san-pham.png`<br>`shots/dieu_hanh/desktop/san-pham_kha-dung.png`<br>`shots/dieu_hanh/desktop/san-pham_nhap-hang-loat.png` | Mới có màn khởi đầu, chưa có bộ nội dung |
| 7.3 | Màn hình kiểm tra sẵn sàng sản phẩm ra thị trường | Có ảnh | `shots/dieu_hanh/desktop/tai-anh.png`<br>`shots2/dieu_hanh/desktop/tai-anh__tab1-Nhận-diện-ảnh.png`<br>`shots2/dieu_hanh/desktop/tai-anh__tab2-Bài-giới-thiệu.png` | — |

### 8. Landing page bán hàng

| Mã | Chức năng | Trạng thái | Ảnh đại diện | Ghi chú |
|---|---|---|---|---|
| 8.1 | Trình dựng Landing Page bộ sưu tập / sự kiện | Có ảnh | `shots/dieu_hanh/desktop/catalog.png`<br>`shots/dieu_hanh/desktop/landing-page.png` | — |

### 9. Chat nội bộ, đa chuỗi & phân quyền nâng cao

| Mã | Chức năng | Trạng thái | Ảnh đại diện | Ghi chú |
|---|---|---|---|---|
| 9.1 | Trao đổi / chat nội bộ trên từng đơn | Một phần | `shots/dieu_hanh/desktop/chat.png`<br>`shots/dieu_hanh/desktop/hoi-thoai.png`<br>`shots/dieu_hanh/desktop/the-chao.png` | Có khung trao đổi trong đơn; kênh chat nội bộ /hoi-thoai bị khoá |
| 9.2 | Hồ sơ thương hiệu | Có ảnh | `shots/dieu_hanh/desktop/cai-dat.png`<br>`shots/dieu_hanh/desktop/ho-so.png`<br>`shots2/dieu_hanh/desktop/cai-dat__click1--s-1-s.png` | — |
| 9.3 | Hồ sơ kinh doanh | Có ảnh | `shots/dieu_hanh/desktop/ho-so.png`<br>`shots2/dieu_hanh/desktop/ho-so__click1-Thương-hiệu.png` | — |
| 9.4 | Thư viện tài nguyên & thùng rác 30 ngày | Có ảnh | `shots/dieu_hanh/desktop/kho-du-lieu.png`<br>`shots2/dieu_hanh/desktop/kho-du-lieu__tab1-Ảnh-gốc.png`<br>`shots2/dieu_hanh/desktop/kho-du-lieu__tab10-Kịch-bản-tư-vấn.png` | — |
| 9.5 | Quản lý kết nối Webhook/API key | Một phần | `shots/dieu_hanh/desktop/tich-hop.png` | Ở dev màn Tích hợp hiện "Sắp ra mắt" |
| 9.6 | Quản lý tác vụ nền & chạy lại tác vụ lỗi | Một phần | `shots/dieu_hanh/desktop/job.png`<br>`shots2/dieu_hanh/desktop/job__khong-tim-thay.png` | Chưa có tác vụ nền thật để chụp chi tiết |
| 9.7 | Cấu hình chính sách & trần chi phí AI tháng | Có ảnh | `shots-p1-empty/dieu_hanh/desktop/cai-dat-ai.png`<br>`shots/dieu_hanh/desktop/cai-dat-ai.png` | Màn Chính sách AI |
| 9.8 | Console quản trị nền tảng đa cửa hàng | Có ảnh | `shots/platform/desktop/van-hanh.png` | — |
| 9.9 | Luồng thẩm định & duyệt đăng ký tổ chức mới | Có ảnh | `shots/platform/desktop/van-hanh_dang-ky.png` | — |
| 9.10 | Khởi tạo tổ chức & khởi tạo gói dịch vụ | Có ảnh | `shots/platform/desktop/van-hanh_to-chuc.png`<br>`shots2/platform/desktop/van-hanh_to-chuc__click1-Tạo-tổ-chức.png`<br>`shots2/platform/desktop/van-hanh_to-chuc_dev-moclan-org-0000-0000-000000000001.png` | — |
| 9.11 | Duyệt 2 bước cho thao tác nhạy cảm | Có ảnh | `shots/platform/desktop/van-hanh_phe-duyet.png` | — |
| 9.12 | Cơ chế chặn tự nâng quyền chính mình | Có ảnh | `shots/platform/desktop/van-hanh_phe-duyet.png` | — |
| 9.13 | Cách ly phân quyền dữ liệu theo chi nhánh | Không có màn hình riêng (đề xuất, chờ PO) | — | Cách ly dữ liệu theo chi nhánh ở máy chủ |
| 9.14 | Đăng nhập 1 lần (SSO 15 phút) | Không có màn hình riêng (đề xuất, chờ PO) | — | SSO liên ứng dụng, không có màn |

### 10. Quản lý credit AI, hạn mức & thuê bao SaaS

| Mã | Chức năng | Trạng thái | Ảnh đại diện | Ghi chú |
|---|---|---|---|---|
| 10.1 | Xem số dư credit AI & lịch sử tiêu thụ | Có ảnh | `shots/dieu_hanh/desktop/muc-dung.png` | — |
| 10.2 | Hoàn 100% credit AI khi tác vụ bị lỗi | Có ảnh | `shots/dieu_hanh/desktop/muc-dung.png` | — |
| 10.3 | Thiết lập hạn mức dịch vụ (trần AI, SMS, Zalo) | Có ảnh | `shots/dieu_hanh/desktop/muc-dung.png`<br>`shots/platform/desktop/van-hanh_muc-dung.png` | — |
| 10.4 | Ghi nhận chi phí thật (USD/VND) đo lợi nhuận | Có ảnh | `shots/dieu_hanh/desktop/muc-dung.png`<br>`shots/platform/desktop/van-hanh_muc-dung.png` | — |
| 10.5 | Cảnh báo khi credit AI còn dưới 20% | Có ảnh | `shots/dieu_hanh/desktop/muc-dung.png` | — |
| 10.6 | Admin nạp / hoàn / tặng credit khuyến mãi | Có ảnh | `shots/platform/desktop/van-hanh_to-chuc.png`<br>`shots2/platform/desktop/van-hanh_to-chuc__click1-Tạo-tổ-chức.png`<br>`shots2/platform/desktop/van-hanh_to-chuc_dev-moclan-org-0000-0000-000000000001.png` | — |
| 10.7 | Quản lý & thu phí thuê bao SaaS | Có ảnh | `shots/platform/desktop/van-hanh_cau-hinh.png` | — |
| 10.8 | Cấu hình trỏ tên miền riêng (Custom Domain) | Có ảnh | `shots/dieu_hanh/desktop/cai-dat.png`<br>`shots2/dieu_hanh/desktop/cai-dat__click1--s-1-s.png`<br>`shots2/dieu_hanh/desktop/cai-dat__click10--s-10-s.png` | — |
