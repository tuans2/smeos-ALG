# Kế hoạch thực thi — Điều phối: Trường dữ liệu, Master Index & Quản trị trường nền tảng

**Ngày lập:** 26/09/2026 · **Trạng thái:** BẢN CUỐI, chờ PO duyệt từng giai đoạn trước khi viết mã
**Mã định danh:** `DOC-05-KE-HOACH-DIEU-PHOI-TRUONG`
**Đặc tả gốc (không thay thế, tệp này là lớp thực thi):**

- [`docs/dac-ta/ALG_COORDINATOR_FIELD_SPEC.md`](../dac-ta/ALG_COORDINATOR_FIELD_SPEC.md) v2.3 (gọi tắt **Đặc tả trường**)
- [`docs/dac-ta/ALG_COORDINATOR_MASTER_INDEX_CONTRACT.md`](../dac-ta/ALG_COORDINATOR_MASTER_INDEX_CONTRACT.md) v2.2 (gọi tắt **Hợp đồng MI**)

---

## 0. Phạm vi và các quyết định đã chốt

**Mục tiêu:**

1. Đưa Điều phối (Chức năng 12) từ khoảng 15% trường chạy thật lên đủ bộ trường của Đặc tả trường cho T01–T27 và các form vận hành.
2. Nối Điều phối với Product/Customer Master Index.
3. Dựng **nền quản trị trường**, trong đó quản trị nền tảng ALG sửa được mọi trường, mọi danh mục và **tạo được trường mới hoàn toàn** trên Console Vận hành.

Các quyết định PO ngày 26/09/2026 làm căn cứ cho kế hoạch:

| # | Quyết định |
|---|---|
| Q1 | Code thắng tài liệu. Tài liệu mới đã sửa theo code |
| Q4 | Địa chỉ giao **giữ bắt buộc nhiều tầng**, kể cả Quận/Huyện. Cơ chế nhập song song cũ/mới là đề xuất, **chờ chọn phương án** |
| Q5 | Được thêm cột DB thật cho các mốc vận hành |
| D2 | Thanh toán thuộc cả hai module: trả trước ghi ở Đơn hàng, phần còn phải thu do Điều phối thu. Đơn luôn có Tổng số, Đã thu, Còn phải thu |
| D3 | Không làm cổng đối tác. Điều phối viên thao tác và tải ảnh/video thay đối tác |
| D5 | Duyệt MI-12 (mở rộng BOM). Mọi trường đều hiển thị |
| D6 | T17 (thay sản phẩm) khác T24 (thay đối tác), **không gộp** |
| D7 | Danh mục giá trị theo thực tế (Đặc tả trường §2.15) |
| D12 | Admin là **quản trị nền tảng**. Mọi trường đã xây và mọi danh mục do quản trị nền tảng sửa được trên dashboard |
| D13 | Quản trị nền tảng được **tạo trường hoàn toàn mới** ngay trên dashboard (Đặc tả trường §16.3) |

**Không làm trong kế hoạch này:**

- Cổng đối tác (D3).
- Cổng thanh toán online hoặc đối soát ngân hàng tự động. Sổ thu chỉ ghi nhận tiền người dùng khai.
- Hoá đơn điện tử.
- Tạo trường mới ở cấp chủ tiệm. Chỉ quản trị nền tảng được tạo.

---

## 1. Tổng quan giai đoạn và phụ thuộc

```text
ĐP-0 Tài liệu (XONG 26/09)
  │
  ├──► ĐP-1 Sửa lỗi P0 ─────────────┐
  │                                  │
  ├──► ĐP-2 Nối Master Index ────────┤
  │     └─► ĐP-2b MI-12 mở rộng BOM   │
  │                                  ▼
  └──► ĐP-3 Nền quản trị trường ──► ĐP-4a P1–P2 + Sổ thu ──► ĐP-4b P3–P5 ──► ĐP-4c P6–P7 + ngoại lệ + phân tích
        (Console ghi, danh mục,                                                          │
         trường tự tạo)                                                                  ▼
                                                                                ĐP-5 Nhận đơn M10/Chat

ĐP-ĐC Địa chỉ hai cơ chế ── bị chặn bởi quyết định Q-ĐC (phương án + nguồn dữ liệu)
```

| Giai đoạn | Nội dung chính | Migration | Chờ quyết định | Quy mô | Có thể chạy song song với |
|---|---|---|---|---|---|
| ĐP-1 | Sửa 6 lỗi P0 + MI-1, MI-2 | Không | Không | Nhỏ | ĐP-2, ĐP-3 |
| ĐP-2 | `productId` + snapshot, chọn khách từ CMI, MI-3…MI-6 | Không | Không | Trung bình | ĐP-1, ĐP-3 |
| ĐP-2b | MI-12: BOM thêm giống hoa, chiều dài cành, thay thế từng dòng… | Không (JSON) | Không | Trung bình | ĐP-3 |
| ĐP-3 | Nền quản trị trường: Console ghi, `N12`, danh mục D7, hiển thị, **trường tự tạo** | **Có** (bảng nền tảng + cột JSON) | Không | **Lớn** | ĐP-1, ĐP-2 |
| ĐP-4a | P1–P2: T01–T05, form Lập kế hoạch, **sổ thu D2** | **Có** | Không | Lớn | — |
| ĐP-4b | P3–P5: T06–T17 | Có | Không | Lớn | — |
| ĐP-4c | P6–P7 + T22–T27 + Huỷ đơn + trường có điều kiện | Có | Không | Lớn | — |
| ĐP-5 | Nhận đơn từ M10/Chat | Không | Không | Trung bình | ĐP-4b/4c |
| ĐP-ĐC | Địa chỉ hai cơ chế cũ/mới | Có | **Q-ĐC** | Trung bình | Bất kỳ, sau khi có quyết định |

**Thứ tự đề xuất:** ĐP-1 và ĐP-2 → ĐP-3 → ĐP-2b → ĐP-4a → ĐP-4b → ĐP-4c → ĐP-5.

ĐP-3 phải xong **trước** ĐP-4, để mọi trường xây ở ĐP-4 được đăng ký vào nền quản trị ngay từ đầu. Như vậy quản trị nền tảng sửa được chúng mà không phải làm lại.

---

## 2. Quy tắc chung cho mọi giai đoạn

1. **Chín (mười một) câu hỏi trước khi viết mã** của `AGENTS.md` được trả lời ở đầu mỗi giai đoạn, ghi vào mục nhật ký của giai đoạn đó.
2. **Tenant:** mọi bảng mới thuộc tenant có `organization_id`, nằm trong `TENANT_TABLES` (`tests/helpers/database.ts`), có ca thử trong `tests/tenant/`. Bảng cấp nền tảng là **ngoại lệ có chủ đích của Luật 1**, ghi lý do trong đặc tả 07 ngay lượt khai, giống `platform_operators`.
3. **Đổi route hoặc lược đồ thì sửa đặc tả 06/07 trong cùng lượt.** `node scripts/check-docs.mjs` phải xanh.
4. **Đổi hợp đồng zod của Điều phối thì chạy `npm run gen:schemas:coordinator`**, rồi `check:schemas:coordinator` phải xanh.
5. **Đổi `src/components/templates/*` thì cập nhật `ALG_TEMPLATE_SYSTEM_SSOT.md`**, rồi `npm run check:template-ssot` phải xanh.
6. **Không bịa dữ liệu.** Thiếu nguồn thì hiện trạng thái "chưa có", không điền giá trị mặc định trông hợp lý.
7. **Mỗi trường mới** được khai trong Sổ đăng ký trường (ĐP-3) cùng lượt với lượt tạo ra nó, và bảng trạng thái của Đặc tả trường được cập nhật (CHƯA XÂY → CÓ).
8. **Cổng chung của mọi giai đoạn:**
   - `npx tsc --noEmit` sạch
   - `npm test` xanh
   - `npm run test:tenant` xanh, không suy giảm
   - `npm run test:platform` xanh (từ ĐP-3)
   - `node scripts/check-docs.mjs` xanh
   - `check:schemas:coordinator` và `check:template-ssot` xanh
   - `eslint` khu vực bị sửa 0 lỗi
9. **Kết thúc mỗi giai đoạn** (theo `AGENTS.md`):
   - Tích ô trong `Checklist_Thuc_Thi.md` (mục mới "CN12 — Trường dữ liệu Điều phối").
   - Ghi `TRANG_THAI.md`.
   - Ghi nợ mới vào `TECHNICAL_DEBT.md` nếu có.
   - Cập nhật bảng trạng thái của Đặc tả trường.
10. **Việc anh Tony chạy tay** sau mỗi lượt đổi lược đồ, vì VM không tải được nhị phân Prisma:
    - `npx prisma migrate deploy` (hoặc `db push` ở môi trường dev), rồi `npx prisma generate`.
    - Sau đó `npm run test:tenant` và `npm run test:platform` trên Mac.

    Khi `tsc` báo thiếu model mới, đó là lỗi **CHỜ** `prisma generate`, không phải lỗi mã.

---

## 3. ĐP-1 — Sửa lỗi P0

**Mục tiêu:** hết lỗi đúng/sai và rò rỉ đã phát hiện. Không thêm tính năng.

| # | Việc | Tệp | Ghi chú |
|---|---|---|---|
| 1.1 | Gỡ "Giá bán khách" khỏi vùng chụp PNG của phiếu đối tác T07 | `src/components/templates/coordinator/partner-product-card.tsx` | Chuyển ô giá bán ra ngoài `cardRef`, hoặc chỉ hiện ở view nội bộ. Test: bản chữ và vùng ảnh đều không chứa `unitPriceVnd` |
| 1.2 | Bỏ nhánh địa chỉ **một chuỗi** trong `addressSchema` | `src/modules/coordinator/adapters/http-schemas.ts` | Chỉ nhận object 4 tầng. Kiểm dữ liệu cũ: đơn có `delivery_address` chỉ gồm `formattedAddress` vẫn **đọc** được (không sửa dữ liệu cũ) |
| 1.3 | `customerPhone` không còn bị rơi | `http-schemas.ts`, `create-coordinator-order.ts`, `sales-order-intake-modal.tsx`, `coordinator-api.ts`, `contracts/step-01-intake.ts`, `contracts/order-view.ts` | Lưu `customerPhone` vào `order_coordinations.metadata` (khách lẻ). `priority` để sang ĐP-4a vì cần cột và danh mục. Từ lượt này, **ô ưu tiên trên form bị ẩn** cho tới ĐP-4a, để không còn ô nhập mà giá trị bị bỏ |
| 1.4 | Bỏ các giá trị bịa trong bộ chuyển đổi | `src/modules/coordinator/domain/master-index-adapter.ts` | Bỏ "Lá đệm theo mùa", "Giấy gói cao cấp", "Thiệp chúc mừng", "Khách hàng thân thiết". Mảng rỗng thì trả rỗng, giao diện hiện "Chưa có dữ liệu". Có test đơn vị |
| 1.5 | MI-1: thêm `consents[].revokedAt` | `crm/domain/customer-master-index.ts`, `crm/infra/customer-repository.ts` | Đọc `customer_consents.revoked_at`. `projectOccasionReminder`: `isZaloAllowed` = đã cấp **và** chưa thu hồi |
| 1.6 | MI-2: voucher đúng nghĩa "khả dụng" | cùng các tệp trên | `availableVouchers` chỉ gồm voucher `is_used = false` và chưa hết hạn. Thêm `minOrderVnd`, `maxDiscountVnd` |
| 1.7 | Ghi chú phân công **không nối vào ghi chú nội bộ** nữa | `use-cases/operations.ts` (`assignPartner`) | Lưu vào `order_coordinations.metadata.partnerInstruction`. View trả `partnerInstruction`. Ghi chú cũ đã nối thì giữ nguyên |

**Test mới:**

- `tests/unit/coordinator/`: 1.1, 1.2, 1.4, 1.7.
- `tests/unit/crm/`: 1.5, 1.6.
- `tests/tenant/coordinator.test.ts`: tạo đơn với địa chỉ một chuỗi → 400.

**Tài liệu cập nhật:** Đặc tả trường (D8, bảng T01/T07, `partnerInstruction`), Hợp đồng MI §9 (MI-1, MI-2: Xong), đặc tả 06 nếu hình dạng đáp ứng đổi.

**Cổng:** cổng chung.

---

## 4. ĐP-2 — Nối Master Index vào Điều phối

**Mục tiêu:** đạt tiêu chí 1–6 và 9–10 của Hợp đồng MI §11.

| # | Việc | Tệp | Ghi chú |
|---|---|---|---|
| 2.1 | MI-3: thêm `updatedAt` vào PMI và CMI | `product-master-index.ts`, `product-master-index-repository.ts`, `customer-master-index.ts`, `customer-repository.ts` | Lấy từ `products.updated_at` và `customers.updated_at` |
| 2.2 | MI-4: vai trò ảnh `REFERENCE` | `product-master-index.ts` (`ProductGalleryImage.role`), repository, màn duyệt ảnh sản phẩm | `product_images.role` là chuỗi nên không cần migration. Thêm thao tác "Đặt làm ảnh mẫu tham chiếu" |
| 2.3 | MI-5: `projectCoordinatorSnapshot(product)` | `product-master-index.ts` | Trả: id, code, name, category, style, colorPalette, ảnh tham chiếu, `bom` đủ 4 nhóm, `tierCount`, `substitutionPolicy`, `dimensions`, `warningTags`, `quotePriceVnd`, `masterUpdatedAt`, `capturedAt`. **Không** có `costPriceVnd`. Test: snapshot không bao giờ chứa `costPriceVnd` |
| 2.4 | MI-6: `projectCustomerCoordinationBrief(customer)` | `customer-master-index.ts`. Xoá `extractCustomerCoordinationBrief` khỏi Điều phối | Không có giá trị bịa |
| 2.5 | Thi công thật `DirectMasterIndexConnector` | `connectors/master-index-connector.ts` | Gọi `getProductMasterIndex` / `getCustomerMasterIndex` theo `TenantContext` |
| 2.6 | Hợp đồng tạo đơn nhận `productId` | `http-schemas.ts`, `step-01-intake.ts`, `coordinator-api.ts` | `productId` là tuỳ chọn, để vẫn tạo được đơn mẫu ngoài danh mục |
| 2.7 | Tạo đơn: **một dòng `order_items` cho mỗi sản phẩm** | `create-coordinator-order.ts`, `infra/coordinator-repository.ts` | Có `productId`: máy chủ đọc PMI, ghi `product_id`, `quantity` (số sản phẩm) và `metadata` = snapshot 2.3. Không có: ghi `description` + BOM nhập tay trong `metadata`. **Bỏ kiểu mỗi loại hoa một dòng.** Đơn cũ vẫn đọc được (tầng trình bày nhận cả hai dạng) |
| 2.8 | Override có vết (Hợp đồng MI §6, bản tối thiểu) | `create-coordinator-order.ts`, `domain/` hàm thuần `diffAgainstSnapshot` | Khi Sales sửa BOM hoặc màu so với snapshot, ghi `metadata.overrides[] = {path, masterValue, orderValue, by, at, reason?}`. Bản đầy đủ qua T04 làm ở ĐP-4a |
| 2.9 | Ô chọn khách hàng từ CMI | `sales-order-intake-modal.tsx` (+ route tìm khách đã có của CRM) | Có `customerId`: máy chủ **tự lấy** tên, SĐT, hạng từ CMI và bỏ qua giá trị client gửi. Không chọn: khách lẻ, nhập tay |
| 2.10 | Form chọn mẫu nhanh giữ ID | `sales-order-intake-modal.tsx` | Bỏ việc nhồi `wrapStyle`/`ribbon` vào ghi chú nội bộ. Hiện BOM đủ 4 nhóm (sửa được, có vết) |
| 2.11 | View trả snapshot | `present-coordinator-order.ts`, `contracts/order-view.ts` | Thêm `productId`, `product` (snapshot), `foliage`, `wrapping`, `accessories`, `substitutionPolicy`, `referenceImageUrls`. Giữ các trường cũ để không vỡ client |
| 2.12 | T07 hiện BOM thật | `partner-production-card.tsx`, `partner-product-card.tsx` | Lấy từ snapshot. Hiện `shade`, `budCount` |
| 2.13 | Siết `unit` và `role` theo `DemUnit` và vai trò của PMI | `http-schemas.ts` | Đơn cũ có giá trị ngoài danh sách vẫn đọc được |

**Test mới:**

- Đơn vị: snapshot, `diffAgainstSnapshot`, lấy hạng khách từ CMI.
- Tenant: tạo đơn với `productId` của tổ chức khác → 404; tạo đơn với `customerId` của tổ chức khác → 404 (đã có, giữ nguyên).
- Playwright: P1 chọn mẫu → T07 hiện đủ BOM.

**Tài liệu cập nhật:**

- Hợp đồng MI §5 (Snapshot: Đã thi công), §11 (tiêu chí).
- Đặc tả trường, nhóm O-PRD/O-BOM/O-FOL/O-WRP/O-ACC.
- Đặc tả 06 (hình dạng tạo đơn/view).
- JSON Schema Điều phối.

**Cổng:** cổng chung, cộng một lượt chạy thật P1→P7 với một sản phẩm có BOM đủ 4 nhóm.

---

## 5. ĐP-2b — MI-12: mở rộng BOM nguyên tử

| # | Việc | Tệp |
|---|---|---|
| 2b.1 | Thêm vào type PMI, tất cả **tuỳ chọn**: `FlowerBomItem.variety`, `stemLengthCm`, `substitutionAllowed`, `substitutionPriority`; `FoliageBomItem.substitutionAllowed`; `WrappingLayer.pattern`, `quantity`, `substitutionAllowed`; `AccessoryBomItem.unit`, `substitutionAllowed` | `product-master-index.ts` |
| 2b.2 | Đọc/ghi các trường mới | `product-master-index-repository.ts`, `product-master-merge.ts` |
| 2b.3 | Form duyệt sản phẩm M01b cho sửa các trường mới | Các component M01b tương ứng |
| 2b.4 | Hợp đồng Vision: cho AI điền các trường mới khi nhận diện được. Không nhận diện được thì để trống, không đoán | Hợp đồng Vision / `product-analyses` |
| 2b.5 | Snapshot (2.3), T01 và T07 hiện các trường mới | ĐP-2 |

**Cổng:** cổng chung. Sản phẩm cũ (không có trường mới) vẫn qua toàn bộ test hiện có.

---

## 6. ĐP-3 — Nền quản trị trường (Console Vận hành)

**Mục tiêu:** quản trị nền tảng sửa được mọi trường đã xây, mọi danh mục, và **tạo được trường mới** (Đặc tả trường §16.2–§16.3). Đây là nền mà mọi trường của ĐP-4 dựa vào.

### 6.1. Lược đồ (một migration: `…_field_platform`)

| Bảng | Cấp | Nội dung |
|---|---|---|
| `field_definitions` | Nền tảng (ngoại lệ Luật 1) | Một dòng cho mỗi trường, **cả trường lõi và trường tự tạo**: `key` (duy nhất, không đổi), `entity`, `origin` (`CORE` · `CUSTOM`), `data_type`, `label`, `description`, `placeholder`, `placements` (JSON: template/form + khu vực + thứ tự), `requirement` (`OPTIONAL` · `RECOMMENDED` · `REQUIRED` + `required_at_stage`), `visibility` (JSON theo `INTERNAL`/`PARTNER`/`SHIPPER`/`CUSTOMER`), `validation` (JSON), `catalog_key`, `sensitivity` (`NORMAL` · `PII` · `SENSITIVE`), `status` (`ACTIVE` · `INACTIVE`), `version`, `created_by`, `updated_by`, dấu thời gian |
| `field_catalogs` | Nền tảng | Danh mục: `key`, `label`, `governance` (`OPEN` · `BEHAVIOR` · `CLOSED`), `behavior_kind` |
| `field_catalog_values` | Nền tảng | `catalog_key`, `code` (không đổi), `label`, `description`, `sort_order`, `is_active`, `behavior` (mã hành vi có trong code), `params` (JSON, ví dụ `{ minutes: 120 }`) |
| `field_config_overrides` | **Có `organization_id`** (chỉ quản trị nền tảng ghi) | Ghi đè theo tổ chức cho: nhãn, hiển thị, mức yêu cầu, bật/tắt giá trị danh mục, trường tự tạo chỉ áp cho tổ chức này. Nằm trong `TENANT_TABLES` |
| Cột `custom_fields Json?` | Tenant | Thêm vào `order_coordinations` và `partners` ở đợt này. `order_qc_records`, `order_exceptions`, `order_payments` thêm ở ĐP-4 khi các bảng đó mở rộng |

Lịch sử thay đổi ghi vào `platform_audit_logs` (đã có). Không lập bảng lịch sử riêng.

### 6.2. Mã và luật

| # | Việc | Tệp |
|---|---|---|
| 3.1 | Mã năng lực nền tảng **`N12` `platform.field_catalog.manage`** | `src/core/platform/platform-capability-catalog.ts` (+ test). `N9`–`N11` giữ cho tuyến AI-1 |
| 3.2 | **Lớp mã:** Sổ đăng ký trường lõi (khoá, kiểu, nơi lưu, hành vi, mức sàn) | `src/modules/field-platform/domain/core-field-registry.ts`, với phần khai của Điều phối ở `src/modules/coordinator/contracts/field-registry.ts` |
| 3.3 | **Danh mục hành vi** (hành vi mà code hiểu) | `src/modules/field-platform/domain/behaviors.ts`. Gồm: cách tính SLA `OFFSET`/`EXACT`/`WINDOW`/`END_OF_DAY`; bậc ưu tiên 1–4; bật nhóm trường có điều kiện; cần địa chỉ / cần lắp đặt; cần bằng chứng / là thu hộ |
| 3.4 | **Luật thuần** (không Prisma) | `src/modules/field-platform/domain/field-rules.ts`. Mức sàn §16.2; khoá và kiểu không đổi; không xoá cứng; giới hạn trường tự tạo (§6.4); tổng hợp cấu hình hiệu lực = lớp mã + cấu hình nền tảng + ghi đè tổ chức |
| 3.5 | **Trình kiểm tra động**: sinh zod từ định nghĩa trường tự tạo đang ACTIVE | `field-platform/domain/custom-field-schema.ts` |
| 3.6 | Seed: nạp toàn bộ trường lõi đã xây và **bộ danh mục D7** (Đặc tả trường §2.15) | `prisma/seed.ts` + `scripts/nap-danh-muc-truong.ts` (chạy lại được, không ghi đè bản quản trị nền tảng đã sửa) |
| 3.7 | Use-case cấp nền tảng (nhận `PlatformContext`, gác bằng `N12`) | `field-platform/use-cases/`: `list-fields`, `update-field-config`, `create-custom-field`, `deactivate-field`, `list-catalogs`, `upsert-catalog-value`, `set-org-override`, `preview-effective-config` |
| 3.8 | Use-case cấp tenant (chỉ đọc): cấu hình hiệu lực cho tổ chức hiện tại | `field-platform/use-cases/get-effective-field-config.ts`, có bộ nhớ đệm và làm mới theo `version` |
| 3.9 | Ghi và đọc giá trị trường tự tạo trên thực thể | Hàm dùng chung `applyCustomFields(entity, input)`, gọi từ các use-case tạo/sửa của Điều phối. Kiểm tra theo 3.5, kiểm `assets` cùng tổ chức với kiểu tệp/ảnh, ghi `audit_logs` |
| 3.10 | Cổng chặn chuyển bước theo trường bắt buộc | `domain/stage-transitions.ts`: trường (lõi hoặc tự tạo) có `required_at_stage = X` còn trống thì không cho **rời** bước X. Trả 422 kèm danh sách trường thiếu |
| 3.11 | Lọc hiển thị theo đối tượng xem | Hàm thuần `projectForAudience(view, config, audience)`, áp cho view T07 (đối tác), T18 (shipper), và nội dung copy Zalo/PNG |
| 3.12 | Lệnh kiểm tra `npm run check:field-registry` | `scripts/check-field-registry.ts`: mọi trường lõi trong code có dòng `field_definitions`; cấu hình DB chỉ trỏ tới khoá và hành vi có thật; không trường mồ côi |

### 6.3. Route và giao diện

| # | Việc |
|---|---|
| 3.13 | Route nền tảng: `GET/PATCH /api/v1/platform/fields`, `POST /api/v1/platform/fields` (tạo trường tự tạo), `POST /api/v1/platform/fields/:key/deactivate`, `GET/POST/PATCH /api/v1/platform/catalogs/:key/values`, `PUT /api/v1/platform/organizations/:id/field-overrides` |
| 3.14 | Route tenant: `GET /api/v1/field-config?entity=…` (chỉ đọc, quyền R1) |
| 3.15 | Console: trang **`/van-hanh/truong-du-lieu`**, gồm 4 tab: *Trường lõi* · *Trường tự tạo* · *Danh mục* · *Ghi đè theo tổ chức*. Có xem trước ("tổ chức X sẽ thấy form T01 như thế nào"). Mọi thao tác ghi đều hỏi xác nhận và hiện diff cũ → mới |
| 3.16 | Giao diện tenant: component `<ConfiguredField>` và `<CustomFieldsSection placement="T01.delivery">`, đặt vào **17 template/form Điều phối** hiện có. Nhãn, hiển thị và bắt buộc lấy từ cấu hình hiệu lực. Thứ tự khối và cấu trúc bố cục vẫn là code |

### 6.4. Trường tự tạo: giới hạn an toàn (lớp mã, quản trị nền tảng không vượt được)

| Hạng mục | Quy định |
|---|---|
| Kiểu dữ liệu | `TEXT` · `LONG_TEXT` · `NUMBER` · `MONEY_VND` · `DATE` · `DATETIME` · `BOOLEAN` · `SELECT` · `MULTI_SELECT` (lấy từ danh mục) · `PHONE` · `EMAIL` · `URL` · `IMAGE` · `FILE` (qua `assets`) |
| Thực thể được gắn | ĐP-3: `ORDER` (đơn điều phối), `PARTNER`. ĐP-4 mở thêm `QC_RECORD`, `EXCEPTION`, `PAYMENT` |
| Khoá | Máy sinh từ nhãn, dạng `cf_<chữ-thường>`. Không đổi được, không trùng khoá lõi |
| Đổi kiểu | Không được khi trường đã có giá trị. Muốn đổi thì tạo trường mới |
| Xoá | Chỉ **tắt**. Giá trị cũ giữ nguyên, vẫn xem được trong lịch sử đơn |
| Số lượng | Tối đa 50 trường tự tạo cho mỗi thực thể. Mỗi giá trị ≤ 4 KB. Tệp/ảnh ≤ 10 mỗi trường |
| Vai trò trong luật | Được: hiển thị, bắt buộc theo bước (3.10), đưa vào bản copy Zalo/PNG theo cấu hình hiển thị, xuất dữ liệu. **Không** tham gia tính SLA, rủi ro, giá, hay chuyển bước ngoài quy tắc bắt buộc |
| Quyền riêng tư | `sensitivity = PII`: mặc định ẩn với `PARTNER`/`SHIPPER`. `SENSITIVE`: không bao giờ gửi ra nhà cung cấp AI ngoài (theo sàn quyền riêng tư của `AGENTS.md`) |
| Lọc / tìm kiếm | Chưa làm ở ĐP-3. Ghi nợ; bật lên khi cần (chỉ mục GIN trên `custom_fields`) |

### 6.5. Test và cổng

- **`tests/platform/`:**
  - thiếu `N12` → 403;
  - tạo trường tự tạo → tenant đọc thấy trong `field-config`;
  - ghi đè tổ chức A không ảnh hưởng tổ chức B;
  - không tắt được mức sàn;
  - không đổi được khoá/kiểu;
  - mọi thao tác ghi đều có dòng trong `platform_audit_logs`.
- **`tests/tenant/`:**
  - route tenant không ghi được vào `field_*`;
  - giá trị trường tự tạo của đơn tổ chức A không đọc được từ tổ chức B;
  - `field_config_overrides` được cách ly.
- **Đơn vị:** luật 3.4, trình kiểm tra 3.5, `projectForAudience`, cổng bắt buộc theo bước.
- **Playwright:**
  1. Quản trị nền tảng tạo trường "Mã PO khách" (TEXT, T01, bắt buộc ở `INTAKE`).
  2. Sales tạo đơn → thấy ô, bỏ trống → không qua được `INTAKE`.
  3. Điền → qua được.
  4. Phiếu đối tác không hiện trường này (mặc định `INTERNAL`).
- **Cổng ĐP-3:** cổng chung, cộng `check:field-registry` xanh.

**Phụ thuộc:** dùng `PlatformContext` và `platform_audit_logs` của P25a. ĐP-3 **tự dựng thao tác ghi đầu tiên** của Console theo đúng khuôn P25b (use-case nhận `PlatformContext`, gác mã N, ghi audit). Nó không chờ P25b; hai tuyến dùng chung khuôn.

**Việc anh Tony chạy tay:** migration, `generate`, `scripts/nap-danh-muc-truong.ts`, rồi `test:tenant` và `test:platform`.

---

## 7. ĐP-4a — P1–P2 và Sổ thu (D2)

### 7.1. Lược đồ (migration `…_coordinator_p1_p2_payments`)

**Cột mới `order_coordinations`**, đều cho phép `NULL`, lưu **mã chuỗi** kiểm theo danh mục:

- Nguồn và kênh: `source`, `source_reference`, `channel`
- Phân loại: `order_type`, `priority`, `service_level`, `delivery_type`, `delivery_location_type`
- Mốc thời gian: `received_at`, `delivery_window_start`, `delivery_window_end`, `production_deadline_at`, `pickup_target_at`
- Người phụ trách: `sales_owner_id`, `next_action_owner_id`, `handoff_at`

Cột `next_action_due` đã có, bắt đầu dùng từ đợt này.

**Cột mới `orders`:** `paid_vnd Decimal default 0`, `balance_vnd Decimal`, kèm ràng buộc `CHECK (balance_vnd = total_vnd - paid_vnd)`. Với đơn cũ: `paid_vnd = 0` và `balance_vnd = total_vnd`, gán trong migration.

**Bảng mới `order_payments`** (tenant): `id`, `organization_id`, `order_id`, `kind` (`DEPOSIT` · `BALANCE` · `REFUND`), `amount_vnd`, `payment_method`, `collection_method`, `reference`, `evidence_asset_id`, `collected_by`, `collected_at`, `note`, `custom_fields`.

**Bảng mới `order_info_requests`** (T03) và **`order_change_requests`** (T04), đều tenant, trường theo Đặc tả trường §3.3–§3.4.

**JSON:**

- `metadata`: người nhận mở rộng, dịp (`occasionCode` → bảng `occasions`), thiệp, `customerCommitments[]`, `invoiceInfo`, `isAnonymousGift`, các hướng dẫn giao.
- `delivery_address`: `buildingName`, `buildingBlock`, `floor`, `room`, `gateEntrance`, `landmark`, `latitude`, `longitude` (đều tuỳ chọn).

### 7.2. Việc

| # | Việc |
|---|---|
| 4a.1 | T01: bổ sung đủ trường P0/P1 của Đặc tả trường. `priority`, `serviceLevel`, `orderType`, `channel` là ô chọn từ danh mục. Nhóm trường có điều kiện bật theo hành vi của `orderType`/`deliveryLocationType`. `cardMessage` bắt buộc khi `cardRequired`. Máy **gợi ý** `priority` theo luật §2.15.1 |
| 4a.2 | Hạn SLA: tính `deliveryTargetAt`, cửa sổ và `latest*At` theo hành vi của `serviceLevel` (tham số lấy từ danh mục). `evaluateRisk` dùng các mốc mới. Hàm thuần, có test |
| 4a.3 | **Sổ thu:** use-case `record-payment` (một giao dịch: thêm dòng, cập nhật `paid_vnd`/`balance_vnd`, `audit_logs`). Sales ghi `DEPOSIT` ở T01. Điều phối ghi `BALANCE` và đặt `collectionMethod`/`collectionDueAt`. `paymentStatus` suy ra. Route: `POST /api/v1/coordinator/orders/:id/payments`, `GET …/payments`. **Năng lực tenant mới:** `R9 order.payment.record` (Sales + Điều phối) và `R10 order.payment.refund` (chỉ điều hành, trần cứng). Thêm vào `capability-catalog.ts` + test |
| 4a.4 | Hiển thị 3 con số Tổng / Đã thu / Còn phải thu trên T01, T02, T05 và trang Đơn hàng M10 |
| 4a.5 | T02 Sales Order Brief: tóm tắt suy ra, `missingFields[]`/`conflictFields[]` tính theo cấu hình bắt buộc hiệu lực. Nút "Bàn giao cho Điều phối" ghi `handoff_at` |
| 4a.6 | T03: dùng lại `MissingInfoRequestCard` (đang bị bỏ). Tạo yêu cầu, theo dõi trạng thái `OPEN → SENT → WAITING → RECEIVED/OVERDUE/CANCELLED`, điền phản hồi thì cập nhật đúng trường của đơn |
| 4a.7 | T04 Yêu cầu thay đổi = nơi thi công đầy đủ **quy tắc override** (Hợp đồng MI §6). Thay đổi giá thì tính lại `balance_vnd`. Thay đổi sau khi đã phân công thì bật cờ "cần báo đối tác" |
| 4a.8 | T05: thêm `priority`, `nextActionAt`, `timeRemaining`, `missingFieldCount`, `openExceptionCount`, `paymentStatus`, `balanceVnd`, và nhắc thu tiền khi gần `collectionDueAt` |
| 4a.9 | Form Lập kế hoạch: đủ trường Đặc tả trường §4.2. `updateStageSchema` tách thành `planOrderSchema` |
| 4a.10 | Đăng ký toàn bộ trường mới vào Sổ đăng ký trường (ĐP-3). Seed nhãn và hiển thị |

**Test:**

- Tenant: `order_payments`, `order_info_requests`, `order_change_requests`; không ghi được sổ thu của đơn tổ chức khác.
- Ca đọc lại từ DB: 1.000.000đ → cọc 500.000đ → thu 500.000đ → `balance_vnd = 0` → đóng đơn được. Thu thiếu thì không đóng được.
- Đơn vị: SLA, gợi ý ưu tiên, `paymentStatus`.

**Cổng:** cổng chung, cộng Playwright P1→P2 với cả 6 loại đơn.

---

## 8. ĐP-4b — P3–P5

| # | Việc |
|---|---|
| 4b.1 | Hồ sơ đối tác (Đặc tả trường §11.1): địa chỉ theo `StructuredAddress`, năng lực, loại sản phẩm, vùng phục vụ, công suất, giờ làm, `standardLaborCostVnd`, tạm ngưng có lý do. Migration cột `partners` |
| 4b.2 | T06: thẻ ứng viên với công suất còn lại, khớp vùng, khớp năng lực, chỉ số thô (tạm lấy từ lịch sử đơn cho tới khi có T26). **Chưa có AI xếp hạng**, xếp theo luật minh bạch kèm lý do |
| 4b.3 | Form Phân công: `agreedPrice` → `partnerPayoutVnd` nhập **lúc phân công**, `agreedEta`, `overrideReason` bắt buộc khi vượt công suất, `requiresPartnerAcceptance` |
| 4b.4 | **Vết nhập hộ (D3):** `sourceActor`, `reportedVia`, `partnerReportedAt` dùng chung cho mọi bản ghi phía đối tác. Hỗ trợ **video** (tải lên qua `assets`) cho ảnh/video đối tác gửi |
| 4b.5 | T08 Chấp nhận: bước con `PARTNER_PENDING → PARTNER_CONFIRMED` (trong metadata, không thêm giá trị `coordinator_stage`). Từ chối → mở T24 |
| 4b.6 | T09 Câu hỏi đối tác (bảng `partner_questions`) |
| 4b.7 | T10–T12: ETA hiện tại/trước, ghi chú sản xuất, 11 loại sự cố (ánh xạ vào `EXCEPTION_TYPES`, bổ sung khi cần), ảnh theo góc chụp, thay thế đã dùng |
| 4b.8 | T13 Yêu cầu QC, T14 **checklist có cấu trúc** (danh mục tiêu chí, quản trị nền tảng sửa được). `checklist_result` theo cấu trúc Đặc tả trường §7.2. Dữ liệu cũ dạng `Record<string, boolean>` vẫn đọc được |
| 4b.9 | T15: hiển thị `aiCritique` và điểm thành phần **chỉ khi có lượt Vision thật** (nợ #140); quyết định của người, override có lý do |
| 4b.10 | T16 Làm lại (bảng `order_rework_requests`), T17 **Thay sản phẩm** (bảng `order_replacement_requests`, liên kết T24 khi cần đối tác khác, D6) |

**Cổng:** cổng chung, cộng Playwright nhánh QC: làm lại, rồi thay sản phẩm với cùng đối tác, rồi thay sản phẩm với đối tác khác (sinh T24).

---

## 9. ĐP-4c — P6–P7, ngoại lệ, phân tích

| # | Việc |
|---|---|
| 4c.1 | T18 Phiếu giao: tuyến lấy/giao, mốc, hướng dẫn, xử lý đặc biệt. **Số tiền thu hộ** hiện cho shipper, không hiện giá bán |
| 4c.2 | T19 Yêu cầu lấy hàng (bảng `pickup_requests`, trạng thái §8.2) |
| 4c.3 | T20: vị trí, trễ, lý do, lần liên lạc người nhận, ảnh |
| 4c.4 | T21 POD: nhiều ảnh, cách trao, giao thất bại có cấu trúc (lần thử, lý do, người nhận thay, giao lại) |
| 4c.5 | T22 bổ sung: người phụ trách, tác động, ETA mới, bằng chứng, phương án. CTA `ESCALATE` và `REWORK` |
| 4c.6 | T23 Leo thang (bảng `order_escalations`) |
| 4c.7 | T24 **Thay đối tác** (bảng `partner_replacements`), đối tác cũ/mới, chênh chi phí, thông báo |
| 4c.8 | T25: cổng đóng đơn đủ 6 điều kiện, **kể cả `balanceVnd = 0`**; chênh lệch SLA; đánh giá đối tác 5 tiêu chí; phản hồi khách |
| 4c.9 | T26 Hiệu suất đối tác: bảng tổng hợp theo kỳ, **giữ số liệu thô**. Tính bằng job, không tính lúc đọc |
| 4c.10 | T27 Bài học đơn: dùng lại `OrderClosureLearningCard` (đang bị bỏ). Nguyên nhân gốc và mẫu lặp lại do người nhập; AI chỉ gợi ý |
| 4c.11 | Form Huỷ đơn đầy đủ, **hoàn tiền qua sổ thu** (`REFUND`, quyền `R10`) |
| 4c.12 | Trường có điều kiện §12: tang lễ, cưới/sự kiện, doanh nghiệp (`invoiceInfo`), định kỳ, toà nhà. Bật theo hành vi danh mục |

**Cổng:** cổng chung, cộng Playwright P6→P7 (giao thành công, giao thất bại rồi giao lại, huỷ có hoàn tiền) và một ca đọc lại T26 từ DB.

---

## 10. ĐP-5 — Nhận đơn tự động từ M10 và Chat

| # | Việc |
|---|---|
| 5.1 | Thi công `OrderIngestionConnector`: đơn M10 chuyển sang `CONFIRMED` thì tạo `order_coordinations`, mang theo `source = ORDER_M10`, `productId`, snapshot, sổ thu đã có |
| 5.2 | Đơn nháp từ Chat: **chặn** vào Điều phối khi còn giá trị giữ chỗ (SĐT `0900000000`, "Nhận tại cửa hàng", lời thiệp mặc định) cho tới khi Sales xác nhận. Sửa `convert-chat-to-draft-order.ts` để không tự điền các giá trị này nữa |
| 5.3 | Chống trùng: một `orders.id` chỉ có một hồ sơ điều phối (đã có `@unique`); gọi lại thì không lỗi |

---

## 11. ĐP-ĐC — Địa chỉ hai cơ chế song song (bị chặn)

**Cổng vào:** PO chọn Phương án 1 hoặc 2 (Đặc tả trường §15.3) **và** chốt nguồn dữ liệu quy đổi đơn vị hành chính cũ ↔ mới.

Khi đã có quyết định:

- Bảng tra `admin_unit_mappings` cấp nền tảng. Quản trị nền tảng cập nhật được trên Console (theo nguyên lý D12).
- Hàm thuần `normalizeAddress()` và `formatAddress()` duy nhất.
- Form hai cơ chế, có danh sách ứng viên khi một đơn vị mới ứng với nhiều đơn vị cũ.
- Migration chuyển dữ liệu nếu chọn Phương án 2.
- Áp cho địa chỉ giao **và** địa chỉ đối tác.

---

## 12. Rủi ro và cách chặn

| Rủi ro | Mức | Cách chặn |
|---|---|---|
| Cấu hình nền tảng làm hỏng luật nghiệp vụ (ẩn trường bắt buộc, tắt giá trị đang dùng) | **Critical** | Tách lớp mã và lớp cấu hình; mức sàn cắt sau cùng; `check:field-registry`; test mức sàn trong `tests/platform` |
| Rò dữ liệu xuyên tổ chức qua ghi đè hoặc trường tự tạo | **Critical** | Giá trị nằm trên dòng tenant (`organization_id`); ghi đè có `organization_id`; ca thử cách ly riêng |
| Rò giá bán hoặc PII ra đối tác/shipper | High | `projectForAudience` là cửa duy nhất sinh view/copy/PNG cho bên ngoài; test chụp nội dung |
| Trường tự tạo phình to, làm chậm | Medium | Giới hạn §6.4; bộ nhớ đệm cấu hình theo `version` |
| Lệch `paid_vnd`/`balance_vnd` | High | Chỉ `record-payment` được ghi; ràng buộc CHECK ở DB; ca đọc lại từ DB |
| Đơn cũ vỡ khi đổi cấu trúc `order_items` và địa chỉ | High | Tầng trình bày đọc cả dạng cũ; không sửa dữ liệu cũ ở ĐP-1/ĐP-2 |
| `tsc` đỏ sau khi thêm model | Thấp | Là lỗi CHỜ `prisma generate` (mục 2.10) |
| Khối việc lớn, dễ trôi phạm vi | Medium | Mỗi giai đoạn một cổng; PO duyệt từng giai đoạn; bảng trạng thái của Đặc tả trường là thước đo tiến độ |

---

## 13. Thước đo hoàn thành

- **Đặc tả trường §18:** số vị trí `CHƯA XÂY` và `MỘT PHẦN` giảm về 0 cho các nhóm thuộc giai đoạn đã xong. Ngoại lệ có ghi lý do: trường AI chờ năng lực thật (nợ #140), bộ lọc trường tự tạo.
- **Hợp đồng MI §11:** 10/10 tiêu chí đạt sau ĐP-2.
- **Đặc tả trường §13 (mức tối thiểu để bán được):** 8/8 câu hỏi trả lời được sau ĐP-4c.
- **Quản trị nền tảng:** sửa được nhãn, hiển thị, bắt buộc và danh mục của **mọi** trường đã xây, và tạo được trường mới, mà không cần sửa code. Kiểm bằng kịch bản Playwright ở §6.5.

---

## 14. Việc cần PO làm để bắt đầu

1. **Duyệt ĐP-1 và ĐP-2.** Không migration, không chờ quyết định nào. Có thể bắt đầu ngay.
2. **Duyệt ĐP-3.** Có migration bảng nền tảng. Nên chạy song song với ĐP-2.
3. **Q-ĐC:** chọn phương án địa chỉ và nguồn dữ liệu quy đổi. Chỉ chặn ĐP-ĐC.
4. Duyệt ĐP-2b, ĐP-4a/4b/4c và ĐP-5 lần lượt, khi giai đoạn trước qua cổng.
