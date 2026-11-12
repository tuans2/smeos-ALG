# Nhóm 8 — Landing page (1 chức năng)

### 8.1 Trình dựng landing page bộ sưu tập / sự kiện

- **Hành vi:** chọn cách tạo (AI sinh nội dung từ nguyên liệu và bộ sưu tập, hoặc tự soạn), xuất bản thành trang công khai `/c/[slug]`
  có ảnh chia sẻ (SEO, Open Graph); khách đặt hàng ngay trên trang. Landing page và catalog dùng chung trang `/c`, phân biệt theo gói
  chiến dịch (`campaignConfig`).
- **Lối vào:** Công cụ → Quảng bá sản phẩm → ô Landing page → Tạo landing mới (`src/components/promotion-hub/landing-panel.tsx`, dùng
  lại `LandingCampaignTab` với hai loại trang chiến dịch `CAMPAIGN_LANDING_TYPES`); `/cong-cu` không bị khoá production.
- **Mã chính:** `src/components/catalog/landing-campaign-tab.tsx`, `api/content-engine/landing-generate`, `src/modules/landing-page/`, `src/modules/catalog-links/`,
  `src/app/c/[slug]/page.tsx`, `src/app/c/[slug]/opengraph-image.tsx`, `api/public/catalog/[slug]/order`.
- **Dữ liệu:** `catalog_links` (slug, thu hồi), cấu hình chiến dịch.
- **Quyền:** `J1` (catalog), `J7` (nội dung AI landing/catalog).
- **Test:** `tt/catalog-links.test.ts`, `tt/public-catalog-order.test.ts`, `src/modules/landing-page/domain/landing-rules.test.ts`.
- **Lưu ý:** màn `/catalog` (Bộ sưu tập chung) thuộc danh sách khoá production, nhưng lối vào landing ở Công cụ không đi qua nó; trang
  công khai `/c/[slug]` vẫn phục vụ, kể cả trên tên miền riêng (10.8).
