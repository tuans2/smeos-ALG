# So sánh trước/sau Đợt 1 (BẢN NHÁP)

Nhánh `claude/fervent-pascal-ilhcgb`, 11/11/2026. Ảnh "trước" = kho gốc (`shots/`), ảnh "sau" = chụp lại các màn bị ảnh hưởng (`shots-after-d1/`), cùng khổ 1440 và 390px. Ảnh nằm ngoài git; cột đường dẫn tính từ thư mục kho ảnh.

## 1. Số liệu đo tự động (Điều hành + Console + trang công khai, 218 lượt, không tính lỗi shell DS-09)

| Quy tắc axe | Lượt trước | Lượt sau | Màn trước → sau |
|---|---:|---:|---|
| landmark-no-duplicate-main (moderate) | 24 | 0 | 12 → 0 |
| landmark-main-is-top-level (moderate) | 24 | 0 | 12 → 0 |
| landmark-unique (moderate) | 32 | 8 | 16 → 4 |
| color-contrast (serious) | 14 | 9 | 8 → 5 (1 lượt là lỗi máy chủ tạm thời, xem mục 3) |
| scrollable-region-focusable (serious) | 2 | 0 | 2 → 0 |
| region (moderate) | 10 | 4 | 5 → 2 |
| page-has-heading-one (moderate) | 8 | 4 | 4 → 2 |
| landmark-one-main (moderate) | 8 | 2 | 4 → 1 |
| heading-order (moderate) | 26 | 26 | 13 → 13 (chưa xử lý) |
| landmark-no-duplicate-banner (moderate) | 6 | 6 | 3 → 3 (chưa xử lý) |
| button-name (critical) | 4 | 4 | 3 → 3 (thuộc Đợt 2) |
| label (critical) | 2 | 2 | 1 → 1 (thuộc Đợt 2) |
| select-name (critical) | 2 | 2 | 1 → 1 (thuộc Đợt 2) |

Tràn ngang ở 390px: **5 → 0** màn. Thiếu `<h1>` (1280px): 4 → 2 (còn `/in-phieu/[id]` và `/chinh-sach-bao-mat`, trang này trả 404 vì cờ tính năng nên không phải lỗi). Axe critical: 8 → 8 (chưa đổi). Axe serious ngoài shell: 16 → 9.

Chưa đo lại: 7 vai còn lại (Sale, Điều phối, Kế toán, Thợ, Shipper, QL sản phẩm, Marketing) — chỉ chụp lại trang chủ.

## 2. So sánh ảnh

Độ khác = tỉ lệ điểm ảnh lệch trên vùng chồng nhau. **Con số này nhiễu**: dữ liệu mẫu và thời gian ("20 phút trước") thay đổi giữa hai lần chụp, nên lệch điểm ảnh không chứng minh thay đổi do mã. Chỉ các dòng ghi "ĐÃ XEM" được tôi mở ảnh ghép trước/sau để xác nhận.

| Vai | Khổ | Màn | Cao trước → sau (px) | Độ khác | Ghi chú | Ảnh sau |
|---|---|---|---:|---:|---|---|
| dieu_hanh | 390 | `kho-templates` | 9265 → 9104 | 13.74% | Đổi chủ ý: bỏ nhãn mã M01…, "template" → "mẫu". CHƯA XEM | `shots-after-d1/dieu_hanh/mobile/kho-templates.png` |
| dieu_hanh | 390 | `tri-thuc` | 12441 → 12444 | 11.97% | Đổi chủ ý: bỏ mã M01…M10 khỏi nhãn; thanh nút xuống dòng. CHƯA XEM | `shots-after-d1/dieu_hanh/mobile/tri-thuc.png` |
| dieu_hanh | 390 | `cai-dat_ma-tran-camket` | 1452 → 1431 | 10.22% | Đổi chủ ý: bỏ "(Mother Hard-Locks)". CHƯA XEM | `shots-after-d1/dieu_hanh/mobile/cai-dat_ma-tran-camket.png` |
| dieu_hanh | 390 | `don-hang` | 2153 → 2535 | 7.11% | Đổi chủ ý: nhãn bộ lọc, bỏ <main> lồng. Có lẫn thay đổi do dữ liệu mới. CHƯA XEM | `shots-after-d1/dieu_hanh/mobile/don-hang.png` |
| dieu_hanh | 390 | `hoi-thoai` | 916 → 916 | 4.89% | Đổi chủ ý: thanh nút xuống dòng. CHƯA XEM | `shots-after-d1/dieu_hanh/mobile/hoi-thoai.png` |
| dieu_hanh | 390 | `cai-dat_thanh-vien` | 3345 → 3730 | 4.79% | Đổi chủ ý: thanh nút xuống dòng gọn ở 390px. ĐÃ XEM: đúng (có thêm 1 dòng nhân viên do dữ liệu) | `shots-after-d1/dieu_hanh/mobile/cai-dat_thanh-vien.png` |
| dieu_hanh | 390 | `san-pham` | 1502 → 1517 | 4.73% | Đổi chủ ý: danh mục hiện nhãn tiếng Việt (Hộp hoa, Bình hoa…). ĐÃ XEM: đúng | `shots-after-d1/dieu_hanh/mobile/san-pham.png` |
| platform | 390 | `van-hanh_du-lieu` | 844 → 844 | 4.52% | Đổi chủ ý: thẻ tổ chức xếp dọc, hết tràn ngang. ĐÃ XEM: đúng | `shots-after-d1/platform/mobile/van-hanh_du-lieu.png` |
| dieu_hanh | 1440 | `don-hang` | 1241 → 1463 | 3.21% | Đổi chủ ý: nhãn bộ lọc, bỏ <main> lồng. Có lẫn thay đổi do dữ liệu mới. CHƯA XEM | `shots-after-d1/dieu_hanh/desktop/don-hang.png` |
| dieu_hanh | 390 | `bang-gia` | 844 → 844 | 2.25% | Đổi màu chữ cảnh báo, bỏ <main> lồng. CHƯA XEM | `shots-after-d1/dieu_hanh/mobile/bang-gia.png` |
| dieu_hanh | 1440 | `the-chao` | 900 → 900 | 1.52% | Đổi màu chữ cảnh báo. Có lẫn thay đổi do dữ liệu. CHƯA XEM | `shots-after-d1/dieu_hanh/desktop/the-chao.png` |
| dieu_hanh | 390 | `the-chao` | 1076 → 1194 | 1.39% | Đổi màu chữ cảnh báo. Có lẫn thay đổi do dữ liệu. CHƯA XEM | `shots-after-d1/dieu_hanh/mobile/the-chao.png` |
| platform | 1440 | `van-hanh_du-lieu` | 900 → 900 | 1.23% | Đổi chủ ý: thẻ tổ chức xếp dọc, hết tràn ngang. ĐÃ XEM: đúng | `shots-after-d1/platform/desktop/van-hanh_du-lieu.png` |
| dieu_hanh | 390 | `so-lieu` | 1524 → 1524 | 1.17% | Số tiền không tràn ngang. CHƯA XEM | `shots-after-d1/dieu_hanh/mobile/so-lieu.png` |
| product_manager | 390 | `root` | 1011 → 1011 | 1.13% | — | `shots-after-d1/product_manager/mobile/root.png` |
| sale | 390 | `root` | 913 → 1009 | 1.00% | — | `shots-after-d1/sale/mobile/root.png` |
| dieu_hanh | 390 | `bo-may` | 1003 → 1003 | 0.72% | — | `shots-after-d1/dieu_hanh/mobile/bo-may.png` |
| product_manager | 1440 | `root` | 900 → 900 | 0.68% | — | `shots-after-d1/product_manager/desktop/root.png` |
| dieu_hanh | 1440 | `cai-dat_thanh-vien` | 1638 → 1763 | 0.66% | Đổi chủ ý: thanh nút xuống dòng gọn ở 390px. ĐÃ XEM: đúng (có thêm 1 dòng nhân viên do dữ liệu) | `shots-after-d1/dieu_hanh/desktop/cai-dat_thanh-vien.png` |
| sale | 1440 | `root` | 900 → 900 | 0.66% | — | `shots-after-d1/sale/desktop/root.png` |
| dieu_hanh | 1440 | `bang-gia` | 900 → 900 | 0.62% | Đổi màu chữ cảnh báo, bỏ <main> lồng. CHƯA XEM | `shots-after-d1/dieu_hanh/desktop/bang-gia.png` |
| dieu_hanh | 1440 | `tri-thuc` | 6156 → 6156 | 0.50% | Đổi chủ ý: bỏ mã M01…M10 khỏi nhãn; thanh nút xuống dòng. CHƯA XEM | `shots-after-d1/dieu_hanh/desktop/tri-thuc.png` |
| dieu_hanh | 390 | `noi-bo_ket-noi` | 1121 → 1121 | 0.32% | — | `shots-after-d1/dieu_hanh/mobile/noi-bo_ket-noi.png` |
| dieu_hanh | 1440 | `bo-may` | 900 → 900 | 0.31% | — | `shots-after-d1/dieu_hanh/desktop/bo-may.png` |
| dieu_hanh | 1440 | `so-lieu` | 1115 → 1115 | 0.29% | Số tiền không tràn ngang. CHƯA XEM | `shots-after-d1/dieu_hanh/desktop/so-lieu.png` |
| dieu_hanh | 1440 | `san-pham` | 945 → 945 | 0.25% | Đổi chủ ý: danh mục hiện nhãn tiếng Việt (Hộp hoa, Bình hoa…). ĐÃ XEM: đúng | `shots-after-d1/dieu_hanh/desktop/san-pham.png` |
| dieu_hanh | 1440 | `kho-templates` | 4066 → 4066 | 0.10% | Đổi chủ ý: bỏ nhãn mã M01…, "template" → "mẫu". CHƯA XEM | `shots-after-d1/dieu_hanh/desktop/kho-templates.png` |
| dieu_hanh | 1440 | `cai-dat_ma-tran-camket` | 900 → 900 | 0.06% | Đổi chủ ý: bỏ "(Mother Hard-Locks)". CHƯA XEM | `shots-after-d1/dieu_hanh/desktop/cai-dat_ma-tran-camket.png` |
| marketing | 390 | `root` | 1702 → 1702 | 0.03% | — | `shots-after-d1/marketing/mobile/root.png` |
| dieu_hanh | 390 | `tai-anh` | 844 → 844 | 0.02% | — | `shots-after-d1/dieu_hanh/mobile/tai-anh.png` |

Chưa có ảnh "trước" để so sánh (màn mới chụp hoặc tên khác): `dieu_hanh/desktop/in-phieu_8bab826a-af61-4704-ad1e-2d439fc0b63b`, `dieu_hanh/desktop/san-pham_dev-moclan-prd-0000-0000-000000000001`, `dieu_hanh/mobile/in-phieu_8bab826a-af61-4704-ad1e-2d439fc0b63b`, `dieu_hanh/mobile/san-pham_dev-moclan-prd-0000-0000-000000000001`, `public/desktop/bg_BHxOs2TE98dtMEka4h9bD642gMNG7sV117A42TxWtFQ`, `public/desktop/subcontract_DH-DEMO-GIACONG?branch=demo-branch-q3&t=dev-moclan-org-0000-0000-000000000001.mwvl16rw.b85e8534ae5f82622651a565c3ceb5880176bf47a09c57bfd5b1794589147dbd`, `public/mobile/bg_BHxOs2TE98dtMEka4h9bD642gMNG7sV117A42TxWtFQ`, `public/mobile/subcontract_DH-DEMO-GIACONG?branch=demo-branch-q3&t=dev-moclan-org-0000-0000-000000000001.mwvl16rw.b85e8534ae5f82622651a565c3ceb5880176bf47a09c57bfd5b1794589147dbd`.

## 3. Chú ý

- Ở lần đo lại đầu tiên, `/dieu-phoi` có một lượt `color-contrast` mới. Nguyên nhân là trang hiện trạng thái lỗi "Lỗi tải đơn điều phối": máy chủ dev trả 500 "Thiếu khoá dữ liệu để giải mã dữ liệu cá nhân" (8 lỗi trong cùng một giây lúc khởi động lại). Đo lại riêng `/dieu-phoi` và `/dieu-phoi/doi-tac` cho kết quả sạch (chỉ còn lỗi shell). Đây không phải lỗi do Đợt 1; chưa tìm hiểu vì sao khoá thiếu lúc khởi động.
- Còn lỗi tương phản ở: Kết nối nội bộ (`bg-warning-subtle`), Thư viện giao diện (nút), Thư viện màn hình (chip trắng mờ), catalog khách `/c/[slug]` (chữ xám `#78716C`, 6 chỗ). Chưa xử lý.
- Ảnh sản phẩm trống ở `/san-pham` vẫn như cũ (DS-18, chưa xác minh nguyên nhân).

