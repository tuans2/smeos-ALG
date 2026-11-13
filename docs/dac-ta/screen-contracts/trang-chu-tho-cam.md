# Screen Contract: Trang chủ Thợ cắm hoa — Việc của tôi

| Thuộc tính | Giá trị |
|---|---|
| Đường dẫn | `/` (trang chủ cho vai `tho_cam`) |
| Component | `FloristQueueHome` (`src/components/dashboard/florist-queue-home.tsx`) |
| Vai trải nghiệm | `florist` (STORE) |
| Vai phân quyền gắn khuôn | `tho_cam` → `florist` |
| Homepage model | `FLORIST_QUEUE` (Production Queue) |

## 1. Mục đích

Thợ cắm thấy đúng việc chế tác được giao cho mình (checklist ALG 4.13), sắp theo giờ giao, có công thức, phiên bản khách chọn và số cành, ảnh mẫu, lời thiệp. Không hiển thị giá.

## 2. Cấu trúc bố cục

```
┌──────────────────────────────────────────────┐
│ Header: Vai + Tên tổ chức │ UserMenu          │
├──────────────────────────────────────────────┤
│ FeatureGuidanceCard (tối đa 1)               │
├──────────────────────────────────────────────┤
│ Thẻ việc (lặp): Đơn · giờ giao · trạng thái   │
│   Ảnh mẫu │ Mẫu × SL · Phiên bản: N cành      │
│           │ Công thức (hoa, màu, số lượng)    │
│   Lời thiệp                                   │
│   [Nhận việc] / [Báo xong]  (1 nút chính)     │
└──────────────────────────────────────────────┘
```

## 3. Nguồn dữ liệu

| API | Mục đích |
|---|---|
| `GET /api/v1/orders/my-work` | Việc đang giao cho người đăng nhập |
| `POST /api/v1/orders/:id/my-work` | `{ action: START \| FINISH }` |

## 4. Hành vi

- Skeleton khi tải; 401 → `/dang-nhap`; lỗi → InlineError có Thử lại; không có việc → EmptyState.
- Mỗi thẻ đúng một nút chính: "Nhận việc" (chờ nhận) hoặc "Báo xong" (đang cắm/kiểm tra).

## 5. Năng lực kiểm soát

| Hành động | Mã năng lực |
|---|---|
| Xem và báo tiến độ việc của mình | `R17` |

## 6. Tuân thủ

- [x] Một `<FeatureGuidanceCard />`; một nút chính mỗi thẻ; token ngữ nghĩa; thang chữ hệ thống.
- [x] ≤ 350 dòng; không import Prisma trong component.
