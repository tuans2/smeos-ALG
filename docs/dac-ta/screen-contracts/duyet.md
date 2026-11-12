---
id: SCR-STORE-duyet
tier: STORE
module: duyet
route: /duyet
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

# Screen Contract — Hàng đợi duyệt (`/duyet`)

> **Trạng thái production (12/11/2026, audit L-03):** tuyến thuộc tiền tố khoá `/duyet` trong `LOCKED_ROUTE_PREFIXES` (`src/lib/feature-lock.ts`). `src/app/(app)/duyet/layout.tsx` bọc `FeatureLockedGuard`, nên khi `NEXT_PUBLIC_APP_ENV=production` cả URL gõ thẳng cũng hiện màn "Sắp ra mắt" (trước đây chỉ làm mờ mục sidebar). Bản giao GD1 không đặt biến này nên không bị khoá.

**Tuyến:** `/duyet` · **Tệp chính:** `src/app/(app)/duyet/page.tsx` + `approval-tab-panels.tsx` · **Cập nhật:** 26/09/2026 · **Thẻ:** T5.A5

## 1. Vai và mục đích
- **Vai chính (03b):** `store_manager`, `florist`, `content_creator`.
- **Phạm vi:** organization (duyệt các sản phẩm và dữ liệu trung gian trước khi đưa vào kho hoặc đưa ra thị trường).
- **Việc chính:** Rà soát, duyệt hoặc từ chối các kết quả phân tích ảnh, ảnh tối ưu, và nội dung bán hàng AI đang chờ xử lý.
- **Câu hỏi chính:** "Những kết quả nào đang chờ tôi duyệt hôm nay?"
- **Mật độ:** MEDIUM (Danh sách việc cần duyệt phân loại theo 3 tab chuyên biệt).

## 2. Hiện trạng (audit)
- **API gọi:**
  - `GET /api/v1/vision/analyses?limit=20` → `H3` (`vision.approve`)
  - `GET /api/v1/media/optimizations?limit=20` → `I2` (`media.approve`)
  - `GET /api/v1/product-copies?approval_state=PENDING&limit=20` → `H6` (`copy.approve`)
  - `POST /api/v1/vision/analyses/:id/approve` → `H3`
  - `POST /api/v1/vision/analyses/:id/reject` → `H3`
  - `POST /api/v1/media/optimizations/:id/approve` → `I2`
  - `POST /api/v1/product-copies/:id/approve` → `H6`
  - `POST /api/v1/product-copies/:id/reject` → `H6`
- **Các Tab:**
  - Tab 1: **Phân tích ảnh** (kết quả bóc tách cấu phần hoa).
  - Tab 2: **Ảnh tối ưu** (ảnh đã qua bộ lọc chất lượng và nâng cấp độ nét).
  - Tab 3: **Dữ liệu bán hàng** (đoạn mô tả thương mại, tiêu đề, dịp phù hợp).
- **Trạng thái:** Tải (`SkeletonBlock`), Rỗng từng tab (`EmptyState` kèm nút điều hướng tạo mới), Lỗi (`InlineError` / banner thông báo), Thông báo trợ năng (`announce()`).

## 3. Thứ bậc thông tin
| Lớp | Nội dung | Vị trí hiển thị |
|---|---|---|
| L0 Thiết yếu | Header "Hàng đợi duyệt", TabActionHeader có huy hiệu đếm số lượng chờ duyệt | Đỉnh trang |
| L1 Hành động | Cặp nút "Duyệt" (Primary) và "Không đạt" (Outline) tại mỗi dòng | Bên phải mỗi mục trong danh sách |
| L2 Chi tiết mục | Tên mục, mã định danh, nhà cung cấp, thời gian tạo, trường đã chỉnh sửa | Cột trái của mỗi dòng |
| L3 Chuyển tiếp & Xuất file | Nút "Làm mới hàng đợi" (Outline), "Tải CSV", chuyển tới Kho / Tải ảnh | Tab action header overflow & chân thẻ |

## 4. Hành động
- **Chính:** Nút "Duyệt" tại từng dòng mục.
- **Phụ:**
  - Nút "Không đạt" (`variant="outline"`) ngay cạnh nút "Duyệt".
  - Nút "Xem chi tiết" (icon con mắt) dẫn tới trang chi tiết copy.
  - Nút "Làm mới hàng đợi" (`variant="outline"`).
- **Quy tắc K2:** Nút "Làm mới hàng đợi" là nút phụ `outline`. Cặp nút duyệt/không đạt tại mỗi dòng đặt song song chuẩn 03a UX-010/011.

## 5. Quy tắc chuyển trạng thái & Trợ năng
- Khi duyệt hoặc từ chối thành công:
  - Hệ thống tự động phát loa thông báo cho screen reader thông qua `useAnnounce()`: `"Đã duyệt phân tích #..."` hoặc `"Đã duyệt dữ liệu bán hàng: ..."`.
  - Mục đã duyệt rời khỏi danh sách ngay lập tức sau khi tải lại trạng thái.
  - Khi hàng đợi rỗng: hiển thị `EmptyState` chuẩn mực có nút hành động tiếp nối ("Tải ảnh mới để phân tích", "Tới Creative Studio", "Tạo nội dung bán hàng").

## 6. Responsive
- **390px (Mobile):** Các dòng mục có chiều cao tối thiểu 44px (`min-h-11`), cặp nút bấm xếp cạnh nhau dễ chạm.
- **768px (Tablet):** Trình bày dạng danh sách thoáng đãng.
- **1280px (Desktop):** Khung nhìn hiển thị đầy đủ thông tin chi tiết, thao tác đối soát mượt mà.

## 7. QA Matrix (03a §34)
| Chiều | Kết quả | Ghi chú |
|---|---|---|
| Vai | PASS | Đạt chuẩn cho Store Manager, Florist, Content Creator |
| Việc | PASS | Duyệt hàng chờ giải phóng ách tắc |
| IA | PASS | 3 tab nghiệp vụ không chứa mã kỹ thuật |
| Mật độ | PASS | Danh sách phân luồng rõ ràng, huy hiệu đếm thật |
| Thứ bậc | PASS | Tiêu đề -> Tab -> Danh sách mục -> Tác vụ dòng |
| CTA | PASS | Duyệt (Primary) + Không đạt (Outline) cạnh nhau |
| Luồng | PASS | Xử lý từng mục, thông báo qua LiveRegion |
| Trạng thái | PASS | Đủ tải / rỗng có nút đi tiếp / lỗi / 403 cảnh báo |
| Responsive | PASS | Chuẩn xác trên cả mobile và desktop |
| Trợ năng | PASS | useAnnounce phát thông báo, touch target ≥ 44px |
| Dữ liệu | PASS | Dữ liệu thật từ 3 endpoint API |
| Quyền | PASS | Gating theo H3, I2, H6 |
| Nhất quán | PASS | Dùng 100% token Semantic, tách file SRP < 220 dòng |
