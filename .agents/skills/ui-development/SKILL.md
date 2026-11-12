---
name: ui-development
description: >-
  Quy tắc phát triển giao diện UI/UX cho ALG. Kích hoạt khi agent tạo/sửa
  React component, page layout, form, modal, hoặc bất kỳ file nào trong
  src/components/, src/app/(app)/, hoặc liên quan đến giao diện người dùng.
---

> **Cập nhật 30/10/2026 — đọc trước phần còn lại của skill này.**
> 1. `docs/dac-ta/ux-patterns/OPERATING_PRINCIPLES.md` (bắt buộc, PD8) → `docs/dac-ta/03c-ux-progressive-disclosure.md` → `03a-ux-constitution.md`.
> 2. Code chuẩn + trạng thái: `.agents/standards/smeos/03-ux.md`; nguyên tắc chung: `.agents/standards/universal/03-ux.md`.
> 3. Dùng `task-state.ts`/`TaskStatus`, `ConfirmDialog`, `Disclosure`, `ResultPanel`, `CostPreview`, `EntitlementGate`; không `window.confirm`, không `<details>` tự viết, không tiến trình giả (lint R13–R16).
> 4. Bề mặt khách thấy: không dữ liệu giả, ưu đãi chỉ từ `listActiveShopPromotions`, không tự xuất bản.
> 5. Chữ: token `*-text`, không `opacity`. Kiểm bằng `npm run ux:audit`; gate `npm run lint:ux -- --check`.
> Khi phần dưới mâu thuẫn với các tài liệu trên → tài liệu trên thắng.


# UI Development — ALG

> Rà theo mã thật: 05/10/2026. Đường dẫn và lệnh `npm run` trong tệp này được `npm run check:docs` kiểm tự động.

## Quick Reference (copy-paste)

### Page layout chuẩn
```tsx
// src/app/(app)/<route>/page.tsx
import { requireTenantContext } from "@/modules/organization/use-cases/resolve-session"
import { MyPageClient } from "@/components/<feature>/my-page-client"

export default async function MyPage() {
  const { ctx } = await requireTenantContext()
  const data = await myUseCase(ctx)
  return <MyPageClient initialData={data} />
}
```

### Client component chuẩn (kèm Tab Action Header & FeatureGuidanceCard)
```tsx
// src/components/<feature>/my-component.tsx
"use client"
import { Sparkles } from "@/components/ui/icon-set/sparkles"
import { MoreHorizontal } from "@/components/ui/icon-set/more-horizontal"
import { Button } from "@/components/ui/button"
import { FeatureGuidanceCard } from "@/components/templates/shared/feature-guidance-card"

export function MyComponent({ data }: { data: MyType }) {
  return (
    <div className="space-y-6">
      {/* 1. Standardized Tab Action Header: Top-right aligned */}
      <div className="flex items-center justify-between">
        <h2 className="text-title font-bold text-text">Tiêu đề màn hình</h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">Lưu nháp</Button>
          <Button variant="primary" size="sm">Chốt duyệt</Button>
          <Button variant="ghost" size="icon" aria-label="Thao tác khác">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* 2. Feature Guidance Card: Max 1 per view/tab */}
      <FeatureGuidanceCard
        badgeLabel="HƯỚNG DẪN THAO TÁC"
        badgeIcon={Sparkles}
        title="Hướng dẫn sử dụng tính năng"
        description="Mô tả ngắn gọn nghiệp vụ trong 2-3 dòng cô đọng."
        tips={[
          "Mẹo 1: Chọn sản phẩm từ danh sách trước khi chỉnh sửa.",
          "Mẹo 2: Dữ liệu được tự động sao lưu định kỳ."
        ]}
      />

      {/* 3. Nội dung chính */}
      <div className="rounded-lg border bg-card p-4">
        {/* ... */}
      </div>
    </div>
  )
}
```

### Loading States: Skeleton vs Spinner
- **Dùng Skeleton** (`<Skeleton className="..." />`): Cho toàn bộ layout ban đầu, danh sách card, bảng dữ liệu khi đang fetch để tránh giật giao diện (CLS - Cumulative Layout Shift).
- **Dùng Spinner** (`<Loader2 className="animate-spin" />`): CHỈ dùng bên trong nút bấm (button inline state) khi người dùng bấm Lưu/Gửi hoặc các tác vụ background cục bộ.
---

## Rules (bắt buộc)

### 1. Ngôn ngữ: 100% Tiếng Việt

**Mọi nội dung user-facing PHẢI bằng tiếng Việt.** Không ngoại lệ.

Áp dụng cho: navigation, menu, button, label, placeholder, tooltip, helper text, form, validation/error message, empty/loading/success state, dialog, modal, notification, toast, dashboard, settings.

**Giữ nguyên**: brand name, tên riêng, URL, email, mã sản phẩm, API identifier.

**Thuật ngữ kỹ thuật**: `Tiếng Việt dễ hiểu (thuật ngữ gốc nếu cần)`.

**Self-check**: quét lại toàn bộ string user-facing trước khi bàn giao.

### 2. Design System Consistency

Trước khi tạo UI mới → kiểm tra: component có sẵn? pattern đã tồn tại? → Có → tái sử dụng. Chưa có lý do hợp lệ → tạo reusable pattern → cập nhật SSOT. Không rõ → STOP, hỏi PO.

**Cấm tự ý tạo mới**: button style, card style, modal pattern, spacing, typography, color semantic, terminology.

### 3. Thứ bậc thông tin

Mỗi màn: Đây là gì? → Quan trọng gì? → Cần làm gì? → Bổ sung?

### 4. Progressive Disclosure

Overview → Liên quan → Hành động → Tùy chọn → Nâng cao. Không phơi bày tất cả.

### 5. Terminology

1 khái niệm = 1 thuật ngữ tiếng Việt xuyên suốt. Chưa rõ → STOP → hỏi PO.

### 6. Loading & Empty States

- **Loading**: Dùng Skeleton cho content layout đã biết, Spinner cho hành động ngắn.
- **Empty state**: Mỗi danh sách PHẢI có empty state với call-to-action ("Chưa có sản phẩm nào. Tạo sản phẩm đầu tiên →").
- **Error boundary**: Mỗi page-level component nên wrap bằng error boundary.

### 7. Toast / Notification

- **Toast**: Hành động vừa thực hiện thành công/thất bại (tự biến mất).
- **Alert inline**: Cảnh báo quan trọng cần user đọc kỹ trước khi tiếp.
- **Modal**: Xác nhận hành động nguy hiểm (xóa, duyệt, gỡ bỏ).

### 8. Route tiếng Việt

Route group `(app)` dùng slug tiếng Việt: `/san-pham`, `/don-hang`, `/khach-hang`. Tạo route mới → slug tiếng Việt có dấu gạch nối. Tuyến cũ tiếng Anh (`/audit`, `/catalog`, `/chat`, `/creative-studio`, `/job`, `/market-intelligence`) giữ nguyên — đổi tên làm gãy link đã chia sẻ; không tự đổi.

### 9. Journey-First UX Architecture (J1–J7)

- **Entry point ưu tiên hành trình (J1)**: Trang chủ và dashboard mở đầu bằng câu hỏi mục tiêu *"Bạn muốn làm gì?"* qua `ChoiceGrid` / `ActionCard`.
- **Cặp chế độ kép bắt buộc (Dual-Mode Entry)**: Mọi chức năng tạo mới/soạn thảo luôn cung cấp 2 chế độ:
  1. *Tự động bằng AI (Automatic AI Fast-Track)*: Tiếp nhận nguyên liệu thô qua `SmartInputDropzone` (Ảnh + Video + Ghi chú) ➔ AI phân tích (Vision, OCR, Content Engine) và **pre-fill sẵn toàn bộ các bước vào Wizard (Human-in-the-loop)**.
  2. *Tự thiết kế từng bước (Manually Guided Wizard)*: Tiến trình lũy tiến từng bước (Progressive Disclosure J2).
- **Progressive Disclosure (J2)**: Chỉ hiển thị dữ liệu và bước tương ứng chặng hiện tại qua `JourneyShell` và `JourneyProgress`.
- **Luôn có Next Actions (J3)**: Mọi kết quả xử lý phải kết nối đến bước tiếp theo qua `<NextActions />`. Tuyệt đối cấm ngõ cụt.
- **AI trong tiến trình (J4)**: Nhúng AI gợi ý trực tiếp vào từng bước tác vụ, không tách rời thành trang biệt lập.
- **Role UX ≠ Quyền (J5)**: Trải nghiệm vai tối ưu hóa luồng, nhưng RBAC và Capability Code vẫn kiểm soát quyền.
- **Hợp đồng tác vụ 7 bước (J6)**: Chuẩn hóa theo `ActionContractWrapper` (Chọn → Nhập → Xem trước → Tiến hành → Xử lý → Kết quả → Tiếp theo).
- **WRAP, không REPLACE (J7)**: Bọc dashboard hiện có vào Journey; cung cấp công tắc Chế độ Chuyên gia (`localStorage`).

---

## DO / DON'T

### ❌ DON'T — Label tiếng Anh
```tsx
<Button>Save Draft</Button>
<p>No items found</p>
<input placeholder="Search products..." />
```

### ✅ DO — Label tiếng Việt
```tsx
<Button>Lưu nháp</Button>
<p>Chưa có mục nào</p>
<input placeholder="Tìm kiếm sản phẩm..." />
```

### ❌ DON'T — useEffect cho data fetching
```tsx
"use client"
export function ProductList() {
  const [products, setProducts] = useState([])
  useEffect(() => {
    fetch("/api/v1/products").then(r => r.json()).then(setProducts)
  }, [])
  return <div>{products.map(...)}</div>
}
```

### ✅ DO — Server Component cho data
```tsx
// page.tsx (Server Component — không cần "use client")
export default async function ProductsPage() {
  const { ctx } = await requireTenantContext()
  const products = await listProducts(ctx)
  return <ProductList products={products} />
}
```

### ❌ DON'T — List không có empty state
```tsx
return <div>{items.map(item => <Card key={item.id} />)}</div>
```

### ✅ DO — List có empty state + loading
```tsx
if (isLoading) return <ProductListSkeleton />
if (items.length === 0) return (
  <EmptyState
    icon={Package}
    title="Chưa có sản phẩm"
    description="Tạo sản phẩm đầu tiên để bắt đầu."
    action={<Button>Tạo sản phẩm</Button>}
  />
)
return <div>{items.map(item => <Card key={item.id} />)}</div>
```

---

## Reference Files

| Pattern | File |
|---|---|
| Base UI components | `src/components/ui/` (button, card, dialog, select...) |
| Journey UI Kit (J1–J7) | `src/components/journey/` (ChoiceGrid, ActionCard, JourneyShell, NextActions) |
| App layout / sidebar | `src/components/layout/` |
| Feature component mẫu | `src/components/catalog/` |
| Dashboard widgets | `src/components/dashboard/` |
| Design tokens (CSS) | `src/app/globals.css` |
| Template components | `src/components/templates/` |
| FeatureGuidanceCard | `src/components/templates/shared/feature-guidance-card.tsx` |
| Page layout mẫu | `src/app/(app)/san-pham/page.tsx` |

## Gotchas

1. **Font "Be Vietnam Pro"** hỗ trợ dấu tiếng Việt đầy đủ. Không đổi font khác khi chưa kiểm tra dấu.
2. **`"use client"` chỉ khi cần** — mặc định Server Component. Chỉ thêm khi cần `useState`, `useEffect`, event handler.
3. **Chuẩn UX 03a**: Màn hình mới/sửa bố cục phải có Screen Contract + `npm run lint:ux -- --check` không tăng vi phạm.
4. **Tối đa 1 `<FeatureGuidanceCard />`** mỗi màn/tab. Cấm spam nhiều khối hướng dẫn.
5. **Chuẩn Journey-First (J1–J7)**: Luôn bắt đầu từ mục tiêu công việc của người dùng, không tạo màn hình cụt thiếu `NextActions`.

---

## 10. Token Ngữ Nghĩa Bắt Buộc (03a §31 — UX Lint R1/R2)

**CẤM dùng màu Tailwind gốc** (`bg-red-100`, `text-emerald-700`, `border-zinc-200`…).
**BẮT BUỘC dùng token ngữ nghĩa** đã đăng ký tại `src/app/globals.css` @theme.

### Bảng ánh xạ màu

| Ý nghĩa | ✅ Token đúng | ❌ CẤM dùng |
|---|---|---|
| Nền trang | `bg-bg` | `bg-stone-50` |
| Nền card/panel | `bg-surface` | `bg-white` |
| Nền phụ/alt | `bg-surface-alt` | `bg-zinc-50`, `bg-gray-50` |
| Viền | `border-border` | `border-zinc-200`, `border-gray-200` |
| Chữ chính | `text-text` | `text-zinc-900`, `text-gray-900` |
| Chữ phụ | `text-text-muted` | `text-zinc-500`, `text-gray-500` |
| Thương hiệu (nền) | `bg-primary` | `bg-red-600` |
| Thương hiệu (chữ) | `text-primary` | `text-red-700` |
| Thương hiệu nhạt (nền) | `bg-primary-muted` | `bg-red-50`, `bg-red-100` |
| Thương hiệu nhạt (viền) | `border-primary-border` | `border-red-200` |
| Thành công (chữ) | `text-success` | `text-emerald-*`, `text-green-*` |
| Thành công (nền) | `bg-success-bg` | `bg-emerald-50`, `bg-green-50` |
| Thành công (viền) | `border-success-border` | `border-emerald-200` |
| Cảnh báo (chữ) | `text-warning` | `text-amber-*`, `text-yellow-*` |
| Cảnh báo (nền) | `bg-warning-bg` | `bg-amber-50` |
| Cảnh báo (viền) | `border-warning-border` | `border-amber-200` |
| Nguy hiểm (chữ) | `text-danger` | `text-red-*` (khi nghĩa là lỗi/nguy hiểm) |
| Nguy hiểm (nền) | `bg-danger-bg` | `bg-red-50` (khi nghĩa là lỗi/nguy hiểm) |
| Nguy hiểm (viền) | `border-danger-border` | `border-red-300` |
| Thông tin (chữ) | `text-info` | `text-blue-*`, `text-sky-*` |
| Thông tin (nền) | `bg-info-bg` | `bg-blue-50`, `bg-sky-50` |
| Thông tin (viền) | `border-info-border` | `border-blue-200` |
| Điểm nhấn | `text-accent`, `bg-accent-bg` | `text-violet-*`, `text-purple-*` |
| Mục đang chọn | `bg-selected`, `text-selected-text` | `bg-indigo-50` |
| Hướng dẫn | `bg-guidance-bg`, `text-guidance` | (dùng `<FeatureGuidanceCard>`) |

### Bảng ánh xạ cỡ chữ

**CẤM dùng `text-[Npx]`**. Dùng thang token:

| Kích thước cần | ✅ Token |
|---|---|
| 9–11.5px | `text-caption` (11px) |
| 12–12.5px | `text-meta` (12px) |
| 13px | `text-body-sm` (13px) |
| 13.5–14px | `text-body` (13.5px) |
| 14.5–15px | `text-title-sm` (14.5px) |
| 16–18px | `text-title` (17px) |
| 19–20px | `text-display` (20px) |

### DO / DON'T — Token ngữ nghĩa

#### ❌ DON'T — Màu thô + cỡ chữ tuỳ ý
```tsx
<div className="bg-red-50 border-red-200 text-red-800 text-[11px]">
  <span className="text-emerald-700 text-[10.5px]">✓ Hoàn thành</span>
</div>
```

#### ✅ DO — Token ngữ nghĩa
```tsx
<div className="bg-danger-bg border-danger-border text-danger text-caption">
  <span className="text-success text-caption">✓ Hoàn thành</span>
</div>
```

**Thiếu token?** → Thêm/sửa token CHỈ qua PR chạm `src/styles/tokens/` và được PO duyệt theo `docs/design-system/README.md` (ADR-011 D-UI-04). CẤM tự ý thêm token.
Kiểm: `npm run lint:ux -- --check` — cấm tăng vi phạm.

## 7. Quy chuẩn Thiết Kế Trực Quan Cao Cấp (High-Fidelity Storefront Standard)

> Tuân thủ bắt buộc theo SSOT `AGENTS.md` (PO 26/10/2026). Áp dụng cho mọi Storefront, Catalog, Lookbook, Card sản phẩm và Poster xuất bản.

### 7.1 Hòa nền ảnh Studio (`photoBackdrop` + `mix-blend-mode: multiply`)
Ảnh sản phẩm phông trắng bắt buộc dùng `mixBlendMode: "multiply"` cùng lớp nền tỏa tâm để tan biến nền trắng studio vào thẻ:
```tsx
<div style={{ background: `radial-gradient(90% 70% at 50% 40%, #ffffff 0%, ${cardBg} 70%)` }}>
  <img src={product.imageUrl} alt={product.name} style={{ mixBlendMode: "multiply" }} />
</div>
```

### 7.2 Phân luồng 4 Card Info Modes
Không dùng chung 1 layout card cho mọi phong cách. Tách biệt rõ 4 component:
- `CatalogCardOverlay` (`infoMode: "overlay"`): Tràn viền điện ảnh + gradient scrim `rgba(0,0,0,0) ➔ rgba(0,0,0,0.9)`.
- `CatalogCardPaper` (`infoMode: "paper"`): Ảnh trên nền giấy ấm, khối thông tin trang nhã bên dưới.
- `CatalogCardGlass` (`infoMode: "glass"`): Hiệu ứng kính mờ `backdrop-blur-xl`, bo góc `rounded-3xl` (`radiusPx: 24`).
- `CatalogCardSplit` (`infoMode: "split"`): Chia đôi ngang phục vụ tra cứu thông số nhanh.

### 7.3 Bố cục thích ứng (Adaptive Bento Grid)
Tuyệt đối CẤM ép sản phẩm vào lưới cố định gây ra ô trống thủng (như 3 món trong lưới 2x2).
- Với 3 sản phẩm: Cột trái 58% (1 Hero lớn) + Cột phải 42% (2 sản phẩm nhỏ xếp dọc).
- Với 1, 2, 4, 5, 6 sản phẩm: Tự động cân đối diện tích, tuyệt đối không để ô trống thừa.

> Xem thêm: skill `api-development` §5 cho cách lấy data từ server. Skill `testing` để test component.
