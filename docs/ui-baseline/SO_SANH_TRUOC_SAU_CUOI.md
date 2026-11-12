# Chụp lại kho ảnh sau các việc không khoá và so sánh (BẢN NHÁP)

Nhánh `claude/fervent-pascal-ilhcgb`, 11/11/2026. Ảnh sau: `shots-after-d3/` (màn tĩnh), `shots2-after-d3/` (tab, hộp thoại, route động, góc nhìn sâu). So với kho gốc (`shots/`, `shots2/`) và với lượt chụp sau Đợt 2 (`shots-after-d2/`, `shots2-after-d2/`) để tách riêng ảnh hưởng của đợt này. Ảnh nằm ngoài git.

## 1. Độ phủ

| Nhóm | Chụp lại | Kho gốc | Ghi chú |
|---|---:|---:|---|
| Màn tĩnh (10 vai, 1440 và 390px) | 416 | 416 | Đủ, 0 lỗi tải. `/chinh-sach-bao-mat` 404 và Kế toán `/so-lieu` về đăng nhập là cố ý (cờ tính năng, thiếu quyền) |
| Tab, hộp thoại, route động, góc nhìn sâu | 551 | 573 | Thiếu 22 ảnh = 11 màn × 2 khổ, **toàn bộ ở Thẻ chào của Điều hành** |

22 ảnh thiếu: các bước bấm vào thẻ đơn theo tên khách (`Đỗ Khánh Linh`), nút "Gọi", Hộp việc → "Cập nhật". Các mục này đã **không còn bấm được** vì dữ liệu mẫu đã đổi sau các lần thao tác trước (thẻ đơn/thông báo cũ không còn). Đây là hạn chế của kịch bản chụp, không phải lỗi giao diện. Cần viết lại kịch bản theo dữ liệu hiện tại nếu muốn có các ảnh này.

## 2. So sánh

| So với | Gần như không đổi (<0,3%) | Đổi nhẹ (0,3–2%) | Đổi nhiều (≥2%) |
|---|---:|---:|---:|
| Kho gốc, màn tĩnh | 336 | 26 | 54 |
| Kho gốc, tab/hộp thoại/sâu | 424 | 81 | 46 |

**Tách riêng đợt này** (so với lượt chụp sau Đợt 2, 621 cặp có cả hai): chỉ **19 cặp lệch trên 1%**. Lệch lớn nhất là các màn có dữ liệu thay đổi theo thời gian: `/audit` (12,8% ở 390px), `/van-hanh/nhat-ky` (9,4%), `/don-hang` của Sale và Kế toán (5,8%), Tính giá và vài tab Thẻ chào (3–9%).

**Cách đọc:** độ khác là tỉ lệ điểm ảnh lệch, nhiễu vì nhật ký, danh sách đơn và mốc thời gian đổi giữa hai lần chụp. Các thay đổi mã của đợt này (thứ tự tiêu đề, landmark, `<h2>`, chip, nhãn Việt hóa) phần lớn không nhìn thấy; thay đổi nhìn thấy gồm chip loại tổ chức ở Kết nối nội bộ, chữ "TÓM TẮT ĐƠN"/"NGUYÊN TẮC CỐT LÕI" ở Điều phối, màu chữ mô tả thẻ catalog. Lần này tôi **chưa mở xem từng ảnh ghép** (19 ảnh ghép lệch >1% đã sinh nhưng chưa xem); các xác nhận bằng mắt là các lần trước (xem `SO_SANH_TRUOC_SAU_DOT1.md`, `DOT2.md`).

## 3. Cổng kiểm sau sự cố `node_modules` (chạy sau khi `npm ci`)

Đạt: `typecheck`, `lint:ux -- --check` (366 vi phạm = 28 cũ + 338 R24 đã khoá, không tăng), `lint:ratchet` (không lỗi mới), `check:screen-contracts`, `check:docs`, `check:layers`, `check:template-ssot`, `npm test` (787/788 tệp; 2 test `public-url` đỏ do `.env` local đặt sẵn URL công khai, đỏ cả khi bỏ thay đổi của tôi). Chưa chạy: `test:e2e:ux`, `test:tenant`, `test:platform` (cần DB `*_test`).

## 4. Chưa làm
- Chưa chạy lại axe cho toàn bộ kho; số đo axe gần nhất là ở `BAO_CAO_VIEC_KHONG_KHOA.md` (18 màn bị ảnh hưởng).
- Chưa mở xem 19 ảnh ghép lệch >1% của đợt này.
- 11 màn Thẻ chào (22 ảnh) cần kịch bản chụp mới.
