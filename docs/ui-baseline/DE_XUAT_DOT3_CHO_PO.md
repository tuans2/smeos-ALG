# Đề xuất Đợt 3 — hạng mục UX khoá, chờ PO duyệt (BẢN NHÁP)

Căn cứ: `KE_HOACH_NANG_CAP_UI.md` Đợt 3, `BANG_LECH_CHUAN_DESIGN_SYSTEM.md`, đọc lại mã ngày 11/11/2026.
**Chưa sửa gì.** CLAUDE.md: đổi UX khoá (`FeatureGuidanceCard` K1, Tab Action Header K2, shell, Spotlight), token, ngôn từ thương mại → hỏi PO trước. Mỗi mục dưới đây nêu hiện trạng (kèm vị trí mã), thay đổi đề xuất, rủi ro và câu hỏi cần PO trả lời.

## Hiệu chỉnh quan trọng so với bảng lệch chuẩn

Đọc mã cho thấy hai phát hiện cũ có phạm vi **nhỏ hơn** tôi báo:

- **UI Studio** chỉ gắn vào cửa hàng ngoài production (`src/app/(app)/layout.tsx:49`, `withUiStudio={process.env.NODE_ENV !== "production"}`); Console nền tảng luôn có (`(platform)/layout.tsx:50`). Vì vậy lỗi nhãn truy cập DS-09 (138 lượt đo) và việc nút nổi che nội dung (DS-12) **không xảy ra với khách cửa hàng trên production**, chỉ ở dev và Console.
- Nút nổi của **Copilot** (`floraos-global-copilot.tsx:184`, `fixed top-1/2 right-3`) mới là phần tử nổi khách thấy trên production.

## Danh sách hạng mục

### T3-1. Nhãn nút UI Studio (DS-09) — rủi ro rất thấp
- **Hiện trạng:** `src/components/layout/ui-studio-drawer.tsx:43` có `aria-label="Mở bảng điều khiển giao diện"`, nhưng chữ hiển thị là "UI Studio" (+ tên preset). Tên truy cập không chứa chữ nhìn thấy (WCAG 2.5.3).
- **Đề xuất:** đổi thành `aria-label="UI Studio — mở bảng điều khiển giao diện"`. Một dòng, không đổi hình ảnh.
- **Ảnh hưởng:** dev và Console. Hết lỗi axe `label-content-name-mismatch` trên mọi màn Console.
- **PO quyết:** đồng ý nhãn mới (shell là UX khoá).

### T3-2. Phần tử nổi che nội dung (DS-12)
- **Hiện trạng:** UI Studio `fixed bottom-24 right-6 z-40`; Copilot `fixed top-1/2 right-3 z-40`. Cả hai tự định vị, **không đi qua `FloatingLayerProvider.registerItem`** như `layouts.md` §3 quy định. Ảnh 390px cho thấy chúng chồng lên thẻ sản phẩm và gần thanh đáy.
- **Đề xuất (chọn một):**
  - A. Đăng ký cả hai vào `FloatingLayerProvider` để xếp chồng không đè nhau; trên di động đặt trên thanh đáy.
  - B. Di động: Copilot thu thành nút tròn cố định sát thanh đáy; UI Studio chỉ hiện trên màn ≥ `md`.
- **Rủi ro:** Copilot/Spotlight là UX khoá; cần chụp lại 12 màn đại diện ở 390px.
- **PO quyết:** chọn A hay B, và vị trí chuẩn của Copilot trên di động.

### T3-3. `FeatureGuidanceCard` dùng `<button>` thô (K1, DS-15)
- **Hiện trạng:** `src/components/templates/shared/feature-guidance-card.tsx` dòng 135 (dải mở rộng toàn chiều rộng) và dòng 176 (nút "Thu gọn", chỉ `px-2 py-0.5` ≈ 20px cao) — lint R18, vùng bấm nhỏ.
- **Đề xuất:** thay bằng `Button` (`variant="ghost"`, `size="xs"` có sẵn `min-h-[44px]` khi cảm ứng), giữ nguyên chữ, icon và màu `guidance-*`. Thêm test render xác nhận nút có tên và giữ lớp màu.
- **Rủi ro:** thẻ này được dùng trong 44 tệp; phải chụp lại các màn đại diện để chắc không lệch bố cục.
- **PO quyết:** đồng ý đổi cấu trúc nút (không đổi nhận diện thị giác).

### T3-4. Đầu trang Thẻ chào (K2, DS-14, R18, R20)
- **Hiện trạng:** `src/app/(app)/the-chao/page.tsx`: `<h1>` thô (dòng 177), bộ chọn chế độ dùng `role="tablist"`/`role="tab"` nhưng **không có `tabpanel`** (trái OPERATING §3: chỉ dùng `role=tab` khi có tabpanel), 2 `<button>` thô (dòng 192, 209). Nút làm mới/xuất Excel chỉ có icon, đã có `aria-label` và `title`.
- **Đề xuất:** (a) đổi bộ chọn chế độ sang nhóm nút `aria-pressed`; (b) dùng `Button` cho nút làm mới; (c) giữ `<h1>` kèm `InfoTip` như hiện nay và xin miễn trừ R20 có lý do (theo tiền lệ catalog công khai) hoặc chuyển sang `PageHeader` nếu PO đồng ý; (d) không đổi 5 tab chính (PO 06/10/2026).
- **Rủi ro:** màn có luồng 9 bước, Screen Contract riêng; cập nhật hợp đồng trong cùng commit.
- **PO quyết:** đồng ý (a)–(c); chọn miễn trừ hay `PageHeader` cho (c).

### T3-5. Trang chủ công cụ của Điều hành (DS-04, DS-13)
- **Hiện trạng:** `src/components/dashboard/toolkit-home.tsx:37-40` dùng emoji ✅🔨🏗️📋 và trạng thái lộ trình nội bộ ("Hoàn thiện / Đang làm / Nền tảng sẵn / Sẽ làm") làm bộ lọc cho chủ cửa hàng; trùng ở `modules/toolkit/domain/toolkit-catalog.ts:489-492` (có cả `emoji` trong miền) và `lib/i18n/locales/vi/toolkit.ts:22-25`. `toolkit-catalog.ts` dài 500 dòng, đã vượt K11, **không được làm dài thêm**.
- **Đề xuất:** (a) thay emoji bằng `AppIcon`/`IconTile` (OPERATING §6.11); (b) chỉ hiện bộ lọc trạng thái lộ trình cho vai nền tảng, ẩn với cửa hàng; (c) nhãn thẻ theo việc của người dùng thay cho "Mục tiêu 1…6".
- **PO quyết:** thông điệp trang chủ (b), (c) là quyết định nội dung/thương mại; (a) chỉ là thay icon.

### T3-6. Tên model AI ở Chính sách AI (DS-16)
- **Hiện trạng:** màn `/cai-dat-ai` (khoá ở production) liệt kê "Claude Opus 5, Gemini 2.5 Pro…" trong ô chọn. `src/modules/creative-production/domain/provider-catalog.ts` đã có cả `label` (tên model) và `displayName` (mô tả tiếng Việt, ví dụ "Văn phong tự nhiên…").
- **Đề xuất (chọn một):** A. hiện `displayName`, giữ tên model trong `InfoTip`; B. giữ nguyên coi là ngoại lệ cho cấu hình quản trị.
- **PO quyết:** A hay B (OPERATING §2: "không tên model AI trên màn hình").

## Thứ tự đề xuất sau khi PO duyệt
1. T3-1 (một dòng, không rủi ro) → 2. T3-3 → 3. T3-4 → 4. T3-5(a) → 5. T3-2 → 6. T3-5(b,c) và T3-6 theo quyết định nội dung.
Mỗi mục: một commit, test, chụp lại màn ảnh hưởng ở 390 và 1280px, chạy `lint:ux -- --check`, `check:screen-contracts`, `check:template-ssot`.

## Việc không khoá còn tồn đọng (có thể làm ngay, ngoài Đợt 3)
Thứ tự tiêu đề sai ở 13 màn; banner trùng ở 3 trang khách; tương phản ở Kết nối nội bộ (`bg-warning-subtle`), Thư viện màn hình (chip trắng mờ) và catalog `/c/[slug]` (chữ `#78716C`); 11 thanh trượt chờ quyết định `Slider`; nút chữ cao 15–20px.
