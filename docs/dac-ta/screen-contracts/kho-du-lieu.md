---
id: SCR-STORE-kho-du-lieu
tier: STORE
module: storage
route: /kho-du-lieu
archetype: B
snapshots:
  mobile: 390x844
  desktop: 1280x800
acceptance:
  - Hiển thị 11 tab tài nguyên theo quyền và huy hiệu số lượng
  - Tìm kiếm, lọc và phân loại chi nhánh hoạt động mượt mà
  - Hỗ trợ thùng rác 30 ngày và khôi phục tài nguyên
---

# Screen Contract — Kho Dữ Liệu (Thư viện tập trung) — v2

> **Lối vào tuyến khoá (12/11/2026, audit N-05):** khi `NEXT_PUBLIC_APP_ENV=production` bật khoá "Sắp ra mắt", lối vào tuyến khoá bị ẩn thay vì dẫn tới màn khoá (`isHrefOpen`, `src/lib/feature-lock.ts`). Nút "Đi tới Hàng chờ duyệt" (tab Đã duyệt) và "Mở … trong công cụ" (tab thư viện) ẩn khi tuyến đích đang khoá. Khoá tắt (staging, bản giao GD1) giữ nguyên.

**Tuyến:** `/kho-du-lieu` · **Tệp chính:** `src/app/(app)/kho-du-lieu/page.tsx` · **Thành phần:** `src/components/storage/account-storage-hub.tsx` · **Cập nhật:** 29/10/2026 · **Trạng thái:** v2 đã duyệt 29/10/2026 — đang dựng (§13a) · **v1:** 27/09/2026, thẻ T5.D6 (3 tab + thùng rác)

> PO 29/10/2026: (1) mở rộng Kho dữ liệu, không tạo màn mới; (2) dùng tab; (3) tầng chuỗi xem toàn bộ của chuỗi và các chi nhánh, có phân loại riêng; (4) có Screen Contract + cập nhật SSOT (`docs/production-feature-map/Tài liệu kỹ thuật gốc hiện tại/08-kho-du-lieu.md`).

## 1. Vai và mục đích
- Vai chính (03b): `store_manager`, `marketing`, `sales_specialist`, `florist` · Vai phụ: `dieu_phoi`
- Phạm vi: organization (cửa hàng) · organization + branch (chuỗi)
- Việc chính: Tìm lại, xem và quản lý **mọi đầu vào và đầu ra** tiệm đã tạo — ảnh, ảnh AI, video, âm thanh, nội dung, catalog, thẻ chào, kịch bản tư vấn — ở một chỗ.
- Câu hỏi chính: "Cái mình (hoặc chi nhánh) đã tạo trước đây đang ở đâu, và mở lại nó thế nào?"
- Mật độ: MEDIUM (lưới thẻ + tìm kiếm + lọc phạm vi chi nhánh)
- Archetype: B Danh sách

## 2. Hiện trạng (audit 29/10/2026)
- v1 có 4 tab: Ảnh gốc (`GET /api/v1/assets`, G1), Ảnh đã duyệt (`GET /api/v1/vision/analyses?approval_state=APPROVED`, H3/H5/L1), Kịch bản tư vấn (**chỉ localStorage trình duyệt** — mất khi đổi máy), Thùng rác (`GET /api/v1/storage/trash`, Điều hành).
- Các đầu ra khác nằm rải ở màn riêng: video `/video` (`video_jobs`, I1), âm thanh trong Creative Studio (`music_tracks`, `voice_clones`, I1), nội dung `/noi-dung` (`content_generations`, I1), catalog `/catalog` (`catalog_links`, J1), thẻ chào `/the-chao` (`greeting_catalogs`, quyền thẻ chào).
- **Landing page không được lưu**: `POST /api/v1/content-engine/landing-generate` trả kết quả rồi bỏ — không có gì để liệt kê (§14 L-1).
- Chi nhánh (`branches`) nằm trong cùng tổ chức với chuỗi; các bảng đầu ra **không có `branch_id`**. Người tạo có `memberships.branch_id` (null = toàn tổ chức).

## 3. Thứ bậc thông tin
| Lớp | Nội dung | Vị trí hiển thị |
|---|---|---|
| L0 Thiết yếu | Ảnh xem trước / biểu tượng loại, tên, ngày tạo | Thẻ trong lưới, khung nhìn đầu |
| L1 Hành động | Mở trong công cụ gốc, tải về (nếu là tệp), chuyển vào thùng rác | Nút trên thẻ |
| L2 Ngữ cảnh | Huy hiệu chi nhánh (chuỗi), trạng thái (nháp/đã duyệt/đã đăng), sản phẩm gắn kèm, người tạo | Badge trên thẻ |
| L3 Chi tiết | Thông số riêng của loại (thời lượng video, kênh nội dung, số mẫu trong catalog) | Drawer chi tiết |
| L4 Nâng cao | — | — |

## 4. Tab (TabActionHeader, K2) — thứ tự cố định
| # | Tab (nhãn) | Nguồn sự thật | Quyền xem | Mở lại ở |
|---|---|---|---|---|
| 1 | Ảnh gốc | `assets` kind `ORIGINAL` | G1 | `/tai-anh` |
| 2 | Ảnh đã duyệt | `vision_analyses` APPROVED | như v1 (H3/H5/L1) | `/san-pham` |
| 3 | Ảnh AI | `assets` kind `ENHANCED, MASTER, MARKETING, CATALOG, LANDING, SOCIAL, RATIO` | G1 | Creative Studio |
| 4 | Video | `video_jobs` | I1 | `/video` |
| 5 | Âm thanh | `music_tracks`, `voice_clones` | I1 | Creative Studio |
| 6 | Nội dung | `content_generations` | I1 | `/noi-dung` |
| 7 | Catalog | `catalog_links` (kể cả đã thu hồi, có nhãn) | J1 | `/catalog` |
| 8 | Thẻ chào | `greeting_catalogs` | quyền đọc thẻ chào | `/the-chao` |
| 9 | Kịch bản tư vấn | như v1 (§14 L-2) | như v1 | — |
| 10 | Landing page | `landing_pages` (L-1, từ 29/10/2026 — lượt sinh trước đó không có) | J1 | `/landing-page` |
| 11 | Thùng rác (30 ngày) | `GET /api/v1/storage/trash` | Điều hành (như v1) | — |

- Tab không có quyền xem: **ẩn**, không hiện tab khoá.
- Mỗi tab có huy hiệu số lượng; 390px: thanh tab cuộn ngang, tab đang chọn luôn trong khung nhìn.

## 5. Phạm vi chuỗi và chi nhánh
- Chỉ hiện khi tổ chức là chuỗi (`organizations.type = CHAIN`): bộ chọn **Phạm vi** ngay dưới tiêu đề, trên thanh tab: `Toàn chuỗi` · `Trụ sở` · từng chi nhánh (`branches`, đang hoạt động).
- **Phân loại** mỗi mục theo chi nhánh của người tạo (`memberships.branch_id` của `created_by`; null → "Trụ sở"). Mục không có người tạo rõ (job hệ thống) → "Trụ sở". Thẻ có huy hiệu tên chi nhánh khi phạm vi là `Toàn chuỗi`.
- Người dùng có `memberships.branch_id` (nhân viên chi nhánh): §14 L-3.
- Cửa hàng đơn (`SINGLE`/`STORE`): không có bộ chọn, không có huy hiệu.
- Chi nhánh gia công ngoài tổ chức (đối tác chuỗi) **không** nằm trong phạm vi — khác tổ chức, luật cách ly tenant.

## 6. Hành động
- Chính (1, theo tab): Ảnh gốc `+ Tải ảnh mới`; Ảnh AI/Video/Âm thanh/Nội dung `+ Tạo mới` (dẫn tới công cụ tương ứng); Catalog `+ Tạo catalog`; Thẻ chào `+ Tạo thẻ chào`; Thùng rác: không có.
- Phụ (≤ 2): `Làm mới`, `Tải về` (tab có tệp).
- Trên thẻ: `Mở` (về công cụ gốc), `Chuyển vào thùng rác` (Điều hành) cho ảnh gốc, ảnh AI, ảnh đã duyệt, sản phẩm, video, nội dung, catalog, thẻ chào, landing page (L-4). Âm thanh dùng nút xoá riêng của Creative Studio.
- Menu `…`: tác vụ phụ còn lại.

## 7. Content budget
- 1 primary/tab; lưới 2 cột (390px) → 3–4 (768px) → 5 (1280px+), `max-w-7xl`.
- Tìm kiếm theo tên trong tab đang chọn; lọc ngày (7/30/90 ngày, tất cả).

## 8. Trạng thái
- Tải: skeleton lưới; Rỗng: khối nét đứt + nút primary của tab; Lỗi: thông báo + `Thử lại`; Không quyền: tab ẩn; Một phần: nếu một nguồn lỗi, tab đó báo lỗi, tab khác vẫn chạy; Thành công: toast khi chuyển vào thùng rác/khôi phục.

## 9. Responsive
- 390px: tab cuộn ngang, bộ chọn phạm vi dạng select toàn chiều rộng; 768px: lưới 3–4 cột; 1280px+: 5 cột.

## 10. Trợ năng
- Tab và bộ chọn phạm vi dùng được bằng bàn phím; `focus-visible` token chuẩn; ảnh có `alt` = tên mục; huy hiệu chi nhánh có văn bản, không chỉ màu.

## 11. AI
- Không gọi AI. Chỉ liệt kê kết quả AI đã tạo.

## 12. Dữ liệu, API và quyền
- API mới: `GET /api/v1/storage/library?type=<tab>&scope=<all|hq|branchId>&q=&from=&cursor=` → `{ items: [{ id, type, title, thumbnail_url?, created_at, created_by, branch: { id, name } | null, status?, open_href }], next_cursor, counts }`.
  - `organization_id` chỉ từ `requireTenantContext()`; xuyên tổ chức → 404.
  - Mỗi `type` kiểm đúng mã quyền ở §4; thiếu quyền → 403 cho type đó, `counts` bỏ type đó.
  - Ảnh xem trước: URL ký có hạn (như v1). Phân trang con trỏ, tối đa 50/trang.
- Không đổi schema cho tab 1–9, 11.

## 13. Component
- Dùng lại: `TabActionHeader` (PO khoá — không đổi cấu trúc, chỉ thêm tab), `Button`, `Card`, `Badge`, `StorageTrashTab`, `TrashConfirmModal`.
- Tạo mới: `LibraryGrid` (lưới chung), `LibraryScopeSelect` (bộ chọn phạm vi chuỗi). `account-storage-hub.tsx` đang 914 dòng (> 350): tách tab mới ra tệp riêng, không làm tệp này dài thêm.

## 13a. Ghi chú dựng v2 (29/10/2026)
- Đã dựng: API `GET /storage/library` + `/summary?scope=` (kèm số mục theo phạm vi); 7 tab mới (Ảnh AI, Video, Âm thanh, Nội dung, Catalog, Thẻ chào, Landing page) có huy hiệu số lượng, tìm theo tên, lọc thời gian, "Xem thêm"; bộ chọn phạm vi chuỗi; nhãn chi nhánh; chuyển ảnh vào thùng rác (Điều hành).
- **Ảnh gốc theo phạm vi:** chuỗi chọn Trụ sở/chi nhánh thì tab Ảnh gốc dùng lưới thư viện (lọc theo người tạo; nút "Mở" về `/tai-anh`, không có nút "Phân tích" tại chỗ). Toàn chuỗi giữ lưới v1.
- **Không lọc theo phạm vi (cố ý):** Ảnh đã duyệt (dữ liệu sản phẩm dùng chung toàn tổ chức), Kịch bản tư vấn (L-2, còn ở trình duyệt), Thùng rác (theo quyền Điều hành toàn tổ chức).
- **Mở đúng mục:** Ảnh AI → `/creative-studio?area=d&assetId=`, Video → `?area=e&videoJobId=`, Giọng đọc → `?area=c&voiceId=`. Nội dung, catalog, thẻ chào, landing page: mở trang công cụ (công cụ chưa nhận tham số chọn mục).
- **Video:** `video_jobs.created_by` (migration `20261029200000`) — video tạo từ nay xếp đúng chi nhánh; video cũ tính là "Trụ sở".
- **Ảnh bìa** (29/10/2026, sau phản hồi PO): lưới dùng `ProductThumb` (ảnh lưu trữ → `attributes.imageUrl` → Google Drive → "Chưa có ảnh"). Ảnh gốc/Ảnh AI: chính ảnh. Thẻ chào: ảnh MAIN sản phẩm đầu tiên. Nội dung: ảnh nguồn (`asset_id`), không có thì ảnh sản phẩm. Video: ảnh cảnh đầu tiên. Catalog: ảnh hero tuỳ chỉnh. Landing page: ảnh sản phẩm đầu tiên trong yêu cầu. Âm thanh: biểu tượng nhạc.
- Tìm theo tên: video, âm thanh, catalog, thẻ chào, landing page. Ảnh và nội dung chưa có trường tên.
- Landing page (L-1): bảng `landing_pages`, migration `20261029180000_landing_pages`; chỉ landing page sinh từ 29/10/2026.
- Tách `storage-hub-tabs.ts`, `library/*`: `account-storage-hub.tsx` giảm 914 → ~855 dòng.
- **Gắn nhãn loại tư liệu & Bộ lọc module nghiệp vụ (01/11/2026, PR-1):** Mọi mục trong Kho dữ liệu được gắn nhãn loại asset chuẩn (`asset_type.code`, `asset_type.name`, `asset_type.module`) thông qua `metadata.asset_type_code` hoặc suy luận theo luật `library-asset-mapping.ts`. Trên thẻ hiển thị chip loại tư liệu (`text-caption`) và hỗ trợ bộ lọc theo 6 module nghiệp vụ.
- **L-4 thùng rác (PO 05/11/2026: xoá vĩnh viễn tất cả):** video, nội dung, catalog, thẻ chào, landing page vào thùng rác 30 ngày (`trashed_at/purge_after`, migration `20261105230000_library_trash_columns`), khôi phục được, quá hạn cron xoá vĩnh viễn (ghi audit; video xoá kèm tệp qua hàng đợi xoá). Vào thùng rác: biến khỏi công cụ gốc và Kho dữ liệu; **catalog** thu hồi link (khôi phục chỉ mở lại link do thùng rác thu hồi — mã Catalog đang đóng băng nên không sửa, logic nằm ở `storage/infra/library-trash-repository.ts`); **thẻ chào** ẩn (`is_active=false`), khôi phục vẫn ẩn để người dùng tự bật lại. **Hệ quả đã chốt:** xoá vĩnh viễn thẻ chào xoá cả phiên khách và nhật ký hành trình (cascade); đơn hàng và sổ thanh toán giữ lại (liên kết phiên → rỗng). Mục đang dùng ở chiến dịch/kênh bán (`asset_usages`, `campaign_packages`) và tổ chức đang legal hold → 409, cron bỏ qua.
- **L-2 (PO 05/11/2026): chưa làm** — kịch bản tư vấn vẫn ở trình duyệt.

## 14. Quyết định PO (duyệt 29/10/2026 — chọn phương án đề xuất)
| ID | Câu hỏi | Đề xuất |
|---|---|---|
| L-1 | Landing page không được lưu. Lưu lại để tìm được? | **Có** — bảng `landing_pages` (đổi schema, cần duyệt riêng). Trước khi có: ẩn tab Landing page |
| L-2 | Kịch bản tư vấn chỉ ở localStorage (đổi máy là mất). Đưa lên máy chủ? | **PO 05/11/2026: chưa làm** |
| L-3 | Nhân viên chi nhánh thấy gì? | Chỉ mục của chi nhánh mình + mục "Trụ sở"; không có bộ chọn phạm vi |
| L-4 | Thùng rác cho video/nội dung/catalog/thẻ chào? | **PO 05/11/2026: thùng rác 30 ngày rồi xoá vĩnh viễn tất cả, kể cả thẻ chào đã có phiên khách** — đã dựng (§13a) |

## 15. QA Matrix (03a §34)
| Chiều | Kết quả | Ghi chú |
|---|---|---|
| Vai · Việc · IA · Mật độ · Thứ bậc · CTA · Luồng · Trạng thái · Responsive · Trợ năng · Dữ liệu · Quyền · AI · Nhất quán | CHƯA ĐÁNH GIÁ | Đánh giá sau khi dựng v2 |
