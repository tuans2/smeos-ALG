# Kế hoạch triển khai — Marketing & Sales Center trên `/cong-cu`

> Trạng thái: **ĐÃ DUYỆT** (PO 01/11/2026) · Dựa trên `01_DANH_GIA_DONG_BO.md` (7 quyết định PO 01/11/2026) và `02_DANH_MUC_ASSET.md`.
> Mục tiêu người dùng: chủ cửa hàng **biết rõ mục đích từng asset** → **nhập ít, phần còn lại tự điền** từ dữ liệu có sẵn → hệ thống **tạo asset chất lượng** → **chọn nơi dùng** (Quảng bá / Bán hàng / Chăm sóc / In / Lưu).

## 1. Tổng quan phase → PR

| PR | Phase | Đổi DB | Kết quả người dùng thấy |
|---|---|---|---|
| PR-0 | Danh mục asset + `/cong-cu` 6 module + khu Vận hành | Không | Vào `/cong-cu` thấy 6 mục tiêu; trong mỗi mục thấy "Bạn muốn tạo gì?" với mục đích, nơi dùng, cần nhập gì |
| PR-1 | Mọi đầu ra vào thư viện | Không | Poster/banner lưu vào Kho dữ liệu; mỗi mục trong kho mang tên loại asset |
| PR-2 | "Dùng ở đâu?" (Asset Usage) | `asset_usages` | Từ Kho dữ liệu chọn nơi dùng → tạo link/QR có theo dõi, CTA đúng mục đích, không nhân bản file |
| PR-3 | Quảng bá: Chiến dịch + pipeline lead mở rộng | `campaigns`, cột mới, dữ liệu lead | Tạo chiến dịch gom asset + link; lead đi qua 10 trạng thái |
| PR-4 | Bán hàng: Báo giá lưu được | `quotations`, `quotation_items` | Báo giá có số, hiệu lực, gửi khách, chuyển thành đơn |
| PR-5 | Chăm sóc: nhóm khách + nhật ký tương tác + thiệp | `customer_segments`, `customer_interactions` | Chọn nhóm khách → asset chăm sóc → gửi thủ công có ghi nhận |
| PR-6 | Ấn phẩm & In | `print_renditions` | Chọn asset → khổ in → kiểm lỗi → PDF in đúng quy cách |
| PR-7 | KPI & quy thuộc | Không | Số liệu thật theo module; ẩn chỉ số chưa có dữ liệu |
| PR-B | Bộ nhận diện thương hiệu (công cụ) | phiên bản thương hiệu | **Làm sau** (PO QĐ6) — đã lập danh mục ở PR-0 |

Thứ tự bắt buộc: PR-0 → PR-1 → PR-2. PR-3…PR-6 cần PR-2; PR-7 cần PR-3, PR-4, PR-5. Mỗi PR một nhánh `feat/msc-pN-<tên>` tạo từ `main` sau khi PR trước đã merge. Không tạo/merge PR khi PO chưa cho phép.

## 2. Vùng cấm: Catalog và Thẻ chào (PO QĐ5)

**Không sửa một dòng** trong các đường dẫn sau ở mọi PR của kế hoạch này:

- Thẻ chào (đã khoá bằng `tests/unit/architecture/the-chao-freeze.test.ts`): `src/modules/greeting-card`, `src/components/greeting-card`, `src/app/(app)/the-chao`, `src/app/{b,g,bst,s,subcontract}`, `src/app/api/v1/greeting-card`, `src/app/api/v1/public/{brochure,greeting-catalog,subcontract,payments}`.
- Catalog (khoá mới ở PR-0 commit 0.1): `src/modules/catalog-links`, `src/modules/catalog-studio`, `src/components/catalog`, `src/components/templates/catalog`, `src/app/(app)/catalog`, `src/app/c`, `src/app/api/v1/catalog-links`, `src/app/api/v1/public/catalog`, `src/app/api/v1/integration/catalog-links`, `src/app/api/v1/content-engine/catalog-generate`, `src/modules/content-engine/domain/prompts/catalog`, `src/modules/orders/use-cases/place-public-catalog-order.ts`.
- Thẻ chào sản phẩm (`/tai-anh?tab=m01c`): không sửa `src/app/(app)/tai-anh/page.tsx`.
- Bảng `catalog_links`, `greeting_*`: **không thêm cột, không thêm quan hệ Prisma**.

**Cách nối mà không chạm:**
1. **Liên kết:** thẻ asset trỏ tới đường dẫn công cụ có sẵn (`/catalog`, `/the-chao`).
2. **Đọc qua Kho dữ liệu v2:** đã liệt kê `catalog`, `greeting_catalog` (`src/modules/storage/domain/library.ts`).
3. **Usage tham chiếu đa hình** (`source_type` + `source_id`, không khoá ngoại sang bảng của hai công cụ). Tổ chức của nguồn được kiểm bằng hàm đọc của thư viện.
4. **Theo dõi qua link ngắn có sẵn:** Usage tạo `short_links` (module `acquisition`) trỏ tới URL công khai. Lead từ catalog đã ghi `short_link_id` (`capture-lead.ts`) → quy thuộc bằng phép nối, không sửa luồng thu lead.

**Kiểm tra ở mọi PR (bắt buộc trong mô tả PR):**
```bash
git diff --name-only origin/main...HEAD | grep -E 'greeting-card|the-chao|catalog|/app/(b|g|bst|s|c|subcontract)/|tai-anh/page' || echo "OK: không chạm vùng cấm"
```
Kết quả phải là `OK` (riêng commit 0.1 chỉ thêm tệp test khoá, không sửa mã của hai công cụ). Cộng thêm hai test khoá phải xanh.

## 3. Kiến trúc đích (mã)

| Lớp | Vị trí | Nội dung |
|---|---|---|
| Domain danh mục asset | `src/modules/marketing-center/domain/` | `asset-type.ts` (kiểu, nơi dùng, nguồn đầu vào, công thức mức Sẵn), `asset-types/{brand,content,promotion,sales,care,print}.ts` (mỗi tệp ≤350 dòng), `cta-registry.ts` (PR-2), `usage-rules.ts` (PR-2) |
| Domain trình bày `/cong-cu` | `src/modules/toolkit/domain/` | `business-modules.ts` (6 module + gán công cụ), `store-operations.ts` (khu Vận hành), thay `growth-modules.ts` |
| Infra / use-case / API | `src/modules/marketing-center/{infra,use-cases}`, `src/app/api/v1/{asset-usages,campaigns,quotations,customer-segments,print-renditions}` | Prisma chỉ ở `infra/`; `organization_id` chỉ từ `requireTenantContext()`; khác tổ chức → 404 |
| UI | `src/components/marketing-center/*`, `src/components/dashboard/toolkit-*` | Progressive Disclosure, `ToolHero`, `AppIcon`; giữ nguyên K1 `FeatureGuidanceCard` và K2 `TabActionHeader` |

**Mã quyền mới** (dải `M` còn trống, thêm vào `src/core/rbac/capability-catalog.ts`):

| Mã | Tên | Vai mặc định | PR |
|---|---|---|---|
| M1 | `marketing.usage.read` | điều hành, điều phối, sale, marketing | PR-2 |
| M2 | `marketing.usage.manage` | điều hành, marketing | PR-2 |
| M3 | `marketing.campaign.manage` | điều hành, marketing | PR-3 |
| M4 | `crm.segment.manage` | điều hành, marketing | PR-5 |
| M5 | `print.rendition.export` | điều hành, điều phối, marketing | PR-6 |
| M6 | `brand.identity.generate` | điều hành | PR-B |
| M7 | `brand.identity.approve` (trần cứng điều hành) | điều hành | PR-B |

Báo giá dùng lại `R15 order.quote` ("Báo giá đơn hàng ngoài Thẻ chào"); đọc khách hàng dùng `Q1`. Không đổi trần của mã cũ.

## 4. Gate chung (mọi PR)

`npm run typecheck && npm run lint:ratchet` · `npm run lint:ux -- --check` (khi có `.tsx`) · `npm test` · `npm run check:docs` · `npm run test:tenant` + `npm run test:platform` (PR có dữ liệu/route/quyền — chỉ trên DB `*_test`) · `npm run build` (PR-0, khi thêm route) · `npm run test:e2e:ux` (màn mới) · `npm run ux:audit -- <kịch bản>` 390/1280px. Không có Postgres trong phiên thì ghi rõ "chưa chạy". So sánh lỗi với `main` (`git worktree add /tmp/base origin/main`). Mỗi PR cập nhật Screen Contract, `TRANG_THAI.md` §4–6 và tệp này (đánh dấu ☑).

---

## PR-0 — Danh mục asset và `/cong-cu` 6 module (không đổi DB)

Nhánh `feat/msc-p0-asset-registry` · Tiêu đề `feat(cong-cu): 6 business modules with asset-type registry`

- [x] **0.1** `test(architecture): freeze catalog tool files` — `tests/unit/architecture/catalog-freeze.test.ts` + `catalog-freeze.manifest.txt` (băm từng tệp vùng cấm Catalog, cùng cơ chế với `the-chao-freeze`). Chỉ thêm tệp test.
- [x] **0.2** `feat(marketing-center): asset type domain model` — `asset-type.ts`:
  - `BusinessModuleKey` = `brand | content | promotion | sales | care | print`.
  - `UsageDestination` = `PROMOTION | SALES | CARE | PRINT | LIBRARY`.
  - `InputSource` = `STORE_PROFILE | BRAND_PROFILE | PRODUCT | PRODUCT_PHOTO | ACTIVE_PROMOTIONS | CUSTOMER | MANUAL_TEXT`.
  - `AssetTypeDefinition` = `{ code, name, purpose, module, destinations, toolId, fit: FULL|PARTIAL, inputs[{label, source, required}], outputs[] }`.
  - `readinessOf()` = Sẵn ⇔ công cụ `DONE` ∧ `FULL`.
  - Test thuần.
- [x] **0.3** `feat(marketing-center): register 77 assets and brand identity set` — 6 tệp `asset-types/*.ts` đúng bảng `02_DANH_MUC_ASSET.md` (A + B). Test:
  - 92 mã không trùng;
  - đúng 24 loại Sẵn khớp tài liệu;
  - Sẵn ⇒ có `href`;
  - tên/mục đích là tiếng Việt, không mã kỹ thuật (`/[A-Z]\d{1,2}\b/`, "Fallback"…), nhãn ≤ 5 từ;
  - mỗi loại có ≥1 nơi dùng và ≥1 đầu vào tự điền khi có thể.
- [x] **0.4** `feat(toolkit): business modules and store operations section` — `business-modules.ts` + `store-operations.ts` thay `growth-modules.ts`. Lộ trình AI chuyển sang khoá 6 module (`growth-module-roadmap.ts` → `business-module-roadmap.ts`). Viết lại `growth-modules.test.ts` → `business-modules.test.ts`:
  - đúng 6 module + 1 khu Vận hành;
  - **mỗi công cụ trong 67 mã nằm đúng một chỗ**;
  - production chỉ hiện `DONE` và asset Sẵn, ẩn module rỗng.
- [x] **0.5** `feat(cong-cu): purpose-first module detail with asset cards` —
  - `toolkit-home.tsx` (giữ ≤350): lưới 6 thẻ + thẻ "Vận hành cửa hàng".
  - `toolkit-module-detail.tsx`: khu L0 **"Bạn muốn tạo gì?"** gồm các thẻ asset `asset-type-card.tsx`: tên ≤5 từ, mục đích trong `InfoTip`, chip nơi dùng, "Cần: …" chỉ liệt kê đầu vào phải nhập tay, nút **Tạo** → công cụ.
  - Khu L1 "Công cụ"; liên kết "Asset đã tạo" → `/kho-du-lieu`.
  - `store-operations-panel.tsx`.
  - Dev hiện cả Mở rộng/Mới kèm nhãn; production chỉ Sẵn.
  - Icon Phosphor qua `AppIcon`, tông `MODULE_TONES`.
- [x] **0.6** `docs(cong-cu): screen contract and SSOT sync` — tạo `docs/dac-ta/screen-contracts/cong-cu.md` (archetype, L0–L4, trạng thái). Sửa dẫn chiếu tới `DONG_BO_51_CONG_CU.md` (không tồn tại) trong `growth-modules`/`app-page-tools.ts` → trỏ `02_DANH_MUC_ASSET.md`. Thêm vào registry, `TRANG_THAI.md`, `tool-short-names.ts` nếu cần.
- [x] **0.7** `test(ux): cong-cu audit scenario` — `scripts/ux-audit/scenarios/cong-cu.mjs` (lưới, từng module, khu Vận hành, dev/prod). Cập nhật `tests/e2e/ux/a11y-done-tools.spec.ts` nếu bộ chọn đổi.

Nghiệm thu: 24 asset Sẵn hiện đúng module; bấm Tạo mở đúng công cụ; 0 lỗi axe critical/serious; không cuộn ngang 390px; hai test khoá xanh.

## PR-1 — Mọi đầu ra vào thư viện (không đổi DB)

Nhánh `feat/msc-p1-library-capture`

- [x] **Dừng hỏi PO trước khi code:** poster/banner có bước người dùng **tải ảnh lên** không? Nếu có → chốt chặng hành trình 14 chặng nào chạy (`CLAUDE.md`).
- [x] **1.1** `feat(marketing-center): tag library items with asset type` — quy ước `assets.metadata.asset_type_code` + hàm thuần `assetTypeOfLibraryItem(type, kind, metadata)`, ánh xạ 8 `LIBRARY_TYPES` sang loại asset (catalog → #18, greeting_catalog → #19/#26/#27, landing → #68/#69 theo `page_type`…). Test.
- [x] **1.2** `feat(ad-banner-poster): save rendered banner to library` — `POST /api/v1/ad-banner-poster/save` (quyền `G2`). Lưu PNG đã dựng qua cổng lưu trữ có sẵn (storage skill: khoá `org/<org>/…`, kiểm nội dung tải lên), `kind=MARKETING`, `approval_state=PENDING`, `metadata.asset_type_code`. Nút "Lưu vào kho" sau xem trước, không tự lưu. Test use-case + tenant.
- [x] **1.3** `feat(kho-du-lieu): show asset type and purpose` — Kho dữ liệu hiện tên loại asset + bộ lọc theo module. Cập nhật `kho-du-lieu.md`.
- [x] **1.4** `docs: …` — Screen Contract `cong-cu-poster-banner.md`, `TRANG_THAI`.

Nghiệm thu: poster vừa tạo xuất hiện ở Kho dữ liệu với tên "Poster khuyến mãi", có trạng thái Chờ duyệt.

## PR-2 — "Dùng ở đâu?" (Asset Usage)

Nhánh `feat/msc-p2-asset-usage`

- [x] **2.1** `feat(db): asset_usages table` — migration `prisma migrate dev`. Bảng gồm:
  - `id`, `organization_id`, `source_type` (8 `LIBRARY_TYPES`), `source_id`, `asset_type_code`;
  - `destination` (enum `usage_destination`), `cta_code`, `title`;
  - `short_link_id` (quan hệ với `short_links`, chỉ thêm trường quan hệ ảo phía `short_links`);
  - `campaign_id` (null, dùng ở PR-3), `config Json`;
  - `status` (enum `DRAFT|ACTIVE|PAUSED|ARCHIVED`), `created_by`, thời điểm tạo/sửa;
  - `@@index([organization_id])`, `([organization_id, source_type, source_id])`, `([organization_id, destination, status])`.
  - Kiểm `echo "[$DATABASE_URL]"` trước lệnh Prisma.
- [x] **2.2** `feat(marketing-center): CTA registry and usage rules` — `cta-registry.ts`: `LEARN_MORE, CONTACT, REQUEST_INFO, REQUEST_QUOTE, ORDER, PAY, REVIEW, REFER` (nhãn tiếng Việt). `usage-rules.ts`:
  - CTA hợp lệ theo nơi dùng (Quảng bá: không `ORDER/PAY`; Bán hàng: có `REQUEST_QUOTE/ORDER`);
  - nơi dùng hợp lệ theo loại asset;
  - bảng kênh **tự động / thủ công / chưa tích hợp** (Zalo, SMS, Push = thủ công).
  - Test đủ ma trận.
- [x] **2.3** `feat(rbac): marketing usage capabilities M1 M2` — thêm mã + test catalog quyền.
- [x] **2.4** `feat(marketing-center): usage repository and use-cases` — `create/list/update/pause` Usage. Kiểm nguồn thuộc tổ chức qua hàm đọc thư viện (không đọc thẳng bảng của Catalog/Thẻ chào ngoài cách thư viện đang làm). Khi nơi dùng cần link → gọi `manage-short-links` có sẵn (`target_path` = URL công khai, `utm_campaign` = mã Usage). Test use-case.
- [x] **2.5** `feat(api): /api/v1/asset-usages` — GET (`M1`), POST/PATCH (`M2`), zod. Khác tổ chức → 404. Thêm vào `route-capability-guard.test.ts` nếu cần. Test tenant + platform.
- [x] **2.6** `feat(marketing-center): "Dùng ở đâu?" sheet` — `use-asset-sheet.tsx` (Drawer):
  - bước 1 chọn nơi dùng (nhiều);
  - bước 2 chỉ hiện cấu hình của nơi đó (UX-027): CTA, tên, hạn;
  - xem trước;
  - `ConfirmDialog` khi tạo link công khai (R3).
  - Mở từ Kho dữ liệu và từ thẻ "Asset đã tạo" trên `/cong-cu`.
- [x] **2.7** `feat(marketing-center): usage list per asset and attribution read` — danh sách Usage của một asset + số lượt quét/lead **thật** (nối `short_links` → `link_events`, `leads.short_link_id`).
- [x] **2.8** `docs: …` — Screen Contract mới `asset-usage.md`, đặc tả 06/07 (endpoint, bảng), registry.

Nghiệm thu: một catalog có 2 Usage (Quảng bá "Nhận tư vấn", Bán hàng "Đặt hàng") với 2 link riêng, lead quy về đúng Usage; diff vùng cấm = `OK`.

## PR-3 — Quảng bá: Chiến dịch + pipeline lead 10 trạng thái

Nhánh `feat/msc-p3-campaign-pipeline`

- [x] **3.1** `feat(db): campaigns table and lead pipeline data migration` —
  - `campaigns`: `organization_id`, `name`, `objective` (`AWARENESS|LEAD|SALE|RETENTION`), `occasion_code`, `starts_at`, `ends_at`, `status`, `created_by` + index.
  - Khoá ngoại `asset_usages.campaign_id`.
  - SQL dữ liệu `UPDATE leads SET status='CONTACTED' WHERE status='IN_PROGRESS'`; sửa chú thích cột.
- [x] **3.2** `feat(acquisition): expand lead pipeline` — `LEAD_STATUSES` = `NEW, QUALIFIED, CONTACTED, CONSULTING, RECOMMENDED, QUOTATION_SENT, FOLLOW_UP, WON, LOST, UNQUALIFIED`; luật chuyển trạng thái + nhãn tiếng Việt. **Gộp hằng `OPEN_LEAD_STATUSES` trùng** ở `orders/infra/lead-queue-repository.ts` về `acquisition/domain/lead-recovery.ts`.
  - Lưu ý: đơn từ catalog công khai gắn lead "đang mở" → tập trạng thái mở rộng thì gắn được nhiều lead hơn, đúng ý tài liệu. Mã catalog không đổi.
  - Test luật chuyển + dữ liệu cũ.
- [x] **3.3** `feat(acquisition): leads board for 10-stage pipeline` — `leads-tab.tsx` lọc theo nhóm (Mới / Đang tư vấn / Đã báo giá / Kết thúc) để không bày 10 nút cùng lúc (Progressive Disclosure). Cập nhật `thu-hut-khach.md`, kịch bản `thu-hut-khach.mjs`.
- [x] **3.4** `feat(rbac): campaign capability M3` + `feat(api): /api/v1/campaigns` (+ tenant/platform test).
- [x] **3.5** `feat(marketing-center): campaign workspace` — trang `/quang-ba/chien-dich`:
  - chọn mục tiêu + dịp → chọn asset từ kho (hoặc "Tạo mới" → `/cong-cu`) → Usage + link/QR → xem trước → kích hoạt;
  - kết quả: lượt quét, lead, lead → đơn. **Chỉ số thật**: không có tiếp cận/tương tác vì chưa có dữ liệu.
  - Screen Contract + kịch bản ux-audit.
- [x] **3.6** `docs: …` — đặc tả, `TRANG_THAI`, ghi quyết định QĐ4 thay QĐ 31/10/2026.

## PR-4 — Bán hàng: Báo giá

Nhánh `feat/msc-p4-quotation`

- [x] **4.1** `feat(db): quotations and quotation_items` —
  - `quotations`: `organization_id`, `code` (BG-0001), `lead_id?`, `customer_id?`, `asset_usage_id?`, `status` (`DRAFT|SENT|ACCEPTED|REJECTED|EXPIRED|CONVERTED`), `valid_until`, các tổng tiền `Decimal`, `terms`, `converted_order_id?`, `created_by` + index.
  - `quotation_items`: `product_id?`, `name`, `qty`, `unit_price`, `note`.
- [x] **4.2** `feat(sales): quotation domain rules` — tính tiền phía máy chủ từ giá sản phẩm; ưu đãi chỉ từ `listActiveShopPromotions`; hết hạn; chuyển trạng thái. Lead → `QUOTATION_SENT` khi gửi. Test.
- [x] **4.3** `feat(api): /api/v1/quotations` (`R15` ghi, `Q1` đọc) + trang công khai xem báo giá `/bg/[code]` (chỉ đọc, khoá mã khó đoán). Test tenant.
- [x] **4.4** `feat(orders): QUOTATION order source` — thêm nguồn ở `ORDER_SOURCES` + chuyển báo giá → đơn qua `ingestOrder` (theo `KIEN_TRUC_SSOT_DON_HANG_DA_NGUON.md`). `order-ingestion-guard.test.ts` xanh.
- [x] **4.5** `refactor(bao-gia): persist quotations` — viết lại `/bao-gia` (587 dòng → tách tệp ≤350), bỏ 3 `alert()` giả. Asset #24 lên Sẵn. Cập nhật Screen Contract.
- [x] **4.6** `feat(cong-cu): sales module flow` — module Bán hàng hiện luồng Chọn khách → Tư vấn (Thẻ chào, link sang) → Báo giá → Chốt → Đơn.

## PR-5 — Chăm sóc khách hàng

Nhánh `feat/msc-p5-customer-care`

- [x] **Dừng hỏi PO:** kênh gửi email/Zalo OA cho khách (nhà cung cấp mới?) — mặc định **chỉ gửi thủ công** (sao chép nội dung, mở Zalo/gọi), ghi nhận tay.
- [x] **5.1** `feat(db): customer_segments and customer_interactions` — segment: `rules Json` (zod: hạng, RFM, dịp, lần mua cuối, tag, đồng ý kênh), `kind DYNAMIC|STATIC`. Interaction: `customer_id`, `channel`, `direction`, `asset_usage_id?`, `summary`, `outcome`, `occurred_at`.
- [x] **5.2** `feat(crm): segment evaluator` — dùng lại RFM ở `crm-rules.ts`; **loại khách không đồng ý kênh** (`customer_consents`). Test.
- [x] **5.3** `feat(rbac): M4` + `feat(api): /api/v1/customer-segments`, `/api/v1/customers/[id]/interactions`.
- [x] **5.4** `feat(marketing-center): care workflow` — chọn nhóm → mục tiêu (sau mua, sinh nhật, quay lại, bán thêm, giới thiệu) → asset → gửi thủ công từng khách có nút "Đã gửi" → ghi interaction. Dùng nhắc dịp có sẵn (`scan-upcoming-reminders`).
- [x] **5.5** `feat(greeting-design): care cards #48–#52, #55` — **công cụ mới, tách hẳn module `greeting-card`** (tên `care-cards`), bố cục từ Hồ sơ + thương hiệu, ảnh sản phẩm thật. Nếu dùng AI → qua `callCapability`.
- [x] **5.6** `docs: screen contract cham-soc.md`.

## PR-6 — Ấn phẩm & In

Nhánh `feat/msc-p6-print`

- [x] **6.1** `feat(print): presets and preflight rules` — `src/modules/print/domain/`:
  - preset A4, A5, A6, danh thiếp 90×54, standee 60×160, bảng để bàn, thẻ treo, tem;
  - quy cách: bleed 3mm, vùng an toàn, DPI tối thiểu 300, kích thước QR tối thiểu.
  - Test.
- [x] **6.2** `feat(db): print_renditions` — `source_type/source_id` hoặc `asset_usage_id`, `preset_code`, kích thước mm, `bleed_mm`, `dpi`, `storage_key`, `preflight Json`, `status`.
- [x] **6.3** `feat(print): PDF export via existing jspdf` (không thêm thư viện) + `M5` + API. Catalog in (#60) **đọc dữ liệu công khai, dựng bản in mới**, không dùng/sửa `catalog-pdf-export-button.tsx`.
- [x] **6.4** `feat(marketing-center): print workspace` — chọn asset → khổ/vật liệu/số lượng → kiểm lỗi (hiện rõ lỗi, không giấu) → xem trước → tải PDF in.
- [x] **6.5** `docs: screen contract in-an.md`.

## PR-7 — KPI & quy thuộc

Nhánh `feat/msc-p7-kpi`

- [x] **7.1** `feat(marketing-center): KPI definitions` — `kpi-definitions.ts`: công thức, cửa sổ thời gian, nguồn. Quy thuộc **first-touch qua link ngắn**, một lead chỉ thuộc một Usage (không tính trùng). Test.
- [x] **7.2** `feat(api): /api/v1/marketing-center/kpis` — chỉ trả chỉ số có dữ liệu.
- [x] **7.3** `feat(cong-cu): module KPI strip` — mỗi module tối đa 3 số; ẩn chỉ số chưa có dữ liệu.

## PR-B — Bộ nhận diện thương hiệu (làm sau — PO QĐ6)

Đã có danh mục (TH01–TH15) ở PR-0. Khi PO mở phase:

- [ ] **Dừng hỏi PO:** nhà cung cấp AI tạo logo (giấy phép mô hình, chi phí); ai được duyệt (`M7`).
- [ ] Mở rộng Hồ sơ cửa hàng (định vị, khách mục tiêu, phong cách, khu vực) + trạng thái `INCOMPLETE → READY_FOR_GENERATION → COMPLETED`.
- [ ] Bảng `brand_identity_sets` / `brand_versions` (`GENERATED → IN_REVIEW → APPROVED/REJECTED → SUPERSEDED`). Asset sinh sau ghi `brand_version_id`.
- [ ] Công cụ "Tạo bộ nhận diện thương hiệu" (qua `callCapability`, vòng thử có giới hạn) → chọn/sửa/duyệt → bản duyệt ghi về `brand_profiles` + thư viện thương hiệu.
- [ ] Đổi thương hiệu → đánh dấu asset phụ thuộc "cần rà soát".

## 5. Điểm dừng hỏi PO (tổng hợp)

| Khi | Câu hỏi |
|---|---|
| PR-1 | Poster/banner có bước tải ảnh lên → chạy chặng nào của hành trình 14 chặng |
| PR-2…PR-6 | Mỗi migration (đã đồng ý QĐ3, vẫn báo trong PR) |
| PR-5 | Kênh gửi khách tự động (email/Zalo OA) hay chỉ thủ công |
| PR-B | Nhà cung cấp AI tạo logo, quyền duyệt |
| Bất kỳ | Diff chạm vùng cấm §2 → dừng ngay |
