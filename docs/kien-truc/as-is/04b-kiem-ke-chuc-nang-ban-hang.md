# 4b. Function Inventory — As-Is (phần B: bán hàng, vận hành, kênh, nền tảng)

Quy ước cột và mã lỗi như [phần A](04-kiem-ke-chuc-nang.md).

## 4.7 Đơn hàng M10 (MOD-17) — `src/modules/orders/`

| Chức năng | Thao tác | Input | Xử lý | Luật / Validation | Lỗi | Status |
|---|---|---|---|---|---|---|
| Tạo đơn | `/don-hang` → modal tạo đơn | `customer_id?`, `items[]` (`product_id?`, `variant_id?`, `description`, `quantity`, `unit_price_vnd`), `card_message`, `delivery_window`, `delivery_address`, `voucher_id?` | Tính `total_vnd = Σ qty × giá`; mã `DH-YYMMDD-XXXX` theo số đơn trong ngày; ghi `orders` + `order_items` | `R2`; ≥ 1 dòng; tổng ≥ 0 | 400 | Implemented |
| Cập nhật tiến độ | `/don-hang` modal chi tiết | `status?`, `production_status?`, `delivery_status?` | Kiểm từng trục theo bảng chuyển (xem [06](06-doi-tuong-va-trang-thai.md)); ghi `order_events` theo trục | `R3`; đơn `source = BROCHURE` bị chặn | 404, 409, 422 | Implemented |
| Phân công thợ | (route có, không có màn gọi) | `assignee_id`, `difficulty?` | Ghi `order_assignments` | `R4`; không cho đơn đã kết thúc; chặn đơn BROCHURE | 404, 409, 422 | Partially |
| Huỷ đơn | `/don-hang` | `reason` | Ghi `order_events`, đặt `CANCELLED`, audit | `R6` (trong use-case, trần cứng ĐH); bắt buộc lý do; không huỷ đơn `CANCELLED`/`COMPLETED`; chặn đơn BROCHURE | 400, 404, 409, 422 | Implemented |
| In phiếu | `/don-hang` | `id` | Dựng dữ liệu phiếu (dòng, thành tiền) | `R7` | 404 | Implemented |
| Lịch sử sự kiện đơn | (không có màn gọi) | `id` | Đọc `order_events` | `R1` | 404 | Partially |
| Báo cáo kinh doanh | `/so-lieu` thẻ hiệu quả | danh sách đơn (client) | `computeBusinessReport` (tổng đơn, tỉ lệ hoàn tất, doanh thu, AOV, top 5) tính ở giao diện | — | — | Implemented (kiểu `OrderReportingItem.status` có `PENDING` không có trong enum CSDL) |

## 4.8 Điều phối / Control Tower (MOD-18) — `src/modules/coordinator/`

| Chức năng | Input | Xử lý | Luật / Validation | Status |
|---|---|---|---|---|
| Tạo đơn điều phối | Khách (`customerName`, hạng), người nhận (tên, SĐT `^\+?[0-9 .-]{8,15}$`), địa chỉ 4 cấp, khung giờ giao, sản phẩm + BOM hoa (`flowerName`, `quantity`, `unit`, `color`, `role`), thiệp, `source ∈ {ORDER_M10, CHAT_M08, CATALOG_M06, MANUAL}`, `customFields` | Tạo `orders` + `order_coordinations(stage=INTAKE)`; trường tự tạo đi qua `applyCustomFields` (field-platform) | `R2`; schema `src/modules/coordinator/adapters/http-schemas.ts` | Implemented |
| Danh sách / chi tiết | `stage?`, `limit ≤ 200` | `presentCoordinatorOrders` dựng view + rủi ro + trạng thái thu tiền suy ra | `R1` | Implemented |
| Chuyển bước | `stage` | `checkStageTransition` (bảng chuyển + bằng chứng), đồng bộ 3 trục `orders`, ghi `order_events`, audit | `R3`; huỷ/sự cố phải qua endpoint riêng | Implemented |
| Phân công đối tác | `partner_id` | Gắn `partner_id`, chuyển ASSIGNING | `R4`; chỉ ở PLANNING/ASSIGNING/IN_PRODUCTION; đối tác phải `is_active` | Implemented |
| Cập nhật sản xuất | `progressPercent`, ảnh thành phẩm, `markReady` | Ghi tiến độ; `markReady` → QUALITY_CHECK | `R3`; chỉ ở IN_PRODUCTION; 0–100; báo xong phải có ≥ 1 ảnh | Implemented |
| QC | `decision ∈ {PASSED, REJECTED, REWORK_REQUESTED}`, `notes` | Ghi `order_qc_records`; PASSED → DISPATCHING, REWORK → IN_PRODUCTION | `R3`; chỉ ở QUALITY_CHECK; có ảnh; không đạt phải ghi lý do | Implemented (`ai_score`/`ai_critique` có cột, không thấy mã chấm AI) |
| Giao hàng / POD | `event`, `shipperName`, `podAssetId?`, `recipientSignedName?`, `failureReason?` | Cập nhật `delivery_state`, POD; DELIVERED_SUCCESS → DELIVERED | `R5`; chỉ ở DISPATCHING; có tên shipper; không lùi trạng thái; giao thành công cần ảnh POD hoặc tên người ký | Implemented |
| Sự cố | mở: `type`, `severity`, `description`; xử lý: `resolution` | Mở → stage `EXCEPTION`, lưu `resume_stage`; mã sự cố theo mã đơn | `R3` | Implemented |
| Đóng đơn | `partnerRating 1–5?`, `partnerPayoutVnd ≥ 0?`, ghi chú | → COMPLETED | `R3`; chỉ từ DELIVERED; không còn sự cố mở | Implemented |
| Huỷ đơn điều phối | `reason` | → CANCELLED (chỉ trục đơn) | `R6`; không huỷ COMPLETED/CANCELLED/DELIVERED; bắt buộc lý do | Implemented |
| Sổ thu | `kind ∈ {DEPOSIT, BALANCE, REFUND}`, `amountVnd`, `paymentMethod?`, `reference?`, `evidenceAssetId?` | Một dòng `order_payments`; cập nhật `paid_vnd`/`balance_vnd` cùng giao dịch | Đọc `R1`; ghi `R9`; `REFUND` cần `R10`; không hoàn quá số đã thu | Implemented |
| Đối tác | `code`, `name`, `phone`, địa chỉ, `tier`, `capacity_daily`, `custom_fields` | CRUD `partners` | Đọc `R1`, ghi `R4` | Implemented |
| Trường tùy chỉnh đơn | `customFields` | Ghi `order_coordinations.custom_fields` qua kiểm của field-platform | `R3` | Implemented |
| Đối soát tiền công đối tác | Mở từ modal quản lý đối tác | `PartnerSettlementModal` dùng `calculateNetworkMargin`, `generateSettlementCsv`; danh sách dòng lấy từ hằng `SAMPLE_SETTLEMENT_ITEMS` vì nơi gọi không truyền `initialPeriod` (`src/components/coordinator/partner-settlement-modal.tsx:23,88`, `partner-management-modal.tsx:242`); `calculatePartnerWorkmanship`, `aggregatePartnerSettlementPeriod` chỉ test dùng | — | Partially Implemented (dữ liệu mẫu) |
| Theo dõi SLA | — | `sla-monitor.ts` dùng ở `sla-monitor-panel.tsx`, `sla-monitor-modal.tsx` (tính ở giao diện) | — | Implemented |
| Yêu cầu bổ sung thông tin / yêu cầu đổi đơn | — | Bảng `order_info_requests`, `order_change_requests` | — | Referenced but not implemented (chỉ có lược đồ) |

## 4.9 Thẻ chào (MOD-19) — `src/modules/greeting-card/`

Phạm vi xem của sale: `assertOrderInScope` / `resolveSaleScope` theo cài đặt `sale-visibility` (sale chỉ thấy đơn/phiên của mình khi bật).

| Chức năng | Ai | Input | Xử lý | Luật / Validation | Status |
|---|---|---|---|---|---|
| Bộ sưu tập (catalog) | Nhân viên | `code`, `name`, `type ∈ {STANDARD, CLIENT}`, `filters`, sản phẩm | CRUD `greeting_catalogs` + `greeting_catalog_products`; ảnh ghép (collage), lượt "tim" | Đọc `L1`, ghi `R2` | Implemented |
| Link gửi khách | Sale | `catalog_id`, tên/SĐT khách | Tạo `greeting_sessions(status=CREATED)` mang `send_code`; đánh dấu đã sao chép; thu hồi | `R2`; không thu hồi link đã có đơn | Implemented |
| Link chia sẻ theo người sao chép | Sale | `catalog_id`, `channel` | `greeting_share_links`; `/s/[code]/mo` tạo phiên riêng cho mỗi trình duyệt + cookie chủ phiên, rate limit 30/10 phút | `R2` tạo, `R1` đọc | Implemented |
| Trang khách `/b/[sendCode]` | Khách | — | Nhận chủ phiên (`claim`), `open`, ghi sự kiện quẹt (`event`), chọn mẫu (`select`) | Link hết hạn/thu hồi → màn "không khả dụng"; đã có đơn thì không đổi mẫu | Implemented |
| Báo giá & đặt hàng (khách) | Khách | tên, SĐT VN `^(0|\+84)[35789][0-9]{8}$`, địa chỉ, ngày/khung giờ giao, thiệp, ghi chú, mã giảm giá, size/khu vực | Tính lại giá từ Product Master; giới hạn số đơn theo SĐT; tìm/tạo `customers`; tạo `orders(source=BROCHURE)`; dùng voucher (đặt `is_used`); idempotent theo phiên; xếp tin báo khách | Giới hạn độ dài trường; ngày giao không quá khứ, ≤ 365 ngày; giờ chốt đơn của tiệm; phải chọn mẫu trước | Implemented |
| Đặt hàng từ bộ sưu tập công khai `/g/[id]`, `/bst/...` | Khách | như trên + chọn mẫu | `submit-public-catalog-order.ts`, ghi `greeting_catalog_events` | Như trên | Implemented |
| Thanh toán | Khách / hệ thống / Điều hành | — | Trang khách hiện VietQR theo tài khoản trong `organizations.settings.brochure_payment`; khách báo đã chuyển (`payment-notify` → phiên `PAYMENT_REPORTED`); webhook SePay đối soát theo mã đơn trong nội dung (idempotent theo `external_id`, không khớp → giữ lại cho Điều hành xử lý); Điều hành xác nhận tay (`R9`) | Số tiền mặc định = khoản kỳ vọng theo chính sách cọc | Implemented |
| Chính sách thu tiền | Điều hành | `deposit_percent 0–99`, `require_paid_before_production`, `require_full_before_dispatch`, `hold_minutes 5–1440`, `auto_cancel_unpaid` | Lưu `organizations.settings.brochure_policy`; chặn tác vụ xưởng khi chưa đủ tiền | `F2` | Implemented |
| Báo giá cho mẫu chưa có giá | Điều hành/sale | `totalVnd`, `reason?` | Đặt tổng tiền cho đơn tổng 0, báo khách | `R9` | Implemented |
| Huỷ / hoàn tiền | Điều hành | `reason` / `amountVnd`, `reason` | Huỷ trả lại voucher, báo khách; hoàn ghi dòng REFUND | Huỷ `R6`; hoàn `R10` | Implemented |
| Yêu cầu giảm giá | Sale → Điều hành | `reason ≥ 3 ký tự`, mức giảm / quyết định | Tin nhắn nội bộ loại yêu cầu; duyệt/từ chối (từ chối cần lý do) | Gửi `R2`, quyết `F2`; một yêu cầu chờ/đơn; không cho đơn đã huỷ | Implemented |
| Tác vụ xưởng | Điều phối | ghi chú florist / 1–5 ảnh + 0–2 video | 4 bước tuần tự: phân công florist → ảnh thành phẩm → giao ship → ảnh người nhận | `R4` / `R3` / `R5` / `R5`; thứ tự theo `coordinatorActionBlocker`; cổng tiền theo chính sách | Implemented |
| Theo dõi, timeline, pipeline, thống kê, hộp việc | Nhân viên | bộ lọc | Đọc tổng hợp từ `orders`, `greeting_*` | `R1` | Implemented |
| Tra cứu đơn (khách) | Khách | mã đơn + 4 số cuối SĐT | Ẩn tên/địa chỉ chi tiết (`tracking-privacy.ts`) | Rate limit | Implemented |
| Đặt lại đơn mới từ link cũ | Khách | — | `start-another-order` | Link phải đã có đơn | Implemented |
| Tin nhắn nội bộ | Nhân viên | `body`, người/vai nhận | `greeting_messages`, đánh dấu đã đọc | `R1` / `R2` | Implemented |
| Thông báo khách | Hệ thống | mốc `ORDER_RECEIVED`, `QUOTED`, `PAYMENT_REMINDER`, `DEPOSIT_RECEIVED`, `PAYMENT_COMPLETED`, `READY`, `DISPATCHED`, `DELIVERED`, `CANCELLED` | Zalo ZNS hoặc eSMS (cấu hình mã hoá trong `greeting_integrations.notify_config_encrypted`); chống trùng theo `(order, event_key)`; gửi thử | Cấu hình `F2` | Implemented (gửi thật NOT VERIFIED) |
| Bộ quét nền | Hệ thống | — | Mỗi 60 s: đánh lỗi tin kẹt >5 phút, gửi lại tin lỗi (cách 30 phút, trong 6 giờ), nhắc khách hết hạn giữ đơn, tự huỷ khi tiệm bật | Tắt bằng `GREETING_CARD_SWEEP=off` hoặc `GREETING_CARD_ENABLED=false` | Implemented |

## 4.10 CRM (MOD-20) — `src/modules/crm/`

| Chức năng | Input | Xử lý | Luật | Status |
|---|---|---|---|---|
| Tạo khách | `name`, `phone`, `email?`, `address?`, `tags`, sở thích hoa/màu | Chuẩn hoá SĐT, mã khách | `Q2`; tên bắt buộc; SĐT VN hợp lệ; SĐT duy nhất/tổ chức | Implemented |
| Danh sách / chi tiết / sửa | `tier?`, `search` | Tìm theo tên/SĐT/mã | `Q1` / `Q3` | Implemented |
| Xoá khách | `id` | `prisma.customers.delete` (xoá cứng; dịp và consent xoá theo cascade) | `Q4` (trần cứng ĐH) | Implemented |
| Phân tầng | — | `deriveCustomerTier` theo ngưỡng ngành (`customerTiers` của plugin ngành; mặc định = ngành hoa: VIP ≥ 10 tr hoặc ≥ 10 đơn; GOLD ≥ 5 tr/5 đơn; SILVER ≥ 2 tr/3 đơn; BRONZE ≥ 500 k/1 đơn). Chi tiêu = tiền đã thu; bộ quét nền `customer-metrics-sweep.ts` tính lại khi đơn đổi, GET không ghi (PO 07/11/2026, Q6) | — | Implemented |
| Dịp kỷ niệm | `name`, `date`, `is_recurring`, `reminder_days_before`, người nhận | Ghi `customer_occasions` | `Q6` | Implemented |
| Nhắc sắp tới | — | Quét tối đa 200 khách, dịp trong 14 ngày tới | `Q7` | Implemented |
| Đồng ý nhận tin | `channel ∈ {ZALO_ZNS, SMS, PHONE_CALL, PROMOTION}`, `granted` | Upsert `customer_consents` | `Q9` | Implemented |
| Voucher | — | Chỉ đọc/tiêu thụ trong Thẻ chào; không có API tạo | `Q8` không được kiểm | Referenced but not implemented (tạo) |
| Xuất danh sách khách | — | — | `Q5` không được kiểm | Referenced but not implemented |

## 4.11 Hội thoại AI (MOD-21) — `src/modules/chat-assistant/`

| Chức năng | Input | Xử lý | Luật | Status |
|---|---|---|---|---|
| Tạo/xem hội thoại | `customer_id?`, `title?` | `chat_conversations`, `chat_messages` | `T1` đọc, `T2` tạo/gửi | Implemented |
| Gửi tin & AI trả lời | `query` | Lưu tin USER → nạp 30 sản phẩm Product Master + hồ sơ khách → `DifyChatProvider.send`: nhận diện ý định (`SAAS_HELP` → tri thức tĩnh; `FLOWER_SALES` → Dify → OpenAI → Ollama Qwen → câu trả lời cục bộ theo luật) → lưu tin ASSISTANT kèm gợi ý mẫu | `T2`; nội dung không rỗng | Implemented (không đi qua `callCapability`) |
| Tạo đơn nháp từ hội thoại | hội thoại, mẫu chọn | Gọi `createOrder` của M10 | `T3` | Implemented |
| Cấu hình kênh | `channel`, `isEnabled`, `config` (FB page/token, Zalo OA/app/secret/token, origin nhúng) | Upsert `chat_channel_integrations` | GET: chỉ cần phiên; POST: `T4` | Implemented |
| Tin từ Facebook/Zalo | webhook | Tìm tổ chức theo page/OA id → `handleIncomingChannelMessage` → trừ credit `chat.message.ai_reply` (ghi `usage` trực tiếp, không qua `enqueueJob`) → trả lời qua API nền tảng | GET Facebook kiểm `hub.verify_token`; POST không kiểm chữ ký | Implemented (gọi thật NOT VERIFIED) |
| Widget công khai | slug + tin | Tổ chức suy từ slug | Không phiên | Implemented (component `public-storefront-chat-widget.tsx` không được import) |

## 4.12 Nghiên cứu thị trường (MOD-22), Integration (MOD-24), Nền tảng (MOD-26/27)

| Chức năng | Input | Xử lý | Luật | Status |
|---|---|---|---|---|
| Kích hoạt lượt nghiên cứu | `run_type` (mặc định `MANUAL`) | Ghi `research_runs(PENDING)` + `NOTIFY market_intelligence_research`; pg_cron (Docker local) chèn lượt DAILY_DEEP 23:00, INTRADAY_PULSE mỗi 3 giờ, WEEKLY_DEEP CN 22:00 | `V1` | Implemented |
| Worker nghiên cứu | — | LISTEN + quét định kỳ; chuỗi Google Trends → SerpApi → cache dự phòng; YouTube/TikTok; ghi `market_sources`, `trend_signals`, `topics`, `topic_scores`, `content_opportunities` | — | Implemented (không có trong `render.yaml`) |
| Cơ hội nội dung | — | Cá nhân hoá theo giá sản phẩm, hạng khách, hồ sơ thương hiệu | `V2` | Implemented |
| Phân tích sản phẩm theo xu hướng / trích xuất thị giác | ảnh/asset | `product_analysis_runs`; job `product.vision_extract` + cổng AI | `V1`; đọc `V2` | Implemented |
| Token tích hợp | `client` | Cấp (trả token rõ 1 lần), xoay (giữ token cũ đến khi thu hồi), thu hồi | `F9` (trần cứng ĐH) | Implemented (không có màn gọi) |
| API cho app ngoài | — | Đọc hồ sơ/sản phẩm/ảnh master (URL ký ngắn hạn), đăng ký asset dẫn xuất (cha phải `APPROVED`), tạo job, ghi usage, ghi `content_metrics` (idempotent 4 cột), kiểm năng lực | Token hoặc SSO | Implemented phía core |
| Console nền tảng | — | Tổ chức (N1), mức dùng (N4), sức khoẻ chỉ đọc (N5), nhật ký (N6) | Platform context | Implemented |
| Quản trị trường dữ liệu | trường, danh mục, giá trị, ghi đè theo tổ chức | Tạo trường tự tạo (giới hạn an toàn), tắt (không xoá; trường lõi REQUIRED không tắt), danh mục CÓ HÀNH VI phải dùng mã trong `behaviors.ts`, xem trước cấu hình hiệu lực | `N12` | Implemented |
