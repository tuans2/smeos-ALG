# Ma trận hoàn thiện — 123 chức năng nghiệm thu

> Nguồn danh mục: `docs/nghiem-thu/CHECKLIST_NGHIEM_THU_123_CHUC_NANG.xlsx` (sheet "Phủ 123 chức năng"); AC = cột "Kết quả mong đợi" ở sheet "Kịch bản".
> Rà theo mã thật trên `main` @ `d8dd00d` (06/11/2026). Tổng hợp và phát hiện: [`README.md`](README.md).

**Ký hiệu tầng:** ● có mã thật · ◐ có nhưng thiếu một phần · ○ không có · — không áp dụng.

## Tổng hợp theo nhóm

| Nhóm | Số CN | ✅ | 🔒 | 🟡 | 🎨 | ❌ | 🐞 |
|---|---:|---:|---:|---:|---:|---:|---:|
| 1. Nền tảng chung & phân quyền | 19 | 18 | 1 | 0 | 0 | 0 | 0 |
| 2. Quản lý sản phẩm, mẫu hoa & hình ảnh | 9 | 9 | 0 | 0 | 0 | 0 | 0 |
| 3. Tạo & quản lý báo giá | 13 | 12 | 1 | 0 | 0 | 0 | 0 |
| 4. Tiếp nhận, quản lý & xử lý đơn hàng | 32 | 28 | 2 | 2 | 0 | 0 | 0 |
| 5. Thẻ Chào mẫu hoa & trang khách hàng | 15 | 15 | 0 | 0 | 0 | 0 | 0 |
| 6. Báo cáo hoạt động & tài chính | 9 | 3 | 6 | 0 | 0 | 0 | 0 |
| 7. AI phân tích, nội dung & marketing | 3 | 3 | 0 | 0 | 0 | 0 | 0 |
| 8. Landing page bán hàng | 1 | 0 | 0 | 1 | 0 | 0 | 0 |
| 9. Chat nội bộ, đa chuỗi & phân quyền nâng cao | 14 | 10 | 2 | 2 | 0 | 0 | 0 |
| 10. Quản lý credit AI, hạn mức & thuê bao SaaS | 8 | 7 | 1 | 0 | 0 | 0 | 0 |
| **Tổng** | **123** | **105** | **13** | **5** | **0** | **0** | **0** |

## 1. Nền tảng chung & phân quyền

| Mã | Chức năng | UI | API | Backend | DB | Test | Trạng thái | Bằng chứng | Ghi chú / AC |
|---|---|:-:|:-:|:-:|:-:|:-:|---|---|---|
| 1.1 | Truy cập theo tổ chức (Multi-tenant) | ● | ● | ● | ● | ● | ✅ Hoàn thiện | `core/tenancy` `requireTenantContext`; `tests/tenant/*` |  |
| 1.2 | Đăng nhập & thu hồi phiên cũ | ● | ● | ● | ● | ● | ✅ Hoàn thiện | `organization/use-cases/log-in.ts` (`revokeAllActiveForUser`); `layout/session-takeover-watcher.tsx` |  |
| 1.3 | Đăng xuất & vô hiệu hóa phiên tức thì | ● | ● | ● | ● | ● | ✅ Hoàn thiện | `api/v1/auth/logout`; `organization/use-cases/log-out.ts` |  |
| 1.4 | Bắt buộc đổi mật khẩu tạm lần đầu | ● | ● | ● | ● | ● | ✅ Hoàn thiện | `resolve-session.ts:147` chặn mọi API trừ `/session/password`; `layout/forced-password-change.tsx` |  |
| 1.5 | Quản lý thông tin cửa hàng & logo an toàn | ● | ● | ● | ● | ● | ✅ Hoàn thiện | `/cai-dat?tab=INFO`; `api/v1/business-profile`, `organization/brand` |  |
| 1.6 | Khai báo chi nhánh & tọa độ quận/huyện | ● | ● | ● | ● | ● | ✅ Hoàn thiện | `api/v1/greeting-card/chain-branches/bulk-import` (phường phục vụ, toạ độ); `bulk-import/branch-import-panel.tsx` |  |
| 1.7 | Khai báo dịp tặng hoa ngành chuẩn | ● | ● | ● | ● | ● | ✅ Hoàn thiện | `api/v1/occasions`; bảng `occasions` |  |
| 1.8 | Chính sách cửa hàng (ngân hàng, phụ thu lễ) | ● | ● | ● | ● | ● | ✅ Hoàn thiện | Cài đặt tiệm tab 3/4/8; `organization-settings-policy.ts` |  |
| 1.9 | Cấu hình trường dữ liệu linh hoạt theo shop | ● | ● | ● | ● | ● | ✅ Hoàn thiện | `api/v1/field-config/*`; bảng `field_config_overrides` | Trường do Console tạo chưa nối vào 17 mẫu/form (`van-hanh/truong-du-lieu/_components/truong-tu-tao-tab.tsx:5`) |
| 1.10 | Quản lý & mời thành viên | ● | ● | ● | ● | ● | ✅ Hoàn thiện | `api/v1/members/invite`; `staff-accounts.ts` (mật khẩu tạm hiện 1 lần) | Chưa có luồng mời qua email (nợ #13) — AC dùng mật khẩu tạm nên vẫn đạt |
| 1.11 | Điều chỉnh/gỡ thành viên & thu hồi phiên ngay | ● | ● | ● | ● | ● | ✅ Hoàn thiện | `members/[id]/role`, `DELETE members/[id]`; quyền đọc lại mỗi request (`resolve-session.ts:89`) |  |
| 1.12 | 6 vai trò mặc định | ● | — | ● | ● | ● | ✅ Hoàn thiện | `organization/domain/system-roles.ts` (12 vai hệ thống) |  |
| 1.13 | Tạo vai trò tùy chỉnh | ● | ● | ● | ● | ● | ✅ Hoàn thiện | `/cai-dat/thanh-vien/vai-tro`; `custom-role-editor.ts` + trần cứng |  |
| 1.14 | Hiển thị giao diện & menu theo quyền | ● | — | ● | — | ● | ✅ Hoàn thiện | `layout/nav/nav-store-entries.ts` lọc theo `capability` | Mục "Trợ lý tối ưu" (L6) trỏ tới trang không tồn tại — xem lỗi L-01 |
| 1.15 | Chặn thao tác vượt quyền & ghi log vi phạm | — | ● | ● | ● | ● | ✅ Hoàn thiện | `core/http/request-audit.ts:51` ghi `security.access_denied` |  |
| 1.16 | Khóa cứng quyền nhạy cảm ở tầng server | ● | ● | ● | — | ● | ✅ Hoàn thiện | `core/rbac/capability-catalog.ts` (trần cứng R11, C10…) |  |
| 1.17 | Nhật ký thao tác chi tiết IP/thiết bị | ● | ● | ● | ● | ● | 🔒 Có mã, khoá production | `api/v1/audit-logs`; `auditMutation` ghi IP/UA | Trang `/audit` khoá trên sidebar production (nhưng gõ URL vẫn vào — L-03) |
| 1.18 | Gắn dữ liệu với tổ chức ở tầng database (RLS) | — | — | ● | ● | ● | ✅ Hoàn thiện | `migrations/20261106020000_row_level_security`; `core/tenancy/infra/rls-pool.ts` |  |
| 1.19 | Chặn truy cập chéo (404 Not Found) | ● | ● | ● | — | ● | ✅ Hoàn thiện | `notFound()` ở repository/use-case; ca S-01/S-02 trong `tests/tenant` |  |

## 2. Quản lý sản phẩm, mẫu hoa & hình ảnh

| Mã | Chức năng | UI | API | Backend | DB | Test | Trạng thái | Bằng chứng | Ghi chú / AC |
|---|---|:-:|:-:|:-:|:-:|:-:|---|---|---|
| 2.1 | Tạo thẻ sản phẩm mẫu hoa | ● | ● | ● | ● | ● | ✅ Hoàn thiện | `/san-pham/tao-moi`; `products/domain/product-code.ts` (`AUTO-`) |  |
| 2.2 | Cập nhật thẻ sản phẩm & đồng bộ Thẻ Chào | ● | ● | ● | ● | ● | ✅ Hoàn thiện | Thẻ Chào đọc sản phẩm trực tiếp qua `greeting_catalog_products` | Chưa chạy E2E đồng bộ mô tả |
| 2.3 | Trạng thái sản phẩm (Nháp/Hoạt động/Lưu trữ) | ● | ● | ● | ● | ● | ✅ Hoàn thiện | `api/v1/products/bulk-status`; thùng rác `storage/trash` |  |
| 2.4 | Biến thể kích cỡ (Nhỏ/Vừa/Lớn/VIP) | ● | ● | ● | ● | ● | ✅ Hoàn thiện | bảng `product_variants` |  |
| 2.5 | Định mức nguyên liệu BOM | ● | ● | ● | ● | ● | ✅ Hoàn thiện | `api/v1/costing/recipes/[productId]`; bảng `product_recipes` |  |
| 2.6 | Nhập danh mục hàng loạt từ Excel/CSV | ● | ● | ● | ● | ● | ✅ Hoàn thiện | `/san-pham/nhap-hang-loat` + `bulk-import/import-preview.tsx`; `products/batch-import`, hoàn tác lô |  |
| 2.7 | Duyệt đề xuất thay đổi thông tin/giá 2 bước | ● | ● | ● | ● | ● | ✅ Hoàn thiện | `api/v1/product-change-requests/*`; `assert-not-self-approval.ts` |  |
| 2.8 | Cấu hình khả dụng, ẩn mẫu theo ngày | ● | ● | ● | ● | ● | ✅ Hoàn thiện | `/san-pham/kha-dung`; `availability/blocks`; `assert-product-date-open.ts` |  |
| 2.9 | Lưu bộ nội dung tư vấn bán hàng chuẩn SEO | ● | ● | ● | ● | ● | ✅ Hoàn thiện | `api/v1/product-copies/generate` (qua `callCapability`) |  |

## 3. Tạo & quản lý báo giá

| Mã | Chức năng | UI | API | Backend | DB | Test | Trạng thái | Bằng chứng | Ghi chú / AC |
|---|---|:-:|:-:|:-:|:-:|:-:|---|---|---|
| 3.1 | Cấu hình quy tắc giá 4 nhóm (Thưởng/Sàn/Trần) | ● | ● | ● | ● | ● | 🔒 Có mã, khoá production | `api/v1/pricing-rules`; trang `/gia` | `/gia` khoá production (có guard) — AC C-02 không chạy được trên production |
| 3.2 | Bộ tính giá tự động (hoa + phí cắm + phụ phí) | ● | ● | ● | ● | ● | ✅ Hoàn thiện | `greeting-card/use-cases/brochure-quote.ts` |  |
| 3.3 | Tính giá vốn thực tế (nguyên liệu + bao bì + thợ) | ● | ● | ● | ● | ● | ✅ Hoàn thiện | `/tinh-gia/gia-von`, `/tinh-gia/nguyen-lieu`; `costing/domain/cost-calculator` |  |
| 3.4 | Kiểm soát cảnh báo & chặn giá dưới sàn | ● | ● | ● | — | ● | ✅ Hoàn thiện | `costing/use-cases/price-floor-guard.ts` (C10) | Chỉ chặn khi sản phẩm đã có công thức + giá vốn đủ; thiếu dữ liệu thì không có sàn |
| 3.5 | Quản lý ưu đãi, mã giảm giá, miễn phí ship | ● | ● | ● | ● | ● | ✅ Hoàn thiện | `/uu-dai/ma-giam-gia`; `vouchers/batches` |  |
| 3.6 | Phụ phí 6 kiểu dáng, hệ số ngày lễ 1.3x & VAT | ● | ● | ● | ● | ● | ✅ Hoàn thiện | `craft-fee-for-product.ts`, `order-vat.ts`, hệ số lễ |  |
| 3.7 | Đề xuất & duyệt giảm giá sâu trình Điều hành | ● | ● | ● | ● | ● | ✅ Hoàn thiện | `greeting-card/use-cases/discount-requests.ts` |  |
| 3.8 | Soạn & xem trước báo giá chuyên nghiệp | ● | ● | ● | ● | ● | ✅ Hoàn thiện | `/bao-gia`; `sales/use-cases/create-quotation.use-case.ts` |  |
| 3.9 | Lưu & quản lý báo giá theo mã | ● | ● | ● | ● | ● | ✅ Hoàn thiện | `api/v1/quotations`; mã BG-… |  |
| 3.10 | Điều chỉnh báo giá & lưu vết phiên bản | ● | ● | ● | ● | ● | ✅ Hoàn thiện | `quotations/[id]/revisions`; bảng `quotation_revisions` |  |
| 3.11 | Chia sẻ báo giá qua link / file PDF A6 | ● | ● | ● | ● | ● | ✅ Hoàn thiện | `/bg/[token]` + `quote-export-buttons.tsx` (PNG, PDF A6) |  |
| 3.12 | Chuyển báo giá chốt thành đơn hàng 1-click | ● | ● | ● | ● | ● | ✅ Hoàn thiện | `quotations/[id]/convert` |  |
| 3.13 | Báo giá tự động realtime trên Thẻ Chào | ● | ● | ● | — | ● | ✅ Hoàn thiện | `public/brochure/[sendCode]/quote` |  |

## 4. Tiếp nhận, quản lý & xử lý đơn hàng

| Mã | Chức năng | UI | API | Backend | DB | Test | Trạng thái | Bằng chứng | Ghi chú / AC |
|---|---|:-:|:-:|:-:|:-:|:-:|---|---|---|
| 4.1 | Tạo đơn hàng bán lẻ/chuỗi | ● | ● | ● | ● | ● | ✅ Hoàn thiện | `api/v1/orders` POST; `orders/use-cases/create-order.ts` |  |
| 4.2 | Tự tạo đơn từ form khách trên Thẻ Chào/Link | ● | ● | ● | ● | ● | ✅ Hoàn thiện | `public/brochure/[sendCode]/order`; `place-brochure-order.ts` |  |
| 4.3 | Danh sách/chi tiết đơn & lọc nâng cao | ● | ● | ● | ● | ● | ✅ Hoàn thiện | `/don-hang`; `orders/workbench` |  |
| 4.4 | 3 hệ thống trạng thái độc lập | ● | ● | ● | ● | ● | ✅ Hoàn thiện | cột trạng thái xử lý/sản xuất/giao trên `orders` |  |
| 4.5 | Quản lý khung giờ giao & sức chứa chi nhánh | ● | ● | ● | ● | ● | ✅ Hoàn thiện | `slot-availability.ts`; `delivery/my-runs` (không trả giá) |  |
| 4.6 | Đổi thông tin đơn giữ vết | ● | ● | ● | ● | ● | ✅ Hoàn thiện | `order-change.ts`; bảng `order_change_requests` |  |
| 4.7 | Luồng hủy đơn & hoàn tiền duyệt 2 bước | ● | ● | ● | ● | ● | ✅ Hoàn thiện | `orders/[id]/cancel` + duyệt huỷ |  |
| 4.8 | Lịch sử thao tác đơn tóm tắt | ● | ● | ● | ● | ● | ✅ Hoàn thiện | `orders/[id]/events`; bảng `order_events` |  |
| 4.9 | In phiếu xưởng (khổ A6) & thiệp/băng rôn | ● | ● | ● | — | ● | ✅ Hoàn thiện | `/in-phieu/[id]`; `orders/[id]/print` |  |
| 4.10 | Xuất danh sách đơn Excel | ● | ● | ● | — | ● | ✅ Hoàn thiện | `orders/export` — 4 trang tính |  |
| 4.11 | Lịch sử đơn liên quan cùng khách hàng | ● | ● | ● | ● | ● | 🔒 Có mã, khoá production | `crm/customers/[id]/orders` | Màn `/khach-hang` khoá production (có guard) — AC G-07 |
| 4.12 | Bảng điều phối phân cấp mức rủi ro trễ giờ | ● | ● | ● | ● | ● | 🔒 Có mã, khoá production | `coordinator/domain/state-mapper.ts:115` (4 mức rủi ro) | `/dieu-phoi` khoá sidebar production, không có guard URL (L-03) |
| 4.13 | Phân công thợ cắm & hàng đợi chế tác | ● | ● | ● | ● | ● | ✅ Hoàn thiện | `orders/[id]/assign`, `orders/my-work` |  |
| 4.14 | Theo dõi đơn thiếu thông tin | ● | ● | ● | ● | ● | ✅ Hoàn thiện | `orders/[id]/info-requests` |  |
| 4.15 | Kiểm tra chất lượng QC | ● | ● | ● | ● | ● | ✅ Hoàn thiện | bảng `order_qc_records` |  |
| 4.16 | AI chấm ảnh QC so với mẫu gốc | ● | ● | ● | ● | ● | ✅ Hoàn thiện | `verify-qc-photo-ai.ts` → `callCapability`; `ai-qc-report-card.tsx` | Phụ thuộc khoá nhà cung cấp AI trên môi trường |
| 4.17 | Bàn giao shipper & lên lịch giao lại | ● | ● | ● | ● | ● | ✅ Hoàn thiện | `shipper-runs.ts`; hẹn giao lại |  |
| 4.18 | Ảnh xác nhận giao hàng tận tay (POD) bắt buộc | ● | ● | ● | ● | ● | ✅ Hoàn thiện | `verify-pod-photo-ai.ts`; bắt buộc ảnh POD |  |
| 4.19 | Bảng điều phối đối tác ngoài, đếm ngược | ● | ● | ● | ● | ● | ✅ Hoàn thiện | `/subcontract/[orderCode]`; `public/subcontract/*` |  |
| 4.20 | Cổng chi nhánh cách ly đơn hàng | ● | ● | ● | ● | ● | ✅ Hoàn thiện | `/cua-hang`; `branch-portal/orders` |  |
| 4.21 | Cấu hình sức chứa tối đa theo khung giờ/lễ | ● | ● | ● | ● | ● | ✅ Hoàn thiện | `holiday-capacity.ts` |  |
| 4.22 | Lập kế hoạch thanh toán cọc/còn lại tự động | ● | ● | ● | ● | ● | ✅ Hoàn thiện | `payment-plan-quote.ts` |  |
| 4.23 | Mã VietQR động | ● | ● | ● | — | ● | ✅ Hoàn thiện | `payment-instructions.ts` (VietQR) |  |
| 4.24 | Tải ảnh biên lai chuyển khoản & AI gợi ý | ● | ● | ● | ● | ● | ✅ Hoàn thiện | `process-payment-proof-job.ts` → `callCapability` |  |
| 4.25 | Điều hành "Xác nhận tiền về" mở đơn cắm | ● | ● | ● | ● | ● | ✅ Hoàn thiện | `confirm-brochure-payment.ts` (R11 trần Điều hành) |  |
| 4.26 | Thu phần tiền còn lại | ● | ● | ● | ● | ● | ✅ Hoàn thiện | `remind-collect-due.ts`, `deliver-before-pay.ts` |  |
| 4.27 | Ghi nhận hoàn tiền khi hủy đơn | ● | ● | ● | ● | ● | ✅ Hoàn thiện | `payment-reconciliation.ts`; hoàn tiền khi huỷ |  |
| 4.28 | Đối soát tự động ngân hàng | ● | ● | ● | ● | ● | ✅ Hoàn thiện | `public/payments/sepay`; `match-standard-bank-transfers.ts` | Cần cấu hình SePay thật |
| 4.29 | Tự động cập nhật trang theo dõi của khách | ● | ● | ● | — | ● | ✅ Hoàn thiện | `brochure-tracking-view.tsx:101` làm mới 15 giây |  |
| 4.30 | Cấu hình kênh báo tin nhân viên | ● | ● | ◐ | ● | ● | 🟡 Một phần | Trong ứng dụng, email, Telegram chạy thật | Kênh SMS, Zalo, Web Push cho nhân viên là stub `NOT_CONFIGURED` (`notification/infra/channel-adapters/`) |
| 4.31 | Tự động gửi Zalo ZNS / SMS cho khách | ● | ● | ● | ● | ● | ✅ Hoàn thiện | `greeting-card/adapters/zalo-zns-adapter.ts`, `esms-adapter.ts`; trừ credit mỗi tin | Cần thông tin OA/eSMS thật |
| 4.32 | Tự động nhắc lịch giao trước 60 & 30 phút | ◐ | ● | ◐ | ● | ◐ | 🟡 Một phần | `coordinator/use-cases/manage-reminder-policy.ts`; tab AI & kênh | Mốc M1/M2 chỉ hiện ở thanh nhắc `/dieu-phoi` (khách tự kéo, không đẩy tin); trang này khoá production |

## 5. Thẻ Chào mẫu hoa & trang khách hàng

| Mã | Chức năng | UI | API | Backend | DB | Test | Trạng thái | Bằng chứng | Ghi chú / AC |
|---|---|:-:|:-:|:-:|:-:|:-:|---|---|---|
| 5.1 | Tạo bộ mẫu Thẻ Chào theo chủ đề/dịp | ● | ● | ● | ● | ● | ✅ Hoàn thiện | `/the-chao`; `greeting-card/catalogs` |  |
| 5.2 | Chia sẻ link rút gọn gắn mã nhân viên bán | ● | ● | ● | ● | ● | ✅ Hoàn thiện | `create-send-link.ts`; `/s/[code]` |  |
| 5.3 | Cấu hình thời hạn & thu hồi link Thẻ Chào | ● | ● | ● | ● | ● | ✅ Hoàn thiện | `share-links.ts` (thu hồi, thời hạn) |  |
| 5.4 | Tự tạo mã QR & ảnh ghép 3-4 mẫu | ● | ● | ● | — | ● | ✅ Hoàn thiện | `catalog-collage.ts` (ảnh ghép + QR) |  |
| 5.5 | Công tắc cấu hình ẩn/hiện giá & thành phần | ● | ● | ● | — | ● | ✅ Hoàn thiện | `display-settings.ts` |  |
| 5.6 | Bảng bán hàng realtime theo dõi hành vi khách | ● | ● | ● | ● | ● | ✅ Hoàn thiện | `tracking/views/kanban-view.tsx` (làm mới 30 giây) | Sát ngưỡng AC "trong 30 giây" |
| 5.7 | Màn hình "Hộp thư việc hôm nay" ưu tiên | ● | ● | ● | ● | ● | ✅ Hoàn thiện | `get-inbox.ts` |  |
| 5.8 | Cấu hình phân quyền xem đơn Sale | ● | ● | ● | — | ● | ✅ Hoàn thiện | `sale-visibility.ts` |  |
| 5.9 | Khách xem mẫu hoa (vuốt, thả tim) | ● | ● | ● | ● | ● | ✅ Hoàn thiện | `get-catalog-hearts.ts` |  |
| 5.10 | Đặt hoa trực tiếp từ Thẻ Chào | ● | ● | ● | ● | ● | ✅ Hoàn thiện | `/b/[sendCode]`; `place-brochure-order.ts` |  |
| 5.11 | Nút "Nhắn tư vấn mẫu này" gắn mã sản phẩm | ● | ● | ● | ● | ● | ✅ Hoàn thiện | `submit-product-inquiry.ts` |  |
| 5.12 | Trang khách xem tiến độ cắm & ảnh thành phẩm | ● | ● | ● | — | ● | ✅ Hoàn thiện | `get-tracking-timeline.ts`; trang theo dõi trong `/b/[sendCode]` (`brochure-tracking-view.tsx`) |  |
| 5.13 | Khách duyệt ảnh QC thành phẩm trong 10 phút | ● | ● | ● | ● | ● | ✅ Hoàn thiện | `domain/photo-approval.ts` (mặc định 10 phút, tự đồng ý) |  |
| 5.14 | Đề xuất thay loại hoa thiếu qua link duyệt | ● | ● | ● | ● | ● | ✅ Hoàn thiện | `flower-substitute.ts` |  |
| 5.15 | Màn hình cảm ơn, mã giảm giá & đặt lại đơn | ● | ● | ● | ● | ● | ✅ Hoàn thiện | `thank-you-voucher.ts`, `start-another-order.ts` |  |

## 6. Báo cáo hoạt động & tài chính

| Mã | Chức năng | UI | API | Backend | DB | Test | Trạng thái | Bằng chứng | Ghi chú / AC |
|---|---|:-:|:-:|:-:|:-:|:-:|---|---|---|
| 6.1 | Báo cáo tổng hợp đơn hàng & tỷ lệ hủy/trễ | ● | ● | ● | ● | ● | 🔒 Có mã, khoá production | `api/v1/reports/orders`; `/bao-cao` | `/bao-cao` khoá sidebar production, không có guard URL (L-03) |
| 6.2 | Báo cáo doanh thu thực thu vs dự kiến | ● | ● | ● | ● | ● | 🔒 Có mã, khoá production | `api/v1/reports/revenue` | như 6.1 |
| 6.3 | Báo cáo sản phẩm bán chạy & tông màu ưa thích | ● | ● | ● | ● | ● | 🔒 Có mã, khoá production | `api/v1/reports/products` | như 6.1 |
| 6.4 | Báo cáo phễu chuyển đổi Thẻ Chào & Sale | ● | ● | ● | ● | ● | ✅ Hoàn thiện | `get-sales-funnel.ts`; Dashboard Thẻ chào |  |
| 6.5 | Báo cáo hiệu suất (Sale/Thợ/Shipper) | ● | ● | ● | ● | ● | 🔒 Có mã, khoá production | `api/v1/reports/performance` | như 6.1 |
| 6.6 | Báo cáo đối chiếu thu tiền: sổ thu vs ngân hàng | ● | ● | ● | ● | ● | 🔒 Có mã, khoá production | `api/v1/reports/cashflow` | như 6.1 |
| 6.7 | Báo cáo truy vết lịch sử đơn giải quyết khiếu nại | ● | ● | ● | ● | ● | ✅ Hoàn thiện | `get-tracking-timeline.ts`, `order_events` |  |
| 6.8 | Xuất báo cáo tài chính ra Excel (.xlsx) | ● | ● | ● | — | ● | ✅ Hoàn thiện | `export-orders.ts` (xlsx) |  |
| 6.9 | Báo cáo tiêu thụ hạn mức AI theo kỳ | ● | ● | ● | ● | ● | 🔒 Có mã, khoá production | `usage/summary?period=`; `/muc-dung` | `/muc-dung` khoá sidebar production, không có guard URL |

## 7. AI phân tích, nội dung & marketing

| Mã | Chức năng | UI | API | Backend | DB | Test | Trạng thái | Bằng chứng | Ghi chú / AC |
|---|---|:-:|:-:|:-:|:-:|:-:|---|---|---|
| 7.1 | AI nhận diện ảnh mẫu (loại hoa, cành, màu) | ● | ● | ● | ● | ● | ✅ Hoàn thiện | `/tai-anh`; `vision/analyses`; worker `smeos-worker-vision` |  |
| 7.2 | Bộ nội dung marketing tự động từ 1 ảnh | ● | ● | ● | ● | ● | ✅ Hoàn thiện | `products/one-image-kit/run`; `journey/use-cases/one-image-kit.ts` |  |
| 7.3 | Màn hình kiểm tra sẵn sàng sản phẩm ra thị trường | ● | ● | ● | — | ● | ✅ Hoàn thiện | điểm sẵn sàng trên trang chủ Quản lý sản phẩm |  |

## 8. Landing page bán hàng

| Mã | Chức năng | UI | API | Backend | DB | Test | Trạng thái | Bằng chứng | Ghi chú / AC |
|---|---|:-:|:-:|:-:|:-:|:-:|---|---|---|
| 8.1 | Trình dựng Landing Page bộ sưu tập / sự kiện | ● | ● | ● | ● | ● | 🟡 Một phần | `/landing-page` (`LandingPageStudioClient`), `/c/[slug]`, `public/catalog/[slug]/order` | Lối vào theo AC ("Công cụ → Tạo catalog") khoá production; `/landing-page` vẫn mở |

## 9. Chat nội bộ, đa chuỗi & phân quyền nâng cao

| Mã | Chức năng | UI | API | Backend | DB | Test | Trạng thái | Bằng chứng | Ghi chú / AC |
|---|---|:-:|:-:|:-:|:-:|:-:|---|---|---|
| 9.1 | Trao đổi / chat nội bộ trên từng đơn | ● | ● | ● | ● | ● | 🟡 Một phần | Khung trao đổi trên đơn (`internal-messages.ts`); `internal-chat/*` | Màn `/tin-nhan` (Trao đổi nội bộ) khoá sidebar production |
| 9.2 | Hồ sơ thương hiệu | ● | ● | ● | ● | ● | ✅ Hoàn thiện | `api/v1/brand-profile` |  |
| 9.3 | Hồ sơ kinh doanh | ● | ● | ● | ● | ● | ✅ Hoàn thiện | `api/v1/business-profile` |  |
| 9.4 | Thư viện tài nguyên & thùng rác 30 ngày | ● | ● | ● | ● | ● | ✅ Hoàn thiện | `storage/trash/*`; `/kho-du-lieu` |  |
| 9.5 | Quản lý kết nối Webhook/API key | ● | ● | ● | ● | ● | ✅ Hoàn thiện | `integration-tokens/*` (cấp, xoay, thu hồi) |  |
| 9.6 | Quản lý tác vụ nền & chạy lại tác vụ lỗi | ● | ● | ● | ● | ● | 🔒 Có mã, khoá production | `jobs/[id]/retry`; `/job` | `/job` khoá sidebar production, không có guard URL |
| 9.7 | Cấu hình chính sách & trần chi phí AI tháng | ● | ● | ● | ● | ● | 🔒 Có mã, khoá production | `api/v1/ai-policy`; `/cai-dat-ai` | `/cai-dat-ai` khoá production (có guard); trần credit tháng ở `/muc-dung` cũng khoá |
| 9.8 | Console quản trị nền tảng đa cửa hàng | ● | ● | ● | ● | ● | ✅ Hoàn thiện | `/van-hanh` (Console) | Mục "Catalog toàn hệ thống" trỏ `/van-hanh/san-pham` không tồn tại — L-02 |
| 9.9 | Luồng thẩm định & duyệt đăng ký tổ chức mới | ● | ● | ● | ● | ● | ✅ Hoàn thiện | `auth/signup`; `/van-hanh/dang-ky` |  |
| 9.10 | Khởi tạo tổ chức & khởi tạo gói dịch vụ | ● | ● | ● | ● | ● | ✅ Hoàn thiện | `platform/use-cases/create-organization.ts` |  |
| 9.11 | Duyệt 2 bước cho thao tác nhạy cảm | ● | ● | ● | ● | ● | ✅ Hoàn thiện | `orders/approval-requests/*` |  |
| 9.12 | Cơ chế chặn tự nâng quyền chính mình | — | ● | ● | — | ● | ✅ Hoàn thiện | `organization/use-cases/assert-not-self-approval.ts` |  |
| 9.13 | Cách ly phân quyền dữ liệu theo chi nhánh | ● | ● | ● | ● | ● | ✅ Hoàn thiện | phạm vi `branch_id` trong `TenantContext` |  |
| 9.14 | Đăng nhập 1 lần (SSO 15 phút) | ● | ● | ● | — | ● | 🟡 Một phần | `sso/domain/sso-claims.ts` (JWT 15 phút) | Ứng dụng liên kết chưa sẵn: SocialFlow chưa nối core (nợ #45); `/lich-dang`, `/ket-noi` không chạy trên production |

## 10. Quản lý credit AI, hạn mức & thuê bao SaaS

| Mã | Chức năng | UI | API | Backend | DB | Test | Trạng thái | Bằng chứng | Ghi chú / AC |
|---|---|:-:|:-:|:-:|:-:|:-:|---|---|---|
| 10.1 | Xem số dư credit AI & lịch sử tiêu thụ | ● | ● | ● | ● | ● | 🔒 Có mã, khoá production | `usage/summary`; `/muc-dung` | `/muc-dung` khoá sidebar production |
| 10.2 | Hoàn 100% credit AI khi tác vụ bị lỗi | — | — | ● | ● | ● | ✅ Hoàn thiện | `usage/domain/refund-policy.ts` (FAILED, CANCELLED, Guard từ chối) |  |
| 10.3 | Thiết lập hạn mức dịch vụ (trần AI, SMS, Zalo) | ● | ● | ● | ● | ● | ✅ Hoàn thiện | `usage/limits`; Console quy đổi credit; `message-overdraft.ts` | Phần cửa hàng tự đặt trần (AC I-05) nằm ở `/muc-dung` đang khoá |
| 10.4 | Ghi nhận chi phí thật (USD/VND) đo lợi nhuận | ● | ● | ● | ● | ● | ✅ Hoàn thiện | bảng `provider_cost_entries`; Console biên lợi nhuận |  |
| 10.5 | Cảnh báo khi credit AI còn dưới 20% | ● | ● | ● | — | ● | ✅ Hoàn thiện | `usage/use-cases/credit-alerts` |  |
| 10.6 | Admin nạp / hoàn / tặng credit khuyến mãi | ● | ● | ● | ● | ● | ✅ Hoàn thiện | Console → Tổ chức → Credit |  |
| 10.7 | Quản lý & thu phí thuê bao SaaS | ● | ● | ● | ● | ● | ✅ Hoàn thiện | `subscription/*`; `subscription-guard.ts` (chỉ xem khi quá hạn) | Cửa hàng xem gói/hoá đơn ở `/muc-dung` đang khoá |
| 10.8 | Cấu hình trỏ tên miền riêng (Custom Domain) | ● | ● | ● | ● | ● | ✅ Hoàn thiện | `custom-domains/*` (TXT/CNAME, khoá từ Console) |  |
