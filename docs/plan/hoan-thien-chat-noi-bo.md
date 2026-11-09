# Kế hoạch hoàn thiện Trao đổi nội bộ — kênh giao & theo dõi đơn gia công Chuỗi ↔ Cửa hàng đối tác

**Trạng thái:** APPROVED v3 — PO duyệt kế hoạch và các khuyến nghị D1–D11 ngày 09/11/2026 · **Tiến độ:** GĐ1, GĐ2, GĐ3 xong (xem §10) · **Nhánh:** `Hoanthien_chatnoibo` (tách từ `main` @ `2dfd6a02`)
**Module:** `src/modules/internal-chat/` + `src/modules/greeting-card/` (luồng gia công) · **Màn:** `/tin-nhan` · **Đặc tả gốc:** `docs/dac-ta/20-internal-chat-and-dispatch-spec.md` · **Screen Contract:** `docs/dac-ta/screen-contracts/tin-nhan.md`

> v3 đổi trọng tâm theo PO: Trao đổi nội bộ **trước hết là kênh giao và thực hiện đơn**, nhắn tin tự do là phụ. Lịch sử thay đổi: §9.

---

## 1. Mục đích (PO chốt 09/11/2026)

Chuỗi giao đơn cho các cửa hàng đối tác **ngay trong smeOS**, theo đúng quy trình gia công đang chạy ở Thẻ Chào:

1. **Phân bổ tự động theo khu vực**: bộ máy `chain-dispatch-engine.ts` chấm điểm theo phường/tỉnh, toạ độ, sức chứa, điểm chất lượng, rồi mời theo vòng. Cửa hàng đối tác **xếp chung** với chi nhánh (PO trả lời câu 1).
2. Cửa hàng nhận **thẻ mời** trong phòng trao đổi với chuỗi → *Nhận* (ai trước được trước, có thời gian huỷ nhận) → *Chốt làm ngay* hoặc tự chốt khi hết hạn. Không ai nhận thì chuyển Điều phối.
3. Cửa hàng cập nhật tiến độ ngay trên thẻ: **ảnh thành phẩm** → **thông tin shipper** → **ảnh bàn giao**. Cách kiểm và duyệt ảnh giữ **y như Thẻ Chào** (PO trả lời câu 3).
4. Chuỗi thấy mọi đơn đang ở bước nào. Thẻ trong chat là **cùng một đơn, cùng trạng thái** với luồng Thẻ Chào, không phải bản sao.
5. **Telegram/Zalo vẫn chạy song song**, nhưng smeOS **khuyến khích dùng Trao đổi nội bộ** (PO trả lời câu 2) — xem D11.
6. Trong cùng phòng, hai bên **vẫn nhắn tin tự do** (hỏi mẫu, báo sự cố) và gửi ảnh (PO trả lời câu 4).

**Ngoài phạm vi:** phòng Nền tảng ↔ Khách hàng (`PLATFORM_TENANT`), gọi thoại/video, xoá/sửa tin, "đã xem" theo từng người, thay đổi thuật toán chấm điểm phân bổ.

## 2. Hiện trạng (đã kiểm với code)

### 2.1 Chat nội bộ

| # | Vấn đề | Vị trí |
|---|---|---|
| H1 | Bấm thẻ không nạp tin, không kiểm người / loại tin / trạng thái / tổ chức được giao → **bất kỳ** tổ chức nào biết `messageId` cũng đổi được thẻ | `internal-chat/use-cases/handle-card-action.ts:21-49` |
| H2 | Client gửi được `SYSTEM_NOTICE` / `ACTION_CARD_*` + `actionPayload` tuỳ ý; `attachments` là URL tuỳ ý | `api/v1/internal-chat/conversations/[id]/messages/route.ts:9-14` |
| H3 | Đối tác bị tạm dừng / chấm dứt liên kết vẫn đọc/gửi được | `send-chat-message.ts:25`, `get-conversation-messages.ts:21` |
| H4 | Client tạo được phòng `PLATFORM_TENANT`; không giới hạn độ dài tin / lý do | `conversations/route.ts:10-16`, `messages/[id]/action/route.ts:7-10` |
| H5 | `/tin-nhan` trong `LOCKED_ROUTE_PREFIXES` nhưng không có `layout.tsx` gắn `FeatureLockedGuard` → production vào thẳng URL được | `src/lib/feature-lock.ts:40` |
| H6 | Lấy 50 tin **cũ nhất**; route bỏ qua `before`/`limit` | `infra/prisma-chat-repository.ts:221-225` |
| H7 | Bấm thẻ ghi đè cả payload, không điều kiện → mất dữ liệu, hai người cùng "thắng" | `prisma-chat-repository.ts:247-259` |
| H8 | Chưa đọc chỉ 0/1; "tên khách" = tên người nhận; địa chỉ là JSON thô | `prisma-chat-repository.ts:101`, `coordinator/orders/[id]/dispatch-to-chat/route.ts:42-46,56` |
| H9 | Mỗi `POST /conversations` không có `orderId` tạo phòng mới | `create-or-get-conversation.ts:56` |
| H10 | Gửi lại đơn cho đối tác khác dùng chung luồng → đối tác cũ thấy thẻ mới | `dispatch-order-to-chat.ts:26,57` |
| H11 | Phòng đối tác chỉ tạo khi cấp tài khoản mới, lỗi bị nuốt (`catch {}`); liên kết có sẵn / liên kết lại không có phòng | `chain-partnership/use-cases/provision-partner-account.ts:21-46` |
| H12 | RLS: phòng + tin mang tổ chức của chuỗi → khi `enforce`, đối tác không đọc **và không ghi** được | `migrations/20261106020000_row_level_security/migration.sql:663-689` |
| H13 | Chữ cứng (TD #189), nhãn "Đa ngành SaaS"; `isSender={false}` cứng; menu không gắn năng lực; nhãn sai "Hộp thư khách hàng" | `tin-nhan/page.tsx:118,176,250`, `toolkit/domain/app-page-tools.ts:34` |
| H14 | Unit test đang **khẳng định hành vi lỗi** của H1 | `use-cases/internal-chat.test.ts:175-205` |
| H15 | Ghi chú route "use-case kiểm người tham gia" sai với code | `tests/unit/architecture/route-capability-guard.test.ts:57-59` |
| H16 | Tra phòng theo mã đơn không lọc tổ chức + tạo phòng gắn `orderId` của tổ chức khác → lệnh gửi đơn của chuỗi đăng thẻ đơn (người nhận, địa chỉ, giá) vào phòng của tổ chức lạ (phát hiện khi làm GĐ1) | `prisma-chat-repository.ts` `findConversationByOrderId`, `conversations/route.ts` |

### 2.2 Luồng gia công Thẻ Chào (nền để dùng lại)

| # | Hiện trạng | Hệ quả cho kế hoạch | Vị trí |
|---|---|---|---|
| G1 | Ứng viên phân bổ chỉ là dòng `branches` của **chính chuỗi**; không có cột nối sang tổ chức đối tác | Cửa hàng đối tác chưa thể vào vòng mời → cần D9 | `greeting-card/infra/chain-branch-repository.ts:97-108`, `schema.prisma:346` |
| G2 | Trạng thái gia công lưu ở `coordination.metadata.subcontract_dispatch` theo `branchId`; quyền xem đơn của nơi nhận ở `shared_order_access.branch_key` | Đối tác được nhận diện bằng `branch_key` của dòng `branches` ánh xạ — không cần bảng quyền mới | `domain/subcontract-order.ts:10-40`, `schema.prisma:2114` |
| G3 | Kênh mời chỉ có Telegram + Zalo (`MultiChannelDispatchNotifier`), có sửa lại thẻ khi đổi trạng thái (`editInviteCard`, `closeCardsAfterClaim`, `reopenCardsAfterCancel`) | Thêm **kênh thứ ba: thẻ trong Trao đổi nội bộ**, đi cùng cơ chế sửa thẻ sẵn có | `infra/dispatch-notification-adapter.ts:25-130`, `use-cases/invite-cards.ts` |
| G4 | "Nhận" = `claimSubcontractUseCase` (→ `CLAIMED_GRACE`); "Chốt" = `commitSubcontractClaim`; huỷ trong hạn → mời lại | Nút trên thẻ chat gọi đúng các use-case này | `use-cases/handle-subcontract-claim.ts`, `commit-subcontract-claim.ts` |
| G5 | Logic 3 bước thực hiện + xin bỏ qua bước **nằm thẳng trong route công khai** (kiểm chi nhánh, thứ tự bước, chờ khách duyệt ảnh, kiểm ảnh AI, phí trễ, báo khách/nhân viên) | Phải **tách thành use-case** trước, để link công khai và chat dùng chung một chỗ | `api/v1/public/subcontract/[orderCode]/{upload-qc,submit-shipper,submit-delivery,request-bypass}/route.ts` (268 / 138 / 282 / 109 dòng) |
| G6 | Thứ tự bước có luật chung `SUBCONTRACT_STEP_PRECONDITION`; ảnh thành phẩm có chờ khách duyệt (`subcontractPhotoApprovalBlocker`) và kiểm ảnh AI (`verifyQcPhotoWithAi`) | Dùng lại nguyên, không thêm chặng xử lý ảnh nào | `domain/subcontract-order.ts:228-260`, `use-cases/subcontract-photo-gate.ts`, `use-cases/verify-qc-photo-ai.ts` |
| G7 | Nhắc hạn (giao hàng, shipper, vòng mời) gửi qua kênh nhân viên | Nhắc hạn cũng đăng vào phòng đối tác | `use-cases/process-dispatch-reminders.ts`, `dispatch-shipper-reminders.ts`, `dispatch-delivery-reminders.ts` |
| G8 | Route công khai dựng ngữ cảnh tổ chức chuỗi từ token ký (không đăng nhập) | Từ chat: người dùng đăng nhập thuộc tổ chức đối tác → adapter kiểm quyền rồi dựng ngữ cảnh chuỗi giống route công khai, ghi rõ người thao tác | `use-cases/authorize-subcontract-branch.ts` |

## 3. Quyết định

### 3.1 Đã chốt (PO 09/11/2026)

| # | Nội dung |
|---|---|
| P1 | Cửa hàng đối tác có tài khoản smeOS **vào chung vòng phân bổ theo khu vực** với chi nhánh |
| P2 | Telegram/Zalo **giữ song song**; Trao đổi nội bộ là kênh được khuyến khích |
| P3 | Ảnh thành phẩm / ảnh bàn giao gửi từ chat **kiểm và duyệt y như Thẻ Chào** (không thêm chặng nào trong 14 chặng hành trình sản phẩm) |
| P4 | Phòng vẫn cho **nhắn tin tự do** kèm ảnh |

### 3.2 Đã duyệt theo khuyến nghị (PO 09/11/2026: "duyệt. Proceed thực hiện theo kế hoạch")

| # | Câu hỏi | Khuyến nghị | Chặn |
|---|---|---|---|
| D1 | Quyền vào phòng | Theo **tổ chức + năng lực**: mọi thành viên ACTIVE có mã (D2) của chuỗi và của đối tác đều vào được; `internal_chat_participants` chỉ lưu đã đọc / tắt tiếng | GĐ2 |
| D2 | Mã năng lực | 2 mã mới nhóm `internal_chat`: **dùng trao đổi nội bộ** (mọi vai) và **thực hiện đơn gia công** (nhận, chốt, gửi ảnh, nhập shipper — mặc định `dieu_hanh`, `dieu_phoi`, `cua_hang`, `tho_cam` bên đối tác). Không dùng lại `T1/T2` (hội thoại khách hàng) | GĐ2 |
| D3 | Migration (một lần, `prisma migrate dev`) | `internal_chat_conversations` + `counterpart_org_id`, `branch_id` (unique một phần theo loại phòng); `internal_chat_messages` + `counterpart_org_id` (trigger sao từ phòng) + `order_id` (lọc thẻ theo đơn); `branches` + `partner_org_id` (unique theo tổ chức, FK `organizations`) | GĐ2 |
| D4 | RLS phòng liên tổ chức | `USING` và `WITH CHECK` của phòng + tin: `organization_id = app.org_id` **hoặc** `counterpart_org_id = app.org_id`; không dùng `rls_system` | GĐ2 |
| D9 | Cách đưa đối tác vào vòng mời | Mỗi liên kết ACTIVE có **một dòng `branches`** trong chuỗi với `partner_org_id`, `accepts_dispatch = true`, khu vực và sức chứa chép từ `organization_links` (chuỗi sửa thêm toạ độ, phường lân cận ở màn chi nhánh sẵn có). Nhờ vậy dùng nguyên điểm chất lượng, số lần huỷ, phạt, `shared_order_access` | GĐ3 |
| D7 | Liên kết tạm dừng / chấm dứt | `SUSPENDED`: chỉ đọc, không nhận đơn mới (`accepts_dispatch = false`), **đơn đang làm vẫn hoàn tất được**. `TERMINATED`: 404; đơn đang giữ → chuyển Điều phối (`ESCALATED`) | GĐ3 |
| D11 | Cách "khuyến khích" dùng chat | (a) Đối tác có tài khoản **luôn** nhận thẻ trong chat; (b) tin Telegram/Zalo cho đối tác này có thêm nút **"Mở trong smeOS"** dẫn về đúng phòng; link công khai giữ làm dự phòng; (c) trang link công khai hiện gợi ý "Làm trong smeOS để theo dõi mọi đơn một chỗ"; (d) chuỗi xem tỉ lệ đơn xử lý qua chat. **Không** đổi điểm phân bổ theo kênh | GĐ6 |
| D10 | Phòng chi nhánh nội bộ (cùng tổ chức) | Có, loại `CHAIN_BRANCH` theo `branch_id` (D3); chi nhánh nội bộ cũng nhận thẻ mời như đối tác | GĐ2 |
| D8 | Widget nổi & mở khoá production | Bỏ widget; giữ màn `/tin-nhan` + số chưa đọc trên menu; mở khoá sau nghiệm thu GĐ10 | GĐ9 |

## 4. Các giai đoạn

Mỗi giai đoạn = một hoặc vài commit Conventional Commits, đủ gate (§5) mới sang bước sau. S ≈ ½ ngày, M ≈ 1–2 ngày, L ≈ 3+ ngày. Tệp > 350 dòng không được dài thêm — tách khi sửa.

### GĐ1 — Vá bảo mật & lỗi dữ liệu chat (P0 · M · không cần PO)

| Mã | Việc | Sửa |
|---|---|---|
| IC-1.1 | Tách `prisma-chat-message-repository.ts` khỏi `prisma-chat-repository.ts` (301 dòng) trước khi thêm logic | — |
| IC-1.2 | `HandleCardActionUseCase`: nạp tin + phòng; kiểm người gọi vào được phòng, đúng loại thẻ, đúng trạng thái, đúng tổ chức được giao, không phải người gửi. Sai → 404, đã xử lý → 409 | H1 |
| IC-1.3 | Cập nhật thẻ **gộp** payload, **có điều kiện** trạng thái (0 dòng → 409) | H7 |
| IC-1.4 | Client chỉ gửi `TEXT` (≤ 4 000 ký tự); thẻ / tin hệ thống chỉ sinh ở máy chủ; `attachments` từ client bị từ chối tới GĐ8; lý do ≤ 500 | H2, H4 |
| IC-1.5 | Đọc/gửi/bấm thẻ kiểm liên kết còn ACTIVE (`isAllowedChatTarget`), khác → 404 | H3 |
| IC-1.6 | Tin mới nhất + phân trang `before`/`limit`, trả `nextCursor`; chưa đọc đếm thật (một truy vấn) | H6, H8 |
| IC-1.7 | Thẻ đơn: tên khách đúng nguồn, địa chỉ dạng chữ (`formatDeliveryAddress` sẵn có ở `greeting-card/domain/delivery-address.ts`) | H8 |
| IC-1.8 | Chặn `PLATFORM_TENANT` từ client (400); không tạo phòng trùng | H4, H9 |
| IC-1.9 | `app/(app)/tin-nhan/layout.tsx` gắn `FeatureLockedGuard` (thực thi khoá PO 25/10) | H5 |
| IC-1.10 | Log có cấu trúc thay `catch {}` khi không tạo được phòng | H11 |
| IC-1.11 | Viết lại test đang khẳng định lỗi (không skip); sửa ghi chú route; thêm dòng `AGENT_RULES.md` §14 | H14, H15 |

**Test:** unit cho từng nhánh lỗi IC-1.2/1.3/1.4/1.6; tenant — tổ chức thứ ba bấm thẻ → 404 và payload không đổi; đối tác `TERMINATED` → 404; client gửi `SYSTEM_NOTICE` → 400.

### GĐ2 — Nền dữ liệu: phòng theo đối tác & RLS (P1 · L · cần D1, D2, D3, D4, D10)

| Mã | Việc |
|---|---|
| IC-2.1 | Migration D3 + policy D4 → `npx prisma generate` → `npm run gen:tenant-registry`; đặc tả 07 cùng commit; ghi SQL hoàn tác trong PR |
| IC-2.2 | `ensurePartnerConversation` / `ensureBranchConversation` idempotent; gọi khi cấp tài khoản, liên kết có sẵn, chấp nhận lời mời, liên kết trở lại ACTIVE (`chain-invitation-repository.ts:49`, `prisma-partnership-repository.ts:193`) |
| IC-2.3 | Hàm miền thuần `canAccessConversation(...)` → `NONE` / `READ` / `READ_WRITE` thay `isParticipant` |
| IC-2.4 | Gắn mã D2 bằng `requireCapability()` cho route chat; bỏ khỏi danh sách route không gắn năng lực; gắn năng lực cho mục menu |
| IC-2.5 | `POST /internal-chat/conversations` nhận `{ partnerOrgId }` / `{ branchId }`; nút "Nhắn tin" sẵn có (`dieu-phoi/doi-tac/page.tsx:185`, `noi-bo/ket-noi/*`) mở `/tin-nhan?phong=<id>`; danh sách hiện tên bên kia theo phía người xem |

**Test:** tenant (cả `DB_RLS_MODE=enforce`) — đối tác đọc **và gửi** được phòng chung; chuỗi B / tổ chức thứ ba không thấy dòng nào; nhân viên mới của đối tác thấy phòng ngay; liên kết lại không sinh hai phòng.

### GĐ3 — Đưa cửa hàng đối tác vào vòng phân bổ (P1 · M · cần D7, D9)

| Mã | Việc |
|---|---|
| IC-3.1 | `syncPartnerDispatchCandidate(chainOrgId, partnerOrgId)`: tạo/cập nhật dòng `branches` (D9) khi liên kết ACTIVE; `accepts_dispatch = false` khi `SUSPENDED`/`TERMINATED`; `TERMINATED` có đơn đang giữ → `ESCALATED` + báo Điều phối |
| IC-3.2 | Script backfill (`--dry-run` mặc định) cho mọi liên kết hiện có; chạy lại không nhân đôi |
| IC-3.3 | Màn chi nhánh của chuỗi đánh dấu "Cửa hàng đối tác", cho sửa toạ độ / phường lân cận / sức chứa; dữ liệu do đối tác sở hữu (tên, địa chỉ) chỉ đọc |

**Test:** unit — đối tác cùng phường được xếp như chi nhánh cùng phường (không ưu tiên/thiệt theo kênh); tenant — đối tác của chuỗi A không bao giờ là ứng viên của chuỗi B.

### GĐ4 — Kênh mời trong chat: Nhận / Từ chối / Chốt (P1 · L)

| Mã | Việc |
|---|---|
| IC-4.1 | Port `InAppDispatchChannel` trong `greeting-card` (gửi thẻ mời, sửa thẻ, đăng tin hệ thống); adapter ở `internal-chat/adapters/` ghi thẻ vào phòng đối tác. Lắp ở composition root để không vòng phụ thuộc module |
| IC-4.2 | `MultiChannelDispatchNotifier` gửi thêm kênh này cho nơi nhận có `partner_org_id` (hoặc chi nhánh nội bộ có phòng); `closeCardsAfterClaim` / `reopenCardsAfterCancel` / `editInviteCard` cập nhật cả thẻ chat |
| IC-4.3 | Adapter thao tác `SubcontractActionPort` trong `internal-chat`: kiểm người gọi (thành viên ACTIVE, mã D2, liên kết ACTIVE, `branches.partner_org_id` = tổ chức người gọi, `shared_order_access` còn hiệu lực) rồi gọi `claimSubcontractUseCase` / huỷ nhận / `commitSubcontractClaim` trong ngữ cảnh chuỗi, ghi người thao tác vào nhật ký |
| IC-4.4 | Thẻ hiển thị đếm ngược thời gian huỷ nhận (`subcontract-countdown.ts`), "Đã có nơi nhận", "Đã chuyển Điều phối", "Đã huỷ"; bên giao đơn không thấy nút thao tác |
| IC-4.5 | Bỏ luồng `ORDER_THREAD` chung theo `orderId` và `dispatch-to-chat` gửi tay kiểu cũ: Điều phối gửi tay = chọn nơi nhận trong bộ máy phân bổ (`start-chain-dispatch.ts`) như hiện nay (sửa H10) |

**Test:** tenant — nhận qua chat và qua link Telegram cùng lúc → chỉ một bên thắng, thẻ còn lại cả hai kênh chuyển "Đã có nơi nhận"; huỷ trong hạn → vòng mời tiếp tục, thẻ mở lại; đối tác không được mời → 404; hết vòng → `ESCALATED` và thẻ cập nhật.

### GĐ5 — Cập nhật thực hiện đơn trên thẻ (P1 · L · P3)

| Mã | Việc |
|---|---|
| IC-5.1 | **Tách logic route công khai thành use-case** trong `greeting-card/use-cases/subcontract-steps/`: `submitFinishedPhoto`, `submitShipper`, `submitDeliveryProof`, `requestStepBypass`. Route công khai còn: rate limit, xác thực token, gọi use-case. Không đổi hành vi — test hiện có của route phải xanh nguyên |
| IC-5.2 | Route chat `POST /internal-chat/orders/:orderId/steps/:step` gọi cùng use-case qua `SubcontractActionPort` (cùng kiểm quyền IC-4.3) |
| IC-5.3 | Thẻ đơn có thanh bước **Ảnh thành phẩm → Shipper → Ảnh bàn giao**: chỉ mở bước hợp lệ theo `SUBCONTRACT_STEP_PRECONDITION`; hiện kết quả kiểm ảnh AI, "Chờ khách duyệt ảnh", phí trễ dự kiến, xin bỏ qua bước |
| IC-5.4 | Nhắc hạn (G7) và mọi đổi trạng thái đơn (duyệt ảnh, đang giao, đã giao, huỷ) đăng tin hệ thống vào phòng và sửa thẻ |
| IC-5.5 | Chuỗi: lọc "Đơn đang làm" theo đối tác trong `/tin-nhan`; bấm thẻ mở chi tiết đơn ở màn điều phối |

**Test:** unit cho từng use-case bước (sai thứ tự → 409, sai nơi nhận → 422, gửi lại shipper → idempotent); tenant — đối tác A không gửi được ảnh cho đơn của đối tác B; cùng một đơn, bước làm qua link công khai hiện đúng trên thẻ chat và ngược lại. `storage-write-contract.test.ts` xanh (ảnh vẫn ghi qua `StorageProvider`).

### GĐ6 — Khuyến khích dùng Trao đổi nội bộ (P2 · S · cần D11)

| Mã | Việc |
|---|---|
| IC-6.1 | Tin Telegram/Zalo cho đối tác có tài khoản: thêm nút "Mở trong smeOS" → `/tin-nhan?phong=<id>&don=<mã>` (đăng nhập xong về đúng thẻ) |
| IC-6.2 | Trang `/subcontract/[orderCode]` hiện gợi ý chuyển sang smeOS khi nơi nhận có `partner_org_id` |
| IC-6.3 | Số liệu cho chuỗi: tỉ lệ đơn nhận/hoàn tất qua chat so với link ngoài (đọc từ người thao tác đã ghi ở IC-4.3) |

### GĐ7 — Tin tức thì & thông báo (P2 · M · không thêm dependency)

| Mã | Việc |
|---|---|
| IC-7.1 | `GET /internal-chat/stream` (SSE) theo mẫu `api/v1/notification/stream/route.ts`; Redis pub/sub qua `src/core/cache/redis-client.ts` khi có `REDIS_URL`; kiểm quyền từng phòng trước khi đẩy |
| IC-7.2 | Giao diện dùng SSE, mất kết nối hỏi lại 30 s/lần; chỉ đánh dấu đã đọc khi tab hiển thị |
| IC-7.3 | Sự kiện `internal_chat.order_invite`, `internal_chat.order_step`, `internal_chat.message_received` trong `notification/domain/events/` (skill notifications); **thẻ mời không bị gộp/tắt tiếng** (có hạn nhận), tin tự do gộp 1 / phòng / 5 phút |
| IC-7.4 | Số chưa đọc + số thẻ mời đang chờ trên mục menu "Trao đổi nội bộ" |

### GĐ8 — Ảnh trong tin nhắn tự do (P2 · M · P4)

| Mã | Việc |
|---|---|
| IC-8.1 | Route tải ảnh: kiểm nội dung thật, JPEG/PNG/WebP, ≤ 10 MB, ≤ 5 ảnh/tin; `StorageProvider` + `buildStorageKey` khoá `org/<chủ phòng>/chat/<phòng>/…`; khai `STORAGE_REFERENCE_SOURCES`; URL ký có hạn |
| IC-8.2 | Ảnh tin tự do **không** thay cho ảnh bước đơn (không đổi trạng thái đơn); composer có đính kèm + xem trước |

### GĐ9 — Hoàn thiện giao diện (P2 · M · cần D8)

| Mã | Việc |
|---|---|
| IC-9.1 | Tách `tin-nhan/page.tsx` (297 dòng) thành `ConversationList`, `MessageThread`, `MessageItem`, `Composer`, `OrderTaskCard` (≤ 350 dòng/tệp) |
| IC-9.2 | Đủ 6 trạng thái; di động 1 cột (đối tác chủ yếu dùng điện thoại); chụp ảnh trực tiếp từ camera; Enter gửi; WCAG 2.2 AA |
| IC-9.3 | Từ điển `chat.*` vi/en (TD #189); bỏ "Đa ngành SaaS"; sửa nhãn `app-page-tools.ts:34`; xoá `internal-chat-widget.tsx` |
| IC-9.4 | Screen Contract `tin-nhan.md` cùng commit; `test:e2e:ux` cho `/tin-nhan` (390×844, 1280×800) |

### GĐ10 — Tài liệu & nghiệm thu (S)

- Đặc tả 06, 07, 20 (viết lại theo mục đích v3), 21 (phòng + ứng viên tự tạo khi liên kết), `TRANG_THAI.md` §4–6, `TECHNICAL_DEBT.md` #189, dòng 9.1 `docs/handover/BAO_CAO_ANH_XA_123_CHUC_NANG.md:189`.
- Chạy kịch bản §8 cùng PO; PO quyết mở khoá production (D8).

## 5. Cổng kiểm tra

| Gate | GĐ |
|---|---|
| `npm run typecheck && npm run lint:ratchet` · `npm test` | mọi GĐ |
| `npm run test:tenant` · `npm run test:platform` (chỉ DB `*_test`; kiểm `echo "[$DATABASE_URL]"`) | 1–5, 7, 8 |
| `npm run lint:ux -- --check` | 1, 2, 3, 4, 5, 6, 9 |
| `npm run check:docs` | mọi GĐ có route/schema mới |
| `npm run build` · `npm run test:e2e:ux` | 5, 9 |
| `npm run storage:reconcile` (chỉ đọc) | 5, 8 |

Không báo xong khi còn gate đỏ **mới** so với `main`; lỗi có sẵn ghi "có sẵn".

## 6. Rủi ro & cách giảm

| Rủi ro | Giảm thiểu |
|---|---|
| Tách logic route công khai (GĐ5) làm lệch luồng Telegram đang chạy production | Tách thuần, không đổi hành vi; test route hiện có phải xanh nguyên trước khi thêm route chat; commit tách riêng |
| Đối tác vào vòng mời làm đổi kết quả phân bổ của chuỗi đang chạy | Dòng `branches` mới mặc định theo D9; chuỗi tắt `accepts_dispatch` được; thử trên một chuỗi trước (cờ trong chính sách phân bổ) |
| Thao tác của người đăng nhập tổ chức khác ghi vào đơn của chuỗi | Một cổng kiểm quyền duy nhất (IC-4.3) + ca tenant cho từng bước; RLS `enforce` |
| Đổi policy RLS chặn nhầm | Ca `enforce` riêng; theo dõi chế độ `audit` ≥ 1 tuần |
| Migration lỗi production | Chỉ thêm cột nullable/index/policy; SQL hoàn tác kèm PR; backfill tách riêng, `--dry-run` trước |
| SSE nhiều instance mất tin | Redis pub/sub + hỏi lại dự phòng; thẻ mời còn có thông báo + Telegram/Zalo |
| Chưa có Postgres `_test` | `docker compose up -d && npm run db:test:setup` trước GĐ1; không dựng được thì báo gate bị chặn |

## 7. Thứ tự & ước lượng

`GĐ1` (làm ngay) ∥ `PO chốt D1–D11` → `GĐ2` → `GĐ3` → `GĐ4` → `GĐ5` → `GĐ6` ∥ `GĐ7` → `GĐ8` → `GĐ9` → `GĐ10`.
Mốc dùng được sớm nhất: hết **GĐ4** — đối tác nhận đơn trong chat; hết **GĐ5** — làm trọn một đơn trong chat.

| GĐ | Cỡ | Ngày công | Chặn bởi |
|---|---|---|---|
| 1 | M | 1,5 | — |
| 2 | L | 3 | D1, D2, D3, D4, D10 |
| 3 | M | 1,5 | D7, D9 |
| 4 | L | 3 | — |
| 5 | L | 4 | — |
| 6 | S | 0,5 | D11 |
| 7 | M | 2 | — |
| 8 | M | 1 | — |
| 9 | M | 2 | D8 |
| 10 | S | 0,5 | — |
| **Tổng** | | **≈ 19** | |

PR chỉ mở khi PO yêu cầu; nên tách: GĐ1 · GĐ2+3 · GĐ4 · GĐ5 · phần còn lại.

## 8. Kịch bản nghiệm thu cho PO

1. Chuỗi cấp tài khoản (hoặc liên kết) cửa hàng đối tác ở phường X → cả hai bên có phòng ở `/tin-nhan`; màn chi nhánh của chuỗi có thêm "Cửa hàng đối tác" ở phường X.
2. Khách đặt đơn giao phường X, thanh toán xong → bộ máy tự mời; đối tác thấy **thẻ mời** trong chat (kèm thông báo) **và** tin Telegram có nút "Mở trong smeOS".
3. Đối tác bấm *Nhận* trong chat → thẻ đếm ngược huỷ nhận; chi nhánh khác bấm link Telegram → "Đã có nơi nhận".
4. Đối tác *Chốt làm ngay* → đơn sang sản xuất; chuỗi thấy cùng trạng thái ở màn điều phối.
5. Đối tác chụp **ảnh thành phẩm** trên thẻ → kết quả kiểm ảnh như Thẻ Chào → (nếu tiệm bật) chờ khách duyệt → được duyệt.
6. Đối tác nhập **shipper** → đơn "Đang giao"; gửi **ảnh bàn giao** → đơn hoàn tất, thẻ "Đã giao".
7. Cùng một đơn khác, đối tác làm vài bước qua link Telegram, vài bước trong chat → thẻ và link luôn khớp.
8. Hai bên nhắn tin tự do + gửi ảnh mẫu trong cùng phòng; tin đến ≤ 2 giây.
9. Chuỗi tạm dừng liên kết → đối tác không nhận thẻ mời mới nhưng hoàn tất được đơn đang làm; chấm dứt → phòng biến mất phía đối tác, đơn đang giữ chuyển Điều phối.
10. Mở `/tin-nhan` trên điện thoại 390 px: làm trọn bước 3–6 bằng một tay.

## 9. Nhật ký thay đổi kế hoạch

**v3 (09/11/2026)** — theo PO: chat là kênh giao & thực hiện đơn.
- §1 viết lại mục đích; §3.1 ghi 4 quyết định PO đã chốt (P1–P4); D5 cũ được thay bằng P1 + G4; D6 cũ (ảnh) thay bằng P3 + GĐ8.
- §2.2 mới: khảo sát luồng gia công Thẻ Chào (G1–G8), trong đó G5 — logic bước nằm trong route công khai — sinh ra IC-5.1.
- D3 thêm `branches.partner_org_id`, `internal_chat_messages.order_id`; D9 cụ thể hoá cách đưa đối tác vào vòng mời; D7 thêm xử lý đơn đang làm; D2 thêm mã "thực hiện đơn gia công"; D11 mới (khuyến khích dùng chat).
- Giai đoạn mới: GĐ3 (ứng viên phân bổ), GĐ4 (kênh mời trong chat), GĐ5 (bước thực hiện trên thẻ), GĐ6 (khuyến khích). RLS gộp vào GĐ2. Bỏ luồng `ORDER_THREAD` gửi tay kiểu cũ.
- Ước lượng ≈ 19 ngày công; kịch bản nghiệm thu viết lại theo hành trình một đơn.

**v2 (09/11/2026)** — đối chiếu code: thêm H4, H5, H9, H10, H14 và số dòng thật; phát hiện thiếu ánh xạ chi nhánh ↔ đối tác (D9); sửa "Nhận" = claim, "Chốt" = commit; thêm D10; GĐ1 thêm chặn `PLATFORM_TENANT`, khoá `/tin-nhan`, log tạo phòng, viết lại test khẳng định lỗi.

**v1 (09/11/2026)** — bản nháp đầu.

## 10. Tiến độ thực hiện

| GĐ | Trạng thái | Ghi chú |
|---|---|---|
| 1 | Xong | IC-1.1 → IC-1.11 + vá H16. Chưa làm trong GĐ1 (đã xếp sau): `isSender` trên giao diện (IC-4.4). Ca chứng minh: `tests/tenant/internal-chat-card-guard.test.ts` |
| 2 | Xong | Migration `20261109150000_internal_chat_partner_rooms` (D3 + D4 + D9 gộp một lần): `counterpart_org_id`, `branch_id`, `room_key` (khoá chống trùng thay cho unique theo loại — Prisma không biểu diễn được unique một phần), `branches.partner_org_id`, trigger sao bên kia, policy RLS mới. Mã `S1`/`S2` (thêm vào cả 3 vai PO Q7 theo D2). Quyền theo tổ chức (`canAccessConversation`), phòng tự tạo khi liên kết hiệu lực (`partner-link-effects.ts`), `POST /internal-chat/conversations` nhận `{ partnerOrgId \| chainOrgId \| branchId }`, nút "Nhắn tin" mở thẳng phòng. Không thêm cột `internal_chat_messages.order_id` như D3 viết — lọc thẻ theo đơn đọc từ `action_payload` |
| 3 | Xong | RLS (IC-3.1–3.3) gộp vào migration GĐ2; ca `enforce`: `tests/tenant/internal-chat-rls.test.ts`; ghi ADR-013 I-5b. Ứng viên bắn đơn của cửa hàng đối tác (mã `DT-<mã đối tác>`) đồng bộ theo trạng thái liên kết, nhãn "Cửa hàng đối tác" ở danh sách chi nhánh nhận đơn. Chấm dứt khi còn giữ đơn: **báo Điều phối** (sự kiện "đơn kẹt") thay vì tự chuyển `ESCALATED` — tự chuyển dễ mất việc cửa hàng đang làm dở; Điều phối quyết giao lại. Liên kết có sẵn: `npx tsx --env-file-if-exists=.env scripts/backfill-chat-rooms.ts` (chạy thử) rồi thêm `--apply` |

