# Chuyển đổi sang ALG — các bước vận hành ngoài repo

Mã đã đổi nhận diện sang ALG (PR #37, gộp `main` 12/11/2026). Các việc dưới đây **không làm được trong repo**: cần người có quyền DNS, bảng điều khiển Render, CSDL production, Telegram và tài khoản ngân hàng của ALG. Làm theo thứ tự; mỗi bước có cách kiểm.

Chi tiết lý do và tương thích ngược: `docs/ui-baseline/BAO_CAO_DOI_THUONG_HIEU_ALG.md` §5–6. Quy trình gốc đổi vai DB: `OPERATIONS_RUNBOOK.md` §12.

## 0. Trước khi bắt đầu
- Deploy `main` hiện tại lên production **trước** mọi bước dưới. Bản này đọc được cả tên cũ (cookie `smeos_*`, header SSO cũ, kênh job cũ, khoá trình duyệt cũ), nên deploy không đăng xuất ai và không phụ thuộc thứ tự web/worker.
- Kiểm: đăng nhập được; `/van-hanh` báo worker còn sống.

## 1. Tên miền `avilotusgroup.com`
1. Tại nhà đăng ký tên miền: trỏ `app.avilotusgroup.com` (CNAME) về dịch vụ web trên Render; thêm tên miền này trong Render (web → Settings → Custom Domains) để Render cấp HTTPS.
2. Trên Render (web, 3 worker, cron): đặt `PUBLIC_APP_URL` và `NEXT_PUBLIC_APP_URL` = `https://app.avilotusgroup.com`; đặt `NEXTAUTH_URL` nếu đang dùng. `NEXT_PUBLIC_*` được đóng vào bản build → **deploy lại** web sau khi đặt.
3. Nếu đổi máy chủ đích của tên miền riêng các cửa hàng: cập nhật `CUSTOM_DOMAIN_TARGET` (§13 runbook). Bản ghi TXT xác minh cũ (`_smeos-verify`) vẫn được nhận; cửa hàng mới dùng `_alg-verify`.
4. Dựng trang `docs.avilotusgroup.com` (Copilot dẫn tới hướng dẫn tích hợp Facebook/Zalo ở đó) — hoặc báo đội phát triển nếu chưa có trang để đổi đường dẫn.

**Kiểm:** mở `https://app.avilotusgroup.com/dang-nhap` có khoá HTTPS, logo ALG; gửi thử một link cho khách (Thẻ chào) — link phải là tên miền mới; ảnh xem trước link hiện đúng.

## 2. Đổi tên vai CSDL `smeos_*` → `alg_*` (khung bảo trì ngắn)
Chỉ cần nếu CSDL production đã tạo vai bằng bản cũ của `create-roles.sql`. Dịch vụ đăng nhập bằng tên cũ hỏng **ngay** sau bước 2.2, nên chuẩn bị sẵn mọi thứ trước.
1. Soạn sẵn `DATABASE_URL` mới cho từng dịch vụ: chỉ đổi phần user `smeos_app` → `alg_app`, `smeos_worker` → `alg_worker`, `smeos_system` → `alg_system`, `smeos_readonly` → `alg_readonly`; mật khẩu giữ nguyên.
2. Bằng tài khoản chủ sở hữu CSDL: `psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f scripts/db/rename-roles-to-alg.sql`. Vai nào báo "mật khẩu MD5 đã bị xoá" thì đặt lại: `ALTER ROLE alg_… PASSWORD '…'`.
3. Thay `DATABASE_URL` trên Render cho web, 3 worker, cron rồi deploy lại.

**Kiểm:** đăng nhập; `/van-hanh` báo worker còn sống; tạo một đơn thử rồi xem nó hiện trong danh sách.

## 3. Bot Telegram của ALG
Bot hiện tại (`smeos_dieuphoi_bot`) là tài khoản thật trên Telegram, không đổi tên được.
1. Tạo bot mới qua @BotFather (vd. tên người dùng `alg_dieuphoi_bot`).
2. Trên Render đặt token: `TELEGRAM_DISPATCH_BOT_TOKEN` (bot điều phối chuỗi → chi nhánh); `TELEGRAM_STAFF_BOT_TOKEN` / `TELEGRAM_BOT_TOKEN` nếu dùng bot riêng cho nhân viên. Deploy lại.
3. Báo các chi nhánh/nhân viên đã liên kết bot cũ: liên kết lại bằng mã mới (`ALG-…`; mã `SMEOS-…` cũ vẫn nhận).

**Kiểm:** màn kết nối Telegram hiện tên bot mới; gửi thử một đơn gia công → tin nhắn tới đúng nhóm.

## 4. Tài khoản ngân hàng nạp credit nền tảng — **cần sửa mã**
Mã QR nạp credit/mua gói đang dùng tài khoản **mẫu** viết cứng trong mã: `DEFAULT_PLATFORM_BANK` ở `src/modules/platform/domain/vietqr-billing.ts` (MB Bank, số `0388889999`, chủ tài khoản "CONG TY CONG NGHE ALG"). Không có biến môi trường ghi đè.
1. ALG cung cấp: mã BIN ngân hàng, tên ngân hàng, số tài khoản, tên chủ tài khoản đúng như đăng ký (không dấu, viết hoa).
2. Đội phát triển sửa giá trị trên (hoặc thêm cấu hình qua biến môi trường nếu PO muốn đổi mà không cần deploy mã) rồi deploy.

**Kiểm:** mở màn nạp credit, quét QR bằng app ngân hàng — hiện đúng tên chủ tài khoản ALG và số tiền. **Không mở thanh toán thật trước bước này.**

## 5. (Tuỳ chọn) Tên dịch vụ trên Render
**Không** sửa `name` trong `render.yaml` trước: Render coi đó là dịch vụ mới (mất biến môi trường, tên miền) và với `smeos-postgres` là **một CSDL rỗng mới**. Muốn đổi tên hiển thị:
1. Đổi tên từng dịch vụ trên bảng điều khiển (Settings → Name). URL `*.onrender.com` có thể đổi theo → cập nhật `CUSTOM_DOMAIN_TARGET` và CNAME cửa hàng nếu đang trỏ về URL đó.
2. Sau đó mới sửa `name`/`fromService`/`fromDatabase` trong `render.yaml` cho khớp (thay đổi `render.yaml` cần PO duyệt).
3. Tên CSDL `smeos` và user chủ `smeos` không đổi được tại chỗ — chỉ đổi bằng CSDL mới + `pg_dump`/`pg_restore` trong khung bảo trì. Không cần thiết cho người dùng.

## 6. Máy dev (mỗi người một lần)
Docker cục bộ dùng volume mới `alg-db-data` (DB trống; volume cũ vẫn còn). Chạy: `docker compose up -d && npx prisma generate && npm run db:deploy && npm run db:seed`, rồi `npm run db:test:setup`. Cập nhật `.env` theo `.env.example`.

## 7. Kiểm bằng người (chưa làm được trong máy chủ)
- Trình đọc màn hình thật: NVDA (Windows) hoặc VoiceOver (macOS/iOS) trên đăng nhập, Thẻ chào, Đơn hàng, Sản phẩm, Cài đặt.
- Điện thoại thật (iOS + Android): chạm nút nhỏ, thanh trượt mới, menu điều hướng, tải ảnh lên.

## Cố ý giữ tên cũ (đừng đổi)
Salt băm số điện thoại `smeos-pii-phone-hash` (đổi = mất tra cứu khách theo số), tên bucket ảnh và khoá ảnh đã lưu, migration cũ, `docs/archive/`. Lý do: báo cáo đổi thương hiệu §6.
