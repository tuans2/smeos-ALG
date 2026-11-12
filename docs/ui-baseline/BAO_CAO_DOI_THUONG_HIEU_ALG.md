# Báo cáo đổi nhận diện sang ALG (mức 3)

Quyết định của người giao việc ngày 12/11/2026: mức 3 (đổi toàn bộ), dùng logo trong repo (`public/brand/avi-lotus/`), đồng ý bảng màu trạng thái đề xuất, tên sản phẩm hiển thị **ALG** (viết tắt AVI Lotus Group). **PO cần xác nhận trước khi gộp nhánh** (đổi token cần PO duyệt — `docs/design-system/README.md` §3).

## 1. Đã đổi

| Hạng mục | Thay đổi | Vị trí |
|---|---|---|
| Bộ giao diện | Preset `alg` mặc định cho mọi tầng (Console, Chuỗi giữ mật độ gọn); cửa hàng vẫn chọn lại được preset cũ | `src/styles/tokens/themes.css`, `src/lib/ui-system/` |
| Màu | Chính `#133D31`, nền `#F0EFEF`, chữ `#242C28`; trạng thái từ màu phụ của brand kit | như trên |
| Phông | Google Sans (SIL OFL, kèm giấy phép), trục đậm 400–700, lọc Latin + tiếng Việt, woff2 56/59 KB | `src/app/fonts/google-sans/`, `src/app/layout.tsx` |
| Logo, favicon | Logo ngang ở trang đăng nhập; favicon và icon iPhone cắt từ biểu tượng hoa sen | `src/app/(auth)/dang-nhap/page.tsx`, `src/app/icon.png`, `src/app/apple-icon.png` |
| Tên | "smeOS" → "ALG" ở 109 dòng chữ hiển thị (tiêu đề trang, Copilot, chân trang, trang khách, phiếu in, i18n, lời chào trợ lý); tên và logo gom về `src/lib/brand.ts` | 71 tệp |
| Email thông báo | Tiêu đề `[ALG]`, nút màu `#133D31`, chữ Jet Set, phông Google Sans (dự phòng Arial) | `email-adapter.ts` |
| Phiếu in | Màu "đã thu"/"quá hạn" theo màu trạng thái ALG | `order-evidence-print.tsx` |
| Ảnh xem trước khi chia sẻ link | Nền xanh Botanical Garden, điểm nhấn vàng Yellow Balloon | `og/catalog-collage-image.tsx` |

### Màu trạng thái — vì sao không dùng nguyên màu phụ cho chữ
`text-success` được dùng làm màu chữ ở 426 chỗ, `text-info` 49 chỗ; `#93A87C` và `#9DB4D4` chỉ đạt 2,1–2,6:1 với nền trắng/chữ trắng. Vì vậy màu gốc của brand kit dùng cho **nền nhạt và viền** (`-border`), còn chữ và nền đậm dùng **sắc đậm hơn cùng tông**. Vàng cảnh báo dùng đúng `#E7C447` làm nền; 16 chỗ chữ trắng trên nền vàng đã đổi sang chữ tối. Test `tests/unit/ux/alg-brand-theme.test.ts` kiểm 29 cặp chữ/nền ≥ 4,5:1.

## 2. Cố ý giữ nguyên

| Chỗ | Lý do |
|---|---|
| Mã liên kết Telegram `SMEOS-…`, User-Agent | Định dạng kỹ thuật; đổi làm hỏng mã đã phát |
| Tên chủ tài khoản ngân hàng nạp credit (`vietqr-billing.ts`) | Là tài khoản thật — cần ALG cung cấp tài khoản mới |
| Tên cột và tên tệp mẫu Excel nhập hàng loạt | Giữ để tệp mẫu cũ vẫn nhập được |
| Tiêu đề OpenAPI, tiêu đề hợp đồng JSON, ghi chú "FloraOS v1" | Tài liệu kỹ thuật/lịch sử, không hiển thị cho người dùng |
| Prompt hệ thống gửi AI (thẩm định ảnh, QC, POD, trợ lý sản phẩm) | Không hiển thị; đổi có thể ảnh hưởng hành vi AI — cần kiểm riêng |
| Mã QR in ấn | Dùng logo và màu **của từng cửa hàng** |
| Thương hiệu khách AVI GIFT trong mã | Chưa có quyết định |

## 3. Cần ALG/PO cung cấp hoặc quyết

1. **Tên miền**: đã đổi `smeos.vn` → `avilotusgroup.com` (giữ tiền tố `app.`, `docs.`, `storage.`…) trong mã, test, `AGENTS.md`, tài liệu và một dòng chú thích ví dụ trong `render.yaml` (quyết định 12/11/2026). **Chưa làm (ngoài repo):** trỏ DNS, đặt `PUBLIC_APP_URL`/`NEXT_PUBLIC_APP_URL` trên Render, dựng trang `docs.avilotusgroup.com` (Copilot đang dẫn tới hướng dẫn tích hợp Facebook/Zalo ở đó). Giữ nguyên tiền tố bản ghi TXT `_smeos-verify` để tên miền riêng đã xác minh của cửa hàng không bị mất xác minh.
2. **Tài khoản ngân hàng** nạp credit nền tảng (đang là "CONG TY CONG NGHE SMEOS").
3. Prompt AI có đổi tên trợ lý/nền tảng sang ALG không.
4. Logo bản trắng cho nền tối (repo đã có `*-white.png`; chưa dùng ở màn nào).

## 4. Kiểm tra

- Typecheck, lint ratchet, `lint:ux` (23, không tăng), `check:docs`, `npm test` (chỉ còn `public-url` đỏ do `.env` local, có từ trước).
- Trên server dev: phông Google Sans nạp thật trên mọi màn đã kiểm; axe không còn lỗi tương phản màu trên 12 lượt màn (đăng nhập, trang chủ, Thẻ chào, Chính sách AI, Sản phẩm, Đơn hàng × 390/1280); favicon và ảnh OG trả 200.
- Phát hiện khi kiểm: trước khi sửa, phông chữ **không được nạp** (body nhận chuỗi gốc từ `@theme`, biến của `next/font` chỉ đặt trên body). Đã sửa bằng `className` của phông. Cách nạp Be Vietnam Pro cũ giống hệt nên nhiều khả năng lỗi có từ trước (chưa đối chiếu với `main`).
- **Chưa chạy**: `test:tenant`, `test:platform`, `test:e2e:ux` — ảnh chụp chuẩn của e2e sẽ khác toàn bộ vì đổi màu, cần sinh lại trên CI sau khi PO duyệt.
- Phông thương hiệu chỉ đến độ đậm 700: 623 chỗ dùng `font-extrabold`/`font-black` hiển thị ở 700 (khớp hướng dẫn "hạn chế Bold" của brand kit).

## 5. Đổi tên toàn bộ sang ALG (quyết định 12/11/2026, lần 2)

Đã đổi thêm:
- Prompt AI và vai trợ lý; tiêu đề OpenAPI (sinh lại 4 tệp đặc tả), tiêu đề hợp đồng zod (sinh lại schema creative/content-engine); tên tổ chức QA, email QA mặc định `@avilotusgroup.com`; User-Agent; chuỗi trong worker; log script; chú thích mã; ghi chú trong manifest giai đoạn 1.
- Component `AlgGlobalCopilot` (`alg-global-copilot.tsx`), kiểu `AlgTier`, sự kiện `alg:open-copilot`.
- Tệp mẫu nhập hàng `ALG_Template_Master_Kho_San_Pham.xlsx` (sửa 4 ô tiêu đề, giữ 14 quy tắc kiểm dữ liệu); tên cột cũ vẫn được nhận.
- Mã liên kết Telegram `ALG-…` (vẫn nhận `SMEOS-…`); bản ghi TXT tên miền riêng `_alg-verify` / `alg-verify=` (vẫn nhận bản ghi cũ cho tên miền đang chờ xác minh).
- Tài liệu: 542 dòng trong 182 tệp; 65 tệp tài liệu đổi tên (`SMEOS_…`, `FloraOS…`, `FLORAOS_…` → `ALG_…`), cập nhật mọi liên kết. Không sửa `docs/archive/` (hồ sơ lịch sử), `docs/ui-baseline/` (báo cáo về chính việc đổi tên) và `CLAUDE.md` (PO sở hữu).
- Luật kiểm bàn giao: mẫu chung `ALG_Template_*.xlsx` không tính là tệp của khách.

Còn giữ — **cần quyết định riêng vì đổi sẽ gây gián đoạn**:

| Định danh | Ví dụ | Đổi thì |
|---|---|---|
| Cookie phiên, cookie và header SSO | `smeos_session`, `floraos_session`, `floraos_sso`, `x-floraos-sso` | Mọi người dùng bị đăng xuất; SSO giữa các dịch vụ phải đổi đồng thời |
| Vai trò, trigger, hàm trong DB | `smeos_app`, `smeos_worker`, `smeos_readonly`, `smeos_append_only_guard` | Cần migration mới (migration cũ không được sửa) và cấp lại quyền trên production |
| Tên DB, dịch vụ Docker/Render | `smeos`, `smeos_test`, `smeos-web`, `smeos-worker` | Đổi cấu hình triển khai, `render.yaml` (PO duyệt) |
| Biến môi trường | `FLORAOS_CORE_INTEGRATION_TOKEN`, `FLORAOS_DA_DOI_PYTHON` | Phải đặt lại trên mọi môi trường cùng lúc |
| Khoá lưu trên trình duyệt, tiền tố job | `smeos_finalized_pitches_…`, `floraos_job_…` | Người dùng mất dữ liệu nháp đã lưu; job đang chạy mất liên kết |
| Tên gói npm, thư mục `.agents/standards/alg/` | `"name": "smeos"` | Không hiển thị cho người dùng |
| Ghi chú nguồn gốc mã | "thu hoạch từ FloraOS v1", đường dẫn `FloraOS/floraos-web/…` | Là tên kho mã gốc — đổi sẽ sai lịch sử |
| Tên chủ tài khoản billing mặc định | `CONG TY CONG NGHE SMEOS` (số tài khoản giả) | Cần tài khoản thật của ALG |
| Tài khoản QA đã tạo | `test01@smeos.com` trên máy chủ | Mặc định mới chỉ áp cho lần tạo sau |

Lệch có sẵn (không do đổi tên, chưa sửa): schema `coordinator` (`assemblySteps`) lệch mã ngay trên HEAD — `npm run check:schemas:coordinator` đỏ trước thay đổi này.

## 6. Đổi định danh hạ tầng (quyết định 12/11/2026, lần 3) — thay cho bảng "Còn giữ" ở mục 5

Nguyên tắc: tên mới là `alg`, tên cũ **vẫn đọc được** ở mọi chỗ có dữ liệu hoặc phiên đang sống, nên triển khai không đăng xuất người dùng, không mất bản nháp, không phụ thuộc thứ tự triển khai web/worker.

| Định danh | Mới | Tương thích ngược | Commit |
|---|---|---|---|
| Cookie phiên, SSO, vai dev, xem trước tầng | `alg_session`, `alg_sso`, `alg_dev_role`, `alg_tier_preview` | Đọc `smeos_*`/`floraos_sso`; đăng xuất xoá cả tên cũ | 5dfaa550, 4e7ba0de |
| Header SSO | `x-alg-sso` | Nhận và vẫn gửi kèm `x-smeos-sso`, `x-floraos-sso` | 5dfaa550 |
| Khoá mã hoá bí mật tích hợp | salt `alg-secret-box` | Giải được bản mã `smeos-`/`floraos-secret-box` (có test) | 5dfaa550 |
| Kênh job LISTEN/NOTIFY | `alg_job_*` | Web gửi cả kênh cũ; worker nghe cả hai | 5dfaa550 |
| Tên kết nối DB | `alg-web`, `alg-worker:*` | Truy vấn "worker còn sống" đếm cả `smeos-worker:*` | 5dfaa550, 4e7ba0de |
| Hàm trigger DB | `alg_*` (5 hàm) | Migration `20261112030410_rename_db_functions_to_alg` | cb3fdeb4 |
| Vai DB | `alg_app`, `alg_worker`, `alg_system`, `alg_readonly` | Script `scripts/db/rename-roles-to-alg.sql` + quy trình trong `OPERATIONS_RUNBOOK` | cb3fdeb4 |
| Khoá lưu trình duyệt | `alg_*`, `alg.*`, `alg:*` | Tự chuyển khoá cũ một lần khi tải trang (`src/lib/brand-storage-migration.ts`) | 4e7ba0de |
| Biến môi trường nội bộ | `ALG_DA_DOI_PYTHON`, `ALG_DEBUG_MAU` | Cờ gỡ lỗi cũ vẫn nhận | 5dfaa550 |
| Tên gói npm, thư mục chuẩn agent | `alg`, `.agents/standards/alg/` | — | 4e7ba0de |
| Docker cục bộ, DB test, CI | container `alg-db`, user/DB `alg`, `alg_test`, volume `alg-db-data` | — (xem bước cho máy dev bên dưới) | đợt D |

### Bước một lần cho máy dev (Docker cục bộ)
Volume mới `alg-db-data` là DB trống (volume cũ `smeos-db-data` vẫn còn, không bị xoá). Chạy lại đúng lệnh cài đặt: `docker compose up -d && npx prisma generate && npm run db:deploy && npm run db:seed`, rồi `npm run db:test:setup`. Cập nhật `.env` theo `.env.example` (`postgresql://alg:alg@localhost:5433/alg`, `…/alg_test`).

### Render — KHÔNG đổi trong `render.yaml` (cần làm trên bảng điều khiển, theo thứ tự)
Render nhận diện dịch vụ trong blueprint theo `name`. Đổi `name` trong `render.yaml` khiến Render **tạo dịch vụ mới** (không có biến môi trường, tên miền, lịch sử deploy); với `smeos-postgres` là **một CSDL mới rỗng** và web/worker sẽ trỏ sang đó. `databaseName`/`user` của CSDL đang chạy không đổi được. Nếu muốn đổi tên hiển thị:
1. Đổi tên từng dịch vụ trên bảng điều khiển Render (Settings → Name) — URL `*.onrender.com` cũ có thể đổi theo, cần cập nhật `CUSTOM_DOMAIN_TARGET`/CNAME của cửa hàng.
2. Sau đó mới sửa `name`/`fromService`/`fromDatabase` trong `render.yaml` cho khớp và đồng bộ blueprint.
3. CSDL giữ `databaseName: smeos`, `user: smeos` (không đổi được tại chỗ); muốn đổi phải tạo CSDL mới và chuyển dữ liệu (pg_dump/restore) trong khung bảo trì.

### Cố ý giữ (đổi sẽ làm hỏng dữ liệu hoặc tài nguyên bên ngoài)
| Định danh | Lý do |
|---|---|
| Salt PII `smeos-pii-phone-hash`, `smeos-pii-dev-key` (`src/core/security/pii-cipher.ts`) | Giá trị băm số điện thoại đã lưu để tìm khách; đổi salt = mọi khách hiện có không tra được theo số điện thoại cho tới khi băm lại toàn bộ dữ liệu |
| Tên bot Telegram `smeos_dieuphoi_bot` (giá trị dự phòng hiển thị) | Tài khoản bot thật trên Telegram — ALG cần tạo bot mới qua BotFather rồi đặt token |
| Bucket lưu ảnh, nhận diện khoá ảnh cũ `smeos-core/org/`, `floraos-core/org/` | Tên tài nguyên thật và khoá đã lưu trong DB |
| Dịch vụ và CSDL Render | Xem trên |
| `scripts/cron-job.sh` (đường dẫn máy cá nhân `/Users/…/floraos-core`) | Đường dẫn trên máy của chủ dự án |
| Migration cũ, `docs/archive`, nhật ký lịch sử có ngày tháng, ghi chú nguồn gốc "FloraOS v1" | Hồ sơ đã xảy ra |
| `CLAUDE.md` | PO sở hữu |

### Kiểm tra đợt hạ tầng
- `npm test` 4912/4914 (2 ca `public-url` đỏ do `.env` local, có từ trước); typecheck, lint, `check:docs`, OpenAPI, schema creative/content-engine đạt.
- 24 tệp test tenant liên quan (phiên, SSO, proxy, tích hợp, tên miền riêng, RLS, nhật ký bất biến, job, nền tảng): 109/109 sau khi cập nhật 2 ca kỳ vọng `smeos_sso`. **Chưa chạy trọn 276 tệp tenant** (mất hơn 40 phút trên máy này).
- Migration đổi tên hàm áp thật trên DB dev: mọi trigger trỏ hàm `alg_*`, trigger nhật ký bất biến vẫn chặn sửa.
- Script đổi vai chạy thật trên Postgres cục bộ: quyền, BYPASSRLS, `rls_mode` giữ nguyên; chạy lại an toàn.
- **Chưa chạy**: CI trên GitHub với tên DB mới, test worker Python (thiếu `numpy` trong môi trường), e2e.
