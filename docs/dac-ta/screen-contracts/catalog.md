---
id: SCR-STORE-catalog
tier: STORE
module: catalog-studio
route: /catalog
archetype: B
snapshots:
  - 390x844
  - 1280x800
acceptance:
  - Tiêu đề cấp 1 qua PageHeader/ToolHero (ADR-011 D-UI-05)
  - Tối đa 1 nút chính (primary) theo K2
  - Đủ trạng thái tải, rỗng, lỗi, không quyền
  - Không vi phạm axe-core critical/serious ở 390px và 1280px
---

# Screen Contract — Catalog & Website (`/catalog`)

**Tuyến:** `/catalog` · **Tệp chính:** `src/app/(app)/catalog/page.tsx`, `src/components/catalog/*` · **Cập nhật:** 27/09/2026 · **Thẻ:** T5.B5

## 1. Vai và mục đích
- **Vai chính (03b):** `store_manager`, `sales`, `marketer`.
- **Phạm vi:** organization (quản lý danh mục hoa công khai, xuất bản catalog số và trang landing page tiếp thị).
- **Việc chính:** Quản lý mẫu hoa hoạt động, tạo link catalog chia sẻ cho khách hàng qua QR Code/Zalo/Facebook, và phát hành landing page chiến dịch.
- **Câu hỏi chính:** "Catalog nào cần cập nhật hoặc chia sẻ cho khách hôm nay?"
- **Mật độ:** MEDIUM (Bộ lọc tìm kiếm, lưới chọn sản phẩm, danh sách link đã xuất bản).

## 2. Hiện trạng (audit)
- **API:**
  - `GET /api/v1/products` → `E1` (`catalog.read`)
  - `GET /api/v1/vision/analyses?approval_state=APPROVED` → `H3` (`vision.approve`)
  - `GET /api/v1/catalog-links?include_revoked=true` → `E1` (`catalog.read`)
  - `POST /api/v1/catalog-links` → `E2` (`catalog.write`)
  - `POST /api/v1/catalog-links/:slug/revoke` → `E2` (`catalog.write`)
- **Khối:** 3 khối chính (Hướng dẫn `CatalogGuidanceCard`, Bộ chọn sản phẩm & tạo link, Danh sách link đã xuất bản).
- **Nút primary:** 1 nút chính "Xuất bản Catalog mới".
- **FeatureGuidanceCard:** 1 khối duy nhất theo chuẩn K1 (`CatalogGuidanceCard`).
- **Modal:** `CreateCatalogModal` (dùng `Dialog`), `ShareCatalogModal` (dùng `Dialog`), `ProductDetailModal` (dùng `Dialog`).
- **Trạng thái có sẵn:** Tải (`SkeletonBlock`), Rỗng (thông báo khi chưa có link), Lỗi (banner cảnh báo).

## 3. Thứ bậc thông tin
| Lớp | Nội dung | Vị trí hiển thị |
|---|---|---|
| L0 Thiết yếu | Header trang "Catalog & Website", TabActionHeader chuyển đổi tab | Đỉnh trang |
| L1 Hành động | Thanh tìm kiếm + Bộ lọc dịp tặng / giá + Nút "Xuất bản Catalog mới" | Trên lưới sản phẩm |
| L2 Lưới sản phẩm | Thẻ sản phẩm kèm checkbox, mã hoa, danh mục và giá VNĐ | Giữa trang |
| L3 Danh sách xuất bản | Các link catalog đang mở/đã thu hồi kèm nút Xem trước, Chia sẻ MXH, Copy link, Tải QR, Thu hồi | Dưới lưới sản phẩm |

## 4. Hành động
- **Chính (1):** "Xuất bản Catalog mới ({N} SP)" (`variant="primary"`).
- **Phụ (≤ 2):**
  - "Chọn tất cả" / "Bỏ chọn tất cả" (`variant="ghost"`).
  - "Chia sẻ MXH" (`variant="ghost"`).
- **Menu/Tác vụ dòng:**
  - "Xem trước", "Copy link", "Tải QR", "Thu hồi".

## 5. Content budget
- Nút nổi: 1/3 (Xuất bản Catalog mới).
- Khối chính: 3/5.
- Nhóm thông tin: 2 tab nghiệp vụ rõ ràng ("Catalog số trực tuyến" và "Landing page chiến dịch").

## 6. Trạng thái
- Tải: `<SkeletonBlock lines={4} label="Đang tải danh mục sản phẩm" />`.
- Rỗng: Thông báo hướng dẫn chọn mẫu hoa và tạo catalog đầu tiên.
- Lỗi: Banner màu cảnh báo phía trên thanh tab.

## 7. Responsive
- **390px (Mobile):** Lưới sản phẩm co về 1 cột, các thẻ chọn có `min-h-11`, tương tác thuận tiện.
- **768px (Tablet):** Lưới sản phẩm 2 cột, thanh lọc chia 2 hàng.
- **1280px (Desktop):** Lưới sản phẩm 3 cột, hiển thị trực quan thông tin mã hoa và đơn giá.

## 8. Trợ năng
- Toàn bộ card chọn sản phẩm sử dụng `<button type="button" aria-pressed={isSelected}>` với focus-visible chuẩn (T1.7).
- Toàn bộ modal sử dụng `Dialog` từ `@/components/ui/dialog` (Focus trap, phím Escape, role="dialog").
- Giá tiền định dạng chuẩn `vi-VN` (VNĐ).

## 9. QA Matrix (03a §34)
| Chiều | Kết quả | Ghi chú |
|---|---|---|
| Vai | PASS | Đạt chuẩn cho Store Manager, Sales, Marketer |
| Việc | PASS | Xuất bản catalog số, lấy link và mã QR chia sẻ |
| IA | PASS | 2 tab nghiệp vụ tách bạch, không lẫn mã kỹ thuật |
| Mật độ | PASS | 1 màn hình có cấu trúc thẻ mạch lạc |
| Thứ bậc | PASS | Tiêu đề -> Hướng dẫn K1 -> Tab -> Lọc -> Danh sách |
| CTA | PASS | Tối đa 1 nút chính K2 ("Xuất bản Catalog mới") |
| Luồng | PASS | Chọn hoa -> Xuất bản -> Nhận link/QR -> Chia sẻ |
| Trạng thái | PASS | Skeleton tải thật, rỗng có gợi ý, lỗi có banner |
| Responsive | PASS | Chuẩn 390px mobile đến desktop |
| Trợ năng | PASS | Đạt chuẩn T1.7 button aria-pressed, Dialog Base-UI |
| Dữ liệu | PASS | Kết nối API sản phẩm và catalog links thật |
| Quyền | PASS | Gating theo E1, E2, H3 |
| Nhất quán | PASS | Dùng token semantic, tuân thủ K1 và K2 |

## 10. Kết quả
- Toàn bộ modal đã chuyển sang `Dialog`.
- `Card onClick` đã tuân thủ chuẩn T1.7.
- Không còn bất kỳ cảnh báo unused variable nào.

## 15. Progressive disclosure & rủi ro (03c) — 29/10/2026 (công cụ #09 chuyển Hoàn thiện)
Đã sửa: tạo catalog tự động **bịa link `/c/catalog`** khi xuất bản lỗi (slug mặc định `"catalog"`) → nay báo `TaskStatus` thất bại + "Làm lại", không có link; bỏ các khoảng chờ giả lập 600 ms giữa các bước; AI không viết được lời giới thiệu thì báo đang dùng lời mẫu; bỏ `confirm()` khi phân tích lại ảnh (chi phí đã ghi trên nút, R2); tiêu đề trang thành `<h1>`. Rủi ro: xuất bản link R3. axe 390px: 0 lỗi. Test: `tests/unit/ux/no-fake-progress.test.ts`.

### Trang khách xem `/c/[slug]` (Landing 08 / Catalog 09) — nâng cấp thiết kế 29/10/2026
- **Hero tràn màn hình** (`src/components/catalog/public/public-hero.tsx`): nền là ảnh thật (ảnh hero tiệm tải lên, không có thì ảnh sản phẩm đầu tiên); không có ảnh thật → khối hero cũ theo phong cách catalog, không dùng ảnh minh hoạ. Tiêu đề/dòng phụ lấy từ nội dung AI đã duyệt, không có thì tên/mô tả catalog. Nút chính "Xem bộ sưu tập" cuộn tới vùng sản phẩm. Màu theo token phong cách catalog (S01–S12), không dùng màu giao diện quản trị.
- **Thanh hành động cố định đáy** (chỉ di động, `public-sticky-actions.tsx`): "Nhắn Zalo đặt hoa" + "Gọi", chỉ hiện khi Hồ sơ tiệm có số điện thoại.
- **Chữ tiêu đề** các phong cách serif dùng `font-display` (Fraunces, PO duyệt thêm font 29/10/2026).
- **Màu đồng bộ:** vùng trang khách ghi đè biến màu ngữ nghĩa bằng token phong cách catalog (`public-theme-vars.ts`) — các khối Câu chuyện/Ưu điểm/Quy trình/Hỏi đáp/Form theo phong cách tiệm. Màu nhấn/nút các phong cách được làm đậm (cùng tông) để đạt tương phản: S03 `#92400E`, S04 `#9A3412`, S05 `#3F6212`, S07 `#1D4ED8`, S08 `#4F46E5`, S09 `#854D0E`, S10 `#BE123C`, S12 `#115E59`; chữ phụ S03 `#6B655D`, S05 `#5F584F` (PO duyệt 30/10/2026). Ngưỡng: chữ ≥ 4,5:1, màu nhấn trên nền trang ≥ 5,5:1 (vì còn đặt trên nền pha 10%). Chữ trên nút dùng `ctaText` / `text-primary-foreground`, không viết cứng màu trắng.
- **Lưới sản phẩm:** 2 cột trên di động, 3 cột desktop, ảnh dọc 4:5; bỏ nhãn "Giá niêm yết", nút đặt chỉ còn biểu tượng trên di động (có nhãn truy cập).
- Kiểm: 390/1280px không cuộn ngang; axe 390px không lỗi critical/serious thuộc trang.

### Việt hoá & PDF/poster (30/10/2026)
- Tên 5 mẫu, 12 phong cách, 8 bố cục hiển thị bằng tiếng Việt (vd. "Sách ảnh cao cấp", "Sang trọng tĩnh lặng"); bỏ mã `S01…` trên màn chọn; bỏ "Universal Catalog Studio 2026", "(Live Preview)", "(Hero Banner)".
- PDF (`catalog-page-renderer.tsx`): màu ngữ nghĩa theo phong cách (`publicThemeVars`), tiêu đề dùng chữ của phong cách; bỏ "2026 Collection", "ALG Universal Catalog Studio", câu sáo và lời hứa mặc định ("hóa đơn VAT", "giao đúng hẹn", "độc bản") — chỉ in khi tiệm tự nhập.
- Poster 1080×1080: bỏ "ALG Catalog"; thanh trên dùng màu nút + `ctaText` (đạt tương phản ở mọi phong cách); chữ tiêu đề Fraunces/Be Vietnam Pro (font đã nạp).
- Trang PDF sinh 7 loại theo mẫu chọn: bìa, câu chuyện, mẫu nổi bật, phân chương theo nhóm (khi ≥ 2 nhóm), lưới mẫu, chi tiết mẫu (tối đa 4), trang kết (`catalog-studio/domain/page-planner.ts`). Trang combo (L07) chưa dựng — chưa có dữ liệu combo.

### Đánh giá khách (30/10/2026)
- Mục mở rộng "Đánh giá khách hiện trên trang" ở màn quản lý catalog và màn tạo landing (`components/catalog/reviews/`): thêm, sửa, ẩn/hiện, xoá (hộp xác nhận R3). Quyền `J1`.
- Trang khách hiện tối đa 6 đánh giá đang bật, điểm trung bình và số lượng tính từ dữ liệu thật; không có đánh giá thì mục tự ẩn. Không gắn nhãn "Đã mua hàng" (chủ tiệm tự nhập, không đối chiếu được đơn).

### Nút Đặt hàng / Liên hệ trên trang khách (04/11/2026, theo Đơn hàng đa nguồn §3.2)
- Một nguồn sự thật: `entryActions` máy chủ giải sẵn (`LANDING` khi có cấu hình chiến dịch, còn lại `CATALOG`); thiếu thì mặc định hệ thống (`components/catalog/public/public-entry.ts`).
- **Bật Đặt hàng:** nút trên thẻ sản phẩm là "Đặt hàng" → mở thẳng form đặt hàng trong chi tiết mẫu; thanh đáy di động là "Chọn mẫu để đặt hàng" (cuộn tới bộ sưu tập), Zalo/Gọi thành nút phụ.
- **Tắt Liên hệ:** ẩn Zalo/Gọi ở thanh đáy, thẻ sản phẩm, header, chi tiết mẫu và khối để lại số. Chỉ bật Liên hệ: như trước (Nhắn Zalo đặt hoa + Gọi).
- Bản xem trước landing đọc cài đặt nguồn Landing (`GET /orders/entry-actions`, cần `R1`); không đọc được thì xem theo mặc định và ghi chú rõ dưới khung.
- Chi tiết mẫu bỏ các cam kết viết cứng ("3–5 ngày", "tặng thiệp & banner", "chụp ảnh duyệt", "đã gồm thuế & thiệp") — chưa phải cam kết tiệm khai.

### Tên "Bộ sưu tập chung" (09/11/2026, PO)
Tiêu đề trang `/catalog` và mục menu đổi thành **Bộ sưu tập chung**; dấu "?" cạnh tiêu đề nói mục đích: một link dùng chung cho nhiều khách (fanpage, website, mã QR), khách xem rồi đặt hàng hoặc để lại liên hệ. Nguồn chữ: `src/modules/toolkit/domain/collection-names.ts`. Đường dẫn `/catalog`, `/c/[slug]` giữ nguyên.
