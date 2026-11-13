# K11 — Chính sách độ dài tệp nguồn

- Trạng thái: `ACTIVE` — PO duyệt 05/11/2026. Thay đích K11 cũ ("≤ 20 tệp > 350 dòng") trong `docs/plan/ui-enterprise-upgrade.md`.
- Gate: `tests/unit/architecture/file-size-ratchet.test.ts` (chạy trong `npm test`) đọc `scripts/file-size-baseline.json`.

## 1. Luật

1. Tệp nguồn mới (`src/**/*.ts`, `src/**/*.tsx`, trừ test và `src/generated`) **không vượt 350 dòng**.
2. Tệp đang vượt 350 dòng (danh sách `baseline`, đo 05/11/2026: 74 tệp) **không được dài thêm**. Sửa tệp đó mà cần thêm dòng thì tách trước.
3. Tách xong một tệp: hạ số dòng trong `baseline` hoặc xoá dòng đó khi tệp còn ≤ 350. Baseline chỉ được giảm.
4. **Miễn trừ** (`exemptions`) chỉ cho tệp `.ts` là dữ liệu/danh mục thuần (mảng hoặc bảng hằng, gần như không có logic), kèm lý do. Tách những tệp này thêm import mà không giúp đọc hiểu hơn.

## 2. Vì sao giữ luật nhưng không tách hàng loạt

- Tệp dài làm agent đọc thiếu và sửa sót (05/11/2026: tách tay `variant-workspace.tsx` 1.783 dòng làm rơi chuỗi gợi ý phí credit), diff khó đọc, dễ xung đột.
- Tệp giao diện dài thường gộp nhiều việc (giao diện + gọi API + nghiệp vụ) — đây là nơi tách có giá trị.
- Tách hàng loạt 74 tệp tốn ≈ 5–8 ngày-agent, mỗi lần tách là một rủi ro đổi hành vi, người dùng không thấy khác biệt. Ratchet làm nợ giảm dần khi có người sửa tới tệp.

## 3. Miễn trừ (11 tệp dữ liệu/danh mục)

| Tệp | Dòng | Lý do |
|---|---|---|
| `src/lib/feature-catalog.ts` | 990 | Danh mục tính năng (mảng hằng) |
| `src/modules/organization/domain/industry-roadmap.ts` | 893 | Lộ trình theo ngành (dữ liệu) |
| `src/modules/journey/domain/journey-catalog.ts` | 635 | Danh mục 14 chặng (dữ liệu) |
| `src/modules/products/domain/analysis-schema-mapper.ts` | 547 | Bảng ánh xạ trường phân tích ảnh |
| `src/modules/toolkit/domain/toolkit-catalog.ts` | 501 | Danh mục công cụ (dữ liệu) |
| `src/modules/market-intelligence/domain/market-taxonomy.ts` | 493 | Phân loại thị trường (dữ liệu) |
| `src/modules/products/domain/sales-pitch-template.ts` | 487 | Mẫu câu bán hàng (dữ liệu) |
| `src/components/products/create-product-types.ts` | 473 | Kiểu và hằng số biểu mẫu sản phẩm |
| `src/modules/coordinator/contracts/field-registry.ts` | 458 | Sổ đăng ký trường (dữ liệu) |
| `src/modules/products/domain/product-master-index.ts` | 408 | Chỉ mục sản phẩm chủ (dữ liệu) |
| `src/components/governance/governance-catalog-registry.ts` | 373 | Sổ đăng ký ma trận quản trị (dữ liệu) |

Xếp loại bằng đếm cấu trúc điều khiển (hàm, `if`, `return`, hook) trên mỗi 25 dòng; mỗi tệp đã đọc lại để xác nhận là dữ liệu.

## 4. Ưu tiên tách khi đang sửa tính năng ở đó

| Tệp | Dòng | Ghi chú |
|---|---|---|
| `src/app/(app)/tai-anh/page.tsx` | 1.949 | Tính năng tải ảnh — cần PO duyệt chặng (CLAUDE.md) |
| `src/components/upload/upload-wizard.tsx` | 1.458 | Tính năng tải ảnh — cần PO duyệt |
| `src/components/creative-studio/use-creative-studio-data.ts` | 1.004 | Hook nạp dữ liệu nhiều khu |
| `src/components/storage/account-storage-hub.tsx` | 847 | Kho lưu trữ — tách theo tab |
| `src/components/sales/sales-pitch-card.tsx` | 832 | |
| `src/components/dashboard/FeaturePicker.tsx` | 686 | |

Phần còn lại trong `baseline` (logic domain, repository, thành phần 350–650 dòng) tách khi chạm tới.

## 5. Đo lại

```bash
git ls-files 'src/**/*.ts' 'src/**/*.tsx' | grep -vE '\.test\.|__tests__|generated' | xargs wc -l | awk '$1>350 && $2!="total"' | wc -l
```
