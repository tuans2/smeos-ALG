# Bốn câu hỏi cần PO quyết (một trang)

Dự án: nâng cấp UI/UX 123 chức năng giai đoạn 1 · nhánh `claude/fervent-pascal-ilhcgb` · 11/11/2026.
Tình hình: Đợt 1 và 2 (sửa nhanh, điều khiển) đã xong và đo lại. Phần còn lại **đều chờ quyết định dưới đây**. Mỗi câu có khuyến nghị; đánh dấu ☐ rồi gửi lại là đủ.

## Trạng thái quyết định (cập nhật 12/11/2026)

Người giao việc đã quyết ngày 11/11/2026; **PO cần xác nhận trước khi gộp nhánh**.

| Câu | Quyết định | Đã làm |
|---|---|---|
| 1 | 6 hạng mục theo khuyến nghị | T3-1, T3-3, T3-4, T3-5(a), T3-2 (phương án A), T3-6 (phương án A) — mỗi mục một commit có test; kiểm trên server: hai nút nổi xếp cột góc dưới phải, không chồng nhau, không đè thanh đáy ở 390 và 1280px. T3-5(b) đã đúng sẵn ở production (bộ lọc chỉ hiện ở dev); T3-5(c) giữ nguyên nhãn |
| 2 | Chụp luồng upload trên local | Xem `luong-upload-anh/README.md`: 4.15, 4.18, 5.13 đủ; 4.24 đủ trừ bước AI; 4.16, 7.1, 7.2 dừng ở bước AI |
| 3 | Xử lý lớp màu không token | Phương án B (codemod sang token sẵn có) + luật lint R24 |
| 4 | Đổi theo bộ nhận diện ALG | **Chờ người giao việc cung cấp bộ nhận diện** (xem `KIEM_KE_THUONG_HIEU_VA_MAU_CUNG.md` §5) |
| — | Thanh trượt (`Slider`) | Chưa có quyết định |

---

## Câu 1. Duyệt thay đổi UX khoá (Đợt 3)
Các mục này chạm shell, `FeatureGuidanceCard` (K1), đầu trang Thẻ chào (K2), Spotlight/Copilot, nội dung trang chủ. Chi tiết, vị trí mã, rủi ro: `DE_XUAT_DOT3_CHO_PO.md`. Không mục nào làm đổi nhận diện thị giác, trừ T3-5.

| Mục | Thay đổi đề xuất | Khuyến nghị | Quyết |
|---|---|---|---|
| T3-1 | Nhãn truy cập nút UI Studio thành "UI Studio — mở bảng điều khiển giao diện" (1 dòng) | **Đồng ý** | ☐ Đồng ý ☐ Không |
| T3-2 | Nút nổi UI Studio và Copilot không đè nhau/không che thanh đáy ở di động | **Phương án A** (xếp qua `FloatingLayerProvider`) | ☐ A ☐ B (Copilot gọn, UI Studio chỉ từ `md`) ☐ Không |
| T3-3 | `FeatureGuidanceCard`: thay 2 `<button>` thô bằng `Button` chuẩn (giữ nguyên hình thức) | **Đồng ý** | ☐ Đồng ý ☐ Không |
| T3-4 | Đầu trang Thẻ chào: nhóm chế độ dùng `aria-pressed` thay `role="tab"` không có tabpanel; nút làm mới dùng `Button`; `<h1>` giữ nguyên kèm miễn trừ lint | **Đồng ý**, giữ nguyên 5 tab chính | ☐ Đồng ý ☐ Không |
| T3-5 | Trang chủ công cụ: (a) emoji → icon chuẩn; (b) ẩn bộ lọc trạng thái lộ trình nội bộ với cửa hàng; (c) đổi nhãn "Mục tiêu 1…6" | (a) **Đồng ý**; (b)(c) **PO tự quyết nội dung** | ☐ (a) ☐ (b) ☐ (c) |
| T3-6 | Chính sách AI: hiện tên mô tả tiếng Việt thay tên model (Claude/Gemini…) | **Phương án A** (hiện `displayName`; tên model vào chú thích) | ☐ A ☐ B (giữ nguyên, coi là ngoại lệ cấu hình quản trị) |

Nếu không quyết: các lỗi tương ứng vẫn còn (nhãn truy cập sai ở shell, vùng bấm nhỏ ở `FeatureGuidanceCard`, nút nổi che nội dung trên di động).

---

## Câu 2. Cho phép chụp luồng upload ảnh (bắt buộc hỏi PO theo CLAUDE.md)
Cần cho 7 chức năng còn thiếu ảnh: 4.15, 4.16, 4.18, 4.24, 5.13, 7.1, 7.2 (QC ảnh, AI chấm ảnh, ảnh giao tận tay, biên lai chuyển khoản, khách duyệt ảnh, nhận diện ảnh, bộ nội dung từ 1 ảnh).

1. Cho chạy các luồng này trên **DB và server local** (không phải môi trường thật) bằng ảnh mẫu `tests/e2e/fixtures/bo-hoa-tong-hop.jpg`?  ☐ Có ☐ Không
2. Luồng nào được phép, luồng nào cấm trong 14 chặng hành trình? ________
3. Local không có khoá AI nên bước gọi AI sẽ lỗi hoặc bỏ qua. Chấp nhận chụp màn lỗi/chờ, hay cần AI giả lập?  ☐ Chấp nhận ☐ Cần giả lập
4. 7 chức năng quy tắc nền (1.1, 1.15, 1.18, 4.31, 4.32, 9.13, 9.14) ghi "không có màn hình" hay chỉ định màn đại diện?  ☐ Không có màn ☐ Chỉ định: ________

**Khuyến nghị:** Có; chấp nhận chụp màn lỗi/chờ (không thêm hạ tầng); ghi "không có màn hình" cho chức năng nền.
Nếu không quyết: kho ảnh dừng ở 101/123 chức năng có ảnh (gán theo route), 15 chức năng chỉ có một phần, 7 chức năng chưa có màn hình.

---

## Câu 3. Xử lý 341 lớp màu dùng token không tồn tại
Phát hiện: 15 tên (ví dụ `surface-muted` 240 lượt/130 tệp, `primary-subtle` 34) không có `--color-…`, nên Tailwind không sinh CSS và phần tử **không có nền**. Hậu quả đã thấy: chip chữ tối trên nền tối (1,31:1). Đã chặn phát sinh mới bằng luật lint R24 (baseline khoá 338 chỗ cũ). Chi tiết: `PHAN_TICH_LOP_MAU_KHONG_CO_TOKEN.md`.

| Phương án | Hình ảnh | Cần duyệt token? |
|---|---|---|
| A. Thêm token bí danh (`--color-surface-muted: var(--color-surface-alt)`…) | Thêm nền cho ~340 chỗ | **Có** |
| B. Đổi tên lớp sang token sẵn có (codemod) | Như A | Không |
| C. Xoá các lớp vô hiệu | Không đổi | Không |

**Khuyến nghị:** xem ảnh thử trước, rồi chọn B. Tôi sẽ áp thử gợi ý lên 5 màn trên nhánh tạm và gửi ảnh trước/sau; chưa đụng nhánh chính.
Quyết: ☐ A ☐ B ☐ C ☐ Xem ảnh thử rồi quyết
Nếu không quyết: giữ hiện trạng (không xấu thêm vì đã có luật chặn), nhưng các chip/thẻ vẫn trong suốt và có thể phát sinh lỗi tương phản trên nền tối.

---

## Câu 4. Thanh trượt (`<input type="range">`)
Lint R18 báo 11 chỗ (tổng 13 ô range trong mã) vì kho `components/ui/` chưa có `Slider`. `@base-ui/react` đã có sẵn module `slider`, nên tạo `Slider` chuẩn **không thêm phụ thuộc**.

| Phương án | Ghi chú |
|---|---|
| A. Tạo `Slider` chuẩn (bọc Base UI), chuyển 11 chỗ | Nhất quán, có nhãn truy cập và vùng bấm chuẩn; thêm một component mới cần PO duyệt |
| B. Giữ `<input type="range">`, thêm miễn trừ R18 có lý do | Không đổi gì, nợ lint giữ nguyên |

**Khuyến nghị:** A (thanh trượt là điều khiển chạm thường dùng, vùng bấm hiện nhỏ).
Quyết: ☐ A ☐ B

---

**Gửi lại:** chỉ cần danh sách đã đánh dấu. Mục nào quyết xong tôi làm theo thứ tự: T3-1 → T3-3 → T3-4 → T3-5(a) → T3-2 → còn lại; mỗi mục một commit, có test, chụp lại màn ảnh hưởng ở 390 và 1280px.
