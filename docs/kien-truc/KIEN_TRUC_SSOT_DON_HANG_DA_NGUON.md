# Kiến trúc SSOT Đơn hàng đa nguồn — Lead → Đơn → Điều phối theo quy trình Thẻ chào

> **Mã:** `ARCH-2026-ORDER-SSOT-MULTI-SOURCE-01` · **Ngày:** 31/10/2026
> **Trạng thái:** ✅ PO duyệt kiến trúc (31/10/2026) · **đã xây** — P0–P4 xong 31/10/2026 (xem §7, mục "Để sau").
> **Căn cứ:** [`HIEN_TRANG_THE_CHAO.md`](HIEN_TRANG_THE_CHAO.md) (đường chuẩn) · [`KE_HOACH_MA_TRAN_QUY_TRINH_THE_CHAO.md`](KE_HOACH_MA_TRAN_QUY_TRINH_THE_CHAO.md) · `prisma/schema.prisma` (`orders`, `leads`, `greeting_sessions`, `order_coordinations`).

---

## 0. Nguyên tắc tối thượng — Thẻ chào ĐÓNG BĂNG (đã gỡ 05/11/2026)

> **PO 05/11/2026 (D-47): gỡ đóng băng Thẻ chào** để hợp nhất mô hình đơn hàng và khách hàng
> (audit kiến trúc CSDL 4 tầng). Đã bỏ `tests/unit/architecture/the-chao-freeze.test.ts` và tệp mốc.
> B1–B4 không còn là bất biến chặn merge: thay đổi hành vi Thẻ chào được phép, nhưng PR phải liệt kê
> hành vi nào đổi. **B5 vẫn áp dụng:** có test khoá hành vi cho đường sắp sửa, và test Thẻ chào sẵn có
> chạy xanh (sửa test cũ chỉ khi hành vi đổi có chủ đích và được ghi trong PR).

PO 31/10/2026: *quy trình Thẻ chào đang đúng và tốt, tuyệt đối không thay đổi.*

| # | Bất biến (vi phạm = chặn merge) |
|---|---|
| B1 | Mọi hành vi của đơn `orders.source = "BROCHURE"` giữ nguyên: trạng thái phiên (§6.1 hiện trạng), 9 bước theo dõi, cọc/thu đủ, SePay/AI ảnh bill/tự duyệt, báo giá, huỷ/hoàn, Điều phối, làm hộ chuỗi, trang khách `/b`, `/g`, `/bst`, `/s`, tra cứu theo mã. |
| B2 | Quyền giữ nguyên: R11 (xác nhận tiền **và báo giá** Thẻ chào) vẫn chỉ Điều hành; phạm vi xem sale (`order-scope.ts`) giữ nguyên. |
| B3 | `/the-chao` giữ nguyên 5 tab + "Gửi nhanh"; `/dieu-phoi` giữ nguyên. Mục Đơn hàng mới chỉ **nhúng lại** component Thẻ chào, không sửa chúng. |
| B4 | Không đổi nghĩa cột/giá trị mà Thẻ chào đang đọc/ghi. Trường mới chỉ **thêm**, có giá trị mặc định khiến đơn Thẻ chào cư xử y như cũ. |
| B5 | Trước khi chạm bất kỳ file nào trong `src/modules/greeting-card/**` hay `src/components/greeting-card/**`: phải có **test khoá hành vi** (characterization) cho đường đó, và test cũ chạy xanh không sửa. |

Hệ quả: các nguồn mới **tái dùng** quy trình Thẻ chào qua lớp mở rộng (§4), không "sửa Thẻ chào cho tổng quát".

---

## 1. Hiện trạng (khảo sát mã 31/10/2026)

- **Một bảng đơn duy nhất `orders`** — nhưng `source` là chữ tự do: `MANUAL` (tay, Tháp điều phối), `CHAT` (`convert-chat-to-draft-order.ts`), `BROCHURE` (Thẻ chào + link chung + làm hộ), `CHANNEL` (`integration-hub/use-cases/sales-channel.ts`). `order_coordinations.source` dùng bộ mã khác (`ORDER_M10 | CHAT_M08 | CATALOG_M06`); cổng `order-ingestion-connector.ts` là khung rỗng.
- **Hai nơi lưu lead:** `greeting_sessions` (lead của Thẻ chào, có `sale_id`) và `leads` (landing/catalog công khai/QR: `NEW | CONTACTED | WON | LOST`). Không nối với nhau, không có chuyển lead → đơn ngoài Thẻ chào.
- **Quy trình đầy đủ chỉ có ở Thẻ chào:** ~15 repository `greeting-card/infra/*` lọc `source: "BROCHURE"`; đơn nguồn khác chỉ có kanban `/don-hang` và Tháp điều phối (`order_coordinations.stage`).
- **Ba chỗ xem đơn:** `/don-hang` (đã nhúng tab Sale/Thu tiền Thẻ chào), `/dieu-phoi` (Tháp + bảng Thẻ chào), `/the-chao`.

---

## 2. Mô hình đích

```
NGUỒN ──adapter──► LEAD (Sale chăm) ──khách Đặt hàng──► ĐƠN (orders, SSOT)
                                                          │
          Chờ báo giá / chờ thanh toán (Sale) ◄───────────┘
                    │ khách báo đã chuyển · SePay báo về
                    ▼
          Chờ duyệt tiền (Điều hành duyệt · SePay/AI tự duyệt)
                    │ xác nhận cọc  HOẶC  Điều hành duyệt "giao trước thu sau"
                    ▼
          ĐIỀU PHỐI (phân thợ/chi nhánh → cắm → ảnh → giao → sự cố)
                    │ giao xong
                    ▼
          Sale chăm sau bán · Điều hành quan sát công nợ
```

**Một quy trình, nguồn chỉ quyết định bước vào.** Quy trình = quy trình Thẻ chào (B1). Không nguồn nào có quy trình riêng.

### 2.1 Vai trò

| Vai | Trách nhiệm | Không làm |
|---|---|---|
| **Sale** | Chăm lead; báo giá (nguồn mới); nhắc khách thanh toán; sửa đơn trước điều phối; chăm sau bán | Không xác nhận tiền |
| **Điều hành** | **Quan sát + phê duyệt**: duyệt tiền máy chưa khớp, duyệt giao trước thu sau, huỷ/hoàn, giảm giá vượt trần | Không chăm khách, không báo giá ở nguồn mới |
| **Điều phối** | Mọi đơn đã cọc / được duyệt giao trước: phân việc, sản xuất, giao, sự cố | Không đụng tiền đầu vào |

Riêng **Thẻ chào** giữ phân quyền hiện tại (B2): báo giá vẫn thuộc R11/Điều hành. Quyền báo giá mới cho Sale (§5.2) chỉ áp cho nguồn khác `BROCHURE`.

### 2.2 Điểm vào theo nguồn

| Mã nguồn (`source`) | Nguồn | Bước vào |
|---|---|---|
| `BROCHURE` | Thẻ chào, link chung `/g` `/bst`, làm hộ chuỗi | **Giữ nguyên hiện trạng** |
| `CATALOG` | Catalog công khai `/c/[slug]` | Lead hoặc Đơn (theo nút khách bấm, §3.2) |
| `LANDING` | Landing page | Lead hoặc Đơn (§3.2) |
| `SHORT_LINK` | QR / link rút gọn | Như đích của link |
| `CHAT` | Chat AI, Zalo OA | Lead (hội thoại); khách xác nhận đặt → Đơn |
| `MANUAL` | Nhập tay, tại quầy | Chờ thanh toán; đã thu tại quầy → Điều phối |
| `CHANNEL` | Sàn / web ngoài (đã thu hộ) | **Điều phối** |
| `NETWORK` | Đơn nhận từ mạng lưới (ngoài Thẻ chào) | Điều phối (bên nhận) |

Danh mục mã là **hằng số đóng trong mã** (`src/modules/orders/domain/order-source.ts`, mới), mỗi mã khai báo: nhãn tiếng Việt, bước vào, có lead hay không, adapter. Thêm nguồn mới = thêm một dòng + một adapter; không sửa quy trình.

---

## 3. Lead

### 3.1 Khi nào tạo lead

| Nhóm | Trường hợp | Giai đoạn |
|---|---|---|
| A. Khách chủ động | (1) Bấm **"Liên hệ / Cần tư vấn"** · (2) Hỏi mẫu ngoài danh mục / cần báo giá riêng · (3) Chat/Zalo có ý định mua · (4) Gọi điện / đến quầy chưa mua (sale nhập) | **GĐ đầu** |
| B. Bỏ dở | (5) Mở/xem nhưng không đặt · (6) Chọn mẫu / thả tim nhưng không gửi đơn (lead ấm) · (7) **Đơn bị tự huỷ vì quá hạn thanh toán → trả về lead** (PO duyệt 31/10) | **GĐ đầu** |
| C. Chăm lại | (8) Huỷ đơn · (9) Dịp nhắc lại từ CRM · (10) Đánh giá thấp sau giao | **Để sau** (PO 31/10) |

**Không tạo lead:** khách bấm Đặt hàng (tạo đơn, gắn vào lead đang mở nếu có); đơn `CHANNEL`; spam/trùng (gộp vào lead mở cùng SĐT hoặc đóng "không hợp lệ").

**Với Thẻ chào (B1):** phiên `greeting_sessions` **vẫn là** lead của Thẻ chào, không chép sang bảng khác. Mục (7) với đơn Thẻ chào là **thêm** một bản ghi lead *sau khi* bộ quét huỷ đơn như cũ — không đổi lúc huỷ, lý do huỷ, audit `system:hold-expiry` hay trạng thái phiên.

**Bộ sưu tập riêng (Thẻ chào) — tin nhắn tư vấn (PO 09/11/2026):** khách gửi form "Nhắn tin" ở `/b`, `/g`, `/bst` và tích đồng ý được liên hệ → ngoài yêu cầu tư vấn trong Hội thoại, ghi **thêm** một lead nguồn `BROCHURE`, lý do `CONTACT` (mục A1–A2), `source_ref` = mã link riêng hoặc id bộ sưu tập (`acquisition/use-cases/capture-inquiry-lead.ts`). Cùng SĐT đã có đủ lead trong giờ qua (`LEAD_PHONE_LIMIT_PER_HOUR`) → không ghi thêm lead. Phiên `greeting_sessions` không đổi.

### 3.2 Nút "Đặt hàng" và "Liên hệ / Cần tư vấn" — component bật/tắt

PO 31/10: hai lựa chọn là **component** Điều hành bật/tắt **cho toàn bộ hoặc từng nguồn**.

- Cài đặt: `organizations.settings.order_entry_actions` (JSON, không đổi schema):
  ```ts
  { default: { order: boolean; contact: boolean },
    bySource?: Partial<Record<OrderSourceCode, { order?: boolean; contact?: boolean }>> }
  ```
  Giải theo thứ tự: `bySource[nguồn]` → `default` → mặc định hệ thống. Ít nhất một nút phải bật (kiểm ở use-case, 422 nếu tắt cả hai).
- **Mặc định hệ thống:** `order: true, contact: true` cho nguồn mới; **`BROCHURE`: `order: true, contact: false`** → trang khách Thẻ chào hiển thị y như hiện nay cho đến khi Điều hành chủ động bật (B1).
- **`BROCHURE` đã nối (PO 09/11/2026):** trang khách `/b`, `/g`, `/bst` đọc công tắc qua `greeting-card/domain/brochure-entry-actions.ts`. Tắt Đặt hàng → mẫu nào cũng mở khung liên hệ; chọn mẫu / báo giá / gửi đơn trả 404. Bật Liên hệ → thêm nút "Nhắn tin" chung. Mẫu giá "Liên hệ" luôn có khung liên hệ.
- Domain thuần: `resolveEntryActions(settings, source)` trong `src/modules/orders/domain/entry-actions.ts`; component dùng chung `src/components/order-entry/entry-action-bar.tsx`.
- Quyền sửa: Điều hành (năng lực cài đặt hiện có của ngăn "Cài đặt" Thẻ chào). Cài đặt đặt trong mục Đơn hàng › Cài đặt, mỗi nguồn một dòng hai công tắc.

### 3.3 Vòng đời lead

```
MỚI → ĐANG CHĂM (đã liên hệ · đã báo giá · hẹn gọi lại)
   ├─► THÀNH ĐƠN (gắn order_id)
   └─► ĐÓNG: không nhu cầu · không liên lạc được · mua nơi khác · không hợp lệ
```

Trường cần có: nguồn, `source_ref`, **lý do vào** (`CONTACT | QUOTE_REQUEST | ABANDONED | PAYMENT_TIMEOUT | WALK_IN | CHAT`), mức nóng (máy tính: chọn mẫu > mở link), sale phụ trách (mặc định: `link-ownership.ts` — người phụ trách mặc định), hạn gọi lại. Một SĐT chỉ một lead **đang mở** mỗi tổ chức. Lead quá hạn chưa chăm → nhắc sale, rồi báo Điều hành (quan sát).

### 3.4 Lưu trữ

- Giữ **hai bảng** như hiện tại: `leads` (nguồn mới) và `greeting_sessions` (Thẻ chào, không đổi).
- **Read-model hàng đợi lead** (`src/modules/orders/use-cases/list-lead-queue.ts`): ghép `leads` mở + `greeting_sessions` chưa có đơn (chỉ **đọc**). Phiên Thẻ chào hiện trong hàng đợi để sale thấy đủ, thao tác vẫn mở đúng màn Thẻ chào.
- Migration (cần PO duyệt khi làm, database-schema skill): `leads` thêm `converted_order_id`, `reason`, `next_follow_up_at`, `closed_reason`; mở rộng giá trị `status` (`NEW | IN_PROGRESS | WON | LOST`, map `CONTACTED → IN_PROGRESS`). `leads.source` thêm `LANDING`, `CHAT`, `MANUAL`.

---

## 4. Tầng dữ liệu đơn — cổng nhận đơn duy nhất

```
adapter nguồn ──► ingestOrder(ctx, { source, sourceRef, leadId?, customer, items, paymentPlan, entryStage })
                    └─ một giao dịch: orders + order_items + order_events (+ order_coordinations nếu vào Điều phối)
                       + leads.converted_order_id
```

- `src/modules/orders/use-cases/ingest-order.ts` (mới). `organization_id` chỉ từ `ctx` (tenancy).
- Nguồn mới (`CATALOG`, `LANDING`, `CHAT`, `MANUAL`, `CHANNEL`, `NETWORK`) **chỉ** tạo đơn qua `ingestOrder`. Test kiến trúc chặn `orders.create` ngoài `orders/infra` và `greeting-card/infra` (đường Thẻ chào được miễn — B1).
- **Thẻ chào không đi qua `ingestOrder`** ở giai đoạn này; `brochure-checkout-repository.ts` giữ nguyên.
- Bỏ dùng bộ mã `ORDER_M10/CHAT_M08/CATALOG_M06` cho đơn mới; `order_coordinations.source` ghi đúng mã `orders.source`. Đơn cũ để nguyên.

### 4.1 Trường thêm vào `orders` (migration, PO duyệt khi làm)

| Trường | Mục đích | Giá trị cho đơn Thẻ chào |
|---|---|---|
| `owner_sale_id String?` | Sale phụ trách, áp phạm vi xem cho nguồn mới | `null` — Thẻ chào vẫn suy từ `greeting_sessions.sale_id` (B2) |
| `lead_id String?` | Lead gốc | `null` |
| `workflow String @default("LEGACY")` | `LEGACY` (kanban cũ) · `STANDARD` (quy trình chuẩn, nguồn mới) | Thẻ chào không đọc cột này |

Ảnh chuyển khoản của nguồn mới lưu theo đơn (`order_payments` + asset), không trên `greeting_sessions`.

### 4.2 Tái dùng quy trình Thẻ chào cho nguồn mới

Cách làm **không sửa Thẻ chào**:

1. **Tách lõi thuần** (domain, không I/O) từ Thẻ chào sang `src/modules/orders/workflow/` chỉ bằng **re-export**: `payment-plan`, `payment-schedule`, `balance-collection`, `brochure-workflow-policy`, `step-timeout-policy`, `photo-approval`. File gốc giữ nguyên nội dung; test gốc giữ nguyên.
2. **Repository mới** cho `workflow = STANDARD` (`src/modules/orders/infra/standard-workflow-repository.ts`) — song song với repository Thẻ chào, không thay bộ lọc `BROCHURE` của chúng.
3. **Use-case mới** cho nguồn mới (báo giá, ghi nhận tiền, duyệt giao trước, chuyển Điều phối) gọi lõi thuần ở bước 1.
4. Trang khách cho nguồn mới (thanh toán, theo dõi theo mã) là **route mới**; `/b`, `/g`, `/bst`, `/public/brochure/tracking` giữ nguyên.
5. SePay: bộ khớp giao dịch hiện có chỉ khớp đơn Thẻ chào. Nguồn mới thêm bộ khớp riêng cho `workflow = STANDARD`, đi **sau** bộ khớp Thẻ chào (giao dịch Thẻ chào khớp trước như cũ).

Hợp nhất code hai đường (nếu muốn) chỉ làm khi đường STANDARD đã ổn định **và** PO duyệt riêng — ngoài phạm vi tài liệu này.

---

## 5. Phê duyệt và quyền

### 5.0 Giao trước, thu sau — 3 tầng (PO 31/10/2026, đã xây P3a)

Rà mã 31/10: Thẻ chào đã có chính sách thu tiền của tiệm — ma trận "Bắt buộc thu đủ trước khi giao" (`brochure_policy.require_full_before_dispatch`) + "Shipper thu tiền mặt" (`allow_shipper_cash`), có hiệu lực ở `paymentGateBlocker`/`balance-collection.ts`; "Bắt thu trước khi chế tác" (`require_paid_before_production`, mặc định tắt, chưa có trên giao diện); mục COD ở phương thức thanh toán (`brochure_payment.enable_cod`, `cod_requires_deposit`, `cod_max_vnd`) **chỉ được lưu, chưa nơi nào đọc**. Chưa có yêu cầu theo từng đơn. Ghi nhận: hai khoá cùng nghĩa "thu đủ trước khi giao" (`brochure_policy.require_full_before_dispatch` và `brochure_workflow_policy.require_full_payment_before_dispatch`) — Thẻ chào đóng băng nên chưa đối soát.

Cho đơn ngoài Thẻ chào (`src/modules/orders/workflow/deliver-before-pay.ts`):
1. **Chính sách sẵn có (dùng lại, chỉ đọc):** tiệm không bắt thu trước chế tác/trước giao, hoặc COD bật + trong `cod_max_vnd` + (không đòi cọc hoặc đã cọc) → tự duyệt, căn cứ `POLICY`.
2. **Sale tự quyết:** đơn hoả tốc (`isUrgentOrder` của Thẻ chào, chỉ gọi) → `URGENT`; trong hạn mức `order_deliver_before_pay` (mặc định bật · ≤ 1.000.000đ · khách ≥ 2 đơn hoàn tất · không nợ quá hạn) → `SELF_LIMIT`.
3. **Điều hành duyệt (R16):** còn lại → `PENDING`; duyệt (sửa hạn thu) → `ADMIN`; từ chối phải ghi lý do.

Mỗi lần xin ghi một dòng `order_approval_requests` (ai xin, căn cứ, ai duyệt, hạn thu `collect_due_at` — mặc định +3 ngày). Được duyệt → `order_coordinations` (INTAKE) + `orders.workflow = STANDARD` + `order_events`, cùng giao dịch. Nợ quá hạn = yêu cầu đã duyệt có `collect_due_at` đã qua mà đơn còn `balance_vnd > 0`.

### 5.1 Chuyển sang Điều phối
Đơn `STANDARD` sang Điều phối khi: (a) cọc/thu đủ được xác nhận (Điều hành, SePay, AI ảnh bill theo chính sách tự duyệt); hoặc (b) Điều hành bấm **"Duyệt giao trước, thu sau"** — bắt buộc lý do, ghi `order_events` (`axis = "order"`, `reason`). Với Thẻ chào, hành vi chuyển giữ nguyên (`dispatch-after-payment.ts`, Gate 5 `brochure-workflow-policy.ts`).

### 5.2 Mã năng lực mới (catalog `src/core/rbac/capability-catalog.ts`)
- `R15 order.quote` — báo giá đơn nguồn mới; mặc định `sale`, `dieu_hanh`. **Không** áp cho endpoint Thẻ chào (vẫn R11). *(đã thêm 31/10)*
- `R16 order.deliver_before_pay.approve` — duyệt giao trước thu sau; mặc định `dieu_hanh`, trần cứng `dieu_hanh`. *(đã thêm 31/10)*
- Xin giao trước dùng `R2` (tạo đơn — Sale, Điều phối, Điều hành).
- `order.entry_actions.configure` — bật/tắt nút Đặt hàng/Liên hệ; mặc định `dieu_hanh`.
- Lead dùng mã quyền hiện có của `/api/v1/leads` (`Q1`); route mới khai capability, hoặc được liệt kê trong `tests/unit/architecture/route-capability-guard.test.ts` kèm lý do.

---

## 6. Giao diện — mục "Đơn hàng" theo vai

Một mục sidebar `/don-hang`; mỗi tab là **hàng đợi lọc trên cùng dữ liệu**, mở mặc định theo vai, chỉ hiện tab có quyền.

| Tab | Vai | Nội dung | Nguồn Thẻ chào |
|---|---|---|---|
| **Khách tiềm năng** | Sale | Hàng đợi lead (§3.4), mức nóng, hạn gọi lại | Phiên chưa đặt — bấm mở màn Thẻ chào |
| **Sale chăm sóc** | Sale | Đơn chờ báo giá/thanh toán, sửa đơn, chăm sau giao | Nhúng `SalesBrochureTab` nguyên vẹn |
| **Phê duyệt** | Điều hành | Tiền chưa khớp, giao trước thu sau, huỷ/hoàn, giảm giá; quan sát còn phải thu, giao xong còn nợ | Nhúng `AdminBrochurePaymentTab` nguyên vẹn |
| **Điều phối** | Điều phối | Đơn đã cọc / được duyệt giao trước | Nhúng `CoordinatorBrochureTab` nguyên vẹn |
| **Tất cả / Theo dõi** | Theo quyền | Mọi đơn, lọc theo nguồn/chi nhánh/sale/ngày; hành trình từng đơn | Nhúng `BrochureOrderTrackingTab` nguyên vẹn |

- Mỗi tab có dải đếm (việc cần làm, việc trễ) = "dashboard" của vai, không tạo trang riêng.
- Trong mỗi tab: khối **Thẻ chào** (component cũ) + khối **nguồn khác** (component mới), cho tới khi PO duyệt hợp nhất hiển thị.
- `/the-chao` và `/dieu-phoi` **giữ nguyên** (B3); thêm lối tắt sang tab tương ứng của Đơn hàng, không gỡ tab nào.
- `src/app/(app)/don-hang/page.tsx` đã 351 dòng → tách mỗi tab thành component riêng trong `src/components/orders/workspace/` (≤ 350 dòng/file).
- Giao diện tuân `OPERATING_PRINCIPLES.md` (Progressive Disclosure), tiếng Việt tự nhiên, token ngữ nghĩa; Tab Action Header giữ chuẩn PO.

---

## 7. Lộ trình

| Pha | Nội dung | Điều kiện xong |
|---|---|---|
| **P0 — Khoá Thẻ chào** | Test khoá hành vi cho checkout, thanh toán/SePay, bộ quét huỷ, Điều phối, theo dõi (B5) | `npm test` xanh, không sửa test cũ |
| **P1 — Dữ liệu** | `order-source.ts`, `entry-actions.ts`, migration `orders`/`leads` (§3.4, §4.1), `ingestOrder`, adapter CATALOG/LANDING/CHAT/MANUAL/CHANNEL, test kiến trúc | `test:tenant`, `test:platform` xanh |
| **P2 — Lead** | Nút Liên hệ/Đặt hàng (bật/tắt), lead nhóm A–B, trả về lead khi quá hạn thanh toán, hàng đợi lead | Thẻ chào: P0 vẫn xanh |
| **P3 — Quy trình STANDARD** | Báo giá Sale, ghi nhận tiền, SePay nguồn mới, duyệt giao trước, chuyển Điều phối, trang khách nguồn mới | P0 vẫn xanh |
| **P4 — Giao diện theo vai** | Mục Đơn hàng 5 tab, cài đặt nút theo nguồn, lối tắt từ `/the-chao` `/dieu-phoi` | `lint:ux`, `test:e2e:ux` |
| Sau | Lead nhóm C (CRM); hợp nhất code hai đường (cần PO duyệt riêng) | — |

Mỗi pha ship kèm test + cập nhật tài liệu này và `TRANG_THAI.md` trong cùng commit.

**Tiến độ (31/10/2026):**
- **P0 xong** (khoá băm gỡ 05/11/2026, D-47). `tests/unit/architecture/the-chao-freeze.test.ts` băm toàn bộ tệp Thẻ chào (miền, giao diện, `/the-chao`, trang khách `/b` `/g` `/bst` `/s` `/subcontract`, API `greeting-card` + công khai + SePay) và định nghĩa các mã năng lực Thẻ chào dùng (vai mặc định, trần cứng), so với `the-chao-freeze.manifest.txt`. Bất kỳ thay đổi nào → đỏ. Chỉ cập nhật mốc khi PO duyệt: `UPDATE_THE_CHAO_FREEZE=1 npm test -- tests/unit/architecture/the-chao-freeze.test.ts`. Test hành vi Thẻ chào sẵn có (~96 tệp) giữ nguyên, xanh.
- **P1 (phần thuần) xong.** `src/modules/orders/domain/order-source.ts` (danh mục nguồn §2.2) · `src/modules/orders/domain/entry-actions.ts` (§3.2) + test.
- **P1 xong (PO duyệt schema 31/10).** Migration `20261031133749_orders_multi_source_lead_link`: `orders` + `owner_sale_id`, `lead_id` (FK `leads`, SET NULL), `workflow` (mặc định `LEGACY`); `leads` + `reason`, `next_follow_up_at`, `closed_reason`, `converted_order_id` (FK `orders`, SET NULL); dữ liệu `CONTACTED → IN_PROGRESS`. Cổng `src/modules/orders/use-cases/ingest-order.ts` (từ chối `BROCHURE` và mã lạ; kiểm sale phụ trách là thành viên đang hoạt động) + `infra/order-lead-link.ts` (lead → đơn cùng giao dịch: khác tổ chức 404, đã thành đơn 409). Adapter đã nối: nhập tay `POST /orders` (`MANUAL`), chat (`CHAT` — trước đây ghi nhầm `MANUAL`), kênh bán ngoài (`CHANNEL`). Gác: `tests/unit/architecture/order-ingestion-guard.test.ts`; cách ly: `tests/tenant/order-lead-link.test.ts`.
- **P2 xong (31/10).**
  - Nút Đặt hàng/Liên hệ: `src/modules/orders/use-cases/entry-actions-settings.ts` + `GET/PUT /api/v1/orders/entry-actions` (đọc `R1`, sửa `F2` — dùng mã sẵn có "sửa cài đặt tổ chức", trần cứng Điều hành, thay cho mã mới `order.entry_actions.configure` ở §5.2 để không thêm mã năng lực); màn cài đặt `src/components/orders/entry-actions-settings.tsx` (thu gọn, trong tab "Khách để lại thông tin" của `/thu-hut-khach`, chỉ hiện với người có `F2`). Trang công khai `/c/[slug]` đọc cài đặt theo nguồn (`LANDING` nếu có cấu hình chiến dịch, còn lại `CATALOG`) và ẩn khối "Liên hệ" khi tắt.
  - Lead nhóm A: form công khai ghi `reason = CONTACT`; Sale tự thêm lead `POST /api/v1/leads` (`Q2`, lý do `WALK_IN | QUOTE_REQUEST | CONTACT`, người phụ trách = người nhập, `consent_version = STAFF_ENTERED`).
  - Lead nhóm B: phiên Thẻ chào chưa đặt (mở/xem/chọn mẫu) hiện thẳng trong hàng đợi (chỉ đọc); đơn tự huỷ vì quá hạn thanh toán → lead `PAYMENT_TIMEOUT` (bộ quét `src/modules/acquisition/use-cases/recover-payment-timeout-leads.ts`, mỗi 5 phút từ `src/instrumentation.ts`, tắt bằng `LEAD_RECOVERY_SWEEP=off`). Bộ quét chỉ đọc `order_events` (trục order → `CANCELLED`, lý do `AUTO_CANCEL_REASON`/`PAYMENT_TIMEOUT_REASON` import từ Thẻ chào), giao lead cho sale cũ, bỏ qua đơn đã có lead cứu đơn hoặc SĐT đã có lead mở; cơ sở liên hệ ghi `consent_version = ORDER_PLACED` (khách tự để SĐT khi đặt đơn — cơ chế đồng ý chung còn treo ở D13).
  - Hàng đợi lead chung: `GET /api/v1/orders/lead-queue` (`Q1`) — `src/modules/orders/use-cases/list-lead-queue.ts`, xếp quá hạn gọi lại → nóng → hạn gần → mới; phạm vi sale theo cài đặt "chỉ khách của mình" của Thẻ chào (`resolveSaleScope`, chỉ gọi).
  - Test: unit (miền + use-case), `tests/tenant/order-lead-queue.test.ts`.
- **P3a xong (31/10).** Migration `order_approval_requests`; mã `R15`, `R16`; `src/modules/orders/workflow/deliver-before-pay.ts` (§5.0), use-case `deliver-before-pay.ts`, `quote-order.ts`, `deliver-before-pay-settings.ts`; route `POST /orders/:id/quote`, `POST /orders/:id/deliver-before-pay`, `GET /orders/approval-requests`, `POST /orders/approval-requests/:requestId/decision`, `GET/PUT /orders/deliver-before-pay-settings`. Test: unit + `tests/tenant/order-approval-requests.test.ts`.
- **P3b xong (31/10).** Thu tiền đơn ngoài Thẻ chào: `POST /api/v1/orders/:id/payments` (`R11` — cùng mã "xác nhận tiền chuyển khoản" của Điều hành), `src/modules/orders/workflow/standard-payment.ts` + `infra/standard-payment-repository.ts`: lần thu đầu = cọc → `CONFIRMED` + sang Điều phối (`infra/coordination-handoff.ts`, dùng chung với P3a); chống ghi trùng bằng điều kiện số đã thu. SePay: bộ quét `use-cases/match-standard-bank-transfers.ts` (mỗi phút, `ORDERS_BANK_MATCH=off` để tắt) chỉ nhận dòng `greeting_payment_events` mà bộ khớp Thẻ chào để lại `UNMATCHED` và chưa gắn đơn, đọc mã `DH<yymmdd>-<4 số>`, ghi thu và đánh dấu `MATCHED` **trong cùng giao dịch** (không bao giờ ghi trùng); không đủ điều kiện → để nguyên cho Điều hành. Mã Thẻ chào không bị đổi; dòng ngân hàng của đơn ngoài Thẻ chào sẽ không còn nằm trong bảng "tiền vào chưa khớp" của Thẻ chào khi đã khớp. Test: unit + `tests/tenant/order-standard-payments.test.ts`.
- **P4 (giao diện) xong phần chính (31/10).** `/don-hang` thành mục theo vai 5 tab (§6) — `src/components/orders/workspace/` (`role-tabs.ts`, `lead-queue-tab.tsx`, `workbench-list.tsx` + `workbench-actions.tsx`, `approval-requests-list.tsx`, `all-orders-tab.tsx` tách nguyên từ trang cũ); API `GET /api/v1/orders/workbench` (`R1`). Thẻ chào nhúng nguyên vẹn (`SalesBrochureTab`, `AdminBrochurePaymentTab`, `CoordinatorBrochureTab`); `/the-chao`, `/dieu-phoi` giữ nguyên. Screen Contract `docs/dac-ta/screen-contracts/don-hang.md` §0.
- **Hoàn thiện (31/10).**
  - Màn hạn mức Sale tự quyết: `src/components/orders/workspace/deliver-before-pay-settings-panel.tsx` (thu gọn, trong tab Phê duyệt, chỉ `F2`).
  - Thông báo: sự kiện `ORDER_DELIVER_BEFORE_PAY_REQUESTED` (Điều hành, khi có yêu cầu chờ duyệt) và `ORDER_COLLECT_DUE` (Sale phụ trách + Điều hành quan sát) ở `src/modules/notification/domain/events/store-order-events.ts`; bộ nhắc `use-cases/remind-collect-due.ts` chạy cùng bộ quét Đơn hàng, mỗi đơn nhắc một lần.
  - Trang đặt hàng catalog/landing: `POST /api/v1/public/catalog/:slug/order` (`use-cases/place-public-catalog-order.ts`) + form `src/components/catalog/public-order-form.tsx` trong chi tiết mẫu khi nút Đặt hàng bật. **Lưu ý:** mặc định hệ thống bật nút Đặt hàng cho `CATALOG`/`LANDING` (§3.2) → catalog công khai hiện có sẽ thấy nút "Đặt hàng" cho tới khi Điều hành tắt.
  - Trang khách `/c/[slug]` (04/11/2026): nút trên thẻ sản phẩm, thanh đáy di động, header và chi tiết mẫu theo `entryActions` — bật Đặt hàng thì thẻ mở thẳng form đặt hàng; tắt Liên hệ thì ẩn mọi nút Zalo/Gọi (Screen Contract `catalog.md`).
  - Tab Điều phối: thêm danh sách đơn ngoài Thẻ chào đang điều phối (`GET /api/v1/orders/coordination-queue`, `coordination-queue-list.tsx`); xử lý chi tiết vẫn ở Tháp điều phối (tệp 983 dòng — không làm dài thêm).
- **Để sau:** lead nhóm C (CRM); lead từ chat; trang khách tra cứu đơn nguồn mới theo mã; mục COD trên trang đặt hàng (hiện chỉ hiện chuyển khoản); hợp nhất code hai đường Thẻ chào ↔ STANDARD (cần PO duyệt riêng).
- **Còn lại sau P2:** nút Đặt hàng của catalog/landing chưa có trang đặt hàng trực tuyến (P3 — cài đặt đã lưu sẵn); lead từ chat (A3) chưa tự tạo; giao diện hàng đợi lead nằm ở P4 (mục Đơn hàng › Khách tiềm năng); khối "Liên hệ" mới ẩn ở giao diện, API `POST /public/catalog/:slug/lead` chưa kiểm cài đặt.
- **Chưa làm (ghi rõ):** đơn nguồn mới vẫn `workflow = LEGACY` cho tới khi P3 có đường STANDARD; `NETWORK`/`CATALOG`/`LANDING` mới có mã, chưa có adapter tạo đơn (trang khách chưa có nút Đặt hàng — P2); Tháp điều phối (`coordinator-query-helper.ts`) còn ghi thẳng `orders.create` — chuyển ở P3 (có trong danh sách cho phép của test gác).

---

## 8. Ngoài phạm vi / quyết định đã chốt

- PO 31/10/2026 đã chốt: áp quy trình Thẻ chào cho mọi nguồn; tách Lead khỏi Đơn; Điều hành chỉ quan sát + phê duyệt; Sale báo giá (nguồn mới); vào Điều phối khi xác nhận cọc hoặc được duyệt giao trước; hàng đợi lead chung giữ hai bảng; nút Đặt hàng/Liên hệ là component bật/tắt theo toàn bộ hoặc từng nguồn; trả về lead khi quá hạn thanh toán; nhóm C để sau; **Thẻ chào giữ nguyên tuyệt đối**.
- **Ghi nhận mâu thuẫn đã xử lý:** "Sale báo giá" và "tách R11" sẽ làm đổi Thẻ chào → theo B1/B2, chỉ áp cho nguồn mới; Thẻ chào giữ R11. Muốn áp cho Thẻ chào cần PO quyết riêng.
- Không thay đổi: `render.yaml`, CI, nhà cung cấp mới (SePay đã có).
