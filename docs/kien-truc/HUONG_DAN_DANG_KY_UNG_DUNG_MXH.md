# Hướng dẫn đăng ký ứng dụng mạng xã hội cho "Đăng tự động"

> PO 08/11/2026: đăng ký ứng dụng **mới, cấp nền tảng** cho Meta (Facebook + Instagram), Zalo và TikTok — đăng ký TikTok
> ngay. Cửa hàng không tự nhập khoá: chỉ bấm **Kết nối** ở Bước 4 của nhóm "Tạo nội dung" trên `/cong-cu`, đồng ý trên
> trang của nền tảng, rồi hệ thống tự đăng. Mã nguồn: `src/modules/social-publishing/` (khoá ứng dụng đọc ở
> `adapters/oauth/app-config.ts`). Thiếu khoá của nền tảng nào → kênh đó hiện "Chưa mở".

Ai làm: quản trị nền tảng ALG (người giữ tài khoản doanh nghiệp với Meta / Zalo / TikTok). Khoá bí mật nhập ở phần
biến môi trường của dịch vụ web trên Render (Environment → Secret), **không** gửi qua chat, không ghi vào mã hay tài liệu.

## 0. Địa chỉ cần khai báo ở cả 3 nền tảng

`<PUBLIC_APP_URL>` là địa chỉ công khai của ALG (vd. `https://app.avilotusgroup.com`; biến `PUBLIC_APP_URL`, trống thì lấy
`RENDER_EXTERNAL_URL`). Địa chỉ gọi về (redirect URI / callback URL) phải khai **đúng từng ký tự**:

| Nền tảng | Địa chỉ gọi về |
|---|---|
| Meta (Facebook + Instagram) | `<PUBLIC_APP_URL>/api/v1/social-publishing/channels/facebook/callback` |
| Zalo | `<PUBLIC_APP_URL>/api/v1/social-publishing/channels/zalo/callback` |
| TikTok | `<PUBLIC_APP_URL>/api/v1/social-publishing/channels/tiktok/callback` |

Ảnh đăng bài được gửi bằng link ký có hạn của kho tệp (`STORAGE_ENDPOINT`) — các nền tảng tự tải ảnh từ link đó, nên
kho tệp phải truy cập được từ Internet (môi trường máy thử dùng đĩa cục bộ sẽ không đăng ảnh được).

## 1. Meta — Facebook Page + Instagram Business

1. Vào `developers.facebook.com` → **My Apps → Create App** → loại **Business**. Gắn với Business Manager của doanh nghiệp.
2. Thêm sản phẩm **Facebook Login for Business**. Trong **Settings → Valid OAuth Redirect URIs** khai địa chỉ ở mục 0.
3. Quyền (Permissions) cần xin — khớp `META_SCOPES` trong `adapters/oauth/meta-oauth.ts`:
   `pages_show_list`, `pages_read_engagement`, `pages_manage_posts`, `business_management`, `instagram_basic`,
   `instagram_content_publish`.
4. **Business Verification** (xác minh doanh nghiệp) và **App Review** cho từng quyền ở bước 3: quay video luồng
   "bấm Kết nối → chọn Trang → đăng bài" trên ALG. Trước khi được duyệt, chỉ tài khoản có vai trò trong ứng dụng
   (Admin/Developer/Tester) kết nối được — dùng để thử.
5. Chuyển ứng dụng sang **Live**. Lấy **App ID** và **App Secret** (Settings → Basic).
6. Đặt biến môi trường: `META_APP_ID`, `META_APP_SECRET`.

Ghi chú vận hành: Instagram phải là tài khoản **Business/Creator** đã gắn với Trang Facebook — kết nối Trang sẽ tự kết nối
Instagram đi kèm. Page token lấy qua token dài hạn không hết hạn; nếu chủ Trang đổi mật khẩu / gỡ quyền, bài sẽ dừng với
lý do "Kết nối hết hạn" và ô kênh hiện **Kết nối lại**.

## 2. Zalo — Official Account

1. Vào `developers.zalo.me` → **Tạo ứng dụng** bằng tài khoản Zalo của doanh nghiệp. Lấy **App ID** và **Khoá bí mật**.
2. Trong ứng dụng: **Official Account → Thiết lập chung** — khai **Callback URL** ở mục 0. Bật quyền quản lý **bài viết**
   (tạo bài viết trên OA) cho ứng dụng; nộp xét duyệt quyền nếu Zalo yêu cầu.
3. Mỗi cửa hàng là quản trị viên OA của mình — khi bấm **Kết nối**, họ chọn OA và đồng ý cấp quyền cho ứng dụng.
4. Đặt biến môi trường: `ZALO_SOCIAL_APP_ID`, `ZALO_SOCIAL_APP_SECRET`.

Ghi chú vận hành: access token sống ~25 giờ, refresh token 3 tháng và **chỉ dùng một lần** — hệ thống tự làm mới trước
khi đăng (`use-cases/refresh-connection.ts`). Cửa hàng không đăng bài nào trong 3 tháng sẽ phải kết nối lại. Hệ thống chỉ
đăng **bài viết** lên trang OA, không tự gửi tin quảng bá tới người theo dõi (tin nhắn có hạn mức, cần PO quyết riêng).
Ứng dụng này tách khỏi `ZALO_OA_APP_ID` hiện có (OA chung của nền tảng nhắn nhân viên chi nhánh).

## 3. TikTok — Content Posting API

1. Vào `developers.tiktok.com` → **Manage apps → Connect an app** bằng tài khoản doanh nghiệp. Lấy **Client key** và
   **Client secret**.
2. Thêm sản phẩm **Login Kit** (khai **Redirect URI** ở mục 0) và **Content Posting API** (bật **Direct Post**).
3. Quyền (Scopes) — khớp `TIKTOK_SCOPES` trong `adapters/oauth/tiktok-oauth.ts`: `user.info.basic`, `video.publish`.
4. **Xác minh tên miền chứa ảnh** (URL properties / domain verification) cho tên miền của kho tệp — bắt buộc với cách
   đăng ảnh `PULL_FROM_URL`. Chưa xác minh → bài dừng với lý do "Tên miền chứa ảnh chưa được xác minh".
5. Nộp **App Review / audit** cho Content Posting API. Trước khi qua duyệt, TikTok chỉ cho đăng ở chế độ **riêng tư**
   (hệ thống tự lấy mức hiển thị hợp lệ từ `creator_info`, không ép công khai) — thử được ngay, bài chỉ chủ tài khoản thấy.
6. Đặt biến môi trường: `TIKTOK_CLIENT_KEY`, `TIKTOK_CLIENT_SECRET`.

Ghi chú vận hành: access token 24 giờ, refresh token 365 ngày — hệ thống tự làm mới. TikTok xử lý bài bất đồng bộ; mã bài
lưu ở `social_posts.external_post_id` là `publish_id`.

## 4. Kiểm tra sau khi cấu hình

1. Mở `/cong-cu` → **Tạo nội dung** → **Đăng tự động**: ô kênh đổi từ "Chưa mở" sang "Chưa kết nối".
2. Bằng tài khoản thử (vai trò Tester/Developer của ứng dụng): bấm **Kết nối** → đồng ý → quay về Bước 4 với thông báo
   "Đã kết nối kênh". Facebook có nhiều Trang thì hiện hộp **Chọn Trang**.
3. Chọn bài đã duyệt ở Bước 3 → **Đăng ngay** → trong ≤ 5 phút (lượt cron `smeos-cron-dispatch-sweep`) bài đổi sang
   "Đã đăng", có nút **Xem bài**. Lỗi hiện bằng câu dễ hiểu kèm **Thử lại**.
4. Đối soát: bảng `social_posts` (trạng thái, mã bài), `social_post_attempts` (từng lần thử), `audit_logs`
   (`social_channel.connect`, `social_post.schedule`).
