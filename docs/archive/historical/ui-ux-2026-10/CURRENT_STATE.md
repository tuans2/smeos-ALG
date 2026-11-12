# CURRENT STATE — FRONTEND ARCHITECTURE & INVENTORY (SMEOS)

> Tài liệu thực hiện trong khuôn khổ **Phase 1: UI/UX Standardization & Runtime UI System**.  
> Đối chiếu trực tiếp mã nguồn thực tế tại ngày: 28/10/2026.  
> Không sửa đổi code ứng dụng trong giai đoạn này.

---

## 1. TỔNG QUAN FRONTEND STACK

| Hạng mục | Công nghệ thực tế trong repo | Phiên bản / Chi tiết | Ghi chú kiến trúc |
|---|---|---|---|
| **Framework** | Next.js (App Router) | `16.4.2` | Kết hợp Server Components (RSC) mặc định và Client Components ("use client") |
| **Core UI Library** | React & React DOM | `19.3.1` | Sử dụng tính năng mới của React 19 (Hooks, Action, Transitions) |
| **CSS Strategy** | Tailwind CSS v4 | `@tailwindcss/postcss ^4.3.3`, `tailwindcss ^4.3.3` | Khai báo toàn bộ token tại `@theme` trong `src/app/globals.css` |
| **Animation** | tw-animate-css | `^1.4.0` | Thư viện hiệu ứng CSS tích hợp Tailwind |
| **UI Primitives** | Base UI + Radix UI + shadcn | `@base-ui/react ^1.9.0`, `@radix-ui/react-select`, `@radix-ui/react-tooltip`... | Kết hợp Base UI (Dialog, Popover) và Radix UI |
| **Icon System** | Lucide React | `^1.59.0` | Toàn bộ icon vector SVG nhất quán (`NAV_ICONS`, UI components) |
| **Data Fetching (Client)** | SWR | `^2.5.1` | Dùng cho polling, background revalidation và local cache |
| **Validation** | Zod | `^4.6.7` | Kiểm chuẩn schema client & API contracts |
| **Lint & Quality Tools** | Custom UX Lint CLI | `scripts/ux-lint.ts` (kiểm tra R1–R12) | Kiểm soát ratchet vi phạm token màu và cỡ chữ |

---

## 2. KIẾN TRÚC ROUTING & LAYOUT

### 2.1. Phân vùng Route Groups
Hệ thống smeOS chia làm 4 phân vùng ứng dụng chính:

1. **Phân vùng Nghiệp vụ Chính (`src/app/(app)/`)**:
   - Chứa 37 module route phục vụ quản trị và vận hành cửa hàng / doanh nghiệp.
   - Bao bọc bởi `src/app/(app)/layout.tsx` với cơ chế xác thực phiên máy chủ (`resolveAppSession`), phân quyền RBAC theo năng lực (`can()`), kiểm soát vai trò (`roleUx`), nhúng Copilot toàn cục (`AlgGlobalCopilot`), thông báo động (`LiveRegionProvider`) và ngôn ngữ đa ngành (`I18nProvider`).
   - Điều hướng kép: **DesktopNav** (Sidebar 240px / 56px thu gọn) và **BottomNav** (Thanh điều hướng dưới đáy màn hình 5 nút chuẩn cho mobile) + **MobileNavDrawer**.

2. **Phân vùng Quản trị Nền tảng (`src/app/(platform)/`)**:
   - Dành riêng cho Console Vận hành Nền tảng (`/van-hanh`), quản lý toàn bộ tenants, gói cước, hạ tầng AI models và kiểm soát chi phí.

3. **Phân vùng Xác thực & Đăng nhập (`src/app/(auth)/`)**:
   - `/dang-nhap`, `/dang-ky`, `/quen-mat-khau`.
   - Thiết kế giao diện minh họa thực vật (Botanical illustrations) với bảng màu thương hiệu đặc trưng.

4. **Phân vùng Công khai & Chia sẻ Khách hàng (Storefront & Public Links)**:
   - Tuyến đường chia sẻ nhanh không yêu cầu tài khoản nội bộ: `/b/` (Brochure), `/c/` (Catalog), `/g/` (Greeting card), `/s/` (Shortlink), `/bst/` (Bộ sưu tập), `/subcontract/` (Phiếu gia công).

---

## 3. DANH MỤC CÁC TRANG & MODULE (37 ROUTE APP)

| Nhóm chức năng | Route chính | Vai trò / Trải nghiệm chính | Đặc điểm giao diện hiện tại |
|---|---|---|---|
| **Tổng quan** | `/` | Mọi vai trò (Dashboard theo vai) | Role-specific Workspace, KPI Cards, Toolkit Shortcuts, ChoiceGrid |
| **Sản phẩm & Danh mục** | `/san-pham`, `/catalog`, `/kho-templates` | Thợ, Quản lý kho, Điều hành | Danh sách card sản phẩm, bộ lọc ngành, modal tạo sản phẩm, BOM định lượng |
| **Đơn hàng & Bán hàng** | `/don-hang`, `/bao-gia`, `/the-chao` | Thu ngân, Bán hàng, Điều phối | Bảng danh sách đơn, drawer chi tiết, trạng thái thanh toán, phiếu in ấn |
| **Điều phối & Gia công** | `/dieu-phoi`, `/noi-bo` | Điều phối viên, Thợ gia công | Lưới thẻ đơn hàng nhận/chuyển giao, Living Card Telegram, xác nhận shipper |
| **Khách hàng & Chăm sóc** | `/khach-hang`, `/tin-nhan`, `/hoi-thoai` | Bán lẻ, CSKH | Lịch sử mua hàng, chat đa kênh, phân khúc khách hàng |
| **Studio & AI Sáng tạo** | `/creative-studio`, `/tai-anh`, `/video` | Content Creator, Thợ chụp ảnh | Tải ảnh thông minh, Studio chỉnh ảnh tự động, tạo poster banner A6, ghép video |
| **Hồ sơ & Thiết lập** | `/ho-so`, `/cua-hang`, `/bo-may`, `/cai-dat`, `/vai-tro`, `/cai-dat-ai` | Chủ cửa hàng, Quản lý | Cài đặt chính sách thanh toán, định mức cọc, cấu hình đa ngành, chia sẻ link |
| **Báo cáo & Phân tích** | `/so-lieu`, `/du-lieu`, `/market-intelligence`, `/audit` | Chủ tiệm, Kế toán | Biểu đồ doanh thu, báo cáo tồn kho nguyên liệu, phân tích thị trường |

---

## 4. CHIẾN LƯỢC CSS & DESIGN TOKENS HIỆN TRẠNG

### 4.1. Bộ Token "Mộc Lan" (Khai báo tại `src/app/globals.css`)
Hệ thống đang áp dụng Bộ nhận diện Mộc Lan (18/09/2026), tập trung vào phong cách ấm áp lấy cảm hứng từ hoa mộc lan:
- **Màu sắc nền tảng (Semantic Tokens)**:
  - `--color-primary`: `#7A2E42` (Đỏ mận mộc lan, contrast 9.14:1 với trắng, đạt AAA)
  - `--color-primary-dark`: `#57202F`
  - `--color-bg`: `#FBF6F2` (Màu kem ngà ấm áp làm nền toàn trang)
  - `--color-surface`: `#FFFFFF` (Nền card / panel)
  - `--color-surface-alt`: `#F5ECE4` (Nền xám ấm nhạt)
  - `--color-border`: `#E7DCD0` (Viền ngăn cách trang nhã)
  - `--color-text`: `#2A1E22` (Chữ chính màu than ấm, contrast 14.97:1 với bg)
  - `--color-text-muted`: `#746364` (Chữ phụ đạt 4.68:1 với bg, sát ngưỡng AA)
  - `--color-accent`: `#C89B3C` (Vàng đồng trang trí)
  - `--color-secondary`: `#9CAF88` / `--color-secondary-text`: `#52643F` (Xanh sage)
  - Bảng màu trạng thái: `--color-warning` (`#C97A2E`), `--color-danger` (`#C4463D`), `--color-success` (`#52643F`), `--color-info` (`#1D4ED8`).

### 4.2. Thang Cỡ Chữ Chuẩn Hóa
- `text-caption` (11px, lh 1.35)
- `text-meta` (12px, lh 1.4)
- `text-body-sm` (13px, lh 1.5)
- `text-body` (13.5px, lh 1.5)
- `text-title-sm` (14.5px, lh 1.4)
- `text-title` (17px, lh 1.3)
- `text-display` (20px, lh 1.25)
- `text-display-lg` (22px, lh 1.2)
- `text-display-xl` (26px, lh 1.15)

---

## 5. ĐÁNH GIÁ SỰ PHÙ HỢP CỦA HỆ THỐNG HIỆN TẠI

1. **Điểm mạnh**:
   - Đã có hệ thống token ngữ nghĩa rõ ràng tại `globals.css` với tỷ lệ contrast WCAG 2.1 AA/AAA đã được đo đạc toán học.
   - Layout navigation (`DesktopNav` + `BottomNav`) hỗ trợ phân cấp vai trò rất tinh vi (`roleUx`, `unlockedTools`, `navHiddenKeys`).
   - Có công cụ đo lường vi phạm chất lượng giao diện nội bộ (`scripts/ux-lint.ts`).
2. **Điểm yếu & Rào cản**:
   - Vẫn còn sự pha trộn giữa 3 chuẩn CSS: Token Mộc Lan, Token shadcn (`text-foreground`, `bg-background`), và CSS Tailwind thô (`text-stone-700`, `bg-zinc-50`).
   - Thiếu tầng trừu tượng (Theme Provider / Preset Registry) để có thể hoán đổi các bộ token ở runtime.
   - Chưa có cơ chế quản lý Density (khoảng cách dày đặc vs rộng rãi) cho các giao diện quản trị B2B.
