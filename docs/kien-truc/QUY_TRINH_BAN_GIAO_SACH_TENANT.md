# Quy trình Kỹ thuật Bàn giao Sạch cho Tenant (Clean Handover SOP)

> **Tài liệu SSOT Level 5 — Vận hành Platform SaaS ALG**  
> **Áp dụng cho:** Đội ngũ Kỹ thuật, DevOps, Platform Lead, AI Coding Agents  
> **Mã quy trình:** `SOP-OPS-HANDOVER-01`  
> **Cập nhật:** 10/10/2026

---

## 1. Mục tiêu & Phạm vi (Context & Objectives)

Khi triển khai ALG cho một cửa hàng hoa mới (Tenant), giai đoạn kiểm thử dòng tiền thật (UAT), quét mã VietQR, in thiệp mẫu, hoặc test webhook ngân hàng thường tạo ra các dữ liệu giao dịch mẫu trực tiếp trên môi trường **Production (Render)**.

Trước thời điểm bàn giao chính thức (Go-Live) cho chủ cửa hàng:
- **Mục tiêu:** Đưa toàn bộ chỉ số giao dịch (đơn hàng, sổ thu, phiên thiệp, lịch sử QC, sự cố) về trạng thái `0` tinh khôi.
- **Yêu cầu sống còn (Zero-Risk & Zero-Downtime):**
  1. Tuyệt đối **không làm gián đoạn** hoạt động của các cửa hàng khác đang chạy trên hệ thống.
  2. Tuyệt đối **bảo toàn 100% Master Data** đã cài đặt công phu: Danh mục hoa, bảng giá, mẫu thiệp, tài khoản nhân viên, hồ sơ kinh doanh/thương hiệu.
  3. Hoàn nguyên trạng thái của các tài nguyên dùng thử (Voucher, Mã quà tặng).
  4. Có biên bản nghiệm thu kỹ thuật tự động đối soát đạt chuẩn `[PASS]`.

---

## 2. Ma trận Phân loại Dữ liệu (Data Segregation Matrix)

| Nhóm dữ liệu | Bảng CSDL (Prisma Models) | Hành vi bàn giao |
|---|---|---|
| **Master Data (Dữ liệu nền tảng)** | `organizations`, `business_profiles`, `brand_profiles`, `products`, `product_variants`, `product_images`, `greeting_catalogs`, `users`, `memberships`, `roles`, `branches`, `pricing_rules` | **BẢO TOÀN TUYỆT ĐỐI 100%** (Tự động Rollback nếu hao hụt dù chỉ 1 dòng) |
| **Transactional Data (Dữ liệu giao dịch test)** | `orders`, `order_items`, `order_assignments`, `order_events`, `order_coordinations`, `order_qc_records`, `order_exceptions`, `order_payments`, `order_info_requests`, `order_change_requests`, `greeting_sessions`, `greeting_journey_events`, `greeting_messages`, `greeting_message_reads`, `greeting_notifications`, `greeting_payment_events` | **XÓA SẠCH NGUYÊN TỬ** (Bọc trong 1 Transaction) |
| **Rollback State (Hoàn nguyên trạng thái)** | `vouchers` (reset `order_id = null`, `is_used = false`, `used_at = null`), `greeting_catalog_events` (gỡ liên kết `order_id`) | **HOÀN NGUYÊN VỀ MẶC ĐỊNH** |
| **Audit Trail (Nhật ký kiểm toán)** | `audit_logs` | **GHI BẢN GHI MỚI** (`action: "handover.clean_tenant"`) |

---

## 3. Kiến trúc 5 Chốt chặn An toàn (Fail-Safe Architecture)

Pipeline được hiện thực tại `scripts/handover-clean-tenant.ts` dựa trên 5 nguyên tắc:

1. **Zero-Downtime Row Locks:** Mọi câu lệnh `deleteMany` / `updateMany` đều có điều kiện `where: { organization_id: orgId }`. Do `organization_id` đã được đánh index ở tất cả các bảng (Luật cách ly Tenant của ALG), Postgres chỉ khóa các dòng của chính cửa hàng đó trong ~50ms, hoàn toàn không khóa bảng (Table Lock), không gây nghẽn webapp.
2. **ACID Atomic Transaction:** Tất cả các thao tác xóa và hoàn nguyên được bọc trong một `prisma.$transaction(..., { timeout: 30000 })`. Nếu có bất kỳ lỗi nào (đứt mạng, foreign key conflict, timeout), toàn bộ database rollback 100% trạng thái ban đầu.
3. **Master Data Integrity Guard:** Trước khi xóa, pipeline đo lường số lượng sản phẩm (`products`), biến thể (`product_variants`), mẫu thiệp (`greeting_catalogs`) và tài khoản (`memberships`). Sau khi xóa trong transaction, nếu bất kỳ số lượng nào bị giảm, pipeline lập tức ném Exception để hủy và rollback giao dịch.
4. **Dry-Run & Confirmation Gate:** Script từ chối xóa dữ liệu nếu thiếu cờ `--confirm` hoặc `--force`. Chế độ `--dry-run` cho phép quét trước toàn bộ số liệu sẽ bị xóa mà không đụng chạm vào CSDL.
5. **Auto-Verification & Sign-off:** Sau khi commit transaction, pipeline tự động chạy các truy vấn kiểm định độc lập và in ra bảng tổng kết nghiệm thu bàn giao.

---

## 4. Hướng dẫn Vận hành Dòng lệnh (Runbook)

### 4.1. Cấu hình môi trường Production từ máy Local

Tạo tệp `.env.production` tại thư mục gốc (đã được cấu hình trong `.gitignore`, không bao giờ bị push lên git):
```env
DATABASE_URL="postgresql://user:pass@dpg-xxx-a.singapore-postgres.render.com/floraos?sslmode=require"
```
> *Lưu ý:* Luôn có tham số `?sslmode=require` ở cuối chuỗi URL khi kết nối từ xa vào Render Postgres.

### 4.2. Các lệnh thực thi chuẩn hóa

| Mục đích | Lệnh thực thi | Ghi chú |
|---|---|---|
| **Quét thử trên Render Prod (Dry-Run)** | `npm run handover:clean:prod:dry` | Rủi ro 0%, chỉ quét và in báo cáo |
| **Thực thi dọn sạch Siin Store (Prod)** | `npm run handover:clean:prod -- --confirm` | Xóa sạch giao dịch, bảo toàn master data |
| **Thực thi cho shop bất kỳ (Prod)** | `npm run handover:clean:prod -- --slug=<slug> --confirm` | Truyền slug tương ứng của shop |
| **Quét thử trên Local (Development)** | `npm run handover:clean:dry` | Dùng CSDL localhost |
| **Kèm dọn khách hàng test** | Thêm cờ `--clean-customers` | Xóa khách hàng vãng lai tạo lúc test |
| **Khôi phục thảm họa (Disaster Recovery)** | `npm run handover:restore:prod -- --file=backups/<file> --confirm` | Nạp lại 100% dữ liệu từ snapshot |

---

## 5. Cơ chế Dự phòng & Khôi phục Thảm họa (Disaster Recovery)

Để triệt tiêu hoàn toàn rủi ro **"ai đó chạy nhầm lệnh làm mất dữ liệu đơn hàng thật của khách"**, hệ thống trang bị 3 tầng bảo vệ dự phòng:

1. **Tự động Snapshot Dump trước khi xóa (Auto-Backup):**
   - Trước khi bất kỳ câu lệnh DELETE nào được thực thi, pipeline tự động dump toàn bộ các bảng giao dịch ra tệp JSON: `backups/snapshot-<slug>-<timestamp>.json` (được git-ignore bảo mật tuyệt đối).
   - Nếu phát hiện xóa nhầm, chỉ cần chạy đúng 1 lệnh để khôi phục trong 15 giây:
     ```bash
     npm run handover:restore:prod -- --file=backups/snapshot-siin-store-xxxx.json --confirm
     ```
2. **Khóa chống xóa nhầm cửa hàng đang kinh doanh thật (High-Volume Lock):**
   - Nếu một cửa hàng có **trên 50 đơn hàng** (dấu hiệu shop đang vận hành thật), script sẽ **LẬP TỨC TỪ CHỐI XÓA** dù có cờ `--confirm`.
   - Để thực thi bắt buộc phải gõ chuỗi override danh tính: `--danger-override=<slug-cua-shop>`.
3. **Quản trị quyền truy cập chuỗi kết nối (Credential Hygiene):**
   - Sau khi hoàn tất bàn giao, xóa hoặc đổi tên tệp `.env.production` khỏi máy. Không ai có thể vô tình tác động vào CSDL Render nếu không có `DATABASE_URL` Production.

---

## 6. Mẫu Biên bản Nghiệm thu Kỹ thuật (Sign-Off Template)

Khi quy trình chạy thành công, terminal sẽ xuất ra biên bản chuẩn sau:

```text
================================================================================
📋 [BIÊN BẢN NGHIỆM THU KỸ THUẬT BÀN GIAO (HANDOVER SIGN-OFF)]
================================================================================
 • Đơn hàng còn lại:            ✅ 0 [PASS]
 • Chi tiết đơn còn lại:        ✅ 0 [PASS]
 • Sổ thu thanh toán:           ✅ 0 [PASS]
 • Phiên tiếp đón Thẻ Chào:     ✅ 0 [PASS]
 • Hồ sơ kiểm định QC:          ✅ 0 [PASS]
 • Voucher bị khóa:             ✅ 0 [PASS]
 • Danh mục hoa bảo toàn:       ✅ 1479 mẫu [PASS]
 • Tài khoản nhân sự bảo toàn:  ✅ 5 người [PASS]
--------------------------------------------------------------------------------
🎉 TRẠNG THÁI: BÀN GIAO HOÀN HẢO (100% CLEAN - READY FOR HANDOVER)
================================================================================
```

---

## 7. Xử lý Sự cố thường gặp (Troubleshooting)

1. **Lỗi `User was denied access on the database` (P1010):**
   - *Nguyên nhân:* Render Postgres từ chối kết nối bên ngoài nếu thiếu SSL.
   - *Khắc phục:* Thêm `?sslmode=require` vào cuối biến `DATABASE_URL` trong `.env.production`.
2. **Lỗi `Cấu hình thiếu hoặc sai: SESSION_SECRET...`:**
   - *Nguyên nhân:* Script chỉ nạp `.env.production` mà thiếu các biến hệ thống trong `.env`.
   - *Khắc phục:* Lệnh trong `package.json` đã được cấu hình nạp cả hai: `tsx --env-file-if-exists=.env --env-file-if-exists=.env.production`.
3. **Lỗi `BẢO VỆ DỮ LIỆU: Phát hiện Master Data bị hao hụt!`:**
   - *Nguyên nhân:* Có liên kết cascade bất thường làm mất sản phẩm hoặc tài khoản.
   - *Khắc phục:* Giao dịch đã tự động rollback 100%, kiểm tra lại quan hệ ngoại trong `schema.prisma`.
