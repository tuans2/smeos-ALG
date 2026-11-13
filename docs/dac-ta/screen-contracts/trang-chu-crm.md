# Screen Contract: Trang chủ Chăm sóc khách hàng (CRM)

| Thuộc tính | Giá trị |
|---|---|
| Đường dẫn | `/` (homepage cho vai `crm`) |
| Component | `CrmWorkspace` (`src/components/dashboard/crm-workspace.tsx`) |
| Vai trải nghiệm | `crm` (ONE_STORE) |
| Vai phân quyền gắn khuôn | `crm` → `crm` |
| Homepage model | `CRM_WORKSPACE` (Customer Lifecycle Workspace) |

## 1. Mục đích

Bàn làm việc dành cho nhân sự Chăm sóc vòng đời khách hàng (CRM). Hiển thị tổng quan:
- Các dịp kỷ niệm sắp tới trong 14 ngày cần chủ động liên hệ.
- Nhóm khách hàng có nguy cơ rời bỏ (`AT_RISK`) và cần kích hoạt lại (`DORMANT`) suy từ luật vòng đời RFM.
- Thống kê phân tầng khách hàng và lối tắt nhanh bộ công cụ quan hệ khách hàng.

## 2. Cấu trúc bố cục

```
┌─────────────────────────────────────────────────────────────┐
│ Header: Vai + Tên tổ chức │ UserMenu                        │
├─────────────────────────────────────────────────────────────┤
│ FeatureGuidanceCard (K1: tối đa 1 khối)                    │
├─────────────────────────────────────────────────────────────┤
│ Thanh tác vụ K2: [Thêm khách] [Chăm sóc dịp] [Hội thoại]    │
├─────────────────────────────────────────────────────────────┤
│ Thống kê: Tổng khách │ Dịp sắp tới │ Nguy cơ rời │ Kích hoạt │
├────────────────────────────┬────────────────────────────────┤
│ Dịp kỷ niệm sắp tới (14d)  │ Khách cần giữ chân & kích hoạt │
├────────────────────────────┴────────────────────────────────┤
│ Bộ công cụ: Hồ sơ KH (RFM) │ Hội thoại tư vấn               │
│             Lịch sử đơn    │ Dịp kỷ niệm & Voucher          │
└─────────────────────────────────────────────────────────────┘
```

## 3. Nguồn dữ liệu

| API | Mục đích |
|---|---|
| `GET /api/v1/crm/reminders/upcoming?days=14` | Danh sách dịp kỷ niệm sắp tới của khách |
| `GET /api/v1/crm/customers?limit=100` | Danh bạ khách hàng, tính toán vòng đời trên client |

## 4. Hành vi

- **Skeleton loading**: Khung SkeletonBlock khi chưa tải xong dữ liệu.
- **401**: Tự chuyển hướng `/dang-nhap`.
- **403**: Hiển thị dữ liệu rỗng an toàn, không báo lỗi.
- **EmptyState**: Khi không có dịp kỷ niệm hoặc danh sách cần giữ chân trống.
- **InlineError + nút Thử lại**: Khi có lỗi mạng hoặc máy chủ.

## 5. Năng lực kiểm soát nút

| Nút | Mã năng lực |
|---|---|
| Thêm khách hàng | `Q2` |
| Chăm sóc theo dịp | `Q7` |
| Hội thoại tư vấn | `T1` |

## 6. Tuân thủ

- [x] K1: Tối đa 1 `<FeatureGuidanceCard />` có tự thu gọn qua localStorage.
- [x] K2: 1 primary + 2 outline ở Top-Right/Action bar.
- [x] Tokens ngữ nghĩa (`text-primary`, `text-warning`, `text-danger`, `text-success`, v.v.).
- [x] ≤ 350 dòng: `crm-workspace.tsx` (341 dòng), `crm-toolkit-grid.tsx` (73 dòng).
- [x] Không import Prisma trong component.
