# Kế hoạch bàn giao Giai đoạn 1 cho ALG — 3 tầng, 123 chức năng

## Bối cảnh

ALG (Công ty Cổ phần Công nghệ Avi Lotus Group) sẽ nhận một repo riêng gồm SaaS Mother, ChainOS, StoreOS và đúng 123 chức năng trong `docs/nghiem-thu/CHECKLIST_NGHIEM_THU_123_CHUC_NANG.xlsx`. Chưa gói nào được giao. Giao xong là xong, ALG tự phát triển tiếp.

smeOS vẫn là repo chính, phát triển đủ 4 tầng. Repo của ALG là bản **sinh ra** từ smeOS theo danh sách giai đoạn, không phải repo song song phải duy trì.

Hiện trạng đã đo:
- Bản xuất đầy đủ: typecheck 0 lỗi, `npm test` 4.649/4.649.
- Cắt thử theo danh sách nháp: còn 3.022/3.874 file code, 86/114 trang, 369/532 API; typecheck 0 lỗi. Test, build, E2E chưa chạy trên bản cắt.
- Audit 06/11: 105 hoàn thiện, 13 đang khoá, 5 làm một phần; đã cách 239 commit. Kịch bản nghiệm thu (141 bước) chưa chạy lần nào.

## Quy tắc làm việc

- Toàn bộ làm trên nhánh `Bangiao_GD1_123chunang` (đã tạo từ `main` @ `b1faaebf`). Không commit vào `main`.
- Duyệt kế hoạch này đồng nghĩa cho phép commit theo từng đầu việc trên nhánh này, đẩy nhánh lên `origin` (kéo theo 3 commit của `main` chưa đẩy) và mở **PR nháp** vào `main` chỉ để CI chạy (CI hiện chỉ chạy cho `main` và PR vào `main`). PR không được merge nếu bạn chưa quyết.
- Thỉnh thoảng merge `main` vào nhánh, ít nhất trước mỗi bước. Không rebase, không force-push.
- Render chỉ deploy từ `main`, nên nhánh này không ảnh hưởng production.
- Giữ nguyên các luật trong `CLAUDE.md`. Đổi `schema.prisma`, thêm thư viện, đổi `render.yaml`: dừng hỏi bạn từng lần.
- **Bạn duyệt ở 4 điểm:** sau bước 1, sau bước 3, trước khi cắt bản cuối, trước khi giao cho ALG.

## Bước 1 — Chốt phạm vi và tiêu chuẩn

**1.1** Lưu kế hoạch này vào `docs/plan/BANGIAO_GD1_123_CHUC_NANG.md`, đăng ký trong `docs/00-DOCUMENTATION-REGISTRY.yaml`.

**1.2 Danh sách giai đoạn** `src/lib/delivery/gd1.manifest.json`: mỗi mã 1.1…10.8 gắn với trang, API, tác vụ nền (`generation_jobs.feature`) và kịch bản nghiệm thu. Thêm phần khung dùng chung, trang công khai, cron/webhook/health, tài liệu được giao. Dựng từ `docs/tai-lieu-ky-thuat/nhom-*.md`, ma trận audit, và cột "Mở ở" của 141 bước kịch bản. Phải giải quyết các chỗ đã biết: 8.1 cần `/cong-cu`; 25 liên kết tới trang bị loại.

**1.3 Worker:** xác định `media_ai`, `vision`, `video`, `audio` phần nào cần cho 123 chức năng (đã biết 7.1 cần worker vision).

**1.4 Tiêu chuẩn hoàn thành** (chỉ áp cho phạm vi 123 chức năng):

| Mảng | Đạt khi |
|---|---|
| Chức năng | 123/123 đạt kịch bản, có người chạy và ngày |
| Bảo mật | `test:tenant`, `test:platform` xanh; 404 chéo tổ chức; mọi API có mã năng lực; quét bí mật sạch; `npm audit` không còn mức cao trở lên; trạng thái RLS (1.18) rõ ràng |
| Tích hợp thật | Thử thật SePay, Zalo ZNS, SMS, AI, Telegram |
| Hiệu năng | LCP ≤ 2,5 s, CLS ≤ 0,1, INP ≤ 200 ms trên các màn chính; có một lượt kiểm tải (chưa từng làm) |
| Trợ năng | Axe WCAG 2.2 AA, bàn phím, phóng 200% cho các hành trình chính |
| Giao diện | Screen Contract đủ; UX lint trên các màn trong phạm vi đạt mục tiêu chốt sau bước 3 |
| Vận hành | Runbook đúng thực tế; diễn tập khôi phục CSDL đạt (chưa từng làm); giám sát và cảnh báo chạy |
| Bàn giao | Tài liệu kỹ thuật và hướng dẫn sử dụng khớp bản giao; danh sách giấy phép bên thứ ba |

**Điểm duyệt:** chủ dự án chốt ngày 10/11/2026: giao 10 trang từng chờ quyết và 23 trang khung; 9.14 theo hướng đăng bài ngay trong smeOS. Chi tiết: [phạm vi](BANGIAO_GD1_PHAM_VI.md).

## Bước 2 — Dựng cơ chế (không đổi hành vi khi chưa bật)

**2.1 Luật thuần** `src/lib/delivery/delivery-phase.ts`: `isRouteInPhase`, đọc manifest, kèm test.

**2.2 Chế độ chỉ bật 123 chức năng**, bật bằng `NEXT_PUBLIC_DELIVERY_PHASE=gd1`, không đặt thì mọi thứ như cũ:
- `src/proxy.ts`: trang và API ngoài danh sách trả 404. Đây là điểm chặn duy nhất phủ cả 530 route (chỉ 26 route dùng `defineRoute`).
- `buildNav` (`src/components/layout/nav/index.ts`), `toolkit-catalog.ts`, `journey-catalog.ts`: chỉ hiện mục trong danh sách. Ẩn tầng SaaS Ngành.
- Không dùng lại `src/lib/feature-lock.ts` vì nó khoá nhầm 13 chức năng trong phạm vi và không chặn API.

**2.3 Công cụ cắt** trong `scripts/release/`, lệnh `npm run release:cut -- gd1 <mốc> <thư mục đích>`:
1. `git archive` từ một mốc cố định.
2. Dò import và các chuỗi `/api/v1/...` từ manifest để ra danh sách file giữ.
3. Xoá phần còn lại, gồm cả dữ liệu không phải code (`partner-marketplace-data.json`, seed `sync-siin-store`, `avi-gift-import`, `golden/`).
4. Tài liệu theo danh sách được phép; bỏ tài liệu và tham chiếu agent nội bộ.
5. Bỏ test của phần không giao, báo cáo từng test bị bỏ. Không được bỏ test của 123 chức năng. Làm lại các tệp baseline kiểm kiến trúc cho bản cắt.
6. Áp `releases/gd1/overlay/` (README, `.env.example`, `render.yaml`, CI riêng cho ALG).
7. `git init` lịch sử mới, xuất báo cáo và SHA-256.

**2.4 Kiểm rò rỉ:** mở rộng `scripts/handover-rules.mjs` và `handover-check.mjs`: không còn coi ALG là khách khác; thêm quét tên bên khác (SiiN, Mộc Lan), số điện thoại, email, mật khẩu viết cứng, đường dẫn máy cá nhân.

**2.5 Xử lý phụ thuộc:** liệt kê chỗ code của 123 chức năng dùng tới vùng chưa giao (38 module đang bị cắt giữa chừng, ví dụ `creative-production` còn 16/68 file). Với từng chỗ: chuyển sang phần dùng chung, hoặc chấp nhận và ghi vào báo cáo.

**2.6 Cổng CI** (thay đổi `ci.yml`, bạn duyệt qua kế hoạch này): job `release-gd1` tự cắt thử rồi chạy typecheck, `npm test`, build, kiểm rò rỉ trên bản cắt; báo đỏ nếu code trong phạm vi phụ thuộc vùng cấm. Test tenant, platform, E2E trên bản cắt chạy theo lịch hằng đêm.

**Xong khi:** bản cắt thử qua typecheck, test, build; bật chế độ `gd1` thì menu chỉ còn phạm vi và URL ngoài phạm vi trả 404.

**Trạng thái 10/11/2026 — mã Bước 2 xong, chờ CI:**

- 2.1–2.2: `src/lib/delivery/delivery-phase.ts`, `route-match.ts`; danh sách route sinh vào `gd1.routes.json` bằng `npm run release:routes` (test giữ khớp mã). `src/proxy.ts` trả 404 cho trang/API ngoài phạm vi; menu (`nav-phase.ts`), lưới công cụ, hành trình lọc theo phạm vi; tầng SaaS Ngành không có menu. Không đặt biến thì không đổi gì (có test).
- 2.3: `npm run release:cut -- gd1 <mốc> <thư mục>` (`scripts/release/`). Khối chỉ thuộc smeOS đánh dấu `@release-strip` trong mã (seed cửa hàng riêng, trang chủ tầng Ngành). Lớp phủ `releases/gd1/overlay/` mới có README; `.env.example`, `render.yaml`, CI riêng cho ALG chưa làm.
- 2.4: `node scripts/handover-check.mjs --dir <bản cắt> --recipient ALG --baseline releases/gd1/leak-baseline.json`. Baseline hiện có 337 mục (số điện thoại, email, tên bên khác, mật khẩu viết cứng, đường dẫn máy) — dọn ở Bước 4, chỉ được giảm.
- 2.5: [báo cáo phụ thuộc](BANGIAO_GD1_PHU_THUOC.md): 1 lời gọi proxy SocialFlow, 28 liên kết tới trang không giao, các mô-đun bị cắt giữa chừng. Worker `media_ai` chỉ nhận tác vụ âm thanh/video khi bản cài có mô-đun đó.
- 2.6: `.github/workflows/release-gd1.yml` — workflow riêng chứ không thêm vào `ci.yml`, để không chạy trên `main` và không chặn deploy của Render. Test tenant/platform trên bản cắt chạy hằng đêm; E2E trên bản cắt chưa có.
- Đo tại máy (mốc trước khi đẩy): bản cắt còn 90/116 trang, 454/530 API; typecheck 0 lỗi, `npm test` xanh, build xanh, pytest worker xanh. 116 test bị bỏ khỏi bản cắt, 65 trong đó chạm code được giao — danh sách trong báo cáo cắt, cần người xem lại ở điểm duyệt Bước 5.

## Bước 3 — Audit trên môi trường chỉ bật 123 chức năng

- Môi trường: bản build production chạy local, CSDL `*_test`, `NEXT_PUBLIC_DELIVERY_PHASE=gd1`. Dữ liệu dựng theo trang "Chuẩn bị" của file nghiệm thu.
- Audit lại 123 chức năng trên code hiện tại, ở 5 tầng (giao diện, API, nghiệp vụ, dữ liệu, test), cập nhật ma trận.
- Chạy 141 bước kịch bản; dùng `npm run ux:audit` chụp bằng chứng từng màn để bạn xem bằng mắt.
- Đo các chỉ số ở bảng tiêu chuẩn.
- Kết quả: báo cáo và danh sách việc theo mức ưu tiên.

**Điểm duyệt:** bạn chốt danh sách việc bước 4, mục tiêu UX lint, phạm vi của các chức năng còn lửng. Công và thời gian bước 4 chỉ ước lượng được sau bước này.

## Bước 4 — Hoàn thiện đến khi đạt tiêu chuẩn

- Đã biết: mở 13 chức năng đang khoá; xử lý 5 chức năng làm một phần (4.30, 4.32, 8.1, 9.1, 9.14); sửa lỗi audit thuộc phạm vi (ví dụ L-05 nút Lưu ở `/dieu-phoi/doi-tac`).
- 9.14: đăng bài đã chạy ngay trong smeOS (D-46), không còn ứng dụng liên kết. Nghiệm thu mở Công cụ → Tạo nội dung → Đăng tự động không phải đăng nhập lại; phiên 15 phút kiểm bằng test. Cần báo ALG đổi câu chữ bước I-09.
- Gỡ phần còn gọi SocialFlow/LocalBudd khỏi bản giao: khối bài đăng ở trang chủ (`marketing-workspace.tsx`), route proxy, biến `SOCIALFLOW_URL`, `LOCALBUDD_URL`, chữ "SocialFlow" trên màn hình.
- Mỗi đầu việc: code + test + tài liệu trong một commit; Thẻ chào và Catalog phải có test khoá hành vi trước khi sửa.
- Việc có ảnh do người dùng tải lên đi theo quyết định Q12 trong `KE_HOACH_HOAN_THIEN_54_CHUC_NANG.md`; phát sinh khác thì hỏi bạn.

## Bước 5 — Đóng băng và cắt

- Gắn tag `gd1-rc-<ngày>` trên nhánh. Sau tag chỉ nhận sửa lỗi phát hiện ở bước 6.
- Chạy lệnh cắt ra thư mục ngoài repo. Quyết định lúc này: giữ đủ 154 bảng hay bỏ 13 bảng không dùng.

**Điểm duyệt:** bạn xem báo cáo cắt (bỏ gì, giữ gì, phần chức năng chưa giao còn sót).

## Bước 6 — Kiểm trên bản cắt và giao

1. Dựng từ môi trường trắng chỉ theo tài liệu giao: cài đặt, migrate, seed, tạo người vận hành.
2. Chạy đủ cổng trong "Kiểm chứng" bên dưới.
3. Chạy lại kịch bản nghiệm thu trên bản cắt, ghi người chạy và ngày.
4. Quét rò rỉ lần cuối, có người đọc lại danh sách file.

**Điểm duyệt:** bạn xác nhận mới tạo repo và giao cho ALG (hành động ra bên ngoài, không tự làm).

## Quyết định mặc định (bạn có thể đổi khi duyệt)

| Vấn đề | Mặc định |
|---|---|
| Thử nhà cung cấp thật | Bước 3 làm local; khi cần thử thật sẽ hỏi bạn việc dựng staging trên Render (có chi phí, đổi `render.yaml`) |
| Kiểm bằng trình đọc màn hình | Không nằm trong tiêu chuẩn, ghi "Chưa kiểm" như đợt trước |
| Nhánh về `main` | Không merge cho đến khi bạn quyết. Nên merge sau khi giao, nếu không các bản sửa ở bước 4 không về smeOS và sẽ khó xung đột |
| `LICENSE` | Giữ trong bản giao. Câu chữ hiện ghi toàn bộ phần mềm thuộc ALG, trong khi smeOS tiếp tục phát triển: nên để pháp lý xem lại |

## Rủi ro chính

- `main` phát triển song song cùng file với nhánh này gây xung đột: giảm bằng merge thường xuyên.
- Bước 4 có thể phát sinh lớn sau audit: không cam kết thời gian trước bước 3.
- Lộ dữ liệu không lấy lại được sau khi giao: danh sách được phép, quét tự động, người đọc lại.

## File chính

- Mới: `src/lib/delivery/*`, `scripts/release/*`, `releases/gd1/overlay/*`, `tests/unit/release/*`, `docs/plan/BANGIAO_GD1_123_CHUC_NANG.md`.
- Sửa: `src/proxy.ts`, `src/components/layout/nav/index.ts`, `src/modules/toolkit/domain/toolkit-catalog.ts`, `src/modules/journey/domain/journey-catalog.ts`, `scripts/handover-rules.mjs`, `scripts/handover-check.mjs`, `.github/workflows/ci.yml`, `package.json` (scripts), registry tài liệu.
- Dùng lại: `scripts/handover-check.mjs`, `scripts/ux-audit/`, `tests/e2e/ux/`, `tests/unit/architecture/nav-href-exists.test.ts`, `scripts/measure-web-vitals.ts`.

## Kiểm chứng

- **Trên nhánh, mỗi đầu việc:** `npm run typecheck && npm run lint:ratchet`, `npm run lint:ux -- --check`, `npm test`, `npm run test:tenant`, `npm run test:platform`, `npm run check:docs`; khi đổi cấu hình hoặc màn hình: `npm run build`, `npm run test:e2e:ux`; khi đổi worker: `pytest`.
- **Chế độ tắt:** không đặt biến thì hành vi như cũ (có test).
- **Chế độ bật:** test bảng route trong/ngoài phạm vi; E2E kiểm menu và 404.
- **Trên bản cắt:** typecheck, lint, `npm test`, `test:tenant`, `test:platform`, build, E2E, `pytest` worker, kiểm rò rỉ, không còn liên kết chết, migrate từ CSDL trắng.
