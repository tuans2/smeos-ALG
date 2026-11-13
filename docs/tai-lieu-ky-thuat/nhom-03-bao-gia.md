# Nhóm 3 — Báo giá (13 chức năng)

Hai luồng giá cùng tồn tại: **báo giá bán hàng** (`src/modules/sales/`, màn `/bao-gia`, link công khai `/bg/[token]`) và **báo giá
tự động trên Thẻ Chào** (`gc/domain/brochure-pricing.ts`, `gc/use-cases/brochure-quote.ts`). Quy tắc giá chung ở
`src/modules/products/domain/pricing-rules.ts`; giá vốn và giá sàn ở `src/modules/costing/`.

---

### 3.1 Quy tắc giá (thưởng / sàn / trần / hạng khách / giờ cao điểm)

- **Hành vi:** thưởng theo hạng đối tác xưởng, nhóm phụ phí, tỷ lệ giá tối ưu, hệ số Sàn/Trần theo giá vốn, chiết khấu theo hạng khách
  (Khách mới/Đồng/Bạc/Vàng/VIP, tối đa 50%), phụ phí khung giờ cao điểm. Báo giá Thẻ Chào nhận diện khách qua số điện thoại và hiện
  mỗi khoản thành dòng riêng.
- **Mã chính:** `src/modules/products/domain/pricing-rules.ts`, `customer-tier-pricing.ts`, `api/pricing-rules/route.ts`,
  `gc/use-cases/tier-and-peak-pricing.ts`; màn `/gia` (`pricing-rules-config-card.tsx`, `customer-tier-pricing-card.tsx`).
- **Quyền:** đọc `L5`, sửa `L6`.
- **Test:** `tests/unit/products/customer-tier-pricing.test.ts`, `tt/customer-tier-peak-pricing.test.ts`, `tt/products-pricing.test.ts`.
- **Lưu ý:** `/gia` thuộc danh sách khoá production (`src/lib/feature-lock.ts`).

### 3.2 Tính giá tự động (hàng + giao + phụ phí)

- **Hành vi:** báo giá Thẻ Chào trả từng khoản: tiền hàng, mã giảm, phí giao theo khu vực, ưu đãi, phụ phí lễ, phí chế tác.
- **Mã chính:** `gc/domain/brochure-pricing.ts`, `gc/use-cases/brochure-quote.ts`; khu vực và phí giao khai ở
  `src/components/greeting-card/admin/brochure-shipping-settings.tsx` (Cài đặt tiệm → tab Thẻ Chào & quy trình).
- **Dữ liệu:** `organizations.settings` (khoá cài đặt giao hàng `BROCHURE_SHIPPING_SETTINGS_KEY`).
- **Test:** `tt/greeting-card-quote.test.ts`, `tt/greeting-card-holiday.test.ts`, `tt/greeting-card-promotion-slot.test.ts`.

### 3.3 Giá vốn thực tế

- **Hành vi:** giá vốn = nguyên liệu theo công thức × đơn giá + bao bì + công thợ.
- **Mã chính:** `src/modules/costing/domain/cost-calculator.ts`, `api/costing/products/[productId]`, màn `/tinh-gia/gia-von`.
- **Test:** `src/modules/costing/domain/costing.test.ts`.

### 3.4 Cảnh báo và chặn giá dưới sàn

- **Hành vi:** giá sàn = giá vốn × hệ số Sàn. Giá thấp hơn → `BELOW_FLOOR`, trừ người có `C10` (trần cứng Điều hành). Áp ở báo giá
  đơn, báo giá bán hàng, duyệt giảm giá Thẻ Chào; máy tính giá hiện cảnh báo.
- **Mã chính:** `src/modules/costing/domain/price-floor.ts`, `src/modules/costing/use-cases/price-floor-guard.ts`,
  `src/modules/orders/use-cases/quote-order.ts`, `src/modules/sales/use-cases/create-quotation.use-case.ts`,
  `update-quotation.use-case.ts`, `gc/use-cases/discount-requests.ts`, `src/app/(app)/gia/pricing-calculator-card.tsx`.
- **Test:** `tt/below-floor.test.ts`, `src/modules/costing/domain/price-floor.test.ts`.
- **Khi nâng cấp:** mọi đường mới đặt giá cho khách phải gọi `price-floor-guard`.

### 3.5 Ưu đãi, mã giảm giá, miễn phí giao

- **Hành vi:** lô mã giảm (% hoặc số tiền, hạn dùng, số lượt), kiểm mã khi khách nhập, miễn phí giao.
- **Mã chính:** `gc/domain/brochure-pricing.ts`, `api/vouchers/batches`, `src/components/promotions/voucher-batches-client.tsx`,
  `voucher-batch-form.tsx`; màn `/uu-dai`, `/uu-dai/ma-giam-gia` (Công cụ → "Ưu đãi và giảm giá").
- **Quyền:** `Q8`.
- **Test:** `tt/vouchers-price-lists.test.ts`, `tt/greeting-card-promotion-slot.test.ts`.

### 3.6 Phí chế tác theo 6 kiểu dáng, hệ số ngày lễ, VAT

- **Hành vi:** 6 kiểu dáng với đơn giá mặc định theo cấu hình ngành; cửa hàng sửa đơn giá và hệ số ngày lễ (mặc định ×1,5). Giá niêm
  yết đã gồm phí chế tác; ngày lễ cộng phí × (hệ số − 1). Đơn lưu tách `craftFee`. VAT 8%/10%.
- **Mã chính:** `org/domain/industries/floral.ts`, `gc/domain/craft-style-fee.ts`, `gc/use-cases/brochure-quote.ts`,
  `gc/domain/order-vat.ts`; giao diện `src/components/greeting-card/admin/craft-style-fee-settings.tsx` (tab Thẻ Chào & quy trình),
  `src/components/products/product-craft-fee-card.tsx`.
- **Test:** `tt/craft-style-holiday.test.ts`, `tt/greeting-card-vat.test.ts`.

### 3.7 Đề xuất và duyệt giảm giá sâu

- **Hành vi:** Sale xin giảm trên đơn Thẻ Chào trong mức tối đa cửa hàng đặt; Điều hành duyệt → tổng tiền cập nhật, ghi nhật ký; không
  tự duyệt; dưới sàn cần `C10`.
- **Mã chính:** `gc/domain/discount-request.ts`, `gc/use-cases/discount-requests.ts`, `api/greeting-card/orders/[id]/discount-request`,
  `api/greeting-card/discount-requests/[id]/decision`, `src/components/greeting-card/inbox/discount-request-form.tsx`,
  `discount-decision.tsx`, mức tối đa `src/components/greeting-card/admin/brochure-discount-settings.tsx`.
- **Test:** `tt/greeting-card-messages.test.ts`.

### 3.8 Soạn và xem trước báo giá

- **Hành vi:** chọn mẫu, phiên bản từng dòng, phí vận chuyển, ưu đãi, hạn hiệu lực, điều khoản; xem trước. Tổng = tạm tính − ưu đãi
  + phí vận chuyển. Có luồng báo giá cho đối tác xưởng.
- **Mã chính:** `src/components/sales/quotation/customer-quote-builder.tsx`, `quote-preview-card.tsx`, `quote-line-options.tsx`,
  `partner-quote-builder.tsx`, `src/modules/sales/domain/quotation.ts`, `api/quotations/route.ts`; màn `src/app/(app)/bao-gia/page.tsx`.
- **Dữ liệu:** `quotations` (`shipping_fee`), `quotation_items` (`variant_label`) — migration `20261105090000_quotation_shipping_variant_revisions`.
- **Quyền:** `R15`.
- **Test:** `tt/quotation-revisions.test.ts`, `src/modules/sales/use-cases/quotation.test.ts`.

### 3.9 Lưu và quản lý báo giá theo mã

- **Hành vi:** mã `BG-0001` tăng dần theo tổ chức, hạn hiệu lực, gắn khách; tự hết hạn.
- **Mã chính:** `src/modules/sales/`, `src/components/sales/quotation/quotations-list-view.tsx`.
- **Test:** `src/modules/sales/use-cases/quotation.test.ts`, `tt/quotation-public-link.test.ts`.

### 3.10 Điều chỉnh báo giá, lưu vết phiên bản

- **Hành vi:** mỗi lần sửa nội dung lưu ảnh chụp bản trước (dòng, tổng, người sửa, thời điểm).
- **Mã chính:** `src/modules/sales/use-cases/update-quotation.use-case.ts`, `src/modules/sales/infra/quotation-revision-repository.ts`,
  `api/quotations/[id]/revisions`, `src/components/sales/quotation/quotation-revisions.tsx`.
- **Dữ liệu:** `quotation_revisions`.
- **Test:** `tt/quotation-revisions.test.ts`.

### 3.11 Chia sẻ báo giá qua link, PNG, PDF A6

- **Hành vi:** link công khai hiện ảnh mẫu (URL ký, chỉ tài sản của đúng tổ chức), phiên bản, thành phần, phí vận chuyển — không giá
  vốn, không ghi chú nội bộ. Tải PNG và PDF khổ A6.
- **Mã chính:** `src/app/bg/[token]/page.tsx`, `src/modules/sales/infra/quotation-repository.ts`, `quotation-mapper.ts`,
  `src/components/sales/quotation/quote-export-buttons.tsx`.
- **Test:** `tt/quotation-public-view.test.ts`, `tt/quotation-public-link.test.ts`.

### 3.12 Chuyển báo giá thành đơn

- **Hành vi:** một nút tạo đơn từ báo giá đã chốt.
- **Mã chính:** `api/quotations/[id]/convert/route.ts`, `src/modules/sales/use-cases/convert-quotation-to-order.use-case.ts`,
  nút "Tạo đơn" ở `quotations-list-view.tsx`.
- **Test:** `src/modules/sales/use-cases/quotation.test.ts`, `tt/quotation-public-link.test.ts`.

### 3.13 Báo giá tự động trên Thẻ Chào

- **Hành vi:** khách chọn mẫu, phiên bản, ngày, khu vực → báo giá tức thì kèm tiền cọc.
- **Mã chính:** `api/public/brochure/[sendCode]/quote`, `api/public/greeting-catalog/[id]/quote`, `gc/domain/brochure-pricing.ts`,
  `src/components/greeting-card/customer/order-review.tsx`.
- **Test:** `tt/greeting-card-quote.test.ts`, `tt/greeting-card-payments.test.ts`.
