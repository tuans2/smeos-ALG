# ALG Core — As-Is System Specification

> **Trạng thái tài liệu:** `SUPPORTING` · ảnh chụp hiện trạng (snapshot) dựng từ mã nguồn.
> **Mốc mã nguồn:** nhánh `main` tại commit `9b4a54b` (07/10/2026).
> **Nguồn sự thật về trạng thái dự án vẫn là** [`../TRANG_THAI.md`](../TRANG_THAI.md); tài liệu này **không** thay thế nó và không phải đặc tả đích.
> Bộ tài liệu chỉ trả lời một câu hỏi: **"Webapp này thực tế đang có gì và hoạt động như thế nào?"** — không đánh giá, không đề xuất, không suy diễn yêu cầu.

## 0. Phương pháp và giới hạn

### 0.1 Nguồn bằng chứng

| Nguồn | Cách dùng |
|---|---|
| `prisma/schema.prisma` (90 model, 45 enum) | Đối tượng dữ liệu, quan hệ, index, enum trạng thái |
| `src/app/**/page.tsx`, `layout.tsx` (54 trang) | Kiểm kê màn hình |
| `src/app/api/**/route.ts` (242 tệp route) | Kiểm kê API, xác thực, mã quyền |
| `src/modules/*/{domain,use-cases,infra,adapters}` (29 module) | Chức năng, luật nghiệp vụ, máy trạng thái |
| `src/core/*` | Tenancy, RBAC, AI gateway, HTTP, lưu trữ, nhật ký |
| `workers/` (Python) | Xử lý job nền |
| `render.yaml`, `docker-compose.yml`, `.github/workflows/ci.yml`, `.env.example`, `src/lib/env.ts` | Cấu hình, triển khai, CI |
| Tài liệu trong `docs/` | Chỉ dùng để ghi nhận mâu thuẫn với mã, không dùng làm bằng chứng hành vi |

Quy mô đo được: 1.504 tệp `.ts/.tsx` không phải test trong `src/` (~179 nghìn dòng), 381 component `.tsx` trong `src/components/`, ~16,6 nghìn dòng Python trong `workers/` (không tính test).

Một số bảng được **sinh bằng script dò tĩnh** (dò `requireCapability(...)`, dò chuỗi `/api/v1/...` trong mã giao diện, dò import). Các phép dò này có thể bỏ sót URL được ghép động; những trường hợp dò không thấy đã được kiểm lại bằng `grep` tay và ghi rõ.

### 0.2 Những gì KHÔNG được xác minh

- **Không chạy ứng dụng.** Môi trường phân tích không có `node_modules`, không có Postgres, không có khoá nhà cung cấp. Mọi hành vi lúc chạy (render giao diện, phản hồi API thật, worker xử lý thật, gọi nhà cung cấp AI thật) là **NOT VERIFIED**.
- **Không chạy test.** Kết quả `npm test`, `test:tenant`, `pytest` là **NOT VERIFIED** trong lượt phân tích này.
- **Ba repo liên quan** (`LocalBudd`, `SocialFlow`, `FloraOS` v1) không có trong môi trường; mọi hành vi phía chúng là **NOT VERIFIED**.
- **Hạ tầng thật** (dịch vụ Render đang chạy, tên miền, bucket lưu trữ, dữ liệu production) là **NOT VERIFIED**.

### 0.3 Nhãn trạng thái dùng xuyên bộ tài liệu

| Nhãn | Nghĩa trong tài liệu này |
|---|---|
| **Implemented** | Có đường mã liền mạch: màn hình (hoặc bên gọi ngoài có chủ đích) → API → use-case → bảng dữ liệu/worker. Xác minh **tĩnh**, chưa chạy. |
| **Partially Implemented** | Có mã nhưng thiếu một mắt: không có màn gọi, có nhánh giả lập/dữ liệu mẫu cứng, hoặc chỉ một phần thao tác có đường gọi. |
| **Referenced but not implemented** | Được khai báo/nhắc tới (mã quyền, enum, bảng, tên feature, mục điều hướng) nhưng không có mã thực thi. |
| **Dead/unused code** | Mã tồn tại nhưng không có tệp production nào gọi tới (chỉ test hoặc không ai gọi). |
| **NOT VERIFIED** | Không xác định được từ mã nguồn hiện có. |

## Mục lục

| # | Tệp | Nội dung |
|---|---|---|
| 1 | [01-tong-quan-he-thong.md](01-tong-quan-he-thong.md) | System overview, kiến trúc, thành phần |
| 2 | [02-vai-tro-va-quyen.md](02-vai-tro-va-quyen.md) | Vai trò, cơ chế quyền, quyền theo vai |
| 2a | [02a-ma-tran-quyen.md](02a-ma-tran-quyen.md) | Ma trận đủ 151 mã năng lực × 8 vai hệ thống |
| 3 | [03-kiem-ke-module.md](03-kiem-ke-module.md) | Capability / module inventory |
| 4 | [04-kiem-ke-chuc-nang.md](04-kiem-ke-chuc-nang.md) · [04b-kiem-ke-chuc-nang-ban-hang.md](04b-kiem-ke-chuc-nang-ban-hang.md) | Function inventory: (A) nền tảng, sản phẩm, AI, nội dung · (B) bán hàng, vận hành, kênh, nền tảng |
| 5 | [05-luong-nguoi-dung.md](05-luong-nguoi-dung.md) | User flows / business flows |
| 6–7 | [06-doi-tuong-va-trang-thai.md](06-doi-tuong-va-trang-thai.md) | Business objects, status & state model |
| 8 | [08-man-hinh.md](08-man-hinh.md) | UI / view inventory |
| 9 | [09a-api-a-i.md](09a-api-a-i.md) · [09b-api-j-w.md](09b-api-j-w.md) | API inventory (242 tệp route) |
| 10 | [10-csdl-va-luong-du-lieu.md](10-csdl-va-luong-du-lieu.md) | Database & data flow |
| 11 | [11-tich-hop.md](11-tich-hop.md) | Integrations |
| 12 | [12-bao-mat.md](12-bao-mat.md) | Security & access control — as-is |
| 13 | [13-loi-va-quan-sat.md](13-loi-va-quan-sat.md) | Error handling & observability — as-is |
| 14 | [14-cau-hinh-trien-khai.md](14-cau-hinh-trien-khai.md) | Configuration & deployment |
| 15 | [15-tai-lieu.md](15-tai-lieu.md) | Documentation inventory |
| 16 | [16-quan-sat-hien-thuc.md](16-quan-sat-hien-thuc.md) | Implementation observations + mâu thuẫn tài liệu ↔ mã |
| 17 | [17-ban-do-nang-luc.md](17-ban-do-nang-luc.md) | Final as-is capability map + system map |

## Quy ước

- Đường dẫn tệp tính từ gốc repo. Mã năng lực viết dạng `R1`, `H3`… như trong `src/core/rbac/capability-catalog.ts`.
- Tên vai hệ thống (khoá `roles.key`): `dieu_hanh` (Điều hành), `dieu_phoi` (Điều phối), `sale`, `product_manager`, `marketing`, `crm`, `customer_service`, `experience_user`.
- Endpoint viết không kèm tiền tố `/api/v1` khi đã rõ ngữ cảnh.
