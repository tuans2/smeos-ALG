# 14 — Audit cấp hệ sinh thái (nhìn từ ALG)

> Theo chỉ đạo: **tập trung repo `ALG`**. Tài liệu này chỉ đánh giá **điểm tiếp giáp** giữa `ALG` và các repo khác dựa trên mã của `ALG`; **không** audit mã bên trong các repo khác. Mọi kết luận về phía repo khác là **Not Verified**.

## 1. Danh mục repo liên quan

| Repo | Vai trò theo tài liệu `ALG` | Quyền truy cập trong phiên | Đã audit mã? |
|---|---|---|---|
| `antranhub22/smeOS` | Lõi hiện tại (web, API, worker, CSDL) | Có | ✅ |
| `antranhub22/floraos-core` | Tên cũ của lõi trước khi đổi thương hiệu (commit cuối 22/10/2026, công khai) | Có (chưa thêm vào phiên) | ❌ |
| `antranhub22/localbudd` | M05 Landing, M06 Catalog/QR — bản song song với bản trong lõi; chủ sở hữu chưa chốt (RS-3) | Có (chưa thêm) | ❌ |
| `antranhub22/floraos-v1` | v1 nghỉ hưu, phục vụ AVI GIFT tới ngày cắt; nguồn thu hoạch | Có (chưa thêm) | ❌ |
| `SocialFlow` | M07 đăng bài, số liệu nền tảng | **Không thấy** trong danh sách repo truy cập được | ❌ |
| `AVI-GIFT`, `ALG_Internal_Tool`, `LocalTrove` | Chưa rõ thuộc nền tảng | Có | ❌ |

## 2. Bề mặt tiếp giáp do ALG cung cấp / sử dụng

| Bề mặt | Phía ALG | Cơ chế bảo vệ | Hiện trạng production |
|---|---|---|---|
| Integration API `/api/v1/integration/*` (9 nhóm: assets, brand-profile, business-profile, capabilities, catalog-links, content-metrics, jobs, products, usage) | `modules/integration` — token máy-máy (cấp/xoay/thu hồi, `F9`/`N8`), `boundary-capabilities.ts` | Token băm, phạm vi theo năng lực | Có route; có client nào đang gọi: **NV** |
| SSO liên-app | `modules/sso/infra/sso-jwt.ts` — JWT HS256 viết tay, khoá `SSO_SESSION_SECRET`, cookie `smeos_sso` + tên cũ `floraos_sso` | Ký đối xứng, kiểm `exp`, header cố định | Khoá dùng chung giữa các app; **không có `aud`/`iss`** |
| Proxy `/api/v1/proxy/[...path]` | `modules/proxy` — whitelist tiền tố cho `SOCIALFLOW`/`LOCALBUDD`, timeout 120 s, chuyển tiếp header SSO | Whitelist + phiên | `SOCIALFLOW_URL`/`LOCALBUDD_URL` **không khai trong `render.yaml`** → proxy không hoạt động trên production |
| Catalog links | `modules/catalog-links` — core là chủ duy nhất `catalog_links` (RS-1..11) | Integration API | Hai bản Catalog/QR (core và LocalBudd) cùng tồn tại |
| Dữ liệu tenant dùng chung | `organization_id` do core phát; SocialFlow nhận qua D1-b (đa tenant thật) | — | D1 phía SocialFlow mới làm phần `accounts` (TRANG_THAI §6): **NV** |
| Dev cục bộ | `npm run dev:all` khởi `../SocialFlow`, `../LocalBudd` | — | Phụ thuộc cấu trúc thư mục máy dev |

## 3. Phân loại lỗi: cấp repo vs cấp hệ sinh thái

### 3.1 Cấp repo `ALG` (sửa được trong repo này)
ARC-001 … ARC-039 trừ các mục ở 3.2. Toàn bộ danh sách ở `08`.

### 3.2 Cấp hệ sinh thái (cần quyết định/thay đổi ở nhiều repo)

| ID | Mức | Phát hiện | Repo liên quan |
|---|---|---|---|
| **ARC-040** | P2 | SSO dùng một khoá đối xứng chung, không `aud`/`iss`: bất kỳ app nào giữ khoá (hoặc bị lộ khoá) đều tự ký được phiên cho mọi người dùng/tổ chức ở core; token của app này dùng được ở app khác | ALG, LocalBudd, SocialFlow |
| **ARC-041** | P1 | Ranh giới sở hữu chưa chốt: hai bản Landing/Catalog/QR (core và LocalBudd, RS-3); SocialFlow chưa đa tenant đầy đủ (D1); LocalBudd còn 4 bảng trùng với core (`products`, `product_assets`, `generation_jobs`, `projects` — TRANG_THAI §6) | ALG, LocalBudd, SocialFlow |
| **ARC-042** | P2 | Hai repo lõi cùng tồn tại công khai (`smeOS`, `floraos-core`) — chưa rõ repo nào là nguồn deploy, có chung lịch sử bí mật/mật khẩu seed hay không (liên quan ARC-002) | smeOS, floraos-core |
| **ARC-043** | P2 | Đường tích hợp liên-app (proxy, SSO) không được cấu hình trên production, không có test end-to-end liên repo; trạng thái "đã xong" ở TRANG_THAI (P15) chưa được xác minh trên môi trường thật | ALG + 2 app |
| (ARC-011) | P1 | Dữ liệu cá nhân khách cuối nằm ở nhiều repo → đồng ý/xoá phải xuyên repo | tất cả |
| (ARC-028) | P1 | Gói bàn giao chưa nói rõ khách nhận repo nào | tất cả |

## 3b. Cập nhật sau quyết định D-36 (01/11/2026)

PO chọn phạm vi chỉ `ALG` và yêu cầu kiểm có bỏ được LocalBudd, SocialFlow không. Đã đọc mã `localbudd` (commit `9b55cb9`) và rà mọi tham chiếu trong `ALG`. Kết luận (chi tiết ở `15_PO_DECISION_REGISTER.md` §3):
- **LocalBudd: bỏ được** — app độc lập, không gọi `ALG`; `ALG` đã có landing/catalog/QR/content engine riêng; phần còn sót trong `ALG` chỉ là mã chờ LocalBudd làm client.
- **SocialFlow: chưa bỏ được** — đăng bài tự động, lịch đăng, kết nối tài khoản MXH vẫn gọi SocialFlow qua proxy; trên production đang lỗi vì thiếu `SOCIALFLOW_URL`. Cần quyết định D-46.
- `floraos-core`: PO quyết archive (D-37).

## 4. Việc cần để hoàn tất audit hệ sinh thái

1. PO xác nhận danh sách repo thuộc nền tảng và vị trí `SocialFlow`.
2. PO xác nhận `floraos-core` đã ngừng (archive) hay còn chạy.
3. Thêm từng repo vào phiên (chỉ đọc) và chạy giai đoạn 1–3 cho mỗi repo; sau đó đối chiếu liên repo: SSO, Integration API contract (phía client), bảng trùng, đường dữ liệu PII.

Cho tới khi làm các bước trên, điểm sẵn sàng cấp hệ sinh thái được ghi **Not Verified**.
