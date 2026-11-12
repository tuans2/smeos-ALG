# smeOS Design System — Single Source of Truth (SSOT)

> **Cấp thẩm quyền:** `CANONICAL` · **Cấp bậc tài liệu:** `Level 3` · **Phiên bản:** `1.3.3` (theo ADR-011 D-UI-12; lịch sử ở `CHANGELOG.md`)  
> **Chủ quản:** Product Owner / Lead UI-UX Architect  
> **Nguyên tắc cốt lõi:** **Code là nguồn sự thật**. Tài liệu này đóng vai trò chỉ mục trung tâm và hợp đồng quy chuẩn (Contract) cho toàn bộ giao diện của nền tảng SaaS Đa ngành SMEOS.

---

## 1. Triết lý Thiết kế & Nguyên tắc Bất biến

1. **Multi-Industry First**: Mọi component và layout thiết kế trung tính hoặc thích ứng động theo `IndustryPluginContract`. Cấm hardcode tên ngành hoặc màu sắc đặc thù vào component lõi.
2. **Zero Hardcoded Aesthetics**: 100% thuộc tính thẩm mỹ (màu, font, bo góc, bóng đổ) phải tiêu thụ thông qua **Design Tokens ngữ nghĩa**. Cấm màu Tailwind gốc (`bg-red-500`, `text-blue-600`...) và 12 thang màu alias (`cool`, `blush`, `mint`...).
3. **Server-Side Theme Resolution**: Theme được phân giải tại máy chủ và gắn vào `<html data-theme data-density>`. Không tiêm inline style ở client, không gây hiện tượng nháy giao diện (FOUC).
4. **Mobile-First & Touch Target Compliance**:
   - Vùng chạm sàn tuyệt đối 24px (WCAG 2.5.8).
   - Mọi điều khiển chính và điều khiển trên con trỏ thô (`pointer: coarse`) bắt buộc ≥ 44px.
   - Hỗ trợ chuẩn 6 khổ màn hình: 360, 390, 768, 1024, 1280, 1440px.
5. **Universal Headless Primitive**: Chuẩn hóa toàn bộ thành phần tương tác trên `@base-ui/react` (1.9.0) và biểu tượng Phosphor qua `@/components/ui/icons`.

---

## 2. Bản đồ Chỉ mục Hệ thống (Design System Index)

| Thành phần | Vị trí Mã nguồn (SSOT) | Đặc tả Quy chuẩn & Hợp đồng | Trạng thái |
|---|---|---|:---:|
| **Design Tokens** | `src/styles/tokens/*.css` (`globals.css`) | [tokens.md](tokens.md) *(sinh tự động từ CSS)* | 🟡 Đang hoàn thiện GĐ 1 |
| **Component Primitives** | `src/components/ui/` | [components/](components/) *(Hợp đồng từng component)* | 🟡 Đang hoàn thiện GĐ 2 |
| **Bố cục & Archetypes** | `src/components/layout/` | [layouts.md](layouts.md) *(Archetype A–F, AppShell)* | 🟢 Đối chiếu mã 07/11/2026 |
| **Quy chuẩn Responsive** | Điểm ngắt mặc định Tailwind v4 (không ghi đè trong `src/styles/tokens/`) | [responsive.md](responsive.md) *(360px → 1440px)* | 🟡 Mới kiểm tự động 390 và 1280px |
| **Quy chuẩn Trợ năng (A11y)**| `src/components/ui/live-region.tsx` | [accessibility.md](accessibility.md) *(WCAG 2.2 AA)* | 🟡 Chưa kiểm trình đọc màn hình |
| **Hợp đồng Màn hình** | `docs/dac-ta/screen-contracts/` | `docs/dac-ta/screen-contracts/_TEMPLATE.md` | 🟡 Di trú v2 GĐ 4 |
| **Lịch sử & Thay đổi** | `CHANGELOG.md` | [CHANGELOG.md](CHANGELOG.md) | 🟢 Bắt đầu từ v1.0.0 |
| **Nhật ký Audit Gốc** | `docs/design-system/audit-log.md` | [audit-log.md](audit-log.md) *(MEUX Deep Audit)* | 📁 Lưu trữ tham khảo |

---

## 3. Chính sách Quản trị Token & Component (Governance)

- **Quy trình thêm/sửa Token**:
  - Tuyệt đối cấm lập trình viên hoặc AI Agent tự ý bổ sung token vào `globals.css`.
  - Mọi thay đổi hoặc bổ sung token phải thông qua Pull Request chạm vào `src/styles/tokens/`, được kiểm tra độ tương phản tự động và có **PO phê duyệt** (`CODEOWNERS`).
- **Bản chép giá trị preset và density**: `src/lib/ui-system/presets.ts` chép màu, bo góc, bóng đổ, phông của 4 preset chỉ để UI Studio hiển thị; `DENSITY_CONFIG` (`src/lib/ui-system/tokens.ts`) chép đệm bảng, đệm thẻ, khoảng cách trường của `density.css`. Giá trị có hiệu lực là CSS. Sửa CSS trước rồi chép lại — `src/lib/ui-system/presets-css-parity.test.ts` đỏ khi hai nơi lệch.
- **Liên kết trong tài liệu này**: mọi liên kết tương đối phải trỏ tới tệp có thật (`tests/unit/architecture/design-system-ssot.test.ts`).
- **Preset mặc định — AVI Lotus Group (`alg`)**: từ 12/11/2026 (đổi nhận diện mức 3, chờ PO xác nhận) mọi tầng dùng preset `alg` trong `themes.css`; Console và Chuỗi chỉ giữ mật độ gọn. Màu trạng thái lấy từ màu phụ của brand kit: màu gốc cho nền/viền, sắc đậm cùng tông cho chữ để đạt AA (`tests/unit/ux/alg-brand-theme.test.ts`). Phông Google Sans (SIL OFL) tự lưu ở `src/app/fonts/google-sans/`. Tên và logo hiển thị lấy từ `src/lib/brand.ts`.
- **Quy trình Deprecation**:
  - Không xóa bỏ đột ngột component hoặc prop đang dùng.
  - Phải gắn thẻ `@deprecated` kèm hướng dẫn thay thế trong ít nhất một bản minor trước khi gỡ bỏ ở bản major tiếp theo.

---

## 4. Các Cổng Kiểm soát Tự động (Automated Gates)

Mọi đóng góp mã nguồn liên quan đến giao diện bắt buộc vượt qua các cổng kiểm soát:
1. `npm run lint:ux -- --check`: Kiểm chuẩn 100% token ngữ nghĩa, cỡ chữ, chống jargon và chống alias lách luật.
2. `npm run check:screen-contracts -- --check`: Đảm bảo mọi `page.tsx` đều có Screen Contract v2 hợp lệ hoặc miễn trừ có lý do (đỏ cả khi trang chỉ có contract v1). Chạy trong job `web` của `ci.yml`.
3. `npm run test:e2e:ux`: Chạy kiểm thử tự động visual snapshot 2 khổ (390px, 1280px) và quét `axe-core` đạt 0 lỗi Critical/Serious.
4. `npm run check:layers`: Ngăn ngừa vi phạm ranh giới kiến trúc (cấm UI import trực tiếp từ `infra/`).

---

## 5. Tài liệu Lưu trữ Lịch sử (Archive)

Toàn bộ các bản nháp, báo cáo audit cũ và tài liệu chuyển đổi giai đoạn tháng 10/2026 đã được lưu trữ an toàn tại:
`docs/archive/historical/ui-ux-2026-10/`.
Các tài liệu trong thư mục archive mang tính chất tham khảo lịch sử, **không phải là nguồn sự thật** cho phát triển hiện tại.

