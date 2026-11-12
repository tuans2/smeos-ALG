# Screen Contract: Trang chủ Kế toán

> **Lối vào tuyến khoá (12/11/2026, audit N-05):** khi `NEXT_PUBLIC_APP_ENV=production` bật khoá "Sắp ra mắt", lối vào tuyến khoá bị ẩn thay vì dẫn tới màn khoá (`isHrefOpen`, `src/lib/feature-lock.ts`). Lối tắt "Số liệu kinh doanh" (`/so-lieu`) và "Mức dùng và hạn mức" (`/muc-dung`) ẩn khi tuyến đang khoá. Khoá tắt (staging, bản giao GD1) giữ nguyên.

| Thuộc tính | Giá trị |
|---|---|
| Đường dẫn | `/` (trang chủ cho vai `ke_toan`) |
| Component | `AccountingWorkspace` (`src/components/dashboard/accounting-workspace.tsx`) |
| Vai trải nghiệm | `finance_accounting` |
| Vai phân quyền gắn khuôn | `ke_toan` → `finance_accounting` |
| Homepage model | `ACCOUNTING_WORKSPACE` (Transaction Workspace) |

## 1. Mục đích

Kế toán đối soát và lập báo cáo (checklist ALG 1.12, PO Q7): giao dịch ngân hàng chưa khớp đơn (chỉ xem), lối vào đơn hàng và sổ thu, số liệu, mức dùng, xuất Excel. Không xác nhận tiền — việc đó thuộc Điều hành.

## 2. Cấu trúc bố cục

```
┌──────────────────────────────────────────────┐
│ Header │ UserMenu                             │
├──────────────────────────────────────────────┤
│ FeatureGuidanceCard (tối đa 1)               │
├──────────────────────────────────────────────┤
│ Lối vào: Đơn hàng & sổ thu │ Số liệu │ Mức dùng│
│          [Xuất đơn hàng ra Excel]             │
├──────────────────────────────────────────────┤
│ Giao dịch ngân hàng chưa khớp: nội dung · giờ │
│ · số tiền (tổng ở đầu khối)                   │
└──────────────────────────────────────────────┘
```

## 3. Nguồn dữ liệu

| API | Mục đích |
|---|---|
| `GET /api/v1/greeting-card/payment-events?status=UNMATCHED` | Giao dịch chưa khớp (`R19`) |
| `GET /api/v1/orders/export` | Xuất Excel (`R13`) |

## 4. Hành vi

- Skeleton khi tải; 401 → `/dang-nhap`; lỗi → InlineError; không có giao dịch chưa khớp → EmptyState.

## 5. Năng lực kiểm soát

| Hành động | Mã năng lực |
|---|---|
| Xem đối soát | `R19` |
| Xuất Excel | `R13` |
| Xem đơn, sổ thu | `R1` |

## 6. Tuân thủ

- [x] Một `<FeatureGuidanceCard />`; không có nút chính cạnh tranh; token ngữ nghĩa; định dạng tiền qua `formatCurrency`.
- [x] ≤ 350 dòng; không import Prisma trong component.
