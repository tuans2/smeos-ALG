# So sánh trước/sau khi đổi nhận diện ALG

Ngày 12/11/2026, nhánh `claude/fervent-pascal-ilhcgb`. "Trước" = kho ảnh sau Đợt 3 (Mộc Lan); "sau" = kho chụp lại sau khi đổi sang ALG (màu, phông, tên, định danh). Cùng bộ script, cùng tài khoản, server dev và DB local. Ảnh ghép các màn chính: `so-sanh-alg/` (trái: trước, phải: sau).

## 1. Độ phủ kho ảnh

| | Trước | Sau |
|---|---:|---:|
| Ảnh chụp được | 967 | 949 |
| Cặp so được | — | 913 |
| Ảnh "thiếu" | — | 54 |
| Ảnh "mới" | — | 36 |
| Lỗi JavaScript ghi khi chụp | 1.441 | 1.287 |

54 ảnh "thiếu" **đều là tab của Thẻ chào** ở 5 vai: script tự đánh số theo phần tử `role="tab"`; từ T3-4 nút "Gửi nhanh / Quản lý" không còn là tab (đúng chủ ý), nên các tab còn lại đổi số và nằm trong 36 ảnh "mới" (`the-chao__tab1-Bộ-sưu-tập` …). Không màn nào mất.

49 cặp lệch chiều cao > 15%: đã xem các trường hợp lớn nhất (Đơn hàng của Sale/Kế toán, danh sách thẻ Bán hàng) — trang hiển thị bình thường, khác do **dữ liệu** (phiên khách thử tạo khi chụp luồng upload, link cũ hết hạn, bộ lọc "Cần tôi làm" mặc định), không phải vỡ bố cục.

## 2. Kiểm tự động (axe, cuộn ngang) — 109 màn × 2 khổ (390, 1280)

| Nhóm | Critical | Serious | Tương phản màu | Tràn ngang 390px |
|---|---|---|---|---|
| Điều hành (73 màn) | 8 → **0** | 243 → **104** | 3 → **0** | 0 → **0** |
| Console nền tảng (24) | 4 → **0** | 78 → **26** | 4 → **0** | 0 → 0 |
| Trang khách (12) | 0 → 0 | 22 → **0** | 12 → **0** | 0 → 0 |

"Trước" là lần đo gần nhất trước các đợt Đợt 2–3 và ALG. Serious còn lại gần như toàn bộ là `label-content-name-mismatch` của "Menu tài khoản" (shell) và nút "Xem bảng thông số" trên thẻ sản phẩm — đã đưa vào đề xuất Đợt 4 (D4-10).

## 3. Lỗi do đổi ALG phát hiện khi đo — đã sửa trong đợt này

1. **Chữ màu trạng thái trên nền nhạt của chính nó** (`text-success` trên `bg-success/15`) chỉ 3,6:1 ở Điều phối, Sản phẩm khả dụng, Tri thức. Test trước chỉ kiểm chữ trên nền trắng/xám nên bỏ sót. Sửa: làm đậm tối thiểu cùng sắc — success `#4E5D3D`, info `#3A5984`, danger `#97353E` (Brick Red gốc `#9C3740`), chữ phụ `#556744`; test thêm 7 màu × nền nhạt 10/15/20% × 2 nền. Đo lại: 0 lỗi.
2. **`/audit` tràn ngang 33px ở 390px**: mã hành động dài trong nhãn không xuống dòng (dữ liệu nhật ký mới). Sửa: hàng cho phép xuống dòng, nhãn ngắt chữ. Đo lại: không tràn.

## 4. Chưa theo nhận diện ALG (đưa vào Đợt 4, D4-18)
Ô biểu tượng điều hướng (`--color-tone-*`: tím, cam, xanh ngọc…) và màu biểu đồ (`--color-chart-*`) vẫn bảng màu cũ — xem ảnh Console trong `so-sanh-alg/`.

## 5. Cổng kiểm
`npm test` 4919/4921 (2 ca `public-url` do `.env` local, có từ trước) · `test:tenant` **276/276 tệp, 1203/1203 ca** · `test:platform` 17/17 tệp, 55 ca · typecheck, lint ratchet, `lint:ux` (23, không tăng). Chưa chạy: e2e, CI trên GitHub, test worker Python.
