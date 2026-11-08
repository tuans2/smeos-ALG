# 03 — AUDIT 01: Typecheck Performance

> Chỉ đọc. Đo trên bản sao `main@87f30f2`; không sửa `tsconfig`, không cài TypeScript khác.
> Số liệu thô: xem `02-REPOSITORY-BASELINE.md` §5.

## 1. Kiến trúc typecheck hiện tại

Có **ba** lần kiểm kiểu khác nhau cho cùng một commit, không tương đương nhau:

| # | Nơi | Lệnh | Phạm vi thực tế | Heap |
|---|---|---|---|---|
| A | CI `web` bước 12 (`ci.yml:75`) | `tsc --noEmit` | tsconfig `include` **trừ** `.next/types` (chưa tồn tại vì build chạy sau) | 4 GB (`ci.yml:46`) |
| B | CI `web` bước build (`ci.yml:105`) | `next build` → bước "Running TypeScript" | tsconfig **cộng** `.next/types/**` (typedRoutes) | 4 GB |
| C | CI `e2e-ux` (`ci.yml:197`) | `next build` | như B | 4 GB (`ci.yml:185`) |
| — | Render (`render.yaml:68-69`) | `next build` với `SKIP_BUILD_TYPECHECK=true` | không kiểm kiểu | 2 GB |

Cấu hình (`tsconfig.json`): `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `moduleResolution: bundler`,
`incremental: true`, `skipLibCheck: true`, `allowJs: true`, `paths @/* → src/*`, `include: ["**/*.ts","**/*.tsx",".next/types/**/*.ts",…]`.
Một chương trình duy nhất (không project references). ESLint **không** dựng chương trình TS thứ hai (`eslint-config-next/typescript` không bật `projectService`).

## 2. Performance baseline (đo thật)

| Kịch bản | Wall | Check time | Heap | Files | Instantiations |
|---|---|---|---|---|---|
| Toàn repo, cold, heap 8 GB (run 1 / run 2) | 62,4 / 64,0 s | ~52 s | 2,90 / 3,14 GB | 10.244 | 2,78 M |
| Toàn repo, cold, heap 4 GB | 64,1 s | — | 3,01 GB | 10.244 | — |
| Toàn repo, cold, heap mặc định 2.096 MB | **OOM ở 34 s** (exit 134) | — | — | — | — |
| Toàn repo, warm (tsbuildinfo) | 8,5 s | — | 1,72 GB | 10.244 | 0 |
| **Toàn repo + `.next/types`** (tương đương B/C) | **243 s** | **234 s** | **3,86 GB** | 10.253 | **7,11 M** |
| Chỉ source (không test) | 48,2 s | 41,2 s | 2,74 GB | 9.097 | 2,30 M |
| Chỉ test (kéo theo src được import) | 32,0 s | 25,5 s | 2,25 GB | 8.746 | 2,15 M |
| Chỉ Prisma Client (1 tệp probe dùng `prisma.organizations`) | 3,8 s | 1,2 s | 0,72 GB | 503 | 0,15 M |

CI thật: bước typecheck 44 s (run thành công) — 79–84 s khi OOM (PR #187 job `128426037333`, main `0da028b` job `128420755633`).
Log OOM: `Mark-Compact (reduce) 2042.0 (2083.6) -> 2040.7 MB … FATAL ERROR: Ineffective mark-compacts near heap limit` — chạy trước khi `NODE_OPTIONS=4096` có trên nhánh.

## 3. Memory consumption analysis

- **Sàn cố định** do Prisma Client: ~0,72 GB heap chỉ để nạp 503 tệp (Prisma + thư viện). Generated client = 400.878 dòng
  (**46 %** trong 863.447 "Lines of TypeScript" tsc báo). `models/organizations.ts` một mình 6,6 MB do model `organizations` có **121 trường quan hệ mảng**
  (mọi bảng tenant trỏ về nó). Tất cả tệp generated có `// @ts-nocheck` ⇒ tốn parse+bind+bộ nhớ, **không** tốn check.
- **Tăng theo bề rộng mã**: không có tệp bệnh lý ở kịch bản A — tệp chậm nhất là `src/core/tenancy/infra/prisma.ts` 809 ms (2 lớp `$extends`);
  `src/components` 47 % check time, `src/modules` 25 %, `src/app` 14 %, `tests` 8,5 %.
- **Typed routes là bước nhảy lớn nhất**: khi có `.next/types/link.d.ts` (358 route tĩnh + 264 mẫu route động; `RouteImpl<T>` gồm
  `${StaticRoutes}${SearchOrHash}` và suy luận `T extends ${DynamicRoutes<infer _>}${Suffix}`), check time ×4,5 và heap +0,85 GB.
  **31 tệp chiếm 196 s / 273 s (72 %)**; 7 tệp đầu: `dashboard/marketing-workspace.tsx` 25,1 s, `chat/floraos-global-copilot.tsx` 22,2 s,
  `dashboard/accounting-workspace.tsx` 18,6 s, `dashboard/crm-workspace.tsx` 16,3 s, `dashboard/product-manager-workspace.tsx` 13,3 s,
  `dashboard/customer-service-workspace.tsx` 12,0 s, `organization/settings-subsystem-grid.tsx` 11,2 s (cùng tệp ở kịch bản A chỉ ~0,1 s).
  Các tệp này dùng nhiều `router.push("…" as Route)` (repo có 76 phép ép `as Route` trong 31 tệp; `marketing-workspace.tsx` có 12).
  Phân rã tới từng biểu thức chưa làm (cần đọc `types.json` 285 MB) — xem kế hoạch đo §7.
- **Tách lệnh không giảm tổng bộ nhớ dưới trần mặc định**: src 2,74 GB và test 2,25 GB **đều > 2.096 MB**; tổng thời gian tuần tự 80 s > 64 s chạy chung (+26 %).
  Kết luận thực nghiệm: tách typecheck **không** phải biện pháp giảm bộ nhớ.

## 4. Typecheck bottleneck analysis (findings)

| ID | Mức | Phát hiện | Bằng chứng |
|---|---|---|---|
| **TC-01** | HIGH | Nhu cầu heap (2,9–3,1 GB) vượt heap mặc định của Node (2.096 MB trên máy 15 GB). `npm run typecheck` (`package.json:68`) không tự đặt heap → **OOM trên máy dev** và trên bất kỳ job CI nào thiếu `NODE_OPTIONS`. Trần 4 GB chỉ nằm ở `ci.yml:46,185` (thêm 07/11, commit `6162c8a`). | Đo: exit 134 ở 34 s. CI: PR #187 và main `0da028b` OOM. |
| **TC-02** | HIGH | Bước kiểm kiểu trong `next build` (B, C) dùng **3,86 GB / 4,0 GB (≈ 94 %)** và 4–5 phút, do typedRoutes. Headroom ~6 % ⇒ một lượt tăng mã nhỏ là OOM lại. | Đo: 243 s, 3.860.135 K. `next build` có kiểm kiểu: "Finished TypeScript in 4.4min", peak RSS 4,49 GB. |
| **TC-03** | MEDIUM | Cổng `typecheck` (A) **không kiểm typed routes** trên checkout sạch, trong khi build (B) có ⇒ hai kết quả khác nhau cho cùng commit; lỗi href chỉ lộ ở bước build cuối job, sau 20 phút test. Render bỏ qua hẳn (đúng thiết kế, dựa vào CI). | `ci.yml:75` chạy trước `ci.yml:105`; `tsconfig.json` include `.next/types/**`. |
| **TC-04** | MEDIUM | Prisma Client sinh 22,9 MB TS được parse/bind mỗi lần (sàn 0,72 GB). Tăng tuyến tính theo số model × quan hệ; `organizations` 121 quan hệ. | `du`, `wc`, probe Prisma-only. |
| **TC-05** | LOW | `incremental: true` nhưng CI không cache `tsconfig.tsbuildinfo` ⇒ luôn cold (warm chỉ 8,5 s / 1,7 GB). | `ci.yml` không có `actions/cache` cho tsbuildinfo. |
| **TC-06** | INFO | Tách src/test được kiểm chứng là **không** giảm dưới trần mặc định và chậm hơn 26 %. Không khuyến nghị. | §3. |
| **TC-07** | INFO | Tương thích: xem §5 — TypeScript 7 không dùng được cho ESLint. | `typescript-estree` peer `>=4.8.4 <6.1.0`. |

Không phát hiện: trùng phiên bản TypeScript; tệp `.d.ts` thủ công lớn; vòng lặp kiểu đệ quy bệnh lý (94 sự kiện `recursiveTypeRelatedTo_DepthLimit`, không tệp nào > 1 s ở kịch bản A).

## 5. TypeScript compatibility matrix

| Công cụ | Phiên bản | Yêu cầu TS | TS 5.9.3 | TS 7.0.2 (latest) |
|---|---|---|---|---|
| typescript-eslint | 8.70.0 | `>=4.8.4 <6.1.0` | ✅ | ❌ ngoài phạm vi hỗ trợ |
| Next.js `next build` type step | 16.4.3 | dùng gói `typescript` cài trong repo | ✅ | Chưa kiểm chứng (không cài được khi chưa duyệt) |
| Prisma 7.10.1 | — | peer `typescript >=5.4.0` | ✅ | Chưa kiểm chứng |
| Vitest 5 / tsx 4 | — | transpile-only (esbuild) | ✅ không phụ thuộc checker | ✅ không phụ thuộc checker |
| VS Code tsserver | — | mặc định dùng TS của workspace | rủi ro: chương trình cần ~3–3,9 GB, vượt mặc định `typescript.tsserver.maxTsServerMemory` = 3072 MB khi có `.next/types` (**suy luận, chưa đo trong IDE**) | — |

Nhiều phiên bản TS (5.9 cho ESLint/Next + 7 cho `tsc`) có nghĩa là hai trình kiểm kiểu có thể **khác kết luận** (PR #189 đang mở ghi nhận
TS 7 báo sai 2 biểu thức `?? null`). Đây là quyết định kiến trúc cần PO (mục 9 của Executive Summary).

> Bối cảnh: PR #189 (`claude/dreamy-carson-eme3jv`, **chưa merge** lúc audit) chuyển `npm run typecheck` sang TS 7 và đặt
> `SKIP_BUILD_TYPECHECK=true` cho `e2e-ux`. Theo mô tả commit, job `web` vẫn chạy `next build` với TS 5.9 + typedRoutes ⇒ **TC-02 vẫn còn**
> sau PR #189 trừ khi bước build cũng bỏ kiểm kiểu hoặc typed routes được tối ưu.

## 6. Optimization recommendations (không thực thi)

1. **Ghim heap vào chính script** (`typecheck`) hoặc tài liệu hoá bắt buộc cho dev — đóng TC-01 cho máy local; không đổi hành vi CI.
2. **Một lần kiểm kiểu đầy đủ duy nhất** có `.next/types`: sinh route types trước (`next typegen` — có trong CLI Next 16.4.3: "Generate TypeScript definitions
   for routes, pages, and layouts without running a full build"; chưa chạy thử trong audit) rồi chạy `tsc`; sau đó cả hai `next build` đặt `SKIP_BUILD_TYPECHECK=true` ⇒ đóng TC-03, giảm ~8 phút CI.
3. **Giảm chi phí typed routes** ở 31 tệp nóng: thay `"…" as Route` bằng hằng/hàm trả về `Route` đã khai báo một lần, hoặc nhận `href` dạng literal
   để TS so khớp trực tiếp thay vì ép kiểu. Đo lại trước/sau theo §7 — **chưa chứng minh** cách nào nhanh nhất.
4. **Cache `tsconfig.tsbuildinfo`** (khoá: lockfile + `schema.prisma` + nhánh) — chỉ tối ưu tốc độ, không thay cold-run gate.
5. TypeScript 7 cho `tsc` chỉ nên làm khi PO chấp nhận chạy song song 2 phiên bản và có ca kiểm đối chiếu kết luận (5.9 vs 7) trên CI.

## 7. Before/After measurement plan

Chạy trên runner CI (không phải máy dev) với `--extendedDiagnostics`, 3 lần, lấy trung vị:
1. `rm -f tsconfig.tsbuildinfo && npx tsc --noEmit --extendedDiagnostics` — ghi Check time, Memory used, Instantiations.
2. Như (1) sau khi `.next/types` đã sinh.
3. `--generateTrace` cho (2); tổng hợp `checkSourceFile` theo tệp, top-30 (script tổng hợp như dùng trong audit này).
4. Ghi `/usr/bin/time -v` (Max RSS) cho `next build` có và không kiểm kiểu.
Bảng so sánh lưu vào PR; chênh lệch > 10 % phải giải thích.

## 8. Acceptance criteria

| Tiêu chí | Ngưỡng | Căn cứ |
|---|---|---|
| Heap đỉnh của mọi lần kiểm kiểu trên CI | ≤ **75 %** trần `--max-old-space-size` đang đặt (hiện 4096 ⇒ ≤ 3,07 GB) | headroom hiện 6 % gây OOM khi merge |
| Số lần kiểm kiểu đầy đủ / commit trên CI | **1** (bao gồm typed routes) | hiện 3 lần không tương đương |
| Thời gian kiểm kiểu cold trên CI | ≤ thời gian hiện tại của bước A (44–84 s) **cộng** ≤ 60 s cho typed routes; báo cáo trung vị 3 lần | baseline đo |
| An toàn kiểu | 0 lỗi `tsc`; không thêm `// @ts-nocheck`, `as any`, `skipLibCheck` mới để đạt ngưỡng; ESLint ratchet không tăng | CLAUDE.md #9 |
| Tương thích | `typescript-eslint` chạy với đúng TS nằm trong peer range; `next build` xanh | §5 |
| Độ tin cậy CI | 0 lần OOM (exit 134) trong 20 run liên tiếp trên `main` | log CI |
| DX local | `npm run typecheck` xanh trên máy 8 GB RAM không cần đặt biến môi trường thủ công | TC-01 |
