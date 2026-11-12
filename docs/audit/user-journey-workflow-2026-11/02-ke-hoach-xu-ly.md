# 02 — Kế hoạch xử lý audit User Journey & Workflow

- Trạng thái: `PROPOSED` — lập 07/11/2026. Chuyển `ACTIVE` khi PO duyệt đợt P0 và trả lời UQ1–UQ12 (mục 6).
- Đầu vào: `00-bao-cao-audit.md` (phát hiện), `01-de-xuat-chuan-hoa.md` (luồng chuẩn).
- Chạy song song với `docs/plan/business-logic-upgrade.md` (BL-01…BL-18, WP-01…WP-21). Kế hoạch này **không làm lại** việc đã nằm
  trong kế hoạch BL; chỗ chồng nhau ghi rõ "→ WP-xx".
- Cách giao: **mỗi gói (UJ-xx) một PR** vào `main`, Conventional Commits, mã + test + tài liệu cùng commit.
  Gói **[PO]** chỉ bắt đầu khi có quyết định; gói **[SCHEMA]** cần PO duyệt và kèm `prisma migrate dev`.

## 1. Đối chiếu phát hiện với `main` (`ec801dc`, 07/11/2026)

Audit chạy trên `d8dd00d`. Từ đó `main` thêm 73 commit, trong đó đợt P0/P1 của kế hoạch BL.

| Phát hiện | Trạng thái trên `main` | Bằng chứng | Xử lý ở |
|---|---|---|---|
| O1 huỷ qua `PATCH` | **Đã sửa** | `order-rules.ts:47-57` `manualStatusBlockReason`; `update-order-progress.ts:31-34` | BL WP-01 |
| O2 hai luật huỷ | **Đã sửa** | `cancel-order.ts:51` chặn đơn đã giao; `:56-58` uỷ quyền Điều phối | BL WP-07 |
| O3 sự kiện ngoài giao dịch | **Đã sửa** (phần giao dịch) | `update-order-progress.ts:47-59` ghi sự kiện cùng `repo.update` | BL WP-06 |
| O4 hai máy trạng thái | **Một phần** — luật bộ ba dùng chung (`order-lifecycle.ts`) nhưng sổ đơn vẫn sửa trục SX/giao của đơn đang ở Điều phối mà không đổi `stage`, không qua cổng QC/POD | `update-order-progress.ts` không gọi `orderCoordinationPort` | UJ-09 (cùng PR với BL WP-05b) |
| U1 nút tiến độ sai mã | **Một phần** — đã hiện lỗi, "Đã giao" không gửi `COMPLETED`; nút vẫn so `PENDING/IN_PRODUCTION/SHIPPING` | `order-action-buttons.tsx:44-72` | BL WP-05b (chờ Q8) + UJ-09 |
| U2 phiếu in bịa dữ liệu | Còn | `order-detail-modal.tsx` (thiệp mặc định, phí ship "0 đ") | UJ-07 |
| O5 Điều phối bỏ qua khoá Thẻ chào | Còn | `coordinator/use-cases/shared.ts` không kiểm `source` | UJ-02 |
| O6 mã kỹ thuật trên màn hình | Một phần (đơn hàng đã có nhãn `order-status-labels.ts`) | `stage-transitions.ts` ("POST /coordinator/…"), `cancel-job.ts:12`, `retry-job.ts`, `reject-analysis.ts:28`, `convert-quotation…:40` | UJ-07 |
| O7 lệch nhỏ (mã đơn, qty 0→1, `unit_price 0`) | Một phần | — | BL WP-09, WP-11, WP-21 |
| O9 đổi đơn sau khi chốt | Còn | `order_change_requests` không có mã dùng | UJ-17 |
| O10 đơn nháp ngoài Thẻ chào treo mãi | Còn | `background-sweep-repository.ts:36` chỉ `BROCHURE` | UJ-12 |
| Q1 mất ưu đãi + phí ship | Còn | `convert-quotation-to-order.use-case.ts:45-71` | UJ-08 |
| Q2 hết hạn báo giá sai | Còn | `quotation.ts:118-125`, `get-quotation.use-case.ts:18-20` | UJ-04 + UJ-11 |
| Q3 khách không phản hồi được báo giá | Còn | `src/app/bg/[token]/page.tsx` | UJ-18 |
| L1, L2 vòng đời lead | Còn | `order-lead-link.ts:28` | UJ-13 |
| A1 không nhả đặt chỗ | Còn — kế hoạch BL ghi "chỉ Thẻ chào sinh đặt chỗ, đang đóng băng" | `bind-order-booking.ts:140` không có nơi gọi | UJ-23 (cần gỡ băng) |
| A2 mã giảm giá | Còn | — | BL WP-17 (Q5) |
| A3 kiểm tồn ở mọi nguồn; ngày giao quá khứ | Còn | — | BL WP-20 (Q9), WP-12 (Q11) |
| A4 khách catalog không theo dõi được đơn | Còn | — | UJ-19 |
| C1 liên kết Chuỗi không cần đồng ý | Còn | `link-existing-store.ts`, `prisma-partnership-repository.ts:203-247` | **UJ-01** (chặn ngay) + UJ-10 |
| C2 đổi trạng thái liên kết tự do | Còn | `api/v1/coordinator/partners/[id]/status/route.ts` | UJ-10 |
| M1 lời mời thành viên ngõ cụt | Còn | `invite-member.ts:46`, `membership-repository.ts:85` | UJ-06 + UJ-14 |
| T1–T4 dùng thử / nâng cấp | Còn | — | UJ-15, UJ-16 |
| S1 gia hạn gói lười | Còn | `subscription-guard.ts:31-46` | UJ-11 |
| S2 bộ quét trong tiến trình web | Còn | `src/instrumentation.ts:22-32` | UJ-11 |
| V1 video kẹt `RENDERING` | Còn | `scan-stuck-jobs.ts` chỉ đụng `generation_jobs` | **UJ-03** |
| V2, J1 không dựng lại / không huỷ job đang chạy | Còn | — | UJ-20 |
| K1 bài đăng `SCHEDULED` ngõ cụt | Còn | `approval-rules.ts:54` | UJ-21 |
| K2 chỉ số "chờ duyệt" luôn 0 | Còn | `store-growth-center.tsx:100-102` | UJ-07 |
| N1 menu 404, N2 trang mồ côi | Còn | `nav-store-entries.ts:89`, `nav-mother.ts:87` | **UJ-05** |
| JE1 hành trình không lưu tiến độ | Còn | `store-journey-home.tsx:32` | UJ-22 |
| D1 nguồn hành trình chồng nhau | Còn | — | UJ-24 |
| I1 vòng đời kết nối tích hợp | Còn | `connection-lifecycle.ts:19-28` | UJ-25 |

Kết luận: 3 phát hiện đã sửa, 4 sửa một phần, 29 còn nguyên. Mỗi gói dưới đây **mở đầu bằng test đỏ tái hiện lỗi trên `main`**.

## 2. Nguyên tắc thi công

1. Siết trước, mở rộng sau: đợt P0 chỉ **chặn** đường sai (không thêm màn mới), để không cần chờ quyết định UX.
2. Luật trong `domain/` thuần (`CLAUDE.md` #4); route chỉ parse + gọi use-case; mọi chuyển trạng thái ghi sự kiện/audit cùng giao dịch.
3. Không đổi `prisma/schema.prisma` trừ gói **[SCHEMA]**. Ưu tiên dùng cột/enum có sẵn (`organization_links.status = PENDING`,
   `memberships.invited_at`, `journey_runs`, `order_change_requests`).
4. Tác vụ nền: điều kiện lọc trong truy vấn, có trần vòng lặp, chạy trong `asSystemDb` (`AGENT_RULES.md` §14 #15).
5. Không đụng nội bộ Thẻ chào (đóng băng B1) — chỉ chặn từ phía ngoài; phần cần sửa bên trong gom vào UJ-23 chờ gỡ băng.
6. Chữ trên màn hình tiếng Việt tự nhiên; lỗi API không chứa mã `[A-Z_]{4,}` hay đường dẫn API.

## 3. Đợt P0 — chặn lỗi nóng, không cần quyết định mới (5 PR, ~4 ngày)

### UJ-01 · C1 — Chặn liên kết Chuỗi một chiều
- **Mục tiêu:** chỉ tổ chức loại Chuỗi được liên kết; không lộ thông tin liên hệ; không hồi sinh liên kết đã chấm dứt; không kéo người
  ngoài vào phòng chat. Đây là **siết** tenancy (không nới) → không thuộc diện "stop and ask", nhưng báo PO khi mở PR.
- **Sửa:**
  - `chain-partnership/use-cases/link-existing-store.ts`: đọc loại tổ chức gọi; không phải Chuỗi → `conflict(CHAIN_ONLY_MESSAGE)`
    (dùng lại `isChainOrganizationType`, `greeting-card/domain/brochure-workflow-policy.ts:86`). Không tìm thấy, tự liên kết, hay
    tổ chức đích không hợp lệ → cùng **một** lỗi `notFound()` (không xác nhận tồn tại). Thay `throw new Error` bằng `AppError`.
  - `store-identifier-lookup.ts`: chỉ khớp `slug` chính xác hoặc email chủ tiệm chính xác; bỏ khớp theo tên.
  - `prisma-partnership-repository.ts:linkExistingStore`: bỏ `upsert`; liên kết đã có (kể cả `TERMINATED`) → 409
    "Cửa hàng này đã có liên kết với chuỗi". Tạm thời vẫn tạo `ACTIVE` (luồng chấp nhận ở UJ-10).
  - Bỏ bước tạo phòng chat trong `link-existing-store.ts` (chuyển sang lúc cửa hàng chấp nhận, UJ-10).
  - `api/v1/coordinator/partners/link-existing/route.ts` + `mapEntity`: phản hồi không còn `contactPhone/contactEmail` của tổ chức kia
    (chỉ tên, mã đối tác, trạng thái).
- **Test (đỏ trước):** `tests/tenant/chain-link-existing-guard.test.ts` — (1) tổ chức `STORE` gọi → 409, không có dòng
  `organization_links`; (2) Chuỗi gọi với tên tổ chức (không phải slug) → 404; (3) phản hồi thành công không chứa SĐT/email;
  (4) liên kết `TERMINATED` gọi lại → 409, `status` giữ nguyên; (5) không tạo `chat_conversations`.
  Unit `store-identifier-lookup` khớp chính xác.
- **Gate:** typecheck + `lint:ratchet`, `npm test`, `test:tenant` (**blocking**), `test:platform`, `check:docs` (cập nhật mô tả route ở
  `06-api-specification.md`).
- **Rủi ro:** Chuỗi thật đang dùng tìm theo tên → báo trước trong ghi chú phát hành; kiểm dữ liệu: đếm liên kết do tổ chức không phải
  Chuỗi tạo (truy vấn chỉ đọc, đính kèm PR) → nếu > 0, PO quyết định chấm dứt (UQ2).
- **Ước lượng:** 1 ngày.

### UJ-02 · O5 — Điều phối tôn trọng khoá Thẻ chào
- **Sửa:** `coordinator/use-cases/update-coordinator-stage.ts`, `cancelCoordinatorOrder` + `openException…` (`operations.ts`),
  `record-payment.ts`: sau `loadOrderOrThrow`, đơn `source = BROCHURE` → `AppError("CONFLICT", brochureLockReason(...))`.
  **Không** áp cho các route gia công mà màn Thẻ chào đang gọi (`upload-qc-subcontract`, `approve-customer-photo`, `set-shipper`,
  `confirm-delivery` — `coordinator-subcontract-actions-panel.tsx:91-348`). Lập danh sách route bị chặn/không chặn trong mô tả PR.
- **Giao diện:** bảng điều phối (`control-tower-dashboard.tsx`) ẩn nút chuyển bước/huỷ cho đơn Thẻ chào, hiện liên kết "Xử lý ở Thẻ chào".
- **Test:** `tests/tenant/coordinator-brochure-lock.test.ts` — đơn `BROCHURE` có `order_coordinations`: chuyển bước, huỷ, ghi tiền → 409,
  không đổi `stage`/`status`; 4 route gia công vẫn 200.
- **Gate:** như UJ-01 + `check:schemas:coordinator`, `lint:ux -- --check`.
- **Ước lượng:** 0,5–1 ngày.

### UJ-03 · V1 — Video không còn kẹt "đang dựng"
- **Sửa:** `jobs/infra/generation-job-repository.ts:markStuckAsFailed` trả về các dòng vừa đánh `FAILED` (đã có `organization_id`,
  `payload`); `jobs/use-cases/scan-stuck-jobs.ts` với job `feature` video: cập nhật
  `video_jobs SET stage = 'FAILED', error_message = 'Quá thời gian dựng video — vui lòng thử lại'` **chỉ khi** `stage = 'RENDERING'`
  (`payload.videoJobId`, cùng `organization_id`). Domain: `canStartRender` đã cho `FAILED` → bấm dựng lại được.
- **Test:** unit `scan-stuck-jobs` (job video treo 16 phút → `video_jobs` FAILED; video đã `RENDER_COMPLETED` không bị đụng);
  bổ sung `video-job-use-cases.test.ts`.
- **Gate:** typecheck, `npm test`, `test:tenant` (truy vấn liên tổ chức chạy `asSystemDb`), worker không đổi.
- **Ước lượng:** 0,5 ngày.

### UJ-04 · Q2 (phần luật) — Báo giá khách đã đồng ý không tự hết hạn; chuyển đơn kiểm hạn
- **Sửa:** `sales/domain/quotation.ts:isQuotationExpired` loại thêm `ACCEPTED`; **giữ** chuyển tay `ACCEPTED → EXPIRED` (hiệu chỉnh khi làm: bỏ đi thì báo giá khách đồng ý rồi rút lại thành ngõ cụt);
  `convert-quotation-to-order.use-case.ts` gọi `isQuotationExpired` trước `claimConversion` → 422 "Báo giá đã hết hiệu lực —
  gia hạn rồi tạo đơn". Thông điệp dùng `QUOTATION_STATUS_LABELS`, bỏ mã `"SENT"` (O6).
- **Test:** `quotation.test.ts` (ACCEPTED quá hạn → không hết hạn), `quotation-safety.test.ts` (SENT quá hạn chưa mở → chuyển đơn 422).
- **Ghi nhớ:** việc ghi `EXPIRED` trong GET giữ nguyên tới UJ-11 (cron) để không đổi hành vi danh sách hai lần.
- **Ước lượng:** 0,5 ngày.

### UJ-05 · N1, N2 — Không còn mục menu dẫn tới trang 404
- **Sửa:** ẩn `/cong-cu/toi-uu-he-thong` (`nav-store-entries.ts:89`, chỉ hiện khi trang tồn tại; công cụ đang `FOUNDATION 30%`) và
  `/van-hanh/san-pham` (`nav-mother.ts:87`). `toolkit/domain/tool-registry.ts` không có nơi dùng ngoài test → ghi vào báo cáo, không xoá
  dưới `[PROD]`.
- **Test kiến trúc mới:** `tests/unit/architecture/nav-href-exists.test.ts` — mọi `href` trong `src/components/layout/nav/*.ts`,
  `toolkit-catalog.ts` (trạng thái `DONE|IN_PROGRESS`), `journey/domain/next-actions-registry.ts` phải khớp một `page.tsx`
  (bỏ route group, `[param]` khớp mọi đoạn). Danh sách trang mồ côi (`/dang-ky-thanh-cong`, `/quang-ba/chien-dich`,
  `/van-hanh/quan-tri-ma-tran`) ghi vào tệp `*-legacy.txt` ratchet như các test kiến trúc khác.
- **Gate:** `npm test`, `lint:ux -- --check`, `npm run build` (đổi điều hướng).
- **Ước lượng:** 0,5 ngày.

## 4. Đợt P1 — hoàn thiện luồng (9 PR, ~2,5 tuần)

| Gói | Phát hiện | Việc | Tệp chính | Test khoá luật | PO |
|---|---|---|---|---|---|
| UJ-06 | M1 (chặn) | `invite-member.ts`: email **chưa** có tài khoản → 422 "Người này chưa có tài khoản — dùng Tạo tài khoản nhân viên"; bỏ tạo `users` với `password_hash: ""`. Script chỉ đọc đếm user `password_hash = ''` + membership `INVITED` (đính kèm PR) | `invite-member.ts`, `invite-member-dialog.tsx` | Tenant: mời email mới → 422, không thêm `users` | Không |
| UJ-14 | M1 (nhận lời mời) | Người đã có tài khoản thấy lời mời ở bộ chọn tổ chức; `POST /session/invitations/:membershipId/accept|decline` (chỉ chính user đó) → `ACTIVE`/xoá; lời mời quá 14 ngày (`invited_at`) không nhận được | `organization/use-cases/accept-invitation.ts` (mới), `api/v1/session/invitations/*`, `resolve-session.ts` | Tenant: user khác nhận hộ → 404; quá hạn → 410; sau nhận → phiên vào được | **UQ3** |
| UJ-07 | U2, O6, K2 | Phiếu in: bỏ thiệp mặc định, phí ship lấy từ dữ liệu (không có thì ẩn dòng), hạn giao "Chưa hẹn giờ" khi trống. Nhãn tiếng Việt cho thông điệp chặn ở Điều phối, job, phân tích ảnh. Chỉ số "chờ duyệt" đọc đúng nguồn (phân tích ảnh `PENDING` + gói sáng tạo chờ duyệt) | `order-detail-modal.tsx`, `stage-transitions.ts`, `cancel-job.ts`, `retry-job.ts`, `reject-analysis.ts`, `store-growth-center.tsx` | Unit: thông điệp không khớp `/[A-Z_]{4,}|\/api\//`; snapshot phiếu không có chữ "undefined" | Không |
| UJ-08 | Q1 | Chuyển báo giá mang theo ưu đãi + phí ship theo phương án UQ1; khẳng định `order.total_vnd === quotation.totalAmount` trong use-case (lệch → 500 + log, không tạo đơn) | `convert-quotation-to-order.use-case.ts`, `orders/domain/order-rules.ts` (`calculateOrderTotal` nhận điều chỉnh), `create-order.ts` | Báo giá 1.000.000 − 100.000 + 30.000 → đơn 930.000; sàn giá xét sau giảm (khớp BL WP-10/Q5) | **UQ1** |
| UJ-09 | O4, U1 | Cùng PR với BL WP-05b: đơn đang ở Điều phối → `PATCH /orders/:id` không nhận `productionStatus/deliveryStatus` (409 "Cập nhật tiến độ ở màn Điều phối"); modal `/don-hang` với đơn đó hiện nút mở Điều phối thay vì nút tiến độ | `update-order-progress.ts` (gọi `orderCoordinationPort.isUnderCoordination`), `order-action-buttons.tsx` | Tenant: đơn có `order_coordinations` + PATCH `deliveryStatus=DELIVERED` → 409, không có `order_events` | **Q8** (BL) |
| UJ-10 | C1, C2 | Luồng mời–chấp nhận: Chuỗi tạo liên kết `PENDING` (enum có sẵn), cửa hàng đích nhận thông báo; `POST /chain/invitations/:id/accept|decline` (phía cửa hàng); quá 7 ngày (`valid_from`) → tự đóng. Ma trận trạng thái `partnership-lifecycle.ts`: `PENDING→ACTIVE|TERMINATED`, `ACTIVE⇄SUSPENDED`, `→TERMINATED` (kết thúc). Đổi trạng thái bắt buộc lý do, ghi audit, báo hai bên; cửa hàng con tự rời được. Tạo phòng chat khi chấp nhận | `chain-partnership/domain/partnership-lifecycle.ts` (mới), `prisma-partnership-repository.ts` (293 dòng — tách nếu vượt 350), route `partners/[id]/status`, `api/v1/chain/invitations/*` | Tenant: liên kết `PENDING` không mở khoá governance/không hiện ở danh sách đối tác; cửa hàng khác chấp nhận hộ → 404; `TERMINATED→ACTIVE` → 409 | **UQ2** |
| UJ-11 | Q2, S1, S2 | Thêm bước vào cron sẵn có `internal/chain-dispatch-sweep` (không đổi `render.yaml`): hết hạn báo giá (`SENT` quá `valid_until`), sinh hoá đơn kỳ sau + nhắc 7/1 ngày + `OVERDUE` cho mọi tổ chức (gọi lại luật `subscription-guard`). Sau đó bỏ ghi trong `get-quotation`. Kiểm khoá chạy đơn lẻ cho 4 bộ quét `setInterval` (`instrumentation.ts`); bộ nào thiếu → `pg_try_advisory_lock` | `sales/use-cases/expire-quotations.ts` (mới), `subscription/use-cases/sweep-subscriptions.ts` (mới), route sweep | Tenant: 2 tổ chức, chỉ báo giá quá hạn đổi; tiệm không đăng nhập vẫn nhận nhắc; chạy song song 2 lượt → một lượt bỏ qua | Không (trừ ân hạn gói → **UQ6**) |
| UJ-12 | O10 | Tự huỷ đơn `DRAFT` chưa thu (ngoài Thẻ chào) quá N giờ theo cài đặt cửa hàng; huỷ qua `cancelOrder` (lý do hệ thống) để dùng chung luật; sinh lead cứu đơn như Thẻ chào | `orders/use-cases/expire-unpaid-orders.ts` (mới), `recover-payment-timeout-leads.ts` (mở rộng nguồn) | Tenant: đơn catalog 25 giờ chưa thu → huỷ + 1 lead; đơn đã thu một phần → không đụng | **UQ5** |
| UJ-13 | L1, L2 | Lead `WON` khi đơn **vào Điều phối/ghi nhận tiền đầu** (gắn vào `sendToCoordination`), lúc tạo đơn chỉ gắn `converted_order_id`; đơn bị huỷ và lead không còn đơn mở → `FOLLOW_UP`; báo giá từ chối/hết hạn → `FOLLOW_UP`; thêm `WON → LOST` | `order-lead-link.ts`, `coordination-handoff.ts`, `lead-rules.ts`, `cancel-order.ts` (qua port) | Unit ma trận lead; tenant: tạo đơn → lead chưa WON; thu tiền → WON; huỷ → FOLLOW_UP | **UQ4** |

Thứ tự: UJ-06 trước UJ-14; UJ-01 trước UJ-10; UJ-04 trước UJ-11; BL WP-05b quyết định Q8 trước UJ-09. Còn lại song song.

## 5. Đợt P2 — cần quyết định / màn mới / schema / gỡ băng

| Gói | Phát hiện | Việc | Điều kiện |
|---|---|---|---|
| UJ-15 | T2, T3 | Một use-case "chuyển dùng thử → chính thức": đổi `organizations.type`, `workspaces.kind = PRODUCTION`, `trial_* = null`, bỏ hậu tố "- Demo", hỏi giữ/xoá dữ liệu mẫu; ghi `trial_status = EXHAUSTED` khi hết lượt và dẫn tới màn chọn gói | **UQ7** (hạn dùng thử, gói sau dùng thử) |
| UJ-16 | T1, T4 | Đổi chữ nút "Dùng thử ngay" theo UQ8 hoặc bỏ bước duyệt cho dùng thử; xoá trang mồ côi `/dang-ky-thanh-cong` | **UQ8** |
| UJ-17 | O9 | Luồng "Yêu cầu đổi đơn" trên bảng `order_change_requests` có sẵn: `PENDING → APPROVED → APPLIED` (tính lại tiền, sàn giá, xác nhận khách), `REJECTED/CANCELLED`; chỉ khi đơn chưa vào sản xuất (hoặc theo UQ9) | **UQ9**; có thể **[SCHEMA]** nếu thiếu cột |
| UJ-18 | Q3 | `/bg/[token]`: nút Đồng ý / Từ chối (lý do); `POST /public/quotation/:token/respond` có giới hạn tần suất + xác minh người thật; ghi nhận "khách đã xem"; báo sale | **UQ10**; thêm route công khai vào `route-capability-guard.test.ts` |
| UJ-19 | A4 | Trang theo dõi đơn cho khách đặt qua catalog/landing (dùng `order-share.ts` vừa có trên `main`) + tin xác nhận | **UQ10** |
| UJ-20 | V2, J1 | "Yêu cầu dựng lại" từ `RENDER_COMPLETED` (ghi `REJECTED` + lý do, cho render lại, credit theo `refund-policy`); yêu cầu huỷ job `PROCESSING` bằng sự kiện `cancel_requested` ở `job_events`, worker kiểm giữa các bước | Worker Python đổi → `pytest`; credit dựng lại → **UQ11** |
| UJ-21 | K1 | Trạng thái `PUBLISHED/PUBLISH_FAILED`, "Huỷ lịch" về `APPROVED`; đồng bộ bằng `socialPostIds` đã lưu (`content-generation-repository.ts:97`) qua cổng SocialFlow | **UQ12** (API SocialFlow) |
| UJ-22 | JE1 | Lưu tiến độ hành trình vào `journey_runs` (có sẵn: `manifest_id`, `status`, `context_snapshot`, `created_by`); bước điều hướng mang `?journey=<id>`; trang chủ hiện "Tiếp tục hành trình" | Màn mới → PO duyệt UX |
| UJ-23 | A1 | Thẻ chào: mọi đường huỷ gọi `releaseOrderBooking` trong cùng giao dịch | Gỡ băng B1 cho đúng thay đổi này |
| UJ-24 | D1 | Chọn một SSOT hành trình đa ngành; lưu trữ `_BACKUP`, gộp tài liệu trùng; thêm hành trình "Đơn hàng đa nguồn" và "Huỷ/đổi/hoàn" | PO chỉ định SSOT |
| UJ-25 | I1 | `DISABLED_BY_UPPER → CONNECTING` (kiểm lại trước khi `ACTIVE`); cho khoá ở `DRAFT/CONNECTING`; `CONNECTING` quá 30 phút → `ERROR` trong `integrations-sweep` | Không |

## 6. Câu hỏi cho PO

| # | Câu hỏi | Đề xuất mặc định | Chặn |
|---|---|---|---|
| UQ1 | Ghi ưu đãi + phí ship của báo giá vào đơn thế nào? (a) dòng "Phí giao hàng" + điều chỉnh giảm lưu ở `pricing_rule_ref`, tổng do domain tính — không đổi schema; (b) thêm cột `discount_vnd`, `shipping_fee_vnd` vào `orders` **[SCHEMA]** | (a) ngay, (b) khi làm hoá đơn VAT (BL WP-21) | UJ-08 |
| UQ2 | Liên kết Chuỗi do tổ chức không phải Chuỗi tạo trước đây: giữ, tạm ngưng hay chấm dứt? Lời mời hết hạn sau bao lâu? | Chấm dứt + báo cửa hàng; lời mời 7 ngày | UJ-01 (dữ liệu), UJ-10 |
| UQ3 | Thêm người: giữ hai đường (tài khoản nhân viên cho người mới, lời mời cho người đã có tài khoản)? | Giữ hai đường như trên | UJ-14 |
| UQ4 | Lead "Đã chốt" tính từ lúc nào? | Khi đơn ghi nhận tiền đầu hoặc được duyệt giao trước | UJ-13 |
| UQ5 | Đơn chưa thu ngoài Thẻ chào tự huỷ sau bao lâu; nguồn nào áp dụng? | 24 giờ cho catalog/landing; đơn nhập tay/báo giá không tự huỷ, chỉ nhắc | UJ-12 |
| UQ6 | Ân hạn khi gói quá hạn (hiện khoá chỉ-xem ngay)? | 3 ngày ân hạn, vẫn nhận đơn | UJ-11 (phần ân hạn) |
| UQ7 | Dùng thử: giới hạn theo lượt, theo ngày hay cả hai? Hết dùng thử thì chuyển sang gói nào? | 50 lượt hoặc 14 ngày; chuyển màn chọn gói, dữ liệu giữ 30 ngày | UJ-15 |
| UQ8 | "Dùng thử ngay" có còn cần superadmin duyệt? | Giữ duyệt, đổi chữ thành "Đăng ký dùng thử" + báo thời gian duyệt dự kiến | UJ-16 |
| UQ9 | Đổi đơn sau khi chốt được tới bước nào? Ai duyệt? | Tới trước "Đang làm"; sale tạo, Điều hành duyệt, khách xác nhận qua link | UJ-17 |
| UQ10 | Khách tự Đồng ý/Từ chối báo giá và theo dõi đơn catalog trên link công khai? | Có, kèm xác minh người thật | UJ-18, UJ-19 |
| UQ11 | Dựng lại video sau khi đã dựng xong có tính credit? | Lần dựng lại đầu miễn phí, sau đó tính như lượt mới | UJ-20 |
| UQ12 | Có đồng bộ trạng thái đăng bài từ SocialFlow (cần API/khóa)? | Có, quét 15 phút qua cổng `publisher-provider` | UJ-21 |

## 7. Lịch dự kiến

| Tuần | Việc | Ghi chú |
|---|---|---|
| T1 (09–13/11) | UJ-01 → UJ-05 (P0) | Không chờ PO; UJ-01 làm đầu tiên |
| T1 | PO trả lời UQ1–UQ5, Q8 (BL) | Chặn phần lớn P1 |
| T2–T3 | UJ-06, UJ-07, UJ-11, UJ-25 (không cần PO) → UJ-08, UJ-09, UJ-10, UJ-13, UJ-14, UJ-12 theo câu trả lời | UJ-10 lớn nhất (~4 ngày) |
| T4+ | P2 theo thứ tự PO chọn | UJ-23 chỉ khi gỡ băng Thẻ chào |

## 8. Definition of done mỗi gói

1. Test đỏ tái hiện lỗi trên `main` đi trước bản sửa (ghi lệnh + kết quả đỏ → xanh trong mô tả PR).
2. Gate theo `CLAUDE.md`: typecheck + `lint:ratchet`; `npm test`; `test:tenant` + `test:platform` khi đụng route/dữ liệu/quyền
   (**blocking**, chỉ trên DB `*_test`); `lint:ux -- --check` khi đụng `.tsx`; `check:schemas:coordinator` khi đụng zod điều phối;
   `check:docs` khi đổi `06-api-specification.md`; `npm run build` khi đổi điều hướng; `pytest` khi đụng `workers/`.
   Không lỗi mới so với `main`.
3. Không tệp nào vượt 350 dòng hoặc tăng nếu đã vượt — tách khi sửa (sát ngưỡng: `control-tower-dashboard.tsx` 344, `order-detail-modal.tsx` 332, `prisma-partnership-repository.ts` 293).
4. Route mới công khai/không gác ghi vào `tests/unit/architecture/route-capability-guard.test.ts`; Screen Contracts cập nhật cùng commit.
5. Cập nhật mục 9 bên dưới và đánh dấu phát hiện "Đã sửa" trong `00-bao-cao-audit.md`; lỗi lặp lại → một dòng `AGENT_RULES.md` §14.

## 9. Theo dõi

| Đợt | Gói | Trạng thái |
|---|---|---|
| P0 | UJ-01 · UJ-02 · UJ-03 · UJ-04 · UJ-05 | Đã làm 07/11/2026 (nhánh `claude/beautiful-knuth-v2riw9`, mỗi gói một commit). Phát sinh khi làm: UJ-03 thêm hoàn bước khi đưa hàng đợi lỗi (video kẹt `RENDERING` không có job); UJ-05 test mới bắt thêm gợi ý "Theo dõi chiến dịch tiếp thị" → `/marketing` (404), trỏ lại `/quang-ba/chien-dich`; UJ-01 sửa giao diện đọc đúng `error.message`; **giữ** "liên kết lại = dùng lại dòng cũ, ACTIVE trở lại" vì là quyết định ADR-012 T-3b có test khoá (chỉ Chuỗi tự chấm dứt được nên không thêm rủi ro) — chặn hồi sinh một chiều chuyển sang UJ-10. Chưa làm trong P0: danh sách trang mồ côi dạng ratchet (UJ-05), liên kết "Xử lý ở Thẻ chào" trên thẻ đơn (UJ-02 — chỉ ẩn nút chuyển bước vì hai tệp giao diện sát 350 dòng) |
| P1 (không PO) | UJ-06 · UJ-07 · UJ-11 (trừ ân hạn) | Đã làm 07/11/2026. UJ-06: API mời từ chối email chưa có tài khoản; phát hiện thêm hộp thoại "Mời" **không được gắn vào màn nào** — "Thêm nhân viên" với email đã có tài khoản trả 409 "dùng Mời" là ngõ cụt thật trên giao diện → đưa vào UJ-14 (UQ3). UJ-07: phiếu xem trước không còn bịa thiệp/phí ship/"undefined"; thông điệp job + phân tích ảnh dùng nhãn tiếng Việt (test kiến trúc khoá); "chờ duyệt" ở hai bảng điều khiển dùng chung nguồn màn Duyệt. UJ-11: hết hạn báo giá + vòng đời gói chạy trong cron sẵn có (không đổi `render.yaml`), GET báo giá không ghi nữa; 4 bộ quét `setInterval` bọc khoá cụm `runExclusive`. Thêm: bảng nhãn bước job (`jobs/domain/job-stage-labels.ts`) cho màn chi tiết tác vụ và "Trung tâm tăng trưởng" — trước hiện thẳng `RENDERING`, `VEO_SUBMITTING` (lộ cả tên nhà cung cấp) |
| P2 | UJ-25 | **Không làm** — đối chiếu mã: `DISABLED_BY_UPPER` và `CONNECTING` không có đường ghi nào, nên I1 chưa xảy ra được. Phân loại lại: chức năng "tầng trên tắt kết nối tích hợp" chưa được hiện thực (chỉ có nhãn giao diện) — cần PO xác nhận phạm vi |
| P1 [PO] | UJ-08 · UJ-10 · UJ-12 · UJ-13 · UJ-14 | Đã làm 07/11/2026 theo phương án mặc định (người dùng yêu cầu "tiếp tục thực hiện"). UJ-08: ưu đãi + phí ship lưu là điều chỉnh cấp đơn (`pricing_rule_ref.quotationAdjustment`) — **không** thành dòng hàng để khỏi lọt vào phiếu thợ; tổng đơn = tổng báo giá, lệch thì không tạo đơn. UJ-13: lead "Đã chốt" khi đơn vào Điều phối; huỷ đơn → "Theo dõi" + gỡ liên kết; báo giá bị từ chối → "Theo dõi". UJ-14: phát hiện thêm không có giao diện chuyển tổ chức nào → thêm "Tổ chức của tôi" ở menu tài khoản. UJ-10: lời mời `PENDING` 7 ngày, thẻ "Liên kết chuỗi" ở `/cai-dat`, 3 sự kiện thông báo; **không** đụng các liên kết đã có (thao tác phá huỷ dữ liệu — PO quyết). UJ-12: công tắc theo cửa hàng **mặc định tắt**, PO bật khi chốt |
| P1 [PO] | UJ-09 (Q8) | ~~Chờ PO~~ — **hết chặn 12/11/2026**: PO đã chốt Q8 ngày 07/11 (giao diện sửa ở `ab22f9bf`); phần máy chủ còn làm, gộp thêm R2-06 (xem `03-doi-chieu-2026-11-12.md` §6) |
| P2 | UJ-15 … UJ-25 | Chờ PO / gỡ băng / [SCHEMA]. **UJ-23 hết chặn 12/11/2026**: PO đã gỡ đóng băng Thẻ chào ngày 07/11 (`business-logic-upgrade.md` §9) → đưa lên P1 |
| P1 | UJ-23 | Đã làm 12/11/2026: `availability/infra/order-booking-hold.ts` — 5 đường huỷ (Sổ đơn, Điều phối, Thẻ chào: sổ thu/hết hạn, duyệt đề xuất huỷ, bỏ hiển thị) trả `product_bookings` cùng chỗ với `returnStock`; khôi phục đơn bỏ hiển thị giữ lại phòng, phòng đã có người đặt → 409. Test `tests/tenant/order-booking-release.test.ts` |
| P1 | UJ-09 | Đã làm 12/11/2026 (phần máy chủ): `PATCH /orders/:id` đi qua `editOrder` — đơn đã sang Điều phối đổi `status`/`productionStatus`/`deliveryStatus` → 409; đơn hoàn tất / đã huỷ chỉ sửa `internalNote` (O3, `order-lifecycle.ts`); mỗi lần sửa ghi `audit_logs` `order.update` (`edit-order.ts`, trả nợ #204 cho `orders/[id]`). **Chưa làm** R2-06 ("Báo xong" của thợ vẫn đổi trục chế tác) — chờ UQ16 cùng UJ-29. Test `tests/tenant/order-progress-coordination.test.ts`, `orders/domain/__tests__/order-lifecycle-edit.test.ts` |
| Đối chiếu 12/11 | UJ-26 … UJ-31, UJ-05b | Gói mới từ phát hiện R2-01 … R2-10 và câu hỏi UQ13–UQ17: `03-doi-chieu-2026-11-12.md` §6–7 |
