# ALG · 05 · Bảo mật, phân quyền & nhật ký (đối chiếu code 30/10/2026)

Áp dụng của [universal/05](../universal/05-security-authz.md). Nguồn: review cluster B/H (`39ea423`, `d73e148`), audit hệ thống 28/10 (`cff9ba7`…`d606655`, 613 commit), webhook (`a1e6b75`, AUD-028), CodeQL (`56783a0`, `0301a4d`), lỗ chéo tenant (`eb790f1`, AUD-042), capability (`61859c8`, `7bf51ba` J7).

## 1. Bản đồ code
| Thành phần | Vị trí |
|---|---|
| Phiên tenant | `requireTenantContext()` (`src/core/tenancy/`), `scopedWhere`/`scopedData`/`ownedByTenant` (`tenant-context.ts`) |
| Capability | `src/core/rbac/` — `capability-catalog.ts` (mã A1…E8 sinh từ bản harvest, + F, J, N…), `permission-resolver.ts` (3 lớp cắt), `requireCapability`/`hasCapability`; README `src/core/rbac/README.md` |
| Gác route | `tests/unit/architecture/route-capability-guard.test.ts` (`NO_CAPABILITY_GUARD` kèm lý do, chỉ co lại) |
| Mã nền tảng đáng nhớ | N1 xem mọi tổ chức / xem trước tầng · N2 thông báo nền tảng · N12 cờ UX · N14 legal hold · F1/F2 đọc/ghi cấu hình tổ chức · J1 đánh giá tiệm · J7 AI landing/catalog |
| SSRF | `src/lib/safe-remote-url.ts` (https công khai, không redirect, ≤ 8 MB) |
| XSS ảnh | `src/lib/safe-image-src.ts` (`safeImageSrc`) |
| Webhook | `src/core/http/webhook-signature.ts` — Facebook `X-Hub-Signature-256` (`FB_APP_SECRET`, `FB_WEBHOOK_VERIFY_TOKEN` bắt buộc); Zalo `X-ZEvent-Signature` + app_id + timestamp |
| Rate limit | `src/core/http/rate-limit.ts` (`enforceRateLimit`, `clientIp` theo số hop tin cậy); đăng ký 20/giờ/IP |
| Cron | `src/core/http/cron-auth.ts` (`isAuthorizedCronRequest`) |
| Bí mật trong DB | `src/core/security/secret-box.ts` — AES-256-GCM, HKDF theo `purpose` từ `INTEGRATION_TOKEN_SECRET`, dạng `v1.<iv>.<tag>.<ct>` |
| CSP | `src/core/http/csp.ts` + `src/proxy.ts` — nonce mới mỗi request, **chặn thật** (PO D-68, 12/11/2026), báo vi phạm về `/api/v1/public/csp-report`; `CSP_MODE=report-only` để tạm lùi |
| CSRF / Origin | `src/core/http/origin-guard.ts`, gọi trong `handle()`: lệnh ghi có cookie phiên + đăng nhập/đăng ký từ origin khác → 403 `CROSS_ORIGIN_REJECTED`; miễn trừ chỉ co lại (`ORIGIN_CHECK_EXEMPT_PREFIXES`); `ORIGIN_CHECK_MODE` `log`/`enforce` |
| Audit | `src/modules/audit/use-cases/` — `recordAuditLog`, `record-data-export.ts`; ~56 nơi gọi |

## 2. Trạng thái
| Mục | Trạng thái | Cưỡng chế |
|---|---|---|
| Cách ly tenant, 404 | ✅ | `npm run test:tenant` (121 tệp), `test:platform` |
| Route mới phải có gác capability | ✅ | `route-capability-guard.test.ts` |
| Route cũ chưa gác | 🟡 còn trong danh sách miễn trừ (nợ #170) | test đỏ nếu mục đã có gác mà còn nằm đó |
| Webhook FB/Zalo ký, fail closed | ✅ | `tests/unit/chat/chat-webhook-signature.test.ts` |
| SSRF, XSS ảnh, ReDoS | ✅ | CodeQL CI + unit test |
| Audit xuất dữ liệu | ✅ | `export-audit.test.ts` |
| CSP chặn thật | ✅ 12/11/2026 (nonce, `strict-dynamic`) | `tests/unit/core/http/csp.test.ts`, E2E toàn bộ ở chế độ chặn |
| Kiểm Origin cho lệnh ghi (ARC-022, PO D-25) | 🟡 mã xong 11/11/2026; production chạy `log` một tuần rồi đặt `ORIGIN_CHECK_MODE=enforce` | `tests/unit/core/http/origin-guard.test.ts`, `tests/tenant/origin-guard.test.ts` |
| Route GET không đổi trạng thái | ✅ | `tests/unit/architecture/get-no-side-effects.test.ts` |
| Quét CodeQL + gitleaks | ✅ CI (`.github/workflows/codeql.yml`, `.gitleaksignore`) | — |

## 3. Quy tắc cho agent
1. Route mới: `requireTenantContext()` + `requireCapability(ctx, "<mã>")`. Không có mã phù hợp → hỏi PO, không tự đặt mã. Route công khai có chủ đích → thêm vào `NO_CAPABILITY_GUARD` kèm lý do.
2. Server tải URL người dùng nhập → `safe-remote-url.ts`. `<img src>` từ dữ liệu người dùng → `safeImageSrc`.
3. Webhook mới → kiểm chữ ký raw body trước khi parse; thiếu bí mật thì 401/503, không chấp nhận.
4. Lưu token nhà cung cấp → `secret-box` với `purpose` riêng.
5. Thay đổi cấu hình, quyền, xoá vĩnh viễn, xuất dữ liệu → `recordAuditLog` (không ghi giá trị tìm kiếm).
5b. Route ghi mới đi qua `handle()`/`defineRoute` là có kiểm Origin; route xác thực KHÔNG bằng cookie phiên (webhook, Bearer, URL ký) mà nằm ngoài các tiền tố miễn trừ → thêm vào `ORIGIN_CHECK_EXEMPT_PREFIXES` kèm lý do. Không làm route `GET` đổi trạng thái.
5c. Script/iframe/nguồn ngoài mới (SDK, widget, CDN) → thêm đúng host vào `buildCsp` (`src/core/http/csp.ts`) kèm test; không viết `<script>` inline (dùng `next/script`). Trang phải render động (root layout chờ `connection()`), không ép tĩnh.
6. Nới tenancy, trần quyền, auth/SSO, nới CSP (thêm `'unsafe-inline'`/`'unsafe-eval'` cho script, mở host tuỳ ý) → hỏi PO (CLAUDE.md).
