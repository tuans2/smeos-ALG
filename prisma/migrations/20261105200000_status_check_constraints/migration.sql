-- Hoàn thiện CSDL đợt 2 (rà soát 05/11/2026): CHECK cho 8 cột status kiểu chuỗi.
-- Chỉ các cột có tập giá trị khai bằng kiểu trong mã (ghi bên cạnh từng ràng buộc); 9 cột
-- status còn lại chưa có tập giá trị đóng trong mã nên chưa ràng buộc.
-- Đồng bộ với mã: tests/unit/architecture/status-check-constraints.test.ts.
-- Thêm NOT VALID rồi tự VALIDATE khi dữ liệu cũ sạch; còn giá trị lạ thì NOTICE.
-- Cả tệp chạy trong một giao dịch: lỗi ở bất kỳ bước nào thì không bước nào được giữ.
BEGIN;

-- UsageStatus — src/modules/usage/domain/repositories/usage-repository.interface.ts
ALTER TABLE "usage" ADD CONSTRAINT "usage_status_check" CHECK ("status" IN ('ENQUEUED', 'COMPLETED', 'REFUNDED', 'PARTIAL_REFUND')) NOT VALID;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM "usage" WHERE "status" NOT IN ('ENQUEUED', 'COMPLETED', 'REFUNDED', 'PARTIAL_REFUND')) THEN
    RAISE NOTICE 'Còn giá trị status lạ ở usage — usage_status_check để NOT VALID';
  ELSE
    ALTER TABLE "usage" VALIDATE CONSTRAINT "usage_status_check";
  END IF;
END $$;

-- LEAD_STATUSES — src/modules/acquisition/domain/lead-rules.ts
ALTER TABLE "leads" ADD CONSTRAINT "leads_status_check" CHECK ("status" IN ('NEW', 'QUALIFIED', 'CONTACTED', 'CONSULTING', 'RECOMMENDED', 'QUOTATION_SENT', 'FOLLOW_UP', 'WON', 'LOST', 'UNQUALIFIED')) NOT VALID;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM "leads" WHERE "status" NOT IN ('NEW', 'QUALIFIED', 'CONTACTED', 'CONSULTING', 'RECOMMENDED', 'QUOTATION_SENT', 'FOLLOW_UP', 'WON', 'LOST', 'UNQUALIFIED')) THEN
    RAISE NOTICE 'Còn giá trị status lạ ở leads — leads_status_check để NOT VALID';
  ELSE
    ALTER TABLE "leads" VALIDATE CONSTRAINT "leads_status_check";
  END IF;
END $$;

-- CAMPAIGN_PACKAGE_STATUSES — src/modules/creative-production/domain/campaign-package-rules.ts
ALTER TABLE "campaign_packages" ADD CONSTRAINT "campaign_packages_status_check" CHECK ("status" IN ('DRAFT', 'QA_PASSED', 'QA_NEEDS_REVIEW', 'QA_REJECTED', 'APPROVED')) NOT VALID;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM "campaign_packages" WHERE "status" NOT IN ('DRAFT', 'QA_PASSED', 'QA_NEEDS_REVIEW', 'QA_REJECTED', 'APPROVED')) THEN
    RAISE NOTICE 'Còn giá trị status lạ ở campaign_packages — campaign_packages_status_check để NOT VALID';
  ELSE
    ALTER TABLE "campaign_packages" VALIDATE CONSTRAINT "campaign_packages_status_check";
  END IF;
END $$;

-- ContentGenerationStatus — src/modules/content-engine/domain/repositories/content-generation-repository.interface.ts
ALTER TABLE "content_generations" ADD CONSTRAINT "content_generations_status_check" CHECK ("status" IN ('DRAFT', 'APPROVED', 'SCHEDULED')) NOT VALID;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM "content_generations" WHERE "status" NOT IN ('DRAFT', 'APPROVED', 'SCHEDULED')) THEN
    RAISE NOTICE 'Còn giá trị status lạ ở content_generations — content_generations_status_check để NOT VALID';
  ELSE
    ALTER TABLE "content_generations" VALIDATE CONSTRAINT "content_generations_status_check";
  END IF;
END $$;

-- GreetingSessionStatus — src/modules/greeting-card/domain/greeting-card-types.ts
ALTER TABLE "greeting_sessions" ADD CONSTRAINT "greeting_sessions_status_check" CHECK ("status" IN ('CREATED', 'OPENED', 'BROWSING', 'SELECTED', 'ORDER_SUBMITTED', 'PAYMENT_REPORTED', 'COMPLETED')) NOT VALID;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM "greeting_sessions" WHERE "status" NOT IN ('CREATED', 'OPENED', 'BROWSING', 'SELECTED', 'ORDER_SUBMITTED', 'PAYMENT_REPORTED', 'COMPLETED')) THEN
    RAISE NOTICE 'Còn giá trị status lạ ở greeting_sessions — greeting_sessions_status_check để NOT VALID';
  ELSE
    ALTER TABLE "greeting_sessions" VALIDATE CONSTRAINT "greeting_sessions_status_check";
  END IF;
END $$;

-- PaymentEventStatus — src/modules/greeting-card/infra/greeting-integration-repository.ts
ALTER TABLE "greeting_payment_events" ADD CONSTRAINT "greeting_payment_events_status_check" CHECK ("status" IN ('RECEIVED', 'MATCHED', 'UNMATCHED', 'IGNORED')) NOT VALID;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM "greeting_payment_events" WHERE "status" NOT IN ('RECEIVED', 'MATCHED', 'UNMATCHED', 'IGNORED')) THEN
    RAISE NOTICE 'Còn giá trị status lạ ở greeting_payment_events — greeting_payment_events_status_check để NOT VALID';
  ELSE
    ALTER TABLE "greeting_payment_events" VALIDATE CONSTRAINT "greeting_payment_events_status_check";
  END IF;
END $$;

-- PartnershipStatus — src/modules/chain-partnership/domain/partnership-entities.ts
ALTER TABLE "chain_partnerships" ADD CONSTRAINT "chain_partnerships_status_check" CHECK ("status" IN ('PENDING', 'ACTIVE', 'SUSPENDED', 'TERMINATED')) NOT VALID;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM "chain_partnerships" WHERE "status" NOT IN ('PENDING', 'ACTIVE', 'SUSPENDED', 'TERMINATED')) THEN
    RAISE NOTICE 'Còn giá trị status lạ ở chain_partnerships — chain_partnerships_status_check để NOT VALID';
  ELSE
    ALTER TABLE "chain_partnerships" VALIDATE CONSTRAINT "chain_partnerships_status_check";
  END IF;
END $$;

-- BrandLibraryStatus — src/modules/profiles/domain/brand-library.ts
ALTER TABLE "brand_library_items" ADD CONSTRAINT "brand_library_items_status_check" CHECK ("status" IN ('ACTIVE', 'ARCHIVED')) NOT VALID;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM "brand_library_items" WHERE "status" NOT IN ('ACTIVE', 'ARCHIVED')) THEN
    RAISE NOTICE 'Còn giá trị status lạ ở brand_library_items — brand_library_items_status_check để NOT VALID';
  ELSE
    ALTER TABLE "brand_library_items" VALIDATE CONSTRAINT "brand_library_items_status_check";
  END IF;
END $$;

COMMIT;
