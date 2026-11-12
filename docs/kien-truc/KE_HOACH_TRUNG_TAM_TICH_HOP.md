# KẾ HOẠCH TRIỂN KHAI — TRUNG TÂM TÍCH HỢP 4 TẦNG (INTEGRATION HUB)

> **Mã văn bản:** `PLAN-INTEGRATION-HUB-001`
> **Trạng thái:** KẾ HOẠCH CHI TIẾT — PO đã duyệt hướng kiến trúc ngày 30/10/2026
> **Căn cứ:** [`docs/archive/drafts/DE_XUAT_KIEN_TRUC_TRUNG_TAM_TICH_HOP.md`](../archive/drafts/DE_XUAT_KIEN_TRUC_TRUNG_TAM_TICH_HOP.md). Khi xong giai đoạn 1, đề xuất này được nâng thành spec `docs/dac-ta/22-integration-hub-spec.md` (CANONICAL) và đăng ký trong registry.
> **Quy ước:** mỗi giai đoạn là một hoặc nhiều PR; mỗi gói việc (WP) là một commit Conventional Commits gồm code, test và tài liệu. Không gói việc nào được làm giảm các cổng kiểm tra (gate) so với `main`.

---

## 0. Giả định mặc định cho 7 quyết định mở

PO đã duyệt hướng chung. Bảy điểm dưới đây dùng **mặc định của tôi** cho đến khi PO quyết khác. Cột "Chặn" là giai đoạn phải dừng lại để chờ PO xác nhận.

| # | Quyết định | Mặc định đề xuất | Chặn |
|---|---|---|---|
| D1 | Schema và di trú | 4 bảng mới (mục GĐ1). Di trú `chat_channel_integrations` theo kiểu dual-read, rồi mới xoá bảng cũ | GĐ0 (cột mã hoá), GĐ1 |
| D2 | Ai sở hữu app của nhà cung cấp | SaaS Mẹ sở hữu một app chung cho mỗi nhà cung cấp; khoá app đặt trong biến môi trường hoặc kho bí mật nền tảng | GĐ4 |
| D3 | Nhà cung cấp và API trả phí mới | Không thêm trước GĐ5; mỗi nhà cung cấp phải được duyệt riêng | GĐ5 |
| D4 | Biểu diễn tầng Ngành | Dùng `scope_id = "industry:<key>"`, không tạo org trong DB | GĐ3 |
| D5 | Gắn tích hợp với gói dịch vụ | Nhắn tin, thông báo, SePay: mọi gói. Kênh bán hàng, API/Webhook: gói PRO trở lên | GĐ1 |
| D6 | Thứ tự sàn | Shopee → TikTok Shop → Meta Catalog → Lazada → Haravan/Sapo/KiotViet | GĐ4 |
| D7 | Route cũ | Redirect 308 về `/tich-hop?tab=…`; navKey `channels` được gộp vào `integrations` | GĐ2 |

## 1. Tổng quan tiến độ (ước lượng cho 1–2 dev)

| GĐ | Tên | Phụ thuộc | Ước lượng | Kết quả chấp nhận |
|---|---|---|---|---|
| 0 | Vá rủi ro | — | 3–4 ngày | Không còn secret lưu dạng rõ; không còn báo "thành công" giả |
| 1 | Nền móng Hub | GĐ0, D1, D5 | 2–3 tuần | Mục "Tích hợp" hiện ở 4 tầng, danh mục lấy từ manifest, cổng webhook chung chạy được |
| 2 | Chuyển tích hợp hiện có | GĐ1, D7 | 2 tuần | Mọi tích hợp hiện có được quản lý tại `/tich-hop` |
| 3 | Governance 4 tầng | GĐ2, D4 | 1,5 tuần | Chuỗi cấp sẵn hoặc khoá kết nối cho cửa hàng |
| 4 | Kênh bán hàng | GĐ3, D2, D6 | 6–10 tuần (khoảng 2 tuần mỗi sàn) | Shopee và TikTok Shop chạy thật: catalog, đơn hàng, tồn kho |
| 5 | Mở rộng | GĐ4, D3 | Theo từng nhà cung cấp | Thanh toán, vận chuyển, hoá đơn điện tử, webhook ra ngoài |

---

## GĐ0 — Vá rủi ro hiện tại

**Mục tiêu:** đóng các lỗ hổng mà không chờ Hub.

| WP | Việc | File chính | Test |
|---|---|---|---|
| 0.1 | Mã hoá `fbPageAccessToken`, `zaloAccessToken`, `zaloSecretKey` trong `chat_channel_integrations.config` bằng `sealSecret` với purpose `chat-channel:<channel>`. Đọc được cả dữ liệu cũ (dạng rõ) và mới (đã mã hoá). Thêm script mã hoá lại dữ liệu cũ, chạy được nhiều lần không sai | `src/modules/chat-assistant/infra/chat-channel-repository.ts`, `scripts/reencrypt-chat-channel-secrets.ts` | Unit: seal/open khứ hồi; dữ liệu cũ vẫn đọc được; API không trả secret về client |
| 0.2 | Nếu không có schema: giữ trong `config` Json với khoá `*_sealed` (không cần migration). Nếu PO muốn cột riêng thì làm migration | như trên | — |
| 0.3 | Stub SMS, Zalo, Web Push trả `{success:false, code:"NOT_CONFIGURED"}`; cascade bỏ qua kênh chưa cấu hình khi tính "đã gửi" | `src/modules/notification/infra/channel-adapters/{sms,zalo,web-push}-adapter.ts` | Unit: stub không bao giờ trả success; test cascade |
| 0.4 | Ghi nhận việc 2 bản Telegram adapter bị trùng vào `TECHNICAL_DEBT.md` (gộp ở GĐ2 để tránh refactor ngoài phạm vi) | `docs/dac-ta/TECHNICAL_DEBT.md` | — |

**Cổng kiểm tra:** `typecheck`, `lint:ratchet`, `npm test`, `test:tenant` (vì có truy cập dữ liệu), `check:docs`.
**Xong khi:** quét `chat_channel_integrations` trên staging không còn token dạng rõ; bảng ma trận thông báo không báo đã gửi qua kênh stub.

---

## GĐ1 — Nền móng Hub

### 1A. Schema (dừng chờ PO duyệt D1)

Một migration `prisma migrate dev --name integration_hub_foundation`:

- `integration_connections`: id, organization_id, connector_key, scope_tier, external_account_id, display_name, status (enum `integration_connection_status`), config Json, credential_encrypted, credential_hint, connection_ref (unique, ngẫu nhiên 24 byte), inherited_from_org_id?, expires_at?, last_health_at?, last_error_code?, created_by, timestamps.
  - Unique trên (organization_id, connector_key, external_account_id). Index: `@@index([organization_id])`, `@@index([status, last_health_at])`.
- `integration_events`: id, organization_id, connection_id, direction (IN/OUT), event_type, external_event_id?, status (PENDING/DONE/FAILED/DEAD), attempts, next_retry_at?, error_code?, payload_redacted Json, created_at.
  - Unique trên (connection_id, direction, external_event_id). Index: `@@index([organization_id])`, `@@index([status, next_retry_at])`.
- `integration_sync_cursors`: connection_id + resource (unique), cursor, updated_at; kèm organization_id và index.
- `integration_governance`: connector_key, tier, scope_id, mode (FORBID/INHERIT_ONLY/ALLOW_OWN), updated_by. Unique trên (connector_key, tier, scope_id).

### 1B. Module `src/modules/integration-hub/` (mỗi file ≤ 350 dòng)

| WP | Thành phần | Ghi chú |
|---|---|---|
| 1.1 | `domain/connector-manifest.ts`: kiểu `ConnectorManifest`, `ConnectorCategory`, `AuthKind`, `TierRole` (P/E/C/I) | Không import Prisma |
| 1.2 | `domain/connection-lifecycle.ts`: máy trạng thái và các chuyển trạng thái hợp lệ | Unit test cho mọi chuyển trạng thái |
| 1.3 | `adapters/connectors/registry.ts`: danh mục manifest, ban đầu gồm các nhà cung cấp hiện có và các sàn ở trạng thái `COMING_SOON` | Test: key duy nhất, configSchema hợp lệ |
| 1.4 | `adapters/connector-contract.ts`: interface `Connector` gồm `startAuth`, `completeAuth`, `testConnection`, `refresh?`, `revoke?`, `verifyWebhook?`, `parseWebhook?` | Mọi lời gọi ra ngoài đi qua `withCircuitBreaker` và có timeout |
| 1.5 | `infra/credential-vault.ts`: seal/open theo purpose `integration:<connector>`; không có hàm nào trả secret ra ngoài use-case | Test: không rò secret (mọi DTO đều qua serializer) |
| 1.6 | `infra/connection-repository.ts`, `infra/event-repository.ts`: mọi query dùng `scopedWhere(ctx)`; truy cập chéo tenant trả 404 | Tenant test |
| 1.7 | Use-case: `list-catalog`, `list-connections`, `start-connect`, `complete-oauth`, `test-connection`, `disconnect`, `rotate-credential`, `get-health` | Mỗi use-case có test; ghi audit log |
| 1.8 | OAuth: `state` ký HMAC (org, user, connector, nonce, exp 10 phút), PKCE; callback `GET /api/v1/integrations/oauth/[connector]/callback` | Test: state hết hạn, state của org khác, bị dùng lại |

### 1C. Cổng webhook chung

| WP | Việc |
|---|---|
| 1.9 | `POST /api/v1/public/integrations/[connector]/[connectionRef]`: giới hạn tần suất (scope mới `integration-webhook`) → tra connection theo `connection_ref` → `connector.verifyWebhook` (lỗi thì trả 401 kèm thông điệp chung) → ghi `integration_events` (trùng `external_event_id` thì trả 200 và không làm gì) → enqueue job `integration.event.process` → trả 200 |
| 1.10 | Job xử lý: tối đa 6 lần thử, backoff 30s → 2m → 10m → 30m → 2h → 6h; hết lượt thì chuyển `DEAD` và thông báo sự kiện `integration.event.dead` |
| 1.11 | Job `integration.health` mỗi 30 phút: refresh token sắp hết hạn, ping kết nối, cập nhật trạng thái. Khi chuyển sang EXPIRED/ERROR thì gửi thông báo `integration.connection.degraded` |
| 1.12 | Đăng ký route public mới (kèm lý do) trong `tests/unit/architecture/route-capability-guard.test.ts` |

### 1D. RBAC, gói dịch vụ, điều hướng

| WP | Việc |
|---|---|
| 1.13 | Capability mới (dùng mã kế tiếp trong `capability-catalog.ts`): `integration.view`, `integration.connect`, `integration.configure`, `integration.govern`, `integration.events.replay`; kèm defaultRoles và hard cap (`govern` chỉ dành cho owner/admin tầng chuỗi trở lên). Cập nhật `02-function-catalog.md` và `src/core/rbac/README.md` |
| 1.14 | `PLAN_FEATURES`: thêm `integrations.sales_channels`, `integrations.api` theo D5 |
| 1.15 | navKey `integrations` trong `ALL_NAV_KEYS`; mục "Tích hợp" trong `nav-mother.ts` (`/van-hanh/tich-hop`, nhóm THIẾT LẬP), `nav-industry.ts`, `nav-chain.ts`, `nav-store.ts` (`/tich-hop`). Cập nhật các test nav-matrix, whitelist, duplicate |
| 1.16 | Sự kiện thông báo mới trong danh mục sự kiện theo tầng: `integration.connection.degraded`, `integration.event.dead` |

### 1E. Giao diện (Progressive Disclosure; đọc `OPERATING_PRINCIPLES.md` trước)

| WP | Màn hình | Component (`src/components/integrations/`) |
|---|---|---|
| 1.17 | `/tich-hop`: Tổng quan (L0) gồm thẻ "Đang hoạt động / Cần xử lý / Lỗi 24h" | `integrations-overview.tsx` |
| 1.18 | Danh mục (L1): tab theo nhóm, thẻ connector có nhãn trạng thái | `connector-catalog.tsx`, `connector-card.tsx` |
| 1.19 | Luồng kết nối (L2): 6 bước; hành động R3 đi qua `ConfirmDialog`; trạng thái job lấy qua `TaskStatus` | `connect-wizard/*` |
| 1.20 | Chi tiết kết nối (L3): sức khoẻ, cấu hình, nhật ký sự kiện (phân trang tối đa 100), nút "Thử lại", ngắt kết nối | `connection-detail/*` |
| 1.21 | Chuỗi chữ tiếng Việt trong `src/lib/i18n/locales/vi` (skill copywriting-governance) | — |

**Cổng kiểm tra:** `typecheck`, `lint:ratchet`, `lint:ux -- --check`, `npm test`, `test:tenant`, `test:platform`, `build`, `test:e2e:ux` (màn hình mới), `check:docs`.
**Xong khi:** 4 tầng đều thấy mục "Tích hợp"; danh mục hiển thị đúng theo tầng, gói dịch vụ và RBAC; webhook mẫu (connector `test-echo` chỉ bật ở môi trường dev) đi trọn luồng, gồm cả chống trùng và dead-letter.

---

## GĐ2 — Chuyển tích hợp hiện có vào Hub

> **Tiến độ 31/10/2026 — GĐ2a xong:** Facebook Messenger, Zalo OA, SePay, Zalo ZNS, eSMS, Telegram và token SocialFlow/LocalBudd quản lý ngay tại `/tich-hop` (loại `MANAGED`: trạng thái thật đọc từ bảng gốc + panel cấu hình sẵn có nhúng vào; panel token là màn mới — trước đây chưa có giao diện). `/hoi-thoai/kenh-tich-hop` chuyển hướng (D7). Gác khoá tính năng production: đầu nối có tuyến gốc đang khoá hiện "Sắp ra mắt". Cron gắn vào `smeos-cron-dispatch-sweep`.
> **GĐ2b xong 31/10/2026 — PO chọn hướng A (thay WP 2.3/2.4/2.5/2.9):** không chuyển webhook Facebook/Zalo/SePay sang cổng chung — cổng xử lý theo lượt cron và che số điện thoại nên làm chậm trả lời chat và mất dữ liệu chốt đơn; Meta chỉ cho một callback cho cả app. Thay vào đó route riêng ghi nhật ký vào Hub (`record-managed-webhook.ts`), không đổi callback URL, không đổi lược đồ. WP 2.1 xong: một client Telegram dùng chung (nợ #200). `/ket-noi` và `/noi-bo/ket-noi` giữ trang riêng (đang khoá production, nằm ngoài phạm vi chuyển).

Thứ tự từ rủi ro thấp đến cao. Mỗi connector là một WP, đi qua checklist mục 7 của đề xuất.

| WP | Connector | Cách chuyển |
|---|---|---|
| 2.1 | Telegram | Gộp `notification/.../telegram-adapter.ts` và `greeting-card/.../staff-channels/telegram-*` thành `connectors/telegram/` dùng chung; các module cũ gọi qua port |
| 2.2 | eSMS, Zalo ZNS | Bọc adapter hiện có thành connector; cấu hình đọc qua lớp tương thích với `greeting_integrations` (chưa di trú dữ liệu) |
| 2.3 | Facebook Messenger | Dữ liệu của `chat_channel_integrations` được ghi sang `integration_connections` bằng script chạy lặp được. Webhook cũ `/api/v1/chat/webhooks/facebook` vẫn chạy song song 1 phiên bản phát hành, rồi chuyển sang cổng chung (cần cập nhật callback URL trong Meta App) |
| 2.4 | Zalo OA (chat) | Tương tự 2.3 |
| 2.5 | SePay | Chuyển `payment_webhook_key_hash` sang connection loại `WEBHOOK_KEY`; route `public/payments/sepay` giữ nguyên URL và giao cho Hub xử lý; logic đối khớp đơn vẫn ở greeting-card |
| 2.6 | API & Webhook | Trang quản lý `integration_tokens` (phát hành, xoay, thu hồi) được đưa vào tab "API & Webhook" |
| 2.7 | Liên kết chuỗi ↔ cửa hàng | Tab "Chuỗi & cửa hàng" nhúng `chain-partners-tab.tsx` hiện có (không viết lại) |
| 2.8 | Redirect `/ket-noi`, `/hoi-thoai/kenh-tich-hop`, `/noi-bo/ket-noi` về `/tich-hop?tab=…`; bỏ navKey `channels` khỏi menu | `nav-matrix.ts` và các test liên quan |
| 2.9 | Xoá đường đọc dữ liệu cũ sau 1 phiên bản phát hành; migration xoá bảng `chat_channel_integrations` (cần PO duyệt) | — |

**Cổng kiểm tra:** như GĐ1, và thêm test hồi quy cho luồng thiệp (thanh toán SePay → gửi thông báo).
**Xong khi:** không còn màn hình cấu hình tích hợp nào nằm ngoài `/tich-hop`; số liệu sự kiện webhook trước và sau khi chuyển khớp nhau.

---

## GĐ3 — Governance 4 tầng (dừng chờ PO duyệt D4)

> **Xong 31/10/2026 (PO duyệt D4).** Khác kế hoạch ở hai điểm, có chủ đích: (1) WP 3.6 không chuyển trạng thái kết nối sang `DISABLED_BY_UPPER` — khoá được tính lúc dùng (cổng webhook, webhook Facebook/Zalo, kết nối mới), gỡ khoá là chạy lại ngay, không cần đồng bộ trạng thái hàng loạt; (2) chỉ đầu nối có điểm thực thi mới cho khoá (`governable`) — SePay/ZNS/eSMS/Telegram/token API chờ có điểm kiểm trong phân hệ của chúng. Tầng Mẹ/Ngành dùng quyền vận hành mới `N16`.

| WP | Việc |
|---|---|
| 3.1 | `domain/integration-governance.ts`: `effectiveMode(connector, orgChain)` dùng `resolveLayered`, thứ tự Mẹ (GLOBAL) → Ngành (`industry:<key>`) → Chuỗi (qua cạnh chính `organization_links`) → Cửa hàng |
| 3.2 | `resolveEffectiveConnection(ctx, connectorKey)`: dùng kết nối riêng nếu chế độ là `ALLOW_OWN` và đã có; nếu không thì dùng kết nối kế thừa của chuỗi; nếu không có thì báo `NOT_CONFIGURED`. Tất cả module nghiệp vụ gọi qua hàm này |
| 3.3 | Kế thừa chỉ cho phép *dùng*, không cho *đọc credential*: cửa hàng thấy tên tài khoản của chuỗi, không thấy và không sửa được cấu hình |
| 3.4 | API `GET/PUT /api/v1/integrations/governance`, yêu cầu `integration.govern`; trả 422 kèm `violations` (LOCKED_BY_UPPER, STORE_CANNOT_LOCK) giống `governance-matrix`; ghi audit |
| 3.5 | UI tab "Quản trị tầng dưới" ở Mẹ, Ngành, Chuỗi, dùng lại mẫu `components/governance` |
| 3.6 | Khi chuỗi đổi chế độ hoặc ngắt kết nối: thông báo cho các cửa hàng bị ảnh hưởng; kết nối riêng của cửa hàng chuyển sang trạng thái `DISABLED_BY_UPPER` (không xoá) |

**Test bắt buộc:** ma trận từng cặp tầng × chế độ; chuỗi A không tác động được tới cửa hàng của chuỗi B (`test:tenant`); partnership chuyển sang không ACTIVE thì mất kế thừa.
**Xong khi:** chuỗi bật "Bắt buộc dùng SePay của chuỗi" thì mọi cửa hàng thành viên dùng ngay, không cần cấu hình thêm.

---

## GĐ4 — Kênh bán hàng (dừng chờ PO duyệt D2, D6)

### 4A. Nền chung cho kênh bán hàng (khoảng 2 tuần)

> **Xong 31/10/2026** (PO duyệt 2 bảng `sales_channel_listings`, `sales_channel_orders`). Khác kế hoạch: WP 4.4 đẩy còn/hết hàng theo trạng thái mở bán (chưa có số tồn — nợ #95) và chạy khi người dùng bấm, chưa tự đẩy theo sự kiện/đối soát đêm; webhook sàn chỉ mang mã đơn, chi tiết lấy lại qua API. Có kênh bán thử `test_shop` để kiểm trọn luồng.

| WP | Việc |
|---|---|
| 4.1 | Mở rộng port: `SalesChannelCatalogProvider` (đã có), thêm mới `OrderSyncProvider` (`pullOrders(cursor)`, `ackOrder`, `updateFulfillment`) và `InventorySyncProvider` (`pushStock(items≤100)`) trong `src/core/ports/` |
| 4.2 | Bảng ánh xạ (cần PO duyệt schema): `sales_channel_listings` (product/variant ↔ listing id ngoài, trạng thái, lỗi) và `sales_channel_orders` (đơn ngoài ↔ đơn nội bộ, khoá idempotency là mã đơn ngoài) |
| 4.3 | Đơn từ sàn được nhập vào `orders` qua use-case hiện có với `source=<channel>`; không tạo lối ghi riêng |
| 4.4 | Tồn kho: một chiều ALG → sàn (ALG là nguồn sự thật); đẩy theo sự kiện thay đổi tồn kho và đối soát toàn bộ mỗi đêm |
| 4.5 | Giao diện: tab "Kênh bán hàng" gồm ánh xạ sản phẩm (chọn sản phẩm → đẩy lên kênh), danh sách lỗi listing, đơn đồng bộ gần nhất |

### 4B. Từng sàn (mỗi sàn khoảng 2 tuần, đi qua checklist mục 7 của đề xuất)

| Thứ tự | Connector | Phạm vi bản phát hành đầu tiên |
|---|---|---|
| 4.6 | Shopee Open Platform | OAuth shop, đẩy và gỡ listing, lấy đơn qua webhook và poll dự phòng, đẩy tồn kho |
| 4.7 | TikTok Shop Partner | Tương tự Shopee |
| 4.8 | Meta Catalog / Google Merchant | Chỉ đẩy catalog (không có đơn hàng) |
| 4.9 | Lazada | Tương tự Shopee |
| 4.10 | Haravan / Sapo / KiotViet | Đồng bộ sản phẩm, tồn kho và đơn hàng hai chiều (cần quyết định thêm về nguồn sự thật) |

Mỗi sàn cần: contract test với mock server, test verify chữ ký webhook, tôn trọng rate limit của sàn, runbook xử lý sự cố, và tài khoản sandbox của sàn (D2).
**Xong khi:** một cửa hàng thử nghiệm đẩy 50 sản phẩm lên Shopee, nhận đơn thật về `orders` và tồn kho khớp sau khi đối soát đêm.

---

## GĐ5 — Mở rộng (mỗi nhà cung cấp cần PO duyệt riêng, D3)

| WP | Nhóm | Ghi chú |
|---|---|---|
| 5.1 | VNPay / MoMo / PayOS | Port `PaymentProvider` (tạo link thanh toán, nhận IPN có chữ ký, hoàn tiền); SePay đi chung port này |
| 5.2 | Vận chuyển GHN / GHTK / Ahamove | Port `ShippingProvider` (báo giá, tạo vận đơn, webhook trạng thái) |
| 5.3 | Hoá đơn điện tử | Port `EInvoiceProvider`; mã số thuế cấp chuỗi, cửa hàng kế thừa |
| 5.4 | App giao đồ ăn (GrabMart, ShopeeFood) | Chỉ ngành bật (F&B); dùng lại `OrderSyncProvider` |
| 5.5 | Webhook ra ngoài cho khách doanh nghiệp | Đăng ký endpoint, ký HMAC, retry, nhật ký giao; gắn gói PRO |

---

## 2. Rủi ro và cách giảm

| Rủi ro | Cách giảm |
|---|---|
| Di trú webhook Facebook/Zalo làm rơi tin nhắn | Chạy song song 1 phiên bản phát hành; chống trùng theo message id; theo dõi số sự kiện trước và sau |
| Xét duyệt app của Meta, Zalo, sàn kéo dài | Nộp hồ sơ ngay khi GĐ1 bắt đầu (việc của PO); connector để `BETA` cho tới khi được duyệt |
| Rate limit của sàn | Hàng đợi theo connection, token bucket, đẩy tối đa 100 mục mỗi lần |
| Rò secret | Vault chỉ mở được trong use-case; test quét log và response; secret-box có version để xoay khoá |
| File vượt 350 dòng | Tách theo connector hoặc thành phần ngay từ đầu |
| Rò dữ liệu chéo tenant khi kế thừa | Kế thừa chỉ cho dùng, không cho đọc credential; `test:tenant` là cổng chặn |

## 3. Tài liệu cập nhật kèm

- GĐ1:
  - Tạo `docs/dac-ta/22-integration-hub-spec.md` và đăng ký trong registry.
  - Thêm liên kết từ `08-integration-specification.md`.
  - Cập nhật `02-function-catalog.md` và `TRANG_THAI.md` §4–6.
  - Thêm skill `.claude/skills/integration-hub/SKILL.md`.
- GĐ2: cập nhật `docs/kien-truc/as-is/11-tich-hop.md` và `12-bao-mat.md`; nếu có lỗi lặp lại thì thêm dòng vào `AGENT_RULES.md` §14.
- Mỗi connector: một trang runbook trong `docs/kien-truc/integrations/<connector>.md`.
