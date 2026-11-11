---
name: notifications
description: >-
  Hệ thống thông báo 4 tầng SMEOS: danh mục sự kiện theo tầng, động cơ cascading-policy
  (kích hoạt kênh → khoá cứng theo phạm vi → ghi đè từ dưới lên), notifyOrganization,
  adapter kênh (in-app, email, Telegram; SMS/Zalo/Web Push gửi khi tầng Mẹ đã đăng ký nhà cung cấp), deep link, SSE.
  Kích hoạt khi sửa src/modules/notification, components/notification, hoặc thêm sự kiện gửi từ use-case.
---

# Notifications

Đọc trước: `.agents/standards/smeos/06-notifications.md`, rồi `universal/06-notifications.md`; đặc tả `docs/kien-truc/NOTIFICATION_SYSTEM_ARCHITECTURE.md`.

Bắt buộc:
- Sự kiện mới khai trong `domain/events/<tầng>-events.ts`, `deepLinkTemplate` trỏ trang thật (`events-deeplinks.test.ts`).
- Gửi từ nghiệp vụ qua `notifyOrganization` — best-effort, không chặn luồng.
- Kênh mới theo `_channel-adapter.interface.ts`, escape nội dung + test. SMS/Zalo/Web Push đọc nhà cung cấp từ sổ cấp nền tảng (`infra/channel-provider-store.ts`), thiếu cấu hình → `NOT_CONFIGURED`, không báo "đã gửi". Web Push: thiết bị ở `push_subscriptions` (chỉ endpoint dịch vụ đẩy thật), mã hoá ở `adapters/web-push-protocol.ts`.
- `cascading-policy.ts` giữ cổng kênh + phạm vi khoá; quy luật khoá/ghi đè qua lõi chung `core/governance/layered-resolver.ts`.
- Capability: F1/F2 cấu hình tổ chức, N2 nền tảng. Nối nhà cung cấp trả phí → hỏi PO.

Gate: `npm test` (cascading-policy, deeplinks, escaping, notify-organization), `npm run test:tenant`.
