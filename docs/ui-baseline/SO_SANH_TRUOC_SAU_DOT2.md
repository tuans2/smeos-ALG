# So sánh trước/sau Đợt 2 và chụp lại kho ảnh (BẢN NHÁP)

Nhánh `claude/fervent-pascal-ilhcgb`, 11/11/2026. Ảnh "sau" = chụp lại sau Đợt 1 + Đợt 2 (`shots-after-d2/`, `shots2-after-d2/`); ảnh "trước" = kho gốc (`shots/`, `shots2/`). Ảnh nằm ngoài git.

## 1. Phạm vi chụp lại

| Nhóm ảnh | Chụp lại | Kho gốc | Ghi chú |
|---|---:|---:|---|
| Màn tĩnh (10 vai, 1440 và 390px) | 416 | 416 | **Đủ toàn bộ**, 0 lỗi tải. Hai trang trả bất thường là cố ý: `/chinh-sach-bao-mat` (404 do cờ tính năng) và Kế toán mở `/so-lieu` (bị chuyển về đăng nhập) |
| Tab / hộp thoại / route động | 205 | 573 | **Chỉ chụp lại cho Điều hành, Console, trang công khai.** Chưa chụp lại: các góc nhìn sâu của Thẻ chào, tab của chủ chuỗi và 5 vai khác, hộp thoại bổ sung, ảnh nhân viên mới (≈ 368 ảnh) |

## 2. Mức khác biệt (so với kho gốc, tích lũy Đợt 1 + 2)

| Nhóm | Gần như không đổi (<0,3%) | Đổi nhẹ (0,3–2%) | Đổi nhiều (≥2%) | Không có ảnh trước |
|---|---:|---:|---:|---:|
| tĩnh | 336 | 26 | 54 | 0 |
| tab/modal/động | 171 | 24 | 10 | 0 |

**Cách đọc:** độ khác là tỉ lệ điểm ảnh lệch, rất nhiễu vì dữ liệu mẫu tăng thêm (đơn mới, thẻ gia công, người dùng mới) và thời gian ("20 phút trước") đổi giữa hai lần chụp. Vì vậy con số không chứng minh thay đổi do mã. Đợt 2 chủ yếu đổi những thứ **không nhìn thấy** (tên truy cập, vùng bấm), nên ảnh gần như không phản ánh được.

## 3. Tách riêng ảnh hưởng của Đợt 2

Với 66 màn đã chụp lại sau Đợt 1 (`shots-after-d1/`), độ khác của ảnh Đợt 2 so với Đợt 1: lớn nhất **0,5%** (`/don-hang`, 1440px: nút "Xác nhận tiền" và số tiền có dấu chấm); các màn còn lại ≤ 0,16%. Màn Console Thư viện giao diện (có nút `warning` đổi màu chữ) lệch 0,02–0,03%.

## 4. Đã xem bằng mắt

| Màn | Kết luận |
|---|---|
| `/don-hang` (1280px) | Nút "Xác nhận tiền" đủ chữ một dòng; số tiền "450.000"; bộ lọc "Mọi nhân viên" thay "ALL" — đúng chủ ý |
| `/cai-dat/ma-tran-chinhsach` (390px) | Tiêu đề không còn "(Mother Hard-Locks)"; công tắc giữ nguyên hình dạng — đúng chủ ý |
| `/dieu-phoi` (390px) | Cao thêm 487px do có thêm 1 thẻ đơn gia công và cảnh báo từ dữ liệu mẫu, không phải lỗi bố cục |
| `/san-pham`, `/cai-dat/thanh-vien` (390px), `/van-hanh/du-lieu` | Đã xem ở lần so sánh sau Đợt 1: đúng chủ ý |

Các màn "đổi nhiều" còn lại (khoảng 60) **chưa được mở xem**; nguyên nhân phần lớn là nhãn đã Việt hóa ở Đợt 1 (`/tri-thuc`, `/kho-templates`, các Ma trận) hoặc dữ liệu mới (`/audit`, `/van-hanh/nhat-ky`, `/dieu-phoi`).

## 5. Phát hiện từ ảnh mới
- `/dieu-phoi` vẫn hiện "BƯỚC 2 • BRIEF (T02)" và "MANTRA CỐT LÕI" — mã/tiếng Anh DS-05 chưa xử lý (thuộc `coordinator-order-brief-card.tsx`, `coordinator-kpi-summary.tsx`).
- Ảnh sản phẩm ở `/san-pham` vẫn trống (DS-18, chưa xác minh nguyên nhân).
- Thẻ cảnh báo trên `/dieu-phoi` và nút nổi UI Studio/Copilot vẫn che nội dung trên di động (T3-2, chờ PO).

## 6. Chưa làm
Chưa chạy lại axe cho toàn bộ kho sau Đợt 2: mới đo lại 9 màn đã sửa (0 lỗi critical/serious ngoài lỗi shell). Chưa kiểm bằng `test:e2e:ux`.

