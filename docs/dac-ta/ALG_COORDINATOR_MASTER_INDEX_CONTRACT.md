# HỢP ĐỒNG MASTER INDEX × ĐIỀU PHỐI (CHỨC NĂNG 12)

> **Mã định danh:** `DOC-03-COORD-MI-CONTRACT`
> **Trạng thái:** `CANONICAL` (Level 3). Là nguồn duy nhất cho **ranh giới dữ liệu** giữa Product/Customer Master Index và Điều phối, và cho **danh mục nâng cấp Master Index** mà Điều phối cần.
> **Phiên bản:** 2.4 (26/09/2026 đêm: ĐP-2 thi công xong — MI-3, MI-4, MI-5, MI-6 XONG; §5 (Snapshot) và §9 tiêu chí #2/#3/#9 chuyển ✅; §6 (Override) có bản tối thiểu cho BOM cành hoa — xem `KE_HOACH_DIEU_PHOI_TRUONG_DU_LIEU.md` §3, mục ĐP-2). Bản 2.3 (26/09/2026 tối: MI-1, MI-2 XONG (ĐP-1.5/1.6); tiêu chí #10 (không bịa dữ liệu) đạt (ĐP-1.4)). Bản 2.2 (26/09/2026: admin = quản trị nền tảng; mọi trường do quản trị nền tảng sửa được). Bản 2.1 (26/09/2026): MI-12 đã duyệt, cấu hình hiển thị trường, phân vai thanh toán. Bản 2.0 (26/09/2026) là bản chuẩn hoá theo mã nguồn.
> **Hợp nhất từ:** `FLORAOS_COORDINATOR_CANONICAL.md` v1.0, `FLORAOS_MASTER_INDEX_COORDINATOR_UPGRADE_REPORT.md` và phần nguyên tắc của `FLORAOS_COORDINATOR_TEMPLATE_FORM_FIELDS_SYNCHRONIZED_WITH_MASTER_INDEX.md` v1.0. Bản gốc lưu ở `docs/archive/merged/`.
> **Đi cùng:** [`ALG_COORDINATOR_FIELD_SPEC.md`](ALG_COORDINATOR_FIELD_SPEC.md) (tên và trạng thái từng trường).

---

## 1. Thứ bậc nguồn sự thật

ALG Core có **đúng 2** Master Index chính thức: **Product Master Index** (M01/M02) và **Customer Master Index** (M09/CRM). Điều phối **không** tạo Master Index thứ ba. Đối tác thuộc miền `partners`; đơn hàng thuộc miền giao dịch.

```text
PRODUCT MASTER INDEX ──► định danh · phong cách · ảnh · BOM · chính sách thay thế
        │
        ▼  (chụp lúc chọn mẫu)
ĐƠN ĐIỀU PHỐI (snapshot) ──► Lập kế hoạch → Đối tác → Sản xuất → QC → Giao/POD → Đóng → Học lại
        ▲
        │  (tham chiếu customerId)
CUSTOMER MASTER INDEX ──► định danh · hạng · sở thích · đồng ý liên lạc
```

Master Index chỉ được mở rộng khi trường mới là **thuộc tính dùng lại được, xuyên module** của sản phẩm/khách hàng, hoặc là một cột DB đã rõ ràng thuộc khái niệm master đó.

---

## 2. Hai trục phân loại trường

**Trục sở hữu** (trường sống ở đâu):

| Giá trị | Nghĩa |
|---|---|
| `MASTER` | Đọc từ Product/Customer Master Index. Điều phối không lưu bản sao để dùng như nguồn |
| `ORDER-SNAPSHOT` | Chụp từ Master Index lúc tạo đơn, để giữ đúng thứ đã hứa khi master thay đổi về sau. Không sửa được, trừ khi qua quy tắc override (§6) |
| `ORDER-OWNED` | Chỉ thuộc về đơn/giao dịch |
| `DERIVED` | Tính từ dữ liệu nguồn, không nhập tay |
| `EVIDENCE` | Bằng chứng phát sinh khi thực hiện (ảnh, POD, kết quả QC) |
| `ANALYTICS` | Suy ra sau khi đơn xong. Không bao giờ ghi đè dữ liệu nguồn |

**Trục người nhập** (ai tạo ra giá trị): `SYSTEM` · `AI` · `HUMAN` · `PARTNER` · `CUSTOMER` · `DERIVED`. Trục này lấy theo Template Architecture.

Hai trục **độc lập** với nhau. Một trường phải mang đủ cả hai. Ví dụ: `recipientPhone` là `ORDER-OWNED` + `HUMAN`; `aiScore` là `EVIDENCE` + `AI`.

---

## 3. Neo Master Index (tên theo code)

### 3.1. Product Master Index (`src/modules/products/domain/product-master-index.ts`)

Điều phối **dùng lại** các trường sau, và không định nghĩa lại cấu trúc của chúng:

| Nhóm | Trường |
|---|---|
| Định danh | `id` · `code` · `name` · `status` (DRAFT · ACTIVE · PAUSED · ARCHIVED) |
| Dáng & phong cách | `category` · `shape` · `facing` · `container?` · `style` · `occasions[]` |
| Hình ảnh | `masterImageUrl?` · `galleryImages[]` (vai trò: GALLERY · CATALOG · SOCIAL) · `colorPalette.primaryColor` · `colorPalette.secondaryColor?` |
| BOM nguyên tử | `bom.flowers[]` (`FlowerBomItem`) · `bom.foliage[]` (`FoliageBomItem`) · `bom.wrapping[]` (`WrappingLayer`) · `bom.wrapStyle` · `bom.ribbon` · `bom.accessories[]` (`AccessoryBomItem`) · `bom.tierCount?` |
| Thương mại | `pricing.quotePriceVnd` (được phép `null`) · `pricing.costPriceVnd?` (**bảo mật nội bộ**) |
| Biến thể & tồn kho | `variants[]` · `stock?` |
| Bổ sung | `freshnessGuaranteeDays?` · `warningTags[]` · `dimensions?` (`heightCm`, `widthCm`) · `substitutionPolicy?` (`allowed`, `note?`) |

Cấu trúc nguyên tử của BOM (code hiện hành):

- `FlowerBomItem`: `flowerName`, `quantity`, `unit` (bông · cành · lá · cây), `color`, `role` (Chủ đạo · Phụ · Điểm xuyến · Lấp đầy), `shade?`, `budCount?`, `damagedCount?`
- `FoliageBomItem`: `name`, `quantity` (được phép `null`), `unit`, `color`, `role` (Nền · Viền · Điểm nhấn · Lấp đầy)
- `WrappingLayer`: `layer`, `material`, `color`, `texture`
- `AccessoryBomItem`: `name`, `material`, `color`, `quantity` (được phép `null`), `printedText` (được phép `null`)

**Projection hiện có:** `projectFloristTicket`, `projectDeliveryReceipt`, `projectOrderLineItem`. Cả ba **chưa có nơi gọi** trong `src/`. Không có projection "Sales" riêng cho sản phẩm.

### 3.2. Customer Master Index (`src/modules/crm/domain/customer-master-index.ts`)

| Nhóm | Trường |
|---|---|
| Định danh | `id` · `code` · `name` · `phone` · `email?` · `address?` (**chuỗi tự do**) · `notes?` · `tags[]` |
| Chỉ số | `metrics.tier` · `metrics.totalSpentVnd` · `metrics.orderCount` · `metrics.lastOrderAt?` · `metrics.aovVnd` |
| Sở thích | `preferences.preferredFlowers[]` · `preferences.preferredColors[]` |
| Dịp | `occasions[]`: `name`, `date`, `isRecurring`, `reminderDaysBefore`, `recipientName?`, `notes?` |
| Đồng ý liên lạc | `consents[]`: `channel`, `granted`, `grantedAt` |
| Voucher | `availableVouchers[]`: `code`, `discountType`, `discountValue`, `expiresAt?` |

**Projection hiện có:** `projectCustomerSalesCard`, `projectOccasionReminder` (đang được dùng ở `scan-upcoming-reminders.ts`), `projectMarketingAudience`.

---

## 4. Trường thuộc về Đơn (không đưa vào Master Index)

Định danh/nguồn/ưu tiên/mức dịch vụ của đơn · người nhận · dữ liệu dịp của riêng đơn · địa chỉ giao có cấu trúc · khung giờ và mốc giao · cam kết với khách · mốc kế hoạch (`productionDeadlineAt`, `pickupTargetAt`, ETA) · phân công, chấp nhận, câu hỏi của đối tác · tiến độ, sự cố, hoàn thành sản xuất · yêu cầu, checklist, kết quả QC · làm lại, thay thế · lấy hàng, giao, POD · sự cố, leo thang · đóng đơn · tiền công đối tác của từng đơn · lý do trễ · quyết định thay thế cấp đơn · bài học của đơn.

Lý do: đây là **sự việc xảy ra với một giao dịch cụ thể**, không phải thuộc tính lâu dài của sản phẩm hay khách hàng.

---

## 5. Quy tắc Snapshot

Khi đơn dùng một sản phẩm của Product Master Index, Điều phối lưu **bản chụp bất biến** phần quy cách đã dùng để sản xuất.

**Nơi lưu (không cần migration):** mỗi sản phẩm là **một** dòng `order_items`, gồm:

- `order_items.product_id`: ID sản phẩm.
- `order_items.quantity`: số lượng sản phẩm.
- `order_items.metadata`: bản chụp.

Comment trong schema của cột `metadata` đã ghi đúng ý định này.

**Nội dung bản chụp (mục tiêu):** `productId` · `code` · `name` · `category` · `style` · `colorPalette` · ảnh tham chiếu · `bom` (đủ 4 nhóm) · `tierCount` · `substitutionPolicy` · `dimensions` · `warningTags` · bối cảnh giá đã báo · `masterUpdatedAt` (phiên bản master đã dùng, cần MI-3) · `capturedAt`.

Bản chụp **không phải** Product Master thứ hai. Nó là bằng chứng bất biến của đơn.

**Loại trừ khỏi bản chụp:** `pricing.costPriceVnd` (giá vốn nội bộ).

**Hiện trạng (26/09/2026 đêm): ĐÃ THI CÔNG (ĐP-2.5/2.6/2.7).**

- `createCoordinatorOrder` nhận `productId` tuỳ chọn; có thì gọi `DirectMasterIndexConnector.getProductMasterIndex(ctx, productId)` (nay đọc thật `ProductMasterIndexRepository`, không còn trả `null`), rồi `projectCoordinatorSnapshot(product, now)` dựng đúng bản chụp mô tả ở trên — **không** có `costPriceVnd`.
- Đúng **một** dòng `order_items` cho mỗi đơn (không phải mỗi loại hoa một dòng nữa): `product_id`, `quantity = 1`, `metadata = { flowers, sampleImageUrl, product: <snapshot>, overrides }`.
- Form tiếp nhận (`sales-order-intake-modal.tsx`) giữ `productId` khi chọn mẫu nhanh; không còn nhồi `wrapStyle`/`ribbon` vào ghi chú nội bộ — hiện lá/gói/phụ kiện đúng cấu trúc (chỉ đọc).
- View trả về `productId`, `product` (snapshot), `foliage[]`, `wrapping[]`, `accessories[]`, `substitutionPolicy`, `referenceImageUrls[]` — `null`/rỗng khi đơn không chọn mẫu từ danh mục (đơn mẫu ngoài danh mục, hoặc đơn tạo trước ĐP-2).
- Đơn mẫu ngoài danh mục (không có `productId`) vẫn tạo được — chỉ có BOM nhập tay trong `metadata.flowers`, không có snapshot.
- Luồng M10 (`modules/orders`) và luồng Chat → đơn nháp thì đã ghi `product_id` từ trước, không đổi.

---

## 6. Quy tắc Override

Đơn được phép ghi đè: số lượng · cỡ/biến thể · màu/tone · lời thiệp · yêu cầu giao · quyết định thay thế · ảnh tham chiếu được chọn · số lượng từng dòng BOM.

Mỗi lần ghi đè phải có đủ 6 yếu tố:

1. Chỉ ra giá trị nguồn trong master.
2. Ghi giá trị mới của đơn.
3. Ghi ai sửa.
4. Ghi khi nào.
5. Ghi lý do (khi thay đổi đáng kể).
6. Giữ nguyên giá trị master ban đầu.

**Hiện trạng (26/09/2026 đêm): BẢN TỐI THIỂU ĐÃ THI CÔNG (ĐP-2.8)** — chỉ cho **BOM cành hoa** (`bom.flowers[].quantity/unit/color`, cộng thêm/bớt cả loài), qua hàm thuần `diffAgainstSnapshot` (`domain/order-overrides.ts`), so lúc tạo đơn và ghi vào `order_items[0].metadata.overrides[]`. Đủ 4/6 yếu tố bắt buộc (giá trị master, giá trị đơn, ai, khi nào) — **chưa có lý do** (không có ô nhập lý do lúc tạo đơn) và chỉ so **một lần lúc tạo**, không theo dõi sửa sau đó. Các trường ghi đè khác của danh sách đầu mục này (cỡ/biến thể, màu/tone card, yêu cầu giao, quyết định thay thế, ảnh tham chiếu) **chưa có** cơ chế override — vẫn dùng `audit()` chung. Bản đầy đủ (đa điểm sửa, có lý do, qua T04 Order Change Request) làm ở ĐP-4a (xem Đặc tả trường, §3.4).

---

## 7. Quy tắc thương mại

1. `pricing.quotePriceVnd` **không phải** giá niêm yết tĩnh. Giá này được phép `null` theo quyết định ngày 17/09 (nợ #87); giá bán thật đi qua `quotePrice()` gắn với từng lượt tư vấn hoặc đơn. Điều phối **không được** yêu cầu giá master khác `null`. Giá bán thật của đơn (`unitPriceVnd`) thuộc về giao dịch.
2. Mọi nơi hiển thị giá `null` phải hiện "Liên hệ để báo giá". Không coi `null` là 0đ.
3. View dành cho đối tác **không được** chứa trường nhạy cảm thương mại (giá bán, giá vốn, hạng VIP của khách) nếu không có cho phép rõ ràng. Quy tắc áp dụng cho **mọi dạng xuất**.
   **Vi phạm đang tồn tại:** ảnh PNG của `PartnerProductCard` (T07) in ô "Giá bán khách". Sửa ở Giai đoạn 1.

### 7.1. Cấu hình hiển thị và quản trị trường (PO 26/09/2026)

- Mọi trường được hiển thị mặc định với nội bộ tiệm.
- **Quản trị nền tảng ALG** (không phải chủ tiệm) sửa được mọi trường đã xây và mọi danh mục giá trị trên Console Vận hành: nhãn, mô tả, thứ tự, hiển thị theo **đối tượng xem** (nội bộ, đối tác, shipper, khách), mức yêu cầu, tham số hành vi, giá trị danh mục. Phạm vi áp dụng là toàn nền tảng hoặc riêng từng tổ chức.
- Quản trị nền tảng **tạo được trường mới** (Đặc tả trường §16.3). Trường tự tạo gắn vào đơn là dữ liệu giao dịch, **không** tự động thành trường của Master Index.
- Nguyên lý này áp dụng cho **cả các trường Master Index** mà Điều phối hiển thị, kể cả các trường BOM mới của MI-12. Chỉ lớp **hiển thị/nhãn** sửa được. Cấu trúc dữ liệu của Master Index vẫn chỉ đổi qua code.
- Mức sàn không tắt được:
  - `costPriceVnd` chỉ hiển thị nội bộ.
  - Trường nhạy cảm thương mại mặc định ẩn với đối tác/shipper. Admin bật lên được, và việc bật có ghi vết (đây là "cho phép rõ ràng" của mục 3).

Chi tiết ở Đặc tả trường §16.1–§16.2.

### 7.2. Thanh toán (PO 26/09/2026)

- Tiền **trả trước** thuộc Đơn hàng. Phần **còn phải thu** do Điều phối thu.
- Đơn luôn ghi `totalVnd`, `paidVnd` và `balanceVnd` (Đặc tả trường §2.14).
- Thanh toán là **dữ liệu giao dịch**, không đưa vào Master Index.
- Shipper chỉ thấy số tiền thu hộ, không thấy giá bán.

---

## 8. Quy tắc tương thích với hệ thống hiện tại

1. `ProductMasterIndex.pricing.quotePriceVnd` được phép `null` (§7).
2. `ProductMasterIndex.stock` có thể `undefined` vì tổ chức chưa cấu hình tồn kho. Điều phối phải xử lý trạng thái này rõ ràng, **không** suy ra "còn hàng".
3. `ProductMasterIndex.variants[]` hiện rỗng theo thiết kế (bảng `product_variants` chưa được nối). Mảng rỗng không có nghĩa là sản phẩm không bao giờ có biến thể.
4. `CustomerMasterIndex.address` là chuỗi tự do. Nó **không phải** địa chỉ giao có cấu trúc `StructuredAddress` của Điều phối.
5. Hạng khách là `metrics.tier`. Khi đơn có `customerId`, máy chủ phải lấy hạng từ Customer Master Index. Hạng do client gửi lên chỉ dùng cho khách lẻ (không có `customerId`).
6. `CustomerMasterIndex.occasions[].recipientName` là khái niệm "người nhận quen" duy nhất hiện có, và chỉ được dùng để **gợi ý** người nhận. Không tạo thực thể người nhận trong Customer Master nếu CRM chưa có yêu cầu riêng.
7. Tên trường theo code: `customerId` (không phải `buyerCustomerId`), `customerName`, `productTitle`, `unitPriceVnd`, `partnerPayoutVnd`.

---

## 9. Danh mục nâng cấp Master Index

Mọi hạng mục P0/P1 **không cần migration DB**.

| Mã | Hạng mục | Lý do | Migration | Ưu tiên | Trạng thái |
|---|---|---|---|---|---|
| MI-1 | CMI: thêm `consents[].revokedAt` (từ `customer_consents.revoked_at`) | Giữ lịch sử đồng ý/thu hồi trước khi gửi Zalo/SMS | Không | P0 | **XONG (ĐP-1.5, 26/09/2026)** |
| MI-2 | CMI: voucher thêm `minOrderVnd`, `maxDiscountVnd`; `availableVouchers` chỉ gồm voucher `is_used = false` và chưa hết hạn; lịch sử dùng (`usedAt`, `orderId`) tách thành danh sách riêng nếu cần | "Voucher khả dụng" hiện có thể chứa voucher đã dùng | Không | P0 | **XONG (ĐP-1.6, 26/09/2026)** — lịch sử `usedAt`/`orderId` riêng chưa làm, ghi nợ |
| MI-3 | PMI + CMI: thêm `updatedAt` (lấy từ cột có sẵn) làm phiên bản cho snapshot | Điều kiện tiên quyết của §5 | Không | P1 | **XONG (ĐP-2.1, 26/09/2026)** |
| MI-4 | PMI: thêm vai trò ảnh `REFERENCE` (ảnh mẫu thiết kế đã duyệt, dùng cho thợ và QC) | T07, AI QC cần ảnh chuẩn để so. Cột `product_images.role` là chuỗi | Không | P1 | **XONG kiểu dữ liệu + đường đọc (ĐP-2.2, 26/09/2026)** — chưa có màn thao tác "Đặt làm ảnh mẫu tham chiếu" (không tìm thấy màn duyệt ảnh sản phẩm nào ghi `product_images` trong `src/` để gắn vào; ghi nợ riêng) |
| MI-5 | PMI: thêm projection `projectCoordinatorSnapshot(product)` làm nơi duy nhất quyết định trường nào đi vào đơn, và loại `costPriceVnd` | Thay cho việc form tự chép từng trường | Không | P1 | **XONG (ĐP-2.3, 26/09/2026)** |
| MI-6 | CMI: chuyển `extractCustomerCoordinationBrief` từ Điều phối về CMI thành `projectCustomerCoordinationBrief`, và bỏ giá trị mặc định bịa | Đúng nguyên tắc projection | Không | P1 | **XONG (ĐP-2.4, 26/09/2026)** |
| MI-7 | Ghi rõ projection nào dùng cho module nào (§3) | Tránh mỗi nơi tự hiểu một kiểu | Không | P1 | Đã làm trong tài liệu này |
| MI-8 | Chính sách thay thế có cấu trúc **cấp sản phẩm** (loài/nhóm được thay, giới hạn giá trị tối thiểu). Cờ cấp từng dòng BOM đã chuyển sang MI-12 | Chuỗi thay thế của Đặc tả trường §14. Thực tế: tiệm thay bằng vật liệu cùng hoặc cao hơn giá trị, giữ thiết kế, tone màu và giá | Không (nằm trong `products.attributes`) | P2 | Chờ PO định nghĩa quy tắc |
| MI-9 | CMI: `companyName`, `taxCode`, `billingAddress` để **điền sẵn** thông tin xuất hoá đơn | Thông tin hoá đơn được ghi **theo từng đơn** (`invoiceInfo`, ORDER-OWNED, theo thực tế các tiệm), nên MI-9 chỉ là tiện ích điền sẵn. `business_profiles.tax_code` là của **tiệm** | **Có** (thêm cột `customers`) | P2 | Không chặn việc khác |
| MI-10 | PMI: độ khó, thời gian cắm chuẩn, yêu cầu bảo quản | Lập kế hoạch và định giá công. Lưu ý `order_assignments.difficulty` đã có ở cấp đơn | Chưa rõ | P2 | Chờ có số đo ổn định |
| MI-11 | `product_variants.attributes` | Có thể chứa thuộc tính biến thể dùng khi chọn sản phẩm | — | Theo dõi | Chỉ khảo sát |
| MI-12 | Mở rộng BOM nguyên tử: `FlowerBomItem.variety`, `stemLengthCm`, `substitutionAllowed`, `substitutionPriority`; `FoliageBomItem.substitutionAllowed`; `WrappingLayer.pattern`, `quantity`, `substitutionAllowed`; `AccessoryBomItem.unit`, `substitutionAllowed`. Tất cả **tuỳ chọn** (dữ liệu cũ vẫn hợp lệ) và **đều hiển thị**; admin cấu hình hiển thị theo §7.1 | Đặc tả trường yêu cầu ở T01/T07/T14/T15. Theo §3.1, không được định nghĩa riêng trong Điều phối | Không (BOM nằm trong JSON). Cần cập nhật form duyệt sản phẩm M01b và hợp đồng Vision | P1 | **ĐÃ DUYỆT 26/09/2026**, chờ thi công |

---

## 10. Không đồng bộ vào Master Index

Vòng đời đơn, mốc giao, hạn sản xuất, phân công đối tác, trạng thái sản xuất, kết quả QC, ảnh thành phẩm, POD, sự cố, leo thang, thay đối tác, đóng đơn, tiền công của từng đơn, lý do trễ, quyết định thay thế cấp đơn, người nhận của đơn, địa chỉ giao của đơn, lời thiệp của đơn, số tiền của đơn và bài học của đơn đều là **dữ liệu giao dịch**. Đưa các trường này vào Master Index sẽ xoá nhoà ranh giới nguồn sự thật.

---

## 11. Tiêu chí nghiệm thu

| # | Tiêu chí | Hiện trạng 26/09/2026 đêm |
|---|---|---|
| 1 | Ô chọn khách hàng trả về ID của Customer Master Index | ✅ (ĐP-2.9) Ô tìm khách trong `sales-order-intake-modal.tsx` (`GET /crm/customers?search=`), chọn thì khoá tên/SĐT/hạng — máy chủ vẫn tự lấy lại từ CMI, bỏ qua giá trị client |
| 2 | Ô chọn sản phẩm trả về ID của Product Master Index | ✅ (ĐP-2.6/2.10) Chọn mẫu nhanh giữ `productId`, sửa BOM sau đó không mất ID |
| 3 | BOM dùng đúng cấu trúc nguyên tử hiện hành | ✅ (ĐP-2.7/2.12) Snapshot đủ 4 nhóm (`flowers`/`foliage`/`wrapping`/`accessories`); T07 hiện `shade`/`budCount` khi đơn có snapshot. Đơn mẫu ngoài danh mục vẫn không có hai trường này — đúng thực trạng, không suy đoán |
| 4 | Ảnh dùng lại vai trò master/gallery | ⚠️ `REFERENCE` đã có trong kiểu dữ liệu và snapshot (`referenceImageUrls`), nhưng chưa có màn thao tác gắn vai trò này cho ảnh (xem ghi nợ MI-4 ở §9) |
| 5 | Chính sách thay thế được kế thừa, rồi override có audit | ⚠️ Kế thừa xong (`substitutionPolicy` có trong snapshot/view) — override có audit CHỈ có cho BOM cành hoa (§6, bản tối thiểu), chưa có cho chính sách thay thế |
| 6 | Không form nào tạo bản ghi master thứ hai | ⚠️ Tên/hạng/SĐT khách vẫn lưu một bản trong `order_coordinations.metadata` (đúng thiết kế ORDER-SNAPSHOT §2) — nhưng từ ĐP-2.9, bản này LUÔN lấy từ CMI khi có `customerId`, không còn nhận giá trị client tự gõ rồi trôi dạt khỏi CMI |
| 7 | Trường của đơn nằm trong kho đơn/điều phối | ✅ |
| 8 | Năng lực Master Index còn thiếu được theo dõi | ✅ §9 |
| 9 | Cổng Master Index của Điều phối chạy thật | ✅ (ĐP-2.5, 26/09/2026) `DirectMasterIndexConnector` gọi thật `ProductMasterIndexRepository`/`CustomerRepository` theo `TenantContext` |
| 10 | Không có dữ liệu bịa khi thiếu nguồn | ✅ (ĐP-1.4, 26/09/2026) `master-index-adapter.ts` hết bịa "Lá đệm theo mùa"/"Giấy gói cao cấp"/"Thiệp chúc mừng"/"Khách hàng thân thiết" — thiếu thì trả rỗng |

Không trường mồ côi. Không Master Index trùng. Không dùng chữ tự do thay cho dữ liệu vận hành có cấu trúc.

---

## 12. Nguồn đối chiếu (mã nguồn, 26/09/2026 đêm)

`src/modules/products/domain/product-master-index.ts` (thêm `updatedAt`, `REFERENCE`, `projectCoordinatorSnapshot`) · `src/modules/products/infra/product-master-index-repository.ts` · `src/modules/crm/domain/customer-master-index.ts` (thêm `updatedAt`, `projectCustomerCoordinationBrief`) · `src/modules/crm/infra/customer-repository.ts` · `src/modules/coordinator/use-cases/create-coordinator-order.ts` · `src/modules/coordinator/connectors/master-index-connector.ts` (thi công thật) · `src/modules/coordinator/domain/master-index-adapter.ts` · `src/modules/coordinator/domain/order-overrides.ts` (mới — `diffAgainstSnapshot`) · `src/modules/coordinator/use-cases/present-coordinator-order.ts` · `src/modules/coordinator/contracts/order-view.ts` · `src/modules/coordinator/adapters/http-schemas.ts` (`productId`, `DemUnit`/vai trò hoa) · `src/modules/coordinator/infra/coordinator-repository.ts` (`order_items.product_id`) · `src/components/templates/coordinator/sales-order-intake-modal.tsx` (ô chọn khách, giữ `productId`) · `src/components/templates/coordinator/partner-product-card.tsx` · `src/components/templates/coordinator/partner-production-card.tsx` · `src/components/coordinator/control-tower-dashboard.tsx` · `prisma/schema.prisma` (`order_items`, `order_coordinations`, `product_images`, `customer_consents`, `vouchers`, `business_profiles`).
