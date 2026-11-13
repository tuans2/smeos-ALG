-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "organization_type" AS ENUM ('EXPERIENCE', 'SINGLE', 'STORE', 'CHAIN', 'FLOWER_NETWORK');

-- CreateEnum
CREATE TYPE "workspace_kind" AS ENUM ('EXPERIENCE', 'PRODUCTION');

-- CreateEnum
CREATE TYPE "membership_status" AS ENUM ('INVITED', 'ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "trial_status" AS ENUM ('ACTIVE', 'EXHAUSTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "capability_scope" AS ENUM ('ORGANIZATION', 'BRANCH', 'STORE', 'FLOWER_NETWORK');

-- CreateEnum
CREATE TYPE "ai_mode" AS ENUM ('API', 'SELF_HOST', 'DETERMINISTIC');

-- CreateEnum
CREATE TYPE "ai_privacy_level" AS ENUM ('PUBLIC', 'SHOP', 'SENSITIVE');

-- CreateEnum
CREATE TYPE "ai_measure_state" AS ENUM ('CHUA_DO', 'THU_NGHIEM', 'SAN_XUAT');

-- CreateEnum
CREATE TYPE "asset_kind" AS ENUM ('ORIGINAL', 'ANALYZED', 'ENHANCED', 'MASTER', 'MARKETING', 'CATALOG', 'LANDING', 'SOCIAL', 'VIDEO', 'RATIO');

-- CreateEnum
CREATE TYPE "asset_state" AS ENUM ('PROCESSING', 'READY', 'FAILED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "job_status" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "product_status" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "stock_status" AS ENUM ('IN_STOCK', 'PRE_ORDER_ONLY', 'OUT_OF_STOCK');

-- CreateEnum
CREATE TYPE "approval_state" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "integration_client" AS ENUM ('LOCALBUDD', 'SOCIALFLOW');

-- CreateEnum
CREATE TYPE "occasion_register" AS ENUM ('FESTIVE', 'NEUTRAL', 'SOLEMN');

-- CreateEnum
CREATE TYPE "template_family" AS ENUM ('GT', 'IT', 'CT', 'ST', 'OT');

-- CreateEnum
CREATE TYPE "video_format" AS ENUM ('REEL_15S', 'TIKTOK_30S', 'STORY_15S', 'SLIDESHOW', 'PRODUCT_PAGE', 'AD_MOTION');

-- CreateEnum
CREATE TYPE "video_stage" AS ENUM ('DRAFT', 'SCRIPT_GENERATING', 'SCRIPT_READY', 'SCRIPT_APPROVED', 'RENDERING', 'RENDER_COMPLETED', 'APPROVED', 'REJECTED', 'FAILED');

-- CreateEnum
CREATE TYPE "order_status" AS ENUM ('DRAFT', 'CONFIRMED', 'PROCESSING', 'DELIVERED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "production_status" AS ENUM ('WAITING', 'ASSIGNED', 'ARRANGING', 'QUALITY_CHECK', 'READY');

-- CreateEnum
CREATE TYPE "delivery_status" AS ENUM ('PENDING', 'DISPATCHED', 'DELIVERING', 'DELIVERED', 'FAILED');

-- CreateEnum
CREATE TYPE "customer_tier" AS ENUM ('NEW', 'BRONZE', 'SILVER', 'GOLD', 'VIP');

-- CreateEnum
CREATE TYPE "consent_channel" AS ENUM ('ZALO_ZNS', 'SMS', 'PHONE_CALL', 'PROMOTION');

-- CreateEnum
CREATE TYPE "voucher_discount_type" AS ENUM ('PERCENTAGE', 'FIXED_AMOUNT');

-- CreateEnum
CREATE TYPE "chat_channel" AS ENUM ('WEB_WIDGET', 'INTERNAL_DASHBOARD', 'STOREFRONT_CATALOG', 'LANDING_PAGE', 'FACEBOOK_MESSENGER', 'ZALO_OA', 'EMBEDDED_WIDGET', 'ZALO');

-- CreateEnum
CREATE TYPE "chat_sender_type" AS ENUM ('USER', 'ASSISTANT', 'SYSTEM');

-- CreateEnum
CREATE TYPE "field_origin" AS ENUM ('CORE', 'CUSTOM');

-- CreateEnum
CREATE TYPE "field_requirement_level" AS ENUM ('OPTIONAL', 'RECOMMENDED', 'REQUIRED');

-- CreateEnum
CREATE TYPE "field_sensitivity" AS ENUM ('NORMAL', 'PII', 'SENSITIVE');

-- CreateEnum
CREATE TYPE "field_status" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "field_catalog_governance" AS ENUM ('OPEN', 'BEHAVIOR', 'CLOSED');

-- CreateEnum
CREATE TYPE "field_override_target" AS ENUM ('FIELD', 'CATALOG_VALUE');

-- CreateEnum
CREATE TYPE "market_source_status" AS ENUM ('ACTIVE', 'DEGRADED', 'DISABLED');

-- CreateEnum
CREATE TYPE "trend_topic_status" AS ENUM ('EMERGING', 'RISING', 'STABLE', 'DECLINING', 'SEASONAL', 'BREAKOUT');

-- CreateEnum
CREATE TYPE "research_run_type" AS ENUM ('DAILY_DEEP', 'INTRADAY_PULSE', 'WEEKLY_DEEP', 'MANUAL');

-- CreateEnum
CREATE TYPE "research_run_status" AS ENUM ('PENDING', 'RUNNING', 'PARTIAL_SUCCESS', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "provider_health_status" AS ENUM ('HEALTHY', 'DEGRADED', 'UNAVAILABLE');

-- CreateEnum
CREATE TYPE "order_payment_kind" AS ENUM ('DEPOSIT', 'BALANCE', 'REFUND');

-- CreateEnum
CREATE TYPE "order_info_request_status" AS ENUM ('OPEN', 'SENT', 'WAITING', 'RECEIVED', 'OVERDUE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "order_change_type" AS ENUM ('PRODUCT', 'FLOWERS', 'COLOR', 'WRAPPING', 'ACCESSORY', 'CARD_MESSAGE', 'ADDRESS', 'RECIPIENT', 'DELIVERY_DATE', 'DELIVERY_TIME', 'PRICE', 'QUANTITY', 'PARTNER', 'OTHER');

-- CreateEnum
CREATE TYPE "order_change_request_status" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'APPLIED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "coordinator_stage" AS ENUM ('INTAKE', 'VALIDATING', 'PLANNING', 'ASSIGNING', 'IN_PRODUCTION', 'QUALITY_CHECK', 'DISPATCHING', 'DELIVERED', 'COMPLETED', 'EXCEPTION', 'CANCELLED');

-- CreateEnum
CREATE TYPE "coordination_risk_level" AS ENUM ('NORMAL', 'ATTENTION', 'AT_RISK', 'CRITICAL');

-- CreateEnum
CREATE TYPE "qc_record_status" AS ENUM ('PENDING', 'PASSED', 'REJECTED', 'REWORK_REQUESTED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT,
    "name" TEXT,
    "avatar_url" TEXT,
    "phone" TEXT,
    "locale" TEXT NOT NULL DEFAULT 'vi',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "organization_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "type" "organization_type" NOT NULL DEFAULT 'SINGLE',
    "credit_balance" INTEGER NOT NULL DEFAULT 0,
    "credit_plan" TEXT,
    "settings" JSONB,
    "data_region" TEXT DEFAULT 'vn',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspaces" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "workspace_kind" NOT NULL DEFAULT 'PRODUCTION',
    "trial_count" INTEGER NOT NULL DEFAULT 0,
    "trial_limit" INTEGER,
    "trial_reset_at" TIMESTAMP(3),
    "trial_status" "trial_status",
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workspaces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "branches" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "address" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "branches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_capabilities" (
    "id" TEXT NOT NULL,
    "role_id" TEXT NOT NULL,
    "capability_code" TEXT NOT NULL,
    "scope" "capability_scope" NOT NULL DEFAULT 'ORGANIZATION',

    CONSTRAINT "role_capabilities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "capability_overrides" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "role_id" TEXT NOT NULL,
    "capability_code" TEXT NOT NULL,
    "allowed" BOOLEAN NOT NULL,
    "updated_by" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "capability_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "memberships" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role_id" TEXT NOT NULL,
    "branch_id" TEXT,
    "status" "membership_status" NOT NULL DEFAULT 'INVITED',
    "invited_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "joined_at" TIMESTAMP(3),

    CONSTRAINT "memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assets" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "product_id" TEXT,
    "parent_asset_id" TEXT,
    "kind" "asset_kind" NOT NULL,
    "state" "asset_state" NOT NULL DEFAULT 'PROCESSING',
    "version" INTEGER NOT NULL DEFAULT 1,
    "storage_key" TEXT NOT NULL,
    "thumb_key" TEXT,
    "mime_type" TEXT NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "aspect_ratio" TEXT,
    "file_size" INTEGER,
    "provider" TEXT,
    "model" TEXT,
    "model_version" TEXT,
    "pipeline_version" TEXT,
    "parameters" JSONB,
    "prompt" TEXT,
    "input_sha256" TEXT,
    "output_sha256" TEXT,
    "quality_score" DOUBLE PRECISION,
    "identity_score" DOUBLE PRECISION,
    "generated_flags" JSONB,
    "cost_usd" DOUBLE PRECISION,
    "approval_state" "approval_state" NOT NULL DEFAULT 'PENDING',
    "approved_by" TEXT,
    "approved_at" TIMESTAMP(3),
    "metadata" JSONB,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "generation_jobs" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "branch_id" TEXT,
    "user_id" TEXT NOT NULL,
    "product_id" TEXT,
    "feature" TEXT NOT NULL,
    "status" "job_status" NOT NULL DEFAULT 'PENDING',
    "stage" TEXT,
    "result" TEXT,
    "idempotency_key" TEXT,
    "job_group_id" TEXT,
    "payload" JSONB NOT NULL,
    "output" JSONB,
    "error" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),

    CONSTRAINT "generation_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_events" (
    "id" TEXT NOT NULL,
    "job_id" TEXT NOT NULL,
    "seq" INTEGER NOT NULL,
    "event" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "job_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usage" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "job_id" TEXT,
    "feature" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "cost_credit" INTEGER NOT NULL DEFAULT 0,
    "cost_usd" DOUBLE PRECISION,
    "status" TEXT NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "ip" TEXT,
    "user_agent" TEXT,
    "decision_id" TEXT,
    "ownership" TEXT,
    "decided_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_profiles" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "legal_name" TEXT,
    "display_name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "website" TEXT,
    "social_links" JSONB,
    "tax_code" TEXT,
    "description" TEXT,
    "operating_hours" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "business_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brand_profiles" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "primary_color" TEXT,
    "secondary_color" TEXT,
    "accent_color" TEXT,
    "background_color" TEXT,
    "text_color" TEXT,
    "font_heading" TEXT,
    "font_body" TEXT,
    "logo_asset_id" TEXT,
    "tone_of_voice" TEXT,
    "hashtags" JSONB,
    "cta_templates" JSONB,
    "default_offers" JSONB,
    "forbidden_styles" JSONB,
    "brand_assets" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "brand_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "branch_id" TEXT,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "shape" TEXT,
    "facing" TEXT,
    "container" TEXT,
    "status" "product_status" NOT NULL DEFAULT 'DRAFT',
    "attributes" JSONB,
    "availability_config" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_variants" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "size" TEXT,
    "multiplier" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "attributes" JSONB,

    CONSTRAINT "product_variants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_images" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "asset_id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "product_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_inventory" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "status" "stock_status" NOT NULL DEFAULT 'IN_STOCK',
    "quantity_available" INTEGER,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_inventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_bookings" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "order_id" TEXT,
    "check_in_date" TEXT NOT NULL,
    "check_out_date" TEXT NOT NULL,
    "note" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_analyses" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "product_id" TEXT,
    "asset_id" TEXT NOT NULL,
    "job_id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "model_version" TEXT NOT NULL,
    "contract_name" TEXT NOT NULL,
    "contract_version" TEXT NOT NULL,
    "raw" JSONB NOT NULL,
    "edited" JSONB,
    "approval_state" "approval_state" NOT NULL DEFAULT 'PENDING',
    "approved_by" TEXT,
    "approved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_analyses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pricing_rules" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "branch_id" TEXT,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "effective_from" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT NOT NULL,

    CONSTRAINT "pricing_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integration_tokens" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "client" "integration_client" NOT NULL,
    "token_hash" TEXT NOT NULL,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "rotated_from_id" TEXT,

    CONSTRAINT "integration_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_metrics" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "content_id" TEXT NOT NULL,
    "metric_date" DATE NOT NULL,
    "reach" INTEGER,
    "impressions" INTEGER,
    "engagement" INTEGER,
    "clicks" INTEGER,
    "conversions" INTEGER,
    "spend_usd" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "content_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_capabilities" (
    "code" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "needs_approval" BOOLEAN NOT NULL DEFAULT true,
    "privacy_floor" "ai_privacy_level" NOT NULL DEFAULT 'SHOP',
    "accept_threshold" DOUBLE PRECISION,
    "measure_channels" JSONB NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_capabilities_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "ai_models" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "mode" "ai_mode" NOT NULL,
    "capabilities" JSONB NOT NULL,
    "license" TEXT NOT NULL,
    "commercial_use" BOOLEAN NOT NULL,
    "territory" TEXT NOT NULL,
    "allowed_use" TEXT NOT NULL,
    "cost_class" TEXT NOT NULL,
    "latency_class" TEXT NOT NULL,
    "quality_class" TEXT NOT NULL,
    "measure_state" "ai_measure_state" NOT NULL DEFAULT 'CHUA_DO',
    "leaves_infra" BOOLEAN NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "version" TEXT NOT NULL,
    "registered_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_models_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_policies" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "capability_code" TEXT NOT NULL,
    "allowed_models" JSONB NOT NULL,
    "quality_target" TEXT,
    "cost_ceiling" INTEGER,
    "privacy_floor" "ai_privacy_level" NOT NULL,
    "updated_by" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_requests" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "job_id" TEXT,
    "capability_code" TEXT NOT NULL,
    "model_key" TEXT NOT NULL,
    "attempt" INTEGER NOT NULL DEFAULT 1,
    "escalated_from" TEXT,
    "fallback_from" TEXT,
    "source" TEXT NOT NULL,
    "input_tokens" INTEGER,
    "output_tokens" INTEGER,
    "image_count" INTEGER,
    "duration_seconds" DOUBLE PRECISION,
    "gpu_seconds" DOUBLE PRECISION,
    "cost_usd" DOUBLE PRECISION,
    "latency_ms" INTEGER,
    "quality_score" DOUBLE PRECISION,
    "outcome" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_evaluations" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "capability_code" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "scores" JSONB NOT NULL,
    "overall_score" DOUBLE PRECISION NOT NULL,
    "threshold_used" DOUBLE PRECISION,
    "needs_review" BOOLEAN NOT NULL DEFAULT false,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_evaluations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "occasions" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "register" "occasion_register" NOT NULL DEFAULT 'FESTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "occasions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "template_overrides" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "template_family" "template_family" NOT NULL,
    "template_key" TEXT NOT NULL,
    "field_key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updated_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "template_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalog_links" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "filters" JSONB,
    "is_revoked" BOOLEAN NOT NULL DEFAULT false,
    "revoked_at" TIMESTAMP(3),
    "revoked_by" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "catalog_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_copies" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "analysis_id" TEXT NOT NULL,
    "product_id" TEXT,
    "raw" JSONB NOT NULL,
    "edited" JSONB,
    "approval_state" "approval_state" NOT NULL DEFAULT 'PENDING',
    "approved_by" TEXT,
    "approved_at" TIMESTAMP(3),
    "profile_version" TEXT,
    "reject_reason" TEXT,
    "job_id" TEXT,
    "model_key" TEXT,
    "provider" TEXT,
    "cost_usd" DOUBLE PRECISION,
    "latency_ms" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_copies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "video_jobs" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "product_id" TEXT,
    "title" TEXT NOT NULL,
    "format" "video_format" NOT NULL,
    "stage" "video_stage" NOT NULL DEFAULT 'DRAFT',
    "script_approval" "approval_state" NOT NULL DEFAULT 'PENDING',
    "script_approved_at" TIMESTAMP(3),
    "script_approved_by" TEXT,
    "video_approval" "approval_state" NOT NULL DEFAULT 'PENDING',
    "video_approved_at" TIMESTAMP(3),
    "video_approved_by" TEXT,
    "duration_seconds" INTEGER NOT NULL DEFAULT 15,
    "aspect_ratio" TEXT NOT NULL DEFAULT '9:16',
    "music_track" TEXT,
    "voice_code" TEXT,
    "has_subtitle" BOOLEAN NOT NULL DEFAULT true,
    "caption_style" TEXT NOT NULL DEFAULT 'MODERN_BADGE',
    "has_watermark" BOOLEAN NOT NULL DEFAULT false,
    "scene_plan_id" TEXT,
    "scene_plan_revision" INTEGER,
    "audio_job_id" TEXT,
    "audio_storage_key" TEXT,
    "final_video_url" TEXT,
    "final_asset_id" TEXT,
    "cost_credits" INTEGER NOT NULL DEFAULT 0,
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "video_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "video_scenes" (
    "id" TEXT NOT NULL,
    "video_job_id" TEXT NOT NULL,
    "scene_index" INTEGER NOT NULL,
    "duration_seconds" DOUBLE PRECISION NOT NULL DEFAULT 3.0,
    "image_asset_id" TEXT,
    "text_overlay" TEXT,
    "voice_script" TEXT,
    "transition_effect" TEXT DEFAULT 'fade',
    "motion_effect" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "video_scenes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "branch_id" TEXT,
    "code" TEXT NOT NULL,
    "customer_id" TEXT,
    "status" "order_status" NOT NULL DEFAULT 'DRAFT',
    "production_status" "production_status" NOT NULL DEFAULT 'WAITING',
    "delivery_status" "delivery_status" NOT NULL DEFAULT 'PENDING',
    "total_vnd" DECIMAL(14,2) NOT NULL,
    "paid_vnd" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "balance_vnd" DECIMAL(14,2) NOT NULL,
    "pricing_rule_ref" JSONB,
    "voucher_id" TEXT,
    "card_message" TEXT,
    "internal_note" TEXT,
    "delivery_window" JSONB,
    "delivery_address" JSONB,
    "vat_enabled" BOOLEAN NOT NULL DEFAULT false,
    "vat_rate" INTEGER NOT NULL DEFAULT 10,
    "vat_amount_vnd" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "vat_company_name" TEXT,
    "vat_tax_code" TEXT,
    "vat_company_address" TEXT,
    "vat_email" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "source" TEXT DEFAULT 'MANUAL',
    "source_session_id" TEXT,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "product_id" TEXT,
    "variant_id" TEXT,
    "description" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unit_price_vnd" DECIMAL(14,2) NOT NULL,
    "metadata" JSONB,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_assignments" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "assignee_id" TEXT NOT NULL,
    "assigned_by" TEXT NOT NULL,
    "difficulty" TEXT,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "released_at" TIMESTAMP(3),

    CONSTRAINT "order_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_events" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "axis" TEXT NOT NULL,
    "from_value" TEXT,
    "to_value" TEXT NOT NULL,
    "actor_id" TEXT,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "address" TEXT,
    "tier" "customer_tier" NOT NULL DEFAULT 'NEW',
    "notes" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "preferred_flowers" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "preferred_colors" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "total_spent" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "order_count" INTEGER NOT NULL DEFAULT 0,
    "last_order_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_occasions" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "is_recurring" BOOLEAN NOT NULL DEFAULT true,
    "reminder_days_before" INTEGER NOT NULL DEFAULT 7,
    "recipient_name" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_occasions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_consents" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "channel" "consent_channel" NOT NULL,
    "granted" BOOLEAN NOT NULL DEFAULT true,
    "granted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_consents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vouchers" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "customer_id" TEXT,
    "code" TEXT NOT NULL,
    "discount_type" "voucher_discount_type" NOT NULL DEFAULT 'PERCENTAGE',
    "discount_value" DECIMAL(14,2) NOT NULL,
    "min_order_vnd" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "max_discount_vnd" DECIMAL(14,2),
    "expires_at" TIMESTAMP(3),
    "is_used" BOOLEAN NOT NULL DEFAULT false,
    "used_at" TIMESTAMP(3),
    "order_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vouchers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_conversations" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "customer_id" TEXT,
    "title" TEXT NOT NULL DEFAULT 'Hội thoại tư vấn hoa',
    "channel" "chat_channel" NOT NULL DEFAULT 'WEB_WIDGET',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chat_conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_messages" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "sender_type" "chat_sender_type" NOT NULL,
    "content" TEXT NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_channel_integrations" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "channel" "chat_channel" NOT NULL,
    "is_enabled" BOOLEAN NOT NULL DEFAULT false,
    "config" JSONB NOT NULL DEFAULT '{}',
    "subscription_expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chat_channel_integrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "flower_taxonomy" (
    "ma_loai" TEXT NOT NULL,
    "nhom" TEXT NOT NULL,
    "cong_nang" TEXT,
    "ten_chuan" TEXT NOT NULL,
    "ten_khac" JSONB NOT NULL,
    "nhom_hoa" TEXT,
    "dvt_chuan" TEXT,
    "so_bong_tren_dvt" INTEGER,
    "duong_kinh_bong_cm" DOUBLE PRECISION,
    "dien_tich_phu_cm2" DOUBLE PRECISION,
    "ty_le_nhuy_tren_bong" DOUBLE PRECISION,
    "mau_nhuy" TEXT,
    "kieu_moc" TEXT,
    "dai_mau_tu_nhien" JSONB,
    "dac_diem_phan_biet" TEXT,
    "mua_vu" TEXT,
    "trang_thai" TEXT NOT NULL DEFAULT 'Đang dùng',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "flower_taxonomy_pkey" PRIMARY KEY ("ma_loai")
);

-- CreateTable
CREATE TABLE "flower_confusable_pairs" (
    "ma_cap" TEXT NOT NULL,
    "ma_loai_a" TEXT NOT NULL,
    "ma_loai_b" TEXT NOT NULL,
    "dau_hieu_tach_a" TEXT NOT NULL,
    "dau_hieu_tach_b" TEXT NOT NULL,
    "muc_do_nham" TEXT NOT NULL,

    CONSTRAINT "flower_confusable_pairs_pkey" PRIMARY KEY ("ma_cap")
);

-- CreateTable
CREATE TABLE "platform_operators" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "granted_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMP(3),

    CONSTRAINT "platform_operators_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_role_capabilities" (
    "id" TEXT NOT NULL,
    "operator_id" TEXT NOT NULL,
    "capability_code" TEXT NOT NULL,

    CONSTRAINT "platform_role_capabilities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_audit_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "ip" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "field_definitions" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "origin" "field_origin" NOT NULL DEFAULT 'CORE',
    "data_type" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "placeholder" TEXT,
    "placements" JSONB,
    "requirement" "field_requirement_level" NOT NULL DEFAULT 'OPTIONAL',
    "required_at_stage" TEXT,
    "visibility" JSONB,
    "validation" JSONB,
    "catalog_key" TEXT,
    "sensitivity" "field_sensitivity" NOT NULL DEFAULT 'NORMAL',
    "floor_internal_only" BOOLEAN NOT NULL DEFAULT false,
    "status" "field_status" NOT NULL DEFAULT 'ACTIVE',
    "default_enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_by" TEXT,
    "updated_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "field_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "field_catalogs" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "governance" "field_catalog_governance" NOT NULL DEFAULT 'OPEN',
    "behavior_kind" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "field_catalogs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "field_catalog_values" (
    "id" TEXT NOT NULL,
    "catalog_key" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "behavior" TEXT,
    "params" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "field_catalog_values_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "field_config_overrides" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "target" "field_override_target" NOT NULL,
    "override_key" TEXT NOT NULL,
    "label" TEXT,
    "visibility" JSONB,
    "requirement" "field_requirement_level",
    "is_enabled" BOOLEAN,
    "created_by" TEXT,
    "updated_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "field_config_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "market_sources" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "source_type" TEXT NOT NULL,
    "status" "market_source_status" NOT NULL DEFAULT 'ACTIVE',
    "last_success_at" TIMESTAMP(3),
    "last_error_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "market_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trend_signals" (
    "id" TEXT NOT NULL,
    "source_id" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "country_code" TEXT NOT NULL DEFAULT 'VN',
    "region_code" TEXT,
    "city" TEXT,
    "industry" TEXT NOT NULL DEFAULT 'florist',
    "topic_raw" TEXT NOT NULL,
    "metric_name" TEXT NOT NULL,
    "metric_value" DOUBLE PRECISION NOT NULL,
    "growth_rate" DOUBLE PRECISION,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "captured_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trend_signals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trend_timeseries" (
    "id" TEXT NOT NULL,
    "topic_id" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "geo_scope" TEXT NOT NULL DEFAULT 'VN',
    "date" TIMESTAMP(3) NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "growth_rate" DOUBLE PRECISION,
    "velocity" DOUBLE PRECISION,
    "acceleration" DOUBLE PRECISION,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 1.0,

    CONSTRAINT "trend_timeseries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "topics" (
    "id" TEXT NOT NULL,
    "canonical_name" TEXT NOT NULL,
    "description" TEXT,
    "language" TEXT NOT NULL DEFAULT 'vi',
    "industry" TEXT NOT NULL DEFAULT 'florist',
    "status" "trend_topic_status" NOT NULL DEFAULT 'EMERGING',
    "first_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "topics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "topic_signals" (
    "id" TEXT NOT NULL,
    "topic_id" TEXT NOT NULL,
    "source_id" TEXT NOT NULL,
    "external_reference" TEXT,
    "signal_type" TEXT NOT NULL,
    "signal_value" DOUBLE PRECISION NOT NULL,
    "captured_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "topic_signals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "topic_scores" (
    "id" TEXT NOT NULL,
    "topic_id" TEXT NOT NULL,
    "geo_scope" TEXT NOT NULL DEFAULT 'VN',
    "industry" TEXT NOT NULL DEFAULT 'florist',
    "period" TEXT NOT NULL DEFAULT '7d',
    "trend_score" DOUBLE PRECISION NOT NULL,
    "viral_score" DOUBLE PRECISION NOT NULL,
    "commercial_score" DOUBLE PRECISION NOT NULL,
    "content_opportunity_score" DOUBLE PRECISION NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "calculated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "model_version" TEXT NOT NULL DEFAULT 'v1_florist',

    CONSTRAINT "topic_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_opportunities" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "topic_id" TEXT NOT NULL,
    "audience" TEXT,
    "opportunity_summary" TEXT NOT NULL,
    "content_angles" JSONB NOT NULL,
    "recommended_formats" JSONB NOT NULL,
    "recommended_hooks" JSONB NOT NULL,
    "trend_score" DOUBLE PRECISION NOT NULL,
    "viral_score" DOUBLE PRECISION NOT NULL,
    "commercial_score" DOUBLE PRECISION NOT NULL,
    "content_opportunity_score" DOUBLE PRECISION NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "content_opportunities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_analysis_runs" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "asset_id" TEXT NOT NULL,
    "product_name" TEXT NOT NULL,
    "trend_fit_score" DOUBLE PRECISION NOT NULL,
    "audience_fit_score" DOUBLE PRECISION NOT NULL,
    "content_fit_score" DOUBLE PRECISION NOT NULL,
    "overall_fit" TEXT NOT NULL,
    "report" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_analysis_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "research_runs" (
    "id" TEXT NOT NULL,
    "run_type" "research_run_type" NOT NULL DEFAULT 'DAILY_DEEP',
    "status" "research_run_status" NOT NULL DEFAULT 'PENDING',
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "sources_attempted" INTEGER NOT NULL DEFAULT 0,
    "sources_succeeded" INTEGER NOT NULL DEFAULT 0,
    "sources_failed" INTEGER NOT NULL DEFAULT 0,
    "records_collected" INTEGER NOT NULL DEFAULT 0,
    "topics_created" INTEGER NOT NULL DEFAULT 0,
    "opportunities_created" INTEGER NOT NULL DEFAULT 0,
    "error_summary" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "research_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provider_health" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "status" "provider_health_status" NOT NULL DEFAULT 'HEALTHY',
    "latency_ms" INTEGER,
    "error_rate" DOUBLE PRECISION,
    "quota_status" TEXT,
    "last_checked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "provider_health_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaign_packages" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "product_id" TEXT,
    "master_asset_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "topic" JSONB,
    "content" JSONB,
    "variant_asset_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "video_job_id" TEXT,
    "video_job_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "audio_job_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "qa_report" JSONB,
    "qa_checked_at" TIMESTAMP(3),
    "approved_by" TEXT,
    "approved_at" TIMESTAMP(3),
    "launch_plan" JSONB,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campaign_packages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_drafts" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "asset_id" TEXT NOT NULL,
    "topic_id" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "topic_title" TEXT,
    "posts" JSONB NOT NULL,
    "created_by" TEXT NOT NULL,
    "updated_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "content_drafts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_generations" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "job_id" TEXT,
    "origin" TEXT NOT NULL,
    "asset_id" TEXT,
    "product_id" TEXT,
    "topic_id" TEXT,
    "scene_plan_id" TEXT,
    "mode" TEXT,
    "channels" JSONB NOT NULL,
    "brief" JSONB NOT NULL,
    "brief_version" INTEGER NOT NULL,
    "prompt_versions" JSONB NOT NULL,
    "rubric_version" TEXT NOT NULL,
    "strategy" JSONB,
    "posts" JSONB NOT NULL,
    "overall_score" DOUBLE PRECISION,
    "approved_posts" JSONB,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "social_post_ids" JSONB,
    "created_by" TEXT NOT NULL,
    "approved_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "content_generations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "voice_clones" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'elevenlabs',
    "provider_voice_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "sample_storage_key" TEXT NOT NULL,
    "sample_mime_type" TEXT NOT NULL,
    "sample_bytes" INTEGER NOT NULL,
    "consent_text" TEXT NOT NULL,
    "consented_by" TEXT NOT NULL,
    "consented_at" TIMESTAMP(3) NOT NULL,
    "job_id" TEXT,
    "error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "voice_clones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "music_tracks" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "mood" TEXT NOT NULL,
    "storage_key" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "file_bytes" INTEGER NOT NULL,
    "duration_seconds" DOUBLE PRECISION,
    "license_type" TEXT NOT NULL,
    "license_source" TEXT NOT NULL,
    "license_note" TEXT,
    "attested_by" TEXT NOT NULL,
    "attested_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "music_tracks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partners" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "address" TEXT,
    "district" TEXT,
    "province" TEXT,
    "tier" TEXT NOT NULL DEFAULT 'STANDARD',
    "rating" DECIMAL(3,2) NOT NULL DEFAULT 5.0,
    "capacity_daily" INTEGER NOT NULL DEFAULT 10,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "custom_fields" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "partners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_coordinations" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "partner_id" TEXT,
    "coordinator_id" TEXT,
    "stage" "coordinator_stage" NOT NULL DEFAULT 'INTAKE',
    "risk_level" "coordination_risk_level" NOT NULL DEFAULT 'NORMAL',
    "risk_reason" TEXT,
    "next_action" TEXT,
    "next_action_due" TIMESTAMP(3),
    "estimated_delivery_at" TIMESTAMP(3),
    "actual_delivery_at" TIMESTAMP(3),
    "resume_stage" "coordinator_stage",
    "production_progress" INTEGER NOT NULL DEFAULT 0,
    "finished_asset_ids" JSONB,
    "sample_asset_id" TEXT,
    "shipper_name" TEXT,
    "shipper_phone" TEXT,
    "carrier" TEXT,
    "delivery_state" TEXT,
    "pod_asset_id" TEXT,
    "pod_recipient_name" TEXT,
    "pod_captured_at" TIMESTAMP(3),
    "partner_payout_vnd" DECIMAL(14,2),
    "partner_rating" INTEGER,
    "closure_notes" TEXT,
    "closed_by" TEXT,
    "closed_at" TIMESTAMP(3),
    "cancelled_reason" TEXT,
    "metadata" JSONB,
    "custom_fields" JSONB,
    "source" TEXT,
    "source_reference" TEXT,
    "channel" TEXT,
    "order_type" TEXT,
    "priority" TEXT,
    "service_level" TEXT,
    "delivery_type" TEXT,
    "delivery_location_type" TEXT,
    "card_required" BOOLEAN NOT NULL DEFAULT false,
    "received_at" TIMESTAMP(3),
    "delivery_window_start" TIMESTAMP(3),
    "delivery_window_end" TIMESTAMP(3),
    "production_deadline_at" TIMESTAMP(3),
    "pickup_target_at" TIMESTAMP(3),
    "sales_owner_id" TEXT,
    "next_action_owner_id" TEXT,
    "handoff_at" TIMESTAMP(3),
    "handoff_confirmed" BOOLEAN NOT NULL DEFAULT false,
    "collection_method" TEXT,
    "collection_due_at" TIMESTAMP(3),
    "planned_at" TIMESTAMP(3),
    "production_buffer_minutes" INTEGER,
    "pickup_buffer_minutes" INTEGER,
    "planned_production_minutes" INTEGER,
    "planned_qc_buffer_minutes" INTEGER,
    "planned_pickup_minutes" INTEGER,
    "planned_delivery_minutes" INTEGER,
    "partner_selection_deadline_at" TIMESTAMP(3),
    "technical_instruction" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "order_coordinations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_payments" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "kind" "order_payment_kind" NOT NULL,
    "amount_vnd" DECIMAL(14,2) NOT NULL,
    "payment_method" TEXT,
    "reference" TEXT,
    "evidence_asset_id" TEXT,
    "collected_by" TEXT NOT NULL,
    "collected_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,
    "custom_fields" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_info_requests" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "missing_field" TEXT NOT NULL,
    "field_label" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "business_impact" TEXT,
    "requested_from" TEXT NOT NULL,
    "requested_by" TEXT NOT NULL,
    "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "due_at" TIMESTAMP(3),
    "channel" TEXT,
    "message_template" TEXT,
    "response_required" BOOLEAN NOT NULL DEFAULT true,
    "response_value" TEXT,
    "response_received_at" TIMESTAMP(3),
    "status" "order_info_request_status" NOT NULL DEFAULT 'OPEN',
    "cancelled_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "order_info_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_change_requests" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "requested_by" TEXT NOT NULL,
    "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "change_type" "order_change_type" NOT NULL,
    "field_changed" TEXT NOT NULL,
    "old_value" TEXT,
    "new_value" TEXT,
    "reason" TEXT NOT NULL,
    "customer_impact" TEXT,
    "production_impact" TEXT,
    "delivery_impact" TEXT,
    "cost_impact_vnd" DECIMAL(14,2),
    "requires_approval" BOOLEAN NOT NULL DEFAULT false,
    "approved_by" TEXT,
    "approved_at" TIMESTAMP(3),
    "partner_notified" BOOLEAN NOT NULL DEFAULT false,
    "customer_confirmed" BOOLEAN NOT NULL DEFAULT false,
    "effective_at" TIMESTAMP(3),
    "status" "order_change_request_status" NOT NULL DEFAULT 'PENDING',
    "rejected_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "order_change_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_qc_records" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "inspector_id" TEXT,
    "status" "qc_record_status" NOT NULL DEFAULT 'PENDING',
    "ai_score" INTEGER,
    "ai_critique" TEXT,
    "image_asset_ids" JSONB,
    "checklist_result" JSONB,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "order_qc_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_exceptions" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'MEDIUM',
    "description" TEXT NOT NULL,
    "resolution" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "reported_by" TEXT,
    "resolved_by" TEXT,
    "resolved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "order_exceptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "journey_runs" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "workspace_id" TEXT,
    "manifest_id" TEXT NOT NULL,
    "execution_mode" TEXT NOT NULL DEFAULT 'manual',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "params" JSONB,
    "context_snapshot" JSONB,
    "degraded_steps" JSONB,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "journey_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "decision_registry" (
    "decision_id" TEXT NOT NULL,
    "ownership" TEXT NOT NULL,
    "locked" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT NOT NULL,
    "spec_ref" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "decision_registry_pkey" PRIMARY KEY ("decision_id")
);

-- CreateTable
CREATE TABLE "greeting_catalogs" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'STANDARD',
    "description" TEXT,
    "filters" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "greeting_catalogs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "greeting_catalog_products" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "catalog_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "greeting_catalog_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "greeting_sessions" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "catalog_id" TEXT NOT NULL,
    "send_code" TEXT NOT NULL,
    "sale_id" TEXT NOT NULL,
    "customer_name" TEXT,
    "customer_phone" TEXT,
    "status" TEXT NOT NULL DEFAULT 'CREATED',
    "selected_product_id" TEXT,
    "product_snapshot" JSONB,
    "order_id" TEXT,
    "payment_proof_asset_id" TEXT,
    "payment_proof_balance_asset_id" TEXT,
    "opened_at" TIMESTAMP(3),
    "selected_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "revoked_at" TIMESTAMP(3),
    "revoked_by" TEXT,
    "last_active_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "greeting_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "greeting_integrations" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "payment_provider" TEXT,
    "payment_webhook_key_hash" TEXT,
    "payment_webhook_key_hint" TEXT,
    "payment_webhook_enabled" BOOLEAN NOT NULL DEFAULT false,
    "notify_channel" TEXT,
    "notify_enabled" BOOLEAN NOT NULL DEFAULT false,
    "notify_config_encrypted" TEXT,
    "notify_templates" JSONB,
    "staff_notify_enabled" BOOLEAN NOT NULL DEFAULT false,
    "staff_notify_channels" JSONB,
    "staff_notify_config_encrypted" TEXT,
    "staff_notify_events" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "greeting_integrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "greeting_payment_events" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "external_id" TEXT NOT NULL,
    "amount_vnd" DECIMAL(14,2) NOT NULL,
    "content" TEXT NOT NULL,
    "account_no" TEXT,
    "transaction_at" TIMESTAMP(3),
    "status" TEXT NOT NULL,
    "order_id" TEXT,
    "payment_id" TEXT,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "greeting_payment_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "greeting_notifications" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "event_key" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "recipient_masked" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "provider_message_id" TEXT,
    "error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "greeting_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff_notifications" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "order_id" TEXT,
    "event_key" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "recipient_role" TEXT,
    "recipient_id" TEXT,
    "recipient_info" TEXT,
    "title" TEXT,
    "message" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SENT',
    "provider_msg_id" TEXT,
    "error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "staff_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "greeting_share_links" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "catalog_id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "channel" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMP(3),

    CONSTRAINT "greeting_share_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "greeting_messages" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "order_id" TEXT,
    "session_id" TEXT,
    "step_key" TEXT NOT NULL DEFAULT 'GENERAL',
    "sender_id" TEXT NOT NULL,
    "sender_role" TEXT NOT NULL,
    "to_role" TEXT,
    "to_user_id" TEXT,
    "kind" TEXT NOT NULL DEFAULT 'MESSAGE',
    "body" TEXT NOT NULL,
    "payload" JSONB,
    "reply_to_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "greeting_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "greeting_message_reads" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "message_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "read_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "greeting_message_reads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "greeting_catalog_events" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "catalog_id" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "visitor_hash" TEXT NOT NULL,
    "order_id" TEXT,
    "product_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "greeting_catalog_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "greeting_journey_events" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "greeting_journey_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_token_hash_key" ON "sessions"("token_hash");

-- CreateIndex
CREATE INDEX "sessions_user_id_idx" ON "sessions"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "organizations_slug_key" ON "organizations"("slug");

-- CreateIndex
CREATE INDEX "workspaces_organization_id_idx" ON "workspaces"("organization_id");

-- CreateIndex
CREATE INDEX "branches_organization_id_idx" ON "branches"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "branches_organization_id_code_key" ON "branches"("organization_id", "code");

-- CreateIndex
CREATE INDEX "roles_organization_id_idx" ON "roles"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "roles_organization_id_key_key" ON "roles"("organization_id", "key");

-- CreateIndex
CREATE UNIQUE INDEX "role_capabilities_role_id_capability_code_key" ON "role_capabilities"("role_id", "capability_code");

-- CreateIndex
CREATE INDEX "capability_overrides_organization_id_idx" ON "capability_overrides"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "capability_overrides_organization_id_role_id_capability_cod_key" ON "capability_overrides"("organization_id", "role_id", "capability_code");

-- CreateIndex
CREATE INDEX "memberships_organization_id_idx" ON "memberships"("organization_id");

-- CreateIndex
CREATE INDEX "memberships_user_id_idx" ON "memberships"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "memberships_organization_id_user_id_key" ON "memberships"("organization_id", "user_id");

-- CreateIndex
CREATE INDEX "assets_organization_id_idx" ON "assets"("organization_id");

-- CreateIndex
CREATE INDEX "assets_organization_id_product_id_idx" ON "assets"("organization_id", "product_id");

-- CreateIndex
CREATE INDEX "assets_parent_asset_id_idx" ON "assets"("parent_asset_id");

-- CreateIndex
CREATE INDEX "assets_output_sha256_idx" ON "assets"("output_sha256");

-- CreateIndex
CREATE INDEX "assets_organization_id_product_id_kind_approval_state_idx" ON "assets"("organization_id", "product_id", "kind", "approval_state");

-- CreateIndex
CREATE INDEX "generation_jobs_organization_id_idx" ON "generation_jobs"("organization_id");

-- CreateIndex
CREATE INDEX "generation_jobs_status_created_at_idx" ON "generation_jobs"("status", "created_at");

-- CreateIndex
CREATE INDEX "generation_jobs_organization_id_user_id_idx" ON "generation_jobs"("organization_id", "user_id");

-- CreateIndex
CREATE INDEX "generation_jobs_organization_id_job_group_id_idx" ON "generation_jobs"("organization_id", "job_group_id");

-- CreateIndex
CREATE UNIQUE INDEX "generation_jobs_organization_id_feature_idempotency_key_key" ON "generation_jobs"("organization_id", "feature", "idempotency_key");

-- CreateIndex
CREATE INDEX "job_events_job_id_seq_idx" ON "job_events"("job_id", "seq");

-- CreateIndex
CREATE UNIQUE INDEX "job_events_job_id_seq_key" ON "job_events"("job_id", "seq");

-- CreateIndex
CREATE INDEX "usage_organization_id_created_at_idx" ON "usage"("organization_id", "created_at");

-- CreateIndex
CREATE INDEX "usage_job_id_idx" ON "usage"("job_id");

-- CreateIndex
CREATE INDEX "audit_logs_organization_id_created_at_idx" ON "audit_logs"("organization_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE UNIQUE INDEX "business_profiles_organization_id_key" ON "business_profiles"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "brand_profiles_organization_id_key" ON "brand_profiles"("organization_id");

-- CreateIndex
CREATE INDEX "products_organization_id_idx" ON "products"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "products_organization_id_code_key" ON "products"("organization_id", "code");

-- CreateIndex
CREATE INDEX "product_variants_organization_id_product_id_idx" ON "product_variants"("organization_id", "product_id");

-- CreateIndex
CREATE INDEX "product_images_organization_id_product_id_idx" ON "product_images"("organization_id", "product_id");

-- CreateIndex
CREATE UNIQUE INDEX "product_images_organization_id_product_id_asset_id_role_key" ON "product_images"("organization_id", "product_id", "asset_id", "role");

-- CreateIndex
CREATE INDEX "product_inventory_organization_id_branch_id_idx" ON "product_inventory"("organization_id", "branch_id");

-- CreateIndex
CREATE UNIQUE INDEX "product_inventory_organization_id_product_id_branch_id_key" ON "product_inventory"("organization_id", "product_id", "branch_id");

-- CreateIndex
CREATE INDEX "product_bookings_organization_id_product_id_check_in_date_idx" ON "product_bookings"("organization_id", "product_id", "check_in_date");

-- CreateIndex
CREATE INDEX "product_bookings_organization_id_product_id_status_idx" ON "product_bookings"("organization_id", "product_id", "status");

-- CreateIndex
CREATE INDEX "product_bookings_organization_id_order_id_idx" ON "product_bookings"("organization_id", "order_id");

-- CreateIndex
CREATE INDEX "product_analyses_organization_id_idx" ON "product_analyses"("organization_id");

-- CreateIndex
CREATE INDEX "product_analyses_organization_id_product_id_idx" ON "product_analyses"("organization_id", "product_id");

-- CreateIndex
CREATE INDEX "product_analyses_job_id_idx" ON "product_analyses"("job_id");

-- CreateIndex
CREATE UNIQUE INDEX "product_analyses_job_id_asset_id_key" ON "product_analyses"("job_id", "asset_id");

-- CreateIndex
CREATE INDEX "pricing_rules_organization_id_key_idx" ON "pricing_rules"("organization_id", "key");

-- CreateIndex
CREATE UNIQUE INDEX "integration_tokens_token_hash_key" ON "integration_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "integration_tokens_organization_id_idx" ON "integration_tokens"("organization_id");

-- CreateIndex
CREATE INDEX "integration_tokens_organization_id_client_idx" ON "integration_tokens"("organization_id", "client");

-- CreateIndex
CREATE INDEX "content_metrics_organization_id_idx" ON "content_metrics"("organization_id");

-- CreateIndex
CREATE INDEX "content_metrics_organization_id_metric_date_idx" ON "content_metrics"("organization_id", "metric_date");

-- CreateIndex
CREATE UNIQUE INDEX "content_metrics_organization_id_platform_content_id_metric__key" ON "content_metrics"("organization_id", "platform", "content_id", "metric_date");

-- CreateIndex
CREATE UNIQUE INDEX "ai_models_key_key" ON "ai_models"("key");

-- CreateIndex
CREATE INDEX "ai_policies_organization_id_idx" ON "ai_policies"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "ai_policies_organization_id_capability_code_key" ON "ai_policies"("organization_id", "capability_code");

-- CreateIndex
CREATE INDEX "ai_requests_organization_id_created_at_idx" ON "ai_requests"("organization_id", "created_at");

-- CreateIndex
CREATE INDEX "ai_requests_organization_id_capability_code_model_key_idx" ON "ai_requests"("organization_id", "capability_code", "model_key");

-- CreateIndex
CREATE INDEX "ai_requests_job_id_idx" ON "ai_requests"("job_id");

-- CreateIndex
CREATE INDEX "ai_evaluations_organization_id_entity_type_entity_id_idx" ON "ai_evaluations"("organization_id", "entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "ai_evaluations_organization_id_capability_code_idx" ON "ai_evaluations"("organization_id", "capability_code");

-- CreateIndex
CREATE INDEX "occasions_organization_id_idx" ON "occasions"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "occasions_organization_id_code_key" ON "occasions"("organization_id", "code");

-- CreateIndex
CREATE INDEX "template_overrides_organization_id_idx" ON "template_overrides"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "template_overrides_organization_id_template_key_field_key_key" ON "template_overrides"("organization_id", "template_key", "field_key");

-- CreateIndex
CREATE UNIQUE INDEX "catalog_links_slug_key" ON "catalog_links"("slug");

-- CreateIndex
CREATE INDEX "catalog_links_organization_id_idx" ON "catalog_links"("organization_id");

-- CreateIndex
CREATE INDEX "catalog_links_slug_idx" ON "catalog_links"("slug");

-- CreateIndex
CREATE INDEX "product_copies_organization_id_idx" ON "product_copies"("organization_id");

-- CreateIndex
CREATE INDEX "product_copies_organization_id_product_id_idx" ON "product_copies"("organization_id", "product_id");

-- CreateIndex
CREATE INDEX "product_copies_approval_state_idx" ON "product_copies"("approval_state");

-- CreateIndex
CREATE UNIQUE INDEX "product_copies_analysis_id_key" ON "product_copies"("analysis_id");

-- CreateIndex
CREATE INDEX "video_jobs_organization_id_idx" ON "video_jobs"("organization_id");

-- CreateIndex
CREATE INDEX "video_jobs_organization_id_product_id_idx" ON "video_jobs"("organization_id", "product_id");

-- CreateIndex
CREATE INDEX "video_jobs_stage_idx" ON "video_jobs"("stage");

-- CreateIndex
CREATE INDEX "video_jobs_script_approval_idx" ON "video_jobs"("script_approval");

-- CreateIndex
CREATE INDEX "video_jobs_video_approval_idx" ON "video_jobs"("video_approval");

-- CreateIndex
CREATE INDEX "video_scenes_video_job_id_idx" ON "video_scenes"("video_job_id");

-- CreateIndex
CREATE UNIQUE INDEX "video_scenes_video_job_id_scene_index_key" ON "video_scenes"("video_job_id", "scene_index");

-- CreateIndex
CREATE INDEX "orders_organization_id_status_idx" ON "orders"("organization_id", "status");

-- CreateIndex
CREATE INDEX "orders_organization_id_production_status_idx" ON "orders"("organization_id", "production_status");

-- CreateIndex
CREATE INDEX "orders_organization_id_source_idx" ON "orders"("organization_id", "source");

-- CreateIndex
CREATE UNIQUE INDEX "orders_organization_id_code_key" ON "orders"("organization_id", "code");

-- CreateIndex
CREATE INDEX "order_items_organization_id_order_id_idx" ON "order_items"("organization_id", "order_id");

-- CreateIndex
CREATE INDEX "order_assignments_organization_id_assignee_id_idx" ON "order_assignments"("organization_id", "assignee_id");

-- CreateIndex
CREATE INDEX "order_assignments_organization_id_order_id_idx" ON "order_assignments"("organization_id", "order_id");

-- CreateIndex
CREATE INDEX "order_events_organization_id_order_id_created_at_idx" ON "order_events"("organization_id", "order_id", "created_at");

-- CreateIndex
CREATE INDEX "customers_organization_id_tier_idx" ON "customers"("organization_id", "tier");

-- CreateIndex
CREATE INDEX "customers_organization_id_name_idx" ON "customers"("organization_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "customers_organization_id_phone_key" ON "customers"("organization_id", "phone");

-- CreateIndex
CREATE UNIQUE INDEX "customers_organization_id_code_key" ON "customers"("organization_id", "code");

-- CreateIndex
CREATE INDEX "customer_occasions_organization_id_customer_id_idx" ON "customer_occasions"("organization_id", "customer_id");

-- CreateIndex
CREATE INDEX "customer_occasions_organization_id_date_idx" ON "customer_occasions"("organization_id", "date");

-- CreateIndex
CREATE INDEX "customer_consents_organization_id_customer_id_idx" ON "customer_consents"("organization_id", "customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "customer_consents_customer_id_channel_key" ON "customer_consents"("customer_id", "channel");

-- CreateIndex
CREATE INDEX "vouchers_organization_id_customer_id_idx" ON "vouchers"("organization_id", "customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "vouchers_organization_id_code_key" ON "vouchers"("organization_id", "code");

-- CreateIndex
CREATE INDEX "chat_conversations_organization_id_status_idx" ON "chat_conversations"("organization_id", "status");

-- CreateIndex
CREATE INDEX "chat_conversations_organization_id_customer_id_idx" ON "chat_conversations"("organization_id", "customer_id");

-- CreateIndex
CREATE INDEX "chat_messages_organization_id_conversation_id_created_at_idx" ON "chat_messages"("organization_id", "conversation_id", "created_at");

-- CreateIndex
CREATE INDEX "chat_channel_integrations_organization_id_is_enabled_idx" ON "chat_channel_integrations"("organization_id", "is_enabled");

-- CreateIndex
CREATE UNIQUE INDEX "chat_channel_integrations_organization_id_channel_key" ON "chat_channel_integrations"("organization_id", "channel");

-- CreateIndex
CREATE INDEX "flower_taxonomy_ten_chuan_idx" ON "flower_taxonomy"("ten_chuan");

-- CreateIndex
CREATE INDEX "flower_taxonomy_nhom_idx" ON "flower_taxonomy"("nhom");

-- CreateIndex
CREATE INDEX "flower_confusable_pairs_ma_loai_a_idx" ON "flower_confusable_pairs"("ma_loai_a");

-- CreateIndex
CREATE INDEX "flower_confusable_pairs_ma_loai_b_idx" ON "flower_confusable_pairs"("ma_loai_b");

-- CreateIndex
CREATE INDEX "flower_confusable_pairs_muc_do_nham_idx" ON "flower_confusable_pairs"("muc_do_nham");

-- CreateIndex
CREATE UNIQUE INDEX "platform_operators_user_id_key" ON "platform_operators"("user_id");

-- CreateIndex
CREATE INDEX "platform_operators_user_id_idx" ON "platform_operators"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "platform_role_capabilities_operator_id_capability_code_key" ON "platform_role_capabilities"("operator_id", "capability_code");

-- CreateIndex
CREATE INDEX "platform_audit_logs_created_at_idx" ON "platform_audit_logs"("created_at");

-- CreateIndex
CREATE INDEX "platform_audit_logs_entity_type_entity_id_idx" ON "platform_audit_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE UNIQUE INDEX "field_definitions_key_key" ON "field_definitions"("key");

-- CreateIndex
CREATE INDEX "field_definitions_entity_idx" ON "field_definitions"("entity");

-- CreateIndex
CREATE INDEX "field_definitions_catalog_key_idx" ON "field_definitions"("catalog_key");

-- CreateIndex
CREATE UNIQUE INDEX "field_catalogs_key_key" ON "field_catalogs"("key");

-- CreateIndex
CREATE INDEX "field_catalog_values_catalog_key_idx" ON "field_catalog_values"("catalog_key");

-- CreateIndex
CREATE UNIQUE INDEX "field_catalog_values_catalog_key_code_key" ON "field_catalog_values"("catalog_key", "code");

-- CreateIndex
CREATE INDEX "field_config_overrides_organization_id_idx" ON "field_config_overrides"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "field_config_overrides_organization_id_target_override_key_key" ON "field_config_overrides"("organization_id", "target", "override_key");

-- CreateIndex
CREATE UNIQUE INDEX "market_sources_provider_platform_key" ON "market_sources"("provider", "platform");

-- CreateIndex
CREATE INDEX "trend_signals_source_id_idx" ON "trend_signals"("source_id");

-- CreateIndex
CREATE INDEX "trend_signals_platform_country_code_idx" ON "trend_signals"("platform", "country_code");

-- CreateIndex
CREATE INDEX "trend_signals_captured_at_idx" ON "trend_signals"("captured_at");

-- CreateIndex
CREATE INDEX "trend_signals_industry_idx" ON "trend_signals"("industry");

-- CreateIndex
CREATE UNIQUE INDEX "trend_signals_source_id_platform_country_code_topic_raw_cap_key" ON "trend_signals"("source_id", "platform", "country_code", "topic_raw", "captured_at");

-- CreateIndex
CREATE INDEX "trend_timeseries_topic_id_idx" ON "trend_timeseries"("topic_id");

-- CreateIndex
CREATE INDEX "trend_timeseries_date_idx" ON "trend_timeseries"("date");

-- CreateIndex
CREATE UNIQUE INDEX "trend_timeseries_topic_id_platform_geo_scope_date_key" ON "trend_timeseries"("topic_id", "platform", "geo_scope", "date");

-- CreateIndex
CREATE INDEX "topics_status_idx" ON "topics"("status");

-- CreateIndex
CREATE INDEX "topics_industry_idx" ON "topics"("industry");

-- CreateIndex
CREATE INDEX "topics_last_seen_at_idx" ON "topics"("last_seen_at");

-- CreateIndex
CREATE UNIQUE INDEX "topics_canonical_name_industry_key" ON "topics"("canonical_name", "industry");

-- CreateIndex
CREATE INDEX "topic_signals_topic_id_idx" ON "topic_signals"("topic_id");

-- CreateIndex
CREATE INDEX "topic_signals_source_id_idx" ON "topic_signals"("source_id");

-- CreateIndex
CREATE INDEX "topic_scores_topic_id_idx" ON "topic_scores"("topic_id");

-- CreateIndex
CREATE INDEX "topic_scores_period_idx" ON "topic_scores"("period");

-- CreateIndex
CREATE INDEX "topic_scores_content_opportunity_score_idx" ON "topic_scores"("content_opportunity_score");

-- CreateIndex
CREATE INDEX "content_opportunities_organization_id_content_opportunity_s_idx" ON "content_opportunities"("organization_id", "content_opportunity_score");

-- CreateIndex
CREATE INDEX "content_opportunities_organization_id_idx" ON "content_opportunities"("organization_id");

-- CreateIndex
CREATE INDEX "content_opportunities_topic_id_idx" ON "content_opportunities"("topic_id");

-- CreateIndex
CREATE INDEX "product_analysis_runs_organization_id_created_at_idx" ON "product_analysis_runs"("organization_id", "created_at");

-- CreateIndex
CREATE INDEX "research_runs_status_created_at_idx" ON "research_runs"("status", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "provider_health_provider_key" ON "provider_health"("provider");

-- CreateIndex
CREATE INDEX "provider_health_status_idx" ON "provider_health"("status");

-- CreateIndex
CREATE INDEX "campaign_packages_organization_id_created_at_idx" ON "campaign_packages"("organization_id", "created_at");

-- CreateIndex
CREATE INDEX "campaign_packages_organization_id_master_asset_id_idx" ON "campaign_packages"("organization_id", "master_asset_id");

-- CreateIndex
CREATE INDEX "campaign_packages_organization_id_status_idx" ON "campaign_packages"("organization_id", "status");

-- CreateIndex
CREATE INDEX "content_drafts_organization_id_updated_at_idx" ON "content_drafts"("organization_id", "updated_at");

-- CreateIndex
CREATE UNIQUE INDEX "content_drafts_organization_id_asset_id_topic_id_mode_key" ON "content_drafts"("organization_id", "asset_id", "topic_id", "mode");

-- CreateIndex
CREATE INDEX "content_generations_organization_id_asset_id_topic_id_mode_idx" ON "content_generations"("organization_id", "asset_id", "topic_id", "mode");

-- CreateIndex
CREATE INDEX "content_generations_organization_id_created_at_idx" ON "content_generations"("organization_id", "created_at");

-- CreateIndex
CREATE INDEX "voice_clones_organization_id_status_idx" ON "voice_clones"("organization_id", "status");

-- CreateIndex
CREATE INDEX "music_tracks_organization_id_mood_idx" ON "music_tracks"("organization_id", "mood");

-- CreateIndex
CREATE INDEX "partners_organization_id_is_active_idx" ON "partners"("organization_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "partners_organization_id_code_key" ON "partners"("organization_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "order_coordinations_order_id_key" ON "order_coordinations"("order_id");

-- CreateIndex
CREATE INDEX "order_coordinations_organization_id_stage_idx" ON "order_coordinations"("organization_id", "stage");

-- CreateIndex
CREATE INDEX "order_coordinations_organization_id_risk_level_idx" ON "order_coordinations"("organization_id", "risk_level");

-- CreateIndex
CREATE INDEX "order_payments_organization_id_order_id_idx" ON "order_payments"("organization_id", "order_id");

-- CreateIndex
CREATE INDEX "order_info_requests_organization_id_order_id_idx" ON "order_info_requests"("organization_id", "order_id");

-- CreateIndex
CREATE INDEX "order_info_requests_organization_id_status_idx" ON "order_info_requests"("organization_id", "status");

-- CreateIndex
CREATE INDEX "order_change_requests_organization_id_order_id_idx" ON "order_change_requests"("organization_id", "order_id");

-- CreateIndex
CREATE INDEX "order_change_requests_organization_id_status_idx" ON "order_change_requests"("organization_id", "status");

-- CreateIndex
CREATE INDEX "order_qc_records_organization_id_order_id_idx" ON "order_qc_records"("organization_id", "order_id");

-- CreateIndex
CREATE INDEX "order_exceptions_organization_id_order_id_idx" ON "order_exceptions"("organization_id", "order_id");

-- CreateIndex
CREATE INDEX "order_exceptions_organization_id_status_idx" ON "order_exceptions"("organization_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "order_exceptions_organization_id_code_key" ON "order_exceptions"("organization_id", "code");

-- CreateIndex
CREATE INDEX "journey_runs_organization_id_manifest_id_idx" ON "journey_runs"("organization_id", "manifest_id");

-- CreateIndex
CREATE INDEX "journey_runs_organization_id_status_idx" ON "journey_runs"("organization_id", "status");

-- CreateIndex
CREATE INDEX "greeting_catalogs_organization_id_idx" ON "greeting_catalogs"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "greeting_catalogs_organization_id_code_key" ON "greeting_catalogs"("organization_id", "code");

-- CreateIndex
CREATE INDEX "greeting_catalog_products_organization_id_catalog_id_idx" ON "greeting_catalog_products"("organization_id", "catalog_id");

-- CreateIndex
CREATE INDEX "greeting_catalog_products_product_id_idx" ON "greeting_catalog_products"("product_id");

-- CreateIndex
CREATE UNIQUE INDEX "greeting_catalog_products_catalog_id_product_id_key" ON "greeting_catalog_products"("catalog_id", "product_id");

-- CreateIndex
CREATE INDEX "greeting_sessions_organization_id_catalog_id_idx" ON "greeting_sessions"("organization_id", "catalog_id");

-- CreateIndex
CREATE INDEX "greeting_sessions_organization_id_sale_id_idx" ON "greeting_sessions"("organization_id", "sale_id");

-- CreateIndex
CREATE INDEX "greeting_sessions_send_code_idx" ON "greeting_sessions"("send_code");

-- CreateIndex
CREATE UNIQUE INDEX "greeting_sessions_organization_id_send_code_key" ON "greeting_sessions"("organization_id", "send_code");

-- CreateIndex
CREATE UNIQUE INDEX "greeting_integrations_organization_id_key" ON "greeting_integrations"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "greeting_integrations_payment_webhook_key_hash_key" ON "greeting_integrations"("payment_webhook_key_hash");

-- CreateIndex
CREATE INDEX "greeting_integrations_organization_id_idx" ON "greeting_integrations"("organization_id");

-- CreateIndex
CREATE INDEX "greeting_payment_events_organization_id_status_idx" ON "greeting_payment_events"("organization_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "greeting_payment_events_organization_id_provider_external_i_key" ON "greeting_payment_events"("organization_id", "provider", "external_id");

-- CreateIndex
CREATE INDEX "greeting_notifications_organization_id_order_id_idx" ON "greeting_notifications"("organization_id", "order_id");

-- CreateIndex
CREATE UNIQUE INDEX "greeting_notifications_organization_id_order_id_event_key_key" ON "greeting_notifications"("organization_id", "order_id", "event_key");

-- CreateIndex
CREATE INDEX "staff_notifications_organization_id_event_key_idx" ON "staff_notifications"("organization_id", "event_key");

-- CreateIndex
CREATE INDEX "staff_notifications_organization_id_recipient_id_idx" ON "staff_notifications"("organization_id", "recipient_id");

-- CreateIndex
CREATE UNIQUE INDEX "greeting_share_links_code_key" ON "greeting_share_links"("code");

-- CreateIndex
CREATE INDEX "greeting_share_links_organization_id_owner_id_created_at_idx" ON "greeting_share_links"("organization_id", "owner_id", "created_at");

-- CreateIndex
CREATE INDEX "greeting_share_links_organization_id_catalog_id_idx" ON "greeting_share_links"("organization_id", "catalog_id");

-- CreateIndex
CREATE INDEX "greeting_messages_organization_id_order_id_idx" ON "greeting_messages"("organization_id", "order_id");

-- CreateIndex
CREATE INDEX "greeting_messages_organization_id_session_id_idx" ON "greeting_messages"("organization_id", "session_id");

-- CreateIndex
CREATE INDEX "greeting_messages_organization_id_to_user_id_created_at_idx" ON "greeting_messages"("organization_id", "to_user_id", "created_at");

-- CreateIndex
CREATE INDEX "greeting_messages_organization_id_to_role_created_at_idx" ON "greeting_messages"("organization_id", "to_role", "created_at");

-- CreateIndex
CREATE INDEX "greeting_message_reads_organization_id_user_id_idx" ON "greeting_message_reads"("organization_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "greeting_message_reads_message_id_user_id_key" ON "greeting_message_reads"("message_id", "user_id");

-- CreateIndex
CREATE INDEX "greeting_catalog_events_organization_id_catalog_id_created__idx" ON "greeting_catalog_events"("organization_id", "catalog_id", "created_at");

-- CreateIndex
CREATE INDEX "greeting_catalog_events_organization_id_channel_idx" ON "greeting_catalog_events"("organization_id", "channel");

-- CreateIndex
CREATE INDEX "greeting_catalog_events_organization_id_catalog_id_product__idx" ON "greeting_catalog_events"("organization_id", "catalog_id", "product_id");

-- CreateIndex
CREATE INDEX "greeting_journey_events_organization_id_session_id_idx" ON "greeting_journey_events"("organization_id", "session_id");

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branches" ADD CONSTRAINT "branches_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_capabilities" ADD CONSTRAINT "role_capabilities_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "capability_overrides" ADD CONSTRAINT "capability_overrides_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "generation_jobs" ADD CONSTRAINT "generation_jobs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_events" ADD CONSTRAINT "job_events_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "generation_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage" ADD CONSTRAINT "usage_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_profiles" ADD CONSTRAINT "business_profiles_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brand_profiles" ADD CONSTRAINT "brand_profiles_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_inventory" ADD CONSTRAINT "product_inventory_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_inventory" ADD CONSTRAINT "product_inventory_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_inventory" ADD CONSTRAINT "product_inventory_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_bookings" ADD CONSTRAINT "product_bookings_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_bookings" ADD CONSTRAINT "product_bookings_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_analyses" ADD CONSTRAINT "product_analyses_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_analyses" ADD CONSTRAINT "product_analyses_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pricing_rules" ADD CONSTRAINT "pricing_rules_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integration_tokens" ADD CONSTRAINT "integration_tokens_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_metrics" ADD CONSTRAINT "content_metrics_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_policies" ADD CONSTRAINT "ai_policies_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_policies" ADD CONSTRAINT "ai_policies_capability_code_fkey" FOREIGN KEY ("capability_code") REFERENCES "ai_capabilities"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_requests" ADD CONSTRAINT "ai_requests_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_evaluations" ADD CONSTRAINT "ai_evaluations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "occasions" ADD CONSTRAINT "occasions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "template_overrides" ADD CONSTRAINT "template_overrides_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalog_links" ADD CONSTRAINT "catalog_links_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_copies" ADD CONSTRAINT "product_copies_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "video_jobs" ADD CONSTRAINT "video_jobs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "video_scenes" ADD CONSTRAINT "video_scenes_video_job_id_fkey" FOREIGN KEY ("video_job_id") REFERENCES "video_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_assignments" ADD CONSTRAINT "order_assignments_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_assignments" ADD CONSTRAINT "order_assignments_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_events" ADD CONSTRAINT "order_events_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_events" ADD CONSTRAINT "order_events_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_occasions" ADD CONSTRAINT "customer_occasions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_occasions" ADD CONSTRAINT "customer_occasions_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_consents" ADD CONSTRAINT "customer_consents_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_consents" ADD CONSTRAINT "customer_consents_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vouchers" ADD CONSTRAINT "vouchers_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vouchers" ADD CONSTRAINT "vouchers_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_conversations" ADD CONSTRAINT "chat_conversations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_conversations" ADD CONSTRAINT "chat_conversations_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "chat_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_channel_integrations" ADD CONSTRAINT "chat_channel_integrations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flower_confusable_pairs" ADD CONSTRAINT "flower_confusable_pairs_ma_loai_a_fkey" FOREIGN KEY ("ma_loai_a") REFERENCES "flower_taxonomy"("ma_loai") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flower_confusable_pairs" ADD CONSTRAINT "flower_confusable_pairs_ma_loai_b_fkey" FOREIGN KEY ("ma_loai_b") REFERENCES "flower_taxonomy"("ma_loai") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_operators" ADD CONSTRAINT "platform_operators_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_role_capabilities" ADD CONSTRAINT "platform_role_capabilities_operator_id_fkey" FOREIGN KEY ("operator_id") REFERENCES "platform_operators"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "field_catalog_values" ADD CONSTRAINT "field_catalog_values_catalog_key_fkey" FOREIGN KEY ("catalog_key") REFERENCES "field_catalogs"("key") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "field_config_overrides" ADD CONSTRAINT "field_config_overrides_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trend_signals" ADD CONSTRAINT "trend_signals_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "market_sources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trend_timeseries" ADD CONSTRAINT "trend_timeseries_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "topics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "topic_signals" ADD CONSTRAINT "topic_signals_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "topics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "topic_signals" ADD CONSTRAINT "topic_signals_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "market_sources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "topic_scores" ADD CONSTRAINT "topic_scores_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "topics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_opportunities" ADD CONSTRAINT "content_opportunities_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_opportunities" ADD CONSTRAINT "content_opportunities_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "topics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_analysis_runs" ADD CONSTRAINT "product_analysis_runs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_packages" ADD CONSTRAINT "campaign_packages_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_drafts" ADD CONSTRAINT "content_drafts_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_generations" ADD CONSTRAINT "content_generations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voice_clones" ADD CONSTRAINT "voice_clones_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "music_tracks" ADD CONSTRAINT "music_tracks_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partners" ADD CONSTRAINT "partners_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_coordinations" ADD CONSTRAINT "order_coordinations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_coordinations" ADD CONSTRAINT "order_coordinations_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_coordinations" ADD CONSTRAINT "order_coordinations_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "partners"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_payments" ADD CONSTRAINT "order_payments_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_payments" ADD CONSTRAINT "order_payments_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_info_requests" ADD CONSTRAINT "order_info_requests_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_info_requests" ADD CONSTRAINT "order_info_requests_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_change_requests" ADD CONSTRAINT "order_change_requests_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_change_requests" ADD CONSTRAINT "order_change_requests_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_qc_records" ADD CONSTRAINT "order_qc_records_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_qc_records" ADD CONSTRAINT "order_qc_records_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_exceptions" ADD CONSTRAINT "order_exceptions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_exceptions" ADD CONSTRAINT "order_exceptions_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journey_runs" ADD CONSTRAINT "journey_runs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "greeting_catalogs" ADD CONSTRAINT "greeting_catalogs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "greeting_catalog_products" ADD CONSTRAINT "greeting_catalog_products_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "greeting_catalog_products" ADD CONSTRAINT "greeting_catalog_products_catalog_id_fkey" FOREIGN KEY ("catalog_id") REFERENCES "greeting_catalogs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "greeting_catalog_products" ADD CONSTRAINT "greeting_catalog_products_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "greeting_sessions" ADD CONSTRAINT "greeting_sessions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "greeting_sessions" ADD CONSTRAINT "greeting_sessions_catalog_id_fkey" FOREIGN KEY ("catalog_id") REFERENCES "greeting_catalogs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "greeting_sessions" ADD CONSTRAINT "greeting_sessions_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "greeting_integrations" ADD CONSTRAINT "greeting_integrations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "greeting_payment_events" ADD CONSTRAINT "greeting_payment_events_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "greeting_notifications" ADD CONSTRAINT "greeting_notifications_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_notifications" ADD CONSTRAINT "staff_notifications_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "greeting_share_links" ADD CONSTRAINT "greeting_share_links_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "greeting_share_links" ADD CONSTRAINT "greeting_share_links_catalog_id_fkey" FOREIGN KEY ("catalog_id") REFERENCES "greeting_catalogs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "greeting_messages" ADD CONSTRAINT "greeting_messages_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "greeting_message_reads" ADD CONSTRAINT "greeting_message_reads_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "greeting_message_reads" ADD CONSTRAINT "greeting_message_reads_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "greeting_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "greeting_catalog_events" ADD CONSTRAINT "greeting_catalog_events_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "greeting_catalog_events" ADD CONSTRAINT "greeting_catalog_events_catalog_id_fkey" FOREIGN KEY ("catalog_id") REFERENCES "greeting_catalogs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "greeting_journey_events" ADD CONSTRAINT "greeting_journey_events_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "greeting_journey_events" ADD CONSTRAINT "greeting_journey_events_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "greeting_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
