# Screen Contract: Trang chủ Shipper — Đơn cần giao

| Thuộc tính | Giá trị |
|---|---|
| Đường dẫn | `/` (trang chủ cho vai `shipper`) |
| Component | `ShipperRunsHome` (`src/components/dashboard/shipper-runs-home.tsx`) |
| Vai trải nghiệm | `shipper` (STORE) |
| Vai phân quyền gắn khuôn | `shipper` → `shipper` |
| Homepage model | `SHIPPER_DELIVERIES` (Delivery Run) |

## 1. Mục đích

Shipper nội bộ thấy đơn đang giao mà Điều phối gắn đúng số điện thoại của mình (checklist ALG 4.5): người nhận, SĐT (bấm gọi), địa chỉ, khung giờ, lời thiệp. Không hiển thị giá, ghi chú nội bộ, người đặt.

## 2. Cấu trúc bố cục

```
┌──────────────────────────────────────────────┐
│ Header │ UserMenu                             │
├──────────────────────────────────────────────┤
│ FeatureGuidanceCard (tối đa 1)               │
├──────────────────────────────────────────────┤
│ Thẻ đơn: Đơn · người nhận · SĐT · địa chỉ     │
│          giờ giao · lời thiệp                 │
│   [Giao không được] (phụ)  [Bước tiếp] (chính)│
└──────────────────────────────────────────────┘
```

Bước tiếp theo trạng thái: Đã lấy hàng → Bắt đầu giao → Chụp ảnh và báo giao xong (mở máy ảnh, tải ảnh giao rồi báo). "Giao không được" mở ô lý do bắt buộc.

## 3. Nguồn dữ liệu

| API | Mục đích |
|---|---|
| `GET /api/v1/delivery/my-runs` | Đơn cần giao; `phoneMissing` khi tài khoản chưa có số |
| `POST /api/v1/delivery/my-runs/:id` | Sự kiện giao, ảnh giao (`podAssetId`), lý do thất bại |
| `POST /api/v1/assets/upload-url`, `POST /api/v1/assets` | Tải ảnh giao (`G2`) |

## 4. Hành vi

- Tài khoản chưa có số điện thoại → EmptyState nhờ Điều hành cập nhật số ở màn Thành viên.
- Ảnh giao bắt buộc theo Cài đặt cửa hàng (checklist ALG 4.18); máy chủ từ chối nếu thiếu.

## 5. Năng lực kiểm soát

| Hành động | Mã năng lực |
|---|---|
| Xem và cập nhật đơn được giao | `R18` |
| Tải ảnh giao | `G2` |

## 6. Tuân thủ

- [x] Một `<FeatureGuidanceCard />`; một nút chính mỗi thẻ; ô chọn tệp ẩn (`type="file"`); token ngữ nghĩa.
- [x] ≤ 350 dòng; không import Prisma trong component.
