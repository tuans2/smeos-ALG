# 6–7. Business Objects, Status & State Model — As-Is

Nguồn: `prisma/schema.prisma` (cấu trúc) + use-case/worker (hành vi ghi). Danh sách trường đầy đủ của 90 bảng ở [10-csdl-va-luong-du-lieu.md](10-csdl-va-luong-du-lieu.md); ở đây chỉ nêu trường mang nghĩa nghiệp vụ.

## 6.1 Đối tượng nghiệp vụ

| Đối tượng | Bảng | Trường chính | Quan hệ | Trạng thái | CRUD có mã | Luật nổi bật |
|---|---|---|---|---|---|---|
| Người dùng | `users` | `email` (duy nhất), `password_hash` (nullable), `locale` | n `memberships`, n `sessions`, 0..1 `platform_operators` | — | C (signup/invite/script), R | Bảng duy nhất không có `organization_id` |
| Phiên | `sessions` | `token_hash` (HMAC), `organization_id?`, `expires_at`, `revoked_at` | → `users` | sống / hết hạn / thu hồi | C, R, U(revoke) | 30 ngày; một phiên sống/tài khoản |
| Tổ chức | `organizations` | `name`, `slug` (duy nhất), `type`, `credit_balance`, `credit_plan`, `settings` (JSON công tắc, chính sách Thẻ chào, bộ máy vision…), `data_region` | gốc của mọi bảng tenant | `organization_type` | C (signup, script AVI GIFT), R, U | `settings` hợp nhất nông khi PATCH |
| Workspace | `workspaces` | `kind`, `trial_count`, `trial_limit`, `trial_status` | → `organizations` | `workspace_kind`, `trial_status` | C, R | Lượt trial tăng có điều kiện `trial_count < trial_limit` (SQL thô) |
| Chi nhánh | `branches` | `code` (duy nhất/tổ chức), `name`, `address`, `is_active` | → tổ chức; n `product_inventory` | `is_active` | C, R, U | Không xoá cứng |
| Vai & quyền | `roles`, `role_capabilities`, `capability_overrides` | `key`, `is_system`; `capability_code`, `scope`; `allowed` | vai hệ thống `organization_id = null` | — | C, R, U | Xem [02](02-vai-tro-va-quyen.md) |
| Thành viên | `memberships` | `role_id`, `branch_id?`, `status`, `joined_at` | → user, tổ chức | `membership_status` | C, R, U(role), D | Duy nhất `(organization_id, user_id)` |
| Hồ sơ kinh doanh / thương hiệu | `business_profiles`, `brand_profiles` | liên hệ, giờ mở cửa; màu, font, giọng điệu, ưu đãi | 1–1 tổ chức | — | C/U (PUT), R | Thay toàn bộ |
| Sản phẩm (Product Master) | `products` | `code` (duy nhất/tổ chức), `name`, `category`, `shape`, `facing`, `container`, `status`, `attributes` (JSON: giá, BOM, dữ liệu bán hàng, `trashed_at`…) | n `product_variants`, `product_images`, `product_analyses`, `product_inventory` | `product_status` | C, R, U, "xoá" = ARCHIVED | `ARCHIVED` cần `L4`; danh sách ẩn ARCHIVED |
| Biến thể / ảnh / tồn kho sản phẩm | `product_variants`, `product_images`, `product_inventory` | size, hệ số; vai ảnh, vị trí; trạng thái kho theo chi nhánh | → `products` | `stock_status` | `product_images` upsert ở repo sản phẩm; `product_variants` chỉ seed dev; `product_inventory` chỉ đụng trong thùng rác | Phần lớn chưa có đường ghi nghiệp vụ |
| Asset | `assets` | `kind`, `state`, `version`, `storage_key`, `parent_asset_id`, `approval_state`, `generated_flags`, các điểm chất lượng/nhận dạng, `cost_usd` | → tổ chức, `product_id?` | `asset_kind`, `asset_state`, `approval_state` | C, R, D, U(duyệt, thùng rác) | Gốc bất biến; dẫn xuất là bản ghi mới |
| Job | `generation_jobs`, `job_events` | `feature`, `status`, `stage`, `result`, `idempotency_key`, `job_group_id`, `payload`, `output`, `attempts` | → tổ chức; n sự kiện (`seq`) | `job_status` + `stage` + `result` (3 trục) | C (enqueue), R, U (worker, huỷ, retry) | Duy nhất `(organization_id, feature, idempotency_key)` |
| Mức dùng | `usage` | `feature`, `quantity`, `cost_credit` (âm khi hoàn một phần), `cost_usd`, `status` | → tổ chức, `job_id?` | `status` chuỗi (`ENQUEUED`, `REFUNDED`, `PARTIAL_REFUND`, `COMPLETED`…) | C, R | Ghi cùng giao dịch với trừ credit |
| Phân tích ảnh | `product_analyses` | `raw`, `edited`, `contract_name/version`, `provider/model` | → asset, job, `product_id?` | `approval_state` | C (worker), R, U | `raw` không bao giờ sửa |
| Dữ liệu bán hàng | `product_copies` | `raw`, `edited`, `reject_reason`, chi phí/mô hình | 1–1 `analysis_id` | `approval_state` | C, R, U | Sửa chỉ khi `PENDING` |
| Quy tắc giá | `pricing_rules` | `key`, `value`, `branch_id?`, `effective_from` | → tổ chức | — | C (chèn), R | Không sửa dòng cũ |
| Đơn hàng | `orders`, `order_items`, `order_assignments`, `order_events`, `order_recipients` | `code`, 3 trục trạng thái, `total_vnd`, `paid_vnd`, `balance_vnd`, `card_message`, `delivery_window` (JSON), `delivery_address` (JSON, chỉ khoá vận hành từ 07/11/2026), `vat_enabled`/`vat_rate` (8 hoặc 10)/`vat_amount_vnd`; người nhận, địa chỉ và ô xuất hoá đơn (`vat_company_name`/`vat_tax_code`/`vat_company_address`/`vat_email`) ở `order_recipients` (ADR-014 P-3; `PUT /api/v1/greeting-card/orders/[id]/vat`), `source`, `source_session_id` | → khách; 0..1 `order_coordinations`; n thanh toán/QC/sự cố | `order_status`, `production_status`, `delivery_status` | C, R, U | Mã duy nhất/tổ chức; SLA đo từ `order_events` |
| Điều phối đơn | `order_coordinations` | `stage`, `risk_level`, `resume_stage`, `partner_id`, tiến độ, ảnh thành phẩm, POD, shipper, khung giờ, `custom_fields` (~50 cột vận hành) | 1–1 `orders` (`order_id` duy nhất) | `coordinator_stage`, `coordination_risk_level` | C, R, U | Xem 7.6 |
| Đối tác xưởng | `partners` | `code`, `tier`, `rating`, `capacity_daily`, `is_active`, `custom_fields` | n điều phối | `is_active` | C, R, U | — |
| QC / sự cố / thu tiền | `order_qc_records`, `order_exceptions`, `order_payments` | quyết định QC; mã/loại/mức sự cố; `kind`, `amount_vnd`, bằng chứng | → `orders` | `qc_record_status`; sự cố `OPEN/RESOLVED`; `order_payment_kind` | C, R, U | Một dòng mỗi lần thu/hoàn |
| Khách hàng | `customers`, `customer_occasions`, `customer_consents`, `vouchers` | `code`, `phone` (duy nhất/tổ chức), `tier`, `total_spent`, `order_count`; dịp; kênh đồng ý; mã giảm giá | n đơn, n hội thoại | `customer_tier`, `consent_channel` | Khách: C,R,U,D(cứng); dịp: C; consent: U; voucher: R,U(tiêu thụ) | Tầng tự tính từ chi tiêu/số đơn |
| Hội thoại | `chat_conversations`, `chat_messages`, `chat_channel_integrations` | kênh, trạng thái; `sender_type`; cấu hình kênh (JSON) | → khách? | `chat_channel`, `chat_sender_type` | C, R | — |
| Thẻ chào | `greeting_catalogs`, `greeting_catalog_products`, `greeting_sessions`, `greeting_share_links`, `greeting_integrations`, `greeting_payment_events`, `greeting_notifications`, `greeting_messages`, `greeting_message_reads`, `greeting_catalog_events`, `greeting_journey_events` | `send_code`, `sale_id`, `status`, `product_snapshot`, `order_id`; khoá webhook (hash); sự kiện ngân hàng; tin báo khách; tin nội bộ | phiên → catalog, → đơn | chuỗi (xem 7.8) | C, R, U | Idempotent theo `external_id`, theo `(order, event_key)` |
| Catalog link | `catalog_links` | `slug` (duy nhất), `filters` (JSON, chứa cả `leads`), `is_revoked` | → tổ chức | `is_revoked` | C, R, U | — |
| Nội dung / Creative | `content_generations`, `content_drafts`, `campaign_packages`, `video_jobs`, `video_scenes`, `voice_clones`, `music_tracks` | brief, bài, điểm; gói chiến dịch; video + cảnh; mẫu giọng + cam kết; nhạc + giấy phép | → tổ chức | chuỗi / enum (xem 7) | C, R, U, xoá mềm (giọng, nhạc) | — |
| Quản trị AI | `ai_capabilities`, `ai_models`, `ai_policies`, `ai_requests`, `ai_evaluations` | ngưỡng, sàn riêng tư, giấy phép mô hình; trần theo tổ chức; sổ lời gọi; điểm chấm | `ai_policies` → `ai_capabilities` | `ai_mode`, `ai_privacy_level`, `ai_measure_state` | Seed + C/R | Sổ năng lực/mô hình là dữ liệu nền tảng (không tenant) |
| Thị trường | `market_sources`, `trend_signals`, `trend_timeseries`, `topics`, `topic_signals`, `topic_scores`, `content_opportunities`, `research_runs`, `provider_health`, `product_analysis_runs` | tín hiệu, chủ đề, điểm, cơ hội | `content_opportunities` mang `organization_id`; còn lại dùng chung | enum MI | C, R | — |
| Trường dữ liệu | `field_definitions`, `field_catalogs`, `field_catalog_values`, `field_config_overrides` | khoá, mức yêu cầu, độ nhạy, danh mục, ghi đè theo tổ chức | — | `field_*` enum | C, R, U | Không xoá cứng trường |
| Nền tảng | `platform_operators`, `platform_role_capabilities`, `platform_audit_logs`, `integration_tokens`, `content_metrics`, `decision_registry`, `journey_runs`, `flower_taxonomy`, `flower_confusable_pairs` | — | — | — | Xem [10](10-csdl-va-luong-du-lieu.md) | — |

## 7. Status & State Model

### 7.1 Job (`generation_jobs`) — `src/modules/jobs/domain/job-rules.ts`

| Từ | Sang | Trigger | Actor | Side effect |
|---|---|---|---|---|
| — | PENDING | `enqueueJob` | Người dùng/hệ thống | Trừ credit/trial, ghi `usage`, `pg_notify` |
| PENDING | PROCESSING | Worker `FOR UPDATE SKIP LOCKED` | Worker | `started_at`, `attempts+1`, `job_events` |
| PROCESSING | COMPLETED | Xong (kể cả `result = REJECTED`) | Worker / use-case tại chỗ | `output`, `completed_at` |
| PROCESSING | FAILED | Lỗi, hoặc treo > 15 phút (script quét) | Worker / script | `error`; hoàn credit khi đọc kết quả (media/video) |
| PENDING | CANCELLED | `POST /jobs/:id/cancel` (`G6`) | Người dùng | `cancelled_at` |
| FAILED | PENDING | `POST /jobs/:id/retry` (`G7`) | Người dùng | `attempts+1` |

### 7.2 Phê duyệt (`approval_state`: PENDING → APPROVED | REJECTED)

Dùng cho `assets`, `product_analyses`, `product_copies`, `video_jobs.script_approval`, `video_jobs.video_approval`. Duyệt và từ chối đều ghi `audit_logs` (phân tích, dữ liệu bán hàng, ảnh tối ưu, biến thể). Không có chuyển ngược từ APPROVED.

### 7.3 Đơn hàng M10 — `src/modules/orders/domain/order-rules.ts`

| Trục | Chuyển hợp lệ |
|---|---|
| `status` | DRAFT→{CONFIRMED, CANCELLED}; CONFIRMED→{PROCESSING, CANCELLED}; PROCESSING→{DELIVERED, COMPLETED, CANCELLED}; DELIVERED→{COMPLETED, PROCESSING}; COMPLETED, CANCELLED: kết thúc |
| `production_status` | WAITING→{ASSIGNED, ARRANGING}; ASSIGNED→{ARRANGING, WAITING}; ARRANGING→{QUALITY_CHECK, READY, ASSIGNED}; QUALITY_CHECK→{READY, ARRANGING}; READY→{ARRANGING} |
| `delivery_status` | PENDING→{DISPATCHED, DELIVERING}; DISPATCHED→{DELIVERING, PENDING}; DELIVERING→{DELIVERED, FAILED}; FAILED→{DELIVERING, PENDING}; DELIVERED: kết thúc |

Actor: người có `R3` (sổ đơn chung), hoặc gián tiếp qua Điều phối/Thẻ chào. Side effect: một dòng `order_events` mỗi trục đổi. Huỷ: `R6`, lý do bắt buộc, audit.

### 7.4 Phiên & thành viên

- Phiên: tạo khi đăng nhập/đăng ký → hết hạn sau 30 ngày hoặc `revoked_at` khi đăng xuất / đăng nhập ở nơi khác.
- Thành viên: `INVITED` (mời) · `ACTIVE` (đăng ký, script) · `SUSPENDED` (không có mã ghi). Không có chuyển INVITED → ACTIVE qua API.
- `workspaces.trial_status`: chỉ ghi `ACTIVE` (đăng ký) hoặc `null` (AVI GIFT); `EXHAUSTED`, `EXPIRED` không có mã ghi.
- `organizations.type`: `EXPERIENCE` (đăng ký); giá trị khác không có API ghi.

### 7.5 Video (`video_stage`)

DRAFT → (sửa storyboard) → [SCRIPT_READY] → duyệt kịch bản `P3` → SCRIPT_APPROVED → render (`I1`, job `video.render`) → RENDERING → worker → RENDER_COMPLETED → duyệt `P4` → APPROVED. Nhánh worker lỗi: `stage = FAILED` + `error_message` (`workers/media_ai/video/video_worker.py:170-176`). `SCRIPT_GENERATING`, `REJECTED`: chỉ được đọc/khai kiểu, không thấy mã ghi.

### 7.6 Điều phối (`coordinator_stage`) — `src/modules/coordinator/domain/stage-transitions.ts`

```text
INTAKE ─► VALIDATING ─► PLANNING ─► ASSIGNING ─► IN_PRODUCTION ─► QUALITY_CHECK ─► DISPATCHING ─► DELIVERED ─► COMPLETED
  │  ◄──────┘             (ASSIGNING ─► PLANNING)        ▲               │ REWORK
  └──────────► PLANNING                                  └───────────────┘
mọi bước chưa kết thúc ──(mở sự cố)──► EXCEPTION ──(hết sự cố)──► resume_stage
mọi bước trước DELIVERED ──(huỷ, R6, có lý do)──► CANCELLED
```

Bằng chứng bắt buộc: ASSIGNING→IN_PRODUCTION cần đối tác; →DISPATCHING cần QC gần nhất PASSED; →DELIVERED cần POD; →COMPLETED cần không còn sự cố mở. Ánh xạ sang 3 trục `orders` ở `state-mapper.ts` (vd IN_PRODUCTION = PROCESSING/ARRANGING/PENDING). Rủi ro (`evaluateRisk`): CRITICAL khi có sự cố mở hoặc quá giờ hẹn; AT_RISK/ATTENTION theo phút còn lại.

QC: PENDING → PASSED | REJECTED | REWORK_REQUESTED. Sự cố: OPEN → RESOLVED.

### 7.7 Gói chiến dịch, nội dung, âm thanh

- `campaign_packages.status`: DRAFT → (QA) QA_PASSED | QA_NEEDS_REVIEW | QA_REJECTED → duyệt `J5` → APPROVED (QA_REJECTED không duyệt được; QA_NEEDS_REVIEW cần xác nhận cảnh báo; APPROVED không sửa được).
- `content_generations.status`: DRAFT → APPROVED (`J5`). `SCHEDULED`: có hàm `markScheduled` trong repository nhưng không có nơi gọi.
- `voice_clones.status`: PENDING → READY | FAILED (worker); xoá mềm → `deleted_at` (+ trạng thái `DELETED` trong use-case).
- `research_runs.status`: PENDING → RUNNING → COMPLETED | FAILED (worker MI). `PARTIAL_SUCCESS`: không thấy mã ghi.
- `topics.status`: chỉ ghi `EMERGING` lúc tạo; các giá trị khác không được ghi.

### 7.8 Thẻ chào

| Đối tượng | Trạng thái & chuyển |
|---|---|
| `greeting_sessions.status` | CREATED→{OPENED, BROWSING, SELECTED}; OPENED→{BROWSING, SELECTED}; BROWSING→{SELECTED}; SELECTED→{BROWSING, ORDER_SUBMITTED}; ORDER_SUBMITTED→{PAYMENT_REPORTED, COMPLETED}; PAYMENT_REPORTED→{COMPLETED} (`greeting-card-rules.ts:77-85`). Ngoài ra `expires_at`, `revoked_at` làm link "không khả dụng". |
| Đơn `source = BROCHURE` | Tạo DRAFT; thu tiền qua `order_payments`; tác vụ xưởng đặt `production_status` ARRANGING → READY và `delivery_status` DISPATCHED → DELIVERED theo thứ tự cố định; tự huỷ khi quá hạn giữ đơn (nếu bật). |
| `greeting_payment_events.status` | RECEIVED → MATCHED | UNMATCHED | IGNORED; UNMATCHED được Điều hành xử lý tay (`/payment-events/:id/handle`). |
| `greeting_notifications.status` | SENDING → SENT | FAILED | SKIPPED; FAILED/kẹt SENDING > 5 phút được gửi lại bởi bộ quét (30 phút/lần, trong 6 giờ). |

### 7.9 Danh sách enum có giá trị không được ghi ở đâu (dò tĩnh)

`membership_status.SUSPENDED`, `trial_status.EXHAUSTED/EXPIRED`, `organization_type` ≠ EXPERIENCE (không có API), `video_stage.SCRIPT_GENERATING/REJECTED`, `research_run_status.PARTIAL_SUCCESS`, `trend_topic_status` ≠ EMERGING, `order_info_request_status.*`, `order_change_request_status.*`, `order_change_type.*`, `capability_scope.STORE/FLOWER_NETWORK` (không dùng để cắt quyền). Phép dò là tĩnh — có thể bỏ sót giá trị ghi qua SQL ghép động.
