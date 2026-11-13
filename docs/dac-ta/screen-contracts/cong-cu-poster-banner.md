---
id: SCR-STORE-cong-cu-poster-banner
tier: STORE
module: ad-banner-poster
route: /cong-cu/poster-banner
archetype: E
snapshots:
  - 390x844
  - 1280x800
acceptance:
  - Tiêu đề cấp 1 qua PageHeader/ToolHero (ADR-011 D-UI-05)
  - Tối đa 1 nút chính (primary) theo K2
  - Đủ trạng thái tải, rỗng, lỗi, không quyền
  - Không vi phạm axe-core critical/serious ở 390px và 1280px
---

# Screen Contract — Tạo poster và banner quảng cáo (/cong-cu/poster-banner)

**Tuyến:** `/cong-cu/poster-banner` · **Tệp chính:** `src/components/ad-banner-poster/poster-banner-client.tsx` · **Cập nhật:** 01/11/2026 · **Thẻ:** PR-1 (Marketing & Sales Center)

## 1. Vai và mục đích
- Vai chính (03b): `dieu_hanh`, `marketing`, `sale` · Phạm vi: organization · Mật độ: HIGH
- Việc chính: Tạo bộ ấn phẩm quảng cáo nhiều kích thước (1:1, 4:5, 9:16, 16:9, A4) từ một nội dung theo các dịp kinh doanh, lưu vào Kho dữ liệu v2 hoặc tải trọn bộ.
- Câu hỏi chính: "Làm thế nào để tạo nhanh trọn bộ poster và banner quảng cáo đồng bộ thương hiệu cho dịp khuyến mãi hiện tại và lưu vào Kho dữ liệu?"
- Archetype: C Soạn thảo / Studio

## 2. Hiện trạng (audit 01/11/2026)
- API:
  - `POST /api/v1/ad-banner-poster/copy` (quyền G2): Sinh nội dung tự động theo dịp và ưu đãi tiệm.
  - `POST /api/v1/ad-banner-poster/save` (quyền G2): Lưu ảnh thiết kế đã dựng vào Kho dữ liệu (`kind=MARKETING`, `approval_state=PENDING`, `metadata.asset_type_code="8"` hoặc `"9"`).
- Thành phần:
  - `TabActionHeader`: Bộ chuyển đổi kích thước (ALL, 1:1, 4:5, 9:16, 16:9, A4), các nút hành động "Lưu vào kho", "Tải trọn bộ (5 kích thước)".
  - Cột trái: Bộ chọn phong cách (PresetStyleSelector), biểu mẫu nội dung & thương hiệu (BannerFormPanel).
  - Cột phải: Lưới hiển thị các khung tỉ lệ chuẩn sàn (MultiSizeGrid), xem chi tiết (SinglePreviewModal), kho mẫu (TemplateGalleryModal).
- Tách hook `usePosterActions` (`use-poster-actions.ts`) để tuân thủ quy tắc SRP (≤ 350 dòng/file).
- axe 0 lỗi critical/serious ở 390px (`tests/e2e/ux/a11y-done-tools.spec.ts`).

## 3. Thứ bậc thông tin
| Lớp | Nội dung | Vị trí hiển thị |
|---|---|---|
| L0 Thiết yếu | Khung xem trước bản thiết kế banner theo tỉ lệ đang chọn | Khu vực chính cột phải |
| L1 Hành động | Nút "Lưu vào kho", "Tải trọn bộ", "Kho mẫu thiết kế", "Tạo tự động" | TabActionHeader và form điều khiển |
| L2 Ngữ cảnh | Thông tin thương hiệu tiệm (tên, hotline, địa chỉ, ưu đãi áp dụng) | Form cấu hình cột trái |
| L3 Chi tiết | Tuỳ chỉnh headline, subhead, callout ưu đãi, hạn áp dụng | Form con trong BannerFormPanel |
| L4 Nâng cao | Đổi động cơ sinh (Mẫu dàn trang vs AI Provider) | Tuỳ chọn trong phần tạo tự động |

## 4. Hành động
- Chính (2):
  1. "Lưu vào kho" (`handleSaveToLibrary`): Render khung xem trước thành ảnh PNG chuẩn, đẩy lên server qua API `/api/v1/ad-banner-poster/save`, tự động gắn mã `asset_type_code` ("8" hoặc "9") và đưa vào Kho dữ liệu v2 ở trạng thái Chờ duyệt.
  2. "Tải trọn bộ (5 kích thước)" (`handleDownloadAll`): Tải lần lượt 5 kích thước tiêu chuẩn về máy tính.
- Phụ:
  - Xem phóng to từng kích thước (`SinglePreviewModal`).
  - Chọn mẫu từ thư viện (`TemplateGalleryModal`).
  - Đặt lại ban đầu / Sao chép liên kết chia sẻ.

## 5. Content budget
- Nút nổi bật: "Lưu vào kho" (Secondary/Featured), "Tải trọn bộ" (Primary).
- Nhãn thông điệp poster: Ngắn gọn, súc tích (≤ 15 từ cho tiêu đề).
- Thông tin liên hệ: Đọc trực tiếp từ hồ sơ tiệm (Tenant Profile), không chèn thông tin giả định.

## 6. Trạng thái
- Tải: Khung xem trước hiển thị placeholder hoặc skeleton mờ trong khi AI tạo copy/bố cục.
- Đang lưu / Đang xuất: Nút hành động chuyển trạng thái "Đang lưu..." hoặc "Đang xuất 5 file...", vô hiệu hoá để chống click đúp.
- Lỗi: Thông báo alert rõ ràng nếu xuất ảnh hoặc lưu vào kho thất bại.
- Thành công: Thông báo "Đã lưu vào Kho dữ liệu thành công với trạng thái Chờ duyệt!".

## 7. Responsive
- Mobile (<768px): Cột form và cột preview xếp chồng dọc; tab tỉ lệ cuộn ngang; xem trước ưu tiên tỉ lệ 1:1.
- Tablet/Desktop (>=1024px): Bố cục chia cột 5:7 tối ưu thao tác đồng thời giữa sửa nội dung và quan sát xem trước.

## 8. Trợ năng (A11y)
- Toàn bộ nút có nhãn rõ ràng hoặc `aria-label`.
- Bàn phím điều hướng được qua tất cả các trường nhập liệu và nút bấm.
- `focus-visible` đúng token chuẩn `outline-primary`.

## 9. Dữ liệu và quyền
- Quyền truy cập: Yêu cầu quyền `G2` (sáng tạo ấn phẩm marketing).
- Bảo đảm cách ly tenant: Dữ liệu tải lên được ký số qua `StorageProvider` theo cấu trúc `org/<org_id>/...`, không rò rỉ dữ liệu ngoài tổ chức.
