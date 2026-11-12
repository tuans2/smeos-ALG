# ĐẶC TẢ TRƯỜNG DỮ LIỆU TEMPLATE & FORM — ĐIỀU PHỐI (CHỨC NĂNG 12)

> **Mã định danh:** `DOC-03-COORD-FIELD-SPEC`
> **Trạng thái:** `CANONICAL` (Level 3). Là nguồn duy nhất cho **tên trường, quyền sở hữu và trạng thái thi công** của các template T01–T27 và form vận hành của Điều phối.
> **Phiên bản:** 2.9 (26/09/2026: ĐP-2b — MI-12 mở rộng BOM nguyên tử thi công xong. `FlowerBomItem` thêm `variety`/`stemLengthCm`/`substitutionAllowed`/`substitutionPriority`; `FoliageBomItem`/`AccessoryBomItem`/`WrappingLayer` thêm `substitutionAllowed`; `WrappingLayer` thêm `pattern`/`quantity`; `AccessoryBomItem` thêm `unit` — tất cả optional trong `product-master-index.ts`, đọc từ `product_analyses.edited`/`.raw` qua các khoá Vision mới (`bien_the`/`chieu_dai_cm`/`duoc_thay_the`/`thu_tu_uu_tien_thay_the`/`hoa_van`/`so_luong`/`don_vi`) ở `product-master-index-repository.ts`; `workers/vision/contracts/Schema.json` thêm 9 khoá nullable-bắt-buộc (AI điền khi nhận diện được, để null khi không, KHÔNG ĐOÁN); zod `Atomic*BomItemSchema`/`AtomicWrappingLayerSchema` ở `coordinator/contracts/common.ts` cập nhật khớp (giữ `tsc` conformance xanh); hiện thêm ở M01a (`analysis-schema-mapper.ts`, theo đúng quy tắc "mọi trường Schema.json đều lên UI") và T01/T07 (chỉ khi đơn có `productId` — snapshot MI-5 truyền qua tham chiếu, không cần sửa `projectCoordinatorSnapshot`). **Ghi nợ tường minh:** M01b (`/duyet`, `/tai-anh`) chỉ HIỆN các trường mới ở dạng chuỗi tổng hợp (giống hệt `color`/`role`/`shade` đã có từ trước) — form chỉnh sửa hiện tại (`ResultFieldItem`/`handleItemChange1`) chỉ nhận 3 trường name/unit/quantity qua ô nhập, chưa có ô nhập riêng cho 9 trường MI-12 hay cho `color`/`role`/`shade` sẵn có; T01 (Sales gõ tay, không chọn mẫu) vẫn chỉ nhận 5 trường BOM cũ, chưa nhận variety/stemLength/substitution* (đúng giới hạn đã ghi ở D5/§2.7 từ trước, chưa mở rộng). Bản 2.8 (26/09/2026: ĐP-3.16 — nối `applyCustomFields`/gate chuyển bước `requiredAtStage`/`projectForAudience` vào luồng đơn THẬT cho entity `ORDER`: tạo đơn nhận `customFields`, route mới `PATCH /coordinator/orders/:id/custom-fields` sửa sau, form nhập T01 (Sales Intake) qua `<CustomFieldsSection>`, hiển thị lọc theo đối tượng PARTNER ở thẻ T02/T07. ĐP-3 khép kín hoàn toàn ở mức "hạ tầng dùng chung + 1 form đại diện + 2 thẻ hiển thị" — CÒN LẠI (ghi nợ tường minh): entity `PARTNER`, các template khác (T04/T06/T10/T24…), màn SHIPPER-facing T18 không tồn tại trong mã, IMAGE/FILE/STRUCTURED_ADDRESS chưa có ô nhập, SELECT/MULTI_SELECT chưa đọc danh mục thật — xem §16.2/§16.3). Bản 2.7 (26/09/2026 khuya muộn: ĐP-3.15 Console UI thi công xong — `/van-hanh/truong-du-lieu` 4 tab (Trường lõi · Trường tự tạo · Danh mục · Ghi đè theo tổ chức), xác nhận-có-diff mọi thao tác ghi, xem-trước theo tổ chức; sửa nợ API trả camelCase đúng quy ước thay vì dòng Prisma thô; thêm 2 tuyến đọc phụ trợ. **Nối trường tự tạo vào use-case tạo đơn/17 template thật (3.16) CHƯA LÀM** — xem §16.2). Bản 2.6 (26/09/2026 khuya: ĐP-3 backend thi công xong — nền quản trị trường: `field_definitions`/`field_catalogs`/`field_catalog_values`/`field_config_overrides`, năng lực `N12`, trường tự tạo (`custom_fields` JSON), 6 module miền + 9 use-case + 6 tuyến API + 9 tệp test; xem `KE_HOACH_DIEU_PHOI_TRUONG_DU_LIEU.md` §4 mục ĐP-3 và §16.2/§16.3 cập nhật. Bản 2.5 (26/09/2026 đêm: ĐP-2 thi công xong — nhóm O-PRD/O-FOL/O-WRP/O-ACC, `substitutionPolicy`, `unit`/`role` BOM cành hoa, T07 foliage/wrapping/accessories chuyển CÓ/MỘT PHẦN, xem `KE_HOACH_DIEU_PHOI_TRUONG_DU_LIEU.md` §3 mục ĐP-2; thống kê §18 cập nhật 90 CÓ · 67 MỘT PHẦN, tổng vẫn 807). Bản 2.4 (26/09/2026 tối: ĐP-1 thi công xong — 1.2/1.3/1.7 chuyển trạng thái CÓ/ĐỔI TÊN; thống kê §18 cập nhật 70 CÓ · 82 MỘT PHẦN). Bản 2.3 (26/09/2026: quản trị nền tảng được tạo trường hoàn toàn mới, §16.3; kế hoạch thực thi ở `docs/kien-truc/KE_HOACH_DIEU_PHOI_TRUONG_DU_LIEU.md`). Bản 2.2 (26/09/2026): admin = quản trị nền tảng, mọi trường và danh mục sửa được trên Console Vận hành (§16.2). Bản 2.1 (26/09/2026) bổ sung các quyết định PO D2/D3/D5/D6/D7 và danh mục giá trị §2.15. Bản 2.0 (26/09/2026) là bản chuẩn hoá theo mã nguồn.
> **Thay thế:** `FLORAOS_COORDINATOR_TEMPLATE_FIELD_SPEC_PRODUCTION_READY.md` v1.0 và `FLORAOS_COORDINATOR_TEMPLATE_FORM_FIELDS_SYNCHRONIZED_WITH_MASTER_INDEX.md` v1.0. Bản gốc lưu ở `docs/archive/merged/`.
> **Đi cùng:** [`ALG_COORDINATOR_MASTER_INDEX_CONTRACT.md`](ALG_COORDINATOR_MASTER_INDEX_CONTRACT.md), nơi quy định ranh giới Master Index ↔ Đơn.

---

## 0. Cách đọc

**Mã nguồn thắng tài liệu** (Hiến pháp tài liệu §2, quy tắc 2). Khi đặc tả gốc đặt tên khác với code, cột *Tên chuẩn* ghi tên theo code. Trường chưa có trong code thì đặt tên đề xuất theo quy ước của code: camelCase, tiền có hậu tố `Vnd`, mốc thời gian có hậu tố `At`, thời lượng có hậu tố `Minutes`, độ dài có hậu tố `Cm`.

**Trạng thái:**

| Trạng thái | Nghĩa |
|---|---|
| CÓ | Đã có trong DB và API, đúng nghĩa với đặc tả |
| ĐỔI TÊN | Đã có, nhưng tên hoặc enum trong code khác đặc tả. Tài liệu này dùng tên code |
| MỘT PHẦN | Có cột nhưng chưa ghi, có nhưng bị rơi khỏi payload, chỉ lưu dạng chữ tự do, hoặc chỉ đủ một phần |
| MI | Đọc từ Product/Customer Master Index, đã có sẵn trong Master Index |
| MI-THIẾU | Phải nâng cấp Master Index trước. Không được định nghĩa riêng trong Điều phối |
| CHƯA XÂY | Chưa có trong code. Là mục tiêu thi công |

**Hai trục phân loại.** Mỗi trường mang đủ cả hai trục:

1. **Sở hữu** (trường ở đâu, theo Hợp đồng Master Index §2): `MASTER` · `ORDER-SNAPSHOT` · `ORDER-OWNED` · `DERIVED` · `EVIDENCE` · `ANALYTICS`. Cột *Sở hữu* trong các bảng dưới đây ghi trục này. Cột này dùng thêm `SYSTEM` (máy chủ tự ghi), `AI` và `PARTNER` cho các trường mà người/nguồn nhập quyết định luôn nơi lưu.
2. **Người nhập** (ai tạo ra giá trị, theo Template Architecture): `SYSTEM` · `AI` · `HUMAN` · `PARTNER` · `CUSTOMER` · `DERIVED`. Trục này sẽ được khai báo cho từng trường trong **Sổ đăng ký trường bằng code** (xem §16). Tài liệu này không lặp lại để tránh lệch pha.

**Quan hệ 1–1 của code.** Mỗi đơn có đúng một bản ghi `order_coordinations`. Lệnh sản xuất và chuyến giao cũng nằm trên bản ghi này. Vì vậy các khoá `productionOrderId` và `deliveryId` của đặc tả gốc đều được ánh xạ về `orderId` (xem §17, D4).

**Không có cổng đối tác (PO 26/09/2026, D3).** Đối tác **không** đăng nhập hệ thống, ở thời điểm này và trong giai đoạn trước mắt. Mọi thao tác phía đối tác do **điều phối viên** thực hiện: bấm nhận/từ chối thay, ghi câu hỏi, cập nhật tiến độ, tải lên ảnh/video mà đối tác gửi qua Zalo. Mỗi bản ghi như vậy mang **vết nhập hộ** (§2.16), để phân biệt "đối tác báo lúc nào, qua kênh nào" với "điều phối viên nhập lúc nào".

---

## 1. Nguyên tắc thiết kế (giữ từ đặc tả gốc)

Mọi trường phải có đủ: mục đích nghiệp vụ, chủ sở hữu, nguồn, kiểm tra hợp lệ, nơi tiêu thụ, nơi lưu, quyền xem, yêu cầu bằng chứng (nếu có) và ảnh hưởng tới trạng thái/SLA.

Chuỗi chuẩn: `Sự kiện nghiệp vụ → Form → Dữ liệu có cấu trúc → Kiểm tra → Quyết định → Trạng thái → Event → Luồng kế → Bằng chứng → Học lại`.

**Không trường mồ côi. Không template mồ côi. Không dùng chữ tự do thay cho dữ liệu vận hành có cấu trúc.**

Quyền hiện hành của các route `/api/v1/coordinator/*`:

| Quyền | Thao tác |
|---|---|
| R1 | Xem danh sách/chi tiết đơn, xem đối tác |
| R2 | Tạo đơn (T01) |
| R3 | Chuyển bước, cập nhật sản xuất, QC, mở/xử lý sự cố, đóng đơn |
| R4 | Phân công đối tác, tạo/sửa đối tác |
| R5 | Cập nhật giao hàng |
| R6 | Huỷ đơn |

---

## 2. Order Object chuẩn

Mọi template dùng chung một Order Object. Không template nào được tạo bản sao dữ liệu khách hàng/sản phẩm (Hợp đồng MI §3).

### 2.1. Định danh

| Trường theo đặc tả gốc | Tên chuẩn (theo code) | Trạng thái | Sở hữu | Ghi chú |
|---|---|---|---|---|
| orderId | `id` (`orders.id`) | CÓ | ORDER-OWNED | Một đơn = một `order_coordinations` (quan hệ 1–1) |
| orderCode | `orderCode` (`orders.code`) | CÓ | ORDER-OWNED | Máy chủ sinh `FLR-YYMMDD-NNNN`; client không đặt mã |
| organizationId | `orders.organization_id` | CÓ | SYSTEM | Lấy từ phiên đăng nhập, không bao giờ nhận từ client |
| source | `source` | CHƯA XÂY | ORDER-OWNED | Danh mục nguồn chung `orders/domain/order-source.ts` (`COORDINATOR_ENTRY_SOURCES`: `MANUAL · CHAT · CATALOG · LANDING · SHORT_LINK · CHANNEL · NETWORK · QUOTATION`), ghi cùng mã vào `orders.source` — PO 07/11/2026 (Q2) bỏ bộ mã cũ `ORDER_M10 · CHAT_M08 · CATALOG_M06`; đơn cũ để nguyên. Cột thật (Q5) |
| sourceReference | `sourceReference` | CHƯA XÂY | ORDER-OWNED | Mã tham chiếu nguồn (id đơn M10, id hội thoại M08) |
| channel | `channel` | CHƯA XÂY | ORDER-OWNED | Kênh khách liên hệ đặt (khác `source` = module tạo đơn). Danh mục §2.15.3, dùng lại tên giá trị của enum `chat_channel` |
| orderType | `orderType` | CHƯA XÂY | ORDER-OWNED | Danh mục §2.15.4 — kích hoạt nhóm trường có điều kiện §12. Cột thật |
| priority | `priority` | MỘT PHẦN | ORDER-OWNED | ĐP-1.3 (26/09): ô nhập đã ẨN trên form (không còn bị nhét vào `internalNote` dạng chữ tự do) tới khi có cột thật + danh mục §2.15.1 (ĐP-4a) |
| serviceLevel | `serviceLevel` | CHƯA XÂY | ORDER-OWNED | Cam kết thời gian giao với khách. Danh mục §2.15.2. Cột thật |
| status | `stage` (+ `orders.status`, `production_status`, `delivery_status`) | ĐỔI TÊN | DERIVED | Nguồn là `stage` (11 giá trị `coordinator_stage`); 3 trục của `orders` do `state-mapper.ts` suy ra — không nhập tay |
| createdAt | `createdAt` | CÓ | SYSTEM |  |
| receivedAt | `receivedAt` | CHƯA XÂY | ORDER-OWNED | Hiện ngầm bằng `createdAt`; cần tách khi đơn đến từ kênh ngoài |
| salesOwnerId | `salesOwnerId` | MỘT PHẦN | ORDER-OWNED | Chỉ có `orders.created_by` (người bấm tạo), chưa tách người phụ trách bán |
| coordinatorId | `coordinatorId` (`order_coordinations.coordinator_id`) | MỘT PHẦN | ORDER-OWNED | Có cột, gán = người tạo đơn; chưa có API đổi người phụ trách, chưa lên view |

### 2.2. Người mua

| Trường theo đặc tả gốc | Tên chuẩn (theo code) | Trạng thái | Sở hữu | Ghi chú |
|---|---|---|---|---|
| buyerCustomerId | `customerId` (`orders.customer_id` → `CustomerMasterIndex.id`) | ĐỔI TÊN | MASTER | Server đã kiểm khách tồn tại; UI chưa có ô chọn khách |
| buyerName | `customerName` | ĐỔI TÊN | MASTER | Khi có `customerId` phải lấy `CustomerMasterIndex.name`; hiện Sales gõ tay và lưu lặp trong `metadata` |
| buyerPhone | `customerPhone` | CÓ | MASTER | ĐP-1.3 (26/09, xong): lưu `order_coordinations.metadata.customerPhone` (khách lẻ). Có `customerId` → `CustomerMasterIndex.phone` (nối thật ở ĐP-2.9) |
| buyerEmail | `customerEmail` | MI | MASTER | `CustomerMasterIndex.email`; đơn chưa hiển thị |
| buyerCompany | `invoiceInfo.companyName` | CHƯA XÂY | ORDER-OWNED | Thông tin xuất hoá đơn ghi THEO TỪNG ĐƠN (thực tế các tiệm yêu cầu khi khách cần hoá đơn VAT); bắt buộc khi `orderType = CORPORATE` hoặc `invoiceRequired = true`. MI-9 (sau) chỉ dùng để điền sẵn từ hồ sơ khách |
| buyerTaxCode | `invoiceInfo.taxCode` | CHƯA XÂY | ORDER-OWNED | Như trên. Lưu ý `business_profiles.tax_code` là mã số thuế CỦA TIỆM, không dùng cho khách |
| buyerAddress | `CustomerMasterIndex.address` | MI | MASTER | Chuỗi tự do — KHÔNG phải địa chỉ giao |
| isAnonymousGift | `isAnonymousGift` | CHƯA XÂY | ORDER-OWNED | Ảnh hưởng T07/T18/T21: ẩn tên người gửi với người nhận |

### 2.3. Người nhận

| Trường theo đặc tả gốc | Tên chuẩn (theo code) | Trạng thái | Sở hữu | Ghi chú |
|---|---|---|---|---|
| recipientName | `recipientName` | CÓ | ORDER-OWNED | Lưu ở `order_coordinations.metadata` |
| recipientPhone | `recipientPhone` | CÓ | ORDER-OWNED | Bắt buộc, regex 8–15 ký số |
| recipientEmail | `recipientEmail` | CHƯA XÂY | ORDER-OWNED |  |
| recipientRelationship | `recipientRelationship` | CHƯA XÂY | ORDER-OWNED | Có thể gợi ý từ `CustomerMasterIndex.occasions[].recipientName` |

### 2.4. Dịp

| Trường theo đặc tả gốc | Tên chuẩn (theo code) | Trạng thái | Sở hữu | Ghi chú |
|---|---|---|---|---|
| occasionType | `occasionCode` → `occasions.code` | CHƯA XÂY | ORDER-OWNED | Dùng lại bảng danh mục dịp ĐÃ CÓ `occasions` (theo tổ chức, API `/api/v1/occasions`) — không tạo danh mục thứ hai. Xem §2.15.4 |
| occasionSubType | `occasionSubType` | CHƯA XÂY | ORDER-OWNED |  |
| occasionDate | `occasionDate` | CHƯA XÂY | ORDER-OWNED |  |
| occasionNote | `occasionNote` | CHƯA XÂY | ORDER-OWNED |  |

### 2.5. Giao hàng

Cấu trúc địa chỉ hiện hành là `StructuredAddressSchema` (`src/modules/coordinator/contracts/common.ts`), gồm 5 tầng: `street` · `ward` · `district` · `city` · `country`, cộng thêm `formattedAddress`. Bốn tầng đầu **bắt buộc**. Các trường toà nhà/tầng/phòng/mốc của đặc tả gốc được thêm vào **cùng object này** dưới dạng tuỳ chọn, không tách ra thành trường phẳng.

| Trường theo đặc tả gốc | Tên chuẩn (theo code) | Trạng thái | Sở hữu | Ghi chú |
|---|---|---|---|---|
| deliveryType | `deliveryType` | CHƯA XÂY | ORDER-OWNED | Danh mục §2.15.5 |
| deliveryDate | `deliveryTargetAt` (phần ngày) | MỘT PHẦN | ORDER-OWNED | Không tách trường riêng; ngày nằm trong mốc ISO `deliveryTargetAt` |
| deliveryWindowStart | `deliveryWindowStart` | CHƯA XÂY | ORDER-OWNED | Hiện chỉ có `orders.delivery_window.timeSlot` (chuỗi tự do). Cột thật (Q5) |
| deliveryWindowEnd | `deliveryWindowEnd` | CHƯA XÂY | ORDER-OWNED | Như trên |
| deliveryTargetTime | `deliveryTargetAt` (máy đọc) + `deliveryTargetTime` (chuỗi hiển thị) | ĐỔI TÊN | ORDER-OWNED | Trong code `deliveryTargetTime` là NHÃN hiển thị ("17:00 hôm nay"); mốc thời gian dùng để tính rủi ro là `deliveryTargetAt` (`order_coordinations.estimated_delivery_at`) |
| addressFullText | `deliveryAddress.formattedAddress` | ĐỔI TÊN | ORDER-OWNED | ĐP-1.2 (26/09, xong): API không còn nhận địa chỉ MỘT CHUỖI — chỉ nhận object 4 tầng. Xem §15 (cơ chế song song cũ/mới) |
| addressDetail | `deliveryAddress.street` | ĐỔI TÊN | ORDER-OWNED | Số nhà, ngõ/ngách/hẻm, tên đường |
| buildingName | `deliveryAddress.buildingName` | CHƯA XÂY | ORDER-OWNED | Mở rộng `StructuredAddressSchema` bằng trường TUỲ CHỌN (không phá dữ liệu cũ) |
| buildingBlock | `deliveryAddress.buildingBlock` | CHƯA XÂY | ORDER-OWNED | Như trên |
| floor | `deliveryAddress.floor` | CHƯA XÂY | ORDER-OWNED | Như trên |
| room | `deliveryAddress.room` | CHƯA XÂY | ORDER-OWNED | Như trên |
| gateEntrance | `deliveryAddress.gateEntrance` | CHƯA XÂY | ORDER-OWNED | Như trên |
| landmark | `deliveryAddress.landmark` | CHƯA XÂY | ORDER-OWNED | Như trên |
| ward | `deliveryAddress.ward` | CÓ | ORDER-OWNED | Bắt buộc. Xem §5 — cơ chế địa chỉ song song |
| district | `deliveryAddress.district` | CÓ | ORDER-OWNED | Bắt buộc (giữ nguyên theo quyết định PO 26/09). Xem §5 |
| city | `deliveryAddress.city` | CÓ | ORDER-OWNED | Bắt buộc |
| country | `deliveryAddress.country` | CÓ | ORDER-OWNED | Có trong code, đặc tả gốc thiếu — giữ (mặc định "Việt Nam") |
| latitude | `deliveryAddress.latitude` | CHƯA XÂY | ORDER-OWNED | Trường tuỳ chọn |
| longitude | `deliveryAddress.longitude` | CHƯA XÂY | ORDER-OWNED | Trường tuỳ chọn |
| deliveryZone | `deliveryZone` | CHƯA XÂY | DERIVED | Suy ra từ phường/xã + tỉnh/thành; cần bảng vùng giao của tiệm |
| recipientAvailability | `recipientAvailability` | CHƯA XÂY | ORDER-OWNED |  |
| deliveryContactInstruction | `deliveryContactInstruction` | CHƯA XÂY | ORDER-OWNED |  |
| securityInstruction | `securityInstruction` | CHƯA XÂY | ORDER-OWNED |  |
| noOneHomeInstruction | `noOneHomeInstruction` | CHƯA XÂY | ORDER-OWNED |  |
| handoffInstruction | `handoffInstruction` | CHƯA XÂY | ORDER-OWNED |  |

### 2.6. Sản phẩm

| Trường theo đặc tả gốc | Tên chuẩn (theo code) | Trạng thái | Sở hữu | Ghi chú |
|---|---|---|---|---|
| productId | `productId` (`order_items.product_id` → `ProductMasterIndex.id`) | CÓ | MASTER | ĐP-2.6/2.7/2.10 (26/09): `createOrderSchema` nhận, ghi vào `order_items.product_id`, form chọn mẫu nhanh giữ ID xuyên suốt việc sửa BOM |
| productName | `productTitle` | ĐỔI TÊN | ORDER-SNAPSHOT | Chụp từ `ProductMasterIndex.name`; cho phép gõ tay khi đặt mẫu ngoài danh mục |
| productType | `ProductMasterIndex.category` | CÓ | ORDER-SNAPSHOT | ĐP-2.3/2.7 (26/09): `projectCoordinatorSnapshot` chụp vào `order.product.category` |
| quantity | `quantity` (`order_items.quantity`) | CÓ | ORDER-OWNED | ĐP-2.7 (26/09): một dòng `order_items` cho mỗi ĐƠN, `quantity = 1` (số sản phẩm) — không còn mỗi loại hoa một dòng |
| size | `ProductMasterIndex.variants[].size` / `dimensions` | MỘT PHẦN | ORDER-SNAPSHOT | ĐP-2.3 (26/09): `dimensions` đã chụp vào `order.product.dimensions` khi có số thật; `variants` hiện vẫn rỗng theo thiết kế |
| style | `ProductMasterIndex.style` | CÓ | ORDER-SNAPSHOT | ĐP-2.3/2.7 (26/09): chụp vào `order.product.style` |
| colorTone | `ProductMasterIndex.colorPalette.primaryColor` / `secondaryColor` | MỘT PHẦN | ORDER-SNAPSHOT | ĐP-2.3/2.7 (26/09): kế thừa xong vào `order.product.colorPalette` — CHƯA có override có audit (Hợp đồng MI §5/§6 vẫn chỉ làm cho BOM cành hoa, ĐP-2.8) |
| designReferenceUrls | `sampleImageUrl` + `sampleAssetId` | MỘT PHẦN | ORDER-SNAPSHOT | Hiện chỉ 1 ảnh chọn tay. ĐP-2.2/2.3 (26/09): `order.product.referenceImageUrls[]` đã có trong view (từ `galleryImages` vai trò `REFERENCE`), nhưng chưa có màn nào gắn vai trò `REFERENCE` cho ảnh sản phẩm (ghi nợ MI-4) nên mảng này rỗng trong thực tế |
| designReferenceNotes | `designReferenceNotes` | CHƯA XÂY | ORDER-OWNED |  |
| budget | `budgetVnd` | CHƯA XÂY | ORDER-OWNED | Theo quy ước tiền tệ của code: hậu tố `Vnd` |

### 2.7. BOM hoa

Cấu trúc BOM là cấu trúc **nguyên tử của Product Master Index** (`src/modules/products/domain/product-master-index.ts`). Điều phối không được định nghĩa lại. Trường đặc tả gốc có mà PMI chưa có thì ghi MI-THIẾU, và phải thêm vào PMI (Hợp đồng MI, MI-12).

| Trường theo đặc tả gốc | Tên chuẩn (theo code) | Trạng thái | Sở hữu | Ghi chú |
|---|---|---|---|---|
| flowerName | `flowerName` | CÓ | ORDER-SNAPSHOT |  |
| quantity | `quantity` | CÓ | ORDER-SNAPSHOT |  |
| unit | `unit` | CÓ | ORDER-SNAPSHOT | ĐP-2.13 (26/09): `createOrderSchema` xiết đúng `DemUnit` (bông · cành · lá · cây); đơn cũ có giá trị ngoài danh mục vẫn đọc được (tầng đọc giữ `string`) |
| color | `color` | CÓ | ORDER-SNAPSHOT |  |
| role | `role` | CÓ | ORDER-SNAPSHOT | ĐP-2.13 (26/09): `createOrderSchema` xiết đúng 4 vai trò (Chủ đạo · Phụ · Điểm xuyến · Lấp đầy); đơn cũ vẫn đọc được |
| shade | `shade` | MỘT PHẦN | ORDER-SNAPSHOT | ĐP-2.3/2.12 (26/09): có trong snapshot (`order.product.bom.flowers[].shade`), T07 đã hiện — nhưng `createOrderSchema` vẫn chỉ nhận 5 trường lúc Sales tự gõ nên đơn mẫu ngoài danh mục không có |
| budCount | `budCount` | MỘT PHẦN | ORDER-SNAPSHOT | Như trên (ĐP-2.3/2.12): có trong snapshot + T07 đã hiện, chưa nhận được lúc Sales tự gõ BOM tay |
| variety | `variety` | CÓ | MASTER | MI-12 (ĐP-2b, 26/09): thêm vào `FlowerBomItem` của PMI — đọc từ `bien_the` (Vision), hiện ở T01/T07 khi đơn có `productId`. Sửa qua M01a chỉ ở dạng hiện (chuỗi tổng hợp), chưa có ô nhập riêng |
| stemLength | `stemLengthCm` | CÓ | MASTER | MI-12 (ĐP-2b, 26/09): như trên; đọc từ `chieu_dai_cm` (Vision), hiện ở T01/T07. Sửa qua M01a chỉ ở dạng hiện, chưa có ô nhập riêng |
| substitutionAllowed | `substitutionAllowed` | CÓ | MASTER | MI-12 (ĐP-2b, 26/09): thêm cờ cấp TỪNG DÒNG BOM (khác `substitutionPolicy` cấp sản phẩm đã có); đọc từ `duoc_thay_the` (Vision), hiện ở T01/T07. Sửa qua M01a chỉ ở dạng hiện |
| substitutionPriority | `substitutionPriority` | CÓ | MASTER | MI-12 (ĐP-2b, 26/09): đọc từ `thu_tu_uu_tien_thay_the` (Vision), hiện ở T01/T07 (badge số ưu tiên). Sửa qua M01a chỉ ở dạng hiện |

### 2.8. Lá

| Trường theo đặc tả gốc | Tên chuẩn (theo code) | Trạng thái | Sở hữu | Ghi chú |
|---|---|---|---|---|
| name, quantity, unit, color, role | `bom.foliage[]` | CÓ | ORDER-SNAPSHOT | ĐP-2.3/2.7/2.11/2.12 (26/09): chụp vào snapshot, trả ở view (`order.foliage[]`), hiện ở T07 — chỉ khi đơn chọn mẫu từ danh mục (`productId`); đơn mẫu ngoài danh mục đúng là không có, không suy đoán |
| substitutionAllowed | `substitutionAllowed` | CÓ | MASTER | MI-12 (ĐP-2b, 26/09): cờ cấp từng dòng BOM; đọc từ `duoc_thay_the` (Vision), hiện ở T01/T07 |

### 2.9. Gói

| Trường theo đặc tả gốc | Tên chuẩn (theo code) | Trạng thái | Sở hữu | Ghi chú |
|---|---|---|---|---|
| layer, material, color | `bom.wrapping[]` | CÓ | ORDER-SNAPSHOT | ĐP-2.3/2.7/2.10/2.11/2.12 (26/09): chụp vào snapshot, trả ở view (`order.wrapping[]`), hiện ở T07; form không còn nhồi `wrapStyle`/`ribbon` vào ghi chú nội bộ — chỉ khi đơn có `productId` |
| pattern | `pattern` | CÓ | MASTER | MI-12 (ĐP-2b, 26/09): thêm trường `pattern` (hoạ tiết) riêng, KHÔNG dùng chung `texture` (kết cấu vật liệu) — hai khái niệm khác nhau; đọc từ `hoa_van` (Vision), hiện ở T01/T07 |
| quantity | `quantity` | CÓ | MASTER | MI-12 (ĐP-2b, 26/09): `WrappingLayer` thêm số lượng lớp/tấm của CHÍNH lớp gói này; đọc từ `so_luong` (Vision), hiện ở T01/T07 |
| substitutionAllowed | `substitutionAllowed` | CÓ | MASTER | MI-12 (ĐP-2b, 26/09): cờ cấp từng dòng BOM; đọc từ `duoc_thay_the` (Vision), hiện ở T01/T07 |

### 2.10. Phụ kiện

| Trường theo đặc tả gốc | Tên chuẩn (theo code) | Trạng thái | Sở hữu | Ghi chú |
|---|---|---|---|---|
| name, material, color, quantity, printedText | `bom.accessories[]` | CÓ | ORDER-SNAPSHOT | ĐP-2.3/2.7/2.11/2.12 (26/09): chụp vào snapshot, trả ở view (`order.accessories[]`), hiện ở T07 — chỉ khi đơn có `productId` |
| unit | `unit` | CÓ | MASTER | MI-12 (ĐP-2b, 26/09): `AccessoryBomItem` thêm đơn vị tính riêng (khác `DemUnit` chỉ dành hoa/lá); đọc từ `don_vi` (Vision), hiện ở T01/T07 |
| substitutionAllowed | `substitutionAllowed` | CÓ | MASTER | MI-12 (ĐP-2b, 26/09): cờ cấp từng dòng BOM; đọc từ `duoc_thay_the` (Vision), hiện ở T01/T07 |

### 2.11. Thiệp

| Trường theo đặc tả gốc | Tên chuẩn (theo code) | Trạng thái | Sở hữu | Ghi chú |
|---|---|---|---|---|
| cardRequired | `cardRequired` | CHƯA XÂY | ORDER-OWNED | Điều kiện: `cardRequired = true` ⇒ `cardMessage` bắt buộc |
| cardMessage | `cardMessage` (`orders.card_message`) | CÓ | ORDER-OWNED | Tách khỏi ghi chú nội bộ (đã đúng) |
| cardSignature | `cardSignature` | CHƯA XÂY | ORDER-OWNED |  |
| cardLanguage | `cardLanguage` | CHƯA XÂY | ORDER-OWNED | Danh mục §2.15.6 |
| cardStyle | `cardStyle` | CHƯA XÂY | ORDER-OWNED | Danh mục §2.15.6 |
| cardPlacement | `cardPlacement` | CHƯA XÂY | ORDER-OWNED | Danh mục §2.15.6 |

### 2.12. Thương mại

| Trường theo đặc tả gốc | Tên chuẩn (theo code) | Trạng thái | Sở hữu | Ghi chú |
|---|---|---|---|---|
| sellingPrice | `unitPriceVnd` | ĐỔI TÊN | ORDER-OWNED | KHÔNG lấy bắt buộc từ `ProductMasterIndex.pricing.quotePriceVnd` (được phép `null` theo thiết kế) |
| discount | `discountVnd` / `orders.voucher_id` | MỘT PHẦN | ORDER-OWNED | M10 có `voucher_id`; Điều phối chưa có |
| deliveryFee | `shippingFeeVnd` | CHƯA XÂY | ORDER-OWNED | Dùng tên đã có trong code (`projectDeliveryReceipt` của PMI), không đặt tên thứ hai `deliveryFee` |
| tax | `taxVnd` | CHƯA XÂY | ORDER-OWNED |  |
| totalAmount | `totalVnd` (`orders.total_vnd`) | ĐỔI TÊN | ORDER-OWNED | Hiện Điều phối gán `total_vnd = unitPriceVnd` |
| currency | — | CÓ | SYSTEM | Toàn hệ thống chỉ dùng VND (hậu tố `Vnd`); không thêm trường |
| paymentMethod | `paymentMethod` (trên từng dòng sổ thu `order_payments`) | CHƯA XÂY | ORDER-OWNED | Mỗi lần thu tiền là một dòng sổ thu. Danh mục §2.15.7. Xem §2.14 |
| paymentStatus | `paymentStatus` | CHƯA XÂY | DERIVED | Suy ra từ `totalVnd` và `paidVnd` (§2.15.7) — không nhập tay |
| paymentReference | `reference` (dòng sổ thu) | CHƯA XÂY | EVIDENCE | Mã giao dịch chuyển khoản/ví, số biên nhận |
| depositAmount | dòng sổ thu loại `DEPOSIT` | CHƯA XÂY | ORDER-OWNED | Tiền khách trả trước lúc đặt — Sales ghi ở Đơn hàng (PO 26/09, D2) |
| paidAmount (PO bổ sung 26/09) | `paidVnd` (`orders.paid_vnd`) | CHƯA XÂY | ORDER-OWNED | **Đã thu** = tổng các dòng sổ thu. Bắt buộc hiển thị trên Đơn hàng. Cột thật |
| balanceAmount | `balanceVnd` (`orders.balance_vnd`) | CHƯA XÂY | ORDER-OWNED | **Còn phải thu** = `totalVnd − paidVnd`, máy chủ ghi cùng giao dịch với sổ thu (ràng buộc CHECK). Bắt buộc hiển thị trên Đơn hàng. Điều phối chịu trách nhiệm thu. Cột thật |
| commercialNote | `commercialNote` | CHƯA XÂY | ORDER-OWNED |  |

### 2.13. Thay thế

| Trường theo đặc tả gốc | Tên chuẩn (theo code) | Trạng thái | Sở hữu | Ghi chú |
|---|---|---|---|---|
| substitutionPolicy | `ProductMasterIndex.substitutionPolicy` `{ allowed, note? }` | MỘT PHẦN | ORDER-SNAPSHOT | ĐP-2.3/2.7/2.11 (26/09): kế thừa xong (`order.substitutionPolicy`) — CHƯA có override-có-audit khi Sales đổi chính sách (Hợp đồng MI §6 vẫn chỉ làm cho BOM cành hoa) |
| allowFlowerSubstitution | `allowFlowerSubstitution` | CHƯA XÂY | ORDER-OWNED | Override cấp đơn — phải ghi giá trị gốc từ MI |
| allowColorSubstitution | `allowColorSubstitution` | CHƯA XÂY | ORDER-OWNED | Như trên |
| allowWrappingSubstitution | `allowWrappingSubstitution` | CHƯA XÂY | ORDER-OWNED | Như trên |
| allowAccessorySubstitution | `allowAccessorySubstitution` | CHƯA XÂY | ORDER-OWNED | Như trên |
| minimumValuePolicy | `minimumValuePolicy` | CHƯA XÂY | ORDER-OWNED | Cần PO định nghĩa quy tắc |
| requiresCustomerApproval | `requiresCustomerApproval` | CHƯA XÂY | ORDER-OWNED |  |
| approvedSubstitutions | `approvedSubstitutions[]` | CHƯA XÂY | EVIDENCE |  |
| rejectedSubstitutions | `rejectedSubstitutions[]` | CHƯA XÂY | EVIDENCE |  |

### 2.14. Thanh toán: phân vai Đơn hàng và Điều phối (PO 26/09/2026, D2)

**Quyết định:** thanh toán thuộc **cả hai** module, chia theo thời điểm thu.

Ví dụ: đơn 1.000.000đ, khách trả trước 500.000đ. Phần trả trước thuộc **Đơn hàng** (Sales ghi lúc nhận đơn). 500.000đ còn lại thuộc **Điều phối** (Điều phối chịu trách nhiệm thu trước hoặc khi giao).

**Đơn hàng phải luôn ghi đủ 3 con số:**

| Con số | Tên chuẩn | Nơi lưu |
|---|---|---|
| Tổng số | `totalVnd` | `orders.total_vnd` (đã có) |
| Đã thu | `paidVnd` | `orders.paid_vnd` (cột mới) |
| Còn phải thu | `balanceVnd` | `orders.balance_vnd` (cột mới) |

**Thiết kế:**

1. **Sổ thu `order_payments`** (bảng mới, có `organization_id`, cách ly tenant). Mỗi lần thu hoặc hoàn tiền là **một dòng**: `kind` (`DEPOSIT` · `BALANCE` · `REFUND`), `amountVnd`, `paymentMethod`, `reference`, `evidenceAssetId`, `collectedBy`, `collectedAt`, `note`.
2. `paidVnd` và `balanceVnd` được máy chủ cập nhật **trong cùng giao dịch** với dòng sổ thu. DB có ràng buộc `balance_vnd = total_vnd − paid_vnd`. Không ai sửa tay hai con số này.
3. `paymentStatus` là trường **suy ra**, không nhập tay (§2.15.7).
4. **Sales (Đơn hàng)** ghi dòng `DEPOSIT` khi nhận đơn. **Điều phối** ghi dòng `BALANCE` khi thu phần còn lại.
5. **Cổng đóng đơn T25:** `balanceVnd = 0`, hoặc có sự cố `COMMERCIAL_ISSUE` đã được duyệt (ví dụ công nợ khách doanh nghiệp).
6. **Hiển thị:**
   - Shipper chỉ thấy **số tiền phải thu hộ** (`codAmountVnd`), không thấy giá bán.
   - Đối tác không thấy thông tin thanh toán.
7. Thay đổi giá sau khi đã thu (T04 loại `PRICE`) phải tính lại `balanceVnd` và ghi vết.

| Trường theo đặc tả gốc | Tên chuẩn (theo code) | Trạng thái | Sở hữu | Ghi chú |
|---|---|---|---|---|
| collectionMethod | `collectionMethod` | CHƯA XÂY | ORDER-OWNED | Cách thu phần còn lại: `COD_BY_SHIPPER` · `TRANSFER_BEFORE_DELIVERY` · `CASH_AT_STORE` · `CORPORATE_INVOICE` (§2.15.7) |
| collectionDueAt | `collectionDueAt` | CHƯA XÂY | ORDER-OWNED | Mốc phải thu xong (trước khi giao hoặc lúc giao). Nhắc trên T05, chặn giao nếu quy tắc tiệm yêu cầu thu trước |
| codAmountVnd | `codAmountVnd` | CHƯA XÂY | DERIVED | Số tiền shipper phải thu hộ = `balanceVnd` khi `collectionMethod = COD_BY_SHIPPER`. Hiện trên T18 cho shipper — KHÔNG hiện giá bán |
| collectedVnd | dòng sổ thu loại `BALANCE` | CHƯA XÂY | ORDER-OWNED | Mỗi lần thu một dòng; tự cập nhật `paidVnd`/`balanceVnd` của Đơn |
| collectedAt, collectedBy | `order_payments.collected_at`, `collected_by` | CHƯA XÂY | SYSTEM |  |
| paymentEvidence | `evidenceAssetId` | CHƯA XÂY | EVIDENCE | Ảnh chuyển khoản/biên nhận — điều phối viên tải lên |
| refund | dòng sổ thu loại `REFUND` | CHƯA XÂY | ORDER-OWNED | Dùng khi huỷ đơn có hoàn tiền (Form Huỷ đơn `refundAmount`) |

### 2.15. Danh mục giá trị (PO 26/09/2026, D7: "xây theo thực tế, thực hiện theo đề xuất")

Nguyên tắc chung:

- Mã giá trị viết HOA_GẠCH_DƯỚI, như các enum hiện có trong code.
- Nhãn tiếng Việt dùng trên giao diện.
- Ưu tiên **dùng lại enum/danh mục đã có trong code**.
- Mỗi danh mục có `OTHER` khi thực tế cần, kèm ô ghi rõ.
- **Quản trị nền tảng ALG sửa được mọi danh mục dưới đây** trên Console Vận hành (PO 26/09/2026, §16.2). Các giá trị liệt kê ở đây chỉ là **bộ khởi tạo mặc định**. Vì vậy các cột mới lưu **mã giá trị dạng chuỗi**, được máy chủ kiểm tra theo danh mục, **không** dùng Prisma enum (thêm giá trị vào Prisma enum phải có migration).
- Tiệm không tự sửa các danh mục này.
- Mỗi danh mục thuộc một trong ba loại quản trị (§16.2): **MỞ**, **CÓ HÀNH VI** hoặc **ĐÓNG**. Loại được ghi ngay ở tiêu đề từng danh mục.

#### 2.15.1. `priority`: mức ưu tiên xử lý nội bộ (loại CÓ HÀNH VI: mỗi giá trị gắn một bậc nền 1–4 để sắp xếp và gợi ý)

Mức ưu tiên do người đặt, **khác** `riskLevel` (máy tính theo thời gian). Bốn mức, cùng nhịp với `EXCEPTION_SEVERITIES` và `coordination_risk_level` của code.

| Mã | Nhãn | Dùng khi |
|---|---|---|
| `NORMAL` | Thường | Mặc định |
| `HIGH` | Cao | Khách VIP/GOLD, đơn giá trị lớn, ngày cao điểm (14/2, 8/3, 20/10, 20/11…) |
| `URGENT` | Gấp | `serviceLevel = EXPRESS`, hoặc còn ít thời gian so với giờ hẹn |
| `CRITICAL` | Khẩn cấp | Giờ cố định không lùi được (giờ viếng tang lễ, giờ khai mạc khai trương/sự kiện), hoặc đơn đang bị leo thang |

Máy **gợi ý** mức ưu tiên từ `serviceLevel`, `orderType` và hạng khách. Người quyết định cuối cùng.

#### 2.15.2. `serviceLevel`: cam kết thời gian giao với khách (loại CÓ HÀNH VI: mỗi giá trị gắn một cách tính SLA `OFFSET` · `EXACT` · `WINDOW` · `END_OF_DAY`, tham số N phút / dung sai sửa được)

Thực tế thị trường: giao nhanh 60–90 phút hoặc trong 2 giờ, giao trong ngày, giao hẹn giờ, giao theo khung giờ.

| Mã | Nhãn | Cách tính mốc SLA |
|---|---|---|
| `EXPRESS` | Giao nhanh | `deliveryTargetAt` = lúc chốt đơn + N phút (N do tiệm cấu hình, mặc định 120) |
| `EXACT_TIME` | Hẹn đúng giờ | Đúng `deliveryTargetAt` ± dung sai (tiệm cấu hình, mặc định ±30 phút) |
| `TIME_SLOT` | Theo khung giờ | Trong `deliveryWindowStart` – `deliveryWindowEnd` |
| `SAME_DAY` | Trong ngày | Trước giờ đóng cửa của ngày giao |

Đơn đặt trước cho ngày khác là `EXACT_TIME` hoặc `TIME_SLOT` với ngày trong tương lai. Không cần thêm giá trị riêng.

#### 2.15.3. `channel`: kênh khách liên hệ đặt hoa (loại MỞ)

`channel` là kênh khách dùng để đặt. Nó **khác** `source` (nơi đơn sinh ra, theo danh mục nguồn chung `order-source.ts` — từ 07/11/2026, thay bộ mã cũ `ORDER_M10 · CHAT_M08 · CATALOG_M06`).

| Mã | Nhãn | Ghi chú |
|---|---|---|
| `WALK_IN` | Khách đến tiệm | |
| `PHONE` | Điện thoại / hotline | |
| `ZALO` | Zalo cá nhân | Trùng tên với `chat_channel.ZALO` |
| `ZALO_OA` | Zalo OA | Trùng tên với `chat_channel.ZALO_OA` |
| `FACEBOOK_MESSENGER` | Facebook / Messenger | Trùng tên với `chat_channel.FACEBOOK_MESSENGER` |
| `WEBSITE` | Website / catalog / landing page | Gộp các bề mặt web của `chat_channel` |
| `INSTAGRAM` | Instagram | |
| `TIKTOK` | TikTok | |
| `EMAIL` | Email | Thường là khách doanh nghiệp |
| `FLORIST_NETWORK` | Đơn chuyển từ tiệm/mạng điện hoa khác | Kiểu "wire-in" của ngành hoa |
| `OTHER` | Khác | Kèm ghi chú |

#### 2.15.4. `orderType`: loại đơn, kích hoạt trường có điều kiện §12 (loại CÓ HÀNH VI: mỗi giá trị chọn các nhóm trường có điều kiện sẽ bật)

| Mã | Nhãn | Trường có điều kiện được bật |
|---|---|---|
| `GIFT` | Quà tặng (sinh nhật, kỷ niệm, tình yêu, tốt nghiệp, lễ tết…) | Không có |
| `SYMPATHY` | Chia buồn / tang lễ | Tên người mất, nơi viếng, giờ viếng, nội dung băng rôn (§12 "Tang lễ") |
| `GRAND_OPENING` | Khai trương / chúc mừng | Địa điểm, giờ khai mạc, nội dung băng rôn, cần lắp đặt |
| `WEDDING_EVENT` | Cưới / sự kiện / hội nghị | §12 "Cưới / Sự kiện" |
| `CORPORATE` | Doanh nghiệp | `invoiceInfo` bắt buộc, nhiều người nhận, lịch giao (§12 "Doanh nghiệp") |
| `SUBSCRIPTION` | Định kỳ (hoa văn phòng, hoa tuần) | Chu kỳ, ngày bắt đầu/kết thúc |

Hai nhóm §12 **không** kích hoạt theo `orderType`:

- "Gấp trong ngày" bật theo `serviceLevel ∈ {EXPRESS, SAME_DAY}`.
- "Khách sạn / Bệnh viện / Toà nhà" bật theo `deliveryLocationType` (§2.15.5).

**Dịp (`occasionCode`).** Code đã có bảng danh mục dịp **`occasions`** (theo tổ chức: `code`, `name`, `sort_order`, `is_active`, `register`; CRUD qua `/api/v1/occasions`). Đơn dùng lại bảng này, không lập danh mục thứ hai.

**Việc cần làm:**

- Bộ dịp mặc định phủ đủ thực tế (Sinh nhật, Khai trương, Kỷ niệm, Tình yêu, Chia buồn, Cưới, Tốt nghiệp, Chúc mừng, 14/2, 8/3, 20/10, 20/11, Tết, Ngày của Mẹ) do quản trị nền tảng quản lý, và được nạp cho tổ chức mới.
- Quản trị nền tảng sửa được danh mục dịp của từng tổ chức trên Console.

**Lệch pha ghi nhận:** `ProductMasterIndex.occasions` hiện là chuỗi tự do (lấy từ `products.attributes`), chưa nối với bảng `occasions`. Cần chuẩn hoá khi thi công.

#### 2.15.5. `deliveryType` (CÓ HÀNH VI: có cần địa chỉ giao không, có cần lắp đặt không) và `deliveryLocationType` (CÓ HÀNH VI: chọn các trường có điều kiện sẽ bật)

| `deliveryType` | Nhãn |
|---|---|
| `DELIVERY` | Giao tận nơi cho người nhận |
| `STORE_PICKUP` | Khách nhận tại tiệm |
| `ONSITE_SETUP` | Giao và lắp đặt tại địa điểm (kệ khai trương, trang trí cưới/sự kiện) |

| `deliveryLocationType` | Nhãn | Trường có điều kiện |
|---|---|---|
| `HOME` | Nhà riêng | Không có |
| `OFFICE` | Văn phòng / công ty | `buildingName`, `floor`, `room`, lễ tân |
| `HOSPITAL` | Bệnh viện | Khoa/phòng, quy định vào viện |
| `HOTEL` | Khách sạn | Lễ tân, số phòng |
| `VENUE` | Nhà hàng / hội trường / nhà tang lễ | Giờ mở cửa, người liên hệ tại chỗ |
| `OTHER` | Khác | Kèm ghi chú |

#### 2.15.6. Thiệp và băng rôn (loại MỞ)

`cardStyle`:

| Mã | Nhãn |
|---|---|
| `STANDARD_CARD` | Thiệp nhỏ cài kèm (mặc định, miễn phí ở phần lớn tiệm) |
| `PREMIUM_CARD` | Thiệp cao cấp / thiệp gập |
| `SYMPATHY_CARD` | Thiếp chia buồn |
| `RIBBON_BANNER` | Băng rôn / dải ruy băng chữ (kệ khai trương, vòng hoa viếng) |
| `CUSTOMER_PROVIDED` | Khách tự gửi thiệp |

`cardPlacement`: `IN_ARRANGEMENT` (cài trong sản phẩm) · `HANDED_SEPARATELY` (trao riêng tay) · `ON_RIBBON` (in trên băng rôn).

`cardLanguage`: `VI` · `EN` · `OTHER` (kèm ghi chú).

Đơn `SYMPATHY` và `GRAND_OPENING` mặc định `cardStyle = RIBBON_BANNER`.

#### 2.15.7. Thanh toán (`paymentMethod`, `collectionMethod`: CÓ HÀNH VI, tức có bắt buộc ảnh bằng chứng không, có phải thu hộ không; `paymentStatus`: ĐÓNG vì là trường suy ra)

`paymentMethod`, theo thực tế các tiệm Việt Nam (tiền mặt, chuyển khoản, COD, thẻ, ví):

| Mã | Nhãn |
|---|---|
| `CASH` | Tiền mặt tại tiệm |
| `BANK_TRANSFER` | Chuyển khoản / VietQR |
| `COD` | Thu hộ khi giao |
| `CARD` | Thẻ (POS / Visa / Mastercard) |
| `E_WALLET` | Ví điện tử. Ghi tên ví (MoMo, ZaloPay, VNPay…) vào `reference` |
| `OTHER` | Khác |

`collectionMethod` (cách Điều phối thu phần còn lại): `COD_BY_SHIPPER` · `TRANSFER_BEFORE_DELIVERY` · `CASH_AT_STORE` · `CORPORATE_INVOICE`.

`paymentStatus` (suy ra, không lưu tay):

| Mã | Điều kiện |
|---|---|
| `UNPAID` | `paidVnd = 0` |
| `PARTIALLY_PAID` | `0 < paidVnd < totalVnd` |
| `PAID` | `paidVnd ≥ totalVnd` |
| `REFUNDED` | Có dòng `REFUND` và tổng thực thu = 0 |

**Nguồn tham khảo thực tế** (26/09/2026):

- Giao nhanh 60–90 phút, hẹn giờ, khung giờ; thanh toán COD / chuyển khoản / thẻ: flowercorner.vn.
- Giao trong 2 giờ; danh mục sản phẩm theo dịp; thiệp; xuất VAT: shophoacomay.vn.
- Thông tin bắt buộc cho vòng hoa viếng (tên người mất, địa điểm, giờ viếng, băng rôn); cọc 30% cho đơn trên 1 triệu: vonghoa.com.
- Hạn huỷ đơn, thay thế hoa cùng giá trị, thanh toán: hoayeuthuong.com.
- COD / chuyển khoản; trả trước cho đơn giá trị cao hoặc hẹn lịch; thông tin xuất hoá đơn theo từng đơn: hoarosa.vn.
- Loại đơn (định kỳ, cưới/sự kiện, chia buồn); nguồn đơn (wire-in, web, điện thoại, tại quầy); cọc cưới 25–50%: kwickos.com.

### 2.16. Vết nhập hộ đối tác (PO 26/09/2026, D3)

| Trường theo đặc tả gốc | Tên chuẩn (theo code) | Trạng thái | Sở hữu | Ghi chú |
|---|---|---|---|---|
| sourceActor | `sourceActor` = `PARTNER` | CHƯA XÂY | SYSTEM | Áp cho mọi bản ghi mà nguồn thông tin là đối tác (T08–T12, xác nhận T16/T17/T24) |
| reportedVia | `reportedVia` | CHƯA XÂY | ORDER-OWNED | Kênh đối tác báo: `ZALO` · `PHONE` · `IN_PERSON` · `OTHER` |
| partnerReportedAt | `partnerReportedAt` | CHƯA XÂY | ORDER-OWNED | Thời điểm đối tác báo (khác thời điểm điều phối viên nhập) |
| enteredBy | `ctx.userId` (`audit_logs`) | MỘT PHẦN | SYSTEM | Đã có vết người nhập; chưa gắn nhãn "nhập hộ" |
| partnerMedia | `finishedAssetIds[]` / `evidenceAssetIds[]` | MỘT PHẦN | EVIDENCE | Ảnh/video đối tác gửi qua Zalo → điều phối viên tải lên `assets`. Video chưa hỗ trợ ở luồng sản xuất |

---

## 3. P1 — NHẬN ĐÚNG

### 3.1. T01 — Sales Order Intake

Form nhập liệu gốc của mọi đơn. Bảng dưới đối chiếu **mức bắt buộc P0 của đặc tả gốc** với **mức bắt buộc thật của `createOrderSchema`** hiện hành.

| Trường P0 theo đặc tả | Tên chuẩn | Hiện bắt buộc trong code? |
|---|---|---|
| source | `source` | Chưa có trường |
| orderType | `orderType` | Chưa có trường |
| priority | `priority` | Chưa có trường. Ô trên form bị rơi khỏi payload |
| salesOwnerId | `salesOwnerId` | Chưa có. Chỉ có `created_by` |
| buyerName | `customerName` | **Có** |
| buyerPhone | `customerPhone` | Chưa có. Ô trên form bị rơi khỏi payload |
| recipientName | `recipientName` | **Có** |
| recipientPhone | `recipientPhone` | **Có** |
| occasionType | `occasionCode` (bảng `occasions`) | Chưa có trường |
| deliveryDate | `deliveryTargetAt` | Tuỳ chọn |
| deliveryWindowStart / End | `deliveryWindowStart` / `deliveryWindowEnd` | Chưa có trường |
| productName | `productTitle` | **Có** |
| productType | (snapshot `category`) | Chưa có |
| quantity | `quantity` | Chưa có ở cấp sản phẩm |
| designReferenceUrls | `sampleImageUrl` / `sampleAssetId` | Tuỳ chọn |
| addressFullText | `deliveryAddress.formattedAddress` | Tuỳ chọn |
| ward · district · city | `deliveryAddress.ward/district/city` | **Có** ở nhánh object. API vẫn nhận nhánh một chuỗi (xem §15) |
| cardRequired · cardMessage | `cardRequired` · `cardMessage` | `cardMessage` tuỳ chọn. Quy tắc đúng: bắt buộc khi `cardRequired = true` |
| paymentStatus | `paymentStatus` | Chưa có. Là trường **suy ra** từ sổ thu (§2.14), không nhập tay. Bắt buộc ở T01 là: `totalVnd` + dòng `DEPOSIT` nếu khách có trả trước |

Code bắt buộc thêm hai trường mà đặc tả gốc không liệt kê ở P0: `deliveryTargetTime` (nhãn giờ giao) và `deliveryAddress.street`. Cả hai giữ nguyên.

Quy tắc giữ nguyên từ đặc tả gốc: SĐT người mua và SĐT người nhận là **hai trường riêng**. Mức ưu tiên và mốc thời gian **không được** ghi vào ghi chú tự do.

Trường bổ sung của T01 ngoài Order Object:

| Trường theo đặc tả gốc | Tên chuẩn (theo code) | Trạng thái | Sở hữu | Ghi chú |
|---|---|---|---|---|
| aiExtractedFields | `aiExtractedFields` | CHƯA XÂY | AI | Chưa có năng lực AI bóc đơn từ tin nhắn |
| aiMissingFields[] | `aiMissingFields[]` | CHƯA XÂY | AI |  |
| aiConflictFields[] | `aiConflictFields[]` | CHƯA XÂY | AI |  |
| aiAmbiguities[] | `aiAmbiguities[]` | CHƯA XÂY | AI |  |
| aiConfidence | `aiConfidence` | CHƯA XÂY | AI |  |
| referenceImages[] | `sampleAssetId` | MỘT PHẦN | EVIDENCE | 1 ảnh tải lên qua `assets` (không nhận base64) |
| customerChatEvidence[] | `chatConversationId` | CHƯA XÂY | EVIDENCE | Có thể trỏ tới `chat_conversations` của M08 thay vì chép lại tin nhắn |
| documents[] | `documentAssetIds[]` | CHƯA XÂY | EVIDENCE |  |

### 3.2. T02 — Sales Order Brief

| Trường theo đặc tả gốc | Tên chuẩn (theo code) | Trạng thái | Sở hữu | Ghi chú |
|---|---|---|---|---|
| orderId, orderCode | `id`, `orderCode` | CÓ | ORDER-OWNED |  |
| buyerSummary, recipientSummary, occasion, productSummary, deliverySummary, commercialSummary | (khối tóm tắt) | MỘT PHẦN | DERIVED | `SalesOrderIntakeCard` hiển thị tóm tắt; không lưu — đúng bản chất DERIVED |
| specialRequirements | `specialRequirements` | CHƯA XÂY | ORDER-OWNED |  |
| substitutionPolicy | (xem Order Object) | MI | ORDER-SNAPSHOT |  |
| missingFields[], conflictFields[] | `missingFields[]`, `conflictFields[]` | CHƯA XÂY | DERIVED | Tính từ bảng bắt buộc của T01 |
| customerCommitments[] | `customerCommitments[]` `{ promiseType, promiseValue, promisedBy, promisedAt }` | CHƯA XÂY | ORDER-OWNED | Có cấu trúc, không ghi chú tự do |
| salesNote | `internalNote` | ĐỔI TÊN | ORDER-OWNED | Hiện dùng chung một ô ghi chú nội bộ |
| salesOwner | `salesOwnerId` | MỘT PHẦN | ORDER-OWNED | Xem Order Object |
| handoffAt, handoffConfirmed | `handoffAt`, `handoffConfirmed` | CHƯA XÂY | ORDER-OWNED | Mốc bàn giao Sales → Điều phối |

### 3.3. T03 — Missing Information Request

| Trường theo đặc tả gốc | Tên chuẩn (theo code) | Trạng thái | Sở hữu | Ghi chú |
|---|---|---|---|---|
| requestId, orderId, missingField, fieldLabel, reason, businessImpact, requestedFrom, requestedAt, dueAt, channel, messageTemplate, responseRequired, responseValue, responseReceivedAt, status | (bảng yêu cầu bổ sung) | CHƯA XÂY | ORDER-OWNED | Component `MissingInfoRequestCard` có nhưng không được render; dashboard đang chuyển sang mở sự cố loại `MISSING_INFORMATION`. Trạng thái `OPEN · SENT · WAITING · RECEIVED · OVERDUE · CANCELLED` chưa có |

### 3.4. T04 — Order Change Request

Loại thay đổi theo đặc tả: `PRODUCT · FLOWERS · COLOR · WRAPPING · ACCESSORY · CARD_MESSAGE · ADDRESS · RECIPIENT · DELIVERY_DATE · DELIVERY_TIME · PRICE · QUANTITY · PARTNER · OTHER`.

| Trường theo đặc tả gốc | Tên chuẩn (theo code) | Trạng thái | Sở hữu | Ghi chú |
|---|---|---|---|---|
| changeRequestId … status (20 trường) | (bảng yêu cầu thay đổi) | CHƯA XÂY | ORDER-OWNED | Gần nhất hiện có: sự cố loại `CUSTOMER_CHANGE` + `audit_logs`. ĐP-2.8 (26/09) đã làm một bản tối thiểu RIÊNG cho BOM cành hoa lúc TẠO đơn (`diffAgainstSnapshot` → `order_items[0].metadata.overrides[]`, thiếu ô lý do, không theo dõi sửa sau tạo) — bảng T04 đầy đủ (đa điểm sửa, có lý do) vẫn CHƯA XÂY, làm ở ĐP-4a |

---

## 4. P2 — HIỂU ĐÚNG

### 4.1. T05 — Coordinator Order Card

Đây là view suy ra, không phải nguồn dữ liệu. Nguồn là `CoordinatorOrderViewSchema` (`contracts/order-view.ts`).

| Trường theo đặc tả gốc | Tên chuẩn (theo code) | Trạng thái | Sở hữu | Ghi chú |
|---|---|---|---|---|
| orderCode | `orderCode` | CÓ | ORDER-OWNED |  |
| priority | `priority` | CHƯA XÂY | ORDER-OWNED | Xem Order Object |
| stage | `stage` + `stageLabel` | CÓ | ORDER-OWNED |  |
| status | 3 trục `orders` | ĐỔI TÊN | DERIVED |  |
| nextAction | `nextAction` | CÓ | DERIVED | Mặc định theo `defaultNextAction(stage)` |
| nextActionAt | `nextActionDue` (`order_coordinations.next_action_due`) | MỘT PHẦN | ORDER-OWNED | Có cột, chưa ghi, chưa lên view |
| owner | `coordinatorId` | MỘT PHẦN | ORDER-OWNED |  |
| partnerName | `partnerName` / `partner` | CÓ | ORDER-OWNED |  |
| riskLevel, riskReason | `riskLevel`, `riskReason` | CÓ | DERIVED | `evaluateRisk()`: NORMAL · ATTENTION · AT_RISK · CRITICAL |
| deliveryTargetTime | `deliveryTargetTime` / `deliveryTargetAt` | CÓ | ORDER-OWNED |  |
| timeRemaining | `minutesLeft` | MỘT PHẦN | DERIVED | Đã tính bên trong `evaluateRisk`, chưa trả ra view |
| productThumbnail | `sampleImageUrl` | ĐỔI TÊN | ORDER-SNAPSHOT |  |
| productName | `productTitle` | ĐỔI TÊN | ORDER-SNAPSHOT |  |
| quantity, occasion, deliveryZone, deliveryWindow | (xem Order Object) | CHƯA XÂY | DERIVED |  |
| missingFieldCount, conflictCount | `missingFieldCount`, `conflictCount` | CHƯA XÂY | DERIVED |  |
| partnerConfirmed | `partnerConfirmed` | CHƯA XÂY | DERIVED | Phụ thuộc T08 |
| productionProgress | `productionProgress` | CÓ | ORDER-OWNED |  |
| productionETA | `productionEta` | CHƯA XÂY | ORDER-OWNED |  |
| qcStatus | `qc.status` | ĐỔI TÊN | EVIDENCE |  |
| deliveryStatus | `delivery.state` | ĐỔI TÊN | EVIDENCE |  |
| openExceptionCount | `hasException` (+ đếm `exceptions[]`) | MỘT PHẦN | DERIVED |  |
| sellingPrice | `unitPriceVnd` | ĐỔI TÊN | ORDER-OWNED | Chưa phân quyền hiển thị theo vai trò |
| paymentStatus | `paymentStatus` | CHƯA XÂY | DERIVED | Suy ra; xem Order Object |
| partnerCost | `partnerPayoutVnd` | ĐỔI TÊN | ORDER-OWNED | Hiện chỉ nhập lúc đóng đơn |
| estimatedMargin | `estimatedMarginVnd` | CHƯA XÂY | DERIVED |  |

### 4.2. Form Lập kế hoạch đơn

| Trường theo đặc tả gốc | Tên chuẩn (theo code) | Trạng thái | Sở hữu | Ghi chú |
|---|---|---|---|---|
| coordinatorId | `coordinatorId` | MỘT PHẦN | ORDER-OWNED |  |
| plannedAt | `plannedAt` | CHƯA XÂY | ORDER-OWNED | Hiện form P2 chỉ gửi `{ stage, nextAction }` (`updateStageSchema`) |
| productionDeadline | `productionDeadlineAt` | CHƯA XÂY | ORDER-OWNED | Cột thật (Q5) — mắt xích đầu của chuỗi hạn chót §15 |
| productionBufferMinutes | `productionBufferMinutes` | CHƯA XÂY | ORDER-OWNED |  |
| pickupTargetTime | `pickupTargetAt` | CHƯA XÂY | ORDER-OWNED | Cột thật (Q5) |
| pickupBufferMinutes | `pickupBufferMinutes` | CHƯA XÂY | ORDER-OWNED |  |
| deliveryWindowStart, deliveryWindowEnd, deliveryTargetTime | (xem Order Object) | MỘT PHẦN | ORDER-OWNED |  |
| plannedProductionDuration, plannedQCBuffer, plannedPickupDuration, plannedDeliveryDuration | `planned*Minutes` | CHƯA XÂY | ORDER-OWNED | Thêm hậu tố `Minutes` cho rõ đơn vị |
| partnerSelectionDeadline | `partnerSelectionDeadlineAt` | CHƯA XÂY | ORDER-OWNED |  |
| nextAction | `nextAction` | CÓ | ORDER-OWNED |  |
| nextActionOwner | `nextActionOwnerId` | CHƯA XÂY | ORDER-OWNED |  |
| nextActionAt | `nextActionDue` | MỘT PHẦN | ORDER-OWNED | Cột có, chưa dùng |
| technicalInstruction | `technicalInstruction` | CHƯA XÂY | ORDER-OWNED |  |
| customerPromise | `customerCommitments[]` | CHƯA XÂY | ORDER-OWNED | Dùng chung cấu trúc với T02 |
| riskLevel, riskReason | `riskLevel`, `riskReason` | CÓ | DERIVED | Tự tính; cho phép điều phối viên nâng mức rủi ro khi tạo đơn |
| latestProductionStart, latestQCStart, latestPickupStart, latestDispatchStart | `latest*At` | CHƯA XÂY | DERIVED | Tính ngược từ `deliveryTargetAt` |

---

## 5. P3 — CHỌN ĐÚNG

### 5.1. T06 — Partner Candidate Card

| Trường theo đặc tả gốc | Tên chuẩn (theo code) | Trạng thái | Sở hữu | Ghi chú |
|---|---|---|---|---|
| partnerId, partnerCode, partnerName | `id`, `code`, `name` (`partners`) | CÓ | ORDER-OWNED | Đối tác thuộc miền `partners` — không có Partner Master Index |
| partnerTier | `tier` | ĐỔI TÊN | ORDER-OWNED | STANDARD · PREFERRED · VIP |
| status | `isActive` | MỘT PHẦN | ORDER-OWNED | Chỉ bật/tắt; chưa có trạng thái tạm ngưng có lý do |
| capabilityMatch, productTypeMatch, occasionCapability, designStyleCapability, specialCapability | (năng lực đối tác) | CHƯA XÂY | DERIVED | Cần hồ sơ năng lực ở form Partner Profile trước |
| serviceArea | `district` + `province` | MỘT PHẦN | ORDER-OWNED | Hai chuỗi tự do, không có phường/xã |
| distanceKm, deliveryZoneMatch, availableAt | — | CHƯA XÂY | DERIVED |  |
| capacityTotal | `capacityDaily` | ĐỔI TÊN | ORDER-OWNED |  |
| capacityUsed | `countActiveOrdersForPartner()` | MỘT PHẦN | DERIVED | Đã dùng để chặn khi phân công, chưa trả ra view |
| capacityRemaining, availabilityStatus | — | CHƯA XÂY | DERIVED |  |
| qualityRate … averageResponseTime (8 chỉ số) | — | CHƯA XÂY | ANALYTICS | Nguồn là T26. Hiện chỉ có `partners.rating` (một điểm chung) |
| estimatedPartnerCost, estimatedDeliveryCost, estimatedMargin | — | CHƯA XÂY | DERIVED |  |
| matchScore, matchReasons[], matchWarnings[], recommended, recommendationConfidence | — | CHƯA XÂY | AI | Quy tắc đặc tả: điểm AI không kèm lý do thì chưa đạt production |

### 5.2. Form Phân công đối tác

| Trường theo đặc tả gốc | Tên chuẩn (theo code) | Trạng thái | Sở hữu | Ghi chú |
|---|---|---|---|---|
| partnerId | `partnerId` | CÓ | ORDER-OWNED |  |
| assignmentType | `assignmentType` | CHƯA XÂY | ORDER-OWNED |  |
| assignedBy, assignedAt | `audit_logs` / `order_events` | MỘT PHẦN | SYSTEM | Có ghi vết, chưa lên view |
| productionDeadline | `productionDeadlineAt` | CHƯA XÂY | ORDER-OWNED | Xem Form Lập kế hoạch |
| agreedPrice | `partnerPayoutVnd` | MỘT PHẦN | ORDER-OWNED | Hiện chỉ nhập lúc đóng đơn — cần cho nhập lúc phân công |
| agreedETA | `agreedEta` | CHƯA XÂY | ORDER-OWNED |  |
| capacityOverride | `overrideCapacity` | ĐỔI TÊN | ORDER-OWNED |  |
| overrideReason | `overrideReason` | CHƯA XÂY | ORDER-OWNED | Hiện vượt công suất không cần lý do |
| partnerInstruction | `notes` | CÓ | ORDER-OWNED | ĐP-1.7 (26/09, xong): lưu riêng `order_coordinations.metadata.partnerInstruction`, tách khỏi `internal_note`; view trả trường riêng |
| specialInstruction | `specialInstruction` | CHƯA XÂY | ORDER-OWNED |  |
| substitutionPolicy | (snapshot) | MI | ORDER-SNAPSHOT |  |
| requiresPartnerAcceptance, acceptanceDeadline | — | CHƯA XÂY | ORDER-OWNED | Hiện phân công là chuyển thẳng sang IN_PRODUCTION |

### 5.3. T07 — Partner Production Card

Trường nhạy cảm thương mại (giá bán, hạng VIP của khách) **không được** lộ ra với đối tác nếu không có cho phép rõ ràng. Quy tắc này áp dụng cho **mọi dạng xuất**: chữ để copy, ảnh PNG và bản in.

| Trường theo đặc tả gốc | Tên chuẩn (theo code) | Trạng thái | Sở hữu | Ghi chú |
|---|---|---|---|---|
| orderCode | `orderCode` | CÓ | ORDER-OWNED |  |
| productionCode | `orderCode` | ĐỔI TÊN | ORDER-OWNED | Code là 1 đơn – 1 lệnh sản xuất → dùng luôn mã đơn |
| issuedAt, coordinatorContact | — | CHƯA XÂY | ORDER-OWNED |  |
| partnerName | `partnerName` | CÓ | ORDER-OWNED |  |
| productionDeadline, pickupTargetTime | — | CHƯA XÂY | ORDER-OWNED |  |
| deliveryTargetTime | `deliveryTargetTime` | CÓ | ORDER-OWNED |  |
| productName, productType, quantity, size, style, colorTone | (snapshot) | MỘT PHẦN | ORDER-SNAPSHOT | Chỉ có `productTitle` |
| referenceImages[] | `sampleImageUrl` | MỘT PHẦN | ORDER-SNAPSHOT |  |
| BOM hoa | `flowers[]` | MỘT PHẦN | ORDER-SNAPSHOT | 5 trường luôn có; ĐP-2.12 (26/09): `shade`/`budCount` thêm vào hiển thị T07 khi đơn có snapshot Master Index (`productId`) |
| foliage[], wrapping[], accessories[] | — | CÓ | ORDER-SNAPSHOT | ĐP-2.12 (26/09): nối `foliage`/`wrapping`/`accessories` từ snapshot vào cả `PartnerProductCard` (T07-BRIEF) và `PartnerProductionCard` (T07-xưởng) — trước đó 2 màn được gọi mà không truyền props này dù component đã nhận. Chỉ có khi đơn chọn mẫu từ danh mục |
| cardMessage | `cardMessage` | CÓ | ORDER-OWNED |  |
| cardSignature, cardStyle | — | CHƯA XÂY | ORDER-OWNED |  |
| substitutionPolicy, allowedSubstitutions[], forbiddenSubstitutions[], approvalRequired | — | CHƯA XÂY | ORDER-SNAPSHOT |  |
| recipientName, recipientPhone, deliveryAddress | — | CÓ | ORDER-OWNED |  |
| landmark, building, floor, deliveryInstruction | — | CHƯA XÂY | ORDER-OWNED |  |
| Partner CTA (ACCEPT · DECLINE · ASK_QUESTION · REPORT_ISSUE · READY) | nút thao tác của điều phối viên | CHƯA XÂY | PARTNER | PO 26/09 (D3): KHÔNG xây cổng đối tác. Đối tác trả lời qua Zalo/điện thoại, điều phối viên bấm thay và ghi vết nhập hộ (nhóm PROXY) |
| Quy tắc không lộ giá bán | — | MỘT PHẦN | — | Bản chữ đã loại giá bán; ẢNH PNG vẫn in "Giá bán khách" (lỗi G5) |

### 5.4. T08 — Partner Acceptance

| Trường theo đặc tả gốc | Tên chuẩn (theo code) | Trạng thái | Sở hữu | Ghi chú |
|---|---|---|---|---|
| productionOrderId … declineAlternativeETA (14 trường) + response ACCEPT · DECLINE · CONDITIONAL_ACCEPT | — | CHƯA XÂY | PARTNER | `productionOrderId` → dùng `orderId` (quan hệ 1–1). Điều phối viên nhập hộ (nhóm PROXY). Gần nhất hiện có: sự cố loại `PARTNER_DECLINE` |

### 5.5. T09 — Partner Question

| Trường theo đặc tả gốc | Tên chuẩn (theo code) | Trạng thái | Sở hữu | Ghi chú |
|---|---|---|---|---|
| questionId … status (16 trường) | — | CHƯA XÂY | PARTNER | Điều phối viên nhập hộ (nhóm PROXY) |

---

## 6. P4 — LÀM ĐÚNG

Hành động của `productionUpdateSchema`: `UPDATE_PROGRESS · MARK_READY · REPORT_MATERIAL_ISSUE`.

### 6.1. T10 — Production Status Update

| Trường theo đặc tả gốc | Tên chuẩn (theo code) | Trạng thái | Sở hữu | Ghi chú |
|---|---|---|---|---|
| productionOrderId | `orderId` | ĐỔI TÊN | ORDER-OWNED |  |
| status | `action` = `UPDATE_PROGRESS` | ĐỔI TÊN | ORDER-OWNED |  |
| progressPercent | `progressPercent` | CÓ | ORDER-OWNED |  |
| reportedAt, reportedBy | `order_events` / `audit_logs` (`ctx.userId`) | MỘT PHẦN | SYSTEM | Người ghi là điều phối viên nhập hộ đối tác |
| currentETA, previousETA, etaChangeMinutes | — | CHƯA XÂY | ORDER-OWNED |  |
| productionNote | — | CHƯA XÂY | ORDER-OWNED | `issueNote` chỉ dùng khi báo thiếu vật liệu |
| photoUrls[] | `finishedAssetIds[]` | ĐỔI TÊN | EVIDENCE | Tối đa 10 ảnh, kiểm cùng tổ chức |
| scheduleVarianceMinutes, delayRisk, delayRiskReason | `riskLevel`, `riskReason` | MỘT PHẦN | DERIVED | `evaluateRisk` tính theo giờ giao, chưa theo ETA sản xuất |

### 6.2. T11 — Production Issue Report

| Trường theo đặc tả gốc | Tên chuẩn (theo code) | Trạng thái | Sở hữu | Ghi chú |
|---|---|---|---|---|
| issueType | `action` = `REPORT_MATERIAL_ISSUE` → sự cố `MATERIAL_SHORTAGE` | MỘT PHẦN | ORDER-OWNED | Code chỉ hỗ trợ 1 loại; đặc tả có 11 loại. Phải ánh xạ vào `EXCEPTION_TYPES` hiện có, bổ sung enum khi cần |
| description | `issueNote` → `order_exceptions.description` | ĐỔI TÊN | ORDER-OWNED |  |
| severity | `severity` (mặc định MEDIUM) | MỘT PHẦN | ORDER-OWNED | Không cho chọn khi báo từ form sản xuất |
| reportedBy, reportedAt | `reported_by`, `created_at` | CÓ | SYSTEM |  |
| affectedComponent … requiresCoordinatorDecision (11 trường) | — | CHƯA XÂY | ORDER-OWNED |  |

### 6.3. T12 — Production Completion

| Trường theo đặc tả gốc | Tên chuẩn (theo code) | Trạng thái | Sở hữu | Ghi chú |
|---|---|---|---|---|
| completedBy, completedAt | `order_events` / `audit_logs` | MỘT PHẦN | SYSTEM |  |
| finishedImageUrls[] | `finishedImageUrls` (`finished_asset_ids`) | CÓ | EVIDENCE | Bắt buộc ≥1 ảnh khi `MARK_READY` |
| readyForQC | stage → `QUALITY_CHECK` | CÓ | DERIVED |  |
| actualProductionDuration, actualReadyAt, finishedVideoUrl, completionNote, allComponentsAvailable, substitutionUsed, substitutionDetails[] | — | CHƯA XÂY | EVIDENCE |  |
| frontImage, sideImage, detailImage, packagingImage, cardImage | — | CHƯA XÂY | EVIDENCE | Mảng ảnh hiện không gắn vai trò góc chụp |

---

## 7. P5 — KIỂM TRA ĐÚNG

Quyết định QC dùng enum của code: `PASSED · REWORK_REQUESTED · REJECTED` (`qc_record_status`). Đề xuất AI **không phải** quyết định cuối cùng.

### 7.1. T13 — QC Request

| Trường theo đặc tả gốc | Tên chuẩn (theo code) | Trạng thái | Sở hữu | Ghi chú |
|---|---|---|---|---|
| qcRequestId … status (13 trường) | — | CHƯA XÂY | ORDER-OWNED | QC hiện chạy trực tiếp khi đơn ở `QUALITY_CHECK`, không có bước yêu cầu |

### 7.2. T14 — QC Checklist

| Trường theo đặc tả gốc | Tên chuẩn (theo code) | Trạng thái | Sở hữu | Ghi chú |
|---|---|---|---|---|
| checklist | `checklist` (`Record<string, boolean>`) | MỘT PHẦN | EVIDENCE | Khoá tự do, chỉ đúng/sai. Domain type `QCInspectionRecord.checklistResult` có cấu trúc nhưng chưa lên API |
| Nhóm Product/Construction/Quality/Reference (19 tiêu chí) | — | CHƯA XÂY | EVIDENCE | Cần danh mục tiêu chí cố định + cấu trúc từng mục `{ checkId, criterion, expected, actual, result, severity, note, evidenceImageUrls[], checkedBy, checkedAt }` |

### 7.3. T15 — AI QC Report

| Trường theo đặc tả gốc | Tên chuẩn (theo code) | Trạng thái | Sở hữu | Ghi chú |
|---|---|---|---|---|
| overallScore | `aiScore` (`order_qc_records.ai_score`) | ĐỔI TÊN | AI | Chỉ ghi khi có lượt Vision thật (nợ #140), không nhận từ client |
| observations[] | `aiCritique` (`ai_critique`) | MỘT PHẦN | AI | Có ở DB, chưa lên view; là chuỗi, chưa phải mảng |
| flowerMatchScore … qualityScore (9 điểm thành phần), confidence, violations[], riskFlags[], missingEvidence[], recommendations[] | — | CHƯA XÂY | AI |  |
| humanDecision / overallResult | `decision`: PASSED · REWORK_REQUESTED · REJECTED | ĐỔI TÊN | ORDER-OWNED | Dùng enum `qc_record_status` của code. Giá trị `REPLACE` của đặc tả không có — đi qua T17 |
| decidedBy, decidedAt | `inspector_id`, `created_at` | CÓ | SYSTEM |  |
| humanOverride, overrideReason | — | CHƯA XÂY | ORDER-OWNED |  |

### 7.4. T16 — Rework Request

| Trường theo đặc tả gốc | Tên chuẩn (theo code) | Trạng thái | Sở hữu | Ghi chú |
|---|---|---|---|---|
| reason / reworkInstructions | `notes` → sự cố `QC_FAILURE` + `nextAction` | MỘT PHẦN | ORDER-OWNED | Làm lại = quay về IN_PRODUCTION, tiến độ về 0 |
| reworkId, failedCriteria[], requiredChanges[], reworkDeadline, newProductionETA, partnerAcknowledged, acknowledgedAt, priority, completedAt, status… | — | CHƯA XÂY | ORDER-OWNED |  |

### 7.5. T17 — Replacement Request

**Mục đích (đã xác minh, PO 26/09/2026, D6: không gộp với T24):** thay **SẢN PHẨM** khi QC kết luận sản phẩm sai nặng, không sửa được (Operations System §5.3: *"materially non-compliant → replacement"*; Workflow Orchestration: `T15 → T16 hoặc T17`).

- Đối tượng bị thay là **sản phẩm**.
- Được kích hoạt từ **QC** (bước P5).
- Sản phẩm thay có thể do **chính đối tác cũ** làm lại từ đầu (quay về T10/T12), hoặc do **đối tác khác** làm. Trường hợp thứ hai, T17 **tạo ra một T24** và chỉ lưu liên kết `partnerReplacementId`. Các trường chọn đối tác mới trong đặc tả gốc của T17 (`replacementPartnerId`, `candidateSelectionMode`, `replacementAssignmentId`) được lấy từ T24, không nhập lặp.

| Trường theo đặc tả gốc | Tên chuẩn (theo code) | Trạng thái | Sở hữu | Ghi chú |
|---|---|---|---|---|
| replacementRequestId … oldPartnerSettlementRequired (17 trường) | — | CHƯA XÂY | ORDER-OWNED | Mục đích: **thay SẢN PHẨM** không đạt QC. KHÔNG gộp với T24 (PO 26/09, D6). Các trường chọn đối tác mới (`replacementPartnerId`, `candidateSelectionMode`, `replacementAssignmentId`) lấy từ T24 liên kết, không nhập lặp — xem §7.5 |

---

## 8. P6 — GIAO ĐÚNG

Sự kiện giao dùng enum của code: `PICKED_UP · ON_THE_WAY · DELIVERED_SUCCESS · DELIVERY_FAILED` (cột `delivery_state`). Các sự kiện này ánh xạ sang trục `orders.delivery_status` qua hàm `deliveryStatusFor()`.

### 8.1. T18 — Delivery Card

| Trường theo đặc tả gốc | Tên chuẩn (theo code) | Trạng thái | Sở hữu | Ghi chú |
|---|---|---|---|---|
| deliveryId | `orderId` | ĐỔI TÊN | ORDER-OWNED | Code: giao hàng nằm trên `order_coordinations` (1–1) |
| carrierType / carrier | `carrier` | MỘT PHẦN | ORDER-OWNED | Chuỗi tự do |
| deliveryCode, pickupLocation, pickupContact, deliveryLocation, deliveryZone, distanceKm, estimatedTravelMinutes | — | CHƯA XÂY | ORDER-OWNED |  |
| pickupAddress | `partners.address` | MỘT PHẦN | ORDER-OWNED | Suy ra từ đối tác được phân công |
| deliveryAddress | `deliveryAddress` | CÓ | ORDER-OWNED |  |
| deliveryTargetTime | `deliveryTargetAt` | CÓ | ORDER-OWNED |  |
| pickupTargetTime, deliveryWindowStart/End, latestArrivalTime | — | CHƯA XÂY | ORDER-OWNED |  |
| recipientName, recipientPhone | — | CÓ | ORDER-OWNED |  |
| alternatePhone, recipientAvailability, 5 trường chỉ dẫn, productSummary, packageCount, specialHandling, fragile, temperatureSensitive | — | CHƯA XÂY | ORDER-OWNED |  |

### 8.2. T19 — Pickup Request

| Trường theo đặc tả gốc | Tên chuẩn (theo code) | Trạng thái | Sở hữu | Ghi chú |
|---|---|---|---|---|
| pickupRequestId … exceptionReason (17 trường) + trạng thái REQUESTED … CANCELLED | — | CHƯA XÂY | ORDER-OWNED | Hiện chỉ có sự kiện giao `PICKED_UP` |

### 8.3. T20 — Delivery Status

| Trường theo đặc tả gốc | Tên chuẩn (theo code) | Trạng thái | Sở hữu | Ghi chú |
|---|---|---|---|---|
| status | `event` / `delivery.state`: PICKED_UP · ON_THE_WAY · DELIVERED_SUCCESS · DELIVERY_FAILED | ĐỔI TÊN | EVIDENCE |  |
| reportedBy, reportedAt | `audit_logs` / `order_events` | MỘT PHẦN | SYSTEM |  |
| shipper (code có, đặc tả không) | `shipperName` (bắt buộc), `shipperPhone` | CÓ | ORDER-OWNED | Giữ theo code |
| currentLocation, latitude, longitude, departedAt, estimatedArrivalAt, arrivedAt, delayMinutes, delayReason, recipientContactAttempted, recipientContactAt, statusNote, evidenceImages[] | — | CHƯA XÂY | EVIDENCE |  |
| pickupAt | — | CHƯA XÂY | EVIDENCE | Thời điểm sự kiện PICKED_UP chỉ nằm trong `order_events` |

### 8.4. T21 — Proof of Delivery

| Trường theo đặc tả gốc | Tên chuẩn (theo code) | Trạng thái | Sở hữu | Ghi chú |
|---|---|---|---|---|
| deliveredAt | `actualDeliveryAt` / `podCapturedAt` | ĐỔI TÊN | EVIDENCE |  |
| recipientName (người ký nhận) | `recipientSignedName` (API) → `podRecipientName` (view) | ĐỔI TÊN | EVIDENCE |  |
| podImageUrls[] | `podAssetId` → `podImageUrl` | MỘT PHẦN | EVIDENCE | Chỉ 1 ảnh. Quy tắc: thành công cần ảnh POD HOẶC tên người ký |
| failureReason | `failureReason` → sự cố `DELIVERY_FAILURE` | ĐỔI TÊN | EVIDENCE |  |
| recipientConfirmation, signatureUrl, deliveryNote, handoffMethod, handoffLocation, recipientRelationship | — | CHƯA XÂY | EVIDENCE |  |
| attemptCount, attemptedAt[], attemptReason[], alternateHandoff, alternateRecipient, alternateRecipientPhone, failureCategory, returnToShop, redeliveryRequired, redeliveryTargetTime | — | CHƯA XÂY | EVIDENCE |  |

---

## 9. P7 — ĐÓNG ĐÚNG

### 9.1. T25 — Order Completion

| Trường theo đặc tả gốc | Tên chuẩn (theo code) | Trạng thái | Sở hữu | Ghi chú |
|---|---|---|---|---|
| deliveryCompleted | `stage = DELIVERED` (`checkClosure`) | CÓ | DERIVED |  |
| noOpenException | `openExceptionCount = 0` (`checkClosure`) | CÓ | DERIVED |  |
| qcPassed, partnerAssigned | (bảo đảm qua luồng chuyển bước) | CÓ | DERIVED |  |
| podAvailable | ảnh POD hoặc tên ký nhận (`checkDeliveryUpdate`) | MỘT PHẦN | DERIVED |  |
| paymentConfirmed | `balanceVnd = 0` | CHƯA XÂY | DERIVED | Cổng đóng đơn: còn phải thu = 0, hoặc có sự cố `COMMERCIAL_ISSUE` đã được duyệt (ví dụ công nợ doanh nghiệp) |
| completedBy, completedAt | `closed_by`, `closedAt` | ĐỔI TÊN | SYSTEM |  |
| completionNote | `notes` → `closureNotes` | ĐỔI TÊN | ORDER-OWNED |  |
| finalStatus | `stage = COMPLETED` | ĐỔI TÊN | ORDER-OWNED |  |
| customerComplaint, customerFeedback, customerSatisfaction | — | CHƯA XÂY | ORDER-OWNED |  |
| sellingPrice | `unitPriceVnd` | ĐỔI TÊN | ORDER-OWNED |  |
| partnerCost | `partnerPayoutVnd` | ĐỔI TÊN | ORDER-OWNED |  |
| discount, deliveryFee (`shippingFeeVnd`), deliveryCost, otherCost, grossMargin, settlementStatus | — | CHƯA XÂY | ORDER-OWNED | Tiền dùng hậu tố `Vnd` |
| partnerOverallRating | `partnerRating` (số nguyên 1–5) | ĐỔI TÊN | ORDER-OWNED |  |
| qualityRating, onTimeRating, communicationRating, complianceRating | — | CHƯA XÂY | ORDER-OWNED |  |
| promisedAt | `deliveryTargetAt` | ĐỔI TÊN | ORDER-OWNED |  |
| actualDeliveredAt | `actualDeliveryAt` | ĐỔI TÊN | EVIDENCE |  |
| varianceMinutes, slaStatus | — | CHƯA XÂY | DERIVED |  |
| delayReason | — | CHƯA XÂY | ORDER-OWNED |  |

### 9.2. T26 — Partner Performance Record

| Trường theo đặc tả gốc | Tên chuẩn (theo code) | Trạng thái | Sở hữu | Ghi chú |
|---|---|---|---|---|
| partnerId … overallOperationalScore (24 trường) | — | CHƯA XÂY | ANALYTICS | Hiện chỉ có `partners.rating`. Nguyên tắc đặc tả (giữ số liệu thô) là đúng |

### 9.3. T27 — Order Learning Record

| Trường theo đặc tả gốc | Tên chuẩn (theo code) | Trạng thái | Sở hữu | Ghi chú |
|---|---|---|---|---|
| orderId … confidence (20 trường) | — | CHƯA XÂY | ANALYTICS | Component `OrderClosureLearningCard` có nhưng không được render |

---

## 10. Lớp ngoại lệ

Đơn có sự cố đang mở thì chuyển sang `stage = EXCEPTION`. Khi mọi sự cố đã xử lý xong, đơn quay về bước lưu trong `resume_stage`. Cơ chế này đã có trong code.

### 10.1. T22 — Exception Card

| Trường theo đặc tả gốc | Tên chuẩn (theo code) | Trạng thái | Sở hữu | Ghi chú |
|---|---|---|---|---|
| exceptionId | `id` + `code` (`order_exceptions`) | ĐỔI TÊN | ORDER-OWNED |  |
| exceptionType | `type`: 8 giá trị `EXCEPTION_TYPES` | ĐỔI TÊN | ORDER-OWNED | MISSING_INFORMATION · PARTNER_DECLINE · PARTNER_DELAY · MATERIAL_SHORTAGE · QC_FAILURE · DELIVERY_FAILURE · CUSTOMER_CHANGE · COMMERCIAL_ISSUE |
| severity | `severity`: LOW · MEDIUM · HIGH · CRITICAL | CÓ | ORDER-OWNED |  |
| status | `status`: OPEN · RESOLVED | CÓ | ORDER-OWNED | Cột là chuỗi, chưa phải enum Prisma |
| detectedAt, detectedBy | `createdAt`, `reported_by` | ĐỔI TÊN | SYSTEM |  |
| description, resolution, resolvedBy, resolvedAt | `description`, `resolution`, `resolved_by`, `resolvedAt` | CÓ | ORDER-OWNED |  |
| ownerId, impact, affectedStage, affectedDeadline, currentETA, newETA, delayMinutes, 4 trường impact, evidenceImages[], relatedEventIds[], aiRisk, aiSuggestion, aiConfidence, alternativeActions[], resolutionPlan | — | CHƯA XÂY | ORDER-OWNED | Lưu ý: đơn có sự cố mở → `stage = EXCEPTION`, quay lại `resume_stage` khi xử lý xong (đã có) |
| CTA | RESOLVE (có) · CANCEL (route riêng, có) · CHANGE_PARTNER (qua phân công lại) · ESCALATE, REWORK (chưa) | MỘT PHẦN | — |  |

### 10.2. T23 — Escalation Request

| Trường theo đặc tả gốc | Tên chuẩn (theo code) | Trạng thái | Sở hữu | Ghi chú |
|---|---|---|---|---|
| escalationId … decidedAt (19 trường) | — | CHƯA XÂY | ORDER-OWNED |  |

### 10.3. T24 — Partner Replacement

**Mục đích (đã xác minh, PO 26/09/2026, D6: không gộp với T17):** thay **ĐỐI TÁC** của đơn (Workflow Orchestration: nhánh của T07; Consistency Matrix: *"Replace partner"*, xuyên suốt các bước).

- Đối tượng bị thay là **đối tác được phân công**.
- Kích hoạt từ **nhiều nguồn**: đối tác từ chối (T08), đối tác trễ, mất công suất, sự cố sản xuất (T11/T22), hoặc T17 cần đối tác khác.
- Có thể xảy ra **trước khi có sản phẩm nào**, nên không thể là một phần của T17.

| Trường theo đặc tả gốc | Tên chuẩn (theo code) | Trạng thái | Sở hữu | Ghi chú |
|---|---|---|---|---|
| replacementId … status (28 trường) | — | CHƯA XÂY | ORDER-OWNED | Mục đích: **thay ĐỐI TÁC**. Khác T17, không gộp (PO 26/09, D6) — xem §10.3 |

---

## 11. Form vận hành bổ sung

### 11.1. Hồ sơ đối tác

| Trường theo đặc tả gốc | Tên chuẩn (theo code) | Trạng thái | Sở hữu | Ghi chú |
|---|---|---|---|---|
| partnerId | `id` | CÓ | ORDER-OWNED |  |
| (code có, đặc tả không) | `code` | CÓ | ORDER-OWNED | Mã đối tác duy nhất trong tổ chức — giữ |
| businessName | `name` | ĐỔI TÊN | ORDER-OWNED |  |
| phone | `phone` | CÓ | ORDER-OWNED |  |
| address | `address` | CÓ | ORDER-OWNED | Chuỗi tự do |
| ward | — | CHƯA XÂY | ORDER-OWNED | Địa chỉ đối tác chưa theo `StructuredAddress` — xem §5 |
| district | `district` | CÓ | ORDER-OWNED |  |
| city | `province` | ĐỔI TÊN | ORDER-OWNED |  |
| partnerTier | `tier` | ĐỔI TÊN | ORDER-OWNED |  |
| status | `isActive` | MỘT PHẦN | ORDER-OWNED |  |
| dailyCapacity | `capacityDaily` | ĐỔI TÊN | ORDER-OWNED |  |
| qualityScore | `rating` (0–5, 2 chữ số thập phân) | ĐỔI TÊN | ANALYTICS |  |
| legalName, contactName, email, latitude, longitude, capabilities[], productTypes[], occasionTypes[], styleCapabilities[], serviceAreas[], serviceRadiusKm, peakCapacity, operatingHours, sameDayCutoff, productionLeadTime, qcCapability, deliveryCapability, paymentTerms, pricingRules, standardLaborCost, onTimeRate, suspendedAt, suspensionReason | — | CHƯA XÂY | ORDER-OWNED |  |

### 11.2. Huỷ đơn

| Trường theo đặc tả gốc | Tên chuẩn (theo code) | Trạng thái | Sở hữu | Ghi chú |
|---|---|---|---|---|
| reason | `reason` → `cancelledReason` | ĐỔI TÊN | ORDER-OWNED | Bắt buộc; quyền R6 |
| requestedBy, requestedAt | `audit_logs` / `order_events` | MỘT PHẦN | SYSTEM |  |
| cancellationId, category, productionStarted, productCompleted, partnerCostIncurred, deliveryIncurred, refundRequired, refundAmount, customerNotified, partnerNotified, approvedBy, approvedAt, status | — | CHƯA XÂY | ORDER-OWNED |  |

---

## 12. Trường có điều kiện theo loại đơn

Cả nhóm phụ thuộc trường `orderType` (chưa xây). Danh sách trường của từng loại giữ nguyên như §12 của bản gốc (lưu ở archive). Khi thi công, tên trường được chuẩn hoá theo quy ước ở §0.

| Trường theo đặc tả gốc | Tên chuẩn (theo code) | Trạng thái | Sở hữu | Ghi chú |
|---|---|---|---|---|
| Tang lễ / Chia buồn (10 trường) | — | CHƯA XÂY | ORDER-OWNED | Phụ thuộc `orderType` |
| Cưới / Sự kiện (10 trường) | — | CHƯA XÂY | ORDER-OWNED |  |
| Doanh nghiệp (7 trường) | — | CHƯA XÂY | ORDER-OWNED | Phụ thuộc MI-9 |
| Gấp trong ngày (6 trường) | — | CHƯA XÂY | ORDER-OWNED | Trùng các mốc thời gian của Form Lập kế hoạch |
| Khách sạn / Bệnh viện / Toà nhà bảo vệ (6 trường) | — | CHƯA XÂY | ORDER-OWNED | Trùng các trường mở rộng địa chỉ |

---

## 13. Mức tối thiểu để bán được (Commercial-Ready Minimum): hệ thống trả lời được tới đâu

| Câu hỏi | Trường cần | Hiện trả lời được? |
|---|---|---|
| Đã bán gì? | sản phẩm + quy cách + số lượng + phụ kiện | Một phần. Có `productTitle`, `productId` khi chọn từ danh mục, snapshot đủ 4 nhóm BOM (ĐP-2, 26/09) và số lượng sản phẩm; đơn mẫu ngoài danh mục vẫn chỉ có BOM cành hoa nhập tay |
| Đã hứa gì? | ngày giao + khung giờ + giờ hẹn + chính sách thay thế + cam kết | Một phần. Có `deliveryTargetAt`; khung giờ chỉ là chữ tự do; chưa có chính sách thay thế và cam kết |
| Đã thu gì? | giá bán + giảm giá + phí giao + thuế + tổng + đã thu + còn phải thu | Một phần. Có `unitPriceVnd` = `totalVnd`. Thiết kế sổ thu đã chốt (§2.14), chưa thi công |
| Thực hiện tốn bao nhiêu? | tiền công đối tác + phí giao + chi phí khác | Một phần. Có `partnerPayoutVnd` (nhập lúc đóng đơn) |
| Có giữ lời hứa không? | giờ hẹn + giờ giao thật + chênh lệch + SLA | Một phần. Có `deliveryTargetAt` và `actualDeliveryAt`; chưa tính chênh lệch |
| Ai làm? | đối tác + người sản xuất + QC + tài xế | Một phần. Có `partnerId`, `inspector_id`, `shipperName` |
| Chứng minh được không? | ảnh mẫu + ảnh thành phẩm + QC + POD | Một phần. Có đủ 4 loại ảnh, nhưng mỗi loại chỉ 1 ảnh (trừ thành phẩm, tối đa 10) |
| Học lại được không? | nguyên nhân gốc + hiệu suất đối tác + bài học đơn | **Chưa**. Mới có `partners.rating` |

---

## 14. Chuỗi dữ liệu cốt lõi

| Chuỗi | Mắt xích | Mắt xích đang đứt |
|---|---|---|
| Hạn chót | `deliveryTargetAt → productionDeadlineAt → agreedEta → hạn QC → pickupTargetAt → SLA giao → chênh lệch T25 → hiệu suất T26` | Chỉ có mắt đầu (`deliveryTargetAt`) |
| Thay thế | `substitutionPolicy → T07 → T08 → T11 → T17/T24 → T14/T15 → T27` | Đứt ngay từ đầu: chính sách chưa được chụp vào đơn |
| QC hình ảnh | `ảnh tham chiếu → T07 → ảnh thành phẩm → T14 → T15 → T26` | Có ảnh mẫu và ảnh thành phẩm. Chưa có checklist cấu trúc, điểm AI thành phần và T26 |
| Ngoại lệ | `sự cố → T22 → T23/T24/làm lại → xử lý → event → T25 → T27` | Có T22 → xử lý → event → đóng. Chưa có T23, T24, T27 |

---

## 15. Địa chỉ giao hàng: hai cơ chế song song (ĐỀ XUẤT, chờ PO chọn)

### 15.1. Hiện hành (giữ nguyên, theo quyết định PO 26/09/2026)

Địa chỉ **bắt buộc** chia tầng: `street` / `ward` / `district` / `city` (+ `country`, `formattedAddress`). Chưa bỏ tầng Quận/Huyện ở thời điểm này.

**Lệch pha cần sửa ở Giai đoạn 1:** `addressSchema` trong `adapters/http-schemas.ts` là một `union`. Nhánh thứ nhất nhận **chỉ một chuỗi** rồi chuyển thành `{ formattedAddress }`. Như vậy API vẫn cho tạo đơn **không có tầng địa chỉ nào**, trái quyết định trên. Giao diện đang chặn nhưng máy chủ thì không. Đề xuất: bỏ nhánh chuỗi.

**Không đồng nhất:** địa chỉ đối tác (`partners`) chỉ có `address` (chữ tự do) + `district` + `province`, không có `ward` và không dùng `StructuredAddress`. Đề xuất cho địa chỉ đối tác dùng chung cấu trúc.

### 15.2. Bối cảnh

Từ 01/07/2025, Việt Nam chuyển sang mô hình chính quyền địa phương 2 cấp (tỉnh/thành và phường/xã), không còn cấp huyện. Địa chỉ khách cung cấp từ nay có thể ở **dạng cũ** (tỉnh → quận/huyện → phường/xã cũ) hoặc **dạng mới** (tỉnh/thành mới → phường/xã mới).

### 15.3. Đề xuất: hai cơ chế nhập, một bản ghi chuẩn

Người nhập (Sales, điều phối viên) được chọn một trong hai cơ chế:

- **Cơ chế A — Địa giới trước 01/07/2025:** Tỉnh/Thành → Quận/Huyện → Phường/Xã (như hiện nay).
- **Cơ chế B — Địa giới từ 01/07/2025:** Tỉnh/Thành → Phường/Xã.

**Kết quả phải giống nhau.** Dù nhập bằng cơ chế nào, máy chủ tra **bảng quy đổi đơn vị hành chính chính thức** rồi ghi ra **cùng một bản ghi chuẩn**, có đủ cả hai bộ tầng:

```text
deliveryAddress = {
  street, ward, district, city, country, formattedAddress,   // giữ nguyên, vẫn bắt buộc
  addressScheme: "PRE_2025" | "POST_2025",                     // cơ chế người nhập đã chọn (chỉ để truy vết)
  adminUnits: {
    pre2025:  { city, district, ward },                        // luôn được điền
    post2025: { city, ward }                                   // luôn được điền
  }
}
```

- Nhập bằng cơ chế A: tra phường/xã cũ ra phường/xã và tỉnh/thành mới.
- Nhập bằng cơ chế B: tra ngược phường/xã mới ra quận/huyện và phường/xã cũ. Nếu một phường/xã mới gồm phần đất của nhiều đơn vị cũ, form hiện **danh sách ứng viên** để người nhập chọn. Máy **không tự đoán**.
- `formattedAddress` được sinh bởi **một hàm duy nhất** từ bản ghi chuẩn, nên hai cơ chế cho ra chuỗi giống hệt nhau.

**Hai phương án, PO chọn một:**

| | Phương án 1 (khuyến nghị) | Phương án 2 |
|---|---|---|
| Các trường cấp trên cùng `ward/district/city` mang giá trị theo | Địa giới **cũ** (giữ nguyên nghĩa như dữ liệu hiện có) | Địa giới **mới**. `district` lấy từ tra ngược |
| Ảnh hưởng dữ liệu cũ | Không đổi nghĩa | Đơn cũ phải chuyển đổi để cùng nghĩa |
| Hướng tương lai | Sau này chuyển sang phương án 2 bằng một lần migration | Đã theo địa giới mới |

**Điều kiện tiên quyết:** cần một bộ dữ liệu quy đổi đơn vị hành chính cũ ↔ mới có nguồn chính thức, được nạp vào hệ thống và có quy trình cập nhật. PO cần chốt nguồn dữ liệu trước khi thi công.

---

## 16. Cổng sẵn sàng production

Một template chỉ được coi là sẵn sàng production khi có đủ: mục đích · bước hành trình · người thao tác · mức P0/P1/có điều kiện · hai trục phân loại (§0) · kiểm tra hợp lệ · nguồn DB · nơi tiêu thụ · ảnh hưởng trạng thái · bằng chứng · đường ngoại lệ · ảnh hưởng thương mại · quyền xem · dùng cho phân tích.

**Cách thi hành:** các tiêu chí trên được khai báo trong **Sổ đăng ký trường bằng code** (`src/modules/coordinator/contracts/`), và được kiểm tra tự động theo mẫu `npm run check:schemas:coordinator` / `check:template-ssot` hiện có. Tài liệu này chỉ đồng bộ theo sổ đó, không thay thế sổ.

Đặc tả gốc yêu cầu thêm "cập nhật Workflow Orchestration và Consistency Matrix". Hai tài liệu này thuộc gói `docs/ALG_COORDINATOR_AI_AGENT_PACKAGE/`, hiện **chưa có trong Registry**. Việc đưa gói này vào Registry được tách thành một việc riêng.

---

### 16.1. Cấu hình hiển thị trường (PO 26/09/2026, cùng quyết định D5)

**Yêu cầu:**

- Mọi trường dữ liệu (kể cả các trường BOM mới của MI-12) đều được **hiển thị**.
- Về sau, **admin** được quản lý và thiết lập **nội dung / trường nào được hiển thị** trên từng template/form.

**Thiết kế đề xuất:**

1. Mỗi trường trong Sổ đăng ký trường khai báo `defaultVisibility` theo **đối tượng xem**: `INTERNAL` (nội bộ tiệm) · `PARTNER` (phiếu/ảnh gửi đối tác) · `SHIPPER` (phiếu giao) · `CUSTOMER` (nội dung gửi khách). Mặc định: hiển thị tất cả với `INTERNAL`.
2. Phần cấu hình của admin được lưu theo tổ chức và **chỉ ghi đè** trên mặc định. Bỏ cấu hình thì quay về mặc định.
3. **Mức sàn không tắt được:**
   - Trường bắt buộc của một bước không được ẩn khỏi form nhập của bước đó.
   - Trường nhạy cảm thương mại (`costPriceVnd`, giá bán, hạng khách, thông tin thanh toán) mặc định **ẩn** với `PARTNER`/`SHIPPER`. Admin bật lên được, và việc bật có ghi vết. Đây chính là "cho phép rõ ràng" của Hợp đồng MI §7.
   - `costPriceVnd` **không bao giờ** hiện ngoài `INTERNAL`.
4. Giai đoạn đầu chỉ có mặc định trong code. Màn hình cấu hình của admin làm ở giai đoạn sau.

**Đã xác nhận (PO 26/09/2026): "admin" là QUẢN TRỊ NỀN TẢNG ALG.** Chủ tiệm không cấu hình phần này. Cấu hình hiển thị nằm trong khung quản trị trường ở §16.2.

### 16.2. Quản trị trường và danh mục bởi quản trị nền tảng (PO 26/09/2026)

**Nguyên lý (PO):** mọi trường dữ liệu, **khi đã được xây**, đều do quản trị nền tảng ALG **sửa được trên dashboard quản trị nền tảng**. Các danh mục giá trị (§2.15) cũng vậy.

**Nơi thực hiện:** Console Vận hành Nền tảng `/van-hanh` (có trong code: `src/app/(platform)/van-hanh`, `PlatformContext`, năng lực `N1`–`N8`, bảng `platform_operators` / `platform_audit_logs`). Console hiện mới có phần **chỉ đọc** (P25a). Tính năng này cần console có thao tác ghi.

**Kiến trúc hai lớp:**

| Lớp | Nội dung | Ai sửa |
|---|---|---|
| **Lớp mã (nền)** | Khoá trường (`key`), kiểu dữ liệu, nơi lưu (cột/JSON), luật nghiệp vụ, **hành vi** (các cách tính SLA, cách bật nhóm trường có điều kiện…) | Chỉ qua code + migration. Không sửa được lúc chạy, vì code phụ thuộc vào chúng |
| **Lớp cấu hình (DB)** | Mọi thứ còn lại, liệt kê ở bảng dưới | Quản trị nền tảng, trên Console |

Quản trị nền tảng sửa được trên từng trường:

| Hạng mục | Sửa được |
|---|---|
| Nhãn, mô tả, gợi ý nhập (placeholder), thứ tự hiển thị | Có |
| Hiển thị theo đối tượng xem (`INTERNAL` · `PARTNER` · `SHIPPER` · `CUSTOMER`), theo từng template | Có, trong mức sàn (bên dưới) |
| Mức yêu cầu: tuỳ chọn / nên có / bắt buộc | Có. Chỉ **nâng** được với trường mà luật nghiệp vụ đã bắt buộc, không hạ xuống |
| Tham số của hành vi (ví dụ N phút giao nhanh, dung sai hẹn giờ) | Có |
| Phạm vi áp dụng: toàn nền tảng, hoặc riêng một tổ chức (ghi đè) | Có |

Quản trị nền tảng sửa được trên từng danh mục, theo loại:

| Loại | Quản trị nền tảng được làm gì | Ví dụ |
|---|---|---|
| **MỞ** | Thêm, sửa nhãn, sắp xếp, tắt/bật giá trị | `channel`, `cardStyle`, `cardPlacement`, `cardLanguage`, dịp |
| **CÓ HÀNH VI** | Như MỞ, nhưng mỗi giá trị mới phải **chọn một hành vi có sẵn trong code** | `serviceLevel` (chọn cách tính SLA), `orderType` (chọn nhóm trường có điều kiện), `priority` (chọn bậc nền), `deliveryType`, `deliveryLocationType`, `paymentMethod`, `collectionMethod` |
| **ĐÓNG** | Chỉ sửa nhãn, mô tả, thứ tự. Không thêm, không tắt | Giá trị mà logic code dựa vào: `stage`, `qc decision`, sự kiện giao, `paymentStatus` (suy ra), `kind` của sổ thu |

**Mức sàn, không cấu hình được:**

1. `costPriceVnd` chỉ hiện `INTERNAL`.
2. Trường bắt buộc theo luật nghiệp vụ không ẩn được khỏi form nhập của bước đó.
3. Không xoá cứng giá trị danh mục đã từng được dùng, chỉ **tắt**. Đơn cũ vẫn đọc được nhãn.
4. Mã giá trị (`code`) không đổi được sau khi tạo. Chỉ nhãn đổi được, để dữ liệu lịch sử và báo cáo không vỡ.
5. Mọi thay đổi ghi vào `platform_audit_logs` (ai, lúc nào, giá trị cũ → mới).

Mức sàn 1 và 2 là quy tắc an toàn đã chốt trước đó. Nếu PO muốn quản trị nền tảng được bỏ qua cả hai, cần một quyết định riêng.

Tạo **trường hoàn toàn mới** lúc chạy đã được PO duyệt ngày 26/09/2026. Xem §16.3.

**Hạng mục thi công** (ĐP-3, cập nhật 26/09/2026 — xem `KE_HOACH_DIEU_PHOI_TRUONG_DU_LIEU.md`):

- ✅ **Xong (backend):** bảng cấu hình cấp nền tảng — `field_definitions` · `field_catalogs` · `field_catalog_values` · `field_config_overrides` (ngoại lệ có chủ đích của Luật 1, cùng hạng với `platform_operators`), cùng cột `custom_fields` (JSON) trên `order_coordinations`/`partners`.
- ✅ **Xong:** mã năng lực nền tảng mới `N12 platform.field_catalog.manage` (`N9`–`N11` vẫn dành cho tuyến AI-1).
- ✅ **Xong (backend):** 6 module miền thuần (registry, hành vi, luật gộp cấu hình hiệu lực, schema trường tự tạo, gate chuyển bước, chiếu theo đối tượng xem), 3 kho dữ liệu, 9 use-case, 6 tuyến API `/api/v1/platform/fields*`, `/api/v1/platform/catalogs*`, `/api/v1/platform/organizations/:id/field-overrides`, và tuyến đọc `/api/v1/field-config` cho phía tenant (`R1`). Có script nạp danh mục (`seed:field-registry`) và 9 tệp test (đơn vị + `tests/platform/` + `tests/tenant/`).
- ✅ **Xong:** lệnh kiểm tra tự động `check:field-registry` — đối chiếu lớp cấu hình trong DB chỉ tham chiếu khoá trường và hành vi có thật trong lớp mã (registry + `behaviors.ts`).
- ✅ **Xong:** màn Console "Trường & danh mục" (`/van-hanh/truong-du-lieu`, 4 tab: Trường lõi · Trường tự tạo · Danh mục · Ghi đè theo tổ chức), có "xem trước" theo tổ chức và xác nhận-có-diff cho mọi thao tác ghi. Thêm 2 tuyến đọc phụ trợ (`/platform/organizations/:id/field-preview`, `/platform/behaviors`) để màn hình gọi.
- ✅ **Xong (3.16, 26/09/2026):** nối `applyCustomFields`/gate chuyển bước (`findMissingRequiredFields`)/`projectForAudience` vào luồng đơn THẬT cho entity `ORDER` — `create-coordinator-order.ts` (lưu `customFields` lúc tạo), use-case mới `update-order-custom-fields.ts` (`PATCH /coordinator/orders/:id/custom-fields`, R3, trộn giá trị), `update-coordinator-stage.ts` (chặn rời bước còn trường `requiredAtStage` trống — lookup qua `shared.ts#buildOrderFieldValueLookup`), `<ConfiguredField>`/`<CustomFieldsSection>` mới (`src/components/coordinator/custom-fields-section.tsx`) nối vào form T01 (Sales Intake, ô nhập trực tiếp) và thẻ T02/T07 (hiển thị đã lọc theo đối tượng PARTNER qua `visibleCustomFieldsForAudience`). **CÒN LẠI, ghi nợ tường minh — không phải bỏ sót:** entity `PARTNER` chưa có form gọi `CustomFieldsSection`; các template khác của Điều phối (T04/T06/T10/T24, Chi tiết đơn chung) chưa có ô nhập/hiển thị lọc — sửa qua API trực tiếp; không có màn SHIPPER-facing (T18) trong mã nguồn để nối; kiểu IMAGE/FILE/STRUCTURED_ADDRESS/ASSET_REF chưa có ô nhập ở `CustomFieldsSection` (cần luồng `assets`/địa chỉ riêng); SELECT/MULTI_SELECT tạm nhập chuỗi tự do, chưa đọc `catalogKey` thật. Test mới: `tests/tenant/coordinator.test.ts` +4 ca.
- ⏳ **Chưa làm:** bộ nhớ đệm cấu hình phía máy chủ (hiện đọc thẳng DB mỗi lần, ghi nợ hiệu năng — xem ghi chú trong `get-effective-field-config.ts`).

### 16.3. Trường tự tạo bởi quản trị nền tảng (PO 26/09/2026, D13)

Quản trị nền tảng **tạo được trường hoàn toàn mới** ngay trên Console Vận hành, không cần sửa code.

**Cách hoạt động:**

- Định nghĩa trường nằm trong bảng cấp nền tảng `field_definitions`, với `origin = CUSTOM`. Bảng này dùng chung với trường lõi (`origin = CORE`).
- Giá trị nằm trong cột JSON `custom_fields` **trên chính dòng tenant** (đơn, đối tác…). Nhờ vậy cách ly tổ chức sẵn có theo `organization_id`.
- Máy chủ kiểm tra giá trị bằng zod sinh từ định nghĩa đang hoạt động.

**Quản trị nền tảng khai khi tạo trường:**

- Nhãn, mô tả, gợi ý nhập.
- **Kiểu dữ liệu:** `TEXT` · `LONG_TEXT` · `NUMBER` · `MONEY_VND` · `DATE` · `DATETIME` · `BOOLEAN` · `SELECT` · `MULTI_SELECT` · `PHONE` · `EMAIL` · `URL` · `IMAGE` · `FILE`.
- Thực thể gắn vào: đơn điều phối, đối tác; sau này thêm bản ghi QC, sự cố, dòng sổ thu.
- Vị trí: template/form nào, khu vực nào, thứ tự.
- Mức yêu cầu, và **bước bắt buộc phải có** (chặn rời bước khi còn trống).
- Hiển thị theo đối tượng xem.
- Kiểm tra hợp lệ: độ dài, khoảng giá trị, mẫu.
- Danh mục (với kiểu chọn).
- Độ nhạy: `NORMAL` · `PII` · `SENSITIVE`.
- Phạm vi: toàn nền tảng, hoặc chỉ một số tổ chức.

**Giới hạn an toàn** (lớp mã, không vượt được):

- Khoá do máy sinh (`cf_…`), không đổi được, không trùng khoá lõi.
- Không đổi kiểu dữ liệu khi trường đã có giá trị.
- Chỉ **tắt**, không xoá. Giá trị cũ giữ nguyên.
- Tối đa 50 trường tự tạo cho mỗi thực thể. Mỗi giá trị ≤ 4 KB.
- Trường tự tạo **không** tham gia tính SLA, rủi ro, giá hay chuyển bước, ngoài quy tắc "bắt buộc theo bước".
- `PII` mặc định ẩn với đối tác/shipper. `SENSITIVE` không bao giờ gửi ra nhà cung cấp AI ngoài.
- Mọi thao tác ghi vào `platform_audit_logs`.

**Quan hệ với Master Index:** trường tự tạo gắn vào đơn là dữ liệu giao dịch (ORDER-OWNED). **Không** tự động trở thành trường của Product/Customer Master Index (Hợp đồng MI §10).

Chi tiết thi công ở kế hoạch `KE_HOACH_DIEU_PHOI_TRUONG_DU_LIEU.md`, giai đoạn ĐP-3.

## 17. Khác biệt so với đặc tả gốc và điểm chờ quyết định

| # | Nội dung | Xử lý trong bản này | Cần PO quyết? |
|---|---|---|---|
| D1 | Tên trường khác code (`buyerCustomerId`, `productName`, `sellingPrice`, `partnerCost`, `deliveryFee`…) | Đã đổi theo code (§0) | Không |
| D2 | Toàn hệ thống chưa có miền thanh toán | **ĐÃ CHỐT 26/09:** thuộc cả hai module. Trả trước → Đơn hàng; phần còn lại → Điều phối thu. Đơn luôn ghi Tổng / Đã thu / Còn phải thu (§2.14) | Xong |
| D3 | Trường chủ `PARTNER` giả định đối tác đăng nhập được hệ thống | **ĐÃ CHỐT 26/09:** KHÔNG xây cổng đối tác. Điều phối viên thao tác và tải ảnh/video thay đối tác, có vết nhập hộ (§2.16) | Xong |
| D4 | `productionOrderId`, `deliveryId`, `pickupRequestId` giả định quan hệ 1–nhiều | Ánh xạ về `orderId` (quan hệ 1–1 của code). Lịch sử làm lại/đổi đối tác lưu thành bản ghi riêng (T16/T17/T24) | Không, trừ khi PO muốn một đơn có nhiều lệnh sản xuất |
| D5 | BOM của đặc tả gốc có `variety`, `stemLength`, `substitutionAllowed/Priority`, gói có `pattern/quantity`, phụ kiện có `unit` | **ĐÃ DUYỆT 26/09, ĐÃ THI CÔNG 26/09 (ĐP-2b):** 9 trường thêm vào PMI + Vision Schema.json + hiện ở M01a/T01/T07. Sửa qua form M01b vẫn chỉ ở dạng hiện (chuỗi tổng hợp), chưa có ô nhập riêng — xem changelog v2.9 | Xong |
| D12 | Nguyên lý PO 26/09: mọi trường đã xây và mọi danh mục do quản trị nền tảng sửa được trên dashboard | Kiến trúc hai lớp mã/cấu hình, ba loại danh mục, 5 mức sàn (§16.2). Cột mới lưu mã chuỗi thay vì Prisma enum. **ĐP-3 26/09: backend + Console UI (`/van-hanh/truong-du-lieu`) đã thi công xong** — dashboard sửa được thật, xem §16.2 | Chỉ cần quyết nếu PO muốn bỏ mức sàn 1–2 |
| D13 | PO 26/09: quản trị nền tảng được tạo trường hoàn toàn mới trên dashboard | Trường tự tạo lưu định nghĩa ở `field_definitions`, giá trị ở JSON `custom_fields` trên dòng tenant, kèm giới hạn an toàn (§16.3). **ĐP-3.16 26/09: đã nối vào luồng đơn thật cho entity `ORDER`** (tạo đơn, sửa sau qua route riêng, gate `requiredAtStage`, form T01 + thẻ T02/T07) — entity `PARTNER` và các template khác còn lại, xem §16.2 | Xong |
| D6 | T17 và T24 trùng nhiều trường | **ĐÃ XÁC MINH 26/09: mục đích KHÁC nhau → KHÔNG gộp** (T17 thay sản phẩm, xuất phát từ QC; T24 thay đối tác, xuất phát từ nhiều nguồn). Bỏ trùng bằng liên kết T17 → T24 (§7.5, §10.3) | Xong |
| D7 | Nhiều enum chưa được định nghĩa | **ĐÃ XÂY 26/09** theo nghiên cứu thực tế (§2.15) | Xong |
| D8 | API còn nhận địa chỉ một chuỗi (§15.1) | Ghi là lỗi phải sửa | Không (đã có quyết định PO) |
| D9 | Trường AI (bóc đơn T01, gợi ý đối tác T06, điểm thành phần T15) | Ghi CHƯA XÂY. Theo nợ #140, điểm AI chỉ ghi khi có lượt Vision thật | Không |
| D10 | Loại sự cố sản xuất T11 có 11 giá trị, `EXCEPTION_TYPES` của code có 8 | Dùng enum code. Bổ sung giá trị khi thi công T11 | Không |
| D11 | Trích dẫn `citeturn…` trong bản gốc | Đã bỏ (không mở được trong repo) | Không |

---

## 18. Độ phủ hiện tại

Bảng dưới đếm **vị trí trường**. Một trường xuất hiện ở nhiều template thì được đếm ở mỗi template. Các dòng gộp nhóm được đếm theo số trường trong nhóm. Con số là ước lượng, dùng để định lượng khối việc, không dùng để nghiệm thu.

| Nhóm | CÓ | ĐỔI TÊN | MỘT PHẦN | MI | MI-THIẾU | CHƯA XÂY | Tổng |
|---|---|---|---|---|---|---|---|
| Đơn hàng — Định danh | 4 | 1 | 3 | 0 | 0 | 6 | 14 |
| Đơn hàng — Người mua | 1 | 2 | 0 | 2 | 0 | 3 | 8 |
| Đơn hàng — Người nhận | 2 | 0 | 0 | 0 | 0 | 2 | 4 |
| Đơn hàng — Dịp | 0 | 0 | 0 | 0 | 0 | 4 | 4 |
| Đơn hàng — Giao hàng | 4 | 3 | 1 | 0 | 0 | 17 | 25 |
| Đơn hàng — Sản phẩm | 4 | 1 | 3 | 0 | 0 | 2 | 10 |
| Đơn hàng — BOM hoa (`FlowerBomItem` của Product Master Index) | 9 | 0 | 2 | 0 | 0 | 0 | 11 |
| Đơn hàng — Lá (`FoliageBomItem`) | 6 | 0 | 0 | 0 | 0 | 0 | 6 |
| Đơn hàng — Gói (`WrappingLayer`) | 6 | 0 | 0 | 0 | 0 | 0 | 6 |
| Đơn hàng — Phụ kiện (`AccessoryBomItem`) | 7 | 0 | 0 | 0 | 0 | 0 | 7 |
| Đơn hàng — Thiệp | 1 | 0 | 0 | 0 | 0 | 5 | 6 |
| Đơn hàng — Thương mại | 1 | 2 | 1 | 0 | 0 | 9 | 13 |
| Đơn hàng — Thay thế | 0 | 0 | 1 | 0 | 0 | 8 | 9 |
| T01 — Sales Order Intake (bổ sung ngoài Order Object) | 0 | 0 | 1 | 0 | 0 | 7 | 8 |
| T02 — Sales Order Brief | 2 | 1 | 7 | 1 | 0 | 6 | 17 |
| T03 — Missing Information Request | 0 | 0 | 0 | 0 | 0 | 15 | 15 |
| T04 — Order Change Request | 0 | 0 | 0 | 0 | 0 | 20 | 20 |
| T05 — Coordinator Order Card (view DERIVED) | 8 | 7 | 4 | 0 | 0 | 11 | 30 |
| Form Lập kế hoạch đơn (P2) | 3 | 0 | 5 | 0 | 0 | 17 | 25 |
| T06 — Partner Candidate Card | 3 | 2 | 3 | 0 | 0 | 26 | 34 |
| Form Phân công đối tác | 2 | 1 | 3 | 1 | 0 | 7 | 14 |
| T07 — Partner Production Card | 10 | 1 | 9 | 0 | 0 | 15 | 35 |
| T08 — Partner Acceptance | 0 | 0 | 0 | 0 | 0 | 14 | 14 |
| T09 — Partner Question | 0 | 0 | 0 | 0 | 0 | 16 | 16 |
| T10 — Production Status Update | 1 | 3 | 5 | 0 | 0 | 4 | 13 |
| T11 — Production Issue Report | 2 | 1 | 2 | 0 | 0 | 11 | 16 |
| T12 — Production Completion | 2 | 0 | 2 | 0 | 0 | 12 | 16 |
| T13 — QC Request | 0 | 0 | 0 | 0 | 0 | 13 | 13 |
| T14 — QC Checklist | 0 | 0 | 1 | 0 | 0 | 19 | 20 |
| T15 — AI QC Report | 2 | 2 | 1 | 0 | 0 | 15 | 20 |
| T16 — Rework Request | 0 | 0 | 1 | 0 | 0 | 10 | 11 |
| T17 — Replacement Request | 0 | 0 | 0 | 0 | 0 | 17 | 17 |
| T18 — Delivery Card | 4 | 1 | 2 | 0 | 0 | 18 | 25 |
| T19 — Pickup Request | 0 | 0 | 0 | 0 | 0 | 17 | 17 |
| T20 — Delivery Status | 1 | 1 | 2 | 0 | 0 | 13 | 17 |
| T21 — Proof of Delivery | 0 | 3 | 1 | 0 | 0 | 16 | 20 |
| T22 — Exception Card | 6 | 4 | 1 | 0 | 0 | 15 | 26 |
| T23 — Escalation Request | 0 | 0 | 0 | 0 | 0 | 19 | 19 |
| T24 — Partner Replacement | 0 | 0 | 0 | 0 | 0 | 28 | 28 |
| T25 — Order Completion | 4 | 9 | 1 | 0 | 0 | 17 | 31 |
| T26 — Partner Performance Record | 0 | 0 | 0 | 0 | 0 | 24 | 24 |
| T27 — Order Learning Record | 0 | 0 | 0 | 0 | 0 | 20 | 20 |
| Form Hồ sơ đối tác | 5 | 5 | 1 | 0 | 0 | 24 | 35 |
| Form Huỷ đơn | 0 | 1 | 2 | 0 | 0 | 13 | 16 |
| §12 — Trường có điều kiện theo loại đơn | 0 | 0 | 0 | 0 | 0 | 39 | 39 |
| Thu tiền còn lại (Điều phối — PO 26/09, D2) | 0 | 0 | 0 | 0 | 0 | 8 | 8 |
| Ghi vết nhập hộ đối tác (PO 26/09, D3) | 0 | 0 | 2 | 0 | 0 | 3 | 5 |
| **Tổng** | **100** | **51** | **67** | **4** | **0** | **585** | **807** |

---

## 19. Nguồn đối chiếu (mã nguồn, 26/09/2026)

`prisma/schema.prisma` (các model `orders`, `order_items`, `order_coordinations`, `order_qc_records`, `order_exceptions`, `partners`; các enum `coordinator_stage`, `coordination_risk_level`, `qc_record_status`, `order_status`, `production_status`, `delivery_status`) · `src/modules/coordinator/adapters/http-schemas.ts` · `src/modules/coordinator/contracts/{common,order-view}.ts` · `src/modules/coordinator/domain/operation-rules.ts` · `src/modules/coordinator/use-cases/{create-coordinator-order,operations}.ts` · `src/modules/coordinator/connectors/*` · `src/modules/products/domain/product-master-index.ts` · `src/modules/crm/domain/customer-master-index.ts` · `src/components/templates/coordinator/*` · các route `src/app/api/v1/coordinator/**`.
