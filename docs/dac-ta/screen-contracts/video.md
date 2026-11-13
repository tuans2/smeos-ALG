---
id: SCR-STORE-video
tier: STORE
module: video-studio
route: /video
archetype: E
snapshots:
  - 390x844
  - 1280x800
acceptance:
  - Tiêu đề cấp 1 qua PageHeader/ToolHero (ADR-011 D-UI-05)
  - Tối đa 1 nút chính (primary) theo K2
  - Đủ trạng thái tải, rỗng, lỗi, không quyền
  - Không vi phạm axe-core critical/serious ở 390px và 1280px
---

# Screen Contract — AI Video Studio

**Tuyến:** `/video` · **Tệp chính:** `src/app/(app)/video/page.tsx` · **Cập nhật:** 27/09/2026 · **Thẻ:** T5.C3

## 1. Vai và mục đích
- Vai chính (03b): `marketing_specialist` · Vai phụ: `store_manager`, `creative_director`
- Phạm vi: organization
- Việc chính: Khởi tạo, biên soạn kịch bản storyboard, và dựng video marketing tự động từ Master Image theo quy trình 2 cổng kiểm soát chất lượng.
- Câu hỏi chính: Dự án video này đang ở bước nào trong quy trình 2 cổng kiểm duyệt (kịch bản hay video thành phẩm) và video render đã sẵn sàng để xuất bản chưa?
- Mật độ: MEDIUM (giao diện phân chia 2 cột rõ ràng giữa bộ biên soạn kịch bản và khung phát/tiến độ video).

## 2. Hiện trạng (audit)
- API:
  - `GET /api/v1/video/jobs` → Năng lực `video.view`
  - `POST /api/v1/video/jobs` → Năng lực `video.create`
  - `GET /api/v1/video/jobs/[id]` → Năng lực `video.view`
  - `PATCH /api/v1/video/jobs/[id]/storyboard` → Năng lực `video.edit`
  - `POST /api/v1/video/jobs/[id]/approve-script` → Năng lực `video.approve_script`
  - `POST /api/v1/video/jobs/[id]/render` → Năng lực `video.render`
  - `POST /api/v1/video/jobs/[id]/approve-video` → Năng lực `video.approve_output`
- Khối: 3 khối chính (Hướng dẫn thao tác K1, Storyboard Editor / Trình phát Video, Thẻ tiến độ 2 cổng duyệt)
- Nút primary: 1 (ở danh sách: `Tạo video mới`; ở chi tiết: nút hành động theo cổng duyệt kế tiếp: `Chốt duyệt kịch bản` / `Dựng video` / `Chốt duyệt video`)
- FeatureGuidanceCard: 1 card duy nhất theo chuẩn K1
- Modal: `VideoCreateModal` (chuẩn Base-UI Dialog, nút chọn khuôn định dạng dùng `<button type="button" aria-pressed={...}>` theo T1.7)
- Trạng thái có sẵn: tải ☑ rỗng ☑ lỗi ☑ không quyền ☑ một phần ☑ thành công ☑

## 3. Thứ bậc thông tin
| Lớp | Nội dung | Vị trí hiển thị |
|---|---|---|
| L0 Thiết yếu | Tên dự án, khuôn định dạng video, thời lượng, trạng thái 2 cổng duyệt | Khung nhìn đầu (Top Card) |
| L1 Hành động | Nút Tạo video mới / Duyệt kịch bản / Kích hoạt render / Duyệt video thành phẩm | Top-Right Action Header |
| L2 Ngữ cảnh | Hướng dẫn quy trình 2 cổng duyệt, thanh tiến độ render thời gian thực | Khối hướng dẫn K1 & VideoRenderingProgress |
| L3 Chi tiết | Các phân cảnh Storyboard (ảnh, thời lượng, phụ đề chữ, kịch bản đọc), Khung phát video thành phẩm | Khối 2 cột (Storyboard Editor + VideoPlayerCard) |
| L4 Nâng cao | Hạn mức credit dự toán, liên kết ký phát video có hạn | Thẻ thông số & Hộp tiến độ bên phải |

## 4. Hành động
- Chính (1):
  - Màn hình danh sách: `Tạo video mới` (`variant: "primary"`).
  - Chi tiết kịch bản chưa duyệt: `Chốt duyệt kịch bản (Cổng 1)` (`variant: "primary"`).
  - Chi tiết kịch bản đã duyệt chưa render: `Dựng video` (`variant: "primary"`).
  - Chi tiết video đã render chờ chốt: `Chốt duyệt video (Cổng 2)` (`variant: "primary"`).
- Phụ (≤ 2):
  - `Làm mới` (`variant: "outline"`, cập nhật trạng thái job).
  - `Danh sách` (`variant: "ghost"`, quay lại bảng danh sách dự án).
- Menu `…`: Tải video, Sao chép liên kết chia sẻ video có hạn.

## 5. Content budget
- Nút nổi trực tiếp: 1 nút primary + 1-2 nút outline/ghost (tuân thủ K2 & UX-010/UX-011).
- Khối chính: 3 khối (Hướng dẫn K1, Storyboard Editor, Player & Progress).
- Nhóm thông tin: Cổng 1, Render, Cổng 2, Credit.

## 6. Trạng thái
- Tải: Skeleton spinner & disabled nút tác vụ trong lúc chờ API.
- Rỗng: Empty state hiển thị minh họa khi chưa có video nào được tạo kèm nút kêu gọi tạo video.
- Lỗi: Toast / alert báo lỗi chi tiết khi render hoặc phê duyệt thất bại.
- Đang render: Component `VideoRenderingProgress` hiển thị tiến độ 4 bước sinh động (Ghép hình ảnh -> Lồng tiếng AI -> Phụ đề tự động -> Xuất bản phẩm).
- Thành công: Huy hiệu `Video đã chốt duyệt` (tone="success") và trình phát video hiển thị video hoàn chỉnh.

## 7. Responsive
- 390px: Bố cục đơn cột, Storyboard Editor xếp dọc, Video player thu gọn, action header chuyển sang menu tiện lợi.
- 768px: Bố cục 1 cột tối ưu cuộn mượt.
- 1280px+: Bố cục 2 cột (2/3 Storyboard Editor bên trái, 1/3 Video Player Card & Tiến độ bên phải).

## 8. Trợ năng
- Bàn phím: Modal và Storyboard Editor điều hướng phím Tab đầy đủ, ESC đóng modal.
- Focus: `focus-visible:outline-2 focus-visible:outline-primary` trên toàn bộ nút và thẻ định dạng.
- Nhãn: Toàn bộ nút có text rõ nghĩa hoặc `aria-label`. Thẻ định dạng video dùng `aria-pressed`.
- Vùng thông báo: Thông báo trạng thái qua `role="status"`.

## 9. AI
- Gợi ý: Gợi ý phân cảnh Storyboard từ kịch bản marketing có sẵn của Master Image.
- Tự động: Dựng video FFmpeg / AI theo các thông số đã cấu hình.
- Cần duyệt: 2 cổng duyệt do nhân viên kiểm soát (Cổng 1: Kịch bản, Cổng 2: Video thành phẩm).

## 10. Dữ liệu và quyền
- Nguồn sự thật: Bảng `video_jobs` và các module liên quan trong PostgreSQL.
- Trường dùng: `id`, `title`, `format`, `aspect_ratio`, `duration_seconds`, `stage`, `script_approval`, `video_approval`, `cost_credits`, `scenes`.
- Năng lực: `video.view`, `video.create`, `video.edit`, `video.approve_script`, `video.render`, `video.approve_output`.

## 11. Component
- Dùng lại: `Dialog`, `Button`, `Badge`, `Card`, `FeatureGuidanceCard`.
- Mở rộng: `VideoCreateModal` (Base-UI Dialog), `StoryboardEditor`, `VideoPlayerCard`.
- Tạo mới: Không.

## 12. Ma trận quyết định
| Hiện tại | Mục tiêu | Quyết định | Lý do | Bằng chứng |
|---|---|---|---|---|
| Modal tạo video dùng `div` cố định tự chế | Chuẩn hóa Base-UI Dialog | Nâng cấp sang `<Dialog>` Base-UI | Đồng bộ UX-006, hỗ trợ backdrop, ESC, focus-trap | `video-create-modal.tsx` |
| Thẻ chọn khuôn video dùng `div onClick` | Chuẩn trợ năng T1.7 | Đổi sang `<button type="button" aria-pressed={...}>` | Tuân thủ T1.7 Clickable Cards | `video-create-modal.tsx` |
| Tiêu đề header chứa mã "M04c" | Không lộ mã kỹ thuật | Đổi sang "Studio Tiếp thị & Video" | Quy ước UX không lộ mã nội bộ | `video/page.tsx` |

## 13. QA Matrix (03a §34)
| Chiều | Kết quả | Ghi chú |
|---|---|---|
| Vai · Việc · IA · Mật độ · Thứ bậc · CTA · Luồng · Trạng thái · Responsive · Trợ năng · Dữ liệu · Quyền · AI · Nhất quán | PASS | Đạt chuẩn 100% |
