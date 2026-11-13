-- Hoàn thiện CSDL đợt 1b (rà soát 05/11/2026): 36 khoá ngoại nghiệp vụ lõi; 3 cột NOT NULL
-- còn lại (voucher_redemptions.order_id, greeting_notifications.order_id,
-- sales_channel_listings.product_id) thành khoá ghép tenant ở migration 20261105190000.
-- Cột cho phép NULL: tham chiếu mồ côi được đặt NULL trước khi thêm khoá (không xoá dòng).
-- Cột NOT NULL: khoá thêm NOT VALID (chặn dữ liệu sai từ nay), rồi tự VALIDATE nếu không
-- còn dòng mồ côi; còn thì để NOT VALID và báo NOTICE để người vận hành dọn rồi chạy
-- ALTER TABLE ... VALIDATE CONSTRAINT ... (docs/kien-truc/VAN_HANH_CAP_NHAT_CSDL.md).
-- Không có khoá cho các cột *_asset_id: nhiều cột trong số đó còn chứa URL thay vì id.
-- Cả tệp chạy trong một giao dịch: lỗi ở bất kỳ bước nào thì không bước nào được giữ.
BEGIN;

ALTER TABLE "memberships" ADD CONSTRAINT "memberships_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE NOT VALID;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM "memberships" WHERE "role_id" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "roles" p WHERE p."id" = "memberships"."role_id")) THEN
    RAISE NOTICE 'Còn dòng mồ côi ở memberships.role_id — khoá memberships_role_id_fkey để NOT VALID, cần dọn rồi VALIDATE';
  ELSE
    ALTER TABLE "memberships" VALIDATE CONSTRAINT "memberships_role_id_fkey";
  END IF;
END $$;

ALTER TABLE "capability_overrides" ADD CONSTRAINT "capability_overrides_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE NOT VALID;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM "capability_overrides" WHERE "role_id" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "roles" p WHERE p."id" = "capability_overrides"."role_id")) THEN
    RAISE NOTICE 'Còn dòng mồ côi ở capability_overrides.role_id — khoá capability_overrides_role_id_fkey để NOT VALID, cần dọn rồi VALIDATE';
  ELSE
    ALTER TABLE "capability_overrides" VALIDATE CONSTRAINT "capability_overrides_role_id_fkey";
  END IF;
END $$;

UPDATE "memberships" SET "branch_id" = NULL WHERE "branch_id" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "branches" p WHERE p."id" = "memberships"."branch_id");
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

UPDATE "generation_jobs" SET "branch_id" = NULL WHERE "branch_id" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "branches" p WHERE p."id" = "generation_jobs"."branch_id");
ALTER TABLE "generation_jobs" ADD CONSTRAINT "generation_jobs_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

UPDATE "products" SET "branch_id" = NULL WHERE "branch_id" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "branches" p WHERE p."id" = "products"."branch_id");
ALTER TABLE "products" ADD CONSTRAINT "products_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

UPDATE "pricing_rules" SET "branch_id" = NULL WHERE "branch_id" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "branches" p WHERE p."id" = "pricing_rules"."branch_id");
ALTER TABLE "pricing_rules" ADD CONSTRAINT "pricing_rules_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

UPDATE "orders" SET "branch_id" = NULL WHERE "branch_id" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "branches" p WHERE p."id" = "orders"."branch_id");
ALTER TABLE "orders" ADD CONSTRAINT "orders_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "generation_jobs" ADD CONSTRAINT "generation_jobs_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE NOT VALID;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM "generation_jobs" WHERE "workspace_id" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "workspaces" p WHERE p."id" = "generation_jobs"."workspace_id")) THEN
    RAISE NOTICE 'Còn dòng mồ côi ở generation_jobs.workspace_id — khoá generation_jobs_workspace_id_fkey để NOT VALID, cần dọn rồi VALIDATE';
  ELSE
    ALTER TABLE "generation_jobs" VALIDATE CONSTRAINT "generation_jobs_workspace_id_fkey";
  END IF;
END $$;

ALTER TABLE "usage" ADD CONSTRAINT "usage_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE NOT VALID;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM "usage" WHERE "workspace_id" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "workspaces" p WHERE p."id" = "usage"."workspace_id")) THEN
    RAISE NOTICE 'Còn dòng mồ côi ở usage.workspace_id — khoá usage_workspace_id_fkey để NOT VALID, cần dọn rồi VALIDATE';
  ELSE
    ALTER TABLE "usage" VALIDATE CONSTRAINT "usage_workspace_id_fkey";
  END IF;
END $$;

UPDATE "journey_runs" SET "workspace_id" = NULL WHERE "workspace_id" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "workspaces" p WHERE p."id" = "journey_runs"."workspace_id");
ALTER TABLE "journey_runs" ADD CONSTRAINT "journey_runs_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE SET NULL ON UPDATE CASCADE;

UPDATE "assets" SET "product_id" = NULL WHERE "product_id" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "products" p WHERE p."id" = "assets"."product_id");
ALTER TABLE "assets" ADD CONSTRAINT "assets_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

UPDATE "generation_jobs" SET "product_id" = NULL WHERE "product_id" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "products" p WHERE p."id" = "generation_jobs"."product_id");
ALTER TABLE "generation_jobs" ADD CONSTRAINT "generation_jobs_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

UPDATE "product_copies" SET "product_id" = NULL WHERE "product_id" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "products" p WHERE p."id" = "product_copies"."product_id");
ALTER TABLE "product_copies" ADD CONSTRAINT "product_copies_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

UPDATE "video_jobs" SET "product_id" = NULL WHERE "product_id" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "products" p WHERE p."id" = "video_jobs"."product_id");
ALTER TABLE "video_jobs" ADD CONSTRAINT "video_jobs_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

UPDATE "order_items" SET "product_id" = NULL WHERE "product_id" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "products" p WHERE p."id" = "order_items"."product_id");
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

UPDATE "campaign_packages" SET "product_id" = NULL WHERE "product_id" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "products" p WHERE p."id" = "campaign_packages"."product_id");
ALTER TABLE "campaign_packages" ADD CONSTRAINT "campaign_packages_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

UPDATE "content_generations" SET "product_id" = NULL WHERE "product_id" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "products" p WHERE p."id" = "content_generations"."product_id");
ALTER TABLE "content_generations" ADD CONSTRAINT "content_generations_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

UPDATE "greeting_sessions" SET "selected_product_id" = NULL WHERE "selected_product_id" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "products" p WHERE p."id" = "greeting_sessions"."selected_product_id");
ALTER TABLE "greeting_sessions" ADD CONSTRAINT "greeting_sessions_selected_product_id_fkey" FOREIGN KEY ("selected_product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

UPDATE "greeting_catalog_events" SET "product_id" = NULL WHERE "product_id" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "products" p WHERE p."id" = "greeting_catalog_events"."product_id");
ALTER TABLE "greeting_catalog_events" ADD CONSTRAINT "greeting_catalog_events_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

UPDATE "order_items" SET "variant_id" = NULL WHERE "variant_id" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "product_variants" p WHERE p."id" = "order_items"."variant_id");
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

UPDATE "product_revisions" SET "import_batch_id" = NULL WHERE "import_batch_id" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "product_import_batches" p WHERE p."id" = "product_revisions"."import_batch_id");
ALTER TABLE "product_revisions" ADD CONSTRAINT "product_revisions_import_batch_id_fkey" FOREIGN KEY ("import_batch_id") REFERENCES "product_import_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

UPDATE "assets" SET "parent_asset_id" = NULL WHERE "parent_asset_id" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "assets" p WHERE p."id" = "assets"."parent_asset_id");
ALTER TABLE "assets" ADD CONSTRAINT "assets_parent_asset_id_fkey" FOREIGN KEY ("parent_asset_id") REFERENCES "assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

UPDATE "integration_tokens" SET "rotated_from_id" = NULL WHERE "rotated_from_id" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "integration_tokens" p WHERE p."id" = "integration_tokens"."rotated_from_id");
ALTER TABLE "integration_tokens" ADD CONSTRAINT "integration_tokens_rotated_from_id_fkey" FOREIGN KEY ("rotated_from_id") REFERENCES "integration_tokens"("id") ON DELETE SET NULL ON UPDATE CASCADE;

UPDATE "integration_connections" SET "inherited_from_org_id" = NULL WHERE "inherited_from_org_id" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "organizations" p WHERE p."id" = "integration_connections"."inherited_from_org_id");
ALTER TABLE "integration_connections" ADD CONSTRAINT "integration_connections_inherited_from_org_id_fkey" FOREIGN KEY ("inherited_from_org_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

UPDATE "vouchers" SET "order_id" = NULL WHERE "order_id" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "orders" p WHERE p."id" = "vouchers"."order_id");
ALTER TABLE "vouchers" ADD CONSTRAINT "vouchers_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

UPDATE "greeting_payment_events" SET "order_id" = NULL WHERE "order_id" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "orders" p WHERE p."id" = "greeting_payment_events"."order_id");
ALTER TABLE "greeting_payment_events" ADD CONSTRAINT "greeting_payment_events_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

UPDATE "staff_notifications" SET "order_id" = NULL WHERE "order_id" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "orders" p WHERE p."id" = "staff_notifications"."order_id");
ALTER TABLE "staff_notifications" ADD CONSTRAINT "staff_notifications_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

UPDATE "greeting_messages" SET "order_id" = NULL WHERE "order_id" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "orders" p WHERE p."id" = "greeting_messages"."order_id");
ALTER TABLE "greeting_messages" ADD CONSTRAINT "greeting_messages_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

UPDATE "greeting_catalog_events" SET "order_id" = NULL WHERE "order_id" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "orders" p WHERE p."id" = "greeting_catalog_events"."order_id");
ALTER TABLE "greeting_catalog_events" ADD CONSTRAINT "greeting_catalog_events_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

UPDATE "internal_chat_conversations" SET "order_id" = NULL WHERE "order_id" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "orders" p WHERE p."id" = "internal_chat_conversations"."order_id");
ALTER TABLE "internal_chat_conversations" ADD CONSTRAINT "internal_chat_conversations_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

UPDATE "sales_channel_orders" SET "order_id" = NULL WHERE "order_id" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "orders" p WHERE p."id" = "sales_channel_orders"."order_id");
ALTER TABLE "sales_channel_orders" ADD CONSTRAINT "sales_channel_orders_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

UPDATE "orders" SET "voucher_id" = NULL WHERE "voucher_id" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "vouchers" p WHERE p."id" = "orders"."voucher_id");
ALTER TABLE "orders" ADD CONSTRAINT "orders_voucher_id_fkey" FOREIGN KEY ("voucher_id") REFERENCES "vouchers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

UPDATE "voucher_redemptions" SET "customer_id" = NULL WHERE "customer_id" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "customers" p WHERE p."id" = "voucher_redemptions"."customer_id");
ALTER TABLE "voucher_redemptions" ADD CONSTRAINT "voucher_redemptions_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

UPDATE "orders" SET "source_session_id" = NULL WHERE "source_session_id" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "greeting_sessions" p WHERE p."id" = "orders"."source_session_id");
ALTER TABLE "orders" ADD CONSTRAINT "orders_source_session_id_fkey" FOREIGN KEY ("source_session_id") REFERENCES "greeting_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

UPDATE "greeting_messages" SET "session_id" = NULL WHERE "session_id" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "greeting_sessions" p WHERE p."id" = "greeting_messages"."session_id");
ALTER TABLE "greeting_messages" ADD CONSTRAINT "greeting_messages_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "greeting_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

UPDATE "greeting_messages" SET "reply_to_id" = NULL WHERE "reply_to_id" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "greeting_messages" p WHERE p."id" = "greeting_messages"."reply_to_id");
ALTER TABLE "greeting_messages" ADD CONSTRAINT "greeting_messages_reply_to_id_fkey" FOREIGN KEY ("reply_to_id") REFERENCES "greeting_messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

COMMIT;
