# Hệ thống Ưu đãi · Mã giảm giá · Bảng giá — nghiên cứu, hiện trạng và lộ trình

> Level 3 SUPPORTING · `DRAFT` chờ PO duyệt · 30/10/2026 · phạm vi: Bước 3 "Quảng bá sản phẩm" (công cụ #61, #65, #66).
> Kiến trúc gốc: `.agents/standards/alg/01-tier-governance.md` (ma trận 4 tầng). API: đặc tả 06 · lược đồ: đặc tả 07.

## 1. Nguyên tắc: một hệ thống, hai nơi hiển thị

Ưu đãi chỉ có **một nguồn dữ liệu** và **một công tắc** cho mỗi ưu đãi:

| Lớp | Lưu ở | Vai trò |
|---|---|---|
| Danh mục ưu đãi của tiệm | `organizations.settings.store_policies.promotions` | Ưu đãi gồm những gì (Giảm %, Miễn phí giao, Tặng kèm), công tắc `active` |
| Ma trận quản trị `PROMOTIONS` | `settings.governance_matrix.PROMOTIONS` + `platform_settings` | Bật/tắt theo tầng; tầng trên (Mẹ → Chuỗi) khoá thì tầng dưới không mở được; khoá cứng trần 50% |
| Áp vào bán hàng | `resolveAppliedPolicies()` · `listActiveShopPromotions()` · `shopPromotionPolicy()` | Trang khách, báo giá, đặt đơn, poster, **bảng giá**, **mã giảm giá** đều đọc cùng một kết quả |

Hai nơi hiển thị cùng dùng `TierGovernanceMatrixClient` và API `/organizations/current/governance-matrix`:
- **Cài đặt → Ưu đãi** (`/cai-dat/ma-tran-uudai`).
- **Bước 3 → Ưu đãi và giảm giá** (`/uu-dai`, công cụ #61).

Bật/tắt ở nơi nào thì nơi kia cũng hiện như vậy, vì không có bản sao dữ liệu.

**Mã giảm giá và bảng giá đi theo công tắc này, không có công tắc riêng cho ưu đãi:**
- Một đợt mã gắn với một ưu đãi. Khi ưu đãi bị tắt (ở tiệm hoặc bị chuỗi khoá), mọi mã của đợt trả "Chương trình ưu đãi của mã này đã kết thúc".
- Bảng giá chỉ in các ưu đãi đang bật.

## 2. Đã xây trong đợt này

| Công cụ | Đường dẫn | Nội dung |
|---|---|---|
| #61 Ưu đãi và giảm giá | `/uu-dai` | Ma trận ưu đãi dùng chung + điều hướng sang mã giảm giá và bảng giá |
| #65 Bảng giá sản phẩm | `/bang-gia`, `/bang-gia/:id` | Nhiều bảng giá; lọc theo loại; giá lấy trực tiếp từ sản phẩm (không lưu giá thứ hai); giá cao điểm; thời hạn; công tắc Đang dùng; in kèm ưu đãi đang bật; in hoặc lưu PDF; mỗi lần sửa là một phiên bản trong `pricing_rules` |
| #66 Phát hành mã giảm giá | `/uu-dai/ma-giam-gia` | Mã chung hoặc tối đa 1000 mã riêng (sinh bằng `crypto`, bỏ ký tự dễ đọc nhầm); giảm % hoặc số tiền; trần % theo khoá nền tảng; đơn tối thiểu; giảm tối đa; ngày bắt đầu/hết hạn; tổng lượt; lượt mỗi khách; tạm dừng cả đợt; tải CSV (có ghi nhật ký xuất dữ liệu) |

**Tính đúng của lượt dùng:**
- Trừ lượt bằng một câu `UPDATE … WHERE used_count < usage_limit` nằm trong giao dịch đặt đơn, nên khi nhiều đơn tranh lượt cuối cùng lúc thì chỉ một đơn được.
- Giới hạn lượt mỗi khách dùng khoá tư vấn theo cặp (mã, khách).
- Khi huỷ hoặc từ chối đơn, lượt được trả lại dựa trên `voucher_redemptions`.
- Mã cũ vẫn chạy như trước: migration điền `used_count`, và giữ nguyên ý nghĩa của `is_used`.

**Phân quyền:**
- Mã giảm giá: `Q8`.
- Bảng giá: xem `L1`, sửa `L3`.
- Tổ chức khác truy cập → 404.

## 3. Chuẩn tham chiếu từ các SaaS thương mại

| Nguồn | Chuẩn rút ra |
|---|---|
| Shopify Discounts | 3 lớp giảm (sản phẩm · đơn · phí giao); quy tắc cộng dồn theo lớp; thứ tự tính: sản phẩm → đơn → phí giao; cùng một món không cộng hai giảm giá sản phẩm |
| Voucherify | Điều kiện theo nhóm (đối tượng khách, sản phẩm, giá/số lượng, ngân sách, lượt dùng); ghi lại mọi lần áp mã kể cả thất bại kèm lý do; mã gán cho từng khách (ví khách hàng); quy tắc cộng dồn ALL/PARTIAL |
| Sapo (VN) | Quản lý khuyến mãi, voucher và khách thân thiết trên một hệ thống; nhiều loại chương trình (theo hoá đơn, mua X tặng Y, khung giờ, combo); báo cáo doanh thu và tỷ lệ dùng theo từng chương trình; nhắm theo nhóm khách |
| KiotViet | Chưa kiểm chứng được tính năng qua nguồn công khai trong đợt này — không dùng làm căn cứ |

## 4. Khoảng cách và lộ trình nâng cấp

| Mức | Hạng mục | Ghi chú |
|---|---|---|
| P1 thương mại | Báo cáo hiệu quả từng đợt mã/ưu đãi: số đơn, doanh thu, tiền đã giảm | Dữ liệu đã có (`voucher_redemptions` + `orders`); chỉ cần thêm màn báo cáo |
| P1 | Quy tắc cộng dồn ưu đãi + mã: chọn "cộng với ưu đãi" hoặc "chỉ một" | Hiện báo giá áp cả ưu đãi khách chọn lẫn mã. Cần PO chốt mặc định |
| P1 | Nhật ký lần áp mã thất bại (lý do) để chống dò mã | Kèm giới hạn tần suất khi nhập mã trên trang khách |
| P2 production | Mã gán cho khách hoặc nhóm khách (CRM), gửi qua kênh thông báo | Tận dụng `customer_id` sẵn có + module notification |
| P2 | Ngân sách đợt (tổng tiền giảm tối đa) | Thêm cột vào `voucher_batches` — cần duyệt schema |
| P2 | Bảng giá có link chia sẻ công khai và theo chi nhánh | Route công khai mới phải khai báo trong `route-capability-guard` |
| P3 enterprise | Chuỗi phát hành mã dùng chung cho mọi chi nhánh, đối soát lượt dùng theo chi nhánh | Đi qua ma trận tầng `CHAIN`; cần quyết định nơi lưu (mã ở tổ chức chuỗi) |
| P3 | Điều kiện theo sản phẩm/loại, khung giờ, mua X tặng Y | Mở rộng `PromotionKind` + `promotionPricingOf` |
| P3 | Hoàn tác/khôi phục phiên bản bảng giá | Lịch sử đã có trong `pricing_rules` |

## 5. Cần PO quyết

1. Ưu đãi khách chọn và mã giảm giá có được cộng dồn trên cùng một đơn không (hiện tại: có).
2. Có đưa #61 sang `DONE` sau đợt rà UX (hiện vẫn để `IN_PROGRESS` như các trang có sẵn chưa đánh giá).
3. Thứ tự ưu tiên giữa các mục P1 ở mục 4.

## 6. Giới hạn đã biết

- Bảng giá dựng tối đa 500 sản phẩm đang bán và đọc ở phạm vi tổ chức (chưa lọc theo chi nhánh).
- Mỗi đợt hiện tối đa 1000 mã; danh sách mã trên màn hình cũng hiện tối đa 1000.
- Mã giảm giá hiện chỉ áp ở luồng Thẻ chào/Catalog (đúng phạm vi cũ của `vouchers`). Đơn tạo tay ở Điều phối chưa nhập được mã.
