# 06 — AUDIT 04: Security Scanning

> Chỉ đọc. Không đổi cài đặt bảo mật. Không in giá trị bí mật — mọi chuỗi nghi vấn đã che.
> Một quét **thiếu** không được coi là kết quả **sạch**.

## 1. Security scanning architecture

```
PR / push main
 ├─ ci.yml › security  : gitleaks 8.21.2 (tải binary + kiểm SHA256, quét TOÀN lịch sử, --redact, exit 1)
 │                       npm audit --omit=dev --audit-level=high
 ├─ codeql.yml         : CodeQL js-ts + python, security-extended → upload SARIF lên Code Scanning
 │                       (HIỆN THẤT BẠI: "Code scanning is not enabled for this repository")
 ├─ ci.yml › web       : test:tenant / test:platform (cách ly tenant, RBAC) · route-capability-guard (unit)
 └─ dependabot.yml     : PR cập nhật npm / pip / actions (bỏ qua major)
Không có: pip-audit, dependency-review, secret scanning push protection (chưa xác minh), DAST, quét container.
```

## 2. Security tool inventory

| Công cụ | Cấu hình | Có chạy? | Có kết quả dùng được? | Chặn merge? |
|---|---|---|---|---|
| gitleaks | `ci.yml:115-123`, `.gitleaksignore` 34 dòng | ✅ mọi run (30–57 s) | ✅ exit 0 trên `main` | ❌ không (main không được bảo vệ — CI-01) |
| npm audit | `ci.yml:129-130` | ✅ | ✅ 0 high/critical prod | ❌ |
| CodeQL | `codeql.yml` | ⚠️ chạy phân tích nhưng **job kết thúc "configuration error"** | ❌ **không upload, không alert** | ❌ |
| Dependabot | `.github/dependabot.yml` | ✅ (có nhánh `dependabot/pip/...`) | Trạng thái Dependabot alerts **chưa xác minh** | — |
| GitHub secret scanning / push protection | cài đặt repo | **Không xác minh được** | — | — |
| Kiểm thử bảo mật tự viết | `tests/tenant` (215), `tests/platform` (14), `tests/unit/architecture/route-capability-guard.test.ts` | ✅ (cổng bắt buộc) | ✅ | ❌ |

## 3. Scanning coverage matrix

| Rủi ro | Công cụ có thể phát hiện | Bao phủ thực tế trên `main` hôm nay |
|---|---|---|
| SQL injection | CodeQL `js/sql-injection`, `py/sql-injection` | ❌ CodeQL không ra kết quả · gián tiếp: Prisma tham số hoá; `$executeRawUnsafe`/`$queryRawUnsafe` không có quét riêng |
| XSS | CodeQL `js/xss`, `js/reflected-xss` | ❌ · CSP chỉ **Report-Only** (`next.config.ts:15`) |
| Authentication | không có SAST chuyên biệt | ⚠️ test tenant/platform một phần |
| Authorization / IDOR / cross-tenant | CodeQL **không** mô hình hoá được quy tắc tenancy | ✅ `test:tenant`, `test:platform`, route-capability-guard (kiểm thử, không phải quét) |
| Insecure deserialization | CodeQL `py/unsafe-deserialization` | ❌ |
| Path traversal | CodeQL `js/path-injection`, `py/path-injection` | ❌ |
| Command injection | CodeQL `js/command-line-injection`, `py/command-line-injection` | ❌ (worker gọi `ffmpeg`) |
| Sensitive data exposure / log | CodeQL `js/clear-text-logging` | ❌ · gitleaks chỉ cho bí mật trong git |
| SSRF / URL host check | CodeQL `js/request-forgery`, `js/incomplete-url-substring-sanitization` | ❌ (PR #189 nói có 10 cảnh báo URL host check — **chưa xác minh** vì không đọc được alert) |
| Bí mật trong mã | gitleaks | ✅ (sau khi push) |
| Dependency npm | npm audit | ✅ high/critical prod · ❌ moderate & dev |
| Dependency Python | — | ❌ không có quét nào trong CI |
| Workflow/Actions | — | ❌ không có (vd. zizmor/actionlint) |

## 4. Verified security findings

| ID | Mức | Phát hiện | Bằng chứng |
|---|---|---|---|
| **SEC-01** | HIGH | **CodeQL không tạo kết quả.** Mọi run CodeQL kể từ ~13:14 UTC 07/11/2026 đỏ: `CodeQL job status was configuration error` · `Code scanning is not enabled for this repository`. SARIF không được upload; tab Code Scanning không có dữ liệu mới. Repo hiện **private** (`list_repos`) trong khi `codeql.yml:1` ghi "miễn phí cho repo công khai" ⇒ nhiều khả năng mất quyền Code Scanning khi chuyển private mà không có GitHub Advanced Security / Code Security. Hệ quả kép: (a) 0 SAST trên `main`; (b) với `checksPass`, check đỏ này có thể chặn mọi deploy Render (xác minh trên Render). | run `42380675610` (main `87f30f2`), `42380664264`, `42378432581` |
| **SEC-02** | MEDIUM | Không có quét lỗ hổng dependency Python trong CI (không `pip-audit`/`safety`), trong khi workers không lock phiên bản (DEP-01) và xử lý file người dùng (ảnh, video, `ffmpeg`, `onnxruntime`). | `ci.yml:145-160` |
| **SEC-03** | MEDIUM | `ci.yml` và `ui-weekly.yml` không khai báo `permissions:` ⇒ `GITHUB_TOKEN` nhận quyền mặc định của repo (không xác minh được là read hay write). Least-privilege không được mã hoá trong workflow. `codeql.yml:13-22` làm đúng. | đọc tệp |
| **SEC-04** | MEDIUM | Phát hiện bí mật chỉ **sau khi push** (gitleaks trên CI). Với repo private, push protection cần GitHub Secret Protection — **không xác minh được** đã bật. Không có hook pre-commit quét bí mật (`scripts/setup-hooks.ts` không chứa gitleaks). Một bí mật lọt vào lịch sử thì đã nằm trên remote khi CI đỏ. | `scripts/setup-hooks.ts`, `ci.yml:115` |
| SEC-05 | LOW | Action bên thứ ba ghim bằng **tag** (`@v4`, `@v5`, `@v3`), không bằng SHA commit. Binary gitleaks thì được kiểm SHA256 (tốt). | `ci.yml:48,49,112,124,152,205`, `codeql.yml:28-38` |
| SEC-06 | INFO | Tenancy/IDOR được bảo vệ bằng kiểm thử, không bằng quét tĩnh — hợp lý, nhưng phải giữ là cổng bắt buộc thật (phụ thuộc CI-01). | §3 |
| SEC-07 | INFO | Log CI in mật khẩu tài khoản mẫu dev (Siin Store) khi `db:seed`. Đây là dữ liệu dev đã công khai trong git (`prisma/seed/sync-siin-store.ts`), production bị chặn bởi `devSeedEnabled` (`prisma/seed.ts:35`, `render.yaml:62-63`). Không phải rò rỉ bí mật production. | log job `128426037333` |

Kiểm tra thủ công đã làm (kết quả sạch, không phải bằng chứng tuyệt đối):
- Mẫu khoá phổ biến (OpenAI/Anthropic/AWS/GitHub/Slack/Google/Replicate/private key) trên mọi tệp git theo dõi trừ `docs/` và lockfile: 1 kết quả — `src/modules/assets/domain/__tests__/sigv4.test.ts:20` là **khoá ví dụ công khai của AWS** (`AKIAIOSF…`, test vector SigV4) ⇒ báo nhầm.
- Chỉ `.env.example` được theo dõi; `.env*`, `*.pem`, `*.key`, `secrets/` nằm trong `.gitignore`.
- Bí mật Render: khoá phiên/ký sinh bằng `generateValue`, khoá nhà cung cấp `sync: false`, `PII_ENCRYPTION_KEY` đặt tay có sao lưu (`render.yaml:76-80`).
- Biến `NEXT_PUBLIC_*` (vào bundle client): `APP_ENV`, `APP_URL`, `PRIVACY_NOTICE_ENABLED`, `TURNSTILE_SITE_KEY` (site key vốn công khai), `VERCEL_ENV` — không có bí mật.
- CI dùng giá trị giả rõ ràng (`ci-only-not-a-real-secret`) và mạng bị chặn trong test (`tests/setup.ts`).

## 5. Configuration and workflow gaps

1. Code Scanning tắt/không khả dụng ⇒ CodeQL vô hiệu (SEC-01). Một workflow chạy CodeQL nhưng **không upload** (hướng PR #189) **không tương đương** GitHub Code Scanning: không có alert, không lịch sử, không dismiss có kiểm soát; chỉ là gate cục bộ dựa trên SARIF artifact.
2. Kết quả quét không chặn merge (CI-01).
3. Thất bại cấu hình (CodeQL) và thất bại phát hiện lỗ hổng hiển thị giống nhau ("failure") — không có bước phân loại.
4. Không có quét Python, quét workflow, dependency review.
5. Ngưỡng `npm audit` bỏ qua moderate (DEP-03).

## 6. Security risk assessment

| Rủi ro | Khả năng | Ảnh hưởng | Mức |
|---|---|---|---|
| Lỗ hổng mã mới vào `main` không ai thấy (không SAST + merge đỏ được) | Cao (đang xảy ra từ 07/11) | Cao (SaaS đa tenant, dữ liệu cá nhân, nhận tiền) | HIGH |
| Lỗ hổng dependency Python không phát hiện | Trung bình | Trung bình–Cao | MEDIUM |
| Token workflow quyền rộng bị lạm dụng qua bước bị xâm nhập | Thấp | Cao | MEDIUM |
| Bí mật bị đẩy lên remote trước khi phát hiện | Thấp–Trung bình | Cao | MEDIUM |
| Action tag bị chiếm quyền (supply chain) | Thấp | Cao | LOW |

## 7. Recommended security controls (không thực thi)

1. **Quyết định của PO**: (a) bật GitHub Code Security cho repo private, **hoặc** (b) chấp nhận CodeQL không upload làm gate SARIF có baseline — và ghi rõ trong tài liệu rằng (b) không phải Code Scanning. Trong lúc chờ, tránh để check CodeQL đỏ vì cấu hình chặn deploy vô thời hạn mà không ai quyết định.
2. `permissions: contents: read` ở đầu `ci.yml` và `ui-weekly.yml`; cấp thêm theo job khi cần.
3. Thêm `pip-audit -r workers/requirements.txt` (sau khi lock — DEP-01).
4. Bật secret scanning + push protection (nếu gói cho phép); thêm hook pre-commit gitleaks tuỳ chọn cho dev.
5. Ghim action theo SHA, để Dependabot cập nhật SHA.
6. Phân loại lỗi: bước CodeQL in rõ "configuration" vs "findings"; ruleset chỉ bắt buộc check có ý nghĩa.

## 8. Security acceptance criteria

| Tiêu chí | Ngưỡng đo được |
|---|---|
| Source scanning | CodeQL (hoặc gate được PO duyệt) chạy trên 100 % PR và push `main`; SARIF tồn tại cho mọi run; 0 run "configuration error" trong 14 ngày |
| Phát hiện mới bị chặn | Phát hiện high/critical mới (so với baseline đã duyệt) ⇒ PR không merge được |
| Dependency npm | 0 high/critical prod (giữ); moderate prod có ticket ≤ 30 ngày |
| Dependency Python | Quét lỗ hổng chạy mỗi PR; 0 high/critical không có ngoại lệ ghi sổ |
| Secret detection | gitleaks toàn lịch sử xanh (giữ) + push protection bật (hoặc ghi rõ lý do không bật) |
| PR validation | Mọi check bảo mật nằm trong danh sách bắt buộc của ruleset |
| Alert visibility | Có một nơi duy nhất liệt kê phát hiện mở + chủ sở hữu + hạn |
| Least privilege | 100 % workflow có `permissions:` tường minh; không job nào có `write` không dùng |
| Remediation | Thời gian từ phát hiện high tới vá ≤ 7 ngày (đo theo ticket) |
