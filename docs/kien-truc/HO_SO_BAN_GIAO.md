# Hồ sơ bàn giao ALG

> Trạng thái `CANONICAL` · chủ sở hữu: Product Owner · cập nhật 22/10/2026.
> Điểm vào duy nhất cho đội nhận bàn giao. Tệp này chỉ trỏ đến SSOT, không chép lại nội dung.

## 1. Hệ thống gồm gì

| Thành phần | Mã nguồn | Chạy ở đâu (`render.yaml`) |
|---|---|---|
| Web + API (Next.js 16, Prisma 7) | `src/` | `smeos-web` |
| Worker ảnh, đọc ảnh, video (Python) | `workers/` | `smeos-worker-media` · `-vision` · `-video` |
| Cron nhắc mốc gia công, kiểm sức khoẻ | `src/app/api/v1/internal/*` | `smeos-cron-dispatch-sweep` (5 phút) |
| PostgreSQL 16 | `prisma/schema.prisma`, `prisma/migrations/` | `smeos-postgres` |
| Redis (giới hạn tần suất dùng chung) | `src/core/cache/redis-client.ts` | `smeos-redis` |

Tài liệu gốc:
- Kiến trúc: `docs/kien-truc/ALG_SAAS_TARGET_ARCHITECTURE_V2.md`
- Trạng thái và nợ kỹ thuật: `docs/kien-truc/TRANG_THAI.md`, `docs/dac-ta/TECHNICAL_DEBT.md`
- API: `docs/dac-ta/06-api-specification.md`
- CSDL: `docs/dac-ta/07-database-specification.md`
- Quy tắc code: `CLAUDE.md`, `.agents/AGENT_RULES.md`

## 2. Vận hành

| Việc | Tài liệu |
|---|---|
| Deploy, đổi schema, migration lỗi | `docs/kien-truc/VAN_HANH_CAP_NHAT_CSDL.md` |
| Sao lưu, khôi phục, quan trắc, sự cố, xoay khoá | `docs/kien-truc/VAN_HANH_SU_CO_VA_SAO_LUU.md` |
| Dọn dữ liệu mẫu trước khi giao một tenant | `docs/kien-truc/QUY_TRINH_BAN_GIAO_SACH_TENANT.md` |

## 3. Biến môi trường

Danh sách đầy đủ có chú thích: `.env.example` (không chứa giá trị thật). Trên Render, mọi biến
bí mật khai `sync: false` và được nhập trên dashboard, **không bao giờ nằm trong repo**. Repo này
công khai: lịch sử git ai cũng đọc được.

Bắt buộc ở production, thiếu là app từ chối chạy hoặc tính năng tắt:
- `DATABASE_URL`
- `SESSION_SECRET`, `SSO_SESSION_SECRET`, `INTEGRATION_TOKEN_SECRET`
- `CRON_SECRET` — giống nhau ở web và cron
- `NEXT_PUBLIC_APP_URL`
- `REDIS_URL` — tự nối từ `smeos-redis`
- `STORAGE_*`
- `OPENAI_API_KEY` — đọc ảnh, kiểm ảnh QC/giao hàng

## 4. Kiểm soát bảo mật đang có

| Lớp | Cơ chế | Kiểm bằng |
|---|---|---|
| Cách ly tenant | `organization_id` chỉ lấy từ `requireTenantContext()`; truy cập chéo → 404 | `npm run test:tenant` (bắt buộc trong CI) |
| Phân quyền shop | Mã năng lực `R*` — `src/core/rbac/capability-catalog.ts`, `requireCapability()` | `tests/unit/architecture/route-capability-guard.test.ts` |
| Console nền tảng | Mã `N*` — `src/core/platform/platform-capability-catalog.ts` | `npm run test:platform` |
| Link công khai (gia công) | Token HMAC theo tổ chức, mã đơn, chi nhánh; hạn 14 ngày | `tests/tenant/subcontract-public-link.test.ts` |
| Cron nội bộ | `x-cron-secret`, so sánh thời gian hằng; production thiếu khoá → từ chối | `src/core/http/cron-auth.test.ts` |
| AI | Mọi lời gọi qua `callCapability` (sổ chi phí, sàn riêng tư, lọc giấy phép mô hình) | skill `ai-integration` |
| Chuỗi cung ứng | gitleaks (toàn lịch sử), `npm audit` mức high (production: 0 lỗi), CodeQL, Dependabot. `xlsx` cài từ cdn.sheetjs.com — tự kiểm bản mới ở https://cdn.sheetjs.com | `.github/workflows/ci.yml`, `codeql.yml`, `.github/dependabot.yml` |

## 5. Cổng chất lượng

Bảng "Definition of done" trong `CLAUDE.md` khớp với `.github/workflows/ci.yml`:
- typecheck, ESLint ratchet, UX lint;
- unit, tenant, platform;
- đối chiếu tài liệu, template SSOT;
- migration khớp schema;
- build, E2E UX, worker pytest;
- bảo mật.

PR chỉ merge khi CI xanh.

## 6. Việc còn mở khi bàn giao (22/10/2026)

Chờ PO quyết:

| Mã | Việc | Ghi chú |
|---|---|---|
| — | Nghị định 13/2023: đồng ý, hạn lưu, xuất/xoá dữ liệu cá nhân | PO hoãn 22/10 |
| M5 (phần còn lại) | `staff_notifications.recipient_info` chưa có hạn lưu (`chain_branches` đã tách bảng 22/10) | Hạn lưu đi cùng Nghị định 13 |
| M2 | Tệp vượt 350 dòng | Tách dần khi sửa |
| — | Ràng buộc CHECK `orders_balance_vnd_check` chưa có ở CSDL | `VAN_HANH_CAP_NHAT_CSDL.md` mục 2 |
| — | Kiểm thử xâm nhập độc lập | Thuê bên thứ ba trước khi ký với khách |

Tài khoản trên production (PO 22/10/2026):
- **Giữ nguyên** tổ chức "Siin Store" và các tài khoản của nó (`siinstore@dev.vn`, `owner@siinstore.local`, `tuans2@dev.com`, đều vai Điều hành) để PO dùng. KHÔNG chạy `don-tai-khoan` trừ khi PO đổi quyết định. Seed không còn tạo lại các tài khoản này ở production (`SEED_DEV_DATA=false`).
- Superadmin nền tảng: chỉ `tuans2@dev.com`, đủ mã N kể cả `N13`, cấp bằng `npm run gan-van-hanh-nen-tang -- --email=tuans2@dev.com` (không truyền `--capabilities` = đủ mã). Tài khoản này đồng thời là thành viên Siin Store; hai vai độc lập. Thêm người sau này: `npm run gan-van-hanh-nen-tang -- --email=… --capabilities=…`.
- Duyệt đăng ký: mọi tài khoản tự đăng ký hoặc dùng thử chờ `tuans2@dev.com` duyệt ở `/van-hanh/dang-ky`. Duyệt dùng thử hiện mật khẩu tạm một lần để gửi cho khách. Tài khoản do chủ tiệm thêm ở *Cài đặt → Thành viên* không phải chờ duyệt.
- Trang *Vai trò* (`/vai-tro`) là danh mục vai của sản phẩm: "Đang dùng được" nghĩa là tính năng đã xây, không phải tài khoản đang xem có quyền. Không có mã N mà bấm *Console* thì bị đưa về trang chủ — đúng thiết kế.

Việc làm tay còn lại trước khi đưa khách vào:
- [x] Đặt `CRON_SECRET` (giống nhau ở web và cron) và `NEXT_PUBLIC_APP_URL`.
- [x] Cấp quyền superadmin nền tảng cho `tuans2@dev.com`.
- [ ] **Đổi mật khẩu** của `siinstore@dev.vn`, `owner@siinstore.local`, `tuans2@dev.com`: mật khẩu hiện là mật khẩu seed nằm trong lịch sử repo công khai. Làm trước mọi việc khác.
- [ ] Xoay mật khẩu CSDL ALG và ALG (đã lộ qua ảnh chụp màn hình 22/10) — `VAN_HANH_SU_CO_VA_SAO_LUU.md`, mục xoay khoá.
- [ ] Tài khoản test chức năng: tổ chức riêng "ALG QA", `test01@avilotusgroup.com` vai Điều hành, `test02@avilotusgroup.com` vai Sale, không có mã N.
  - Lệnh: `MAT_KHAU_TEST01='…' MAT_KHAU_TEST02='…' npm run tao-tai-khoan-test -- --xac-nhan` (mỗi mật khẩu ≥ 12 ký tự, hai mật khẩu khác nhau). Bỏ `--xac-nhan` thì chỉ kiểm tra. Đổi vai `test02`: thêm `--vai=dieu_phoi`. Chạy xong: `history -c`.
  - Cách khác: thêm ở *Cài đặt → Thành viên* của Siin Store — nhanh hơn nhưng dữ liệu test lẫn vào cửa hàng thật.
- [ ] Bật thông báo lỗi của Render, mức *Only failure notifications* (`VAN_HANH_SU_CO_VA_SAO_LUU.md` mục 2).
- [ ] Thêm 4 secret deploy hook Render vào GitHub (`OPERATIONS_RUNBOOK.md` §3) — `render.yaml` đã tắt `autoDeploy`, thiếu secret thì `main` không deploy.
- [ ] GitHub ruleset cho `main`: bắt buộc PR, check `web`, `worker`, `e2e-ux`, `security`, `industry-terms` xanh, chặn force push. Số người duyệt: 0 nếu chỉ một người làm repo, ≥ 1 khi có đội.
- [ ] Bật secret scanning và push protection (*Settings → Advanced Security*).
- Deploy đầu tiên theo `VAN_HANH_CAP_NHAT_CSDL.md` mục 4: export CSDL trước, rồi đọc log `db-deploy`.
