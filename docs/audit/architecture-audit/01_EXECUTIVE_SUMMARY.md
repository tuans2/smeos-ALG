# 01 — Tóm tắt điều hành: Audit kiến trúc ALG

> Loại tài liệu: báo cáo audit (chỉ đọc, không sửa mã). Ngày audit: 31/10/2026.
> Commit được audit: `c27f39e1` (HEAD của `main`, "Merge pull request #95").
> Phạm vi: toàn bộ repo `antranhub22/smeOS` — `src/` (3.306 tệp TS/TSX, ~356k dòng), `workers/` (163 tệp Python, ~24k dòng), `prisma/` (133 model, 53 enum, 32 migration), `tests/` (349 tệp), `docs/` (417 tệp .md), cấu hình CI/CD và triển khai.
> Mã phát hiện (`ARC-xxx`) tra ở `08_ARCHITECTURE_RISK_REGISTER.md`; bằng chứng ở `11_AUDIT_EVIDENCE_INDEX.md`.

## 1. Kết luận một câu

ALG có **lõi kiến trúc đa tenant và phân quyền được thiết kế tốt và có kiểm thử thật**, nhưng **chưa sẵn sàng production thương mại, enterprise hay bàn giao khách hàng**: cổng chất lượng bắt buộc không chạy trên mã đang nằm ở `main` (và `main` tự deploy), mô hình 4 tầng mới hoàn thiện 2,5/4 tầng, kiến trúc tích hợp bị phân mảnh, và vận hành (môi trường, sao lưu, khôi phục, lưu trữ) chưa được kiểm chứng.

## 2. Điểm trưởng thành theo 15 miền (0–5)

| Miền | Điểm | Ghi chú ngắn |
|---|:---:|---|
| A. Kiến trúc hệ thống | 3 | Modular monolith + worker Python qua Postgres; ranh giới domain/infra được kiểm bằng test; tầng Ngành chưa có dữ liệu |
| B. Kiến trúc repository | 3 | Cấu trúc rõ, nhưng 105 tệp > 350 dòng, tài liệu lệch, thư mục trùng tên khác hoa/thường |
| C. CSDL & dữ liệu | 3 | 100/133 bảng có `organization_id` + index; migrate deploy + kiểm lệch schema trong CI; chưa có ERD, sao lưu chưa kiểm chứng |
| D. API | 3 | 440 route `/api/v1`, envelope lỗi chung, zod, rate-limit công khai; không có OpenAPI |
| E. Logic nghiệp vụ | 3 | Domain thuần, có bảng chuyển trạng thái; ba động cơ trạng thái cùng chạy trên `orders`, mô-đun Thẻ chào 29k dòng bị đóng băng |
| F. Bảo mật | 3 | Phiên băm, bcrypt, AES-GCM, webhook ký, gitleaks/CodeQL; cửa hậu nền tảng ở môi trường không-production, CSP chỉ ghi nhận, mật khẩu seed chưa xoay |
| G. RBAC 4 tầng | 3 | 163 mã năng lực, 3 lớp cắt + trần cứng, test gác route; tầng Ngành và khoá vai UI không khớp vai thật |
| H. UX/UI | 3 | Token ngữ nghĩa, UX lint ratchet, E2E a11y; 26% tệp giao diện dùng i18n |
| I. Screen Contract | 2 | Khung có, 47 tệp cho 104 trang; tuân thủ chỉ tự khai |
| J. Nội dung UI & i18n | 2 | Có từ điển vi/en và glossary; phần lớn chuỗi vẫn hardcode |
| K. Lưu trữ & artifact | 3 | Port + S3, URL ký, thùng rác, legal hold, outbox; lùi về đĩa cục bộ trong im lặng |
| L. Tích hợp | 2 | Hub mới chỉ có đầu nối thử; kênh thật nằm rải trong Thẻ chào; SMS/Zalo/Push ở mô-đun thông báo là stub |
| M. Quản trị AI agent | 3 | Bộ luật, skill, hook, `check:docs` cho tài liệu agent; tài liệu trạng thái lệch mã |
| N. DevOps & hạ tầng | 2 | CI đầy đủ trên giấy nhưng `main` đỏ 4 lần liền vẫn auto-deploy; 1 môi trường; build bỏ qua lỗi TypeScript |
| O. Tài liệu & bàn giao | 2 | Hồ sơ bàn giao + runbook bản nháp; SLA, sao lưu, hướng dẫn quản trị/người dùng còn trống |

**Không dùng điểm trung bình** (≈2,7) để đánh giá sẵn sàng: các phát hiện P0 bên dưới quyết định kết luận.

## 3. Phát hiện nghiêm trọng (P0)

| ID | Phát hiện | Trạng thái bằng chứng |
|---|---|---|
| **ARC-001** | CI `web` trên `main` **đỏ 4 lần liên tiếp** (run #286, #288, #290, #292). Ở run #292 (HEAD `c27f39e1`), bước "Thuật ngữ ngành hardcode" đỏ nên **`npm test`, `test:tenant`, `test:platform`, `build` đều bị SKIP**. Đồng thời `render.yaml` đặt `autoDeploy: true` trên `main` và không phụ thuộc CI → mã chưa qua cổng cách ly tenant bắt buộc vẫn được đưa lên production. | Verified (GitHub Actions run #292; các run #286–#290 xác minh kết luận `failure`, chưa xem chi tiết job) |
| **ARC-002** | Hồ sơ bàn giao ghi rõ: tài khoản production `siinstore@dev.vn`, `owner@siinstore.local`, `tuans2@dev.com` (superadmin nền tảng) **vẫn dùng mật khẩu seed nằm trong lịch sử repo công khai**, và mật khẩu CSDL đã lộ qua ảnh chụp màn hình — các ô việc chưa được tích. | Not Verified (trạng thái vận hành nằm ngoài repo; tài liệu cho thấy chưa làm) — giữ P0 tới khi PO xác nhận |

## 4. Rủi ro lớn (P1)

- **ARC-003** — `requirePlatformContext` cấp toàn bộ mã nền tảng `N1…N12` cho **bất kỳ email đuôi `@dev.com`** hoặc cookie `smeos_dev_role` do client tự đặt khi `NODE_ENV !== "production"`. Đăng ký là công khai → mọi môi trường staging/preview/dev bị lộ ra Internet đều có console xuyên tenant mở cho người lạ.
- **ARC-004** — `next.config.ts`: `typescript.ignoreBuildErrors: true`. Kết hợp ARC-001, lỗi kiểu có thể lên production.
- **ARC-005** — Chỉ có một môi trường (production); lệnh build chạy migration + seed thẳng vào CSDL production; migration không có đường lùi; sao lưu/PITR và diễn tập khôi phục **chưa kiểm chứng**.
- **ARC-006** — Kho tệp tự lùi về đĩa cục bộ khi thiếu biến `STORAGE_*` (chỉ ghi cảnh báo); `env.ts` không bắt buộc các biến này dù tài liệu nói "bắt buộc" → mất ảnh sau mỗi lần deploy nếu cấu hình sai.
- **ARC-007** — Kiến trúc tích hợp phân mảnh: danh mục Hub đánh dấu eSMS, Zalo ZNS, Telegram, SePay là "MANAGED" nhưng registry đầu nối chỉ có 2 đầu nối thử; mã kênh thật nằm trong `greeting-card/adapters`; Telegram Bot API viết hai lần; kênh SMS/Zalo/Web Push của mô-đun thông báo là stub; không có cổng thanh toán (chỉ khớp chuyển khoản SePay).
- **ARC-008** — Mô hình 4 tầng chưa trọn: tầng Ngành không có dữ liệu (enum `organization_type` không có `INDUSTRY`, vai `industry_admin` không phải vai hệ thống), sự kiện thông báo gửi tới vai không tồn tại; 3/6 ma trận quản trị chỉ lưu, chưa áp.
- **ARC-009** — Worker Python gọi thẳng OpenAI/fal/Stability/Replicate, tự ghi `ai_requests`; sàn riêng tư và lọc giấy phép của `callCapability` không áp ở đường này.
- **ARC-011** — Bảo vệ dữ liệu cá nhân (Nghị định 13/2023): đồng ý, hạn lưu, xoá dữ liệu khách cuối vẫn là quyết định mở D13.
- **ARC-028** — Gói bàn giao khách thiếu SLA, hướng dẫn quản trị, hướng dẫn người dùng chính thức, quy trình nâng cấp; runbook còn nhiều mục [CẦN XÁC NHẬN].
- **ARC-033** *(giai đoạn 4)* — Gói dịch vụ không được thực thi: không route nào gọi `requireFeatureAccess`; tổ chức không có gói được coi là `PRO`.
- **ARC-034** *(giai đoạn 4)* — Ba mô hình Chuỗi → Cửa hàng song song (`chain_partnerships`, `chain_branches`, `branches`); cửa hàng tạo theo mô hình `chain_branches` nằm ngoài khoá/ma trận của tầng trên.
- **ARC-035** *(giai đoạn 4)* — Phạm vi quyền (`BRANCH`) bị bỏ khi dựng `TenantContext`; nhân viên chi nhánh có phạm vi toàn tổ chức ở mọi mô-đun không tự lọc.
- **ARC-041** *(hệ sinh thái)* — Ranh giới sở hữu giữa core, LocalBudd, SocialFlow chưa chốt.

Tổng: **43 phát hiện** — 2 P0, 13 P1, 24 P2, 4 P3 (39 cấp repo, 4 cấp hệ sinh thái).

## 5. Điểm mạnh đã kiểm chứng

- Cách ly tenant ở tầng repository (`scopedWhere`/`scopedData`/`ownedByTenant` — `src/core/tenancy/tenant-context.ts`), `organization_id` chỉ lấy từ phiên phía máy chủ; truy cập chéo → 404.
- Phân quyền 3 lớp (mặc định vai → ngoại lệ tổ chức → trần cứng) với 163 mã, 49 mã có trần cứng (`src/core/rbac/`); test kiến trúc bắt route mới thiếu gác (`tests/unit/architecture/route-capability-guard.test.ts`).
- 137 tệp test cách ly tenant chạy trên Postgres thật + 10 tệp cách ly console nền tảng.
- Bảo mật nền: token phiên băm, bcrypt cost 12, cookie HttpOnly/Secure/SameSite, AES-256-GCM + HKDF cho bí mật tích hợp, chữ ký webhook Facebook/Zalo (AUD-028 đã sửa), rate-limit 40/44 route công khai + auth, gitleaks toàn lịch sử, CodeQL, `npm audit`.
- `check:docs` đối chiếu hai chiều đặc tả API/CSDL với mã — chạy trong audit này: **"✓ Tài liệu khớp mã."**
- CI có kiểm migration khớp `schema.prisma`; deploy bằng `prisma migrate deploy`.

## 6. Đánh giá sẵn sàng (chi tiết ở `03` §17)

| Hạng mục | Kết luận |
|---|---|
| Đầy đủ kiến trúc | Một phần |
| Đúng đắn kiến trúc | Một phần (lõi đúng; tích hợp, tầng Ngành, AI worker lệch) |
| Nhất quán kiến trúc | Thấp–Trung bình |
| Hoàn thiện triển khai | Một phần |
| Sẵn sàng bảo mật | **Chưa** (P0 ARC-002; P1 ARC-003) |
| Sẵn sàng production | **Chưa** (ARC-001, 004, 005, 006) |
| Sẵn sàng thương mại | **Chưa** |
| Sẵn sàng enterprise | **Chưa** |
| Sẵn sàng bàn giao khách | **Chưa** |

## 7. Năm việc phải làm trước tiên

1. Đưa `main` về xanh và **chặn Render deploy khi CI đỏ** (tắt `autoDeploy` hoặc deploy hook sau CI; ruleset nhánh bắt buộc `web`, `worker`, `e2e-ux`, `security`) — ARC-001.
2. Xoay mật khẩu các tài khoản seed và mật khẩu CSDL; xác nhận bằng văn bản — ARC-002.
3. Gỡ cửa hậu `@dev.com`/cookie khỏi `requirePlatformContext` hoặc gác thêm biến cờ tường minh — ARC-003.
4. Bỏ `ignoreBuildErrors`, tạo môi trường staging, kiểm chứng sao lưu + diễn tập khôi phục — ARC-004/005.
5. Bắt buộc `STORAGE_*` ở production (fail-fast) — ARC-006.

## 8. Tiến độ theo 7 giai đoạn audit

| GĐ | Công việc | Trạng thái | Tài liệu |
|---|---|---|---|
| 1 | Repository Discovery | ✅ `ALG` | `02`, `07` |
| 2 | Architecture Inventory | ✅ `ALG` | `02`, `12` (As-Is) |
| 3 | Audit chi tiết 15 nhóm | ✅ | `03`, `05`, `06`, `07` |
| 4 | Audit nhất quán xuyên 4 tầng | ✅ | `13` |
| 5 | Gap & Risk | ✅ `ALG` + điểm tiếp giáp hệ sinh thái | `04`, `08`, `14` |
| 6 | Target Architecture | ✅ đề xuất, **chờ PO duyệt** | `09` |
| 7 | Báo cáo tổng thể + roadmap | ✅ | `01`, `10`, `11` |

Ba điều kiện trước khi nâng cấp: **As-Is** (`12`) và **Gap & Risk** (`04`, `08`, `13`) đủ cho `smeOS`; **To-Be** (`09`) chờ PO duyệt cùng 4 quyết định nêu ở `10` mục "Cổng quyết định". Audit mã bên trong các repo khác (LocalBudd, SocialFlow, floraos-core, floraos-v1) chưa làm theo chỉ đạo tập trung `smeOS` (`14` §4).

## 9. Giới hạn của audit

- Container audit **không có `node_modules` và `pytest`**; cài dependency bị cấm trong phạm vi audit → không chạy lại được typecheck/unit/tenant/platform/build/pytest cục bộ. Dùng kết quả CI thật trên GitHub (run #292) làm bằng chứng gate. Chỉ chạy được `node scripts/check-docs.mjs` (đạt) và `node scripts/handover-check.mjs` (đạt, 4 cảnh báo).
- Không truy cập được Render, CSDL production, Sentry, kết quả CodeQL, cấu hình GitHub ruleset → các mục vận hành ghi **Not Verified**.
- Repo anh em (`LocalBudd`, `SocialFlow`, `FloraOS` v1) ngoài phạm vi phiên → không đánh giá.
- Không kiểm thử xâm nhập, không kiểm tải, không duyệt giao diện bằng trình duyệt.
