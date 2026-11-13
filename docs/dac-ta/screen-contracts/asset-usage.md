# Screen Contract — Cấu hình nơi dùng tư liệu (Asset Usage Sheet)

**Thành phần:** `src/components/marketing-center/use-asset-sheet.tsx` · **Tuyến:** Tích hợp trong `/kho-du-lieu` và `/cong-cu` · **Cập nhật:** 01/11/2026 · **Thẻ:** PR-2 (Marketing & Sales Center)

## 1. Vai và mục đích
- Vai chính (03b): `dieu_hanh`, `marketing`, `sale` · Vai phụ: `dieu_phoi`
- Phạm vi: organization
- Việc chính: Từ một tư liệu trong Thư viện / Kho dữ liệu (ảnh, video, catalog, poster...), người dùng chọn nơi sử dụng (Quảng bá, Bán hàng, Chăm sóc, In ấn), chọn lời kêu gọi hành động (CTA), tạo liên kết rút gọn hoặc mã QR để chia sẻ và đo lường hiệu quả chuyển đổi / lead quy thuộc.
- Câu hỏi chính: "Tư liệu này dùng vào mục đích gì, tạo link gửi khách ra sao và đã có bao nhiêu lượt quét/chốt đơn?"
- Mật độ: MEDIUM (Drawer 2 bước: chọn nơi dùng -> cấu hình CTA & kênh -> xem trước & quản lý)
- Archetype: E Biểu mẫu tác vụ (Task Drawer / Modal)

## 2. Hiện trạng (audit 01/11/2026)
- API:
  - `GET /api/v1/asset-usages?source_type=&source_id=` (quyền M1): Đọc danh sách nơi dùng của một tư liệu hoặc toàn tổ chức.
  - `POST /api/v1/asset-usages` (quyền M2): Tạo nơi dùng mới, tự động sinh link rút gọn có gắn mã chiến dịch qua `createShortLink`.
  - `PATCH /api/v1/asset-usages/[id]` (quyền M2): Sửa tên, đổi CTA hoặc tạm dừng / kích hoạt lại nơi dùng.
- Thành phần giao diện:
  - `UseAssetSheet`: Khung hội thoại kích thước lớn (`Dialog size="lg"`).
  - Tab "Tạo nơi dùng mới" (`UseAssetForm`): Chọn 1 trong các nơi dùng hợp lệ của asset, chọn CTA trong danh mục 8 mã chuẩn, chọn kênh phân phối, nhập đường dẫn trang đích.
  - Tab "Nơi dùng đã tạo" (`UseAssetList`): Danh sách các nơi dùng hiện hữu kèm mã link rút gọn, nút sao chép link, nút xem QR và nút tạm dừng/bật lại.
  - Hộp thoại xác nhận `ConfirmDialog` khi tạo liên kết công khai (chuẩn rủi ro R3).
- Tuân thủ nghiêm ngặt SRP (3 tệp tách biệt: sheet 144 dòng, form 204 dòng, list 118 dòng, đều ≤ 350 dòng).

## 3. Thứ bậc thông tin
| Lớp | Nội dung | Vị trí hiển thị |
|---|---|---|
| L0 Thiết yếu | Thẻ lựa chọn mục tiêu (Quảng bá / Bán hàng / Chăm sóc / In ấn) và danh sách CTA hợp lệ | Form tạo nơi dùng |
| L1 Hành động | Nút "Xác nhận tạo nơi dùng", nút "Sao chép link", nút "Tạm dừng / Bật lại" | Footer form & danh sách |
| L2 Ngữ cảnh | Mã liên kết `/l/...`, trạng thái (Đang hoạt động / Đã tạm dừng), ngày tạo | Thẻ tóm tắt nơi dùng đã tạo |
| L3 Chi tiết | Hướng dẫn kênh phân phối (Tự động vs Thủ công như Zalo/SMS) | Dropdown kênh phân phối |
| L4 Nâng cao | Hộp thoại xác nhận trước khi phát hành liên kết ra ngoài | ConfirmDialog |

## 4. Hành động
- Chính (1): "Xác nhận tạo nơi dùng" -> gọi API `/api/v1/asset-usages` -> tự động chuyển sang tab "Nơi dùng đã tạo".
- Phụ (≤ 2):
  1. "Sao chép link": Lưu URL đầy đủ `domain/l/<id>` vào bộ nhớ tạm.
  2. "Tạm dừng / Bật lại": Thay đổi trạng thái `ACTIVE` <-> `PAUSED`.

## 5. Content budget
- 100% tiếng Việt tự nhiên, không lộ thuật ngữ kỹ thuật (không dùng UTM campaign, payload, query params trên UI).
- Nhãn CTA chuẩn: "Tìm hiểu thêm", "Liên hệ tư vấn", "Nhận thông tin", "Yêu cầu báo giá", "Đặt hàng ngay", "Thanh toán ngay", "Đánh giá dịch vụ", "Giới thiệu bạn bè".

## 6. Trạng thái
- Tải: Báo "Đang tải danh sách nơi dùng..." khi đọc danh sách.
- Rỗng: Khối giải thích "Chưa có nơi dùng nào - Hãy tạo liên kết hoặc mã QR..." khi tư liệu chưa được gắn đích.
- Lỗi: Thông báo alert đỏ rõ ràng nếu nhập sai quy tắc CTA/nơi dùng.
- Thành công: Thông báo xanh "Đã tạo nơi dùng thành công!".

## 7. Responsive
- Mobile (<768px): Toàn màn hình dạng modal trượt lên; các ô lựa chọn xếp thành 1 cột dễ bấm chạm ngón tay.
- Desktop (>=1024px): Hộp thoại căn giữa màn hình, lưới 2-3 cột thông thoáng.

## 8. Trợ năng (A11y)
- Điều hướng bàn phím đầy đủ qua phím Tab / Enter.
- Có `aria-hidden="true"` trên icon.
- `focus-visible` đúng token chuẩn `outline-primary`.

## 9. Dữ liệu và quyền
- Quyền truy cập: Yêu cầu quyền `M1` (xem) và `M2` (tạo/sửa nơi dùng).
- Bảo đảm cách ly tenant: Kiểm soát qua `scopedWhere(ctx)` ở tầng repository và giải mã phiên ở máy chủ.

