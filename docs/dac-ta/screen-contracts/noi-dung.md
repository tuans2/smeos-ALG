---
id: SCR-STORE-noi-dung
tier: STORE
module: organization
route: /noi-dung
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

# Screen Contract — AI Content Engine

**Tuyến:** `/noi-dung` · **Tệp chính:** `src/app/(app)/noi-dung/page.tsx` · **Cập nhật:** 27/09/2026 · **Thẻ:** T5.C4

## 1. Vai và mục đích
- Vai chính (03b): `marketing_specialist`, `copywriter` · Vai phụ: `store_manager`
- Phạm vi: organization
- Việc chính: Soạn thảo, sinh nội dung tiếp thị đa kênh (Facebook, Instagram, TikTok, Zalo, LinkedIn) tự động qua chuỗi agent Content Engine (Strategist → Writer → Critic → Rewriter) từ dữ liệu sản phẩm hoa tươi.
- Câu hỏi chính: Bài nào cần viết/duyệt hôm nay và nội dung đa kênh sinh ra đã đạt chuẩn an toàn thương hiệu chưa?
- Mật độ: MEDIUM (phân tầng rõ giữa khâu chọn sản phẩm/kênh và khâu xem trước thực tế / biên tập câu từ).

## 2. Hiện trạng (audit)
- API:
  - `GET /api/v1/products?limit=25` → Đọc danh mục sản phẩm từ Product Master
  - `GET /api/v1/vision/analyses?approval_state=APPROVED` → Lấy ảnh master đã duyệt
  - `POST /api/v1/content-engine/generations` → Năng lực `I1` (feature `content.generate`)
  - `POST /api/v1/content-engine/generations/[id]/approve` → Năng lực `J5` (feature `content.approve`)
- Khối: 3 khối chính (Hướng dẫn K1 `ContentGuidanceCard`, Chọn sản phẩm & kênh phân phối, Xem trước & Biên tập nội dung)
- Nút primary: 1 (ở phase chọn: `Sinh bài bằng Content Engine`; ở phase kết quả: `Viết bài mới`)
- FeatureGuidanceCard: 1 card duy nhất theo chuẩn K1
- Modal / Drawer: Không có modal popup; toàn bộ thao tác biên tập và chuyển đổi xem trước diễn ra trực tiếp tại chỗ (in-place)
- Trạng thái có sẵn: tải ☑ rỗng ☑ lỗi ☑ không quyền ☑ một phần ☑ thành công ☑

## 3. Thứ bậc thông tin
| Lớp | Nội dung | Vị trí hiển thị |
|---|---|---|
| L0 Thiết yếu | Tên sản phẩm, kênh phân phối đã chọn, tiêu đề bài viết | Khung nhìn đầu |
| L1 Hành động | Sinh bài bằng Content Engine / Duyệt bài này / Viết bài mới | Top Action Header & Thanh tác vụ chính |
| L2 Ngữ cảnh | Điểm duyệt Critic, mô hình AI đang dùng (Local LLM / Cloud AI), Hướng dẫn thao tác K1 | Thanh thông tin thẻ bài viết & ContentGuidanceCard |
| L3 Chi tiết | Xem trước giao diện thực tế (Facebook, Insta, TikTok, Zalo), kịch bản quay video 3s, CTA, Hashtags | Bộ chuyển đổi Xem trước / Biên tập |
| L4 Nâng cao | Hàng đợi xuất bản Lịch đăng bài, liên kết đặt hàng catalog trực tuyến | Khối chuyển tiếp chân trang |

## 4. Hành động
- Chính (1):
  - Khi chưa sinh bài: `Sinh bài bằng Content Engine` (`variant: "default"`).
  - Khi đã có bài: `Viết bài mới` (`variant: "default"`).
- Phụ (≤ 2):
  - `Lịch đăng bài` (`variant: "outline"`).
  - `Duyệt bài này` (`variant: "default"` trong thẻ bài viết con).
  - `Sao chép toàn bài` / `Copy nhanh Zalo` (`variant: "secondary"` / `"outline"`).
- Menu `…`: Không dùng hamburger ẩn; các tác vụ sao chép và xem trước hiển thị trực tiếp.

## 5. Content budget
- Nút nổi trực tiếp: 1 nút primary + 1-2 nút outline/ghost (tuân thủ K2).
- Khối chính: 3 khối (Hướng dẫn K1, Bộ cấu hình chọn sản phẩm & kênh, Thẻ bài viết đa kênh).
- Nhóm thông tin: Facebook, Instagram, TikTok, Zalo, Điểm Critic, Mô hình AI.

## 6. Trạng thái
- Tải: `SkeletonBlock` chuẩn hóa thay thế các khối nhấp nháy thô.
- Rỗng: Thông báo rõ ràng khi Product Master chưa có sản phẩm nào.
- Lỗi: Khung cảnh báo màu đỏ pastel dịu mắt khi gọi API Content Engine thất bại.
- Đang sinh: `FlowSteps` 3 bước minh bạch (Đọc thông số & Brand Kit → Content Engine sinh bài → Kiểm duyệt an toàn).
- Thành công: Hiển thị ngay Live Preview chân thực của Facebook, Instagram, TikTok, Zalo kèm điểm Critic L2.

## 7. Responsive
- 390px: Thẻ kênh và thẻ sản phẩm xếp dọc, Live Preview thu gọn vừa màn hình mobile, thanh chọn kênh cuộn ngang mượt mà.
- 768px: Lưới sản phẩm 2 cột, lưới kênh 2 cột.
- 1280px+: Lưới sản phẩm 3 cột, lưới kênh 4 cột, bố cục rộng rãi cân đối.

## 8. Trợ năng
- Bàn phím: Điều hướng Tab qua lại giữa các nút chọn sản phẩm, kênh và các tab xem trước.
- Focus: `focus-visible:outline-2 focus-visible:outline-primary` trên toàn bộ thẻ và nút.
- Nhãn: Toàn bộ nút có text rõ nghĩa. Thẻ chọn sản phẩm và kênh sử dụng `aria-pressed` theo T1.7.
- Vùng thông báo: Thông báo trạng thái duyệt bài qua live toast.

## 9. AI
- Gợi ý: Tự động đề xuất hook mở đầu, kịch bản 30s TikTok, hashtags ngành hoa và CTA phù hợp.
- Tự động: Chuỗi 4 agent (Strategist → Writer → Critic → Rewriter) vận hành tự động.
- Cần duyệt: Nhân viên tiệm bấm "Duyệt bài này" để chốt trước khi chuyển sang hàng đợi xuất bản.

## 10. Dữ liệu và quyền
- Nguồn sự thật: Bảng `content_generations`, `products`, `asset_analysis_runs`.
- Trường dùng: `id`, `posts`, `channels`, `overall_score`, `needs_review`, `usage`.
- Năng lực: `I1` (sinh bài), `J5` (duyệt bài).

## 11. Component
- Dùng lại: `Button`, `Card`, `Badge`, `SkeletonBlock`, `FeatureGuidanceCard`, `FlowSteps`.
- Mở rộng: `MultichannelPostCard`, `SocialPostPreview`.
- Tạo mới: Không.

## 12. Ma trận quyết định
| Hiện tại | Mục tiêu | Quyết định | Lý do | Bằng chứng |
|---|---|---|---|---|
| Khung tải sản phẩm dùng div nhấp nháy tự chế | Chuẩn hóa Skeleton hệ thống | Dùng `SkeletonBlock` từ `components/ui/skeleton` | Đồng bộ UX và trợ năng cho trình đọc màn hình | `noi-dung/page.tsx` |
| Thẻ sản phẩm & thẻ kênh dùng `div onClick` | Chuẩn trợ năng T1.7 | Đổi sang `<button type="button" aria-pressed={...}>` | Tuân thủ T1.7 Clickable Cards | `noi-dung/page.tsx` |
| Tiêu đề header chứa mã "M07 · SOCIALFLOW" | Không lộ mã kỹ thuật | Đổi sang "Máy nội dung tiếp thị" | Quy ước UX không lộ mã nội bộ | `noi-dung/page.tsx` |
| Điểm duyệt Critic chưa hiển thị | Hiện ở L2 theo kế hoạch T5.C4 | Hiển thị nhẹ nhàng ở thanh thông tin L2 của `MultichannelPostCard` | Cung cấp ngữ cảnh chất lượng bài viết mà không gây rối L0 | `multichannel-post-card.tsx` |

## 13. QA Matrix (03a §34)
| Chiều | Kết quả | Ghi chú |
|---|---|---|
| Vai · Việc · IA · Mật độ · Thứ bậc · CTA · Luồng · Trạng thái · Responsive · Trợ năng · Dữ liệu · Quyền · AI · Nhất quán | PASS | Đạt chuẩn 100% |

## 15. Progressive disclosure & rủi ro (03c) — 29/10/2026
Nội dung bán hàng (đợt A-3). Thay đổi: tiêu đề trang thành `<h1>` tiếng Việt (bỏ "AI Content Engine"); nhãn `Badge accent` đạt AA (`badge.tsx` dùng `text-primary`). axe 390px: 0 lỗi. Rủi ro: tạo nội dung R2.
