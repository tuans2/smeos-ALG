# Kế hoạch hoàn thiện Chat nội bộ Chuỗi ↔ Chi nhánh / Cửa hàng đối tác

**Trạng thái:** DRAFT v2 — chờ PO duyệt · **Nhánh:** `Hoanthien_chatnoibo` (tách từ `main` @ `2dfd6a02`) · **Lập:** 09/11/2026 · **Hoàn thiện v2:** 09/11/2026
**Module:** `src/modules/internal-chat/` · **Màn:** `/tin-nhan` · **Đặc tả gốc:** `docs/dac-ta/20-internal-chat-and-dispatch-spec.md` · **Screen Contract:** `docs/dac-ta/screen-contracts/tin-nhan.md`

> v2 đã đối chiếu từng dòng ở §2 với code thật (không dựa tài liệu). Thay đổi so với v1: xem §9.

---

## 1. Mục tiêu & phạm vi

Chuỗi điện hoa (Điều hành, Điều phối) trao đổi trực tiếp trong smeOS với:

- **Cửa hàng đối tác** — tổ chức riêng, liên kết qua `organization_links` (`SUBCONTRACTOR` / `FRANCHISE`): mỗi liên kết ACTIVE có sẵn **một phòng**; mọi nhân viên có quyền ở cả hai bên vào được, không phụ thuộc người đã tạo phòng.
- **Chi nhánh nội bộ** — dòng `branches` trong *cùng* tổ chức chuỗi (nhân viên có `memberships.branch_id`): mỗi chi nhánh một phòng với văn phòng chuỗi (D10).

Kèm theo:

- Điều phối **gửi đơn vào phòng**; bên nhận bấm **Nhận / Từ chối**, kết quả đi thẳng vào trạng thái gia công thật — cùng nguồn sự thật với luồng bắn đơn Telegram/Zalo (D5, D9).
- Gửi chữ và ảnh; tin mới đến **tức thì**, có **thông báo** và **số chưa đọc** đúng.
- Cách ly tuyệt đối giữa các tổ chức, kể cả khi `DB_RLS_MODE=enforce`.

**Ngoài phạm vi đợt này:** phòng Nền tảng ↔ Khách hàng (`PLATFORM_TENANT` — chặn tạo từ client ở GĐ1), thẻ duyệt QC trong chat (QC đã có ở `/duyet`), gọi thoại/video, xoá/sửa tin, "đã xem" theo từng người.

## 2. Hiện trạng (đã kiểm với code, 09/11/2026)

| # | Nhóm | Vấn đề | Vị trí |
|---|---|---|---|
| H1 | Bảo mật | Bấm thẻ không nạp tin, không kiểm người tham gia / loại tin / trạng thái / tổ chức được giao (`currentPayload = {}`) → người của **bất kỳ** tổ chức nào biết `messageId` đổi được thẻ, kèm tin hệ thống "Đối tác ĐÃ CHẤP NHẬN" | `use-cases/handle-card-action.ts:21-49` |
| H2 | Bảo mật | Client tự gửi được `SYSTEM_NOTICE` / `ACTION_CARD_*` + `actionPayload` tuỳ ý, và `attachments` là chuỗi URL tuỳ ý (link lạ hiện như ảnh) | `api/v1/internal-chat/conversations/[id]/messages/route.ts:9-14` |
| H3 | Bảo mật | Đối tác bị **tạm dừng / chấm dứt** liên kết vẫn đọc/gửi được — chỉ kiểm `isParticipant` | `send-chat-message.ts:25`, `get-conversation-messages.ts:21` |
| H4 | Bảo mật | Client tạo được phòng `PLATFORM_TENANT`; không giới hạn độ dài tin / lý do từ chối | `conversations/route.ts:10-16`, `messages/[id]/action/route.ts:7-10` |
| H5 | Bảo mật | `/tin-nhan` có trong `LOCKED_ROUTE_PREFIXES` (PO 25/10/2026) nhưng **không có** `layout.tsx` gắn `FeatureLockedGuard` → production vào thẳng URL được | `src/lib/feature-lock.ts:40`, `app/(app)/tin-nhan/` |
| H6 | Dữ liệu | Lấy 50 tin **cũ nhất** (`asc` + `take`) → phòng > 50 tin không thấy tin mới; route GET bỏ qua `before`/`limit` | `infra/prisma-chat-repository.ts:221-225`, route messages `:16-32` |
| H7 | Dữ liệu | Bấm thẻ **ghi đè** cả `action_payload` → mất mã đơn, giá, ảnh; không có điều kiện → hai người bấm cùng lúc đều "thắng" | `prisma-chat-repository.ts:247-259` |
| H8 | Dữ liệu | Số chưa đọc chỉ 0/1; "tên khách" lấy `recipientName`; địa chỉ hiển thị JSON thô | `prisma-chat-repository.ts:101`, `coordinator/orders/[id]/dispatch-to-chat/route.ts:42-46,56` |
| H9 | Dữ liệu | Mỗi lần `POST /conversations` không có `orderId` đều tạo phòng **mới** (không có khoá chống trùng) | `create-or-get-conversation.ts:56` |
| H10 | Dữ liệu | Gửi lại đơn cho đối tác khác dùng **chung** luồng theo `orderId` → đối tác cũ vẫn thấy thẻ mới; thẻ cũ vẫn "Chờ nhận" | `dispatch-order-to-chat.ts:26,57` |
| H11 | Thiếu | Phòng đối tác chỉ tạo khi *cấp tài khoản mới*, lỗi bị nuốt im lặng (`catch {}`); liên kết cửa hàng có sẵn / liên kết lại không có phòng; chỉ 2 người trong phòng | `chain-partnership/use-cases/provision-partner-account.ts:21-46`, `infra/prisma-partnership-repository.ts:223` |
| H12 | Thiếu | Gửi đơn vào chat mà không chỉ định người nhận → không ai bên đối tác thấy phòng | `dispatch-order-to-chat.ts:37-43` |
| H13 | Thiếu | Không có nút gửi đơn vào chat trên giao diện; thẻ không gắn trạng thái gia công thật | `greeting-card/use-cases/handle-subcontract-claim.ts`, `commit-subcontract-claim.ts` |
| H14 | Thiếu | Không ảnh, không realtime (hỏi lại 5 s/15 s, mỗi lần hỏi lại đánh dấu đã đọc kể cả khi tab ẩn), không thông báo; widget nổi không được gắn ở đâu | `app/(app)/tin-nhan/page.tsx:63-75`, `components/internal-chat/internal-chat-widget.tsx` |
| H15 | Rủi ro | RLS: phòng và tin mang `organization_id` của chuỗi → khi `enforce`, đối tác **không đọc được** và **không ghi được** tin (WITH CHECK) | `migrations/20261106020000_row_level_security/migration.sql:663-689` |
| H16 | UI | Chữ cứng (TD #189); nhãn "Đa ngành SaaS", "Hỗ trợ SaaS Platform"; thiếu 6 trạng thái; `isSender={false}` cứng → bên giao đơn vẫn thấy nút Nhận; mục menu không gắn năng lực; nhãn sai "Hộp thư khách hàng" | `tin-nhan/page.tsx:118,176,250,290`, `nav/nav-store-entries.ts:216-222`, `toolkit/domain/app-page-tools.ts:34` |
| H17 | Test | Unit test hiện tại **khẳng định hành vi lỗi**: người không tham gia nhận được thẻ; thẻ gửi qua `SendChatMessageUseCase` từ client | `use-cases/internal-chat.test.ts:175-205` |
| H18 | Tài liệu | Danh sách route không gắn năng lực ghi "use-case kiểm người tham gia" cho route bấm thẻ — sai với code | `tests/unit/architecture/route-capability-guard.test.ts:57-59` |

**Phát hiện then chốt cho GĐ4:** luồng bắn đơn Telegram/Zalo chọn ứng viên từ bảng `branches` **của chính tổ chức chuỗi** (`greeting-card/infra/chain-branch-repository.ts:97-108`), trạng thái lưu theo `branchId`. Hiện **không có** cột nào nối `branches` với tổ chức đối tác (`organization_links.child_org_id`). Ngoài ra "Nhận" trong luồng đó là bước **claim** (`claimSubcontractUseCase` → `CLAIMED_GRACE`, có thời gian huỷ nhận) — `commitSubcontractClaim` là bước **chốt** sau đó. → cần D9, và D5 được sửa lại.

## 3. Quyết định cần PO chốt (Giai đoạn 0)

| # | Câu hỏi | Khuyến nghị | Vì sao cần PO | Chặn |
|---|---|---|---|---|
| D1 | Quyền vào phòng: mời từng người hay **theo tổ chức + năng lực**? | **Theo tổ chức (và chi nhánh) + năng lực**: mọi thành viên ACTIVE có mã chat của chuỗi và của bên kia đều vào được; `internal_chat_participants` chỉ còn lưu đã đọc / tắt tiếng (tạo khi mở lần đầu) | Đổi mô hình phân quyền | GĐ2 |
| D2 | Mã năng lực | Thêm 2 mã nhóm mới `internal_chat` trong `capability-catalog.ts` (+ seed): **dùng trao đổi nội bộ** (mọi vai mặc định) và **quản lý phòng / gửi đơn vào trao đổi** (`dieu_hanh`, `dieu_phoi`). Không dùng lại `T1/T2` (đó là hội thoại khách hàng/AI). Route gửi đơn vẫn giữ `R3` | Thêm mã RBAC | GĐ2 |
| D3 | Sửa `prisma/schema.prisma` (một migration `prisma migrate dev`) | `internal_chat_conversations`: thêm `counterpart_org_id String?` (FK `organizations`, index) và `branch_id String?` (FK `branches`, index); unique một phần `(organization_id, conversation_type, counterpart_org_id)` cho `CHAIN_PARTNER` và `(organization_id, conversation_type, branch_id)` cho `CHAIN_BRANCH`. `internal_chat_messages`: thêm `counterpart_org_id`, trigger sao từ phòng như `organization_id` | Mọi thay đổi schema | GĐ2, GĐ3 |
| D4 | RLS phòng liên tổ chức | Policy 2 bảng phòng + tin: `USING` **và** `WITH CHECK` cho phép khi `organization_id = app.org_id` **hoặc** `counterpart_org_id = app.org_id`. `participants` giữ nguyên (dòng mang tổ chức của chính người đó). Không dùng cửa `rls_system` | Chạm sàn cách ly tenant | GĐ3 |
| D5 | Thẻ "Nhận đơn" và luồng bắn đơn | **Một nguồn sự thật**: *Nhận* trên thẻ = `claimSubcontractUseCase` (vào thời gian huỷ nhận như Telegram), *Chốt làm ngay* = `commitSubcontractClaim`, *Từ chối* = bỏ qua lời mời. Thẻ chỉ phản chiếu trạng thái gia công, không tự giữ trạng thái riêng | Quy trình điều phối | GĐ4 |
| D9 | Ánh xạ ứng viên bắn đơn ↔ tổ chức đối tác (mới) | Thêm `branches.partner_org_id String?` (FK, unique theo `organization_id`) trong **cùng** migration D3: đối tác có tài khoản smeOS xuất hiện như một ứng viên bắn đơn; chat là thêm một kênh mời cạnh Telegram/Zalo. Phương án thay: thẻ chat là kênh riêng chỉ cho đối tác, không qua bộ máy vòng mời (đơn giản hơn nhưng hai nguồn sự thật) | Schema + nghiệp vụ điều phối | GĐ4 |
| D10 | Phòng chi nhánh nội bộ (mới) | Có, loại `CHAIN_BRANCH` (cột `branch_id` ở D3): văn phòng chuỗi + nhân viên có `memberships.branch_id` khớp. Cùng tổ chức nên không cần RLS mới | Mở rộng phạm vi | GĐ2 |
| D6 | Gửi ảnh (tính năng người dùng tải ảnh lên) | Ảnh chat **không** chạy chặng nào trong 14 chặng hành trình sản phẩm; lưu qua `StorageProvider`, khoá `org/<tổ chức chủ phòng>/chat/<phòng>/…`, chỉ JPEG/PNG/WebP, ≤ 10 MB, ≤ 5 ảnh/tin, URL ký có hạn | Quy định CLAUDE.md về ảnh tải lên | GĐ6 |
| D7 | Đối tác bị tạm dừng / chấm dứt liên kết | `SUSPENDED`: chỉ đọc, không gửi, không nhận đơn mới. `TERMINATED`: mất quyền đọc và gửi (404). Lịch sử giữ lại cho chuỗi. *(GĐ1 áp mặc định an toàn: mọi trạng thái khác ACTIVE → 404, nới cho `SUSPENDED` sau khi PO chốt)* | Chính sách dữ liệu | GĐ2 |
| D8 | Widget nổi và mở khoá production | Bỏ widget, giữ một màn `/tin-nhan` + số chưa đọc trên menu (Progressive Disclosure). Mở khoá production (xoá `/tin-nhan` khỏi `LOCKED_ROUTE_PREFIXES`) chỉ sau nghiệm thu GĐ8 | UX do PO khoá | GĐ7 |

> **GĐ1 không phụ thuộc quyết định nào** → làm ngay sau khi PO duyệt kế hoạch. Gom D3 + D4 + D9 vào **một** migration để chỉ một lần `npm run db:deploy`.

## 4. Các giai đoạn

Mỗi giai đoạn = một hoặc vài commit Conventional Commits trên `Hoanthien_chatnoibo`, đủ gate (§5) trước khi sang giai đoạn sau. Ước lượng: S ≈ ½ ngày, M ≈ 1–2 ngày, L ≈ 3+ ngày.
Giới hạn 350 dòng: `prisma-chat-repository.ts` đang 301 dòng → tách `prisma-chat-message-repository.ts` (tin, đọc, thẻ) ngay ở GĐ1 trước khi thêm logic.

### GĐ1 — Vá bảo mật & lỗi dữ liệu (P0 · M · không cần PO)

| Mã | Việc | Sửa H | Tệp chính |
|---|---|---|---|
| IC-1.1 | `HandleCardActionUseCase`: nạp tin + phòng (`findMessageById` mới trên port); người gọi vào được phòng (theo cơ chế hiện tại); tin là `ACTION_CARD_ORDER`; trạng thái `PENDING_ACCEPT`; tổ chức người gọi = `assignedPartnerOrgId` và khác người gửi. Sai → 404; đã xử lý → 409. `senderRole` của tin hệ thống lấy từ vai thật | H1 | `use-cases/handle-card-action.ts`, `domain/repositories/chat-repository.interface.ts` |
| IC-1.2 | Cập nhật thẻ **gộp** payload và có điều kiện (`updateMany` khi `action_payload->>'status' = 'PENDING_ACCEPT'`; 0 dòng → 409) | H7 | `infra/prisma-chat-message-repository.ts` |
| IC-1.3 | API gửi tin: client chỉ được `TEXT`, không `actionPayload`, không `attachments` (mở lại ở GĐ6 qua route tải ảnh); `content` ≤ 4 000 ký tự; `rejectedReason` ≤ 500. Thẻ / tin hệ thống chỉ sinh từ use-case máy chủ (`DispatchOrderToChat`, `HandleCardAction` gọi thẳng repository) | H2, H4 | route messages, route action, `send-chat-message.ts` |
| IC-1.4 | Đọc/gửi/bấm thẻ: nếu người gọi khác tổ chức chủ phòng thì liên kết chuỗi–đối tác phải còn ACTIVE (`isAllowedChatTarget` đã có ở `partner-link-guard.ts`), khác → 404 | H3 | `send-chat-message.ts`, `get-conversation-messages.ts`, `handle-card-action.ts` |
| IC-1.5 | Lấy **tin mới nhất** (`desc` + `take` rồi đảo), route nhận `before` (ISO) + `limit` (≤ 100), trả `nextCursor` | H6 | message repository, route messages |
| IC-1.6 | Số chưa đọc thật: đếm tin sau `last_read_at`, trừ tin của mình (một truy vấn `groupBy`, không N+1) | H8 | conversation repository |
| IC-1.7 | Thẻ đơn: `customerName` từ khách của đơn, địa chỉ ghép thành chữ (`đường, phường, quận, tỉnh`) | H8 | `dispatch-to-chat/route.ts` |
| IC-1.8 | `POST /conversations`: từ chối `PLATFORM_TENANT` từ client (400); phòng không theo đơn → tìm phòng sẵn có cùng người tạo + người được mời trước khi tạo mới | H4, H9 | `conversations/route.ts`, `create-or-get-conversation.ts` |
| IC-1.9 | Thêm `app/(app)/tin-nhan/layout.tsx` gắn `FeatureLockedGuard route="/tin-nhan"` (thực thi đúng khoá PO 25/10/2026 đã có) | H5 | layout mới |
| IC-1.10 | `provision-partner-account.ts`: thay `catch {}` bằng ghi log có cấu trúc (không PII) để phát hiện đối tác không có phòng | H11 | `chain-partnership/use-cases/provision-partner-account.ts` |
| IC-1.11 | Viết lại unit test đang khẳng định hành vi lỗi (không tắt/skip): ca cũ đổi thành "người không được giao → 404, payload không đổi" | H17 | `use-cases/internal-chat.test.ts` |
| IC-1.12 | Sửa mô tả ở danh sách route không gắn năng lực; thêm dòng `AGENT_RULES.md` §14 ("ghi chú nói use-case kiểm quyền nhưng code không kiểm") | H18 | `route-capability-guard.test.ts`, `.agents/AGENT_RULES.md` |

**Test bắt buộc**
- Unit: mỗi nhánh lỗi của IC-1.1 (tin không tồn tại, không phải thẻ, đã xử lý, sai tổ chức, người gửi tự bấm), IC-1.2 (đua: lần 2 → 409), IC-1.3 (`SYSTEM_NOTICE`/`actionPayload`/`attachments` → 400), IC-1.5 (120 tin → trả 50 mới nhất, `before` trả trang kế), IC-1.6 (3 tin của người khác → 3; tin của mình → 0).
- Tenant (`tests/tenant/internal-chat-isolation.test.ts`): tổ chức thứ ba bấm thẻ → 404 và payload không đổi; đối tác `TERMINATED` đọc/gửi → 404; client gửi `SYSTEM_NOTICE` → 400; client tạo `PLATFORM_TENANT` → 400.

**Nghiệm thu:** không còn đường nào đổi thẻ của tổ chức khác hoặc giả tin hệ thống; phòng 120 tin thấy tin mới nhất; `/tin-nhan` hiện "Sắp ra mắt" khi `NEXT_PUBLIC_APP_ENV=production`.

### GĐ2 — Phòng theo đối tác & chi nhánh (P1 · L · cần D1, D2, D3, D7, D10)

| Mã | Việc |
|---|---|
| IC-2.1 | Migration D3 (+ D4, D9 nếu đã chốt) → `npx prisma generate` → `npm run gen:tenant-registry`; cập nhật đặc tả 07 cùng commit |
| IC-2.2 | Use-case `ensurePartnerConversation(chainOrgId, partnerOrgId)` và `ensureBranchConversation(chainOrgId, branchId)` idempotent (dựa unique D3, bắt lỗi trùng = trả phòng có sẵn). Gọi khi: cấp tài khoản đối tác (thay đoạn tạo phòng ở `provision-partner-account.ts`), liên kết cửa hàng có sẵn, lời mời được chấp nhận / liên kết trở lại ACTIVE (`chain-invitation-repository.ts:49`, `prisma-partnership-repository.ts:193`), tạo chi nhánh |
| IC-2.3 | Script backfill `scripts/backfill-chat-rooms.ts` (`--dry-run` mặc định, `--apply` mới ghi): tạo phòng cho mọi liên kết ACTIVE/SUSPENDED và mọi chi nhánh đang hoạt động; gắn `counterpart_org_id` cho phòng `CHAIN_PARTNER` cũ từ `metadata.partnerOrgId` |
| IC-2.4 | Hàm miền thuần `canAccessConversation({ userOrgId, userBranchId, capabilities }, conversation, linkStatus)` → `NONE` / `READ` / `READ_WRITE` thay cho `isParticipant`; bản ghi participant tạo khi mở lần đầu |
| IC-2.5 | Gắn mã D2 bằng `requireCapability()` cho 3 route chat + route mới; xoá chúng khỏi danh sách route không gắn năng lực; gắn `capability` cho mục menu `/tin-nhan` |
| IC-2.6 | `POST /internal-chat/conversations` nhận `{ partnerOrgId }` hoặc `{ branchId }` → mở hoặc tạo phòng. Nút "Nhắn tin" sẵn có ở `dieu-phoi/doi-tac/page.tsx:185`, `noi-bo/ket-noi/chain-partners-tab.tsx:71,114`, `noi-bo/ket-noi/page.tsx:172` mở thẳng `/tin-nhan?phong=<id>` |
| IC-2.7 | Danh sách phòng hiển thị tên bên kia theo phía người xem (chuỗi thấy tên cửa hàng, đối tác thấy tên chuỗi), không chỉ `title` lưu sẵn |

**Test:** tenant — chuỗi B không thấy phòng chuỗi A ↔ đối tác; nhân viên mới của đối tác thấy phòng ngay; liên kết hai lần / chấp nhận lời mời hai lần không sinh hai phòng; backfill chạy lại không nhân đôi; nhân viên chi nhánh X không thấy phòng chi nhánh Y; `SUSPENDED` đọc được nhưng gửi → 404 (theo D7). Unit — bảng chân trị `canAccessConversation`.

### GĐ3 — RLS cho phòng liên tổ chức (P1 · M · cần D4)

| Mã | Việc |
|---|---|
| IC-3.1 | Thay policy `tenant_isolation` của `internal_chat_conversations` và `internal_chat_messages` theo D4 (cả `USING` và `WITH CHECK`), cùng migration IC-2.1 nếu được |
| IC-3.2 | Ca tenant chạy với `DB_RLS_MODE=enforce`: đối tác đọc **và gửi** được trong phòng chung; tổ chức thứ ba không thấy dòng nào; thử ghi tin với `organization_id` lạ → bị chặn |
| IC-3.3 | Ghi vào checklist chuyển `audit → enforce` (`docs/adr/ADR-013.md`) và `TRANG_THAI.md` |

### GĐ4 — Gửi đơn vào phòng & thẻ gắn trạng thái gia công thật (P1 · L · cần D5, D9)

| Mã | Việc |
|---|---|
| IC-4.1 | Port `SubcontractClaimPort` trong `internal-chat/domain` (`claim`, `commit`, `decline`, `getState`); adapter trong `internal-chat/adapters/` gọi `claimSubcontractUseCase` / `commitSubcontractClaim` của `greeting-card` qua `branches.partner_org_id` (D9). Không import infra chéo module, không đổi hàm gốc |
| IC-4.2 | Nhận trên thẻ = claim (thẻ hiện "Đang giữ đơn — còn N phút huỷ nhận" + nút *Chốt làm ngay*); đơn đã có nơi nhận qua Telegram/Zalo/chi nhánh khác → claim trả conflict → thẻ chuyển "Đã có nơi nhận" |
| IC-4.3 | Trạng thái gia công đổi (claim, huỷ nhận, chốt, huỷ đơn, hoàn tất) → cập nhật thẻ + tin hệ thống trong phòng (hook sau giao dịch ở repository gia công, không gửi trong giao dịch) |
| IC-4.4 | Gửi đơn vào phòng **đối tác** (không còn tạo luồng `ORDER_THREAD` chung theo `orderId`); gửi lại cho đối tác khác → thẻ cũ chuyển "Đã chuyển nơi khác" (sửa H10, H12) |
| IC-4.5 | Nút "Gửi đơn vào trao đổi" ở màn điều phối và chi tiết đơn: hộp chọn đối tác ACTIVE → gọi `dispatch-to-chat` |
| IC-4.6 | Tab "Trao đổi" trong chi tiết đơn lọc các thẻ + tin liên quan đơn trong phòng đối tác đã nhận |
| IC-4.7 | Ẩn nút Nhận/Từ chối với bên giao đơn: `isSender` tính từ `senderUserId`/tổ chức, bỏ `isSender={false}` cứng |

**Test:** unit với port giả; tenant — nhận qua chat và qua link Telegram cùng lúc → chỉ một bên thắng, bên kia thấy "Đã có nơi nhận"; tổ chức không được giao không nhận được (404); gửi lại cho đối tác khác → đối tác cũ không thấy thẻ mới; huỷ nhận trong thời gian ân hạn → thẻ quay lại "Chờ nhận" và vòng mời tiếp tục.

### GĐ5 — Tin tức thì & thông báo (P2 · M · không thêm dependency)

| Mã | Việc |
|---|---|
| IC-5.1 | `GET /internal-chat/stream` (SSE) theo mẫu `api/v1/notification/stream/route.ts` (ping 25 s, gỡ khi `abort`); kiểm quyền từng phòng trước khi đẩy. Hub trong bộ nhớ + Redis pub/sub qua `src/core/cache/redis-client.ts` khi có `REDIS_URL` (`ioredis` đã có) để chạy nhiều instance |
| IC-5.2 | Giao diện dùng SSE; mất kết nối → hỏi lại 30 s/lần; chỉ đánh dấu đã đọc khi tab đang hiển thị (`document.visibilityState`) |
| IC-5.3 | Sự kiện `internal_chat.message_received` trong danh mục `notification/domain/events/` (skill notifications: tầng, deep link `/tin-nhan?phong=<id>`); tôn trọng tắt tiếng; gộp tối đa 1 thông báo / phòng / người / 5 phút |
| IC-5.4 | Số chưa đọc trên mục menu "Trao đổi nội bộ" (một API đếm tổng, nhận cập nhật qua SSE) |

**Test:** unit hub (đăng ký/huỷ, không rò người ngoài phòng), gộp thông báo theo thời gian giả; tenant — người tổ chức thứ ba mở stream không nhận được sự kiện của phòng khác.

### GĐ6 — Ảnh đính kèm (P2 · M · cần D6)

| Mã | Việc |
|---|---|
| IC-6.1 | Route `POST /internal-chat/conversations/:id/attachments`: kiểm nội dung thật (magic bytes) theo skill storage, giới hạn loại/dung lượng D6, ghi qua `StorageProvider` + `buildStorageKey` (`assets/domain/storage-key.ts`), trả `attachmentId` |
| IC-6.2 | Gửi tin `IMAGE` chỉ nhận `attachmentId` do route trên cấp (không nhận URL); khai nguồn tham chiếu `STORAGE_REFERENCE_SOURCES` (`assets/infra/storage-registry-keys.ts`) + `storage-write-contract.test.ts`; trả URL ký có hạn khi đọc tin |
| IC-6.3 | Composer có nút đính kèm, xem trước, huỷ; hiển thị ảnh trong luồng, bấm để phóng to |

**Test:** unit kiểm nội dung (đuôi giả → 400, > 10 MB → 413); tenant — tổ chức thứ ba không lấy được URL ký của ảnh; `npm run storage:reconcile` không báo tệp mồ côi.

### GĐ7 — Hoàn thiện giao diện (P2 · M · cần D8)

| Mã | Việc |
|---|---|
| IC-7.1 | Tách `tin-nhan/page.tsx` (297 dòng) thành `ConversationList`, `MessageThread`, `MessageItem`, `Composer` trong `components/internal-chat/` (mỗi tệp ≤ 350 dòng) |
| IC-7.2 | Đủ 6 trạng thái (đang tải dạng khung, rỗng, lỗi, không có quyền, mất mạng, thành công); di động 1 cột (danh sách ↔ luồng); Enter gửi / Shift+Enter xuống dòng; WCAG 2.2 AA (vùng `aria-live` cho tin mới, tiêu điểm khi đổi phòng) |
| IC-7.3 | Từ điển `chat.*` vi/en (trả phần `/tin-nhan` của TD #189); bỏ "Đa ngành SaaS", "Hỗ trợ SaaS Platform"; sửa nhãn ở `app-page-tools.ts:34` thành "Trao đổi nội bộ" |
| IC-7.4 | Xoá `components/internal-chat/internal-chat-widget.tsx` (D8) |
| IC-7.5 | Cập nhật Screen Contract `tin-nhan.md` cùng commit; thêm ca `test:e2e:ux` cho `/tin-nhan` (390×844, 1280×800) |

### GĐ8 — Tài liệu & nghiệm thu (S)

- Đặc tả 06 (route mới + mã năng lực), 07 (cột/policy mới), 20 (trạng thái thật, thay §6 "Lộ trình" đã lỗi thời), 21 (phòng tự tạo khi cấp/liên kết), `TRANG_THAI.md` §4–6, `TECHNICAL_DEBT.md` #189 (đóng phần chat nội bộ).
- Sửa dòng 9.1 ở `docs/handover/BAO_CAO_ANH_XA_123_CHUC_NANG.md:189` (đang ghi "Hoàn thiện" do gộp khung trao đổi Thẻ Chào).
- Chạy kịch bản §8 cùng PO; PO quyết định mở khoá production (D8).

## 5. Cổng kiểm tra

| Gate | GĐ |
|---|---|
| `npm run typecheck && npm run lint:ratchet` | mọi GĐ |
| `npm test` | mọi GĐ |
| `npm run test:tenant` · `npm run test:platform` (chỉ DB `*_test`, kiểm `echo "[$DATABASE_URL]"` trước) | 1, 2, 3, 4, 5, 6 |
| `npm run lint:ux -- --check` | 1 (layout), 2, 4, 6, 7 |
| `npm run check:docs` | mọi GĐ có route/schema mới |
| `npm run build` · `npm run test:e2e:ux` | 7 |
| `npm run storage:reconcile` (chỉ đọc) | 6 |

Không báo xong khi còn gate đỏ **mới** so với `main` (so bằng `git worktree add /tmp/base origin/main`); lỗi có sẵn ghi "có sẵn".

## 6. Rủi ro & cách giảm

| Rủi ro | Giảm thiểu |
|---|---|
| Gắn thẻ với luồng gia công làm lệch Telegram/Zalo đang chạy production | Chỉ gọi qua port, không đổi hàm gốc; test đua đồng thời; bật kênh chat theo cờ trong `shopSettings` nếu PO muốn |
| Đổi policy RLS gây chặn nhầm khi chuyển `enforce` | Ca test `enforce` riêng; theo dõi log chế độ `audit` ít nhất một tuần trước khi chuyển |
| Migration lỗi trên production | Migration chỉ *thêm* cột nullable + index + policy (không xoá); có SQL hoàn tác ghi kèm trong PR; backfill tách riêng, chạy `--dry-run` trước |
| SSE nhiều instance mất tin | Redis pub/sub; client luôn có đường hỏi lại dự phòng |
| Backfill tạo phòng trùng | Unique ở D3 + chạy lại an toàn |
| D9 không được duyệt | GĐ4 chuyển sang phương án thay (thẻ chat là kênh riêng cho đối tác, khoá đồng thời theo đơn); GĐ5–7 không bị chặn |
| Môi trường chưa có Postgres `_test` | `docker compose up -d && npm run db:test:setup` trước GĐ1; không dựng được thì báo rõ gate bị chặn, không báo xong |

## 7. Thứ tự & ước lượng

`GĐ0 (PO chốt D1–D10)` ∥ `GĐ1` → `GĐ2 + GĐ3` (chung migration) → `GĐ4` → `GĐ5` ∥ `GĐ6` → `GĐ7` → `GĐ8`.

| GĐ | Cỡ | Ngày công | Chặn bởi |
|---|---|---|---|
| 1 | M | 1,5 | — |
| 2 | L | 3 | D1, D2, D3, D7, D10 |
| 3 | M | 1,5 | D4 |
| 4 | L | 3–4 | D5, D9 |
| 5 | M | 2 | — |
| 6 | M | 1,5 | D6 |
| 7 | M | 2 | D8 |
| 8 | S | 0,5 | — |
| **Tổng** | | **≈ 15–16** | |

PR chỉ mở khi PO yêu cầu; nên tách PR theo giai đoạn (GĐ1 riêng, GĐ2+3 chung) để duyệt nhỏ.

## 8. Kịch bản nghiệm thu cho PO

1. Điều hành chuỗi cấp tài khoản đối tác mới → phòng "Trao đổi: <tên cửa hàng>" có sẵn ở `/tin-nhan` của **cả hai** bên.
2. Liên kết một cửa hàng có sẵn → cửa hàng chấp nhận lời mời → phòng xuất hiện; nhân viên thứ hai của cửa hàng đăng nhập cũng thấy.
3. Hai bên nhắn qua lại → tin đến trong ≤ 2 giây, số chưa đọc trên menu tăng/giảm đúng, có thông báo khi đang ở màn khác.
4. Điều phối bấm "Gửi đơn vào trao đổi" ở chi tiết đơn → thẻ đơn hiện đúng mã, khách, địa chỉ chữ, giá, ảnh.
5. Đối tác bấm *Nhận* → thẻ "Đang giữ đơn"; chuỗi thấy cùng trạng thái ở màn điều phối; link Telegram của đơn đó báo "Đã có nơi nhận".
6. Đối tác *Chốt làm ngay* → đơn sang sản xuất; thẻ và tin hệ thống cập nhật.
7. Gửi 1 ảnh thành phẩm → bên kia xem được; người tổ chức khác dán URL không mở được sau khi hết hạn ký.
8. Chuỗi tạm dừng liên kết → đối tác chỉ đọc; chấm dứt → phòng biến mất khỏi đối tác, chuỗi vẫn xem lịch sử.
9. Mở `/tin-nhan` trên điện thoại (390 px): danh sách ↔ luồng một cột, đủ trạng thái rỗng/lỗi/mất mạng.

## 9. Nhật ký thay đổi kế hoạch

**v2 (09/11/2026)** — đối chiếu code:
- §2 thêm H4, H5, H9, H10, H12, H17 và số dòng thật cho mọi mục; ghi rõ RLS chặn cả *ghi* chứ không chỉ *đọc*.
- Phát hiện luồng Telegram dùng `branches` của chuỗi, không có ánh xạ sang tổ chức đối tác → thêm **D9**; sửa **D5**: "Nhận" = claim, "Chốt" = commit (v1 ghi nhầm cả hai là `commitSubcontractClaim`).
- Thêm **D10** (phòng chi nhánh nội bộ) vì mục tiêu có "chi nhánh" nhưng v1 không có cơ chế.
- **D7** thêm trường hợp `SUSPENDED`; **D4** thêm `WITH CHECK`; **D2** nêu rõ không dùng lại `T1/T2`.
- GĐ1 thêm IC-1.8 (chặn `PLATFORM_TENANT`, chống phòng trùng), IC-1.9 (gắn khoá `/tin-nhan` — chuyển từ GĐ7 vì PO đã khoá từ 25/10), IC-1.10 (log khi không tạo được phòng), IC-1.11 (viết lại test khẳng định lỗi); tách repository trước khi vượt 350 dòng.
- GĐ4 thêm IC-4.4 (gửi lại cho đối tác khác) và chuyển thẻ về phòng đối tác thay vì luồng chung theo đơn.
- Thêm test cho GĐ5, GĐ6; thêm bảng ước lượng (§7), rủi ro migration/D9 (§6), kịch bản nghiệm thu chi tiết (§8).
