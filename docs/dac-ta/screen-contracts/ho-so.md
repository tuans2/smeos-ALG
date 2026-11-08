---
id: SCR-STORE-ho-so
tier: STORE
module: profiles
route: /ho-so
archetype: F
snapshots:
  - 390x844
  - 1280x800
acceptance:
  - Tiêu đề cấp 1 qua PageHeader/ToolHero (ADR-011 D-UI-05)
  - Tối đa 1 nút chính (primary) theo K2
  - Đủ trạng thái tải, rỗng, lỗi, không quyền
  - Không vi phạm axe-core critical/serious ở 390px và 1280px
---

# Screen Contract — Thương hiệu: Hồ sơ cửa hàng → Bộ nhận diện → Landing page (`/ho-so`)

**Tuyến:** `/ho-so` · **Tệp chính:** `src/app/(app)/ho-so/page.tsx`, `src/components/brand-kit/*`, `src/modules/brand-kit/*` · **Cập nhật:** 08/11/2026 (PO duyệt luồng 3 bước) · **Kịch bản audit:** `scripts/ux-audit/scenarios/thuong-hieu.mjs`

## 1. Vai và mục đích
- **Vai chính (03b):** `store_manager`, `marketer`.
- **Việc chính (L0):** nhập Hồ sơ cửa hàng MỘT lần; hệ thống dựng Bộ nhận diện (logo, khẩu hiệu, bộ màu, danh thiếp, trang hồ sơ chia sẻ, ảnh bìa mạng xã hội) và Landing page chính thức (website / hồ sơ doanh nghiệp của cửa hàng).
- **Câu hỏi chính:** "Thương hiệu của cửa hàng đã đủ để chia sẻ với khách chưa, bước tiếp theo là gì?"

## 2. Cấu trúc
- `PageHeader` "Thương hiệu" · 1 `FeatureGuidanceCard` (K1) · `JourneyProgress` 3 tab.
- **Mở khoá tuần tự** (máy chủ kiểm lại — `lockedReason`): Bộ nhận diện khoá đến khi Hồ sơ đủ; Landing page khoá đến khi đã chọn Bộ nhận diện. Tab khoá có biểu tượng khoá + một dòng giải thích.
- **Bước 1 — Hồ sơ cửa hàng** (chỗ nhập liệu duy nhất): danh sách mục cần có (tên, điện thoại, địa chỉ, giới thiệu, khách mục tiêu, ảnh cửa hàng, video giới thiệu, sản phẩm chủ đạo) · `BusinessProfileForm` · khối "Hình ảnh và sản phẩm chủ đạo" (logo tuỳ chọn, ảnh, video, chọn ≤ 6 sản phẩm từ kho). Lưu cùng hồ sơ với Cài đặt.
- **Bước 2 — Bộ nhận diện:** chưa có → nút "Tạo 3 phương án" (miễn phí). Có → 3 thẻ phong cách (Sang trọng tinh tế / Tươi trẻ năng động / Mộc mạc gần gũi), mỗi thẻ xem trước đủ 6 thành phần; "Tạo thêm phương án" kèm `CostPreview` (giá từ Console); hồ sơ đổi → "Tạo lại theo hồ sơ mới (miễn phí)"; phương án cũ trong `Disclosure`. Đã chọn → tải logo SVG / ảnh bìa PNG, mở danh thiếp, thẻ link chia sẻ.
- **Bước 3 — Landing page:** tương tự, 3 phương án dùng màu + khẩu hiệu của bộ nhận diện đã chọn; "Chọn và xuất bản" qua `ConfirmDialog` (R3). Đã xuất bản → "Mở trang" `/c/:slug`; đổi phương án giữ nguyên link.

## 3. Hành động
- **Chính (1 mỗi trạng thái):** "Xác nhận hồ sơ — tạo Bộ nhận diện" (Bước 1 đủ: hệ thống tạo ngay 3 phương án rồi mở Bước 2) · "Tạo 3 phương án" (bước chưa có phương án) · "Tạo Landing page" (đã chọn bộ nhận diện: dựng ngay 3 giao diện rồi mở Bước 3).
- **Phụ:** "Chọn phương án này" / "Chọn và xuất bản" (`secondary`), "Tạo thêm phương án" (`outline`, có giá), tải tệp, liên kết Cài đặt thương hiệu, Thư viện thương hiệu.

## 4. Trạng thái
- Tải: `SkeletonBlock`. Lỗi tải: `InlineError` có "Tải lại". Lỗi thao tác (khoá bước, thiếu credit, không quyền): khối cảnh báo `role="alert"`.
- Đang tạo / đang áp dụng: dòng `role="status"`, khoá các nút.
- AI không chạy được khi "Tạo thêm": phương án theo mẫu + thông báo đã hoàn credit.

## 5. Chỉ hai nơi có chức năng này (PO 08/11/2026)
- Hành trình chỉ có ở `/ho-so` (dạng tab) và nhóm "Hồ sơ & Thương hiệu" trên `/cong-cu` (dạng ô). Hai giao diện dùng chung
  `src/components/brand-kit/journey/*` (hook `useBrandJourney`, nội dung chữ, khối "Tạo lại theo hồ sơ mới") — không lặp code.
- Lối vào khác gắn PHÁT_TRIỂN_SAU, chỉ môi trường phát triển thấy (`DEFERRED_SURFACES`): Cài đặt → tab Thương hiệu, lối tắt
  Thư viện thương hiệu / Danh thiếp, thẻ "Trang chính thức" trên `/landing-page`. Danh thiếp mở từ ô Danh thiếp.
- Trang chính thức đọc sống giờ mở cửa, liên hệ, ảnh, video, sản phẩm chủ đạo từ Hồ sơ.

## 6. Quyền
- Xem `F1`; nhập hồ sơ, sinh/chọn Bộ nhận diện `F2`; sinh Landing `J7`; xuất bản Landing `J1`.

## 7. Kiểm chứng (08/11/2026)
- Audit `thuong-hieu`: 19 trạng thái × 390/1280px, axe sạch.
- Test: `tests/tenant/brand-kit.test.ts`, `src/modules/brand-kit/**/*.test.ts`.
