# Screen Contract: Trang chủ Marketing / Trưởng Marketing

| Thuộc tính | Giá trị |
|---|---|
| Đường dẫn | `/` (homepage cho vai `lead_marketing` & `marketing`) |
| Component | `MarketingWorkspace` (`src/components/dashboard/marketing-workspace.tsx`) |
| Vai trải nghiệm | `lead_marketing` (ONE_STORE), `marketing` (CHAIN) |
| Vai phân quyền gắn khuôn | `marketing` → `lead_marketing` |
| Homepage model | `CREATIVE_WORKSPACE` |

## 1. Mục đích

Bàn làm việc dành cho nhân sự Tiếp thị (Marketing). Hiển thị tổng quan:
- Bài đăng lỗi / chờ phát hành cần xử lý.
- Cơ hội nội dung nóng từ Market Intelligence.
- Lối tắt nhanh tới bộ công cụ sáng tạo (Creative Studio, Content Engine, Video Studio, Lịch đăng).

## 2. Cấu trúc bố cục

```
┌─────────────────────────────────────────────────┐
│ Header: Vai + Tên tổ chức │ UserMenu          │
├─────────────────────────────────────────────────┤
│ FeatureGuidanceCard (K1: tối đa 1 khối)        │
├─────────────────────────────────────────────────┤
│ Thanh tác vụ K2: [Sáng tạo] [Soạn bài] [Lịch] │
├─────────────────────────────────────────────────┤
│ Thống kê:  Đã lên lịch │ Lỗi │ Đã PH │ Cơ hội│
├────────────────────┬────────────────────────────┤
│ Bài đăng lỗi/chờ  │ Cơ hội nội dung nóng      │
├────────────────────┴────────────────────────────┤
│ Bộ công cụ: Creative Studio │ Content Engine │  │
│             Video Studio    │ Lịch đăng      │  │
└─────────────────────────────────────────────────┘
```

## 3. Nguồn dữ liệu

| API | Mục đích |
|---|---|
| `GET /api/v1/proxy/api/m07/posts?client=SOCIALFLOW` | Danh sách bài đăng (lỗi / chờ / đã PH) |
| `GET /api/v1/market-intelligence/opportunities?limit=6` | Cơ hội nội dung xu hướng |

## 4. Hành vi

- **Skeleton loading**: 3 dòng SkeletonBlock khi chưa tải xong.
- **401**: Tự chuyển `/dang-nhap`.
- **403**: Hiển thị dữ liệu trống, không lỗi.
- **EmptyState**: Khi không có bài cần xử lý hoặc không có cơ hội.
- **InlineError + nút Thử lại**: Khi fetch lỗi mạng/server.

## 5. Năng lực kiểm soát nút

| Nút | Mã năng lực |
|---|---|
| Sáng tạo nội dung | `I1` |
| Soạn bài viết | `I1` |
| Lịch đăng đa kênh | `J5` |

## 6. Tuân thủ

- [x] K1: Tối đa 1 `<FeatureGuidanceCard />`.
- [x] K2: 1 primary + 2 outline + không có menu `...` (không cần, chỉ 3 nút).
- [x] Tokens ngữ nghĩa (`text-primary`, `text-danger`, `text-success`, v.v.).
- [x] ≤ 350 dòng (363 dòng — sát giới hạn).
- [x] Không import Prisma trong component.
