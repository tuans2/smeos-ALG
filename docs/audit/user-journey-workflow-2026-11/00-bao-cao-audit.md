# 00 — Audit User Journey & Business Workflow

| Mục | Giá trị |
|---|---|
| Repo / commit | `antranhub22/smeOS` @ `d8dd00d`, branch `claude/beautiful-knuth-v2riw9` |
| Ngày audit | 2026-11-06 |
| Phương pháp | Đọc tĩnh mã, `prisma/schema.prisma`, cấu hình cron (`render.yaml`, `vercel.json`, `src/instrumentation.ts`) và tài liệu hành trình. Hai lượt quét tự động: (1) mọi `href`/`deepLink`/`router.push` trong `src/` đối chiếu với các `page.tsx` thật; (2) các chuỗi trạng thái giao diện gửi lên/so sánh đối chiếu với enum Prisma và hằng số domain. |
| Không làm | Không chạy DB, không chạy test, không bấm thử giao diện. Mức "Đã xác nhận" = thấy rõ trong mã; "Khả năng cao" = đường mã cho phép, chưa thử thực tế. |
| Trạng thái | Chỉ báo cáo — không sửa mã. Đề xuất chuẩn hoá ở `01-de-xuat-chuan-hoa.md`. Một số đề xuất đụng schema/tenancy → cần PO duyệt trước (CLAUDE.md "Stop and ask"). |
| Cập nhật 07/11/2026 | Đối chiếu lại trên `main` `ec801dc`: O1, O2, O3 đã sửa (kế hoạch BL); O4, O6, O7, U1 sửa một phần. Bảng chi tiết và kế hoạch xử lý: `02-ke-hoach-xu-ly.md`. |

## 1. Kết luận chính

Từng máy trạng thái riêng lẻ phần lớn đã có luật ở máy chủ (đơn hàng, điều phối, báo giá, lead, chiến dịch, job, kết nối tích hợp). Lỗi nằm ở **chỗ nối giữa các luồng**: cùng một đơn có hai máy trạng thái ghi song song, huỷ đơn không bù trừ tài nguyên đã giữ, giao diện gửi mã trạng thái máy chủ không hiểu, và các trạng thái "chờ" không có ai tự đẩy đi (không hết hạn, không timeout). Ngoài ra có một lỗ hổng nghiệp vụ nghiêm trọng ở luồng liên kết Chuỗi ↔ Cửa hàng.

### Critical / High

| ID | Mức | Loại | Phát hiện |
|---|---|---|---|
| C1 | **Critical** | Broken flow / tenancy | Bất kỳ chủ cửa hàng nào (năng lực `F2` – "Sửa hồ sơ tổ chức") cũng liên kết được **bất kỳ tổ chức khác** làm đối tác `ACTIVE` mà bên kia không đồng ý; phản hồi trả về SĐT/email chủ tiệm bị liên kết. |
| U1 | **Critical** | Broken flow / dead-end | Nút tiến độ trong *Chi tiết đơn* (`/don-hang`, tab đơn của khách hàng) gửi mã trạng thái không tồn tại → máy chủ trả 400/422, giao diện im lặng. Người dùng không cập nhật được tiến độ đơn từ màn chính. |
| O1 | High | Inconsistent / bypass | `PATCH /orders/:id` (chỉ cần `R3`) nhận `status=CANCELLED` → huỷ đơn bỏ qua trần cứng `R6`, lý do bắt buộc, audit log và thông báo của `POST /orders/:id/cancel`. |
| O4 | High | Inconsistent | Hai máy trạng thái cho cùng một đơn: 3 trục `orders` (Sổ đơn, không cổng bằng chứng) và `order_coordinations.stage` (Điều phối, cổng QC/POD). Sửa ở Sổ đơn không đồng bộ bước điều phối → lệch; đánh dấu "Đã giao/Hoàn tất" được khi chưa có QC/POD. |
| A1 | High | Missing step | Huỷ đơn (mọi đường: Sổ đơn, Điều phối, Thẻ chào, từ chối đơn) **không giải phóng lịch đặt chỗ** (`product_bookings`). `releaseOrderBooking` có nhưng không ai gọi → phòng homestay bị giữ ảo. |
| Q1 | High | Broken flow (tiền) | Chuyển báo giá → đơn **làm mất ưu đãi và phí vận chuyển**: đơn chỉ cộng `qty × đơn giá`. Tổng đơn ≠ tổng báo giá khách đã đồng ý. |
| M1 | High | Dead-end | Mời thành viên tạo `membership=INVITED` + `password_hash=""`, không có bước nhận lời mời/đặt mật khẩu; phiên đăng nhập đòi `ACTIVE` → người được mời không bao giờ vào được. |
| O5 | High | Bypass | API Điều phối (chuyển bước, huỷ) không áp khoá đơn Thẻ chào (`brochureLockReason`) → bỏ qua luật thu tiền/trả mã giảm giá/báo khách. |
| V1 | High | Dead-end | Worker video chết giữa chừng: bộ quét job treo chỉ đánh `generation_jobs=FAILED`, `video_jobs.stage` kẹt `RENDERING` vĩnh viễn → nút render bị chặn "đang thực thi". |
| T3 | High | Missing step | Nâng cấp từ tổ chức dùng thử chỉ đổi `organizations.type`; workspace vẫn `EXPERIENCE` → vẫn trừ hạn mức dùng thử 50 lượt và hiện màn Trải nghiệm sau khi đã trả tiền. |

Danh sách đầy đủ (Medium/Low) ở mục 3.

## 2. Bản đồ workflow hiện tại

| Thực thể | Trạng thái | Nơi chặn chuyển | Kết thúc | Tự đẩy theo thời gian | Ghi chú |
|---|---|---|---|---|---|
| Đơn — Sổ đơn (`orders`) | 3 trục: `DRAFT…CANCELLED` · `WAITING…READY` · `PENDING…FAILED` | `orders/domain/order-rules.ts:15-38` | COMPLETED, CANCELLED (chỉ trục đơn) | Chỉ đơn Thẻ chào tự huỷ khi quá hạn chuyển khoản | Trục SX/giao không có trạng thái kết thúc, không khoá khi đơn đã đóng |
| Đơn — Điều phối (`order_coordinations.stage`) | `INTAKE…COMPLETED`, `EXCEPTION`, `CANCELLED` | `coordinator/domain/stage-transitions.ts` (cổng đối tác, QC, POD, sự cố) | COMPLETED, CANCELLED | Nhắc việc tính khi đọc | Ánh xạ 1 chiều sang 3 trục `orders` (`state-mapper.ts`) |
| Đơn — Thẻ chào (`metadata.subcontract_dispatch`) | M1–M4, vòng điều phối | `greeting-card/…` (đóng băng B1) | — | Cron 5 phút `chain-dispatch-sweep` | Luồng thứ ba cho cùng bảng `orders` |
| Yêu cầu bổ sung thông tin | `OPEN…OVERDUE, CANCELLED` | `order-info-requests.ts` | RECEIVED, CANCELLED | OVERDUE khi đọc | — |
| Yêu cầu đổi đơn (`order_change_requests`) | `PENDING…APPLIED` | **không có mã** | — | — | Bảng + enum có, không module nào dùng |
| Báo giá | `DRAFT, SENT, ACCEPTED, REJECTED, EXPIRED, CONVERTED` | `sales/domain/quotation.ts:99-106` | CONVERTED | Hết hạn **chỉ khi nhân viên mở chi tiết** | Khách không chấp nhận/từ chối được trên link `/bg` |
| Lead | 10 trạng thái pipeline | `acquisition/domain/lead-rules.ts:71-82` | WON, LOST, UNQUALIFIED | Lead cứu đơn chỉ từ đơn Thẻ chào | WON ngay khi tạo đơn nháp |
| Chiến dịch | `DRAFT…ARCHIVED` | `marketing-center/domain/campaign.ts:86` | ARCHIVED (mở lại được) | Không | — |
| Job AI (`generation_jobs`) | `PENDING…CANCELLED` | `jobs/domain/job-rules.ts` | COMPLETED, FAILED, CANCELLED | Treo >15 phút → FAILED | Không huỷ được khi PROCESSING |
| Video (`video_jobs.stage`) | 9 bước | `video-studio/domain/video-approval-rules.ts` | APPROVED | Không | `SCRIPT_GENERATING`, `REJECTED` không bao giờ được ghi |
| Bài đăng (content-engine) | `DRAFT, APPROVED, SCHEDULED` | `content-engine/domain/approval-rules.ts` | SCHEDULED (khoá) | Không | Không có ĐÃ ĐĂNG / ĐĂNG LỖI / huỷ lịch |
| Tài khoản người dùng | `PENDING, APPROVED, REJECTED` | `platform/infra/account-approval-repository.ts` | APPROVED, REJECTED | Không | "Dùng thử ngay" cũng chờ duyệt |
| Thành viên | `INVITED, ACTIVE, SUSPENDED` | không có bước INVITED→ACTIVE | — | Không | Song song với "tài khoản nhân viên" (`staff-accounts.ts`) |
| Dùng thử (`workspaces.trial_status`) | `ACTIVE, EXHAUSTED, EXPIRED` | **không ai ghi EXHAUSTED/EXPIRED** | — | Không | — |
| Gói thuê bao | `ACTIVE, OVERDUE, CANCELLED` | `subscription-guard.ts` | — | **Chỉ khi tổ chức gọi API** | Nhắc gia hạn không gửi nếu tiệm không đăng nhập |
| Liên kết chuỗi (`organization_links`) | `PENDING, ACTIVE, SUSPENDED, TERMINATED` | không có ma trận | — | Không | PENDING không bao giờ dùng |
| Kết nối tích hợp | 8 trạng thái | `integration-hub/domain/connection-lifecycle.ts` | DISCONNECTED (mở lại được) | Cron kiểm sức khoẻ | Mở khoá tầng trên nhảy thẳng ACTIVE |
| Hành trình trang chủ ("Bạn muốn làm gì?") | `LOCKED…` theo bước | `journey/domain/journey-state.ts` | completedAt | — | Chỉ nằm trong React state; bảng `journey_runs` không dùng |

## 3. Phát hiện chi tiết

### A. Đơn hàng & điều phối

**U1 — Critical — Nút tiến độ chi tiết đơn gửi mã sai (Đã xác nhận)**
- `src/components/orders/order-action-buttons.tsx:43-71` so sánh/gửi `productionStatus: PENDING | IN_PRODUCTION | COMPLETED`, `deliveryStatus: NOT_STARTED | SHIPPING`, `status: IN_PROGRESS`. Máy chủ chỉ nhận `WAITING/ASSIGNED/ARRANGING/QUALITY_CHECK/READY`, `PENDING/DISPATCHED/DELIVERING/DELIVERED/FAILED`, `DRAFT/CONFIRMED/PROCESSING/DELIVERED/COMPLETED/CANCELLED` (`src/app/api/v1/orders/[id]/route.ts:9-12`).
- Hệ quả: nút chính không bao giờ hiện (trục SX không bao giờ là `PENDING`); nút "Hoàn thành cắm" ở tab Phiếu thợ (`order-detail-modal.tsx:284`) → zod 400; "Đã giao" ở tab Giao hàng (`:304`) gửi `DELIVERED` từ `PENDING` → 422. `handleUpdateStatus` (`:75-90`) không báo lỗi khi `!res.ok` → người dùng bấm mà không có gì xảy ra.
- Tình huống thực tế: thợ cắm xong, bấm "Hoàn thành" trên điện thoại; đơn vẫn "Chờ", người giao không được báo.

**U2 — Medium — Phiếu in sinh dữ liệu giả (Đã xác nhận)**
- `order-detail-modal.tsx:299` thiệp trống → in "Chúc mừng ngày đặc biệt!"; phí ship cố định `"0 đ"`; hạn giao `${date} (${timeSlot})` thành "undefined (undefined)" khi đơn chưa có khung giờ.

**O1 — High — Huỷ đơn qua cửa sau (Đã xác nhận)**
- `VALID_ORDER_TRANSITIONS` cho `DRAFT/CONFIRMED/PROCESSING → CANCELLED` (`order-rules.ts:16-18`); `PATCH` chỉ gác `R3` và gọi `updateOrderProgress` (`update-order-progress.ts:35-40`). Đường huỷ chính thức `cancel-order.ts` đòi `R6` (trần cứng), lý do, audit, thông báo — đều bị bỏ qua.

**O2 — Medium — Hai luật huỷ khác nhau (Đã xác nhận)**
- `cancel-order.ts:40-46` cho huỷ đơn `DELIVERED`; ma trận chỉ cho `DELIVERED → COMPLETED|PROCESSING`. Huỷ ở Sổ đơn không đổi `order_coordinations.stage`, không trả mã giảm giá, không giải phóng đặt chỗ (xem A1, A2).

**O3 — Medium — Trục phụ không khoá khi đơn đã đóng (Đã xác nhận)**
- `update-order-progress.ts` cho đổi địa chỉ, trục SX/giao của đơn `COMPLETED/CANCELLED`; không có bất biến chéo trục (đơn `COMPLETED` với giao hàng `PENDING` hợp lệ). Ghi `order_events` trước `repo.update` và ngoài giao dịch, không khoá lạc quan → sự kiện mồ côi khi cập nhật lỗi, hai người sửa cùng lúc ghi đè nhau.

**O4 — High — Hai máy trạng thái cho một đơn (Đã xác nhận)**
- Điều phối ghi 3 trục `orders` qua `mapStageToOrderAxes` (`state-mapper.ts`), nhưng Sổ đơn sửa 3 trục mà không cập nhật `stage`. `mapOrderAxesToStage` chỉ dùng khi khởi tạo. Đơn có thể `COMPLETED` ở Sổ đơn trong khi Điều phối vẫn `IN_PRODUCTION` và còn nhắc việc. Cổng QC/POD ở `stage-transitions.ts:101-109` bị vô hiệu vì Sổ đơn đi vòng.
- Thêm một biểu diễn thứ ba của giao hàng: `order_coordinations.delivery_state` (chuỗi `PICKED_UP…DELIVERY_FAILED`).

**O5 — High — Điều phối bỏ qua khoá Thẻ chào (Đã xác nhận ở tầng API)**
- `brochureLockReason` chỉ được gọi ở `update-order-progress`, `cancel-order`, `assign-florist`. `coordinator/use-cases/shared.ts:19-27` (`loadOrderOrThrow`) và `coordinator-repository.ts:51-60` (`findOrder`) không lọc `source`; luồng Thẻ chào tạo `order_coordinations` (`subcontract-order-repository.ts:75`). → `PATCH /coordinator/orders/:id/stage` và `…/cancel` chạy được trên đơn Thẻ chào.

**O6 — Low — Mã kỹ thuật lộ lên màn hình (Đã xác nhận)**
- `order-rules.ts:50,65,80` ("từ \"DRAFT\" sang…"), `stage-transitions.ts:83-84` ("dùng POST /coordinator/orders/:id/cancel"), `cancel-job.ts:12`, `retry-job.ts`, `reject-analysis.ts:28`, `quotation` ("trạng thái \"SENT\"") — vi phạm non-negotiable #6.

**O7 — Low — Lệch dữ liệu nhỏ**
- `generateOrderCode` chú thích `DH-YYMMDD-XXXX`, mã thật `DHYYMMDD-XXXX` (`order-rules.ts:160-169`). Đơn tạo từ Điều phối ghi `order_items.unit_price_vnd = 0` nhưng `total_vnd = đơn giá` (`coordinator-query-helper.ts:66-90`) → báo cáo theo dòng hàng ra 0. `calculateOrderTotal` ép `qty 0 → 1`.

**O9 — Medium — Thiếu luồng đổi đơn sau khi chốt (Đã xác nhận)**
- `order_change_requests` + enum (`schema.prisma:3412`, `:3164`) không có mã dùng. `PATCH /orders/:id` không nhận `items` → khách đổi mẫu/số lượng phải huỷ và tạo đơn mới (mất lịch sử, lead, thanh toán).

**O10 — Medium — Đơn nháp chưa thanh toán treo vĩnh viễn (Đã xác nhận)**
- Tự huỷ quá hạn chuyển khoản và "lead cứu đơn" chỉ áp cho `source = BROCHURE` (`greeting-card/infra/background-sweep-repository.ts:36`). Đơn từ catalog/landing/báo giá/nhập tay ở `DRAFT` không bao giờ hết hạn.

### B. Báo giá & khách tiềm năng

**Q1 — High — Mất ưu đãi + phí ship khi chuyển thành đơn (Đã xác nhận)**
- `convert-quotation-to-order.use-case.ts:45-71` chỉ chuyển `items`; `createOrder` tính `calculateOrderTotal(items)` (`create-order.ts:24`). `discountAmount`, `shippingFee`, `terms` của báo giá bị bỏ.

**Q2 — Medium — Hết hạn lười và sai (Đã xác nhận)**
- Không có tác vụ nền; `get-quotation.use-case.ts:18-20` ghi `EXPIRED` khi **đọc** chi tiết (GET có tác dụng phụ). `isQuotationExpired` (`quotation.ts:118-125`) không loại `ACCEPTED` → báo giá khách đã đồng ý tự thành `EXPIRED` khi nhân viên mở, sau đó chỉ quay được về `DRAFT`, không chuyển thành đơn được.
- Ngược lại `convert` không kiểm hạn: báo giá `SENT` quá hạn nhưng chưa ai mở vẫn chuyển thành đơn với giá cũ.

**Q3 — Medium — Thiếu bước khách phản hồi (Đã xác nhận)**
- Link công khai `/bg/[token]` chỉ xem + xuất file (`src/app/bg/[token]/page.tsx`, `api/v1/public/quotation/[token]/route.ts`). `ACCEPTED/REJECTED` do nhân viên tự bấm; không có thông báo khi khách đã xem.

**L1 — Medium — Lead "Đã chốt" quá sớm, không quay lại (Đã xác nhận)**
- `orders/infra/order-lead-link.ts:28` đặt `WON` ngay khi tạo đơn nháp, kể cả đơn công khai chưa trả tiền. Huỷ đơn không đổi lead; `WON → FOLLOW_UP` là lối ra duy nhất (`lead-rules.ts:79`), không về `LOST` được → số liệu chuyển đổi bị thổi phồng.

**L2 — Low — Đồng bộ lead một chiều**
- Chỉ "gửi báo giá" đẩy lead sang `QUOTATION_SENT` (lỗi bị nuốt, `send-quotation.use-case.ts:35-46`). Báo giá `REJECTED/EXPIRED` không cập nhật lead. Trạng thái cũ `IN_PROGRESS` vẫn được ánh xạ ngầm (`lead-rules.ts:86`).

### C. Khả dụng, đặt chỗ, ưu đãi

**A1 — High — Đặt chỗ không được trả khi huỷ đơn (Đã xác nhận)**
- `releaseOrderBooking` (`availability/use-cases/bind-order-booking.ts:140`) không có nơi gọi. Các đường huỷ: `cancel-order.ts`, `cancelCoordinatorOrder` (`coordinator/use-cases/operations.ts:288`), `greeting-card/infra/cancellation-repository.ts:161`, `dismissal-store.ts:48`, `brochure-payment-repository.ts:277` — không đường nào huỷ `product_bookings`.

**A2 — Medium — Trả mã giảm giá không nhất quán (Đã xác nhận)**
- `releaseForOrder` chỉ gọi ở 3 đường Thẻ chào. Sổ đơn nhận `voucherId` (`api/v1/orders/route.ts:25`) nhưng không trừ tiền, không ghi lượt dùng; huỷ ở Sổ đơn/Điều phối không trả.

**A3 — Medium — Kiểm tồn/khả dụng chỉ có ở Thẻ chào (Đã xác nhận)**
- `check-product-availability.ts` chỉ dùng trong `greeting-card`. Catalog công khai (`place-public-catalog-order.ts`) lọc `products.status = ACTIVE` nhưng không lọc `stock_status = OUT_OF_STOCK`, không kiểm lịch homestay, không chặn ngày giao trong quá khứ.

**A4 — Low — Khách đặt qua catalog không có bước theo dõi**
- Trả mã đơn + thông tin chuyển khoản, không có trang theo dõi (Thẻ chào có `/g/[id]`), không có tin xác nhận cho khách.

### D. Đăng ký, dùng thử, thành viên, gói

**T1 — Medium — "Dùng thử ngay" không ngay (Đã xác nhận)**
- `instant-trial.ts:83` tạo user `PENDING`; khách chờ superadmin duyệt rồi nhận mật khẩu tạm qua Zalo/SĐT (thủ công). Tên nút và kỳ vọng lệch thực tế; không có SLA/thông báo cho superadmin.

**T2 — Medium — Dùng thử không bao giờ kết thúc (Đã xác nhận)**
- Không đâu ghi `trial_status = EXHAUSTED | EXPIRED`; không có hạn theo thời gian. Hết 50 lượt chỉ bị từ chối ở tầng trừ hạn mức, không chuyển trạng thái, không dẫn sang bước nâng cấp.

**T3 — High — Nâng cấp từ dùng thử không trọn (Khả năng cao)**
- `approve-organization-model-change.ts:36-64` chỉ đổi `organizations.type` + cài đặt; workspace giữ `kind = EXPERIENCE` → `fundingSourceForWorkspace` (`usage/domain/quota.ts`) vẫn tính theo hạn mức dùng thử, `resolve-app-session.ts:67` vẫn hiện màn Trải nghiệm; tên "- Demo …" và dữ liệu mẫu còn nguyên.

**T4 — Low — Trang mồ côi** `/dang-ky-thanh-cong` không được dẫn tới (đã thay bằng `PendingApprovalNotice` nội tuyến).

**M1 — High — Lời mời thành viên là ngõ cụt (Đã xác nhận)**
- `invite-member.ts:46` tạo user `password_hash: ""`; `membership-repository.ts:85` ghi `INVITED`; không có endpoint/màn nhận lời mời, không gửi email (chú thích: "ngoài phạm vi P2"); `resolve-session.ts:96` đòi `ACTIVE`. Song song có "tài khoản nhân viên" (`staff-accounts.ts`) — hai cách thêm người, một cách không dùng được.

**S1 — Medium — Gia hạn gói chỉ chạy khi tiệm đang dùng**
- `subscription-guard.ts:31-46` sinh hoá đơn kỳ sau, nhắc 7/1 ngày và đánh `OVERDUE` khi tổ chức gọi API. Tiệm nghỉ vài ngày → không nhận nhắc, quay lại thì bị khoá chỉ-xem ngay (không ân hạn).

### E. Chuỗi ↔ cửa hàng

**C1 — Critical — Liên kết đối tác không cần đồng ý (Đã xác nhận)**
- `POST /coordinator/partners/link-existing` gác `F2` (`capability-catalog.ts:153`: "Sửa hồ sơ tổ chức", vai điều hành của **mọi** tiệm). Không kiểm tổ chức gọi là Chuỗi. `findStoreByIdentifier` tìm theo slug/tên/email chủ tiệm trên toàn hệ thống (`store-identifier-lookup.ts:13-40`); `linkExistingStore` upsert `status: "ACTIVE"` (`prisma-partnership-repository.ts:203-247`), kể cả hồi sinh liên kết đã `TERMINATED`. Phản hồi chứa `contactPhone/contactEmail` của chủ tiệm kia; thông báo lỗi xác nhận tiệm có tồn tại; chủ tiệm bị kéo vào phòng chat.
- Hệ quả: một tiệm tự nhận tiệm khác làm chi nhánh/đối tác, được áp quyết định tầng Chuỗi (governance khoá từ trên xuống) và đọc thông tin liên hệ. Cửa hàng con không có đường tự rời liên kết.
- Đụng tenancy → **cần PO duyệt hướng sửa** trước khi làm.

**C2 — Medium — Đổi trạng thái liên kết không có luật**
- `PATCH /coordinator/partners/:id/status` cho `ACTIVE ↔ SUSPENDED ↔ TERMINATED` tự do, không lý do, không audit, không báo đối tác, không xử lý đơn gia công đang giao cho đối tác vừa bị ngưng. `PENDING` không bao giờ dùng.

### F. Sáng tạo, job, nội dung

**V1 — High — Video kẹt RENDERING (Đã xác nhận)** — xem bảng mục 1. `scan-stuck-jobs.ts:10` chỉ gọi `markStuckAsFailed` cho `generation_jobs`; `video-approval-rules.ts:52-57` chặn render lại khi `stage = RENDERING`.

**V2 — Medium — Không từ chối được video đã dựng**
- Chỉ có duyệt (`approve-video-output.ts`); `REJECTED`, `SCRIPT_GENERATING` không bao giờ được ghi. `RENDER_COMPLETED` chặn render lại ("tạo phiên bản mới") → muốn sửa phải làm lại từ đầu.

**J1 — Low — Không huỷ được job đang chạy**
- `job-rules.ts:23` chỉ cho huỷ `PENDING`; job `PROCESSING` phải chờ tới 15 phút mới được quét thành `FAILED`.

**K1 — Medium — Bài đăng "Đã gửi lịch" là ngõ cụt**
- `content-engine/domain/approval-rules.ts:54` khoá `SCHEDULED`; không có trạng thái đã đăng/đăng lỗi, không huỷ lịch, không phản hồi từ SocialFlow.

**K2 — Low — Chỉ số "chờ duyệt" luôn 0**
- `store-growth-center.tsx:100-102` đếm `generation_jobs.stage === "NEEDS_APPROVAL"`; worker không bao giờ ghi giá trị này.

### G. Điều hướng & hành trình

**N1 — Medium — Mục menu dẫn tới trang không tồn tại (Đã xác nhận bằng quét)**
- `/cong-cu/toi-uu-he-thong` (`nav-store-entries.ts:89`, `toolkit-catalog.ts:382`), `/van-hanh/san-pham` (`nav-mother.ts:87`), `/bo-suu-tap` (`toolkit/domain/tool-registry.ts:194`) → 404.

**N2 — Low — Trang mồ côi**: `/dang-ky-thanh-cong`, `/quang-ba/chien-dich`, `/van-hanh/quan-tri-ma-tran` không có liên kết nào dẫn tới.

**JE1 — Medium — Hành trình nhiều bước không lưu tiến độ**
- `store-journey-home.tsx:32` giữ `journeyState` trong React; các bước điều hướng sang `/san-pham`, `/bao-gia`, `/creative-studio` (`next-actions-registry.ts`) → quay lại là mất. Bảng `journey_runs` (`schema.prisma:3503`) không được dùng.

**D1 — Low — Nhiều nguồn hành trình chồng nhau**
- `FLORAOS_STORE_13_USER_JOURNEYS_DETAIL_SPEC.md` (+ bản `_BACKUP`), `FLORAOS_PRODUCT_TO_MARKET_USER_JOURNEY.md` (14 chặng), `FLORAOS_CREATIVE_STUDIO_JOURNEY.md`, `user-journey-cong-cu-02.md`, `quy-trinh-trien-khai-48-cong-cu.md`. Bộ 13 hành trình viết riêng cho tiệm hoa trong khi sản phẩm có 7 ngành; chưa có hành trình nghiệp vụ đơn hàng đa nguồn ở dạng journey.

### H. Tích hợp & tác vụ nền

**I1 — Low** — `connection-lifecycle.ts:19-28`: `DISABLED_BY_UPPER → ACTIVE` không qua kiểm sức khoẻ/xác thực lại; `DRAFT/CONNECTING` không khoá được bởi tầng trên; `CONNECTING` không có timeout.

**S2 — Medium — Bộ quét chạy trong tiến trình web**
- `src/instrumentation.ts:22-32` khởi `setInterval` cho lead cứu đơn, khớp chuyển khoản, đối soát, quét Thẻ chào ở **mỗi** tiến trình web; trên Vercel (`vercel.json` chỉ có 1 cron) chúng không chạy. Cần xác nhận có khoá phân tán cho từng bộ quét khi scale >1 instance.

## 4. Phân loại

| Loại | ID |
|---|---|
| Dead-end | U1, M1, V1, V2, K1, N1, Q2 (ACCEPTED→EXPIRED), T2 |
| Broken flow | C1, Q1, O1, O5, U2 |
| Missing step | A1, A2, A3, O9, O10, Q3, T3, JE1, A4 |
| Không nhất quán | O2, O3, O4, O6, O7, L1, L2, C2, S1, S2, I1, K2, D1, N2, T1, T4 |

## 5. Chưa xác minh

- Không chạy thử giao diện/DB: U1 dựa trên đọc mã + schema zod; T3 chưa thử luồng nâng cấp thật; S2 chưa đọc hết cơ chế khoá của từng bộ quét.
- Luồng Thẻ chào (đóng băng B1) chỉ rà ở điểm nối với Sổ đơn/Điều phối, không rà nội bộ.
- Không rà `market-intelligence`, `internal-chat`, `print`, `custom-domain`.
