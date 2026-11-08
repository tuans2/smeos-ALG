---
id: SCR-STORE-cong-cu
tier: STORE
module: toolkit
route: /cong-cu
archetype: A
snapshots:
  mobile: 390x844
  desktop: 1280x800
acceptance:
  - Hiển thị danh mục mục tiêu tiếp thị & bán hàng
  - Chuyển đổi giữa danh mục module và chi tiết loại ấn phẩm
  - Bàn phím tab điều hướng được toàn bộ thẻ ấn phẩm và công cụ
---

# Screen Contract — Trung tâm Tiếp thị & Bán hàng (/cong-cu)

**Tuyến:** `/cong-cu` · **Tệp chính:** `src/app/(app)/cong-cu/page.tsx`, `src/components/dashboard/toolkit-home.tsx` · **Cập nhật:** 01/11/2026 · **Thẻ:** PR-0

## 1. Vai và mục đích
- Vai chính (03b): `dieu_hanh`, `marketing`, `sale` · Vai phụ: `dieu_phoi`, `nhan_vien`
- Phạm vi: organization
- Việc chính: Chủ cửa hàng chọn mục tiêu kinh doanh, xem các loại ấn phẩm/tài nguyên cần tạo và sử dụng công cụ phù hợp mà không cần hiểu kiến trúc kỹ thuật.
- Câu hỏi chính: "Tôi muốn tạo ấn phẩm gì cho cửa hàng hôm nay và cần làm ở đâu?"
- Mật độ: MEDIUM (thẻ thông tin thoáng, Progressive Disclosure theo 2 tầng: Tổng quan 6 module -> Chi tiết module gồm L0 Bạn muốn tạo gì + L1 Công cụ)
- Archetype: B Danh sách (Directory / Launcher)

## 2. Hiện trạng (audit)
- API: Dữ liệu phân giải tĩnh qua domain `business-modules.ts`, `store-operations.ts`, `asset-types/`, phiên đọc qua `resolveAppSession()`
- Khối: 6 thẻ module mục tiêu + 1 thẻ Vận hành cửa hàng (tầng 1); L0 Bạn muốn tạo gì + L1 Công cụ hỗ trợ (tầng 2)
- Trạng thái có sẵn: tải ☑ rỗng ☑ lỗi ☑ không quyền ☑ một phần ☑ thành công ☑
- lint:ux: 0 vi phạm mới, tuân thủ thang token font chữ và spacing

## 3. Thứ bậc thông tin
| Lớp | Nội dung | Vị trí hiển thị |
|---|---|---|
| L0 Thiết yếu | "Bạn muốn tạo gì?": Các thẻ loại ấn phẩm (Asset Type Card) kèm nút Tạo, chip nơi dùng (QB/BH/CS/IN), đầu vào cần chuẩn bị | Đầu màn hình chi tiết module |
| L1 Hành động | Lưới công cụ trực tiếp (ToolCard) tương ứng với module | Dưới khu L0 của từng module |
| L2 Ngữ cảnh | Thanh tìm kiếm ấn phẩm/công cụ và bộ lọc trạng thái (chỉ dev) | Đầu trang chủ /cong-cu |
| L3 Chi tiết | Khu Vận hành cửa hàng (tính giá, xử lý đơn, thanh toán, chuỗi, số liệu) | Thẻ riêng dẫn vào StoreOperationsPanel |
| L4 Nâng cao | Các công cụ mục tiêu trong lộ trình AI | Cuối danh sách công cụ (chỉ hiện ở dev) |

## 4. Hành động
- Chính (1): Bấm thẻ module hoặc thẻ ấn phẩm → mở màn hình chi tiết mục tiêu hoặc mở thẳng công cụ tạo asset (`/cong-cu/anh-san-pham`, `/catalog`, `/the-chao`, `/bang-gia`...).
- Phụ (≤ 2):
  1. Liên kết "Asset đã tạo" → `/kho-du-lieu`.
  2. Nút "Tất cả các mục" (quay lại danh sách module tổng).

## 5. Content budget
- Nút nổi: 1/3 (Tạo asset)
- Khối chính: 2/5 (Bạn muốn tạo gì? + Công cụ hỗ trợ)
- Nhãn thẻ asset: ≤ 5 từ, tiếng Việt chuẩn mực, không chứa mã kỹ thuật.

## 6. Trạng thái
- Tải: Khung xương nhẹ cho danh sách module.
- Rỗng: Thông báo "Không tìm thấy ấn phẩm hoặc công cụ phù hợp" khi tìm kiếm.
- Production: Ẩn hoàn toàn module rỗng; chỉ hiển thị các asset đạt trạng thái Sẵn (READY) và công cụ DONE.
- Dev: Hiển thị đầy đủ 6 module, toàn bộ 92 asset (Sẵn, Mở rộng, Sắp ra mắt) và công cụ lộ trình.

## 7. Responsive
- 390px (Mobile): Lưới 2 cột cho thẻ module và công cụ; 1 cột cho thẻ asset; không cuộn ngang.
- 768px (Tablet): Lưới 2-3 cột linh hoạt.
- 1280px (Desktop): Lưới 3-4 cột tối ưu trải nghiệm desktop.

## 8. Trợ năng (A11y)
- Điều hướng bàn phím đầy đủ qua Tab và Enter/Space.
- Thẻ dùng pattern `after:absolute after:inset-0` để không lồng interactive element bên trong button/link.
- Nhãn `aria-hidden="true"` trên toàn bộ icon Phosphor trang trí.
- 0 lỗi axe critical/serious.

## 9. Dữ liệu và quyền
- Nguồn sự thật: `src/modules/marketing-center/domain/asset-types/` và `src/modules/toolkit/domain/business-modules.ts`.
- Bảo đảm cô lập tenant: không cho phép can thiệp hoặc rò rỉ dữ liệu ngoài tổ chức.

## 10. Nhóm "Hồ sơ & Thương hiệu" dạng ô (PO 08/11/2026)
- **Thay thế** lưới 16 loại ấn phẩm + "Công cụ hỗ trợ" của nhóm này bằng hành trình 3 bước dạng ô
  (`src/components/brand-kit/tiles/*`): hàng 3 ô bước (khoá tuần tự) → lưới ô của bước đang mở.
  - Bước 1: 8 ô "Thông tin cần có" + 4 ô "Thêm nếu có"; bấm ô mở `Dialog` nhập riêng mục đó.
  - Bước 2: ô phong cách (3 + "Tạo thêm" kèm `CostPreview`), thanh "Dùng bộ này làm chính thức" (nút chính duy nhất),
    6 ô thành phần (Logo, Khẩu hiệu, Bộ màu, Danh thiếp, Trang hồ sơ chia sẻ, Ảnh bìa) có tải / sao chép.
  - Bước 3: ô trang chính thức đang hoạt động, ô giao diện + "Tạo thêm", 8 ô cấu trúc trang; xuất bản qua `ConfirmDialog` (R3).
- **Cùng code với `/ho-so`** (hook `useBrandKit`, `GET/POST /api/v1/brand-kit*`, luật `lockedReason`), khác cách trình bày.
- **PHÁT_TRIỂN_SAU:** nội dung cũ của nhóm không xoá — `src/modules/toolkit/domain/deferred-module-content.ts` dời vào
  `deferredAssets`/`deferredTools`, chỉ môi trường phát triển thấy trong `Disclosure` "Phát triển sau"; số liệu đầu trang
  không đếm 5 công cụ này (`deferredToolIds`). Thẻ nhóm trên lưới ghi "3 bước: Hồ sơ · Nhận diện · Landing".
- Kịch bản audit: `scripts/ux-audit/scenarios/cong-cu-thuong-hieu.mjs`.
- Bước 1 đủ 8/8 → thanh "Xác nhận hồ sơ — tạo Bộ nhận diện" (tự tạo 3 phương án, mở Bước 2); Bước 2 đã chọn bộ chính thức →
  "Tạo Landing page" (tự dựng 3 giao diện, mở Bước 3). Điều khiển chung với /ho-so: `src/components/brand-kit/journey/*`.
- Hàng ô bước dùng chung với nhóm "Tạo nội dung": `src/components/journey/journey-step-tiles.tsx`.

## 11. Nhóm "Tạo nội dung" dạng ô 4 bước (PO 08/11/2026)
- **Thay thế** lưới 10 công cụ của nhóm (ảnh, bộ ảnh, thẻ chào, nội dung, poster, video, chiến dịch, xu hướng…) bằng hành
  trình 4 bước dạng ô (`src/components/content-studio/*`), cùng ngôn ngữ ô với §10:
  Thẻ sản phẩm → Thẻ chào sản phẩm → Bài đăng đa kênh → Đăng tự động.
- **Sản phẩm đang làm** giữ trên URL (`?muc=content&sp=<mã sản phẩm>`): tải lại trang vẫn đúng nhóm, đúng sản phẩm.
  Chưa chọn sản phẩm: Bước 2–4 vẫn mở để **chọn từ Kho sản phẩm**; đã chọn thì bước sau mở khi bước trước đã duyệt
  (`contentLockedReason`, máy chủ kiểm lại). Bước 4 không khoá.
- Bước 1: 2 ô kiểu tải — *Một sản phẩm* (1 hoặc nhiều góc chụp → 1 Thẻ; ảnh đầu là ảnh chính để quét, các góc khác gắn vào
  sản phẩm khi duyệt Thẻ) và *Nhiều sản phẩm* (mỗi ảnh 1 Thẻ, một lượt quét chung) — cùng ô "Chọn từ Kho sản phẩm". Tối đa
  10 ảnh/lần, `CostPreview` trước khi quét, chờ có trần 4 phút. Mỗi kết quả một ô; bấm ô mở `Dialog` duyệt Thẻ sản phẩm
  (`AnalysisResultCard`) → hệ thống viết ngay Bài giới thiệu → duyệt (`CommercialContentCard`). Duyệt xong 1 sản phẩm thì
  mở Bước 2.
- Bước 2: Thẻ chào sản phẩm (tư vấn bán hàng, `SalesPitchCard` — không phải thiệp) dựng từ dữ liệu đã duyệt + hồ sơ cửa
  hàng; chốt thẻ → lưu `products.attributes.sales_pitch` (Kho sản phẩm, có số lần chốt). Thay cho bản lưu cũ ở localStorage.
- Bước 3 (Đợt 2): 4 ô nền tảng (Facebook, Instagram, TikTok, Zalo — chọn nhiều) + `CostPreview` → Content Engine viết từ
  dữ liệu ĐÃ DUYỆT (Brief lấy Thẻ chào → Bài giới thiệu → Thẻ sản phẩm khi sản phẩm chưa có báo cáo thị trường,
  `content-engine/domain/approved-product-context.ts`); xem trước + sửa từng bài bằng thẻ chuẩn `MultichannelPostCard`;
  "Duyệt N bài" (J5) một lần; bài đã duyệt nằm trong Kho → nút "Sang Bước 4". Chưa có sản phẩm → chọn từ Kho (chỉ sản
  phẩm đã chốt Thẻ chào) hoặc về Bước 1.
- Bước 4 (Đợt 3, module `social-publishing` — thay phần đăng bài của SocialFlow): bài nguồn = lượt bài đã duyệt ở Bước 3
  của sản phẩm đang làm, hoặc chọn từ Kho (chỉ sản phẩm có bài đã duyệt). 4 ô kênh (Facebook, Instagram, Zalo, TikTok)
  với trạng thái: Sẵn sàng / Chưa kết nối / Hết hạn kết nối / Chưa có bài / Chưa mở (ứng dụng nền tảng chưa cấu hình);
  nút **Kết nối** ngay trong ô (W2, OAuth — quay về `?buoc=dang-tu-dong&ket_noi=…`; Facebook nhiều Trang → `Dialog` chọn
  Trang). 3 ô "Khi nào đăng?": Tự lên lịch (giờ vàng 11:30 / 20:00) · Đăng ngay · Chọn giờ (`datetime-local`). Một nút
  chính "Lên lịch N bài" / "Đăng N bài" (J5). Danh sách "Bài đã gửi đăng": Chờ đăng / Đang đăng / Đã đăng (Xem bài) /
  Chưa đăng được (lý do + Thử lại) / Đã huỷ; tự tải lại mỗi 15 giây khi còn bài chờ, tối đa 10 phút.
- Hồ sơ cửa hàng chưa đủ mục thiết yếu: một dòng nhắc nhẹ dẫn `/ho-so`, không khoá bước.
- Quyền theo mã năng lực: H1 quét, H2 sửa, H3 duyệt Thẻ, H5 viết Bài giới thiệu, H6 duyệt Bài giới thiệu, L1 đọc Kho, L3 chốt Thẻ chào, I1 viết bài đăng, J5 duyệt + đăng bài, W2 kết nối / ngắt kênh (mẫu chính
  thức: chỉ Điều hành — luật `decideEdit` sẵn có). Thiếu quyền → câu tiếng Việt nói rõ, không ẩn im lặng.
- **PHÁT_TRIỂN_SAU:** 10 công cụ cũ dời vào `deferredTools`, chỉ môi trường phát triển thấy; số liệu đầu trang không đếm.
  Thẻ nhóm trên lưới ghi "4 bước: Thẻ sản phẩm · Thẻ chào · Bài đăng · Đăng tự động".
- API: `GET /api/v1/content-studio/products` (L1, Kho kèm cờ), `GET /api/v1/content-studio/products/[id]` (L1),
  `PUT /api/v1/content-studio/products/[id]/sales-pitch` (L3), `GET /api/v1/content-studio/scans/[jobId]` (H1).
