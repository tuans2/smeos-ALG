# Bảng màn hình — 123 chức năng bàn giao ALG (BẢN NHÁP chờ duyệt)

Nguồn: `CHECKLIST_NGHIEM_THU_123_CHUC_NANG.xlsx`, `docs/huong-dan-su-dung/nhom-*.md` (mục "Mở ở"), danh sách `page.tsx` trong `src/app`, `src/lib/feature-lock.ts`.
Cột "Mã" là mã chức năng. Cột "Chắc chắn?" = **Có** nếu route khớp trực tiếp hướng dẫn; **Xác minh** nếu suy ra, sẽ kiểm khi chạy app.
Vai: ĐH = Điều hành, ĐP = Điều phối, Sale, Thợ, Ship (shipper), KT = Kế toán, NT = Nền tảng (Console), Khách = trang công khai không đăng nhập.

## A. Lưu ý trước khi chụp

1. **Khoá production.** `src/lib/feature-lock.ts` làm mờ nhiều tuyến trên production và hiện "Sắp ra mắt": `/hoi-thoai /catalog /creative-studio /video /noi-dung /lich-dang /kho-templates /dieu-phoi /job /duyet /so-lieu /bao-cao /muc-dung /audit /gia /tri-thuc /cai-dat-ai /ket-noi /khach-hang /bo-may /tin-nhan /noi-bo/ket-noi`. Chụp ở môi trường dev (không đặt `NEXT_PUBLIC_APP_ENV=production`) để thấy màn thật; ghi rõ cột "Khoá PROD".
2. **Nhiều chức năng không có màn riêng** (tự động, quy tắc nền, API): ghi "không có màn hình" trong chỉ mục, không chụp.
3. Màn có **ảnh sản phẩm người dùng tải lên** (7.1, 7.2, 5.13, 4.16, 4.24, 4.18) thuộc nhóm phải hỏi PO. Chụp chỉ ở chế độ xem, không chạy luồng tải ảnh thật.

## B. Màn hình cần chụp (theo route)

### B1. Công khai / đăng nhập
| Route | Mã | Vai | Trạng thái cần chụp | Chắc chắn? |
|---|---|---|---|---|
| `/dang-nhap` | 1.2, 1.3 | Khách | form, lỗi sai mật khẩu, phiên bị thu hồi | Có |
| Hộp đổi mật khẩu bắt buộc (phủ lên app) | 1.4 | mọi vai | hộp bắt buộc | Có |
| `/dang-ky-thanh-cong`, `/chinh-sach-bao-mat` | 9.9 | Khách | trang tĩnh | Xác minh |

### B2. Thiết lập cửa hàng (nhóm 1, 9)
| Route | Mã | Vai | Trạng thái | Chắc chắn? |
|---|---|---|---|---|
| `/cai-dat` (các tab 1 Thông tin tiệm, 2 Thương hiệu, 4 Đặt cọc & giá, 8 Thẻ Chào & quy trình, 11 Trường dữ liệu, 12 Tên miền) | 1.5, 1.7, 1.8, 1.9, 3.2, 3.6, 5.8, 4.21, 9.2, 10.8 | ĐH | mỗi tab một ảnh | Có |
| `/ho-so`, `/ho-so/thu-vien-thuong-hieu`, `/ho-so/danh-thiep` | 1.5, 9.2, 9.3 | ĐH | form, logo | Xác minh |
| `/cai-dat/thanh-vien` | 1.10, 1.11 | ĐH | danh sách, hộp thêm nhân viên | Có |
| `/cai-dat/thanh-vien/vai-tro` | 1.12, 1.13, 1.16 | ĐH | danh sách vai, sửa quyền | Có |
| `/cai-dat/thong-bao` | 4.30 | ĐH | cấu hình kênh | Xác minh |
| `/cai-dat/ma-tran-*` (5 màn: cam kết, chính sách, phí gia công, thanh toán đặt cọc, ưu đãi) | 1.8, 4.22 | ĐH | mỗi màn một ảnh | Xác minh |
| `/audit` | 1.17 | ĐH | **Khoá PROD** | Có |
| `/tich-hop` | 9.5 | ĐH | danh sách khoá API, webhook | Có |
| `/kho-du-lieu` | 9.4 | ĐH | thư viện, thùng rác | Có |
| `/job`, `/job/[id]` | 9.6 | ĐH | **Khoá PROD**; danh sách, chi tiết | Có |
| `/cai-dat-ai` | 9.7 | ĐH | **Khoá PROD** | Xác minh |

### B3. Sản phẩm, giá (nhóm 2, 3)
| Route | Mã | Vai | Trạng thái | Chắc chắn? |
|---|---|---|---|---|
| `/san-pham` | 2.1–2.3, 7.2 | ĐH, QL SP | lưới, rỗng, chọn nhiều (thanh hàng loạt) | Có |
| `/san-pham/tao-moi` | 2.1, 2.5 | ĐH | form trống, lỗi trùng mã | Có |
| `/san-pham/[id]` | 2.2, 2.4, 2.5, 2.7, 2.8, 2.9, 3.6 | ĐH | từng khối: tổng quan, giá, định mức, đề xuất, khả dụng, câu chuyện | Có |
| `/san-pham/[id]/tinh-nang`, `.../product-copy/[copyId]` | 2.9, 7.2 | ĐH | soạn nội dung | Xác minh |
| `/san-pham/nhap-hang-loat` | 1.6, 2.6 | ĐH | tải file, xem trước | Có |
| `/san-pham/kha-dung` | 2.8 | ĐH | lịch khả dụng | Có |
| `/gia`, `/tinh-gia`, `/tinh-gia/cong-thuc`, `/du-toan`, `/gia-ban`, `/gia-von`, `/nguyen-lieu` | 2.5, 3.1, 3.3 | ĐH | **`/gia` khoá PROD** | Có |
| `/bang-gia`, `/bang-gia/[id]` | 3.1, 3.4 | ĐH | bảng giá | Xác minh |
| `/uu-dai`, `/uu-dai/ma-giam-gia` | 3.5 | ĐH, Marketing | danh sách mã | Có |
| `/bao-gia` (tab Gửi khách mua, Báo giá đối tác, Danh sách) | 3.8–3.12 | Sale, ĐH | soạn, danh sách, lịch sử sửa, gửi | Có |
| `/duyet` | 2.7, 3.7 | ĐH | **Khoá PROD**; hàng đợi duyệt | Xác minh |

### B4. Thẻ Chào và đơn hàng (nhóm 4, 5)
| Route | Mã | Vai | Trạng thái | Chắc chắn? |
|---|---|---|---|---|
| `/the-chao` — tab Bộ sưu tập / Gửi nhanh | 5.1–5.5 | Sale, ĐH | chọn bộ, link, QR, hạn link | Có |
| `/the-chao` — tab Bán hàng, Hộp việc 🔔 | 5.6, 5.7 | Sale | danh sách khách, Hộp việc | Có |
| `/the-chao` — tab Theo dõi đơn (Kanban, Dashboard) | 5.6, 6.4, 4.12 | Sale, ĐH | Kanban, Dashboard | Có |
| `/the-chao` — tab Điều hành | 4.22–4.28 | ĐH | thu tiền, đối soát, báo giá | Có |
| `/the-chao` — tab Điều phối | 4.12, 4.13, 4.17, 4.19 | ĐP | Kanban 6 cột, lưới thẻ | Có |
| `/don-hang` (tab theo vai: Khách tiềm năng, Sale chăm sóc, Phê duyệt, Điều phối, Tất cả) | 4.1, 4.3–4.11, 4.14, 4.15 | Sale, ĐP, ĐH | danh sách, lọc, hộp Tạo đơn, chi tiết, lịch sử | Có |
| Hàng đợi thợ, màn Shipper (trang chủ theo vai `/`) | 1.12, 4.13, 4.17, 4.18 | Thợ, Ship | trang chủ từng vai | Có |
| `/in-an`, `/in-phieu/[id]` | 4.9 | ĐP | phiếu xưởng A6, băng rôn | Có |
| `/dieu-phoi`, `/dieu-phoi/doi-tac` | 4.12, 4.19 | ĐP | **Khoá PROD**; bảng đối tác | Có |
| `/cham-soc`, `/khach-hang` | 4.11 | Sale | **`/khach-hang` khoá PROD** | Xác minh |
| `/subcontract/[orderCode]`, `/chia-se/cho-doi-tac/[token]` | 4.19 | Đối tác | trang đối tác | Xác minh |

### B5. Trang khách (công khai)
| Route | Mã | Trạng thái | Chắc chắn? |
|---|---|---|---|
| `/c/[slug]`, `/ch/[slug]`, `/b/[sendCode]`, `/bg/[token]`, `/bst/[orgSlug]/[catalogCode]`, `/s/[code]` | 5.9, 5.10, 5.11 | xem mẫu, đặt hoa, nhắn tư vấn | Xác minh |
| `/g/[id]` | 4.29, 5.12, 5.13, 5.14, 5.15 | tiến độ, duyệt ảnh, đề xuất đổi hoa, cảm ơn | Xác minh |

### B6. Báo cáo, AI, chat (nhóm 6, 7, 8, 9)
| Route | Mã | Vai | Ghi chú | Chắc chắn? |
|---|---|---|---|---|
| `/bao-cao`, `/so-lieu` | 6.1–6.3, 6.5–6.8 | ĐH | **Khoá PROD** | Xác minh |
| `/muc-dung` | 6.9, 10.1–10.5 | ĐH, KT | **Khoá PROD** | Có |
| `/tai-anh` | 7.1, 7.3 | ĐH, QL SP | phân tích ảnh bằng AI (ảnh upload, chỉ chụp màn khởi đầu) | Có |
| `/cong-cu`, `/cong-cu/anh-san-pham`, `/bo-anh-san-pham`, `/poster-banner` | 7.2 | ĐH | công cụ | Xác minh |
| `/catalog`, `/landing-page` | 8.1 | ĐH, Marketing | **`/catalog` khoá PROD** | Có |
| `/chat`, `/tin-nhan`, `/hoi-thoai` | 9.1 | mọi nhân sự | **khoá PROD** (trao đổi trong đơn mở từ Thẻ Chào) | Xác minh |

### B7. Console nền tảng (`/van-hanh/*`)
| Route | Mã | Chắc chắn? |
|---|---|---|
| `/van-hanh` | 9.8 | Có |
| `/van-hanh/dang-ky` | 9.9 | Có |
| `/van-hanh/to-chuc`, `/van-hanh/to-chuc/[id]` (khối tạo tổ chức, khối Credit) | 9.10, 10.6 | Có |
| `/van-hanh/phe-duyet` | 9.11, 9.12 | Xác minh |
| `/van-hanh/muc-dung`, `/van-hanh/cau-hinh` | 10.3, 10.4, 10.7 | Xác minh |
| `/van-hanh/truong-du-lieu`, `/van-hanh/tich-hop` | 1.9, 9.14 | Xác minh |
| `/van-hanh/quan-tri-ma-tran`, 5 màn `ma-tran-*` | 1.8 | Xác minh |
| `/van-hanh/nhat-ky`, `/suc-khoe`, `/hang-doi-loi`, `/thong-bao`, `/nganh`, `/marketplace`, `/thu-vien-giao-dien`, `/thu-vien-man-hinh`, `/du-lieu` | 9.8 | Xác minh (thuộc Console, ngoài mã chức năng cụ thể) |

## C. Chức năng không có màn hình riêng (ghi trong chỉ mục, không chụp)

1.1, 1.14, 1.15, 1.18, 1.19 (quy tắc nền); 3.2 (kết quả hiện ở trang khách); 3.4, 3.13; 4.2, 4.4, 4.20, 4.30–4.32 (chỉ hiện cấu hình hoặc tin nhắn ngoài); 6.7; 9.11–9.14 (cơ chế); 10.2, 10.5, 10.7 (nền).
Danh sách chốt sẽ được lập khi chạy app thật.

## D. Ước lượng và các việc còn lại

- Khoảng **110–125 route** thuộc phạm vi, trước khi nhân với tab, trạng thái và 2 kích thước (desktop 1440, mobile 390). Dự kiến vài trăm ảnh.
- Mọi dòng "Xác minh" sẽ được kiểm lúc chạy app. Dòng nào không có route thật thì ghi lại, không bịa màn.
- Chưa làm: dựng app, đăng nhập thử các vai, kiểm dữ liệu seed.
