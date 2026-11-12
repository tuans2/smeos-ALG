# Đặc tả Tính năng "Thực hiện nghiệp vụ Điều phối (Chức năng 12)" — Hiện trạng (Baseline Audit)

> **Mục đích**: Reverse-engineer 100% tính năng Nghiệp vụ Điều phối (Order Coordination / Tháp Vận hành Control Tower) từ mã nguồn TypeScript (Next.js), CSDL Postgres/Prisma và tài liệu thực tế của `floraos-core`.
> **Phạm vi**: 
> - Web Client: [`src/app/(app)/dieu-phoi/page.tsx`](../../src/app/%28app%29/dieu-phoi/page.tsx), [`src/components/coordinator/control-tower-dashboard.tsx`](../../src/components/coordinator/control-tower-dashboard.tsx), [`src/components/coordinator/`](../../src/components/coordinator), [`src/components/templates/coordinator/`](../../src/components/templates/coordinator) (18 template/modal components).
> - API Routes: [`src/app/api/v1/coordinator/`](../../src/app/api/v1/coordinator) (15 routes bao gồm orders, stages, assign-partner, production, qc, delivery, exceptions, payments, partners).
> - Domain & Use-Cases: [`src/modules/coordinator/`](../../src/modules/coordinator) (51 files bao gồm stage transitions, state mapper, SLA calculation & monitor, partner settlement, operations, exception management, connectors).
> - Cơ sở dữ liệu: `orders`, `order_coordinations`, `partners`, `order_qc_records`, `order_exceptions`, `order_payments`, `order_events`, `field_definitions`, `field_catalogs`.
> **Tiêu chuẩn phân loại**: ✅ Implemented · ⚠️ Partial · ❌ Missing · 🪦 Dead Code · ❓ Unclear

---

## 1. Tổng quan Kiến trúc & Ranh giới Nghiệp vụ

### 1.1 Mô tả nghiệp vụ cốt lõi
Nghiệp vụ Điều phối (**Chức năng 12 / Tháp Vận hành Control Tower**) là trung tâm điều hành hậu cần và sản xuất hoa tươi của ALG:
1. **Tiếp nhận & Chuẩn hóa đơn hàng (Sales Intake & Validation - P1)**: Tiếp nhận đơn từ Sales, Chatbot M08, Catalog Thẻ chào M06 hoặc nhập tay. Kiểm tra tính khả thi, ràng buộc địa chỉ giao hàng nhiều tầng (Street/Ward/District/City), snapshot định mức vật tư (**BOM**) từ Product Master Index, và tính toán hạn giao hàng theo cam kết dịch vụ (**SLA**).
2. **Lập kế hoạch & Phân công xưởng/thợ cắm (Planning & Partner Assignment - P2/P3)**: Gợi ý xưởng ngoài hoặc thợ cắm nội bộ theo bán kính địa lý, năng lực tiếp nhận hàng ngày (`capacity_daily`), cấp bậc đối tác (`tier`), và chuyên môn.
3. **Theo dõi Sản xuất & Kiểm định Chất lượng (Production Tracking & AI/Manual QC - P4/P5)**: Thợ cắm cập nhật tiến độ (0% $\rightarrow$ 100%), tải ảnh thành phẩm. Điều phối viên thực hiện kiểm định chất lượng: đối chiếu thành phẩm với ảnh mẫu, kiểm tra bảng màu, nơ/giấy gói, nội dung thiệp in (hỗ trợ AI Score & Critique). Đơn bắt buộc phải có lượt QC `PASSED` mới được xuất xưởng.
4. **Điều vận & Giao nhận Bằng chứng (Dispatching & Proof of Delivery - P6)**: Kết nối đơn vị vận chuyển/shipper riêng, theo dõi lộ trình (Đã lấy hoa $\rightarrow$ Đang giao $\rightarrow$ Giao thành công). Bắt buộc thu thập bằng chứng giao hàng (**POD - Proof of Delivery**: ảnh người nhận hoặc chữ ký) trước khi chuyển trạng thái Đã giao.
5. **Xử lý Sự cố Vận hành (Exception Management)**: Quản lý 8 loại sự cố phát sinh (Thiếu vật liệu, Thợ trễ giờ, Giao thất bại, Khách đổi địa chỉ...). Chuyển đơn sang trạng thái `EXCEPTION`, đóng băng luồng giao hàng và mở lối quay về (`resume_stage`) khi sự cố được giải quyết.
6. **Sổ thu & Quyết toán Đối tác (Payment Ledger & Workmanship Settlement - P7)**: Quản lý 3 trục tài chính: Tổng tiền, Đã thu, Còn phải thu. Ghi nhận tiền cọc (`DEPOSIT`), thu nốt (`BALANCE`), và hoàn tiền (`REFUND`). Tính toán tiền công gia công, phụ cấp hoa cắm gấp/lễ tết và đối soát công nợ thợ.

### 1.2 Kiến trúc Clean Architecture 4 tầng

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                   Next.js App Router (Client & Server)                          │
│  UI: /dieu-phoi (Control Tower Dashboard + Brochure Orders Tab)                  │
│  API Routes: /api/v1/coordinator/orders/* + /partners/* + /exceptions/*         │
└────────────────────────────────────────┬─────────────────────────────────────────┘
                                         │ Context & Session (Tenant isolation)
                                         ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│                      Postgres Database (Transaction SSOT)                        │
│  - orders (Trục chính trạng thái đơn: PENDING/CONFIRMED/DELIVERED...)           │
│  - order_coordinations (Trục điều phối: stage, risk_level, SLA, partner_id...)  │
│  - partners (Hồ sơ thợ cắm/xưởng gia công: tier, rating, capacity_daily)        │
│  - order_qc_records (Biên bản QC thành phẩm: checklist, ảnh, ai_score)         │
│  - order_exceptions (Nhật ký sự cố mở/đóng: code, severity, resolution)        │
│  - order_payments (Sổ thu: DEPOSIT/BALANCE/REFUND, đối soát tiền mặt/chuyển khoản)│
│  - order_events (Append-only timeline: đo lường SLA và truy vết chuyển bước)   │
└──────────────────────────────────────────────────────────────────────────────────┘
```

| Tầng | Thư mục mã nguồn | Số file | Vai trò & Quy ước thiết kế | Trạng thái |
|---|---|---|---|---|
| **Domain** | [`src/modules/coordinator/domain/`](../../src/modules/coordinator/domain) | 16 file | Pure TypeScript, 0 import Prisma. Chứa ma trận chuyển bước nghiêm ngặt (`stage-transitions.ts`), ánh xạ 3 trục trạng thái (`state-mapper.ts`), công thức tính SLA (`sla-calculation.ts`), giám sát cảnh báo trễ (`sla-monitor.ts`), tính tiền công thợ (`partner-settlement.ts`), và gợi ý độ ưu tiên (`priority-suggestion.ts`). | ✅ Implemented |
| **Use-Cases** | [`src/modules/coordinator/use-cases/`](../../src/modules/coordinator/use-cases) | 13 file | Điều phối nghiệp vụ: `create-coordinator-order`, `update-coordinator-stage`, `operations` (assign, production, qc, delivery, close), `manage-exceptions`, `record-payment`, `manage-partners`, `present-coordinator-order`. | ✅ Implemented |
| **Infra** | [`src/modules/coordinator/infra/`](../../src/modules/coordinator/infra) | 2 file | `coordinator-repository.ts` và `transaction.ts`: Thực thi Prisma transactions đồng bộ 3 trục trạng thái và ghi nhận `order_events`. | ✅ Implemented |
| **Connectors** | [`src/modules/coordinator/connectors/`](../../src/modules/coordinator/connectors) | 6 file | Cầu nối liên module: Order Ingestion, Master Index snapshot, CRM notification, Creative Studio, Analytics metrics. | ✅ Implemented |
| **Contracts** | [`src/modules/coordinator/contracts/`](../../src/modules/coordinator/contracts) | 11 file | Zod schemas chuẩn hóa 7 chặng (Step 01 Intake $\rightarrow$ Step 07 Close), hỗ trợ xuất JSON Schema tự động vào `docs/dac-ta/schemas/coordinator/`. | ✅ Implemented |
| **UI Components** | [`src/components/coordinator/`](../../src/components/coordinator) + [`templates/coordinator/`](../../src/components/templates/coordinator) | 25+ file | Bảng điều khiển tháp vận hành, bộ lọc rủi ro, 7 modal nghiệp vụ chặng, thẻ tóm tắt brief, thẻ POD, thẻ QC Report, thẻ đối soát thợ. | ✅ Implemented |

---

## 2. Mô hình Dữ liệu Chi tiết (Data Model SSOT)

### 2.1 Bảng `order_coordinations` (Hồ sơ Điều phối Đơn hàng)
Bảng trung tâm điều khiển tiến trình của đơn, quan hệ 1:1 với `orders`:
- **Định danh & Tenant**: `id` (UUID), `organization_id` (Bắt buộc), `order_id` (Unique, FK $\rightarrow$ `orders`).
- **Phân công**: `partner_id` (FK $\rightarrow$ `partners`, xưởng/thợ nhận cắm), `coordinator_id` (User ID của nhân viên điều phối phụ trách).
- **Trạng thái & Rủi ro**:
  - `stage`: Enum `coordinator_stage` (11 trạng thái: `INTAKE`, `VALIDATING`, `PLANNING`, `ASSIGNING`, `IN_PRODUCTION`, `QUALITY_CHECK`, `DISPATCHING`, `DELIVERED`, `COMPLETED`, `EXCEPTION`, `CANCELLED`).
  - `risk_level`: Enum `coordination_risk_level` (`NORMAL`, `ATTENTION`, `AT_RISK`, `CRITICAL`).
  - `risk_reason`: Lý do cảnh báo rủi ro (tự động phát hiện khi sắp trễ SLA hoặc xưởng quá tải).
  - `next_action` & `next_action_due`: Hành động kế tiếp cần thực hiện và hạn chót hành động.
  - `resume_stage`: Lưu lại bước đang đứng trước khi chuyển sang `EXCEPTION` để sau khi giải quyết xong sự cố thì quay về đúng bước đó.
- **Tiến độ Sản xuất & Tài nguyên**:
  - `production_progress`: Tỷ lệ hoàn thành (0–100%).
  - `sample_asset_id`: ID ảnh mẫu hoa tiếp nhận ban đầu.
  - `finished_asset_ids`: Mảng JSON chứa ID các ảnh thành phẩm thợ gửi lên kiểm tra.
- **Vận chuyển & Bằng chứng giao hàng (POD)**:
  - `shipper_name`, `shipper_phone`, `carrier`: Thông tin tài xế/đơn vị giao hàng.
  - `delivery_state`: Trạng thái vận chuyển (`PICKED_UP`, `ON_THE_WAY`, `DELIVERED_SUCCESS`, `DELIVERY_FAILED`).
  - `pod_asset_id`: ID ảnh chụp người nhận hoa hoặc chữ ký xác nhận giao hàng.
  - `estimated_delivery_at` & `actual_delivery_at`: Mốc thời gian dự kiến và thực tế giao thành công.

### 2.2 Bảng `partners` (Mạng lưới Xưởng hoa & Thợ cắm Ngoài)
- **Định danh**: `id` (UUID), `organization_id`, `code` (Unique theo tổ chức, vd: `PAR-001`), `name`, `phone`.
- **Năng lực & Xếp hạng**:
  - `tier`: Cấp bậc đối tác (`STANDARD`, `PREFERRED`, `VIP`).
  - `rating`: Đánh giá chất lượng tay nghề (Decimal 3,2 - thang điểm 1.00 đến 5.00).
  - `capacity_daily`: Công suất nhận cắm tối đa trong ngày (mặc định 10 đơn/ngày).
  - `is_active`: Trạng thái hoạt động (true/false).
- **Khu vực hoạt động**: `address`, `district` (Quận/Huyện), `province` (Tỉnh/Thành phố).
- **Trường tự tạo (`custom_fields`)**: Lưu trữ JSON các thông tin mở rộng được cấu hình từ Console Vận hành (ĐP-3).

### 2.3 Bảng `order_qc_records` (Biên bản Kiểm định Chất lượng Thành phẩm)
- **Định danh**: `id`, `organization_id`, `order_id`, `inspector_id` (Người thực hiện QC).
- **Kết quả QC**: `status` enum (`PENDING`, `PASSED`, `REJECTED`, `REWORK_REQUESTED`).
- **AI Trợ lý Kiểm định**:
  - `ai_score`: Điểm số đối chiếu AI (0–100, chỉ ghi khi có lượt Vision thật).
  - `ai_critique`: Nhận xét chi tiết của AI về độ nở hoa, sai lệch màu sắc, form dáng so với ảnh mẫu.
- **Checklist Đánh giá**: `checklist_result` (JSON chứa kết quả kiểm tra 5 tiêu chí: Hoa đúng mẫu, Tone màu chuẩn, Giấy gói đúng mẫu, Nơ đúng mẫu, Thiệp in chính xác).
- **Hình ảnh & Ghi chú**: `image_asset_ids` (Ảnh thành phẩm đã kiểm tra), `notes` (Ghi chú thợ cần sửa lại nếu bị Reject).

### 2.4 Bảng `order_exceptions` (Nhật ký Xử lý Sự cố & Ngoại lệ)
- **Định danh**: `id`, `organization_id`, `order_id`, `code` (Mã sự cố duy nhất, vd: `EXC-ORD01-01`).
- **Phân loại**:
  - `type`: Enum 8 loại (`MISSING_INFORMATION`, `PARTNER_DECLINE`, `PARTNER_DELAY`, `MATERIAL_SHORTAGE`, `QC_FAILURE`, `DELIVERY_FAILURE`, `CUSTOMER_CHANGE`, `COMMERCIAL_ISSUE`).
  - `severity`: Mức độ nghiêm trọng (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`).
- **Nội dung & Khắc phục**: `description`, `resolution` (Phương án xử lý đã thống nhất).
- **Vòng đời sự cố**: `status` (`OPEN`, `IN_PROGRESS`, `RESOLVED`, `CANCELLED`), `reported_by`, `resolved_by`, `resolved_at`.

### 2.5 Bảng `order_payments` (Sổ thu Tiền Đơn hàng - D2)
- **Định danh**: `id`, `organization_id`, `order_id`.
- **Giao dịch**: `kind` (`DEPOSIT` - Đặt cọc, `BALANCE` - Thu nốt khi giao, `REFUND` - Hoàn tiền).
- **Chi tiết**: `amount` (VND), `payment_method` (TIEN_MAT, CHUYEN_KHOAN_VIETQR, THE, VÍ), `reference` (Mã giao dịch ngân hàng), `evidence_asset_id` (Ảnh chụp bill chuyển khoản), `note`.
- **Đối soát 3 trục tài chính**:
  - Tổng giá trị đơn: `orders.total_amount`
  - Đã thu: $\sum(\text{DEPOSIT} + \text{BALANCE}) - \sum(\text{REFUND})$
  - Còn phải thu: $\text{Tổng} - \text{Đã thu}$

---

## 3. Bản đồ Năng lực Phân quyền (RBAC & Capabilities)

Nghiệp vụ Điều phối được kiểm soát chặt chẽ bởi nhóm mã năng lực `R` (Order Operations):

| Mã năng lực | Tên kỹ thuật | Nhãn hiển thị | Vai trò mặc định | Trần cứng (Hard Cap) | Thao tác API gác cổng |
|---|---|---|---|---|---|
| **`R1`** | `order.read` | Xem thông tin đơn hàng & điều phối | Điều hành, Điều phối, Sale, CRM, CS | Không | `GET /api/v1/coordinator/orders`, `GET .../orders/:id`, `GET .../partners` |
| **`R2`** | `order.create` | Tạo đơn hàng mới | Điều hành, Điều phối, Sale | Không | `POST /api/v1/coordinator/orders` (Tạo đơn intake) |
| **`R3`** | `order.update` | Sửa đơn và cập nhật tiến trình điều phối | Điều hành, Điều phối | Không | `PATCH .../stage`, `POST .../production`, `POST .../qc`, `POST .../exceptions`, `PATCH .../custom-fields` |
| **`R4`** | `order.assign` | Phân công thợ cắm/đối tác cho đơn | Điều hành, Điều phối | Không | `POST .../assign-partner`, `POST .../partners`, `PATCH .../partners/:id` |
| **`R5`** | `delivery.manage` | Theo dõi và cập nhật vận chuyển, nạp POD | Điều hành, Điều phối | Không | `POST .../delivery` |
| **`R6`** | `order.cancel` | Hủy một đơn hàng | Điều hành | **Chỉ Điều hành (`dieu_hanh`)** | `POST /api/v1/coordinator/orders/:id/cancel` |
| **`R7`** | `order.print` | In phiếu giao hàng & phiếu kỹ thuật xưởng | Điều hành, Điều phối | Không | Xuất và in PDF phiếu xưởng T07, phiếu giao T19 |
| **`R8`** | `order.card_message.manage` | Quản lý lời nhắn thiệp chúc mừng | Điều hành, Điều phối, Sale, CS | Không | Cập nhật nội dung thiệp in |
| **`R9`** | `order.payment.record` | Ghi nhận thu tiền đơn hàng (Cọc/Thu nốt) | Điều hành, Điều phối, Sale | Không | `POST .../payments` (với kind = DEPOSIT hoặc BALANCE) |
| **`R10`** | `order.payment.refund` | Ghi nhận hoàn tiền đơn hàng | Điều hành | **Chỉ Điều hành (`dieu_hanh`)** | `POST .../payments` (với kind = REFUND) |

---

## 4. Vòng đời Điều phối 7 Chặng & Các Cổng Kiểm soát (Gating Rules)

Ma trận chuyển bước tại [`stage-transitions.ts`](../../src/modules/coordinator/domain/stage-transitions.ts) quy định: **Server là nơi duy nhất quyết định chuyển bước** (ngăn chặn hoàn toàn việc client tự ý nhảy cóc trạng thái):

```
[INTAKE] ──► [VALIDATING] ──► [PLANNING] ──► [ASSIGNING] ──► [IN_PRODUCTION]
                                                                    │
[COMPLETED] ◄── [DELIVERED] ◄── [DISPATCHING] ◄── [QUALITY_CHECK] ◄─┘
      ▲                                                  │
      │                  (QC REJECTED)                   ▼
      └────────────────────────────────────────── [Làm lại xưởng]
```

### Các Cổng Kiểm Soát Bằng Chứng (Hard Verification Gates):
1. **Cổng Gán Xưởng (`ASSIGNING` $\rightarrow$ `IN_PRODUCTION`)**:
   - **Bắt buộc**: Phải có đối tác được phân công (`facts.partnerAssigned = true`). Không thể bắt đầu cắm hoa khi chưa có người nhận đơn.
2. **Cổng Chất lượng (`QUALITY_CHECK` $\rightarrow$ `DISPATCHING`)**:
   - **Bắt buộc**: Lượt QC gần nhất bắt buộc phải đạt (`facts.latestQcStatus === "PASSED"`).
   - Nếu QC bị `REJECTED` hoặc `REWORK_REQUESTED`: Đơn bị đẩy ngược về bước `IN_PRODUCTION` để thợ cắm chỉnh sửa, không được phép điều xe giao hàng.
3. **Cổng Bằng chứng Giao hàng (`DISPATCHING` $\rightarrow$ `DELIVERED`)**:
   - **Bắt buộc**: Phải nạp bằng chứng giao hàng POD (`facts.podCaptured = true`), bao gồm ảnh chụp người nhận hoa cầm sản phẩm hoặc tên người ký nhận.
4. **Cổng Đóng đơn Hoàn tất (`DELIVERED` $\rightarrow$ `COMPLETED`)**:
   - **Bắt buộc**: Không còn bất kỳ sự cố nào đang mở (`facts.openExceptionCount === 0`).
5. **Cổng Khắc phục Sự cố (`EXCEPTION` $\rightarrow$ `resumeStage`)**:
   - Khi có sự cố (thiếu hoa, hỏng xe), đơn chuyển sang `EXCEPTION` và lưu lại bước hiện tại vào `resume_stage`.
   - Để thoát khỏi `EXCEPTION`, toàn bộ sự cố liên quan phải được đánh dấu `RESOLVED`, và đơn **chỉ được phép quay về đúng `resume_stage`** đã lưu trước đó.

---

## 5. Các Động cơ Nghiệp vụ Tính toán Thông minh (Domain Engines)

### 5.1 Động cơ Giám sát Cam kết Thời gian Giao hàng (SLA Monitor Engine)
Nằm tại [`sla-calculation.ts`](../../src/modules/coordinator/domain/sla-calculation.ts) và [`sla-monitor.ts`](../../src/modules/coordinator/domain/sla-monitor.ts):
- **Tính toán Hạn giao hàng mục tiêu (`deliveryTargetAt`)**:
  - Dựa trên hành vi của cấp độ dịch vụ (`serviceLevel`) từ bảng danh mục nền tảng:
    - `OFFSET`: Giao hỏa tốc (cộng thêm $X$ phút kể từ lúc chốt đơn, mặc định 120 phút).
    - `EXACT`: Giao đúng giờ hẹn chính xác do khách yêu cầu.
    - `WINDOW`: Giao trong khung giờ (lấy mốc kết thúc của khung giờ giao, vd: 14h00–16h00 $\rightarrow$ mốc là 16h00).
    - `END_OF_DAY`: Giao trước giờ đóng cửa shop (mặc định 21h00).
- **Phân loại Rủi ro Thời gian thực**:
  - `ON_TRACK`: Thời gian còn lại $> 30$ phút hoặc đơn đã hoàn thành.
  - `NEAR_BREACH`: Thời gian còn lại $\le 30$ phút (Báo động vàng).
  - `BREACHED`: Quá hạn giao hàng mục tiêu ($< 0$ phút - Báo động đỏ).
- **Tự động Đề xuất Hành động Can thiệp Khẩn cấp**:
  - Nếu `BREACHED` ở khâu `ASSIGNING`: Gợi ý *"Tái điều phối khẩn: Gán ngay cho đối tác dự phòng gần nhất"*.
  - Nếu `BREACHED` ở khâu `IN_PRODUCTION`: Gợi ý *"Cảnh báo xưởng: Đẩy nhanh hoàn thiện hoặc gọi thợ hỗ trợ cắm"*.
  - Nếu `NEAR_BREACH` ở khâu `DISPATCHING`: Gợi ý *"Kiểm tra định vị shipper trên tuyến đường giao"*.

### 5.2 Động cơ Quyết toán Công nợ & Tiền công Thợ (Partner Settlement Engine)
Nằm tại [`partner-settlement.ts`](../../src/modules/coordinator/domain/partner-settlement.ts):
- **Biểu phí Gia công Chuẩn theo Dáng hoa (`DEFAULT_WORKMANSHIP_RATES`)**:
  - Bó hoa tiêu chuẩn (`BO_HOA`): 50.000đ.
  - Giỏ hoa / Hộp hoa (`GIO_HOA`): 70.000đ.
  - Lẵng hoa bàn tiệc (`LANG_HOA`): 90.000đ.
  - Kệ hoa khai trương 2–3 tầng (`KE_KHAI_TRUONG`): 150.000đ.
  - Kệ hoa viếng trang nghiêm (`HOA_VIENG`): 140.000đ.
  - Hoa cầm tay cô dâu / Xe hoa (`HOA_CUOI`): 180.000đ.
- **Hệ số Phụ cấp Tự động**:
  - Phụ cấp đơn hỏa tốc (`rushHourMultiplier`): $1.2 \times$ đến $1.3 \times$ tiền công.
  - Phụ cấp cao điểm Lễ Tết (`peakHolidayMultiplier`): $1.3 \times$ đến $1.4 \times$ tiền công (8/3, 20/10, Valentine).
- **Công thức Quyết toán Thực nhận (`netPayableVnd`)**:
  $$\text{Thực nhận} = \text{Tiền công cơ bản} + \text{Phụ cấp hỏa tốc} + \text{Phụ cấp Lễ} + \text{Phụ cấp vật tư phát sinh} + \text{Thưởng} - \text{Phạt vi phạm}$$

### 5.3 Động cơ So lệch BOM & Bảo vệ Định mức (Snapshot & Override Engine)
Nằm tại [`order-overrides.ts`](../../src/modules/coordinator/domain/order-overrides.ts):
- Khi tiếp nhận đơn chọn sản phẩm từ Product Master: Hệ thống chụp lại nguyên bản định mức hoa (`order.product.bom`).
- Nếu Sales hoặc Điều phối thay đổi loại hoa (ví dụ đổi hoa hồng ngoại thành hoa hồng nội địa), hàm `diffAgainstSnapshot` tự động phát hiện sai lệch và ghi nhận vào `order_items[0].metadata.overrides[]` để thợ hoa và kế toán đối soát giá vốn chính xác.

---

## 6. Danh mục API Endpoints Điều phối Hoàn chỉnh

Toàn bộ 15 API routes thuộc tiền tố `/api/v1/coordinator/`:

| Method | Endpoint | Quyền (RBAC) | Tham số / Body | Kết quả trả về | Mô tả & Trạng thái |
|---|---|---|---|---|---|
| `GET` | `/orders` | `R1` | Query: `limit`, `cursor`, `stage`, `search` | 200 OK: `{ orders: CoordinationOrder[] }` | Danh sách đơn hàng trên Tháp Điều phối Control Tower. ✅ |
| `POST` | `/orders` | `R2` | Body: `CreateOrderRequest` (khách, người nhận, địa chỉ 4 cấp, hoa, giá, mốc giao, custom fields) | 201 Created: `{ order: CoordinationOrder }` | Tiếp nhận đơn mới, chụp snapshot Master Index. ✅ |
| `GET` | `/orders/:id` | `R1` | Param: `id` | 200 OK: `{ order: CoordinationOrder }` | Lấy chi tiết hồ sơ điều phối của đơn. ✅ |
| `PATCH` | `/orders/:id/stage` | `R3` | Body: `{ stage: CoordinatorStage, nextAction?: string }` | 200 OK: `{ order: CoordinationOrder }` | Chuyển bước tiến trình (kiểm tra chặt chẽ Stage Transition Rules). ✅ |
| `POST` | `/orders/:id/assign-partner` | `R4` | Body: `{ partnerId: string, notes?: string, overrideCapacity?: boolean }` | 200 OK: `{ order: CoordinationOrder }` | Phân công thợ cắm/xưởng ngoài phụ trách đơn. ✅ |
| `POST` | `/orders/:id/production` | `R3` | Body: `{ action: "UPDATE_PROGRESS" \| "MARK_READY", progressPercent: number, finishedAssetIds?: string[] }` | 200 OK: `{ order: CoordinationOrder }` | Cập nhật tiến độ cắm hoa và tải ảnh thành phẩm. ✅ |
| `POST` | `/orders/:id/qc` | `R3` | Body: `{ decision: "PASSED" \| "REJECTED" \| "REWORK_REQUESTED", notes?: string, checklist?: Record<string, boolean> }` | 200 OK: `{ order: CoordinationOrder }` | Thực hiện kiểm định chất lượng thành phẩm. ✅ |
| `POST` | `/orders/:id/delivery` | `R5` | Body: `{ event: "PICKED_UP" \| "DELIVERED_SUCCESS"..., shipperName: string, podAssetId?: string }` | 200 OK: `{ order: CoordinationOrder }` | Cập nhật vận chuyển và nạp ảnh bằng chứng POD. ✅ |
| `POST` | `/orders/:id/close` | `R3` | Body: `{ partnerRating?: number, partnerPayoutVnd?: number, notes?: string }` | 200 OK: `{ order: CoordinationOrder }` | Đóng đơn hoàn tất, ghi nhận đánh giá thợ và chi phí gia công. ✅ |
| `POST` | `/orders/:id/cancel` | `R6` (Trần cứng) | Body: `{ reason: string }` | 200 OK: `{ order: CoordinationOrder }` | Hủy đơn hàng (yêu cầu lý do bắt buộc, chỉ Điều hành). ✅ |
| `POST` | `/orders/:id/exceptions` | `R3` | Body: `{ type: string, severity: string, description: string }` | 201 Created: `{ order: CoordinationOrder }` | Mở sự cố vận hành, đưa đơn về trạng thái `EXCEPTION`. ✅ |
| `POST` | `/exceptions/:id/resolve` | `R3` | Param: `id`, Body: `{ resolution: string }` | 200 OK: `{ exception }` | Đánh dấu sự cố đã xử lý để mở đường quay về tiến trình cũ. ✅ |
| `GET` | `/orders/:id/payments` | `R1` | Param: `id` | 200 OK: `{ payments: OrderPaymentView[] }` | Lấy danh sách sổ thu (cọc, thu nốt, hoàn tiền) của đơn. ✅ |
| `POST` | `/orders/:id/payments` | `R9`/`R10` | Body: `{ kind: "DEPOSIT" \| "BALANCE" \| "REFUND", amountVnd: number... }` | 201 Created: `{ order: CoordinationOrder }` | Ghi nhận thu tiền hoặc hoàn tiền (Hoàn tiền cần `R10`). ✅ |
| `PATCH` | `/orders/:id/custom-fields`| `R3` | Body: `{ customFields: Record<string, unknown> }` | 200 OK: `{ order: CoordinationOrder }` | Cập nhật các trường tự tạo (custom fields tiền tố `cf_`). ✅ |
| `GET` | `/partners` | `R1` | Query: `active` (boolean) | 200 OK: `{ partners: PartnerView[] }` | Danh sách xưởng và thợ cắm hoa đối tác. ✅ |
| `POST` | `/partners` | `R4` | Body: `{ code, name, phone, district, province, capacityDaily }` | 201 Created: `{ partner: PartnerView }` | Thêm mới đối tác xưởng vào mạng lưới. ✅ |

---

## 7. Đánh giá Trạng thái Hiện tại (Feature Status Matrix)

| Khối chức năng | Trạng thái | Mã nguồn dẫn chứng | Đánh giá hiện trạng |
|---|---|---|---|
| **Tháp Vận hành (Control Tower UI)** | ✅ Implemented | `control-tower-dashboard.tsx:98` | Dashboard thời gian thực, lọc rủi ro, phân loại tab trạng thái, tự động refresh mỗi 60 giây. |
| **Tiếp nhận Đơn đa nguồn (Intake Modal)** | ✅ Implemented | `sales-order-intake-modal.tsx` | Nhập thông tin người nhận, địa chỉ 4 cấp, hoa, ảnh mẫu, tự động gợi ý priority/SLA. |
| **Phân công Đối tác (Partner Assignment)** | ✅ Implemented | `partner-assignment-modal.tsx` | Chọn xưởng theo danh sách, cảnh báo khi vượt công suất ngày (`capacity_daily`). |
| **Cập nhật Tiến độ & Ảnh Thành phẩm** | ✅ Implemented | `production-update-modal.tsx` | Thanh trượt tiến độ 0–100%, tải ảnh thành phẩm lên storage R2 qua `uploadCoordinatorPhoto`. |
| **Kiểm định Chất lượng Thành phẩm (QC)** | ✅ Implemented | `ai-qc-inspection-modal.tsx`, `ai-qc-report-card.tsx` | Checklist 5 tiêu chuẩn, hỗ trợ nhập ghi chú sửa lại, chặn chuyển giao nếu chưa PASSED. |
| **Điều vận & Nạp Bằng chứng Giao (POD)** | ✅ Implemented | `delivery-dispatch-modal.tsx`, `delivery-pod-card.tsx` | Ghi nhận shipper, nạp ảnh chụp người nhận hoặc chữ ký, chặn hoàn tất nếu thiếu POD. |
| **Đóng Đơn & Đánh giá Đối tác (Closure)** | ✅ Implemented | `order-closure-modal.tsx` | Đánh giá sao thợ cắm, nhập tiền công quyết toán, ghi nhận bài học kinh nghiệm. |
| **Quản lý Sự cố Vận hành (Exceptions)** | ✅ Implemented | `exception-resolution-card.tsx`, `operations.ts` | 8 loại sự cố, chặn đóng đơn khi còn sự cố mở, cơ chế lưu `resume_stage` quay về chuẩn xác. |
| **Sổ thu Tiền Đơn hàng (Payment Ledger)** | ✅ Implemented | `payment-ledger-modal.tsx`, `record-payment.ts` | Quản lý 3 trục: Tổng / Đã thu / Còn phải thu. Ghi nhận DEPOSIT, BALANCE, REFUND có bằng chứng. |
| **Tính toán & Cảnh báo Trễ SLA Tự động** | ✅ Implemented | `sla-monitor.ts`, `sla-calculation.ts` | Cảnh báo NEAR_BREACH (<30p) và BREACHED, gợi ý hành động tái điều phối thông minh. |
| **Quyết toán Tiền công Thợ (Settlement)** | ✅ Implemented | `partner-settlement.ts`, `partner-settlement-modal.tsx` | Biểu phí gia công theo dáng hoa, phụ cấp đơn gấp, phụ cấp lễ Tết. |
| **Hỗ trợ Trường Tự Tạo (Custom Fields)** | ✅ Implemented | `custom-fields-section.tsx`, `field-registry.ts` | Đọc và lưu trữ các trường dữ liệu tùy biến mở rộng có tiền tố `cf_` từ nền quản trị ĐP-3. |
| **Tự động Chấm điểm QC bằng Vision AI** | ⚠️ Partial | `order_qc_records.ai_score`, nợ #140 | Schema đã có cột `ai_score` và `ai_critique`, UI đã có giao diện hiển thị AI Report nhưng luồng gọi tự động sang Vision Worker đang chờ kích hoạt. |
| **Đồng bộ Đơn từ Kênh Chat M08 / M10** | ⚠️ Partial | `source: ORDER_M10 / CHAT_M08` | Dữ liệu nguồn đã khai báo và tiếp nhận thủ công được, luồng webhook tự động đẩy đơn từ Chat vào đang nằm ở giai đoạn ĐP-5. |
| **Cơ chế Nhập Địa chỉ Hai Phiên bản** | ⚠️ Partial | `StructuredAddress`, chờ Q-ĐC | Hiện tại bắt buộc nhập đủ 4 cấp (Phường/Xã, Quận/Huyện, Tỉnh/Thành), cơ chế tự động phân giải từ 1 chuỗi tự do đang chờ duyệt phương án Q-ĐC. |

---

## 8. Các Rủi ro Kỹ thuật, Giới hạn & Điểm cần Nâng cấp (Gap to Enterprise)

1. **Kích thước File Dashboard Vượt Chuẩn SRP (`control-tower-dashboard.tsx` dài 916 dòng)**:
   - File này hiện quản lý quá nhiều modal (7 modal con: Planning, Assign, Production, QC, Dispatch, Closure, Payment), state tìm kiếm, polling, và render chi tiết đơn.
   - *Hướng giải quyết*: Tách thành các container quản lý riêng: `OrderListTable.tsx`, `OrderDetailDrawer.tsx`, và hook điều phối tập trung `useCoordinatorDashboard.ts`.
2. **Kích hoạt Lượt Chấm Điểm AI QC Tự Động (Vision-Assisted QC)**:
   - Hiện tại biên bản QC chủ yếu do Điều phối viên tick thủ công các ô checklist. Cần kích hoạt kết nối sang Vision Worker để tự động chạy mô hình so sánh ảnh thành phẩm với ảnh mẫu (tính điểm tương đồng hoa và màu sắc) nhằm giảm tải thao tác mắt thường của nhân viên.
3. **Cơ chế Thông báo Thời gian thực Đẩy (WebSocket / Web Push thay vì Polling 60s)**:
   - Dashboard hiện tại dùng `REFRESH_MS = 60_000` (polling mỗi phút). Đối với các đơn hỏa tốc giao trong 60 phút, việc polling định kỳ có thể làm chậm trễ các cảnh báo sự cố phát sinh.
   - *Hướng giải quyết*: Bổ sung Server-Sent Events (SSE) hoặc WebSocket kênh nội bộ shop để đẩy ngay lập tức thông báo khi thợ tải ảnh thành phẩm hoặc khi đơn rơi vào trạng thái `CRITICAL SLA`.
4. **Trực quan hóa Bản đồ Lộ trình & Bán kính Đối tác (Geographical Map Dispatching)**:
   - Khâu gán đối tác hiện chọn xưởng theo danh sách văn bản và tên Quận/Huyện. Chưa có bản đồ nhiệt trực quan hiển thị vị trí của shop, vị trí của xưởng và điểm giao của khách.
   - *Hướng giải quyết*: Tích hợp bản đồ Leaflet/Mapbox hiển thị bán kính giao hàng thực tế để điều phối viên chọn xưởng gần điểm giao nhất nhằm tối ưu chi phí ship.
