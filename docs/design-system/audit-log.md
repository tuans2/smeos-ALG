# Audit sâu MEUX/VDLS — mọi trạng thái của công cụ Hoàn thiện

> Bắt đầu 29/10/2026 theo yêu cầu PO "audit sâu để đảm bảo toàn bộ công cụ hoàn thành 100%". Chuẩn: `docs/dac-ta/ux-patterns/page-archetypes.md`, `visual-review.md`, 03c.
> Cách làm: tài khoản mới + **dữ liệu mẫu** (4 sản phẩm có ảnh, 4 phân tích đã duyệt, 2 đơn CONFIRMED giao ngày mai, hồ sơ cửa hàng có hotline/địa chỉ), Playwright đi qua từng bước, ảnh 390px + 1280px, axe (critical/serious, WCAG 2.2 A/AA tags), đo tràn ngang. axe sạch ≠ tuân thủ WCAG đầy đủ; chưa kiểm thủ công bàn phím/zoom/đọc màn hình.

## #08 Tạo landing page — 16 trạng thái

AI: nhập đầu vào, kết quả · Tự chọn: bước 1–4, xuất bản (bước 5) · **trang công khai `/c/<slug>`**. Sau sửa: 16/16 axe sạch, không tràn ngang.

| ID | Mức | Finding | Đã làm |
|---|---|---|---|
| D08-01 | **P0** | Xuất bản luôn gửi slug cố định `campaign-20-10`; slug duy nhất toàn hệ thống (URL `/c/<slug>`) → **chỉ cửa hàng đầu tiên trên hệ thống xuất bản được**, mọi tiệm khác nhận "Không thể xuất bản chiến dịch." | Không gửi slug — server tự sinh slug không trùng; URL dùng slug server trả về. Kiểm thật: 201 + `/c/trao-yeu-thuong-…` |
| D08-02 | **P0** | Trang công khai luôn có 3 **đánh giá 5 sao viết cứng** gắn "đã xác minh" | Bỏ dữ liệu cứng; mục đánh giá chỉ hiện khi có đánh giá thật (hiện chưa có nguồn → ẩn) |
| D08-03 | **P1** | Nội dung mẫu + mẫu trang công khai cam kết thay cửa hàng: "hoàn tiền 100%, 1 đổi 1", "giao 90–120 phút / 2h", "tươi 3–5 ngày", "nhập khẩu Hà Lan, Ecuador", "florist 7 năm", "VAT đầy đủ", "100% ảnh thật" | Câu trung tính, không con số/cam kết khi tiệm chưa khai; chính sách → "liên hệ tiệm" |
| D08-04 | **P1** | Đồng hồ "Ưu đãi đặt sớm 02 : 14 : 35" là chuỗi cố định (khẩn cấp giả) trên trang công khai | Gỡ |
| D08-05 | **P1** | Trang công khai ghi "Tiệm hoa smeOS" (tên nền tảng) thay tên tiệm — nội dung mẫu dựng trước khi hồ sơ tải xong | Màn cha tải hồ sơ trước, truyền `shopName` |
| D08-06 | **P1** | Xuất bản công khai (R3) không có xác nhận; 3 nút "Xuất bản" cùng lúc ở bước 4 | Một nút, qua `ConfirmDialog` (`use-confirm-publish.tsx`) |
| D08-07 | **P1** | 390px: nút chính luồng AI bị cắt chữ ("tích & Tự động thiết") | Xếp chồng trên di động, nút rộng, nhãn ngắn |
| D08-08 | P1 | Lỗi xuất bản đọc `data.message` — API trả `{ error: { message } }` nên lý do thật không bao giờ hiện | Đọc `error.message` |
| D08-09 | P1 | Thẻ "Đã đồng bộ vào AI Chatbot" — không module nào đọc `catalog_links` | Gỡ khẳng định sai |
| D08-10 | P2 | Thanh bước: tương phản thiếu (opacity), nút bước không tên trên di động, thuật ngữ "Archetype/Section/Storytelling" | Bỏ opacity, `aria-label` + `aria-current`, chữ nghiệp vụ |
| D08-11 | P2 | Tên phong cách tiếng Anh (Minimal Luxury, Bento Showcase 2026, Trending…); chip "CHUẨN DUAL-SOURCE"; emoji | Tên tiếng Việt (id giữ nguyên), bỏ chip/emoji |
| D08-12 | P2 | Trang công khai: nút gọi chỉ icon không tên; "Giá niêm yết" mờ thiếu tương phản; chữ preview `/70`, `/80` | `aria-label`, bỏ độ mờ |
| D08-13 | P2 | #09 catalog: thiếu slug thì bịa link `/c/catalog` | Báo lỗi thay vì bịa link |

Test chặn tái phát: `tests/unit/ux/no-fake-progress.test.ts` (slug, xác nhận xuất bản, đánh giá giả, cam kết, đồng hồ giả); `landing-content-generator.test.ts` cập nhật theo câu chữ mới.

**Cần PO quyết (chưa đổi):** nội dung mẫu và prompt AI mặc định ghi **"Giảm 10%"** khi cửa hàng không nhập ưu đãi (`discountPercent ?? 10`) — tức trang công khai hứa giảm giá mà tiệm chưa đặt. Đề xuất: không ưu đãi khi tiệm không nhập.

## #09 Tạo catalog — 20 trạng thái

AI: nhập, chọn phong cách, sẵn sàng, đã xuất bản · **trang công khai** · Tự chọn: bước 1–4 · quản lý. Sau sửa: 20/20 axe sạch, không tràn ngang.

| ID | Mức | Finding | Đã làm |
|---|---|---|---|
| D09-01 | **P1** | Chế độ "AI làm cho tôi" **tự xuất bản link công khai** khi đang dựng — trước khi người dùng xem lại (thẻ chế độ hứa "Bạn kiểm tra và chỉnh trước khi chia sẻ") | Dựng bản xem trước (tải PDF để xem), xuất bản chỉ khi bấm "Xuất bản catalog" + xác nhận |
| D09-02 | **P1** | Luồng tự chọn: xuất bản xong bị đưa về màn chọn chế độ → **không bao giờ thấy link/QR** vừa tạo | Giữ wizard ở bước 4 |
| D09-03 | **P1** | Xuất bản catalog (R3) không xác nhận | `useConfirmPublish` |
| D09-04 | P1 | "Tích hợp Chatbot AI — tư vấn 24/7 bằng catalog này" — không có tích hợp | Gỡ |
| D09-05 | P2 | Mã "T1" hiện làm tên phong cách; tên mẫu/phong cách tiếng Anh ("Signature Collection", "Bento 2026 đang trending"…); trang công khai hiện "EDITORIAL HIGH-FASHION • EDITORIAL MAGAZINE"; khẩu hiệu "smeOS 2026" trên catalog của tiệm | Tên tiếng Việt (id giữ nguyên), `templateDisplayName`, bỏ nhãn kỹ thuật trên trang công khai |
| D09-06 | P2 | Tên catalog "Bộ sưu tập: Mẫu kho: Bó hồng đỏ Ohara..." | Bỏ phần ô nhập tự ghép, chỉ "…" khi cắt |
| D09-07 | P2 | Hai nút chính ở trạng thái kết quả; lưới 4 cột bước 4 làm gãy nút ("Sao chép" bị cắt); "Copy", "(Next Best Actions)" | Một nút chính; lưới 2 cột; chữ tiếng Việt |
| D09-08 | P2 | Chấm chuyển trang xem trước 8px (WCAG 2.5.8 target-size); ô link chỉ đọc không nhãn | Vùng nhấn 24px + `aria-current`; `aria-label` |

## #05 Poster & banner — 12 trạng thái + kiểm ảnh xuất

Đã tải ảnh, đã tạo, tùy biến chi tiết, kho mẫu, xem phóng to, menu `…` (390/1280px) + tải thật 2 định dạng. Sau sửa: 12/12 axe sạch; ảnh xuất đo được **1080×1080** và **1920×1080**.

| ID | Mức | Finding | Đã làm |
|---|---|---|---|
| D05-01 | **P1** | Ảnh tải về chụp khung xem trước ×2 (~440–680px) trong khi nhãn ghi "1080 × 1080 px", "1920 × 1080 px" | Dựng ở bề rộng thiết kế cố định (`ScaledFrame`), xuất với `pixelRatio` theo kích thước đích (A4: 1240px) |
| D05-02 | **P1** | Chữ trên ấn phẩm bị cắt: tên tiệm, tiêu đề, **hotline "0283 555 …"**, địa chỉ; banner 16:9 mất tiêu đề và nút | Bố cục cố định không phụ thuộc cột; dòng liên hệ không cắt; tiêu đề 2 dòng; 16:9 chiếm hai cột |
| D05-03 | **P1** | Ưu đãi/thời hạn tự in lên ấn phẩm khi tiệm chưa nhập ("Tặng kèm băng rôn", "GIẢM ĐẾN 50%", "Chỉ áp dụng trong hôm nay", "hàng trăm quà tặng độc quyền", "✦ TUYỂN CHỌN ĐẶC QUYỀN ✦") | Ưu đãi/thời hạn rỗng tới khi người dùng nhập (mẫu trong kho người dùng chủ động chọn vẫn giữ); bỏ khẩu hiệu cố định |
| D05-04 | P2 | Nhãn trường "(Headline)", "(Subheadline)", "Badge", "(CTA)"; emoji 📞 trên ấn phẩm | Chữ tiếng Việt |

Còn mở (đề xuất PO): ảnh minh họa trong kho mẫu là ảnh stock máy ảnh/tai nghe/đồng hồ (Unsplash) — lệch ngành hoa, và là tài nguyên ngoài. Luồng "AI vẽ bố cục mới" có thể tự đề xuất ưu đãi trong nội dung AI — chưa có kiểm tra sự thật như landing.

## #01 Ảnh sản phẩm, #02 Bộ ảnh — 8 trạng thái (+ gửi job)

Đã chọn ảnh, mở tùy chọn (390/1280px), gửi tạo. Không có AI thật ở môi trường kiểm → không xem được ảnh kết quả; trạng thái sau gửi hiện đúng "Đã chờ N giây" (không tiến độ giả), mở lại trang khôi phục job đang chạy và khóa nút gửi. 8/8 axe sạch.

| ID | Mức | Finding | Đã làm |
|---|---|---|---|
| D01-01 | P2 | Lựa chọn phông nền/tỉ lệ/gói bộ ảnh chỉ phân biệt bằng màu viền, không `aria-pressed` | `aria-pressed` + dấu ✓ |

## #04 Nội dung bán hàng — 8 trạng thái

Chọn sản phẩm, kết quả bài viết (AI không chạy → nội dung mẫu), tab tải ảnh, hộp giọng văn. Sau sửa: 8/8 axe sạch.

| ID | Mức | Finding | Đã làm |
|---|---|---|---|
| D04-01 | **P1** | Đọc sai hợp đồng `GET /api/v1/products` (`master_image_url`, `pricing.selling_price`; API trả `masterImageUrl`, `price_vnd`) → ảnh và giá sản phẩm không bao giờ có | Đọc đúng trường; xem trước hiện ảnh thật |
| D04-02 | **P1** | Khi AI không chạy: "🛡️ Offline Fallback" + "Điểm duyệt Critic: 0.0/10"; khi chạy: tên model/"GPU Metal" | Một dòng "AI chưa chạy được — đang dùng nội dung mẫu, nên chỉnh lại trước khi đăng"; điểm chất lượng chỉ khi có AI |
| D04-03 | P2 | Xem trước bài đăng: "128" lượt thích, "16 bình luận • 5 chia sẻ", dấu xác minh, tên "Cửa hàng trực tuyến"; 7 nút giả bấm không làm gì | Bỏ số liệu/dấu giả; tên tiệm thật; nút minh họa thành `span` trang trí |
| D04-04 | P2 | Ô tải ảnh `role=button` lồng nút khác; cảnh báo thiếu tương phản + emoji; khung cuộn giọng văn không focus được; "AI Vision", "Social Publishing", "Copy nhanh Zalo", emoji kênh | Sửa tương ứng |

## #03 Thẻ chào / tư vấn khách (`/tai-anh`) — 12 trạng thái

4 tab (Nhận diện ảnh, Bài giới thiệu, Tư vấn khách, Kho ảnh) + đã chọn ảnh + mở một mẫu đã duyệt. Sau sửa: 12/12 axe sạch.

| ID | Mức | Finding | Đã làm |
|---|---|---|---|
| D03-01 | **P1** | Thẻ chào **gửi khách** in quà tặng/cam kết "mặc định hệ thống" tiệm chưa hề khai: "nước dưỡng Chrysal", "thiệp/banner", "100% hàng mới nhập", "giao 60–90 phút", "bảo hành đổi mới", "giấy gói Hàn Quốc" — cả trên thẻ A6 và kịch bản Zalo | Mặc định rỗng; mục quà tặng/cam kết/quy cách/kích thước chỉ hiện khi tiệm khai |
| D03-02 | **P1** | Chọn mẫu đã duyệt → thẻ ghi "Sản phẩm thiết kế cao cấp" thay tên thật, không mã SP; dùng `raw` bỏ qua bản người dùng đã sửa (`edited`) | Dùng `edited ?? raw` + tên/mã sản phẩm thật |
| D03-03 | **P1** | Lỗi lộ mã nội bộ "Cổng AI không chạy được: HET_DUONG_DU_PHONG" (3 use-case) | "AI chưa chạy được lúc này — hãy thử lại sau ít phút" |
| D03-04 | P2 | Giá trống hiện "—"; kích thước "~ × cm" | "Liên hệ để báo giá"; ẩn kích thước khi chưa có |
| D03-05 | P2 | Thẻ phân tích và ô tải ảnh `role=button` lồng nút; tiêu đề `text-accent` và hộp lỗi thiếu tương phản | Một điều khiển; token đạt tương phản |

Ngoài phạm vi (đề xuất task riêng): `text-accent` dùng làm chữ ở ~35 nơi khác ngoài công cụ Hoàn thiện, cùng lỗi tương phản 2,25:1 — cần token chữ riêng, PO duyệt.

## #49 Xu hướng thị trường — 10 trạng thái

Quét từ khóa (trống, đang chạy), cài đặt lịch quét, tiêu chí vĩ mô, làm mới. Sau sửa: axe sạch ở mọi trạng thái của công cụ.

| ID | Mức | Finding | Đã làm |
|---|---|---|---|
| D49-01 | P1 | 6 ô nhập/thanh trượt/select trong "Tiêu chí vĩ mô" và 2 ô giờ + 2 checkbox lịch quét không có nhãn truy cập; checkbox 16px (target-size) | `aria-label`; checkbox 24px |
| D49-02 | P2 | `text-cool-400` (71 chỗ) và tab con thiếu tương phản; "Khung giờ chạy cron" | Token `text-text-muted`/`text-primary`; "Giờ quét tự động" |

Ghi chú: nút "Cài Đặt & Biểu Mẫu" mở `/cai-dat` (hồ sơ cửa hàng) — trang đó còn 8 lỗi tương phản + 2 ô thiếu nhãn, thuộc nhóm Cài đặt của đợt rollout sau.

## #14 Thẻ chào & catalog nhanh — `/the-chao?quick=true`

Trạng thái kiểm: mở, lọc, tạo link (hộp thoại), sau khi đóng, trang khách.

| ID | Mức | Finding | Đã làm |
|---|---|---|---|
| D14-01 | P1 | Ô link chỉ đọc và ô lời nhắn trong hộp chia sẻ không có nhãn | `aria-label` |
| D14-02 | P1 | Admin thanh toán brochure dùng `role="tab"` nhưng không có tabpanel | Nhóm nút `aria-pressed` |
| D14-03 | P2 | Tên 20 mẫu giao diện bằng tiếng Anh ("Editorial Luxury"…) | Tên tiếng Việt (`greeting-template-catalog.ts`) |
| D14-04 | P2 | Nhãn mã kỹ thuật "#01…#12" trên thẻ mẫu (chữ 7px, tương phản thấp) | Bỏ nhãn |
| D14-05 | P2 | Chấm chọn sản phẩm 6px, nút trước/sau 24px sát nhau (target-size) | Vùng bấm 24px cho chấm; nút 32px ở di động |
| D14-07 | P2 | Nút "Làm mới" bị co trong hàng nút ở 390px sau khi đóng hộp chia sẻ (target-size, phát hiện bằng `npm run ux:audit -- the-chao`) | `shrink-0`; kịch bản `the-chao` là kiểm tra hồi quy |
| D14-06 | P1 | Khối chưa tới lượt (`opacity-60`, chuẩn Spotlight PO 23/10) làm chữ dưới 4,5:1 — axe 27–39 lỗi | **Chưa sửa — cần PO** (chuẩn Spotlight bị khóa trong Screen Contract) |

## #31–#35 Giá vốn & định giá — `/tinh-gia/*`

Trạng thái kiểm: 5 tab ở 390/1280px, chọn mẫu → bản nháp công thức từ ảnh, dự toán có đơn chưa có công thức.

| ID | Mức | Finding | Đã làm |
|---|---|---|---|
| D31-01 | P1 | Hộp cảnh báo `text-warning` trên `bg-warning-bg` dưới 4,5:1 (dự toán, giá vốn, nguyên liệu, công thức, đề xuất sản phẩm) | `text-warning-text` |

Ghi chú (chưa đổi, cần PO): dự toán khi mọi đơn đều chưa có công thức vẫn hiện "Tồn kho đã đủ cho các đơn này" — dễ hiểu nhầm.

## #11 · #51 · #64 Module Thương hiệu — `/ho-so`, `/ho-so/danh-thiep`, `/ch/:slug` (30/10/2026)

Kịch bản `scripts/ux-audit/scenarios/thuong-hieu.mjs`. Trạng thái kiểm ở 390/1280px: hồ sơ trống, danh thiếp khi hồ sơ chưa đủ, hồ sơ đủ, hộp xác nhận tạo link, đã có link, trang khách xem, danh thiếp, tải thật 4 tệp (PDF/PNG/PNG/vCF), hộp xác nhận ngừng, link đã ngừng, link sai.

| ID | Mức | Finding | Đã làm |
|---|---|---|---|
| D11-01 | P1 | Trang khách: `<dl>` bọc `dt/dd` trong `div` lồng hai cấp — axe `definition-list`, `dlitem` | Mỗi cặp là `div > dt + dd`, icon nằm trong `dt` kèm nhãn ẩn |
| D64-01 | P1 | Danh thiếp 390px cuộn ngang 1081px — ô lưới giữ bề rộng thẻ in 1063px | `min-w-0` cho khung xem trước, lưới một cột trên di động |
| D64-02 | P2 | PDF in nặng 4 MB do ảnh không nén | Nén ảnh khi ghép PDF: còn ≈106 KB |

Kiểm lại: 23/24 trạng thái sạch. Còn lại (cần PO, không sửa ở đây): nút xác nhận tông `danger` của `ConfirmDialog` dùng chung — chữ trắng trên nền đỏ dưới 4,5:1 ở 390px (`thuong-hieu-xac-nhan-ngung`); đụng token/biến thể nút dùng toàn app.
Chưa kiểm thủ công: bàn phím, phóng to 200%, trình đọc màn hình; logo từ kho lưu trữ thật (ở audit dùng ảnh cùng nguồn) — nếu kho chặn CORS, danh thiếp xuất không logo và báo cho người dùng.

## #45 Bộ nhận diện thương hiệu — `/ho-so/thu-vien-thuong-hieu` (30/10/2026)

Kịch bản `scripts/ux-audit/scenarios/thu-vien-thuong-hieu.mjs`. Trạng thái kiểm ở 390/1280px: trống, hộp thêm, có tài nguyên + mục đã lưu trữ, hộp phiên bản mới, chế độ chuỗi (hộp xác nhận chia sẻ, nhãn "Đang chia sẻ"). Khối "Từ chuỗi" phía cửa hàng thành viên kiểm bằng `tests/tenant/brand-library.test.ts`, chưa chụp ảnh.

| ID | Mức | Finding | Đã làm |
|---|---|---|---|
| D45-01 | P1 | Ô chọn tệp hiện chữ mặc định tiếng Anh của trình duyệt ("Choose File") | Ẩn ô gốc, nhãn "Chọn ảnh" + tên tệp đã chọn, có viền khi nhận phím |

Kiểm lại: 10/12 sạch. Còn lại ngoài phạm vi: số đếm `0/5` (`text-text-muted/60`) trên thanh lối tắt công cụ ở chế độ chuỗi dưới 4,5:1 — `toolkit-shortcuts-group.tsx` / `toolkit-picker.tsx`, có từ trước.
Chưa kiểm thủ công: bàn phím, phóng to 200%, trình đọc màn hình; tải ảnh thật lên kho (audit chỉ dùng loại văn bản).

## Bước 4 Thu hút khách — `/thu-hut-khach`, `/c/:slug` (form để lại thông tin), `/ket-noi` (30/10/2026)

Kịch bản `scripts/ux-audit/scenarios/thu-hut-khach.mjs`, `scripts/ux-audit/scenarios/ket-noi.mjs`. Trạng thái kiểm ở 390/1280px: mã trống, form tạo (mở phần thêm), có mã + thống kê mở, hộp xác nhận tắt, khách trống, có khách; trang catalog công khai: form, thiếu đồng ý, đã gửi (gửi thật vào database test); `/ket-noi`: dịch vụ đăng bài không phản hồi (lỗi tải), hộp thêm tài khoản.

| ID | Mức | Finding | Đã làm |
|---|---|---|---|
| B4-01 | P1 | Huy hiệu "Đang tắt"/"Đã hết hạn" dùng `text-warning` trên nền nhạt (axe tương phản) | `text-warning-text` (`short-link-row.tsx`) |
| B4-02 | P1 | Thông báo "đã gửi" của form để lại thông tin dùng `opacity-90` lên chữ (axe tương phản) | `text-text` (`landing-template-lead.tsx`) |
| B4-03 | P1 | `InlineError` dùng `text-danger` trên `bg-danger-bg` (axe tương phản) — ảnh hưởng mọi màn dùng component chuẩn | `text-danger-text` (`src/components/ui/inline-error.tsx`) |
| B4-04 | P2 | `/ket-noi` lộ chữ kỹ thuật/tiếng Anh: "AES-256", "Playwright Session", "Thought Leadership", "Visual Branding", "Format Hook-Body-CTA" | Viết lại tiếng Việt (`ket-noi/page.tsx`, `platform-account-card.tsx`, `connect-account-modal.tsx`) |

Kiểm lại: 22/22 sạch. Cảnh báo "số điện thoại mẫu" ở tab khách là dữ liệu kịch bản nạp vào, không phải chữ cứng trên màn.
Ngoài phạm vi (ghi lại): mô tả nền tảng ở `/ket-noi` dùng từ ngành chung ("Sản phẩm chuẩn") nghe gượng; nút trợ lý nổi che một phần nút "Thêm tài khoản" ở 390px — có từ trước.
Chưa kiểm thủ công: bàn phím, phóng to 200%, trình đọc màn hình; widget Turnstile (chưa khai khoá); quét QR có logo bằng điện thoại thật.

## Kết luận
Đã audit sâu xong toàn bộ công cụ Hoàn thiện.

### PO quyết 29/10/2026 — đã làm
| Mục | Đã làm |
|---|---|
| D14-06 Spotlight | Khối chưa chọn không còn `opacity-60`: chỉ nền trong suốt + viền nhạt, chữ giữ tương phản; Screen Contract `the-chao.md` cập nhật. axe `/the-chao` 0 lỗi ở mọi trạng thái |
| Ưu đãi landing page | Bỏ mặc định "Giảm 10%": % giảm lấy ở máy chủ từ ưu đãi tiệm đang bật (`listActiveShopPromotions`), không nhận từ trình duyệt; không bật → khối đăng ký không hứa giảm giá, prompt cấm tự đặt ưu đãi |
| Ảnh kho poster | Bỏ ảnh Unsplash và nút "ảnh mẫu demo"; ô xem trước dùng ảnh sản phẩm tiệm đã chọn |
| Ưu đãi poster | AI và mẫu chỉ in ưu đãi tiệm đang bật (`enforceShopPromotion`); ô "Ưu đãi của tiệm" là danh sách chọn + link Cài đặt; bỏ ưu đãi/thời hạn soạn sẵn trong kho mẫu |
| Dự toán | Không còn báo "Tồn kho đã đủ" khi các mẫu chưa có công thức (`noPurchaseMessage`) |

### Còn lưu lại
- `/cai-dat`: 8 lỗi tương phản + 2 ô thiếu nhãn — đã xử lý 04/11/2026, xem mục "Nhóm Cài đặt" bên dưới.
- Hồ sơ tiệm chưa lưu chính sách thì bộ ưu đãi mặc định (gồm "Giảm 10%") được coi là đang bật — tiệm tắt trong Cài đặt → Ưu đãi.
- Ngoài phạm vi: `generate-banner-copy` gọi LLM trực tiếp, chưa qua `callCapability`.

## /van-hanh/suc-khoe — Sức khoẻ hệ thống (30/10/2026, ROADMAP E1.6)

Kịch bản `scripts/ux-audit/scenarios/suc-khoe.mjs` (hàng đợi rỗng; có việc chờ + lỗi), 390/1280px, axe sạch, không cuộn ngang.

| ID | Mức | Finding | Đã làm |
|---|---|---|---|
| SK-01 | P2 | Không thấy được worker nào đang chạy, hàng đợi từng loại việc dài bao nhiêu | Thêm khối "Bộ xử lý nền" và bảng "Hàng đợi theo loại việc" (tên tiếng Việt, `<th scope>`, cuộn ngang trong thẻ ở 390px) |
| SK-02 | P2 | Khối "Job theo trạng thái" (có từ trước) hiện mã `FAILED`, `PENDING` | Chưa sửa — ngoài phạm vi E1.6 |

Chưa kiểm: bàn phím, zoom 200%, đọc màn hình.

## /van-hanh/hang-doi-loi — Hàng đợi lỗi (30/10/2026, ROADMAP E5.2)

Kịch bản `scripts/ux-audit/scenarios/hang-doi-loi.mjs` (rỗng; có 2 job lỗi; hộp xác nhận chạy lại), 390/1280px, axe sạch, không cuộn ngang.

| ID | Mức | Finding | Đã làm |
|---|---|---|---|
| HDL-01 | P2 | Câu trạng thái rỗng khẳng định "mọi việc đều đã tự chạy lại thành công" — không kiểm chứng được | Đổi thành mô tả trung tính khi nào việc hiện ở đây |
| HDL-02 | P3 | Thanh bên tô "Tổng quan nền tảng" vì trang chưa có mục menu | Chưa sửa — thêm mục menu là shell khoá, cần PO |

Chưa kiểm: bàn phím, zoom 200%, đọc màn hình.


## Nhóm Cài đặt — `/cai-dat` (10 tab), thành viên, thông báo, 5 ma trận, `/cai-dat-ai`, `/tich-hop` (04/11/2026)

Đợt A-6 còn dở của kế hoạch PD 29/10, nay thuộc Đợt 1 StoreOS lõi (M4-01, ADR-011). Kịch bản `scripts/ux-audit/scenarios/cai-dat.mjs`, 21 trạng thái × 390/1280px.
Trước: 12/21 trang lỗi axe (tương phản, ô không nhãn, vùng bấm nhỏ, tràn ngang). Sau: 20/21 sạch; tab "Luồng thẻ chào" còn lỗi trong tệp Thẻ chào đóng băng.

| ID | Mức | Finding | Đã làm |
|---|---|---|---|
| CD-01 | P1 | Lưới chọn ngành phủ `opacity-60` khi đã khoá ngành → chữ 2,4:1 | Bỏ làm mờ, chỉ khoá thao tác |
| CD-02 | P1 | Chữ `text-warning`/`text-danger` trên nền vàng/đỏ nhạt (2,98–4,25:1) ở 22 tệp | `text-warning-text`/`text-danger-text` (icon giữ nguyên) |
| CD-03 | P1 | 5 ô chọn màu, 3 `select` phông/giọng, 6 ô chọn Base UI, 20 `select` (dịp, thu thập dữ liệu chuỗi, thông báo), ô số % ưu đãi, ô hướng dẫn thanh toán không có tên truy cập | `aria-label`/`htmlFor`; nhãn đặt trên `SelectTrigger` (trên `Select` gốc bị mất) |
| CD-04 | P1 | Nút Lên/Xuống thứ tự nhà cung cấp AI 21px, sát nhau | Vùng bấm 32px |
| CD-05 | P2 | Mã kỹ thuật trên màn: "M0…M5", "NONE/AGGREGATED/MASKED/RAW", "S0/S1/S2", khoá trường, "SuperAdmin", "Admin SaaS", "Proposal Mode", "(SLA)", "Book ship", "POD", "(Heading Font)" | Tiếng Việt; mốc nhắc hiện số thứ tự |
| CD-06 | P2 | Nút "Mở khóa đổi ngành (Có phí)" chỉ bật `alert` | Dòng hướng dẫn liên hệ quản trị viên |
| CD-07 | P2 | Xem trước màu thương hiệu: chữ trắng cố định trên nền vàng (2,1:1) | Chọn trắng/đen theo tương phản (`calculateContrastRatio`) |
| CD-08 | P1 | Tab "Luồng thẻ chào": ô số, checkbox không nhãn, chữ cảnh báo thiếu tương phản, tràn ngang 401px ở 390px | Đã sửa 06/11/2026 sau D-47 (tràn ngang đã được phiên khác sửa); test khoá hành vi B5 trước khi chạm |
| CD-09 | P3 | `/cai-dat-ai` hiện tên model (GPT-4o, Gemini…) và từ nội bộ "bộ ảnh vàng", "chưa có khoá" | **Cần PO quyết:** tên model là nội dung chính của trang cấu hình — giữ hay đổi sang tên trung tính |

Kiểm thêm: ảnh mốc `visual-journeys` `/cai-dat` khớp. `a11y-journeys` đỏ ở số đếm thanh điều hướng "06 · QUẢN TRỊ TIỆM" và phím ⌘K — **đỏ y hệt trên `main`** (khung giao diện, lane L3), không do đợt này. Chưa kiểm: bàn phím, zoom 200%, đọc màn hình thủ công.

## #49 Xu hướng thị trường — `/market-intelligence` (06/11/2026)

Kịch bản `scripts/ux-audit/scenarios/market-intelligence.mjs` (nạp 3 cơ hội mẫu; tất cả, 4 nhóm bản tin, xem video, chi tiết cơ hội, tab từ khoá, hộp cài đặt), 9 trạng thái × 390/1280px. Trước: 6/9 trạng thái lỗi tương phản; sau: 9/9 sạch, không cuộn ngang.

| ID | Mức | Finding | Đã làm |
|---|---|---|---|
| MI-01 | P1 | Thẻ cơ hội là `div role="button"` lồng 2 `div role="button"` (thumbnail), không xử lý phím → bàn phím không mở được (7 tệp) | Nút chính phủ cả thẻ trên tiêu đề; thumbnail là `<a target="_blank">`, ô xem video là `<button>` nằm trên lớp phủ |
| MI-02 | P1 | Nhãn TikTok chữ `text-primary` trên nền đen (1,9:1); hạng #1 và bộ lọc đang chọn chữ trắng trên `bg-warning` (2,6:1); thanh tác giả trong hộp xem video chữ xám trên nền tối | Chữ trắng; `bg-warning-text`/`bg-accent-text`; `text-surface` |
| MI-03 | P2 | 390px: 4 ô "Tổng quan hôm nay" dồn 3 dòng thành một hàng (`Button` mặc định xếp ngang) | `flex-col items-stretch`; "Lọc xem →" không xuống dòng |
| MI-04 | P2 | "Trend Fit", "cron job" trên màn; ô trượt ngưỡng phù hợp không có tên | Tiếng Việt; `htmlFor`/`id` |
| MI-05 | P3 | 4 ô trượt `type="range"` còn là thẻ HTML thô (R18) | **Chưa sửa:** `src/components/ui` chưa có Slider — cần luồng component (L2) |

Chưa kiểm: bàn phím thủ công, zoom 200%, đọc màn hình.

## Đợt 06/11/2026 (tiếp) — tên nhà cung cấp trung tính, tải ảnh, bán hàng & marketing

PO 06/11/2026: duyệt sửa Catalog, luồng tải ảnh; đổi tên model sang tên trung tính; Slider để luồng ADR-011.
Catalog đã được phiên khác di trú trên `main` cùng ngày (PO 05/11) — đợt này **không** sửa vùng Catalog để không ghi đè.

| ID | Mức | Finding | Đã làm |
|---|---|---|---|
| X-01 | P2 | `/cai-dat-ai`, bộ chọn nhà cung cấp, bộ chọn cách xử lý ảnh hiện tên hãng/model ("GPT-4o", "Fal.ai", "BiRefNet", "bộ ảnh vàng", "khoá") | `displayName` trung tính trong `provider-catalog.ts` (khoá giữ nguyên cho cổng AI/worker); test chặn tên hãng |
| X-02 | P1 | Bong bóng chat che nút Gọi/Zalo ở thanh đáy trang khách `/c` (390px) | Đẩy bong bóng lên trên thanh đáy ở catalog/landing (< md) |
| X-03 | P1 | Vùng tải ảnh và thẻ chọn là `div role="button"`/`<button>` thô (nội dung, tin nhắn, kho ảnh, bán hàng, marketing, mẫu dùng chung) | `Button` chuẩn; thẻ có nút lồng → nút phủ cả thẻ |
| X-04 | P1 | `/in-an` bước chưa tới `opacity-70` (2,9:1); `/cham-soc` 3 ô nhập + 1 ô chọn không nhãn | Bỏ làm mờ; `htmlFor`/`id` |
| X-05 | P2 | Radio thô ở hộp nâng giới hạn chat, đối soát thanh toán, cách xử lý ảnh, mục đích trang landing | `RadioGroup` (phím mũi tên chuẩn) |
| X-06 | — | Công cụ audit: UI Studio (chỉ có ở dev) che nút góc phải; trang có kết nối mở lâu không "networkidle" | `ux:audit` ẩn UI Studio, chờ `load` + tối đa 15s |

- Bỏ hẳn "thử nghiệm nhanh với mẫu" (21 ảnh Unsplash) ở quét xu hướng theo ảnh (PO 06/11/2026); test `market-intelligence-no-stock-images.test.ts`. Ảnh minh hoạ theo chủ đề ở `opportunity-illustration.ts` (8 ảnh kho) cũng bỏ (PO 06/11/2026). Dữ liệu mẫu theo ngành (`mock-data-catalog.ts`, 25 ảnh) và sản phẩm mẫu khung xem trước Thẻ chào (`use-catalog-products.ts`, 6 ảnh, có test khoá hành vi B5) bỏ ảnh kho — để trống, hiện ảnh giữ chỗ.

Còn lại (chưa sửa): `flower-network-command-center` (StatTile có InfoTip lồng — cần đổi `StatTile`, luồng component); `upload-wizard.tsx` 1.458 dòng không còn được dùng (mã chết, ngoài phạm vi); 4 ô `range` chờ Slider; Thẻ chào ~30 vi phạm (cần test khoá hành vi B5 từng đường).

### Thẻ chào — đợt 1 (06/11/2026, D-47, test khoá hành vi B5 `greeting-card/__tests__/raw-inputs.characterization.test.tsx`)

- `<input>` thô → `Input`: ô ghi chú đơn (`order-notes-fields.tsx`), ô khoá kết nối Zalo/SMS (`brochure-notify-settings.tsx`).
- Nút "Copy ảnh sản phẩm": trạng thái tự đặt → `TaskUiState` (`running`/`succeeded`/`failed`).
- Để lại có lý do: 7 ô `range` ở điều phối chuỗi (chờ Slider, luồng ADR-011); ô bẫy chống spam `honeypot-field` (phải là `<input>` ẩn); `<details>` trong ô bảng thanh toán (Disclosure dạng thẻ làm vỡ bảng dày — cần quyết định thiết kế); 6 `<h1>` ở trang khách công khai (không có PageHeader của app); trạng thái bước "done/completed" của dải tiến độ xưởng/theo dõi giao hàng là trạng thái bước miền, không phải tác vụ.

### Thẻ chào — đợt 2 (06/11/2026, PO: "theo đề xuất tối ưu, phù hợp hệ thống thiết kế")

- Ô thanh toán trong bảng đơn (`admin-payment-plan-cell.tsx`): `<details>` → `Disclosure` (bỏ viền/nền để vừa ô bảng); test khoá hành vi B5 `admin/__tests__/admin-payment-plan-cell.characterization.test.tsx`.
- R20 miễn trừ cho `greeting-card/customer/**` (`ux-lint-allow.json`): trang khách công khai không có khung app, tiêu đề theo mẫu brochure; `PageHeader` dành cho màn trong app.
- 7 ô `range` vẫn chờ Slider (luồng ADR-011). UX lint 45 → 38.

### Đợt 3 (06/11/2026, PO: "theo đề xuất tối ưu")

- `templates/coordinator/partner-assignment-modal.tsx`: lớp phủ `fixed inset-0` tự viết → `Dialog`; radio thô → `RadioGroup`; bỏ mã "T06"/"T07" khỏi màn hình. Test khoá hành vi B5 `components/coordinator/__tests__/partner-assignment-modal.characterization.test.tsx`.
- `sales-order-intake-modal.tsx`: bỏ mã "P1"/"P2"/"T01" khỏi câu chữ (luật 6). Lớp phủ của hộp này (1.196 dòng) chưa chuyển — cần tách tệp khi viết lại.
- Miễn trừ có lý do: ô bẫy chống spam (R18). (Trạng thái bước của dải tiến độ xưởng/theo dõi giao hàng đã được sửa thật trong PR #156, bỏ miễn trừ R14.)
- UX lint 38 → 29. Còn: ô `range` chờ Slider (11), layout/feature-guidance-card (luồng khác/PO khoá), Catalog, `flower-network-command-center` (StatTile), `upload-wizard.tsx` (mã chết).

### Đợt 4 (06/11/2026)

- `sales-order-intake-modal.tsx`: lớp phủ `fixed inset-0` tự viết → `Dialog` (giữ khổ rộng 3xl). Tệp 1.290 → 1.281 dòng; việc tách theo bước (k11) để một đợt riêng. Test khoá hành vi B5 `components/coordinator/__tests__/sales-order-intake-modal.characterization.test.tsx`. UX lint 29 → 28.

### Đợt 5 (06/11/2026) — tách hộp "Tiếp nhận đơn hàng" (k11)

- `sales-order-intake-modal.tsx` 1.281 → 71 dòng: state/tải dữ liệu/gửi vào `use-sales-order-intake-form.ts`; giao diện thành 4 phần `sales-order-intake-{customer,product,bom,details}-section.tsx`; kiểu dùng chung `sales-order-intake-types.ts`. Mọi tệp ≤ 350 dòng; bỏ khỏi `file-size-baseline.json`. JSX và xử lý giữ nguyên (tách cơ học), test khoá hành vi B5 vẫn qua.

## `/audit` — Nhật ký kiểm toán: tab "Truy cập của nền tảng" (07/11/2026, ADR-013 D-I5, D-60)

Kịch bản `scripts/ux-audit/scenarios/nhat-ky.mjs`: tab "Thao tác trong tổ chức", tab "Truy cập của nền tảng" rỗng và có
dữ liệu (một người vận hành mở hồ sơ, xem đơn hàng, tải dữ liệu khách hàng). Sau sửa: 6/6 trạng thái axe sạch, không
tràn ngang ở 390px và 1280px. So với bản trước (audit `/audit` ở commit chưa có tab): lỗi axe ô chọn và cảnh báo
"đồng hồ" đã có từ trước.

| ID | Mức | Finding | Đã làm |
|---|---|---|---|
| AUD-01 | P1 | 390px: thanh tab hai nhãn `whitespace-nowrap` tràn ngang (393px) | Tab chia đôi chiều ngang, cho xuống dòng trên điện thoại |
| AUD-02 | P1 | Tab đang chọn không có dấu hiệu nhìn thấy: Base UI đánh dấu `data-active`, còn `TabsTrigger` dùng chung tô `data-[selected]` (không bao giờ khớp) — chỉ có `aria-selected` | Sửa ở `src/components/ui/tabs.tsx` (PO duyệt 07/11/2026): bộ chọn `data-[active]`; test `navigation-tabs.test.tsx`. Ảnh hưởng 2 màn dùng `Tabs` chung: `/audit` và Thư viện giao diện của Console (`/van-hanh/thu-vien-giao-dien`); các thanh tab khác (`TabActionHeader`…) không dùng component này |
| AUD-03 | P2 | axe `button-name`: ô chọn "Loại thao tác" không có tên truy cập (có từ trước) | `aria-label="Loại thao tác"` |
| AUD-04 | P3 | Nút "Làm mới" trong tab mới xuống dòng ở 390px | `shrink-0 whitespace-nowrap` |
| AUD-05 | — | Cảnh báo nội dung "đồng hồ đếm ngược" ở tab thứ nhất | Báo nhầm: biểu thức `HH:MM:SS` khớp thời điểm thật của bản ghi kiểm toán, không phải đồng hồ |

Thư viện giao diện của Console chưa audit lại (cần phiên người vận hành nền tảng). **Ngoài phạm vi, chưa sửa:** ô "Loại thao tác" hiện giá trị `ALL` thay vì nhãn "Tất cả" khi chưa chọn (có từ trước).
Chưa kiểm thủ công: bàn phím (chuyển tab bằng phím mũi tên), zoom 200%, trình đọc màn hình.
