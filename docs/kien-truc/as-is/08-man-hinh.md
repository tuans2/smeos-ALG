# 8. UI / View Inventory — As-Is

"Vai" = mã năng lực gác mục điều hướng (`nav-model.ts`) và/hoặc `can()` trong trang; máy chủ vẫn kiểm lại ở API. "🔒prod" = tuyến bị thay bằng màn "Sắp ra mắt" khi `NEXT_PUBLIC_APP_ENV=production` (`src/lib/feature-lock.ts`, `FeatureLockedGuard` trong `layout.tsx` của tuyến). Không chạy giao diện — hiển thị thật: NOT VERIFIED.

## 8.1 Màn hình nhân viên — nhóm `(app)` (cần phiên tổ chức)

| View | Mục đích | Chức năng chính | Vai | Dữ liệu (API) | Status |
|---|---|---|---|---|---|
| `/` | Trang chủ theo vai | Chọn component theo `resolveRoleUx` (xem [UF-02](05-luong-nguoi-dung.md)) | mọi thành viên | Server Component, `resolveAppSession` | Implemented |
| `/khach-hang` | CRM | Danh sách, tạo, chi tiết khách, nhắc dịp | `Q1` | `/crm/customers`, `/crm/reminders/upcoming` | Implemented |
| `/don-hang` | Sổ đơn M10 | Tạo, chi tiết, cập nhật trạng thái, in, huỷ, checkout từ chat | `R1` | `/orders*` | Implemented |
| `/hoi-thoai` 🔒prod | Hội thoại tư vấn | Danh sách hội thoại, tin nhắn, tạo đơn | `T1` | `/chat/conversations*` | Implemented |
| `/hoi-thoai/kenh-tich-hop` 🔒prod | Kênh chat | Bật/tắt, cấu hình Facebook/Zalo/widget | không gác ở mục (POST cần `T4`) | `/chat/channels` | Implemented |
| `/chat` | — | `redirect("/hoi-thoai")` | — | — | Implemented (chuyển hướng) |
| `/catalog` 🔒prod | Catalog & QR, landing | Tạo link catalog, chiến dịch landing, sinh nội dung catalog/landing | `J1` | `/catalog-links`, `/products`, `/vision/analyses`, `/content-engine/*-generate` | Partially (không sửa/thu hồi link) |
| `/the-chao` | Thẻ chào | 5 tab: Bộ sưu tập (`L1`), Theo dõi (`R1`), Bán hàng (`R2`), Điều hành (`R9` hoặc `F2`), Điều phối (`R3`/`R4`/`R5`); hộp việc | `R1` | `/greeting-card/*` | Implemented |
| `/san-pham` | Danh sách sản phẩm | Tra cứu, chuyển vào thùng rác | `L1` (+ `G3`/`L4` cho thùng rác) | `/products`, `/storage/trash` | Implemented |
| `/san-pham/[id]` | Chi tiết sản phẩm | Xem/sửa | `L1` | `/products/:id` | Implemented |
| `/san-pham/[id]/tinh-nang` | Chọn tính năng AI cho sản phẩm | `FeaturePicker` tạo job theo module | `L1` | `/products/:id`, `/integration/products/:id/master-image`, `/usage/summary`, `/jobs/batch` | Partially (nhiều feature đích không có worker; `hasCustomerConsent: false // TODO`) |
| `/san-pham/[id]/tinh-nang/product-copy/[copyId]` | Dữ liệu bán hàng | Xem, sửa, duyệt/từ chối | `H5`/`H6` | `/product-copies/:id*` | Implemented |
| `/san-pham/tao-moi` | Tạo mẫu hoa | Tải ảnh + tạo sản phẩm | `L2` | `/assets*`, `/products` | Implemented |
| `/san-pham/nhap-hang-loat` | Nhập Excel & ảnh | Kéo thả, xem trước, kết quả | `L2` | `/products/batch-import` | Implemented |
| `/tai-anh` | Quét ảnh hoa (M01 → M01b) | Tải ảnh, phân tích, sửa, duyệt, sinh/duyệt dữ liệu bán hàng, ghi đè mẫu, dịp; có khối dữ liệu mẫu cứng khi chưa có phân tích thật (`MOCK_*_PLACEHOLDER`) | `H1` (+`H2`,`H3`,`H5`,`H6`) | `/assets*`, `/vision/analyses*`, `/jobs/:id`, `/product-copies*`, `/template-overrides`, `/occasions` | Implemented (tệp 1.877 dòng) |
| `/kho-du-lieu` | Kho dữ liệu | Hub lưu trữ, thùng rác | `G1` | `/assets`, `/storage/*` | Implemented |
| `/gia` | Tính giá | Sửa quy tắc giá | `L6` | `/pricing-rules` | Implemented |
| `/bao-gia` | Thẻ báo giá | Chọn mẫu, báo giá khách/đối tác, sao chép nội dung; "phân tích ảnh" giả lập | không có mục điều hướng; trỏ từ danh mục journey | `/products` (+ 5 mẫu cứng `SAMPLE_PRODUCTS`) | Partially Implemented |
| `/market-intelligence` 🔒prod | Nghiên cứu thị trường | Xu hướng, nghiên cứu từ khoá, trí tuệ sản phẩm, cấu hình | `V2` | `/market-intelligence/*` (qua component) | Implemented |
| `/creative-studio` 🔒prod | Creative Studio | Khu vực: trí tuệ sản phẩm, biến thể ảnh, nội dung, âm thanh, gói chiến dịch | `I1` (`?tab=area-d`: `I4`) | `/assets/*`, `/product-intelligence/*`, `/media/*`, `/creative-production/*`, `/audio/*` | Implemented |
| `/video` 🔒prod | Video Studio | Danh sách, tạo, storyboard, duyệt, render | `I1` | `/video/jobs*` | Implemented |
| `/noi-dung` 🔒prod | Viết nội dung | Sinh bài đa kênh, duyệt | `I1` | `/content-engine/generations*`, `/products`, `/vision/analyses` | Implemented (không gửi sang Lịch đăng) |
| `/lich-dang` 🔒prod | Lịch đăng | Danh sách bài SocialFlow, xếp lịch, đăng; chỉ số mô phỏng | không gác | `/proxy/api/m07/posts*`, `/proxy/api/posts/*` | Partially (nhánh lỗi báo thành công giả) |
| `/kho-templates` 🔒prod | Kho mẫu | Thư viện xem trước template (dữ liệu tĩnh trong trang) | không gác | — | Implemented (tĩnh) |
| `/dieu-phoi` | Điều phối | Tab Control Tower + tab Thẻ chào (điều phối); nhãn "Đang triển khai" trên tiêu đề | `C23` (chỉ UI) | `/coordinator/*`, `/field-config*`, `/greeting-card/*` | Implemented |
| `/job`, `/job/[id]` | Job | Danh sách, chi tiết, tiến độ, huỷ, chạy lại | `G4` | `/jobs*` | Implemented |
| `/duyet` | Hàng chờ duyệt | Duyệt phân tích, ảnh tối ưu, dữ liệu bán hàng; xuất CSV | `H3` | `/vision/analyses*`, `/media/optimizations*`, `/product-copies*` | Implemented |
| `/so-lieu` | Số liệu | Báo cáo kinh doanh (tính ở client), sổ lời gọi AI, chi phí, nhật ký | `U3` (+`U2`) | `/ai-policy`, `/ai-requests`, `/audit-logs`, `/orders`, `/usage/summary` | Implemented |
| `/muc-dung` | Mức dùng | Bảng usage, tổng hợp | `G8` | `/usage*` | Implemented |
| `/audit` | Nhật ký kiểm toán | Lọc, xem chi tiết before/after | `G9` | `/audit-logs` | Implemented |
| `/ho-so` | Hồ sơ cửa hàng | Hồ sơ kinh doanh, thương hiệu, tài sản thương hiệu | `F1` | `/business-profile`, `/brand-profile` (qua component) | Implemented |
| `/tri-thuc` | Tri thức | Nội dung hướng dẫn tĩnh, thanh tiến độ onboarding | không gác | `knowledge-data` (tĩnh) | Implemented (tĩnh) |
| `/cai-dat-ai` | Chính sách AI | Trần mô hình theo năng lực, thứ tự nhà cung cấp | `U1` (+`U2`) | `/ai-policy`, `/creative-production/providers` | Implemented |
| `/ket-noi` | Kết nối kênh | Tài khoản mạng xã hội qua SocialFlow (thêm, đăng nhập, kiểm, xoá) | không gác | `/proxy/api/accounts*` | Implemented phía core (SocialFlow NOT VERIFIED) |
| `/bo-may` | Bộ máy phân tích ảnh | Xem/chọn bộ máy vision | `H4` | `/vision/engine` | Implemented |
| `/cai-dat` | Cài đặt | Công tắc tổ chức (`F2`), liên kết tới bộ máy (`H4`) | `F1` | `/organizations/current` (qua component) | Implemented |
| `/cai-dat/thanh-vien` | Thành viên | Mời, đổi vai, gỡ | `F3`/`F4`/`F5` | `/members*`, `/roles`, `/branches` | Implemented |
| `/vai-tro` | Danh mục vai trải nghiệm | Bảng 16 khuôn, đánh dấu vai của tôi (chỉ đọc) | không gác | `role-ux-catalog.ts` (tĩnh) | Implemented (tĩnh) |
| `/them` | Lối "Thêm" trên mobile | Lưới mục điều hướng (mục khoá hiện "Sắp ra mắt") + lối tắt tạo | `H3`/`I2`/`L2` cho lối tắt | `/products` | Implemented |

Thành phần toàn cục của `(app)/layout.tsx`: `DesktopNav`, `BottomNav`, `GlobalImageZoom`, `SessionTakeoverWatcher`, `AlgGlobalCopilot` (chat nổi, gọi `/chat/conversations*`), `LiveRegionProvider`.

## 8.2 Đăng nhập & console nền tảng

| View | Mục đích | Vai | Dữ liệu | Status |
|---|---|---|---|---|
| `/dang-nhap` | Đăng nhập / đăng ký; báo "đăng nhập ở thiết bị khác"; không có quên mật khẩu | công khai | `/auth/login`, `/auth/signup` | Implemented |
| `(platform)/layout.tsx` | Gác người vận hành, không có → `redirect("/")` | operator | `resolvePlatformSession` | Implemented |
| `/van-hanh` | Trang chủ vận hành | operator | `PlatformJourneyHome` | Implemented |
| `/van-hanh/to-chuc`, `/van-hanh/to-chuc/[id]` | Danh sách / chi tiết tổ chức | `N1` | `/platform/organizations*` | Implemented |
| `/van-hanh/muc-dung` | Mức dùng toàn hệ thống | `N4` | `/platform/usage` | Implemented |
| `/van-hanh/suc-khoe` | Sức khoẻ (chỉ đọc) | `N5` | `/platform/health` | Implemented |
| `/van-hanh/nhat-ky` | Nhật ký xuyên tổ chức | `N6` | `/platform/audit-logs` | Implemented |
| `/van-hanh/truong-du-lieu` | Trường lõi, trường tự tạo, danh mục, ghi đè tổ chức | `N12` | `/platform/fields*`, `/platform/catalogs*`, `/platform/behaviors`, `/platform/organizations/:id/field-*` | Implemented (trường tự tạo chưa nối vào biểu mẫu) |

## 8.3 Trang công khai (không đăng nhập)

| View | Mục đích | Dữ liệu | Status |
|---|---|---|---|
| `/b/[sendCode]` | Trang Thẻ chào của một khách: nhận chủ phiên, quẹt mẫu, đặt, thanh toán, theo dõi | Server: `getGreetingCatalogForCustomer`; client: `/public/brochure/*` | Implemented |
| `/g/[id]` | Bộ sưu tập công khai theo id + ảnh OG ghép | `getPublicGreetingCatalog`; `/public/greeting-catalog/*` | Implemented |
| `/bst/[orgSlug]/[catalogCode]` | Bộ sưu tập công khai theo slug tiệm + mã | `getPublicGreetingCatalogBySlug` | Implemented |
| `/s/[code]`, `/s/[code]/mo` | Link chia sẻ theo người sao chép → tạo phiên riêng → `/b/...` | `shareLinkPreview`, `openShareLink` | Implemented |
| `/c/[slug]` | Storefront catalog + form lead | `getPublicCatalog`; `/public/catalog/:slug/lead` | Implemented |
| `/chinh-sach-bao-mat` | Chính sách bảo mật (tĩnh) | — | Implemented (tĩnh) |

## 8.4 Component không được dùng (Unused component)

Không có tệp production nào import (dò import tĩnh): `components/chat/public-storefront-chat-widget.tsx`, `components/creative-studio/optimize-workspace.tsx`, `components/dashboard/store-manager-dashboard.tsx`, `components/greeting-card/journey/journey-action-cards.tsx`, `components/greeting-card/sales/channel-funnel-stats.tsx`, `components/greeting-card/sales/sales-funnel-stats.tsx`, `components/journey/action-contract-wrapper.tsx`, `components/layout/coming-soon.tsx`, `components/market-intelligence/scheduled-pulse-panel.tsx`, `components/media/media-export-modal.tsx`, `components/storage/storage-sidebar.tsx`, `components/ui/inline-source-picker.tsx`, `components/upload/upload-wizard.tsx`, `components/templates/index.ts`, `components/templates/coordinator/index.ts`. Ngoài ra `components/dashboard/experience-grid.tsx` được import ở `src/app/(app)/page.tsx` nhưng không được render.
