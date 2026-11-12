# Báo cáo Đợt 4 — soát sâu và lệch chuẩn còn tồn

Nhánh `claude/fervent-pascal-ilhcgb`, 12/11/2026. Người giao việc duyệt toàn bộ khuyến nghị ở `DE_XUAT_DOT4_CHO_PO.md` (D4-08 chọn A, D4-16 tách việc riêng). **PO cần xác nhận trước khi gộp nhánh.**

## 1. Kết quả từng mục

| Mã | Kết quả | Commit |
|---|---|---|
| D4-01 Soát ảnh màn chính | Sửa: ảnh sản phẩm lỗi → ô "Chưa có ảnh" (trước đó chữ thay thế đè nhãn); nút thu tiền không gãy chữ; hàng nút đầu trang Đơn hàng ở 390px; huy hiệu bảng "Đang đọc bill" → "Có ảnh bill" | 354ae8f6 |
| D4-02 Bàn phím (12 màn) | Không có lỗi thật. Các điểm công cụ đánh dấu đã kiểm từng cái: viền focus vẽ trên `::after` của thẻ phủ toàn thẻ, nút "Bỏ ghim" đang chạy hiệu ứng hiện ra, ô ngày gốc có nhiều phân đoạn | — |
| D4-03 320px và zoom 200% | Không tràn ngang trên 12 màn | — |
| D4-04 Cây truy cập | Mọi màn có đúng một `<h1>`, không nhảy cấp tiêu đề. Sửa: 3 trang 404 dùng `<h2>` (trang gốc thiếu `<main>`) → `PageHeader`; `<nav>` đường dẫn ở Dữ liệu nền tảng có nhãn. **Không có trình đọc màn hình thật trong máy chủ** — kiểm bằng người cần làm riêng | 354ae8f6 |
| D4-05 Preset cũ | Mộc Lan, Modern Slate, Pure Swiss: 0 lỗi tương phản trên 10 màn có khung | — |
| D4-06 Screen Contract | Cập nhật 8 hợp đồng (bo-may, don-hang, san-pham, audit, van-hanh-du-lieu, lich-dang, the-chao, tri-thuc); 107/107 có hợp đồng | 354ae8f6 |
| D4-07 Nút chữ nhỏ | `TEXT_BUTTON_HIT_AREA`: 25px chuột / 45px cảm ứng, không đổi kích thước hiển thị (Tri thức, đường dẫn Dữ liệu). Tiêu đề thẻ ở Công cụ/Console là báo nhầm (cả thẻ bấm được) | 6c6a5def |
| D4-08 Thanh trượt | `Slider` chuẩn (bọc `@base-ui/react`, không thêm phụ thuộc), thay 12 ô; ô so sánh ảnh phủ toàn khung được miễn có lý do. Kiểm thật: phím mũi tên đổi 25 → 27 km, nhãn cập nhật, vùng điều khiển 44px khi cảm ứng | 56d0286d |
| D4-09 Thẻ tương tác tự dựng | Bộ máy → `RadioGroup`; trung tâm mạng hoa → `StatTile` có nút hành động riêng; lịch đăng → nút tiêu đề phủ toàn thẻ; trình phát video → bỏ vai trò nút trên ảnh bìa | 5d13d714 |
| D4-10 Nhãn chứa chữ hiển thị | Menu tài khoản; thẻ sản phẩm (nhãn trạng thái ra ngoài nút ảnh) | 6c6a5def |
| D4-11 Mã kỹ thuật | Bỏ "(T01)…(T25)" và "P1 •" ở 13 tệp giao diện điều phối và tiêu đề hợp đồng | 6581b3af |
| D4-12 Trang khách 390px | Khung giờ chỉ ngắt sau gạch nối, không đè cột; bong bóng chat không che chữ cuối trang (đã đo) | 6581b3af |
| D4-13 Nút tròn trống | Nguyên nhân gốc ở `Button`: icon co được → thêm `[&_svg]:shrink-0`; quét 7 màn không còn icon bị ép | 6581b3af |
| D4-14 "Đang đọc dữ liệu biên lai…" | Tiệm tắt "AI đọc bill" (mặc định) thì không bao giờ có kết quả → câu hướng dẫn đối chiếu tay; quy tắc PO 14/10 giữ nguyên | 6581b3af |
| D4-15 "Số âm" | Là dấu "~" đọc như dấu trừ → "Khoảng N bản ghi", "khoảng N giây" | 6581b3af |
| D4-16 Lỗi 500 khi khoá PII chưa nạp | Nguyên nhân: hook ghép người nhận của `orders` giải mã `recipient` trước khi khoá được nạp. Tôi đã tái hiện và sửa, nhưng khi đưa lên thì `main` đã có bản sửa cùng nguyên nhân (`ensurePiiKeys`, PR #31) kèm test `pii-read-cold-cache.test.ts` → giữ bản của `main`, bỏ bản của tôi để không trùng | 1ec4dfd2 (main) |
| D4-17 Hợp đồng coordinator lệch | Sinh lại, `check:schemas:coordinator` xanh | 6581b3af |
| D4-18 Màu nhóm / biểu đồ | 10 màu nhóm và 8 màu biểu đồ theo brand kit ALG, có test tương phản | 5fcf462c |

## 1b. Làm tiếp sau báo cáo đầu (người giao việc: "xử lý lần lượt các việc còn lại")

| Việc | Kết quả | Commit |
|---|---|---|
| Lint UX còn 8 | **0**: trạng thái bước AI theo `TaskUiState`; bảng chọn vai dev bỏ listbox/option giả quanh nút thật (`role="group"` + `aria-pressed`); nền mờ ngăn kéo điều hướng không còn giả làm nút (Esc và nút Đóng vẫn đóng); trang gia công công khai được miễn R20 như các trang công khai khác. Phát hiện kèm: mở ngăn kéo trước đây không đưa tiêu điểm vào đâu (bộ chọn không khớp phần tử nào) → nay vào nút Đóng | ec1e2fb0 |
| Chụp lại toàn kho | 949/949 ảnh, so với kho ALG: `SO_SANH_TRUOC_SAU_DOT4.md`, `so-sanh-dot4/` | (tài liệu) |
| Đo axe lại 109 màn × 2 khổ | Serious 130 → 0, tương phản 6 → 0, tràn ngang 1 → 0. 5 nút nhãn lệch chữ hiển thị phát hiện khi đo lại đã sửa | 4b37541b |

## 2. Lỗi do đổi ALG phát hiện thêm và đã sửa
- `text-accent` (vàng #E7C447) dùng làm màu chữ/icon trên nền sáng ở 22 chỗ (huy hiệu tầng chỉ 1,6:1) → `text-accent-text`.

## 3. Chỉ số
- `lint:ux`: 23 → 8 → **0** vi phạm (baseline 0).
- axe toàn kho đo lại (109 màn × 390/1280): critical 0, serious 130 → **0**, tương phản 6 → 0, tràn ngang 390px 1 → 0 (`SO_SANH_TRUOC_SAU_DOT4.md`).

## 4. Cổng kiểm (chạy lại sau toàn bộ Đợt 4)
- `npm test` 4961/4963 — 2 ca `public-url` đỏ do `.env` local, có từ trước, không liên quan.
- `test:tenant` **276/276 tệp, 1204/1204 ca** · `test:platform` 17/17 tệp, 55 ca — DB `smeos_test`.
- Test worker Python: 494 ca đạt (venv riêng cài `workers/requirements.txt`).
- typecheck · `lint:ratchet` (không lỗi mới) · `lint:ux` 0 · `check:docs` · `check:screen-contracts` 107/107 · `check:template-ssot` · `check:schemas:*` xanh.
- `test:e2e:ux` trên dev server local: **trợ năng và hành trình xanh** (sau khi sửa `role="status"` cho khung tải ở Thẻ chào gửi nhanh — lỗi có sẵn trên `main`). **Hai ca so ảnh mẫu đỏ đúng dự kiến** (`dang-nhap`, `vai-tro`: khác 9–10% điểm ảnh vì màu và phông ALG); chạy với ảnh mẫu tạm thì 14/14 ca ảnh mốc chạy hết luồng, 13 ảnh khác mẫu cũ. Theo quy định repo, ảnh mẫu `*-linux.png` phải lấy từ ảnh `-actual.png` do runner CI chụp — **cần mở PR để CI chạy rồi cập nhật ảnh mẫu**; chưa làm vì chưa có yêu cầu mở PR.

## 5. Còn lại / ngoài phạm vi
- Ảnh mẫu e2e (`visual*.spec.ts-snapshots`) sinh lại từ CI khi mở PR.
- CI trên GitHub (chỉ chạy với PR vào `main`).
- Kiểm bằng trình đọc màn hình thật (NVDA/VoiceOver) và trên thiết bị thật.
