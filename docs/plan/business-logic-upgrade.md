# Kế hoạch nâng cấp logic nghiệp vụ đơn hàng · tiền · giá · credit

- Trạng thái: `PROPOSED` — lập 07/11/2026. Chuyển `ACTIVE` khi PO duyệt đợt P0 (không cần quyết định mới) và trả lời Q1–Q8 (mục 6).
- Đầu vào: `docs/audit/business-logic-audit/BUSINESS_LOGIC_AUDIT_2026-11-06.md` (nhánh `claude/tender-goodall-feq9zt`, BL-01…BL-18).
- Liên quan: `docs/plan/db-enterprise-architecture.md` (DoD-3 RLS, DoD-8 đối soát), ADR-014 (`order_recipients`), `docs/dac-ta/TECHNICAL_DEBT.md` #150.
- Cách giao: **mỗi gói (WP) một PR**, Conventional Commits, mã + test + tài liệu cùng commit. Gói gắn **[PO]** chỉ bắt đầu khi có quyết định; gói gắn **[SCHEMA]** cần PO duyệt từng PR và kèm `prisma migrate dev`.

## 1. Kiểm chứng audit trên `main` (`2871ee7`, 07/11/2026)

Audit ghi bằng chứng ở commit `d9fc528` — commit này **không có** trong lịch sử repo (nhánh audit dựng trên `d8dd00d`).
Từ đó `main` thêm 112 tệp `src/`+`prisma/` (chủ yếu P-3b `order_recipients`, RLS, no-cache). Đối chiếu lại từng phát hiện:

| Mã | Còn đúng? | Bằng chứng tại `2871ee7` | Ghi chú hiệu chỉnh |
|---|---|---|---|
| BL-01 | Đúng | `src/app/api/v1/orders/[id]/route.ts:10` enum đủ 6 trạng thái; `:47` chỉ R3 | Nơi duy nhất trên UI gọi PATCH với `status` là `order-detail-modal.tsx:82` → khoá an toàn |
| BL-02 | Đúng | `stage-transitions.ts:109` chỉ kiểm sự cố mở; `operation-rules.ts:249` kiểm số dư | — |
| BL-03 | Đúng | `state-mapper.ts:20` INTAKE→DRAFT; `:51-62` DISPATCHED→DELIVERED; `order-rules.ts:34` | — |
| BL-04 | Đúng | `cancel-order.ts:40-59` chỉ chặn CANCELLED/COMPLETED, chỉ đổi `status`; sự kiện ghi trước, không giao dịch | — |
| BL-05 | Đúng | `record-payment.ts:57-63` không chặn vượt/đơn huỷ; `coordinator-repository.ts:218` ghi số tuyệt đối; không migration nào có CHECK tiền; `schema.prisma:1952-1954` trỏ migration `..._coordinator_p1_p2_payments` không tồn tại | `coordinator-repository.ts` đã 347 dòng → phải tách khi sửa |
| BL-06 | Đúng | `coordinator/adapters/http-schemas.ts:108`, `connectors/order-ingestion-connector.ts:9` | — |
| BL-07 | Đúng | `assertNotBelowFloor` chỉ ở `quote-order.ts:27`, `create/update-quotation`, `discount-requests.ts:72` | — |
| BL-08 | Đúng | `api/v1/orders/route.ts:26` nhận `voucherId`; `order-repository.ts:125` lưu thẳng | — |
| BL-09 | Đúng | `standard-payment-repository.ts:63-69`; `collect-due-repository.ts:11-34` lọc "đã nhắc" sau `take` | Cả hai là bộ quét liên tổ chức → phải theo `AGENT_RULES.md` §14 #15 (`asSystemDb`) |
| BL-10 | Đúng | `create-order.ts:29-30` | — |
| BL-11 | Đúng | `order-action-buttons.tsx:43-70`; `order-detail-modal.tsx:87,101,284,304` | **Hiệu chỉnh:** audit ghi "không cần PO", nhưng `TECHNICAL_DEBT.md` #150 đã chốt chọn luồng là quyết định PO → tách WP (mục 3) |
| BL-12 | Đúng | `so-lieu/page.tsx:74`; `orders/domain/business-reporting.ts:12,61` | — |
| BL-13 | Đúng | `schema.prisma:1984` FK `customer_id` không ghép `organization_id` (khác `:2236`, `:2254`) | Phần SĐT người nhận nay nằm ở `order_recipients` (P-3b) — kiểm định dạng đặt ở đó |
| BL-14…16 | Đúng (đọc mã) | `quantity_available` không có đường ghi giảm trong `src/` | Cần PO trước khi làm |
| BL-17 | Đúng | `usage-limit-repository.ts:77-86` luôn `creditPeriod()` hiện tại | — |
| BL-18 | Đúng một phần | Thông điệp mã kỹ thuật `order-rules.ts:50`, `stage-transitions.ts:79` | VAT: P-3b đã đọc thông tin người mua VAT từ `order_recipients`; phần "đơn `DH`/`FLR` không tính VAT" vẫn đúng |

Kết luận: **18/18 phát hiện còn hiệu lực**, 2 điểm hiệu chỉnh (BL-11 cần PO; BL-09 thêm ràng buộc RLS). Audit chưa chạy test —
mỗi WP dưới đây **bắt đầu bằng test đỏ tái hiện lỗi** rồi mới sửa (Definition of done mục 7).

## 2. Nguyên tắc thiết kế xuyên suốt

1. **Một luật, một chỗ** (gốc rễ của audit): luật vòng đời ở `orders/domain/order-lifecycle.ts`, luật thu tiền ở
   `orders/workflow/standard-payment.ts` (`planPayment`). Điều phối gọi các hàm này, không tự mang bản luật.
2. Domain thuần, không Prisma (`CLAUDE.md` #4). Ghi sự kiện + cập nhật đơn trong **một giao dịch**.
3. Mọi cập nhật tiền dùng khoá lạc quan `updateMany where paid_vnd = <đã đọc>` → 0 dòng = 409.
4. Lỗi trả UI bằng tiếng Việt tự nhiên, không mã trạng thái (`CLAUDE.md` #6) — nhãn lấy từ một bảng nhãn domain.
5. Bộ quét nền: điều kiện loại trừ nằm **trong câu truy vấn**, có trần vòng lặp, chạy trong `asSystemDb`.
6. Không đổi hành vi Thẻ chào (đóng băng) trừ khi PO gỡ băng (BL-08 phần 2, BL-14 phần SĐT).

## 3. Đợt P0 — sửa nóng, không cần quyết định mới (5 PR, ước ~4 ngày)

### WP-01 · BL-01 — Khoá trạng thái kết thúc/xác nhận ở `PATCH /orders/:id`
- **Sửa:** `src/app/api/v1/orders/[id]/route.ts` — `status` chỉ nhận `PROCESSING`, `DELIVERED` (bước tiến độ); gửi
  `CONFIRMED|COMPLETED|CANCELLED` → 422 với lời chỉ dẫn: "Huỷ đơn dùng nút Huỷ (cần lý do)", "Đơn được xác nhận khi
  ghi nhận tiền hoặc duyệt giao trước", "Hoàn tất đơn ở màn Điều phối". Đặt luật trong domain
  (`order-rules.ts: assertManualStatusAllowed`) để route chỉ gọi.
- **Test:** `tests/unit/orders/patch-order-status-route.test.ts` — ba trạng thái → 422; `PROCESSING` vẫn qua; vai
  Điều phối (R3, không R6) huỷ → 422.
- **Gate:** typecheck, lint:ratchet, `npm test`, `test:tenant` (route).
- **Rủi ro:** tích hợp ngoài gọi PATCH để huỷ — grep `integration-hub` trước khi merge; ghi vào `06-api-specification.md`.

### WP-02 · BL-02 — "Chỉ hoàn tất khi thu đủ" cho mọi đường
- **Sửa:** thêm `balanceVnd` vào `StageTransitionFacts` (`coordinator/domain/stage-transitions.ts`), từ chối
  `→COMPLETED` khi `> 0` (dùng chung thông điệp với `checkClosure`, `operation-rules.ts:249`). Use-case
  `update-coordinator-stage.ts` nạp `balance_vnd`. `PATCH /orders` đã chặn `COMPLETED` ở WP-01.
- **Test:** bổ sung `tests/unit/coordinator/stage-transitions.test.ts` (DELIVERED→COMPLETED, balance 1 → từ chối; 0 → qua).
- **Phụ thuộc:** không (luật PO chốt 04/11, ALG 4.26).

### WP-03 · BL-05 (phần mã) — Thu tiền điều phối dùng `planPayment` + khoá lạc quan
- **Sửa:**
  - `coordinator/use-cases/record-payment.ts`: thu (`DEPOSIT|BALANCE`) gọi `planPayment` → chặn vượt số còn phải thu,
    chặn đơn huỷ; hoàn (`REFUND`) dùng hàm domain mới `planRefund` cùng tệp `standard-payment.ts`.
  - Tách phần thu tiền khỏi `coordinator-repository.ts` (347 dòng) sang `coordinator/infra/coordinator-payment-repository.ts`;
    `updateMany where { id, paid_vnd: paidBefore }`, `count === 0` → `CONFLICT` "Đơn vừa được cập nhật, vui lòng tải lại".
  - Sửa comment sai ở `schema.prisma:1952-1954` (chỉ comment — vẫn là thay đổi schema.prisma → xin PO duyệt cùng PR, không migration).
  - `payment-reconciliation.ts`: so thêm `balance_vnd = total_vnd - paid_vnd`.
- **Test:** unit `planRefund`; tenant `tests/tenant/coordinator-payment-concurrency.test.ts` — hai lượt ghi đồng thời →
  một 409, `paid_vnd` = tổng sổ `order_payments CONFIRMED`; thu vượt → 422; đơn huỷ → 422.
- **Gate:** + `test:tenant` (blocking), `check:schemas:coordinator`.

### WP-04 · BL-09 — Hai bộ quét nền không còn kẹt
- **Khớp chuyển khoản** (`standard-payment-repository.ts:listUnmatched`, `match-standard-bank-transfers.ts`): phân trang
  con trỏ `(created_at, id) > con trỏ trước` trong một lượt chạy, trần `MAX_PAGES` (vd. 20 × 100) — không đổi schema.
- **Nhắc thu nợ** (`collect-due-repository.ts:listOverdue`): đưa loại trừ vào truy vấn
  `order: { …, events: { none: { reason: COLLECT_DUE_REMINDER_REASON } } }`, bỏ lọc trong bộ nhớ.
- Bọc cả hai trong `asSystemDb("…")` nếu chưa có (`AGENT_RULES.md` §14 #15); chạy suite với `DB_RLS_MODE=audit`, 0 `pending`.
- **Test:** sửa `match-standard-bank-transfers.test.ts` (101 dòng không khớp + 1 dòng khớp ở trang 2 → được ghi);
  tenant test `listOverdue` với 100 đơn đã nhắc + 1 đơn mới → trả đơn mới.

### WP-05a · BL-11 (phần không cần PO) — Không nuốt lỗi
- `order-detail-modal.tsx:87,101`: nhánh `else` hiện thông báo lỗi từ API (toast hệ thống). Nút "Giao thành công" gửi
  `status: DELIVERED` thay vì `COMPLETED` (không vượt WP-01/02).
- **Gate:** `lint:ux -- --check`, `npm test`.
- Phần chọn luồng nút → WP-05b (P1, chờ Q8).

## 4. Đợt P1 — hợp nhất luật (8 PR, ~2 tuần)

| WP | Phát hiện | Việc | Tệp chính | Test khoá luật | PO |
|---|---|---|---|---|---|
| WP-06 | BL-03, BL-18 (giao dịch, nhãn) | Tạo `orders/domain/order-lifecycle.ts`: bảng chuyển hợp lệ cho **bộ ba** `(status, production, delivery)` + bảng nhãn tiếng Việt. `validate*Transition` (`order-rules.ts`) và `applyTransition` điều phối cùng gọi `assertLifecycleTransition`. Sửa `state-mapper.ts`: INTAKE giữ `status` hiện có (không hạ về DRAFT), DISPATCHING→DELIVERED đi qua `DELIVERING`. `update-order-progress.ts`, `cancel-order.ts`: sự kiện + cập nhật trong một `$transaction` | `order-lifecycle.ts` (mới), `order-rules.ts`, `state-mapper.ts`, `update-coordinator-stage.ts` | Bảng: mọi cặp stage điều phối hợp lệ → bộ ba hợp lệ; thông điệp lỗi không chứa mã `[A-Z_]{4,}` | Không |
| WP-07 | BL-04 (đồng bộ) | `cancelOrder`: đơn có `order_coordinations` → uỷ quyền `cancelCoordinatorOrder` trong cùng giao dịch; chặn huỷ `DELIVERED` (thống nhất với điều phối); nhả `product_bookings`. Giao diện ẩn nút Huỷ khi đã giao (`order-action-buttons.tsx:40`) | `cancel-order.ts`, `coordinator/use-cases/operations.ts` | Tenant: huỷ ở sổ đơn → stage `CANCELLED`, công suất đối tác giảm | Không |
| WP-08 | BL-04 (tiền) | Huỷ đơn `paid_vnd > 0` theo chính sách Q1 | như trên | Tenant theo phương án chọn | **Q1** |
| WP-09 | BL-06 | `createCoordinatorOrder` đi qua `ingestOrder` (adapter nguồn), dùng bộ sinh mã `DH…`; khai nguồn nội bộ trong `order-source.ts` (`entryStage`), bỏ enum `ORDER_M10|CHAT_M08|CATALOG_M06` | `create-coordinator-order.ts`, `ingest-order.ts`, `order-source.ts`, `http-schemas.ts` | Đơn điều phối khớp được chuyển khoản; `source ∈ ORDER_SOURCE_CODES` | **Q2** |
| WP-10 | BL-07 | `createOrder` + tạo đơn điều phối gọi `assertNotBelowFloor` cho dòng có `productId`; nguyên liệu mất → `missingPrices` (`cost-calculator.ts:24`); một hàm `floorPriceVnd` cho cảnh báo (`price-scenarios.ts`) và chặn (`price-floor.ts`). C9 theo Q3 | `create-order.ts`, `costing/domain/*` | Giá dưới sàn ở `POST /orders` → 422; giá "không cảnh báo" không bao giờ bị chặn | **Q3** (chỉ phần C9) |
| WP-11 | BL-10 | Hàm chung `vnDateKey(now)` (UTC+7) dùng cho mã đơn, "hôm nay", `creditPeriod`; `createOrder` thử lại tối đa 3 lần khi `P2002` như điều phối | `order-rules.ts:161-166`, `order-repository.ts:93-98`, `monthly-limit.ts:21` | 23:30 UTC = ngày VN hôm sau; hai tạo đơn đồng thời không 500 | Không |
| WP-12 | BL-13 | `orderInputSchema` dùng chung (FE `create-order-modal.tsx` import kiểm sớm, BE parse): giá ≥ 1 nguyên, số lượng 1–999, ngày `YYYY-MM-DD` không quá khứ, `VN_PHONE`; `assertOwnedCustomer/Branch/Product`; `GET /orders` chặn `limit` 1–100, `status` thuộc enum; bỏ dòng mẫu "hồng đỏ" mặc định | `api/v1/orders/route.ts`, `create-order.ts`, `create-order-modal.tsx` (321 dòng — không tăng) | Tenant: `customerId` tổ chức khác → 404; `limit=abc` → 422 | Không |
| WP-13 | BL-17 | Lưu `period` lúc trừ (dòng `ENQUEUED`), `releaseMonthlyCredit(…, period)` hoàn đúng kỳ; xoá `refundUsage` (chưa ai gọi) | `usage-limit-repository.ts`, `usage/use-cases/refund-usage.ts` | Trừ tháng 10, hoàn tháng 11 → `used` tháng 10 giảm, tháng 11 giữ | Không (nếu kỳ lưu được trong cột có sẵn; nếu cần cột mới → **[SCHEMA]**) |
| WP-14 | BL-12 | `/so-lieu` gọi API `reporting` (đã có thực thu/dự kiến) thay `computeBusinessReport` phía client; một bảng định nghĩa KPI; sửa "Sản phẩm bán chạy" | `so-lieu/page.tsx`, `business-performance-card.tsx`, `orders/domain/business-reporting.ts` (xoá) | Tiệm 150 đơn → KPI tính đủ 150 | **Q4** |
| WP-05b | BL-11 | Nút hành động dùng kiểu `OrderStatus/ProductionStatus/DeliveryStatus`, chỉ đề xuất bước hợp lệ theo `order-lifecycle.ts` (WP-06); đóng nợ #150 | `order-action-buttons.tsx`, `order-detail-modal.tsx` | Unit: mọi giá trị gửi đi ∈ enum domain; e2e UX | **Q8** |

Thứ tự: WP-06 trước WP-07, WP-05b; WP-11 trước WP-09 (bộ sinh mã chung). Các WP còn lại độc lập, chạy song song.

## 5. Đợt P2 — cần quyết định/đổi schema

| WP | Phát hiện | Việc | Điều kiện |
|---|---|---|---|
| WP-15 | BL-05 | Migration `CHECK (paid_vnd >= 0 AND balance_vnd = total_vnd - paid_vnd)` thêm `NOT VALID`; chạy đối soát; `VALIDATE CONSTRAINT` ở migration sau | **[SCHEMA]**, sau WP-03 + 7 ngày đối soát sạch (DoD-8) |
| WP-16 | BL-13 | FK `orders.customer_id` ghép `(customer_id, organization_id)` như `:2236` | **[SCHEMA]**, đối soát dữ liệu lệch trước |
| WP-17 | BL-08 | Đơn chuẩn: bỏ `voucherId` khỏi schema đầu vào **hoặc** áp đủ (`claim` trong giao dịch tạo đơn, `releaseForOrder` khi huỷ). Thẻ chào: trần tổng chiết khấu, kiểm sàn sau giảm, thống nhất 50% vs 25% | **Q5**; phần Thẻ chào cần gỡ băng |
| WP-18 | BL-14 | Cập nhật chỉ số khách khi đơn đổi trạng thái/thu tiền (bỏ ghi trong GET `get-customer-master-index.ts:22`); tính theo thực thu; ngưỡng theo plugin ngành; chiết khấu hạng chỉ áp sau xác minh SĐT | **Q6** |
| WP-19 | BL-15 | `decideDeliverBeforePay`: xét nợ quá hạn trước mọi lối tự duyệt; trần công nợ theo khách; "hoả tốc" có trần tiền; chặn hạn thu ở quá khứ | **Q7** |
| WP-20 | BL-16 | Giữ chỗ/trừ/hoàn tồn trong một giao dịch, điều kiện `quantity_available >= qty`; lọc tồn theo chi nhánh (`availability-repository.ts:244-247`); gỡ nhánh fallback Turbopack | **Q9**; có thể **[SCHEMA]** |
| WP-21 | BL-18 | Đơn `DH`/`FLR` tính VAT; `calculateOrderTotal` báo lỗi số lượng ≤ 0 thay vì đổi thành 1 | VAT: **Q10** |

## 6. Câu hỏi cho PO (chặn các WP gắn [PO])

| # | Câu hỏi | Đề xuất mặc định | Chặn |
|---|---|---|---|
| Q1 | Huỷ đơn đã thu (ngoài Thẻ chào): hoàn ngay / giữ làm tín dụng / tạo việc chờ Điều hành? | Tạo việc "hoàn tiền chờ xử lý" cho Điều hành, ghi `REFUND` khi duyệt | WP-08 |
| Q2 | Đơn tạo ở màn Điều phối có được vào thẳng điều phối khi chưa thu/duyệt công nợ? | Có, nhưng khai nguồn "Nội bộ" và bắt buộc qua luật giao trước | WP-09 |
| Q3 | Mã C9 "vượt trần giá": chặn thật hay gỡ? | Gỡ khỏi danh mục, giữ cảnh báo | WP-10 |
| Q4 | "Doanh thu" trên `/so-lieu` là thực thu hay giá trị đơn? | Hiện cả hai: "Đã thu" (chính) và "Giá trị đơn" | WP-14 |
| Q5 | Trần tổng chiết khấu khi chồng mã + hạng + ưu đãi; có áp sàn sau giảm? Mã giảm giá ở đơn chuẩn: bỏ hay áp đủ? | 50% tiền hàng, có áp sàn; đơn chuẩn: bỏ `voucherId` | WP-17 |
| Q6 | Ngưỡng hạng khách theo ngành, theo thực thu, xác minh SĐT? | Có cả ba; OTP chỉ ở trang công khai | WP-18 |
| Q7 | Trần công nợ mỗi khách khi giao trước, thu sau? | Theo cấu hình tiệm, mặc định 5 triệu | WP-19 |
| Q8 | Nút ở modal `/don-hang` theo luồng nào (nợ #150)? | Ánh xạ `WAITING→ARRANGING→READY`, `PENDING→DELIVERING→DELIVERED`; hoàn tất chỉ ở Điều phối | WP-05b |
| Q9 | Có quản lý tồn theo số lượng? | Chỉ cho sản phẩm bật chế độ số lượng | WP-20 |
| Q10 | Đơn chuẩn có tính VAT? | Có khi khách yêu cầu hoá đơn | WP-21 |
| Q11 | Tạo đơn với ngày giao đã qua (nhập bù đơn đã giao) có được không? | **PO 07/11/2026: không** | WP-12 |
| Q12 | SĐT người nhận chỉ nhận số Việt Nam? | **PO 07/11/2026: chỉ số Việt Nam** | WP-12 |

## 7. Definition of done mỗi WP

1. Test đỏ tái hiện lỗi đi trước bản sửa (ghi trong mô tả PR: lệnh + kết quả đỏ → xanh).
2. Gate theo `CLAUDE.md`: typecheck + `lint:ratchet`; `npm test`; `test:tenant`/`test:platform` khi đụng route/dữ liệu
   (**blocking**); `lint:ux -- --check` khi đụng `.tsx`; `check:schemas:coordinator` khi đụng zod điều phối; `check:docs`
   khi đổi `06-api-specification.md`. Không lỗi mới so với `main`.
3. Không tệp nào vượt 350 dòng hoặc tăng nếu đã vượt (`coordinator-repository.ts` phải tách ở WP-03).
4. Cập nhật Screen Contracts/`06-api-specification.md` khi đổi hành vi route; đánh dấu BL-xx "đã sửa" trong audit;
   lỗi lặp lại → một dòng `AGENT_RULES.md` §14.

## 8. Theo dõi

| Đợt | WP | Trạng thái |
|---|---|---|
| P0 | WP-01 · WP-02 · WP-03 · WP-04 · WP-05a | Đã làm — PR đợt P0. Còn lại của WP-03: sửa comment CHECK ở `schema.prisma` (cần PO duyệt, gộp WP-15) và đối soát `balance_vnd` (chuyển sang WP-15) |
| P1 | WP-06 · WP-07 · WP-10 (sàn khi tạo đơn, nguyên liệu mất) · WP-11 · WP-12 · WP-13 | Đã làm — PR đợt P1 + PR "P1 phần còn lại" (sự kiện + cập nhật đơn một giao dịch; form tạo đơn gửi `productId`, dòng trống, ngày VN; ghi `order.create` vào nhật ký kiểm toán). WP-07 nhả `product_bookings`: không cần — giữ chỗ chỉ sinh cho đơn Thẻ chào, sổ đơn không huỷ được đơn Thẻ chào (`releaseOrderBooking` không có nơi gọi — thuộc Thẻ chào, đang đóng băng) |
| P1 → PO | WP-12: chặn ngày giao quá khứ, kiểm SĐT người nhận theo mẫu VN | PO 07/11/2026: Q11 không cho ngày giao đã qua, Q12 chỉ số Việt Nam — đã làm cho tạo đơn nhập tay/chat/Điều phối. Catalog công khai (vùng khoá Catalog) chưa chặn ngày quá khứ — cần PO duyệt sửa |
| P1 [PO] | WP-05b · WP-08 · WP-09 · WP-10 (C9) · WP-14 | Chờ Q1–Q4, Q8 |
| P2 | WP-15 … WP-21 | Chờ PO / [SCHEMA] |
