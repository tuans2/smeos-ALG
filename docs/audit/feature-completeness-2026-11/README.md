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
| ✅ Hoàn thiện | Đủ UI + API + backend + DB (khi cần) + test; màn hình của AC mở | 105 → **109** | **123** |
| 🔒 Có mã, khoá production | Mã đủ tầng, nhưng màn hình của AC bị khoá "Sắp ra mắt" | 13 → **14** | 0 |
| 🟡 Một phần | Thiếu một mắt xích, hoặc AC chỉ đạt một phần / lệch quyết định đã chốt | 5 → **0** | **0** |
| 🎨 Chỉ có UI | Có giao diện, không có logic | 0 → 0 | 0 |
| ❌ Chưa triển khai | Không có route, bảng hay màn hình | 0 → 0 | 0 |
| 🐞 Lỗi | Chức năng trong danh mục chạy sai | 0 → 0 | 0 |

Cả 123 chức năng đều có mã thật. Phần còn chưa xong:
- **Trên smeOS production:** chỉ còn khoá "Sắp ra mắt" (14 chức năng).
- **Trên bản giao GD1:** cả 123 chức năng đạt về mã. Hai câu AC từng lệch quyết định đã chốt (I-01 của 9.1, I-09 của 9.14) đã được sửa trong checklist ngày 12/11/2026 (mục 2.2).

**🔒 Khoá trên smeOS production (14), mở trên bản giao GD1:**
- 1.17 Nhật ký thao tác
- 3.1 Quy tắc giá (`/gia`)
- 4.11 Lịch sử đơn cùng khách (`/khach-hang`)
- 4.12 Bảng điều phối rủi ro (`/dieu-phoi`)
- 6.1, 6.2, 6.3, 6.5, 6.6 Báo cáo theo kỳ (`/bao-cao`)
- 6.9 và 10.1 Sổ quỹ & credit (`/muc-dung`)
- 9.1 Trao đổi nội bộ (`/tin-nhan`)
- 9.6 Tác vụ nền (`/job`)
- 9.7 Chính sách AI (`/cai-dat-ai`)

### 2.1 Thay đổi so với lần 1 (06/11/2026)

| Mã | Lần 1 | Lần 2 | Vì sao |
|---|---|---|---|
| 4.30 | 🟡 | ✅ | Tầng Mẹ đăng ký nhà cung cấp SMS (eSMS) / Zalo (ZNS) một lần (`PUT /api/v1/platform/notification/providers`, khối "Kênh liên lạc" ở `/van-hanh/thong-bao`); adapter gửi thật, thiếu cấu hình thì `NOT_CONFIGURED`. Web Push tự viết theo RFC 8291/VAPID (`push_subscriptions`). PR #30, #32 |
| 4.32 | 🟡 | ✅ | Mốc M1/M2 được đẩy thành tin (sự kiện `DELIVERY_REMINDER_DUE`) trong cron 5 phút `chain-dispatch-sweep`, mỗi mốc một lần. Đổi mốc ở Cài đặt tiệm (mở). PR #30 |
| 8.1 | 🟡 | ✅ | Mã đủ tầng. AC I-10 đã sửa sang lối vào hiện tại Công cụ → Quảng bá sản phẩm → Landing page (mục 2.2), không còn đi qua `/catalog` đang khoá |
| 9.1 | 🟡 | 🔒 | Trao đổi nội bộ hoàn thiện, có test (PR #18); `/tin-nhan` nay có guard URL. AC I-01 đã sửa cho khớp quyết định thu hồi tin (mục 2.2). Còn lại chỉ là khoá "Sắp ra mắt"; bản giao GD1 mở |
| 9.14 | 🟡 | ✅ | D-46: đăng bài chạy trong smeOS (module `social-publishing`). AC I-09 đã sửa sang Công cụ → Tạo nội dung → Đăng tự động (mục 2.2) |

Không có chức năng ✅ nào ở lần 1 bị hạ bậc. Toàn bộ đường dẫn bằng chứng của lần 1 vẫn tồn tại. Từ lần 1 đến nay không có tệp nào dưới `src/app` bị xoá.

### 2.2 Câu AC đã sửa trong checklist (12/11/2026)

`docs/nghiem-thu/CHECKLIST_NGHIEM_THU_123_CHUC_NANG.xlsx`, sheet "Kịch bản". Chỉ sửa chữ trong ô; mã bước, mã chức năng, cột "Khoá mã", công thức và định dạng giữ nguyên.

| Bước | Cột | Trước | Sau |
|---|---|---|---|
| I-01 (9.1) | Thao tác | Nhắn qua lại trên 1 đơn; thử xoá tin | Nhắn qua lại trên 1 đơn, thử xoá tin; ở Trao đổi nội bộ, người gửi thu hồi 1 tin của mình, người kia thử thu hồi tin đó |
| I-01 (9.1) | Kết quả mong đợi | Tin hiện cho người kia, đánh dấu đã đọc; không có cách xoá tin | Tin hiện cho người kia, đánh dấu đã đọc; khung trao đổi của đơn không có cách xoá tin. Ở Trao đổi nội bộ chỉ người gửi thu hồi được tin của chính mình, trong 24 giờ kể từ lúc gửi; tin hiện “Tin nhắn đã được thu hồi” với mọi người; người kia không có nút thu hồi |
| I-09 (9.14) | Vai | Nhân viên | Điều hành (vai có quyền đăng bài `J5` và có sẵn tài khoản ở trang Chuẩn bị) |
| I-09 (9.14) | Mở ở | Ứng dụng liên kết (SSO) | Công cụ → Tạo nội dung → Đăng tự động |
| I-09 (9.14) | Thao tác | Từ smeOS mở ứng dụng liên kết | Đang đăng nhập smeOS, mở bước Đăng tự động (kết nối kênh, chọn bài, lên lịch) |
| I-09 (9.14) | Kết quả mong đợi | Vào thẳng không đăng nhập lại; phiên liên kết hết hạn sau 15 phút | Vào thẳng, không phải đăng nhập lại; đăng bài chạy ngay trong smeOS, không mở ứng dụng ngoài. Thời hạn 15 phút của phiên liên kết cho ứng dụng ngoài được kiểm bằng test tự động, không chạy tay |

**Đổi tên "Thẻ chào" → "Bộ sưu tập riêng" (N-03):** 23 ô ở sheet "Kịch bản" và 1 ô ở "Chuẩn bị", gồm:
- tiêu đề và tên luồng D;
- cột "Mở ở" của A–H (`Thẻ chào → …`, `Link Thẻ Chào …`);
- A-08 (tên menu), B-11, G-06 (tên sheet trong file Excel xuất, theo `orders/use-cases/export-orders.ts:241`), G-07 (nhãn nguồn đơn, theo `orders/domain/order-source.ts:47`), J-11.

Ô D-01 "Thẻ chào sản phẩm → Quản lý → Bộ sưu tập" đổi thành "Bộ sưu tập riêng → Quản lý → Bộ sưu tập", vì "Thẻ chào sản phẩm" giờ là bước 2 của Tạo nội dung. Tên tab trong trang (Gửi nhanh, Quản lý, Theo dõi đơn, Bán hàng, Điều hành, Điều phối, Hộp việc) không đổi. Tên chức năng và tên nhóm ở "Phủ 123 chức năng" không sửa.

**I-10 (8.1):**
- Vai: Marketing → **Điều hành** (có `J1`, `J7`; trang Chuẩn bị không có tài khoản Marketing).
- Mở ở: "Công cụ → Tạo catalog → landing page" → **"Công cụ → Quảng bá sản phẩm → Landing page → Tạo landing mới"** (`promotion-hub/landing-panel.tsx`, PO 09/11/2026).
- Thao tác và kết quả mong đợi giữ nguyên.

Căn cứ:
- I-01: quyết định PO 09/11/2026 (`docs/plan/hoan-thien-chat-noi-bo.md` §10). Hành vi trong mã: `internal-chat/domain/message-change-policy.ts`, `components/internal-chat/message-actions.tsx`, `message-item.tsx`.
- I-09: quyết định D-46 và `acceptanceNote` của mục 9.14 trong `gd1.manifest.json`. Ô "Tạo nội dung" nằm ở `components/dashboard/toolkit-module-detail.tsx`; quyền `J5` ở `core/rbac/capability-catalog.ts:202`.

## 3. Cổng kiểm tra đã chạy (máy kiểm toán, không phải CI)

| Cổng | Kết quả |
|---|---|
| `npm run typecheck` | ✅ 0 lỗi (`NODE_OPTIONS=--max-old-space-size=6144`) |
| `npm test` (unit) | ✅ 4.954/4.954 ca, 816 tệp. CSDL `floraos` dựng như CI: `db:deploy` + `db:seed` |
| `npm run test:tenant` | ✅ 1.244/1.244 ca, 289 tệp (CSDL cục bộ `floraos_test`, `prisma db push` như CI) |
| `npm run test:platform` | ✅ 64/64 ca, 19 tệp |
| `tests/unit/release/gd1-manifest.test.ts` (đọc checklist xlsx sau khi sửa I-01, I-09) | ✅ 7/7 ca (cũng nằm trong `npm test`) |
| `npm run check:docs` | ✅ "Tài liệu khớp mã" |
| Lint, `lint:ux`, build, E2E | Không chạy — lần kiểm toán này không đổi mã |

Môi trường: CSDL cục bộ Postgres 16. `floraos` dựng bằng `db:deploy` + `db:seed`; `floraos_test` dựng bằng `prisma db push`, đúng như `.github/workflows/ci.yml`. Lần này `npm ci` tải được `xlsx` từ `cdn.sheetjs.com`, nên không phải thay gói như lần 1.

## 4. Phát hiện ngoài danh mục 123 chức năng

### 4.1 Đối chiếu lại phát hiện lần 1

| # | Mức | Phát hiện | Trạng thái 12/11 | Bằng chứng |
|---|---|---|---|---|
| L-01 | 🐞 | Mục menu "Trợ lý tối ưu" trỏ tới trang không tồn tại | ✅ Đã sửa 07/11 (`ebd7a6ea`, UJ-05) | Đã gỡ khỏi menu; `tests/unit/architecture/nav-href-exists.test.ts`. Còn sót ánh xạ chết `/cong-cu/toi-uu-he-thong` trong `nav-matrix.ts:78`, `tool-route-entitlement.ts:27` (không hiện trên màn hình) |
| L-02 | 🐞 | Mục Console "Catalog toàn hệ thống" trỏ `/van-hanh/san-pham` không tồn tại | ✅ Đã sửa 07/11 (`ebd7a6ea`) | Không còn tham chiếu trong `src/` |
| L-03 | ⚠️ | Tuyến khoá production chỉ bị làm mờ trên sidebar, không có `FeatureLockedGuard` | ✅ Đã sửa 12/11 | Thêm `layout.tsx` bọc `FeatureLockedGuard` cho `/audit`, `/bao-cao`, `/dieu-phoi` (+`/doi-tac`), `/duyet`, `/job` (+`/[id]`), `/muc-dung`, `/so-lieu`, `/noi-bo/ket-noi`. `tests/unit/architecture/locked-route-guard.test.ts` kiểm cả 23 tiền tố khoá. Chỉ ảnh hưởng smeOS production; bản giao GD1 không khoá. Hệ quả với các lối vào: N-05 (đã sửa) |
| L-04 | 🐞 | `/cham-soc` nhóm "Tất cả khách" gọi `GET /api/v1/customers` không tồn tại, lỗi bị nuốt | ✅ Đã sửa 12/11 | Thêm `src/app/api/v1/customers/route.ts` (`defineRoute`, con trỏ, quyền `M4` hoặc `Q1` như khách theo nhóm; khai `capability: null` kèm lý do, handler tự kiểm — quy ước của `defineRoute` trên `main`); test `tests/tenant/customers-list-route.test.ts`. Màn vẫn nuốt lỗi tải (`catch {}`) — chưa sửa. `/cham-soc` không thuộc bản giao GD1 |
| L-05 | 🐞 | Lưu "công cụ mở cho đối tác" gọi route không tồn tại | ✅ Đã sửa 11/11 (`36abda77`) | Gọi `PATCH /api/v1/coordinator/partners/:id/tools`; test `src/components/organization/__tests__/partner-tools-api.test.ts` |
| L-06 | 🐞 nhẹ | Cờ đồng ý của khách gán cứng `false` (`// TODO`) | ✅ Đã sửa 12/11 | Đồng ý là của từng khách, trang sản phẩm không có khách cụ thể: bỏ cờ cấp cửa hàng; `checkFeatureDependencies` không khoá "Tin nhắn nhắc mua lại (AI)" vì đồng ý mà kèm ghi chú "chỉ gửi cho khách đã đồng ý nhận tin". Khách chưa đồng ý vẫn bị loại lúc lập danh sách gửi (`projectMarketingAudience`, `projectOccasionReminder`). Test `src/lib/feature-catalog-consent.test.ts`. Chức năng này vẫn `coming_soon`, chưa có mã chạy phía máy chủ |
| L-07 | ℹ️ | `DirectCrmNotificationConnector` trả `true` mà không làm gì | ✅ Đã xoá 12/11 | Xoá `src/modules/coordinator/connectors/crm-notification-connector.ts` và dòng xuất lại trong `connectors/index.ts`; không nơi nào dùng. Nợ #142 ghi phần chức năng còn thiếu (ZNS khi giao xong, cộng điểm CRM) |
| L-08 | ℹ️ | Phần AI còn chạy bằng luật/stub | ⏸ Giữ nguyên theo quyết định chủ dự án 12/11 | (1) `creative-production/adapters/narrative-ai-adapter.ts`: stub chưa nơi nào gọi; `planNarrativeArc` chạy bằng luật. (2) `market-intelligence/adapters/google-trends-adapter.ts`: `getRelatedTopics` trả rỗng — đúng luật không bịa số khi chưa có nguồn. (3) Worker: `gemini`/`replicate` là stub lùi PIL, giữ trong registry để job cũ không đổi hành vi; đã ngoài `OPTIMIZE_ENHANCER_PROVIDERS`. Cả ba tuyến đều khoá hoặc không thuộc bản giao GD1. Làm AI thật hoặc thêm nhà cung cấp cần PO duyệt |
| L-09 | ℹ️ | Trường do Console tự tạo chưa nối vào 17 mẫu/form | ❌ Còn | `src/app/(platform)/van-hanh/truong-du-lieu/_components/truong-tu-tao-tab.tsx:5` |
| L-10 | ℹ️ | Chặn giá dưới sàn chỉ có hiệu lực khi sản phẩm có công thức + giá vốn đầy đủ | 🟡 Có bản sửa, **chưa merge** | `src/modules/costing/use-cases/price-floor-guard.ts:27,36-38` trên `main`. Bản sửa `f0232f7c` nằm ở nhánh `claude/bold-meitner-nk07bd`. Trần chiết khấu mọi kênh chờ PO (BL-28) |

### 4.2 Phát hiện mới

| # | Mức | Phát hiện | Vị trí | Hệ quả |
|---|---|---|---|---|
| N-01 | ⚠️ AC | AC I-01 (9.1) "không có cách xoá tin" ngược quyết định PO 09/11/2026 cho thu hồi tin trong 24 giờ | `internal-chat/domain/message-change-policy.ts`, `api/v1/internal-chat/messages/[id]/route.ts:32` | ✅ Đã sửa câu AC 12/11 (mục 2.2) |
| N-02 | ⚠️ AC | AC I-09 (9.14) vẫn ghi "Từ smeOS mở ứng dụng liên kết", trong khi D-46 đã bỏ ứng dụng liên kết | `gd1.manifest.json` mục 9.14 `acceptanceNote`; `docs/plan/BANGIAO_GD1_123_CHUC_NANG.md` Bước 4 | ✅ Đã sửa câu AC 12/11 (mục 2.2). Cần báo ALG bản checklist mới |
| N-03 | ℹ️ AC | Giao diện đổi tên "Thẻ chào" → **"Bộ sưu tập riêng"** và "Catalog" → **"Bộ sưu tập chung"** (PO 09/11/2026, D-66). 19 bước kịch bản vẫn ghi "Thẻ chào" ở cột "Mở ở"/"Thao tác"; I-10 ghi "Tạo catalog" | `src/modules/toolkit/domain/collection-names.ts` | ✅ Đã sửa 12/11 (mục 2.2): "Thẻ chào" ở 24 ô và I-10. Tên chức năng, tên nhóm ở "Phủ 123 chức năng"/"Tổng hợp" giữ nguyên vì là danh mục đã thống nhất với ALG |
| N-04 | ℹ️ | Ba phát hiện nghiệp vụ chạm tới AC của danh mục vẫn chờ PO: BL-28 (trần chiết khấu mọi kênh, chạm 3.4/3.7), BL-29 (nhắc thu quá hạn chỉ một lần, chạm 4.26), BL-30 ("Giá trị đơn" gồm đơn Nháp, chạm 6.2). BL-35 (bộ máy duyệt thay đổi cấu hình trường không được dùng) cũng chờ PO | `docs/audit/business-logic-audit/BUSINESS_LOGIC_AUDIT_2026-11-11.md` | Các bước C-03, C-11, F-09, H-02 vẫn đạt với dữ liệu chuẩn bị trong kịch bản; rủi ro nằm ở trường hợp biên |
| N-05 | ℹ️ | Sau khi sửa L-03, lối vào từ màn đang mở dẫn vào tuyến khoá sẽ mở màn "Sắp ra mắt" trên smeOS production | ✅ Đã sửa 12/11: khoá bật thì ẩn lối vào (`isHrefOpen`, `filterOpenHrefs` trong `src/lib/feature-lock.ts`) — thanh dưới trên điện thoại, nút "Theo dõi ở Điều phối", hàng chờ điều phối, link "màn Duyệt" trong Bộ nội dung từ 1 ảnh, thẻ việc của quản lý cửa hàng, lối tắt trang chủ Kế toán, nút và thẻ hành trình trang chủ chuỗi, nút ở Kho dữ liệu, nút "Theo dõi tiến trình"; thông báo vẫn gửi nhưng bỏ link tới tuyến khoá (`openDeepLink` trong `dispatchNotification`). Test: `src/lib/feature-lock-entry.test.ts`, `src/components/layout/locked-entries.test.ts`, `src/components/orders/__tests__/order-action-buttons-locked.test.tsx`, `notification-recipients.test.ts` | Khoá tắt (staging, bản giao GD1) không đổi gì |

## 5. Phạm vi chưa xác minh

- Không chạy kịch bản nghiệm thu thủ công, không gọi nhà cung cấp thật (OpenAI, Zalo ZNS, eSMS, SePay, Telegram, Facebook). Các chức năng phụ thuộc chúng (4.16, 4.24, 4.28, 4.30 kênh SMS/Zalo, 4.31, 7.1…) chỉ được xác nhận ở mức mã + test có giả lập.
- Không dựng bản cắt GD1 (`npm run release:cut`), không chạy build, lint, `lint:ux`, E2E. Cột "Bản giao GD1" suy từ `gd1.routes.json`, `gd1.manifest.json` và lớp phủ `releases/gd1/overlay/`. Lần dựng bản cắt gần nhất được ghi ở `docs/plan/BANGIAO_GD1_123_CHUC_NANG.md` (ứng viên 2, `4d1fb65d`).
- Ngưỡng thời gian trong AC (làm mới ≤ 15 giây, Kanban trong 30 giây, duyệt ảnh 10 phút, nhắc trước 60/30 phút) được đối chiếu bằng hằng số trong mã, không đo thực tế.
- Các nhánh chưa merge (`claude/bold-meitner-nk07bd`, `claude/fervent-pascal-ilhcgb`, `claude/zealous-mayer-gkuglw`, `claude/youthful-bardeen-rni9ck`) không nằm trong lần rà này. Riêng `claude/fervent-pascal-ilhcgb` đổi tên thương hiệu sang ALG (đổi chữ trên màn hình, tài liệu và một tệp `src/`), nên nếu merge thì cần rà lại câu chữ trong AC.
- Repo `LocalBudd`, `SocialFlow` không nằm trong phạm vi.
