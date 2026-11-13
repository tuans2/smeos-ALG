# Screen Contract — Chiến dịch quảng bá & Bán hàng (Campaign Workspace)

**Tuyến:** `/quang-ba/chien-dich` · **Tệp chính:** `src/app/(app)/quang-ba/chien-dich/page.tsx` → `src/components/marketing-center/campaign/campaign-workspace.tsx` · **Cập nhật:** 01/11/2026 · **Thẻ:** PR-3 (Marketing & Sales Center)

## 1. Vai và mục đích
- Vai chính (03b): `dieu_hanh`, `marketing` · Vai phụ: `sale`, `dieu_phoi`
- Phạm vi: organization
- Việc chính: Tạo chiến dịch theo dịp/sự kiện (Tết, Valentine, 8/3, 20/10, Flash Sale...), liên kết các tư liệu và nơi dùng (Asset Usages), theo dõi hiệu quả thực tế (lượt quét QR/bấm link, khách tiềm năng thu về, số đơn chốt từ lead).
- Câu hỏi chính: "Chiến dịch dịp này đang chạy những tư liệu nào, tạo được bao nhiêu lead và chuyển đổi thành bao nhiêu đơn hàng?"
- Mật độ: MEDIUM (Workspace dạng danh sách thẻ chiến dịch + màn hình chi tiết phân tích hiệu quả)
- Archetype: B Danh sách + Chi tiết (Master-Detail / Workspace)

## 2. Hiện trạng (audit 01/11/2026)
- API:
  - `GET /api/v1/campaigns` (quyền M1): Danh sách chiến dịch kèm bộ đếm trạng thái (`DRAFT`, `ACTIVE`, `PAUSED`, `COMPLETED`, `ARCHIVED`).
  - `POST /api/v1/campaigns` (quyền M3): Tạo chiến dịch mới với mục tiêu (`AWARENESS`, `LEAD`, `SALE`, `RETENTION`), dịp/sự kiện, thời gian chạy.
  - `GET /api/v1/campaigns/[id]` (quyền M1): Chi tiết chiến dịch kèm 4 chỉ số hiệu quả thực tế và danh sách tư liệu/nơi dùng gắn chiến dịch.
  - `PATCH /api/v1/campaigns/[id]` (quyền M3): Cập nhật thông tin và chuyển trạng thái theo vòng đời chiến dịch.
- Thành phần giao diện:
  - `CampaignWorkspace`: Bộ điều phối trạng thái hiển thị danh sách hoặc chi tiết.
  - `CampaignList`: Bộ lọc trạng thái (Tabs), lưới thẻ chiến dịch kèm nhãn mục tiêu, ngày tạo, dịp kích cầu.
  - `CampaignCreateModal`: Modal tạo nhanh chiến dịch với 4 mục tiêu chuẩn, gợi ý các dịp lễ lớn của Việt Nam.
  - `CampaignDetailsView`: Màn hình chi tiết chiến dịch gồm 4 thẻ KPI chỉ số thật, thanh nút hành động chuyển trạng thái (Kích hoạt, Tạm dừng, Hoàn thành), và lưới danh sách tư liệu kèm nút dẫn sang Kho dữ liệu / Công cụ.
- Tuân thủ SRP: Tất cả các file thành phần đều ≤ 350 dòng.

## 3. Thứ bậc thông tin
| Lớp | Nội dung | Vị trí hiển thị |
|---|---|---|
| L0 Thiết yếu | Tên chiến dịch, huy hiệu trạng thái, mục tiêu chiến dịch | Tiêu đề trang & thẻ chiến dịch |
| L1 Hành động | Tạo chiến dịch mới, Kích hoạt / Tạm dừng / Hoàn thành, Chọn tư liệu | Header & Action bar |
| L2 Ngữ cảnh | Dịp kích cầu, thời gian bắt đầu/kết thúc, ngày tạo | Dòng phụ thông tin |
| L3 Chi tiết | 4 chỉ số thật: Số tư liệu, Lượt quét/bấm link, Số lead thu về, Số đơn chuyển đổi | Lưới 4 thẻ KPI |
| L4 Danh sách con | Danh sách tư liệu và nơi dùng đã gán vào chiến dịch | Khối danh sách tư liệu |

## 4. Hành động
- Chính (1): "Tạo chiến dịch mới" -> mở modal tạo -> lưu và chuyển ngay vào màn hình quản lý chiến dịch.
- Phụ:
  1. Kích hoạt / Tạm dừng / Hoàn thành: Đổi trạng thái chiến dịch.
  2. "Chọn từ kho dữ liệu": Mở `/kho-du-lieu` để chọn tư liệu gán vào chiến dịch.
  3. "Tạo mới từ công cụ": Chuyển hướng sang `/cong-cu` để tạo banner/video mới.

## 5. Content budget
- 100% tiếng Việt tự nhiên, chuẩn hóa thuật ngữ thương mại.
- Nhãn mục tiêu: "Nhận biết thương hiệu", "Thu hút khách tiềm năng", "Thúc đẩy bán hàng", "Chăm sóc & Giữ chân".
- Nhãn trạng thái: "Bản nháp", "Đang chạy", "Tạm dừng", "Hoàn thành", "Đã lưu trữ".
- Không hiển thị các chỉ số giả mạo (không có tiếp cận/tương tác MXH ảo khi chưa kết nối kênh).

## 6. Trạng thái
- Tải: `SkeletonBlock` hiển thị khung chờ mượt mà.
- Rỗng: `EmptyState` với biểu tượng Loa thông báo (`Megaphone`) và lời gợi ý tạo chiến dịch theo dịp.
- Lỗi: `InlineError` hiển thị thông báo lỗi kèm nút "Thử lại".
- Thành công: Cập nhật dữ liệu ngay lập tức.

## 7. Responsive
- Mobile (<768px): Thẻ KPI xếp thành lưới 2 cột, các nút hành động tự động quấn dòng.
- Desktop (>=1024px): Lưới 4 thẻ KPI ngang hàng, danh sách tư liệu 2 cột rộng rãi.

## 8. Trợ năng (A11y)
- Điều hướng bàn phím đầy đủ, các nút lọc sử dụng `aria-pressed`.
- Modal có `role="dialog"`, `aria-modal="true"` và nút đóng có `aria-label="Đóng"`.
- Token giao diện chuẩn: `border-border`, `bg-surface`, `text-text`.

## 9. Dữ liệu và quyền
- Quyền truy cập: Yêu cầu quyền `M1` (xem) và `M3` (quản trị chiến dịch).
