---
id: SCR-STORE-cai-dat
tier: STORE
module: organization
route: /cai-dat
archetype: F
snapshots:
  mobile: 390x844
  desktop: 1280x800
acceptance:
  - Thông số cơ bản của tiệm lưu đúng và phản hồi thành công
  - Lưới liên kết sâu 4 phân hệ chuyển hướng chính xác
  - Có đầy đủ trạng thái loading skeleton, error, dirty validation
---

# Screen Contract — Cài Đặt Tiệm & Cấu Hình Hoạt Động

**Tuyến:** `/cai-dat` · **Tệp chính:** `src/app/(app)/cai-dat/page.tsx`, `src/components/organization/shop-fields-settings-tab.tsx` · **Cập nhật:** 05/11/2026 · **Thẻ:** T5.D9

## 1. Vai và mục đích
- Vai chính (03b): `store_manager`, `operations_manager`
- Phạm vi: organization
- Việc chính: Chỉnh sửa nhanh các thông số cơ bản của tiệm tại chỗ (tên tiệm, hotline, địa chỉ, giờ mở cửa) kết hợp liên kết sâu (deep links) đến 4 khu vực thiết lập chuyên sâu.
- Câu hỏi chính: Thông số cơ bản của tiệm hiển thị ra ngoài thế nào, làm sao truy cập nhanh các cài đặt chuyên sâu về AI, mạng xã hội, bộ máy và thương hiệu?
- Mật độ: MEDIUM (giao diện lưới trực quan kết hợp form nhập liệu gọn gàng).

## 2. Hiện trạng (audit)
- API:
  - `GET /api/v1/business-profile` → Đọc thông tin cơ bản của tiệm
  - `PUT /api/v1/business-profile` → Lưu thông tin cơ bản của tiệm (cần quyền `F2` hoặc `H4`)
  - Tab "Trường dữ liệu" (chỉ hiện khi có `D18`, mặc định Điều hành): `GET /api/v1/field-config/settings`, `POST /api/v1/field-config` (thêm trường riêng), `PUT /api/v1/field-config` (ẩn/hiện, đổi tên)
  - Tab "Thẻ Chào & quy trình" — phần bán hàng (`src/components/greeting-card/admin/brochure-commerce-settings.tsx`): Sale được xem khách nào, giảm giá tối đa mỗi đơn, người phụ trách link cũ, khu vực và phí giao, ngày lễ (phụ phí, số đơn tối đa, giờ chốt), phí chế tác theo kiểu dáng và hệ số ngày lễ, phí chế tác theo tiền nguyên liệu; chuỗi thêm cấu hình điều phối và nhận đơn gia công qua Zalo
  - Tab "Thương hiệu" (BRANDING): **PHÁT_TRIỂN_SAU (PO 08/11/2026)** — chỉ môi trường phát triển thấy; `?tab=BRANDING` ngoài dev về tab Thông tin. Chức năng thương hiệu chỉ còn ở `/ho-so` và nhóm "Hồ sơ & Thương hiệu" trên `/cong-cu`.
  - Tab "Tên miền riêng" (chỉ hiện khi có `D19`, mặc định Điều hành; checklist ALG 10.8): `GET/POST /api/v1/custom-domains`, `POST /api/v1/custom-domains/:id/verify`, `DELETE /api/v1/custom-domains/:id` — `src/components/organization/custom-domain-settings-tab.tsx`
- Khối: 3 khối chính:
  1. Hướng dẫn chuẩn hóa K1 (`FeatureGuidanceCard` duy nhất)
  2. Lưới liên kết sâu 4 phân hệ thiết lập (`/ho-so`, `/cai-dat-ai`, `/ket-noi`, `/bo-may`)
  3. Form chỉnh sửa nhanh thông số cơ bản (Tên tiệm, Hotline, Địa chỉ, Giờ mở cửa)
- Nút primary: Đúng 1 nút "Lưu cài đặt tiệm" (`variant: "primary"`, chỉ sáng khi form có thay đổi)
- Trạng thái có sẵn: tải ☑ rỗng ☑ lỗi ☑ thành công ☑

## 3. Thứ bậc thông tin
| Lớp | Nội dung | Vị trí hiển thị |
|---|---|---|
| L0 Thiết yếu | Tên tiệm, hotline, địa chỉ, giờ phục vụ | Form thông số cơ bản |
| L1 Hành động | Lưu cài đặt tiệm, Các thẻ liên kết sâu | Chân form & Lưới liên kết |
| L2 Ngữ cảnh | Hướng dẫn K1, thông báo đồng bộ hóa đơn/Zalo | FeatureGuidanceCard |
| L3 Chi tiết | 4 thẻ liên kết sâu đến từng khu vực chuyên sâu | Lưới 4 cột |

## 4. Hành động
- Chính (1): `Lưu cài đặt tiệm` (`variant: "primary"`, chỉ kích hoạt khi form dirty).
- Phụ (4): Các thẻ liên kết sâu (`Link` có focus-visible và hover effect).
- Tab "Trường dữ liệu": chọn Đơn hàng/Đối tác; mỗi trường có ô đổi tên ("Lưu tên" chỉ hiện khi đã sửa) và công tắc Hiện/Ẩn — trường bắt buộc của hệ thống hiện "Luôn hiện", công tắc khoá; khối "Thêm trường riêng" (tên, kiểu: Chữ ngắn/Đoạn văn/Số/Số tiền/Ngày/Số điện thoại, công tắc "Bắt buộc nhập", nút "Thêm trường").
- Tab "Tên miền riêng": ô nhập tên miền + nút chính "Thêm tên miền"; mỗi tên miền một dòng gồm trạng thái (Chờ xác minh / Đang hoạt động / Đã bị khoá), nút "Kiểm tra" (chỉ khi chờ xác minh), "Hướng dẫn DNS" (mở/đóng hai bản ghi TXT và CNAME cần thêm), "Gỡ" (hộp xác nhận nêu hậu quả; ẩn khi bị khoá). Tên miền bị khoá hiện lý do khoá.
- Tab thanh toán, khối "Tự huỷ đơn chưa thanh toán (catalog, trang bán hàng)": công tắc (mặc định tắt) + số giờ 2–168 (mặc định 24) + nút "Lưu"; đơn nhập tay và đơn từ báo giá không bị tự huỷ (audit hành trình UJ-12, 07/11/2026).
- Thẻ "Liên kết chuỗi" (trên các tab, chỉ hiện với quyền `F2` khi có lời mời hoặc chuỗi đang tham gia): đồng ý / từ chối lời mời liên kết của chuỗi (hạn 7 ngày), rời chuỗi kèm lý do. Đích của thông báo `CHAIN_LINK_INVITED` / `CHAIN_LINK_STATUS_CHANGED` (audit hành trình UJ-10, 07/11/2026).

## 5. Content budget
- Nút nổi: Đúng 1 primary action trên toàn màn hình.
- Khối chính: 3 khối rõ ràng, không lồng ghép rườm rà.

## 6. Trạng thái
- Tải: `SkeletonBlock` 4 dòng.
- Lỗi: Alert box màu vàng cảnh báo WCAG.
- Thành công: Alert box màu xanh lá thông báo lưu thành công.

## 7. Responsive
- 390px: Lưới liên kết xếp 1 cột dọc, form nhập liệu 1 cột.
- 768px: Lưới liên kết 2 cột, form 2 cột.
- 1280px+: Lưới liên kết 4 cột, tối đa `max-w-5xl` căn giữa.

## 8. Trợ năng
- Form: Toàn bộ input có label rõ ràng, kết hợp icon trực quan.
- Thẻ liên kết: Dùng thẻ `Link` semantic với `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary`.
- Thông báo: Thông báo thành công và lỗi có icon và text rõ nghĩa.
- Audit 04/11/2026 (`npm run ux:audit -- cai-dat`, 10 tab + 9 trang con, 390/1280px): mọi ô chọn/nhập/chọn màu có tên truy cập; chữ trên nền vàng/đỏ nhạt dùng `text-warning-text`/`text-danger-text`; lưới chọn ngành khi đã khoá **không** làm mờ (chỉ khoá thao tác) và không còn nút "Mở khóa đổi ngành (Có phí)" chỉ bật `alert` — thay bằng dòng hướng dẫn liên hệ quản trị viên; không hiện mã kỹ thuật (mốc nhắc điều phối hiện số thứ tự 1–5, lựa chọn thu thập dữ liệu chuỗi bằng tiếng Việt, không hiện khoá trường). Tab "Luồng thẻ chào" sửa 06/11/2026 sau khi PO gỡ đóng băng Thẻ chào (D-47), có test khoá hành vi (B5) `src/components/greeting-card/admin/__tests__/brochure-flow-settings.characterization.test.tsx`: ô số thời hạn, checkbox ngôn ngữ, công tắc thông báo nhân viên có tên truy cập; không còn "Admin SaaS".

## 9. AI
- Dữ liệu tên tiệm và hotline từ đây được đồng bộ vào các kịch bản AI Content và AI Chat Sales.

## 10. Dữ liệu và quyền
- Nguồn sự thật: Bảng `business_profiles`.
- Quyền: `F2` (sửa hồ sơ) hoặc `H4` (điều hành). Trường dữ liệu: `D18` (trần cứng Điều hành); trường riêng lưu ở `field_definitions.owner_organization_id`, ghi đè trường hệ thống ở `field_config_overrides`; không hạ được mức sàn của hệ thống. Tên miền riêng: `D19` (trần cứng Điều hành), bảng `custom_domains`; tên miền của tổ chức khác → 404.

## 11. Component
- Dùng lại: `Button`, `SkeletonBlock`, `FeatureGuidanceCard`.
- Tạo mới: `ShopFieldsSettingsTab` (dùng `Badge`, `Input`, `Switch`, `InlineError`, `SkeletonBlock`).

## 12. Ma trận quyết định
| Hiện tại | Mục tiêu | Quyết định | Lý do | Bằng chứng |
|---|---|---|---|---|
| Tuyến `/cai-dat` đang `COMING_SOON` | Triển khai theo định hướng PO | Tạo trang cài đặt tổng hợp kết hợp liên kết sâu | Đáp ứng đúng yêu cầu người dùng, tiết kiệm thao tác | `cai-dat/page.tsx` |
| Quản lý thiết lập phân tán | Trung tâm hóa thiết lập tiệm | Đặt 4 deep links lên đầu trang | Người dùng dễ dàng định hướng toàn bộ hệ thống | `cai-dat/page.tsx` |

## 13. QA Matrix (03a §34)
| Chiều | Kết quả | Ghi chú |
|---|---|---|
| Vai · Việc · IA · Mật độ · Thứ bậc · CTA · Luồng · Trạng thái · Responsive · Trợ năng · Dữ liệu · Quyền · AI · Nhất quán | PASS | Đạt chuẩn 100% |

## 14. Đội ngũ & Phân quyền `/cai-dat/thanh-vien` — tài khoản nhân viên (PO 08/10/2026)
- **Thêm nhân viên** (`A3`, chỉ Điều hành) thay "Mời thành viên": họ tên, email đăng nhập (không cần email thật, mỗi người một email), vai (mặc định Sale) → tài khoản **dùng được ngay**; hộp kết quả hiện email + **mật khẩu tạm một lần** kèm nút "Chép thông tin đăng nhập". Email đã có tài khoản FloraOS → báo lỗi, không chiếm tài khoản người khác.
- Mỗi dòng nhân viên (trừ chính mình): **Đặt lại mật khẩu** (`A7`, hỏi lại; hiện mật khẩu tạm mới, người đó bị đăng xuất mọi máy) · **Tạm khoá / Mở khoá** (`A5`, hỏi lại; khoá là đăng xuất ngay, giữ dữ liệu) · **Phân vai** (`F5`). Trạng thái: Đang hoạt động · Đang tạm khoá · Chờ kích hoạt (lời mời cũ).
- Menu tài khoản (mọi người có `A2`): **Đổi mật khẩu** (mật khẩu hiện tại + mới ≥ 10 ký tự, nhập lại); giữ phiên đang dùng, đăng xuất máy khác.
- Đăng nhập: sai quá 10 lần/15 phút mỗi email → tạm chặn (429).
