# Phạm vi Giai đoạn 1 — 123 chức năng bàn giao ALG

Bản xem của `src/lib/delivery/gd1.manifest.json`. Chủ dự án chốt phạm vi ngày 10/11/2026 (điểm duyệt sau Bước 1 trong [kế hoạch](BANGIAO_GD1_123_CHUC_NANG.md)). Khi hai nơi khác nhau, manifest là nguồn đúng.

## 1. Tổng quan

| Nhóm trang | Số trang |
|---|---:|
| Thuộc 123 chức năng | 55 |
| Ngoài 123 nhưng giao, gồm khung 3 tầng | 33 |
| Không giao | 26 |
| **Tổng** | **114** |

Ước tính phần code đi theo danh sách này: 3.068/3.874 tệp, 386/532 API, code giữ lại dùng 141/154 bảng. Danh sách API đầy đủ sẽ được tính ở Bước 2.

## 2. Chức năng 9.14 và SocialFlow

Đăng bài đã chạy ngay trong ALG (quyết định D-46), không còn ứng dụng liên kết để mở. Nghiệm thu: mở Công cụ → Tạo nội dung → Đăng tự động không phải đăng nhập lại; phiên liên kết 15 phút kiểm bằng test tự động.

Mô-đun `src/modules/social-publishing` gọi thẳng API của Meta, TikTok, Zalo. Việc còn lại trong bản giao:

- `src/components/dashboard/marketing-workspace.tsx` ở trang chủ còn gọi bài đăng qua proxy SocialFlow: chuyển sang mô-đun mới hoặc bỏ khối này.
- Bỏ route `/api/v1/proxy/[...path]`, biến `SOCIALFLOW_URL`, `LOCALBUDD_URL`.
- Bỏ chữ "SocialFlow" trên màn hình (`api-tokens-panel.tsx`, `post-status-report-card.tsx`, `connector-catalog.ts`).
- Đăng thật lên Meta, TikTok, Zalo cần ALG có ứng dụng được các nền tảng này duyệt.

## 3. Ngoài 123 nhưng giao

| Trang | Lý do |
|---|---|
| `/cai-dat/ma-tran-camket`, `/cai-dat/ma-tran-chinhsach`, `/cai-dat/ma-tran-phigiacong`, `/cai-dat/ma-tran-thanhtoan-datco`, `/cai-dat/ma-tran-uudai`, `/van-hanh/ma-tran-camket`, `/van-hanh/ma-tran-chinhsach`, `/van-hanh/ma-tran-phigiacong`, `/van-hanh/ma-tran-thanhtoan-datco`, `/van-hanh/ma-tran-uudai`, `/van-hanh/quan-tri-ma-tran` | Ma trận quản trị Mẹ → Chuỗi → Cửa hàng, đang áp vào báo giá và đặt đơn |
| `/cai-dat/thong-bao`, `/van-hanh/thong-bao` | Ma trận thông báo theo tầng |
| `/dieu-phoi/doi-tac` | Quản lý chi nhánh và xưởng của tầng Chuỗi |
| `/van-hanh/phe-duyet`, `/van-hanh/truong-du-lieu`, `/van-hanh/suc-khoe`, `/van-hanh/nhat-ky`, `/van-hanh/du-lieu`, `/van-hanh/hang-doi-loi`, `/van-hanh/tich-hop` | Console vận hành của tầng Mẹ |
| `/bst/[orgSlug]/[catalogCode]`, `/chinh-sach-bao-mat` | Trang công khai dùng chung |
| `/bang-gia`, `/bang-gia/[id]` | Bảng giá, không có trong kịch bản nghiệm thu — ngoài 123, chủ dự án chốt giao 10/11/2026 |
| `/ho-so`, `/ho-so/danh-thiep`, `/ho-so/thu-vien-thuong-hieu` | Hồ sơ thương hiệu mở rộng; 9.2 và 9.3 đã dùng Cài đặt tiệm — ngoài 123, chủ dự án chốt giao 10/11/2026 |
| `/so-lieu`, `/du-lieu` | Mục menu của tầng Chuỗi, không có trong 123 chức năng — ngoài 123, chủ dự án chốt giao 10/11/2026 |
| `/tinh-gia/gia-ban`, `/tinh-gia/du-toan` | Công cụ tính giá mở rộng — ngoài 123, chủ dự án chốt giao 10/11/2026 |
| `/san-pham/[id]/tinh-nang` | Trang cha của màn nội dung tư vấn 2.9 — ngoài 123, chủ dự án chốt giao 10/11/2026 |

## 4. Không giao

| Trang | Nhóm |
|---|---|
| `/van-hanh/nganh` | Tầng SaaS Ngành |
| `/creative-studio`, `/video`, `/noi-dung`, `/kho-templates`, `/cong-cu/anh-san-pham`, `/cong-cu/bo-anh-san-pham`, `/cong-cu/poster-banner`, `/in-an` | Sáng tạo ảnh, video, nội dung |
| `/market-intelligence`, `/thu-hut-khach`, `/quang-ba/chien-dich`, `/cham-soc`, `/lich-dang` | Nghiên cứu thị trường và thu hút khách |
| `/hoi-thoai`, `/hoi-thoai/kenh-tich-hop`, `/chat`, `/ket-noi`, `/noi-bo/ket-noi` | Hội thoại đa kênh và kết nối ứng dụng ngoài |
| `/tri-thuc`, `/bo-may`, `/them` | Tri thức, bộ máy AI, mục phụ |
| `/van-hanh/marketplace`, `/chia-se/cho-doi-tac/[token]`, `/van-hanh/thu-vien-giao-dien`, `/van-hanh/thu-vien-man-hinh` | Công cụ nội bộ của đội phát triển và chợ đối tác |

## 5. Worker và tác vụ nền

| Phần | Tác vụ | Quyết định |
|---|---|---|
| `workers/vision` | `vision.analyze` | Giao. |
| `workers/shared` | — | Giao. |
| `workers/media_ai` | `media.optimize`, `media.variant`, `media.variant.cloud` | Giao. Trang duyệt và luồng tạo sản phẩm có gọi xử lý ảnh. |
| `workers/media_ai/video` | `video.render` | Không giao. Vòng lặp trong workers/media_ai/jobs/worker.py đang nhận cả tác vụ này, cần tách ở Bước 2. |
| `workers/media_ai/audio` | `audio.generate`, `audio.voice_clone` | Không giao. Vòng lặp trong workers/media_ai/jobs/worker.py đang nhận cả tác vụ này, cần tách ở Bước 2. |

Các tác vụ `product.copy.generate`, `content.generate` không có worker Python xử lý.

## 6. Từng chức năng

### Nhóm 1 — Nền tảng chung & phân quyền (19)

| Mã | Chức năng | Màn hình | Số API nêu trong tài liệu | Bước nghiệm thu |
|---|---|---|---:|---:|
| 1.1 | Truy cập theo tổ chức (Multi-tenant) | Chạy phía sau | 1 | 2 |
| 1.2 | Đăng nhập & thu hồi phiên cũ | `/`, `/dang-nhap` | 0 | 2 |
| 1.3 | Đăng xuất & vô hiệu hóa phiên tức thì | `/cai-dat/thanh-vien` | 1 | 2 |
| 1.4 | Bắt buộc đổi mật khẩu tạm lần đầu | `/dang-nhap` | 0 | 3 |
| 1.5 | Quản lý thông tin cửa hàng & logo an toàn | `/cai-dat` | 3 | 1 |
| 1.6 | Khai báo chi nhánh & tọa độ quận/huyện | `/san-pham`, `/san-pham/[id]`, `/san-pham/nhap-hang-loat` | 3 | 1 |
| 1.7 | Khai báo dịp tặng hoa ngành chuẩn | `/cai-dat` | 2 | 1 |
| 1.8 | Chính sách cửa hàng (ngân hàng, phụ thu lễ) | `/b/[sendCode]`, `/cai-dat` | 0 | 4 |
| 1.9 | Cấu hình trường dữ liệu linh hoạt theo shop | `/cai-dat` | 2 | 1 |
| 1.10 | Quản lý & mời thành viên | `/cai-dat/thanh-vien` | 2 | 1 |
| 1.11 | Điều chỉnh/gỡ thành viên & thu hồi phiên ngay | `/cai-dat/thanh-vien` | 4 | 3 |
| 1.12 | 6 vai trò mặc định | `/cai-dat/thanh-vien`, `/dang-nhap` | 0 | 4 |
| 1.13 | Tạo vai trò tùy chỉnh | `/cai-dat/thanh-vien`, `/cai-dat/thanh-vien/vai-tro`, `/vai-tro` | 2 | 3 |
| 1.14 | Hiển thị giao diện & menu theo quyền | `/` | 0 | 2 |
| 1.15 | Chặn thao tác vượt quyền & ghi log vi phạm | Chạy phía sau | 0 | 2 |
| 1.16 | Khóa cứng quyền nhạy cảm ở tầng server | `/bao-gia`, `/cong-cu`, `/don-hang`, `/the-chao` | 1 | 6 |
| 1.17 | Nhật ký thao tác chi tiết IP/thiết bị | `/audit` | 1 | 2 |
| 1.18 | Gắn dữ liệu với tổ chức ở tầng database (RLS) | Chạy phía sau | 0 | 2 |
| 1.19 | Chặn truy cập chéo (404 Not Found) | Chạy phía sau | 0 | 3 |

### Nhóm 2 — Sản phẩm, mẫu hoa & hình ảnh (9)

| Mã | Chức năng | Màn hình | Số API nêu trong tài liệu | Bước nghiệm thu |
|---|---|---|---:|---:|
| 2.1 | Tạo thẻ sản phẩm mẫu hoa | `/san-pham`, `/san-pham/[id]`, `/san-pham/tao-moi` | 1 | 3 |
| 2.2 | Cập nhật thẻ sản phẩm & đồng bộ Thẻ Chào | `/san-pham/[id]`, `/san-pham/kha-dung`, `/san-pham/nhap-hang-loat`, `/san-pham/tao-moi` | 8 | 1 |
| 2.3 | Trạng thái sản phẩm (Nháp/Hoạt động/Lưu trữ) | `/b/[sendCode]`, `/san-pham` | 10 | 4 |
| 2.4 | Biến thể kích cỡ (Nhỏ/Vừa/Lớn/VIP) | `/san-pham/[id]` | 0 | 1 |
| 2.5 | Định mức nguyên liệu BOM | `/san-pham`, `/san-pham/tao-moi`, `/tinh-gia/cong-thuc` | 1 | 1 |
| 2.6 | Nhập danh mục hàng loạt từ Excel/CSV | `/san-pham`, `/san-pham/[id]`, `/san-pham/nhap-hang-loat` | 2 | 1 |
| 2.7 | Duyệt đề xuất thay đổi thông tin/giá 2 bước | `/san-pham/[id]` | 2 | 1 |
| 2.8 | Cấu hình khả dụng, ẩn mẫu theo ngày | `/b/[sendCode]`, `/san-pham/[id]`, `/san-pham/kha-dung` | 1 | 2 |
| 2.9 | Lưu bộ nội dung tư vấn bán hàng chuẩn SEO | `/san-pham/[id]`, `/san-pham/[id]/tinh-nang/product-copy/[copyId]` | 3 | 2 |

### Nhóm 3 — Báo giá (13)

| Mã | Chức năng | Màn hình | Số API nêu trong tài liệu | Bước nghiệm thu |
|---|---|---|---:|---:|
| 3.1 | Cấu hình quy tắc giá 4 nhóm (Thưởng/Sàn/Trần) | `/gia`, `/kho-du-lieu` | 1 | 1 |
| 3.2 | Bộ tính giá tự động (hoa + phí cắm + phụ phí) | `/b/[sendCode]`, `/cai-dat` | 0 | 2 |
| 3.3 | Tính giá vốn thực tế (nguyên liệu + bao bì + thợ) | `/gia`, `/kho-du-lieu`, `/tinh-gia`, `/tinh-gia/gia-von`, `/tinh-gia/nguyen-lieu` | 2 | 1 |
| 3.4 | Kiểm soát cảnh báo & chặn giá dưới sàn | `/bao-gia`, `/cong-cu` | 0 | 2 |
| 3.5 | Quản lý ưu đãi, mã giảm giá, miễn phí ship | `/b/[sendCode]`, `/cong-cu`, `/uu-dai`, `/uu-dai/ma-giam-gia` | 1 | 2 |
| 3.6 | Phụ phí 6 kiểu dáng, hệ số ngày lễ 1.3x & VAT | `/b/[sendCode]`, `/cai-dat` | 0 | 2 |
| 3.7 | Đề xuất & duyệt giảm giá sâu trình Điều hành | `/cai-dat` | 2 | 2 |
| 3.8 | Soạn & xem trước báo giá chuyên nghiệp | `/bao-gia`, `/cong-cu` | 1 | 1 |
| 3.9 | Lưu & quản lý báo giá theo mã | `/bao-gia`, `/cong-cu` | 1 | 1 |
| 3.10 | Điều chỉnh báo giá & lưu vết phiên bản | `/bao-gia` | 1 | 1 |
| 3.11 | Chia sẻ báo giá qua link / file PDF A6 | `/bg/[token]` | 0 | 1 |
| 3.12 | Chuyển báo giá chốt thành đơn hàng 1-click | `/bao-gia` | 1 | 1 |
| 3.13 | Báo giá tự động realtime trên Thẻ Chào | `/b/[sendCode]` | 3 | 1 |

### Nhóm 4 — Đơn hàng (32)

| Mã | Chức năng | Màn hình | Số API nêu trong tài liệu | Bước nghiệm thu |
|---|---|---|---:|---:|
| 4.1 | Tạo đơn hàng bán lẻ/chuỗi | `/don-hang` | 2 | 1 |
| 4.2 | Tự tạo đơn từ form khách trên Thẻ Chào/Link | `/b/[sendCode]`, `/don-hang`, `/the-chao` | 3 | 2 |
| 4.3 | Danh sách/chi tiết đơn & lọc nâng cao | `/don-hang` | 4 | 1 |
| 4.4 | 3 hệ thống trạng thái độc lập | `/`, `/don-hang` | 1 | 2 |
| 4.5 | Quản lý khung giờ giao & sức chứa chi nhánh | `/don-hang` | 2 | 2 |
| 4.6 | Đổi thông tin đơn giữ vết | `/don-hang` | 0 | 1 |
| 4.7 | Luồng hủy đơn & hoàn tiền duyệt 2 bước | `/don-hang`, `/duyet`, `/the-chao` | 3 | 2 |
| 4.8 | Lịch sử thao tác đơn tóm tắt | `/don-hang` | 1 | 1 |
| 4.9 | In phiếu xưởng (khổ A6) & thiệp/băng rôn | `/don-hang`, `/in-phieu/[id]` | 1 | 1 |
| 4.10 | Xuất danh sách đơn Excel | `/`, `/don-hang` | 2 | 1 |
| 4.11 | Lịch sử đơn liên quan cùng khách hàng | `/khach-hang` | 1 | 1 |
| 4.12 | Bảng điều phối phân cấp mức rủi ro trễ giờ | `/dieu-phoi` | 0 | 1 |
| 4.13 | Phân công thợ cắm & hàng đợi chế tác | `/`, `/don-hang`, `/the-chao` | 4 | 2 |
| 4.14 | Theo dõi đơn thiếu thông tin | `/don-hang` | 1 | 1 |
| 4.15 | Kiểm tra chất lượng QC | `/don-hang` | 1 | 1 |
| 4.16 | AI chấm ảnh QC so với mẫu gốc | `/don-hang` | 0 | 1 |
| 4.17 | Bàn giao shipper & lên lịch giao lại | `/don-hang` | 0 | 2 |
| 4.18 | Ảnh xác nhận giao hàng tận tay (POD) bắt buộc | `/don-hang` | 1 | 2 |
| 4.19 | Bảng điều phối đối tác ngoài, đếm ngược | `/dieu-phoi`, `/subcontract/[orderCode]` | 5 | 1 |
| 4.20 | Cổng chi nhánh cách ly đơn hàng | `/cua-hang` | 1 | 1 |
| 4.21 | Cấu hình sức chứa tối đa theo khung giờ/lễ | `/b/[sendCode]`, `/cai-dat` | 0 | 2 |
| 4.22 | Lập kế hoạch thanh toán cọc/còn lại tự động | `/cai-dat` | 0 | 1 |
| 4.23 | Mã VietQR động | `/b/[sendCode]` | 0 | 1 |
| 4.24 | Tải ảnh biên lai chuyển khoản & AI gợi ý | `/g/[id]` | 2 | 1 |
| 4.25 | Điều hành "Xác nhận tiền về" mở đơn cắm | `/the-chao` | 1 | 3 |
| 4.26 | Thu phần tiền còn lại | `/don-hang`, `/the-chao` | 1 | 2 |
| 4.27 | Ghi nhận hoàn tiền khi hủy đơn | `/duyet`, `/the-chao` | 0 | 1 |
| 4.28 | Đối soát tự động ngân hàng | `/` | 1 | 1 |
| 4.29 | Tự động cập nhật trang theo dõi của khách | `/don-hang`, `/g/[id]` | 0 | 2 |
| 4.30 | Cấu hình kênh báo tin nhân viên | `/cai-dat` | 0 | 1 |
| 4.31 | Tự động gửi Zalo ZNS / SMS cho khách | `/the-chao` | 0 | 2 |
| 4.32 | Tự động nhắc lịch giao trước 60 & 30 phút | `/cai-dat`, `/dieu-phoi` | 0 | 1 |

### Nhóm 5 — Thẻ Chào & trang khách hàng (15)

| Mã | Chức năng | Màn hình | Số API nêu trong tài liệu | Bước nghiệm thu |
|---|---|---|---:|---:|
| 5.1 | Tạo bộ mẫu Thẻ Chào theo chủ đề/dịp | `/the-chao` | 1 | 1 |
| 5.2 | Chia sẻ link rút gọn gắn mã nhân viên bán | `/don-hang`, `/s/[code]`, `/the-chao` | 0 | 3 |
| 5.3 | Cấu hình thời hạn & thu hồi link Thẻ Chào | `/cai-dat`, `/the-chao` | 1 | 2 |
| 5.4 | Tự tạo mã QR & ảnh ghép 3-4 mẫu | `/the-chao` | 0 | 1 |
| 5.5 | Công tắc cấu hình ẩn/hiện giá & thành phần | `/the-chao` | 1 | 2 |
| 5.6 | Bảng bán hàng realtime theo dõi hành vi khách | `/the-chao` | 0 | 1 |
| 5.7 | Màn hình "Hộp thư việc hôm nay" ưu tiên | `/the-chao` | 0 | 1 |
| 5.8 | Cấu hình phân quyền xem đơn Sale | `/cai-dat` | 1 | 1 |
| 5.9 | Khách xem mẫu hoa (vuốt, thả tim) | `/b/[sendCode]` | 0 | 1 |
| 5.10 | Đặt hoa trực tiếp từ Thẻ Chào | `/b/[sendCode]` | 0 | 1 |
| 5.11 | Nút "Nhắn tư vấn mẫu này" gắn mã sản phẩm | `/b/[sendCode]` | 0 | 1 |
| 5.12 | Trang khách xem tiến độ cắm & ảnh thành phẩm | `/b/[sendCode]`, `/don-hang`, `/g/[id]` | 0 | 2 |
| 5.13 | Khách duyệt ảnh QC thành phẩm trong 10 phút | `/g/[id]` | 0 | 1 |
| 5.14 | Đề xuất thay loại hoa thiếu qua link duyệt | `/don-hang`, `/g/[id]` | 2 | 2 |
| 5.15 | Màn hình cảm ơn, mã giảm giá & đặt lại đơn | `/g/[id]`, `/the-chao` | 0 | 2 |

### Nhóm 6 — Báo cáo (9)

| Mã | Chức năng | Màn hình | Số API nêu trong tài liệu | Bước nghiệm thu |
|---|---|---|---:|---:|
| 6.1 | Báo cáo tổng hợp đơn hàng & tỷ lệ hủy/trễ | `/bao-cao`, `/don-hang` | 1 | 1 |
| 6.2 | Báo cáo doanh thu thực thu vs dự kiến | `/bao-cao` | 1 | 1 |
| 6.3 | Báo cáo sản phẩm bán chạy & tông màu ưa thích | `/bao-cao`, `/san-pham` | 1 | 1 |
| 6.4 | Báo cáo phễu chuyển đổi Thẻ Chào & Sale | `/the-chao` | 2 | 1 |
| 6.5 | Báo cáo hiệu suất (Sale/Thợ/Shipper) | `/bao-cao` | 1 | 1 |
| 6.6 | Báo cáo đối chiếu thu tiền: sổ thu vs ngân hàng | `/bao-cao` | 1 | 1 |
| 6.7 | Báo cáo truy vết lịch sử đơn giải quyết khiếu nại | `/don-hang` | 0 | 1 |
| 6.8 | Xuất báo cáo tài chính ra Excel (.xlsx) | `/`, `/don-hang` | 2 | 1 |
| 6.9 | Báo cáo tiêu thụ hạn mức AI theo kỳ | `/muc-dung` | 1 | 1 |

### Nhóm 7 — AI phân tích, nội dung & marketing (3)

| Mã | Chức năng | Màn hình | Số API nêu trong tài liệu | Bước nghiệm thu |
|---|---|---|---:|---:|
| 7.1 | AI nhận diện ảnh mẫu (loại hoa, cành, màu) | `/cong-cu`, `/duyet`, `/tai-anh` | 1 | 1 |
| 7.2 | Bộ nội dung marketing tự động từ 1 ảnh | `/san-pham` | 3 | 1 |
| 7.3 | Màn hình kiểm tra sẵn sàng sản phẩm ra thị trường | `/`, `/san-pham` | 8 | 2 |

### Nhóm 8 — Landing page (1)

| Mã | Chức năng | Màn hình | Số API nêu trong tài liệu | Bước nghiệm thu |
|---|---|---|---:|---:|
| 8.1 | Trình dựng Landing Page bộ sưu tập / sự kiện | `/c/[slug]`, `/catalog`, `/cong-cu`, `/landing-page`, `/xem-truoc-trang` | 1 | 1 |

### Nhóm 9 — Chat nội bộ, đa chuỗi & phân quyền nâng cao (14)

| Mã | Chức năng | Màn hình | Số API nêu trong tài liệu | Bước nghiệm thu |
|---|---|---|---:|---:|
| 9.1 | Trao đổi / chat nội bộ trên từng đơn | `/tin-nhan` | 4 | 1 |
| 9.2 | Hồ sơ thương hiệu | `/cai-dat` | 1 | 1 |
| 9.3 | Hồ sơ kinh doanh | `/cai-dat` | 1 | 1 |
| 9.4 | Thư viện tài nguyên & thùng rác 30 ngày | `/kho-du-lieu`, `/san-pham` | 3 | 2 |
| 9.5 | Quản lý kết nối Webhook/API key | `/tich-hop` | 25 | 1 |
| 9.6 | Quản lý tác vụ nền & chạy lại tác vụ lỗi | `/job`, `/job/[id]` | 1 | 1 |
| 9.7 | Cấu hình chính sách & trần chi phí AI tháng | `/cai-dat-ai`, `/muc-dung` | 3 | 2 |
| 9.8 | Console quản trị nền tảng đa cửa hàng | `/van-hanh`, `/van-hanh/to-chuc` | 1 | 1 |
| 9.9 | Luồng thẩm định & duyệt đăng ký tổ chức mới | `/dang-ky-thanh-cong`, `/dang-nhap`, `/van-hanh/dang-ky` | 2 | 2 |
| 9.10 | Khởi tạo tổ chức & khởi tạo gói dịch vụ | `/van-hanh/to-chuc` | 1 | 1 |
| 9.11 | Duyệt 2 bước cho thao tác nhạy cảm | `/don-hang`, `/san-pham/[id]` | 2 | 3 |
| 9.12 | Cơ chế chặn tự nâng quyền chính mình | `/cai-dat/thanh-vien`, `/san-pham/[id]` | 0 | 4 |
| 9.13 | Cách ly phân quyền dữ liệu theo chi nhánh | `/cai-dat/thanh-vien` | 0 | 2 |
| 9.14 | Đăng nhập 1 lần (SSO 15 phút) | `/cong-cu` | 1 | 1 |

### Nhóm 10 — Credit AI, hạn mức & thuê bao SaaS (8)

| Mã | Chức năng | Màn hình | Số API nêu trong tài liệu | Bước nghiệm thu |
|---|---|---|---:|---:|
| 10.1 | Xem số dư credit AI & lịch sử tiêu thụ | `/muc-dung` | 2 | 1 |
| 10.2 | Hoàn 100% credit AI khi tác vụ bị lỗi | Chạy phía sau | 0 | 1 |
| 10.3 | Thiết lập hạn mức dịch vụ (trần AI, SMS, Zalo) | `/muc-dung`, `/van-hanh/muc-dung`, `/van-hanh/to-chuc`, `/van-hanh/to-chuc/[id]` | 3 | 4 |
| 10.4 | Ghi nhận chi phí thật (USD/VND) đo lợi nhuận | `/van-hanh/muc-dung` | 1 | 1 |
| 10.5 | Cảnh báo khi credit AI còn dưới 20% | `/muc-dung` | 0 | 2 |
| 10.6 | Admin nạp / hoàn / tặng credit khuyến mãi | `/van-hanh/to-chuc`, `/van-hanh/to-chuc/[id]` | 1 | 1 |
| 10.7 | Quản lý & thu phí thuê bao SaaS | `/muc-dung`, `/van-hanh/cau-hinh`, `/van-hanh/to-chuc`, `/van-hanh/to-chuc/[id]` | 5 | 3 |
| 10.8 | Cấu hình trỏ tên miền riêng (Custom Domain) | `/cai-dat`, `/ch/[slug]`, `/van-hanh/to-chuc`, `/van-hanh/to-chuc/[id]` | 2 | 3 |
