# Kế hoạch hoàn thiện Chat nội bộ Chuỗi ↔ Cửa hàng / Chi nhánh / Đối tác

**Trạng thái:** DRAFT — chờ PO duyệt · **Nhánh:** `Hoanthien_chatnoibo` (tách từ `main` @ `2dfd6a02`) · **Ngày lập:** 09/11/2026
**Module:** `src/modules/internal-chat/` · **Màn:** `/tin-nhan` · **Đặc tả gốc:** `docs/dac-ta/20-internal-chat-and-dispatch-spec.md`

---

## 1. Mục tiêu

Chuỗi điện hoa (điều phối, điều hành) và từng cửa hàng / chi nhánh / đối tác gia công trao đổi trực tiếp trong smeOS:

- mỗi đối tác ACTIVE có sẵn **một phòng trao đổi** với chuỗi; nhân viên có quyền ở cả hai bên đều vào được, không phụ thuộc người đã tạo phòng;
- điều phối **gửi đơn vào phòng**; đối tác bấm **Nhận / Từ chối** và kết quả đi thẳng vào đơn gia công thật (cùng nguồn sự thật với luồng bắn đơn Telegram);
- gửi chữ và ảnh; tin mới đến **tức thì**, có **thông báo** và **số chưa đọc**;
- an toàn tuyệt đối giữa các tổ chức, kể cả khi bật RLS chế độ `enforce`.

**Ngoài phạm vi đợt này** (đề xuất hoãn): phòng Nền tảng ↔ Khách hàng (`PLATFORM_TENANT`), thẻ duyệt QC trong chat (QC đã có ở `/duyet`), gọi thoại/video, xoá/sửa tin.

## 2. Hiện trạng tóm tắt (từ đợt rà soát 09/11/2026)

| Nhóm | Vấn đề | Vị trí |
|---|---|---|
| Bảo mật | Bấm thẻ đơn không kiểm người tham gia / loại tin / trạng thái → người của tổ chức bất kỳ đổi được thẻ của tổ chức khác | `use-cases/handle-card-action.ts` |
| Bảo mật | Client tự gửi được tin loại `SYSTEM_NOTICE` / `ACTION_CARD_*` với payload tuỳ ý | `api/v1/internal-chat/conversations/[id]/messages/route.ts:11-13` |
| Bảo mật | Đối tác đã chấm dứt liên kết vẫn đọc/gửi được | `use-cases/send-chat-message.ts` |
| Dữ liệu | Lấy 50 tin **cũ nhất** → phòng > 50 tin không thấy tin mới | `infra/prisma-chat-repository.ts:223` |
| Dữ liệu | Bấm thẻ ghi đè toàn bộ payload → thẻ mất mã đơn, giá, ảnh | `infra/prisma-chat-repository.ts:251` |
| Dữ liệu | Số chưa đọc chỉ 0/1; "tên khách" lấy nhầm tên người nhận | `:101`, `dispatch-to-chat/route.ts:56` |
| Thiếu | Không tạo/mở phòng từ giao diện; liên kết cửa hàng có sẵn không có phòng; không thêm người | `prisma-partnership-repository.ts:223` |
| Thiếu | Không có nút gửi đơn vào chat; thẻ không gắn đơn gia công thật | `greeting-card/use-cases/commit-subcontract-claim.ts` |
| Thiếu | Không ảnh, không realtime (poll 5–15s), không thông báo; widget nổi không được gắn | `components/internal-chat/*` |
| Rủi ro | RLS: phòng thuộc tổ chức chuỗi → đối tác mất quyền đọc khi `DB_RLS_MODE=enforce` | `migrations/20261106020000_row_level_security` |
| UI | Chữ cứng (TD #189), nhãn "Đa ngành SaaS", thiếu 6 trạng thái, nhãn sai ở `app-page-tools.ts:34` | `app/(app)/tin-nhan/page.tsx` |

## 3. Quyết định cần PO chốt trước khi code (Giai đoạn 0)

| # | Câu hỏi | Khuyến nghị | Vì sao cần PO |
|---|---|---|---|
| D1 | Quyền vào phòng: mời từng người hay **theo tổ chức + năng lực**? | **Theo tổ chức + năng lực**: mọi thành viên ACTIVE có quyền chat của chuỗi và của đối tác trong phòng đều vào được; bảng `internal_chat_participants` chỉ còn lưu đã đọc / tắt tiếng (tạo khi mở lần đầu) | Đổi mô hình phân quyền |
| D2 | Mã năng lực cho chat nội bộ | Thêm 2 mã: **dùng chat nội bộ** (mặc định mọi vai) và **quản lý phòng / gửi đơn vào chat** (điều hành, điều phối); gửi đơn vẫn giữ `R3` | Thêm mã RBAC |
| D3 | Thay đổi `prisma/schema.prisma` | Thêm cột `counterpart_org_id` vào `internal_chat_conversations` (+ unique `organization_id, conversation_type, counterpart_org_id` cho phòng đối tác; index) và sao xuống `internal_chat_messages` (trigger như `organization_id`) để RLS đọc được. Một migration `prisma migrate dev` | Mọi thay đổi schema cần PO |
| D4 | RLS cho phòng liên tổ chức | Đổi policy 3 bảng chat: thấy bản ghi khi `organization_id = app.org_id` **hoặc** `counterpart_org_id = app.org_id`; không dùng cửa `rls_system` | Chạm sàn cách ly tenant |
| D5 | Thẻ "Nhận đơn" trong chat và luồng bắn đơn Telegram | **Một nguồn sự thật**: nút trên thẻ gọi chung `commitSubcontractClaim` (khoá đồng thời sẵn có); thẻ chỉ phản chiếu trạng thái đơn gia công | Quy trình nghiệp vụ điều phối |
| D6 | Gửi ảnh trong chat (tính năng có người dùng tải ảnh lên) | Ảnh chat **không** chạy chặng nào trong 14 chặng hành trình sản phẩm; lưu qua `StorageProvider`, khoá `org/<tổ chức chủ phòng>/chat/<phòng>/…`, chỉ ảnh, ≤ 10 MB, URL ký có hạn | Quy định CLAUDE.md về ảnh tải lên |
| D7 | Đối tác chấm dứt liên kết | Mất quyền đọc và gửi (trả 404); lịch sử giữ lại cho chuỗi | Chính sách dữ liệu |
| D8 | Widget chat nổi và mở khoá production | Bỏ widget, giữ một màn `/tin-nhan` + số chưa đọc trên menu (Progressive Disclosure). Thêm `FeatureLockedGuard` cho `/tin-nhan`; mở khoá production sau nghiệm thu | UX do PO khoá |

> Giai đoạn 1 **không phụ thuộc** quyết định nào ở trên → đề xuất làm ngay sau khi duyệt kế hoạch.

## 4. Các giai đoạn thực hiện

Mỗi giai đoạn = một (hoặc vài) commit Conventional Commits trên nhánh `Hoanthien_chatnoibo`, chạy đủ gate trước khi sang giai đoạn sau. Ước lượng: S ≈ ½ ngày, M ≈ 1–2 ngày, L ≈ 3+ ngày.

### Giai đoạn 1 — Vá bảo mật & lỗi dữ liệu (P0 · M · không cần PO)

| Mã | Việc | Tệp chính |
|---|---|---|
| IC-1.1 | `HandleCardActionUseCase`: nạp tin + phòng (`findMessageById`), kiểm người gọi là thành viên phòng, tin là `ACTION_CARD_ORDER`, trạng thái `PENDING_ACCEPT`, tổ chức người gọi = `assignedPartnerOrgId`, không phải người gửi. Sai → 404; đã xử lý rồi → 409 | `use-cases/handle-card-action.ts`, `domain/repositories/chat-repository.interface.ts` |
| IC-1.2 | Cập nhật payload **gộp** thay vì ghi đè, và có điều kiện (`updateMany` khi `status = PENDING_ACCEPT`) để hai người bấm cùng lúc chỉ một người thắng | `infra/prisma-chat-repository.ts` |
| IC-1.3 | API gửi tin: client chỉ được `TEXT`; thẻ / thông báo hệ thống chỉ sinh từ use-case máy chủ | `api/v1/internal-chat/conversations/[id]/messages/route.ts` |
| IC-1.4 | Đọc/gửi tin kiểm liên kết chuỗi–đối tác còn ACTIVE với người tham gia khác tổ chức chủ phòng (D7 mặc định: 404) | `send-chat-message.ts`, `get-conversation-messages.ts` |
| IC-1.5 | Lấy **tin mới nhất** (desc + take rồi đảo), phân trang `before` đúng, API trả `nextCursor` | `prisma-chat-repository.ts`, route messages |
| IC-1.6 | Số chưa đọc thật (đếm tin sau `last_read_at`, trừ tin của mình) | `prisma-chat-repository.ts` |
| IC-1.7 | Thẻ đơn: tên khách đúng nguồn, địa chỉ hiển thị dạng chữ dễ đọc (không phải JSON) | `coordinator/orders/[id]/dispatch-to-chat/route.ts` |
| IC-1.8 | Sửa mô tả sai ở danh sách route không gắn năng lực; thêm dòng `AGENT_RULES.md` §14 ("ghi chú nói use-case kiểm quyền nhưng code không kiểm") | `tests/unit/architecture/route-capability-guard.test.ts` |

**Test bắt buộc:** unit cho từng nhánh lỗi của IC-1.1/1.2/1.3/1.5/1.6; tenant: người tổ chức khác bấm thẻ → 404 và payload không đổi; đối tác bị chấm dứt → 404; client gửi `SYSTEM_NOTICE` → 400.
**Nghiệm thu:** không còn đường nào đổi thẻ của tổ chức khác; phòng 120 tin vẫn thấy tin mới nhất.

### Giai đoạn 2 — Phòng trao đổi theo đối tác (P1 · L · cần D1, D2, D3)

| Mã | Việc |
|---|---|
| IC-2.1 | Migration D3 (`counterpart_org_id`, unique, index, trigger sao xuống tin nhắn) + `npx prisma generate`; cập nhật `tenant-table-registry` nếu sinh lại |
| IC-2.2 | Use-case `ensurePartnerConversation(chainOrgId, partnerOrgId)` idempotent; gọi khi cấp tài khoản đối tác, khi liên kết cửa hàng có sẵn, khi liên kết chuyển lại ACTIVE |
| IC-2.3 | Script backfill (chạy thử `--dry-run` trước) tạo phòng cho mọi liên kết ACTIVE hiện có |
| IC-2.4 | Quyền vào phòng theo D1: hàm miền `canAccessConversation(user, org, conversation, linkStatus)` thay cho `isParticipant`; bản ghi participant tạo khi mở lần đầu |
| IC-2.5 | Gắn mã năng lực D2 vào 3 route chat + route mới; bỏ chúng khỏi danh sách route không gắn năng lực |
| IC-2.6 | `POST /internal-chat/conversations` nhận `{ partnerOrgId }` → mở hoặc tạo phòng; nút "Nhắn tin" ở `/dieu-phoi/doi-tac` và `/noi-bo/ket-noi` mở thẳng `/tin-nhan?phong=<id>` |
| IC-2.7 | Phía đối tác: danh sách phòng hiển thị tên chuỗi (không chỉ tiêu đề lưu sẵn) |

**Test:** tenant — chuỗi B không thấy phòng chuỗi A–đối tác; nhân viên mới của đối tác thấy phòng ngay; liên kết hai lần không sinh hai phòng; backfill chạy lại không nhân đôi.

### Giai đoạn 3 — RLS cho phòng liên tổ chức (P1 · M · cần D4)

| Mã | Việc |
|---|---|
| IC-3.1 | Migration thay policy `tenant_isolation` của 3 bảng chat theo D4 (cùng đợt migration với IC-2.1 nếu được) |
| IC-3.2 | Ca test tenant chạy với `DB_RLS_MODE=enforce`: đối tác đọc/gửi được phòng chung; tổ chức thứ ba không thấy dòng nào |
| IC-3.3 | Ghi chú vào checklist chuyển `audit → enforce` (ADR-013) |

### Giai đoạn 4 — Gửi đơn vào phòng & thẻ gắn đơn thật (P1 · L · cần D5)

| Mã | Việc |
|---|---|
| IC-4.1 | Port `OrderClaimPort` trong `internal-chat/domain`; adapter gọi `commitSubcontractClaim` của `greeting-card` (không import infra chéo module). Khảo sát và ghi rõ ánh xạ **chi nhánh ↔ tổ chức đối tác** trước khi viết |
| IC-4.2 | Nhận trên thẻ = nhận đơn gia công; đơn đã được nhận qua Telegram/chi nhánh khác → thẻ tự chuyển "Đã có nơi nhận" |
| IC-4.3 | Đơn gia công đổi trạng thái (nhận, huỷ, hoàn tất) → cập nhật thẻ + tin hệ thống trong phòng |
| IC-4.4 | Nút "Gửi đơn vào trao đổi" ở màn điều phối và chi tiết đơn: hộp chọn đối tác ACTIVE → gọi `dispatch-to-chat` |
| IC-4.5 | Tab "Trao đổi" trong chi tiết đơn mở luồng theo đơn (`ORDER_THREAD`) |
| IC-4.6 | Ẩn nút Nhận/Từ chối với bên giao đơn (`isSender` tính đúng) |

**Test:** unit cho port giả; tenant — nhận qua chat và qua link Telegram cùng lúc → chỉ một bên thắng; tổ chức không được giao không nhận được.

### Giai đoạn 5 — Tin tức thì & thông báo (P2 · M · không thêm dependency)

| Mã | Việc |
|---|---|
| IC-5.1 | `GET /internal-chat/stream` (SSE) theo mẫu `notification/stream`; hub trong bộ nhớ + Redis pub/sub khi có `REDIS_URL` (`ioredis` đã có sẵn) để chạy nhiều instance |
| IC-5.2 | Giao diện dùng SSE; mất kết nối thì quay về hỏi lại 30 giây/lần |
| IC-5.3 | Sự kiện thông báo mới `internal_chat.message_received` trong danh mục (skill notifications); tôn trọng tắt tiếng; gộp tối đa 1 thông báo / phòng / 5 phút; deep link về phòng |
| IC-5.4 | Số chưa đọc trên mục menu "Trao đổi nội bộ" |

### Giai đoạn 6 — Ảnh đính kèm (P2 · M · cần D6)

| Mã | Việc |
|---|---|
| IC-6.1 | Route tải ảnh: kiểm nội dung, giới hạn loại/dung lượng, ghi qua `StorageProvider` + `buildStorageKey` |
| IC-6.2 | Khai nguồn tham chiếu `STORAGE_REFERENCE_SOURCES` + `storage-write-contract.test.ts`; trả URL ký có hạn khi đọc tin |
| IC-6.3 | Composer có nút đính kèm, xem trước, hiển thị ảnh trong luồng |

### Giai đoạn 7 — Hoàn thiện giao diện (P2 · M · cần D8)

| Mã | Việc |
|---|---|
| IC-7.1 | Tách `tin-nhan/page.tsx` (297 dòng) thành `ConversationList`, `MessageThread`, `MessageItem`, `Composer` (mỗi tệp ≤ 350 dòng) |
| IC-7.2 | Đủ 6 trạng thái (đang tải dạng khung, rỗng, lỗi, không có quyền, mất mạng, thành công); di động 1 cột; phím tắt gửi; WCAG 2.2 AA |
| IC-7.3 | Từ điển `chat.*` vi/en (trả một phần TD #189); bỏ nhãn "Đa ngành SaaS"; sửa nhãn `/tin-nhan` ở `app-page-tools.ts:34` |
| IC-7.4 | Xoá `internal-chat-widget.tsx` (theo D8); thêm `FeatureLockedGuard` cho `/tin-nhan` |
| IC-7.5 | Cập nhật Screen Contract `tin-nhan.md` cùng commit; thêm ca `test:e2e:ux` cho `/tin-nhan` |

### Giai đoạn 8 — Tài liệu & nghiệm thu (S)

- Đặc tả 06 (route mới + mã năng lực), 07 (cột/policy mới), đặc tả 20 (trạng thái thật, bỏ phần "Giai đoạn" đã lỗi thời), `TRANG_THAI.md` §4–6.
- Sửa mục 9.1 ở `docs/handover/BAO_CAO_ANH_XA_123_CHUC_NANG.md` (đang ghi "Hoàn thiện" do gộp khung trao đổi Thẻ Chào).
- Kịch bản nghiệm thu tay cho PO: cấp đối tác → nhắn tin → gửi đơn → đối tác nhận → thẻ & đơn đổi trạng thái → gửi ảnh → thông báo.

## 5. Cổng kiểm tra mỗi giai đoạn

| Gate | Khi |
|---|---|
| `npm run typecheck && npm run lint:ratchet` | mọi giai đoạn |
| `npm test` | mọi giai đoạn |
| `npm run test:tenant` · `npm run test:platform` (chỉ trên DB `*_test`) | GĐ 1–4, 6 |
| `npm run lint:ux -- --check` | GĐ 2, 4, 6, 7 |
| `npm run check:docs` | mọi giai đoạn có route/schema mới |
| `npm run build` · `npm run test:e2e:ux` | GĐ 7 |
| `npm run storage:reconcile` (chỉ đọc) | GĐ 6 |

Không báo xong khi còn gate đỏ mới so với `main`; lỗi có sẵn từ trước được ghi "có sẵn".

## 6. Rủi ro & cách giảm

| Rủi ro | Giảm thiểu |
|---|---|
| Gắn thẻ với `commitSubcontractClaim` làm lệch luồng Telegram đang chạy production | Chỉ gọi qua port, không đổi hàm gốc; test đua đồng thời; bật theo cờ nếu PO muốn |
| Đổi policy RLS gây chặn nhầm khi chuyển `enforce` | Ca test `enforce` riêng; theo dõi log chế độ `audit` trước khi chuyển |
| SSE nhiều instance mất tin | Redis pub/sub; client luôn có đường hỏi lại dự phòng |
| Backfill tạo phòng trùng | Unique ở D3 + `--dry-run` + chạy lại an toàn |
| Môi trường chưa có Postgres `_test` → không chạy được `test:tenant` | Dựng `docker compose up -d && npm run db:test:setup` trước GĐ 1; nếu không dựng được thì báo rõ gate bị chặn |

## 7. Thứ tự đề xuất

`GĐ0 (PO chốt D1–D8)` ∥ `GĐ1` → `GĐ2 + GĐ3` (chung migration) → `GĐ4` → `GĐ5` → `GĐ6` → `GĐ7` → `GĐ8`.
PR chỉ mở khi PO yêu cầu; có thể tách PR theo từng giai đoạn để duyệt nhỏ.
