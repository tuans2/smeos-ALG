-- Hoàn thiện CSDL GĐ1, bước O-1 (ADR-015 D-O6): index cho cột con của 61 khoá ngoại chưa có index
-- phù hợp (34 khoá thêm ở PR #127 + khoá cũ). Không index thì xoá dòng cha (SET NULL / CASCADE /
-- RESTRICT) phải quét cả bảng con. Test giữ luật: tests/unit/architecture/foreign-key-index.test.ts.
-- Cả tệp chạy trong một giao dịch: lỗi ở bất kỳ bước nào thì không bước nào được giữ.
BEGIN;
SET LOCAL lock_timeout = '30s';

-- CreateIndex
CREATE INDEX "ai_policies_capability_code_idx" ON "ai_policies"("capability_code");

-- CreateIndex
CREATE INDEX "asset_usages_short_link_id_idx" ON "asset_usages"("short_link_id");

-- CreateIndex
CREATE INDEX "assets_product_id_idx" ON "assets"("product_id");

-- CreateIndex
CREATE INDEX "campaign_packages_product_id_idx" ON "campaign_packages"("product_id");

-- CreateIndex
CREATE INDEX "capability_overrides_role_id_idx" ON "capability_overrides"("role_id");

-- CreateIndex
CREATE INDEX "chat_conversations_customer_id_idx" ON "chat_conversations"("customer_id");

-- CreateIndex
CREATE INDEX "chat_messages_conversation_id_idx" ON "chat_messages"("conversation_id");

-- CreateIndex
CREATE INDEX "content_generations_product_id_idx" ON "content_generations"("product_id");

-- CreateIndex
CREATE INDEX "generation_jobs_branch_id_idx" ON "generation_jobs"("branch_id");

-- CreateIndex
CREATE INDEX "generation_jobs_product_id_idx" ON "generation_jobs"("product_id");

-- CreateIndex
CREATE INDEX "generation_jobs_workspace_id_idx" ON "generation_jobs"("workspace_id");

-- CreateIndex
CREATE INDEX "greeting_catalog_events_catalog_id_idx" ON "greeting_catalog_events"("catalog_id");

-- CreateIndex
CREATE INDEX "greeting_catalog_events_order_id_idx" ON "greeting_catalog_events"("order_id");

-- CreateIndex
CREATE INDEX "greeting_catalog_events_product_id_idx" ON "greeting_catalog_events"("product_id");

-- CreateIndex
CREATE INDEX "greeting_messages_order_id_idx" ON "greeting_messages"("order_id");

-- CreateIndex
CREATE INDEX "greeting_messages_reply_to_id_idx" ON "greeting_messages"("reply_to_id");

-- CreateIndex
CREATE INDEX "greeting_messages_session_id_idx" ON "greeting_messages"("session_id");

-- CreateIndex
CREATE INDEX "greeting_payment_events_order_id_idx" ON "greeting_payment_events"("order_id");

-- CreateIndex
CREATE INDEX "greeting_sessions_catalog_id_idx" ON "greeting_sessions"("catalog_id");

-- CreateIndex
CREATE INDEX "greeting_sessions_order_id_idx" ON "greeting_sessions"("order_id");

-- CreateIndex
CREATE INDEX "greeting_sessions_selected_product_id_idx" ON "greeting_sessions"("selected_product_id");

-- CreateIndex
CREATE INDEX "greeting_share_links_catalog_id_idx" ON "greeting_share_links"("catalog_id");

-- CreateIndex
CREATE INDEX "integration_connections_inherited_from_org_id_idx" ON "integration_connections"("inherited_from_org_id");

-- CreateIndex
CREATE INDEX "integration_tokens_rotated_from_id_idx" ON "integration_tokens"("rotated_from_id");

-- CreateIndex
CREATE INDEX "internal_chat_messages_sender_user_id_idx" ON "internal_chat_messages"("sender_user_id");

-- CreateIndex
CREATE INDEX "journey_runs_workspace_id_idx" ON "journey_runs"("workspace_id");

-- CreateIndex
CREATE INDEX "leads_converted_order_id_idx" ON "leads"("converted_order_id");

-- CreateIndex
CREATE INDEX "leads_customer_id_idx" ON "leads"("customer_id");

-- CreateIndex
CREATE INDEX "leads_short_link_id_idx" ON "leads"("short_link_id");

-- CreateIndex
CREATE INDEX "link_events_short_link_id_idx" ON "link_events"("short_link_id");

-- CreateIndex
CREATE INDEX "material_price_history_material_id_idx" ON "material_price_history"("material_id");

-- CreateIndex
CREATE INDEX "memberships_branch_id_idx" ON "memberships"("branch_id");

-- CreateIndex
CREATE INDEX "memberships_role_id_idx" ON "memberships"("role_id");

-- CreateIndex
CREATE INDEX "order_coordinations_partner_id_idx" ON "order_coordinations"("partner_id");

-- CreateIndex
CREATE INDEX "order_items_order_id_idx" ON "order_items"("order_id");

-- CreateIndex
CREATE INDEX "order_items_product_id_idx" ON "order_items"("product_id");

-- CreateIndex
CREATE INDEX "order_items_variant_id_idx" ON "order_items"("variant_id");

-- CreateIndex
CREATE INDEX "orders_branch_id_idx" ON "orders"("branch_id");

-- CreateIndex
CREATE INDEX "orders_customer_id_idx" ON "orders"("customer_id");

-- CreateIndex
CREATE INDEX "orders_lead_id_idx" ON "orders"("lead_id");

-- CreateIndex
CREATE INDEX "orders_source_session_id_idx" ON "orders"("source_session_id");

-- CreateIndex
CREATE INDEX "orders_voucher_id_idx" ON "orders"("voucher_id");

-- CreateIndex
CREATE INDEX "pricing_rules_branch_id_idx" ON "pricing_rules"("branch_id");

-- CreateIndex
CREATE INDEX "product_analyses_product_id_idx" ON "product_analyses"("product_id");

-- CreateIndex
CREATE INDEX "product_bookings_order_id_idx" ON "product_bookings"("order_id");

-- CreateIndex
CREATE INDEX "product_bookings_product_id_idx" ON "product_bookings"("product_id");

-- CreateIndex
CREATE INDEX "product_copies_product_id_idx" ON "product_copies"("product_id");

-- CreateIndex
CREATE INDEX "product_inventory_branch_id_idx" ON "product_inventory"("branch_id");

-- CreateIndex
CREATE INDEX "product_recipe_items_material_id_idx" ON "product_recipe_items"("material_id");

-- CreateIndex
CREATE INDEX "product_revisions_import_batch_id_idx" ON "product_revisions"("import_batch_id");

-- CreateIndex
CREATE INDEX "products_branch_id_idx" ON "products"("branch_id");

-- CreateIndex
CREATE INDEX "quotations_asset_usage_id_idx" ON "quotations"("asset_usage_id");

-- CreateIndex
CREATE INDEX "quotations_converted_order_id_idx" ON "quotations"("converted_order_id");

-- CreateIndex
CREATE INDEX "sales_channel_orders_order_id_idx" ON "sales_channel_orders"("order_id");

-- CreateIndex
CREATE INDEX "staff_notifications_order_id_idx" ON "staff_notifications"("order_id");

-- CreateIndex
CREATE INDEX "usage_workspace_id_idx" ON "usage"("workspace_id");

-- CreateIndex
CREATE INDEX "video_jobs_product_id_idx" ON "video_jobs"("product_id");

-- CreateIndex
CREATE INDEX "voucher_redemptions_customer_id_idx" ON "voucher_redemptions"("customer_id");

-- CreateIndex
CREATE INDEX "vouchers_batch_id_idx" ON "vouchers"("batch_id");

-- CreateIndex
CREATE INDEX "vouchers_customer_id_idx" ON "vouchers"("customer_id");

-- CreateIndex
CREATE INDEX "vouchers_order_id_idx" ON "vouchers"("order_id");


COMMIT;
