# Screen Contract — Hệ thống Điều hướng Toàn cục (DesktopNav, BottomNav, NavModel)

**Tuyến:** Toàn hệ thống `(app)` · **Tệp chính:** `src/components/layout/nav-model.ts`, `desktop-nav.tsx`, `bottom-nav.tsx`, `src/app/(app)/them/page.tsx` · **Cập nhật:** 26/09/2026 · **Thẻ:** T3.1–T3.9

## 1. Vai và mục đích
- **Vai chính (03b):** Toàn bộ 14 vai trải nghiệm (Role UX) của ALG.
- **Phạm vi:** organization / multi-tenant SaaS.
- **Việc chính:** Cung cấp mô hình điều hướng một nguồn (SSOT), gom nhóm theo việc cần làm của người bán hoa (K5), ưu tiên việc chính theo vai (03b §5), gác hiển thị theo năng lực (RBAC), hỗ trợ tìm kiếm nhanh và thích ứng di động hoàn hảo.
- **Câu hỏi chính:** "Tôi muốn vào chức năng nào nhanh nhất?"
- **Mật độ:** MEDIUM (Desktop: ≤ 8 mục mở sẵn ban đầu, Mobile: thanh 5 slot + trang /them).

## 2. Hiện trạng & Bảng Ánh Xạ Tuyến → Năng Lực (T3.3 SSOT)

| Tuyến (`href`) | Nhãn người dùng | Nhóm (`group`) | Mã NL | Tên năng lực | Nguồn kiểm tra quyền (`route.ts:dòng`) |
|---|---|---|---|---|---|
| `/` | Trang chủ | — | — | Truy cập cơ bản | Không gác — chỉ cần đăng nhập |
| `/khach-hang` | Khách hàng | `ban-hang` | `Q1` | crm.customer.read | `src/app/api/v1/customers/route.ts:16` |
| `/don-hang` | Đơn hàng | `ban-hang` | `R1` | order.read | `src/app/api/v1/orders/route.ts:15` |
| `/hoi-thoai` | Hội thoại | `ban-hang` | `T1` | chat.conversation.read | `src/app/api/v1/chat/conversations/route.ts:16` |
| `/catalog` | Catalog & QR | `ban-hang` | `J1` | catalog.create | `src/app/api/v1/catalogs/route.ts:16` |
| `/san-pham` | Sản phẩm & Giá | `san-pham` | `L1` | product.read | `src/app/api/v1/products/route.ts:28` |
| `/tai-anh` | Quét ảnh hoa | `san-pham` | `H1` | vision.analyze | `src/app/api/v1/vision/analyses/route.ts:25` |
| `/kho-du-lieu` | Kho dữ liệu | `san-pham` | `G1` | asset.read | `src/app/api/v1/assets/route.ts:18` |
| `/gia` | Tính giá | `san-pham` | `L6` | pricing.calculate | `src/app/(app)/gia/page.tsx:32` (`can("L6")`) |
| `/market-intelligence` | Nghiên cứu thị trường | `noi-dung` | `V2` | market_intel.opportunity.read | `src/app/api/v1/market-intelligence/opportunities/route.ts:16` |
| `/creative-studio` | Creative Studio | `noi-dung` | `I1` | media.optimize | `src/app/api/v1/creative/jobs/route.ts:18` |
| `/creative-studio?tab=area-d` | Ảnh marketing | `noi-dung` | `I4` | media.variant.run | `src/app/api/v1/media/variants/route.ts:20` |
| `/video` | Video | `noi-dung` | `I1` | media.optimize | `src/app/api/v1/video/jobs/route.ts:16` |
| `/noi-dung` | Viết nội dung | `noi-dung` | `I1` | media.optimize | `src/app/api/v1/content-engine/generations/route.ts:82` |
| `/lich-dang` | Lịch đăng | `noi-dung` | — | — | Không gác — route chỉ cần đăng nhập (`proxyHandler`) |
| `/kho-templates` | Kho mẫu | `noi-dung` | — | — | Không gác — thư viện chỉ đọc cho mọi tài khoản |
| `/dieu-phoi` | Điều phối | `van-hanh` | `C23` | pricing_card.dispatch_board.view | `src/app/api/v1/dispatch/board/route.ts:16` |
| `/job` | Job | `van-hanh` | `G4` | job.read | `src/app/api/v1/jobs/route.ts:18` |
| `/duyet` | Hàng chờ duyệt | `van-hanh` | `H3` | vision.approve | `src/app/api/v1/vision/analyses/route.ts:55` |
| `/so-lieu` | Số liệu | `van-hanh` | `U3` | ai.request.read | `src/app/api/v1/analytics/route.ts:20` |
| `/muc-dung` | Mức dùng | `van-hanh` | — | COMING_SOON | Trạng thái sắp có, không vào việc chính |
| `/audit` | Nhật ký kiểm toán | `van-hanh` | `A4` | access.user.change_role | Trạng thái sắp có |
| `/ho-so` | Hồ sơ cửa hàng | `thiet-lap` | `F1` | org.read | `src/app/api/v1/organization/route.ts:18` |
| `/tri-thuc` | Tri thức | `thiet-lap` | — | — | Không gác — tài liệu nội bộ client-side |
| `/cai-dat-ai` | Chính sách AI | `thiet-lap` | `U1` | ai.policy.read | `src/app/api/v1/ai-policies/route.ts:16` |
| `/ket-noi` | Kết nối kênh | `thiet-lap` | — | — | Không gác — proxy tài khoản mạng xã hội |
| `/bo-may` | Bộ máy phân tích ảnh | `thiet-lap` | `H4` | vision.engine.view | `src/app/(app)/bo-may/page.tsx:28` (`can("H4")`) |
| `/cai-dat` | Cài đặt | `thiet-lap` | — | COMING_SOON | Trạng thái sắp có |

## 3. Thứ bậc thông tin & 6 Nhóm K5
1. **Việc chính · `<vai>`** (L0): Tự sinh từ `/` (Trang chủ) và `navPriority` của vai trải nghiệm. Luôn mở, không thu gọn.
2. **Bán hàng & Khách** (`ban-hang`): `/khach-hang`, `/don-hang`, `/hoi-thoai`, `/catalog`.
3. **Sản phẩm** (`san-pham`): `/san-pham`, `/tai-anh`, `/kho-du-lieu`, `/gia`.
4. **Nội dung & Tiếp thị** (`noi-dung`): `/market-intelligence`, `/creative-studio`, `/creative-studio?tab=area-d`, `/video`, `/noi-dung`, `/lich-dang`, `/kho-templates`.
5. **Vận hành** (`van-hanh`): `/dieu-phoi`, `/job`, `/duyet`, `/so-lieu`, `/muc-dung`, `/audit`.
6. **Thiết lập** (`thiet-lap`): `/ho-so`, `/tri-thuc`, `/cai-dat-ai`, `/ket-noi`, `/bo-may`, `/cai-dat`.

## 4. Hành động & Tương tác
- **Desktop:**
  - Nhóm Việc chính ghim trên cùng.
  - Các nhóm chức năng có nút thu gọn/mở rộng `aria-expanded`, lưu vào `localStorage` (`floraos_nav_groups_v1`).
  - Tìm kiếm nhanh: gõ `/` focus vào ô tìm kiếm, lọc tức thì không phân biệt dấu tiếng Việt (`stripVietnamese`). Enter chọn kết quả đầu tiên; Esc xóa và thoát.
  - Copilot: nút kích hoạt `⌘K` ở chân thanh điều hướng.
- **Bố cục sidebar desktop (chung cho StoreOS, ChainOS, SaaS Ngành, SaaS Mother):**
  - Rộng `w-64` (256px); thu gọn `w-16` (64px), phím tắt `⌘B`, trạng thái lưu `localStorage`.
  - Đầu sidebar là thẻ không gian làm việc: logo mang màu nhận diện của tầng (`nav-tier-theme.ts`: Mother `orchid`, SaaS Ngành `tone-amber`, ChainOS `tone-blue`, StoreOS `primary`), dải nhấn 2px trên cùng cùng màu, tên tổ chức ở dòng chính, nhãn tầng ở dòng phụ.
  - Tiêu đề nhóm (`nav-section-header.tsx`): chữ nhỏ viết hoa, bỏ số thứ tự đầu nhãn và phần vai trò sau dấu "·" (`formatNavGroupLabel`); mũi tên chỉ hiện khi rê chuột hoặc khi nhóm đóng; nhóm đóng hiện số mục bên trong. Ở chế độ mở rộng, các nhóm ngăn nhau bằng đường kẻ mảnh `border-border`; đường cây dọc chỉ dùng cho mục con lồng trong mục cha (Báo cáo, Ma trận quản trị).
  - Mục điều hướng cao 36px (mục con 32px), icon 18px; trên màn cảm ứng cao 44px. Đang chọn: nền `bg-primary-muted`, chữ `text-primary`, vạch nhấn trái — tách biệt với hover `bg-surface-alt`.
  - Khi thu gọn: ô icon 40px, tooltip định vị cố định theo viewport (không bị vùng cuộn cắt), có cả khi focus bàn phím.
  - Chân sidebar: một hàng Copilot (`⌘K`) và một hàng người dùng (ảnh đại diện, tên, vai, đăng xuất).
  - Mặc định chỉ mở nhóm Việc hôm nay và nhóm chứa trang hiện tại; nhóm người dùng đã tự đóng/mở giữ theo lựa chọn (`nav-group-layout.ts` → `isNavGroupExpanded`).
  - Mục đang chọn là mục có href khớp dài nhất với đường dẫn (`resolveActiveHref`): ở `/cai-dat/ma-tran-uudai` chỉ "Ưu đãi" sáng, "Cài đặt tiệm" (`/cai-dat`) không sáng.
  - Từ 3 mục "Ma trận …" trở lên trong cùng một nhóm được gom vào mục con "Ma trận quản trị" (đóng mặc định, tự mở khi đang ở một trang ma trận; nhãn con bỏ tiền tố "Ma trận"). Nhóm chỉ gồm ma trận (SaaS Mother "Ma trận 4 tầng") giữ nguyên.
- **Mobile BottomNav:**
  - Slot 1: Trang chủ (`/`).
  - Slot 2: Ô thứ hai động theo vai `mobileSecondSlot(can, roleUx)` (vd: sales → Khách hàng, coordinator → Điều phối).
  - Slot 3 (Giữa): Nút tròn nổi gác `H1`. Có `H1` → Tải ảnh; không có `H1` → Việc chính đầu tiên của vai hoặc Sản phẩm.
  - Slot 4: `canApprove` ? Duyệt (`/duyet`) : Job (`/job`).
  - Slot 5: Thêm (`/them`) dẫn tới trang gom tất cả chức năng còn lại theo chuỗi giá trị (chiều cao dòng ≥ 44px).

## 5. Trợ năng & WCAG
- Mọi nút bấm có `aria-expanded`, `aria-current="page"`, `focus-visible:outline-2`.
- Thanh desktop có `aria-label="Điều hướng chính"`.
- Thanh mobile có `aria-label="Điều hướng nhanh"`.
- Mục vô hiệu mang `aria-disabled="true"` và nhãn "Sắp có".

## 6. QA Matrix (03a §34)
| Chiều | Kết quả | Ghi chú |
|---|---|---|
| Vai | PASS | Vai quyết định thứ tự (03b §5), không trùng lặp |
| Việc | PASS | Gom 6 nhóm theo việc (K5) |
| IA | PASS | nav-model là SSOT duy nhất |
| Mật độ | PASS | ≤ 8 mục mở sẵn ban đầu, thu gọn nhớ trạng thái |
| Thứ bậc | PASS | Việc chính L0, chi tiết L1–L3 |
| CTA | PASS | Phím tắt `/`, `⌘K`, nút giữa mobile nổi bật |
| Luồng | PASS | Nhảy trực tiếp, không phụ thuộc trang 404 |
| Trạng thái | PASS | Sắp có hiển thị vô hiệu rõ ràng |
| Responsive | PASS | Desktop w-64 sidebar (thu gọn w-16), Mobile h-16 bottom nav + /them |
| Trợ năng | PASS | Đủ nhãn, aria attributes, focus-visible chuẩn |
| Dữ liệu | PASS | Không chứa mã kỹ thuật R8 (M01b, SSOT, Tháp Vận Hành) |
| Quyền | PASS | Gác theo mã năng lực RBAC kết hợp server verification |
| Nhất quán | PASS | Dùng token ngữ nghĩa `bg-surface-alt`, `text-primary`, `border-border` |
