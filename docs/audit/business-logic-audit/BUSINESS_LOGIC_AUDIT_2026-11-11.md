# Audit logic nghiệp vụ — đợt 2 (11/11/2026)

> Tiếp nối `BUSINESS_LOGIC_AUDIT_2026-11-06.md` (BL-01…BL-18) và kế hoạch `docs/plan/business-logic-upgrade.md`.
> Bằng chứng `tệp:dòng` tại commit `50b9c1e6`. Phát hiện mới đánh số tiếp từ **BL-19**.

## 0. Phạm vi, phương pháp, giới hạn

| Mục | Nội dung |
|---|---|
| Đối chiếu lại | 18 phát hiện đợt 1 — đọc mã hiện tại, không tin dấu "đã làm" trong kế hoạch |
| Rà mới | Tồn kho theo số lượng (mới thêm 07/11), tạo đơn Điều phối, khoản thu chờ duyệt, tự huỷ đơn chưa thu, đặt hàng công khai catalog/landing, đơn từ chat, báo giá ↔ đơn, giao trước thu sau, VAT đơn chuẩn, thuê bao (hoá đơn, gia hạn, credit tặng, SePay), credit AI, hạng khách + bộ quét, báo cáo doanh thu, phí gia công đối tác chuỗi, màn quyết toán đối tác, màn số liệu |
| Chưa rà sâu | Logic nội dung/AI (`creative-production`, `content-engine`, `media`, `video-studio`), `field-platform`, `integration-hub` (chỉ xem đường tạo đơn), `market-intelligence` |
| Phương pháp | Đọc mã tĩnh, lần mọi đường ghi vào cùng một cột/khái niệm; chạy thử hàm thuần bằng `tsx` cho các phép tính nghi sai (mục 3, ghi "Đã chạy thử") |
| Giới hạn | Không có CSDL `_test` → **không chạy** `test:tenant`/`test:platform`; kịch bản cần CSDL suy từ mã. `npm test`: xem mục 7 |

Mức độ: **Nghiêm trọng** (sai tiền/tồn, vượt trần cứng) · **Cao** (sai luật đã chốt, dữ liệu lệch, màn hiển thị số giả) · **Trung bình** (sai số liệu, thiếu kiểm, lệch kênh) · **Thấp** (trùng lặp, nhất quán).

## 1. Tóm tắt điều hành

- Đợt 1: **16/18 phát hiện đã sửa đúng**; BL-07 **chưa xong** (đường tạo đơn Điều phối vẫn bỏ qua sàn/trần — tách thành BL-20); BL-16 sửa xong phần chính nhưng phát sinh lỗi mới (BL-19, BL-26).
- Đợt 2: **14 phát hiện mới — 1 Nghiêm trọng · 5 Cao · 6 Trung bình · 2 Thấp.**
- Gốc rễ vẫn như đợt 1 — **một khái niệm, nhiều bản luật**: "tiền công đối tác" có 3 nguồn, "giờ hẹn giao" có 3 bộ phân tích,
  "đã thanh toán" được suy ra ở ≥ 6 chỗ, "trần chiết khấu" chỉ có ở một kênh. Thêm một gốc rễ mới: **màn hiển thị dữ
  liệu mẫu như dữ liệu thật** (quyết toán đối tác, hiệu quả quảng cáo).

Năm việc nên làm trước:
1. Không cho client ghi khoá `stock` trong `metadata` dòng hàng (BL-19) — sửa một dòng, chặn cộng tồn khống.
2. Tạo đơn Điều phối đi qua sàn/trần giá và trừ tồn như cổng chung (BL-20).
3. Huỷ đơn tự từ chối khoản thu chờ duyệt; duyệt khoản chờ dùng `planPayment` (BL-21).
4. Gỡ hoặc dán nhãn "dữ liệu minh hoạ" cho màn quyết toán đối tác và báo cáo quảng cáo (BL-22, BL-23).
5. Không trừ phí gia công "giao trễ" khi đơn không có giờ hẹn rõ (BL-24).

### Trạng thái sửa (cập nhật 11/11/2026)

| # | Trạng thái | Sửa ở | Test |
|---|---|---|---|
| BL-19 | **Đã sửa** — bỏ khoá `stock` khỏi metadata client; hoàn/trừ lại tồn chỉ khi dấu khớp sản phẩm + số lượng dòng và dòng tồn của đúng sản phẩm (chặn cả dấu giả đã lưu trước bản sửa) | `orders/domain/order-item-metadata.ts`, `orders/infra/order-repository.ts`, `orders/infra/order-stock.ts` | `tests/unit/orders/order-item-stock-mark.test.ts`, `tests/tenant/order-stock.test.ts` |
| BL-20 | **Đã sửa** — sàn/trần qua `assertWithinPriceBounds` (có sản phẩm, giá > 0); trừ tồn cùng giao dịch tạo đơn | `coordinator/use-cases/create-coordinator-order.ts`, `coordinator/infra/coordinator-query-helper.ts` | `tests/unit/coordinator/create-coordinator-order-price-bounds.test.ts`, `tests/tenant/order-stock.test.ts` |
| BL-21 | **Đã sửa phần P0** — huỷ đơn chuyển khoản `PENDING` thành `REJECTED` trong giao dịch huỷ; duyệt khoản chờ dùng `planPayment`. Còn lại (P1): ghi khoản chờ so với tổng khoản đang chờ | `coordinator/use-cases/operations.ts`, `decide-pending-payment.ts`, `infra/pending-payment-repository.ts` | `tests/tenant/payment-confirmation.test.ts` |
| BL-22 | **Đã gỡ lối vào** "Sổ đối soát" khỏi danh bạ đối tác. Còn lại (P2, PO): sổ quyết toán một nguồn | `components/coordinator/partner-management-modal.tsx` | `tests/unit/architecture/no-sample-data-screens.test.ts` |
| BL-23 | **Đã gỡ** nút "Hiệu quả quảng cáo" trên `/so-lieu` | `app/(app)/so-lieu/page.tsx`, Screen Contract `so-lieu.md` | như trên |

Hai thành phần dữ liệu mẫu (`partner-settlement-modal.tsx`, `ad-performance-modal.tsx`) vẫn còn trong mã nhưng không màn nào
gắn; guard kiến trúc chặn gắn lại. Xoá hẳn hay dựng lại trên dữ liệu thật là quyết định của PO.

## 2. Đối chiếu 18 phát hiện đợt 1

| # | Hiện trạng | Bằng chứng |
|---|---|---|
| BL-01 | Đã sửa | `orders/domain/order-rules.ts:47-56` chặn CONFIRMED/COMPLETED/CANCELLED; `update-order-progress.ts:31-34` |
| BL-02 | Đã sửa | `coordinator/domain/stage-transitions.ts:122` kiểm `balanceVnd > 0` |
| BL-03 | Đã sửa | `update-order-progress.ts:37-45` gọi `checkLifecycleTransition` chung |
| BL-04 | Đã sửa (đồng bộ Điều phối, chặn huỷ đơn đã giao) | `cancel-order.ts:55-64`. Tiền đã thu: giữ cơ chế hoàn riêng (PO Q1) |
| BL-05 | Đã sửa | `record-payment.ts:57-59` dùng `planPayment`; CHECK ở `migrations/20261108000000_orders_money_integrity`. **Còn sót** ở duyệt khoản chờ → BL-21 |
| BL-06 | Đã sửa theo PO Q2 | `standard-payment.ts:12` khớp cả `FLR-…` |
| BL-07 | **Một phần** | `create-order.ts:58-66` có sàn/trần cho đơn nhập tay; **tạo đơn Điều phối không có** → BL-20 |
| BL-08 | Đã sửa | `requests-orders.ts:14-45` không còn `voucherId`; Thẻ chào trần chung 50% `brochure-pricing.ts:247` |
| BL-09 | Đã sửa | `standard-payment-repository.ts:67-78` con trỏ; `collect-due-repository.ts:24` lọc trong truy vấn |
| BL-10 | Đã sửa | `create-order.ts:92-112` thử lại có trần; ngày VN `vnCalendarDate` |
| BL-11 | Đã sửa theo PO Q8 | modal sổ đơn chỉ còn In / Huỷ / Theo dõi ở Điều phối |
| BL-12 | Đã sửa theo PO Q4 | `/so-lieu` đọc báo cáo máy chủ. Định nghĩa "Giá trị đơn" còn gồm đơn Nháp → BL-30 |
| BL-13 | Đã sửa | `order-reference-guard.ts`, `create-order.ts:49-57` |
| BL-14 | Đã sửa theo PO Q6 | `crm/use-cases/customer-metrics-sweep.ts`, thực thu `customer-metrics-repository.ts:25` |
| BL-15 | Đã sửa theo PO Q7 | `workflow/deliver-before-pay.ts:115-119` xét nợ trước. Rủi ro còn lại → BL-29 |
| BL-16 | Đã sửa phần chính, **phát sinh lỗi mới** | `orders/infra/order-stock.ts` → BL-19, BL-26 |
| BL-17 | Đã sửa | commit `659c66ae`, hoàn đúng kỳ |
| BL-18 | Đã sửa (giao dịch, nhãn, VAT theo Q10) | `update-order-progress.ts:47-60`, `standard-order-vat-repository.ts` |

## 3. Phát hiện mới

### A. Tồn kho

#### BL-19 · Nghiêm trọng — Client giả được dấu "đã trừ tồn" → huỷ đơn cộng tồn khống
- **Hiện trạng:** `POST /orders` nhận `items[].metadata` tuỳ ý (`api/v1/_contracts/requests-orders.ts:24`). Dòng không
  trừ tồn (không có sản phẩm theo dõi tồn) được lưu **nguyên** metadata client gửi (`orders/infra/order-repository.ts:160`).
  Khi huỷ, `returnStockIn` đọc `metadata.stock` và cộng `quantity` vào `product_inventory.id` ghi trong đó
  (`order-stock.ts:56-66,100-118`).
- **Đã chạy thử** `returnStock` với metadata `{ stock: { inventoryId, quantity: 500 } }`: sinh lệnh
  `product_inventory.updateMany … increment: 500`.
- **Tác động:** người có R2 (Sale) tạo đơn kèm dấu giả; khi đơn bị huỷ (Điều hành huỷ, hoặc bộ tự huỷ đơn chưa thu) tồn
  của một sản phẩm bất kỳ trong tổ chức tăng khống → bán vượt tồn thật. Không vượt tổ chức (lọc `organization_id`).
- **Khắc phục:** bỏ khoá dành riêng (`stock`) khỏi metadata client ở `order-repository.ts:160` (và mọi nơi ghi
  `order_items.metadata` từ đầu vào); về lâu dài lưu dấu trừ tồn ở bảng/cột riêng không nhận từ client (**[SCHEMA]**,
  cần PO). Test: tạo đơn với `metadata.stock` giả rồi huỷ → tồn không đổi.

#### BL-26 · Trung bình — Tồn: đơn không gắn chi nhánh không trừ; đơn công khai chưa thu giữ tồn vô hạn
- `takeStock` chỉ trừ khi tìm được **đúng một** dòng tồn (`order-stock.ts:33-40`). Đơn catalog/landing công khai luôn
  `branchId = null` (`place-public-catalog-order.ts:110-115`) → tiệm theo dõi tồn ở ≥ 2 chi nhánh: đơn công khai
  **không bao giờ trừ tồn**, lặng lẽ (không cảnh báo) → bán vượt.
- Ngược lại, tiệm một chi nhánh: đơn công khai **chưa trả đồng nào** đã trừ tồn; tự huỷ đơn chưa thu **mặc định tắt**
  (`unpaid-order-expiry.ts:5-7`) → tồn bị giữ mãi. Giới hạn 5 đơn/giờ/SĐT × 50 món (`place-public-catalog-order.ts:24,69`)
  đủ để khoá hết tồn một mẫu.
- Hoàn tồn khi huỷ ở Điều phối chạy **ngoài** giao dịch huỷ (`coordinator/use-cases/operations.ts:308`): lỗi giữa
  chừng → đơn đã huỷ nhưng tồn không về, không có lượt thử lại.
- **Khắc phục:** đơn công khai chọn chi nhánh theo cấu hình catalog (hoặc chi nhánh mặc định); sản phẩm theo dõi tồn
  mà không xác định được dòng → báo lỗi thay vì bỏ qua; khi tiệm có sản phẩm theo dõi tồn thì bật tự huỷ đơn công khai
  chưa thu (PO chốt giờ giữ); chuyển `returnStock` vào giao dịch của `cancelCoordinatorOrder`.

### B. Tạo đơn và tiền

#### BL-20 · Cao — Tạo đơn ở Điều phối bỏ qua sàn/trần giá và không trừ tồn
- `createCoordinatorOrder` lấy `totalVnd: input.unitPriceVnd` do client gửi (`create-coordinator-order.ts:191`), không gọi
  `assertWithinPriceBounds`, không gọi `takeStock` (grep cả `create-coordinator-order.ts` và
  `coordinator-repository.ts`). Kế hoạch WP-10 ghi "đã làm" cho cả hai đường — thực tế chỉ có `createOrder`.
- **Hệ quả:** giá bị chặn ở báo giá/sổ đơn vẫn lọt qua màn Điều phối (PO Q3: vượt trần cần C9, dưới sàn cần C10);
  sản phẩm theo dõi tồn không bị trừ khi đặt ở Điều phối.
- **Khắc phục:** gọi chung `assertWithinPriceBounds` (dòng có `productId`) và `takeStock` trong giao dịch tạo đơn
  Điều phối. Test: đơn Điều phối dưới sàn, người không có C10 → 422.

#### BL-21 · Cao — Khoản thu chờ duyệt sống sót qua huỷ đơn; duyệt khoản chờ có luật riêng
- `cancelCoordinatorOrder` không đụng `order_payments` `PENDING` (`operations.ts:290-311`).
- `decidePendingPayment` **không** gọi `planPayment`: không chặn đơn đã huỷ, chỉ kiểm `paidBefore + amount > total`
  (`decide-pending-payment.ts:36`) → Điều hành duyệt được tiền vào đơn đã huỷ; `paid_vnd` của đơn huỷ tăng.
- Ghi khoản chờ chỉ so với số **đã xác nhận** (`record-payment.ts:58-61`) → nhiều khoản chờ cộng lại vượt phần còn phải
  thu; chỉ lộ ra lúc duyệt.
- **Khắc phục:** huỷ đơn chuyển mọi khoản `PENDING` sang `REJECTED` (lý do "Đơn đã huỷ") trong cùng giao dịch; duyệt
  khoản chờ dùng `planPayment`; khi ghi khoản chờ, so với `total − paid − tổng khoản đang chờ`.

#### BL-25 · Trung bình — Đơn tạo từ chat bịa dữ liệu người nhận và lời chúc
- `convertChatToDraftOrder` điền mặc định SĐT `0900000000`, người nhận "Khách đặt qua Chat", địa chỉ "Nhận tại cửa hàng"
  và lời chúc **"Chúc mừng kỷ niệm / sinh nhật!"** (`chat-assistant/use-cases/convert-chat-to-draft-order.ts:52-57`).
  SĐT giả vượt kiểm số VN, đi vào `order_recipients`; lời chúc giả có thể bị in lên thiệp giao cho người nhận.
- Tin hệ thống trả cho người dùng chứa mã kỹ thuật "Vận hành M10" (`:74`) — trái luật 6 `CLAUDE.md`.
- **Khắc phục:** để trống các trường thiếu và mở "yêu cầu bổ sung thông tin" (đã có `order-info-requests`); không
  sinh lời chúc. Bỏ "M10".

#### BL-28 · Trung bình — Trần chiết khấu chỉ có ở một kênh; sàn giá "mở khi thiếu giá vốn"
- Trần tổng 50% chỉ áp ở Bộ sưu tập riêng (`greeting-card/domain/brochure-pricing.ts:247`). Báo giá cho giảm tới hết
  tiền hàng (`sales/domain/quotation.ts:141-160` chỉ chặn `discount ≤ subtotal`), lưới duy nhất là sàn giá.
- Sàn bằng 0 khi tiệm chưa cấu hình giá vốn hoặc hệ số sàn, hoặc công thức thiếu (`costing/use-cases/price-floor-guard.ts:28-29,38-41`)
  → tiệm mới: Sale giảm 100% không bị chặn, không cần ai duyệt.
- **Khắc phục (cần PO):** một trần chiết khấu nền tảng (`PLATFORM_MAX_DISCOUNT_PERCENT`) cho mọi kênh có giảm giá; vượt
  trần cần mã duyệt như C10.

#### BL-29 · Trung bình — Giao trước, thu sau: lối bỏ qua kiểm nợ; nhắc nợ chỉ một lần
- Đơn không gắn khách → `customerStats` trả "không nợ" (`orders/infra/approval-request-repository.ts:47`) → bỏ qua cả
  nợ quá hạn lẫn trần công nợ; đơn hoả tốc hoặc trong chính sách tiệm được tự duyệt.
- Hoả tốc tự duyệt không giới hạn tiền khi trần công nợ để trống (mặc định, PO Q7) — rủi ro còn lại, cần PO biết.
- Nhắc thu quá hạn chỉ **một lần** cho mỗi đơn (`collect-due-repository.ts:24`), không nhắc lại, không báo Điều hành.
- **Khắc phục:** đơn chưa gắn khách không được tự duyệt theo lối hoả tốc/hạn mức; nhắc lại theo chu kỳ (vd. 3 ngày) và
  báo Điều hành sau N lần.

### C. Đối tác chuỗi và quyết toán

#### BL-22 · Cao — Màn quyết toán đối tác là dữ liệu mẫu; ba định nghĩa "tiền công đối tác"
- `PartnerSettlementModal` (mở từ trang chủ mạng lưới: `flower-network-command-center.tsx:327` →
  `partner-management-modal.tsx:241`) dùng `SAMPLE_SETTLEMENT_ITEMS` cố định cho `partner-1`
  (`partner-settlement-modal.tsx:23-78,88`); đối tác thật → bảng rỗng; "Xác nhận đối soát"/"Đã thanh toán" chỉ đổi state
  trình duyệt (`:132-140`), kỳ cố định `2026-W39` (`:106,126`). Người dùng tưởng đã chốt quyết toán.
- Ba nguồn tiền công không nối nhau: (1) `partner_payout_vnd` nhập tay khi đóng đơn (`operations.ts:272-278`);
  (2) `subcontract_dispatch.craftFee` + khoản trừ trong metadata đơn (`greeting-card/use-cases/craft-fee-deductions.ts`);
  (3) biểu phí cứng ngành hoa `DEFAULT_WORKMANSHIP_RATES` (`coordinator/domain/partner-settlement.ts:28-65`) chỉ màn mẫu dùng.
- **Khắc phục:** ẩn nút "Quyết toán" tới khi có dữ liệu thật (không cần PO); sau đó PO chốt một sổ quyết toán lấy từ (2)
  (**[SCHEMA]**), (1) trở thành giá trị suy ra, bỏ (3).

#### BL-24 · Trung bình — Trừ phí gia công "giao trễ" sai mốc giờ; đổi % áp hồi tố
- `parseDeliveryTimestampMs` mặc định **10:00** khi không có khung giờ hoặc khung giờ không theo dạng `HH:MM - HH:MM`
  (`greeting-card/domain/subcontract-countdown.ts:42-69`). **Đã chạy thử:** `null`, `"14h-16h"`, `"Buổi chiều"` → đều 10:00
  giờ VN. Comment `craft-fee-deductions.ts:46` nói "không có khung giờ → không đổi gì" — sai với mã.
  Catalog công khai nhận khung giờ chữ tự do ≤ 20 ký tự (`place-public-catalog-order.ts:72`).
- `%` trừ đọc **lúc hoàn tất** (`craft-fee-deductions.ts:3,57`), không chụp lúc chi nhánh nhận đơn → tiệm tăng %
  thì đơn đang làm bị trừ theo mức mới.
- Ba bộ phân tích khung giờ khác nhau: `subcontract-countdown.ts:46` và `step-sla.ts:124` lấy **giờ kết thúc**,
  `isUrgentOrder` (`brochure-workflow-policy.ts:223`) lấy **giờ bắt đầu** và chỉ nhận `HH:MM`.
- **Khắc phục:** một hàm `deliveryDeadline(window)` trong domain chung trả `null` khi không xác định → không trừ; chụp
  chính sách phí vào `subcontract_dispatch` lúc nhận đơn.

### D. Thuê bao

#### BL-27 · Trung bình — Đổi gói, tiền dư, trượt kỳ, bộ quét kẹt
- Đổi gói ghi ngay `plan`, `included_credits_monthly` (`subscription/infra/subscription-repository.ts:67-77`) nhưng hoá đơn
  kỳ sau **đã sinh** trong cửa sổ 7 ngày giữ giá cũ (`ensureInvoice` trả hoá đơn có sẵn, `:45-46`) → nâng gói được dùng
  thêm một kỳ giá cũ; credit tặng tháng sau theo gói mới ngay.
- Chuyển khoản dư (`transferAmount > amount_vnd`) ghi đã thu, phần dư không ghi đâu cả (`sepay-platform-webhook.ts:33-37`).
- **Đã chạy thử** `addCycle` từ 31/01: 31/01 → 28/02 → 28/03 → 28/04 — kỳ neo vĩnh viễn ngày 28 (khách mất 3 ngày/kỳ
  so với ngày đăng ký).
- Bộ quét lấy 200 thuê bao theo `current_period_end` tăng dần (`subscription-sweep-query.ts:14-26`); thuê bao quá hạn
  không trả vẫn khớp điều kiện mãi → khi > 200 tổ chức quá hạn, tổ chức khác không được cấp credit đầu tháng/nhắc gia hạn
  qua bộ quét (cùng lớp lỗi BL-09; chỉ còn được xét khi có người thao tác).
- **Khắc phục:** PO chốt "đổi gói áp ngay (tính chênh lệch)" hay "áp từ kỳ sau" — rồi cập nhật hoá đơn `PENDING` kỳ sau
  cho khớp; tiền dư → cộng credit hoặc tạo việc hoàn (PO); lưu ngày neo kỳ (`anchor_day`) hoặc tính từ `current_period_start`
  gốc; bộ quét loại thuê bao quá hạn đã xử lý trong ngày khỏi trang (con trỏ như BL-09).

### E. Số liệu và giao diện

#### BL-23 · Cao — Báo cáo hiệu quả quảng cáo hiển thị số liệu mẫu như thật
- `AdPerformanceModal` trên `/so-lieu` (`so-lieu/page.tsx:231`) tính ROAS/CPA từ `SAMPLE_FLOWER_AD_CAMPAIGNS` cố định
  (`marketing/ad-performance-modal.tsx:32-33`, `content-engine/domain/ad-performance-analytics.ts:261`), cho tải CSV như báo
  cáo thật; tiêu đề có mã "MK-10" (`:60`). Chủ tiệm có thể ra quyết định ngân sách từ số bịa.
- **Khắc phục:** ẩn nút tới khi có nguồn dữ liệu quảng cáo thật, hoặc dán nhãn "Ví dụ minh hoạ" và bỏ tải CSV; bỏ "MK-10".

#### BL-30 · Thấp — "Giá trị đơn" gồm đơn Nháp chưa thu
- `buildRevenueReport` cộng mọi đơn trừ huỷ (`reporting/domain/order-revenue-report.ts:55-60`) → đơn catalog Nháp (có
  thể là đơn rác, sẽ tự huỷ) làm phồng "Giá trị đơn" và kéo "Tỷ lệ thu" xuống.
- **Khắc phục:** tách "Giá trị đơn đã xác nhận" (≠ DRAFT) làm chỉ số chính; Nháp hiện riêng.

#### BL-31 · Thấp — Logic trùng lặp, lệch FE ↔ BE
| Vấn đề | Bằng chứng | Hướng sửa |
|---|---|---|
| Trạng thái "đã thanh toán / đặt cọc" suy ra ở ≥ 6 nơi, điều kiện khác nhau (có nơi dùng `legacyIsPaid`) | `present-coordinator-order.ts:42`, `order-parallel-stages-card.tsx:38-39`, `order-detail-footer.tsx:58`, `balance-payment-banner.tsx:27`, `get-tracking-pipeline.ts:55`, `notify-customer.ts:117` | một `derivePaymentStatus` trong domain, FE nhận từ API |
| Giai đoạn vòng đời khách dùng ngưỡng cứng 5 tr/5 đơn (ngành hoa) trong khi hạng khách đã theo ngành | `crm/domain/crm-rules.ts:57` | lấy ngưỡng GOLD của plugin ngành |
| Gửi báo giá lỗi bị nuốt, giao diện hiện như đã gửi | `customer-quote-builder.tsx:103`, `partner-quote-builder.tsx:64` | hiện lỗi, giữ trạng thái Nháp |
| "Sao chép báo giá" gửi khách tổng tính ở trình duyệt, chưa qua sàn/trần | `customer-quote-builder.tsx:68-80` | chỉ cho sao chép sau khi lưu thành công |
| FE tạo đơn bắt giá > 0, BE cho 0 (nháp chờ báo giá); chữ "giao hoa / tên hoa" cho mọi ngành | `create-order-modal.tsx:161` vs `requests-orders.ts:23` | thống nhất theo `order-input-rules.ts`, nhãn trung tính |
| Bộ quét chỉ số khách: con trỏ `updated_at ≥` kẹt khi > 200 đơn cùng mốc thời gian | `customer-metrics-sweep.ts:43-46` | con trỏ `(updated_at, id)` như BL-09 |

## 4. Điểm làm tốt (giữ khi sửa)

- Mọi đường thu tiền thường đã dùng chung `planPayment`/`planRefund` + khoá lạc quan; CSDL có CHECK tiền.
- Trừ tồn bằng `updateMany … quantity_available >= qty` trong giao dịch tạo đơn; hoàn tồn đánh dấu theo dòng, không hoàn hai lần.
- Chuyển báo giá → đơn: chiếm quyền bằng cập nhật có điều kiện, khẳng định tổng khớp trước khi tạo (`convert-quotation-to-order.use-case.ts:67-77`).
- Credit: trừ có điều kiện `credit_balance >= cost` một câu SQL; cấp credit tặng có chốt kỳ chống cấp hai lần.
- Đặt hàng công khai: giá tính lại ở máy chủ, xác minh người thật, giới hạn theo SĐT, chặn khi gói quá hạn.

## 5. Lộ trình khắc phục

| Đợt | Việc | Phát hiện | Cần PO? |
|---|---|---|---|
| **P0 — tuần này** | Bỏ khoá `stock` khỏi metadata client | BL-19 | Không |
| | Sàn/trần + trừ tồn cho tạo đơn Điều phối | BL-20 | Không (đã chốt Q3, Q9) |
| | Huỷ đơn từ chối khoản chờ; duyệt khoản chờ qua `planPayment` | BL-21 | Không |
| | Ẩn nút Quyết toán đối tác; ẩn/dán nhãn báo cáo quảng cáo | BL-22, BL-23 | Không |
| **P1 — 2 tuần** | Hàm hạn giao chung, không trừ khi thiếu giờ hẹn | BL-24 | Chụp % lúc nhận: **Có** |
| | Đơn chat không bịa dữ liệu, mở yêu cầu bổ sung | BL-25 | Không |
| | Chi nhánh cho đơn công khai, báo lỗi khi không xác định dòng tồn, hoàn tồn trong giao dịch | BL-26 | Giờ giữ tồn: **Có** |
| | Bộ quét thuê bao + chỉ số khách dùng con trỏ | BL-27 (phần quét), BL-31 | Không |
| | `derivePaymentStatus` chung, sửa nuốt lỗi gửi báo giá | BL-31 | Không |
| **P2 — cần quyết định** | Sổ quyết toán đối tác một nguồn | BL-22 | **Có** + [SCHEMA] |
| | Trần chiết khấu mọi kênh | BL-28 | **Có** |
| | Đổi gói, tiền dư, ngày neo kỳ | BL-27 | **Có** (ngày neo có thể [SCHEMA]) |
| | Đơn không gắn khách & giao trước; nhắc nợ lặp | BL-29 | **Có** |
| | Định nghĩa "Giá trị đơn" | BL-30 | **Có** |

### Câu hỏi cho PO
1. Tiền công đối tác lấy từ đâu là chuẩn — phí gia công lúc chi nhánh nhận đơn (trừ khấu trừ) hay số nhập tay khi đóng đơn?
2. Khoản trừ giao trễ: đơn không có giờ hẹn thì không trừ? Mức % chốt tại lúc chi nhánh nhận đơn?
3. Đổi gói: áp ngay và tính chênh lệch, hay giữ gói cũ đến hết kỳ? Chuyển khoản dư: cộng credit hay hoàn?
4. Trần chiết khấu 50% áp cho báo giá và đơn nhập tay? Vượt trần cần ai duyệt?
5. Đơn đặt công khai chưa thu giữ tồn tối đa bao lâu? Có bật tự huỷ mặc định khi tiệm theo dõi tồn?
6. Đơn chưa gắn khách có được "giao trước, thu sau" theo lối hoả tốc không? Nhắc nợ quá hạn lặp mấy lần, khi nào báo Điều hành?
7. "Giá trị đơn" trên màn số liệu có tính đơn Nháp không?

## 6. Test cần viết (đi cùng bản sửa)

| Test | Chứng minh |
|---|---|
| Unit `order-repository`: metadata client có `stock` → lưu không còn khoá `stock`; tenant: huỷ đơn đó → tồn không đổi | BL-19 |
| Unit `createCoordinatorOrder`: dưới sàn, không có C10 → 422; sản phẩm theo dõi tồn → tồn giảm | BL-20 |
| Unit `decidePendingPayment`: đơn đã huỷ → 422; tenant: huỷ đơn → khoản `PENDING` thành `REJECTED` | BL-21 |
| Unit `parseDeliveryTimestampMs`/hàm mới: không giờ hẹn → `null`; `"14h-16h"` → 16:00 VN | BL-24 |
| Unit `convertChatToDraftOrder`: thiếu SĐT → không có `0900000000`, `cardMessage` rỗng | BL-25 |
| Unit `takeStock`: sản phẩm theo dõi tồn ở 2 chi nhánh, đơn không chi nhánh → lỗi rõ ràng | BL-26 |
| Unit `addCycle` theo ngày neo: 31/01 → 28/02 → 31/03 | BL-27 |
| Unit `listSubscriptionsToCheck` với 201 thuê bao quá hạn + 1 thuê bao cần cấp credit → thuê bao đó được xét | BL-27 |

## 7. Gate đã chạy trong đợt audit

- `npm test` (biến môi trường giả, không CSDL), tại `50b9c1e6` = `main`: **4865/4897 test đạt; 32 test / 10 tệp đỏ**, đều do môi trường: các test gọi Prisma thật mà không có CSDL (`Can't reach database`, `Invalid this.db.organizations.find…`) và test cần khoá bí mật thật. Đợt audit **không đổi mã nguồn** nên không có lỗi mới so với `main`.
- `npm run check:docs`: đạt.
- `test:tenant`, `test:platform`: **không chạy** — môi trường không có CSDL `_test`. Các kịch bản tenant ở mục 6 chưa được chứng minh.
