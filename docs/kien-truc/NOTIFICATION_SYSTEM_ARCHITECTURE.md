# KIẾN TRÚC HỆ THỐNG THÔNG BÁO (Notification System)
## smeOS — Enterprise Grade, Multi-Tier, Multi-Role

> **Mã văn bản:** `ARCH-NOTIFY-001`
> **Ngày ban hành:** 27/10/2026 (PO xác nhận)
> **Branch thực thi:** `Nangcap_hethongnotification`
> **Trạng thái:** ĐÃ DUYỆT — ĐANG TRIỂN KHAI

---

## 1. TỔNG QUAN

Hệ thống Notification của smeOS vận hành theo ba nguyên tắc cốt lõi bất biến:

| Nguyên tắc | Hướng | Mô tả |
|:---|:---:|:---|
| **CATALOG** (Quan sát) | ⬆️ Aggregation | SaaS Mother tổng hợp 100% events của tất cả tầng — để quan sát, quản trị, không phải để broadcast |
| **VISIBILITY** (Cấp phép) | ⬇️ Top-down | Mother quyết định event nào được hiển thị ở tầng nào qua Visibility Matrix |
| **SETTINGS** (Thiết lập) | ⬆️ Bottom-up | Tầng nào gần người dùng nhất, thiết lập của tầng đó thắng (most specific wins) |
| **HARD LOCK** (Khóa) | ⬇️ Cascading | Mọi tầng đều có thể hard lock events — khóa tất cả tầng bên dưới mình |
| **CHANNEL ACTIVATION** | ⬇️ Mother only | Chỉ Mother kích hoạt kênh hệ thống — kênh chưa tích hợp = không ai dùng được |

---

## 2. MÔ HÌNH BA LỚP QUẢN TRỊ

### 2.1 Lớp 1 — SaaS Mother: Quan sát & Kiểm soát toàn cục

```
SaaS Mother (/van-hanh → "Quản trị Thông báo")
┌─────────────────────────────────────────────────────────────────────┐
│ CATALOG: Tổng hợp 100% events từ tất cả tầng (via Event Registry)  │
│                                                                      │
│ A. Kích hoạt Kênh (Channel Activation)                              │
│    APP_INBOX [🔵 Luôn bật] | Email [ON/OFF] | Telegram [ON/OFF]    │
│    Push [ON/OFF] | Zalo [ON/OFF] | SMS [ON/OFF] | WhatsApp [ON/OFF] │
│                                                                      │
│ B. Visibility Matrix (Event × Tier)                                  │
│    Quyết định event nào được phép hiển thị ở tầng nào               │
│                                                                      │
│ C. Hard Lock của Mother                                              │
│    Khóa event cụ thể → không ai ở bất kỳ tầng nào override được     │
│                                                                      │
│ D. Platform Defaults                                                 │
│    Seed cài đặt mặc định khi tổ chức mới đăng ký                    │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.2 Lớp 2 — SaaS Ngành / ChainOS: Cài đặt tổ chức

```
SaaS Ngành / ChainOS (/cai-dat → Tab "Thông báo")
┌─────────────────────────────────────────────────────────────────────┐
│ THẤY: Events được Mother cấp phép hiển thị cho tầng này             │
│                                                                      │
│ A. Hard Lock của tầng này                                            │
│    Store + User bên dưới không override được                         │
│                                                                      │
│ B. Org Policy Matrix (Event × Channel × Role)                        │
│    Mặc định cho từng vai trong tổ chức                               │
│    CÓ THỂ đè lên Mother Platform Default                             │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.3 Lớp 3 — StoreOS: Cài đặt cửa hàng

```
StoreOS (/cai-dat → Tab "Thông báo")
┌─────────────────────────────────────────────────────────────────────┐
│ THẤY: Events được Mother cấp phép cho StoreOS                       │
│                                                                      │
│ A. Hard Lock của cửa hàng                                            │
│    User trong cửa hàng không override được                           │
│                                                                      │
│ B. Store Defaults Matrix (Event × Channel × Role)                    │
│    Mặc định cho từng vai trong cửa hàng                              │
│    CÓ THỂ đè lên Chain/Org Policy                                    │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.4 Lớp 4 — User: Cài đặt cá nhân

```
User Preferences (Menu Avatar → "Cài đặt thông báo cá nhân")
┌─────────────────────────────────────────────────────────────────────┐
│ THẤY: Events áp dụng cho vai của mình                               │
│                                                                      │
│ Toggle ON/OFF tự do — THẮNG MỌI default của tầng trên              │
│ "Không làm phiền": khung giờ / tắt tiếng tạm thời                  │
│                                                                      │
│ 🔒 Hard-locked events: hiện read-only, không có toggle              │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 3. CƠ CHẾ HARD LOCK ĐA TẦNG

Mỗi tầng đều có quyền hard lock events — khóa tất cả tầng bên dưới mình:

```
MOTHER Hard Lock    → Khóa tuyệt đối: Industry / Chain / Store / User
INDUSTRY Hard Lock  → Khóa: Chain / Store / User trong mạng lưới này
CHAIN Hard Lock     → Khóa: Store / User trong chuỗi này
STORE Hard Lock     → Khóa: User trong cửa hàng này
```

**Ví dụ thực tế:**

| Tầng khóa | Event bị khóa | Lý do nghiệp vụ |
|:---|:---|:---|
| **Mother** | `TENANT_ISOLATION_BREACH` | Bảo mật hệ thống — không ai được tắt |
| **Industry** | `AFFILIATE_PARTNER_SLA_BREACH` | SLA mạng lưới — chain không được tắt |
| **Chain** | `ORDER_STUCK` | Chuỗi bắt buộc monitor — store không được tắt |
| **Store** | `FLORIST_TASK_ASSIGNED` | Thợ bắt buộc nhận phiếu — user không được tắt |

---

## 4. LUẬT RESOLVE — BOTTOM-UP OVERRIDE

```
Khi hệ thống cần quyết định có gửi notification hay không:

  GATE 1: Channel được Mother kích hoạt chưa?
    → Chưa: DISABLED (bất kể ai set gì)

  GATE 2 (theo thứ tự từ cao xuống thấp):
    → Mother Hard Lock?   → Dùng setting của Mother, kết thúc
    → Industry Hard Lock? → Dùng setting của Industry, kết thúc
    → Chain Hard Lock?    → Dùng setting của Chain, kết thúc
    → Store Hard Lock?    → Dùng setting của Store, kết thúc

  BOTTOM-UP (most specific wins):
    User Preferences     → Có? Dùng luôn
    Store Defaults       → Có? Dùng luôn
    Org/Chain Policy     → Có? Dùng luôn
    Mother Default       → Fallback cuối cùng
```

**Ví dụ minh hoạ:**

```
ORDER_RECEIVED | TELEGRAM | Sale Nguyễn

  Mother default:   TELEGRAM = ON
  Chain policy:     TELEGRAM = OFF  (chuỗi không dùng Telegram)
  Store default:    TELEGRAM = ON   (cửa hàng bật lại)
  User:             (chưa set)

  → Kết quả: TELEGRAM = ON  ←  Store thắng (most specific có setting)
```

---

## 5. EVENT MANAGEMENT SYSTEM — FEDERATED EVENT CONTRACT

### 5.1 Triết lý thiết kế

Mỗi tầng **tự khai báo** sự kiện của mình theo `TierEventContract` interface chuẩn.
SaaS Mother **tổng hợp** tất cả contracts vào một registry duy nhất.
Khi tách repo, mỗi tầng mang file contract của mình — hoàn toàn độc lập.

```
src/modules/notification/domain/events/
  ├── _contract.ts          ← Interface chuẩn (portable khi tách repo)
  ├── mother-events.ts      ← Tầng 1 tự khai báo (ĐỘC LẬP)
  ├── industry-events.ts    ← Tầng 2 tự khai báo (ĐỘC LẬP)
  ├── chain-events.ts       ← Tầng 3 tự khai báo (ĐỘC LẬP)
  ├── store-events.ts       ← Tầng 4 tự khai báo (ĐỘC LẬP)
  └── index.ts              ← Registry Aggregator (chỉ Mother repo giữ)
```

### 5.2 Visibility Matrix — Mother quyết định event nào xuống tầng nào

```
                       │ MOTHER │ INDUSTRY │ CHAIN │ STORE │
───────────────────────┼────────┼──────────┼───────┼───────┤
TENANT_REGISTERED      │  ✅   │    ✅    │  ❌   │  ❌   │
AFFILIATE_ORDER_*      │  ✅   │    ✅    │  ✅   │  ❌   │
CHAIN_ORDER_RECEIVED   │  ✅   │    ❌    │  ✅   │  ✅   │
ORDER_RECEIVED         │  ✅   │    ✅    │  ✅   │  ✅   │
FLORIST_TASK_*         │  ✅   │    ❌    │  ❌   │  ✅   │
SYSTEM_HEALTH_*        │  ✅   │    ❌    │  ❌   │  ❌   │
```

> Mother luôn thấy tất cả (vai quan sát). Các tầng khác chỉ thấy events được cấp phép.

### 5.3 Thêm event mới — Quy trình

**Bước 1**: Sửa file contract tương ứng với tầng sở hữu event:
```
StoreOS event → src/modules/notification/domain/events/store-events.ts
ChainOS event → src/modules/notification/domain/events/chain-events.ts
```

**Bước 2**: Registry aggregator (`index.ts`) tự pickup — không cần sửa thêm file nào.

**Bước 3**: Vào `/van-hanh → Quản trị Notification` để set Visibility Matrix cho event mới.

---

## 6. CẤU TRÚC MODULE

```
src/modules/notification/
├── domain/
│   ├── events/
│   │   ├── _contract.ts                    ← TierEventContract interface
│   │   ├── mother-events.ts                ← Tầng 1 (Mother)
│   │   ├── industry-events.ts              ← Tầng 2 (SaaS Ngành)
│   │   ├── chain-events.ts                 ← Tầng 3 (ChainOS)
│   │   ├── store-events.ts                 ← Tầng 4 (StoreOS)
│   │   └── index.ts                        ← REGISTRY AGGREGATOR
│   ├── cascading-policy.ts                 ← Luật resolve 4 lớp
│   ├── notification-channel.ts             ← Channel types & activation
│   ├── notification-preference.ts          ← Domain entity
│   └── repositories/
│       └── notification-preference-repository.interface.ts
│
├── use-cases/
│   ├── get-platform-notification-policy.ts
│   ├── update-platform-notification-policy.ts
│   ├── get-org-notification-policy.ts
│   ├── update-org-notification-policy.ts
│   ├── get-store-notification-defaults.ts
│   ├── update-store-notification-defaults.ts
│   ├── get-user-notification-preferences.ts
│   ├── update-user-notification-preferences.ts
│   ├── resolve-effective-notification.ts   ← Core: resolve 4 lớp
│   ├── dispatch-notification.ts            ← Core: fan-out channels
│   ├── manage-event-visibility.ts          ← Mother: visibility matrix
│   └── manage-hard-locks.ts               ← All tiers: hard lock mgmt
│
├── infra/
│   ├── notification-preference-repository.ts
│   └── channel-adapters/
│       ├── _channel-adapter.interface.ts
│       ├── app-inbox-adapter.ts
│       ├── email-adapter.ts
│       ├── web-push-adapter.ts
│       ├── telegram-adapter.ts
│       ├── zalo-adapter.ts
│       └── sms-adapter.ts
│
└── adapters/
    ├── notification-api-adapter.ts
    └── notification-sse-adapter.ts
```

---

## 7. SCHEMA DATABASE

### 7.1 Kích hoạt kênh — Mother only

```prisma
model notification_channel_activations {
  channel     String   // APP_INBOX | EMAIL | PUSH | TELEGRAM | ZALO | SMS | WHATSAPP | MESSENGER
  activated   Boolean  @default(false)
  updated_by  String   // platform_admin user_id
  updated_at  DateTime @updatedAt

  @@id([channel])
}
```

### 7.2 Visibility Matrix — Mother quyết định

Lưu ở `governance_decisions` (ADR-012 D-T10; bảng riêng `notification_event_visibility` bỏ ở T-7c, 06/11/2026):
`system = "notification.visibility"`, `decision_key = "<event_key>:<INDUSTRY|CHAIN|STORE>"`, `tier = MOTHER`,
`scope = platform`, `value = {visible}`. Mother luôn thấy tất cả. Đặc tả 07 §45.

### 7.3 Hard Lock — Tất cả các tầng

Lưu ở `governance_decisions` (bảng riêng `notification_hard_locks` bỏ ở T-7c): `system = "notification.hard_lock"`,
`decision_key = "<event_key>:<channel>"`, `tier` = MOTHER | INDUSTRY | CHAIN | STORE, `scope` = `platform` (Mother) hoặc
`org:<organization_id>`, `locked = true`, `value = {enabled, reason}` (`enabled` true = bắt buộc BẬT, false = bắt buộc
TẮT; `reason` hiện cho tầng dưới); gỡ khoá = dòng `value` null, `decided_by` là người đặt/gỡ. Đặc tả 07 §45.

Phạm vi khoá của chuỗi (P2-A11, PO 06/11/2026): `notifyOrganization` tra chuỗi cha chính của tổ chức nhận
(`findPrimaryChainLink`, cạnh `is_primary` của `organization_links`) và truyền `lockParentOrgId`, nên khoá cứng CHAIN do
chuỗi đặt áp xuống cửa hàng đối tác. `lockParentOrgId` chỉ mở phạm vi khoá; chính sách tổ chức (`orgPolicy`, §7.4) của
cửa hàng đối tác không bị chính sách của chuỗi thay. Test: `tests/tenant/tier-consistency.test.ts`.

### 7.4 Cài đặt tổ chức — SaaS Ngành / ChainOS (Lớp 2)

```prisma
model notification_org_policies {
  id                String   @id @default(uuid())
  organization_id   String
  event_key         String
  channel           String
  role_key          String   // RoleUxKey hoặc "*" cho all roles
  enabled           Boolean  @default(true)
  priority_override String?  // NORMAL | URGENT | CRITICAL — null = dùng default
  created_at        DateTime @default(now())
  updated_at        DateTime @updatedAt

  organization organizations @relation(fields: [organization_id], references: [id], onDelete: Cascade)

  @@unique([organization_id, event_key, channel, role_key])
  @@index([organization_id])
}
```

### 7.5 Cài đặt cửa hàng — StoreOS (Lớp 3)

```prisma
model notification_store_defaults {
  id              String   @id @default(uuid())
  organization_id String
  event_key       String
  channel         String
  role_key        String
  enabled         Boolean  @default(true)
  schedule_start  String?  // "08:00"
  schedule_end    String?  // "22:00"
  created_at      DateTime @default(now())
  updated_at      DateTime @updatedAt

  organization organizations @relation(fields: [organization_id], references: [id], onDelete: Cascade)

  @@unique([organization_id, event_key, channel, role_key])
  @@index([organization_id, role_key])
}
```

### 7.6 Cài đặt cá nhân — User (Lớp 4)

```prisma
model notification_user_preferences {
  id              String    @id @default(uuid())
  user_id         String
  organization_id String
  event_key       String
  channel         String
  enabled         Boolean
  mute_until      DateTime? // "Tắt tiếng đến..."
  created_at      DateTime  @default(now())
  updated_at      DateTime  @updatedAt

  organization organizations @relation(fields: [organization_id], references: [id], onDelete: Cascade)

  @@unique([user_id, organization_id, event_key, channel])
  @@index([user_id, organization_id])
}
```

### 7.7 Inbox — Notification Center (In-app)

```prisma
model notification_inbox {
  id              String    @id @default(uuid())
  user_id         String
  organization_id String
  event_key       String
  title           String
  message         String
  deep_link       String?   // "/don-hang/abc123"
  priority        String    @default("NORMAL")
  is_read         Boolean   @default(false)
  read_at         DateTime?
  created_at      DateTime  @default(now())

  organization organizations @relation(fields: [organization_id], references: [id], onDelete: Cascade)

  @@index([user_id, organization_id, is_read])
  @@index([user_id, organization_id, created_at])
}
```

---

## 8. API ROUTES

```
# Platform Admin (Mother)
GET/PATCH  /api/v1/platform/notification/channels          ← Kích hoạt kênh
GET/PATCH  /api/v1/platform/notification/visibility        ← Visibility Matrix
GET/POST/DELETE /api/v1/platform/notification/hard-locks  ← Mother Hard Lock

# Org Admin (Industry / Chain)
GET/PATCH  /api/v1/notification/org-policy
GET/POST/DELETE /api/v1/notification/org-hard-locks       ← Tier Hard Lock

# Store Admin
GET/PATCH  /api/v1/notification/store-defaults
GET/POST/DELETE /api/v1/notification/store-hard-locks     ← Store Hard Lock

# User
GET/PATCH  /api/v1/notification/preferences

# Inbox
GET        /api/v1/notification/inbox?page=1&limit=20
PATCH      /api/v1/notification/inbox/:id/read
POST       /api/v1/notification/inbox/mark-all-read

# Real-time (SSE)
GET        /api/v1/notification/stream
```

---

## 9. NGUYÊN TẮC BẤT BIẾN

| # | Nguyên tắc |
|:---|:---|
| **N1** | `APP_INBOX` luôn kích hoạt — không bao giờ bị tắt |
| **N2** | Kênh chưa được Mother kích hoạt → không ai dùng được, kể cả Hard Lock |
| **N3** | Hard Lock của tầng trên luôn ưu tiên hơn Hard Lock của tầng dưới |
| **N4** | Trong vùng không bị Hard Lock: Bottom-up Override — tầng gần user nhất thắng |
| **N5** | Event Registry là SSOT duy nhất — thêm event = sửa 1 file contract |
| **N6** | Channel adapter pattern — thêm kênh = thêm 1 adapter, không sửa core |
| **N7** | `notification` module không import từ module nghiệp vụ khác (chỉ ngược lại) |
| **N8** | Hard Lock phải có `reason` — người dùng tầng dưới phải được biết lý do |
| **N9** | Mọi bản ghi đều có `organization_id` — tenant isolation bắt buộc |

---

## 10. MIGRATION PATH

| Phase | Nội dung | Sprint |
|:---|:---|:---:|
| **Phase 1** | Domain foundation: Event Contracts, Registry, Cascading Policy, Schema DB | 1 |
| **Phase 2** | Use-cases: resolve, dispatch, hard lock management, visibility management | 1 |
| **Phase 3** | Settings UI: Platform (/van-hanh), Org/Chain, Store, User Preferences | 2 |
| **Phase 4** | Notification Center: Bell icon, Inbox panel, SSE real-time | 2 |
| **Phase 5** | Migrate greeting-card notifications → dùng notification module làm backbone | 3 |
| **Phase 6** | Thêm Email adapter, Web Push adapter | 3 |
| **Phase 7** | Audit trail, analytics, batch digest, Do Not Disturb schedule | 4 |

---

> [!IMPORTANT]
> Tài liệu này là **SSOT kiến trúc hệ thống Notification**. Mọi thay đổi thiết kế phải cập nhật tài liệu này trước khi code.
> Đăng ký tại: `docs/00-DOCUMENTATION-REGISTRY.yaml` với key `ARCH-NOTIFY-001`.
