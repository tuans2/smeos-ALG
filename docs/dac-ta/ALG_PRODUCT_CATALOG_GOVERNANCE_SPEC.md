# Quản trị danh mục sản phẩm theo vai trò

> Trạng thái: **CANONICAL** · Chủ sở hữu: Product Owner · PO chốt 23/10/2026.
> Mã nguồn: `src/modules/products/domain/product-proposal.ts` (luật), `src/modules/products/use-cases/*`,
> năng lực trong `src/core/rbac/capability-catalog.ts`. Endpoint: đặc tả 06 mục Sản phẩm.

## 1. Mục tiêu

Danh mục chính thức của cửa hàng/chuỗi chỉ do **Điều hành** quyết định. Nhân viên vẫn đóng góp mẫu mới
và đề xuất chỉnh sửa, nhưng không ai ngoài Điều hành ghi đè hay xoá được mẫu chính thức. Việc bán hàng
và điều phối hằng ngày không bị chặn bởi quy trình duyệt.

## 2. Quyết định của PO (23/10/2026)

| # | Câu hỏi | Quyết định |
|---|---|---|
| 1 | Sale có tạo đề xuất mẫu mới? | **Có.** Mẫu gắn nhãn đề xuất, **dùng được ngay** để bán, Điều hành nhận thông báo để duyệt. |
| 2 | Điều phối tạm ẩn mẫu khi hết hoa không cần duyệt? | **Có.** |
| 3 | Cần vai phó điều hành duyệt thay? | **Không.** Chỉ Điều hành (`H3`, trần cứng) duyệt. |
| 4 | Triển khai giai đoạn 1 ngay? | **Có.** Giai đoạn 2–3 tiến hành sau (PO 23/10/2026). |

## 3. Năm nguyên tắc

1. **Không ai ngoài Điều hành ghi đè mẫu chính thức.** Người khác sửa → tạo đề xuất; bản gốc giữ nguyên.
2. **Không xoá, chỉ ngừng.** Ngừng kinh doanh (`L4`) và xoá/khôi phục trong thùng rác chỉ Điều hành.
3. **Đề xuất có hạn 30 ngày.** Quá hạn chưa duyệt → tự tạm ẩn và đánh dấu Hết hạn.
4. **Nhập Excel chỉ Điều hành** (`L2` + `H3`).
5. **Vận hành không bị chặn.** Sale/Điều phối vẫn báo giá, lên đơn với mọi mẫu đang bán; đơn đã đặt giữ
   giá và thành phần lúc đặt (`order_items.unit_price_vnd`, `metadata`).

## 4. Phân loại sản phẩm

**Mức chính thức** (`products.attributes.proposal.status`, chỉ máy chủ ghi — không thêm cột vì API
danh sách/chi tiết map từng trường; quyết định khi làm giai đoạn 2):

| Giá trị | Ý nghĩa | Ai sửa nội dung |
|---|---|---|
| (không có nhãn) | Chính thức — Điều hành tạo hoặc đã có từ trước | Chỉ Điều hành |
| `pending` | Đề xuất mới, đang dùng được, chờ duyệt | Người đề xuất (và Điều hành) |
| `approved` | Đề xuất đã duyệt = chính thức | Chỉ Điều hành |
| `rejected` | Bị từ chối — tự tạm ẩn | Chỉ Điều hành |
| `expired` | Quá 30 ngày chưa duyệt — tự tạm ẩn | Chỉ Điều hành |

**Trạng thái bán** (`products.status`): `ACTIVE` Đang bán · `DRAFT` Tạm ẩn/Bản nháp · `ARCHIVED` Ngừng kinh doanh.

**Phạm vi:** `branch_id` trống = toàn chuỗi; có giá trị = riêng chi nhánh.

**Nhóm hàng (danh mục):** danh sách cố định do Điều hành quản lý trong Cài đặt; nhân viên chỉ chọn.

## 5. Bảng quyền theo vai trò

| Thao tác | Điều hành | Điều phối | Quản lý SP | Sale | Marketing | CSKH |
|---|---|---|---|---|---|---|
| Xem sản phẩm | ● | ● | ● | ● | ● | ● |
| Tạo mẫu (không có `H3` → đề xuất) | ● trực tiếp | ● | ● | ● | — | — |
| Sửa đề xuất của chính mình | ● | ● | ● | ● | — | — |
| Gửi đề xuất sửa mẫu chính thức | sửa trực tiếp | ● | ● | ● | — | — |
| Duyệt / từ chối đề xuất (`H3`) | ● | — | — | — | — | — |
| Tạm ẩn / mở bán | ● | ● | ● | ● | — | — |
| Ngừng kinh doanh, xoá, khôi phục (`L4`) | ● | — | — | — | — | — |
| Nhập Excel, hoàn tác lô (`H3`) | ● | — | — | — | — | — |
| Khôi phục phiên bản cũ (`H3`) | ● | — | — | — | — | — |

Ghi chú: Sale có `L2`/`L3` mặc định từ 23/10/2026. Tạm ẩn/mở bán đi theo `L3` nên Sale cũng làm được;
muốn chặn Sale thì Điều hành tắt `L3` của Sale (Sale khi đó cũng không sửa được đề xuất của mình).
Máy chủ luôn kiểm lại; giao diện chỉ ẩn nút.

## 6. Vòng đời và quy trình duyệt

```
Tạo (không H3) ──► PENDING (đang bán được, hạn 30 ngày)
                    ├─ Điều hành duyệt ─► APPROVED (chính thức)
                    ├─ Điều hành từ chối (lý do) ─► REJECTED + tạm ẩn + báo người đề xuất
                    └─ quá 30 ngày ─► EXPIRED + tạm ẩn + báo người đề xuất
REJECTED / EXPIRED quá 30 ngày nữa ─► chuyển vào thùng rác (khôi phục được, chỉ Điều hành)
```

- Nhắc Điều hành vào ngày 7, 21 và 27 của mỗi đề xuất. Tác vụ quét chạy chung cron 5 phút sẵn có
  (`internal/chain-dispatch-sweep`), mỗi tiến trình tối đa một lần/giờ, idempotent
  (`src/modules/products/use-cases/sweep-product-proposals.ts`). Mẫu bị từ chối/hết hạn mà Điều hành đã
  mở bán lại thì không bị dọn.
- Điều hành thấy việc duyệt ở Hộp việc (`PRODUCT_PROPOSALS`) và thanh "Mẫu chờ duyệt" trên trang Sản phẩm.
- Thông báo đi qua ma trận thông báo nhân viên sẵn có: `PRODUCT_PROPOSED`, `PRODUCT_PROPOSAL_REMINDER`
  (Điều hành), `PRODUCT_PROPOSAL_REJECTED`, `PRODUCT_PROPOSAL_EXPIRED` (người đề xuất).

### Đề xuất sửa mẫu chính thức (giai đoạn 3)

- Người không có `H3` sửa mẫu chính thức → nút **Gửi đề xuất sửa**; bản gốc không đổi. Lưu ở bảng
  `product_change_requests` kèm `base_updated_at` của bản gốc.
- Điều hành xem bảng so sánh trước/sau theo trường, duyệt toàn bộ hoặc chỉ các trường chọn, hoặc từ chối.
- Bản gốc đã đổi sau thời điểm gửi → báo xung đột, không tự gộp.
- Đề xuất sửa cũng hết hạn sau 30 ngày.

## 7. Phiên bản và khôi phục (giai đoạn 3)

- Trước mỗi lần nội dung mẫu chính thức thay đổi (Điều hành sửa, duyệt đề xuất sửa, nhập Excel cập nhật,
  khôi phục) hệ thống lưu ảnh chụp vào `product_revisions`.
- Điều hành khôi phục được về một phiên bản cũ; lần khôi phục cũng tạo phiên bản mới.

## 8. Nhập Excel theo lô (giai đoạn 3)

- Chỉ Điều hành. Mỗi lần nhập là một lô (`product_import_batches`), mẫu tạo ra mang `import_batch_id`.
- Trùng mã mặc định bỏ qua; cập nhật mã đã có thì lưu phiên bản trước khi ghi.
- Hoàn tác lô trong 24 giờ: mẫu lô tạo ra vào thùng rác, mẫu bị cập nhật trả về phiên bản trước.

## 8b. Xuất danh sách và đổi trạng thái hàng loạt (giai đoạn 4)

- `GET /api/v1/products/export` — CSV (UTF-8 có BOM, mở thẳng bằng Excel) theo bộ lọc `status`/`category`/`search`.
  Quyền `R13` như mọi route xuất khác; ghi `data.export` (`entityType: products`). Cột giá chỉ có khi có `L5`
  (đi qua `listProducts`, cùng một chỗ cắt giá). Trần 5.000 dòng, vượt thì header `X-Export-Truncated: 1`.
  Ô bắt đầu bằng `= + - @` được thêm dấu `'` để chặn chèn công thức.
- `POST /api/v1/products/bulk-status` `{ ids (1..100), status }` — `L3`, chuyển `ARCHIVED` thêm `L4`. Mỗi dòng đi qua
  `updateProduct` (cùng luật mẫu chính thức, phiên bản). Trả `{ updated, failed[{id, reason}] }`; mã của cửa hàng khác
  báo "Không tìm thấy", không lộ tồn tại.
- Giao diện: nút "Xuất Excel" ở đầu `/san-pham` (khi có `R13`); dạng bảng có cột chọn và thanh thao tác
  "Mở bán / Chuyển về nháp / Ngừng bán" (khi có `L3`; "Ngừng bán" cần `L4`, có hộp xác nhận).

## 8c. Trường bán hàng, lọc toàn kho, đầu nối kênh bán (giai đoạn 5, PO 30/10/2026)

- Cột mới (migration `20261030140000_product_commerce_fields`, chỉ thêm cột): `products.barcode`, `cost_price_vnd`,
  `vat_percent` (0–100), `weight_grams`, `tags[]` (tối đa 20, bỏ trùng); `product_variants.sku` (duy nhất trong tổ chức), `barcode`.
  Đọc ra trong khối `commerce` của `GET /products(/:id)`. **Giá vốn** là dữ liệu giá: ghi cần `L5`, không có `L5`
  thì trả `null` và có trong `redacted_fields`. Phiên bản (`product_revisions`) lưu cả các cột này; phiên bản cũ
  không có thì khôi phục giữ nguyên giá trị hiện tại.
- Lọc Dịp/Khoảng giá/Sắp xếp chạy trên máy chủ: `GET /products?occasion=&price_range=&price_min=&price_max=&sort=` —
  quét theo lô tối đa 3.000 mẫu, áp cùng hàm lọc của giao diện, phân trang theo vị trí (`cursor` dạng `o:<n>`),
  trả `total` và `truncated`. Không có các tham số này → giữ đường danh sách cũ (con trỏ theo id).
- Đầu nối kênh bán: cổng `src/core/ports/sales-channel-catalog-provider.ts`, bộ chuyển `domain/channel-listing.ts`
  (thiếu giá/ảnh/chưa mở bán → không đẩy, trả lý do), adapter mặc định `NOT_CONFIGURED` (không gọi mạng).
  Thứ tự đề xuất: Facebook & Instagram Shop (Meta Commerce Catalog) → Google Merchant Center → TikTok Shop →
  Shopee Open Platform → Zalo OA. Mỗi kênh thật cần PO duyệt nhà cung cấp, credential theo tổ chức và bảng
  trạng thái đồng bộ (chưa tạo).
- Hiện trạng đã có, không trùng: `/ket-noi` (đăng bài mạng xã hội qua SocialFlow), `chat_channel_integrations`
  (kênh nhắn tin cho Hộp thư). Chưa có đồng bộ danh mục ra kênh bán trước giai đoạn này.

## 8d. Thư viện ảnh sản phẩm — đề xuất chờ PO chốt chặng

Chặng theo skill Creative Studio: **tạo sản phẩm danh mục = 01–02**. Đề xuất cho thư viện ảnh:

| Việc | Chặng | Ghi chú |
|---|---|---|
| Tải nhiều ảnh, kéo thả thứ tự, chọn ảnh chính | 01 | Không tốn credit AI |
| Phân tích AI (nhận diện, BOM) | 02 | **Chỉ ảnh chính**, ảnh phụ không phân tích lại — tránh tốn credit |
| Cắt ảnh theo tỉ lệ kênh (1:1, 4:5, 9:16), nền trắng | 06 (tuỳ chọn) | Chỉ khi người dùng bấm, qua Studio ảnh hiện có |
| 03–05, 07–14 | Không chạy | Thuộc chiến dịch tiếp thị |

Thứ tự ảnh chuẩn (đối chiếu hướng dẫn tin đăng của Shopee, TikTok Shop, Google Merchant): 1) ảnh chính nền sạch,
chính diện; 2) góc nghiêng; 3) cận cảnh chi tiết; 4) ảnh so kích thước (cầm tay/đặt cạnh vật quen); 5) bao bì/thiệp;
6) ảnh bối cảnh sử dụng. Khuyến nghị 3–9 ảnh, cạnh ngắn ≥ 800px, tỉ lệ 1:1 cho ảnh chính; mỗi ảnh có mô tả (alt)
và gắn được với biến thể. Dữ liệu: dùng `product_images` sẵn có (role `MAIN`/`GALLERY`, `position`); cần thêm
`alt_text` và `variant_id` — đổi schema, chờ PO.

## 9. Nhật ký

Mọi thao tác tạo, sửa, duyệt, từ chối, hết hạn, tạm ẩn, nhập lô, hoàn tác, khôi phục ghi `audit_logs`
(`action` dạng `product.*`).

## 10. Lộ trình

| Giai đoạn | Phạm vi | Schema |
|---|---|---|
| 1 (đã xong 23/10/2026) | Nhãn đề xuất trong `attributes.proposal`, chặn ghi đè, Excel chỉ Điều hành, thùng rác cần `L4`, Sale có `L2`/`L3`, thông báo `PRODUCT_PROPOSED`, nút Duyệt | Không |
| 2 (23/10/2026) | Từ chối kèm lý do, hàng chờ duyệt, hạn 30 ngày, nhắc 7/21/27, hết hạn, dọn vào thùng rác, việc trong Hộp việc | Không (dùng `attributes.proposal`) |
| 3 (23/10/2026) | `product_change_requests` (duyệt toàn bộ/một phần, xung đột 409), `product_revisions` + khôi phục, `product_import_batches` + hoàn tác 24 giờ | Có — migration `20261023024723_product_catalog_governance` |
| 4 (30/10/2026) | Xuất CSV, đổi trạng thái hàng loạt (mục 8b) | Không |
| 5 (30/10/2026) | Trường bán hàng chuẩn, lọc Dịp/Giá/Sắp xếp trên máy chủ, đầu nối kênh bán (mục 8c) | Có — migration `20261030140000_product_commerce_fields` |
| 6 (chờ PO chốt chặng) | Thư viện nhiều ảnh (mục 8d), adapter kênh bán thật, điểm hoàn thiện sản phẩm, nhật ký ảnh, giao diện nhập trường bán hàng | Có |
