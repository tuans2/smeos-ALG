# Audit logic nghiệp vụ — mức mã nguồn (06/11/2026)

> Bổ sung cho `docs/audit/architecture-audit/06_BUSINESS_LOGIC_AUDIT.md` (audit kiến trúc, mức tổng quan).
> Tài liệu này đi xuống từng hàm: luật, phép tính, validation, chuyển trạng thái, xử lý ngoại lệ — và đối
> chiếu Frontend ↔ Backend ↔ Database. Mỗi phát hiện có bằng chứng `tệp:dòng` tại commit `d9fc528`.

## 0. Phạm vi, phương pháp, giới hạn

| Mục | Nội dung |
|---|---|
| Phạm vi đọc kỹ | `orders`, `coordinator`, `costing`, `promotions`, `usage`, `subscription`, `crm` (hạng khách), `reporting`, `availability` (tồn kho), các route `api/v1/orders/**`, `api/v1/coordinator/orders/**`, component `src/components/orders/**`, `/so-lieu`, `prisma/schema.prisma` + migrations |
| Đọc chọn lọc | `greeting-card` (đang đóng băng): chỉ phần giá, mã giảm giá, chiết khấu hạng khách |
| Chưa rà | Sáng tạo nội dung/AI (`creative-production`, `content-engine`, `media`), `integration-hub`, `field-platform`, quyết toán đối tác chuỗi, `acquisition` |
| Phương pháp | Đọc mã tĩnh, lần theo mọi đường ghi vào cùng một cột (`orders.status`, `paid_vnd`, `balance_vnd`, `order_coordinations.stage`), so luật giữa các đường |
| Giới hạn | **Không chạy** test/CSDL trong đợt này (môi trường chưa cài `node_modules`, chưa có DB `_test`). Các kịch bản lỗi dưới đây suy từ mã, chưa tái hiện bằng test — mục 6 liệt kê test cần viết để chứng minh |

Mức độ: **Nghiêm trọng** (sai tiền / vượt quyền trần cứng) · **Cao** (sai luật nghiệp vụ đã chốt, dữ liệu lệch) · **Trung bình** (sai số liệu, thiếu kiểm, lệch giữa kênh) · **Thấp** (vệ sinh, nhất quán).

## 1. Tóm tắt điều hành

18 nhóm phát hiện: **3 Nghiêm trọng · 8 Cao · 6 Trung bình · 1 Thấp**.

Gốc rễ chung: **một bảng `orders` có nhiều đường ghi, mỗi đường tự mang một bản luật**. Cùng một câu hỏi nghiệp
vụ cho ra câu trả lời khác nhau tuỳ người dùng đi qua màn nào:

| Câu hỏi nghiệp vụ | `PATCH /orders/:id` | `POST /orders/:id/cancel` · `/payments` | Điều phối (`/coordinator/orders/:id/*`) |
|---|---|---|---|
| Ai được huỷ đơn? | R3 (Điều phối có) | R6 — trần cứng Điều hành | R6 |
| Huỷ được đơn đã giao? | Không (máy trạng thái) | **Có** | Không (phải mở sự cố) |
| Hoàn tất khi còn nợ? | **Được** | — | `close`: không · `stage`: **được** |
| Thu vượt số còn phải thu? | — | Chặn | **Không chặn** (khi người ghi có R11) |
| Xác nhận đơn (DRAFT→CONFIRMED) cần tiền? | **Không** | Có (lần thu đầu) | Không (đơn tạo thẳng vào điều phối) |
| Giá dưới sàn? | — | Chặn ở báo giá | **Không kiểm** khi tạo đơn |

Năm việc nên làm trước (chi tiết mục 5):
1. Khoá `PATCH /orders/:id` không cho ghi trạng thái kết thúc/xác nhận (BL-01).
2. Một luật "chỉ hoàn tất khi thu đủ" cho mọi đường (BL-02).
3. Gộp ba đường ghi thu tiền về một hàm `planPayment` + khoá lạc quan (BL-05).
4. Sửa hai bộ quét nền bị kẹt ở 100 dòng đầu (BL-09).
5. Sửa nút hành động đơn dùng mã trạng thái không tồn tại (BL-11).

## 2. Bản đồ đường ghi — ai đổi trạng thái/tiền của đơn

| Đường ghi | Tệp | Trục đổi | Luật áp |
|---|---|---|---|
| Tạo đơn cổng chung (`DH…`) | `orders/use-cases/create-order.ts`, `ingest-order.ts` | tạo DRAFT | `calculateOrderTotal` |
| Tạo đơn Điều phối (`FLR…`) | `coordinator/use-cases/create-coordinator-order.ts` | tạo DRAFT + stage INTAKE | riêng, không qua `ingestOrder` |
| Sửa tiến độ | `orders/use-cases/update-order-progress.ts` | 3 trục | `order-rules.ts` |
| Huỷ (sổ đơn) | `orders/use-cases/cancel-order.ts` | `status` | tự kiểm, bỏ qua máy trạng thái |
| Chuyển bước điều phối | `coordinator/use-cases/update-coordinator-stage.ts` | stage + 3 trục | `stage-transitions.ts` + `state-mapper.ts` |
| Huỷ / đóng (điều phối) | `coordinator/use-cases/operations.ts` | stage + 3 trục | `operation-rules.ts` |
| Thu tiền (sổ đơn) | `orders/infra/standard-payment-repository.ts` | `paid/balance`, DRAFT→CONFIRMED | `planPayment` + khoá lạc quan |
| Thu tiền (điều phối) | `coordinator/use-cases/record-payment.ts` | `paid/balance` | riêng |
| Duyệt khoản chờ | `coordinator/use-cases/decide-pending-payment.ts` | `paid/balance` | riêng + khoá lạc quan |
| Báo giá | `orders/infra/approval-request-repository.ts:122` | `total/balance` | chỉ DRAFT, chưa thu |
| Thẻ chào | `greeting-card/**` | tất cả | bộ luật riêng (đóng băng) |

## 3. Phát hiện chi tiết

### A. Chuyển trạng thái đơn hàng

#### BL-01 · Nghiêm trọng — `PATCH /orders/:id` vượt trần cứng huỷ đơn và bỏ qua bước thu tiền
- **Hiện trạng:** schema PATCH nhận mọi giá trị `status`, kể cả `CANCELLED`, `CONFIRMED`, `COMPLETED`
  (`src/app/api/v1/orders/[id]/route.ts:10`); route chỉ đòi R3 (`:47`). `updateOrderProgress` chỉ kiểm bảng
  chuyển (`order-rules.ts:15-22` cho `CONFIRMED→CANCELLED`).
- **Tác động:**
  - Điều phối (có R3, không có R6 — `capability-catalog.ts:230,233`) huỷ được đơn: không cần lý do, không ghi
    `audit_logs`, không gửi `ORDER_CANCELLED` — vượt trần cứng R6.
  - `DRAFT→CONFIRMED` không cần tiền/duyệt giao trước, và **không** tạo `order_coordinations` (lần thu đầu mới
    gọi `sendToCoordination`, `standard-payment-repository.ts:51`) → đơn "đã xác nhận" nhưng không vào hàng điều phối.
  - `PROCESSING→COMPLETED` khi còn nợ (xem BL-02).
- **Nghiệp vụ đúng:** huỷ là quyết định tiền-hàng, phải có người chịu trách nhiệm và lý do; xác nhận đơn là hệ quả
  của tiền về hoặc phê duyệt công nợ, không phải thao tác sửa tay.
- **Khắc phục:** bỏ `CANCELLED`/`CONFIRMED`/`COMPLETED` khỏi `patchOrderSchema`, trả 422 hướng dẫn dùng
  `/cancel`, `/payments`, `/deliver-before-pay`, `/coordinator/.../close`. Thêm test ở `tests/unit` cho route.

#### BL-02 · Cao — Luật "chỉ hoàn tất khi đã thu đủ" (PO 04/11/2026, ALG 4.26) chỉ có ở 1/3 đường
- **Hiện trạng:** chỉ `checkClosure` kiểm `balanceVnd > 0` (`coordinator/domain/operation-rules.ts:249`).
  `POST /coordinator/orders/:id/stage` với `stage = COMPLETED` đi qua `checkStageTransition`, chỉ kiểm sự cố mở
  (`stage-transitions.ts:46,109`). `PATCH /orders/:id` không kiểm gì.
- **Khắc phục:** đưa điều kiện số dư vào `StageTransitionFacts` và `checkStageTransition`; hoặc cấm
  `→COMPLETED` qua `/stage`, chỉ cho qua `/close`.

#### BL-03 · Cao — Ba máy trạng thái mâu thuẫn trên cùng ba cột
- **Hiện trạng (ví dụ cụ thể):**
  - Điều phối `DISPATCHING→DELIVERED` ghi `delivery_status: DISPATCHED→DELIVERED` (`state-mapper.ts:51-62`);
    máy trạng thái M10 cấm bước này (`order-rules.ts:34`: `DISPATCHED → [DELIVERING, PENDING]`). Trục giao hàng
    của đơn điều phối không bao giờ qua `DELIVERING`.
  - Stage `INTAKE` ánh xạ `status: DRAFT` (`state-mapper.ts:20`), trong khi đơn vào điều phối sau khi thu tiền đã là
    `CONFIRMED` — hai nguồn nói khác nhau về cùng một đơn.
  - Huỷ đơn `DELIVERED`: máy M10 cấm, `cancelOrder` cho phép (`cancel-order.ts:38-44` chỉ chặn CANCELLED/COMPLETED),
    điều phối cấm (`operation-rules.ts:268`). Nút "Huỷ" trên giao diện cũng hiện cho đơn đã giao
    (`order-action-buttons.tsx:40`).
- **Khắc phục:** một tệp SSOT `orders/domain/order-lifecycle.ts` khai báo bảng chuyển hợp lệ cho **bộ ba** trục
  (không phải từng trục rời), mọi đường ghi (kể cả `applyTransition` của điều phối) gọi chung một hàm kiểm;
  test bảng: mọi cặp `(stage cũ → stage mới)` của điều phối phải hợp lệ theo bảng M10.

#### BL-04 · Cao — Huỷ ở sổ đơn không đồng bộ điều phối và không xử lý tiền đã thu
- **Hiện trạng:** `cancelOrder` chỉ đổi `orders.status` (`cancel-order.ts:57-59`). `order_coordinations.stage`
  giữ nguyên (vd. `IN_PRODUCTION`) → đơn đã huỷ vẫn nằm trên bảng điều phối và vẫn bị đếm vào công suất đối tác
  (`partner-repository.ts:83` đếm stage `ASSIGNING/IN_PRODUCTION/QUALITY_CHECK`). Không ghi khoản `REFUND`/nợ
  hoàn cho tiền đã thu, không nhả `product_bookings`.
- **Khắc phục:** đơn có `order_coordinations` → `cancelOrder` uỷ quyền cho `cancelCoordinatorOrder` (một giao dịch);
  khi `paid_vnd > 0` tạo việc "hoàn tiền chờ xử lý" hoặc bắt chọn "giữ làm tín dụng/hoàn". Cần PO chốt chính sách
  hoàn tiền đơn ngoài Thẻ chào.

### B. Tiền: thu, số dư, ràng buộc

#### BL-05 · Nghiêm trọng — Ba đường ghi thu với ba bộ luật; CSDL không có lưới an toàn
- **Hiện trạng:**

  | Kiểm | `orders/:id/payments` (`planPayment`) | `coordinator/.../payments` (`record-payment.ts`) | Duyệt khoản chờ |
  |---|---|---|---|
  | Chặn thu vượt phần còn phải thu | Có | **Không** (`:58-65`, chỉ chặn hoàn âm) | Có |
  | Chặn đơn đã huỷ | Có | **Không** | Không |
  | Khoá lạc quan `paid_vnd` | Có | **Không** — `updateMany` ghi số tuyệt đối tính từ lần đọc (`coordinator-repository.ts:218`) | Có |

  Hai lượt ghi thu đồng thời qua điều phối (READ COMMITTED mặc định, `transaction.ts:12`) → mất một khoản trong
  `paid_vnd` dù sổ `order_payments` có đủ hai dòng. Ghi vượt → `balance_vnd < 0`.
- **CSDL:** comment schema nói có CHECK trong migration `..._coordinator_p1_p2_payments`
  (`schema.prisma:1950-1952`) nhưng migration baseline không có CHECK nào cho `paid_vnd`/`balance_vnd`/`total_vnd`
  (`grep CHECK prisma/migrations` chỉ thấy CHECK trạng thái). Comment sai sự thật.
- **Khắc phục:** `recordCoordinatorPayment` dùng `planPayment` + `updateMany where paid_vnd = cũ` như
  `StandardPaymentRepository.record`; một hàm domain duy nhất cho mọi khoản thu. Đề xuất PO duyệt migration
  `CHECK (paid_vnd >= 0 AND balance_vnd = total_vnd - paid_vnd)` (thêm `NOT VALID` rồi `VALIDATE` sau khi đối soát).
  Job đối soát `payment-reconciliation.ts` hiện chỉ so `paid_vnd` với sổ — nên so thêm `balance_vnd`.

#### BL-06 · Cao — Hai cổng tạo đơn, cổng điều phối bỏ qua cổng chung
- **Hiện trạng:** `ingestOrder` tự nhận là "cổng nhận đơn duy nhất" (`ingest-order.ts:1-2`), nhưng
  `createCoordinatorOrder` tạo đơn trực tiếp: mã `FLR-…` (`operation-rules.ts:276`), vào thẳng stage `INTAKE` không
  qua thu tiền/duyệt giao trước, `source` nhận `ORDER_M10|CHAT_M08|CATALOG_M06` (`http-schemas.ts:108`) — không có
  trong danh mục `ORDER_SOURCE_CODES` (`order-source.ts:11-20`) và lộ mã kỹ thuật, số lượng luôn 1,
  `total = unitPriceVnd`.
- **Hệ quả:** bộ khớp chuyển khoản chỉ nhận mẫu `DH<6 số>-<4 số>` (`standard-payment.ts:10`) → khách chuyển khoản
  ghi mã `FLR-…` không bao giờ tự khớp; báo cáo theo nguồn đơn có giá trị lạ.
- **Khắc phục:** `createCoordinatorOrder` gọi `ingestOrder` (thêm adapter nguồn), dùng chung bộ sinh mã; nếu PO muốn
  "đơn nội bộ vào thẳng điều phối" thì khai báo rõ nguồn đó trong `order-source.ts` (`entryStage: COORDINATION`).

#### BL-07 · Cao — Giá sàn chỉ chặn ở báo giá; trần giá không thực thi; sàn "mở khi thiếu dữ liệu"
- **Hiện trạng:** `assertNotBelowFloor` chỉ được gọi ở `quote-order.ts:27`, `create/update-quotation`,
  `greeting-card/discount-requests.ts`. `POST /orders` (R2 — Sale có) nhận `unitPriceVnd` tuỳ ý
  (`api/v1/orders/route.ts:20`), tạo điều phối cũng vậy (`http-schemas.ts:81`) → báo giá bị chặn nhưng tạo đơn với
  cùng giá thì lọt.
- Mã C9 "vượt trần" khai báo (`capability-catalog.ts:97`) nhưng không nơi nào kiểm; trần chỉ là cảnh báo trong
  `price-scenarios.ts:34`.
- `computeProductCost` bỏ qua dòng công thức trỏ tới nguyên liệu không còn (`cost-calculator.ts:24`) mà vẫn
  `complete = true` → giá vốn thấp hơn thật → sàn thấp hơn thật.
- Lệch làm tròn: cảnh báo kịch bản giá so với `cost × ratio` thô, còn chặn thật làm tròn **lên** nghìn
  (`price-floor.ts:11`) → giá "không cảnh báo" vẫn có thể bị chặn.
- **Khắc phục:** gọi `assertNotBelowFloor` trong `createOrder` (dòng có `productId`); nguyên liệu mất → đưa vào
  `missingPrices`; một hàm `floorPriceVnd` dùng cho cả cảnh báo lẫn chặn; PO quyết C9 thực thi hay gỡ.

#### BL-08 · Cao — Mã giảm giá: vô hiệu ở đơn chuẩn, không có trần tổng ở Thẻ chào
- **Đơn chuẩn:** `voucherId` nhận từ body, lưu vào `orders.voucher_id` (`order-repository.ts:124`) nhưng không kiểm
  thuộc tổ chức, không trừ lượt (`claim` chỉ gọi ở `brochure-checkout-repository.ts:265`), không giảm tiền. Đơn hiển
  thị "có mã" mà khách trả đủ giá.
- **Thẻ chào (đóng băng):** `computeQuote` chồng mã giảm giá + chiết khấu hạng + ưu đãi % (`brochure-pricing.ts:237-262`).
  Trần 50% (`PLATFORM_MAX_DISCOUNT_PERCENT`) áp riêng từng khoản, không áp tổng; không kiểm sàn giá ở checkout.
  Hai giá trị trần khác nhau: 50% (`governance-decisions.ts:140`) và 25% (`greeting-card/domain/discount-request.ts:8`).
  Mã % phát hành trước khi hạ trần vẫn giữ mức cũ (chỉ kiểm lúc phát hành, `voucher-batch.ts:79`).
- **Khắc phục:** đơn chuẩn — hoặc bỏ `voucherId` khỏi schema, hoặc áp đủ (kiểm, `claim` trong giao dịch tạo đơn,
  `releaseForOrder` khi huỷ). Thẻ chào — cần PO gỡ băng: trần tổng chiết khấu và kiểm sàn sau mọi khoản giảm.

#### BL-09 · Nghiêm trọng — Hai bộ quét nền bị "kẹt" ở 100 dòng đầu
- **Khớp chuyển khoản:** `listUnmatched` lấy 100 dòng `UNMATCHED` cũ nhất **toàn hệ thống** trong 3 ngày
  (`standard-payment-repository.ts:63-68`). Dòng không khớp được (chuyển khoản không ghi mã, số tiền vượt) vẫn
  `UNMATCHED` → mỗi lượt quét lại đúng 100 dòng đó. Khi tổng số dòng không khớp của mọi tiệm trong 3 ngày > 100,
  giao dịch mới **không bao giờ được xét** → đơn không tự xác nhận, không sang điều phối.
- **Nhắc thu nợ:** `listOverdue` lấy 100 yêu cầu quá hạn cũ nhất rồi mới lọc "đã nhắc" trong bộ nhớ
  (`collect-due-repository.ts:14-31`). Khi đã có ≥100 đơn được nhắc mà chưa trả, đơn quá hạn mới không bao giờ được nhắc.
- **Khắc phục:** đưa điều kiện loại trừ vào câu truy vấn (`NOT EXISTS order_events … reason = …` / cột
  `last_scanned_at` hoặc con trỏ `created_at > lần quét trước`); test với 101 dòng không khớp.

#### BL-10 · Trung bình — Sinh mã đơn: đua và sai múi giờ
- `code = count(đơn hôm nay) + 1` (`create-order.ts:29-30`): hai đơn đồng thời cùng mã → lỗi trùng khoá
  `(organization_id, code)` → 500, không thử lại (điều phối có vòng thử lại, sổ đơn không).
- Ngày trong mã và ranh giới "hôm nay" theo giờ máy chủ (`order-rules.ts:161-166`, `order-repository.ts:93-98`);
  máy chủ không đặt `TZ` (không có trong `render.yaml`) → đơn tạo 00:00–07:00 giờ VN mang ngày hôm trước. Cùng hệ
  thống, `creditPeriod` lại cộng +7 giờ (`monthly-limit.ts:21`) — hai cách xử lý múi giờ.
- **Khắc phục:** sinh số thứ tự bằng bảng đếm/sequence theo `(org, ngày VN)` hoặc thử lại khi `P2002` như điều phối;
  dùng một hàm "ngày VN" chung.

### C. Frontend ↔ Backend

#### BL-11 · Cao — Nút hành động đơn dùng mã trạng thái không tồn tại ở backend
- **Hiện trạng:** `order-action-buttons.tsx:43-71` so/gửi `PENDING`, `IN_PRODUCTION`, `COMPLETED` (trục sản xuất),
  `NOT_STARTED`, `SHIPPING` (trục giao), `IN_PROGRESS` (trục đơn) — không giá trị nào có trong enum backend
  (`order-types.ts:8-29`). `order-detail-modal.tsx:284` gửi `productionStatus: "COMPLETED"`.
- **Tác động:** nút chính không bao giờ hiện (vì `productionStatus` thật là `WAITING…READY`); nút "hoàn tất cắm hoa"
  luôn bị 400; lỗi bị nuốt (`if (res.ok)` không nhánh `else`, `order-detail-modal.tsx:87`) → người dùng bấm mà
  không có gì xảy ra. Nút "Giao thành công" gửi `status: COMPLETED` → nếu đi được sẽ vượt BL-02.
- **Khắc phục:** dùng kiểu `OrderStatus/ProductionStatus/DeliveryStatus` từ domain thay vì `string`, nút chỉ đề xuất
  bước hợp lệ theo bảng chuyển (lấy từ API hoặc hàm domain dùng chung), hiện lỗi 4xx.

#### BL-12 · Trung bình — Số liệu kinh doanh tính trên trình duyệt, từ 100 đơn, hai định nghĩa doanh thu
- `/so-lieu` tải `GET /api/v1/orders?limit=100` rồi tính KPI trên client (`so-lieu/page.tsx:74`,
  `business-performance-card.tsx:39`) → tiệm > 100 đơn thấy số sai, gọi là "Tổng doanh thu".
- `business-reporting.ts:12` khai trạng thái `PENDING` (không tồn tại), không có `DELIVERED`; doanh thu cộng cả đơn
  chưa thu (`CONFIRMED/PROCESSING`) và trừ `DRAFT`. Module `reporting` lại định nghĩa "doanh thu dự kiến" gồm cả
  `DRAFT` (`order-revenue-report.ts:56-61`) và "thực thu" theo sổ thu. Cùng một tiệm, hai màn, hai con số.
- `productTitle` không có trong phản hồi API → "Sản phẩm bán chạy" luôn rỗng.
- **Khắc phục:** bỏ `computeBusinessReport` phía client, dùng API `reporting` (đã có thực thu/dự kiến); một bảng
  định nghĩa KPI (doanh thu = thực thu đã xác nhận − hoàn; GMV = tổng đơn không huỷ, không nháp).

#### BL-13 · Trung bình — Validation lệch giữa FE, BE và các kênh
| Luật | FE tạo đơn | `POST /orders` | Catalog công khai | Thẻ chào | Điều phối |
|---|---|---|---|---|---|
| Đơn giá | > 0 (`create-order-modal.tsx:147`) | ≥ 0, cho số lẻ (`route.ts:20`) | lấy từ catalog | từ máy chủ | ≥ 0 |
| Số lượng tối đa | không | không | 50 | 20 | luôn 1 |
| Ngày giao | chọn ngày | chuỗi bất kỳ | `YYYY-MM-DD`, không chặn quá khứ | có giờ cắt, giờ chuẩn bị | `deliveryTargetAt` |
| SĐT người nhận | bắt buộc | không kiểm định dạng | `VN_PHONE` | có | — |

- `customerId`, `branchId`, `productId` trong body không được kiểm thuộc tổ chức. `orders.customer_id` có FK tới
  `customers.id` nhưng không ghép `organization_id` (`schema.prisma:1982`) → về lý thuyết gắn được khách của tổ chức
  khác (cùng lớp lỗi với mục §14 #9 của `AGENT_RULES.md`). **Cần kiểm chứng bằng test tenant.**
- `GET /orders`: `limit` không chặn trần 100, `NaN` lọt vào `take`; `status` ép kiểu không kiểm (`route.ts:53-67`).
- FE điền sẵn dòng hàng "hồng đỏ 20 cành — 650.000 ₫" cho mọi ngành (`create-order-modal.tsx:67`).
- **Khắc phục:** một `orderInputSchema` dùng chung (FE import để kiểm sớm, BE parse), `assertOwned*` cho các id tham chiếu.

### D. Khách hàng, công nợ, tồn kho

#### BL-14 · Trung bình — Hạng khách: cũ, dễ giả mạo, áp chung một ngưỡng cho mọi ngành
- Hạng chỉ được tính lại khi ai đó **mở trang chi tiết khách** (`get-customer-master-index.ts:22` gọi
  `syncMetricsFromOrders` — GET có ghi). Hạng dùng để giảm giá (`tier-and-peak-pricing.ts`) và phân khúc → dùng số cũ.
- "Chi tiêu" cộng `total_vnd` của đơn `CONFIRMED…COMPLETED` (`customer-repository.ts:248`), gồm cả phần chưa thu.
- Ngưỡng cứng ngành hoa (≥10 đơn **hoặc** ≥10 triệu → VIP, `crm-rules.ts:16-22`) cho mọi ngành; 10 đơn nhỏ = VIP.
- Trang Thẻ chào công khai tra hạng theo **SĐT khách tự nhập**, không xác minh → nhập SĐT của khách VIP để hưởng chiết khấu.
- **Khắc phục:** cập nhật chỉ số khi đơn đổi trạng thái/thu tiền (cùng giao dịch hoặc sự kiện), ngưỡng theo plugin
  ngành, tính theo thực thu; chiết khấu hạng chỉ áp sau khi xác minh SĐT (OTP) hoặc áp lúc Sale xác nhận. Cần PO.

#### BL-15 · Trung bình — "Giao trước, thu sau" không có hạn mức công nợ tổng
- `decideDeliverBeforePay` (`workflow/deliver-before-pay.ts:98-110`): đơn "hoả tốc" tự duyệt **trước** khi xét nợ
  quá hạn và không giới hạn số tiền; hạn mức Sale tự quyết tính **theo từng đơn**, không theo tổng nợ của khách;
  tiệm không bật "thu trước" → mọi đơn tự duyệt kể cả khách đang nợ quá hạn. Hạn thu Điều hành nhập có thể ở quá khứ.
- Sale tự đặt ngày giao lúc tạo đơn → tự biến đơn thành "hoả tốc".
- **Khắc phục:** xét nợ quá hạn trước mọi lối tự duyệt; thêm trần công nợ theo khách (tổng `balance_vnd` các đơn mở);
  "hoả tốc" vẫn có trần tiền. Cần PO chốt con số.

#### BL-16 · Trung bình — Tồn kho chỉ đọc, không bao giờ giảm
- `product_inventory.quantity_available` không có đường ghi giảm khi đặt hàng (grep toàn `src/`); chế độ
  `STOCK_QUANTITY` của Thẻ chào kiểm số này nên không bao giờ hết hàng tự động. Đơn chuẩn/catalog không kiểm tồn.
- Bảng lịch trống lấy tồn `LIMIT 1` không lọc chi nhánh (`availability-repository.ts:244-247`) → tiệm nhiều chi
  nhánh thấy tồn của một chi nhánh bất kỳ. Cùng tệp có nhánh "fallback khi Turbopack dev server chưa restart" nằm
  trong mã chạy thật.
- **Khắc phục:** PO chốt có quản lý tồn theo số lượng hay không; nếu có: giữ chỗ khi tạo đơn, trừ khi xác nhận,
  hoàn khi huỷ — một giao dịch, điều kiện `quantity_available >= qty`.

### E. Credit và thuê bao

#### BL-17 · Cao — Hoàn credit trừ nhầm kỳ; còn một hàm hoàn không chống lặp
- `releaseMonthlyCredit` luôn trừ vào kỳ **hiện tại** (`usage-limit-repository.ts:77-86`): job trừ tháng 10, hoàn
  tháng 11 → tháng 11 bị giảm "đã dùng", tháng 10 vẫn đầy; hạn mức tháng 11 bị nới sai.
- `refundUsage` (`usage/use-cases/refund-usage.ts`) không khoá, không kiểm đã hoàn — hiện chưa ai gọi, nhưng nếu nối
  vào sẽ hoàn hai lần. `refundJob` (đường đang dùng) thì đúng: khoá tư vấn + kiểm lượt.
- **Khắc phục:** lưu kỳ của dòng `ENQUEUED` và hoàn vào đúng kỳ đó; xoá `refundUsage` hoặc chuyển nó gọi `refundJob`.

#### BL-18 · Thấp — Vệ sinh và nhất quán
- Thông điệp lỗi trả ra giao diện chứa mã kỹ thuật: `"Không thể chuyển trạng thái đơn hàng từ "DRAFT"…"`
  (`order-rules.ts:50`), `"Huỷ đơn dùng POST /coordinator/orders/:id/cancel."` (`stage-transitions.ts:79`) — trái
  luật 6 của `CLAUDE.md`.
- VAT chỉ có ở Thẻ chào; đơn `DH…`/`FLR…` không có VAT dù cột tồn tại trên `orders`.
- `calculateOrderTotal` lặng lẽ đổi số lượng ≤ 0 thành 1 (`order-rules.ts:94`) thay vì báo lỗi.
- Ghi sự kiện trước rồi mới cập nhật đơn, không trong giao dịch (`update-order-progress.ts:59-96`, `cancel-order.ts:48-59`)
  → lỗi giữa chừng để lại sự kiện không có thay đổi tương ứng (SLA đo từ chuỗi sự kiện sẽ sai).

## 4. Điểm làm tốt (giữ nguyên khi sửa)

- Giá Thẻ chào tính hoàn toàn ở máy chủ, dùng chung cho báo giá và tạo đơn (`brochure-pricing.ts`).
- `planPayment` + cập nhật có điều kiện `paid_vnd` + nhận dòng ngân hàng trong cùng giao dịch — mẫu đúng cho mọi khoản thu.
- Trừ lượt mã giảm giá bằng một câu `UPDATE … WHERE used_count < usage_limit` + khoá tư vấn theo khách.
- Hạn mức credit tháng cộng có điều kiện trong một câu SQL; hoàn credit job có khoá và kiểm theo lượt.
- Chặn tự duyệt (`assertNotSelfApproval`) ở duyệt khoản chờ và giao trước.
- Điều phối đòi bằng chứng cho bước "đóng cửa" (QC đạt, POD, hết sự cố).

## 5. Lộ trình khắc phục

| Đợt | Việc | Phát hiện | Cần PO? |
|---|---|---|---|
| **P0 — tuần này** | Khoá trạng thái kết thúc/xác nhận ở `PATCH /orders/:id` | BL-01 | Không |
| | Kiểm số dư ở `→COMPLETED` mọi đường | BL-02 | Không (đã chốt 04/11) |
| | Thu tiền điều phối dùng `planPayment` + khoá lạc quan | BL-05 | Không |
| | Sửa hai bộ quét nền | BL-09 | Không |
| | Sửa enum nút hành động + hiện lỗi | BL-11 | Không |
| **P1 — 2 tuần** | SSOT vòng đời đơn 3 trục, mọi đường ghi gọi chung, sự kiện + cập nhật một giao dịch | BL-03, BL-18 | Không |
| | Huỷ sổ đơn uỷ quyền cho huỷ điều phối | BL-04 | Chính sách hoàn tiền: **Có** |
| | Tạo đơn điều phối qua `ingestOrder`, nguồn trong danh mục | BL-06 | Có (nguồn "nội bộ") |
| | Sàn giá khi tạo đơn, nguyên liệu mất → thiếu giá | BL-07 | C9: **Có** |
| | Mã đơn: sequence/thử lại, ngày VN chung | BL-10 | Không |
| | KPI lấy từ API `reporting`, một bảng định nghĩa | BL-12 | Định nghĩa doanh thu: **Có** |
| | Schema đầu vào dùng chung, kiểm id tham chiếu thuộc tổ chức | BL-13 | Không |
| | Hoàn credit đúng kỳ, xoá `refundUsage` | BL-17 | Không |
| **P2 — cần quyết định** | CHECK tiền ở CSDL | BL-05 | **Có** (đổi schema) |
| | Mã giảm giá đơn chuẩn; trần tổng chiết khấu + sàn ở Thẻ chào | BL-08 | **Có** (Thẻ chào đóng băng) |
| | Hạng khách theo ngành, theo thực thu, xác minh SĐT | BL-14 | **Có** |
| | Trần công nợ khách, thứ tự xét "hoả tốc" | BL-15 | **Có** |
| | Quản lý tồn theo số lượng | BL-16 | **Có** |

### Câu hỏi cần PO trả lời
1. Huỷ đơn đã thu tiền (ngoài Thẻ chào): hoàn ngay, giữ làm tín dụng, hay tạo việc chờ Điều hành?
2. Đơn tạo từ màn Điều phối có được vào thẳng điều phối khi chưa thu/chưa duyệt công nợ không?
3. Mã C9 "vượt trần giá": thực thi chặn hay gỡ khỏi danh mục?
4. "Doanh thu" trên màn số liệu là thực thu hay giá trị đơn?
5. Trần tổng chiết khấu khi chồng mã + hạng + ưu đãi: 50% của tiền hàng? Có áp sàn giá sau giảm?
6. Ngưỡng hạng khách theo ngành và tính theo thực thu?
7. Trần công nợ mỗi khách khi giao trước, thu sau?

## 6. Test cần viết để khoá các luật (đi cùng bản sửa)

| Test | Chứng minh |
|---|---|
| Route `PATCH /orders/:id` với `status: CANCELLED` bởi vai Điều phối → 422 | BL-01 |
| `checkStageTransition(DELIVERED→COMPLETED)` khi `balance > 0` → từ chối | BL-02 |
| Bảng: mọi bước điều phối hợp lệ → ba trục sau chuyển hợp lệ theo `order-rules` | BL-03 |
| Tenant: huỷ ở sổ đơn → `order_coordinations.stage = CANCELLED`, công suất đối tác giảm | BL-04 |
| Tenant: hai lượt ghi thu điều phối đồng thời → một lượt 409, `paid_vnd` = tổng sổ | BL-05 |
| Unit: 101 dòng không khớp + 1 dòng khớp → dòng khớp được xử lý | BL-09 |
| Unit: nút hành động chỉ gửi giá trị thuộc enum domain | BL-11 |
| Tenant: `customerId` của tổ chức khác ở `POST /orders` → 404 | BL-13 |
| Unit: hoàn credit job tháng trước → giảm `used` của tháng trước | BL-17 |
