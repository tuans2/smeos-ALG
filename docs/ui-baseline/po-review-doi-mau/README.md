# Ảnh trước/sau: thử đổi lớp màu không có token (gửi PO)

Phục vụ **Câu 3** trong `../CAU_HOI_CHO_PO.md`. Đây là kết quả thử trên nhánh tạm (phương án B), **chưa áp vào mã chính**. Chi tiết kỹ thuật và số liệu: `../THU_NGHIEM_DOI_MAU.md`.

## Cách xem
- Mỗi ảnh ghép: **bên trái = TRƯỚC** (lớp màu không có token nên phần tử không có nền), **bên phải = SAU** (đã đổi sang token có sẵn, ví dụ `surface-alt`, `primary-muted`, `warning-bg`).
- Khổ máy tính 1440px (thu về 960px mỗi bên) và điện thoại 390px. Mở ảnh ở kích thước đầy đủ để thấy nền nhạt.
- Chỉ **5 màn** (Kết nối nội bộ, Đơn hàng, Thẻ chào, Kênh tích hợp, Số liệu) trong tổng 171 tệp bị đổi; các màn khác chưa chụp.
- Độ lệch điểm ảnh chỉ để tham khảo, có lẫn nhiễu do dữ liệu và trạng thái tải.

## Gợi ý xem theo thứ tự
1. `01_desktop_noi-bo-ket-noi.png`: thay đổi rõ nhất.
2. `03_desktop_don-hang.png`: thay đổi tinh tế.
3. Các tab Thẻ chào: nơi dùng nhiều lớp nhất (209 chỗ).

## Danh sách
| # | Ảnh | Màn | Đường dẫn | Trạng thái | Khổ | Độ lệch | Ghi chú |
|---:|---|---|---|---|---|---:|---|
| 1 | [01_desktop_noi-bo-ket-noi.png](01_desktop_noi-bo-ket-noi.png) | Kết nối nội bộ | `/noi-bo/ket-noi` | trang chính | 1440 | 12.27% | **Thay đổi rõ nhất.** Thẻ mã kết nối nền hồng nhạt, thẻ ID/UUID nền be, ghi chú nền xanh nhạt (trước đó trong suốt). |
| 2 | [02_mobile_noi-bo-ket-noi.png](02_mobile_noi-bo-ket-noi.png) | Kết nối nội bộ | `/noi-bo/ket-noi` | trang chính | 390 | 17.17% | **Thay đổi rõ nhất.** Thẻ mã kết nối nền hồng nhạt, thẻ ID/UUID nền be, ghi chú nền xanh nhạt (trước đó trong suốt). |
| 3 | [03_desktop_don-hang.png](03_desktop_don-hang.png) | Đơn hàng | `/don-hang` | trang chính | 1440 | 2.93% | Thay đổi nhỏ: hàng tiêu đề bảng có nền be. |
| 4 | [04_mobile_don-hang.png](04_mobile_don-hang.png) | Đơn hàng | `/don-hang` | trang chính | 390 | 2.11% | Thay đổi nhỏ: hàng tiêu đề bảng có nền be. |
| 5 | [05_desktop_don-hang-click1-tao-don.png](05_desktop_don-hang-click1-tao-don.png) | Đơn hàng | `/don-hang` | click1-Tạo-đơn | 1440 | 2.93% | Như trên, với hộp "Tạo đơn" đang mở. |
| 6 | [06_mobile_don-hang-click1-tao-don.png](06_mobile_don-hang-click1-tao-don.png) | Đơn hàng | `/don-hang` | click1-Tạo-đơn | 390 | 2.1% | Như trên, với hộp "Tạo đơn" đang mở. |
| 7 | [07_desktop_the-chao.png](07_desktop_the-chao.png) | Thẻ chào | `/the-chao` | trang chính | 1440 | 4.64% | Thay đổi nhỏ ở các khối nền. |
| 8 | [08_mobile_the-chao.png](08_mobile_the-chao.png) | Thẻ chào | `/the-chao` | trang chính | 390 | 4.46% | Thay đổi nhỏ ở các khối nền. |
| 9 | [09_desktop_the-chao-tab1-gui-nhanh.png](09_desktop_the-chao-tab1-gui-nhanh.png) | Thẻ chào | `/the-chao` | tab1-Gửi-nhanh | 1440 | 22.28% | Ô sản phẩm, khung chọn có nền be. **Chênh chiều cao là do ảnh "trước" chụp lúc đang tải ("Đang tải danh sách sản phẩm…"), không phải do màu.** |
| 10 | [10_mobile_the-chao-tab1-gui-nhanh.png](10_mobile_the-chao-tab1-gui-nhanh.png) | Thẻ chào | `/the-chao` | tab1-Gửi-nhanh | 390 | 13.31% | Ô sản phẩm, khung chọn có nền be. **Chênh chiều cao là do ảnh "trước" chụp lúc đang tải ("Đang tải danh sách sản phẩm…"), không phải do màu.** |
| 11 | [11_desktop_the-chao-tab2-quan-ly.png](11_desktop_the-chao-tab2-quan-ly.png) | Thẻ chào | `/the-chao` | tab2-Quản-lý | 1440 | 5.14% | Thay đổi nhỏ ở các khối nền. |
| 12 | [12_mobile_the-chao-tab2-quan-ly.png](12_mobile_the-chao-tab2-quan-ly.png) | Thẻ chào | `/the-chao` | tab2-Quản-lý | 390 | 4.68% | Thay đổi nhỏ ở các khối nền. |
| 13 | [13_desktop_the-chao-tab3-bo-suu-tap.png](13_desktop_the-chao-tab3-bo-suu-tap.png) | Thẻ chào | `/the-chao` | tab3-Bộ-sưu-tập | 1440 | 1.35% | Thay đổi nhỏ ở các khối nền. |
| 14 | [14_mobile_the-chao-tab3-bo-suu-tap.png](14_mobile_the-chao-tab3-bo-suu-tap.png) | Thẻ chào | `/the-chao` | tab3-Bộ-sưu-tập | 390 | 0.15% | Thay đổi nhỏ ở các khối nền. |
| 15 | [15_desktop_the-chao-tab4-theo-doi-don.png](15_desktop_the-chao-tab4-theo-doi-don.png) | Thẻ chào | `/the-chao` | tab4-Theo-dõi-đơn | 1440 | 17.45% | Có thay đổi nền ở nhiều khối. |
| 16 | [16_mobile_the-chao-tab4-theo-doi-don.png](16_mobile_the-chao-tab4-theo-doi-don.png) | Thẻ chào | `/the-chao` | tab4-Theo-dõi-đơn | 390 | 0.22% | Thay đổi nhỏ ở các khối nền. |
| 17 | [17_desktop_the-chao-tab5-ban-hang.png](17_desktop_the-chao-tab5-ban-hang.png) | Thẻ chào | `/the-chao` | tab5-Bán-hàng | 1440 | 0.04% | Thay đổi nhỏ ở các khối nền. |
| 18 | [18_mobile_the-chao-tab5-ban-hang.png](18_mobile_the-chao-tab5-ban-hang.png) | Thẻ chào | `/the-chao` | tab5-Bán-hàng | 390 | 0.14% | Thay đổi nhỏ ở các khối nền. |
| 19 | [19_desktop_the-chao-tab6-dieu-hanh.png](19_desktop_the-chao-tab6-dieu-hanh.png) | Thẻ chào | `/the-chao` | tab6-Điều-hành | 1440 | 4.65% | Thay đổi nhỏ ở các khối nền. |
| 20 | [20_mobile_the-chao-tab6-dieu-hanh.png](20_mobile_the-chao-tab6-dieu-hanh.png) | Thẻ chào | `/the-chao` | tab6-Điều-hành | 390 | 5.26% | Thay đổi nhỏ ở các khối nền. |
| 21 | [21_desktop_the-chao-tab7-dieu-phoi.png](21_desktop_the-chao-tab7-dieu-phoi.png) | Thẻ chào | `/the-chao` | tab7-Điều-phối | 1440 | 0.1% | Thay đổi nhỏ ở các khối nền. |
| 22 | [22_mobile_the-chao-tab7-dieu-phoi.png](22_mobile_the-chao-tab7-dieu-phoi.png) | Thẻ chào | `/the-chao` | tab7-Điều-phối | 390 | 0.18% | Thay đổi nhỏ ở các khối nền. |
| 23 | [23_desktop_hoi-thoai-kenh-tich-hop.png](23_desktop_hoi-thoai-kenh-tich-hop.png) | Kênh tích hợp | `/hoi-thoai/kenh-tich-hop` | trang chính | 1440 | 1.11% | Thay đổi nhỏ ở các thẻ. |
| 24 | [24_mobile_hoi-thoai-kenh-tich-hop.png](24_mobile_hoi-thoai-kenh-tich-hop.png) | Kênh tích hợp | `/hoi-thoai/kenh-tich-hop` | trang chính | 390 | 2.16% | Thay đổi nhỏ ở các thẻ. |
| 25 | [25_desktop_so-lieu.png](25_desktop_so-lieu.png) | Số liệu | `/so-lieu` | trang chính | 1440 | 0.04% | Gần như không đổi. |
| 26 | [26_mobile_so-lieu.png](26_mobile_so-lieu.png) | Số liệu | `/so-lieu` | trang chính | 390 | 0.09% | Gần như không đổi. |

## Điều cần PO quyết
Xem sau khi đã xem ảnh: chọn **A** (thêm token bí danh, cần duyệt token), **B** (đổi tên lớp sang token sẵn có, như ảnh này) hoặc **C** (xoá lớp vô hiệu, giữ nguyên diện mạo hiện tại không có nền). Khuyến nghị của tôi: B.

