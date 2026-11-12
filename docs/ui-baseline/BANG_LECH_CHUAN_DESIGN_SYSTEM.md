# Bảng lệch chuẩn Design System (BẢN NHÁP)

Đối chiếu kho ảnh màn hình và kiểm tra tự động với `docs/design-system/` (README, layouts, accessibility) và `docs/dac-ta/ux-patterns/OPERATING_PRINCIPLES.md`. Mức P0–P3 theo `visual-review.md` §2; mã audit IA/VH/ID/AC/CO/RESP/ST theo §1 cùng tệp.

## 1. Phạm vi và độ tin cậy

- **Đã làm:** lint UX tĩnh của dự án (`scripts/ux-lint.ts`, 29 vi phạm); axe-core + cuộn ngang + dấu hiệu nội dung + vùng bấm trên **296 lượt đo** (148 màn × 390 và 1280px, 0 lượt không tải được) cho Điều hành, Console, 7 vai khác và trang khách; xem thủ công các màn tiêu biểu (Trang chủ, Sản phẩm mobile, Đơn hàng, Thẻ chào).
- **Chưa làm:** soát thủ công từng ảnh trong 1.263 ảnh (mới xem một mẫu nhỏ); bàn phím, zoom 200%, trình đọc màn hình; kiểm màu theo chế độ màu từng ngành; các trạng thái hộp thoại/tab chưa chạy axe; luật phân tầng L0–L4, archetype A–F và Screen Contract từng màn (cần đọc hợp đồng từng trang).
- Nhiều phát hiện nhóm dưới đây là **kết quả công cụ**, một số là heuristic. Dòng ghi "chưa xác minh" cần người xem lại. Hai nhóm bị loại vì là nhiễu: số điện thoại mẫu (do dữ liệu seed tôi tạo) và chữ in hoa tiếng Việt bị tách.
- Quy tắc của dự án: UX khoá K1/K2/shell/Spotlight, token, ngôn từ thương mại → **hỏi PO** trước khi sửa. Cột "Cần PO" đánh dấu các dòng đó. Chưa sửa gì trong mã.

## 2. Tổng hợp

| Mức | Số vấn đề |
|---|---:|
| P0 | 0 |
| P1 | 5 |
| P2 | 11 |
| P3 | 2 |
| **Tổng** | **18** |

Không có P0 (không phát hiện lỗi an toàn/mất dữ liệu bằng các kiểm tra này). Axe không sạch: critical 10 lượt, serious 298 lượt (trong đó 276 lượt là một lỗi duy nhất của shell, DS-09; phần còn lại đã nằm trong DS-01…DS-08).

## 3. Bảng lệch chuẩn theo vấn đề

| ID | Mức | Mã audit | Luật chuẩn | Phát hiện | Màn ảnh hưởng | Đề xuất | Cần PO |
|---|---|---|---|---|---|---|---|
| DS-01 | P1 | AC-01 | accessibility.md; OPERATING §3 (tương phản ≥ 4,5:1, không `text-warning` trên nền nhạt) | Chữ cảnh báo kém tương phản (axe color-contrast, serious): `text-warning` trên nền nhạt, ví dụ số "0 đ" ở Đơn hàng/Thẻ chào, nhãn "Chưa đo…" ở Bộ máy, chip trạng thái ở Kết nối nội bộ, tiêu đề ở Tri thức | 11 màn: /don-hang, /the-chao, /bo-may, /noi-bo/ket-noi, /tri-thuc… | Đổi sang token `*-text` (`text-warning-text`) | Không |
| DS-02 | P1 | AC-01 | OPERATING §3 (mọi ô nhập/nút có nhãn truy cập) | Nút/ô thiếu tên truy cập: nút gửi ở khung chat (disabled), nút ở chi tiết sản phẩm (390px), ô số ở /gia (3 ô không nhãn), menu chọn ở Thư viện giao diện và Mức dùng nền tảng (axe button-name, label, select-name: critical) | /hoi-thoai, /chat, /san-pham/[id], /gia, /van-hanh/thu-vien-giao-dien, /van-hanh/muc-dung | Thêm `aria-label` hoặc nhãn hiển thị | Không |
| DS-03 | P1 | RESP-01 | OPERATING §3, 03a §28 (không cuộn ngang ở 390px) | Trang tràn ngang ở 390px: Tri thức 420px, Dữ liệu nền tảng 538px; nhẹ hơn: Thành viên, Hội thoại/Chat, Số liệu (403–405px) | /tri-thuc, /van-hanh/du-lieu, /cai-dat/thanh-vien, /hoi-thoai, /chat, /so-lieu | Bọc bảng rộng trong vùng cuộn có nhãn; sửa phần tử tràn | Không |
| DS-04 | P1 | CO-01 / VD-02 | OPERATING §6.11 (bộ icon chuẩn Phosphor qua `AppIcon`); lint R3 | Trang chủ dùng emoji làm icon ở ô thống kê và chip lọc (✅ 🔨 🏗️ 📋) thay vì bộ icon chuẩn | / (Điều hành), /cong-cu | Thay bằng `AppIcon`/`IconTile` | Không |
| DS-05 | P1 | ID-01 / nội dung | OPERATING §2 (không mã kỹ thuật, tên mẫu tiếng Anh trên màn hình); lint R16 | Mã kỹ thuật và tiếng Anh lộ ra màn hình: mã "M01…M09" (Tri thức, Kho mẫu), "M04a" (Tối ưu ảnh, lint R16), mã danh mục STAND/BOUQUET/BOX/VASE/BASKET và mã "#ML-BOX-04" trên thẻ sản phẩm, "ML-STAND-06" ở Nội dung, "ALL" ở bộ lọc Thẻ chào/Nhật ký, "BRIEF (T02)" và "MANTRA" ở Điều phối, "Mother Hard-Locks" ở Cam kết, tên chủ đề "MODERN" ở Console, lỗi "Gate 1" từ API | /tri-thuc, /kho-templates, /san-pham, /noi-dung, /the-chao, /audit, /dieu-phoi, /cai-dat/ma-tran-camket, /van-hanh | Việt hóa nhãn; ẩn mã nội bộ; đổi thông báo lỗi | Không |
| DS-06 | P2 | AC-01 | accessibility.md (landmark, tiêu đề) | Cấu trúc trang: 30 màn lồng nhiều `<main>`, 34 màn landmark trùng không nhãn (axe landmark-*), 17 màn thứ tự tiêu đề sai (heading-order) | /bao-gia, /don-hang, /san-pham, /tai-anh, /hoi-thoai, /gia…; heading-order: /, /cai-dat, /cong-cu… | Một `<main>` ở shell; đặt `aria-label` cho landmark lặp; sửa cấp tiêu đề | Không |
| DS-07 | P2 | AC-01 | layouts.md (mọi trang có `<h1>` qua `PageHeader`; lint R20) | Trang không có `<h1>`: Đăng nhập, Chính sách bảo mật, Báo giá công khai, Số liệu (Kế toán), Phiếu in; Thư viện giao diện có 2 `<h1>`; lint R20 còn 2 chỗ dùng `<h1>` thô (Thẻ chào, Gia công) | /dang-nhap, /chinh-sach-bao-mat, /bg/[token], /so-lieu, /in-phieu/[id] | Dùng `PageHeader` | Không |
| DS-08 | P2 | AC-01 | accessibility.md (khung `region`) | Trang công khai thiếu landmark chứa nội dung (axe region): Đăng nhập, Chính sách, Báo giá, Catalog `/c`, Gia công; 3 trang khách có 2 banner (`/g`, `/s`, `/bst`) | /dang-nhap, /c/[slug], /g/[id], /s/[code], /bst/…, /subcontract/… | Bọc nội dung trong `<main>`; giữ một banner | Không |
| DS-09 | P2 | AC-01 | accessibility.md (WCAG 2.5.3 nhãn trong tên) | Nút "Tùy biến Giao diện" ở khung shell có `aria-label` không chứa nhãn hiển thị — lặp ở mọi màn (axe label-content-name-mismatch, 1 phần tử/trang) | Mọi màn có shell (138 lượt) | Sửa nhãn ở shell. Shell là UX khoá — cần PO duyệt | Có (shell khoá) |
| DS-10 | P2 | AC-01 | OPERATING §3 (vùng bấm ≥ 24px, di động 32–44px) | Phần tử điều khiển nhỏ hơn 24px ở 390px: 136/148 màn có ít nhất 1 phần tử; nặng nhất Console Thông báo (56), Cài đặt Thông báo (41), Thư viện giao diện (12), các Ma trận chính sách/cam kết (8–10). Số đo thô, chưa trừ ngoại lệ khoảng cách của WCAG 2.5.8 | /van-hanh/thong-bao, /cai-dat/thong-bao, /van-hanh/thu-vien-giao-dien, /cai-dat/ma-tran-* | Tăng vùng bấm; xác minh từng nhóm điều khiển | Không |
| DS-11 | P2 | VD-03 / RESP-01 | 03a UX-010; lint R4 | Nút bị cắt chữ: "Xác nhận tiền" bị xuống 3 dòng và cắt ở bảng Xác nhận tiền; ô nhập số tiền hiện số trần không có dấu phân cách | /don-hang, /the-chao (tab Điều hành) | Cho nút đủ rộng/không xuống dòng; định dạng số tiền | Không |
| DS-12 | P2 | ID-02 / VD-04 | layouts.md §3 (phần tử nổi qua `FloatingLayerProvider`) | Phần tử nổi chồng lên nội dung: nút tròn bên phải và thẻ "UI Studio MỘC" che thẻ sản phẩm, bảng và thanh đáy ở 390px | Mọi màn của Điều hành (ảnh /san-pham, /don-hang mobile) | Xác định khi nào hiện; đẩy lên khỏi thanh đáy. UI Studio/Spotlight là UX khoá | Có (khoá) |
| DS-13 | P2 | IA-01 / VH-01 | OPERATING §6.1 (nhãn ≤ 5 từ, icon lớn); §1.8 | Trang chủ Điều hành hiện trạng thái lộ trình nội bộ cho chủ cửa hàng: "Hoàn thiện / Đang phát triển / Nền tảng sẵn / Sẽ phát triển", đếm "ấn phẩm/công cụ"; thẻ "Mục tiêu 1…6" | / (Điều hành) | Thay bằng nhãn theo việc của người dùng | Có (PO quyết thông điệp) |
| DS-14 | P2 | VD-02 | OPERATING §6.7; `EmptyState` | Nút icon không nhãn: hàng 5 nút ở đầu trang Sản phẩm (390px), ô biểu tượng ở đầu Thẻ chào chỉ icon | /san-pham, /the-chao | Thêm nhãn chữ hoặc tooltip; dùng `TabActionHeader` | Có (K2) |
| DS-15 | P2 | CO-01 | lint R18, R14 (ADR-011 D-UI-07) | Điều khiển tự dựng thay vì component chuẩn (lint UX): R14×4, R16×1, R18×22, R20×2 = 29 vi phạm. R18: 22 điều khiển HTML thô hoặc `role=` giả (Thẻ chào, shell, Chain dispatch, Market intelligence, FeatureGuidanceCard); R14: 4 trạng thái tác vụ tự đặt | src/app/(app)/the-chao, bo-may; components/greeting-card, layout, templates, catalog, upload | Dùng `Button`, `Checkbox`, `Switch`, `TaskUiState`. Ghi chú: `FeatureGuidanceCard` thuộc UX khoá K1 | Có (K1) |
| DS-16 | P2 | ID-01 | OPERATING §2 (không tên model AI trên màn hình) | Màn Chính sách AI liệt kê tên model ("Claude Opus 5, Gemini 2.5 Pro…") trong ô chọn | /cai-dat-ai (khoá ở production) | PO quyết: có là ngoại lệ cho cấu hình admin không | Có |
| DS-17 | P3 | AC-01 | accessibility.md | Vùng cuộn ngang không focus được bằng bàn phím (axe scrollable-region-focusable) ở bảng Tri thức, Tích hợp Console | /tri-thuc, /van-hanh/tich-hop | Thêm `tabIndex=0` và nhãn cho vùng cuộn | Không |
| DS-18 | P3 | ST-01 / môi trường | OPERATING §6.7 | Ảnh sản phẩm hiển thị chữ thay thế chồng lên khung ảnh trống (ảnh seed không tải được). CHƯA XÁC MINH có phải lỗi môi trường local hay lỗi thật | /san-pham (mọi vai có sản phẩm) | Kiểm trên môi trường có kho ảnh thật | Không |

## 4. Bảng theo từng màn

Cột "Axe nặng" = quy tắc axe mức critical/serious; "Axe vừa" = moderate/minor; "Ngang 390" = độ rộng cuộn khi vượt 390px; "Nhỏ <24px" = số điều khiển nhỏ ở 390px (số đo thô). Ảnh tương ứng tra trong `INDEX.md`.

| Vai | Màn | Axe nặng | Axe vừa | Ngang 390 | Nhỏ <24px | `<h1>` |
|---|---|---|---|---|---|---|
| dieu_hanh | `/` | label-content-name-mismatch | heading-order | — | 7 | 1 |
| dieu_hanh | `/audit` | label-content-name-mismatch | — | — | 2 | 1 |
| dieu_hanh | `/bang-gia` | label-content-name-mismatch | — | — | 2 | 1 |
| dieu_hanh | `/bao-cao` | label-content-name-mismatch | — | — | 1 | 1 |
| dieu_hanh | `/bao-gia` | label-content-name-mismatch | landmark-main-is-top-level, landmark-no-duplicate-main, landmark-unique | — | 1 | 1 |
| dieu_hanh | `/bo-may` | color-contrast, label-content-name-mismatch | — | — | 1 | 1 |
| dieu_hanh | `/cai-dat` | label-content-name-mismatch | heading-order | — | 3 | 1 |
| dieu_hanh | `/cai-dat-ai` | label-content-name-mismatch | — | — | 1 | 1 |
| dieu_hanh | `/cai-dat/ma-tran-camket` | label-content-name-mismatch | — | — | 8 | 1 |
| dieu_hanh | `/cai-dat/ma-tran-chinhsach` | label-content-name-mismatch | — | — | 9 | 1 |
| dieu_hanh | `/cai-dat/ma-tran-phigiacong` | label-content-name-mismatch | — | — | 4 | 1 |
| dieu_hanh | `/cai-dat/ma-tran-thanhtoan-datco` | label-content-name-mismatch | — | — | 5 | 1 |
| dieu_hanh | `/cai-dat/ma-tran-uudai` | label-content-name-mismatch | — | — | 5 | 1 |
| dieu_hanh | `/cai-dat/thanh-vien` | label-content-name-mismatch | — | 405 | 1 | 1 |
| dieu_hanh | `/cai-dat/thanh-vien/vai-tro` | label-content-name-mismatch | — | — | 1 | 1 |
| dieu_hanh | `/cai-dat/thong-bao` | label-content-name-mismatch | heading-order | — | 41 | 1 |
| dieu_hanh | `/catalog` | label-content-name-mismatch | — | — | 1 | 1 |
| dieu_hanh | `/cham-soc` | label-content-name-mismatch | heading-order | — | 1 | 1 |
| dieu_hanh | `/cong-cu` | label-content-name-mismatch | heading-order | — | 7 | 1 |
| dieu_hanh | `/cong-cu/anh-san-pham` | label-content-name-mismatch | — | — | 1 | 1 |
| dieu_hanh | `/cong-cu/bo-anh-san-pham` | label-content-name-mismatch | — | — | 1 | 1 |
| dieu_hanh | `/cong-cu/poster-banner` | label-content-name-mismatch | — | — | 2 | 1 |
| dieu_hanh | `/creative-studio` | label-content-name-mismatch | — | — | 1 | 1 |
| dieu_hanh | `/cua-hang` | label-content-name-mismatch | — | — | 1 | 1 |
| dieu_hanh | `/dieu-phoi` | label-content-name-mismatch | — | — | 1 | 1 |
| dieu_hanh | `/dieu-phoi/doi-tac` | label-content-name-mismatch | — | — | 1 | 1 |
| dieu_hanh | `/don-hang` | color-contrast, label-content-name-mismatch | landmark-main-is-top-level, landmark-no-duplicate-main, landmark-unique | — | 2 | 1 |
| dieu_hanh | `/du-lieu` | label-content-name-mismatch | — | — | 3 | 1 |
| dieu_hanh | `/duyet` | label-content-name-mismatch | — | — | 1 | 1 |
| dieu_hanh | `/gia` | label, label-content-name-mismatch | heading-order, landmark-main-is-top-level, landmark-no-duplicate-main, landmark-unique | — | 5 | 1 |
| dieu_hanh | `/ho-so` | label-content-name-mismatch | — | — | 5 | 1 |
| dieu_hanh | `/ho-so/danh-thiep` | label-content-name-mismatch | — | — | 1 | 1 |
| dieu_hanh | `/ho-so/thu-vien-thuong-hieu` | label-content-name-mismatch | — | — | 1 | 1 |
| dieu_hanh | `/hoi-thoai` | button-name, label-content-name-mismatch | landmark-main-is-top-level, landmark-no-duplicate-main, landmark-unique | 403 | 1 | 1 |
| dieu_hanh | `/hoi-thoai/kenh-tich-hop` | — | — | — | 9 | 1 |
| dieu_hanh | `/in-an` | label-content-name-mismatch | — | — | 1 | 1 |
| dieu_hanh | `/job` | label-content-name-mismatch | — | — | 1 | 1 |
| dieu_hanh | `/ket-noi` | label-content-name-mismatch | — | — | 1 | 1 |
| dieu_hanh | `/khach-hang` | label-content-name-mismatch | — | — | 1 | 1 |
| dieu_hanh | `/kho-du-lieu` | label-content-name-mismatch | — | — | 1 | 1 |
| dieu_hanh | `/kho-templates` | label-content-name-mismatch | — | — | 1 | 1 |
| dieu_hanh | `/landing-page` | label-content-name-mismatch | — | — | 5 | 1 |
| dieu_hanh | `/lich-dang` | label-content-name-mismatch | — | — | 1 | 1 |
| dieu_hanh | `/market-intelligence` | label-content-name-mismatch | heading-order | — | 1 | 1 |
| dieu_hanh | `/muc-dung` | label-content-name-mismatch | — | — | 1 | 1 |
| dieu_hanh | `/noi-bo/ket-noi` | color-contrast, label-content-name-mismatch | landmark-main-is-top-level, landmark-no-duplicate-main, landmark-unique | — | 1 | 1 |
| dieu_hanh | `/noi-dung` | label-content-name-mismatch | — | — | 1 | 1 |
| dieu_hanh | `/quang-ba/chien-dich` | label-content-name-mismatch | — | — | 1 | 1 |
| dieu_hanh | `/san-pham` | label-content-name-mismatch | landmark-main-is-top-level, landmark-no-duplicate-main, landmark-unique | — | 1 | 1 |
| dieu_hanh | `/san-pham/kha-dung` | label-content-name-mismatch | heading-order | — | 1 | 1 |
| dieu_hanh | `/san-pham/nhap-hang-loat` | label-content-name-mismatch | landmark-main-is-top-level, landmark-no-duplicate-main, landmark-unique | — | 2 | 1 |
| dieu_hanh | `/san-pham/tao-moi` | label-content-name-mismatch | — | — | 3 | 1 |
| dieu_hanh | `/so-lieu` | label-content-name-mismatch | — | 405 | 1 | 1 |
| dieu_hanh | `/tai-anh` | label-content-name-mismatch | landmark-main-is-top-level, landmark-no-duplicate-main, landmark-unique | — | 1 | 1 |
| dieu_hanh | `/the-chao` | color-contrast, label-content-name-mismatch | — | — | 3 | 1 |
| dieu_hanh | `/them` | label-content-name-mismatch | — | — | 1 | 1 |
| dieu_hanh | `/thu-hut-khach` | label-content-name-mismatch | — | — | 1 | 1 |
| dieu_hanh | `/tich-hop` | label-content-name-mismatch | — | — | 1 | 1 |
| dieu_hanh | `/tin-nhan` | label-content-name-mismatch | — | — | 1 | 1 |
| dieu_hanh | `/tinh-gia` | label-content-name-mismatch | — | — | 1 | 1 |
| dieu_hanh | `/tinh-gia/cong-thuc` | label-content-name-mismatch | — | — | 1 | 1 |
| dieu_hanh | `/tinh-gia/du-toan` | label-content-name-mismatch | — | — | 1 | 1 |
| dieu_hanh | `/tinh-gia/gia-ban` | label-content-name-mismatch | — | — | 1 | 1 |
| dieu_hanh | `/tinh-gia/gia-von` | label-content-name-mismatch | — | — | 1 | 1 |
| dieu_hanh | `/tinh-gia/nguyen-lieu` | label-content-name-mismatch | — | — | 1 | 1 |
| dieu_hanh | `/tri-thuc` | color-contrast, label-content-name-mismatch, scrollable-region-focusable | landmark-main-is-top-level, landmark-no-duplicate-main, landmark-unique | 420 | 9 | 1 |
| dieu_hanh | `/uu-dai` | label-content-name-mismatch | — | — | 5 | 1 |
| dieu_hanh | `/uu-dai/ma-giam-gia` | label-content-name-mismatch | — | — | 1 | 1 |
| dieu_hanh | `/vai-tro` | label-content-name-mismatch | landmark-main-is-top-level, landmark-no-duplicate-main, landmark-unique | — | 1 | 1 |
| dieu_hanh | `/video` | label-content-name-mismatch | — | — | 1 | 1 |
| dieu_hanh | `/san-pham/dev-moclan-prd-0000-0000-000000000001` | button-name, label-content-name-mismatch | — | — | 6 | 1 |
| dieu_hanh | `/bang-gia/74d06878-87c0-41c0-ba04-6212be082270` | label-content-name-mismatch | — | — | 1 | 1 |
| dieu_hanh | `/in-phieu/8bab826a-af61-4704-ad1e-2d439fc0b63b` | — | page-has-heading-one | — | 0 | 0 |
| dieu_phoi | `/` | label-content-name-mismatch | heading-order | — | 6 | 1 |
| dieu_phoi | `/the-chao` | color-contrast, label-content-name-mismatch | — | — | 4 | 1 |
| dieu_phoi | `/don-hang` | color-contrast, label-content-name-mismatch | landmark-main-is-top-level, landmark-no-duplicate-main, landmark-unique | — | 3 | 1 |
| dieu_phoi | `/dieu-phoi` | label-content-name-mismatch | — | — | 1 | 1 |
| dieu_phoi | `/dieu-phoi/doi-tac` | label-content-name-mismatch | — | — | 1 | 1 |
| dieu_phoi | `/in-an` | label-content-name-mismatch | — | — | 1 | 1 |
| dieu_phoi | `/chat` | button-name, label-content-name-mismatch | landmark-main-is-top-level, landmark-no-duplicate-main, landmark-unique | 403 | 1 | 1 |
| ke_toan | `/` | label-content-name-mismatch | landmark-main-is-top-level, landmark-no-duplicate-main, landmark-unique | — | 1 | 1 |
| ke_toan | `/the-chao` | label-content-name-mismatch | — | — | 2 | 1 |
| ke_toan | `/don-hang` | label-content-name-mismatch | landmark-main-is-top-level, landmark-no-duplicate-main, landmark-unique | — | 1 | 1 |
| ke_toan | `/bao-cao` | label-content-name-mismatch | — | — | 1 | 1 |
| ke_toan | `/muc-dung` | label-content-name-mismatch | — | — | 1 | 1 |
| ke_toan | `/so-lieu` | — | landmark-one-main, page-has-heading-one, region | — | 3 | 0 |
| marketing | `/` | label-content-name-mismatch | landmark-main-is-top-level, landmark-no-duplicate-main, landmark-unique | — | 1 | 1 |
| marketing | `/uu-dai` | label-content-name-mismatch | — | — | 1 | 1 |
| marketing | `/landing-page` | label-content-name-mismatch | — | — | 5 | 1 |
| marketing | `/catalog` | label-content-name-mismatch | — | — | 1 | 1 |
| marketing | `/noi-dung` | label-content-name-mismatch | — | — | 1 | 1 |
| marketing | `/cong-cu` | label-content-name-mismatch | heading-order | — | 7 | 1 |
| platform | `/van-hanh` | label-content-name-mismatch | — | — | 9 | 1 |
| platform | `/van-hanh/cau-hinh` | label-content-name-mismatch | — | — | 1 | 1 |
| platform | `/van-hanh/dang-ky` | label-content-name-mismatch | — | — | 1 | 1 |
| platform | `/van-hanh/du-lieu` | label-content-name-mismatch | — | 538 | 3 | 1 |
| platform | `/van-hanh/hang-doi-loi` | label-content-name-mismatch | — | — | 1 | 1 |
| platform | `/van-hanh/ma-tran-camket` | label-content-name-mismatch | — | — | 9 | 1 |
| platform | `/van-hanh/ma-tran-chinhsach` | label-content-name-mismatch | — | — | 10 | 1 |
| platform | `/van-hanh/ma-tran-phigiacong` | label-content-name-mismatch | — | — | 5 | 1 |
| platform | `/van-hanh/ma-tran-thanhtoan-datco` | label-content-name-mismatch | — | — | 6 | 1 |
| platform | `/van-hanh/ma-tran-uudai` | label-content-name-mismatch | — | — | 6 | 1 |
| platform | `/van-hanh/marketplace` | label-content-name-mismatch | heading-order, landmark-main-is-top-level, landmark-no-duplicate-main, landmark-unique | — | 1 | 1 |
| platform | `/van-hanh/muc-dung` | label-content-name-mismatch, select-name | — | — | 1 | 1 |
| platform | `/van-hanh/nganh` | label-content-name-mismatch | — | — | 4 | 1 |
| platform | `/van-hanh/nhat-ky` | label-content-name-mismatch | — | — | 1 | 1 |
| platform | `/van-hanh/phe-duyet` | label-content-name-mismatch | — | — | 1 | 1 |
| platform | `/van-hanh/quan-tri-ma-tran` | label-content-name-mismatch | — | — | 6 | 1 |
| platform | `/van-hanh/suc-khoe` | label-content-name-mismatch | — | — | 2 | 1 |
| platform | `/van-hanh/thong-bao` | label-content-name-mismatch | heading-order | — | 56 | 1 |
| platform | `/van-hanh/thu-vien-giao-dien` | button-name, color-contrast, label-content-name-mismatch | landmark-unique | — | 12 | 2 |
| platform | `/van-hanh/thu-vien-man-hinh` | color-contrast, label-content-name-mismatch | heading-order | — | 1 | 1 |
| platform | `/van-hanh/tich-hop` | label-content-name-mismatch, scrollable-region-focusable | — | — | 1 | 1 |
| platform | `/van-hanh/to-chuc` | label-content-name-mismatch | — | — | 1 | 1 |
| platform | `/van-hanh/truong-du-lieu` | label-content-name-mismatch | empty-table-header | — | 1 | 1 |
| platform | `/van-hanh/to-chuc/dev-moclan-org-0000-0000-000000000001` | label-content-name-mismatch | — | — | 3 | 1 |
| product_manager | `/` | color-contrast, label-content-name-mismatch | landmark-main-is-top-level, landmark-no-duplicate-main, landmark-unique | — | 1 | 1 |
| product_manager | `/san-pham` | label-content-name-mismatch | landmark-main-is-top-level, landmark-no-duplicate-main, landmark-unique | — | 1 | 1 |
| product_manager | `/san-pham/tao-moi` | label-content-name-mismatch | — | — | 3 | 1 |
| product_manager | `/san-pham/kha-dung` | label-content-name-mismatch | heading-order | — | 1 | 1 |
| product_manager | `/san-pham/nhap-hang-loat` | label-content-name-mismatch | landmark-main-is-top-level, landmark-no-duplicate-main, landmark-unique | — | 2 | 1 |
| product_manager | `/tai-anh` | label-content-name-mismatch | landmark-main-is-top-level, landmark-no-duplicate-main, landmark-unique | — | 1 | 1 |
| public | `/dang-nhap` | — | landmark-one-main, page-has-heading-one, region | — | 3 | 0 |
| public | `/chinh-sach-bao-mat` | — | landmark-one-main, page-has-heading-one, region | — | 0 | 0 |
| public | `/g/3f38b846-472c-40ae-8a04-ee608ebaf633` | label-content-name-mismatch | landmark-no-duplicate-banner, landmark-unique | — | 0 | 1 |
| public | `/c/hoa-demo` | color-contrast | heading-order, region | — | 0 | 1 |
| public | `/ch/siin-store-ja261` | — | — | — | 0 | 1 |
| public | `/b/T01-B2MYYW0W` | label-content-name-mismatch | — | — | 0 | 1 |
| public | `/b/T01-3FZV23AA` | label-content-name-mismatch | — | — | 0 | 1 |
| public | `/s/EQWHPCKGNW` | label-content-name-mismatch | landmark-no-duplicate-banner, landmark-unique | — | 0 | 1 |
| public | `/bst/siin-store/sinh-nhat-demo` | label-content-name-mismatch | landmark-no-duplicate-banner, landmark-unique | — | 0 | 1 |
| public | `/bg/BHxOs2TE98dtMEka4h9bD642gMNG7sV117A42TxWtFQ` | — | landmark-one-main, page-has-heading-one, region | — | 0 | 0 |
| public | `/subcontract/DH-DEMO-GIACONG?branch=demo-branch-q3&t=dev-moclan-org-00` | — | landmark-one-main, region | — | 0 | 1 |
| public | `/chia-se/cho-doi-tac/fAX2IioQlzAiTj0gCiLsoX7u5jiRoLuW4WUxEtgXBxk` | — | heading-order, landmark-main-is-top-level, landmark-no-duplicate-main, landmark-unique | — | 0 | 1 |
| sale | `/` | label-content-name-mismatch | landmark-main-is-top-level, landmark-no-duplicate-main, landmark-unique | — | 1 | 1 |
| sale | `/the-chao` | label-content-name-mismatch | — | — | 4 | 1 |
| sale | `/don-hang` | label-content-name-mismatch | landmark-main-is-top-level, landmark-no-duplicate-main, landmark-unique | — | 1 | 1 |
| sale | `/bao-gia` | label-content-name-mismatch | landmark-main-is-top-level, landmark-no-duplicate-main, landmark-unique | — | 1 | 1 |
| sale | `/khach-hang` | label-content-name-mismatch | — | — | 1 | 1 |
| sale | `/cham-soc` | label-content-name-mismatch | heading-order | — | 1 | 1 |
| sale | `/san-pham` | label-content-name-mismatch | landmark-main-is-top-level, landmark-no-duplicate-main, landmark-unique | — | 1 | 1 |
| sale | `/chat` | button-name, label-content-name-mismatch | landmark-main-is-top-level, landmark-no-duplicate-main, landmark-unique | 403 | 1 | 1 |
| shipper | `/` | label-content-name-mismatch | landmark-main-is-top-level, landmark-no-duplicate-main, landmark-unique | — | 1 | 1 |
| shipper | `/don-hang` | label-content-name-mismatch | landmark-main-is-top-level, landmark-no-duplicate-main, landmark-unique | — | 1 | 1 |
| shipper | `/the-chao` | label-content-name-mismatch | — | — | 2 | 1 |
| tho_cam | `/` | label-content-name-mismatch | landmark-main-is-top-level, landmark-no-duplicate-main, landmark-unique | — | 1 | 1 |
| tho_cam | `/don-hang` | label-content-name-mismatch | landmark-main-is-top-level, landmark-no-duplicate-main, landmark-unique | — | 1 | 1 |
| tho_cam | `/the-chao` | label-content-name-mismatch | — | — | 2 | 1 |

## 5. Cần PO quyết

1. Sửa shell/UX khoá: nút "Tùy biến Giao diện" (DS-09), phần tử nổi UI Studio/Copilot (DS-12), `FeatureGuidanceCard` raw `<button>` (DS-15), nút icon ở đầu trang (DS-14).
2. Trang chủ Điều hành: bỏ trạng thái lộ trình nội bộ và emoji (DS-04, DS-13).
3. Tên model AI ở Chính sách AI có là ngoại lệ cho cấu hình admin (DS-16).
4. Thứ tự sửa: đề xuất P1 trước (DS-01…DS-05), rồi theo mẫu giao diện dùng chung.
