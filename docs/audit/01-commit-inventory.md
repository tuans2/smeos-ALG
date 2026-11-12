# 01 — Commit inventory

Generated from `git rev-list --reverse --topo-order --date-order <7 tips> ^origin/main` (main = `c76aab97`). Total **613** commits (519 non-merge, 94 merge). Batch = 50 commits, fixed order — never reorder.

Branch codes: INT=`integration/all-features-oct27` · UPB=`claude/upbeat-clarke-2zx8tb` · TINH=`Tinh_chinh_cac_tinh_nang` · DNPM/DTIMM/DTV/DTORCH=dependabot. Lineage LEGACY = reachable only from TINH (unrelated history, no common ancestor with main — see 00 §3.2).

Columns: #, batch, hash, parents, author, date, kind, files changed (merges: vs first parent), test files touched, prisma files touched, branches, top-level areas, subject.

## Batch 01 (#1–#50)

| # | Hash | Parents | Author | Date | Kind | Files | Tests | Prisma | Branches | Lineage | Areas | Subject |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | `15508f97` | (root) | An Tran | 2026-09-09 | C | 0 | 0 | 0 | TINH | LEGACY |  | P0: dựng khung floraos-core |
| 2 | `b1a8be69` | 15508f97 | An Tran | 2026-09-09 | C | 1 | 0 | 0 | TINH | LEGACY | docs | Bỏ bản khung AGENTS đã dùng xong |
| 3 | `a747ba39` | b1a8be69 | An Tran | 2026-09-09 | C | 1 | 0 | 0 | TINH | LEGACY | docs | Cập nhật TRANG_THAI: bốn repo đã có remote riêng tư |
| 4 | `d2d7a5b0` | a747ba39 | An Tran | 2026-09-09 | C | 3 | 0 | 0 | TINH | LEGACY | docs | Chốt D4 và quy ước đếm |
| 5 | `edbf1d34` | d2d7a5b0 | An Tran | 2026-09-09 | C | 1 | 0 | 0 | TINH | LEGACY | docs | Rà soát thu hoạch: đối chiếu tài liệu với mã thật ba repo |
| 6 | `5e510988` | edbf1d34 | An Tran | 2026-09-09 | C | 15 | 0 | 0 | TINH | LEGACY | docs | Bộ đặc tả floraos-core — 13 tệp |
| 7 | `e0fb4310` | 5e510988 | An Tran | 2026-09-09 | C | 11 | 0 | 0 | TINH | LEGACY | AGENTS.md docs | Chốt D1, D2, D3; sửa tài liệu theo mã thật |
| 8 | `c44378c2` | e0fb4310 | An Tran | 2026-09-09 | C | 4 | 0 | 0 | TINH | LEGACY | docs | Tài liệu 09 dữ liệu mẫu trải nghiệm; hồ sơ thương hiệu đủ bốn màu cho LocalBudd |
| 9 | `a2a9ea46` | c44378c2 | An Tran | 2026-09-09 | C | 18 | 2 | 0 | TINH | LEGACY | .env.example .github AGENTS.md README.md docker-compose.yml next.config.ts | P0.5: nền chạy được |
| 10 | `f4c52cb1` | a2a9ea46 | An Tran | 2026-09-09 | C | 12 | 1 | 0 | TINH | LEGACY | .gitignore AGENTS.md README.md docs package-lock.json package.json | Sửa 9 lỗi soát ra; xác minh repo cài và build được |
| 11 | `35482a30` | f4c52cb1 | An Tran | 2026-09-09 | C | 1 | 0 | 0 | TINH | LEGACY | AGENTS.md | AGENTS: bắt buộc cập nhật checklist và trạng thái khi xong việc |
| 12 | `799aedc0` | 35482a30 | An Tran | 2026-09-09 | C | 69 | 14 | 2 | TINH | LEGACY | .github .gitignore AGENTS.md README.md docs eslint.config.mjs | P1: nền đa tenant — bảy bảng, ngữ cảnh tổ chức, bộ gác repository |
| 13 | `9e579c26` | 799aedc0 | An Tran | 2026-09-09 | C | 53 | 6 | 1 | TINH | LEGACY | AGENTS.md docs eslint.config.mjs package.json prisma src/app | P2: quyền — 113 mã năng lực, ba lớp cắt, endpoint quản lý tổ chức |
| 14 | `4efcb7fd` | 9e579c26 | An Tran | 2026-09-09 | C | 6 | 1 | 0 | TINH | LEGACY | docs package-lock.json src/modules tests | P2: verify xong trên DB thật — sửa 1 lỗi type, 1 test lỗi thời |
| 15 | `d614224e` | 4efcb7fd | An Tran | 2026-09-09 | C | 74 | 9 | 1 | TINH | LEGACY | .gitignore AGENTS.md docs prisma scripts src/app | P3: Asset · Job · Usage — mã viết xong, chưa xác minh |
| 16 | `24f1049c` | d614224e | An Tran | 2026-09-09 | C | 6 | 1 | 0 | TINH | LEGACY | docs src/modules tests | P3: sửa 2 lỗi thật tìm được khi chạy Postgres thật lần đầu |
| 17 | `f4eaca40` | 24f1049c | An Tran | 2026-09-09 | C | 3 | 1 | 0 | TINH | LEGACY | docs tests | P3: sửa lỗi thứ ba — bộ thử enqueue-job chưa kiểm đúng đường CREDIT |
| 18 | `c711a63b` | f4eaca40 | An Tran | 2026-09-09 | C | 3 | 0 | 0 | TINH | LEGACY | docs | P3: nghiệm thu phần lõi — 35/35 test:tenant xanh trên Postgres thật |
| 19 | `89808fcb` | c711a63b | An Tran | 2026-09-09 | C | 20 | 4 | 1 | TINH | LEGACY | AGENTS.md docs prisma src/app src/modules tests | P4: Hồ sơ kinh doanh và thương hiệu — mã viết xong, chưa xác minh |
| 20 | `f870894b` | 89808fcb | An Tran | 2026-09-09 | C | 4 | 0 | 0 | TINH | LEGACY | AGENTS.md docs src/modules | P4: nghiệm thu xong — 41/41 test:tenant xanh trên Postgres thật |
| 21 | `7cf2472d` | f870894b | An Tran | 2026-09-10 | C | 148 | 9 | 1 | TINH | LEGACY | .gitignore AGENTS.md docs golden prisma scripts | P5: M01 Product Image Analysis — viết mã xong, CHƯA xác minh trên Postgres thật |
| 22 | `c113ba8e` | 7cf2472d | An Tran | 2026-09-10 | C | 1 | 0 | 0 | TINH | LEGACY | docs | docs: ghi rõ vào nợ #24 — đã từ chối yêu cầu AI tự gán nhãn bộ ảnh vàng |
| 23 | `8188b979` | c113ba8e | An Tran | 2026-09-10 | C | 1 | 1 | 0 | TINH | LEGACY | tests | fix(test): vision-analyses — kiểm đúng đường CREDIT, không đường TRIAL mặc định |
| 24 | `27a44c77` | 8188b979 | An Tran | 2026-09-10 | C | 3 | 0 | 0 | TINH | LEGACY | AGENTS.md docs | P5: nghiệm thu phần lõi — 49/49 test:tenant + 43/43 pytest xanh trên máy thật |
| 25 | `02c03f35` | 27a44c77 | An Tran | 2026-09-10 | C | 29 | 6 | 0 | TINH | LEGACY | AGENTS.md docs src/app src/modules tests | P6: M02 (giá) + M03 (tra cứu sản phẩm) — viết mã xong, chưa xác minh trên Postgres thật |
| 26 | `2607e921` | 02c03f35 | An Tran | 2026-09-10 | C | 3 | 0 | 0 | TINH | LEGACY | AGENTS.md docs | P6: nghiệm thu xong — xanh toàn bộ trên Postgres thật |
| 27 | `fda830f2` | 2607e921 | An Tran | 2026-09-10 | C | 58 | 6 | 1 | TINH | LEGACY | .env.example AGENTS.md docs prisma src/app src/core | P7: Integration Layer — nghiệm thu xong trên Postgres thật (69/69 test:tenant) |
| 28 | `828c2263` | fda830f2 | An Tran | 2026-09-10 | C | 13 | 1 | 0 | TINH | LEGACY | .gitignore AGENTS.md docs scripts src/modules | P8: nạp danh mục AVI GIFT — viết mã xong, chưa xác minh trên Postgres thật |
| 29 | `3493cf10` | 828c2263 | An Tran | 2026-09-10 | C | 2 | 0 | 0 | TINH | LEGACY | docs | docs: chốt nợ #12 (cho_phep_tu_duyet mặc định true) và #14 (cost_credit giữ hằng số) |
| 30 | `868d8c8f` | 3493cf10 | An Tran | 2026-09-10 | C | 15 | 3 | 0 | TINH | LEGACY | .github docs next.config.ts scripts src/modules tests | Soát P1–P8: sửa CI đỏ, thêm test tenant cho P8, mở khoá credit |
| 31 | `fedc72fb` | 868d8c8f | An Tran | 2026-09-10 | C | 1 | 1 | 0 | TINH | LEGACY | tests | fix(test): brand-profile — kiểm màu/tông giọng, không kiểm display_name |
| 32 | `65e055a6` | fedc72fb | An Tran | 2026-09-10 | C | 2 | 0 | 0 | TINH | LEGACY | docs | docs: nghiệm thu đợt soát P1–P8 — test:tenant 79/79 xanh trên Postgres thật |
| 33 | `c7898025` | 65e055a6 | An Tran | 2026-09-10 | C | 11 | 2 | 0 | TINH | LEGACY | docs scripts src/modules tests | P8: nạp phân tích ảnh thật của AVI GIFT (nợ #34) — viết mã xong, chưa chạy thật |
| 34 | `71772ba3` | c7898025 | An Tran | 2026-09-10 | C | 13 | 1 | 0 | TINH | LEGACY | docs src/modules tests | fix: generation_jobs.result là String phán quyết, không phải Json số liệu |
| 35 | `7e49eb7a` | 71772ba3 | An Tran | 2026-09-10 | C | 1 | 0 | 0 | TINH | LEGACY | docs | docs: nợ #34 nghiệm thu — test:tenant 87/87 xanh trên Postgres thật |
| 36 | `3e69864d` | 7e49eb7a | An Tran | 2026-09-10 | C | 7 | 0 | 0 | TINH | LEGACY | docs package.json scripts | fix: bốn script nạp không tự nạp .env — thêm script npm mang sẵn cờ |
| 37 | `cedea04e` | 3e69864d | An Tran | 2026-09-10 | C | 2 | 0 | 0 | TINH | LEGACY | package.json scripts | P8: script đối chiếu lượt nạp AVI GIFT với nguồn |
| 38 | `ab794499` | cedea04e | An Tran | 2026-09-10 | C | 2 | 0 | 0 | TINH | LEGACY | docs | P8 xong: hai lượt nạp AVI GIFT chạy thật, đối chiếu khớp hoàn toàn |
| 39 | `5f1ab7c3` | ab794499 | An Tran | 2026-09-10 | C | 4 | 2 | 0 | TINH | LEGACY | workers | P9: lõi Product Identity Guard (Python, thuần) — fingerprint + bốn điểm + phán quyết |
| 40 | `65eab93f` | 5f1ab7c3 | An Tran | 2026-09-10 | C | 6 | 2 | 0 | TINH | LEGACY | workers | P9: pipeline M04a — cổng provider, PassthroughEnhancer, worker Identity Guard |
| 41 | `f14cd9f6` | 65eab93f | An Tran | 2026-09-10 | C | 19 | 1 | 1 | TINH | LEGACY | package.json prisma scripts src/app src/modules workers | P9: module media phía TS — bốn endpoint, cổng 2 Review & Approve, D3 hoàn credit |
| 42 | `89ef4bda` | f14cd9f6 | An Tran | 2026-09-10 | C | 4 | 1 | 0 | TINH | LEGACY | docs tests | P9: test tenant cho M04a + cập nhật checklist, nợ kỹ thuật, trạng thái |
| 43 | `4826dddb` | 89ef4bda | An Tran | 2026-09-10 | C | 2 | 0 | 0 | TINH | LEGACY | docs src/modules | fix: findApprovedMaster loại bản dẫn xuất theo kind, không theo phả hệ |
| 44 | `23c22999` | 4826dddb | An Tran | 2026-09-10 | C | 55 | 5 | 0 | TINH | LEGACY | .env.example docs package.json src/app src/components src/core | feat: Unified Shell B1/B2 + đợt đồng bộ ba repo (Đợt 0+1+2) |
| 45 | `d55bf2b6` | 23c22999 | An Tran | 2026-09-10 | C | 1 | 0 | 0 | TINH | LEGACY | docs | docs: lệnh nghiệm thu đợt đồng bộ ba repo (09/10) |
| 46 | `e37e5afb` | d55bf2b6 | An Tran | 2026-09-10 | C | 1 | 0 | 0 | TINH | LEGACY | docs | docs: bỏ bẫy `source .env` khỏi lệnh nghiệm thu, thêm chốt chặn chuỗi kết nối |
| 47 | `6e33b751` | e37e5afb | An Tran | 2026-09-10 | C | 2 | 0 | 0 | TINH | LEGACY | docs | docs: nghiệm thu đợt đồng bộ ba repo trên Postgres thật — test:tenant 108/108 |
| 48 | `dd6b35fc` | 6e33b751 | An Tran | 2026-09-10 | C | 2 | 0 | 0 | TINH | LEGACY | package.json scripts | feat(scripts): npm run mat-khau — đặt lại mật khẩu tài khoản trên máy phát triển |
| 49 | `3769beee` | dd6b35fc | An Tran | 2026-09-10 | C | 1 | 0 | 0 | TINH | LEGACY | docs | docs: nợ #46 — test:tenant xoá sạch database phát triển |
| 50 | `7b5ee35f` | 3769beee | An Tran | 2026-09-10 | C | 1 | 0 | 0 | TINH | LEGACY | docs | docs: luồng SSO đầu-cuối xác minh xong trên dữ liệu thật |

## Batch 02 (#51–#100)

| # | Hash | Parents | Author | Date | Kind | Files | Tests | Prisma | Branches | Lineage | Areas | Subject |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 51 | `75eb0765` | 7b5ee35f | An Tran | 2026-09-10 | C | 6 | 2 | 0 | TINH | LEGACY | docs src/modules tests | fix: khối pricing không vượt ranh giới core qua đường SSO |
| 52 | `46168f59` | 75eb0765 | An Tran | 2026-09-10 | C | 1 | 1 | 0 | TINH | LEGACY | tests | test: sửa khẳng định của ca "pricing không vượt biên" — soi giá trị, không soi khoá |
| 53 | `eac8b40a` | 46168f59 | An Tran | 2026-09-10 | C | 8 | 1 | 0 | TINH | LEGACY | AGENTS.md docs package.json scripts tests | fix: trả nợ #46 — test:tenant chạy trên database riêng, không xoá dữ liệu dev |
| 54 | `1ee1079d` | eac8b40a | An Tran | 2026-09-10 | C | 2 | 0 | 0 | TINH | LEGACY | AGENTS.md scripts | fix: db:test:setup — bỏ cờ --skip-generate (Prisma 7 không còn), nghiệm thu tại chỗ |
| 55 | `2cfd0a59` | 1ee1079d | An Tran | 2026-09-10 | C | 1 | 0 | 0 | TINH | LEGACY | docs | docs: nợ #46 nghiệm thu — test:tenant 109/109 xanh trên floraos_test |
| 56 | `5ef16658` | 2cfd0a59 | An Tran | 2026-09-10 | C | 1 | 0 | 0 | TINH | LEGACY | docs | docs: kế hoạch Đợt 3 — nối SocialFlow vào core |
| 57 | `7ce52e7f` | 5ef16658 | An Tran | 2026-09-10 | C | 1 | 0 | 0 | TINH | LEGACY | docs | docs: sửa số route trong kế hoạch Đợt 3 theo bảng kiểm kê sinh bằng mã |
| 58 | `33648060` | 7ce52e7f | An Tran | 2026-09-11 | C | 27 | 0 | 0 | TINH | LEGACY | .gitignore docs package.json scripts src/app src/components | feat: Unified Shell — Dashboard điều hành nối dữ liệu thật, trang giá, nâng cấp gói, script thêm thành viên |
| 59 | `09ec845f` | 33648060 | An Tran | 2026-09-11 | C | 59 | 15 | 1 | TINH | LEGACY | .gitignore prisma scripts src/app src/components src/core | feat: đợt soát mức sẵn sàng triển khai M01 — ba bộ máy phân tích ảnh, duyệt/từ chối/xuất, hoàn credit mở rộng, vá bảo mật storage-key |
| 60 | `03efa98b` | 09ec845f | An Tran | 2026-09-11 | C | 9 | 0 | 0 | TINH | LEGACY | docs | docs: cập nhật đặc tả, kiến trúc và nợ kỹ thuật cho đợt M01 (ba bộ máy phân tích ảnh, duyệt/từ chối/xuất, hoàn credit) |
| 61 | `902ea351` | 03efa98b | An Tran | 2026-09-12 | C | 65 | 8 | 2 | TINH | LEGACY | AGENTS.md docs prisma src/app src/core src/modules | feat(ai): đợt AI-1 — cổng AI, hai sổ đăng ký, bộ định tuyến, lớp chấm điểm |
| 62 | `9280acb5` | 902ea351 | An Tran | 2026-09-12 | C | 10 | 4 | 0 | TINH | LEGACY | src/components tests workers | AI-1: sinh Prisma client, đồng bộ schema test, sửa default engine test |
| 63 | `afb1ca63` | 9280acb5 | An Tran | 2026-09-12 | C | 3 | 0 | 0 | TINH | LEGACY | AGENTS.md docs | docs: cập nhật trạng thái AI-1 — hoàn tất 09/12 |
| 64 | `aba0b534` | afb1ca63 | An Tran | 2026-09-12 | C | 5 | 0 | 0 | TINH | LEGACY | docs golden scripts | golden: bộ ảnh vàng — hướng dẫn gán nhãn, theo dõi, script AI đề xuất |
| 65 | `634c7cf0` | aba0b534 | An Tran | 2026-09-12 | C | 1 | 0 | 0 | TINH | LEGACY | scripts | golden: script so sánh AI proposal vs nhãn người |
| 66 | `228967d3` | 634c7cf0 | An Tran | 2026-09-12 | C | 1 | 0 | 0 | TINH | LEGACY | golden | golden: cập nhật TRANG_THAI_GAN_NHAN — thêm công cụ so sánh, trạng thái |
| 67 | `3523566d` | 228967d3 | An Tran | 2026-09-12 | C | 13 | 0 | 0 | TINH | LEGACY | docs golden scripts | golden: quy tắc ước tính chấp nhận, 8 ảnh đã gán, script so sánh |
| 68 | `1df21b57` | 3523566d | An Tran | 2026-09-12 | C | 1 | 0 | 0 | TINH | LEGACY | scripts | golden: ma trận chọn công nghệ — local_cv vs người trên 8 ảnh |
| 69 | `d4fbfe4f` | 1df21b57 | An Tran | 2026-09-12 | C | 1 | 0 | 0 | TINH | LEGACY | scripts | golden: script tra ĐVT chuẩn từ Excel cho AI proposals |
| 70 | `b323484d` | d4fbfe4f | An Tran | 2026-09-12 | C | 1 | 0 | 0 | TINH | LEGACY | scripts | golden: tra-dvt improved with ten_khac from Excel |
| 71 | `ac795139` | b323484d | An Tran | 2026-09-12 | C | 1 | 0 | 0 | TINH | LEGACY | scripts | golden: ma trận chi tiết với ĐVT normalization |
| 72 | `4dc8e907` | ac795139 | An Tran | 2026-09-12 | C | 1 | 0 | 0 | TINH | LEGACY | scripts | golden: script chạy OpenAI Structured trên ảnh vàng |
| 73 | `9b6a272c` | 4dc8e907 | An Tran | 2026-09-12 | C | 4 | 0 | 0 | TINH | LEGACY | golden | golden: OpenAI Structured results on 4 golden images |
| 74 | `81375c20` | 9b6a272c | An Tran | 2026-09-12 | C | 1 | 0 | 0 | TINH | LEGACY | scripts | golden: so sánh tất cả engine trên 4 ảnh |
| 75 | `3c7318fe` | 81375c20 | An Tran | 2026-09-12 | C | 1 | 0 | 0 | TINH | LEGACY | scripts | fix: len(fc) bug in openai runner |
| 76 | `9ae772be` | 3c7318fe | An Tran | 2026-09-12 | C | 5 | 0 | 0 | TINH | LEGACY | golden scripts | golden: OpenAI Direct results on 4 images + complete matrix data |
| 77 | `25e1fe65` | 9ae772be | An Tran | 2026-09-12 | C | 2 | 0 | 0 | TINH | LEGACY | docs golden | docs: matrix complete, update checklist and status |
| 78 | `93fcf25c` | 25e1fe65 | An Tran | 2026-09-12 | C | 7 | 1 | 0 | TINH | LEGACY | docs src/modules workers | chore(engine-default): openai_direct + gpt-4o-mini làm mặc định, sửa bug config key |
| 79 | `6ab393d0` | 93fcf25c | An Tran | 2026-09-12 | C | 2 | 0 | 0 | TINH | LEGACY | docs | P16 M04b: backend tests fixed, frontend + E2E done |
| 80 | `94d11656` | 6ab393d0 | An Tran | 2026-09-12 | C | 1 | 0 | 0 | TINH | LEGACY | docs | P16 done: update next steps |
| 81 | `e48a75c0` | 94d11656 | An Tran | 2026-09-13 | C | 7 | 0 | 0 | TINH | LEGACY | docs src/app | Tích hợp UI ↔ Backend cho 4/10 chức năng UI/UX |
| 82 | `b954142f` | e48a75c0 | An Tran | 2026-09-13 | C | 2 | 0 | 0 | TINH | LEGACY | docs | Thêm checklist tính năng chi tiết 10 chức năng UIUX |
| 83 | `23960413` | b954142f | An Tran | 2026-09-13 | C | 1 | 0 | 0 | TINH | LEGACY | docs | Lập kế hoạch triển khai hoàn thiện 10 chức năng UIUX |
| 84 | `26268714` | 23960413 | An Tran | 2026-09-13 | C | 1 | 0 | 0 | TINH | LEGACY | docs | Cập nhật kế hoạch sau khi trả lời Q1-Q26 |
| 85 | `1760f598` | 26268714 | An Tran | 2026-09-13 | C | 1 | 0 | 0 | TINH | LEGACY | src/app | GĐ 0.1: Nối M01b vào tai-anh (product-copies) |
| 86 | `8418b568` | 1760f598 | An Tran | 2026-09-13 | C | 4 | 1 | 0 | TINH | LEGACY | src/app src/core src/modules tests | AI-2 A3: Review queue endpoint GET/POST /api/v1/ai-requests/review |
| 87 | `9c9893d6` | 8418b568 | An Tran | 2026-09-13 | C | 1 | 0 | 0 | TINH | LEGACY | docs | docs: thêm nhật ký AI-2 A3 xong vào TRANG_THAI.md |
| 88 | `f983f8e6` | 9c9893d6 | An Tran | 2026-09-14 | C | 1 | 0 | 0 | TINH | LEGACY | docs | Checklist: AI-2 A1-A5 + P19 J1/J2 đã xác minh - AI-2 10 mục (YC-E1..E10, YC-G10..G12, D20): tất cả có code + test - P19 J1↔J2 tách rời: SPLIT_CAPABILITY_PAIRS + capability-catalog.test.ts:83-92 - nợ #48 (GET /vision/analyses, GET /media/optimizations chờ duyệt): đã có |
| 89 | `1aaf78e1` | f983f8e6 | An Tran | 2026-09-14 | C | 1 | 0 | 0 | TINH | LEGACY | docs | docs: P19 hoàn tất — J1/J2 tách rời, nợ #48 đã có |
| 90 | `d508a688` | 1aaf78e1 | An Tran | 2026-09-14 | C | 13 | 0 | 0 | TINH | LEGACY | AGENTS.md docs golden src/modules | docs: sửa luật nghiệm thu bộ ảnh vàng từ 100 ảnh xuống 8 ảnh (09/12) |
| 91 | `d6d9e590` | d508a688 | An Tran | 2026-09-14 | C | 13 | 0 | 0 | TINH | LEGACY | docs golden | docs: P5 đạt nghiệm thu bộ ảnh vàng — 8 ảnh đã được gán nhãn và kiểm chứng (09/12) |
| 92 | `49d4882a` | d6d9e590 | An Tran | 2026-09-14 | C | 3 | 0 | 0 | TINH | LEGACY | docs | docs: P5 M01 Vision + M01b Product Copy — đánh dấu hoàn tất 09/12 |
| 93 | `fab18eca` | 49d4882a | An Tran | 2026-09-14 | C | 1 | 0 | 0 | TINH | LEGACY | docs | docs: P5/P14 hoàn tất — cập nhật TRANG_THAI.md mục 1, 6, 8 |
| 94 | `776cc10d` | fab18eca | An Tran | 2026-09-14 | C | 1 | 0 | 0 | TINH | LEGACY | src/lib | fix: Phân tích sản phẩm AI không còn chờ xử lý — M01 hoàn tất 09/12 |
| 95 | `3c8939d1` | 776cc10d | An Tran | 2026-09-14 | C | 4 | 0 | 0 | TINH | LEGACY | docs golden | docs: M01 OpenAI verification on golden images + accuracy report |
| 96 | `98c64695` | 3c8939d1 | An Tran | 2026-09-14 | C | 1 | 0 | 0 | TINH | LEGACY | docs | docs: Complete Phase 1-2 checklist — all code exists, mark items done |
| 97 | `0280d1f9` | 98c64695 | An Tran | 2026-09-14 | C | 20 | 4 | 0 | TINH | LEGACY | src/app src/components src/lib src/modules workers | feat: Complete Phase 1-2 checklist items (code verified, tests pass) |
| 98 | `0559ae0e` | 0280d1f9 | An Tran | 2026-09-14 | C | 1 | 0 | 0 | TINH | LEGACY | src/app | fix: Chọn ảnh button stays in upload phase — add Tiếp tục button |
| 99 | `b23de19a` | 0559ae0e | An Tran | 2026-09-14 | C | 166 | 12 | 1 | TINH | LEGACY | .gitignore AGENTS.md docs golden package-lock.json package.json | feat(templates): standardize 10-feature template engine & ssot architecture |
| 100 | `cee5ae7a` | b23de19a | An Tran | 2026-09-14 | C | 17 | 3 | 0 | TINH | LEGACY | src/app src/components src/core src/lib src/modules | fix(types): resolve all TypeScript type errors across frontend and domain |

## Batch 03 (#101–#150)

| # | Hash | Parents | Author | Date | Kind | Files | Tests | Prisma | Branches | Lineage | Areas | Subject |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 101 | `445af50b` | cee5ae7a | An Tran | 2026-09-14 | C | 42 | 7 | 0 | TINH | LEGACY | AGENTS.md src/app src/components src/modules tests workers | feat(media-ai): optimize studio clarity, 3-variant visual comparison and smart reframe multi-ratio |
| 102 | `98288bbc` | 445af50b | An Tran | 2026-09-14 | C | 1 | 0 | 0 | TINH | LEGACY | workers | fix(worker): ensure variants are only generated when identity guard passes |
| 103 | `1177b441` | 98288bbc | An Tran | 2026-09-14 | C | 2 | 0 | 0 | TINH | LEGACY | docs | docs(m04a): update architecture & status for V1.3 Studio micro-pipeline and 3-variant reframe |
| 104 | `cbb66682` | 1177b441 | An Tran | 2026-09-14 | C | 25 | 4 | 0 | TINH | LEGACY | docs scripts src/app src/components src/lib src/modules | feat(media): hoàn thiện AI Creative Studio M04a & M04b Commercial Ready |
| 105 | `0e45d6fe` | cbb66682 | An Tran | 2026-09-15 | C | 52 | 2 | 0 | TINH | LEGACY | .gitignore AGENTS.md docs package.json public src/app | feat(content-engine): hoan thien AI Content Engine M06 & Social Publishing M07 dat chuan commercial production |
| 106 | `b6c53340` | 0e45d6fe | An Tran | 2026-09-15 | C | 1 | 0 | 0 | TINH | LEGACY | src/lib | fix(dashboard): cap nhat trang thai AI Content Engine va Social Publishing thanh hoat_dong tren trang chu |
| 107 | `609908b0` | b6c53340 | An Tran | 2026-09-16 | C | 39 | 3 | 0 | TINH | LEGACY | .env.example AGENTS.md docs package-lock.json package.json src/app | feat(catalog): M06/M05 Catalog & Website 100% Production Ready - QR Engine, Storefront, Landing Templates & Multi-channel Bridge |
| 108 | `0a4f531d` | 609908b0 | An Tran | 2026-09-16 | C | 65 | 6 | 1 | TINH | LEGACY | AGENTS.md docs package.json prisma src/app src/components | P17: M04c AI Video Studio — hoàn tất tính năng và đồng bộ tài liệu hệ thống |
| 109 | `7fcd93da` | 0a4f531d | An Tran | 2026-09-16 | C | 10 | 2 | 0 | TINH | LEGACY | src/app src/components src/lib src/modules tests | feat: chuẩn hóa hệ thống form Master Profile dùng chung và seed 100% dữ liệu trải nghiệm |
| 110 | `5c7d9f45` | 7fcd93da | An Tran | 2026-09-16 | C | 2 | 0 | 0 | TINH | LEGACY | public src/modules | feat: bổ sung logo chính thức Tiệm Hoa Mộc Lan vào thương hiệu mẫu |
| 111 | `59536a73` | 5c7d9f45 | An Tran | 2026-09-17 | C | 183 | 23 | 1 | TINH | LEGACY | .env.example docs golden package.json prisma scripts | P21 M09 CRM, P22 M10 đơn hàng, P23 M08 chat, gom kho tệp S3/R2 |
| 112 | `8d2fd45d` | 59536a73 | An Tran | 2026-09-17 | C | 35 | 7 | 0 | TINH | LEGACY | .gitignore AGENTS.md docs scripts src/app src/core | P24 — M04b về đúng kiến trúc job |
| 113 | `ee61a610` | 8d2fd45d | An Tran | 2026-09-19 | C | 4 | 0 | 0 | TINH | LEGACY | docs | P25 — kế hoạch Console Vận hành Nền tảng (tài liệu, chưa có mã) |
| 114 | `8b3c9a69` | ee61a610 | An Tran | 2026-09-19 | C | 12 | 0 | 0 | TINH | LEGACY | AGENTS.md docs scripts | RS-18/09: đồng bộ đặc tả 02/06/07/10 với mã, thêm cổng check:docs |
| 115 | `1b782c46` | 8b3c9a69 | An Tran | 2026-09-19 | C | 21 | 2 | 0 | TINH | LEGACY | src/app src/core src/modules tests | RS-1/8/9/10: tách mã năng lực P3/P4, Q9, gác quyền product-copies về use-case |
| 116 | `b540bfb3` | 1b782c46 | An Tran | 2026-09-19 | C | 7 | 2 | 0 | TINH | LEGACY | src/app tests | RS-2/3: ca thử cách ly 4 bảng còn hở, Core làm chủ duy nhất catalog_links |
| 117 | `af211251` | b540bfb3 | An Tran | 2026-09-19 | C | 15 | 0 | 8 | TINH | LEGACY | .env.example .github .gitignore package.json prisma scripts | Lược đồ Prisma, migrations và hạ tầng CI tích luỹ qua các đợt gần đây |
| 118 | `ae2b8645` | af211251 | An Tran | 2026-09-19 | C | 17 | 2 | 0 | TINH | LEGACY | src/app src/components src/modules | Module Dịp (occasions) và Hồ sơ thương hiệu (brand-profile) — dọn lịch sử |
| 119 | `f83b1e53` | ae2b8645 | An Tran | 2026-09-19 | C | 12 | 4 | 0 | TINH | LEGACY | src/app src/components src/modules tests | Product Master Index, Thẻ chào sản phẩm, và Chat -> đơn nháp — dọn lịch sử |
| 120 | `44da6fa7` | f83b1e53 | An Tran | 2026-09-19 | C | 62 | 1 | 0 | TINH | LEGACY | docs scripts src/app src/components src/core src/modules | Hệ thống Template thống nhất (SSOT) — 5 họ, 10+1 chức năng — dọn lịch sử |
| 121 | `921b4243` | 44da6fa7 | An Tran | 2026-09-19 | C | 38 | 8 | 0 | TINH | LEGACY | docker src/app src/components src/modules workers | AIC-13 mở rộng khung ảnh (nợ #78/#104/#105/#107) + M04b batch + vision providers |
| 122 | `2d5da520` | 921b4243 | An Tran | 2026-09-19 | C | 26 | 0 | 0 | TINH | LEGACY | golden | Cập nhật dữ liệu bộ ảnh vàng (golden) sau các lượt chạy OpenAI mới |
| 123 | `f2e19ee5` | 2d5da520 | An Tran | 2026-09-19 | C | 38 | 4 | 1 | TINH | LEGACY | .github docs package.json prisma scripts src/app | P25a — Console Vận hành Nền tảng: phần chỉ đọc (G1) |
| 124 | `3cd91ccc` | f2e19ee5 | An Tran | 2026-09-19 | C | 109 | 11 | 1 | TINH | LEGACY | .env.example docker docker-compose.yml docs golden package.json | feat(market-intelligence): implement M11 Market Intelligence Engine v2.0 with SSOT 210-keyword taxonomy and omnichannel trend analysis |
| 125 | `780b78ef` | 3cd91ccc | An Tran | 2026-09-19 | C | 4 | 0 | 0 | TINH | LEGACY | src/components src/modules | fix(market-intelligence): resolve duplicate key 'Bó hoa tự nhiên' and guard React list keys |
| 126 | `6ef487a9` | 780b78ef | An Tran | 2026-09-19 | C | 3 | 1 | 0 | TINH | LEGACY | src/modules tests | feat(market-intelligence): implement 3-tier intelligent search mechanisms with daily group rotation |
| 127 | `9a0a3241` | 6ef487a9 | An Tran | 2026-09-19 | C | 24 | 0 | 0 | TINH | LEGACY | AGENTS.md docs src/components src/core src/modules | feat(market-intelligence): implement dual video evidence, clean keyword dumps, and update architecture SSOT |
| 128 | `085b6677` | 9a0a3241 | An Tran | 2026-09-20 | C | 20 | 2 | 0 | TINH | LEGACY | .agents AGENTS.md docs src/app src/components src/modules | feat(market-intelligence): complete product intelligence vision pipeline with multimodal AI and progressive selection |
| 129 | `0ac3f3da` | 085b6677 | An Tran | 2026-09-20 | C | 3 | 0 | 0 | TINH | LEGACY | AGENTS.md docs | docs: update TRANG_THAI, AGENTS and architecture docs with Product Intelligence Vision AI milestone |
| 130 | `2ad6d3d4` | 0ac3f3da | An Tran | 2026-09-20 | C | 13 | 0 | 0 | TINH | LEGACY | src/app src/components src/modules | feat(m01b): nâng cấp dữ liệu thương mại Commercial Ready & tích hợp Quét ảnh mẫu Market Intelligence |
| 131 | `cf733740` | 2ad6d3d4 | An Tran | 2026-09-20 | C | 14 | 3 | 0 | TINH | LEGACY | AGENTS.md docs src/components src/modules tests | feat(vision): bóc tách nguyên tử phụ liệu và thiệp chúc mừng OCR đồng bộ toàn hệ thống |
| 132 | `89a1c222` | cf733740 | An Tran | 2026-09-20 | C | 7 | 1 | 0 | TINH | LEGACY | src/modules tests | refactor: anti-hardcode Vision AI pipeline + Dual Video Evidence SSOT |
| 133 | `5d22bd18` | 89a1c222 | An Tran | 2026-09-20 | C | 1 | 0 | 0 | TINH | LEGACY | docs | docs: update market-intelligence test count in TRANG_THAI.md (32→35, product-pipeline-handshake anti-hardcode tests) |
| 134 | `89af2061` | 5d22bd18 | An Tran | 2026-09-20 | C | 23 | 5 | 0 | TINH | LEGACY | src/app src/core src/modules tests | feat(media): Creative Studio cloud infrastructure — providers, schemas, cloud creative, promote-to-master |
| 135 | `6660d251` | 89af2061 | An Tran | 2026-09-20 | C | 16 | 3 | 0 | TINH | LEGACY | src/modules tests | feat(creative-production): Pipeline sản xuất media từ Chặng 04 IDEATE |
| 136 | `1887e9be` | 6660d251 | An Tran | 2026-09-20 | C | 9 | 1 | 0 | TINH | LEGACY | src/modules tests | feat(audio-studio): Audio Studio — TTS, Music, Mixing independent |
| 137 | `ae7db911` | 1887e9be | An Tran | 2026-09-20 | C | 22 | 0 | 0 | TINH | LEGACY | .env.example docs src/app src/components workers | feat(ui+workers): Creative Studio 2-tab workspace + Audio worker + M04b refinements |
| 138 | `e2a6c58e` | ae7db911 | An Tran | 2026-09-20 | C | 8 | 1 | 0 | TINH | LEGACY | docs src/app src/modules workers | feat(creative-studio): Audio Studio + Creative Production routes, audio worker pytest, nợ #110 fix |
| 139 | `e7e801b8` | e2a6c58e | An Tran | 2026-09-21 | C | 4 | 0 | 0 | TINH | LEGACY | docs | docs: Creative Studio I/O Spec, User Journey, Checklist (Chặng 5-14) |
| 140 | `789626c5` | e7e801b8 | An Tran | 2026-09-21 | C | 8 | 1 | 0 | TINH | LEGACY | src/app src/components tests | feat(creative-studio): Đợt 1 — Tab 2 Contents, Tab 3 Audio, Tab 5 Video UI |
| 141 | `de0944f9` | 789626c5 | An Tran | 2026-09-21 | C | 1 | 0 | 0 | TINH | LEGACY | docs | docs: TRANG_THAI.md — Đợt 1 Creative Studio 5 tabs hoàn tất 21/09 |
| 142 | `e39735c2` | de0944f9 | An Tran | 2026-09-21 | C | 1 | 0 | 0 | TINH | LEGACY | src/app | feat(tai-anh): route to Creative Studio from M01a duyệt + saved |
| 143 | `368077d6` | e39735c2 | An Tran | 2026-09-21 | C | 1 | 0 | 0 | TINH | LEGACY | docs | docs: TRANG_THAI.md — Chặng 1-4 → Creative Studio route added |
| 144 | `0835c198` | 368077d6 | An Tran | 2026-09-23 | C | 101 | 7 | 2 | TINH | LEGACY | .gitignore AGENTS.md docs prisma src/app src/components | feat(creative-studio): synchronize codebase and full 14-stage SSOT architecture |
| 145 | `7522378a` | 0835c198 | An Tran | 2026-09-23 | C | 82 | 8 | 3 | TINH | LEGACY | AGENTS.md docs prisma src/app src/components src/modules | fix(creative-studio): đồng bộ 14 chặng với tài liệu và đưa về chuẩn production |
| 146 | `c3908556` | 7522378a | An Tran | 2026-09-23 | C | 5 | 0 | 0 | TINH | LEGACY | src/app src/components workers | fix(creative-studio): Khu vực C — theo dõi job audio rõ ràng, nghe lại được bản phối |
| 147 | `462e5863` | c3908556 | An Tran | 2026-09-23 | C | 3 | 0 | 0 | TINH | LEGACY | src/components | fix(creative-studio): Khu vực D tự dùng ảnh gốc của Khu vực A làm Master thay vì báo lỗi |
| 148 | `99701520` | 462e5863 | An Tran | 2026-09-23 | C | 4 | 0 | 0 | TINH | LEGACY | docs src/components | refactor(creative-studio): Khu vực D bỏ bộ chọn bối cảnh tay, chạy thẳng theo Narrative Arc |
| 149 | `126e1150` | 99701520 | An Tran | 2026-09-23 | C | 26 | 2 | 0 | TINH | LEGACY | docs src/app src/components src/core src/modules tests | feat(creative-studio): Khu vực D sinh ảnh theo kịch bản bối cảnh của chủ đề (AI qua job) |
| 150 | `e50ddbf9` | 126e1150 | An Tran | 2026-09-23 | C | 10 | 0 | 0 | TINH | LEGACY | docs src/components | feat(creative-studio): kịch bản bối cảnh sinh ở Chặng 05, B/C/D/E dùng chung |

## Batch 04 (#151–#200)

| # | Hash | Parents | Author | Date | Kind | Files | Tests | Prisma | Branches | Lineage | Areas | Subject |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 151 | `db9ac47f` | e50ddbf9 | An Tran | 2026-09-23 | C | 3 | 1 | 0 | TINH | LEGACY | src/components workers | fix(media): cổng Subject Integrity từ chối mọi biến thể thật vì alpha lõi 254 |
| 152 | `8ac6dbc9` | db9ac47f | An Tran | 2026-09-23 | C | 1 | 0 | 0 | TINH | LEGACY | docs | docs(creative-studio): ghi sửa chốt lõi đặc vào checklist |
| 153 | `f8bcdfff` | 8ac6dbc9 | An Tran | 2026-09-23 | C | 3 | 0 | 0 | TINH | LEGACY | src/components src/modules workers | fix(creative-studio): hiện lý do Stability lỗi thay vì âm thầm lùi về phông trơn |
| 154 | `c60779e7` | f8bcdfff | An Tran | 2026-09-23 | C | 1 | 0 | 0 | TINH | LEGACY | workers | chore(media): in lý do Stability lỗi ra terminal worker |
| 155 | `b4ac3dad` | c60779e7 | An Tran | 2026-09-23 | C | 3 | 0 | 0 | TINH | LEGACY | docs workers | fix(media): chẩn đoán rõ lỗi TLS khi worker chạy Python 3.9/LibreSSL |
| 156 | `08399de4` | b4ac3dad | An Tran | 2026-09-23 | C | 1 | 0 | 0 | TINH | LEGACY | workers | fix(media): lỗi Stability 401/402/403/429 ghi thành câu dễ hiểu |
| 157 | `cfde7522` | 08399de4 | An Tran | 2026-09-23 | C | 4 | 1 | 0 | TINH | LEGACY | docs workers | fix(media): biến thể M04b làm nhoè bó hoa mà cổng integrity vẫn báo 100% |
| 158 | `beb7da82` | cfde7522 | An Tran | 2026-09-24 | C | 13 | 2 | 0 | TINH | LEGACY | docs src/components src/modules tests workers | fix(creative-studio): Khu vực E dựng storyboard theo kịch bản bối cảnh, bỏ ảnh mẫu |
| 159 | `61d66b6f` | beb7da82 | An Tran | 2026-09-24 | C | 8 | 0 | 0 | TINH | LEGACY | docs src/app src/components src/modules | fix(creative-studio): Khu vực E không còn báo "đã tạo/đã duyệt" khi chưa có video |
| 160 | `8f87929a` | 61d66b6f | An Tran | 2026-09-24 | C | 3 | 0 | 0 | TINH | LEGACY | docs src/components workers | fix(creative-studio): video Khu vực E có giọng đọc lời thoại từng cảnh |
| 161 | `7eafb484` | 8f87929a | An Tran | 2026-09-24 | C | 2 | 1 | 0 | TINH | LEGACY | workers | fix(video): giọng đọc bị rơi khỏi video do gọi pad/silence sai thứ tự tham số |
| 162 | `590f2715` | 7eafb484 | An Tran | 2026-09-24 | C | 2 | 0 | 0 | TINH | LEGACY | docs src/components | feat(creative-studio): Chặng 07 hiện sẵn tài sản B–E và tạo gói kèm luôn |
| 163 | `03b2e09b` | 590f2715 | An Tran | 2026-09-24 | C | 8 | 0 | 0 | TINH | LEGACY | docs src/app src/components src/modules | feat(creative-studio): Chặng 07 xem lại, sửa nhẹ và làm lại toàn bộ tài sản gói |
| 164 | `5d22645a` | 03b2e09b | An Tran | 2026-09-24 | C | 14 | 2 | 2 | TINH | LEGACY | docs prisma src/app src/components src/modules tests | feat(creative-studio): bài Khu vực B tự lưu, Chặng 07 đưa sẵn vào gói |
| 165 | `c23b4bb1` | 5d22645a | An Tran | 2026-09-24 | C | 1 | 0 | 0 | TINH | LEGACY | src/components | feat(creative-studio): Chặng 07 có nút mở Khu vực B khi chưa có bài tự lưu |
| 166 | `e27603de` | c23b4bb1 | An Tran | 2026-09-24 | C | 1 | 0 | 0 | TINH | LEGACY | src/components | fix(creative-studio): Chặng 07 phát được video/âm thanh và hiện storyboard video |
| 167 | `9ceeab52` | e27603de | An Tran | 2026-09-24 | C | 17 | 1 | 0 | TINH | LEGACY | docs src/app src/components src/core src/modules tests | feat(creative-studio): sửa tại chỗ mọi kết quả ở Chặng 07, chạy ngầm, tự thay vào gói |
| 168 | `e846f746` | 9ceeab52 | An Tran | 2026-09-24 | C | 2 | 0 | 0 | TINH | LEGACY | src/app src/components | fix(video): trang /video phát được video đã render, bỏ ảnh mẫu và thông báo giả |
| 169 | `6eed51d8` | e846f746 | An Tran | 2026-09-24 | C | 14 | 0 | 0 | TINH | LEGACY | docs src/app src/components src/modules | docs(trang-thai): ghi đợt sửa Creative Studio chiều-tối 24/09 |
| 170 | `0c9ef44e` | 6eed51d8 | An Tran | 2026-09-24 | C | 8 | 0 | 0 | TINH | LEGACY | AGENTS.md docs | docs(creative-studio): đồng bộ tài liệu với nâng cấp 24/09 |
| 171 | `27216cbf` | 0c9ef44e | An Tran | 2026-09-24 | C | 44 | 8 | 2 | TINH | LEGACY | .gitignore AGENTS.md docs prisma src/app src/components | feat(market-intelligence): phat video truc tiep tai cho tren bang vang xu huong va cap nhat tai lieu |
| 172 | `17accc33` | 27216cbf | An Tran | 2026-09-24 | C | 20 | 0 | 0 | TINH | LEGACY | .env.example AGENTS.md docs src/components src/modules | feat(creative-studio): Khu vực C — 4 tác vụ âm thanh thật, thư viện nhạc có giấy phép, Voice Clone ElevenLabs |
| 173 | `2ae7ba87` | 17accc33 | An Tran | 2026-09-24 | C | 10 | 1 | 0 | TINH | LEGACY | docs src/app src/components src/modules tests | fix(video): Khu vực E lấy đúng ảnh Khu vực D cho từng cảnh, render tự lấp cảnh trống ảnh |
| 174 | `e2ebdefb` | 2ae7ba87 | An Tran | 2026-09-24 | C | 19 | 1 | 0 | TINH | LEGACY | docs src/app src/components src/modules tests workers | feat(creative-studio): Đợt 1 — kịch bản sản xuất tổng v2 tại Chặng 05 |
| 175 | `bb3e1c27` | e2ebdefb | An Tran | 2026-09-24 | C | 9 | 0 | 0 | TINH | LEGACY | docs src/app src/components src/modules | feat(creative-studio): Đợt 2 — Khu vực B và C thực thi kịch bản sản xuất tổng |
| 176 | `76af7299` | bb3e1c27 | An Tran | 2026-09-24 | C | 6 | 0 | 0 | TINH | LEGACY | docs src/app src/components src/modules workers | feat(creative-studio): Đợt 3 — Khu vực D sinh ảnh theo khung nền tảng + phiên bản kịch bản |
| 177 | `2b1d2b48` | 76af7299 | An Tran | 2026-09-24 | C | 18 | 3 | 2 | TINH | LEGACY | docs prisma src/app src/components src/modules tests | feat(creative-studio): Đợt 4 — Khu vực E dựng video từ bộ tài sản của kịch bản (trả nợ #123) |
| 178 | `f6d7e109` | 2b1d2b48 | An Tran | 2026-09-24 | C | 13 | 1 | 0 | TINH | LEGACY | docs src/app src/components src/modules tests | feat(creative-studio): Đợt 5 — sửa ở Chặng 07 đồng bộ sang video + QA đồng nhất kịch bản |
| 179 | `28ade7b8` | f6d7e109 | An Tran | 2026-09-24 | C | 17 | 3 | 0 | TINH | LEGACY | docs src/components src/modules tests workers | feat(video): phụ đề luôn = lời thoại, hiện từng đoạn đúng lúc đọc |
| 180 | `11a8506e` | 28ade7b8 | An Tran | 2026-09-24 | C | 4 | 1 | 0 | TINH | LEGACY | src/modules tests | feat(creative-studio): phạm vi sản xuất (P2 — hợp đồng dữ liệu) |
| 181 | `2fb15eec` | 11a8506e | An Tran | 2026-09-24 | C | 2 | 2 | 0 | TINH | LEGACY | tests | test: chặn mạng thật trong test — không gọi nhà cung cấp AI bằng khoá của .env |
| 182 | `fa9f0ac0` | 2fb15eec | An Tran | 2026-09-24 | C | 83 | 1 | 0 | TINH | LEGACY | AGENTS.md docs package.json scripts src/app src/modules | feat(creative-studio): hợp đồng input/output 14 chặng — zod chuẩn + JSON Schema sinh tự động |
| 183 | `f1193f60` | fa9f0ac0 | An Tran | 2026-09-24 | C | 2 | 1 | 0 | TINH | LEGACY | scripts tests | test(tenant): báo rõ khi database test cũ hơn lược đồ |
| 184 | `89afab47` | f1193f60 | An Tran | 2026-09-24 | C | 7 | 1 | 0 | TINH | LEGACY | docs src/core src/modules tests | fix: 5 ca test:tenant đỏ — mã lỗi 422 của audio, prisma ngoài infra, OpenAI thật trong test |
| 185 | `b9a2e03a` | 89afab47 | An Tran | 2026-09-24 | C | 18 | 1 | 0 | TINH | LEGACY | docs src/app src/components src/modules tests | feat(creative-studio): chọn phạm vi sản xuất cuối Chặng 04 / đầu Chặng 05 (P3) |
| 186 | `af4d6abf` | b9a2e03a | An Tran | 2026-09-24 | C | 10 | 2 | 0 | TINH | LEGACY | src/app src/components src/modules tests | feat(creative-studio): các khu vực sản xuất theo phạm vi đã chọn (P4) |
| 187 | `a82cf6ba` | af4d6abf | An Tran | 2026-09-24 | C | 2 | 0 | 0 | TINH | LEGACY | docs src/modules | fix(contracts): scene_index Chặng 06c hiện đúng 1..5 trong JSON Schema |
| 188 | `ef9a99ca` | a82cf6ba | An Tran | 2026-09-24 | C | 16 | 1 | 2 | TINH | LEGACY | docs prisma src/app src/modules tests | feat(campaign-package): gói giữ nhiều video + QA "Đủ phạm vi đã chọn" (P5 — máy chủ) |
| 189 | `9c5a1b60` | ef9a99ca | An Tran | 2026-09-24 | C | 2 | 0 | 0 | TINH | LEGACY | src/components | feat(chang-07): gói hiện và giữ video theo từng khung (P5 — giao diện) |
| 190 | `090c312a` | 9c5a1b60 | An Tran | 2026-09-24 | C | 8 | 0 | 0 | TINH | LEGACY | docs | docs: phạm vi sản xuất P3–P5 (Arch 4.4, IO Spec 4.4, Journey 3.3, 06/07, nợ #129) |
| 191 | `b82eb13e` | 090c312a | An Tran | 2026-09-24 | C | 3 | 2 | 0 | TINH | LEGACY | scripts tests | test(tenant): báo rõ khi database test thiếu CỘT so với lược đồ |
| 192 | `72c910e3` | b82eb13e | An Tran | 2026-09-24 | C | 2 | 0 | 0 | TINH | LEGACY | .gitignore scripts | chore(media): bộ đo chất lượng ảnh biến thể Khu vực D (Đợt 0) |
| 193 | `4097489b` | 72c910e3 | An Tran | 2026-09-24 | C | 19 | 4 | 0 | TINH | LEGACY | docs src/app src/modules tests workers | feat(media): ảnh biến thể dựng đúng khung đích + bố cục + ánh sáng (Đợt 1 nâng cấp chất lượng) |
| 194 | `bb6e761b` | 4097489b | An Tran | 2026-09-25 | C | 22 | 3 | 0 | TINH | LEGACY | docs scripts src/app src/components src/modules tests | feat(media): nhiều phương án cho một cảnh + phong cách hậu cảnh (Đợt 2 nâng cấp chất lượng ảnh) |
| 195 | `e96d8b8a` | bb6e761b | An Tran | 2026-09-25 | C | 27 | 2 | 0 | TINH | LEGACY | .env.example docs scripts src/app src/components src/modules | feat(media): ảnh biến thể chất lượng cao — Ultra, xuất 2×, hoà hợp, làm mờ tay, chấm kỹ thuật, tách nền có giấy phép (Đợt 3) |
| 196 | `7fd415be` | e96d8b8a | An Tran | 2026-09-25 | C | 32 | 4 | 0 | TINH | LEGACY | .env.example AGENTS.md docs scripts src/app src/components | feat(media): ảnh biến thể Khu vực D chạy theo luồng nhà cung cấp trọn gói + cổng đo hình dáng/cấu trúc/màu |
| 197 | `a52cabe9` | 7fd415be | An Tran | 2026-09-25 | C | 127 | 17 | 2 | TINH | LEGACY | .env.example docs package.json prisma scripts src/app | feat(coordinator): T02 Product Card gửi đối tác shop + Hoàn thiện 7 modal P1-P7 |
| 198 | `11e42633` | a52cabe9 | Claude | 2026-09-25 | C | 81 | 6 | 2 | TINH | LEGACY | AGENTS.md docs prisma scripts src/app src/components | fix(coordinator): Chức năng 12 từ bản mẫu lên production |
| 199 | `a4179e9a` | 11e42633 | An Tran | 2026-09-25 | C | 42 | 15 | 0 | TINH | LEGACY | docs src/app src/components src/modules tests | feat(content-engine): P27 Content Engine — chuỗi agent, API, nối Chặng 05/noi-dung |
| 200 | `5e49efa2` | a4179e9a | Claude | 2026-09-25 | C | 23 | 6 | 0 | TINH | LEGACY | AGENTS.md docs src/app src/components src/core src/modules | fix(content-engine): sửa 5 điểm chặn production của P27 |

## Batch 05 (#201–#250)

| # | Hash | Parents | Author | Date | Kind | Files | Tests | Prisma | Branches | Lineage | Areas | Subject |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 201 | `edf16e9e` | 5e49efa2 | Claude | 2026-09-25 | C | 1 | 0 | 0 | TINH | LEGACY | .github | ci: thêm SSO_SESSION_SECRET và OPENAI_API_KEY giả cho job web |
| 202 | `a1de3be1` | edf16e9e | Claude | 2026-09-25 | C | 1 | 1 | 0 | TINH | LEGACY | workers | test(media): cố định mặt nạ chủ thể trong ca paste-back của expander |
| 203 | `0a26672a` | a1de3be1 | Claude | 2026-09-25 | C | 87 | 11 | 0 | TINH | LEGACY | docs scripts scripts_check_migrations.js src/app src/components src/core | chore(lint): 265 lỗi lint → 0 trước khi gộp chuỗi Creative Studio vào main |
| 204 | `07738c75` | 0a26672a | Claude | 2026-09-25 | C | 7 | 1 | 0 | TINH | LEGACY | .github docs src/components tests | fix(creative-studio): CI chạy được cổng test:tenant, khai P27 vào đặc tả, poll job A/B có hạn |
| 205 | `e8fe2362` | 07738c75 | Claude | 2026-09-25 | C | 19 | 3 | 0 | TINH | LEGACY | docs src/app src/components src/modules tests workers | fix(media): nhánh cloud Khu vực A vào hàng đợi, trừ credit thật + adapter Photoroom/fal ở worker |
| 206 | `df04ed3e` | e8fe2362 | Claude | 2026-09-25 | C | 42 | 10 | 0 | TINH | LEGACY | AGENTS.md docs playwright.config.ts src/app src/components src/modules | feat(creative-studio): bảng giá v1 thu đúng tiền, vá Chặng 02, e2e hành trình đầu tiên |
| 207 | `78b9d032` | df04ed3e | Claude | 2026-09-25 | C | 14 | 1 | 0 | TINH | LEGACY | docs src/modules tests workers | chore(media): trả nợ #152 — gỡ adapter ảnh phía TS thành mã chết |
| 208 | `353f27f2` | df04ed3e | Claude | 2026-09-25 | C | 40 | 6 | 0 | TINH | LEGACY | .env.example AGENTS.md docs package-lock.json package.json src/app | feat(creative-studio): nhà cung cấp trước — nền chọn nhà cung cấp + nội dung Claude/Gemini/OpenAI |
| 209 | `8e0177a5` | 353f27f2 | Claude | 2026-09-25 | C | 29 | 2 | 0 | TINH | LEGACY | docs src/app src/components src/modules tests workers | feat(creative-studio): ảnh — nhà cung cấp trước ở Khu vực A và D, thêm Google Gemini Image |
| 210 | `d48b1bd4` | 8e0177a5 | Claude | 2026-09-25 | C | 26 | 4 | 0 | TINH | LEGACY | docs src/app src/components src/modules tests workers | feat(video): nhà cung cấp trước cho Khu vực E — clip từng cảnh Veo/Kling/Runway/Luma, lùi Ken Burns |
| 211 | `a924a108` | d48b1bd4 | Claude | 2026-09-25 | C | 20 | 3 | 0 | TINH | LEGACY | docs src/app src/components src/modules tests workers | feat(audio): nhà cung cấp trước cho Khu vực C — nhạc nền AI ElevenLabs Music, giọng theo thứ tự tiệm |
| 212 | `4e539845` | a924a108 | Claude | 2026-09-25 | C | 8 | 0 | 0 | TINH | LEGACY | docs src/app src/components | feat(creative-studio): Cài đặt thứ tự nhà cung cấp của tiệm + chọn bên viết nội dung từng lượt |
| 213 | `835b6ed3` | 4e539845 | An Tran | 2026-09-26 | C | 239 | 29 | 4 | TINH | LEGACY | .github AGENTS.md docs package.json prisma scripts | feat(coordinator,field-platform,role-ux): ĐP-3/ĐP-4a Điều phối + nền quản trị trường + Role UX |
| 214 | `6bb81691` | 835b6ed3 | An Tran | 2026-09-26 | C | 3 | 0 | 0 | TINH | LEGACY | docs src/modules | fix(coordinator): chỉ kiểm danh mục priority khi client tự chọn, không kiểm khi máy tự gợi ý |
| 215 | `f50a7aaa` | 6bb81691 | An Tran | 2026-09-26 | C | 1 | 0 | 0 | TINH | LEGACY | docs | docs(coordinator): ghi rõ nguyên nhân thật của lỗi 500 sau khi sửa bug priority |
| 216 | `2be4a4ce` | f50a7aaa | An Tran | 2026-09-27 | C | 25 | 3 | 2 | TINH | LEGACY | docs prisma src/app src/components src/modules tests | feat(coordinator): hoàn thiện ĐP-4a.5–4a.10, đồng bộ schema, sửa tsc & tenant test |
| 217 | `f1000da0` | 2be4a4ce | An Tran | 2026-09-27 | C | 12 | 0 | 0 | TINH | LEGACY | docs scripts src/app src/components | feat(ui-ux): hoàn tất chuẩn hoá màn T5.A5 Duyệt và T5.A6 Quản lý Job theo Screen Contract |
| 218 | `91d53d3a` | f1000da0 | An Tran | 2026-09-27 | C | 10 | 0 | 0 | TINH | LEGACY | docs scripts src/app src/components | feat(ui-ux): hoàn tất chuẩn hoá màn T5.B5 Catalog và T5.B6 Tính giá theo Screen Contract |
| 219 | `f0e6a181` | 91d53d3a | An Tran | 2026-09-27 | C | 15 | 0 | 0 | TINH | LEGACY | docs scripts src/app src/components | feat(ui-ux): hoan thien 100% Dot B ke hoach nang cap UI/UX (T5.B1 - T5.B8) |
| 220 | `62ad7a0e` | f0e6a181 | An Tran | 2026-09-27 | C | 19 | 0 | 0 | TINH | LEGACY | docs scripts src/app src/components | feat(ux): hoàn thành 100% Đợt A và Đợt C nâng cấp UI/UX theo chuẩn 03a/03b |
| 221 | `345b64ad` | 62ad7a0e | An Tran | 2026-09-27 | C | 21 | 1 | 0 | TINH | LEGACY | docs scripts src/app src/components | feat(ui): hoan tat dot D nang cap UI/UX (T5.D1 - T5.D8) |
| 222 | `30efe212` | 345b64ad | An Tran | 2026-09-27 | C | 4 | 1 | 0 | TINH | LEGACY | docs src/app src/components | feat(ui): hoan tat T5.D9 tao trang Cai dat tiem (/cai-dat) tong hop va lien ket sau |
| 223 | `68d8c464` | 30efe212 | An Tran | 2026-09-27 | C | 8 | 0 | 0 | TINH | LEGACY | docs scripts src/app | feat(ui): hoan tat T5.D10 console van hanh nen tang (/van-hanh) |
| 224 | `ada3b1b6` | 68d8c464 | An Tran | 2026-09-27 | C | 16 | 4 | 0 | TINH | LEGACY | docs src/app src/components src/core src/modules tests | feat(ui): mo khoa vai product_manager (T6.1), sua suggestedFlower null (T6.12b), bo sung vai florist (T6.13) |
| 225 | `01e2519b` | ada3b1b6 | An Tran | 2026-09-27 | C | 10 | 2 | 0 | TINH | LEGACY | docs src/app src/components src/core src/modules tests | feat(rbac): thêm vai Marketing & CRM, trang chủ Creative Workspace |
| 226 | `cf094e22` | 01e2519b | An Tran | 2026-09-27 | C | 14 | 2 | 0 | TINH | LEGACY | docs src/app src/components src/core src/modules tests | feat(crm): mở khoá vai CRM (T6.3) — domain rules, RBAC, Role UX, workspace UI |
| 227 | `6ced0333` | cf094e22 | An Tran | 2026-09-28 | C | 9 | 0 | 0 | TINH | LEGACY | .agents CLAUDE.md | chore(agents): establish 3-tier production-ready AI agent rules and on-demand skills |
| 228 | `a56c4cd2` | 6ced0333 | An Tran | 2026-09-28 | C | 28 | 0 | 0 | TINH | LEGACY | cron-job-entry.txt scripts src/app src/components | refactor(ui): update danger and semantic color tokens across components and pages |
| 229 | `102f2e73` | a56c4cd2 | An Tran | 2026-09-29 | C | 226 | 12 | 0 | TINH | LEGACY | .agents .github AGENTS.md docs package-lock.json package.json | ui(all): hoan tat nang cap UI/UX, UX-Lint 0 vi pham, mo khoa vai cskh va bo test E2E UX |
| 230 | `3be0bffc` | 102f2e73 | An Tran | 2026-09-30 | C | 68 | 10 | 1 | TINH | LEGACY | AGENTS.md docs prisma src/app src/components src/core | feat(ux): Journey-First UX Architecture — sidebar Báo cáo & sắp xếp Store ChoiceGrid |
| 231 | `10fbf4d2` | 3be0bffc | An Tran | 2026-09-30 | C | 7 | 0 | 0 | TINH | LEGACY | "docs docs | docs: reorganize architecture upgrade tasks into docs/kien-truc/Nâng cấp tasks |
| 232 | `14156615` | 10fbf4d2 | An Tran | 2026-09-30 | C | 2 | 0 | 0 | TINH | LEGACY | src/components | feat(sales): integrate 1-click Order Creation from Sales Pitch (BH-15) with atomic BOM preservation |
| 233 | `bb7fa7bb` | 14156615 | An Tran | 2026-09-30 | C | 1 | 0 | 0 | TINH | LEGACY | src/app | feat(platform): upgrade system-wide AI quota monitor with usage KPIs and threshold alerts (AI-05, TN-08) |
| 234 | `1e2ecb6f` | bb7fa7bb | An Tran | 2026-09-30 | C | 4 | 1 | 0 | TINH | LEGACY | src/components src/modules | feat(sales): add 14 practical florist sales scripts library modal (KB-01..14) with live interpolation |
| 235 | `daefd898` | 1e2ecb6f | An Tran | 2026-09-30 | C | 6 | 1 | 0 | TINH | LEGACY | src/app src/components | feat(coordinator): implement partner network management modal and live sync (DT-01..06) |
| 236 | `449cc5f2` | daefd898 | An Tran | 2026-09-30 | C | 26 | 6 | 0 | TINH | LEGACY | "docs src/app src/components src/modules | feat(capability-map): implement Package B & Package C core capabilities |
| 237 | `3e6eb47f` | 449cc5f2 | An Tran | 2026-09-30 | C | 12 | 3 | 0 | TINH | LEGACY | "docs src/app src/components src/modules | feat(capability-map): complete Package C with budget matcher, VietQR billing, and size variants |
| 238 | `9fef5092` | 3e6eb47f | An Tran | 2026-09-30 | C | 10 | 2 | 0 | TINH | LEGACY | "docs src/app src/components src/modules | feat(capabilities): hoàn tất 100% Gói D (DH-03, DH-04, MK-10) đạt 201/201 tính năng Capability Map |
| 239 | `87fccc3d` | 9fef5092 | An Tran | 2026-10-02 | C | 109 | 7 | 5 | TINH | LEGACY | "docs .agents AGENTS.md docs package.json prisma | feat(journey-ux): hoan thien landing catalog journey, dev mock data moc lan va he thong dang xuat |
| 240 | `d8403446` | 87fccc3d | An Tran | 2026-10-04 | C | 91 | 5 | 1 | TINH | LEGACY | "docs .env.example docs package-lock.json package.json prisma | feat: Thẻ Chào Mẫu Hoa (M14) — Swipe Brochure, Catalog Manager, Live Preview Modal |
| 241 | `d4a72736` | 0a26672a, 78b9d032 | antranhub22 | 2026-10-04 | MERGE | 70 | 15 | 0 | TINH | LEGACY | .github AGENTS.md docs playwright.config.ts src/app src/components | fix: Creative Studio production — bảng giá v1, media adapter cloud, CI tenant test |
| 242 | `bec778db` | d4a72736, 3be0bffc | antranhub22 | 2026-10-04 | MERGE | 607 | 66 | 5 | TINH | LEGACY | .agents .env.example .github AGENTS.md CLAUDE.md cron-job-entry.txt | feat: Journey-First UX Architecture, CRM, UI/UX upgrade toàn hệ thống |
| 243 | `2c62295f` | bec778db, d8403446 | antranhub22 | 2026-10-04 | MERGE | 251 | 25 | 5 | TINH | LEGACY | "docs .agents .env.example AGENTS.md docs package-lock.json | feat: M14 Thẻ Chào Mẫu Hoa + Capability Map 201/201 tính năng hoàn chỉnh |
| 244 | `bc496ced` | 2c62295f | An Tran | 2026-10-04 | C | 3 | 0 | 1 | TINH | LEGACY | prisma render.yaml src/app | chore(deploy): add Render IaC config, health endpoint, Prisma Linux binary targets |
| 245 | `bf617a40` | bc496ced | An Tran | 2026-10-04 | C | 1 | 0 | 0 | TINH | LEGACY | render.yaml | fix(deploy): simplify render.yaml — remove cron job service, keep 4 services + DB |
| 246 | `a4b6d5cc` | bf617a40 | An Tran | 2026-10-04 | C | 1 | 0 | 0 | TINH | LEGACY | render.yaml | fix(deploy): update Render PostgreSQL plan from deprecated 'starter' to 'basic-256mb' |
| 247 | `d1a34a9b` | a4b6d5cc | An Tran | 2026-10-04 | C | 1 | 0 | 0 | TINH | LEGACY | render.yaml | fix(deploy): switch prisma migrate deploy → db push (migration history drift nợ #97/#104) |
| 248 | `29f59d22` | d1a34a9b | An Tran | 2026-10-04 | C | 1 | 0 | 0 | TINH | LEGACY | render.yaml | fix(deploy): npm ci --include=dev to install @tailwindcss/postcss during Render build |
| 249 | `8fbb354a` | 29f59d22 | An Tran | 2026-10-04 | C | 1 | 0 | 0 | TINH | LEGACY | render.yaml | fix(deploy): remove empty-string URL env vars that fail Zod .url().optional() validation |
| 250 | `c5fc210d` | 8fbb354a | An Tran | 2026-10-04 | C | 1 | 0 | 0 | TINH | LEGACY | src/lib | fix(deploy): allow empty string for optional URL env vars (SOCIALFLOW_URL, LOCALBUDD_URL) |

## Batch 06 (#251–#300)

| # | Hash | Parents | Author | Date | Kind | Files | Tests | Prisma | Branches | Lineage | Areas | Subject |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 251 | `0c56733e` | c5fc210d | An Tran | 2026-10-04 | C | 2 | 0 | 0 | TINH | LEGACY | next.config.ts render.yaml | fix(deploy): limit Next.js build workers and set NODE_OPTIONS memory limit |
| 252 | `0472b270` | 0c56733e | An Tran | 2026-10-04 | C | 2 | 0 | 1 | TINH | LEGACY | prisma render.yaml | feat(deploy): run db:seed on Render build to initialize roles, AI registry and dev shop Moc Lan |
| 253 | `be20cc99` | 0472b270 | An Tran | 2026-10-04 | C | 11 | 1 | 0 | TINH | LEGACY | src/app src/components src/modules | feat(the-chao): add order tracking pipeline tab with step-level internal notes |
| 254 | `d0f3bf0b` | be20cc99 | An Tran | 2026-10-04 | C | 11 | 0 | 0 | TINH | LEGACY | scripts src/app src/components src/modules | feat(storage): trash bin 30 days - delete with confirm, executive-only, tab 4 in kho du lieu |
| 255 | `00be2599` | d0f3bf0b | An Tran | 2026-10-04 | C | 3 | 0 | 0 | TINH | LEGACY | src/app src/modules | fix(storage): fix Failed to fetch CORS and 404 log spam on Render |
| 256 | `b50cd6c4` | 0472b270 | An Tran | 2026-10-04 | C | 3 | 0 | 0 | TINH | LEGACY | src/app src/modules | fix(storage): fix Failed to fetch CORS and 404 log spam on Render |
| 257 | `9dd715f3` | b50cd6c4, 00be2599 | An Tran | 2026-10-04 | MERGE | 22 | 1 | 0 | TINH | LEGACY | scripts src/app src/components src/modules | feat(storage): merge storage trash bin 30 days and the-chao tracking pipeline into main |
| 258 | `ee51c491` | 9dd715f3 | An Tran | 2026-10-04 | C | 22 | 1 | 0 | TINH | LEGACY | src/app src/components src/modules | feat(the-chao): add 8-template customer experience engine with enterprise luxury deck |
| 259 | `9041ac08` | 9dd715f3 | Claude | 2026-10-05 | C | 1 | 0 | 0 | TINH | LEGACY | CLAUDE.md | docs(agents): revise CLAUDE.md into enterprise-grade agent operating guide |
| 260 | `75ca83ad` | 9041ac08 | Claude | 2026-10-05 | C | 1 | 0 | 0 | TINH | LEGACY | .agents | docs(agents): fix broken skill links and Known Failures reference in AGENT_RULES |
| 261 | `193f5610` | 75ca83ad | Claude | 2026-10-05 | C | 6 | 0 | 0 | TINH | LEGACY | .agents .claude .gitignore AGENTS.md CLAUDE.md docs | docs(agents): cut per-session agent context cost |
| 262 | `aeb90c24` | 193f5610 | Claude | 2026-10-05 | C | 3 | 0 | 0 | TINH | LEGACY | AGENTS.md CLAUDE.md docs | docs(agents): replace "read whole file" instructions with targeted reads |
| 263 | `0cd6ebdc` | aeb90c24 | Claude | 2026-10-05 | C | 7 | 2 | 0 | TINH | LEGACY | docs scripts src/modules tests | fix(greeting-card): block cross-tenant products in catalogs; sync specs so check:docs passes |
| 264 | `1161a0be` | 0cd6ebdc | Claude | 2026-10-05 | C | 6 | 2 | 0 | TINH | LEGACY | docs scripts src/modules tests | test(architecture): fail on new API routes without a capability guard |
| 265 | `574985eb` | 1161a0be | Claude | 2026-10-05 | C | 3 | 0 | 0 | TINH | LEGACY | .claude .gitignore | chore(agents): enforce two CLAUDE.md safety traps with a Claude Code hook |
| 266 | `3f73087e` | 574985eb | Claude | 2026-10-05 | C | 11 | 0 | 0 | TINH | LEGACY | .agents CLAUDE.md docs scripts | docs(agents): align skills with real code; no-new-failures rule; check agent docs |
| 267 | `09e82326` | 3f73087e | Claude | 2026-10-05 | C | 10 | 4 | 0 | TINH | LEGACY | .github CLAUDE.md docs package.json scripts src/modules | ci: restore tenant/platform gates — ESLint ratchet, check:docs, fix stale tests |
| 268 | `3e66e4df` | 09e82326 | Claude | 2026-10-05 | C | 1 | 0 | 0 | TINH | LEGACY | .github | ci(e2e-ux): upload test-results when the E2E job fails |
| 269 | `7b3be3e8` | 3e66e4df | antranhub22 | 2026-10-05 | C | 4 | 4 | 0 | TINH | LEGACY | tests | Add files via upload |
| 270 | `00394cc3` | 9dd715f3 | Claude | 2026-10-05 | C | 56 | 5 | 0 | TINH | LEGACY | src/app src/components src/core src/modules tests | fix(greeting-card): harden Thẻ Chào mẫu hoa for commercial use |
| 271 | `efd9f4db` | 7b3be3e8 | Claude | 2026-10-05 | C | 2 | 0 | 0 | TINH | LEGACY | CLAUDE.md docs | docs: Linux visual baselines are in — update CLAUDE.md and debt #172 |
| 272 | `de546aa7` | 00394cc3 | Claude | 2026-10-05 | C | 14 | 1 | 0 | TINH | LEGACY | .env.example package-lock.json package.json render.yaml src/app src/core | feat(rate-limit): share public endpoint limits across instances via Redis |
| 273 | `9eb432f4` | de546aa7 | Claude | 2026-10-05 | C | 25 | 4 | 1 | TINH | LEGACY | prisma src/app src/components src/modules tests | feat(greeting-card): link expiry/revoke, per-sale funnel, paged send-links |
| 274 | `28b2f716` | 9dd715f3, efd9f4db | antranhub22 | 2026-10-05 | MERGE | 35 | 11 | 0 | TINH | LEGACY | .agents .claude .github .gitignore AGENTS.md CLAUDE.md | Merge PR #4: agent guidance enforced by tests/hooks; fix greeting-card tenant leaks; restore CI gates |
| 275 | `591bcaa6` | 9eb432f4 | Claude | 2026-10-05 | C | 27 | 2 | 0 | TINH | LEGACY | src/app src/components src/modules tests | feat(greeting-card): sizes, quantity, delivery zones, vouchers, live quote |
| 276 | `e0af0a8b` | 591bcaa6 | Claude | 2026-10-05 | C | 27 | 2 | 0 | TINH | LEGACY | src/app src/components src/modules tests | feat(greeting-card): deposit policy, partial payments, cancel and refund |
| 277 | `eb3b8f19` | e0af0a8b | Claude | 2026-10-05 | C | 15 | 2 | 0 | TINH | LEGACY | src/app src/components src/modules tests | feat(greeting-card): automatic bank reconciliation via SePay webhook |
| 278 | `27dd3630` | eb3b8f19 | Claude | 2026-10-05 | C | 22 | 3 | 0 | TINH | LEGACY | .env.example src/app src/components src/core src/lib src/modules | feat(greeting-card): customer notifications via Zalo ZNS or eSMS |
| 279 | `8d2056fa` | 28b2f716 | Claude | 2026-10-05 | C | 11 | 1 | 0 | TINH | LEGACY | src/app src/components tests | feat(greeting-card): redesign Thẻ chào mẫu hoa page for production use |
| 280 | `0e8c827f` | 27dd3630 | Claude | 2026-10-05 | C | 11 | 0 | 0 | TINH | LEGACY | src/app src/components src/modules | refactor(greeting-card): SWR data fetching and cursor pagination everywhere |
| 281 | `877c3d36` | 8d2056fa | Claude | 2026-10-05 | C | 4 | 0 | 0 | TINH | LEGACY | src/components | fix(greeting-card): polish wizard layout after browser review |
| 282 | `6ccc7389` | 0e8c827f | Claude | 2026-10-05 | C | 19 | 1 | 0 | TINH | LEGACY | docs src/app src/components src/modules tests | refactor(greeting-card): split journey wizard, document APIs/tables, clear lint debt |
| 283 | `ec2e9900` | 6ccc7389 | Claude | 2026-10-05 | C | 14 | 0 | 0 | TINH | LEGACY | src/components | feat(greeting-card): next/image with fallback for flower photos |
| 284 | `c30963a2` | 877c3d36, ee51c491 | Claude | 2026-10-05 | MERGE | 42 | 2 | 0 | TINH | LEGACY | scripts src/app src/components src/modules vitest.config.ts | merge: bring in greeting template engine (feat/the-chao-templates-base + -wip) |
| 285 | `77d9f4e6` | c30963a2 | Claude | 2026-10-05 | C | 1 | 0 | 0 | TINH | LEGACY | "docs | merge: bring in greeting template engine (feat/the-chao-templates-base + -wip) |
| 286 | `9bc19e92` | ec2e9900 | Claude | 2026-10-05 | C | 3 | 0 | 0 | TINH | LEGACY | scripts src/components | fix(greeting-card): accessible coordinator action dialog |
| 287 | `67f4efe1` | 9bc19e92 | Claude | 2026-10-05 | C | 2 | 0 | 0 | TINH | LEGACY | src/components | fix(greeting-card): Vietnamese form validation and visible row actions |
| 288 | `c5cf2057` | 77d9f4e6 | Claude | 2026-10-05 | C | 16 | 2 | 0 | TINH | LEGACY | src/components src/modules tests | feat(greeting-card): wire template chooser into redesigned wizard |
| 289 | `e5ca5a34` | 28b2f716, c5cf2057 | antranhub22 | 2026-10-05 | MERGE | 55 | 3 | 0 | TINH | LEGACY | "docs scripts src/app src/components src/modules tests | Merge pull request #5 from antranhub22/claude/fervent-goodall-gufgy2 |
| 290 | `48be556a` | e5ca5a34 | Claude | 2026-10-05 | C | 29 | 2 | 0 | TINH | LEGACY | src/components tests | feat(greeting-card): Tinder-grade swipe deck and redesigned auxiliary templates |
| 291 | `54870774` | 48be556a | Claude | 2026-10-05 | C | 26 | 2 | 0 | TINH | LEGACY | src/app src/components src/modules tests | feat(greeting-card): finish template overhaul — live previews, seamless photos, server-side prices |
| 292 | `d1c3ba92` | 54870774 | Claude | 2026-10-05 | C | 5 | 1 | 0 | TINH | LEGACY | src/components src/modules tests | fix(greeting-card): show "Liên hệ" for products without a price |
| 293 | `12ea6e12` | d1c3ba92 | Claude | 2026-10-05 | C | 2 | 0 | 0 | TINH | LEGACY | src/components | fix(greeting-card): move quote-pending payment state into its own component |
| 294 | `46d267ba` | e5ca5a34, 12ea6e12 | antranhub22 | 2026-10-05 | MERGE | 49 | 3 | 0 | TINH | LEGACY | src/app src/components src/modules tests | Merge pull request #6 from antranhub22/claude/fervent-goodall-gufgy2 |
| 295 | `89e433c6` | 46d267ba | Claude | 2026-10-05 | C | 11 | 1 | 0 | TINH | LEGACY | src/components tests | refactor(greeting-card): single source for product info across all templates |
| 296 | `75d846a1` | 67f4efe1, e5ca5a34 | Claude | 2026-10-05 | MERGE | 96 | 14 | 0 | TINH | LEGACY | "docs .agents .claude .github .gitignore AGENTS.md | Merge origin/main into claude/debug-the-chao-mau-hoa-fgm5uq |
| 297 | `0c394afc` | 75d846a1, 46d267ba | Claude | 2026-10-05 | MERGE | 44 | 3 | 0 | TINH | LEGACY | src/components src/modules tests | Merge origin/main (PR #6 template overhaul) into claude/debug-the-chao-mau-hoa-fgm5uq |
| 298 | `6ce81da8` | 89e433c6 | Claude | 2026-10-05 | C | 27 | 4 | 0 | TINH | LEGACY | docs src/app src/components src/modules tests | feat(greeting-card): per-store, per-template on/off for product fields from Master Index |
| 299 | `327ee275` | 46d267ba, 6ce81da8 | antranhub22 | 2026-10-05 | MERGE | 34 | 4 | 0 | TINH | LEGACY | docs src/app src/components src/modules tests | Merge pull request #7 from antranhub22/claude/fervent-goodall-gufgy2 |
| 300 | `1e7594c4` | 0c394afc | Claude | 2026-10-05 | C | 28 | 4 | 0 | TINH | LEGACY | docs src/app src/components src/modules tests | feat(greeting-card): allow ordering unpriced designs, shop quotes later |

## Batch 07 (#301–#350)

| # | Hash | Parents | Author | Date | Kind | Files | Tests | Prisma | Branches | Lineage | Areas | Subject |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 301 | `0b1d09c2` | 1e7594c4, 327ee275 | Claude | 2026-10-05 | MERGE | 36 | 4 | 0 | TINH | LEGACY | docs src/app src/components src/modules tests | Merge origin/main (PR #7 Master Index display fields) into claude/debug-the-chao-mau-hoa-fgm5uq |
| 302 | `e8fcfc8a` | 327ee275, 0b1d09c2 | antranhub22 | 2026-10-06 | MERGE | 160 | 20 | 1 | TINH | LEGACY | .env.example docs package-lock.json package.json prisma render.yaml | Merge pull request #8 from antranhub22/claude/debug-the-chao-mau-hoa-fgm5uq |
| 303 | `08153877` | e8fcfc8a | Claude | 2026-10-05 | C | 1 | 0 | 0 | TINH | LEGACY | src/components | fix(greeting-card): accessible, mobile-friendly customer order form |
| 304 | `4c6785f2` | e8fcfc8a, 08153877 | antranhub22 | 2026-10-06 | MERGE | 1 | 0 | 0 | TINH | LEGACY | src/components | Merge pull request #9 from antranhub22/claude/pensive-gauss-46uyz4 |
| 305 | `6b1513fb` | 4c6785f2 | Claude | 2026-10-05 | C | 1 | 0 | 0 | TINH | LEGACY | src/app | feat(app-shell): root global-error boundary in Vietnamese |
| 306 | `c3cf6227` | 4c6785f2 | Claude | 2026-10-05 | C | 4 | 1 | 0 | TINH | LEGACY | src/components | fix(greeting-card): show full product photo in all greeting templates |
| 307 | `c0bd8c42` | 4c6785f2, 6b1513fb | antranhub22 | 2026-10-06 | MERGE | 1 | 0 | 0 | TINH | LEGACY | src/app | Merge pull request #10 from antranhub22/claude/pensive-gauss-46uyz4 |
| 308 | `fe465871` | c0bd8c42 | Claude | 2026-10-05 | C | 5 | 1 | 0 | TINH | LEGACY | next.config.ts src/app src/lib src/modules tests | feat(web): absolute link-preview images and baseline security headers |
| 309 | `db18ad29` | c0bd8c42, fe465871 | antranhub22 | 2026-10-06 | MERGE | 5 | 1 | 0 | TINH | LEGACY | next.config.ts src/app src/lib src/modules tests | Merge pull request #11 from antranhub22/claude/pensive-gauss-46uyz4 |
| 310 | `085be970` | db18ad29, c3cf6227 | antranhub22 | 2026-10-06 | MERGE | 4 | 1 | 0 | TINH | LEGACY | src/components | Merge pull request #12 from antranhub22/claude/charming-ramanujan-rmhiaq |
| 311 | `0aade000` | 085be970 | Claude | 2026-10-05 | C | 10 | 1 | 0 | TINH | LEGACY | .env.example docs next.config.ts src/app src/components src/lib | feat(web): report-only CSP and hidden-by-default privacy notice (D13) |
| 312 | `810f1180` | 0aade000 | Claude | 2026-10-05 | C | 2 | 0 | 0 | TINH | LEGACY | src/components | feat(greeting-card): save-QR link and keep order URL after public checkout |
| 313 | `36fd223a` | 810f1180 | Claude | 2026-10-05 | C | 1 | 0 | 0 | TINH | LEGACY | docs | docs(debt): defer prefill and phase 2-3 customer page features (#176, #177) |
| 314 | `0a3a4829` | 085be970, 36fd223a | antranhub22 | 2026-10-06 | MERGE | 12 | 1 | 0 | TINH | LEGACY | .env.example docs next.config.ts src/app src/components src/lib | Merge pull request #14 from antranhub22/claude/pensive-gauss-46uyz4 |
| 315 | `3806758f` | 0a3a4829 | Claude | 2026-10-05 | C | 31 | 2 | 0 | TINH | LEGACY | docs src/app src/components src/modules tests | feat(greeting-card): shop contact bar, unavailable-link page, order review, delivery cut-off, hold countdown, order-received message |
| 316 | `c6a925dd` | 0a3a4829, 3806758f | antranhub22 | 2026-10-06 | MERGE | 31 | 2 | 0 | TINH | LEGACY | docs src/app src/components src/modules tests | Merge pull request #15 from antranhub22/claude/pensive-gauss-46uyz4 |
| 317 | `d5788fc5` | c6a925dd | Claude | 2026-10-05 | C | 19 | 2 | 0 | TINH | LEGACY | docs src/app src/components src/modules tests | feat(greeting-card): batch 1 — separate recipient photos, reorder on same link, coordinator progress, compact tracking with sale owner |
| 318 | `5d8f0f88` | c6a925dd, d5788fc5 | antranhub22 | 2026-10-06 | MERGE | 19 | 2 | 0 | TINH | LEGACY | docs src/app src/components src/modules tests | Merge pull request #16 from antranhub22/claude/pensive-gauss-46uyz4 |
| 319 | `cf0eb812` | 5d8f0f88 | Claude | 2026-10-05 | C | 10 | 1 | 0 | TINH | LEGACY | src/app src/components src/modules tests | feat(greeting-card): Điều hành chooses whether sales see all orders or only their own links |
| 320 | `f11ca2d0` | cf0eb812 | Claude | 2026-10-05 | C | 10 | 1 | 0 | TINH | LEGACY | src/components src/modules tests | feat(greeting-card): 5-field delivery address (house no., street, ward, optional district, province) |
| 321 | `8e1cde9d` | f11ca2d0 | Claude | 2026-10-05 | C | 10 | 2 | 0 | TINH | LEGACY | docs src/app src/components src/modules tests | feat(greeting-card): coordinator uploads 1-5 photos + 0-2 videos (≤15s) per step |
| 322 | `e11bdf77` | 8e1cde9d | Claude | 2026-10-05 | C | 5 | 0 | 0 | TINH | LEGACY | src/components | feat(greeting-card): remember order draft and swipe/liked progress per link on the customer's device (7 days) |
| 323 | `d153966f` | e11bdf77 | Claude | 2026-10-05 | C | 15 | 2 | 1 | TINH | LEGACY | docs prisma src/app src/components src/modules tests | feat(greeting-card): count collection-link visitors per share channel (?kenh=) with view → detail → form → order funnel |
| 324 | `451cb3dd` | d153966f | Claude | 2026-10-05 | C | 4 | 2 | 1 | TINH | LEGACY | docs prisma tests | test(greeting-card): channel-event table in tenant cleanup, spec 07 |
| 325 | `313aba02` | 5d8f0f88, 451cb3dd | antranhub22 | 2026-10-06 | MERGE | 46 | 4 | 1 | TINH | LEGACY | docs prisma src/app src/components src/modules tests | Merge pull request #17 from antranhub22/claude/pensive-gauss-46uyz4 |
| 326 | `1c139e24` | 313aba02 | Claude | 2026-10-06 | C | 12 | 2 | 0 | TINH | LEGACY | docs scripts src/app src/components src/modules tests | feat(greeting-card): multi-product collage as link preview image and downloadable catalog image |
| 327 | `781e8c16` | 1c139e24 | Claude | 2026-10-06 | C | 5 | 1 | 0 | TINH | LEGACY | src/components | feat(catalog): real AI photo analysis in quick product add — fills only empty flower fields, 1 credit per click; drop fake result and made-up prices |
| 328 | `de308304` | 313aba02, 781e8c16 | antranhub22 | 2026-10-06 | MERGE | 17 | 3 | 0 | TINH | LEGACY | docs scripts src/app src/components src/modules tests | Merge pull request #18 from antranhub22/claude/pensive-gauss-46uyz4 |
| 329 | `4db22f8c` | de308304 | Claude | 2026-10-06 | C | 8 | 1 | 0 | TINH | LEGACY | docs src/app src/components src/modules tests | feat(catalog): confirm before paid re-analysis of an already analysed photo; first click reuses the earlier result for free |
| 330 | `50d8dc91` | de308304, 4db22f8c | antranhub22 | 2026-10-06 | MERGE | 8 | 1 | 0 | TINH | LEGACY | docs src/app src/components src/modules tests | Merge pull request #19 from antranhub22/claude/pensive-gauss-46uyz4 |
| 331 | `0de9cf49` | 50d8dc91 | Claude | 2026-10-06 | C | 22 | 4 | 0 | TINH | LEGACY | docs src/app src/components src/modules tests | feat(greeting-card): Điều hành tab — decision inbox, per-sale visibility, step time standards, payment check with price reasons |
| 332 | `1ce79017` | 50d8dc91, 0de9cf49 | antranhub22 | 2026-10-06 | MERGE | 22 | 4 | 0 | TINH | LEGACY | docs src/app src/components src/modules tests | Merge pull request #20 from antranhub22/claude/pensive-gauss-46uyz4 |
| 333 | `bad7340d` | 1ce79017 | Claude | 2026-10-06 | C | 15 | 2 | 0 | TINH | LEGACY | docs src/components src/modules tests | feat(greeting-card): Sale tab — customer status first, stuck alerts by step time standards, new-update feed |
| 334 | `a4de75f8` | bad7340d | Claude | 2026-10-06 | C | 13 | 1 | 0 | TINH | LEGACY | docs src/components src/modules | feat(greeting-card): Theo dõi tiến độ and Điều phối tabs — stuck first, owner-labelled steps, channel per order, report with customer details |
| 335 | `2e978273` | 1ce79017, a4de75f8 | antranhub22 | 2026-10-06 | MERGE | 21 | 3 | 0 | TINH | LEGACY | docs src/components src/modules tests | Merge pull request #21 from antranhub22/claude/pensive-gauss-46uyz4 |
| 336 | `8fa6475a` | 2e978273 | Claude | 2026-10-06 | C | 34 | 4 | 1 | TINH | LEGACY | docs prisma src/app src/components src/modules tests | feat(greeting-card): Hộp việc — one inbox for to-dos, internal messages and updates; addressed messages with replies |
| 337 | `5d8e36c2` | 2e978273, 8fa6475a | antranhub22 | 2026-10-06 | MERGE | 34 | 4 | 1 | TINH | LEGACY | docs prisma src/app src/components src/modules tests | Merge pull request #22 from antranhub22/claude/pensive-gauss-46uyz4 |
| 338 | `4741fa30` | 5d8e36c2 | Claude | 2026-10-06 | C | 22 | 3 | 0 | TINH | LEGACY | docs src/app src/components src/modules tests | feat(greeting-card): discount requests — sale asks, Điều hành approves (as asked or another level) or rejects with a note, inside Hộp việc |
| 339 | `a0164882` | 5d8e36c2, 4741fa30 | antranhub22 | 2026-10-06 | MERGE | 22 | 3 | 0 | TINH | LEGACY | docs src/app src/components src/modules tests | Merge pull request #23 from antranhub22/claude/pensive-gauss-46uyz4 |
| 340 | `e9223e94` | a0164882 | Claude | 2026-10-06 | C | 31 | 4 | 1 | TINH | LEGACY | docs prisma src/app src/components src/modules tests | feat(greeting-card): every copied link carries the copier — /s/<code> share links, send time from copy, default owner for old links, Theo dõi split into waiting links and orders |
| 341 | `333c00ee` | a0164882, e9223e94 | antranhub22 | 2026-10-06 | MERGE | 31 | 4 | 1 | TINH | LEGACY | docs prisma src/app src/components src/modules tests | Merge pull request #24 from antranhub22/claude/pensive-gauss-46uyz4 |
| 342 | `34cda00d` | 333c00ee | Claude | 2026-10-06 | C | 13 | 2 | 0 | TINH | LEGACY | docs src/app src/components src/modules tests | refactor(greeting-card): remove the old per-step internal notes (superseded by addressed messages) |
| 343 | `ecb5aa3c` | 333c00ee, 34cda00d | antranhub22 | 2026-10-06 | MERGE | 13 | 2 | 0 | TINH | LEGACY | docs src/app src/components src/modules tests | Merge pull request #25 from antranhub22/claude/pensive-gauss-46uyz4 |
| 344 | `1b60b7fb` | ecb5aa3c | antranhub22 | 2026-10-06 | C | 4 | 1 | 0 | TINH | LEGACY | docs src/components src/modules tests | feat(greeting-card): in-app new-work alert in Hộp việc (tab title count, badge pulse) (#26) |
| 345 | `ae13fbea` | ecb5aa3c | Claude | 2026-10-06 | C | 1 | 0 | 0 | TINH | LEGACY | docs | docs(greeting-card): current-state baseline of Thẻ chào for gap analysis |
| 346 | `db74a28a` | ae13fbea | Claude | 2026-10-06 | C | 1 | 0 | 0 | TINH | LEGACY | docs | docs(greeting-card): correct domain file count in current-state baseline |
| 347 | `728bc2c5` | db74a28a | Claude | 2026-10-06 | C | 1 | 0 | 0 | TINH | LEGACY | docs | docs(greeting-card): final current-state audit merged with second audit |
| 348 | `58e8f02d` | 728bc2c5 | Claude | 2026-10-06 | C | 1 | 0 | 0 | TINH | LEGACY | docs | docs(greeting-card): plain-language version of the Thẻ chào audit |
| 349 | `c70f665a` | 58e8f02d | Claude | 2026-10-06 | C | 13 | 1 | 0 | TINH | LEGACY | src/app src/components src/modules tests | fix(greeting-card): apply sale scope to money actions and funnels; count real collected cash |
| 350 | `9d6bc282` | c70f665a | Claude | 2026-10-06 | C | 24 | 2 | 0 | TINH | LEGACY | src/app src/components src/modules tests | fix(greeting-card): customer page — balance QR after deposit, real opens, no duplicate/spam orders, sold-out items |

## Batch 08 (#351–#400)

| # | Hash | Parents | Author | Date | Kind | Files | Tests | Prisma | Branches | Lineage | Areas | Subject |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 351 | `fa50a97c` | 9d6bc282 | Claude | 2026-10-06 | C | 11 | 3 | 0 | TINH | LEGACY | src/app src/components src/modules tests | fix(greeting-card): public order tracking shows a reduced view unless the viewer proves they are the customer |
| 352 | `67d894a1` | fa50a97c | Claude | 2026-10-06 | C | 2 | 1 | 0 | TINH | LEGACY | src/modules tests | fix(greeting-card): tracking board and inbox read every open order/link instead of the newest 100/50 |
| 353 | `ae7f5ab0` | 67d894a1 | Claude | 2026-10-06 | C | 9 | 2 | 0 | TINH | LEGACY | src/components src/instrumentation.ts src/modules tests | feat(greeting-card): in-process background sweep for durable notifications and payment holds |
| 354 | `49adb5bc` | ae7f5ab0 | Claude | 2026-10-06 | C | 1 | 0 | 1 | TINH | LEGACY | prisma | chore(db): idempotent migration for the 11 greeting_* tables and order source columns |
| 355 | `8711450c` | 49adb5bc | Claude | 2026-10-06 | C | 7 | 3 | 0 | TINH | LEGACY | src/app src/modules tests | fix(greeting-card): one price rule everywhere, guard display-settings, audit workshop steps, hide tabs by capability |
| 356 | `fef23ac4` | 8711450c | Claude | 2026-10-06 | C | 7 | 1 | 0 | TINH | LEGACY | src/modules tests | fix(orders): brochure orders cannot be changed from the generic order book |
| 357 | `a987603a` | fef23ac4 | Claude | 2026-10-06 | C | 1 | 1 | 0 | TINH | LEGACY | tests | test(e2e): brochure flow covers browser-reported opens and reduced/verified order tracking |
| 358 | `4f1ef4b7` | a987603a | Claude | 2026-10-06 | C | 8 | 0 | 0 | TINH | LEGACY | .env.example docs src/components | docs(greeting-card): sync API/DB specs, screen contract, debt register and status log with the commercial-ready fixes |
| 359 | `f1d1eb8b` | 4f1ef4b7 | Claude | 2026-10-06 | C | 3 | 0 | 0 | TINH | LEGACY | docs | docs(greeting-card): remediation report for the 18 commercial-ready items; link it from the audits |
| 360 | `da405e72` | f1d1eb8b | Claude | 2026-10-06 | C | 1 | 0 | 0 | TINH | LEGACY | docs | docs(greeting-card): audit v2 — current state after the commercial-ready fixes |
| 361 | `73579318` | da405e72 | Claude | 2026-10-06 | C | 11 | 2 | 0 | TINH | LEGACY | src/app src/modules tests | feat(greeting-card): shared tracking query layer for multi-view progress tracking |
| 362 | `bc1745a9` | 73579318 | Claude | 2026-10-06 | C | 16 | 0 | 0 | TINH | LEGACY | docs src/components src/modules | feat(greeting-card): multi-view progress tracking UI (kanban, list, calendar, timeline, queue, dashboard) |
| 363 | `c28703e5` | da405e72, bc1745a9 | antranhub22 | 2026-10-06 | MERGE | 26 | 2 | 0 | TINH | LEGACY | docs src/app src/components src/modules tests | Merge pull request #28 from antranhub22/claude/tracking-multi-view |
| 364 | `4f7fb662` | c28703e5 | Claude | 2026-10-06 | C | 2 | 1 | 0 | TINH | LEGACY | src/app tests | fix(greeting-card): share link redirect sent customers to internal localhost behind Render proxy |
| 365 | `29af0436` | 1b60b7fb, 4f7fb662 | antranhub22 | 2026-10-06 | MERGE | 102 | 12 | 1 | TINH | LEGACY | .env.example docs prisma src/app src/components src/instrumentation.ts | Merge pull request #27 from antranhub22/claude/sweet-fermat-ovs11r |
| 366 | `f4ea57f7` | 29af0436 | Claude | 2026-10-06 | C | 5 | 1 | 0 | TINH | LEGACY | docs src/app src/components tests | fix(greeting-card): tracking list/queue/timeline crashed — API wrapped the paged list one level too deep |
| 367 | `ab74e54b` | 29af0436, f4ea57f7 | antranhub22 | 2026-10-06 | MERGE | 5 | 1 | 0 | TINH | LEGACY | docs src/app src/components tests | Merge pull request #29 from antranhub22/claude/sweet-fermat-ovs11r |
| 368 | `f7901f82` | ab74e54b | Claude | 2026-10-06 | C | 2 | 0 | 0 | TINH | LEGACY | docs | docs(greeting-card): audit v3 — multi-view tracking, two production fixes, open step inconsistencies |
| 369 | `753217a8` | ab74e54b | Claude | 2026-10-06 | C | 52 | 7 | 0 | TINH | LEGACY | docs src/app src/components src/modules tests | feat(greeting-card): customer journey on shared collection link |
| 370 | `b68f98db` | ab74e54b, 753217a8 | antranhub22 | 2026-10-07 | MERGE | 52 | 7 | 0 | TINH | LEGACY | docs src/app src/components src/modules tests | Merge pull request #30 from antranhub22/Caitien_Tinhhuong_TheChaomauhoa |
| 371 | `f019ab9f` | b68f98db | Claude | 2026-10-06 | C | 21 | 3 | 0 | TINH | LEGACY | docs src/app src/components src/modules tests | feat(greeting-card): shop-wide link lifetime setting, default 24 hours |
| 372 | `5b275608` | f019ab9f | Claude | 2026-10-06 | C | 6 | 1 | 0 | TINH | LEGACY | docs src/components tests | fix(greeting-card): return customer to payment state after reporting transfer |
| 373 | `ccbee5b7` | 5b275608 | Claude | 2026-10-06 | C | 10 | 1 | 0 | TINH | LEGACY | docs src/components src/modules | fix(greeting-card): reopen the customer page at the exact step they left |
| 374 | `86f34e97` | b68f98db, ccbee5b7 | antranhub22 | 2026-10-07 | MERGE | 33 | 5 | 0 | TINH | LEGACY | docs src/app src/components src/modules tests | Merge pull request #31 from antranhub22/Caitien_Tinhhuong_TheChaomauhoa |
| 375 | `345ba03c` | 86f34e97 | antranhub22 | 2026-10-07 | C | 18 | 1 | 0 | TINH | LEGACY | .env.example src/app src/components src/lib | feat(ui): lock unreleased features on production with "Sắp ra mắt" (#32) |
| 376 | `f0eb8dcc` | b68f98db | An Tran | 2026-10-07 | C | 6 | 1 | 0 | TINH | LEGACY | src/app src/components src/modules | feat(greeting-card): phân quyền xóa catalog theo người tạo, lưu audit_logs và quản lý 3 ngày |
| 377 | `068840f8` | f0eb8dcc | An Tran | 2026-10-07 | C | 28 | 1 | 0 | TINH | LEGACY | package-lock.json package.json scripts src/app src/components src/modules | feat(san-pham): kho dữ liệu sản phẩm — nhập hàng loạt Excel, Drive thumbnail, search filter |
| 378 | `17aeabcb` | 068840f8 | An Tran | 2026-10-07 | C | 7 | 0 | 0 | TINH | LEGACY | src/app src/components src/modules | fix(tenancy): isolate client-side storage keys by organization_id across system |
| 379 | `1f217c9b` | 17aeabcb | Claude | 2026-10-07 | C | 12 | 2 | 0 | TINH | LEGACY | docs public scripts src/app src/components src/modules | fix(nangcap-local): harden public Drive thumbnail routes and clear red gates |
| 380 | `e0f4b49f` | 345ba03c | Claude | 2026-10-07 | C | 12 | 2 | 0 | TINH | LEGACY | docs src/app src/components src/core src/modules tests | feat(auth): enforce one active session per account with takeover warning |
| 381 | `75ce7341` | 1f217c9b | Claude | 2026-10-07 | C | 40 | 5 | 0 | TINH | LEGACY | .env.example docs package-lock.json package.json scripts src/app | fix(nangcap-local): close remaining commercial-ready gaps from review |
| 382 | `6a4d6fb4` | 75ce7341 | Claude | 2026-10-07 | C | 32 | 5 | 2 | TINH | LEGACY | docs prisma src/app src/components src/modules tests | feat(greeting-card): Facebook-Story browsing and catalog-wide heart ranking |
| 383 | `5da82000` | 6a4d6fb4, 345ba03c | Claude | 2026-10-07 | MERGE | 51 | 6 | 0 | TINH | LEGACY | .env.example docs src/app src/components src/lib src/modules | Merge remote-tracking branch 'origin/main' into claude/fervent-meitner-saimyw |
| 384 | `e3c2ccc9` | 5da82000, f7901f82 | Claude | 2026-10-07 | MERGE | 2 | 0 | 0 | TINH | LEGACY | docs | Merge remote-tracking branch 'origin/claude/sweet-fermat-ovs11r' into claude/fervent-meitner-saimyw |
| 385 | `d81328ca` | e3c2ccc9, e0f4b49f | Claude | 2026-10-07 | MERGE | 12 | 2 | 0 | TINH | LEGACY | docs src/app src/components src/core src/modules tests | Merge remote-tracking branch 'origin/claude/jolly-mccarthy-wyouwu' into claude/fervent-meitner-saimyw |
| 386 | `f9cecfa6` | 345ba03c, d81328ca | antranhub22 | 2026-10-07 | MERGE | 106 | 14 | 2 | TINH | LEGACY | .env.example docs prisma public scripts src/app | Merge pull request #33 from antranhub22/claude/fervent-meitner-saimyw |
| 387 | `88c7f6ce` | 345ba03c | Claude | 2026-10-07 | C | 2 | 1 | 0 | TINH | LEGACY | src/modules | fix(products): hide trashed (ARCHIVED) products from product list by default |
| 388 | `91a4f38c` | 88c7f6ce, f9cecfa6 | Claude | 2026-10-07 | MERGE | 106 | 14 | 2 | TINH | LEGACY | .env.example docs prisma public scripts src/app | Merge origin/main |
| 389 | `77ac4e65` | 91a4f38c | Claude | 2026-10-07 | C | 1 | 0 | 0 | TINH | LEGACY | src/components | fix(greeting-card): distinguish filtered-empty catalog list from no catalogs |
| 390 | `5c15e070` | 77ac4e65 | Claude | 2026-10-07 | C | 1 | 0 | 0 | TINH | LEGACY | src/components | fix(storage): make raw-photo action and trash buttons visible in Kho du lieu |
| 391 | `2527b29a` | 5c15e070 | Claude | 2026-10-07 | C | 4 | 1 | 0 | TINH | LEGACY | package-lock.json package.json src/lib tests | fix(ui): resolve conflicting Tailwind classes in cn() with tailwind-merge |
| 392 | `9b4a54b4` | f9cecfa6, 2527b29a | antranhub22 | 2026-10-07 | MERGE | 8 | 2 | 0 | TINH | LEGACY | package-lock.json package.json src/components src/lib src/modules tests | Merge pull request #34 from antranhub22/claude/amazing-wright-b1g3bv |
| 393 | `66bc233a` | 9b4a54b4 | Claude | 2026-10-07 | C | 4 | 1 | 0 | TINH | LEGACY | src/app src/components tests | fix(storage): show the real API error when trash/restore/delete fails |
| 394 | `90dce432` | 9b4a54b4, 66bc233a | antranhub22 | 2026-10-07 | MERGE | 4 | 1 | 0 | TINH | LEGACY | src/app src/components tests | Merge pull request #35 from antranhub22/claude/amazing-wright-b1g3bv |
| 395 | `d1dbd69e` | 90dce432 | An Tran | 2026-10-08 | C | 46 | 0 | 0 | TINH | LEGACY | "docs src/app src/components src/modules | feat(the-chao): trien khai 16 nang cap UX va Workflow theo dac ta spec |
| 396 | `c89245e7` | d1dbd69e | Claude | 2026-10-08 | C | 24 | 5 | 0 | TINH | LEGACY | docs src/app src/components src/modules tests | fix(the-chao): harden cancellation/refund, photo approval and public data for production |
| 397 | `06bad648` | c89245e7 | Claude | 2026-10-08 | C | 38 | 20 | 0 | TINH | LEGACY | docs src/components src/modules tests | feat(the-chao): 2-hour delivery slots with custom time, server-enforced single promotion and agreement consent |
| 398 | `c0960d31` | d1dbd69e, 06bad648 | antranhub22 | 2026-10-08 | MERGE | 60 | 24 | 0 | TINH | LEGACY | docs src/app src/components src/modules tests | Merge pull request #36 from antranhub22/claude/fervent-edison-wfld7z |
| 399 | `c40ead38` | 90dce432 | Claude | 2026-10-08 | C | 2 | 1 | 0 | TINH | LEGACY | src/lib | feat(home): on production only the greeting-card card is active on the store home |
| 400 | `8e33bca8` | c40ead38 | Claude | 2026-10-08 | C | 2 | 1 | 0 | TINH | LEGACY | src/lib | feat(nav): lock the whole 'Vận hành' sidebar group on production |

## Batch 09 (#401–#450)

| # | Hash | Parents | Author | Date | Kind | Files | Tests | Prisma | Branches | Lineage | Areas | Subject |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 401 | `09798a67` | 90dce432, c0960d31 | antranhub22 | 2026-10-08 | MERGE | 86 | 24 | 0 | TINH | LEGACY | "docs docs src/app src/components src/modules tests | Merge pull request #37 from antranhub22/Nang_cap_The_Chao_mau_hoa |
| 402 | `ec78f645` | 09798a67, 8e33bca8 | antranhub22 | 2026-10-08 | MERGE | 2 | 1 | 0 | TINH | LEGACY | src/lib | Merge pull request #38 from antranhub22/claude/fervent-edison-wfld7z |
| 403 | `df78f4eb` | ec78f645 | Claude | 2026-10-08 | C | 1 | 0 | 0 | TINH | LEGACY | docs | docs(the-chao): readiness audit report for 20/10 holiday operations |
| 404 | `32e9dfa3` | df78f4eb | Claude | 2026-10-08 | C | 1 | 0 | 0 | TINH | LEGACY | docs | docs(the-chao): execution plan for 20/10 holiday readiness |
| 405 | `c2a41d6a` | 32e9dfa3 | Claude | 2026-10-08 | C | 43 | 6 | 0 | TINH | LEGACY | docs src/app src/components src/core src/modules tests | feat(the-chao): only Điều hành confirms money, real-money promotions, per-slot order caps |
| 406 | `8b41bb65` | c2a41d6a | Claude | 2026-10-08 | C | 44 | 14 | 0 | TINH | LEGACY | docs package.json render.yaml scripts src/app src/components | feat(the-chao): staff accounts managed by Điều hành, clean shop without demo data |
| 407 | `f8475d93` | 8b41bb65 | Claude | 2026-10-08 | C | 36 | 6 | 0 | TINH | LEGACY | docs src/app src/components src/modules tests | feat(greeting-card): holiday 20/10 batch 2 — unlock by phone, coordinator board, safe cancel/refund |
| 408 | `33e8fa22` | f8475d93 | Claude | 2026-10-08 | C | 23 | 13 | 0 | TINH | LEGACY | docs src/components src/modules tests | feat(greeting-card): customer must pick one promotion; Điều hành toggles promotions on/off |
| 409 | `aaa07455` | ec78f645 | antranhub22 | 2026-10-08 | C | 6 | 1 | 0 | TINH | LEGACY | docs src/components src/modules tests | feat(the-chao): Sale tab Kanban with one column per step 1-9 (#40) |
| 410 | `e7327d0c` | aaa07455, 33e8fa22 | antranhub22 | 2026-10-08 | MERGE | 126 | 34 | 0 | TINH | LEGACY | docs package.json render.yaml scripts src/app src/components | Merge pull request #39 from antranhub22/claude/keen-planck-f6b63v |
| 411 | `894d3b07` | ec78f645 | Claude | 2026-10-08 | C | 17 | 2 | 0 | TINH | LEGACY | docs src/components src/modules | feat(greeting-card): confirmed tracking step, separate delivery note, map link, card counter |
| 412 | `234bbb56` | 894d3b07 | Claude | 2026-10-08 | C | 22 | 2 | 0 | TINH | LEGACY | docs src/app src/components src/modules tests | feat(greeting-card): customer order change requests with staff approval |
| 413 | `e0439a03` | 234bbb56 | Claude | 2026-10-08 | C | 30 | 3 | 0 | TINH | LEGACY | docs src/app src/components src/modules tests | feat(greeting-card): failed delivery and redelivery flow |
| 414 | `267ac129` | e0439a03 | Claude | 2026-10-08 | C | 24 | 2 | 0 | TINH | LEGACY | docs src/components src/modules tests | feat(greeting-card): holiday rules (cutoff, daily cap, per-collection surcharge) |
| 415 | `00df0c6c` | 267ac129, e7327d0c | Claude | 2026-10-08 | MERGE | 134 | 35 | 0 | TINH | LEGACY | docs package.json render.yaml scripts src/app src/components | Merge origin/main into claude/the-chao-quick-wins |
| 416 | `e0a7449b` | 00df0c6c | Claude | 2026-10-08 | C | 1 | 1 | 0 | TINH | LEGACY | src/modules | test(greeting-card): zone fee delta respects free-shipping-all and free-shipping promotion |
| 417 | `28e11a8a` | e0a7449b | Claude | 2026-10-08 | C | 3 | 3 | 0 | TINH | LEGACY | tests | test(greeting-card): pick a promotion in new tenant tests (main's must-choose rule) |
| 418 | `71ecd1b4` | e7327d0c, 28e11a8a | antranhub22 | 2026-10-08 | MERGE | 63 | 8 | 0 | TINH | LEGACY | docs src/app src/components src/modules tests | Merge pull request #41 from antranhub22/claude/the-chao-quick-wins |
| 419 | `a9fc2a39` | 71ecd1b4 | Claude | 2026-10-08 | C | 5 | 1 | 0 | TINH | LEGACY | src/components tests | fix(greeting-card): show the real reason when copying a collection link fails |
| 420 | `6c74ae15` | 71ecd1b4 | Claude | 2026-10-08 | C | 2 | 1 | 0 | TINH | LEGACY | src/components tests | feat(greeting-card): show the chosen flower photo on the order review step |
| 421 | `bf5c5e12` | 71ecd1b4, a9fc2a39 | antranhub22 | 2026-10-08 | MERGE | 5 | 1 | 0 | TINH | LEGACY | src/components tests | Merge pull request #42 from antranhub22/claude/fix-copy-link-error |
| 422 | `4f5bf853` | 71ecd1b4 | Claude | 2026-10-08 | C | 3 | 1 | 0 | TINH | LEGACY | "docs src/modules tests | feat(greeting-card): refresh default store commitments and agreements |
| 423 | `424b8273` | 4f5bf853 | Claude | 2026-10-08 | C | 5 | 2 | 0 | TINH | LEGACY | src/components src/modules tests | fix(greeting-card): require bank transfer before showing order tracking |
| 424 | `61d4d401` | 424b8273 | Claude | 2026-10-08 | C | 5 | 2 | 0 | TINH | LEGACY | src/components src/modules tests | fix(greeting-card): open order tracking only after the shop confirms payment |
| 425 | `1c5ab6aa` | 61d4d401 | Claude | 2026-10-08 | C | 3 | 0 | 0 | TINH | LEGACY | src/components | fix(greeting-card): treat a confirmed deposit as the customer's payment done |
| 426 | `a16ba788` | 1c5ab6aa, bf5c5e12 | Claude | 2026-10-08 | MERGE | 5 | 1 | 0 | TINH | LEGACY | src/components tests | Merge remote-tracking branch 'origin/main' into claude/loving-newton-rl1cmt |
| 427 | `79b544dc` | bf5c5e12 | Claude | 2026-10-08 | C | 8 | 1 | 0 | TINH | LEGACY | src/app src/components src/modules tests | fix(profiles): separate Zalo QR from payment; bank account in store profile |
| 428 | `3351dc95` | bf5c5e12 | Claude | 2026-10-08 | C | 4 | 1 | 0 | TINH | LEGACY | src/components tests | fix(greeting-card): polish customer order tracking layout on mobile |
| 429 | `26d8e083` | 79b544dc | Claude | 2026-10-08 | C | 1 | 0 | 0 | TINH | LEGACY | src/components | fix(profiles): escape quotes in Zalo QR hint (lint ratchet) |
| 430 | `584147f7` | bf5c5e12, a16ba788 | antranhub22 | 2026-10-08 | MERGE | 9 | 3 | 0 | TINH | LEGACY | "docs src/components src/modules tests | Merge pull request #44 from antranhub22/claude/loving-newton-rl1cmt |
| 431 | `8bcaac1f` | 3351dc95, 584147f7 | Claude | 2026-10-08 | MERGE | 9 | 3 | 0 | TINH | LEGACY | "docs src/components src/modules tests | Merge remote-tracking branch 'origin/main' into claude/tracking-ui-polish |
| 432 | `4eb878a2` | 8bcaac1f | Claude | 2026-10-08 | C | 1 | 0 | 0 | TINH | LEGACY | src/modules | fix(greeting-card): use "cửa hàng" in default commitments and agreements |
| 433 | `bd382322` | 584147f7 | Claude | 2026-10-08 | C | 18 | 2 | 0 | TINH | LEGACY | docs src/app src/components src/modules tests | feat(greeting-card): substitute design proposal with customer consent |
| 434 | `9d16f966` | 584147f7 | Claude | 2026-10-08 | C | 40 | 4 | 0 | TINH | LEGACY | docs src/components src/modules tests | feat(greeting-card): payment policy, payment codes and deposit milestones |
| 435 | `6d64f3f7` | 584147f7, 26d8e083 | antranhub22 | 2026-10-09 | MERGE | 8 | 1 | 0 | TINH | LEGACY | src/app src/components src/modules tests | Merge pull request #45 from antranhub22/claude/zalo-qr-split |
| 436 | `d1f5d284` | 6d64f3f7, 4eb878a2 | antranhub22 | 2026-10-09 | MERGE | 5 | 1 | 0 | TINH | LEGACY | src/components src/modules tests | Merge pull request #46 from antranhub22/claude/tracking-ui-polish |
| 437 | `5f81032e` | d1f5d284, 6c74ae15 | antranhub22 | 2026-10-09 | MERGE | 2 | 1 | 0 | TINH | LEGACY | src/components tests | Merge pull request #43 from antranhub22/claude/order-review-photo |
| 438 | `45d6aa45` | 5f81032e, bd382322 | antranhub22 | 2026-10-09 | MERGE | 18 | 2 | 0 | TINH | LEGACY | docs src/app src/components src/modules tests | Merge pull request #47 from antranhub22/claude/substitute-proposal |
| 439 | `ca4fc888` | 9d16f966 | Claude | 2026-10-08 | C | 38 | 6 | 0 | TINH | LEGACY | docs src/app src/components src/modules tests | feat(greeting-card): payment timeout, dispatch rule and deposit levels in shop profile |
| 440 | `fcdacea6` | ca4fc888, 45d6aa45 | Claude | 2026-10-08 | MERGE | 32 | 5 | 0 | TINH | LEGACY | docs src/app src/components src/modules tests | Merge remote-tracking branch 'origin/main' into claude/focused-ride-gkrgis |
| 441 | `3be9eb82` | 45d6aa45, fcdacea6 | antranhub22 | 2026-10-09 | MERGE | 56 | 6 | 0 | TINH | LEGACY | docs src/app src/components src/modules tests | Merge pull request #48 from antranhub22/claude/focused-ride-gkrgis |
| 442 | `7a5213f4` | 45d6aa45 | Claude | 2026-10-08 | C | 9 | 1 | 0 | TINH | LEGACY | docs src/components src/modules tests | feat(greeting-card): shop info sheet in customer link header |
| 443 | `bc3a524f` | 3be9eb82 | An Tran | 2026-10-09 | C | 14 | 1 | 0 | TINH | LEGACY | docs src/components src/modules tests | feat(the-chao): nang cap the chao mau hoa toan dien theo yeu cau 9/10 |
| 444 | `1421b114` | bc3a524f | An Tran | 2026-10-09 | C | 3 | 0 | 0 | TINH | LEGACY | src/components | feat(coordinator): ket noi BrochureOrderDetailModal va lam noi bat gio giao tren grid card |
| 445 | `9327d9de` | 1421b114 | An Tran | 2026-10-09 | C | 1 | 1 | 0 | TINH | LEGACY | tests | test(the-chao): bo sung unit test cho SALE_KANBAN_COLS va thu tu uu tien stuck |
| 446 | `eeee284c` | 9327d9de | An Tran | 2026-10-09 | C | 2 | 0 | 0 | TINH | LEGACY | src/components | style(the-chao): fix UX lint R1 va R11 dam bao chuan ratchet khong tang vi pham |
| 447 | `4617e70e` | eeee284c | An Tran | 2026-10-09 | C | 1 | 1 | 0 | TINH | LEGACY | tests | test(the-chao): cap nhat kieu StuckInfo cho test groupSaleKanban |
| 448 | `18be3f3d` | 4617e70e | An Tran | 2026-10-09 | C | 7 | 0 | 0 | TINH | LEGACY | "docs docs | docs(audit): luu tru tai lieu dac ta he thong va template du lieu excel |
| 449 | `c80b5c1a` | 3be9eb82, 7a5213f4 | antranhub22 | 2026-10-09 | MERGE | 9 | 1 | 0 | TINH | LEGACY | docs src/components src/modules tests | Merge pull request #49 from antranhub22/claude/shop-info-header |
| 450 | `aaa58d77` | c80b5c1a | An Tran | 2026-10-09 | C | 1 | 0 | 0 | TINH | LEGACY | src/components | feat(m03): add inline security tip for native image storage on bulk import |

## Batch 10 (#451–#500)

| # | Hash | Parents | Author | Date | Kind | Files | Tests | Prisma | Branches | Lineage | Areas | Subject |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 451 | `ad428c96` | aaa58d77 | An Tran | 2026-10-09 | C | 11 | 1 | 0 | TINH | LEGACY | "docs src/app src/components src/modules tests | feat(m03/san-pham): bộ lọc đa tiêu chí giá/dịp + knowledge base bảo mật Drive |
| 452 | `10b9262d` | 18be3f3d | Claude | 2026-10-08 | C | 13 | 1 | 0 | TINH | LEGACY | src/components src/modules tests | fix(the-chao): correct completion state, reorder flow and delivery sorting from 9/10 upgrade |
| 453 | `82012584` | 10b9262d | Claude | 2026-10-09 | C | 4 | 0 | 0 | TINH | LEGACY | "docs .gitignore docs | chore(docs): remove ALG customer product data files from repository |
| 454 | `a18e391e` | ad428c96, 82012584 | antranhub22 | 2026-10-09 | MERGE | 22 | 1 | 0 | TINH | LEGACY | .gitignore docs src/components src/modules tests | Merge pull request #50 from antranhub22/claude/modest-brown-4f66yo |
| 455 | `1ffb9996` | a18e391e | antranhub22 | 2026-10-09 | C | 9 | 2 | 0 | TINH | LEGACY | docs src/app src/components src/modules tests | fix(products): load Drive thumbnails in batches so large bulk imports show every image (#51) |
| 456 | `f4248a31` | 1ffb9996 | Claude | 2026-10-09 | C | 10 | 2 | 0 | TINH | LEGACY | docs src/app src/components src/modules tests | feat(products): attach images to existing products on bulk re-import |
| 457 | `5e8a9543` | f4248a31 | Claude | 2026-10-09 | C | 13 | 2 | 0 | TINH | LEGACY | docs src/app src/components src/modules tests | feat(products): show Drive file links and refresh non-Drive links on re-import |
| 458 | `5ba5ff4f` | 1ffb9996, 5e8a9543 | antranhub22 | 2026-10-09 | MERGE | 15 | 3 | 0 | TINH | LEGACY | docs src/app src/components src/modules tests | Merge pull request #52 from antranhub22/claude/confident-hopper-3p1xad |
| 459 | `e2f2b91b` | a18e391e | Claude | 2026-10-09 | C | 2 | 1 | 0 | TINH | LEGACY | src/components tests | fix(the-chao): reload template preview when products are added to the catalog |
| 460 | `49b2e4d9` | e2f2b91b | Claude | 2026-10-09 | C | 1 | 0 | 0 | TINH | LEGACY | src/components | fix(the-chao): label sample photos in template preview as illustrative |
| 461 | `e6ce51f2` | 5ba5ff4f | antranhub22 | 2026-10-09 | C | 21 | 0 | 0 | TINH | LEGACY | docs | docs(as-is): add as-is system specification snapshot (#54) |
| 462 | `361ff2b0` | e6ce51f2 | antranhub22 | 2026-10-09 | C | 2 | 0 | 0 | TINH | LEGACY | package-lock.json package.json | fix(deps): bump next to 16.4.0 for next/og ImageResponse RCE advisory (#53) |
| 463 | `80dc89a0` | 361ff2b0, 49b2e4d9 | antranhub22 | 2026-10-09 | MERGE | 3 | 1 | 0 | TINH | LEGACY | src/components tests | Merge pull request #55 from antranhub22/claude/sharp-cori-xdntno |
| 464 | `661fcd92` | 80dc89a0 | Claude | 2026-10-09 | C | 6 | 1 | 0 | TINH | LEGACY | src/app src/lib | feat(nav): lock Tính giá, Tri thức, Chính sách AI, Kết nối kênh as coming soon on production |
| 465 | `1350a994` | 80dc89a0 | An Tran | 2026-10-09 | C | 10 | 0 | 2 | TINH | LEGACY | prisma src/components src/lib src/modules | feat(store): chuyển đổi tài khoản và nhận diện sang Siin Store, bảo toàn hồ sơ thực tế |
| 466 | `d842cbba` | 80dc89a0, 1350a994 | antranhub22 | 2026-10-09 | MERGE | 10 | 0 | 2 | TINH | LEGACY | prisma src/components src/lib src/modules | Merge pull request #57 from antranhub22/feat/chuyen-doi-siin-store |
| 467 | `2cc5eae8` | d842cbba, 661fcd92 | antranhub22 | 2026-10-09 | MERGE | 6 | 1 | 0 | TINH | LEGACY | src/app src/lib | Merge pull request #56 from antranhub22/claude/sharp-cori-xdntno |
| 468 | `117dddcc` | d842cbba | An Tran | 2026-10-09 | C | 2 | 0 | 2 | TINH | LEGACY | prisma | fix(auth): tự động đồng bộ và kích hoạt tài khoản Siin Store trên Render khi deploy |
| 469 | `6a9ed37b` | 2cc5eae8, 117dddcc | antranhub22 | 2026-10-09 | MERGE | 2 | 0 | 2 | TINH | LEGACY | prisma | Merge pull request #58 from antranhub22/fix/sync-siin-store-production |
| 470 | `a264848a` | 6a9ed37b | An Tran | 2026-10-09 | C | 4 | 0 | 0 | TINH | LEGACY | src/app src/modules | fix(profiles): ho tro array cho cac truong json va them brand_assets vao putSchema |
| 471 | `718b3171` | 6a9ed37b, a264848a | antranhub22 | 2026-10-09 | MERGE | 4 | 0 | 0 | TINH | LEGACY | src/app src/modules | Merge pull request #59 from antranhub22/fix/brand-profile-assets-validation |
| 472 | `65b09dbe` | 718b3171 | An Tran | 2026-10-09 | C | 6 | 0 | 0 | TINH | LEGACY | src/components src/modules | fix(profiles): phan giai URL xem cho logo_asset_id va tach nho component theo SRP |
| 473 | `2eba07d4` | 718b3171, 65b09dbe | antranhub22 | 2026-10-09 | MERGE | 6 | 0 | 0 | TINH | LEGACY | src/components src/modules | Merge pull request #60 from antranhub22/fix/brand-logo-preview-url-resolution |
| 474 | `65cc6545` | 2eba07d4 | An Tran | 2026-10-09 | C | 2 | 0 | 0 | TINH | LEGACY | src/components | fix(profiles): đồng bộ previewUrl khi upload logo - khắc phục bị ghi đè logo cũ |
| 475 | `011888a7` | 2eba07d4, 65cc6545 | antranhub22 | 2026-10-09 | MERGE | 2 | 0 | 0 | TINH | LEGACY | src/components | Merge pull request #61 from antranhub22/fix/brand-logo-upload-preview-revert |
| 476 | `a9b63f63` | 011888a7 | An Tran | 2026-10-09 | C | 11 | 1 | 0 | TINH | LEGACY | src/components src/modules | feat(greeting-card): tìm kiếm đơn hàng theo tên, mã đơn và SĐT trên 4 tab tác vụ |
| 477 | `217bc430` | 011888a7, a9b63f63 | antranhub22 | 2026-10-09 | MERGE | 11 | 1 | 0 | TINH | LEGACY | src/components src/modules | Merge pull request #62 from antranhub22/feat/the-chao-order-search |
| 478 | `448306d1` | 217bc430 | An Tran | 2026-10-09 | C | 6 | 0 | 0 | TINH | LEGACY | src/components src/modules | feat(ui): đưa Thẻ Chào lên đầu trang chủ và làm nổi bật tab active trong điều hướng |
| 479 | `21b2bed3` | 217bc430, 448306d1 | antranhub22 | 2026-10-09 | MERGE | 6 | 0 | 0 | TINH | LEGACY | src/components src/modules | Merge pull request #63 from antranhub22/feat/highlight-greeting-card-and-active-nav |
| 480 | `2ec9d43f` | 21b2bed3 | An Tran | 2026-10-09 | C | 41 | 4 | 0 | TINH | LEGACY | .gitignore src/app src/components src/modules tests | feat(greeting-card): quy trình hoàn hủy đơn và cơ chế tự động hủy theo bước hết hạn |
| 481 | `0a47a8be` | 21b2bed3, 2ec9d43f | antranhub22 | 2026-10-09 | MERGE | 41 | 4 | 0 | TINH | LEGACY | .gitignore src/app src/components src/modules tests | Merge pull request #64 from antranhub22/feat/the-chao-step-timeout-and-order-cancellation |
| 482 | `363ec118` | 0a47a8be | An Tran | 2026-10-09 | C | 3 | 0 | 2 | TINH | LEGACY | package.json prisma | fix(data): tự động dọn dẹp toàn bộ dữ liệu đơn hàng và phiên Thẻ Chào của Siin Store trên Render khi deploy |
| 483 | `3d91dc8a` | 363ec118 | An Tran | 2026-10-09 | C | 1 | 0 | 1 | TINH | LEGACY | prisma | fix(data): BỎ cơ chế tự xóa đơn hàng khỏi deploy — Siin Store chuyển sang vận hành thực tế |
| 484 | `bad3499c` | 3d91dc8a | An Tran | 2026-10-09 | C | 11 | 2 | 0 | TINH | LEGACY | src/app src/components src/modules | feat(export): cơ chế backup dữ liệu khách hàng JSON/Excel và xuất danh sách đơn hàng |
| 485 | `cb471c02` | 3d91dc8a, bad3499c | antranhub22 | 2026-10-09 | MERGE | 11 | 2 | 0 | TINH | LEGACY | src/app src/components src/modules | Merge pull request #65 from antranhub22/feat/export-orders-and-customer-backup |
| 486 | `91859932` | cb471c02 | An Tran | 2026-10-09 | C | 4 | 1 | 0 | TINH | LEGACY | src/app src/lib | feat(nav): hiển thị Sắp ra mắt cho tab Khách hàng và Bộ máy phân tích ảnh trên production |
| 487 | `de8f9071` | cb471c02, 91859932 | antranhub22 | 2026-10-09 | MERGE | 4 | 1 | 0 | TINH | LEGACY | src/app src/lib | Merge pull request #66 from antranhub22/feat/lock-khach-hang-and-bo-may-routes |
| 488 | `22a1177d` | de8f9071 | An Tran | 2026-10-09 | C | 3 | 0 | 0 | TINH | LEGACY | src/app src/components | fix(the-chao): tối ưu nút Hộp việc dạng icon chuông và chuẩn hóa trạng thái màu sắc toolbar |
| 489 | `3b974534` | 22a1177d | antranhub22 | 2026-10-09 | C | 20 | 1 | 0 | TINH | LEGACY | src/components src/modules | feat(tracking): gắn nametag nhân viên nổi bật trên hệ thống theo dõi đơn hàng (#67) |
| 490 | `db416ef6` | 3b974534 | An Tran | 2026-10-09 | C | 16 | 4 | 0 | TINH | LEGACY | src/components src/modules | feat(payment): triển khai cổng thanh toán lần 2 và hỗ trợ 2 cơ chế thu cọc đơn Thẻ chào |
| 491 | `e92f34ea` | 3b974534, db416ef6 | antranhub22 | 2026-10-09 | MERGE | 16 | 4 | 0 | TINH | LEGACY | src/components src/modules | Merge pull request #68 from antranhub22/feature/deposit-order-second-payment-gate |
| 492 | `7177466f` | e92f34ea | An Tran | 2026-10-09 | C | 18 | 2 | 0 | TINH | LEGACY | src/components src/modules | feat(the-chao): thu thập thông tin khách hàng Chặng 1 & cấu hình CTA ưu đãi bật/tắt từ cài đặt Điều hành |
| 493 | `2c10a6ff` | e92f34ea, 7177466f | antranhub22 | 2026-10-09 | MERGE | 18 | 2 | 0 | TINH | LEGACY | src/components src/modules | feat(the-chao): Thu thập thông tin Chặng 1 & CTA ưu đãi bật/tắt từ cài đặt Điều hành |
| 494 | `b4ec36f9` | 2c10a6ff | antranhub22 | 2026-10-09 | C | 5 | 1 | 0 | TINH | LEGACY | src/components src/modules | fix(the-chao): hiển thị yêu cầu thanh toán lần 2 và mã QR đúng thời điểm sau khi xác nhận ảnh sản phẩm (#70) |
| 495 | `1db8704d` | b4ec36f9 | An Tran | 2026-10-09 | C | 1 | 1 | 0 | TINH | LEGACY | src/modules | test(the-chao): fix type assertion in photo approval payment gating test |
| 496 | `69ee531d` | 1db8704d | An Tran | 2026-10-10 | C | 7 | 1 | 0 | TINH | LEGACY | src/components src/modules | fix(greeting-card): chan thu tien 2 lan som cho don dat coc tai buoc xac nhan |
| 497 | `66288e8a` | 1db8704d, 69ee531d | antranhub22 | 2026-10-10 | MERGE | 7 | 1 | 0 | TINH | LEGACY | src/components src/modules | Merge pull request #71 from antranhub22/fix/deposit-order-two-stage-payment-guard |
| 498 | `73c60991` | 66288e8a | An Tran | 2026-10-10 | C | 10 | 1 | 0 | TINH | LEGACY | src/components src/modules | feat(greeting-card): admin approval flow for balance payment after customer reports |
| 499 | `360d6dc3` | 73c60991 | An Tran | 2026-10-10 | C | 3 | 0 | 0 | TINH | LEGACY | src/app src/modules | fix(batch-import): ghi đè ảnh và drive_link khi nhập lại Excel |
| 500 | `a83452cb` | 73c60991, 360d6dc3 | antranhub22 | 2026-10-10 | MERGE | 3 | 0 | 0 | TINH | LEGACY | src/app src/modules | Merge pull request #72 from antranhub22/fix/batch-import-upsert-image-drive-link |

## Batch 11 (#501–#550)

| # | Hash | Parents | Author | Date | Kind | Files | Tests | Prisma | Branches | Lineage | Areas | Subject |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 501 | `f0641a90` | a83452cb | An Tran | 2026-10-10 | C | 8 | 1 | 0 | TINH | LEGACY | src/app src/components src/modules | feat(greeting-card): hop viec chuyen sau cho sale va dieu phoi kem bo chuyen vai |
| 502 | `5565f9f8` | a83452cb, f0641a90 | antranhub22 | 2026-10-10 | MERGE | 8 | 1 | 0 | TINH | LEGACY | src/app src/components src/modules | Merge pull request #73 from antranhub22/feat/greeting-card-sale-coordinator-inbox |
| 503 | `4719ba28` | 5565f9f8 | An Tran | 2026-10-10 | C | 9 | 0 | 1 | TINH | LEGACY | .gitignore AGENTS.md docs package.json prisma scripts | feat(ops): pipeline tu dong ban giao sach tenant kem auto backup va disaster recovery |
| 504 | `f8db4a7d` | 4719ba28 | An Tran | 2026-10-10 | C | 14 | 0 | 0 | TINH | LEGACY | .agents AGENTS.md docs | docs(feature-map): hoan thien ban do tinh nang production va bo sung skill feature-mapping |
| 505 | `a4b16af2` | f8db4a7d | An Tran | 2026-10-10 | C | 88 | 4 | 1 | TINH | LEGACY | "docs docs prisma src/app src/components src/modules | feat(greeting-card): tich hop upload anh chuyen khoan, hien thi lich su va mau in bang chung don hang |
| 506 | `9e8c1c5b` | a4b16af2 | An Tran | 2026-10-10 | C | 6 | 1 | 0 | TINH | LEGACY | src/components src/modules | feat(greeting-card): toi uu khung gio dat hoa theo thoi gian chuan bi toi thieu va loc ca chuan |
| 507 | `77128318` | 9e8c1c5b | An Tran | 2026-10-10 | C | 2 | 0 | 0 | TINH | LEGACY | "docs docs | chore(checkpoint): freeze baseline copywriting inventory & audit report on Nang_cap_noidungUI |
| 508 | `9145aced` | 77128318 | An Tran | 2026-10-10 | C | 11 | 2 | 0 | TINH | LEGACY | src/app src/components src/lib src/modules tests | fix(copywriting): hotfix P0 typos, remove tech codes M01a/M09, unlock home cards, and clean storage labels |
| 509 | `f5621dd3` | 9145aced | An Tran | 2026-10-10 | C | 13 | 0 | 0 | TINH | LEGACY | docs | docs(copywriting): complete 100% SSOT standardized copy across all 11 inventory files |
| 510 | `8b9a30e2` | f5621dd3 | An Tran | 2026-10-10 | C | 5 | 0 | 0 | TINH | LEGACY | src/components src/modules | feat(copywriting): apply standardized UI copy for Home & Journey navigation (Cluster 3.1) |
| 511 | `20076628` | 8b9a30e2 | An Tran | 2026-10-10 | C | 9 | 0 | 0 | TINH | LEGACY | src/app src/components src/modules | feat(copywriting): apply standardized UI copy for Orders and Greeting Card (Cluster 3.2) |
| 512 | `25ec09bb` | 20076628 | An Tran | 2026-10-10 | C | 14 | 0 | 0 | TINH | LEGACY | src/app src/components | feat(copywriting): apply standardized UI copy for Products, Create, Bulk Import and Photo Scan (Cluster 3.3) |
| 513 | `2b120a55` | 25ec09bb | An Tran | 2026-10-10 | C | 4 | 0 | 0 | TINH | LEGACY | src/app src/components | feat(copywriting): apply standardized UI copy for Storage, Profile, and Settings (Cluster 3.4) |
| 514 | `08470e36` | 2b120a55 | An Tran | 2026-10-10 | C | 12 | 0 | 0 | TINH | LEGACY | scripts src/app src/components | feat(copywriting): eliminate technical jargon (PII, Master Index, BOM) and tighten R12 lint rule |
| 515 | `58faa029` | 08470e36 | An Tran | 2026-10-10 | C | 25 | 1 | 0 | TINH | LEGACY | src/app src/components src/lib | feat(i18n): implement full multi-language architecture & code-level SSOT dictionary engine |
| 516 | `12251bb0` | 58faa029 | An Tran | 2026-10-10 | C | 2 | 0 | 0 | TINH | LEGACY | .agents AGENTS.md | docs(skill): establish copywriting-governance skill with Level 2 i18n SSOT architecture |
| 517 | `e719f3df` | 12251bb0 | An Tran | 2026-10-10 | C | 37 | 3 | 0 | TINH | LEGACY | .agents AGENTS.md src/app src/components src/modules tests | feat(ops-copilot): kết nối LLM vào Tầng 3 Tone Synthesizer Agent |
| 518 | `78479166` | e719f3df | An Tran | 2026-10-11 | C | 29 | 3 | 0 | TINH | LEGACY | src/app src/components src/modules tests | feat(products): tích hợp AI Product Enrichment và đồng bộ thuộc tính sản phẩm |
| 519 | `27d56e7b` | 78479166 | An Tran | 2026-10-11 | C | 19 | 1 | 0 | TINH | LEGACY | src/app src/components src/lib src/modules | feat(greeting-card): an lien ket ve webapp khi link gui khach het han hoac khong kha dung |
| 520 | `5a76493f` | 27d56e7b | An Tran | 2026-10-11 | C | 54 | 5 | 0 | TINH | LEGACY | docs src/app src/components src/lib src/modules tests | feat(greeting-card): hoàn thiện quy trình thẩm định nhận đơn, SLA tự hủy, duyệt thanh toán lần 2 và chính sách ảnh 3 lớp |
| 521 | `09565804` | 5a76493f | An Tran | 2026-10-11 | C | 1 | 0 | 0 | TINH | LEGACY | src/components | feat(settings): đồng bộ cấu hình SLA timeout, chính sách ảnh và duyệt thanh toán lần 2 vào Hồ sơ cửa hàng (/ho-so) |
| 522 | `644892a2` | 09565804 | An Tran | 2026-10-11 | C | 19 | 1 | 0 | TINH | LEGACY | scripts src/app src/components src/modules | feat(greeting-card): Coordinator xác nhận tiền cọc Đợt 1 thay Điều hành |
| 523 | `d243927e` | 644892a2 | An Tran | 2026-10-12 | C | 1 | 0 | 0 | TINH | LEGACY | "docs | docs: bổ sung báo cáo kiến trúc layout và chức năng vai trò quản trị (platform_admin, store_admin, chain_admin) |
| 524 | `82fb24df` | d243927e | An Tran | 2026-10-12 | C | 16 | 0 | 0 | TINH | LEGACY | docs src/components src/modules | feat(greeting-card): hoàn thiện Thẻ Gia Công cắm hoa chuẩn voucher HD và bảo mật giá bán |
| 525 | `defd6270` | 82fb24df | An Tran | 2026-10-13 | C | 22 | 1 | 0 | TINH | LEGACY | src/app src/components src/modules | feat(coordinator): Hệ thống nhắc nghiệp vụ điều phối M0-M5 |
| 526 | `613afb3f` | defd6270 | An Tran | 2026-10-13 | C | 2 | 0 | 0 | TINH | LEGACY | "docs docs | docs(greeting-card): Cập nhật quy trình duyệt ảnh và quyền quyết định giao ship của Điều phối |
| 527 | `91ce4e7f` | 613afb3f | An Tran | 2026-10-13 | C | 3 | 0 | 0 | TINH | LEGACY | src/components | fix(greeting-card): Bỏ qua duyệt ảnh khi không tải ảnh và bổ sung xác nhận thu lần 2 cho Điều phối |
| 528 | `898738c6` | 91ce4e7f | An Tran | 2026-10-14 | C | 17 | 1 | 0 | TINH | LEGACY | src/app src/components src/modules | feat(greeting-card): tich hop AI Vision kiem tra anh chuyen khoan va canh bao xac thuc tren UI |
| 529 | `f4fb1dc2` | 898738c6 | An Tran | 2026-10-14 | C | 11 | 1 | 0 | TINH | LEGACY | src/app src/components src/modules tests | feat(products): cập nhật thông tin & ảnh khi tái nhập Excel và thêm cơ chế xác nhận lưu Sản phẩm & Giá khi quét ảnh hoa |
| 530 | `1a82a702` | f4fb1dc2 | An Tran | 2026-10-14 | C | 9 | 1 | 0 | TINH | LEGACY | src/components src/modules | feat(greeting-card): phân tầng thời gian 3 lớp thu gọn đơn quá hạn và tinh gọn thanh điều khiển theo dõi tiến độ |
| 531 | `6517c8f6` | 1a82a702 | An Tran | 2026-10-14 | C | 11 | 1 | 0 | TINH | LEGACY | src/app src/components src/modules | feat(catalog): add quick collection generator with full greeting template dropdown and multi-budget selection |
| 532 | `5fa93244` | 6517c8f6 | An Tran | 2026-10-14 | C | 2 | 0 | 0 | TINH | LEGACY | src/components src/modules | fix(greeting-card): quick search filters now route to server-side API |
| 533 | `1cc3f3c9` | 5fa93244 | An Tran | 2026-10-14 | C | 2 | 0 | 0 | TINH | LEGACY | src/components src/lib | feat(lib): add normalizeText utility for accent/case-insensitive matching |
| 534 | `dcb460c0` | 1cc3f3c9 | An Tran | 2026-10-14 | C | 1 | 0 | 0 | TINH | LEGACY | src/components | fix(greeting-card): correct filter strategy - server-side only for category |
| 535 | `6d772748` | dcb460c0 | An Tran | 2026-10-14 | C | 1 | 0 | 0 | TINH | LEGACY | src/components | fix(greeting-card): move category filter client-side with canonical key map |
| 536 | `d90f8c67` | 6d772748 | An Tran | 2026-10-14 | C | 1 | 0 | 0 | TINH | LEGACY | src/modules | fix(quick-collection): canonical key category matching in scoring engine |
| 537 | `1525b335` | d90f8c67 | An Tran | 2026-10-14 | C | 11 | 0 | 0 | TINH | LEGACY | src/app src/components src/lib src/modules | feat(search-ssot): build standardized SSOT product filter system |
| 538 | `e245aa3e` | 1525b335 | An Tran | 2026-10-14 | C | 1 | 0 | 0 | TINH | LEGACY | src/modules | fix(quick-collection): 2-tier filter strategy to fix wrong category results |
| 539 | `268d03b1` | e245aa3e | An Tran | 2026-10-14 | C | 2 | 0 | 0 | TINH | LEGACY | src/components src/modules | fix(quick-collection): no-match returns empty instead of unrelated products |
| 540 | `dd4c781e` | 268d03b1 | An Tran | 2026-10-14 | C | 2 | 0 | 0 | TINH | LEGACY | src/components src/modules | feat(quick-collection): add refresh button to reshuffle product selection |
| 541 | `076bab87` | dd4c781e | An Tran | 2026-10-14 | C | 5 | 0 | 0 | TINH | LEGACY | src/app src/components src/lib src/modules | feat(search): sync server-side canonical filter to search across entire product database |
| 542 | `7bc06352` | 076bab87 | An Tran | 2026-10-14 | C | 14 | 1 | 0 | TINH | LEGACY | docs src/app src/components src/modules tests | feat(greeting-card): triển khai ma trận quy trình 5 trụ cột và đường hầm hỏa tốc cho Thẻ Chào |
| 543 | `7f6c8f8c` | 7bc06352 | An Tran | 2026-10-14 | C | 21 | 1 | 0 | TINH | LEGACY | src/app src/components src/modules tests | feat(greeting-card): add order dismissal proposal, auto-approve timeout, restore, and color-coded staff tags |
| 544 | `9776fe85` | 6979c346 | Claude | 2026-10-23 | C | 4 | 1 | 0 | UPB | CURRENT | src/app src/components src/modules tests | fix(greeting-card): keep Telegram dispatch status stable on transient errors |
| 545 | `c8cd41f3` | b6cf6f3f, 9776fe85 | Claude | 2026-10-23 | MERGE | 0 | 0 | 0 | UPB | CURRENT |  | Merge remote-tracking branch 'origin/claude/upbeat-clarke-2zx8tb' into claude/upbeat-clarke-2zx8tb |
| 546 | `f216d1f2` | c8cd41f3 | Claude | 2026-10-23 | C | 2 | 1 | 0 | UPB | CURRENT | src/modules tests | fix(greeting-card): log and retry once on Telegram network errors |
| 547 | `407f454a` | f216d1f2, 4b872d98 | Claude | 2026-10-23 | MERGE | 0 | 0 | 0 | UPB | CURRENT |  | Merge remote-tracking branch 'origin/main' into claude/upbeat-clarke-2zx8tb |
| 548 | `805c8fbe` | 407f454a | Claude | 2026-10-23 | C | 3 | 1 | 0 | UPB | CURRENT | src/modules | fix(greeting-card): upload subcontract sample photo to Telegram when URL fetch fails |
| 549 | `e4b6246d` | f0dd062a, 805c8fbe | Claude | 2026-10-23 | MERGE | 0 | 0 | 0 | UPB | CURRENT |  | Merge remote-tracking branch 'origin/claude/upbeat-clarke-2zx8tb' into claude/upbeat-clarke-2zx8tb |
| 550 | `507ab590` | e4b6246d | Claude | 2026-10-23 | C | 3 | 1 | 0 | UPB | CURRENT | src/components tests | fix(greeting-card): show selected size price in order form header |

## Batch 12 (#551–#600)

| # | Hash | Parents | Author | Date | Kind | Files | Tests | Prisma | Branches | Lineage | Areas | Subject |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 551 | `2664eadc` | 59ab7434, 507ab590 | Claude | 2026-10-23 | MERGE | 0 | 0 | 0 | UPB | CURRENT |  | Merge remote-tracking branch 'origin/claude/upbeat-clarke-2zx8tb' into claude/upbeat-clarke-2zx8tb |
| 552 | `44dacbaf` | 2664eadc | Claude | 2026-10-23 | C | 1 | 0 | 0 | UPB | CURRENT | src/components | fix(greeting-card): show per-branch results after resending dispatch |
| 553 | `a99c9617` | faf6d730, 44dacbaf | Claude | 2026-10-23 | MERGE | 0 | 0 | 0 | UPB | CURRENT |  | Merge remote-tracking branch 'origin/claude/upbeat-clarke-2zx8tb' into claude/upbeat-clarke-2zx8tb |
| 554 | `a1b61be1` | a99c9617 | Claude | 2026-10-23 | C | 2 | 1 | 0 | UPB | CURRENT | src/app tests | fix(greeting-card): show Telegram's reason when test message fails |
| 555 | `800183b5` | 7b676dec, a1b61be1 | Claude | 2026-10-23 | MERGE | 0 | 0 | 0 | UPB | CURRENT |  | Merge remote-tracking branch 'origin/claude/upbeat-clarke-2zx8tb' into claude/upbeat-clarke-2zx8tb |
| 556 | `ef1914fb` | 800183b5 | Claude | 2026-10-23 | C | 2 | 0 | 0 | UPB | CURRENT | src/components | feat(greeting-card): add 1:1 shop owner setup guide to Telegram settings |
| 557 | `721b8179` | dcbd76de, ef1914fb | Claude | 2026-10-23 | MERGE | 0 | 0 | 0 | UPB | CURRENT |  | Merge remote-tracking branch 'origin/claude/upbeat-clarke-2zx8tb' into claude/upbeat-clarke-2zx8tb |
| 558 | `ddda38f3` | 721b8179 | Claude | 2026-10-23 | C | 10 | 3 | 0 | UPB | CURRENT | src/app src/components src/modules tests | feat(greeting-card): remove a linked Telegram chat from settings |
| 559 | `b4858c21` | ddda38f3 | Claude | 2026-10-23 | C | 1 | 0 | 0 | UPB | CURRENT | docs | docs(api): document DELETE telegram-dispatch linked chat |
| 560 | `5fbc6df7` | 80517fa5, b4858c21 | Claude | 2026-10-23 | MERGE | 0 | 0 | 0 | UPB | CURRENT |  | Merge remote-tracking branch 'origin/claude/upbeat-clarke-2zx8tb' into claude/upbeat-clarke-2zx8tb |
| 561 | `ccb2059a` | 5fbc6df7 | Claude | 2026-10-23 | C | 8 | 2 | 0 | UPB | CURRENT | docs src/app src/components src/modules tests | feat(greeting-card): partner list with active / paused toggle |
| 562 | `869a97bb` | ccb2059a | Claude | 2026-10-23 | C | 2 | 2 | 0 | UPB | CURRENT | tests | test(e2e): align role homepage and /vai-tro snapshot with homepage-for-every-role |
| 563 | `ffb1d587` | 80517fa5 | dependabot[bot] | 2026-10-26 | C | 1 | 0 | 0 | DTORCH | CURRENT | workers | chore(deps): Update torch requirement from >=2.3 to >=2.14.1 in /workers |
| 564 | `4ad5628b` | 80517fa5 | dependabot[bot] | 2026-10-26 | C | 1 | 0 | 0 | DTV | CURRENT | workers | chore(deps): Update torchvision requirement in /workers |
| 565 | `151585e5` | 80517fa5 | dependabot[bot] | 2026-10-26 | C | 1 | 0 | 0 | DTIMM | CURRENT | workers | chore(deps): Update timm requirement from >=1.0 to >=1.0.30 in /workers |
| 566 | `22e76e31` | 80517fa5 | dependabot[bot] | 2026-10-26 | C | 2 | 0 | 0 | DNPM | CURRENT | package-lock.json package.json | chore(deps): Bump the npm-minor-patch group with 2 updates |
| 567 | `fe0d74aa` | c76aab97 | An Tran | 2026-10-26 | C | 38 | 1 | 0 | INT | CURRENT | "docs src/app src/components src/modules | feat(catalog): thêm tính năng xuất ảnh Poster PNG 1080x1080 cho Zalo/Facebook |
| 568 | `e7545157` | fe0d74aa | An Tran | 2026-10-26 | C | 29 | 1 | 0 | INT | CURRENT | .agents AGENTS.md src/components src/modules | feat(catalog): nâng cấp thiết kế storefront & poster theo chuẩn swipe cao cấp |
| 569 | `cc937f20` | e7545157 | An Tran | 2026-10-26 | C | 13 | 0 | 0 | INT | CURRENT | docs src/components | feat(nav): Kiến trúc Sidebar 4 Tầng ALG (SaaS Mother / SaaS Ngành / ChainOS / StoreOS) |
| 570 | `610b1711` | cc937f20 | An Tran | 2026-10-26 | C | 5 | 0 | 0 | INT | CURRENT | src/components | feat(nav): Enterprise-grade sidebar redesign — collapsible + tier-aware |
| 571 | `39803b71` | 610b1711 | An Tran | 2026-10-27 | C | 11 | 1 | 0 | INT | CURRENT | docs src/components src/lib | feat(nav): chuẩn hóa thiết kế Enterprise 4 thanh sidebar và cập nhật SSOT |
| 572 | `21e1a08b` | 39803b71 | An Tran | 2026-10-27 | C | 8 | 1 | 0 | INT | CURRENT | docs src/components | feat(nav): hoàn thiện kiến trúc và thiết kế 4 thanh sidebar theo đặc tả SSOT |
| 573 | `198f7b3a` | 21e1a08b | An Tran | 2026-10-27 | C | 4 | 1 | 0 | INT | CURRENT | docs src/components src/modules | feat(toolkit): thiết lập Kiến trúc SSOT Toolkit Registry & Ma trận bật tắt công cụ tập trung |
| 574 | `46bd3e95` | 198f7b3a | An Tran | 2026-10-27 | C | 1 | 0 | 0 | INT | CURRENT | src/components | fix(layout): sửa badge ArchitectureNametag hiển thị đúng SaaS Ngành cho Tầng 2 |
| 575 | `cd858f2c` | 46bd3e95 | An Tran | 2026-10-27 | C | 9 | 2 | 0 | INT | CURRENT | docs src/components src/modules | feat(nav): chuẩn hóa kiến trúc SSOT Sản phẩm & Kho cho 4 tầng hệ thống |
| 576 | `20f155c7` | cd858f2c | An Tran | 2026-10-27 | C | 8 | 1 | 0 | INT | CURRENT | docs src/core src/lib | feat(terminology): thiet lap Master Terminology SSOT va kien truc quan ly 4 tang |
| 577 | `0a64ae02` | 20f155c7 | An Tran | 2026-10-27 | C | 4 | 2 | 0 | INT | CURRENT | src/app src/modules tests | fix(tenant): dong bo database test, triet tieu prisma ngoai infra va dat 100% test:tenant xanh |
| 578 | `f0dce714` | 0a64ae02 | An Tran | 2026-10-27 | C | 2 | 0 | 0 | INT | CURRENT | docs | docs: quy chuan hop nhat 14 chang va bo cong cu smeos (PO 27/10/2026) |
| 579 | `307ab6fa` | f0dce714 | An Tran | 2026-10-27 | C | 5 | 0 | 0 | INT | CURRENT | src/components src/modules | feat(nav): dong bo sidebar 4 tang va toolkit catalog theo he thong hop nhat (PO 27/10/2026) |
| 580 | `0cf2b2f3` | 307ab6fa | An Tran | 2026-10-27 | C | 3 | 0 | 0 | INT | CURRENT | src/components src/modules | feat(ui): chuan hoa giao dien 51 cong cu phan theo 9 nhom tren ToolkitHome (PO 27/10/2026) |
| 581 | `6b8d284f` | 0cf2b2f3 | An Tran | 2026-10-27 | C | 4 | 0 | 0 | INT | CURRENT | src/components src/modules | fix(nav): hien thi ro rang Thuvien 51 cong cu (9 nhom) trong sidebar cac tang (PO 27/10/2026) |
| 582 | `f4154e3a` | 6b8d284f | An Tran | 2026-10-27 | C | 5 | 0 | 0 | INT | CURRENT | src/components | feat(nav): sidebar Cong cu = Thu vien co dinh + Shortcuts user tu pin (PO 27/10/2026) |
| 583 | `05c46b24` | f4154e3a | An Tran | 2026-10-27 | C | 3 | 0 | 0 | INT | CURRENT | src/components | fix(nav): picker shortcuts hien toan bo cong cu tu moi nhom nav (PO 27/10/2026) |
| 584 | `4b38648a` | 05c46b24 | An Tran | 2026-10-27 | C | 4 | 0 | 0 | INT | CURRENT | src/components | feat(nav): dong bo nhom Cong cu (Thu vien + Shortcuts) tren ca 3 tang StoreOS, ChainOS va SaaS Nganh |
| 585 | `267944f1` | 4b38648a | An Tran | 2026-10-27 | C | 3 | 1 | 0 | INT | CURRENT | src/components | test(nav): khoa cung SSOT dong bo nhom Cong cu tren tat ca cac tang qua TOOLKIT_GROUP_KEYS va unit test |
| 586 | `5def12db` | 267944f1 | An Tran | 2026-10-27 | C | 10 | 1 | 0 | INT | CURRENT | src/app src/components src/lib src/modules | feat(entitlement): xay dung co che phan quyen mo khoa cong cu da tang theo cap quan ly (PO 27/10/2026) |
| 587 | `8492c065` | 5def12db | An Tran | 2026-10-27 | C | 5 | 0 | 0 | INT | CURRENT | src/app src/components src/modules | feat(ui): them giao dien bang cong tac mo khoa cong cu chi nhanh cho ChainOS (/dieu-phoi/doi-tac) |
| 588 | `f6ca2782` | 8492c065 | An Tran | 2026-10-27 | C | 49 | 2 | 2 | INT | CURRENT | docs prisma src/app src/modules | feat(notification): triển khai kiến trúc hệ thống notification đa tầng SSOT |
| 589 | `405f15cf` | f6ca2782 | An Tran | 2026-10-27 | C | 14 | 0 | 0 | INT | CURRENT | src/app src/components | feat(notification): tich hop ma tran thong bao vao sidebar va trang cai dat cac tang |
| 590 | `6d87a403` | 405f15cf | An Tran | 2026-10-27 | C | 1 | 0 | 0 | INT | CURRENT | src/components | fix(nav): khac phuc loi hydration mismatch o ToolkitShortcutsGroup |
| 591 | `87c8b675` | 6d87a403 | An Tran | 2026-10-27 | C | 4 | 0 | 0 | INT | CURRENT | src/app src/components src/modules | fix(notification): nap danh muc su kien va kenh thong bao cho StoreOS, ChainOS, Industry |
| 592 | `9bb7cc80` | 87c8b675 | An Tran | 2026-10-27 | C | 1 | 0 | 0 | INT | CURRENT | src/components | fix(nav): bao ve nut reset shortcut bang mounted flag de triet tieu hydration error |
| 593 | `7c3f0585` | 9bb7cc80 | An Tran | 2026-10-27 | C | 5 | 1 | 0 | INT | CURRENT | src/components src/modules | fix(notification-matrix): fix camelCase/snake_case mismatch in hook, add error state, improve resilience |
| 594 | `c6b2a4c2` | 7c3f0585 | An Tran | 2026-10-27 | C | 1 | 0 | 0 | INT | CURRENT | src/core | fix(notification): bump schema version to force Prisma client refresh |
| 595 | `666b370d` | c6b2a4c2 | An Tran | 2026-10-27 | C | 2 | 0 | 0 | INT | CURRENT | "docs src/components | fix(notification): fix policies.find crash — Array.isArray guard + null policy path |
| 596 | `4fcd5a7c` | 666b370d | An Tran | 2026-10-27 | C | 2 | 0 | 0 | INT | CURRENT | src/app src/components | fix(notification): fix roleDefaults crash — correct MOTHER events endpoint |
| 597 | `f56024ca` | 4fcd5a7c | An Tran | 2026-10-27 | C | 1 | 0 | 0 | INT | CURRENT | AGENTS.md | docs(constitution): add 4-Tier Cascading Governance SSOT standard to AGENTS.md |
| 598 | `99db1dfc` | f56024ca | An Tran | 2026-10-27 | C | 40 | 6 | 0 | INT | CURRENT | "docs docs src/app src/components src/core src/modules | feat(governance): hoan thien kien truc 4 tang cascading governance, tach rieng ma tran va khoi phuc hien thi cai dat sidebar |
| 599 | `83fd26ce` | a8b68db4 | An Tran | 2026-10-27 | C | 9 | 1 | 0 | INT | CURRENT | docs package.json scripts src/layers | feat(layers): thiet lap ranh gioi 3 tang kien truc, contract ban don dien hoa va cong cu check:layers |
| 600 | `cebcb057` | 83fd26ce, c76aab97 | An Tran | 2026-10-27 | MERGE | 883 | 170 | 36 | INT | CURRENT | "docs .agents .env.example .github .gitleaksignore AGENTS.md | merge: dong bo main moi nhat ve nhanh Nangcap_kientrucREPOSITORIES |

## Batch 13 (#601–#613)

| # | Hash | Parents | Author | Date | Kind | Files | Tests | Prisma | Branches | Lineage | Areas | Subject |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 601 | `db9592b9` | cebcb057 | An Tran | 2026-10-27 | C | 1 | 0 | 0 | INT | CURRENT | scripts | chore(audit): cap nhat baseline ratchet sau khi dong bo main sach hardcode |
| 602 | `4bb56239` | c76aab97, db9592b9 | An Tran | 2026-10-27 | MERGE | 9 | 1 | 0 | INT | CURRENT | docs package.json scripts src/layers | merge: Nangcap_kientrucREPOSITORIES → integration/all-features-oct27 |
| 603 | `383b4f3f` | 4bb56239, e7545157 | An Tran | 2026-10-27 | MERGE | 59 | 2 | 0 | INT | CURRENT | "docs .agents AGENTS.md src/app src/components src/modules | merge: Nangcap_chucnangCatalog → integration/all-features-oct27 |
| 604 | `52cd3477` | 383b4f3f, 21e1a08b | An Tran | 2026-10-27 | MERGE | 21 | 1 | 0 | INT | CURRENT | docs src/components src/lib | merge: Thietke_sidebar_ALL → integration/all-features-oct27 |
| 605 | `d279148c` | 52cd3477, cd858f2c | An Tran | 2026-10-27 | MERGE | 12 | 3 | 0 | INT | CURRENT | docs src/components src/modules | merge: Nangcap_hethongchucnang → integration/all-features-oct27 |
| 606 | `0c6a5c5f` | d279148c, 0a64ae02 | An Tran | 2026-10-27 | MERGE | 12 | 3 | 0 | INT | CURRENT | docs src/app src/core src/lib src/modules tests | merge: Chuanhoa_Terminology → integration/all-features-oct27 |
| 607 | `0968c691` | 0c6a5c5f, 8492c065 | An Tran | 2026-10-27 | MERGE | 30 | 2 | 0 | INT | CURRENT | docs src/app src/components src/lib src/modules | merge: Hopnhat_chucnang-congcu → integration/all-features-oct27 |
| 608 | `0625c8e1` | 0968c691, f56024ca | An Tran | 2026-10-27 | MERGE | 70 | 2 | 2 | INT | CURRENT | "docs AGENTS.md docs prisma src/app src/components | merge: Nangcap_hethongnotification → integration/all-features-oct27 |
| 609 | `086c1e3a` | 0625c8e1, 99db1dfc | An Tran | 2026-10-27 | MERGE | 40 | 6 | 0 | INT | CURRENT | "docs docs src/app src/components src/core src/modules | merge: Nangcap_kientruc4tang_governance → integration/all-features-oct27 |
| 610 | `ec71f9b7` | 086c1e3a | An Tran | 2026-10-27 | C | 1 | 0 | 0 | INT | CURRENT | scripts | chore(ratchet): update baseline for integration branch |
| 611 | `e0b8008b` | ec71f9b7 | An Tran | 2026-10-27 | C | 6 | 0 | 0 | INT | CURRENT | src/components src/modules | fix(toolkit-shortcuts): connect 51 tools catalog to picker and fix counter mismatch |
| 612 | `36f80373` | e0b8008b | An Tran | 2026-10-27 | C | 1 | 0 | 0 | INT | CURRENT | src/modules | fix(nav): remove /cai-dat from store_admin navPriority to avoid duplicate sidebar tab |
| 613 | `d4212e74` | 36f80373 | An Tran | 2026-10-27 | C | 4 | 1 | 0 | INT | CURRENT | src/components | fix(nav): remove duplicate sidebar hrefs across all 4 tiers |
