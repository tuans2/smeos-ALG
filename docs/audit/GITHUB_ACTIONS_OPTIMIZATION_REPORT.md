# Báo cáo tối ưu phút GitHub Actions — ALG

> Ngày: 10/11/2026 · Nhánh: `claude/bold-bardeen-473alq` · Phạm vi: `.github/workflows/*.yml` (không sửa mã ứng dụng, không sửa `render.yaml`).
> Nhật ký thay đổi: [`GITHUB_ACTIONS_OPTIMIZATION_CHANGELOG.md`](GITHUB_ACTIONS_OPTIMIZATION_CHANGELOG.md).
> Bổ sung (không thay thế) audit trước: [`engineering-infrastructure-audit/04-AUDIT-02-CICD-OPTIMIZATION.md`](engineering-infrastructure-audit/04-AUDIT-02-CICD-OPTIMIZATION.md) (CI-03, CI-04, CI-05).

## 0. Tóm tắt

- Repo **private** (`list_repos`: `visibility: private`) ⇒ mọi phút runner Linux đều tính vào hạn mức. Trong 48 giờ (08/11 14:11 → 10/11 14:08) có
  **33 run bị chặn trước khi nhận runner** (job đỏ sau ~2 s, `runner_id: 0`, không bước nào chạy) — dấu hiệu chạm hạn mức/chi tiêu. Sau khi chủ repo
  thiết lập lại (14:21 ngày 10/11), các run chạy lại đã nhận runner bình thường.
- Một sự kiện (push vào PR hoặc lên `main`) tốn **~86 phút tính phí** (mỗi job làm tròn lên phút): CI ~71 + CodeQL ~15. Riêng bước
  `test:tenant` chiếm **31,5–32 phút** (~45 % toàn bộ).
- Đã làm 7 thay đổi (O-1…O-7), không bỏ cổng nào, không đổi tên job (Render và ruleset đọc tên check). Ước tính **−29 % đến −35 %/sự kiện PR** (gồm huỷ run thừa),
  **−10 % đến −16 %/push `main`**. O-3 đo thật rẻ hơn ước tính (+1,8 thay vì +3,5 phút) ⇒ cận trên tốt hơn ~1,7 phút/sự kiện. **Mục tiêu 50–70 % KHÔNG đạt được chỉ bằng sửa workflow** mà giữ nguyên cổng — xem §7 cho các bước còn lại
  (cần sửa test helper/ESLint cache, phải PO duyệt).
- Số đo trên runner thật sau thay đổi **chưa có** (nhánh chưa có PR nên CI chưa chạy cấu hình mới) — xem §6.

## 1. Kiến trúc ban đầu

| Workflow | Trigger | Job (runner) | Ghi chú |
|---|---|---|---|
| `ci.yml` | `push` + `pull_request` vào `main` | `web`, `security`, `industry-terms`, `worker`, `e2e-ux` (đều `ubuntu-latest`) | 5 tên job là **cổng deploy**: Render `autoDeployTrigger: checksPass` chỉ deploy commit `main` có check xanh |
| `codeql.yml` | `push` + `pull_request` vào `main`, lịch thứ Hai 02:17 UTC | `analyze` × {javascript-typescript, python} | `upload: never`; tự chặn bằng `scripts/codeql-gate.py` so với baseline |
| `ui-weekly.yml` | lịch thứ Hai 03:00 UTC + `workflow_dispatch` | `ui-enterprise-audit` | Không chạy trên PR |

Không có Windows/macOS runner, không có `concurrency`, không có `timeout-minutes` (mặc định 360 phút/job), không có job deploy (Render tự deploy).
Workflow thứ tư, `release-gd1.yml` ("Bản giao GD1", job `cut`), vào `main` qua PR #21 (10/11/2026) sau lần audit đầu: chạy trên mọi PR, push nhánh
`Bangiao_GD1_123chunang`, lịch đêm 19:17 UTC (có thêm tenant + platform trên bản cắt) và chạy tay. Không nằm trong cổng deploy của Render.
PR đo được 9,6–14,3 phút; cũng không có `concurrency`/`timeout-minutes` — xử lý ở O-8.

### 1.1 Số đo gốc (API Actions, 10/11/2026)

Run `42818043992` (push `main`) và `42816682720` (PR), thời lượng job → phút tính phí (làm tròn lên):

| Job | Run main | Run PR | Bước nặng nhất |
|---|---|---|---|
| `web` | 47,8 → 48 | 51,1 → 52 | `test:tenant` 31,5 / 32,1 phút; `npm test` 4,7 / 5,1; `next build` 5,2 / 6,9; ESLint 2,0 / 2,4; `npm ci` 1,0 / 1,1 |
| `e2e-ux` | 11,0 → 11 | 11,3 → 12 | E2E 6,2 / 5,9; Playwright install 1,1 / 1,7; `next build` (bỏ kiểm kiểu) 1,8 / 1,8; `npm ci` 1,1 |
| `worker` | 2,8 → 3 | 8,7 → 9 | `apt-get install ffmpeg` 0,4 / **5,1**; pytest 1,8 / 3,0 |
| `security` | 1,3 → 2 | 1,3 → 2 | gitleaks toàn lịch sử 1,0 |
| `industry-terms` | 1,2 → 2 | 1,0 → 1 | `npm ci` 1,0 cho một bước 1 s |
| CodeQL JS/TS | 9,8 → 10 | — | analyze 8,2 |
| CodeQL Python | 4,9 → 5 | — | analyze 3,4 |

⇒ CI 66–76 phút + CodeQL ~15 ⇒ **~86 phút/sự kiện**. Trong 48 giờ trên có 34 sự kiện PR + 14 push `main` (48 sự kiện ≈ 4.100 phút nếu tất cả được chạy).

## 2. Vấn đề phát hiện

| Mã | Mức | Vấn đề | Bằng chứng |
|---|---|---|---|
| P-1 | Cao | Không `concurrency`: push mới vào cùng PR không huỷ run cũ đang chạy | 8/20 cặp run liên tiếp của cùng PR (24 %) cách nhau < 45 phút (khoảng 10,5–25,5 phút) — run cũ vẫn chạy hết ~45 phút |
| P-2 | Cao | `test:tenant` 32 phút; mỗi ca gọi `resetDatabase()` = `TRUNCATE` ~150 bảng; Postgres CI chạy với `fsync=on` dù là container dùng một lần | Đo tại máy: 579 ms/TRUNCATE (fsync on) vs 150 ms (off) — §6 |
| P-3 | Trung bình | `next build` chạy 2 lần/run (`web` có kiểm kiểu, `e2e-ux` bỏ kiểm kiểu) | `ci.yml` cũ: bước cuối `web` + bước build `e2e-ux`; 5,2–6,9 phút trùng |
| P-4 | Trung bình | Không `timeout-minutes` ⇒ một bước treo (dev server, Postgres, Playwright) có thể đốt 360 phút/job | Cả 3 workflow |
| P-5 | Thấp | `industry-terms` chạy `npm ci` đầy đủ (62 s) cho một script chỉ dùng `node:fs`/`node:path` | `scripts/industry-term-audit.ts:15-16` |
| P-6 | Trung bình | `worker` (cài ffmpeg + pip + pytest, 3–9 phút) chạy ở mọi PR dù 95/102 commit `main` (20/10–10/11) không chạm `workers/` | `git diff-tree` trên `origin/main`; `workers/tests` không đọc tệp ngoài `workers/` |
| P-7 | Trung bình | CodeQL Python (~5 phút) chạy ở mọi PR dù 90/102 commit không đổi tệp `.py`/`workers/` | như trên |
| P-8 | Thấp | Không cache pip | `setup-python` không có `cache:` |

Không phát hiện: workflow trùng nhau; trigger thừa (`push` chỉ `main`, `pull_request` chỉ vào `main` ⇒ nhánh PR không chạy 2 lần); runner Windows/macOS;
action bên thứ ba (chỉ `actions/*`, `github/codeql-action`).

Đã cân nhắc và **không** làm (lý do có số liệu):

- `paths-ignore` cho thay đổi chỉ-tài-liệu ở cấp workflow: 0/102 commit `main` là chỉ-tài-liệu ⇒ không tiết kiệm; lại làm check bắt buộc ở trạng thái
  "chờ" mãi (workflow bị lọc không tạo check) và làm Render không deploy commit đó.
- Gộp `e2e-ux`/`industry-terms` vào `web`, hoặc chia `web` thành nhiều job: đổi/xoá tên job là nới cổng deploy (`ci.yml`, chú thích cuối tệp);
  chia job còn **tăng** phút tính phí (mỗi job lặp lại `npm ci` + dựng Postgres, làm tròn phút riêng).
- Huỷ run cũ trên `main`: commit bị huỷ không bao giờ được Render deploy và lịch sử `main` có check "cancelled" — giữ nguyên an toàn.
- Bỏ CodeQL trên push `main`: Render đọc mọi check của commit `main`; CodeQL không nằm trong 5 check bắt buộc của PR nên đây là lớp chặn duy nhất.
- Cache `node_modules` (1,4 GB): khôi phục/lưu cache cỡ này mất xấp xỉ thời gian `npm ci` (~60 s); lợi nhỏ, rủi ro cache bẩn — để §7.

## 3. Thay đổi đã thực hiện

| Mã | Tệp | Thay đổi | Cổng/hành vi giữ nguyên |
|---|---|---|---|
| O-1 | `ci.yml`, `codeql.yml` | `concurrency`: nhóm theo số PR, `cancel-in-progress` **chỉ** với `pull_request`; push `main`/lịch nhóm theo sự kiện + SHA ⇒ không bao giờ bị huỷ | Mỗi commit `main` vẫn có đủ check cho Render |
| O-2 | cả 3 workflow | `timeout-minutes` cho mọi job (web 75, e2e-ux 40, worker 20, security 15, industry-terms 10, CodeQL 30, ui-weekly 60); `ui-weekly` thêm `concurrency` không huỷ | Ngưỡng ≥ 1,4× thời lượng dài nhất đo được |
| O-3 | `ci.yml` | Bỏ `npm run build` ở `web`; `e2e-ux` bỏ `SKIP_BUILD_TYPECHECK` ⇒ lần build duy nhất có kiểm kiểu (gồm typed routes) | Cổng build + kiểm kiểu trong build vẫn bắt buộc (chuyển sang `e2e-ux`, cùng là check bắt buộc); Render không đổi |
| O-4 | `ci.yml` | `industry-terms`: thay `npm ci` bằng `npm exec tsx@<bản trong package-lock.json>` | Cùng script, cùng cờ `--check`; đầu ra đối chiếu giống hệt (§6) |
| O-5 | `ci.yml` | `worker` trên PR: bỏ qua cài đặt + pytest nếu PR không đổi `workers/` hay `ci.yml`; job vẫn xanh; push `main` luôn chạy đủ; không đọc được diff ⇒ chạy đủ | Tên check `worker` giữ nguyên; commit được deploy luôn có pytest |
| O-6 | `codeql.yml` | CodeQL **Python** trên PR: bỏ qua nếu PR không đổi `*.py`, `workers/`, `codeql.yml`, `scripts/codeql-*`; JS/TS luôn chạy; `main` + lịch tuần luôn chạy đủ | Gate baseline vẫn chạy khi có mã Python mới |
| O-7 | `ci.yml` | `web`: tắt `fsync`/`full_page_writes`/`synchronous_commit` của Postgres CI (ALTER SYSTEM + reload) trước khi dựng CSDL; `worker`: `setup-python` cache pip | Không đổi ngữ nghĩa giao dịch/khoá/cô lập; chỉ mất độ bền khi mất điện — container bị huỷ sau job |
| O-8 | `release-gd1.yml` | `concurrency` như O-1 (chỉ huỷ trên PR), `timeout-minutes: 90`, tắt ghi đĩa đồng bộ của Postgres như O-7 (lợi chủ yếu cho test tenant/platform lịch đêm) | Trigger, bước cắt, kiểm rò rỉ, typecheck/test/build trên bản cắt giữ nguyên |

## 4. Ước tính phút tiết kiệm

Đơn vị: phút tính phí trên một sự kiện. "PR thường" = PR không đổi `workers/`/Python (88–93 % theo lịch sử `main`).

| Hạng mục | Trước | Sau (ước tính) | Cơ sở |
|---|---|---|---|
| `web` — bỏ build (O-3) | 50 | −5,2 đến −6,9 | số đo §1.1 |
| `web` — Postgres không fsync (O-7) | (tenant 32 + platform 1,9) | −7 đến −10 | §6: 20 tệp tenant 130 s → 95 s (−27 %); TRUNCATE 3,9× nhanh hơn. **Chưa đo trên runner** |
| `e2e-ux` — build có kiểm kiểu (O-3) | 11,5 | +1,8 | **Đo trên runner** (PR #24): build 1,8 → 3,6 phút (ước ban đầu +3,5) |
| `industry-terms` (O-4) | 1,5 | 1 | 62 s → ~4 s |
| `worker` PR thường (O-5) | 3–9 | 1 | chỉ checkout + diff |
| CodeQL Python PR thường (O-6) | 5 | 1 | như trên |
| **Tổng — PR thường** | **~86** | **~63–68** | **−21 % đến −27 %** |
| Huỷ run thừa (O-1) | — | −~7 bình quân/sự kiện PR | 24 % run PR bị đè sau trung vị ~15 phút ⇒ tiết kiệm ~28 phút `web` mỗi lần |
| **Tổng — PR, gồm O-1** | **~86** | **~56–61** | **−29 % đến −35 %** |
| **Tổng — push `main`** | **~86** | **~72–77** | **−10 % đến −16 %** (không lọc, không huỷ) |

Tháng: với nhịp quan sát (≈ 17 sự kiện PR + 7 push `main`/ngày) ước tính giảm **~490–610 phút/ngày**, tức **~15.000–18.000 phút/tháng** so với
cùng lưu lượng. Đây là ngoại suy từ 48 giờ, không phải số đo; phải đối chiếu lại bằng `get_workflow_run_usage`/thời lượng job sau 1–2 tuần (§6.3).
`timeout-minutes` (O-2) không giảm run bình thường, nhưng chặn trần một run treo từ 360 phút xuống 10–75 phút.

## 5. Rủi ro và giảm thiểu

| Rủi ro | Giảm thiểu |
|---|---|
| Lỗi kiểu chỉ build mới bắt (typed routes) giờ hiện ở `e2e-ux` thay vì `web` | `e2e-ux` là check bắt buộc như `web`; Render chờ cả 5 check. Heap 4 GB như build cũ của `web` (đã xanh với cùng cấu hình) |
| Build kiểm kiểu làm `e2e-ux` dài hơn ~3,5 phút | Vẫn ngắn hơn `web` nhiều ⇒ thời gian chờ PR không tăng |
| PR không đổi `workers/` nhưng làm hỏng worker gián tiếp | `workers/tests` chỉ đọc tệp trong `workers/` (đã rà); push `main` luôn chạy pytest trước khi Render deploy |
| PR thêm mã Python ngoài `workers/` | Mẫu lọc bắt mọi `*.py` trong repo |
| Diff không đọc được (thiếu commit cha, ref lạ) | Bước phạm vi chạy đủ (đã thử: clone `--depth 1` ⇒ `run=true`) |
| `fsync=off` che lỗi chỉ có khi đĩa chậm/sập | Không ca test nào kiểm độ bền khi sập; production không bị đổi. Ảnh hưởng thời gian: timing-sensitive test chỉ nhanh hơn |
| `tsx` tải bằng `npm exec` không kiểm integrity của lockfile | Phiên bản cố định đọc từ lockfile; bản trên registry npm là bất biến. Script thêm import gói npm ⇒ bước đỏ (an toàn), khi đó trả lại `npm ci` |
| Huỷ run PR khi người duyệt đang xem kết quả cũ | Chỉ huỷ khi có push mới vào **cùng** PR — kết quả cũ đã lỗi thời |
| Check PR "worker"/"CodeQL Python" xanh dù không chạy pytest/phân tích | Có `::notice` ghi rõ đã bỏ qua và lý do trong tóm tắt run |

## 6. Kết quả kiểm chứng

### 6.1 Workflow
- `python3 yaml.safe_load` cả 3 tệp: hợp lệ; 5 tên job `ci.yml` (`web`, `security`, `industry-terms`, `worker`, `e2e-ux`) giữ nguyên; mọi job có `timeout-minutes`.
- `actionlint`: **chưa chạy** — binary tải về bị chính sách của phiên làm việc chặn. Nên chạy trước khi merge: `actionlint .github/workflows/*.yml`.
- Bước phạm vi O-5/O-6 chạy thử trên merge commit giả lập (`git merge --no-ff` như ref `refs/pull/N/merge`):

| PR đổi | `worker` | CodeQL python | CodeQL JS/TS |
|---|---|---|---|
| `docs/x.md` | bỏ qua | bỏ qua | chạy |
| `src/x.ts` | bỏ qua | bỏ qua | chạy |
| `workers/x.txt` | chạy | chạy | chạy |
| `scripts/x.py` | bỏ qua | chạy | chạy |
| sự kiện `push` | chạy | chạy | chạy |
| clone `--depth 1` (không có cha) | chạy | — | — |

### 6.1b Cổng của repo (chạy tại máy, cấu hình CI)
- `npm test`: 768 tệp / 4697 ca xanh (gồm `tests/unit/architecture/render-blueprint-tu-du.test.ts` đọc `ci.yml`: không có job `deploy`).
- `npm run check:docs`: xanh.
- Không đổi tệp TS ⇒ `typecheck`/`lint:ratchet` không áp dụng. `next build` có kiểm kiểu với `NODE_OPTIONS=--max-old-space-size=4096`
  không chạy lại tại máy: đúng cấu hình này vừa xanh ở job `web` của run `42818043992`.

### 6.2 Đo tại máy (Postgres 16 cục bộ, cùng lệnh dựng CSDL như CI, 4 vCPU)
- `TRUNCATE` toàn bộ bảng (như `resetDatabase()`), 30 lần: **579 ms** (fsync on) → **150 ms** (off).
- 20 tệp đầu `tests/tenant` (88 ca): **130 s → 95 s**, cả hai xanh.
- Toàn bộ `test:tenant` với cấu hình mới: **267 tệp / 1174 ca xanh, 1522 s (25,4 phút)**; `test:platform`: **17 tệp / 55 ca xanh, 93 s**.
  (Chạy đủ bộ với fsync on tại máy không làm — theo tỉ lệ mẫu 20 tệp, ước ~35 phút; trên runner CI cũ đo 31,5–32,1 phút.)
- `industry-terms`: `npm exec tsx@4.23.15` trên worktree **không có `node_modules`**: 3,5 s, đầu ra `diff` giống hệt `npm run audit:industry:check`.

### 6.3 Lần chạy đầu trên runner — PR #24, run `42855169978` (head `e079881`, base `main` `0ceda77`)

| Job | Kết quả | Thời lượng | So với §1.1 |
|---|---|---|---|
| `industry-terms` | xanh | **11 s** | 60–74 s (O-4 xác nhận) |
| `e2e-ux` | xanh | 8,6 phút; build có kiểm kiểu **3,6 phút**, E2E 3,2 phút | build 1,8 phút khi bỏ kiểm kiểu ⇒ O-3 tốn +1,8 phút ở đây |
| `worker` | xanh | 3,8 phút | chạy đủ — đúng, vì PR đổi `ci.yml` |
| `security` | xanh | 0,7 phút | 1,3 phút |
| CodeQL python | xanh | **0,95 phút** (bỏ qua, có notice) | 4,9 phút (O-6 xác nhận) |
| CodeQL JS/TS | xanh | 3,8 phút | 9,8 phút (không do thay đổi này — chưa rõ nguyên nhân) |
| `web` | **đỏ** ở `npm test` sau 8 phút | bước Postgres mới: 0 s, xanh | 3 tệp test OpenAPI/route sinh tự động (`internal-openapi`, `delivery-phase`, `trace-phase`) — **đỏ sẵn trên `main` `0ceda77`** (run `42844828846`), `main` sửa ở PR #25; đã merge `main` vào nhánh |

Sau khi merge `main` (`2af3f82`) vào nhánh: `npm test` tại máy 785 tệp / 4841 ca xanh, `check:docs` xanh; YAML của `release-gd1.yml` đọc được.
`test:tenant` trên runner chưa đo được ở lần này (bị skip sau `npm test` đỏ) — xem lần chạy sau merge `main`.

### 6.4 Chưa kiểm chứng
- Thời lượng thật trên runner của `web` (đặc biệt `test:tenant`) và `e2e-ux` (build có kiểm kiểu).
- Render nhận check của commit `main` đầu tiên sau merge và deploy bình thường.
- Đo lại sau 1–2 tuần: tổng thời lượng job/sự kiện so với bảng §1.1.

## 7. Cơ hội còn lại (cần PO duyệt hoặc ngoài phạm vi workflow)

| # | Đề xuất | Lợi ích ước tính | Vì sao chưa làm |
|---|---|---|---|
| R-1 | `resetDatabase()` chỉ TRUNCATE bảng có dữ liệu (đếm `n_live_tup`/`DELETE` bảng nhỏ) hoặc dựng một lần + rollback theo ca | `test:tenant` có thể giảm thêm 50 %+ (bước lớn nhất) | Sửa test helper của cổng bắt buộc — cần PO |
| R-2 | ESLint `--cache --cache-strategy content` + `actions/cache` | ~1,5–2 phút/run | Sửa `scripts/eslint-ratchet.mjs` |
| R-3 | `next typegen` rồi `typecheck` (TS 7) có typed routes; cả build đặt `SKIP_BUILD_TYPECHECK` | ~3,5 phút/run | Đổi cổng kiểm kiểu — audit TC-03 đề xuất, cần PO |
| R-4 | Cache trình duyệt Playwright (`~/.cache/ms-playwright`) | ~0,5–1 phút/run `e2e-ux` | Lợi nhỏ, vẫn phải `install-deps` |
| R-5 | gitleaks chỉ quét lịch sử của HEAD (`--log-opts=HEAD`) thay vì mọi nhánh đã fetch | <1 phút; **và** hết cảnh PR đỏ vì bí mật giả trên nhánh khác (xem các commit `.gitleaksignore` ngày 10/11) | Đổi phạm vi quét bảo mật — cần PO |
| R-6 | `ffmpeg` qua cache apt hoặc bản tĩnh | 0,4–5 phút trên run có `workers/` | Thời gian apt dao động; ít lần chạy sau O-5 |
| R-7 | Bật ruleset `main` (yêu cầu PR + 5 check) và "require up to date" | Tránh run đỏ trên `main` rồi phải sửa lại (CI-01/CI-02 của audit trước) | Cài đặt GitHub, không nằm trong repo |
