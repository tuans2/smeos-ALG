# Nhóm 5 — Thẻ Chào & trang khách hàng (15 chức năng)

Phân hệ `gc/` (`src/modules/greeting-card/`). Màn quản lý `/the-chao` (chế độ **Gửi nhanh** — `src/components/greeting-card/journey/`,
và **Quản lý** với các tab Bộ sưu tập, Theo dõi đơn, Bán hàng, Điều hành, Điều phối). Trang khách công khai: `/g/[id]` (bộ sưu tập),
`/bst/[orgSlug]/[catalogCode]` (URL thân thiện), `/b/[sendCode]` (link riêng một khách), `/s/[code]` (link chia sẻ gắn nhân viên).
Trang công khai chạy quyền hệ thống ở tầng CSDL và tự lọc theo tổ chức của mã; khi chạy trên tên miền riêng, `src/proxy.ts` chỉ mở dữ
liệu của tổ chức sở hữu tên miền (10.8).

Quyền Thẻ Chào khai tập trung ở `gc/domain/greeting-card-capabilities.ts` (`GREETING_CARD_CAPABILITY`).

---

### 5.1 Bộ sưu tập theo chủ đề / dịp

- **Hành vi:** bộ sưu tập loại Tiêu chuẩn (dùng chung) hoặc Riêng theo khách; mã nhận dạng, mô tả nội bộ, danh sách mẫu; ẩn/khôi phục.
- **Mã chính:** `api/greeting-card/catalogs`, `src/components/greeting-card/catalog/` (`catalog-list-tab.tsx`, `catalog-create-modal.tsx`,
  `catalog-detail-panel.tsx`, `catalog-product-picker.tsx`).
- **Dữ liệu:** `greeting_catalogs`, quan hệ mẫu–bộ sưu tập.
- **Test:** `tt/greeting-card.test.ts`, `tt/greeting-catalog-products-events.test.ts`.

### 5.2 Link rút gọn gắn mã nhân viên bán

- **Hành vi:** "Sao chép link mang tên bạn" tạo `/s/<code>` gắn người sao chép và kênh; đơn từ link tính cho người đó.
- **Mã chính:** `gc/use-cases/share-links.ts`, `gc/infra/share-link-repository.ts`, `gc/domain/sales-funnel.ts`.
- **Dữ liệu:** `greeting_share_links`, `greeting_sessions.send_code` (duy nhất toàn hệ thống).
- **Test:** `tt/greeting-card-share-links.test.ts`.

### 5.3 Thời hạn và thu hồi link

- **Hành vi:** thời hạn link gửi khách (giờ) cấu hình ở tab Thẻ Chào & quy trình; thu hồi link riêng từ bảng phiên của Sale.
- **Mã chính:** `src/components/greeting-card/admin/brochure-link-lifetime-settings.tsx`, `src/components/greeting-card/sales/sales-session-table.tsx`,
  `api/store-share-link/revoke` (link trang cửa hàng).
- **Test:** `tt/greeting-card-link-lifetime.test.ts`.

### 5.4 Mã QR và ảnh ghép 3–4 mẫu

- **Hành vi:** ảnh ghép 1–4 ô theo số mẫu có ảnh (từ 4 mẫu: lưới 2×2, nhãn "+N"); mã QR mở đúng link đang chia sẻ; dùng làm ảnh xem trước
  khi dán link và để tải về đăng mạng xã hội.
- **Mã chính:** `gc/use-cases/catalog-collage.ts`, `src/core/media/qr-engine.ts`, `src/components/greeting-card/og/catalog-collage-image.tsx`,
  `src/app/{g,b,s,bst}/**/opengraph-image.tsx`.
- **Test:** `gc/use-cases/__tests__/catalog-collage.test.ts`.

### 5.5 Công tắc ẩn/hiện giá, giảm giá, thành phần

- **Hành vi:** thành phần bật/tắt theo mẫu; giá và thông tin giảm giá bật/tắt cho cả cửa hàng. Tắt giá → phản hồi công khai không còn
  con số giá, khách thấy "Liên hệ báo giá", đơn vẫn nhận và chờ báo giá. Tắt giảm giá → không danh sách ưu đãi, báo giá và đơn không áp ưu đãi.
- **Mã chính:** `gc/domain/display-fields.ts`, `gc/domain/price-visibility.ts` (áp ở `get-public-greeting-catalog.ts`,
  `get-greeting-catalog.ts`, `brochure-session-access.ts`, `submit-public-catalog-order.ts`, `brochure-quote.ts`,
  `place-brochure-order.ts`), `api/greeting-card/display-settings/route.ts` (`R2` + `L4`),
  `src/components/greeting-card/journey/display-settings-dialog.tsx`.
- **Test:** `tests/unit/greeting-card/display-fields.test.ts`, `tt/greeting-card-storefront.test.ts`.
- **Khi nâng cấp:** mọi đường mới trả dữ liệu công khai phải đi qua `applyPriceVisibility`/`applyDiscountVisibility`.

### 5.6 Bảng bán hàng theo hành vi khách

- **Hành vi:** kanban theo bước (gửi → mở → xem → chọn → đặt → trả tiền), làm mới 30 giây; phạm vi theo quyền xem của Sale.
- **Mã chính:** `gc/domain/sales-funnel.ts`, `src/components/greeting-card/tracking/views/kanban-view.tsx`.
- **Test:** `tests/unit/greeting-card/sale-kanban.test.ts`, `tt/greeting-card-scope.test.ts`.

### 5.7 Hộp việc hôm nay

- **Hành vi:** việc cần làm theo vai (Sale, Điều hành, Điều phối), ưu tiên việc gấp; bấm "Xử lý" mở đúng tab và đúng đơn.
- **Mã chính:** `gc/domain/inbox.ts`, `src/components/greeting-card/inbox/inbox-panel.tsx`.
- **Test:** `tt/greeting-card-coordinator-rules.test.ts`, `tests/unit/greeting-card/single-store-vs-chain-workflow.test.ts`.

### 5.8 Phạm vi xem khách của Sale

- **Hành vi:** từng Sale xem khách của mình hoặc mọi khách; mặc định cho Sale mới; Điều hành, Điều phối, giao hàng, kế toán luôn thấy tất cả.
- **Mã chính:** `api/greeting-card/sale-visibility/route.ts`, `gc/use-cases/sale-visibility.ts`,
  `src/components/greeting-card/admin/brochure-visibility-settings.tsx` (tab Thẻ Chào & quy trình).
- **Test:** `tt/greeting-card-scope.test.ts`, `tt/greeting-card-sale-scope-actions.test.ts`.

### 5.9 Khách xem mẫu (vuốt, thả tim, lọc màu)

- **Hành vi:** mẫu vuốt lọc theo tông màu và khoảng giá cùng lúc; thả tim lưu mẫu thích.
- **Mã chính:** `src/components/greeting-card/customer/templates/swipe-brochure-engine.tsx`, `templates/aux/catalog-filters.ts`
  (`filterSwipeDeck`), `templates/swipe/swipe-color-filter.tsx`.
- **Test:** `tt/greeting-catalog-hearts.test.ts`, `tests/unit/greeting-card/template-catalog-filters.test.ts`, `tests/e2e/brochure-swipe.spec.ts`.

### 5.10 Đặt hàng ngay trên Thẻ Chào

- **Mã chính:** `src/components/greeting-card/customer/variant-step-picker.tsx`, `brochure-order-form.tsx`, `use-order-draft.ts`,
  `gc/use-cases/place-brochure-order.ts`.
- **Test:** `tt/greeting-card-checkout.test.ts`, `tt/greeting-card-order-policies.test.ts`.

### 5.11 "Nhắn tư vấn mẫu này"

- **Mã chính:** `gc/domain/collection-browse.ts`, `gc/use-cases/submit-product-inquiry.ts`.
- **Test:** `gc/use-cases/submit-product-inquiry.test.ts`.

### 5.12 Trang khách xem tiến độ và ảnh thành phẩm

- **Hành vi:** không trả ghi chú nội bộ/giá vốn; che thông tin khi người xem chưa xác minh là người đặt.
- **Mã chính:** `gc/use-cases/get-brochure-tracking.ts`, `src/components/greeting-card/customer/brochure-tracking-view.tsx`.
- **Test:** `tt/greeting-card-hardening.test.ts`.

### 5.13 Khách duyệt ảnh thành phẩm trong 10 phút

- **Hành vi:** đếm ngược 10 phút (đổi được theo bộ sưu tập); hết giờ coi như đồng ý.
- **Mã chính:** `gc/domain/balance-collection.ts`, `src/components/greeting-card/catalog/catalog-policies-settings.tsx`.
- **Test:** `tt/greeting-card-coordinator-rules.test.ts`, `tt/subcontract-customer-photo.test.ts`.

### 5.14 Đề xuất đổi thành phần / đổi mẫu, khách duyệt qua link

- **Hành vi:** đổi cả mẫu; hoặc đổi một thành phần phụ kèm ảnh và lý do — khách đồng ý/không trên trang theo dõi; đồng ý thì công thức
  của đơn đổi đúng dòng (giữ số lượng, vai trò, ghi thành phần cũ). Một đề xuất chờ mỗi đơn. Không gọi AI, không trừ credit.
- **Mã chính:** `gc/use-cases/substitute.ts`, `gc/domain/flower-substitute.ts`, `gc/infra/flower-substitute-repository.ts`,
  `gc/use-cases/flower-substitute.ts`, `api/greeting-card/orders/[id]/flower-substitute/route.ts` (`R3`),
  `api/public/brochure/tracking/[code]/flower-substitute-response/route.ts`,
  `src/components/greeting-card/coordinator/flower-substitute-form.tsx`, `src/components/greeting-card/customer/flower-substitute-panel.tsx`.
- **Test:** `tt/greeting-card-substitute.test.ts`, `tests/unit/greeting-card/flower-substitute.test.ts`.

### 5.15 Màn cảm ơn, mã giảm giá một lần, đặt lại

- **Hành vi:** đơn hoàn tất → phát một mã giảm dùng một lần gắn khách (khoá theo đơn, mỗi đơn một mã), chỉ người đặt đã xác minh thấy;
  cửa hàng bật/tắt và đặt % trong cài đặt hiển thị; lưu thông tin người đặt trên máy khách khi khách đồng ý; đặt thêm đơn.
- **Mã chính:** `src/components/greeting-card/customer/customer-thank-you-card.tsx`, `thank-you-voucher-box.tsx`, `saved-buyer.ts`,
  `gc/domain/thank-you-voucher.ts`, `gc/use-cases/thank-you-voucher.ts`, `src/modules/promotions/infra/thank-you-voucher-repository.ts`.
- **Test:** `tt/thank-you-voucher.test.ts`, `tests/unit/greeting-card/thank-you-voucher.test.ts`, `tt/greeting-card-reorder-photos.test.ts`.
