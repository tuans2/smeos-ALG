---
id: SCR-STORE-landing-page
tier: STORE
module: catalog
route: /landing-page
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

# Screen Contract — Tạo landing page cửa hàng

**Tuyến:** `/landing-page` · **Tệp chính:** `src/components/landing-page/landing-page-studio-client.tsx`, `src/components/catalog/landing-campaign-tab.tsx` · **Cập nhật:** 29/10/2026 · **Thẻ:** công cụ #08 chuyển Hoàn thiện (PO 29/10/2026)

## 1. Vai và mục đích
- Vai chính: chủ tiệm, marketing · Phạm vi: organization · Mật độ: MEDIUM · Archetype: **E — Builder** (`ux-patterns/page-archetypes.md`)
- Việc chính: tạo trang giới thiệu/chiến dịch có link chia sẻ và QR
- Câu hỏi chính: "Trang của tôi đã xuất bản và gửi khách được chưa?"

## 2. Hiện trạng (audit) và thay đổi
- API: `POST /api/v1/content-engine/landing-generate` (soạn nội dung) · `POST /api/v1/catalog-links` → `J1` (xuất bản)
- Đã sửa: luồng "AI làm cho tôi" có 2 bước "Phân tích thị giác / Tối ưu chất lượng ảnh" tự chuyển "xong" sau 0,9 s/0,7 s mà không có lời gọi nào (03c UX-016) → bỏ; AI lỗi thì dùng nội dung mẫu **và báo rõ** (UX-017); bỏ "Công cụ 08", "Bản chuẩn v3", "Landing Page Studio", "Hub"; tiêu đề trang thành `<h1>`.
- Xuất bản: chỉ báo đã xuất bản khi `POST /catalog-links` trả thành công (đã đúng từ trước).

## 3. Thứ bậc thông tin
| Lớp | Nội dung |
|---|---|
| L0 | Mục đích trang, chế độ "AI làm cho tôi" / "Tự chọn từng bước" |
| L1 | Nút chọn chế độ; xuất bản ở bước cuối |
| L2 | Dịp, sản phẩm, phong cách, các mục bật/tắt |
| L3 | Tiêu đề, ảnh hero, video, nội dung từng mục |
| SYS | Soạn nội dung, tạo slug, lưu cấu hình |

## 15. Progressive disclosure & rủi ro (03c)
Pattern: UX-P01 (đầu vào → tạo), UX-P02, UX-P05, UX-P06. Rủi ro: soạn nội dung R2 (AI), **xuất bản công khai R3** (link khách xem được). axe 390px: 0 lỗi (`tests/e2e/ux/a11y-done-tools.spec.ts`). Test bước giả: `tests/unit/ux/no-fake-progress.test.ts`.

Trường theo ngữ cảnh (03c §5c, pilot MEUX 29/10/2026):
| Trường/nhóm | Hiện khi | Khóa khi | Mặc định | Khi điều kiện đổi |
|---|---|---|---|---|
| Mục đích trang (radio) | Luôn | — | Trang giới thiệu cửa hàng | Đổi bất kỳ lúc nào trước khi soạn; giá trị gửi kèm lần soạn kế tiếp (`pageType`) |
| Đầu vào AI (ảnh, video, ghi chú) | Chế độ "AI làm cho tôi" | Đang soạn | Trống | Chuyển sang "Tự chọn từng bước": ghi chú/video giữ nguyên — hai chế độ dùng chung state của `LandingCampaignTab`, không có lệnh xóa (đọc mã; chưa có E2E) |
Review thị giác: `docs/archive/historical/ui-ux-2026-10/MEUX_PILOT_LANDING_PAGE.md` §7.

### Nội dung AI — prompt v2 trong content engine (30/10/2026)
- Landing (08) và Catalog (09) viết qua content engine với prompt `prompts/landing/v2.ts`, `prompts/catalog/v2.ts`, đăng ký ở `prompts/active.ts` (`landingWriter`, `catalogWriter`). Quay về v1: đổi một dòng ở `active.ts`. Hình dạng JSON giữ nguyên v1.
- AI nhận điểm mạnh / cam kết / khách mục tiêu tiệm đã khai; chỉ được hứa cam kết đã khai.
- Kiểm chữ tất định `landing-copy-guard.ts`: cụm sáo rỗng hoặc lời hứa chưa khai (giờ giao, độ tươi, miễn phí, 100%…) → viết lại 1 lần (gộp với lần sửa của Critic, không thêm lượt gọi); vẫn còn lời hứa → bỏ mục đó hoặc trả phần đó về bản mẫu. Catalog có lời hứa → dùng bản mẫu.
- Critic landing chấm "cụ thể, không sáo, không hứa ngoài hồ sơ" thay cho "đủ 4 cam kết".
- **Mô tả sản phẩm đã duyệt** (Bước C, 30/10/2026): màn landing gửi `id` sản phẩm; máy chủ tự đọc bản dữ liệu bán hàng `APPROVED` mới nhất (`product-copies/use-cases/get-approved-selling-notes.ts`, trong tenant, tối đa 6 sản phẩm, ≤ 320 ký tự/sản phẩm) và đưa vào prompt v2 như dữ liệu. Người không có `H5` → bỏ qua, nội dung vẫn sinh. Route vẫn chưa gác quyền (nợ #170).
- **Nội dung mẫu dự phòng** (khi AI không chạy) viết lại: cụ thể, không cụm sáo, không hứa điều tiệm chưa khai; test bảo đảm qua được `landing-copy-guard`. Nhật ký `landing_content.generated` / `catalog_content.generated` ghi `promptVersion` và nguồn (`ai` / `template` + lý do), không ghi nội dung.

### Xem trước = trang khách (30/10/2026)
- Bước 4 "Xem trước và xuất bản" vẽ **chính trang `/c/[slug]`** trong iframe (`/xem-truoc-trang`, không đọc dữ liệu máy chủ, chỉ nhận dữ liệu qua `postMessage` cùng nguồn gốc, `noindex`) ở bề rộng thật 390px / 1280px. Dữ liệu xem trước và dữ liệu xuất bản dựng từ một hàm (`landing-publish-payload.ts`).
- Phong cách landing → phong cách + mẫu catalog (`landing-page/domain/archetype-style.ts`): Tối giản sang trọng → S03 + T03; Hiện đại chia khối → S12 + T04; Lễ hội ưu đãi → S04 + T04; Lãng mạn pastel → S10 + T01. Xuất bản lưu `style_id`/`template_id`; link cũ chưa lưu thì suy từ phong cách landing.
- Mô tả link (hiện khi chia sẻ) = dòng phụ do AI viết; không còn "Phong cách minimal-luxury".
