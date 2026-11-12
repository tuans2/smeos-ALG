# 17 — Phương án thay thế SocialFlow: đưa đăng bài mạng xã hội về ALG

> Quyết định PO 01/11/2026: **D-46 = a** — ALG không phụ thuộc SocialFlow nữa; chuyển phần chức năng đang dùng về `ALG`.
> Repo SocialFlow **không truy cập được** trong phiên. Phạm vi dưới đây dựng từ (1) mọi chỗ `ALG` đang gọi SocialFlow, (2) đặc tả M07/P18 và quyết định D11 trong tài liệu `ALG`. Chi tiết API của Facebook, Instagram, Zalo, TikTok, LinkedIn **phải đối chiếu tài liệu chính thức hiện hành của nhà cung cấp** khi thực hiện; kế hoạch này không khẳng định chi tiết API.

## 1. Hiện trạng: ALG đang dùng gì của SocialFlow

| # | Chức năng | Nơi gọi trong `ALG` | Endpoint SocialFlow | Ghi chú |
|---|---|---|---|---|
| F1 | Danh sách bài, trạng thái, lỗi, link bài | `src/app/(app)/lich-dang/page.tsx`, `components/dashboard/marketing-workspace.tsx` | `GET api/m07/posts` | Trường: `id, title, content, platform, channel_label, status, scheduled_time, created_at, media_paths, post_url, error_message` |
| F2 | Lên lịch hàng loạt | Lịch đăng | `POST api/m07/posts/batch-schedule` | `{ ids, scheduled_time }` |
| F3 | Đăng ngay | Lịch đăng | `POST api/m07/posts/:id/publish` (dự phòng `api/posts/:id/publish`) | |
| F4 | Thử lại bài lỗi | Lịch đăng | `POST api/m07/posts/:id/retry` | |
| F5 | Kết nối tài khoản MXH (Facebook, Instagram, LinkedIn, TikTok, Zalo): lưu, đăng nhập, kiểm phiên, ngắt | `components/channel-connections/use-channel-accounts.ts`, trang `/ket-noi` | `api/accounts`, `…/:platform/login`, `…/check`, `DELETE …/:platform` | Gửi **tên đăng nhập + mật khẩu** + mã 2 bước; "phiên đã được lưu" → SocialFlow đăng bài bằng phiên đăng nhập (tự động hoá trình duyệt) |
| F6 | Số liệu bài đăng cho Chặng 12 | `POST /api/v1/integration/content-metrics` (SocialFlow đẩy vào `content_metrics`) | — | |
| F7 | Chặng 10 hành trình sáng tạo: gắn mã bài đã đăng | `creative-production` (stage-10-launch), `package-downstream-card.tsx` | mã bài SocialFlow | |
| F8 | Tự duyệt theo thời hạn (D11, gác `O7`) | `AutoApprovePanel` | — | **Chỉ là công tắc trên giao diện** (`useState`), không lưu, không có tác dụng; mã `O7` **chưa có** trong `capability-catalog.ts` |
| F9 | Gợi ý đăng lại bài hiệu quả | `SmartRepostTab` | dựa trên danh sách bài | Cần số liệu thật |

### Lỗi đang có (sửa ngay ở GĐ0 bất kể phương án)
- **Báo thành công giả:** `lich-dang/page.tsx` dòng ~266–279 — lỗi mạng khi đăng thì vẫn đánh dấu `published` và hiện "Đã xuất bản thành công" (chú thích "Demo / fallback mô phỏng"). Khi đăng thành công cũng gắn link chung chung (`facebook.com/me`) thay cho link bài thật (`makeChannelUrl`).
- **Chuỗi soạn → đăng bị đứt:** `content_generations` có trạng thái `SCHEDULED` và `social_post_ids`, nhưng `markScheduled` **không được gọi ở đâu** — bài đã duyệt ở `/noi-dung` không bao giờ vào Lịch đăng.
- Production không khai `SOCIALFLOW_URL` → F1–F5 đang lỗi.

## 2. Nguyên tắc thiết kế

1. **Không chép cách đăng bằng mật khẩu/phiên trình duyệt.** Lưu mật khẩu tài khoản MXH của khách và tự động hoá trình duyệt vi phạm điều khoản nền tảng, dễ khoá tài khoản, và là rủi ro bảo mật. Thay bằng **API chính thức + OAuth**; token mã hoá trong vault của Integration Hub.
2. **Đăng bài là một loại đầu nối của Integration Hub** (D-31, ARC-007) — hưởng sẵn vault, nhật ký sự kiện, retry, khoá theo tầng (Mẹ/Chuỗi khoá được kênh của cửa hàng).
3. **Một nguồn bài đăng:** nội dung đã duyệt (`content_generations`, `campaign_packages`) sinh bài đăng; Lịch đăng chỉ quản lý lịch và trạng thái.
4. Theo kiến trúc hiện có: domain thuần, Prisma ở `infra/`, SDK/HTTP ở `adapters/`, lịch chạy qua cron Render đã có (không thêm hạ tầng — D19), mọi vòng thử lại có giới hạn.
5. Trạng thái hiển thị **chỉ** theo kết quả thật từ nền tảng (không mô phỏng thành công).

## 3. Kiến trúc đích

```
/noi-dung (duyệt J5) ──► "Gửi lịch đăng" ─┐
Chặng 09/10 gói chiến dịch ───────────────┤
                                          ▼
                     modules/social-publishing
                       domain: máy trạng thái bài, luật lịch, luật tự duyệt (D11)
                       use-cases: tạo bài, lên lịch, đăng ngay, thử lại, huỷ, tự duyệt, đồng bộ số liệu
                       infra: social_posts, social_post_events (Prisma, scopedWhere)
                                          │ port PublisherProvider (đã có ở core/ports)
                                          ▼
                     integration-hub/adapters/connectors/
                       facebook_page · instagram_business · zalo_oa   (v1)
                       linkedin_page · tiktok                          (v2 — cần nền tảng duyệt app)
                       token OAuth trong credential vault, khoá theo tầng (integration_governance)
                                          ▲
Cron Render 5 phút ──► /api/v1/internal/social-publish-sweep (x-cron-secret)
                         lấy bài đến giờ (khoá, không trùng) → đăng → ghi kết quả / hẹn thử lại
Cron hằng ngày     ──► đồng bộ số liệu bài đã đăng → content_metrics (Chặng 12, gợi ý đăng lại)
```

### 3.1 Máy trạng thái bài đăng

```
DRAFT ──duyệt──► APPROVED ──lên lịch──► SCHEDULED ──đến giờ──► PUBLISHING ──► PUBLISHED
                    │                       │  ▲                     │
                    │                       │  └──thử lại (≤5 lần)───┤
                    └──► CANCELLED ◄────────┘                        ▼
                                                                  FAILED ──thử lại tay──► SCHEDULED
```
- `PUBLISHED` chỉ khi nền tảng trả mã bài; lưu `external_post_id` và `post_url` thật.
- Lỗi do token/quyền → `FAILED` + báo "kết nối lại tài khoản", không thử lại tự động.
- Idempotency: mỗi lần đăng mang khoá `post_id + attempt`; ghi `PUBLISHING` trước khi gọi nền tảng để tránh đăng hai lần khi tiến trình chết giữa chừng (bài kẹt `PUBLISHING` quá 15 phút → kiểm trạng thái trên nền tảng trước khi thử lại).

### 3.2 Dữ liệu — **[SCHEMA]**, PO xem từng migration (D-29)

| Bảng | Trường chính |
|---|---|
| `social_posts` | `organization_id` (+ index), `connection_id` (→ kết nối Hub), `platform`, `source_type` (CONTENT_GENERATION · CAMPAIGN_PACKAGE · MANUAL), `source_id`, `text`, `hashtags`, `media_asset_ids`, `status` (enum), `scheduled_at`, `published_at`, `external_post_id`, `post_url`, `attempts`, `next_attempt_at`, `last_error`, `approved_by`, `auto_approved`, `created_by`, `branch_id` (phạm vi chi nhánh — D-04) |
| `social_post_events` | `organization_id`, `post_id`, `event` (tạo, duyệt, lên lịch, đăng, lỗi, huỷ), `payload` đã che dữ liệu nhạy cảm |
| Tài khoản MXH | Dùng `integration_connections` của Hub (không tạo bảng tài khoản riêng); token qua `credential-vault.ts` |
| Số liệu | Dùng lại `content_metrics` (`content_id` = `social_posts.id`) |
| `content_generations.social_post_ids` | Trỏ sang `social_posts.id` (thay mã SocialFlow) |

### 3.3 Quyền, gói, quản trị

| Việc | Cổng |
|---|---|
| Xem Lịch đăng | `J5` hoặc `W1` |
| Tạo/lên lịch/đăng/thử lại/huỷ | `J5` `social.publish` (Điều hành, Marketing) |
| Kết nối/ngắt tài khoản | `W2` `integration.connect` (trần cứng Điều hành) |
| Bật tự duyệt theo thời hạn | **Thêm mã `O7`** (trần cứng Điều hành, mặc định tắt, ghi `audit_logs` — D11) |
| Gói dịch vụ | `PLAN_FEATURES` hiện **không có** khoá cho đăng bài — xem câu hỏi S-4 |
| Khoá theo tầng | Mẹ/Chuỗi khoá đầu nối qua `integration_governance` (có sẵn) |

### 3.4 Kênh

| Kênh | Cách đăng (cần xác minh tài liệu nhà cung cấp) | Điều kiện | Giai đoạn |
|---|---|---|---|
| Facebook Page | Graph API đăng lên Trang (chữ, ảnh) bằng Page token | App Meta được duyệt quyền quản lý/đăng bài Trang; xác minh doanh nghiệp | v1 |
| Instagram (tài khoản doanh nghiệp/creator gắn với Trang) | Graph API đăng nội dung (ảnh/carousel) — ảnh phải có URL công khai → dùng URL ký có hạn | Như trên + quyền đăng nội dung Instagram | v1 |
| Zalo OA | API Zalo OA (bài viết / tin truyền thông) — **cần xác minh** loại nội dung được phép và hạn mức | OA đã xác thực; app Zalo; dùng lại cấu hình OA đã có ở kênh chat/Thẻ chào nếu đủ quyền | v1 |
| LinkedIn (Trang công ty) | API đăng bài của LinkedIn | Duyệt chương trình đối tác | v2 |
| TikTok | API đăng nội dung của TikTok | App được TikTok duyệt | v2 |

Có thể **gộp một kết nối Meta** cho cả chat Messenger (đang có) và đăng bài Facebook/Instagram để khách chỉ kết nối một lần.

## 4. Hạng mục thực hiện (Workstream S — thay P2-G3 trong `16`)

| Mã | Việc | Công | Phụ thuộc | Nghiệm thu |
|---|---|---|---|---|
| S-00 | **[TAY — làm ngay]** PO nộp xét duyệt app Meta (quyền đăng Trang + Instagram), xác minh doanh nghiệp; kiểm quyền API Zalo OA; đăng ký LinkedIn/TikTok nếu chọn v2 | — | — | Có app được duyệt (thường mất vài tuần — đường găng) |
| S-01 | **(GĐ0)** Sửa báo thành công giả và link giả ở Lịch đăng; ẩn tính năng khi chưa có nguồn đăng | S | — | Lỗi mạng → báo lỗi thật; E2E UX |
| S-02 | **[SCHEMA]** `social_posts`, `social_post_events`, enum trạng thái | M | P2-C1 | `migrate diff` sạch; tenant test cách ly |
| S-03 | Domain: máy trạng thái, luật lịch (không lên lịch quá khứ, giới hạn số bài/giờ/kênh), luật tự duyệt D11 | M | — | Unit đủ cặp chuyển |
| S-04 | Use-case + API `/api/v1/social/posts` (danh sách, tạo, lên lịch hàng loạt, đăng ngay, thử lại, huỷ); zod; `J5`; đặc tả 06 | M | S-02, S-03 | Route guard test, tenant test |
| S-05 | "Gửi lịch đăng" từ `/noi-dung` và gói chiến dịch → tạo `social_posts`, gọi `markScheduled` với mã nội bộ; nối Chặng 10 | M | S-04 | Tenant test luồng soạn → duyệt → lên lịch |
| S-06 | Kết nối OAuth trong Hub: bắt đầu/callback, lưu token vào vault, làm mới token, kiểm sức khoẻ (dùng cron `integrations-sweep` có sẵn); thay modal mật khẩu ở `/ket-noi` bằng nút "Kết nối bằng …" | L | P2-C1, S-00 | Không còn trường mật khẩu; token mã hoá; test vault |
| S-07 | Đầu nối `facebook_page` (`PublisherProvider`) | M | S-06 | Test hợp đồng với HTTP giả; thử thật trên Trang thử nghiệm |
| S-08 | Đầu nối `instagram_business` (ảnh qua URL ký có hạn) | M | S-07 | như trên |
| S-09 | Đầu nối `zalo_oa` (đăng bài) | M | S-06, P2-C2 | như trên |
| S-10 | Lịch chạy: `/api/v1/internal/social-publish-sweep` (cron 5 phút đã có), khoá chống chạy trùng, retry có giới hạn theo `event-retry-policy.ts`, bài kẹt `PUBLISHING` | M | S-04, S-07 | Tenant test: hai lượt quét không đăng trùng |
| S-11 | Tự duyệt theo thời hạn: mã `O7`, công tắc lưu ở cài đặt tổ chức + audit log, quét hết hạn | S–M | S-10 | Tắt → bài quay lại hàng chờ; bật → lên lịch; có audit |
| S-12 | Đồng bộ số liệu bài đã đăng → `content_metrics`; Chặng 12 và "Gợi ý đăng lại" đọc số liệu thật | M | S-07, S-08 | Test hợp đồng; tab gợi ý dùng số liệu |
| S-13 | Chuyển giao diện: Lịch đăng, trang chủ Marketing, `/ket-noi`, Chặng 10 sang API nội bộ; Screen Contract `lich-dang.md`, `ket-noi.md` cập nhật | M | S-04, S-06 | E2E UX; không còn gọi `/api/v1/proxy` |
| S-14 | Gỡ SocialFlow: tiền tố proxy `SOCIALFLOW`, client token `SOCIALFLOW`, `integration/content-metrics` cho SocialFlow, script `worker:socialflow`, chú thích/tài liệu; cùng P2-G4 gỡ proxy + SSO liên-app | S–M | S-13 | `grep -ri socialflow src` chỉ còn lịch sử tài liệu; route guard test |
| S-15 | **[TAY]** Archive repo SocialFlow; nếu cần, xuất lịch sử bài từ CSDL SocialFlow (câu hỏi S-3) | S | S-14 | Biên bản |
| S-16 (v2) | Đầu nối LinkedIn, TikTok | M mỗi kênh | S-00 duyệt xong | như S-07 |

**Tổng v1 (S-01 … S-15):** khoảng 25–35 ngày công; chạy song song với GĐ2 → 5–7 tuần lịch, **phụ thuộc thời gian duyệt app Meta/Zalo (S-00)**.

## 5. Chuyển đổi và bỏ SocialFlow

1. SocialFlow không chạy trên production (thiếu `SOCIALFLOW_URL`) → **không cần chạy song song**; bật kênh mới theo tổ chức bằng cờ (`ux-rollout-flags`).
2. Tài khoản MXH **không chuyển được** (mật khẩu/phiên) → mỗi tiệm kết nối lại bằng OAuth; màn `/ket-noi` hướng dẫn.
3. Lịch sử bài: theo S-3.
4. Sau S-14, `ALG` không còn mã gọi SocialFlow; khi P2-G2 (LocalBudd) cũng xong thì gỡ proxy, SSO liên-app, token tích hợp (P2-G4).

## 6. Rủi ro

| Rủi ro | Giảm thiểu |
|---|---|
| Duyệt app Meta/Zalo chậm hoặc bị từ chối | Làm S-00 ngay tuần 1; dựng S-02…S-05, S-10 với đầu nối giả trong lúc chờ |
| Hạn mức/giới hạn tần suất API nền tảng | Luật giới hạn số bài mỗi giờ mỗi kênh (S-03); retry có giới hạn |
| Token hết hạn → bài lỗi hàng loạt | Kiểm sức khoẻ token theo cron; thông báo "kết nối lại" trước khi hết hạn |
| Đăng trùng khi tiến trình chết | Trạng thái `PUBLISHING` + idempotency + kiểm trên nền tảng trước khi thử lại |
| Ảnh Instagram cần URL công khai | URL ký có hạn ngắn, chỉ cho đúng asset của bài |
| Không có staging (R-1) | Đầu nối thử nghiệm với Trang/OA thử; cờ bật theo tổ chức |

## 7. Câu hỏi cho PO

| Mã | Câu hỏi | Phương án | Đề xuất |
|---|---|---|---|
| S-1 | Kênh nào ở v1? | a) Facebook + Instagram + Zalo OA · b) + LinkedIn + TikTok · c) Chỉ Facebook | ★ **a** |
| S-2 | App Meta | a) Dùng app Facebook đang dùng cho chat (đã có `FB_APP_SECRET`), xin thêm quyền đăng bài · b) Tạo app riêng cho đăng bài | ★ **a** — một kết nối Meta cho khách |
| S-3 | Lịch sử bài trong SocialFlow | a) Không chuyển · b) Chuyển bài đã đăng (để giữ số liệu Chặng 12) | ★ **a** nếu SocialFlow chưa có khách thật dùng; cho biết hiện trạng |
| S-4 | Đăng bài thuộc gói nào? (`PLAN_FEATURES` chưa có khoá) | a) Mọi gói (chỉ RBAC) · b) Thêm khoá `social.publish` vào `STARTER` trở lên · c) Chỉ `PRO` trở lên | ★ **b** — cần ngoại lệ cho D-08a |
| S-5 | Đăng bài thuộc mốc nào? | a) M2 (bán cho cửa hàng) · b) Sau M2 | ★ **a** nếu đăng bài là điểm bán hàng |
