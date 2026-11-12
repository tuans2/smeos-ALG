# Bản đồ mã — Tạo Landing Page & Tạo Catalog Số

> **Mã tài liệu:** `DOC-05-SPEC-JOURNEY-UX-LANDING-CATALOG` · **Trạng thái:** `SUPPORTING` (PO chọn 08/11/2026)
> **Đặc tả yêu cầu chuẩn (SSOT):** [`ALG_JOURNEY_FIRST_UX_LANDING_CATALOG_EXECUTION_SPEC_FINAL.md`](./ALG_JOURNEY_FIRST_UX_LANDING_CATALOG_EXECUTION_SPEC_FINAL.md) — hai hành trình độc lập, mỗi hành trình hai chế độ, luật xem lại/xuất bản, tiêu chí nghiệm thu. Tài liệu này **không** định nghĩa yêu cầu; khi khác nhau, đặc tả yêu cầu thắng.
> **Vai trò:** chỉ ra mỗi yêu cầu nằm ở tệp mã nào. Đối chiếu mã ngày 08/11/2026 (`main` @ `0abfe37`). Số dòng đổi theo thời gian — đo lại bằng `wc -l` trước khi trích.

---

## 1. Hai chức năng tách biệt

Landing Page và Catalog là **hai tuyến, hai màn hình, hai bộ điều phối riêng**; mỗi bên tự có màn chọn chế độ "AI làm cho tôi" / "Tôi muốn tự chọn từng bước" (đặc tả yêu cầu §1, §4.1, §5 J1).

| | Tạo Landing Page | Tạo Catalog Số |
|---|---|---|
| Tuyến | `/landing-page` | `/catalog` |
| Trang | `src/app/(app)/landing-page/page.tsx` | `src/app/(app)/catalog/page.tsx` |
| Khung màn | `src/components/landing-page/landing-page-studio-client.tsx` (+ `landing-type-selector.tsx` chọn mục đích trang) | — (trang gọi thẳng bộ điều phối) |
| Bộ điều phối hành trình | `src/components/catalog/landing-campaign-tab.tsx` | `src/components/catalog/catalog-management-tab.tsx` |
| Màn chọn chế độ | `landing-journey-entry.tsx` | `catalog-journey-entry.tsx` |
| AI soạn nội dung | `POST /api/v1/content-engine/landing-generate` | `POST /api/v1/content-engine/catalog-generate` |
| Xuất bản link công khai | `POST /api/v1/catalog-links` (dùng chung) | `POST /api/v1/catalog-links` (dùng chung) |
| Screen Contract | `docs/dac-ta/screen-contracts/landing-page.md` | `docs/dac-ta/screen-contracts/catalog.md` |

Tệp thành phần nằm trong `src/components/catalog/` trừ khi ghi khác.

## 2. Hành trình Landing Page

| Phần của đặc tả yêu cầu | Tệp |
|---|---|
| Chọn chế độ (J1) | `landing-journey-entry.tsx`; đổi chế độ giữa chừng: `dual-mode-header.tsx` |
| Chế độ AI — nhập dữ liệu thô (J2) | `smart-input-dropzone.tsx` (+ `smart-input-file-uploader.tsx`, `smart-input-store-picker.tsx`, `smart-input-style-selector.tsx`) |
| Chế độ AI — đang xử lý | `journey-processing-state.tsx` |
| Chế độ từng bước — thanh bước | `landing-step-indicator.tsx`, điều hướng `landing-wizard-nav.tsx` |
| Bước dịp, phong cách, chọn hoa | `landing-step-setup.tsx` (+ `campaign-occasion-style-picker.tsx`, `campaign-product-picker.tsx`) |
| Bước nội dung, media, bật/tắt khối | `landing-step-content-settings.tsx` (+ `campaign-media-settings.tsx`, `campaign-section-toggles.tsx`) |
| Xem trước (J6 — xem lại trước khi xuất bản) | `landing-step-preview-pane.tsx`, `landing-campaign-preview.tsx` |
| Xuất bản có hỏi xác nhận | `landing-publish-payload.ts`; hộp xác nhận `use-confirm-publish.tsx` (gọi từ `landing-wizard-nav.tsx`) |
| Việc tiếp theo (J7) | `landing-next-actions.tsx` |

## 3. Hành trình Catalog Số

| Phần của đặc tả yêu cầu | Tệp |
|---|---|
| Chọn chế độ (J1) | `catalog-journey-entry.tsx`; đổi chế độ: `dual-mode-header.tsx` |
| Chế độ AI — nhập dữ liệu thô, xử lý | `smart-input-dropzone.tsx`, `journey-processing-state.tsx` |
| Chế độ AI — sinh và xuất bản | `use-autonomous-catalog-generator.ts`; chọn kiểu trình bày `catalog-auto-style-picker.tsx` |
| Chế độ từng bước | `catalog-wizard-flow.tsx` → `catalog-wizard-step1-products.tsx`, `catalog-wizard-step3-intro.tsx`, `catalog-wizard-step4-success.tsx` |
| Xuất bản có hỏi xác nhận | `use-confirm-publish.tsx` |
| Việc tiếp theo (J7) | `catalog-wizard-step4-success.tsx` |
| Quản lý link đã tạo | `catalog-expert-manager.tsx`, `catalog-link-widgets.tsx` |

## 4. Phần dùng chung (capability — đặc tả yêu cầu §4.1, §26)

`dual-mode-header.tsx`, `smart-input-dropzone.tsx`, `journey-processing-state.tsx`, `use-confirm-publish.tsx`, `@/core/media/qr-engine` và API `catalog-links`. Dùng chung capability, không dùng chung hành trình: không có wizard nào điều khiển cả hai.

Ràng buộc chéo duy nhất: `landing-campaign-tab.tsx` import **kiểu** `CatalogProduct` từ `catalog-management-tab.tsx` (chỉ kiểu dữ liệu, không gọi logic Catalog).

## 5. Nợ đã biết (đo 08/11/2026)

| Mục | Hiện trạng |
|---|---|
| Tệp vượt 350 dòng | `catalog-wizard-flow.tsx` 398, `landing-campaign-tab.tsx` 396 — không được dài thêm; tách khi viết lại |
| Định nghĩa hoàn thành (đặc tả yêu cầu §35, 19 mục) | Chưa đối chiếu từng mục với mã |
| Vùng khoá | Không còn: PO gỡ đóng băng Catalog 09/11/2026 (D-66); sửa vẫn theo B5 (test khoá hành vi trước khi sửa) |

## 6. Tài liệu liên quan

- Kiến trúc Journey-First gốc: `docs/kien-truc/Nâng cấp tasks/ALG_CORE_JOURNEY_FIRST_UX_ARCHITECTURE_FINAL.md`
- Kế hoạch thực thi: [`KE_HOACH_THUC_THI_JOURNEY_FIRST_UX_ARCHITECTURE.md`](../kien-truc/KE_HOACH_THUC_THI_JOURNEY_FIRST_UX_ARCHITECTURE.md)
- UX theo vai: [`03b-role-ux.md`](./03b-role-ux.md)
