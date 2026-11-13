# 03 — Quy trình thay đổi và kiểm thử

## 1. Quy tắc bắt buộc

Toàn văn ở `CLAUDE.md` và `.agents/AGENT_RULES.md`. Tóm tắt:

1. Làm đúng việc được giao; không tự đổi tên, tái cấu trúc hay nâng phiên bản thư viện ngoài yêu cầu.
2. `organization_id` chỉ từ `requireTenantContext`; chéo tổ chức → 404.
3. Phân quyền bằng mã năng lực.
4. `domain/` không import Prisma/infra; Prisma chỉ ở `infra/`; SDK nhà cung cấp chỉ ở `adapters/`.
5. AI chỉ qua `callCapability`; mọi vòng lặp/thử lại có giới hạn.
6. Chữ trên giao diện là tiếng Việt tự nhiên, token ngữ nghĩa, không hiện mã kỹ thuật.
7. Tối đa 350 dòng mỗi tệp nguồn; tệp đang vượt không được dài thêm (`scripts/file-size-baseline.json`).
8. Không đưa bí mật, dữ liệu khách hay nội dung `.env` vào mã, log, commit.
9. Không báo xong khi còn cổng đỏ; không tắt hay bỏ qua test.

Việc cần chủ sản phẩm (PO) duyệt trước: đổi `prisma/schema.prisma`; nới lỏng cách ly tổ chức, trần quyền, sàn riêng tư AI, xác
thực; đổi trải nghiệm đã khoá; thêm thư viện, nhà cung cấp, API trả phí; đổi CI hay `render.yaml`; chạm tới tính năng người dùng
tải ảnh (xác định chặng nào chạy).

## 2. Quy trình sửa một chức năng

1. Tìm mục của chức năng trong tài liệu nhóm tương ứng; đọc mã thật và test của nó (tài liệu không thay cho mã).
2. Tra nguồn sự thật bằng `grep` trong `docs/00-DOCUMENTATION-REGISTRY.yaml`; trạng thái hiện tại ở §4–6 của
   `docs/kien-truc/TRANG_THAI.md`.
3. Sửa luật ở `domain/` trước, viết test thuần cho luật; sau đó use-case, repository, route, giao diện.
4. Route mới: gác quyền trong use-case; khai trong `docs/dac-ta/06-api-specification.md`.
5. Màn mới hoặc đổi màn: cập nhật hợp đồng màn hình `docs/dac-ta/screen-contracts/<tuyến>.md` cùng commit.
6. Chạy các cổng ở mục 4. So với `main` nếu có lỗi đỏ: chỉ lỗi mới mới chặn (`git worktree add /tmp/base origin/main`).
7. Commit theo Conventional Commits (`feat|fix|chore|docs|test(phạm-vi): …`), mã + test + tài liệu cùng một commit, làm trên nhánh
   riêng, không `--no-verify`, không force-push nhánh dùng chung.

## 3. Đổi lược đồ CSDL

1. Sửa `prisma/schema.prisma`. Bảng thuộc tổ chức: có `organization_id`, quan hệ `organizations` (`onDelete: Cascade`),
   `@@index([organization_id])`. Thời gian dùng `@db.Timestamptz(3)`; trạng thái dùng enum Prisma.
2. `npx prisma generate`.
3. Sinh migration: `npx prisma migrate dev --name <tên>` trên CSDL cục bộ, hoặc
   `npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script` trên CSDL đã áp mọi migration.
   Đặt tên thư mục theo mốc thời gian lớn hơn migration mới nhất trên `main` — hai migration trùng mốc chạy theo thứ tự chữ cái.
4. Bọc migration trong `BEGIN; SET LOCAL lock_timeout = '5s'; … COMMIT;` (`npm run check:migrations` chặn `ALTER TABLE` thiếu
   `lock_timeout`). Theo quy ước expand/contract: thêm trước, xoá ở migration sau khi mã đã thôi dùng.
5. Bảng mới có `organization_id`: `npm run gen:tenant-registry`, rồi `node scripts/gen-rls-policies.mjs` và chép SQL chính sách vào
   migration. Lệnh in "Mọi bảng thuộc tổ chức đã có chính sách RLS." khi đủ.
6. Khai bảng/enum ở `docs/dac-ta/07-database-specification.md` (`npm run check:docs` chặn thiếu).
7. Kiểm: `prisma migrate deploy` trên CSDL mới tinh, rồi `prisma migrate diff … --exit-code` phải trả 0 (CI chạy đúng bước này).
8. Đổi tên/xoá cột: đọc kỹ SQL sinh ra — Prisma xoá rồi tạo lại cột, mất dữ liệu.
9. Production chạy `npm run db:deploy` (pre-deploy của Render). Không chạy `prisma migrate reset` ngoài CSDL `*_test`.

## 4. Cổng kiểm thử

| Cổng | Lệnh | Khi nào |
|---|---|---|
| Kiểu + lint | `npx tsc --noEmit` và `npm run lint:ratchet` (không thêm lỗi theo tệp × quy tắc) | Sửa TypeScript |
| UX lint | `npm run lint:ux -- --check` | Sửa `.tsx` trong `src/app`, `src/components` |
| Unit | `npm test` | Luôn chạy |
| Cách ly tổ chức / nền tảng | `npm run test:tenant`, `npm run test:platform` — **bắt buộc** | Chạm truy cập dữ liệu, route, lược đồ, xác thực, phân quyền |
| Template | `npm run check:template-ssot` | `src/components/templates/**` |
| Hợp đồng zod / tài liệu | `npm run check:schemas:creative` (`:coordinator`, `:content-engine`), `npm run check:docs` | Sửa hợp đồng, đặc tả |
| Hợp đồng màn hình | `npm run check:screen-contracts -- --check` | Thêm/đổi màn |
| Migration | `npm run check:migrations` | Thêm migration |
| Thuật ngữ ngành | `npm run audit:industry:check` | Chữ trên giao diện/domain |
| Worker | `cd workers && python -m pytest tests -q` | Sửa `workers/**` |
| Build, E2E | `npm run build`, `npm run test:e2e:ux` | Đổi cấu hình/định tuyến, thêm màn |

CI (`.github/workflows/ci.yml`) chạy các job `web` (migration khớp lược đồ, lint, tài liệu, test, cách ly tổ chức, build),
`security` (gitleaks, `npm audit`), `industry-terms`, `worker`, `e2e-ux`, và CodeQL.

## 5. Bẫy thường gặp

- `test:tenant`/`test:platform` **TRUNCATE mọi bảng**: chỉ chạy trên CSDL tên `*_test`. Kiểm `echo "[$DATABASE_URL]"` trước mọi
  lệnh Prisma CLI.
- Dùng `npm test`, không chạy `npx vitest run` trơn (kéo cả bộ test tenant vào). Hook trong `.claude/hooks` chặn lệnh này.
  Chạy một tệp test tenant: chỉ định đường dẫn tệp và `DATABASE_URL` trỏ CSDL test.
- Prisma 7: URL nằm ở `prisma.config.ts`; sửa lược đồ xong phải `npx prisma generate` rồi mới tin `tsc`.
- CI dựng CSDL test bằng `prisma db push` (không chạy migration) — test cần SQL riêng của migration (ví dụ chính sách RLS) phải tự
  áp SQL đó (`tests/tenant/rls.test.ts`).
- Lời gọi `set-state` trong `useEffect` bị lint chặn; tải dữ liệu theo mẫu `fetch().then(setState)`.
- Biểu tượng import trực tiếp `@/components/ui/icon-set/<tên>`, không import từ tệp gom.
- Không dùng `window.confirm`; dùng `useConfirmDialog` (`src/components/ui/confirm-dialog.tsx`).
- Chuỗi giao diện/domain không chứa thuật ngữ ngành cố định (ví dụ "loại hoa", "cắm hoa", "hoa tươi") — dùng từ trung tính hoặc
  cấu hình ngành.
- Thêm mục "Bẫy" khác: `AGENTS.md` (tìm bằng `grep`).

## 6. Mã chuyển từ dự án khác

Mã chuyển từ FloraOS/LocalBudd/SocialFlow cần xếp hạng REUSE/EXTEND/ADAPTER ở `docs/archive/historical/HARVEST_MANIFEST.md`.
