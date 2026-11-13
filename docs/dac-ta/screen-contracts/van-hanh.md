---
id: SCR-MOTHER-van-hanh
tier: MOTHER
module: platform
route: /van-hanh
archetype: A
snapshots:
  - 390x844
  - 1280x800
acceptance:
  - Bảng điều khiển trung tâm người vận hành nền tảng (Platform Admin)
  - Áp dụng chủ đề giao diện hiện đại modern-slate (Slate & Indigo)
  - Tối đa 1 nút chính theo K2
  - Hiển thị đầy đủ số liệu sức khỏe hạ tầng, tổ chức và credit
  - Đầy đủ 6 trạng thái UI và chuẩn WCAG 2.2 AA
---

# Screen Contract — Bảng Điều Khiển Vận Hành Nền Tảng (SaaS Mother)

**Mã màn:** `SCR-MOTHER-van-hanh` · **Tuyến:** `/van-hanh` · **Tầng:** `MOTHER` · **Bố cục (Archetype):** `A` (Bảng điều khiển)

## 1. Vai & Mục đích
- **Vai chính (03b):** `platform_admin` (Người vận hành nền tảng SaaS).
- **Phạm vi dữ liệu:** `platform` (Xuyên tổ chức, cấp hệ thống mẹ).
- **Mục tiêu chính:** Giám sát tổng quan tình trạng sức khỏe hạ tầng, số lượng tổ chức hoạt động, phát hiện job nền và theo dõi credit toàn hệ thống.
- **Câu hỏi cốt lõi:** "Toàn hệ thống có bao nhiêu tổ chức, có sự cố nào cần xử lý và tài nguyên dùng ra sao?"
- **Mật độ thông tin (Density):** `compact`

## 2. Cấu trúc Bố cục & Thứ bậc (Visual Hierarchy)
- **Header:** `PageHeader` với huy hiệu phạm vi "Vận hành Nền tảng • Toàn hệ thống" và theme `modern-slate`.
- **Vùng làm việc:** `DashboardLayout` hiển thị lưới KPI 4 khối và các phân hệ điều hành.
- **Khối chức năng chính:**
  1. L0 (Thiết yếu): Tổng số tổ chức, tổ chức mới 7 ngày, số job lỗi/treo, tổng credit tiêu thụ.
     Thuê bao (`src/components/platform/subscription-overview-card.tsx`, `GET /api/v1/platform/overview`, `N1`): 4 ô Đang thuê bao / Quá hạn (đỏ khi > 0) / Chưa gán gói / Đã huỷ và biểu đồ thanh doanh thu thuê bao đã thu 6 tháng gần nhất. Nạp credit làm ở trang chi tiết từng tổ chức.
  2. L1 (Hành động): Nút chuyển nhanh sang Tổ chức, Sức khỏe hệ thống, Mức dùng, Chợ đối tác.
  3. L2 (Bổ trợ): Hướng dẫn vận hành hệ thống mẹ, nhật ký kiểm toán gần nhất.

### Thứ bậc thông tin theo tuyến con
| Lớp | Nội dung | Vị trí hiển thị |
|---|---|---|
| L0 Thiết yếu | Số lượng tổ chức, tổ chức mới 7 ngày, số job treo | 3 Thẻ số liệu lớn |
| L1 Hành động | Chuyển tab điều hướng (/to-chuc, /suc-khoe, /muc-dung, /nhat-ky) | Top Header Navbar |
| L2 Ngữ cảnh | Huy hiệu phạm vi (Toàn hệ thống / Tổ chức cụ thể) | Tiêu đề mỗi trang |
| L3 Chi tiết | Bảng danh sách tổ chức, bảng job treo, nhật ký hệ thống | Bảng dữ liệu có cấu trúc |
| L3 Chi tiết (`/hang-doi-loi`) | Job lỗi xuyên tổ chức: loại việc · tổ chức · loại lỗi · số lần thử · lý do; nút Chạy lại / Gác lại (cần `N15`, qua `ConfirmDialog`, ghi nhật ký nền tảng). Vào từ liên kết "Xem việc bị lỗi" ở `/suc-khoe` (chưa có mục menu — shell khoá) | Danh sách + 2 nút mỗi dòng |
| L3 Chi tiết (`/marketplace`) | Chợ cửa hàng & đối tác (xem `N1`): lưới thẻ cửa hàng (ảnh khảo sát thật — trong kho hoặc xem trước Drive công khai; ảnh lỗi thì thử ảnh kế tiếp, hết ảnh thì báo kiểm tra quyền chia sẻ — không dùng ảnh mẫu) · hạng: Đạt Chứng nhận / Tiêu Chuẩn (gộp Tăng trưởng) / Chưa đạt · lọc: ô tìm nhanh (mọi thông tin) + dropdown "Bộ lọc tiêu chí" ~40 nhóm lấy từ 75 cột khảo sát (hạng, quận suy từ địa chỉ, khó khăn, mục tiêu, sản phẩm, thiết bị, điểm…), chọn nhiều — HOẶC trong một nhóm, VÀ giữa các nhóm, kèm số cửa hàng mỗi tiêu chí; tiêu chí đã chọn hiện thành thẻ có nút bỏ (`partner-marketplace-facets.ts`); mở hồ sơ 5 tab. Nút Nhập tệp Excel / Đồng bộ từ Sheet / Tải ảnh khảo sát cần `N17`. Nhập tệp qua hộp **Ghép cột trước khi nhập**: hệ thống tự ghép cột theo tên tiêu đề (tệp thêm/bớt/đổi chỗ cột vẫn đúng trường), hiện 13 trường chính kèm giá trị ví dụ, 62 trường còn lại trong `Disclosure`; mỗi trường chọn cột hoặc "Không lấy", mỗi cột chỉ một trường; thiếu cột Tên cửa hàng thì không nhập được; lỗi máy chủ hiện trong hộp, giữ phần đã chỉnh. Đồng bộ Sheet qua `ConfirmDialog`. Hồ sơ chi tiết có nút **Xoá hồ sơ** chỉ hiện với superadmin (`N18`), xác nhận qua `ConfirmDialog` mức nguy hiểm; xoá xong đóng hồ sơ và tải lại lưới, lỗi hiện ngay trong hồ sơ. Superadmin còn có thanh **Chọn để xoá** (bấm thẻ để chọn, "Chọn tất cả đang hiển thị", "Bỏ chọn", "Xoá N hồ sơ" qua `ConfirmDialog` nguy hiểm; danh sách >500 gửi thành nhiều lượt) và **Xoá toàn bộ** (`ConfirmDialog` bắt gõ đúng số hồ sơ). Link chia sẻ không có nút xoá; ghi nhật ký nền tảng. Thông tin liên hệ luôn che một phần (SĐT `0903 ••• 789`, tên `Nguyễn V•• A••`, địa chỉ che số nhà + đường, giữ quận). Nút **Chia sẻ** (`N17`): ghi chú gửi cho ai + thời hạn 1/7/30/90 ngày hoặc tự nhập (≤365) → link hiện một lần kèm nút Sao chép; danh sách link với trạng thái Đang mở / Đã hết hạn / Đã huỷ, lượt xem, nút Huỷ qua `ConfirmDialog`. Link `/chia-se/cho-doi-tac/<token>`: cùng lưới + bộ lọc + hồ sơ, không thanh điều hướng, không nút thao tác; hết hạn / đã huỷ → "Link không còn hiệu lực" | Lưới thẻ + hộp hồ sơ |
| L3 Chi tiết (`/suc-khoe`) | Bộ xử lý nền (đang chạy / không chạy) → Hàng đợi theo loại việc → Job theo trạng thái → Job treo | Thẻ trạng thái + bảng; chỉ đọc (D-N5) |

## 3. Hành động cấp trang (Actions)
- **Hành động chính (Primary CTA):** Nút "Kiểm tra sức khoẻ hệ thống" hoặc "Làm mới số liệu".
- **Hành động phụ (Secondary):** "Xem nhật ký kiểm toán", "Quản lý tổ chức".

## 4. Đặc tả 6 Trạng thái Giao diện (States)
1. **Đang tải (Loading):** `SkeletonBlock` mô phỏng lưới KPI 4 thẻ và danh sách phân hệ.
2. **Rỗng (Empty):** Khi chưa có số liệu thống kê.
3. **Lỗi (Error):** Hộp cảnh báo màu đỏ với thông điệp lỗi rõ ràng và nút thử lại.
4. **Không có quyền (Forbidden):** Tự động chuyển hướng về `/` nếu không có quyền `platform_admin`.
5. **Dữ liệu một phần (Partial):** Hiển thị số liệu cache khi hệ thống giám sát đang lấy dữ liệu mới.
6. **Thành công (Success):** Toàn bộ chỉ số KPI hiển thị tức thời, trực quan.

## 5. Quy chuẩn Trợ năng & Responsive (A11y & Responsive)
- Responsive từ di động 1 cột đến màn hình lớn 4 cột cân đối.
- Hỗ trợ thao tác hoàn toàn bằng bàn phím và tương phản chuẩn WCAG 2.2 AA.

## 6. AI
- Giám sát các worker AI Vision, Video, Media và các job xử lý ngầm.

## 7. Dữ liệu và quyền
- Nguồn sự thật: Bảng `platform_operators`, `organizations`, `generation_jobs`.
- Quyền: `platform_admin` (giải từ session qua `resolvePlatformSession`).

## 8. Component
- Dùng lại: `Card`, `SkeletonBlock`.
- Tạo mới: Không.

## 9. Ma trận quyết định
| Hiện tại | Mục tiêu | Quyết định | Lý do | Bằng chứng |
|---|---|---|---|---|
| Thiếu chỉ báo phạm vi rõ ràng | Tuân thủ 03a IA-005 | Thêm huy hiệu phạm vi "Phạm vi: Toàn hệ thống" / "Tổ chức cụ thể" | Phân định tuyệt đối giữa quản trị tenant và vận hành platform | Toàn bộ các trang `/van-hanh/*` |
| Text size tuỳ ý `text-[13px]` | Chuẩn hóa token thang kích thước | Chuyển sang `text-xs` | Tuân thủ Design Tokens R2 | Toàn bộ các trang `/van-hanh/*` |

## 10. QA Matrix (03a §34)
| Chiều | Kết quả | Ghi chú |
|---|---|---|
| Vai · Việc · IA · Mật độ · Thứ bậc · CTA · Luồng · Trạng thái · Responsive · Trợ năng · Dữ liệu · Quyền · AI · Nhất quán | PASS | Đạt chuẩn 100% |

## Bổ sung 29/10/2026 — `/van-hanh/cau-hinh` (Cấu hình nền tảng)
Trang trước đây có trong menu nhưng chưa tồn tại (404). Nay chứa bật/tắt giao diện chuẩn mới theo công cụ và theo tổ chức (03c E9): mỗi công cụ một `<select>` có nhãn (Tắt · Chỉ tổ chức được chọn · Mọi tổ chức) và danh sách tổ chức dạng ô chọn. Lưu cần `N12`, có nhật ký kiểm toán; bật cho mọi tổ chức phải qua `ConfirmDialog` (R3).
