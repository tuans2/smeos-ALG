# Screen Contract — Trang chủ Quản lý cửa hàng (StoreManagerDashboard)

> **Lối vào tuyến khoá (12/11/2026, audit N-05):** khi `NEXT_PUBLIC_APP_ENV=production` bật khoá "Sắp ra mắt", lối vào tuyến khoá bị ẩn thay vì dẫn tới màn khoá (`isHrefOpen`, `src/lib/feature-lock.ts`). Dòng "Kết quả chờ duyệt" (sang `/duyet`) ẩn khi `/duyet` đang khoá. Khoá tắt (staging, bản giao GD1) giữ nguyên.

**Tuyến:** `/` · **Tệp chính:** `src/components/dashboard/store-manager-dashboard.tsx` · **Cập nhật:** 26/09/2026 · **Thẻ:** T5.A1

## 1. Vai và mục đích
- **Vai chính (03b):** `store_manager` (Quản lý điều hành cửa hàng hoa).
- **Phạm vi:** organization (toàn bộ hoạt động cửa hàng).
- **Việc chính:** Nắm bắt ngay những việc cần can thiệp trong ngày (P0: job lỗi, hàng chờ duyệt, đơn nháp) và theo dõi tình hình vận hành (P1: job đang chạy, sản phẩm mới, hạn mức credit).
- **Câu hỏi chính:** "Hôm nay cửa hàng cần tôi can thiệp ở đâu?"
- **Mật độ:** MEDIUM (P0 nổi bật ở đầu, trên 1280px chia 2 cột 2/3 : 1/3).

## 2. Hiện trạng (audit)
- **API gọi:**
  - `GET /api/v1/jobs?limit=10` → `G4` (`job.read`, `src/app/api/v1/jobs/route.ts:18`)
  - `GET /api/v1/products?limit=5` → `L1` (`product.read`, `src/app/api/v1/products/route.ts:28`)
  - `GET /api/v1/usage/summary` → `G8` (`usage.read`, `src/app/api/v1/usage/summary/route.ts:15`)
  - `GET /api/v1/vision/analyses?limit=1` → `H3` (`vision.approve`)
  - `GET /api/v1/media/optimizations?limit=1` → `I2` (`media.approve`)
  - `GET /api/v1/orders?status=DRAFT&limit=10` → `R1` (`order.read`, `src/app/api/v1/orders/route.ts:15`)
  - `POST /api/v1/jobs/:id/retry` → `G4`
- **Khối:** 4 khối chính (P0 Cần can thiệp, P1 Job, P1 Sản phẩm, P1 Mức dùng) + 1 cụm lối tắt (P2). Nút primary: 0 trên trang chủ (chỉ nút hành động tại dòng "Chạy lại job").
- **Trạng thái:** Tải (`SkeletonBlock`), rỗng (`EmptyState`), lỗi (`InlineError`), thành công (`announce()`).

## 3. Thứ bậc thông tin
| Lớp | Nội dung | Vị trí hiển thị |
|---|---|---|
| L0 Thiết yếu | P0 Cần can thiệp: số job lỗi, số mục chờ duyệt, số đơn nháp kèm danh sách mã đơn | Đỉnh trang, trong khung nhìn đầu tiên |
| L1 Hành động | Job đang chạy & nút Chạy lại job lỗi | Dưới P0 |
| L2 Ngữ cảnh | Danh sách 5 sản phẩm mới cập nhật + Xem tất cả; tiến trình credit | Cột phải (1280px) hoặc xếp sau (mobile) |
| L3 Chi tiết | Xem chi tiết đơn hàng, kho sản phẩm, xem trang duyệt | Chuyển trang qua router.push |
| L4 Nâng cao | Lối tắt Bộ máy phân tích ảnh, Nghiên cứu thị trường | Cụm P2 chân cột chính |

## 4. Hành động
- **Chính:** Nhấp vào mục can thiệp (chuyển sang `/duyet`, `/don-hang`, hoặc cuộn/focus vào `#khoi-job`).
- **Phụ:** "Chạy lại job" ngay tại chỗ; "Thêm sản phẩm" khi rỗng; "Xem tất cả →" sang `/san-pham`.
- **Lối tắt:** Nghiên cứu thị trường (`/market-intelligence`), Bộ máy phân tích ảnh (`/bo-may`).

## 5. Content budget
- Nút nổi: 0 (không spam nút nổi).
- Khối chính: 4 khối (P0, Job, Sản phẩm, Mức dùng) ≤ 5 khối theo chuẩn 03a §07.

## 6. Trạng thái
- Tải: `SkeletonBlock` dạng thanh shimmer mềm.
- Rỗng: Khi không có việc can thiệp, P0 báo "Không có việc cần can thiệp - Job, hàng chờ duyệt và đơn nháp đều đã được xử lý". Khi chưa có sản phẩm: `EmptyState` có nút "Thêm sản phẩm".
- Lỗi: `InlineError` hiển thị thông báo thân thiện kèm nút "Thử lại".
- 403: Không có quyền đọc khối nào thì ẩn khối đó, không hiện số 0 giả.

## 7. Responsive
- **390px (Mobile):** Xếp dọc 1 cột, nút can thiệp cao ≥ 44px, dễ chạm ngón cái.
- **768px (Tablet):** Bố cục 1 cột thoáng đãng, grid 2 cột cho lối tắt.
- **1280px (Desktop):** Lưới 3 cột: Cột trái (2/3) dành cho P0, Job và Lối tắt; Cột phải (1/3) dành cho Sản phẩm và Hạn mức credit.

## 8. Trợ năng
- Bàn phím: Nhấp "Job lỗi" tự động cuộn và focus vào `<Card id="khoi-job" tabIndex={-1}>`.
- Mọi nút bấm tương tác đều có `focus-visible:outline-2 focus-visible:outline-primary`.
- Khi retry job thành công, tự động phát loa qua `useAnnounce()`.

## 9. QA Matrix (03a §34)
| Chiều | Kết quả | Ghi chú |
|---|---|---|
| Vai | PASS | Chuẩn xác cho `store_manager` |
| Việc | PASS | Trả lời "Hôm nay cần can thiệp ở đâu?" |
| IA | PASS | Khung P0 → P1 → P2 chuẩn mực |
| Mật độ | PASS | 4 khối, không quá tải thông tin |
| Thứ bậc | PASS | L0 P0 đỉnh trang, L1–L2 theo sau |
| CTA | PASS | Đúng mục tiêu giải quyết ách tắc |
| Luồng | PASS | Nhảy trực tiếp vào các tuyến con |
| Trạng thái | PASS | Đủ tải / rỗng / lỗi / 403 ẩn |
| Responsive | PASS | 1280px chia 2/3 : 1/3 hoàn hảo |
| Trợ năng | PASS | Scroll + focus mượt mà, aria đầy đủ |
| Dữ liệu | PASS | Đếm từ API thật, không giả lập |
| Quyền | PASS | 403 ẩn khối, không hiện số 0 giả |
| Nhất quán | PASS | Dùng 100% token Semantic và font token |
