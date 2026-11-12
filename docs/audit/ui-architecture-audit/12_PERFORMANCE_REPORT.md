# Hiệu năng tải trang — Web Vitals

> **Phạm vi:** giao diện ALG (Next.js 16, App Router) · **Lần đo:** 04/11/2026, commit `50988ae4`
> **Tệp kết quả:** [`perf/2026-11-04/web-vitals-50988ae4.json`](perf/2026-11-04/web-vitals-50988ae4.json) — từng lần đo, trung vị, cấu hình mô phỏng. Các lần đo trước: commit `8a0ac5e7` (trước khi tách icon) [`web-vitals-8a0ac5e7.json`](perf/2026-11-04/web-vitals-8a0ac5e7.json); commit `7ef1b830` (trước khi render phía máy chủ trang `/san-pham`) [`web-vitals.json`](perf/2026-11-04/web-vitals.json).
> **Loại số liệu:** số đo phòng thí nghiệm (lab) trên bản build production chạy cục bộ; không phải số đo người dùng thật.

## 1. Kết quả

Trung vị 5 lần đo mỗi tuyến, bộ đệm trình duyệt tắt, tài khoản cửa hàng có dữ liệu seed (6 sản phẩm có ảnh, một link gửi bộ sưu tập). `/van-hanh` đo bằng tài khoản có quyền vận hành nền tảng.

**Di động** — 390×844, CPU chậm 4×, mạng 4G mô phỏng (RTT 150 ms, 1,6 Mbps xuống, 750 kbps lên):

| Tuyến | LCP | CLS | TBT | INP | JS tải |
|---|---|---|---|---|---|
| `/` | 1.744 ms | 0 | 170 ms | 24 ms | 460 KB |
| `/san-pham` | 1.584 ms | 0 | 189 ms | 24 ms | 515 KB |
| `/dieu-phoi` | 1.772 ms | 0 | 233 ms | 16 ms | 597 KB |
| `/so-lieu` | 1.748 ms | 0,015 | 133 ms | 24 ms | 365 KB |
| `/b/[sendCode]` | 1.348 ms | 0 | 201 ms | < 16 ms | 494 KB |
| `/van-hanh` | 1.708 ms | 0 | 159 ms | 16 ms | 388 KB |

**Máy tính** — 1280×800, không giới hạn CPU và mạng:

| Tuyến | LCP | CLS | TBT | INP | JS tải |
|---|---|---|---|---|---|
| `/` | 244 ms | 0 | 0 ms | 16 ms | 460 KB |
| `/san-pham` | 260 ms | 0 | 0 ms | 16 ms | 515 KB |
| `/dieu-phoi` | 272 ms | 0,003 | 0 ms | 16 ms | 597 KB |
| `/so-lieu` | 208 ms | 0,008 | 0 ms | 16 ms | 365 KB |
| `/b/[sendCode]` | 172 ms | 0 | 0 ms | 16 ms | 494 KB |
| `/van-hanh` | 244 ms | 0 | 0 ms | 16 ms | 387 KB |

INP ghi "< 16 ms" khi tương tác chuẩn không sinh mục Event Timing nào vượt ngưỡng ghi nhận 16 ms của trình duyệt (trường `inpMs: null` trong tệp JSON).

## 2. Đối chiếu chỉ tiêu

| Chỉ số | Chỉ tiêu | Kết quả |
|---|---|---|
| LCP | ≤ 2,5 s ở 4G mô phỏng | Đạt 6/6 tuyến (cao nhất 1,77 s) |
| CLS | ≤ 0,1 | Đạt 6/6 tuyến (cao nhất 0,015) |
| INP | ≤ 200 ms | Đạt 6/6 tuyến (cao nhất 24 ms, một tương tác chuẩn) |

**`/san-pham`: 5,26 s → 1,58 s trên di động.** `page.tsx` là server component tải sẵn trang đầu danh sách bằng chính `requireTenantContext` và `listProducts` mà `GET /api/v1/products?limit=100` dùng (cùng kiểm phiên, khoá công cụ, năng lực `L1`), truyền cho phần client `san-pham-client.tsx`; HTML đầu tiên đã có thẻ sản phẩm, ảnh 4 thẻ đầu tải ngay với độ ưu tiên cao. Bộ lọc, tìm kiếm và tải thêm vẫn gọi API ở client.

**Icon: mỗi trang chỉ tải icon nó dùng.** Mỗi icon là một module trong `src/components/ui/icon-set/`, nơi dùng import thẳng module đó; `AppIcon` tra icon theo bảng `ICONS` khai báo tường minh, không tra theo namespace. Chunk icon dùng chung 836 KB (176 KB gzip, 236 icon) không còn; chunk icon lớn nhất của một tuyến còn 73 icon, 232 KB (44 KB gzip). JS tải ban đầu giảm ở các tuyến nhẹ: `/so-lieu` 463 → 365 KB, `/van-hanh` 495 → 388 KB, `/` 528 → 460 KB. TBT trên di động còn 133–233 ms ở mọi tuyến. Các tệp vùng PO khoá và các tệp trên 350 dòng còn import qua barrel `@/components/ui/icons`; `tests/unit/architecture/icon-imports.test.ts` giữ danh sách này không tăng.

**Context giao diện không đổi khi hydrate.** `UiSystemProvider` đọc density cá nhân từ localStorage sau khi gắn; `withStoredDensity` giữ nguyên object config khi giá trị trùng. Nếu context đổi trong lúc segment trang còn chờ chunk JS, React bỏ HTML máy chủ của segment và dựng lại phía client, phần tử LCP bị vẽ lại khi chunk cuối về (`/` di động: 3,79 s; giữ nguyên object: 1,74 s).

## 3. Phương pháp đo

1. Dựng bản production: `npm run build && npm run start` trên database đã chạy `npm run db:seed`.
2. Đo: `npx tsx scripts/measure-web-vitals.ts --runs 5 --grant-platform --out docs/audit/ui-architecture-audit/perf/<ngày>`, với `PERF_EMAIL`/`PERF_PASSWORD` của tài khoản có dữ liệu. Script dùng Playwright và `PerformanceObserver` của Chromium, không cần thư viện thêm:
   - LCP: mục `largest-contentful-paint` cuối cùng trước tương tác đầu tiên;
   - CLS: cửa sổ phiên lớn nhất (khoảng cách ≤ 1 s, độ dài ≤ 5 s);
   - TBT: tổng phần vượt 50 ms của long task sau FCP;
   - INP: thời lượng lớn nhất của các tương tác có `interactionId`; tương tác chuẩn là một lần nhấp vào `<h1>` sau khi trang tải xong.
3. Lưu tệp JSON vào `perf/<ngày>/`; tài liệu này chỉ ghi số có trong tệp đó.
4. Đo lại sau mỗi thay đổi lớn ở shell, theme, cách chia chunk hoặc tuyến công khai, và trên máy chủ staging khi có.
