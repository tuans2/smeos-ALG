-- Audit BL-36 (PO duyệt 12/11/2026): đơn tạo ở Điều phối (mã `FLR-…`) trước bản sửa ghi đơn giá dòng hàng 0 ₫ dù
-- `orders.total_vnd` đúng → phiếu in, xuất đơn, báo cáo sản phẩm tính 0 ₫. Đơn mới đã ghi đơn giá thật.
-- Chữa dữ liệu cũ: chỉ đơn có ĐÚNG MỘT dòng hàng và dòng đó 0 ₫ → đơn giá = (tổng đơn − VAT) / số lượng. Đơn nhiều
-- dòng không đoán được phân bổ nên giữ nguyên. Chạy lại an toàn (dòng đã có giá không khớp điều kiện); báo số dòng đã sửa.
-- Chỉ đổi dữ liệu, không đổi cấu trúc; khoá dòng của các dòng hàng bị sửa, không khoá bảng.
SET LOCAL lock_timeout = '5s';

DO $$
DECLARE
  fixed integer;
BEGIN
  UPDATE "order_items" i
  SET "unit_price_vnd" = ROUND((o."total_vnd" - o."vat_amount_vnd") / i."quantity", 2),
      "updated_at" = CURRENT_TIMESTAMP
  FROM "orders" o
  WHERE i."order_id" = o."id"
    AND i."organization_id" = o."organization_id"
    AND o."code" LIKE 'FLR-%'
    AND i."unit_price_vnd" = 0
    AND i."quantity" >= 1
    AND o."total_vnd" - o."vat_amount_vnd" > 0
    AND (SELECT count(*) FROM "order_items" x WHERE x."order_id" = o."id") = 1;
  GET DIAGNOSTICS fixed = ROW_COUNT;
  RAISE NOTICE 'BL-36: đã sửa đơn giá % dòng hàng đơn Điều phối cũ', fixed;
END $$;
