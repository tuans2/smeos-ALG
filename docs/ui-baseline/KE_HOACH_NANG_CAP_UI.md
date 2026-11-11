# Kế hoạch nâng cấp UI/UX theo mẫu giao diện dùng chung (BẢN NHÁP chờ PO duyệt)

Căn cứ: `BANG_LECH_CHUAN_DESIGN_SYSTEM.md` (18 vấn đề DS-01…DS-18), `DOI_CHIEU_123_CHUC_NANG.md`, kho ảnh 1.263 ảnh (`INDEX.md`). Chuẩn: `docs/design-system/`, `OPERATING_PRINCIPLES.md`.
Chưa sửa mã. Ước lượng dùng cỡ tương đối (S/M/L), **không** phải số ngày. Mọi con số "màn hưởng lợi" lấy từ phép đo 296 lượt ở bảng lệch chuẩn.

## 1. Nguyên tắc

1. **Sửa ở mẫu dùng chung, không sửa từng màn.** Mỗi vấn đề đã truy ra nguyên nhân gốc trong mã (mục 2); sửa một chỗ cho nhiều màn.
2. **Một đợt = một nhóm lỗi, một commit có test.** Không gộp refactor ngoài phạm vi (CLAUDE.md `[PROD]`).
3. **UX khoá (K1, K2, shell, Spotlight/UI Studio), token, ngôn từ thương mại → hỏi PO trước.** Các hạng mục đó nằm riêng ở Đợt 3.
4. **Mỗi đợt có bằng chứng trước/sau:** chụp lại đúng các màn bị ảnh hưởng bằng bộ script Playwright đã dùng, chạy lại axe/cuộn ngang/vùng bấm, đối chiếu với bảng lệch chuẩn.
5. **Không có file > 350 dòng bị làm dài thêm**; tệp đã vượt thì tách khi sửa (CLAUDE.md #7).

## 2. Bản đồ mẫu dùng chung ↔ vấn đề

| Mẫu | Nguyên nhân gốc (đã thấy trong mã) | Vấn đề | Màn hưởng lợi (đo được) | Cỡ | Khoá/PO |
|---|---|---|---|---|---|
| **M1. Token màu chữ** | `text-warning` (không `-text`) dùng ở 183 tệp / 300 chỗ; token `*-text` đã có theo chuẩn | DS-01 | 11 màn có lỗi tương phản; còn lại tiềm ẩn | M | Token: không thêm token mới, chỉ đổi lớp dùng; cần PO xác nhận danh sách chỗ nền tối |
| **M2. Thân trang (PageLayout / PageHeader / PageContainer)** | 34 tệp tự viết `<main>` lồng trong `<main>` của shell (`app-shell.tsx`), kể cả `PageContainer`; trang tự viết `<h1>` thay `PageHeader` (lint R20) | DS-06, DS-07 | 30 màn lồng `<main>`; 5 màn thiếu `<h1>`; 2 chỗ R20 | M | Không |
| **M3. Điều khiển chuẩn (`components/ui/`)** | 22 chỗ điều khiển HTML thô hoặc `role=` giả (lint R18); vùng bấm nhỏ ở bảng cấu hình; thiếu nhãn truy cập ở vài nút | DS-02, DS-10, DS-15, DS-14 | 5 màn thiếu tên; 136/148 màn có điều khiển <24px ở 390px | L | `FeatureGuidanceCard` thô thuộc K1 |
| **M4. Bảng và vùng cuộn** | Bảng rộng không bọc vùng cuộn có nhãn; bảng Tri thức/Dữ liệu nền tảng tràn ngang | DS-03, DS-17 | 7 màn tràn ngang ở 390px | S | Không |
| **M5. Thẻ sản phẩm và bộ lọc** | `product-card.tsx` in thẳng `category`, mã `#ML-…`; bộ lọc hiện mã danh mục; ảnh lỗi hiện chữ thay thế | DS-05, DS-18 | /san-pham, /noi-dung (4 vai) | S | Không |
| **M6. Trang chủ công cụ (Toolkit)** | `toolkit-home.tsx` + `toolkit-catalog.ts` dùng emoji, nhãn lộ trình nội bộ ("Nền tảng sẵn…"), "Mục tiêu 1…6" | DS-04, DS-13 | `/`, `/cong-cu` | M | **PO quyết thông điệp** |
| **M7. Thẻ chào (hub 5 tab)** | `the-chao/page.tsx` có 2 `<button>` thô và `<h1>` thô; bộ lọc "ALL"; nút "Xác nhận tiền" bị cắt chữ; hàng icon không nhãn | DS-05, DS-11, DS-14, DS-15 | /the-chao, /don-hang | M | K1, K2 |
| **M8. Trang công khai (khách)** | Mỗi trang tự dựng khung: thiếu `<h1>`, thiếu `region`, 2 banner | DS-07, DS-08 | 12 trang khách | S | Không (nhưng `/dang-nhap` là cổng vào — kiểm kỹ) |
| **M9. Nội dung/ngôn từ (i18n)** | Mã kỹ thuật và tiếng Anh nằm trong `locales/vi/*` và dữ liệu miền (`toolkit-catalog.ts`); thông báo lỗi API lộ "Gate 1" | DS-05, DS-16 | /tri-thuc, /kho-templates, /dieu-phoi, /cai-dat/ma-tran-camket… | M | Skill `copywriting-governance`; tên model AI: PO |
| **M10. Shell và phần tử nổi** | Nút "Tùy biến Giao diện" sai nhãn truy cập (lặp 138 lượt); UI Studio/Copilot che nội dung ở 390px | DS-09, DS-12 | mọi màn có shell | S–M | **UX khoá — PO** |

## 3. Thứ tự đợt

### Đợt 0 — chuẩn bị (không đổi giao diện)
- Chốt **khổ chuẩn 390 và 1280px** làm khổ chụp (kho hiện chụp 1440; thêm khổ 1280 cho các màn bị sửa).
- Đưa bộ script chụp/đo hiện ở thư mục tạm vào `scripts/ux-baseline/` (cần PO đồng ý vì thêm tệp công cụ), hoặc dùng `npm run ux:audit` có sẵn trên DB `*_test`.
- Dựng DB `*_test` (`npm run db:test:setup`) để chạy được `test:tenant`, `test:e2e:ux`; ghi mốc "trước" cho 18 vấn đề.
- Xác nhận DS-18 (ảnh sản phẩm lỗi) trên môi trường có kho ảnh thật.

### Đợt 1 — sửa nhanh, rủi ro thấp, không đụng UX khoá (P1 trước)
Thứ tự: **M1 → M2 → M5 → M8 → M4 → M9 (phần nhãn)**.
- M1: codemod `text-warning` → `text-warning-text` có kiểm bối cảnh nền; kèm test token và kiểm tương phản.
- M2: thay `<main>` thừa bằng `<div>`/`PageLayout`, thêm `PageHeader` cho 5 màn thiếu `<h1>`; sửa R20.
- M5: không in mã kỹ thuật ở thẻ sản phẩm, đổi nhãn danh mục sang tiếng Việt.
- M8: khung trang khách thống nhất (`<main>`, một `<h1>`, một banner).
- M4: bọc bảng rộng; thêm `tabIndex` và nhãn vùng cuộn; sửa 7 màn tràn ngang.
- M9: Việt hóa các nhãn mã kỹ thuật (trừ tên model AI, chờ PO).
Kết quả mong đợi: axe critical/serious ngoài lỗi shell về 0; 7 màn hết tràn ngang; lint R20 và R16 về 0.

### Đợt 2 — điều khiển và vùng bấm (cỡ lớn, chia nhỏ)
- M3: sửa ở primitive (`Switch`, `Checkbox`, nút icon: nhãn bắt buộc, vùng bấm ≥ 24px, 44px khi `pointer: coarse`), sau đó chuyển 22 chỗ R18 sang component chuẩn.
- Làm theo nhóm màn: Cài đặt Thông báo, Console Thông báo, Ma trận chính sách/cam kết (nặng nhất về vùng bấm).
- M7 phần không khoá: định dạng số tiền, nút không bị cắt chữ.
Kết quả: lint R18 về 0 trừ phần K1; số điều khiển <24px giảm ở các màn nặng.

### Đợt 3 — hạng mục cần PO duyệt (UX khoá / thông điệp)
- M10: sửa nhãn nút "Tùy biến Giao diện" ở shell; chính sách hiển thị UI Studio/Copilot trên di động.
- M3 (K1): `FeatureGuidanceCard` bỏ `<button>` thô; M7 (K2): hàng icon ở đầu Thẻ chào có nhãn.
- M6: viết lại nội dung trang chủ Điều hành (bỏ trạng thái lộ trình nội bộ, emoji → `AppIcon`).
- DS-16: quyết định cách hiển thị tên model AI ở Chính sách AI.

### Đợt 4 — soát sâu (ngoài khả năng của công cụ tự động)
- Soát từng ảnh trong kho theo mã IA/VH/ID/PD/CU/ST (`visual-review.md` §1) cho các màn chính: Thẻ chào, Đơn hàng, Sản phẩm, Cài đặt.
- Kiểm bàn phím, zoom 200%, trình đọc màn hình; kiểm màu theo chế độ màu từng ngành.
- Đối chiếu từng màn với Screen Contract và archetype (A 10, B 41, C 2, D 5, E 10, F 26 màn đã đo); cập nhật hợp đồng trong cùng commit khi đổi bố cục.

## 4. Cổng kiểm cho mỗi đợt (theo CLAUDE.md)

`npm run typecheck && npm run lint:ratchet` · `npm run lint:ux -- --check` · `npm test` · `npm run check:screen-contracts -- --check` · `npm run check:docs` · `npm run test:e2e:ux` (visual 2 khổ + axe). Màn đụng dữ liệu/route: `npm run test:tenant`, `test:platform`. Thiếu DB `*_test` thì **không** được báo các cổng này đã qua.

## 5. Chỉ số theo dõi

| Chỉ số | Hiện tại | Mục tiêu sau Đợt 1 / 2 |
|---|---:|---|
| Axe critical | 10 lượt | 0 |
| Axe serious (ngoài lỗi shell) | 22 lượt | 0 |
| Màn tràn ngang ở 390px | 7 | 0 |
| Màn lồng `<main>` | 30 | 0 |
| Màn thiếu `<h1>` | 5 | 0 |
| Vi phạm lint UX | 29 (R18: 22, R14: 4, R20: 2, R16: 1) | R20, R16 → 0 (Đợt 1); R18, R14 giảm (Đợt 2) |
| Màn có điều khiển <24px ở 390px | 136/148 (số đo thô) | giảm rõ ở nhóm nặng |

## 6. Rủi ro

- **Codemod M1 chạm 183 tệp:** chia theo thư mục, mỗi lô một commit, chụp lại các màn đại diện; chỗ nền tối có thể cần giữ `text-warning`.
- **Sửa primitive M3 ảnh hưởng toàn hệ thống:** làm qua test của `components/ui/__tests__` và chụp lại 12 màn đại diện trước khi mở rộng.
- **Ảnh baseline là 1440px, chuẩn kiểm là 390/1280:** cần chụp bổ sung khổ 1280 khi bắt đầu sửa.
- **Dữ liệu mẫu local thưa:** một số màn bị đánh giá ở trạng thái gần rỗng; Đợt 4 cần dữ liệu đầy đủ hơn.
- **Công cụ tự động chỉ thấy một phần:** axe sạch không có nghĩa là đạt WCAG (OPERATING §4).

## 7. Cần PO quyết trước khi bắt đầu

1. Đồng ý thứ tự Đợt 1 → 2 → 3 và việc để Đợt 3 chờ duyệt riêng.
2. Cho phép thêm `scripts/ux-baseline/` (công cụ chụp/đo) vào repo, hay chỉ dùng `ux:audit` có sẵn.
3. Danh sách chỗ `text-warning` trên nền tối được giữ nguyên.
4. Thông điệp trang chủ Điều hành (M6) và cách hiển thị tên model AI (DS-16).
5. Chốt khổ chụp chuẩn (390 và 1280) thay cho 1440 trong kho hiện tại.
