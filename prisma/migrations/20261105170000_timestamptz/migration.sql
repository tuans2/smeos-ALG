-- Hoàn thiện CSDL đợt 2 (rà soát 05/11/2026): mọi cột thời gian thành TIMESTAMPTZ(3).
-- Prisma luôn ghi giờ UTC vào cột `timestamp` không múi giờ, nên giá trị cũ được đọc là
-- UTC (`AT TIME ZONE 'UTC'`), không phụ thuộc TimeZone của phiên chạy migration.
-- Ba cột @db.Date giữ nguyên. Lệnh viết lại từng bảng: chạy ngoài giờ cao điểm.
-- Cả tệp chạy trong một giao dịch: lỗi ở bất kỳ bước nào thì không bước nào được giữ.
BEGIN;

SET LOCAL lock_timeout = '30s';

-- AlterTable
ALTER TABLE "ai_capabilities" ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMPTZ(3) USING "updated_at" AT TIME ZONE 'UTC';

-- AlterTable
ALTER TABLE "ai_evaluations" ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC';

-- AlterTable
ALTER TABLE "ai_models" ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC',
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMPTZ(3) USING "updated_at" AT TIME ZONE 'UTC';

-- AlterTable
ALTER TABLE "ai_policies" ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMPTZ(3) USING "updated_at" AT TIME ZONE 'UTC';

-- AlterTable
ALTER TABLE "ai_requests" ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC';

-- AlterTable
ALTER TABLE "asset_usages" ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC',
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMPTZ(3) USING "updated_at" AT TIME ZONE 'UTC';

-- AlterTable
ALTER TABLE "assets" ALTER COLUMN "approved_at" SET DATA TYPE TIMESTAMPTZ(3) USING "approved_at" AT TIME ZONE 'UTC',
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC',
ALTER COLUMN "legal_hold_until" SET DATA TYPE TIMESTAMPTZ(3) USING "legal_hold_until" AT TIME ZONE 'UTC',
ALTER COLUMN "purge_after" SET DATA TYPE TIMESTAMPTZ(3) USING "purge_after" AT TIME ZONE 'UTC',
ALTER COLUMN "trashed_at" SET DATA TYPE TIMESTAMPTZ(3) USING "trashed_at" AT TIME ZONE 'UTC';

-- AlterTable
ALTER TABLE "audit_logs" ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC';

-- AlterTable
ALTER TABLE "branches" ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC';

-- AlterTable
ALTER TABLE "brand_library_items" ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC',
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMPTZ(3) USING "updated_at" AT TIME ZONE 'UTC';

-- AlterTable
ALTER TABLE "brand_library_versions" ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC';

-- AlterTable
ALTER TABLE "brand_profiles" ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC',
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMPTZ(3) USING "updated_at" AT TIME ZONE 'UTC';

-- AlterTable
ALTER TABLE "business_profiles" ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC',
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMPTZ(3) USING "updated_at" AT TIME ZONE 'UTC';

-- AlterTable
ALTER TABLE "campaign_packages" ALTER COLUMN "qa_checked_at" SET DATA TYPE TIMESTAMPTZ(3) USING "qa_checked_at" AT TIME ZONE 'UTC',
ALTER COLUMN "approved_at" SET DATA TYPE TIMESTAMPTZ(3) USING "approved_at" AT TIME ZONE 'UTC',
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC',
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMPTZ(3) USING "updated_at" AT TIME ZONE 'UTC';

-- AlterTable
ALTER TABLE "campaigns" ALTER COLUMN "starts_at" SET DATA TYPE TIMESTAMPTZ(3) USING "starts_at" AT TIME ZONE 'UTC',
ALTER COLUMN "ends_at" SET DATA TYPE TIMESTAMPTZ(3) USING "ends_at" AT TIME ZONE 'UTC',
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC',
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMPTZ(3) USING "updated_at" AT TIME ZONE 'UTC';

-- AlterTable
ALTER TABLE "capability_overrides" ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMPTZ(3) USING "updated_at" AT TIME ZONE 'UTC';

-- AlterTable
ALTER TABLE "catalog_links" ALTER COLUMN "revoked_at" SET DATA TYPE TIMESTAMPTZ(3) USING "revoked_at" AT TIME ZONE 'UTC',
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC',
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMPTZ(3) USING "updated_at" AT TIME ZONE 'UTC';

-- AlterTable
ALTER TABLE "chain_branches" ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC',
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMPTZ(3) USING "updated_at" AT TIME ZONE 'UTC';

-- AlterTable
ALTER TABLE "chain_partnerships" ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC',
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMPTZ(3) USING "updated_at" AT TIME ZONE 'UTC';

-- AlterTable
ALTER TABLE "chat_channel_integrations" ALTER COLUMN "subscription_expires_at" SET DATA TYPE TIMESTAMPTZ(3) USING "subscription_expires_at" AT TIME ZONE 'UTC',
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC',
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMPTZ(3) USING "updated_at" AT TIME ZONE 'UTC';

-- AlterTable
ALTER TABLE "chat_conversations" ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC',
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMPTZ(3) USING "updated_at" AT TIME ZONE 'UTC';

-- AlterTable
ALTER TABLE "chat_messages" ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC';

-- AlterTable
ALTER TABLE "content_drafts" ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC',
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMPTZ(3) USING "updated_at" AT TIME ZONE 'UTC';

-- AlterTable
ALTER TABLE "content_generations" ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC',
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMPTZ(3) USING "updated_at" AT TIME ZONE 'UTC';

-- AlterTable
ALTER TABLE "content_metrics" ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC',
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMPTZ(3) USING "updated_at" AT TIME ZONE 'UTC';

-- AlterTable
ALTER TABLE "content_opportunities" ALTER COLUMN "expires_at" SET DATA TYPE TIMESTAMPTZ(3) USING "expires_at" AT TIME ZONE 'UTC',
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC',
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMPTZ(3) USING "updated_at" AT TIME ZONE 'UTC';

-- AlterTable
ALTER TABLE "customer_consents" ALTER COLUMN "granted_at" SET DATA TYPE TIMESTAMPTZ(3) USING "granted_at" AT TIME ZONE 'UTC',
ALTER COLUMN "revoked_at" SET DATA TYPE TIMESTAMPTZ(3) USING "revoked_at" AT TIME ZONE 'UTC',
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC';

-- AlterTable
ALTER TABLE "customer_interactions" ALTER COLUMN "occurred_at" SET DATA TYPE TIMESTAMPTZ(3) USING "occurred_at" AT TIME ZONE 'UTC',
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC',
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMPTZ(3) USING "updated_at" AT TIME ZONE 'UTC';

-- AlterTable
ALTER TABLE "customer_occasions" ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC';

-- AlterTable
ALTER TABLE "customer_segments" ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC',
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMPTZ(3) USING "updated_at" AT TIME ZONE 'UTC';

-- AlterTable
ALTER TABLE "customers" ALTER COLUMN "last_order_at" SET DATA TYPE TIMESTAMPTZ(3) USING "last_order_at" AT TIME ZONE 'UTC',
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC',
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMPTZ(3) USING "updated_at" AT TIME ZONE 'UTC';

-- AlterTable
ALTER TABLE "decision_registry" ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC',
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMPTZ(3) USING "updated_at" AT TIME ZONE 'UTC';

-- AlterTable
ALTER TABLE "field_catalog_values" ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC',
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMPTZ(3) USING "updated_at" AT TIME ZONE 'UTC';

-- AlterTable
ALTER TABLE "field_catalogs" ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC',
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMPTZ(3) USING "updated_at" AT TIME ZONE 'UTC';

-- AlterTable
ALTER TABLE "field_config_overrides" ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC',
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMPTZ(3) USING "updated_at" AT TIME ZONE 'UTC';

-- AlterTable
ALTER TABLE "field_definitions" ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC',
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMPTZ(3) USING "updated_at" AT TIME ZONE 'UTC';

-- AlterTable
ALTER TABLE "flower_taxonomy" ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC',
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMPTZ(3) USING "updated_at" AT TIME ZONE 'UTC';

-- AlterTable
ALTER TABLE "generation_jobs" ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC',
ALTER COLUMN "started_at" SET DATA TYPE TIMESTAMPTZ(3) USING "started_at" AT TIME ZONE 'UTC',
ALTER COLUMN "completed_at" SET DATA TYPE TIMESTAMPTZ(3) USING "completed_at" AT TIME ZONE 'UTC',
ALTER COLUMN "cancelled_at" SET DATA TYPE TIMESTAMPTZ(3) USING "cancelled_at" AT TIME ZONE 'UTC',
ALTER COLUMN "run_after" SET DATA TYPE TIMESTAMPTZ(3) USING "run_after" AT TIME ZONE 'UTC';

-- AlterTable
ALTER TABLE "greeting_catalog_events" ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC';

-- AlterTable
ALTER TABLE "greeting_catalog_products" ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC';

-- AlterTable
ALTER TABLE "greeting_catalogs" ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC',
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMPTZ(3) USING "updated_at" AT TIME ZONE 'UTC';

-- AlterTable
ALTER TABLE "greeting_integrations" ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC',
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMPTZ(3) USING "updated_at" AT TIME ZONE 'UTC';

-- AlterTable
ALTER TABLE "greeting_journey_events" ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC';

-- AlterTable
ALTER TABLE "greeting_message_reads" ALTER COLUMN "read_at" SET DATA TYPE TIMESTAMPTZ(3) USING "read_at" AT TIME ZONE 'UTC';

-- AlterTable
ALTER TABLE "greeting_messages" ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC';

-- AlterTable
ALTER TABLE "greeting_notifications" ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC',
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMPTZ(3) USING "updated_at" AT TIME ZONE 'UTC';

-- AlterTable
ALTER TABLE "greeting_payment_events" ALTER COLUMN "transaction_at" SET DATA TYPE TIMESTAMPTZ(3) USING "transaction_at" AT TIME ZONE 'UTC',
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC';

-- AlterTable
ALTER TABLE "greeting_sessions" ALTER COLUMN "opened_at" SET DATA TYPE TIMESTAMPTZ(3) USING "opened_at" AT TIME ZONE 'UTC',
ALTER COLUMN "selected_at" SET DATA TYPE TIMESTAMPTZ(3) USING "selected_at" AT TIME ZONE 'UTC',
ALTER COLUMN "expires_at" SET DATA TYPE TIMESTAMPTZ(3) USING "expires_at" AT TIME ZONE 'UTC',
ALTER COLUMN "revoked_at" SET DATA TYPE TIMESTAMPTZ(3) USING "revoked_at" AT TIME ZONE 'UTC',
ALTER COLUMN "last_active_at" SET DATA TYPE TIMESTAMPTZ(3) USING "last_active_at" AT TIME ZONE 'UTC',
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC',
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMPTZ(3) USING "updated_at" AT TIME ZONE 'UTC';

-- AlterTable
ALTER TABLE "greeting_share_links" ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC',
ALTER COLUMN "revoked_at" SET DATA TYPE TIMESTAMPTZ(3) USING "revoked_at" AT TIME ZONE 'UTC';

-- AlterTable
ALTER TABLE "idempotency_keys" ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC';

-- AlterTable
ALTER TABLE "integration_connections" ALTER COLUMN "expires_at" SET DATA TYPE TIMESTAMPTZ(3) USING "expires_at" AT TIME ZONE 'UTC',
ALTER COLUMN "last_health_at" SET DATA TYPE TIMESTAMPTZ(3) USING "last_health_at" AT TIME ZONE 'UTC',
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC',
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMPTZ(3) USING "updated_at" AT TIME ZONE 'UTC';

-- AlterTable
ALTER TABLE "integration_events" ALTER COLUMN "next_retry_at" SET DATA TYPE TIMESTAMPTZ(3) USING "next_retry_at" AT TIME ZONE 'UTC',
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC',
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMPTZ(3) USING "updated_at" AT TIME ZONE 'UTC';

-- AlterTable
ALTER TABLE "integration_governance" ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC',
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMPTZ(3) USING "updated_at" AT TIME ZONE 'UTC';

-- AlterTable
ALTER TABLE "integration_sync_cursors" ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMPTZ(3) USING "updated_at" AT TIME ZONE 'UTC';

-- AlterTable
ALTER TABLE "integration_tokens" ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC',
ALTER COLUMN "expires_at" SET DATA TYPE TIMESTAMPTZ(3) USING "expires_at" AT TIME ZONE 'UTC',
ALTER COLUMN "revoked_at" SET DATA TYPE TIMESTAMPTZ(3) USING "revoked_at" AT TIME ZONE 'UTC';

-- AlterTable
ALTER TABLE "internal_chat_conversations" ALTER COLUMN "last_message_at" SET DATA TYPE TIMESTAMPTZ(3) USING "last_message_at" AT TIME ZONE 'UTC',
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC',
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMPTZ(3) USING "updated_at" AT TIME ZONE 'UTC';

-- AlterTable
ALTER TABLE "internal_chat_messages" ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC';

-- AlterTable
ALTER TABLE "internal_chat_participants" ALTER COLUMN "last_read_at" SET DATA TYPE TIMESTAMPTZ(3) USING "last_read_at" AT TIME ZONE 'UTC',
ALTER COLUMN "joined_at" SET DATA TYPE TIMESTAMPTZ(3) USING "joined_at" AT TIME ZONE 'UTC';

-- AlterTable
ALTER TABLE "job_events" ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC';

-- AlterTable
ALTER TABLE "journey_runs" ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC',
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMPTZ(3) USING "updated_at" AT TIME ZONE 'UTC';

-- AlterTable
ALTER TABLE "landing_pages" ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC';

-- AlterTable
ALTER TABLE "leads" ALTER COLUMN "consent_at" SET DATA TYPE TIMESTAMPTZ(3) USING "consent_at" AT TIME ZONE 'UTC',
ALTER COLUMN "status_changed_at" SET DATA TYPE TIMESTAMPTZ(3) USING "status_changed_at" AT TIME ZONE 'UTC',
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC',
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMPTZ(3) USING "updated_at" AT TIME ZONE 'UTC',
ALTER COLUMN "next_follow_up_at" SET DATA TYPE TIMESTAMPTZ(3) USING "next_follow_up_at" AT TIME ZONE 'UTC';

-- AlterTable
ALTER TABLE "link_events" ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC';

-- AlterTable
ALTER TABLE "market_sources" ALTER COLUMN "last_success_at" SET DATA TYPE TIMESTAMPTZ(3) USING "last_success_at" AT TIME ZONE 'UTC',
ALTER COLUMN "last_error_at" SET DATA TYPE TIMESTAMPTZ(3) USING "last_error_at" AT TIME ZONE 'UTC',
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC',
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMPTZ(3) USING "updated_at" AT TIME ZONE 'UTC';

-- AlterTable
ALTER TABLE "material_price_history" ALTER COLUMN "effective_at" SET DATA TYPE TIMESTAMPTZ(3) USING "effective_at" AT TIME ZONE 'UTC';

-- AlterTable
ALTER TABLE "materials" ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC',
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMPTZ(3) USING "updated_at" AT TIME ZONE 'UTC';

-- AlterTable
ALTER TABLE "memberships" ALTER COLUMN "invited_at" SET DATA TYPE TIMESTAMPTZ(3) USING "invited_at" AT TIME ZONE 'UTC',
ALTER COLUMN "joined_at" SET DATA TYPE TIMESTAMPTZ(3) USING "joined_at" AT TIME ZONE 'UTC';

-- AlterTable
ALTER TABLE "music_tracks" ALTER COLUMN "attested_at" SET DATA TYPE TIMESTAMPTZ(3) USING "attested_at" AT TIME ZONE 'UTC',
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC',
ALTER COLUMN "deleted_at" SET DATA TYPE TIMESTAMPTZ(3) USING "deleted_at" AT TIME ZONE 'UTC';

-- AlterTable
ALTER TABLE "notification_channel_activations" ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMPTZ(3) USING "updated_at" AT TIME ZONE 'UTC';

-- AlterTable
ALTER TABLE "notification_event_visibility" ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMPTZ(3) USING "updated_at" AT TIME ZONE 'UTC';

-- AlterTable
ALTER TABLE "notification_hard_locks" ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC',
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMPTZ(3) USING "updated_at" AT TIME ZONE 'UTC';

-- AlterTable
ALTER TABLE "notification_inbox" ALTER COLUMN "read_at" SET DATA TYPE TIMESTAMPTZ(3) USING "read_at" AT TIME ZONE 'UTC',
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC';

-- AlterTable
ALTER TABLE "notification_org_policies" ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC',
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMPTZ(3) USING "updated_at" AT TIME ZONE 'UTC';

-- AlterTable
ALTER TABLE "notification_store_defaults" ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC',
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMPTZ(3) USING "updated_at" AT TIME ZONE 'UTC';

-- AlterTable
ALTER TABLE "notification_user_preferences" ALTER COLUMN "mute_until" SET DATA TYPE TIMESTAMPTZ(3) USING "mute_until" AT TIME ZONE 'UTC',
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC',
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMPTZ(3) USING "updated_at" AT TIME ZONE 'UTC';

-- AlterTable
ALTER TABLE "occasions" ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC',
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMPTZ(3) USING "updated_at" AT TIME ZONE 'UTC';

-- AlterTable
ALTER TABLE "order_approval_requests" ALTER COLUMN "requested_at" SET DATA TYPE TIMESTAMPTZ(3) USING "requested_at" AT TIME ZONE 'UTC',
ALTER COLUMN "decided_at" SET DATA TYPE TIMESTAMPTZ(3) USING "decided_at" AT TIME ZONE 'UTC',
ALTER COLUMN "collect_due_at" SET DATA TYPE TIMESTAMPTZ(3) USING "collect_due_at" AT TIME ZONE 'UTC',
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC',
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMPTZ(3) USING "updated_at" AT TIME ZONE 'UTC';

-- AlterTable
ALTER TABLE "order_assignments" ALTER COLUMN "assigned_at" SET DATA TYPE TIMESTAMPTZ(3) USING "assigned_at" AT TIME ZONE 'UTC',
ALTER COLUMN "released_at" SET DATA TYPE TIMESTAMPTZ(3) USING "released_at" AT TIME ZONE 'UTC';

-- AlterTable
ALTER TABLE "order_change_requests" ALTER COLUMN "requested_at" SET DATA TYPE TIMESTAMPTZ(3) USING "requested_at" AT TIME ZONE 'UTC',
ALTER COLUMN "approved_at" SET DATA TYPE TIMESTAMPTZ(3) USING "approved_at" AT TIME ZONE 'UTC',
ALTER COLUMN "effective_at" SET DATA TYPE TIMESTAMPTZ(3) USING "effective_at" AT TIME ZONE 'UTC',
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC',
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMPTZ(3) USING "updated_at" AT TIME ZONE 'UTC';

-- AlterTable
ALTER TABLE "order_coordinations" ALTER COLUMN "next_action_due" SET DATA TYPE TIMESTAMPTZ(3) USING "next_action_due" AT TIME ZONE 'UTC',
ALTER COLUMN "estimated_delivery_at" SET DATA TYPE TIMESTAMPTZ(3) USING "estimated_delivery_at" AT TIME ZONE 'UTC',
ALTER COLUMN "actual_delivery_at" SET DATA TYPE TIMESTAMPTZ(3) USING "actual_delivery_at" AT TIME ZONE 'UTC',
ALTER COLUMN "pod_captured_at" SET DATA TYPE TIMESTAMPTZ(3) USING "pod_captured_at" AT TIME ZONE 'UTC',
ALTER COLUMN "closed_at" SET DATA TYPE TIMESTAMPTZ(3) USING "closed_at" AT TIME ZONE 'UTC',
ALTER COLUMN "received_at" SET DATA TYPE TIMESTAMPTZ(3) USING "received_at" AT TIME ZONE 'UTC',
ALTER COLUMN "delivery_window_start" SET DATA TYPE TIMESTAMPTZ(3) USING "delivery_window_start" AT TIME ZONE 'UTC',
ALTER COLUMN "delivery_window_end" SET DATA TYPE TIMESTAMPTZ(3) USING "delivery_window_end" AT TIME ZONE 'UTC',
ALTER COLUMN "production_deadline_at" SET DATA TYPE TIMESTAMPTZ(3) USING "production_deadline_at" AT TIME ZONE 'UTC',
ALTER COLUMN "pickup_target_at" SET DATA TYPE TIMESTAMPTZ(3) USING "pickup_target_at" AT TIME ZONE 'UTC',
ALTER COLUMN "handoff_at" SET DATA TYPE TIMESTAMPTZ(3) USING "handoff_at" AT TIME ZONE 'UTC',
ALTER COLUMN "collection_due_at" SET DATA TYPE TIMESTAMPTZ(3) USING "collection_due_at" AT TIME ZONE 'UTC',
ALTER COLUMN "planned_at" SET DATA TYPE TIMESTAMPTZ(3) USING "planned_at" AT TIME ZONE 'UTC',
ALTER COLUMN "partner_selection_deadline_at" SET DATA TYPE TIMESTAMPTZ(3) USING "partner_selection_deadline_at" AT TIME ZONE 'UTC',
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC',
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMPTZ(3) USING "updated_at" AT TIME ZONE 'UTC';

-- AlterTable
ALTER TABLE "order_events" ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC';

-- AlterTable
ALTER TABLE "order_exceptions" ALTER COLUMN "resolved_at" SET DATA TYPE TIMESTAMPTZ(3) USING "resolved_at" AT TIME ZONE 'UTC',
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC',
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMPTZ(3) USING "updated_at" AT TIME ZONE 'UTC';

-- AlterTable
ALTER TABLE "order_info_requests" ALTER COLUMN "requested_at" SET DATA TYPE TIMESTAMPTZ(3) USING "requested_at" AT TIME ZONE 'UTC',
ALTER COLUMN "due_at" SET DATA TYPE TIMESTAMPTZ(3) USING "due_at" AT TIME ZONE 'UTC',
ALTER COLUMN "response_received_at" SET DATA TYPE TIMESTAMPTZ(3) USING "response_received_at" AT TIME ZONE 'UTC',
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC',
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMPTZ(3) USING "updated_at" AT TIME ZONE 'UTC';

-- AlterTable
ALTER TABLE "order_payments" ALTER COLUMN "collected_at" SET DATA TYPE TIMESTAMPTZ(3) USING "collected_at" AT TIME ZONE 'UTC',
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC';

-- AlterTable
ALTER TABLE "order_qc_records" ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC',
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMPTZ(3) USING "updated_at" AT TIME ZONE 'UTC';

-- AlterTable
ALTER TABLE "orders" ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC',
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMPTZ(3) USING "updated_at" AT TIME ZONE 'UTC';

-- AlterTable
ALTER TABLE "organizations" ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC',
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMPTZ(3) USING "updated_at" AT TIME ZONE 'UTC',
ALTER COLUMN "legal_hold_until" SET DATA TYPE TIMESTAMPTZ(3) USING "legal_hold_until" AT TIME ZONE 'UTC';

-- AlterTable
ALTER TABLE "partner_marketplace_share_links" ALTER COLUMN "expires_at" SET DATA TYPE TIMESTAMPTZ(3) USING "expires_at" AT TIME ZONE 'UTC',
ALTER COLUMN "revoked_at" SET DATA TYPE TIMESTAMPTZ(3) USING "revoked_at" AT TIME ZONE 'UTC',
ALTER COLUMN "last_viewed_at" SET DATA TYPE TIMESTAMPTZ(3) USING "last_viewed_at" AT TIME ZONE 'UTC',
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC';

-- AlterTable
ALTER TABLE "partner_marketplace_stores" ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC',
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMPTZ(3) USING "updated_at" AT TIME ZONE 'UTC';

-- AlterTable
ALTER TABLE "partners" ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC',
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMPTZ(3) USING "updated_at" AT TIME ZONE 'UTC';

-- AlterTable
ALTER TABLE "platform_audit_logs" ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC';

-- AlterTable
ALTER TABLE "platform_operators" ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC',
ALTER COLUMN "revoked_at" SET DATA TYPE TIMESTAMPTZ(3) USING "revoked_at" AT TIME ZONE 'UTC';

-- AlterTable
ALTER TABLE "platform_secrets" ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMPTZ(3) USING "updated_at" AT TIME ZONE 'UTC';

-- AlterTable
ALTER TABLE "platform_settings" ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMPTZ(3) USING "updated_at" AT TIME ZONE 'UTC';

-- AlterTable
ALTER TABLE "pricing_rules" ALTER COLUMN "effective_from" SET DATA TYPE TIMESTAMPTZ(3) USING "effective_from" AT TIME ZONE 'UTC';

-- AlterTable
ALTER TABLE "print_renditions" ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC',
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMPTZ(3) USING "updated_at" AT TIME ZONE 'UTC';

-- AlterTable
ALTER TABLE "product_analyses" ALTER COLUMN "approved_at" SET DATA TYPE TIMESTAMPTZ(3) USING "approved_at" AT TIME ZONE 'UTC',
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC';

-- AlterTable
ALTER TABLE "product_analysis_runs" ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC';

-- AlterTable
ALTER TABLE "product_bookings" ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC';

-- AlterTable
ALTER TABLE "product_change_requests" ALTER COLUMN "base_updated_at" SET DATA TYPE TIMESTAMPTZ(3) USING "base_updated_at" AT TIME ZONE 'UTC',
ALTER COLUMN "reviewed_at" SET DATA TYPE TIMESTAMPTZ(3) USING "reviewed_at" AT TIME ZONE 'UTC',
ALTER COLUMN "expires_at" SET DATA TYPE TIMESTAMPTZ(3) USING "expires_at" AT TIME ZONE 'UTC',
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC',
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMPTZ(3) USING "updated_at" AT TIME ZONE 'UTC';

-- AlterTable
ALTER TABLE "product_copies" ALTER COLUMN "approved_at" SET DATA TYPE TIMESTAMPTZ(3) USING "approved_at" AT TIME ZONE 'UTC',
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC';

-- AlterTable
ALTER TABLE "product_import_batches" ALTER COLUMN "undone_at" SET DATA TYPE TIMESTAMPTZ(3) USING "undone_at" AT TIME ZONE 'UTC',
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC';

-- AlterTable
ALTER TABLE "product_inventory" ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMPTZ(3) USING "updated_at" AT TIME ZONE 'UTC';

-- AlterTable
ALTER TABLE "product_recipes" ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC',
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMPTZ(3) USING "updated_at" AT TIME ZONE 'UTC';

-- AlterTable
ALTER TABLE "product_revisions" ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC';

-- AlterTable
ALTER TABLE "products" ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC',
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMPTZ(3) USING "updated_at" AT TIME ZONE 'UTC';

-- AlterTable
ALTER TABLE "provider_health" ALTER COLUMN "last_checked_at" SET DATA TYPE TIMESTAMPTZ(3) USING "last_checked_at" AT TIME ZONE 'UTC';

-- AlterTable
ALTER TABLE "quotation_items" ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC',
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMPTZ(3) USING "updated_at" AT TIME ZONE 'UTC';

-- AlterTable
ALTER TABLE "quotation_revisions" ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC';

-- AlterTable
ALTER TABLE "quotations" ALTER COLUMN "valid_until" SET DATA TYPE TIMESTAMPTZ(3) USING "valid_until" AT TIME ZONE 'UTC',
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC',
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMPTZ(3) USING "updated_at" AT TIME ZONE 'UTC';

-- AlterTable
ALTER TABLE "research_runs" ALTER COLUMN "started_at" SET DATA TYPE TIMESTAMPTZ(3) USING "started_at" AT TIME ZONE 'UTC',
ALTER COLUMN "completed_at" SET DATA TYPE TIMESTAMPTZ(3) USING "completed_at" AT TIME ZONE 'UTC',
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC';

-- AlterTable
ALTER TABLE "roles" ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC';

-- AlterTable
ALTER TABLE "sales_channel_listings" ALTER COLUMN "last_synced_at" SET DATA TYPE TIMESTAMPTZ(3) USING "last_synced_at" AT TIME ZONE 'UTC',
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC',
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMPTZ(3) USING "updated_at" AT TIME ZONE 'UTC';

-- AlterTable
ALTER TABLE "sales_channel_orders" ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC',
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMPTZ(3) USING "updated_at" AT TIME ZONE 'UTC';

-- AlterTable
ALTER TABLE "sessions" ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC',
ALTER COLUMN "expires_at" SET DATA TYPE TIMESTAMPTZ(3) USING "expires_at" AT TIME ZONE 'UTC',
ALTER COLUMN "revoked_at" SET DATA TYPE TIMESTAMPTZ(3) USING "revoked_at" AT TIME ZONE 'UTC';

-- AlterTable
ALTER TABLE "shop_reviews" ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC',
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMPTZ(3) USING "updated_at" AT TIME ZONE 'UTC';

-- AlterTable
ALTER TABLE "short_links" ALTER COLUMN "expires_at" SET DATA TYPE TIMESTAMPTZ(3) USING "expires_at" AT TIME ZONE 'UTC',
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC',
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMPTZ(3) USING "updated_at" AT TIME ZONE 'UTC';

-- AlterTable
ALTER TABLE "staff_notifications" ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC';

-- AlterTable
ALTER TABLE "storage_outbox" ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC',
ALTER COLUMN "done_at" SET DATA TYPE TIMESTAMPTZ(3) USING "done_at" AT TIME ZONE 'UTC';

-- AlterTable
ALTER TABLE "store_share_links" ALTER COLUMN "revoked_at" SET DATA TYPE TIMESTAMPTZ(3) USING "revoked_at" AT TIME ZONE 'UTC',
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC',
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMPTZ(3) USING "updated_at" AT TIME ZONE 'UTC';

-- AlterTable
ALTER TABLE "template_overrides" ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC',
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMPTZ(3) USING "updated_at" AT TIME ZONE 'UTC';

-- AlterTable
ALTER TABLE "topic_scores" ALTER COLUMN "calculated_at" SET DATA TYPE TIMESTAMPTZ(3) USING "calculated_at" AT TIME ZONE 'UTC';

-- AlterTable
ALTER TABLE "topic_signals" ALTER COLUMN "captured_at" SET DATA TYPE TIMESTAMPTZ(3) USING "captured_at" AT TIME ZONE 'UTC';

-- AlterTable
ALTER TABLE "topics" ALTER COLUMN "first_seen_at" SET DATA TYPE TIMESTAMPTZ(3) USING "first_seen_at" AT TIME ZONE 'UTC',
ALTER COLUMN "last_seen_at" SET DATA TYPE TIMESTAMPTZ(3) USING "last_seen_at" AT TIME ZONE 'UTC';

-- AlterTable
ALTER TABLE "trend_signals" ALTER COLUMN "captured_at" SET DATA TYPE TIMESTAMPTZ(3) USING "captured_at" AT TIME ZONE 'UTC',
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC';

-- AlterTable
ALTER TABLE "trend_timeseries" ALTER COLUMN "date" SET DATA TYPE TIMESTAMPTZ(3) USING "date" AT TIME ZONE 'UTC';

-- AlterTable
ALTER TABLE "usage" ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC';

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC',
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMPTZ(3) USING "updated_at" AT TIME ZONE 'UTC',
ALTER COLUMN "approval_decided_at" SET DATA TYPE TIMESTAMPTZ(3) USING "approval_decided_at" AT TIME ZONE 'UTC';

-- AlterTable
ALTER TABLE "video_jobs" ALTER COLUMN "script_approved_at" SET DATA TYPE TIMESTAMPTZ(3) USING "script_approved_at" AT TIME ZONE 'UTC',
ALTER COLUMN "video_approved_at" SET DATA TYPE TIMESTAMPTZ(3) USING "video_approved_at" AT TIME ZONE 'UTC',
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC',
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMPTZ(3) USING "updated_at" AT TIME ZONE 'UTC';

-- AlterTable
ALTER TABLE "video_scenes" ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC';

-- AlterTable
ALTER TABLE "voice_clones" ALTER COLUMN "consented_at" SET DATA TYPE TIMESTAMPTZ(3) USING "consented_at" AT TIME ZONE 'UTC',
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC',
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMPTZ(3) USING "updated_at" AT TIME ZONE 'UTC',
ALTER COLUMN "deleted_at" SET DATA TYPE TIMESTAMPTZ(3) USING "deleted_at" AT TIME ZONE 'UTC';

-- AlterTable
ALTER TABLE "voucher_batches" ALTER COLUMN "starts_at" SET DATA TYPE TIMESTAMPTZ(3) USING "starts_at" AT TIME ZONE 'UTC',
ALTER COLUMN "expires_at" SET DATA TYPE TIMESTAMPTZ(3) USING "expires_at" AT TIME ZONE 'UTC',
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC';

-- AlterTable
ALTER TABLE "voucher_redemptions" ALTER COLUMN "redeemed_at" SET DATA TYPE TIMESTAMPTZ(3) USING "redeemed_at" AT TIME ZONE 'UTC',
ALTER COLUMN "released_at" SET DATA TYPE TIMESTAMPTZ(3) USING "released_at" AT TIME ZONE 'UTC';

-- AlterTable
ALTER TABLE "vouchers" ALTER COLUMN "expires_at" SET DATA TYPE TIMESTAMPTZ(3) USING "expires_at" AT TIME ZONE 'UTC',
ALTER COLUMN "used_at" SET DATA TYPE TIMESTAMPTZ(3) USING "used_at" AT TIME ZONE 'UTC',
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC',
ALTER COLUMN "starts_at" SET DATA TYPE TIMESTAMPTZ(3) USING "starts_at" AT TIME ZONE 'UTC';

-- AlterTable
ALTER TABLE "workspaces" ALTER COLUMN "trial_reset_at" SET DATA TYPE TIMESTAMPTZ(3) USING "trial_reset_at" AT TIME ZONE 'UTC',
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC';

COMMIT;
