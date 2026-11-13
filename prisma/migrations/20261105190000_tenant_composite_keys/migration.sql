-- Hoàn thiện CSDL đợt 2 (rà soát 05/11/2026): khoá ghép tenant cho 25 cặp cha–con chính.
-- order_items giữ khoá thường: luồng Thẻ chào (đang đóng băng, PO 31/10/2026) tạo dòng đơn
-- lồng kèm organization_id, cú pháp mà khoá ghép không cho.
-- Dòng con (dòng đơn, thanh toán, QC, biến thể sản phẩm, …) trỏ về (cha_id, organization_id),
-- nên Postgres từ chối dòng con khác tổ chức với cha — lớp chặn thứ hai sau scopedWhere.
-- Chọn khoá ghép thay cho RLS: RLS cần đặt biến phiên tenant ở mọi kết nối (pool, worker),
-- là thay đổi tầng ứng dụng riêng. Khoá thêm NOT VALID rồi tự VALIDATE khi dữ liệu cũ sạch;
-- còn dòng lệch tổ chức thì để NOT VALID + NOTICE (dữ liệu mới vẫn bị chặn).
-- Cả tệp chạy trong một giao dịch: lỗi ở bất kỳ bước nào thì không bước nào được giữ.
BEGIN;

CREATE UNIQUE INDEX "customers_id_organization_id_key" ON "customers"("id", "organization_id");
CREATE UNIQUE INDEX "greeting_sessions_id_organization_id_key" ON "greeting_sessions"("id", "organization_id");
CREATE UNIQUE INDEX "order_coordinations_order_id_organization_id_key" ON "order_coordinations"("order_id", "organization_id");
CREATE UNIQUE INDEX "orders_id_organization_id_key" ON "orders"("id", "organization_id");
CREATE UNIQUE INDEX "products_id_organization_id_key" ON "products"("id", "organization_id");
CREATE UNIQUE INDEX "quotations_id_organization_id_key" ON "quotations"("id", "organization_id");

ALTER TABLE "customer_consents" DROP CONSTRAINT "customer_consents_customer_id_fkey";
ALTER TABLE "customer_interactions" DROP CONSTRAINT "customer_interactions_customer_id_fkey";
ALTER TABLE "customer_occasions" DROP CONSTRAINT "customer_occasions_customer_id_fkey";
ALTER TABLE "greeting_catalog_products" DROP CONSTRAINT "greeting_catalog_products_product_id_fkey";
ALTER TABLE "greeting_journey_events" DROP CONSTRAINT "greeting_journey_events_session_id_fkey";
ALTER TABLE "order_approval_requests" DROP CONSTRAINT "order_approval_requests_order_id_fkey";
ALTER TABLE "order_assignments" DROP CONSTRAINT "order_assignments_order_id_fkey";
ALTER TABLE "order_change_requests" DROP CONSTRAINT "order_change_requests_order_id_fkey";
ALTER TABLE "order_coordinations" DROP CONSTRAINT "order_coordinations_order_id_fkey";
ALTER TABLE "order_events" DROP CONSTRAINT "order_events_order_id_fkey";
ALTER TABLE "order_exceptions" DROP CONSTRAINT "order_exceptions_order_id_fkey";
ALTER TABLE "order_info_requests" DROP CONSTRAINT "order_info_requests_order_id_fkey";
ALTER TABLE "order_payments" DROP CONSTRAINT "order_payments_order_id_fkey";
ALTER TABLE "order_qc_records" DROP CONSTRAINT "order_qc_records_order_id_fkey";
ALTER TABLE "product_change_requests" DROP CONSTRAINT "product_change_requests_product_id_fkey";
ALTER TABLE "product_images" DROP CONSTRAINT "product_images_product_id_fkey";
ALTER TABLE "product_inventory" DROP CONSTRAINT "product_inventory_product_id_fkey";
ALTER TABLE "product_recipes" DROP CONSTRAINT "product_recipes_product_id_fkey";
ALTER TABLE "product_revisions" DROP CONSTRAINT "product_revisions_product_id_fkey";
ALTER TABLE "product_variants" DROP CONSTRAINT "product_variants_product_id_fkey";
ALTER TABLE "quotation_items" DROP CONSTRAINT "quotation_items_quotation_id_fkey";
ALTER TABLE "quotation_revisions" DROP CONSTRAINT "quotation_revisions_quotation_id_fkey";

ALTER TABLE "product_change_requests" ADD CONSTRAINT "product_change_requests_product_id_organization_id_fkey" FOREIGN KEY ("product_id", "organization_id") REFERENCES "products"("id", "organization_id") ON DELETE CASCADE ON UPDATE CASCADE NOT VALID;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM "product_change_requests" c WHERE c."product_id" IS NOT NULL AND NOT EXISTS (
       SELECT 1 FROM "products" p WHERE p."id" = c."product_id" AND p."organization_id" = c."organization_id")) THEN
    RAISE NOTICE 'Còn dòng lệch tổ chức ở product_change_requests.product_id — khoá product_change_requests_product_id_organization_id_fkey để NOT VALID';
  ELSE
    ALTER TABLE "product_change_requests" VALIDATE CONSTRAINT "product_change_requests_product_id_organization_id_fkey";
  END IF;
END $$;

ALTER TABLE "product_revisions" ADD CONSTRAINT "product_revisions_product_id_organization_id_fkey" FOREIGN KEY ("product_id", "organization_id") REFERENCES "products"("id", "organization_id") ON DELETE CASCADE ON UPDATE CASCADE NOT VALID;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM "product_revisions" c WHERE c."product_id" IS NOT NULL AND NOT EXISTS (
       SELECT 1 FROM "products" p WHERE p."id" = c."product_id" AND p."organization_id" = c."organization_id")) THEN
    RAISE NOTICE 'Còn dòng lệch tổ chức ở product_revisions.product_id — khoá product_revisions_product_id_organization_id_fkey để NOT VALID';
  ELSE
    ALTER TABLE "product_revisions" VALIDATE CONSTRAINT "product_revisions_product_id_organization_id_fkey";
  END IF;
END $$;

ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_product_id_organization_id_fkey" FOREIGN KEY ("product_id", "organization_id") REFERENCES "products"("id", "organization_id") ON DELETE RESTRICT ON UPDATE CASCADE NOT VALID;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM "product_variants" c WHERE c."product_id" IS NOT NULL AND NOT EXISTS (
       SELECT 1 FROM "products" p WHERE p."id" = c."product_id" AND p."organization_id" = c."organization_id")) THEN
    RAISE NOTICE 'Còn dòng lệch tổ chức ở product_variants.product_id — khoá product_variants_product_id_organization_id_fkey để NOT VALID';
  ELSE
    ALTER TABLE "product_variants" VALIDATE CONSTRAINT "product_variants_product_id_organization_id_fkey";
  END IF;
END $$;

ALTER TABLE "product_images" ADD CONSTRAINT "product_images_product_id_organization_id_fkey" FOREIGN KEY ("product_id", "organization_id") REFERENCES "products"("id", "organization_id") ON DELETE RESTRICT ON UPDATE CASCADE NOT VALID;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM "product_images" c WHERE c."product_id" IS NOT NULL AND NOT EXISTS (
       SELECT 1 FROM "products" p WHERE p."id" = c."product_id" AND p."organization_id" = c."organization_id")) THEN
    RAISE NOTICE 'Còn dòng lệch tổ chức ở product_images.product_id — khoá product_images_product_id_organization_id_fkey để NOT VALID';
  ELSE
    ALTER TABLE "product_images" VALIDATE CONSTRAINT "product_images_product_id_organization_id_fkey";
  END IF;
END $$;

ALTER TABLE "product_inventory" ADD CONSTRAINT "product_inventory_product_id_organization_id_fkey" FOREIGN KEY ("product_id", "organization_id") REFERENCES "products"("id", "organization_id") ON DELETE RESTRICT ON UPDATE CASCADE NOT VALID;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM "product_inventory" c WHERE c."product_id" IS NOT NULL AND NOT EXISTS (
       SELECT 1 FROM "products" p WHERE p."id" = c."product_id" AND p."organization_id" = c."organization_id")) THEN
    RAISE NOTICE 'Còn dòng lệch tổ chức ở product_inventory.product_id — khoá product_inventory_product_id_organization_id_fkey để NOT VALID';
  ELSE
    ALTER TABLE "product_inventory" VALIDATE CONSTRAINT "product_inventory_product_id_organization_id_fkey";
  END IF;
END $$;

ALTER TABLE "order_assignments" ADD CONSTRAINT "order_assignments_order_id_organization_id_fkey" FOREIGN KEY ("order_id", "organization_id") REFERENCES "orders"("id", "organization_id") ON DELETE CASCADE ON UPDATE CASCADE NOT VALID;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM "order_assignments" c WHERE c."order_id" IS NOT NULL AND NOT EXISTS (
       SELECT 1 FROM "orders" p WHERE p."id" = c."order_id" AND p."organization_id" = c."organization_id")) THEN
    RAISE NOTICE 'Còn dòng lệch tổ chức ở order_assignments.order_id — khoá order_assignments_order_id_organization_id_fkey để NOT VALID';
  ELSE
    ALTER TABLE "order_assignments" VALIDATE CONSTRAINT "order_assignments_order_id_organization_id_fkey";
  END IF;
END $$;

ALTER TABLE "order_events" ADD CONSTRAINT "order_events_order_id_organization_id_fkey" FOREIGN KEY ("order_id", "organization_id") REFERENCES "orders"("id", "organization_id") ON DELETE CASCADE ON UPDATE CASCADE NOT VALID;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM "order_events" c WHERE c."order_id" IS NOT NULL AND NOT EXISTS (
       SELECT 1 FROM "orders" p WHERE p."id" = c."order_id" AND p."organization_id" = c."organization_id")) THEN
    RAISE NOTICE 'Còn dòng lệch tổ chức ở order_events.order_id — khoá order_events_order_id_organization_id_fkey để NOT VALID';
  ELSE
    ALTER TABLE "order_events" VALIDATE CONSTRAINT "order_events_order_id_organization_id_fkey";
  END IF;
END $$;

ALTER TABLE "customer_occasions" ADD CONSTRAINT "customer_occasions_customer_id_organization_id_fkey" FOREIGN KEY ("customer_id", "organization_id") REFERENCES "customers"("id", "organization_id") ON DELETE CASCADE ON UPDATE CASCADE NOT VALID;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM "customer_occasions" c WHERE c."customer_id" IS NOT NULL AND NOT EXISTS (
       SELECT 1 FROM "customers" p WHERE p."id" = c."customer_id" AND p."organization_id" = c."organization_id")) THEN
    RAISE NOTICE 'Còn dòng lệch tổ chức ở customer_occasions.customer_id — khoá customer_occasions_customer_id_organization_id_fkey để NOT VALID';
  ELSE
    ALTER TABLE "customer_occasions" VALIDATE CONSTRAINT "customer_occasions_customer_id_organization_id_fkey";
  END IF;
END $$;

ALTER TABLE "customer_consents" ADD CONSTRAINT "customer_consents_customer_id_organization_id_fkey" FOREIGN KEY ("customer_id", "organization_id") REFERENCES "customers"("id", "organization_id") ON DELETE CASCADE ON UPDATE CASCADE NOT VALID;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM "customer_consents" c WHERE c."customer_id" IS NOT NULL AND NOT EXISTS (
       SELECT 1 FROM "customers" p WHERE p."id" = c."customer_id" AND p."organization_id" = c."organization_id")) THEN
    RAISE NOTICE 'Còn dòng lệch tổ chức ở customer_consents.customer_id — khoá customer_consents_customer_id_organization_id_fkey để NOT VALID';
  ELSE
    ALTER TABLE "customer_consents" VALIDATE CONSTRAINT "customer_consents_customer_id_organization_id_fkey";
  END IF;
END $$;

ALTER TABLE "voucher_redemptions" ADD CONSTRAINT "voucher_redemptions_order_id_organization_id_fkey" FOREIGN KEY ("order_id", "organization_id") REFERENCES "orders"("id", "organization_id") ON DELETE CASCADE ON UPDATE CASCADE NOT VALID;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM "voucher_redemptions" c WHERE c."order_id" IS NOT NULL AND NOT EXISTS (
       SELECT 1 FROM "orders" p WHERE p."id" = c."order_id" AND p."organization_id" = c."organization_id")) THEN
    RAISE NOTICE 'Còn dòng lệch tổ chức ở voucher_redemptions.order_id — khoá voucher_redemptions_order_id_organization_id_fkey để NOT VALID';
  ELSE
    ALTER TABLE "voucher_redemptions" VALIDATE CONSTRAINT "voucher_redemptions_order_id_organization_id_fkey";
  END IF;
END $$;

ALTER TABLE "order_coordinations" ADD CONSTRAINT "order_coordinations_order_id_organization_id_fkey" FOREIGN KEY ("order_id", "organization_id") REFERENCES "orders"("id", "organization_id") ON DELETE CASCADE ON UPDATE CASCADE NOT VALID;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM "order_coordinations" c WHERE c."order_id" IS NOT NULL AND NOT EXISTS (
       SELECT 1 FROM "orders" p WHERE p."id" = c."order_id" AND p."organization_id" = c."organization_id")) THEN
    RAISE NOTICE 'Còn dòng lệch tổ chức ở order_coordinations.order_id — khoá order_coordinations_order_id_organization_id_fkey để NOT VALID';
  ELSE
    ALTER TABLE "order_coordinations" VALIDATE CONSTRAINT "order_coordinations_order_id_organization_id_fkey";
  END IF;
END $$;

ALTER TABLE "order_payments" ADD CONSTRAINT "order_payments_order_id_organization_id_fkey" FOREIGN KEY ("order_id", "organization_id") REFERENCES "orders"("id", "organization_id") ON DELETE CASCADE ON UPDATE CASCADE NOT VALID;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM "order_payments" c WHERE c."order_id" IS NOT NULL AND NOT EXISTS (
       SELECT 1 FROM "orders" p WHERE p."id" = c."order_id" AND p."organization_id" = c."organization_id")) THEN
    RAISE NOTICE 'Còn dòng lệch tổ chức ở order_payments.order_id — khoá order_payments_order_id_organization_id_fkey để NOT VALID';
  ELSE
    ALTER TABLE "order_payments" VALIDATE CONSTRAINT "order_payments_order_id_organization_id_fkey";
  END IF;
END $$;

ALTER TABLE "order_info_requests" ADD CONSTRAINT "order_info_requests_order_id_organization_id_fkey" FOREIGN KEY ("order_id", "organization_id") REFERENCES "orders"("id", "organization_id") ON DELETE CASCADE ON UPDATE CASCADE NOT VALID;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM "order_info_requests" c WHERE c."order_id" IS NOT NULL AND NOT EXISTS (
       SELECT 1 FROM "orders" p WHERE p."id" = c."order_id" AND p."organization_id" = c."organization_id")) THEN
    RAISE NOTICE 'Còn dòng lệch tổ chức ở order_info_requests.order_id — khoá order_info_requests_order_id_organization_id_fkey để NOT VALID';
  ELSE
    ALTER TABLE "order_info_requests" VALIDATE CONSTRAINT "order_info_requests_order_id_organization_id_fkey";
  END IF;
END $$;

ALTER TABLE "order_change_requests" ADD CONSTRAINT "order_change_requests_order_id_organization_id_fkey" FOREIGN KEY ("order_id", "organization_id") REFERENCES "orders"("id", "organization_id") ON DELETE CASCADE ON UPDATE CASCADE NOT VALID;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM "order_change_requests" c WHERE c."order_id" IS NOT NULL AND NOT EXISTS (
       SELECT 1 FROM "orders" p WHERE p."id" = c."order_id" AND p."organization_id" = c."organization_id")) THEN
    RAISE NOTICE 'Còn dòng lệch tổ chức ở order_change_requests.order_id — khoá order_change_requests_order_id_organization_id_fkey để NOT VALID';
  ELSE
    ALTER TABLE "order_change_requests" VALIDATE CONSTRAINT "order_change_requests_order_id_organization_id_fkey";
  END IF;
END $$;

ALTER TABLE "order_qc_records" ADD CONSTRAINT "order_qc_records_order_id_organization_id_fkey" FOREIGN KEY ("order_id", "organization_id") REFERENCES "orders"("id", "organization_id") ON DELETE CASCADE ON UPDATE CASCADE NOT VALID;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM "order_qc_records" c WHERE c."order_id" IS NOT NULL AND NOT EXISTS (
       SELECT 1 FROM "orders" p WHERE p."id" = c."order_id" AND p."organization_id" = c."organization_id")) THEN
    RAISE NOTICE 'Còn dòng lệch tổ chức ở order_qc_records.order_id — khoá order_qc_records_order_id_organization_id_fkey để NOT VALID';
  ELSE
    ALTER TABLE "order_qc_records" VALIDATE CONSTRAINT "order_qc_records_order_id_organization_id_fkey";
  END IF;
END $$;

ALTER TABLE "order_exceptions" ADD CONSTRAINT "order_exceptions_order_id_organization_id_fkey" FOREIGN KEY ("order_id", "organization_id") REFERENCES "orders"("id", "organization_id") ON DELETE CASCADE ON UPDATE CASCADE NOT VALID;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM "order_exceptions" c WHERE c."order_id" IS NOT NULL AND NOT EXISTS (
       SELECT 1 FROM "orders" p WHERE p."id" = c."order_id" AND p."organization_id" = c."organization_id")) THEN
    RAISE NOTICE 'Còn dòng lệch tổ chức ở order_exceptions.order_id — khoá order_exceptions_order_id_organization_id_fkey để NOT VALID';
  ELSE
    ALTER TABLE "order_exceptions" VALIDATE CONSTRAINT "order_exceptions_order_id_organization_id_fkey";
  END IF;
END $$;

ALTER TABLE "greeting_catalog_products" ADD CONSTRAINT "greeting_catalog_products_product_id_organization_id_fkey" FOREIGN KEY ("product_id", "organization_id") REFERENCES "products"("id", "organization_id") ON DELETE CASCADE ON UPDATE CASCADE NOT VALID;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM "greeting_catalog_products" c WHERE c."product_id" IS NOT NULL AND NOT EXISTS (
       SELECT 1 FROM "products" p WHERE p."id" = c."product_id" AND p."organization_id" = c."organization_id")) THEN
    RAISE NOTICE 'Còn dòng lệch tổ chức ở greeting_catalog_products.product_id — khoá greeting_catalog_products_product_id_organization_id_fkey để NOT VALID';
  ELSE
    ALTER TABLE "greeting_catalog_products" VALIDATE CONSTRAINT "greeting_catalog_products_product_id_organization_id_fkey";
  END IF;
END $$;

ALTER TABLE "greeting_notifications" ADD CONSTRAINT "greeting_notifications_order_id_organization_id_fkey" FOREIGN KEY ("order_id", "organization_id") REFERENCES "orders"("id", "organization_id") ON DELETE CASCADE ON UPDATE CASCADE NOT VALID;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM "greeting_notifications" c WHERE c."order_id" IS NOT NULL AND NOT EXISTS (
       SELECT 1 FROM "orders" p WHERE p."id" = c."order_id" AND p."organization_id" = c."organization_id")) THEN
    RAISE NOTICE 'Còn dòng lệch tổ chức ở greeting_notifications.order_id — khoá greeting_notifications_order_id_organization_id_fkey để NOT VALID';
  ELSE
    ALTER TABLE "greeting_notifications" VALIDATE CONSTRAINT "greeting_notifications_order_id_organization_id_fkey";
  END IF;
END $$;

ALTER TABLE "greeting_journey_events" ADD CONSTRAINT "greeting_journey_events_session_id_organization_id_fkey" FOREIGN KEY ("session_id", "organization_id") REFERENCES "greeting_sessions"("id", "organization_id") ON DELETE CASCADE ON UPDATE CASCADE NOT VALID;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM "greeting_journey_events" c WHERE c."session_id" IS NOT NULL AND NOT EXISTS (
       SELECT 1 FROM "greeting_sessions" p WHERE p."id" = c."session_id" AND p."organization_id" = c."organization_id")) THEN
    RAISE NOTICE 'Còn dòng lệch tổ chức ở greeting_journey_events.session_id — khoá greeting_journey_events_session_id_organization_id_fkey để NOT VALID';
  ELSE
    ALTER TABLE "greeting_journey_events" VALIDATE CONSTRAINT "greeting_journey_events_session_id_organization_id_fkey";
  END IF;
END $$;

ALTER TABLE "product_recipes" ADD CONSTRAINT "product_recipes_product_id_organization_id_fkey" FOREIGN KEY ("product_id", "organization_id") REFERENCES "products"("id", "organization_id") ON DELETE CASCADE ON UPDATE CASCADE NOT VALID;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM "product_recipes" c WHERE c."product_id" IS NOT NULL AND NOT EXISTS (
       SELECT 1 FROM "products" p WHERE p."id" = c."product_id" AND p."organization_id" = c."organization_id")) THEN
    RAISE NOTICE 'Còn dòng lệch tổ chức ở product_recipes.product_id — khoá product_recipes_product_id_organization_id_fkey để NOT VALID';
  ELSE
    ALTER TABLE "product_recipes" VALIDATE CONSTRAINT "product_recipes_product_id_organization_id_fkey";
  END IF;
END $$;

ALTER TABLE "sales_channel_listings" ADD CONSTRAINT "sales_channel_listings_product_id_organization_id_fkey" FOREIGN KEY ("product_id", "organization_id") REFERENCES "products"("id", "organization_id") ON DELETE CASCADE ON UPDATE CASCADE NOT VALID;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM "sales_channel_listings" c WHERE c."product_id" IS NOT NULL AND NOT EXISTS (
       SELECT 1 FROM "products" p WHERE p."id" = c."product_id" AND p."organization_id" = c."organization_id")) THEN
    RAISE NOTICE 'Còn dòng lệch tổ chức ở sales_channel_listings.product_id — khoá sales_channel_listings_product_id_organization_id_fkey để NOT VALID';
  ELSE
    ALTER TABLE "sales_channel_listings" VALIDATE CONSTRAINT "sales_channel_listings_product_id_organization_id_fkey";
  END IF;
END $$;

ALTER TABLE "order_approval_requests" ADD CONSTRAINT "order_approval_requests_order_id_organization_id_fkey" FOREIGN KEY ("order_id", "organization_id") REFERENCES "orders"("id", "organization_id") ON DELETE CASCADE ON UPDATE CASCADE NOT VALID;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM "order_approval_requests" c WHERE c."order_id" IS NOT NULL AND NOT EXISTS (
       SELECT 1 FROM "orders" p WHERE p."id" = c."order_id" AND p."organization_id" = c."organization_id")) THEN
    RAISE NOTICE 'Còn dòng lệch tổ chức ở order_approval_requests.order_id — khoá order_approval_requests_order_id_organization_id_fkey để NOT VALID';
  ELSE
    ALTER TABLE "order_approval_requests" VALIDATE CONSTRAINT "order_approval_requests_order_id_organization_id_fkey";
  END IF;
END $$;

ALTER TABLE "quotation_items" ADD CONSTRAINT "quotation_items_quotation_id_organization_id_fkey" FOREIGN KEY ("quotation_id", "organization_id") REFERENCES "quotations"("id", "organization_id") ON DELETE CASCADE ON UPDATE CASCADE NOT VALID;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM "quotation_items" c WHERE c."quotation_id" IS NOT NULL AND NOT EXISTS (
       SELECT 1 FROM "quotations" p WHERE p."id" = c."quotation_id" AND p."organization_id" = c."organization_id")) THEN
    RAISE NOTICE 'Còn dòng lệch tổ chức ở quotation_items.quotation_id — khoá quotation_items_quotation_id_organization_id_fkey để NOT VALID';
  ELSE
    ALTER TABLE "quotation_items" VALIDATE CONSTRAINT "quotation_items_quotation_id_organization_id_fkey";
  END IF;
END $$;

ALTER TABLE "quotation_revisions" ADD CONSTRAINT "quotation_revisions_quotation_id_organization_id_fkey" FOREIGN KEY ("quotation_id", "organization_id") REFERENCES "quotations"("id", "organization_id") ON DELETE CASCADE ON UPDATE CASCADE NOT VALID;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM "quotation_revisions" c WHERE c."quotation_id" IS NOT NULL AND NOT EXISTS (
       SELECT 1 FROM "quotations" p WHERE p."id" = c."quotation_id" AND p."organization_id" = c."organization_id")) THEN
    RAISE NOTICE 'Còn dòng lệch tổ chức ở quotation_revisions.quotation_id — khoá quotation_revisions_quotation_id_organization_id_fkey để NOT VALID';
  ELSE
    ALTER TABLE "quotation_revisions" VALIDATE CONSTRAINT "quotation_revisions_quotation_id_organization_id_fkey";
  END IF;
END $$;

ALTER TABLE "customer_interactions" ADD CONSTRAINT "customer_interactions_customer_id_organization_id_fkey" FOREIGN KEY ("customer_id", "organization_id") REFERENCES "customers"("id", "organization_id") ON DELETE CASCADE ON UPDATE CASCADE NOT VALID;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM "customer_interactions" c WHERE c."customer_id" IS NOT NULL AND NOT EXISTS (
       SELECT 1 FROM "customers" p WHERE p."id" = c."customer_id" AND p."organization_id" = c."organization_id")) THEN
    RAISE NOTICE 'Còn dòng lệch tổ chức ở customer_interactions.customer_id — khoá customer_interactions_customer_id_organization_id_fkey để NOT VALID';
  ELSE
    ALTER TABLE "customer_interactions" VALIDATE CONSTRAINT "customer_interactions_customer_id_organization_id_fkey";
  END IF;
END $$;

COMMIT;
