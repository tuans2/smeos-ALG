# Đề xuất — Hệ liên lạc thống nhất và đẩy tin nhắc giao (checklist 4.30, 4.32)

Trạng thái: `DRAFT` — chờ chủ dự án duyệt các mục ở cuối · ngày 11/11/2026 · nhánh `claude/tach-123-chuc-nang-svc96l`.

Mục tiêu do chủ dự án đặt: mọi kênh liên lạc (Zalo, SMS, Web Push…) **đăng ký một lần cho cả hệ thống**, sau đó chỉ **bật/tắt** việc dùng.

## 1. Hiện trạng: bốn đường gửi tin chạy song song

| Đường gửi | Nơi trong mã | Kênh | Khoá nhà cung cấp nằm ở đâu |
|---|---|---|---|
| A. Thông báo 4 tầng (nhân viên) | `src/modules/notification` (`notifyOrganization`) | Trong ứng dụng, email, Telegram; SMS và Zalo **từ 11/11/2026** | Sổ nhà cung cấp cấp nền tảng (mục 2) |
| B. Thẻ Chào — báo nhân viên | `greeting-card/use-cases/notify-staff.ts`, `adapters/staff-channels/` | Telegram, Zalo OA | Token Zalo OA chung trong `platform_secrets` (`zalo_oa_tokens`); bot Telegram trong biến môi trường |
| C. Thẻ Chào — báo khách | `greeting-card/use-cases/notify-customer.ts` | Zalo ZNS, SMS eSMS | **Từng tổ chức tự nhập khoá** (`greeting-notification-repository.saveSealedCredentials`) |
| D. Điều phối chuỗi — mốc tiến độ | `api/v1/internal/chain-dispatch-sweep` → `MultiChannelDispatchNotifier` | Zalo OA, Telegram | Như B |

Hệ quả: khoá nhập ở nhiều chỗ, công tắc ở nhiều chỗ, mỗi đường tự viết phần gửi và chống trùng.

## 2. Đã làm (11/11/2026) — "đầu chờ" nhà cung cấp

Chỉ cần nhập thông số nhà cung cấp là dùng được, không sửa mã:

1. **Đăng ký một lần** ở Console tầng Mẹ: `PUT /api/v1/platform/notification/providers` (năng lực `N2`).
   - SMS — eSMS.vn: `apiKey`, `secretKey`, `brandname`.
   - Zalo — ZNS: `appId`, `secretKey`, `accessToken`, `refreshToken`, `templateId` (mẫu dùng chung, hai tham số mặc định `title` và `message`, đổi tên được bằng `titleParam` / `messageParam`).
   - Web Push — VAPID: `publicKey`, `privateKey`, `subject` (lưu được, chưa gửi được — mục 4).
2. **Kiểm khoá**: `POST /api/v1/platform/notification/providers/test` gửi một tin thử tới số nhập vào (tối đa 10 tin / 10 phút / người vận hành).
3. **Bật/tắt** cho cả hệ thống: `PATCH /api/v1/platform/notification/channels` (đã có).
4. Tầng dưới chọn kênh theo sự kiện × vai qua chính sách 4 tầng (đã có): chuỗi, cửa hàng, từng người.

Bảo mật: khoá niêm phong bằng `secret-box` trong `platform_secrets` (không đổi lược đồ); API không bao giờ trả lại khoá, chỉ báo "đã có"; ô khoá để trống khi sửa = giữ khoá cũ; mọi lần sửa và gửi thử ghi nhật ký nền tảng. Refresh token Zalo dùng một lần nên việc làm mới chạy dưới khoá dòng. Thiếu cấu hình → kênh trả `NOT_CONFIGURED`, không báo đã gửi.

Mã: `notification/domain/channel-providers.ts`, `infra/channel-provider-store.ts`, `infra/channel-adapters/{sms,zalo}-adapter.ts`, `use-cases/manage-channel-providers.ts`. Test: `channel-providers.test.ts`, `stub-adapters-not-configured.test.ts`, `tests/platform/channel-providers.test.ts`.

Chưa có màn hình Console cho sổ này — API đã sẵn; màn hình là việc tiếp theo (mục 5, bước 1).

## 3. Đề xuất — một sổ kênh, một cổng gửi

```
Tầng Mẹ: đăng ký nhà cung cấp (1 lần) ──► bật/tắt kênh toàn hệ thống
                                              │
Chuỗi / cửa hàng / người dùng: chọn kênh theo sự kiện × vai (chính sách 4 tầng)
                                              │
Mọi nghiệp vụ (A, B, C, D) ──► một cổng gửi chung ──► adapter kênh ──► nhà cung cấp
```

1. **Một sổ nhà cung cấp** (đã có ở mục 2) là nguồn khoá duy nhất. Đường B, D đọc token Zalo OA và bot Telegram từ sổ này thay cho chỗ riêng.
2. **Một cổng gửi**: đường B, C, D gọi adapter kênh của module thông báo thay vì tự gọi nhà cung cấp. Chuyển từng đường, mỗi đường một commit có test, giữ hành vi cũ.
3. **Báo khách (đường C)**: mặc định dùng khoá chung của tầng Mẹ; tổ chức có brandname / OA riêng thì được ghi đè (giữ chức năng đang có). → *cần chủ dự án chốt* (mục 6, câu 2).
4. **Chi phí**: SMS và ZNS tính phí theo tin. Khi dùng khoá chung, mỗi tin trừ vào hạn mức của tổ chức gửi qua module mức dùng sẵn có. → *cần chủ dự án chốt đơn giá* (mục 6, câu 3).
5. **Thứ tự kênh dự phòng** cho tin quan trọng: Trong ứng dụng → Web Push → Zalo → SMS (tin tốn phí chỉ gửi khi kênh miễn phí không tới được người nhận).

| Kênh | Nhà cung cấp | Phí mỗi tin | Hợp cho | Trạng thái |
|---|---|---|---|---|
| Trong ứng dụng | — | 0 | mọi người | chạy |
| Email | SMTP đang dùng | thấp | quản lý, báo cáo | chạy |
| Telegram | bot | 0 | nhân viên | chạy |
| Web Push | tự chạy (VAPID) | 0 | nhân viên trên điện thoại / máy tính | cần mục 4 |
| Zalo ZNS | Zalo | theo bảng giá Zalo | khách và nhân viên | **sẵn sàng, chờ khoá** |
| SMS | eSMS.vn | theo bảng giá eSMS | dự phòng | **sẵn sàng, chờ khoá** |

## 4. Web Push — phần còn thiếu

Web Push miễn phí, hợp nhất cho nhắc nhân viên, nhưng cần:

1. Bảng lưu thiết bị đã bật nhận tin `push_subscriptions` (`organization_id`, `user_id`, `endpoint`, `p256dh`, `auth`, `created_at`, `@@index([organization_id])`) — **đổi lược đồ, cần duyệt**.
2. Mã hoá nội dung (RFC 8291) và ký VAPID: dùng thư viện `web-push` (**phụ thuộc mới, cần duyệt**) hoặc tự viết bằng `node:crypto` (~150 dòng, không thêm phụ thuộc, nhiều rủi ro hơn). Đề xuất: thư viện `web-push`.
3. Service worker và nút "Bật thông báo trên thiết bị này" ở trang hồ sơ; API `POST/DELETE /api/v1/notification/push-subscriptions` (của chính mình, cách ly tổ chức).

Ước lượng: 1,5–2 ngày gồm test cách ly.

## 5. 4.32 — đẩy tin nhắc giao trước 60 / 30 phút

Hiện mốc M1/M2 chỉ hiện ở thanh nhắc `/dieu-phoi`; người dùng phải mở trang mới thấy.

1. Sự kiện mới `DELIVERY_REMINDER_DUE` ở danh mục sự kiện cửa hàng: người nhận mặc định là vai điều phối và quản lý cửa hàng; kênh mặc định Trong ứng dụng + Web Push (+ Zalo nếu tầng Mẹ bật); deep link `/dieu-phoi`.
2. Lịch quét: thêm bước vào cron 5 phút đang chạy (`chain-dispatch-sweep`) — không đổi `render.yaml`. Bước này dùng lại `getCoordinatorReminders` (cùng luật với thanh nhắc, mốc theo cấu hình R12: mặc định 120 / 60 phút, chỉnh được 60 / 30).
3. Chống gửi trùng: khoá `reminder:<mã đơn>:<M1|M2>` trong bảng `idempotency_keys` sẵn có (đã có dọn định kỳ) — không đổi lược đồ.
4. Gửi qua `notifyOrganization` (best-effort, không chặn cron). Đơn đã xác nhận mốc ở thanh nhắc thì không gửi.

**Đã làm 11/11/2026** theo đúng thiết kế trên (người nhận mặc định: điều phối + quản lý cửa hàng; kênh mặc định Trong ứng dụng, Telegram, Web Push, thêm Zalo cho điều phối — kênh ngoài chỉ đi khi tầng Mẹ bật). Chỉ đẩy mốc vừa tới trong 30 phút để lần đầu bật không dội tin. Trước khi có Web Push, tin đi qua Trong ứng dụng và kênh ngoài đã bật.

## 6. Cần chủ dự án quyết

1. Nhà cung cấp chính thức: eSMS cho SMS và Zalo ZNS (đã nối sẵn) — hay nhà cung cấp khác (thêm một mục vào sổ, ~0,5 ngày mỗi nhà cung cấp).
2. Báo khách dùng khoá chung của tầng Mẹ, cho tổ chức ghi đè — đồng ý?
3. Đơn giá trừ hạn mức cho mỗi tin SMS / ZNS khi dùng khoá chung.
4. Web Push: duyệt bảng `push_subscriptions` và thư viện `web-push`.
5. 4.32: đã làm theo mặc định ở mục 5 — đổi người nhận / kênh mặc định nếu muốn.
6. Thứ tự chuyển đường B, C, D sang cổng chung (đề xuất D → B → C, rủi ro tăng dần).
