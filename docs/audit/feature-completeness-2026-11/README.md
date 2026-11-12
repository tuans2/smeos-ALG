# Kiểm toán mức hoàn thiện tính năng — lần 2, 12/11/2026

> Trạng thái: `SNAPSHOT`, chụp tại `main` @ `631c4921` (12/11/2026). Lần 1 chụp tại `d8dd00d` (06/11/2026); hai lần cách nhau 398 commit. Tài liệu này không thay `docs/kien-truc/TRANG_THAI.md` — đó vẫn là nguồn sự thật về hiện trạng.
> Phương pháp: đọc mã thật, không tin checklist hay tài liệu. Mỗi chức năng được dò ở 5 tầng (UI · API · Backend · DB · Test), đối chiếu cờ khoá production (`src/lib/feature-lock.ts`), danh sách giai đoạn bàn giao (`src/lib/delivery/gd1.manifest.json`, `gd1.routes.json`) và Acceptance Criteria của bộ nghiệm thu.

| Tệp | Nội dung |
|---|---|
| [`01-ma-tran-123-chuc-nang.md`](01-ma-tran-123-chuc-nang.md) | Feature Completeness Matrix: 123 chức năng nghiệm thu, bằng chứng từng tầng, trạng thái trên smeOS production và trên bản giao GD1 |
| [`02-ma-tran-tuyen-va-module.md`](02-ma-tran-tuyen-va-module.md) | 114 trang giao diện (khoá/mở trên smeOS production, có/không trong bản giao GD1) và 55 module backend |

## 1. Feature Inventory dùng để đối chiếu

- **Danh mục:** `docs/nghiem-thu/CHECKLIST_NGHIEM_THU_123_CHUC_NANG.xlsx`, sheet "Phủ 123 chức năng": 10 nhóm, 123 mã (1.1 … 10.8).
- **Acceptance Criteria:** sheet "Kịch bản", 141 bước (luồng A–J, S); cột "Kết quả mong đợi" gắn với mã chức năng.
- **Bản đồ trang/API của từng mã:** `src/lib/delivery/gd1.manifest.json` (có từ 10/11/2026). Mọi trang và API manifest gắn cho 123 mã đều tồn tại trong mã nguồn và nằm trong phạm vi GD1.
- **Lưu ý quan trọng:** cột "Kết quả", "Người chạy", "Ngày" của các bước kịch bản vẫn **trống**. Chưa có lượt nghiệm thu thủ công nào được ghi lại. Mọi kết luận ở đây là đối chiếu tĩnh với mã và với kết quả bộ test tự động, không thay được một lượt chạy kịch bản trên môi trường thật.

## 2. Kết quả tổng hợp

Có hai đích chạy, nên ma trận có hai cột trạng thái:

- **smeOS production** đặt `NEXT_PUBLIC_APP_ENV=production`, nên khoá "Sắp ra mắt" của `feature-lock.ts` có hiệu lực.
- **Bản giao GD1** (bản cắt giao ALG) bật sẵn chế độ giai đoạn `gd1` và không đặt biến trên (`releases/gd1/overlay/render.yaml`), nên các chức năng bị khoá ở smeOS đều mở.

| Trạng thái | Nghĩa | smeOS production (lần 1 → lần 2) | Bản giao GD1 |
|---|---|---:|---:|
| ✅ Hoàn thiện | Đủ UI + API + backend + DB (khi cần) + test; màn hình của AC mở | 105 → **107** | **121** |
| 🔒 Có mã, khoá production | Mã đủ tầng, nhưng màn hình của AC bị khoá "Sắp ra mắt" | 13 → **14** | 0 |
| 🟡 Một phần | Thiếu một mắt xích, hoặc AC chỉ đạt một phần / lệch quyết định đã chốt | 5 → **2** | **2** |
| 🎨 Chỉ có UI | Có giao diện, không có logic | 0 → 0 | 0 |
| ❌ Chưa triển khai | Không có route, bảng hay màn hình | 0 → 0 | 0 |
| 🐞 Lỗi | Chức năng trong danh mục chạy sai | 0 → 0 | 0 |

Cả 123 chức năng đều có mã thật. Phần còn chưa xong:
- **Trên smeOS production:** chủ yếu là khoá "Sắp ra mắt" (14 chức năng).
- **Trên bản giao GD1:** còn **2 chức năng có Acceptance Criteria lệch quyết định đã chốt** (9.1, 9.14). Không còn chức năng nào thiếu mã.

**🔒 Khoá trên smeOS production (14), mở trên bản giao GD1:**
- 1.17 Nhật ký thao tác
- 3.1 Quy tắc giá (`/gia`)
- 4.11 Lịch sử đơn cùng khách (`/khach-hang`)
- 4.12 Bảng điều phối rủi ro (`/dieu-phoi`)
- 6.1, 6.2, 6.3, 6.5, 6.6 Báo cáo theo kỳ (`/bao-cao`)
- 6.9 và 10.1 Sổ quỹ & credit (`/muc-dung`)
- 8.1 Landing page (lối vào `/catalog`)
- 9.6 Tác vụ nền (`/job`)
- 9.7 Chính sách AI (`/cai-dat-ai`)

**🟡 Một phần (2), giống nhau trên cả hai đích:**

| Mã | Còn thiếu |
|---|---|
| 9.1 | AC I-01 ghi "không có cách xoá tin", nhưng PO quyết định ngày 09/11/2026 cho người gửi **thu hồi tin của mình trong 24 giờ** ở Trao đổi nội bộ (`internal-chat/domain/message-change-policy.ts`, `DELETE /api/v1/internal-chat/messages/:id`). Khung trao đổi trên đơn không có xoá. Cần sửa câu AC hoặc đổi lại quyết định |
| 9.14 | Đăng bài đã chạy ngay trong smeOS (D-46), nên không còn "ứng dụng liên kết" để chạy I-09 như đang viết. JWT liên-app 15 phút có ở core và chỉ được kiểm bằng test. Cần ALG đổi câu chữ I-09 (manifest GD1 đã ghi `acceptanceNote`) |

### 2.1 Thay đổi so với lần 1 (06/11/2026)

| Mã | Lần 1 | Lần 2 | Vì sao |
|---|---|---|---|
| 4.30 | 🟡 | ✅ | Tầng Mẹ đăng ký nhà cung cấp SMS (eSMS) / Zalo (ZNS) một lần (`PUT /api/v1/platform/notification/providers`, khối "Kênh liên lạc" ở `/van-hanh/thong-bao`); adapter gửi thật, thiếu cấu hình thì `NOT_CONFIGURED`. Web Push tự viết theo RFC 8291/VAPID (`push_subscriptions`). PR #30, #32 |
| 4.32 | 🟡 | ✅ | Mốc M1/M2 được đẩy thành tin (sự kiện `DELIVERY_REMINDER_DUE`) trong cron 5 phút `chain-dispatch-sweep`, mỗi mốc một lần. Đổi mốc ở Cài đặt tiệm (mở). PR #30 |
| 8.1 | 🟡 | 🔒 | Đổi cách xếp loại, mã không đổi: mã đủ tầng, chỉ lối vào AC (`/catalog`, nay là "Bộ sưu tập chung") bị khoá — cùng loại với 13 chức năng khoá khác. Bản giao GD1 mở |
| 9.1 | 🟡 (do `/tin-nhan` khoá) | 🟡 (do AC lệch) | `/tin-nhan` nay có guard URL. Trao đổi nội bộ hoàn thiện, có test (PR #18). Lý do "một phần" chuyển sang AC I-01 lệch quyết định thu hồi tin |
| 9.14 | 🟡 | 🟡 | Hướng xử lý đã chốt (D-46: đăng bài trong smeOS, module `social-publishing`), nhưng câu chữ AC I-09 chưa đổi |

Không có chức năng ✅ nào ở lần 1 bị hạ bậc. Toàn bộ đường dẫn bằng chứng của lần 1 vẫn tồn tại. Từ lần 1 đến nay không có tệp nào dưới `src/app` bị xoá.

## 3. Cổng kiểm tra đã chạy (máy kiểm toán, không phải CI)

| Cổng | Kết quả |
|---|---|
| `npm run typecheck` | ✅ 0 lỗi (`NODE_OPTIONS=--max-old-space-size=6144`) |
| `npm test` (unit) | ✅ 4.954/4.954 ca, 816 tệp. CSDL `floraos` dựng như CI: `db:deploy` + `db:seed` |
| `npm run test:tenant` | ⏳ Đang chạy lúc commit này — kết quả ghi ở commit sau |
| `npm run test:platform` | ⏳ Chạy sau `test:tenant` — kết quả ghi ở commit sau |
| `npm run check:docs` | ✅ "Tài liệu khớp mã" |
| Lint, `lint:ux`, build, E2E | Không chạy — lần kiểm toán này không đổi mã |

Môi trường: CSDL cục bộ Postgres 16. `floraos` dựng bằng `db:deploy` + `db:seed`; `floraos_test` dựng bằng `prisma db push`, đúng như `.github/workflows/ci.yml`. Lần này `npm ci` tải được `xlsx` từ `cdn.sheetjs.com`, nên không phải thay gói như lần 1.

## 4. Phát hiện ngoài danh mục 123 chức năng

### 4.1 Đối chiếu lại phát hiện lần 1

| # | Mức | Phát hiện | Trạng thái 12/11 | Bằng chứng |
|---|---|---|---|---|
| L-01 | 🐞 | Mục menu "Trợ lý tối ưu" trỏ tới trang không tồn tại | ✅ Đã sửa 07/11 (`ebd7a6ea`, UJ-05) | Đã gỡ khỏi menu; `tests/unit/architecture/nav-href-exists.test.ts`. Còn sót ánh xạ chết `/cong-cu/toi-uu-he-thong` trong `nav-matrix.ts:78`, `tool-route-entitlement.ts:27` (không hiện trên màn hình) |
| L-02 | 🐞 | Mục Console "Catalog toàn hệ thống" trỏ `/van-hanh/san-pham` không tồn tại | ✅ Đã sửa 07/11 (`ebd7a6ea`) | Không còn tham chiếu trong `src/` |
| L-03 | ⚠️ | Tuyến khoá production chỉ bị làm mờ trên sidebar, không có `FeatureLockedGuard` | 🟡 Còn **10** tuyến (lần 1: 11) | `/tin-nhan` đã có guard. Còn: `/audit`, `/bao-cao`, `/dieu-phoi` (+`/doi-tac`), `/duyet`, `/job` (+`/[id]`), `/muc-dung`, `/so-lieu`, `/noi-bo/ket-noi`. Chỉ ảnh hưởng smeOS production; bản giao GD1 không khoá. PO vẫn cần chốt |
| L-04 | 🐞 | `/cham-soc` nhóm "Tất cả khách" gọi `GET /api/v1/customers` không tồn tại, lỗi bị nuốt | ❌ Còn | `src/components/marketing-center/care/care-workflow.tsx:119`. `/cham-soc` không thuộc bản giao GD1 |
| L-05 | 🐞 | Lưu "công cụ mở cho đối tác" gọi route không tồn tại | ✅ Đã sửa 11/11 (`36abda77`) | Gọi `PATCH /api/v1/coordinator/partners/:id/tools`; test `src/components/organization/__tests__/partner-tools-api.test.ts` |
| L-06 | 🐞 nhẹ | Cờ đồng ý của khách gán cứng `false` (`// TODO`) | ❌ Còn | `src/components/dashboard/FeaturePicker.tsx:100` |
| L-07 | ℹ️ | `DirectCrmNotificationConnector` trả `true` mà không làm gì | ❌ Còn (mã chết, chỉ được `connectors/index.ts` xuất lại) | `src/modules/coordinator/connectors/crm-notification-connector.ts:22` |
| L-08 | ℹ️ | Phần AI còn chạy bằng luật/stub | ❌ Còn | `creative-production/adapters/narrative-ai-adapter.ts` (stub); `market-intelligence/adapters/google-trends-adapter.ts:221` (related topics trả rỗng); `gemini`/`replicate` vẫn ngoài `OPTIMIZE_ENHANCER_PROVIDERS`. Các tuyến này đều khoá hoặc không giao |
| L-09 | ℹ️ | Trường do Console tự tạo chưa nối vào 17 mẫu/form | ❌ Còn | `src/app/(platform)/van-hanh/truong-du-lieu/_components/truong-tu-tao-tab.tsx:5` |
| L-10 | ℹ️ | Chặn giá dưới sàn chỉ có hiệu lực khi sản phẩm có công thức + giá vốn đầy đủ | 🟡 Có bản sửa, **chưa merge** | `src/modules/costing/use-cases/price-floor-guard.ts:27,36-38` trên `main`. Bản sửa `f0232f7c` nằm ở nhánh `claude/bold-meitner-nk07bd`. Trần chiết khấu mọi kênh chờ PO (BL-28) |

### 4.2 Phát hiện mới

| # | Mức | Phát hiện | Vị trí | Hệ quả |
|---|---|---|---|---|
| N-01 | ⚠️ AC | AC I-01 (9.1) "không có cách xoá tin" ngược quyết định PO 09/11/2026 cho thu hồi tin trong 24 giờ | `internal-chat/domain/message-change-policy.ts`, `api/v1/internal-chat/messages/[id]/route.ts:32` | Người nghiệm thu sẽ chấm I-01 trượt dù mã đúng quyết định. Cần sửa câu AC (hoặc PO đổi lại quyết định) |
| N-02 | ⚠️ AC | AC I-09 (9.14) vẫn ghi "Từ smeOS mở ứng dụng liên kết", trong khi D-46 đã bỏ ứng dụng liên kết | `gd1.manifest.json` mục 9.14 `acceptanceNote`; `docs/plan/BANGIAO_GD1_123_CHUC_NANG.md` Bước 4 | Không chạy được I-09 như đang viết. Cần ALG đổi câu chữ |
| N-03 | ℹ️ AC | Giao diện đổi tên "Thẻ chào" → **"Bộ sưu tập riêng"** và "Catalog" → **"Bộ sưu tập chung"** (PO 09/11/2026, D-66). 19 bước kịch bản vẫn ghi "Thẻ chào" ở cột "Mở ở"/"Thao tác"; I-10 ghi "Tạo catalog" | `src/modules/toolkit/domain/collection-names.ts` | Người nghiệm thu không tìm thấy mục theo tên trong kịch bản. Cần bảng đối chiếu tên hoặc sửa kịch bản |
| N-04 | ℹ️ | Ba phát hiện nghiệp vụ chạm tới AC của danh mục vẫn chờ PO: BL-28 (trần chiết khấu mọi kênh, chạm 3.4/3.7), BL-29 (nhắc thu quá hạn chỉ một lần, chạm 4.26), BL-30 ("Giá trị đơn" gồm đơn Nháp, chạm 6.2). BL-35 (bộ máy duyệt thay đổi cấu hình trường không được dùng) cũng chờ PO | `docs/audit/business-logic-audit/BUSINESS_LOGIC_AUDIT_2026-11-11.md` | Các bước C-03, C-11, F-09, H-02 vẫn đạt với dữ liệu chuẩn bị trong kịch bản; rủi ro nằm ở trường hợp biên |

## 5. Phạm vi chưa xác minh

- Không chạy kịch bản nghiệm thu thủ công, không gọi nhà cung cấp thật (OpenAI, Zalo ZNS, eSMS, SePay, Telegram, Facebook). Các chức năng phụ thuộc chúng (4.16, 4.24, 4.28, 4.30 kênh SMS/Zalo, 4.31, 7.1…) chỉ được xác nhận ở mức mã + test có giả lập.
- Không dựng bản cắt GD1 (`npm run release:cut`), không chạy build, lint, `lint:ux`, E2E. Cột "Bản giao GD1" suy từ `gd1.routes.json`, `gd1.manifest.json` và lớp phủ `releases/gd1/overlay/`. Lần dựng bản cắt gần nhất được ghi ở `docs/plan/BANGIAO_GD1_123_CHUC_NANG.md` (ứng viên 2, `4d1fb65d`).
- Ngưỡng thời gian trong AC (làm mới ≤ 15 giây, Kanban trong 30 giây, duyệt ảnh 10 phút, nhắc trước 60/30 phút) được đối chiếu bằng hằng số trong mã, không đo thực tế.
- Các nhánh chưa merge (`claude/bold-meitner-nk07bd`, `claude/fervent-pascal-ilhcgb`, `claude/zealous-mayer-gkuglw`, `claude/youthful-bardeen-rni9ck`) không nằm trong lần rà này. Riêng `claude/fervent-pascal-ilhcgb` đổi tên thương hiệu sang ALG (đổi chữ trên màn hình, tài liệu và một tệp `src/`), nên nếu merge thì cần rà lại câu chữ trong AC.
- Repo `LocalBudd`, `SocialFlow` không nằm trong phạm vi.
