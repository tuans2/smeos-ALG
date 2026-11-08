# Kiểm toán mức hoàn thiện tính năng — 06/11/2026

> Trạng thái: `SNAPSHOT` (ảnh chụp tại `main` @ `d8dd00d`). Không thay `docs/kien-truc/TRANG_THAI.md` — đó vẫn là nguồn sự thật về hiện trạng.
> Phương pháp: đọc mã thật, không tin checklist hay tài liệu. Mỗi chức năng được dò ở 5 tầng (UI · API · Backend · DB · Test), đối chiếu cờ khoá production (`src/lib/feature-lock.ts`) và Acceptance Criteria của bộ nghiệm thu.

| Tệp | Nội dung |
|---|---|
| [`01-ma-tran-123-chuc-nang.md`](01-ma-tran-123-chuc-nang.md) | Feature Completeness Matrix — 123 chức năng nghiệm thu, bằng chứng từng tầng |
| [`02-ma-tran-tuyen-va-module.md`](02-ma-tran-tuyen-va-module.md) | 114 trang giao diện (khoá/mở, có dữ liệu thật hay không) và 50 module backend |

## 1. Feature Inventory dùng để đối chiếu

- **Danh mục:** `docs/nghiem-thu/CHECKLIST_NGHIEM_THU_123_CHUC_NANG.xlsx`, sheet "Phủ 123 chức năng" — 10 nhóm, 123 mã (1.1 … 10.8).
- **Acceptance Criteria:** sheet "Kịch bản" — 141 bước (luồng A–J, S), cột "Kết quả mong đợi", gắn mã chức năng.
- **Lưu ý quan trọng:** cột "Kết quả", "Người chạy", "Ngày" của cả 140 bước đều **trống**. Chưa có lượt nghiệm thu thủ công nào được ghi lại, nên mọi kết luận ở đây là đối chiếu tĩnh với mã và kết quả bộ test tự động — không thay được lượt chạy kịch bản trên môi trường thật.

## 2. Kết quả tổng hợp

| Trạng thái | Nghĩa | Số chức năng |
|---|---|---:|
| ✅ Hoàn thiện | Đủ UI + API + backend + DB (khi cần) + test; tuyến mở trên production | **105** |
| 🔒 Có mã, khoá production | Mã đủ tầng nhưng màn hình của AC bị khoá "Sắp ra mắt" trên production | **13** |
| 🟡 Một phần | Thiếu một mắt xích, hoặc AC chỉ đạt một phần | **5** |
| 🎨 Chỉ có UI | Có giao diện, không có logic | **0** |
| ❌ Chưa triển khai | Không có route, bảng hay màn hình | **0** |
| 🐞 Lỗi | Chức năng trong danh mục chạy sai | **0** |

Cả 123 chức năng đều có mã thật. Phần chưa xong không nằm ở chỗ "chưa làm" mà ở **khoá production (13)** và **kênh/nhắc việc chưa nối (5)**. Các lỗi tìm thấy (mục 4) đều nằm **ngoài** 123 mã — ở những màn hình danh mục nghiệm thu không phủ tới.

**🔒 Khoá production (13):** 1.17 Nhật ký thao tác · 3.1 Quy tắc giá (`/gia`) · 4.11 Lịch sử đơn cùng khách (`/khach-hang`) · 4.12 Bảng điều phối rủi ro (`/dieu-phoi`) · 6.1 6.2 6.3 6.5 6.6 Báo cáo theo kỳ (`/bao-cao`) · 6.9 10.1 Sổ quỹ & credit (`/muc-dung`) · 9.6 Tác vụ nền (`/job`) · 9.7 Chính sách AI (`/cai-dat-ai`).

**🟡 Một phần (5):**

| Mã | Thiếu gì |
|---|---|
| 4.30 | Kênh báo nhân viên SMS, Zalo, Web Push là stub trả `NOT_CONFIGURED` (`notification/infra/channel-adapters/`); chỉ trong ứng dụng, email, Telegram chạy thật |
| 4.32 | Mốc nhắc M1/M2 trước giờ giao chỉ hiện ở thanh nhắc trong `/dieu-phoi` (người dùng tự mở trang mới thấy, không có tin đẩy); trang này khoá production |
| 8.1 | Trình dựng landing page (`/landing-page`) chạy, nhưng lối vào theo AC ("Công cụ → Tạo catalog") khoá production |
| 9.1 | Khung trao đổi trên đơn chạy; màn "Trao đổi nội bộ" `/tin-nhan` khoá production |
| 9.14 | JWT liên-app 15 phút có ở core; ứng dụng liên kết chưa sẵn: SocialFlow chưa nối core (nợ #45), `/lich-dang` và `/ket-noi` không chạy trên production |

## 3. Cổng kiểm tra đã chạy (máy kiểm toán, không phải CI)

| Cổng | Kết quả |
|---|---|
| `npm run typecheck` | ✅ 0 lỗi (cần `NODE_OPTIONS=--max-old-space-size=6144`; heap mặc định hết bộ nhớ trên máy kiểm toán) |
| `npm test` (unit) | ✅ 4.138/4.138 ca, 687 tệp — khi có CSDL `floraos` đã migrate + seed như CI (không có CSDL thì 27 ca chạm DB hỏng — lỗi môi trường) |
| `npm run test:tenant` | ✅ 876/876 ca, 193 tệp (CSDL cục bộ `floraos_test`, `prisma db push` như CI) |
| `npm run test:platform` | ✅ 43/43 ca, 14 tệp |
| Lint, `lint:ux`, build, E2E | Không chạy — kiểm toán không đổi mã |

Môi trường: `npm ci` bị chặn tải `xlsx` từ `cdn.sheetjs.com` (chính sách mạng của máy kiểm toán); test chạy với `xlsx@0.18.5` từ npm, đã khôi phục `package.json`/`package-lock.json`, không commit.

## 4. Phát hiện ngoài danh mục 123 chức năng

| # | Mức | Phát hiện | Vị trí | Hệ quả |
|---|---|---|---|---|
| L-01 | 🐞 | Mục menu "Trợ lý tối ưu" trỏ tới trang chưa từng tồn tại | `src/components/layout/nav/nav-store-entries.ts:89`, `src/modules/toolkit/domain/toolkit-catalog.ts:382` | Người có quyền `L6` bấm vào ra 404 |
| L-02 | 🐞 | Mục Console "Catalog toàn hệ thống" trỏ tới trang không tồn tại | `src/components/layout/nav/nav-mother.ts:87` (`/van-hanh/san-pham`) | Người vận hành bấm vào ra 404 |
| L-03 | ⚠️ | 11 tuyến khoá production chỉ bị làm mờ trên sidebar, không có `FeatureLockedGuard`: `/audit`, `/bao-cao`, `/dieu-phoi` (+`/doi-tac`), `/duyet`, `/job` (+`/[id]`), `/muc-dung`, `/so-lieu`, `/tin-nhan`, `/noi-bo/ket-noi` | so với `src/components/layout/feature-locked-guard.tsx` ("Chặn cả khi người dùng gõ thẳng URL") | Gõ thẳng URL trên production vẫn vào đủ chức năng. Cần PO chốt: thêm guard, hay đây là cố ý (vd. để deep link từ hộp việc hoạt động) |
| L-04 | 🐞 | Chăm sóc khách: nhóm "Tất cả khách" gọi `GET /api/v1/customers` — route không tồn tại; lỗi bị nuốt (`catch {}`) | `src/components/marketing-center/care/care-workflow.tsx:119` | Danh sách khách ở `/cham-soc` luôn rỗng, không báo lỗi |
| L-05 | 🐞 | Lưu "công cụ mở cho đối tác" gọi `PUT /api/v1/network/partners/:id/unlocked-tools` — route không tồn tại | `src/components/organization/partner-tool-matrix-modal.tsx:68` (dùng ở `/dieu-phoi/doi-tac`) | Nút Lưu luôn báo lỗi |
| L-06 | 🐞 nhẹ | Cờ đồng ý của khách gán cứng `false` (`// TODO`) | `src/components/dashboard/FeaturePicker.tsx:100` | Ở `/san-pham/[id]/tinh-nang`, "Tin nhắn nhắc mua lại (AI)" luôn bị chặn |
| L-07 | ℹ️ | Mã chết trả "thành công" giả: `DirectCrmNotificationConnector` trả `true` mà không làm gì; không nơi nào gọi | `src/modules/coordinator/connectors/crm-notification-connector.ts` | Không ảnh hưởng hiện tại; dễ bị nối nhầm về sau |
| L-08 | ℹ️ | Phần AI còn chạy bằng luật/stub: `narrative-ai-adapter.ts` (Creative Studio); related queries Google Trends chưa nối; bộ tăng cường ảnh gemini/replicate ở worker là stub (đã gỡ khỏi UI) | `src/modules/creative-production/adapters/narrative-ai-adapter.ts`, `src/modules/market-intelligence/adapters/google-trends-adapter.ts:221`, `src/modules/media/domain/optimization-rules.ts:23` | Các tuyến này đều đang khoá production |
| L-09 | ℹ️ | Trường dữ liệu do Console tự tạo chưa nối vào 17 mẫu/form | `src/app/(platform)/van-hanh/truong-du-lieu/_components/truong-tu-tao-tab.tsx:5` | Trường cấp cửa hàng (1.9) vẫn chạy |
| L-10 | ℹ️ | Chặn giá dưới sàn chỉ có hiệu lực khi sản phẩm có công thức và giá vốn đầy đủ | `src/modules/costing/use-cases/price-floor-guard.ts:16` | Sản phẩm thiếu dữ liệu giá vốn không có sàn (AC C-03 chỉ đạt khi đã khai giá vốn) |

## 5. Phạm vi chưa xác minh

- Không chạy kịch bản nghiệm thu thủ công, không gọi nhà cung cấp thật (OpenAI, Zalo ZNS, eSMS, SePay, Telegram); các chức năng phụ thuộc chúng (4.16, 4.24, 4.28, 4.31, 7.1…) chỉ được xác nhận ở mức mã + test có giả lập.
- Không chạy build, lint, `lint:ux`, E2E.
- Các ngưỡng thời gian trong AC (làm mới ≤ 15 giây, Kanban trong 30 giây, duyệt ảnh 10 phút) được đối chiếu bằng hằng số trong mã, không đo thực tế.
- Repo `LocalBudd`, `SocialFlow` không nằm trong phạm vi.
